from __future__ import annotations

import json
import math
import pickle
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np

from ml.contracts import FEATURE_COLUMNS, MODEL_VERSION, classify_probable_cause


BASE_DIR = Path(__file__).resolve().parents[3]
ARTIFACTS_DIR = BASE_DIR / "ml" / "artifacts"
MODEL_PATH = ARTIFACTS_DIR / "best_production_model.pkl"
FEATURE_COLUMNS_PATH = ARTIFACTS_DIR / "feature_columns.json"
THRESHOLDS_PATH = ARTIFACTS_DIR / "thresholds.json"


class SimulationModelUnavailable(RuntimeError):
    pass


@lru_cache(maxsize=1)
def _load_model_bundle() -> dict[str, Any]:
    if not MODEL_PATH.exists():
        raise SimulationModelUnavailable(f"Missing model artifact: {MODEL_PATH}")
    if not FEATURE_COLUMNS_PATH.exists():
        raise SimulationModelUnavailable(f"Missing feature columns artifact: {FEATURE_COLUMNS_PATH}")

    with MODEL_PATH.open("rb") as f:
        model = pickle.load(f)
    with FEATURE_COLUMNS_PATH.open("r", encoding="utf-8") as f:
        feature_columns = json.load(f)
    thresholds = {}
    if THRESHOLDS_PATH.exists():
        with THRESHOLDS_PATH.open("r", encoding="utf-8") as f:
            thresholds = json.load(f)

    missing = [column for column in FEATURE_COLUMNS if column not in feature_columns]
    if missing:
        raise SimulationModelUnavailable(f"Feature artifact is missing columns: {missing}")
    if not hasattr(model, "predict_proba"):
        raise SimulationModelUnavailable("Loaded production artifact does not support predict_proba")

    return {
        "model": model,
        "feature_columns": feature_columns,
        "thresholds": thresholds,
    }


def infer_known_injection(payload) -> dict[str, Any]:
    bundle = _load_model_bundle()
    feature_map = build_simulation_feature_map(
        payload.injection_type,
        payload.normal_reference_snapshot or payload.baseline_snapshot,
        payload.injected_snapshot,
        payload.severity,
        payload.duration_ticks,
    )
    row = np.array([[float(feature_map.get(column, 0.0)) for column in bundle["feature_columns"]]], dtype=float)
    probability = float(bundle["model"].predict_proba(row)[0][1])
    risk_score = round(probability * 100.0, 1)
    risk_level = risk_level_for(risk_score, feature_map)
    predicted_cause = classify_probable_cause(feature_map, risk_level, probability)

    return {
        "probability": probability,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "predicted_cause": predicted_cause,
        "confidence": round(max(probability, 1.0 - probability), 4),
        "anomaly_score": round(probability, 4),
        "model_version": bundle["thresholds"].get("model_version", MODEL_VERSION),
        "production_model": bundle["thresholds"].get("production_model", "XGBoost"),
        "selected_threshold": bundle["thresholds"].get("selected_threshold"),
        "features": feature_map,
        "evidence": top_evidence(feature_map),
    }


