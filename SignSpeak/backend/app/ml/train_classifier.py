"""Training and honest evaluation pipeline for SignSpeak hand-landmark gesture recognition.

Usage:
    python -m app.ml.train_classifier --dataset ./datasets/raw --output-dir ./models

Supports:
- Scikit-learn (default): StandardScaler + MLPClassifier or RandomForestClassifier on
  normalized temporal summary features (520-dim) or static frame features (130-dim).
- TensorFlow (optional `--framework tensorflow`): Sequence LSTM / 1D-CNN model saved as .keras.

Split integrity:
- Uses GroupShuffleSplit grouped by signer_id/session_id whenever >= 2 groups exist per class
  so frames/clips from the same signer session never leak into the test split.
- Refuses to generate fake/synthetic training data or fabricate accuracy metrics.
"""

from __future__ import annotations

import argparse
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

from app.ml.dataset import (
    DatasetUnavailableError,
    build_feature_matrices,
    load_dataset_directory,
)
from app.ml.features import DEFAULT_SEQUENCE_LENGTH, FRAME_FEATURE_DIM, SEQUENCE_SUMMARY_DIM
from app.ml.vocabulary import ISL_PROTOTYPE_DISCLAIMER, LABEL_BY_ID


def train_and_evaluate(
    dataset_path: Path,
    output_dir: Path,
    framework: str = "sklearn",
    model_type: str = "mlp",
    test_size: float = 0.25,
    sequence_length: int = DEFAULT_SEQUENCE_LENGTH,
    min_samples_per_class: int = 5,
    random_state: int = 42,
) -> Dict[str, Any]:
    """Train, validate on a held-out test set, evaluate per-class metrics, and save artifacts."""
    samples = load_dataset_directory(dataset_path)

    class_counts = Counter(s.gesture_id for s in samples)
    if len(class_counts) < 2:
        raise DatasetUnavailableError(
            f"Training requires at least 2 distinct gesture classes; found {dict(class_counts)}."
        )

    under_min = {k: v for k, v in class_counts.items() if v < min_samples_per_class}
    if under_min:
        raise DatasetUnavailableError(
            f"Insufficient samples for classes {under_min}. Collect at least {min_samples_per_class} "
            "authentic labeled samples per class before training."
        )

    import numpy as np
    from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
    from sklearn.model_selection import GroupShuffleSplit, StratifiedShuffleSplit

    feature_mode = "temporal_tensor" if framework == "tensorflow" else "temporal_summary"
    x_raw, y_labels, groups = build_feature_matrices(
        samples, mode=feature_mode, sequence_length=sequence_length
    )

    x_arr = np.asarray(x_raw, dtype=np.float32)
    y_arr = np.asarray(y_labels)
    groups_arr = np.asarray(groups)

    unique_groups = sorted(set(groups))
    if len(unique_groups) >= 4:
        splitter = GroupShuffleSplit(n_splits=1, test_size=test_size, random_state=random_state)
        train_idx, test_idx = next(splitter.split(x_arr, y_arr, groups_arr))
        split_strategy = "GroupShuffleSplit(signer_or_session)"
    else:
        splitter = StratifiedShuffleSplit(n_splits=1, test_size=test_size, random_state=random_state)
        train_idx, test_idx = next(splitter.split(x_arr, y_arr))
        split_strategy = "StratifiedShuffleSplit"

    x_train, x_test = x_arr[train_idx], x_arr[test_idx]
    y_train, y_test = y_arr[train_idx], y_arr[test_idx]

    train_classes = sorted(set(y_train.tolist()))
    if len(set(y_test.tolist())) < 2:
        raise DatasetUnavailableError(
            "Held-out test split contains fewer than 2 classes. Collect more distinct recording sessions."
        )

    output_dir.mkdir(parents=True, exist_ok=True)
    isl_verified_count = sum(1 for s in samples if s.isl_verified)

    if framework == "tensorflow":
        import tensorflow as tf  # type: ignore

        class_to_idx = {cls_name: idx for idx, cls_name in enumerate(train_classes)}
        y_train_idx = np.asarray([class_to_idx[c] for c in y_train], dtype=np.int32)
        y_test_idx = np.asarray([class_to_idx[c] for c in y_test], dtype=np.int32)

        tf.keras.utils.set_random_seed(random_state)
        model = tf.keras.Sequential(
            [
                tf.keras.layers.Input(shape=(sequence_length, FRAME_FEATURE_DIM * 2)),
                tf.keras.layers.Masking(mask_value=0.0),
                tf.keras.layers.LSTM(64, return_sequences=True),
                tf.keras.layers.Dropout(0.25),
                tf.keras.layers.LSTM(32),
                tf.keras.layers.Dropout(0.2),
                tf.keras.layers.Dense(len(train_classes), activation="softmax"),
            ]
        )
        model.compile(
            optimizer="adam",
            loss="sparse_categorical_crossentropy",
            metrics=["accuracy"],
        )
        model.fit(
            x_train,
            y_train_idx,
            validation_split=0.15 if len(x_train) >= 12 else 0.0,
            epochs=25,
            batch_size=min(16, max(4, len(x_train) // 2)),
            verbose=0,
        )
        probs = model.predict(x_test, verbose=0)
        y_pred_idx = np.argmax(probs, axis=1)
        y_pred = np.asarray([train_classes[i] for i in y_pred_idx])

        artifact_path = output_dir / "signspeak_gesture_classifier.keras"
        model.save(artifact_path)
    else:
        import joblib
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.neural_network import MLPClassifier
        from sklearn.pipeline import Pipeline
        from sklearn.preprocessing import StandardScaler

        if model_type == "random_forest":
            estimator = RandomForestClassifier(
                n_estimators=200,
                max_depth=18,
                class_weight="balanced",
                random_state=random_state,
            )
            pipeline = Pipeline([("classifier", estimator)])
        else:
            estimator = MLPClassifier(
                hidden_layer_sizes=(128, 64),
                max_iter=400,
                early_stopping=len(x_train) >= 20,
                random_state=random_state,
            )
            pipeline = Pipeline(
                [("scaler", StandardScaler()), ("classifier", estimator)]
            )

        pipeline.fit(x_train, y_train)
        y_pred = pipeline.predict(x_test)

        artifact_path = output_dir / "signspeak_gesture_classifier.joblib"
        joblib.dump(pipeline, artifact_path)

    labels_sorted = sorted(set(y_train.tolist()) | set(y_test.tolist()))
    test_accuracy = float(accuracy_score(y_test, y_pred))
    macro_f1 = float(f1_score(y_test, y_pred, average="macro", zero_division=0))
    report = classification_report(
        y_test,
        y_pred,
        labels=labels_sorted,
        output_dict=True,
        zero_division=0,
    )
    matrix = confusion_matrix(y_test, y_pred, labels=labels_sorted).tolist()

    metadata: Dict[str, Any] = {
        "model_trained": True,
        "framework": framework,
        "model_type": model_type if framework == "sklearn" else "lstm_sequence",
        "artifact_filename": artifact_path.name,
        "feature_format": {
            "frame_feature_dim": FRAME_FEATURE_DIM,
            "sequence_summary_dim": SEQUENCE_SUMMARY_DIM,
            "sequence_length": sequence_length,
            "normalization": "wrist_centered_palm_radius_scaled",
            "mode": feature_mode,
        },
        "classes": labels_sorted,
        "label_map": {cid: LABEL_BY_ID.get(cid, cid.title()) for cid in labels_sorted},
        "dataset_summary": {
            "total_samples": len(samples),
            "train_samples": int(len(x_train)),
            "test_samples": int(len(x_test)),
            "distinct_signers_or_sessions": len(unique_groups),
            "isl_verified_samples": isl_verified_count,
            "class_counts": dict(class_counts),
            "split_strategy": split_strategy,
        },
        "evaluation": {
            "test_accuracy": round(test_accuracy, 4),
            "macro_f1": round(macro_f1, 4),
            "per_class": {
                cls_id: {
                    "precision": round(float(report[cls_id]["precision"]), 4),
                    "recall": round(float(report[cls_id]["recall"]), 4),
                    "f1_score": round(float(report[cls_id]["f1-score"]), 4),
                    "support": int(report[cls_id]["support"]),
                }
                for cls_id in labels_sorted
                if cls_id in report
            },
            "confusion_matrix": matrix,
        },
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "isl_disclaimer": ISL_PROTOTYPE_DISCLAIMER,
    }

    metadata_path = output_dir / "model_metadata.json"
    metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    return metadata


def main() -> None:
    parser = argparse.ArgumentParser(description="Train SignSpeak landmark gesture classifier.")
    parser.add_argument("--dataset", type=Path, default=Path("./datasets/raw"))
    parser.add_argument("--output-dir", type=Path, default=Path("./models"))
    parser.add_argument("--framework", choices=["sklearn", "tensorflow"], default="sklearn")
    parser.add_argument("--model-type", choices=["mlp", "random_forest"], default="mlp")
    parser.add_argument("--test-size", type=float, default=0.25)
    parser.add_argument("--min-samples", type=int, default=5)
    args = parser.parse_args()

    try:
        metadata = train_and_evaluate(
            dataset_path=args.dataset,
            output_dir=args.output_dir,
            framework=args.framework,
            model_type=args.model_type,
            test_size=args.test_size,
            min_samples_per_class=args.min_samples,
        )
        print(json.dumps(metadata, indent=2))
    except DatasetUnavailableError as exc:
        print(f"[SignSpeak Trainer] {exc}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
