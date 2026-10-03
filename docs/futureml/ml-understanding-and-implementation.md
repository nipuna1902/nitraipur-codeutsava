# Electron ML Understanding And Implementation

## What We Learned

Electron should not behave like a simple theft detector. The core ML problem is:

```text
abnormal electricity behavior != confirmed theft
```

A sudden drop in consumption may mean theft/tampering, but it may also mean meter malfunction, communication failure, seasonal behavior, or a legitimate reduction in usage. Because of this, the ML layer should produce:

- anomaly score
- theft-risk score
- risk level
- probable cause
- supporting evidence
- inspection priority

The strongest current use of ML is to build a high-quality inspection queue, not to accuse every abnormal consumer of theft.

## Training Data Decision

The supervised theft-risk model is trained on:

- `data/processed/features_sgcc.csv`
- `data/processed/features_electricity_theft.csv`

These files contain engineered consumer-level features and a binary target:

- `0`: normal
- `1`: theft/tampering

The model is not trained on:

- `data/processed/telemetry_sample.csv`

That telemetry sample is for backend ingestion, dashboard flow, and hardware-simulation style demos. It is not a real supervised ML training set.

## Implemented ML Pipeline

The current pipeline includes:

- enhanced feature extraction in `ml/preprocess.py`
- shared feature and prediction contracts in `ml/contracts.py`
- model training and evaluation in `ml/train_evaluate.py`
- LightGBM dependency declaration in `ml/requirements.txt`
- backend-ready prediction export in `ml/evaluation/predictions_sample.json`

The engineered feature set includes:

- consumption statistics
- recent 7/14/30 day behavior
- historical baseline comparison
- recent-vs-historical drop percentage
- zero-reading ratio and longest zero streak
- sustained low-consumption streak
- flatline ratio
- volatility change
- missing-reading ratio
- Isolation Forest anomaly score

## Model Strategy

Implemented and compared:

- XGBoost
- LightGBM
- XGBoost + LightGBM weighted ensemble
- RandomForest
- IsolationForest auxiliary baseline

Current production model:

```text
XGBoost
```

Reason:

- it produced the best merged holdout `Precision@100`
- it is more useful for field inspection priority than the alternatives
- LightGBM improved some AUC-style metrics slightly, but did not beat XGBoost on the main queue metric

Isolation Forest is not the final classifier. It is used as:

- an auxiliary feature
- an unsupervised anomaly baseline
- supporting evidence

## Current Results

Current ranking metrics:

| Evaluation | Production Model | Precision@50 | Precision@100 | False Positives Per 100 |
| --- | --- | ---: | ---: | ---: |
| Merged holdout | XGBoost | 0.78 | 0.76 | 24 |
| Cross-grid transfer | XGBoost | 0.76 | 0.79 | 21 |

Current risk-band quality:

| Risk Band | Count | Actual Theft Count | Precision |
| --- | ---: | ---: | ---: |
| CRITICAL | 202 | 132 | 0.6535 |
| HIGH | 408 | 145 | 0.3554 |
| MEDIUM | 1556 | 229 | 0.1472 |
| LOW | 5684 | 245 | 0.0431 |

Interpretation:

- Electron is useful as an inspection-priority system.
- High-risk queues are much cleaner than scanning the whole population.
- Forcing very high recall creates too many false positives.
- The demo should emphasize explainable prioritization, not perfect theft detection.

## Cause Classification

The current real datasets do not contain trusted labels for all causes. Therefore, we did not train a fake multiclass cause model.

Instead, `ml/contracts.py` implements deterministic evidence rules for:

- `NORMAL`
- `THEFT_TAMPERING`
- `METER_MALFUNCTION`
- `COMMUNICATION_FAILURE`
- `LEGITIMATE_ABNORMAL_CONSUMPTION`
- `UNCERTAIN`

This keeps Electron honest: the supervised model estimates theft risk, while the cause layer uses available evidence to decide the most likely explanation.

## Backend Implication

The final backend should use one unified runtime pipeline:

```text
telemetry / simulator / historical data
  -> backend ingestion
  -> feature extraction
  -> ML risk scoring
  -> cause classification
  -> anomaly record
  -> investigation case
  -> dashboard / voice copilot
```

Training and runtime are different:

- training uses curated feature datasets
- runtime uses live or simulated telemetry
- simulator data supports demos and stress tests
- future field outcomes become real feedback data

## Files Produced By The ML Layer

Tracked evaluation outputs:

- `ml/evaluation/evaluation_results.json`
- `ml/evaluation/feature_importance.json`
- `ml/evaluation/risk_band_distribution.json`
- `ml/evaluation/top_k_metrics.json`
- `ml/evaluation/predictions_sample.json`

Ignored local artifacts:

- trained model pickle
- generated feature column artifact
- generated threshold artifact
- regenerated large processed datasets

## Validation Commands

Run:

```powershell
python -m ml.preprocess
python -m ml.train_evaluate
python -m unittest discover -s tests
python -m unittest backend.tests.test_api
```

Current verification status:

- ML/unit tests pass
- backend API tests pass
- LightGBM is installed locally and evaluated

## Next ML Work

Next improvements should focus on:

- adding peer-group features
- adding transformer/feeder loss correlation
- improving simulator-generated cause scenarios
- connecting backend telemetry ingestion to feature generation
- storing field investigation outcomes as future ground truth

Do not spend hackathon time on LSTM/autoencoders unless the core backend and dashboard are already working.
