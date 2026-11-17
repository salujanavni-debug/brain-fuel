import math
from pathlib import Path

import pytest

from app.ml.dataset import DatasetUnavailableError, load_dataset_directory, parse_sample_record
from app.ml.features import (
    FRAME_FEATURE_DIM,
    SEQUENCE_SUMMARY_DIM,
    extract_frame_features,
    extract_sequence_summary_features,
    normalize_hand_landmarks,
)
from app.ml.vocabulary import INITIAL_PROTOTYPE_VOCABULARY


def _make_base_hand():
    return [
        {"x": 0.4 + 0.01 * i, "y": 0.5 - 0.015 * (i % 5), "z": -0.005 * (i % 3)}
        for i in range(21)
    ]


def test_landmark_normalization_translation_and_scale_invariant():
    hand = _make_base_hand()
    norm_a = normalize_hand_landmarks(hand)
    assert len(norm_a) == 63
    # Wrist at index 0 must map to origin (0, 0, 0)
    assert norm_a[0] == pytest.approx(0.0, abs=1e-6)
    assert norm_a[1] == pytest.approx(0.0, abs=1e-6)
    assert norm_a[2] == pytest.approx(0.0, abs=1e-6)

    # Translate every landmark by (0.25, -0.15, 0.04)
    translated = [
        {"x": p["x"] + 0.25, "y": p["y"] - 0.15, "z": p["z"] + 0.04} for p in hand
    ]
    norm_b = normalize_hand_landmarks(translated)
    for a, b in zip(norm_a, norm_b):
        assert math.isclose(a, b, rel_tol=1e-6, abs_tol=1e-6)

    # Scale relative to wrist by 2.4x
    w = hand[0]
    scaled = [
        {
            "x": w["x"] + (p["x"] - w["x"]) * 2.4,
            "y": w["y"] + (p["y"] - w["y"]) * 2.4,
            "z": w["z"] + (p["z"] - w["z"]) * 2.4,
        }
        for p in hand
    ]
    norm_c = normalize_hand_landmarks(scaled)
    for a, c in zip(norm_a, norm_c):
        assert math.isclose(a, c, rel_tol=1e-6, abs_tol=1e-6)


def test_frame_and_temporal_feature_dimensions():
    hand = _make_base_hand()
    vec1 = extract_frame_features([hand], [{"categoryName": "Right", "score": 0.99}])
    vec2 = extract_frame_features([hand, hand], [{"categoryName": "Left"}, {"categoryName": "Right"}])
    assert len(vec1) == FRAME_FEATURE_DIM
    assert len(vec2) == FRAME_FEATURE_DIM

    seq_summary = extract_sequence_summary_features([vec1, vec2, vec1], target_length=24)
    assert len(seq_summary) == SEQUENCE_SUMMARY_DIM


def test_prototype_vocabulary_contains_initial_eight_labels():
    labels = [item["label"] for item in INITIAL_PROTOTYPE_VOCABULARY]
    assert labels == [
        "Hello",
        "Thank You",
        "Yes",
        "No",
        "Help",
        "Stop",
        "Please",
        "I Love You",
    ]
    assert all(
        item["isl_verification_status"] == "unverified_prototype"
        for item in INITIAL_PROTOTYPE_VOCABULARY
    )


def test_missing_dataset_raises_honest_unavailable_error(tmp_path: Path):
    with pytest.raises(DatasetUnavailableError):
        load_dataset_directory(tmp_path / "does_not_exist")


def test_parse_sample_record_validates_schema():
    sample = parse_sample_record(
        {
            "sample_id": "s1",
            "gesture_id": "stop",
            "gesture_type": "static",
            "signer_id": "signer_a",
            "session_id": "sess_1",
            "isl_verified": False,
            "frames": [
                {"landmarks": [_make_base_hand()], "handedness": [{"categoryName": "Right"}]}
            ],
        }
    )
    assert sample.gesture_id == "stop"
    assert sample.label == "Stop"
    assert len(sample.frames) == 1
    assert len(sample.frames[0]) == FRAME_FEATURE_DIM
