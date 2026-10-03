# ML

Electron's ML layer is an inspection-priority pipeline. It ranks suspicious consumers and exports evidence for the backend; it does not make an unsupported final accusation of theft.

## Current Approach

- Enhanced feature extraction from processed consumer time-series data.
- Personal baseline and temporal deviation features.
- Isolation Forest as an auxiliary anomaly-score feature.
- XGBoost as the primary supervised model.
- LightGBM as an optional ensemble member when installed.
- Random Forest as a sanity baseline.
- Validation-tuned thresholds, top-K metrics, and risk-band evaluation.

## Training Data

Supervised theft-risk training uses:

- `data/processed/features_sgcc.csv`
- `data/processed/features_electricity_theft.csv`

Do not train supervised ML on `data/processed/telemetry_sample.csv`; it is a backend/demo telemetry sample, not the real training target.

The current real datasets support binary theft-risk training only. Probable cause classification is handled with deterministic evidence rules until real multiclass field outcomes exist.

## Local Workflow

```powershell
python -m ml.preprocess
python -m ml.train_evaluate
python -m unittest discover -s tests
```

Generated processed data and model artifacts are ignored by git. Evaluation JSON files under `ml/evaluation/` are small enough to keep for demo traceability.

## Backend Contract

The backend-facing prediction sample is written to:

```text
ml/evaluation/predictions_sample.json
```

Each prediction includes `consumer_id`, `risk_score`, `risk_level`, `predicted_cause`, `confidence`, `anomaly_score`, `model_version`, and evidence features.