def build_simulation_feature_map(
    injection_type: str,
    normal_snapshot: dict[str, Any],
    injected_snapshot: dict[str, Any],
    severity: float,
    duration_ticks: int,
) -> dict[str, float]:
    normal_energy = _positive_float(normal_snapshot.get("energy"), 12.8)
    injected_energy = _optional_float(injected_snapshot.get("energy"))
    injected_power = _optional_float(injected_snapshot.get("power"))
    normal_power = _positive_float(normal_snapshot.get("power"), normal_energy * 60.0)
    duration = max(1, min(int(duration_ticks), 60))
    total_days = max(45, duration + 30)
    values = _baseline_series(normal_energy, total_days)

    if injection_type == "MISSING_PACKETS":
        values[-duration:] = np.nan
    elif injection_type == "ZERO_READING":
        values[-duration:] = 0.0
    elif injection_type == "FLATLINE":
        flat_value = normal_energy if injected_energy is None else injected_energy
        values[-duration:] = flat_value
    elif injection_type == "SPIKE_THEN_DROP":
        split = max(1, min(duration - 1, duration // 3))
        values[-duration:-duration + split] = normal_energy * (1.0 + severity * 2.2)
        values[-duration + split:] = max(0.0, normal_energy * (1.0 - severity * 0.82))
    elif injection_type == "TRANSFORMER_MISMATCH":
        reported = _positive_float(injected_snapshot.get("reported_consumer_energy"), normal_energy * 0.25)
        values[-duration:] = reported
    else:
        if injected_energy is not None:
            values[-duration:] = injected_energy
        elif injected_power is not None:
            values[-duration:] = max(0.0, injected_power / max(normal_power, 1.0) * normal_energy)
        else:
            values[-duration:] = max(0.0, normal_energy * (1.0 - severity))

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

    recent_ratio = last_14 / (hist_mean + 1e-6)
    recent_drop = max(-100.0, min(100.0, (hist_mean - last_14) / (hist_mean + 1e-6) * 100.0))
    flatline_ratio = float(np.mean(np.abs(diffs) < 1e-5)) if len(diffs) else 0.0
    rolling_volatility = float(np.std(clean[-7:]) / (std + 1e-6))

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
        "recent_vs_hist_ratio": recent_ratio,
        "recent_vs_hist_drop_pct": recent_drop,
        "zero_days_ratio": float(np.mean(zero_mask)),
        "longest_zero_streak": float(_longest_streak(zero_mask)),
        "sustained_low_streak": float(_longest_streak(low_mask)),
        "flatline_ratio": flatline_ratio,
        "max_daily_spike": float(np.max(diffs)) if len(diffs) else 0.0,
        "max_daily_drop": float(abs(np.min(diffs))) if len(diffs) else 0.0,
        "rolling_volatility_change": rolling_volatility,
        "missing_reading_ratio": missing_ratio,
        "isolation_forest_anomaly_score": _heuristic_anomaly_score(missing_ratio, recent_drop, flatline_ratio, std, mean),
    }
    return {column: float(feature_map.get(column, 0.0)) for column in FEATURE_COLUMNS}


def risk_level_for(risk_score: float, feature_map: dict[str, float]) -> str:
    if feature_map.get("missing_reading_ratio", 0.0) > 0.50:
        return "UNCERTAIN"
    if risk_score >= 85:
        return "CRITICAL"
    if risk_score >= 70:
        return "HIGH"
    if risk_score >= 45:
        return "MEDIUM"
    return "LOW"


def top_evidence(feature_map: dict[str, float]) -> list[dict[str, Any]]:
    priority = [
        "recent_vs_hist_drop_pct",
        "missing_reading_ratio",
        "flatline_ratio",
        "longest_zero_streak",
        "sustained_low_streak",
        "max_daily_spike",
        "max_daily_drop",
        "cv",
    ]
    ranked = sorted(
        ((feature, abs(float(feature_map.get(feature, 0.0)))) for feature in priority),
        key=lambda item: item[1],
        reverse=True,
    )
    return [
        {
            "feature": feature,
            "value": round(float(feature_map.get(feature, 0.0)), 4),
            "direction": "supports_anomaly",
        }
        for feature, _ in ranked[:5]
    ]


def _baseline_series(normal_energy: float, total_days: int) -> np.ndarray:
    base = np.full(total_days, normal_energy, dtype=float)
    for index in range(total_days):
        base[index] += normal_energy * 0.04 * math.sin(index / 3.0)
    return base


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


def _positive_float(value: Any, default: float) -> float:
    parsed = _optional_float(value)
    return default if parsed is None or parsed <= 0 else parsed


def _optional_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(parsed) or math.isinf(parsed):
        return None
    return parsed


def _longest_streak(mask: np.ndarray) -> int:
    longest = 0
    current = 0
    for item in mask:
        if bool(item):
            current += 1
            longest = max(longest, current)
        else:
            current = 0
    return longest


def _skew(values: np.ndarray) -> float:
    std = float(np.std(values))
    if std <= 1e-9:
        return 0.0
    mean = float(np.mean(values))
    return float(np.mean(((values - mean) / std) ** 3))


def _kurtosis(values: np.ndarray) -> float:
    std = float(np.std(values))
    if std <= 1e-9:
        return 0.0
    mean = float(np.mean(values))
    return float(np.mean(((values - mean) / std) ** 4) - 3.0)


def _heuristic_anomaly_score(missing_ratio: float, recent_drop: float, flatline_ratio: float, std: float, mean: float) -> float:
    volatility = min(1.0, std / (mean + 1e-6))
    score = max(missing_ratio, min(1.0, max(0.0, recent_drop) / 100.0), flatline_ratio, volatility)
    return float(max(0.0, min(1.0, score)))
