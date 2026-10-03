import os
import json
import pytest
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")


def test_processed_files_exist():
    expected_files = [
        "clean_electricity_theft.csv",
        "clean_sgcc.csv",
        "features_electricity_theft.csv",
        "features_sgcc.csv",
        "telemetry_sample.csv",
        "dataset_metadata.json"
    ]
    for fname in expected_files:
        fpath = os.path.join(PROCESSED_DIR, fname)
        assert os.path.exists(fpath), f"Processed file missing: {fname}"
        assert os.path.getsize(fpath) > 0, f"Processed file is empty: {fname}"


def test_electricity_theft_data_integrity():
    fpath = os.path.join(PROCESSED_DIR, "clean_electricity_theft.csv")
    df = pd.read_csv(fpath)
    assert len(df) == 9956
    assert "consumer_id" in df.columns
    assert "label" in df.columns
    assert df["label"].isin([0, 1]).all()
    # 365 days + consumer_id + label = 367 columns
    assert df.shape[1] == 367
    assert df.isna().sum().sum() == 0, "Found NaNs in clean electricity theft dataset"


def test_sgcc_data_integrity():
    fpath = os.path.join(PROCESSED_DIR, "clean_sgcc.csv")
    df = pd.read_csv(fpath)
    assert len(df) == 42372
    assert "consumer_id" in df.columns
    assert "label" in df.columns
    assert df["label"].isin([0, 1]).all()
    # 1034 days + consumer_id + label = 1036 columns
    assert df.shape[1] == 1036
    assert df.isna().sum().sum() == 0, "Found NaNs in clean SGCC dataset"


def test_features_extraction():
    fpath_eth = os.path.join(PROCESSED_DIR, "features_electricity_theft.csv")
    df_eth = pd.read_csv(fpath_eth)
    assert len(df_eth) == 9956
    required_cols = [
        "consumer_id", "label", "mean_consumption", "median_consumption",
        "std_consumption", "min_consumption", "max_consumption", "iqr_consumption",
        "skewness", "kurtosis", "load_factor", "cv", "zero_days_ratio", "flatline_ratio"
    ]
    for c in required_cols:
        assert c in df_eth.columns, f"Feature column missing: {c}"

    fpath_sgcc = os.path.join(PROCESSED_DIR, "features_sgcc.csv")
    df_sgcc = pd.read_csv(fpath_sgcc)
    assert len(df_sgcc) == 42372
    for c in required_cols:
        assert c in df_sgcc.columns, f"Feature column missing in SGCC: {c}"


def test_telemetry_schema_sample():
    fpath = os.path.join(PROCESSED_DIR, "telemetry_sample.csv")
    df = pd.read_csv(fpath)
    assert len(df) > 0
    expected_cols = [
        "consumer_id", "timestamp", "voltage", "current",
        "power", "energy", "meter_status", "communication_status"
    ]
    for c in expected_cols:
        assert c in df.columns, f"Telemetry schema column missing: {c}"
