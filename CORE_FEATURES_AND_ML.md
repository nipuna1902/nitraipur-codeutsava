# Electron Core Features And ML Approach

## Product Goal

Electron is a decision-support platform for electricity distribution monitoring.

It does not simply output:

```text
THEFT DETECTED
```

Instead, it answers:

```text
What is abnormal?
Why is it abnormal?
How risky is it?
What evidence supports it?
Should a field team inspect it?
What was the final field outcome?
```

The key idea is:

```text
abnormal consumption does not automatically mean theft
```

## Core Features

### 1. ML-Based Risk Ranking

Electron uses trained ML models to score consumers by risk.

Each ML prediction contains:

- consumer ID
- anomaly score
- risk score
- risk level
- probable cause
- confidence
- supporting evidence
- model version

Example:

```json
{
  "consumer_id": "C031",
  "risk_score": 91.0,
  "risk_level": "CRITICAL",
  "predicted_cause": "THEFT_TAMPERING",
  "confidence": 0.91
}
```

This creates an inspection-priority queue.

### 2. Evidence-Based Anomaly Explanation

Electron stores supporting features for each anomaly.

Example evidence:

- sudden daily drop
- sudden daily spike
- long zero-reading streak
- sustained low-consumption period
- abnormal recent-vs-historical behavior
- flatline behavior

This helps explain why a consumer was flagged.

### 3. Investigation Case Workflow

High-risk anomalies automatically create investigation cases.

Only these risk levels create cases:

- `HIGH`
- `CRITICAL`

Cases start as:

```text
AI_FLAGGED
```

User-facing label:

```text
Flagged for Review
```

Workflow:

```text
AI_FLAGGED
  -> INSPECTION_PENDING
  -> UNDER_INVESTIGATION
  -> CONFIRMED / DISMISSED
  -> RESOLVED
```

### 4. Field Observations

Field workers can add observations to a case.

Example:

```text
Seal intact but connected load is higher than declared.
```

The backend stores:

- original text
- normalized evidence
- language
- investigator ID
- source
- confidence

### 5. Inspection Checklist

Each investigation has a checklist.

Checklist items:

- meter inspected
- seal inspected
- connected load verified
- meter reading verified
- bypass checked
- physical anomaly observed
- additional notes captured

This makes field investigation consistent.

### 6. Case Resolution And Feedback Loop

Electron stores the AI prediction and field result separately.

Example:

```text
Predicted cause: THEFT_TAMPERING
Actual outcome: METER_MALFUNCTION
```

This is important because it creates future training/evaluation data.

The closed loop is:

```text
Predict
  -> Investigate
  -> Resolve
  -> Compare prediction with truth
  -> Improve future model
```

### 7. Structured Copilot Questions

Electron currently supports a structured question endpoint:

```text
POST /copilot/ask
```

It answers questions from backend data.

Examples:

- What is the current grid status?
- Show me the top risky consumers.
- Why was this consumer flagged?
- What should the field team inspect?
- What was the resolution outcome?

This does not call an LLM yet. It is grounded in stored backend records.

### 8. Voice Agent Tool Contracts

Electron has backend endpoints designed for future ElevenLabs integration.

Voice tools can:

- fetch consumer summary
- fetch anomaly evidence
- fetch transformer summary
- store field observation
- update checklist item

The voice agent does not directly access the database. It uses controlled backend tools.

### 9. Simulator / IoT-Ready Architecture

Electron is simulator-first and hardware-ready.

Current demo:

```text
virtual / sample data
  -> backend APIs
  -> ML predictions
  -> investigation workflow
```

Future IoT:

```text
ESP32 / smart meter
  -> voltage, current, power, energy
  -> MQTT / REST / WebSocket
  -> backend telemetry ingestion
  -> ML scoring
  -> dashboard and cases
```

## ML Training Data

The supervised ML model is trained on engineered feature datasets:

- `data/processed/features_sgcc.csv`
- `data/processed/features_electricity_theft.csv`

Target label:

```text
0 = normal
1 = theft/tampering
```

We do not train the model on:

```text
data/processed/telemetry_sample.csv
```

That file is for backend and simulator testing, not supervised model training.

## Feature Engineering

The model does not use only raw readings directly.

We extract behavioral features such as:

