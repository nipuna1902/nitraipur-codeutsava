import os
import sys
import json
import time
import numpy as np
import pandas as pd
from scipy.stats import skew, kurtosis

# File paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR = os.path.join(BASE_DIR, "data", "raw")
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")

os.makedirs(PROCESSED_DIR, exist_ok=True)


def log(msg: str):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}")


def preprocess_electricity_theft_data():
    """
    Preprocess Electricity_Theft_Data.csv:
    - Shape in raw: (9957, 367)
    - Row 0 is a dummy index row (1.0..365.0) which is dropped.
    - CONS_NO is consumer ID.
    - CHK_STATE is target label (1.0 = theft, 0.0 = normal).
    - Date columns format: DD-MM-YY (e.g., 01-01-15 to 31-12-15).
    """
    raw_path = os.path.join(RAW_DIR, "Electricity_Theft_Data.csv")
    log(f"Loading {raw_path}...")
    df = pd.read_csv(raw_path)

    # 1. Drop dummy row 0 if CONS_NO is NaN and first date column has 1.0
    if pd.isna(df.iloc[0]["CONS_NO"]):
        log("Dropping dummy index header row (row 0)...")
        df = df.iloc[1:].reset_index(drop=True)

    # 2. Extract and format Consumer ID and Label
    labels = df["CHK_STATE"].fillna(0.0).astype(int)
    consumer_ids = df["CONS_NO"].apply(
        lambda x: f"ETH_{int(float(x))}" if pd.notna(x) else "ETH_UNKNOWN"
    )

    # Date columns are all columns except CONS_NO and CHK_STATE
    date_cols = [c for c in df.columns if c not in ["CONS_NO", "CHK_STATE"]]

    # 3. Parse and sort dates chronologically
    # Date strings are DD-MM-YY -> e.g. 01-01-15 -> 2015-01-01
    dt_map = {}
    for col in date_cols:
        try:
            dt = pd.to_datetime(col, format="%d-%m-%y")
            dt_map[col] = dt
        except Exception:
            dt_map[col] = pd.to_datetime(col)

    sorted_cols = sorted(date_cols, key=lambda c: dt_map[c])
    formatted_date_cols = [dt_map[c].strftime("%Y-%m-%d") for c in sorted_cols]

    # Reorder time series dataframe
    ts_df = df[sorted_cols].astype(float)
    ts_df.columns = formatted_date_cols

    # 4. Clean invalid consumption (negative values -> NaN)
    ts_df[ts_df < 0] = np.nan

    # Track missing values before imputation
    total_cells = ts_df.size
    missing_before = ts_df.isna().sum().sum()

    # 5. Time-series missing value imputation:
    # Interpolate linearly across rows, then ffill/bfill, then fill remainder with 0.0
    ts_imputed = ts_df.interpolate(axis=1, method="linear", limit_direction="both")
    ts_imputed = ts_imputed.ffill(axis=1).bfill(axis=1).fillna(0.0)

    missing_after = ts_imputed.isna().sum().sum()

    # Combine clean dataframe
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

    return clean_df, meta, formatted_date_cols


def preprocess_sgcc_data():
    """
    Preprocess data.csv (SGCC Electricity Theft Dataset):
    - Shape: (42372, 1036)
    - CONS_NO: string ID
    - FLAG: target label (0 = normal, 1 = theft)
    - Date columns: 2014/1/1 to 2016/10/31 (1034 daily dates)
    """
    raw_path = os.path.join(RAW_DIR, "data.csv")
    log(f"Loading {raw_path}...")
    df = pd.read_csv(raw_path)

    labels = df["FLAG"].fillna(0).astype(int)
    consumer_ids = df["CONS_NO"].astype(str)

    date_cols = [c for c in df.columns if c not in ["CONS_NO", "FLAG"]]

    # Parse and sort dates chronologically (since raw CSV dates are lexicographically ordered)
    dt_map = {}
    for col in date_cols:
        dt = pd.to_datetime(col, format="%Y/%m/%d")
        dt_map[col] = dt

    sorted_cols = sorted(date_cols, key=lambda c: dt_map[c])
    formatted_date_cols = [dt_map[c].strftime("%Y-%m-%d") for c in sorted_cols]

    # Extract time-series values
    ts_df = df[sorted_cols].astype(float)
    ts_df.columns = formatted_date_cols

    # Clean invalid consumption (negative values -> NaN)
    ts_df[ts_df < 0] = np.nan

    total_cells = ts_df.size
    missing_before = ts_df.isna().sum().sum()

    log("Performing time-series missing value imputation for SGCC dataset...")
    # Fast row-wise interpolation + fill
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

    return clean_df, meta, formatted_date_cols


