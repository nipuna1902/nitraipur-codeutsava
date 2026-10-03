import os
import json
import time
import pickle
import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    precision_score,
    recall_score,
    f1_score,
    fbeta_score,
    confusion_matrix
)
from sklearn.model_selection import train_test_split

from ml.contracts import (
    FEATURE_COLUMNS,
    NON_TRAINING_DEMO_FILES,
    SUPERVISED_TRAINING_FILES,
    build_prediction_records,
    get_feature_matrix,
    validate_feature_frame,
)

try:
    import xgboost as xgb
except ModuleNotFoundError:
    xgb = None

try:
    import lightgbm as lgb
except ModuleNotFoundError:
    lgb = None

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")
ML_DIR = os.path.join(BASE_DIR, "ml")
ARTIFACTS_DIR = os.path.join(ML_DIR, "artifacts")
EVALUATION_DIR = os.path.join(ML_DIR, "evaluation")

os.makedirs(ARTIFACTS_DIR, exist_ok=True)
os.makedirs(EVALUATION_DIR, exist_ok=True)


def log(msg: str):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}")


def load_datasets():
    log("Loading enhanced feature datasets from data/processed...")
    path_sgcc = os.path.join(PROCESSED_DIR, "features_sgcc.csv")
    path_eth = os.path.join(PROCESSED_DIR, "features_electricity_theft.csv")

    df_sgcc = pd.read_csv(path_sgcc)
    df_eth = pd.read_csv(path_eth)

    validate_feature_frame(df_sgcc, "SGCC")
    validate_feature_frame(df_eth, "Electricity Theft")
    feature_cols = FEATURE_COLUMNS.copy()

    log(f"SGCC Shape: {df_sgcc.shape} | Labels: {df_sgcc['label'].value_counts().to_dict()}")
    log(f"Electricity Theft Shape: {df_eth.shape} | Labels: {df_eth['label'].value_counts().to_dict()}")
    log(f"Feature count: {len(feature_cols)} features")
    log(f"Supervised training files: {SUPERVISED_TRAINING_FILES}")
    log(f"Excluded demo/non-training files: {NON_TRAINING_DEMO_FILES}")

    return df_sgcc, df_eth, feature_cols


def find_best_threshold(y_true, y_prob, mode="best_f1"):
    """
    Tune operating threshold on Validation split.
    Finds threshold that maximizes F1 or F2 score.
    Also finds thresholds required to achieve 70%, 80%, 85% recall.
    """
    thresholds = np.linspace(0.05, 0.95, 181)
    best_t = 0.5
    best_score = -1.0

    recall_targets = {0.70: None, 0.80: None, 0.85: None}

    for t in thresholds:
        y_pred = (y_prob >= t).astype(int)
        rec = recall_score(y_true, y_pred, zero_division=0)
        prec = precision_score(y_true, y_pred, zero_division=0)
        
        if mode == "best_f2":
            score = fbeta_score(y_true, y_pred, beta=2, zero_division=0)
        else:
            score = f1_score(y_true, y_pred, zero_division=0)

        if score > best_score:
            best_score = score
            best_t = t

        # Track the highest threshold that still satisfies each recall target.
        # Higher thresholds usually reduce false positives, so this is more useful
        # for field-inspection queues than the first low threshold that passes.
        for target in recall_targets.keys():
            if rec >= target:
                recall_targets[target] = round(float(t), 4)

    return round(float(best_t), 4), recall_targets


def compute_top_k_metrics(y_true, y_prob):
    """
    Compute prototype-friendly ranking metrics:
    - Precision@50, Precision@100
    - Recall@Top5%, Recall@Top10%
    - False Positives per 100 inspected consumers
    """
    order = np.argsort(-y_prob)
    y_true_sorted = y_true[order]
    n_total = len(y_true)
    n_positives = sum(y_true)

    # Top 50 & Top 100
    p_at_50 = float(np.mean(y_true_sorted[:50])) if n_total >= 50 else 0.0
    p_at_100 = float(np.mean(y_true_sorted[:100])) if n_total >= 100 else 0.0
    fp_per_100 = int(100 - np.sum(y_true_sorted[:100])) if n_total >= 100 else 0

    # Top 5% & Top 10%
    k_5pct = int(np.ceil(0.05 * n_total))
    k_10pct = int(np.ceil(0.10 * n_total))

    rec_top_5pct = float(np.sum(y_true_sorted[:k_5pct]) / (n_positives + 1e-6))
    rec_top_10pct = float(np.sum(y_true_sorted[:k_10pct]) / (n_positives + 1e-6))

    return {
        "precision_at_50": round(p_at_50, 4),
        "precision_at_100": round(p_at_100, 4),
        "false_positives_per_100_inspected": fp_per_100,
        "recall_at_top_5_percent": round(rec_top_5pct, 4),
        "recall_at_top_10_percent": round(rec_top_10pct, 4)
    }


