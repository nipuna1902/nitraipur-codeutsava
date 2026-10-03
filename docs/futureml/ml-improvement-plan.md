# Future ML Improvement Plan

## Summary

The current ML approach uses XGBoost, LightGBM, Random Forest, and Isolation Forest with a fixed threshold of `0.5`. That fixed threshold is likely the main reason recall and false positives are not well controlled. For Electron, the goal should not be blind 90% recall. The better prototype goal is a high-quality inspection queue: rank suspicious consumers, preserve uncertainty, and reduce false positives enough that field teams trust the output.

Use the merged holdout as the main hackathon demo metric. Report cross-grid transferability honestly as robustness.

## Recommended Optimization Target

Primary target:

- optimize F1 or F2 on validation data
- keep a minimum precision guard
- report the false-positive cost of high-recall thresholds

Prototype success should be framed as:

```text
Electron prioritizes the most suspicious consumers for investigation.
```

Avoid framing it as:

```text
Electron perfectly detects theft.
```

## Key ML Changes

### 1. Replace Fixed Threshold

Do not evaluate only at `threshold = 0.5`.

Add threshold search:

- evaluate thresholds from `0.05` to `0.95`
- choose threshold on validation set
- report final test metrics using the selected threshold
- save metrics for multiple operating points

Report:

- best F1 threshold
- best F2 threshold
- threshold for 70% recall
- threshold for 80% recall
- threshold for 85% recall if precision is still usable

### 2. Add Ranking Metrics

Field teams inspect a queue, not the entire grid. Add:

- Precision@50
- Precision@100
- Recall@Top5%
- Recall@Top10%
- false positives per 100 inspected consumers

These metrics are more meaningful for a hackathon demo than only accuracy or ROC-AUC.

### 3. Convert Scores Into Risk Bands

Model output should produce a risk score and band:

- `CRITICAL`: immediate inspection
- `HIGH`: review soon
- `MEDIUM`: monitor or gather more evidence
- `LOW`: likely normal
- `UNCERTAIN`: insufficient evidence

Risk bands should be calibrated from validation probabilities, not hard-coded blindly.

### 4. Keep Isolation Forest As Auxiliary Signal

Current Isolation Forest performance is weak as a final classifier. Keep it as:

- anomaly score feature
- secondary supporting signal
- fallback unsupervised signal when labels are unavailable

Do not make Isolation Forest the final theft classifier unless validation metrics prove it helps.

### 5. Add Stronger Time-Series Features

Add features that capture recent behavioral change:

- last 7-day mean
- last 14-day mean
- last 30-day mean
- previous 30-day mean
- previous 60-day mean
- recent-vs-historical ratio
- recent-vs-historical drop percentage
- longest zero-consumption streak
- missing-reading ratio
- sustained-low-consumption streak
- rolling volatility change
- weekend/weekday consumption ratio
- seasonality-normalized deviation

The current features are mostly whole-series statistical summaries. They may miss the timing and persistence of theft-like behavior.

### 6. Add Validation Split

Use three splits:

- train
- validation
- test

Use validation only for:

- threshold selection
- risk band calibration
- model selection

Use test only once for final reporting.

## Suggested Pipeline Shape

```text
raw dataset
  -> preprocessing
  -> feature extraction
  -> train/validation/test split
  -> train XGBoost/LightGBM/RandomForest
  -> optional probability blend
  -> tune threshold on validation
  -> evaluate on test
  -> save model + threshold + feature list + metrics
```

## Model Recommendations

Use XGBoost as the primary model first.

Also test:

- LightGBM
- Random Forest
- average probability blend of XGBoost + LightGBM

Only keep the blend if it improves validation F1/F2 or ranking metrics.

## Outputs Needed By Backend

The ML pipeline should eventually output:

- `consumer_id`
- `anomaly_score`
- `risk_score`
- `risk_level`
- `predicted_cause`
- `confidence`
- `selected_threshold`
- `model_version`
- `top_features`
- `evidence`

Backend should store these in the future `anomalies` table.

## Test Cases

Add tests that confirm:

- fixed `0.5` threshold is still reported as baseline
- selected threshold is chosen from validation set, not test set
- selected threshold improves F1/F2 or ranking metrics
- high-recall threshold reports corresponding precision and false positives
- risk bands are generated for every scored consumer
- Isolation Forest is not used as final classifier unless it wins validation metrics
- merged holdout and cross-grid transfer metrics are reported separately

## Assumptions

- Merged holdout is the main hackathon demo metric.
- Cross-grid transfer is a robustness metric, not the main demo target.
- Reducing false positives is more valuable than forcing 90% recall.
- Electron should produce a prioritized investigation queue, not unsupported theft accusations.
