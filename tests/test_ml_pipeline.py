import json
import os
import unittest

import numpy as np

from ml.contracts import (
    FEATURE_COLUMNS,
    NON_TRAINING_DEMO_FILES,
    SUPERVISED_TRAINING_FILES,
    build_prediction_records,
    classify_probable_cause,
)
from ml.train_evaluate import assign_risk_bands, compute_top_k_metrics, find_best_threshold


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EVALUATION_DIR = os.path.join(BASE_DIR, "ml", "evaluation")


class MLPipelineTest(unittest.TestCase):
    def test_find_best_threshold_uses_highest_threshold_for_recall_target(self):
        y_true = np.array([1, 1, 1, 0, 0, 0])
        y_prob = np.array([0.9, 0.7, 0.4, 0.6, 0.3, 0.1])

        _, recall_targets = find_best_threshold(y_true, y_prob)

        self.assertGreater(recall_targets[0.70], 0.05)
        self.assertLessEqual(recall_targets[0.70], 0.7)

    def test_top_k_metrics_are_computed_from_ranked_probabilities(self):
        y_true = np.array([1] * 10 + [0] * 90)
        y_prob = np.array(list(np.linspace(1.0, 0.91, 10)) + list(np.linspace(0.9, 0.0, 90)))

        metrics = compute_top_k_metrics(y_true, y_prob)

        self.assertEqual(metrics["precision_at_50"], 0.2)
        self.assertEqual(metrics["precision_at_100"], 0.1)
        self.assertEqual(metrics["false_positives_per_100_inspected"], 90)
        self.assertEqual(metrics["recall_at_top_10_percent"], 1.0)

    def test_risk_bands_preserve_uncertain_for_high_missingness(self):
        scores = np.array([0.9, 0.76, 0.5, 0.2, 0.99])
        missing = np.array([0.0, 0.0, 0.0, 0.0, 0.75])

        risk_scores, bands = assign_risk_bands(scores, missing_ratio=missing)

        self.assertEqual(risk_scores.tolist(), [90.0, 76.0, 50.0, 20.0, 99.0])
        self.assertEqual(bands, ["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNCERTAIN"])

    def test_committed_evaluation_results_include_required_sections(self):
        fpath = os.path.join(EVALUATION_DIR, "evaluation_results.json")
        self.assertTrue(os.path.exists(fpath))
        with open(fpath, "r", encoding="utf-8") as f:
            results = json.load(f)

        self.assertIn("MergedDataset_Holdout", results)
        self.assertIn("CrossGrid_Transferability", results)
        self.assertIn("risk_band_test_performance", results)
        self.assertEqual(results["training_data_policy"]["supervised_training_files"], SUPERVISED_TRAINING_FILES)
        self.assertEqual(results["training_data_policy"]["excluded_demo_files"], NON_TRAINING_DEMO_FILES)
        self.assertIn("LightGBM", results["MergedDataset_Holdout"])
        self.assertIn("Ensemble_XGB_LGB", results["MergedDataset_Holdout"])

        production_model = (
            "Ensemble_XGB_LGB"
            if "Ensemble_XGB_LGB" in results["MergedDataset_Holdout"]
            else "XGBoost"
        )
        model_results = results["MergedDataset_Holdout"][production_model]
        self.assertIn("val_tuned_threshold", model_results)
        self.assertIn("top_k_ranking_metrics", model_results)
        self.assertGreaterEqual(model_results["top_k_ranking_metrics"]["precision_at_100"], 0.7)

    def test_risk_band_distribution_is_demo_usable(self):
        fpath = os.path.join(EVALUATION_DIR, "risk_band_distribution.json")
        self.assertTrue(os.path.exists(fpath))
        with open(fpath, "r", encoding="utf-8") as f:
            bands = json.load(f)

        self.assertIn("CRITICAL", bands)
        self.assertIn("HIGH", bands)
        self.assertGreaterEqual(bands["CRITICAL"]["precision"], 0.5)

    def test_backend_prediction_records_match_contract(self):
        feature_rows = np.zeros((1, len(FEATURE_COLUMNS)))
        feature_rows[0][FEATURE_COLUMNS.index("recent_vs_hist_drop_pct")] = 60.0
        feature_rows[0][FEATURE_COLUMNS.index("sustained_low_streak")] = 8.0
        records = build_prediction_records(
            consumer_ids=["C031"],
            probabilities=np.array([0.91]),
            risk_scores=np.array([91.0]),
            risk_levels=["CRITICAL"],
            feature_rows=feature_rows,
            feature_columns=FEATURE_COLUMNS,
        )

        record = records[0]
        self.assertEqual(record["consumer_id"], "C031")
        self.assertEqual(record["risk_level"], "CRITICAL")
        self.assertEqual(record["predicted_cause"], "THEFT_TAMPERING")
        self.assertIn("anomaly_score", record)
        self.assertIn("model_version", record)
        self.assertGreater(len(record["evidence"]), 0)

    def test_probable_cause_classification_uses_available_evidence(self):
        self.assertEqual(
            classify_probable_cause({"missing_reading_ratio": 0.75}, "CRITICAL", 0.95),
            "COMMUNICATION_FAILURE",
        )
        self.assertEqual(
            classify_probable_cause({"flatline_ratio": 0.9, "missing_reading_ratio": 0.0}, "HIGH", 0.8),
            "METER_MALFUNCTION",
        )
        self.assertEqual(
            classify_probable_cause(
                {"recent_vs_hist_drop_pct": 60.0, "sustained_low_streak": 8, "missing_reading_ratio": 0.0},
                "HIGH",
                0.8,
            ),
            "THEFT_TAMPERING",
        )


if __name__ == "__main__":
    unittest.main()
