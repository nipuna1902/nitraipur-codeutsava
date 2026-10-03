import os
import unittest

import numpy as np
import pandas as pd

from ml.preprocess import get_longest_consecutive_streak, get_row_streaks
from ml.contracts import FEATURE_COLUMNS


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")


class DataPreprocessingTest(unittest.TestCase):
    def test_longest_consecutive_streak(self):
        values = np.array([False, True, True, False, True, True, True, False])

        self.assertEqual(get_longest_consecutive_streak(values), 3)

    def test_row_streaks(self):
        matrix = np.array(
            [
                [False, True, True, False],
                [True, True, True, True],
                [False, False, False, False],
            ]
        )

        self.assertEqual(get_row_streaks(matrix).tolist(), [2, 4, 0])

    def test_processed_files_when_available(self):
        expected_files = [
            "clean_electricity_theft.csv",
            "clean_sgcc.csv",
            "features_electricity_theft.csv",
            "features_sgcc.csv",
            "telemetry_sample.csv",
            "dataset_metadata.json",
        ]
        missing = [fname for fname in expected_files if not os.path.exists(os.path.join(PROCESSED_DIR, fname))]
        if missing:
            self.skipTest(f"Processed datasets are generated artifacts and are not present: {missing}")

        for fname in expected_files:
            fpath = os.path.join(PROCESSED_DIR, fname)
            self.assertGreater(os.path.getsize(fpath), 0, f"Processed file is empty: {fname}")

    def test_feature_files_when_available_have_required_columns(self):
        feature_files = ["features_electricity_theft.csv", "features_sgcc.csv"]
        missing = [fname for fname in feature_files if not os.path.exists(os.path.join(PROCESSED_DIR, fname))]
        if missing:
            self.skipTest(f"Feature files are generated artifacts and are not present: {missing}")

        required_cols = ["consumer_id", "label"] + FEATURE_COLUMNS

        for fname in feature_files:
            df = pd.read_csv(os.path.join(PROCESSED_DIR, fname))
            for col in required_cols:
                self.assertIn(col, df.columns, f"Missing feature column {col} in {fname}")

    def test_telemetry_schema_sample_when_available(self):
        fpath = os.path.join(PROCESSED_DIR, "telemetry_sample.csv")
        if not os.path.exists(fpath):
            self.skipTest("Telemetry sample is a generated artifact and is not present.")

        df = pd.read_csv(fpath)
        expected_cols = [
            "consumer_id",
            "timestamp",
            "voltage",
            "current",
            "power",
            "energy",
            "meter_status",
            "communication_status",
        ]
        for col in expected_cols:
            self.assertIn(col, df.columns, f"Telemetry schema column missing: {col}")

        if "ground_truth_anomaly" in df.columns:
            labels = set(df["ground_truth_anomaly"].unique())
            self.assertTrue({0, 1}.issubset(labels), "Telemetry sample must include normal and anomaly rows.")


if __name__ == "__main__":
    unittest.main()
