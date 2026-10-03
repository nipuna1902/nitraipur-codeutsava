from __future__ import annotations

from typing import Iterable

import numpy as np
import pandas as pd


ID_COLUMNS = ["consumer_id", "label"]

SUPERVISED_TRAINING_FILES = [
    "features_sgcc.csv",
    "features_electricity_theft.csv",
]

NON_TRAINING_DEMO_FILES = [
    "telemetry_sample.csv",
]

FEATURE_COLUMNS = [
    "mean_consumption",
    "median_consumption",
    "std_consumption",
    "min_consumption",
    "max_consumption",
    "iqr_consumption",
    "skewness",
    "kurtosis",
    "load_factor",
    "cv",
    "last_7d_mean",
    "last_14d_mean",
    "last_30d_mean",
    "historical_mean",
    "recent_vs_hist_ratio",
    "recent_vs_hist_drop_pct",
    "zero_days_ratio",
    "longest_zero_streak",
    "sustained_low_streak",
    "flatline_ratio",
    "max_daily_spike",
    "max_daily_drop",
    "rolling_volatility_change",
    "missing_reading_ratio",
    "isolation_forest_anomaly_score",
]

PREDICTION_COLUMNS = [
    "consumer_id",
    "risk_score",
    "risk_level",
    "predicted_cause",
    "confidence",
    "anomaly_score",
    "model_version",
    "evidence",
]

MODEL_VERSION = "xgboost_ranker_v1"


def classify_probable_cause(feature_map: dict[str, float], risk_level: str, probability: float) -> str:
    missing_ratio = float(feature_map.get("missing_reading_ratio", 0.0))
    flatline_ratio = float(feature_map.get("flatline_ratio", 0.0))
    zero_streak = float(feature_map.get("longest_zero_streak", 0.0))
    sustained_low_streak = float(feature_map.get("sustained_low_streak", 0.0))
    recent_drop = float(feature_map.get("recent_vs_hist_drop_pct", 0.0))

    if missing_ratio > 0.50:
        return "COMMUNICATION_FAILURE"
    if flatline_ratio >= 0.80 or zero_streak >= 30:
        return "METER_MALFUNCTION"
    if risk_level in {"CRITICAL", "HIGH"} and (
        recent_drop >= 35.0 or sustained_low_streak >= 7 or probability >= 0.85
    ):
        return "THEFT_TAMPERING"
    if risk_level in {"MEDIUM", "HIGH"} and recent_drop < 15.0 and missing_ratio <= 0.20:
        return "LEGITIMATE_ABNORMAL_CONSUMPTION"
    if risk_level == "LOW":
        return "NORMAL"
    return "UNCERTAIN"


def validate_feature_frame(df: pd.DataFrame, dataset_name: str) -> None:
    missing = [col for col in ID_COLUMNS + FEATURE_COLUMNS if col not in df.columns]
    if missing:
        raise ValueError(
            f"{dataset_name} feature file is stale or incomplete. Missing columns: {missing}. "
            "Run `python -m ml.preprocess` before training."
        )


def get_feature_matrix(df: pd.DataFrame, dataset_name: str) -> tuple[np.ndarray, np.ndarray, list[str]]:
    validate_feature_frame(df, dataset_name)
    feature_df = df[FEATURE_COLUMNS].replace([np.inf, -np.inf], np.nan).fillna(0.0)
    return feature_df.values, df["label"].astype(int).values, FEATURE_COLUMNS.copy()


def build_prediction_records(
    consumer_ids: Iterable[str],
    probabilities: np.ndarray,
    risk_scores: np.ndarray,
    risk_levels: list[str],
    feature_rows: np.ndarray,
    feature_columns: list[str],
    model_version: str = MODEL_VERSION,
) -> list[dict]:
    records = []
    for cid, prob, risk_score, risk_level, values in zip(
        consumer_ids, probabilities, risk_scores, risk_levels, feature_rows
    ):
        feature_map = {name: float(value) for name, value in zip(feature_columns, values)}
        feature_pairs = sorted(
            feature_map.items(),
            key=lambda item: abs(float(item[1])),
            reverse=True,
        )
        evidence = [
            {
                "feature": name,
                "value": round(float(value), 4),
                "direction": "supports_anomaly",
            }
            for name, value in feature_pairs[:5]
        ]
        records.append(
            {
                "consumer_id": str(cid),
                "risk_score": round(float(risk_score), 1),
                "risk_level": risk_level,
                "predicted_cause": classify_probable_cause(feature_map, risk_level, float(prob)),
                "confidence": round(float(max(prob, 1.0 - prob)), 4),
                "anomaly_score": round(float(prob), 4),
                "model_version": model_version,
                "evidence": evidence,
            }
        )
    return records
