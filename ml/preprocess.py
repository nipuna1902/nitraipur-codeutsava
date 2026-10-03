import os
import sys
import json
import time
import numpy as np
import pandas as pd
from scipy.stats import skew, kurtosis
from sklearn.ensemble import IsolationForest

# File paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR = os.path.join(BASE_DIR, "data", "raw")
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")

os.makedirs(PROCESSED_DIR, exist_ok=True)


def log(msg: str):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}")


def get_longest_consecutive_streak(arr_bool):
    """
    Compute maximum consecutive True values in a boolean 1D array.
    """
    max_streak = 0
    curr_streak = 0
    for val in arr_bool:
        if val:
            curr_streak += 1
            if curr_streak > max_streak:
                max_streak = curr_streak
        else:
            curr_streak = 0
    return max_streak


def get_row_streaks(bool_matrix):
    """
    Compute longest consecutive True streak for each row in a 2D boolean matrix.
    """
    streaks = np.zeros(bool_matrix.shape[0], dtype=int)
    for i in range(bool_matrix.shape[0]):
        streaks[i] = get_longest_consecutive_streak(bool_matrix[i])
    return streaks


def preprocess_electricity_theft_data():
    """
    Preprocess Electricity_Theft_Data.csv:
    - Raw shape: (9957, 367)
    - Row 0 dummy index row is dropped.
    - CONS_NO is consumer ID.
    - CHK_STATE is target label (1.0 = theft, 0.0 = normal).
    - Date columns format: DD-MM-YY.
    """
    raw_path = os.path.join(RAW_DIR, "Electricity_Theft_Data.csv")
    log(f"Loading {raw_path}...")
    df = pd.read_csv(raw_path)

    # 1. Drop dummy row 0 if CONS_NO is NaN
    if pd.isna(df.iloc[0]["CONS_NO"]):
        log("Dropping dummy index header row (row 0)...")
        df = df.iloc[1:].reset_index(drop=True)

    # 2. Extract consumer ID and target label
    labels = df["CHK_STATE"].fillna(0.0).astype(int)
    consumer_ids = df["CONS_NO"].apply(
        lambda x: f"ETH_{int(float(x))}" if pd.notna(x) else "ETH_UNKNOWN"
    )

    date_cols = [c for c in df.columns if c not in ["CONS_NO", "CHK_STATE"]]

    # 3. Parse and sort dates chronologically
    dt_map = {}
    for col in date_cols:
        try:
            dt = pd.to_datetime(col, format="%d-%m-%y")
            dt_map[col] = dt
        except Exception:
            dt_map[col] = pd.to_datetime(col)

    sorted_cols = sorted(date_cols, key=lambda c: dt_map[c])
    formatted_date_cols = [dt_map[c].strftime("%Y-%m-%d") for c in sorted_cols]

    ts_df = df[sorted_cols].astype(float)
    ts_df.columns = formatted_date_cols

    # Replace invalid values
    ts_df[ts_df < 0] = np.nan

    total_cells = ts_df.size
    missing_before = ts_df.isna().sum().sum()
    missing_ratio_per_row = ts_df.isna().mean(axis=1).values

    # 4. Impute missing time series values
    ts_imputed = ts_df.interpolate(axis=1, method="linear", limit_direction="both")
    ts_imputed = ts_imputed.ffill(axis=1).bfill(axis=1).fillna(0.0)

    missing_after = ts_imputed.isna().sum().sum()

    clean_df = pd.DataFrame({"consumer_id": consumer_ids, "label": labels})
    clean_df = pd.concat([clean_df, ts_imputed], axis=1)

    output_csv = os.path.join(PROCESSED_DIR, "clean_electricity_theft.csv")
    clean_df.to_csv(output_csv, index=False)
    log(f"Saved preprocessed dataset to {output_csv} ({clean_df.shape[0]} rows, {clean_df.shape[1]} cols)")

    meta = {
        "dataset_name": "Electricity_Theft_Data",
        "rows": int(clean_df.shape[0]),
        "total_days": len(formatted_date_cols),
        "start_date": formatted_date_cols[0],
        "end_date": formatted_date_cols[-1],
        "class_distribution": {
            "normal_0": int((labels == 0).sum()),
            "theft_1": int((labels == 1).sum()),
            "theft_ratio": float((labels == 1).mean())
        },
        "missing_before_imputation": int(missing_before),
        "missing_after_imputation": int(missing_after),
        "missing_ratio_before": float(missing_before / total_cells)
    }

    return clean_df, meta, formatted_date_cols, missing_ratio_per_row


