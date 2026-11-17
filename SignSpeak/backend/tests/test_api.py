from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _sample_hand_landmarks():
    return [{"x": 0.5, "y": 0.5, "z": -0.01} for _ in range(21)]


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["subsystems"]["api"] == "ready"


def test_list_gestures_and_detail():
    res = client.get("/api/gestures")
    assert res.status_code == 200
    assert res.json()["total"] >= 12

    detail = client.get("/api/gestures/hello")
    assert detail.status_code == 200
    assert detail.json()["label"] == "Hello"
    assert len(detail.json()["demonstration_assets"]) >= 1

    missing = client.get("/api/gestures/non-existent-gesture")
    assert missing.status_code == 404


def test_recognition_predict_stub_and_validation():
    status_res = client.get("/api/recognition/status")
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["model_trained"] is False
    assert status_data["recognition_status"] == "model_unavailable"
    assert len(status_data["vocabulary"]) == 8

    payload = {
        "landmarks": [_sample_hand_landmarks()],
        "handedness": [{"categoryName": "Right", "score": 0.95}],
        "timestamp": 1731880000000,
    }
    res = client.post("/api/recognition/predict", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["recognized"] is False
    assert data["model_trained"] is False
    assert data["recognition_status"] == "model_unavailable"
    assert data["classifier_mode"] == "development_stub"
    assert data["confidence"] == 0.0

    # Invalid landmark count (10 instead of 21) must fail validation with 422
    invalid = client.post("/api/recognition/predict", json={"landmarks": [[{"x": 0.5, "y": 0.5}]]})
    assert invalid.status_code == 422


def test_recognition_batch_stub():
    frame = {"landmarks": [_sample_hand_landmarks()], "timestamp": 1731880000000}
    res = client.post("/api/recognition/batch", json={"frames": [frame, frame]})
    assert res.status_code == 200
    data = res.json()
    assert data["frames_processed"] == 2
    assert data["recognized"] is False
    assert data["model_trained"] is False
    assert data["recognition_status"] == "model_unavailable"


def test_learning_endpoints():
    cats = client.get("/api/learning/categories")
    assert cats.status_code == 200
    assert cats.json()["total"] == 4

    gestures = client.get("/api/learning/gestures?category=Greetings")
    assert gestures.status_code == 200
    assert gestures.json()["total"] >= 1

    quiz = client.post("/api/learning/quiz", json={"limit": 3})
    assert quiz.status_code == 200
    assert quiz.json()["total_questions"] == 3

    submit = client.post(
        "/api/learning/quiz/submit",
        json={
            "answers": [
                {"question_id": "q1", "selected_option": "Hello"},
                {"question_id": "q2", "selected_option": "No"},
            ]
        },
    )
    assert submit.status_code == 200
    assert submit.json()["correct_count"] == 1
    assert submit.json()["score_percentage"] == 50.0


def test_emergency_messages():
    res = client.get("/api/emergency/messages")
    assert res.status_code == 200
    messages = [m["message"] for m in res.json()["messages"]]
    expected = [
        "I need help.",
        "I am in pain.",
        "Call a doctor.",
        "I need water.",
        "I cannot understand.",
        "Please contact my family.",
        "I need assistance.",
    ]
    for msg in expected:
        assert msg in messages


def test_text_to_sign_translation():
    res = client.post("/api/translation/text-to-sign", json={"text": "Hello friend"})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "complete"
    assert data["matched_count"] == 2
    assert data["demonstration_mode"] == "individual_sign_sequence"
    assert "individual signs" in data["grammar_notice"].lower()

    partial = client.post("/api/translation/text-to-sign", json={"text": "Hello spaceship"})
    assert partial.status_code == 200
    assert partial.json()["status"] == "partial"
    assert "spaceship" in partial.json()["unsupported_tokens"]
    assert partial.json()["demonstration_mode"] == "individual_sign_sequence"
