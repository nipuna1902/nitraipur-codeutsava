# Electron ML Training Data Plan

## Decision

Train the supervised theft-risk model on:

- `data/processed/features_sgcc.csv`
- `data/processed/features_electricity_theft.csv`

These files contain engineered consumer-level features and a binary supervised target:

- `label = 0`: normal
- `label = 1`: theft/tampering

Do not train supervised ML directly on `data/processed/telemetry_sample.csv`. That file is for backend, dashboard, and hardware-simulation style demo flow.

## Model Roles

- XGBoost: primary production theft-risk ranking model.
- LightGBM: challenger model.
- XGBoost + LightGBM: ensemble only if it beats XGBoost on inspection-ranking metrics.
- RandomForest: baseline sanity check.
- IsolationForest: auxiliary anomaly score feature and unsupervised baseline, not the final classifier.

## Cause Classification

The current real datasets support binary theft-risk training. They do not provide reliable labels for:

- meter malfunction
- communication failure
- seasonal variation
- legitimate abnormal consumption

For now, Electron should use deterministic evidence rules for probable cause. A future multiclass cause model should be trained only after simulator labels are clearly marked as simulated and field investigation outcomes create real ground truth.

## Evaluation Priority

Optimize and present:

- Precision@50
- Precision@100
- risk-band precision
- PR-AUC
- F2
- recall tradeoff scenarios

Do not optimize only for high recall. In the current results, the 85% recall mode creates too many false positives for field inspection.

## Simulator Usage

Use the simulator for:

- demonstrating normal, theft, meter fault, communication failure, seasonal variation, and legitimate abnormal consumption
- stress testing cause logic
- frontend/backend streaming demo

Simulator outputs should be labeled as simulated ground truth and should not be mixed with real supervised theft labels without explicit dataset metadata.
