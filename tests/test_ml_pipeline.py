import os
import json
import pytest
import pickle
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")
ML_DIR = os.path.join(BASE_DIR, "ml")
ARTIFACTS_DIR = os.path.join(ML_DIR, "artifacts")
EVALUATION_DIR = os.path.join(ML_DIR, "evaluation")


def test_enhanced_feature_columns():
    fpath = os.path.join(PROCESSED_DIR, "features_sgcc.csv")
    df = pd.read_csv(fpath)
    assert len(df) == 42372

    required_features = [
        "consumer_id", "label", "mean_consumption", "std_consumption",
        "last_7d_mean", "last_14d_mean", "last_30d_mean", "historical_mean",
        "recent_vs_hist_ratio", "recent_vs_hist_drop_pct", "zero_days_ratio",
        "longest_zero_streak", "sustained_low_streak", "flatline_ratio",
        "rolling_volatility_change", "missing_reading_ratio",
        "isolation_forest_anomaly_score"
    ]
    for feat in required_features:
        assert feat in df.columns, f"Missing enhanced feature column: {feat}"


def test_evaluation_results_structure():
    fpath = os.path.join(EVALUATION_DIR, "evaluation_results.json")
    assert os.path.exists(fpath)
    with open(fpath, "r") as f:
        res = json.load(f)

    assert "MergedDataset_Holdout" in res
    assert "CrossGrid_Transferability" in res

    merged = res["MergedDataset_Holdout"]
    assert "XGBoost" in merged
    assert "LightGBM" in merged
    assert "Ensemble_XGB_LGB" in merged

    xgb_metrics = merged["XGBoost"]
    assert "val_tuned_threshold" in xgb_metrics
    assert "top_k_ranking_metrics" in xgb_metrics
    assert "test_metrics_at_tuned_threshold" in xgb_metrics
    assert "test_metrics_at_fixed_0.5_baseline" in xgb_metrics

    top_k = xgb_metrics["top_k_ranking_metrics"]
    assert "precision_at_50" in top_k
    assert "precision_at_100" in top_k
    assert "false_positives_per_100_inspected" in top_k
    assert top_k["precision_at_100"] >= 0.70, "Precision@100 should be >= 70% for top inspection queue"


def test_risk_band_distribution():
    fpath = os.path.join(EVALUATION_DIR, "risk_band_distribution.json")
    assert os.path.exists(fpath)
    with open(fpath, "r") as f:
        bands = json.load(f)

    assert "CRITICAL" in bands
    assert "HIGH" in bands
    assert "MEDIUM" in bands
    assert "LOW" in bands
    assert "UNCERTAIN" in bands

    critical_prec = bands["CRITICAL"]["precision"]
    assert critical_prec >= 0.50, f"Critical risk band precision should be high (got {critical_prec})"


def test_best_model_artifact():
    fpath = os.path.join(ARTIFACTS_DIR, "best_xgboost_model.pkl")
    assert os.path.exists(fpath)
    assert os.path.getsize(fpath) > 0

    with open(fpath, "rb") as f:
        model = pickle.load(f)
    assert hasattr(model, "predict_proba")