def compute_metrics(y_true, y_prob, threshold=0.5):
    """
    Calculate classification metrics at specified threshold.
    """
    y_pred = (y_prob >= threshold).astype(int)
    roc_auc = roc_auc_score(y_true, y_prob)
    pr_auc = average_precision_score(y_true, y_prob)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    f2 = fbeta_score(y_true, y_pred, beta=2, zero_division=0)
    cm = confusion_matrix(y_true, y_pred).tolist()

    return {
        "roc_auc": round(float(roc_auc), 4),
        "pr_auc": round(float(pr_auc), 4),
        "precision": round(float(prec), 4),
        "recall": round(float(rec), 4),
        "f1_score": round(float(f1), 4),
        "f2_score": round(float(f2), 4),
        "confusion_matrix": cm,
        "threshold_used": round(float(threshold), 4)
    }


def assign_risk_bands(y_prob, missing_ratio=None):
    """
    Assign risk score (0-100) and risk band:
    CRITICAL (score >= 85), HIGH (70-84), MEDIUM (45-69), LOW (<45), UNCERTAIN (missingness > 0.5)
    """
    risk_scores = np.round(y_prob * 100.0, 1)
    bands = []
    for idx, s in enumerate(risk_scores):
        if missing_ratio is not None and missing_ratio[idx] > 0.50:
            bands.append("UNCERTAIN")
        elif s >= 85.0:
            bands.append("CRITICAL")
        elif s >= 70.0:
            bands.append("HIGH")
        elif s >= 45.0:
            bands.append("MEDIUM")
        else:
            bands.append("LOW")
    return risk_scores, bands


def choose_production_model_name(suite_results):
    """
    Select the production model for inspection queues.
    Ranking quality is the first priority because Electron recommends field
    inspections rather than issuing a final theft verdict.
    """
    candidates = {
        name: result
        for name, result in suite_results.items()
        if name != "IsolationForest_Aux"
    }
    return max(
        candidates,
        key=lambda name: (
            candidates[name]["top_k_ranking_metrics"]["precision_at_100"],
            candidates[name]["test_metrics_at_tuned_threshold"]["f2_score"],
            candidates[name]["test_metrics_at_tuned_threshold"]["pr_auc"],
        ),
    )


def model_version_for(model_name):
    return f"{model_name.lower()}_ranker_v1"