def extract_features(clean_df, date_cols, dataset_name):
    """
    Extract statistical and behavioral baseline features for ML models and Consumer Profiles.
    """
    log(f"Extracting consumer baseline features for {dataset_name}...")
    ts_data = clean_df[date_cols].values
    n_consumers = ts_data.shape[0]

    means = np.mean(ts_data, axis=1)
    medians = np.median(ts_data, axis=1)
    stds = np.std(ts_data, axis=1)
    mins = np.min(ts_data, axis=1)
    maxs = np.max(ts_data, axis=1)
    q25 = np.percentile(ts_data, 25, axis=1)
    q75 = np.percentile(ts_data, 75, axis=1)
    iqr = q75 - q25

    # Load factor: mean / (max + 1e-6)
    load_factor = means / (maxs + 1e-6)
    # Coefficient of Variation: std / (mean + 1e-6)
    cv = stds / (means + 1e-6)

    # Zero consumption ratio (< 0.01 kWh)
    zero_ratio = np.mean(ts_data < 0.01, axis=1)

    # Day-over-day changes
    diffs = np.diff(ts_data, axis=1)
    max_daily_spike = np.max(diffs, axis=1) if diffs.shape[1] > 0 else np.zeros(n_consumers)
    max_daily_drop = np.abs(np.min(diffs, axis=1)) if diffs.shape[1] > 0 else np.zeros(n_consumers)

    # Skewness and Kurtosis (row-wise)
    skews = skew(ts_data, axis=1, nan_policy="omit")
    kurts = kurtosis(ts_data, axis=1, nan_policy="omit")
    skews = np.nan_to_num(skews, nan=0.0)
    kurts = np.nan_to_num(kurts, nan=0.0)

    # Flatline days ratio: consecutive identical readings
    flatline_count = np.sum(np.abs(diffs) < 1e-5, axis=1)
    flatline_ratio = flatline_count / float(ts_data.shape[1] - 1)

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
        "zero_days_ratio": np.round(zero_ratio, 4),
        "flatline_ratio": np.round(flatline_ratio, 4),
        "max_daily_spike": np.round(max_daily_spike, 4),
        "max_daily_drop": np.round(max_daily_drop, 4)
    })

    out_file = os.path.join(PROCESSED_DIR, f"features_{dataset_name.lower()}.csv")
    feature_df.to_csv(out_file, index=False)
    log(f"Saved feature matrix to {out_file} ({feature_df.shape[0]} rows, {feature_df.shape[1]} cols)")
    return feature_df


def generate_telemetry_schema_sample(clean_df, date_cols, n_consumers=50, n_days=30):
    """
    Generate long-format telemetry dataset sample adhering to the Electron DB schema:
    consumer_id, timestamp, voltage, current, power, energy, meter_status, communication_status
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
            # Simulated telemetry values based on daily energy
            voltage = round(np.random.normal(230.0, 3.5), 2)
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
    log("Starting Data Preprocessing Pipeline for Electron Project...")
    start_t = time.time()

    # Process Dataset 1: Electricity Theft Data
    clean_eth, meta_eth, dates_eth = preprocess_electricity_theft_data()
    features_eth = extract_features(clean_eth, dates_eth, "electricity_theft")

    # Process Dataset 2: SGCC Data
    clean_sgcc, meta_sgcc, dates_sgcc = preprocess_sgcc_data()
    features_sgcc = extract_features(clean_sgcc, dates_sgcc, "sgcc")

    # Generate schema telemetry sample
    generate_telemetry_schema_sample(clean_eth, dates_eth, n_consumers=100, n_days=30)

    # Save Metadata summary JSON
    overall_meta = {
        "processed_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "datasets": {
            "electricity_theft": meta_eth,
            "sgcc": meta_sgcc
        },
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

    log(f"Pipeline completed successfully in {time.time() - start_t:.2f} seconds.")
    log(f"Metadata written to {meta_path}")


if __name__ == "__main__":
    main()
