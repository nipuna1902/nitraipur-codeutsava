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
    confusion_matrix
)
from sklearn.model_selection import StratifiedKFold, train_test_split

import xgboost as xgb
import lightgbm as lgb

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
    log("Loading feature datasets from data/processed...")
    path_sgcc = os.path.join(PROCESSED_DIR, "features_sgcc.csv")
    path_eth = os.path.join(PROCESSED_DIR, "features_electricity_theft.csv")

    df_sgcc = pd.read_csv(path_sgcc)
    df_eth = pd.read_csv(path_eth)

    feature_cols = [
        c for c in df_sgcc.columns if c not in ["consumer_id", "label"]
    ]

    log(f"SGCC Feature Shape: {df_sgcc.shape} | Labels: {df_sgcc['label'].value_counts().to_dict()}")
    log(f"Electricity Theft Feature Shape: {df_eth.shape} | Labels: {df_eth['label'].value_counts().to_dict()}")
    log(f"Feature list ({len(feature_cols)} features): {feature_cols}")

    return df_sgcc, df_eth, feature_cols


def evaluate_predictions(y_true, y_prob, threshold=0.5):
    """
    Compute comprehensive classification metrics.
    """
    y_pred = (y_prob >= threshold).astype(int)
    roc_auc = roc_auc_score(y_true, y_prob)
    pr_auc = average_precision_score(y_true, y_prob)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    cm = confusion_matrix(y_true, y_pred).tolist()

    return {
        "roc_auc": round(float(roc_auc), 4),
        "pr_auc": round(float(pr_auc), 4),
        "precision": round(float(prec), 4),
        "recall": round(float(rec), 4),
        "f1_score": round(float(f1), 4),
        "confusion_matrix": cm,
        "threshold": threshold
    }


def train_and_eval_models(X_train, y_train, X_test, y_test, exp_name):
    """
    Train XGBoost, LightGBM, Random Forest, and Isolation Forest on X_train/y_train
    and evaluate on X_test/y_test.
    """
    log(f"=== Running Experiment: {exp_name} ===")
    results = {}

    scale_pos = (len(y_train) - sum(y_train)) / (sum(y_train) + 1e-6)

    # 1. XGBoost Classifier
    log("Training XGBoost Classifier...")
    xgb_model = xgb.XGBClassifier(
        n_estimators=150,
        max_depth=6,
        learning_rate=0.05,
        scale_pos_weight=scale_pos,
        random_state=42,
        eval_metric="logloss"
    )
    xgb_model.fit(X_train, y_train)
    xgb_probs = xgb_model.predict_proba(X_test)[:, 1]
    results["XGBoost"] = evaluate_predictions(y_test, xgb_probs)

    # 2. LightGBM Classifier
    log("Training LightGBM Classifier...")
    lgb_model = lgb.LGBMClassifier(
        n_estimators=150,
        max_depth=6,
        learning_rate=0.05,
        scale_pos_weight=scale_pos,
        random_state=42,
        verbosity=-1
    )
    lgb_model.fit(X_train, y_train)
    lgb_probs = lgb_model.predict_proba(X_test)[:, 1]
    results["LightGBM"] = evaluate_predictions(y_test, lgb_probs)

    # 3. Random Forest Classifier
    log("Training Random Forest Classifier...")
    rf_model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    )
    rf_model.fit(X_train, y_train)
    rf_probs = rf_model.predict_proba(X_test)[:, 1]
    results["RandomForest"] = evaluate_predictions(y_test, rf_probs)

    # 4. Isolation Forest (Unsupervised Anomaly Scoring)
    log("Training Isolation Forest (Unsupervised)...")
    iso_model = IsolationForest(
        n_estimators=100,
        contamination=float(np.mean(y_train)),
        random_state=42,
        n_jobs=-1
    )
    iso_model.fit(X_train)
    # Isolation Forest score_samples returns higher for normal, lower for anomaly
    # Invert score so higher value = more anomalous
    iso_scores = -iso_model.score_samples(X_test)
    # Min-max scale scores to [0, 1]
    iso_probs = (iso_scores - iso_scores.min()) / (iso_scores.max() - iso_scores.min() + 1e-6)
    results["IsolationForest"] = evaluate_predictions(y_test, iso_probs)

    for mname, metrics in results.items():
        log(f"[{exp_name}] {mname} -> ROC-AUC: {metrics['roc_auc']}, PR-AUC: {metrics['pr_auc']}, F1: {metrics['f1_score']}")

    return results, xgb_model, lgb_model, rf_model