def train_and_eval_suite(X_train, y_train, X_val, y_val, X_test, y_test, exp_name):
    """
    Train XGBoost, LightGBM, Random Forest, and Ensemble Blend.
    Tune thresholds on Validation split and report test performance.
    """
    log(f"=== Executing Experiment Suite: {exp_name} ===")
    scale_pos = (len(y_train) - sum(y_train)) / (sum(y_train) + 1e-6)

    # 1. XGBoost
    if xgb is None:
        raise RuntimeError("xgboost is required to train the primary Electron ML model.")

    log("Training XGBoost Classifier...")
    xgb_model = xgb.XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.04,
        scale_pos_weight=scale_pos,
        random_state=42,
        eval_metric="logloss"
    )
    xgb_model.fit(X_train, y_train)
    xgb_val_prob = xgb_model.predict_proba(X_val)[:, 1]
    xgb_test_prob = xgb_model.predict_proba(X_test)[:, 1]

    lgb_val_prob = None
    lgb_test_prob = None
    lgb_model = None
    if lgb is not None:
        # 2. LightGBM
        log("Training LightGBM Classifier...")
        lgb_model = lgb.LGBMClassifier(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.04,
            scale_pos_weight=scale_pos,
            random_state=42,
            verbosity=-1
        )
        lgb_model.fit(X_train, y_train)
        lgb_val_prob = lgb_model.predict_proba(X_val)[:, 1]
        lgb_test_prob = lgb_model.predict_proba(X_test)[:, 1]
    else:
        log("LightGBM is not installed; skipping LightGBM and XGB/LGB ensemble.")

    # 3. Random Forest
    log("Training Random Forest Classifier...")
    rf_model = RandomForestClassifier(
        n_estimators=150,
        max_depth=12,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    )
    rf_model.fit(X_train, y_train)
    rf_val_prob = rf_model.predict_proba(X_val)[:, 1]
    rf_test_prob = rf_model.predict_proba(X_test)[:, 1]

    # 4. Ensemble Blend (XGBoost + LightGBM weighted average)
    ens_val_prob = None if lgb_val_prob is None else 0.55 * xgb_val_prob + 0.45 * lgb_val_prob
    ens_test_prob = None if lgb_test_prob is None else 0.55 * xgb_test_prob + 0.45 * lgb_test_prob

    # 5. Standalone Isolation Forest (Auxiliary Baseline)
    log("Evaluating Standalone Isolation Forest...")
    iso = IsolationForest(n_estimators=100, contamination=float(np.mean(y_train)), random_state=42, n_jobs=-1)
    iso.fit(X_train)
    iso_val_scores = -iso.score_samples(X_val)
    iso_test_scores = -iso.score_samples(X_test)
    iso_val_prob = (iso_val_scores - iso_val_scores.min()) / (iso_val_scores.max() - iso_val_scores.min() + 1e-6)
    iso_test_prob = (iso_test_scores - iso_test_scores.min()) / (iso_test_scores.max() - iso_test_scores.min() + 1e-6)

    models_val = {
        "XGBoost": (xgb_val_prob, xgb_test_prob, xgb_model),
        "RandomForest": (rf_val_prob, rf_test_prob, rf_model),
        "IsolationForest_Aux": (iso_val_prob, iso_test_prob, iso)
    }
    if lgb_val_prob is not None and lgb_test_prob is not None:
        models_val["LightGBM"] = (lgb_val_prob, lgb_test_prob, lgb_model)
        models_val["Ensemble_XGB_LGB"] = (ens_val_prob, ens_test_prob, None)

    suite_results = {}

    for mname, (v_prob, t_prob, model_obj) in models_val.items():
        # Tune threshold on Validation split
        best_t, recall_ts = find_best_threshold(y_val, v_prob, mode="best_f1")

        # Evaluate on Test split using tuned threshold
        test_metrics_tuned = compute_metrics(y_test, t_prob, threshold=best_t)
        test_metrics_baseline = compute_metrics(y_test, t_prob, threshold=0.50)
        top_k_metrics = compute_top_k_metrics(y_test, t_prob)

        # Evaluate recall target thresholds on Test set
        recall_target_evals = {}
        for r_target, r_thresh in recall_ts.items():
            if r_thresh is not None:
                recall_target_evals[f"target_recall_{int(r_target*100)}%"] = compute_metrics(y_test, t_prob, threshold=r_thresh)

        suite_results[mname] = {
            "val_tuned_threshold": best_t,
            "test_metrics_at_tuned_threshold": test_metrics_tuned,
            "test_metrics_at_fixed_0.5_baseline": test_metrics_baseline,
            "top_k_ranking_metrics": top_k_metrics,
            "recall_target_scenarios": recall_target_evals
        }

        log(f"[{exp_name} | {mname}] Tuned Threshold: {best_t} -> Test F1: {test_metrics_tuned['f1_score']}, F2: {test_metrics_tuned['f2_score']}, ROC-AUC: {test_metrics_tuned['roc_auc']}, Prec@100: {top_k_metrics['precision_at_100']}")

    test_prob_by_model = {
        "XGBoost": xgb_test_prob,
        "RandomForest": rf_test_prob,
        "IsolationForest_Aux": iso_test_prob,
    }
    trained_models = {
        "XGBoost": xgb_model,
        "RandomForest": rf_model,
        "IsolationForest_Aux": iso,
    }
    if lgb_test_prob is not None:
        test_prob_by_model["LightGBM"] = lgb_test_prob
        trained_models["LightGBM"] = lgb_model
    if ens_test_prob is not None:
        test_prob_by_model["Ensemble_XGB_LGB"] = ens_test_prob

    production_model_name = choose_production_model_name(suite_results)
    production_probs = test_prob_by_model[production_model_name]
    return suite_results, trained_models, production_probs, production_model_name


