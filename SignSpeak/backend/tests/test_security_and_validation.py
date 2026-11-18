import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.logging import redact_secrets
from app.main import SlidingWindowRateLimiter, create_application
from app.ml.features import SEQUENCE_SUMMARY_DIM
from app.ml.inference import TrainedLandmarkClassifier
from app.ml.train_classifier import train_sklearn_classifier


def _synthetic_hand(offset_x: float = 0.0, finger_spread: float = 0.015):
    return [
        {
            "x": 0.4 + offset_x + 0.01 * i,
            "y": 0.5 - finger_spread * (i % 5),
            "z": -0.004 * (i % 3),
        }
        for i in range(21)
    ]


def test_secret_redaction_strips_tokens_and_passwords():
    raw = (
        "Authorization: Bearer abc.def.ghi "
        "service_role=secret_role_value apikey=anon_or_secret "
        "postgresql://postgres:supersecretpw@db.example.supabase.co:5432/postgres"
    )
    redacted = redact_secrets(raw)
    assert "abc.def.ghi" not in redacted
    assert "secret_role_value" not in redacted
    assert "supersecretpw" not in redacted
    assert "[REDACTED]" in redacted


def test_production_cors_excludes_wildcard():
    settings = Settings(app_env="production", cors_origins="*,https://signspeak.vercel.app")
    assert settings.is_production is True
    assert settings.cors_origins_list == ["https://signspeak.vercel.app"]


def test_security_headers_and_rate_limiting():
    test_settings = Settings(
        app_env="development",
        enable_rate_limit=True,
        rate_limit_per_minute=5,
    )
    test_app = create_application(test_settings)
    client = TestClient(test_app)

    for _ in range(5):
        res = client.get("/api/gestures")
        assert res.status_code == 200
        assert res.headers.get("x-content-type-options") == "nosniff"
        assert res.headers.get("x-frame-options") == "DENY"
        assert res.headers.get("referrer-policy") == "strict-origin-when-cross-origin"

    # 6th request from same IP within window must return 429
    limited = client.get("/api/gestures")
    assert limited.status_code == 429
    assert "retry-after" in limited.headers
    assert limited.json()["error"]["code"] == "RATE_LIMIT_EXCEEDED"

    # Health check remains exempt from rate limiting so load balancers succeed
    health = client.get("/api/health")
    assert health.status_code == 200


def test_sliding_window_rate_limiter_resets_after_window():
    limiter = SlidingWindowRateLimiter(max_requests=2, window_seconds=10)
    assert limiter.check("1.2.3.4", now=100.0)[0] is True
    assert limiter.check("1.2.3.4", now=101.0)[0] is True
    blocked, _, retry_after = limiter.check("1.2.3.4", now=102.0)
    assert blocked is False
    assert retry_after >= 1
    assert limiter.check("1.2.3.4", now=111.0)[0] is True


def test_input_validation_errors():
    client = TestClient(create_application(Settings(enable_rate_limit=False)))

    empty_text = client.post("/api/translation/text-to-sign", json={"text": "   "})
    assert empty_text.status_code == 422

    empty_batch = client.post("/api/recognition/batch", json={"frames": []})
    assert empty_batch.status_code == 422

    bad_quiz = client.post("/api/learning/quiz/submit", json={"answers": []})
    assert bad_quiz.status_code == 422

    unknown_q = client.post(
        "/api/learning/quiz/submit",
        json={"answers": [{"question_id": "missing-id", "selected_option": "Hello"}]},
    )
    assert unknown_q.status_code == 404


def test_trained_classifier_recognition_low_confidence_and_unknown(tmp_path: Path):
    import numpy as np

    rng = np.random.default_rng(42)
    n_per_class = 12
    x_rows = []
    y_labels = []

    class_centers = {"stop": 1.0, "love": -1.0, "unknown": 0.0}
    for label, center in class_centers.items():
        for _ in range(n_per_class):
            vec = rng.normal(loc=center, scale=0.05, size=SEQUENCE_SUMMARY_DIM).astype(np.float32)
            x_rows.append(vec)
            y_labels.append(label)

    x_arr = np.vstack(x_rows)
    y_arr = np.array(y_labels)
    model_path, metrics = train_sklearn_classifier(
        x_arr,
        y_arr,
        ["stop", "love", "unknown"],
        tmp_path,
        test_size=0.25,
        random_state=42,
    )
    assert model_path.exists()
    assert metrics["test_accuracy"] >= 0.8

    metadata = {
        "model_trained": True,
        "framework": "sklearn",
        "classes": ["stop", "love", "unknown"],
        "label_map": {"stop": "Stop", "love": "I Love You", "unknown": "Unknown"},
        "feature_format": {"sequence_length": 24},
    }
    metadata_path = tmp_path / "model_metadata.json"
    metadata_path.write_text(json.dumps(metadata), encoding="utf-8")

    classifier = TrainedLandmarkClassifier(model_path, metadata_path)

    # Low-confidence rejection when min_confidence threshold is strict (0.999)
    frame_payload = [{"landmarks": [_synthetic_hand()], "handedness": [{"categoryName": "Right"}]}]
    strict_res = classifier.evaluate_prediction(frame_payload, min_confidence=0.999, min_margin=0.99)
    assert strict_res["recognized"] is False
    assert strict_res["recognition_status"] in {"low_confidence", "unsupported"}

    # Explicit unknown class rejection
    classifier.predict_probabilities = lambda _frames: [("unknown", 0.92), ("stop", 0.05), ("love", 0.03)]  # type: ignore[method-assign]
    unknown_res = classifier.evaluate_prediction(frame_payload, min_confidence=0.7)
    assert unknown_res["recognized"] is False
    assert unknown_res["recognition_status"] == "unsupported"
    assert unknown_res["unknown_detected"] is True

    # Dynamic gesture with fewer than 4 frames must return low_confidence
    classifier.predict_probabilities = lambda _frames: [("hello", 0.94), ("stop", 0.04)]  # type: ignore[method-assign]
    dynamic_short = classifier.evaluate_prediction(frame_payload, min_confidence=0.7)
    assert dynamic_short["recognized"] is False
    assert dynamic_short["recognition_status"] == "low_confidence"
    assert dynamic_short["gesture_type"] == "dynamic"

    # Recognized static sign above threshold & margin
    classifier.predict_probabilities = lambda _frames: [("stop", 0.95), ("love", 0.03)]  # type: ignore[method-assign]
    recognized_res = classifier.evaluate_prediction(frame_payload, min_confidence=0.7)
    assert recognized_res["recognized"] is True
    assert recognized_res["recognized_gesture"] == "stop"
    assert recognized_res["predicted_label"] == "Stop"
    assert recognized_res["recognition_status"] == "recognized"


def test_supabase_rls_policies_and_no_video_storage():
    repo_root = Path(__file__).resolve().parents[3]
    schema_sql = (repo_root / "supabase" / "migrations" / "001_initial_schema.sql").read_text(
        encoding="utf-8"
    )
    for table in (
        "public.profiles",
        "public.gestures",
        "public.learning_progress",
        "public.quiz_results",
        "public.translation_history",
    ):
        assert f"alter table {table} enable row level security" in schema_sql
    assert "auth.uid() = id" in schema_sql
    assert "auth.uid() = user_id" in schema_sql
    assert "to anon, authenticated" in schema_sql
    assert "video_blob" not in schema_sql