def preprocess_sgcc_data():
    """
    Preprocess data.csv (SGCC Dataset):
    - Raw shape: (42372, 1036)
    - CONS_NO: string ID
    - FLAG: target label
    """
    raw_path = os.path.join(RAW_DIR, "data.csv")
    log(f"Loading {raw_path}...")
    df = pd.read_csv(raw_path)

    labels = df["FLAG"].fillna(0).astype(int)
    consumer_ids = df["CONS_NO"].astype(str)

    date_cols = [c for c in df.columns if c not in ["CONS_NO", "FLAG"]]

    dt_map = {}
    for col in date_cols:
        dt = pd.to_datetime(col, format="%Y/%m/%d")
        dt_map[col] = dt

    sorted_cols = sorted(date_cols, key=lambda c: dt_map[c])
    formatted_date_cols = [dt_map[c].strftime("%Y-%m-%d") for c in sorted_cols]

    ts_df = df[sorted_cols].astype(float)
    ts_df.columns = formatted_date_cols

    ts_df[ts_df < 0] = np.nan

    total_cells = ts_df.size
    missing_before = ts_df.isna().sum().sum()
    missing_ratio_per_row = ts_df.isna().mean(axis=1).values

    log("Performing time-series missing value imputation for SGCC dataset...")
    ts_imputed = ts_df.interpolate(axis=1, method="linear", limit_direction="both")
    ts_imputed = ts_imputed.ffill(axis=1).bfill(axis=1).fillna(0.0)

    missing_after = ts_imputed.isna().sum().sum()

    clean_df = pd.DataFrame({"consumer_id": consumer_ids, "label": labels})
    clean_df = pd.concat([clean_df, ts_imputed], axis=1)

    output_csv = os.path.join(PROCESSED_DIR, "clean_sgcc.csv")
    clean_df.to_csv(output_csv, index=False)
    log(f"Saved preprocessed dataset to {output_csv} ({clean_df.shape[0]} rows, {clean_df.shape[1]} cols)")

    meta = {
        "dataset_name": "SGCC_Electricity_Theft_Data",
        "rows": int(clean_df.shape[0]),
        "total_days": len(formatted_date_cols),
        "start_date": formatted_date_cols[0],
        "end_date": formatted_date_cols[-1],
        "class_distribution": {
            "normal_0": int((labels == 0).sum()),
            "theft_1": int((labels == 1).sum()),
            "theft_ratio": float((labels == 1).mean())
        },
        "missing_before_imputation": int(missing_before),
        "missing_after_imputation": int(missing_after),
        "missing_ratio_before": float(missing_before / total_cells)
    }

    return clean_df, meta, formatted_date_cols, missing_ratio_per_row