- mean consumption
- median consumption
- standard deviation
- min consumption
- max consumption
- interquartile range
- load factor
- coefficient of variation
- last 7-day mean
- last 14-day mean
- last 30-day mean
- historical mean
- recent-vs-historical ratio
- recent-vs-historical drop percentage
- zero days ratio
- longest zero streak
- sustained low-consumption streak
- flatline ratio
- max daily spike
- max daily drop
- rolling volatility change
- missing reading ratio
- Isolation Forest anomaly score

These features allow the model to understand behavior over time.

## ML Algorithms Used

### 1. XGBoost

Role:

```text
Primary production model
```

Why we used it:

- strong for tabular data
- handles nonlinear patterns well
- works well with engineered behavioral features
- robust for ranking high-risk consumers

Result:

XGBoost gave the best inspection-priority performance.

Current production model:

```text
XGBoost
```

### 2. LightGBM

Role:

```text
Challenger model
```

Why we used it:

- also strong for tabular data
- fast gradient boosting implementation
- useful comparison against XGBoost

Outcome:

LightGBM was installed and evaluated. It slightly improved some AUC-style metrics, but did not beat XGBoost on the main inspection metric.

### 3. XGBoost + LightGBM Ensemble

Role:

```text
Optional blended model
```

How:

We blended XGBoost and LightGBM prediction probabilities.

Purpose:

- check if combining models improves ranking
- reduce dependency on one model

Outcome:

The ensemble was evaluated, but XGBoost still performed better on the main `Precision@100` metric.

### 4. RandomForest

Role:

```text
Baseline sanity model
```

Why:

- simple and reliable tree-based baseline
- helps verify whether boosting models are actually better

Outcome:

RandomForest was useful as a benchmark but did not beat XGBoost.

### 5. Isolation Forest

Role:

```text
Auxiliary anomaly signal
```

Why:

- unsupervised anomaly detection
- does not require labels
- useful for detecting unusual behavior

How we use it:

- not the final classifier
- used as an additional feature
- used as an auxiliary anomaly baseline

Reason:

Isolation Forest alone was weaker as a final theft classifier, but useful as supporting signal.

## Model Selection Metric

We did not choose the model only by accuracy.

For Electron, the important question is:

```text
If a field team can inspect only the top cases, how many are actually useful?
```

So we prioritized:

- Precision@50
- Precision@100
- risk-band precision
- PR-AUC
- F2
- recall tradeoff

Current important results:

| Metric | Result |
| --- | ---: |
| Merged holdout Precision@100 | 0.76 |
| Cross-grid Precision@100 | 0.79 |
| Critical risk-band precision | 0.6535 |

Interpretation:

```text
Electron is useful as an inspection-priority engine.
```

It should not be presented as a perfect theft detector.

## Prediction Output

The ML layer exports predictions like:

```json
{
  "consumer_id": "C031",
  "risk_score": 91.0,
  "risk_level": "CRITICAL",
  "predicted_cause": "THEFT_TAMPERING",
  "confidence": 0.91,
  "anomaly_score": 0.91,
  "model_version": "xgboost_ranker_v1",
  "evidence": [
    {
      "feature": "recent_vs_hist_drop_pct",
      "value": 60.0,
      "direction": "supports_anomaly"
    }
  ]
}
```

Backend loads this through:

```text
POST /ml/predictions/load-sample
```

or:

```text
POST /ml/predictions
```

## Why This Is Decision Support

Electron says:

```text
This consumer is high risk and should be inspected.
```

It does not say:

```text
This consumer is definitely stealing electricity.
```

That distinction matters legally, operationally, and ethically.

Final confirmation comes from field investigation.

## Current Limitations

Still to improve:

- peer-group comparison
- transformer/feeder loss correlation
- region-level aggregation
- real-time model inference from telemetry
- live MQTT/ESP32 integration
- real ElevenLabs voice integration
- field feedback dataset for retraining

## Next Engineering Steps

Recommended next steps:

1. Connect frontend to backend endpoints.
2. Build dashboard and investigation workspace.
3. Add simulator telemetry streaming.
4. Add region/feeder/transformer risk aggregation.
5. Integrate ElevenLabs with controlled backend tools.
6. Use field outcomes for future ML evaluation and improvement.