def main():
    log("Starting ML Improvement Plan Execution (Threshold Tuning, Top-K & Risk Bands)...")
    df_sgcc, df_eth, feature_cols = load_datasets()

    # --- EXPERIMENT 1: Cross-Grid Out-Of-Distribution Transferability ---
    # Train on SGCC (70% Train, 30% Val) -> Test on Electricity Theft
    X_sgcc, y_sgcc, _ = get_feature_matrix(df_sgcc, "SGCC")
    X_eth, y_eth, _ = get_feature_matrix(df_eth, "Electricity Theft")

    X_sgcc_tr, X_sgcc_va, y_sgcc_tr, y_sgcc_va = train_test_split(
        X_sgcc, y_sgcc, test_size=0.30, random_state=42, stratify=y_sgcc
    )

    exp1_results, _, _, _ = train_and_eval_suite(
        X_sgcc_tr, y_sgcc_tr, X_sgcc_va, y_sgcc_va, X_eth, y_eth, exp_name="CrossGrid_Transferability"
    )

    # --- EXPERIMENT 2: Merged Dataset 3-Way Split (70% Train, 15% Val, 15% Test) ---
    df_combined = pd.concat([df_sgcc, df_eth], ignore_index=True)
    X_comb, y_comb, _ = get_feature_matrix(df_combined, "Merged Dataset")
    indices = np.arange(len(df_combined))
    missing_ratio_comb = df_combined.get("missing_reading_ratio", pd.Series(np.zeros(len(df_combined)))).values

    # Step 1: 85% Train/Val, 15% Test
    X_tr_va, X_test, y_tr_va, y_test, miss_tr_va, miss_test, idx_tr_va, idx_test = train_test_split(
        X_comb, y_comb, missing_ratio_comb, indices, test_size=0.15, random_state=42, stratify=y_comb
    )
    # Step 2: Split Train/Val (70% Train total, 15% Val total -> 70/85 = 82.35% of tr_va)
    X_train, X_val, y_train, y_val = train_test_split(
        X_tr_va, y_tr_va, test_size=0.1765, random_state=42, stratify=y_tr_va
    )

    log(f"Merged 3-Way Split -> Train: {X_train.shape[0]}, Val: {X_val.shape[0]}, Test: {X_test.shape[0]}")

    exp2_results, exp2_models, production_test_probs, production_model_name = train_and_eval_suite(
        X_train, y_train, X_val, y_val, X_test, y_test, exp_name="MergedDataset_Holdout"
    )

    # --- Risk Band Assignments on Test Set ---
    risk_scores, risk_bands = assign_risk_bands(production_test_probs, missing_ratio=miss_test)
    test_results_df = pd.DataFrame({
        "consumer_id": df_combined.iloc[idx_test]["consumer_id"].values,
        "true_label": y_test,
        "anomaly_score": np.round(production_test_probs, 4),
        "risk_score": risk_scores,
        "risk_band": risk_bands
    })

    band_counts = pd.Series(risk_bands).value_counts().to_dict()
    band_theft_rates = {}
    for b in ["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNCERTAIN"]:
        sub = test_results_df[test_results_df["risk_band"] == b]
        if len(sub) > 0:
            band_theft_rates[b] = {
                "count": len(sub),
                "actual_theft_count": int(sub["true_label"].sum()),
                "precision": round(float(sub["true_label"].mean()), 4)
            }

    log("Risk Band Distribution & Precision on Test Set:")
    for b, stats in band_theft_rates.items():
        log(f"  - {b:10s}: Count={stats['count']:5d} | Actual Theft={stats['actual_theft_count']:4d} | Precision={stats['precision']:.4f}")

    # --- Feature Importances ---
    importance_model = exp2_models.get(production_model_name) or exp2_models["XGBoost"]
    importances = importance_model.feature_importances_
    fi_df = pd.DataFrame({
        "feature": feature_cols,
        "importance": np.round(importances, 4)
    }).sort_values(by="importance", ascending=False)
    fi_list = fi_df.to_dict(orient="records")

    log("Top 5 Contributing Features for Theft Classification:")
    for item in fi_list[:5]:
        log(f"  - {item['feature']}: {item['importance']:.4f}")

    # --- Save Artifacts ---
    best_model_path = os.path.join(ARTIFACTS_DIR, "best_production_model.pkl")
    model_to_persist = exp2_models.get(production_model_name) or {
        "type": "weighted_average",
        "members": {
            "XGBoost": exp2_models["XGBoost"],
            "LightGBM": exp2_models["LightGBM"],
        },
        "weights": {
            "XGBoost": 0.55,
            "LightGBM": 0.45,
        },
    }
    with open(best_model_path, "wb") as f:
        pickle.dump(model_to_persist, f)

    feature_cols_path = os.path.join(ARTIFACTS_DIR, "feature_columns.json")
    with open(feature_cols_path, "w") as f:
        json.dump(feature_cols, f, indent=2)

    threshold_payload = {
        "model_version": model_version_for(production_model_name),
        "production_model": production_model_name,
        "selected_threshold": exp2_results[production_model_name]["val_tuned_threshold"],
        "selection_policy": "highest Precision@100, then F2, then PR-AUC; IsolationForest_Aux excluded",
        "risk_bands": {
            "CRITICAL": "risk_score >= 85",
            "HIGH": "70 <= risk_score < 85",
            "MEDIUM": "45 <= risk_score < 70",
            "LOW": "risk_score < 45",
            "UNCERTAIN": "missing_reading_ratio > 0.50",
        },
    }
    thresholds_path = os.path.join(ARTIFACTS_DIR, "thresholds.json")
    with open(thresholds_path, "w") as f:
        json.dump(threshold_payload, f, indent=2)

    prediction_records = build_prediction_records(
        consumer_ids=df_combined.iloc[idx_test]["consumer_id"].values,
        probabilities=production_test_probs,
        risk_scores=risk_scores,
        risk_levels=risk_bands,
        feature_rows=X_test,
        feature_columns=feature_cols,
        model_version=model_version_for(production_model_name),
    )

    overall_output = {
        "training_data_policy": {
            "supervised_training_files": SUPERVISED_TRAINING_FILES,
            "excluded_demo_files": NON_TRAINING_DEMO_FILES,
            "target": "label",
            "target_mapping": {
                "0": "NORMAL",
                "1": "THEFT_TAMPERING",
            },
            "cause_classification": "deterministic evidence rules until real multiclass field labels exist",
        },
        "CrossGrid_Transferability": exp1_results,
        "MergedDataset_Holdout": exp2_results,
        "risk_band_test_performance": band_theft_rates
    }

    eval_json_path = os.path.join(EVALUATION_DIR, "evaluation_results.json")
    fi_json_path = os.path.join(EVALUATION_DIR, "feature_importance.json")
    risk_json_path = os.path.join(EVALUATION_DIR, "risk_band_distribution.json")
    top_k_json_path = os.path.join(EVALUATION_DIR, "top_k_metrics.json")
    prediction_json_path = os.path.join(EVALUATION_DIR, "predictions_sample.json")

    with open(eval_json_path, "w") as f:
        json.dump(overall_output, f, indent=2)

    with open(fi_json_path, "w") as f:
        json.dump(fi_list, f, indent=2)

    with open(risk_json_path, "w") as f:
        json.dump(band_theft_rates, f, indent=2)

    with open(top_k_json_path, "w") as f:
        json.dump(
            {
                "production_model": production_model_name,
                "MergedDataset_Holdout": exp2_results[production_model_name]["top_k_ranking_metrics"],
                "CrossGrid_Transferability": exp1_results[choose_production_model_name(exp1_results)][
                    "top_k_ranking_metrics"
                ],
            },
            f,
            indent=2,
        )

    with open(prediction_json_path, "w") as f:
        json.dump(
            {
                "model_version": model_version_for(production_model_name),
                "production_model": production_model_name,
                "selection_policy": "highest Precision@100, then F2, then PR-AUC; IsolationForest_Aux excluded",
                "predictions": prediction_records[:200],
            },
            f,
            indent=2,
        )

    log(f"Saved best model binary to {best_model_path}")
    log(f"Saved feature columns to {feature_cols_path}")
    log(f"Saved thresholds to {thresholds_path}")
    log(f"Saved evaluation metrics to {eval_json_path}")
    log(f"Saved feature importances to {fi_json_path}")
    log(f"Saved risk band distribution to {risk_json_path}")
    log(f"Saved top-K metrics to {top_k_json_path}")
    log(f"Saved backend prediction sample to {prediction_json_path}")
    log("ML Improvement Plan Execution Completed Successfully!")


if __name__ == "__main__":
    main()