def extract_enhanced_features(clean_df, date_cols, missing_ratio_per_row, dataset_name):
    """
    Extract comprehensive statistical, temporal, and anomaly baseline features.
    Includes:
    - Personal baseline (mean, median, std, min, max, iqr, skewness, kurtosis, load_factor, cv)
    - Multi-window temporal features (last 7, 14, 30-day means, historical mean)
    - Recent vs historical ratio & drop percentage
    - Zero streaks, sustained low streaks, flatline ratio
    - Rolling volatility change
    - Auxiliary Isolation Forest Anomaly Score
    """
    log(f"Extracting enhanced baseline & temporal features for {dataset_name}...")
    ts_data = clean_df[date_cols].values
    n_consumers, n_days = ts_data.shape

    means = np.mean(ts_data, axis=1)
    medians = np.median(ts_data, axis=1)
    stds = np.std(ts_data, axis=1)
    mins = np.min(ts_data, axis=1)
    maxs = np.max(ts_data, axis=1)
    q25 = np.percentile(ts_data, 25, axis=1)
    q75 = np.percentile(ts_data, 75, axis=1)
    iqr = q75 - q25

    load_factor = means / (maxs + 1e-6)
    cv = stds / (means + 1e-6)

    # Multi-window recent means
    last_7d_mean = np.mean(ts_data[:, -7:], axis=1) if n_days >= 7 else means
    last_14d_mean = np.mean(ts_data[:, -14:], axis=1) if n_days >= 14 else means
    last_30d_mean = np.mean(ts_data[:, -30:], axis=1) if n_days >= 30 else means

    historical_mean = np.mean(ts_data[:, :-14], axis=1) if n_days > 14 else means

    recent_vs_hist_ratio = last_14d_mean / (historical_mean + 1e-6)
    recent_vs_hist_drop_pct = np.clip(
        (historical_mean - last_14d_mean) / (historical_mean + 1e-6) * 100.0,
        -100.0, 100.0
    )

    # Zero days & streaks
    zero_days_mask = ts_data < 0.01
    zero_ratio = np.mean(zero_days_mask, axis=1)
    longest_zero_streak = get_row_streaks(zero_days_mask)

    # Sustained low consumption streak (< 10% of personal mean)
    threshold_low = (means * 0.10)[:, np.newaxis]
    low_days_mask = ts_data < threshold_low
    sustained_low_streak = get_row_streaks(low_days_mask)

    # Day-over-day changes
    diffs = np.diff(ts_data, axis=1)
    max_daily_spike = np.max(diffs, axis=1) if diffs.shape[1] > 0 else np.zeros(n_consumers)
    max_daily_drop = np.abs(np.min(diffs, axis=1)) if diffs.shape[1] > 0 else np.zeros(n_consumers)

    # Flatline ratio (consecutive identical readings)
    flatline_count = np.sum(np.abs(diffs) < 1e-5, axis=1)
    flatline_ratio = flatline_count / float(max(1, ts_data.shape[1] - 1))

    # Rolling volatility (last 7 days std vs historical std)
    recent_7d_std = np.std(ts_data[:, -7:], axis=1) if n_days >= 7 else stds
    rolling_volatility_change = recent_7d_std / (stds + 1e-6)

    # Skewness & Kurtosis
    skews = skew(ts_data, axis=1, nan_policy="omit")
    kurts = kurtosis(ts_data, axis=1, nan_policy="omit")
    skews = np.nan_to_num(skews, nan=0.0)
    kurts = np.nan_to_num(kurts, nan=0.0)

    # Auxiliary Isolation Forest Anomaly Feature
    log(f"Computing auxiliary Isolation Forest score feature for {dataset_name}...")
    iso = IsolationForest(n_estimators=100, contamination=0.1, random_state=42, n_jobs=-1)
    base_features = np.column_stack([means, stds, load_factor, cv, zero_ratio, flatline_ratio])
    iso.fit(base_features)
    iso_scores = -iso.score_samples(base_features)
    iso_anomaly_score = (iso_scores - iso_scores.min()) / (iso_scores.max() - iso_scores.min() + 1e-6)

    feature_df = pd.DataFrame({
        "consumer_id": clean_df["consumer_id"],
        "label": clean_df["label"],
        "mean_consumption": np.round(means, 4),
        "median_consumption": np.round(medians, 4),
        "std_consumption": np.round(stds, 4),
        "min_consumption": np.round(mins, 4),
        "max_consumption": np.round(maxs, 4),
        "iqr_consumption": np.round(iqr, 4),
        "skewness": np.round(skews, 4),
        "kurtosis": np.round(kurts, 4),
        "load_factor": np.round(load_factor, 4),
        "cv": np.round(cv, 4),
        "last_7d_mean": np.round(last_7d_mean, 4),
        "last_14d_mean": np.round(last_14d_mean, 4),
        "last_30d_mean": np.round(last_30d_mean, 4),
        "historical_mean": np.round(historical_mean, 4),
        "recent_vs_hist_ratio": np.round(recent_vs_hist_ratio, 4),
        "recent_vs_hist_drop_pct": np.round(recent_vs_hist_drop_pct, 4),
        "zero_days_ratio": np.round(zero_ratio, 4),
        "longest_zero_streak": longest_zero_streak,
        "sustained_low_streak": sustained_low_streak,
        "flatline_ratio": np.round(flatline_ratio, 4),
        "max_daily_spike": np.round(max_daily_spike, 4),
        "max_daily_drop": np.round(max_daily_drop, 4),
        "rolling_volatility_change": np.round(rolling_volatility_change, 4),
        "missing_reading_ratio": np.round(missing_ratio_per_row, 4),
        "isolation_forest_anomaly_score": np.round(iso_anomaly_score, 4)
    })

    out_file = os.path.join(PROCESSED_DIR, f"features_{dataset_name.lower()}.csv")
    feature_df.to_csv(out_file, index=False)
    log(f"Saved feature matrix to {out_file} ({feature_df.shape[0]} rows, {feature_df.shape[1]} cols)")
    return feature_df


