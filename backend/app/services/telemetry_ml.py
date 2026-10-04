from __future__ import annotations

from typing import Any

import numpy as np

from backend.app.schemas.common import MeterStatus
from backend.app.schemas.telemetry import TelemetryReadingOut
from backend.app.services.simulation_ml import infer_feature_map
from ml.contracts import FEATURE_COLUMNS


MIN_HISTORY_READINGS = 30
MAX_HISTORY_READINGS = 60


def analyze_telemetry_history(readings: list[TelemetryReadingOut]) -> dict[str, Any]:
    """Build the training feature contract from raw meter history and infer risk."""
    ordered = sorted(readings, key=lambda item: item.timestamp)[-MAX_HISTORY_READINGS:]
    if len(ordered) < MIN_HISTORY_READINGS:
        return {
            "status": "INSUFFICIENT_HISTORY",
            "readings_used": len(ordered),
            "minimum_readings": MIN_HISTORY_READINGS,
            "meter_status": MeterStatus.UNKNOWN,
            "message": f"Need at least {MIN_HISTORY_READINGS} readings for ML analysis.",
        }

    values = np.array([float(item.energy) for item in ordered], dtype=float)
    missing_mask = np.array(
        [item.communication_status.value in {"DISCONNECTED", "UNKNOWN"} for item in ordered],
        dtype=bool,
    )
    values[missing_mask] = np.nan
    feature_map = _build_feature_map(values)
    inference = infer_feature_map(feature_map)
    meter_status = meter_status_from_inference(inference["predicted_cause"], inference["risk_level"])
    return {
        "status": "ANALYZED",
        "readings_used": len(ordered),
        "minimum_readings": MIN_HISTORY_READINGS,
        "meter_status": meter_status,
        "message": "Telemetry was analyzed by the trained risk model and evidence rules.",
        **inference,
    }


def meter_status_from_inference(predicted_cause: str, risk_level: str) -> MeterStatus:
    if predicted_cause == "METER_MALFUNCTION":
        return MeterStatus.FAULT if risk_level in {"HIGH", "CRITICAL"} else MeterStatus.SUSPECTED_FAULT
    if predicted_cause in {"COMMUNICATION_FAILURE", "UNCERTAIN"}:
        return MeterStatus.UNKNOWN
    return MeterStatus.NORMAL


def _build_feature_map(values: np.ndarray) -> dict[str, float]:
    missing_ratio = float(np.isnan(values).mean())
    clean = _fill_missing(values)
    diffs = np.diff(clean)
    mean = float(np.mean(clean))
    median = float(np.median(clean))
    std = float(np.std(clean))
    min_value = float(np.min(clean))
    max_value = float(np.max(clean))
    q25, q75 = np.percentile(clean, [25, 75])
    historical = clean[:-14] if len(clean) > 14 else clean
    hist_mean = float(np.mean(historical))
    last_7 = float(np.mean(clean[-7:]))
    last_14 = float(np.mean(clean[-14:]))
    last_30 = float(np.mean(clean[-30:]))
    zero_mask = clean < 0.01
    low_mask = clean < (mean * 0.10)
    recent_drop = max(-100.0, min(100.0, (hist_mean - last_14) / (hist_mean + 1e-6) * 100.0))
    flatline_ratio = float(np.mean(np.abs(diffs) < 1e-5)) if len(diffs) else 0.0
    feature_map = {
        "mean_consumption": mean,
        "median_consumption": median,
        "std_consumption": std,
        "min_consumption": min_value,
        "max_consumption": max_value,
        "iqr_consumption": float(q75 - q25),
        "skewness": _skew(clean),
        "kurtosis": _kurtosis(clean),
        "load_factor": mean / (max_value + 1e-6),
        "cv": std / (mean + 1e-6),
        "last_7d_mean": last_7,
        "last_14d_mean": last_14,
        "last_30d_mean": last_30,
        "historical_mean": hist_mean,
        "recent_vs_hist_ratio": last_14 / (hist_mean + 1e-6),
        "recent_vs_hist_drop_pct": recent_drop,
        "zero_days_ratio": float(np.mean(zero_mask)),
        "longest_zero_streak": float(_longest_streak(zero_mask)),
        "sustained_low_streak": float(_longest_streak(low_mask)),
        "flatline_ratio": flatline_ratio,
        "max_daily_spike": float(np.max(diffs)) if len(diffs) else 0.0,
        "max_daily_drop": float(abs(np.min(diffs))) if len(diffs) else 0.0,
        "rolling_volatility_change": float(np.std(clean[-7:]) / (std + 1e-6)),
        "missing_reading_ratio": missing_ratio,
        "isolation_forest_anomaly_score": float(
            max(missing_ratio, min(1.0, max(0.0, recent_drop) / 100.0), flatline_ratio, min(1.0, std / (mean + 1e-6)))
        ),
    }
    return {column: float(feature_map.get(column, 0.0)) for column in FEATURE_COLUMNS}


def _fill_missing(values: np.ndarray) -> np.ndarray:
    series = values.astype(float).copy()
    if not np.isnan(series).any():
        return series
    if np.isnan(series).all():
        return np.zeros_like(series)
    indices = np.arange(len(series))
    valid = ~np.isnan(series)
    series[~valid] = np.interp(indices[~valid], indices[valid], series[valid])
    return series


def _longest_streak(mask: np.ndarray) -> int:
    longest = current = 0
    for item in mask:
        current = current + 1 if bool(item) else 0
        longest = max(longest, current)
    return longest


def _skew(values: np.ndarray) -> float:
    std = float(np.std(values))
    return 0.0 if std <= 1e-9 else float(np.mean(((values - float(np.mean(values))) / std) ** 3))


def _kurtosis(values: np.ndarray) -> float:
    std = float(np.std(values))
    return 0.0 if std <= 1e-9 else float(np.mean(((values - float(np.mean(values))) / std) ** 4) - 3.0)