def extract_feature_importance(model, feature_cols, model_name="XGBoost"):
    if hasattr(model, "feature_importances_"):
        importances = model.feature_importances_
        fi_df = pd.DataFrame({
            "feature": feature_cols,
            "importance": importances
        }).sort_values(by="importance", ascending=False)
        return fi_df.to_dict(orient="records")
    return []


def main():
    log("Starting ML Model Training and Dual Evaluation Pipeline...")
    df_sgcc, df_eth, feature_cols = load_datasets()

    X_sgcc = df_sgcc[feature_cols].values
    y_sgcc = df_sgcc["label"].values

    X_eth = df_eth[feature_cols].values
    y_eth = df_eth["label"].values

    all_results = {}

    # --- EXPERIMENT 1: Cross-Grid Out-Of-Distribution Transferability ---
    # Train on SGCC (42,372 consumers) -> Test on Electricity Theft (9,956 consumers)
    exp1_results, exp1_xgb, exp1_lgb, exp1_rf = train_and_eval_models(
        X_sgcc, y_sgcc, X_eth, y_eth, exp_name="CrossGrid_SGCC_to_ElectricityTheft"
    )
    all_results["CrossGrid_Transferability"] = exp1_results

    # --- EXPERIMENT 2: Combined Dataset Stratified Train/Test & 5-Fold CV ---
    df_combined = pd.concat([df_sgcc, df_eth], ignore_index=True)
    X_comb = df_combined[feature_cols].values
    y_comb = df_combined["label"].values

    log(f"Combined Dataset Shape: {X_comb.shape} | Theft Ratio: {np.mean(y_comb):.4f}")

    X_train_c, X_test_c, y_train_c, y_test_c = train_test_split(
        X_comb, y_comb, test_size=0.20, random_state=42, stratify=y_comb
    )

    exp2_results, exp2_xgb, exp2_lgb, exp2_rf = train_and_eval_models(
        X_train_c, y_train_c, X_test_c, y_test_c, exp_name="MergedDataset_Holdout"
    )
    all_results["MergedDataset_Holdout"] = exp2_results

    # Extract Feature Importances from the top XGBoost model
    fi_list = extract_feature_importance(exp2_xgb, feature_cols, "XGBoost")
    log("Top 5 Most Important Features for Theft Detection (XGBoost):")
    for item in fi_list[:5]:
        log(f"  - {item['feature']}: {item['importance']:.4f}")

    # --- Save Best Production Model ---
    best_model_path = os.path.join(ARTIFACTS_DIR, "best_xgboost_model.pkl")
    with open(best_model_path, "wb") as f:
        pickle.dump(exp2_xgb, f)
    log(f"Saved production XGBoost model to {best_model_path}")

    # Save feature importances and evaluation metrics
    eval_json_path = os.path.join(EVALUATION_DIR, "evaluation_results.json")
    fi_json_path = os.path.join(EVALUATION_DIR, "feature_importance.json")

    with open(eval_json_path, "w") as f:
        json.dump(all_results, f, indent=2)

    with open(fi_json_path, "w") as f:
        json.dump(fi_list, f, indent=2)

    log(f"Evaluation metrics written to {eval_json_path}")
    log(f"Feature importances written to {fi_json_path}")
    log("ML Training and Dual Evaluation Pipeline Completed Successfully!")


if __name__ == "__main__":
    main()