def generate_telemetry_schema_sample(clean_df, date_cols, n_consumers=100, n_days=30):
    """
    Generate telemetry sample file adhering to Electron DB schema.
    """
    log("Generating telemetry sample according to Electron schema...")
    sample_df = clean_df.head(n_consumers)
    selected_dates = date_cols[:n_days]

    records = []
    for _, row in sample_df.iterrows():
        cid = row["consumer_id"]
        label = row["label"]
        for d in selected_dates:
            energy_val = float(row[d])
            voltage = round(float(np.random.normal(230.0, 3.5)), 2)
            current = round(energy_val / (230.0 * 0.9 / 1000.0 + 1e-4), 2) if energy_val > 0 else 0.0
            power = round(voltage * current * 0.9 / 1000.0, 3)

            meter_status = "FAULT" if (label == 1 and np.random.rand() < 0.2) else "NORMAL"
            comm_status = "DISCONNECTED" if (energy_val == 0 and np.random.rand() < 0.3) else "CONNECTED"

            records.append({
                "consumer_id": cid,
                "timestamp": f"{d}T12:00:00Z",
                "voltage": voltage,
                "current": current,
                "power": power,
                "energy": round(energy_val, 3),
                "meter_status": meter_status,
                "communication_status": comm_status,
                "ground_truth_anomaly": int(label)
            })

    telemetry_df = pd.DataFrame(records)
    out_file = os.path.join(PROCESSED_DIR, "telemetry_sample.csv")
    telemetry_df.to_csv(out_file, index=False)
    log(f"Saved telemetry sample schema file to {out_file} ({len(telemetry_df)} rows)")


def main():
    log("Starting Enhanced Feature Preprocessing Pipeline for Electron...")
    start_t = time.time()

    clean_eth, meta_eth, dates_eth, miss_eth = preprocess_electricity_theft_data()
    features_eth = extract_enhanced_features(clean_eth, dates_eth, miss_eth, "electricity_theft")

    clean_sgcc, meta_sgcc, dates_sgcc, miss_sgcc = preprocess_sgcc_data()
    features_sgcc = extract_enhanced_features(clean_sgcc, dates_sgcc, miss_sgcc, "sgcc")

    generate_telemetry_schema_sample(clean_eth, dates_eth, n_consumers=100, n_days=30)

    overall_meta = {
        "processed_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "datasets": {
            "electricity_theft": meta_eth,
            "sgcc": meta_sgcc
        },
        "feature_count": features_sgcc.shape[1] - 2,
        "processed_files": [
            "data/processed/clean_electricity_theft.csv",
            "data/processed/clean_sgcc.csv",
            "data/processed/features_electricity_theft.csv",
            "data/processed/features_sgcc.csv",
            "data/processed/telemetry_sample.csv"
        ]
    }

    meta_path = os.path.join(PROCESSED_DIR, "dataset_metadata.json")
    with open(meta_path, "w") as f:
        json.dump(overall_meta, f, indent=2)

    log(f"Enhanced preprocessing completed in {time.time() - start_t:.2f} seconds.")


if __name__ == "__main__":
    main()
