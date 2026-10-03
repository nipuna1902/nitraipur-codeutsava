# Electron Judge Presentation And Demo Script

## 1. Why This Problem Statement Matters

Electricity distribution networks lose energy and revenue for many reasons:

- theft or meter tampering
- faulty meters
- communication failures
- missing or noisy readings
- abnormal but legitimate consumption
- seasonal or behavioral changes
- transformer or feeder-level technical losses

The hard part is that an abnormal reading does not automatically mean theft.

Example:

```text
A consumer normally uses 350-400 kWh/month.
Suddenly the reading drops to 80-100 kWh/month.
```

Possible explanations:

- theft or tampering
- meter malfunction
- communication failure
- legitimate reduction
- seasonal behavior

So the real problem is not only detection. The real problem is investigation support:

```text
What is abnormal?
Why is it abnormal?
How strong is the evidence?
Is this linked to grid loss?
Who should field teams inspect first?
What was the final field outcome?
```

## 2. What Electron Does Uniquely

Electron is not a simple threshold alarm and not a direct “theft detector.”

Electron is a closed-loop grid intelligence platform:

```text
Detect
  -> Diagnose
  -> Prioritize
  -> Explain
  -> Investigate
  -> Resolve
  -> Learn
```

Unique points:

1. It treats ML output as decision support, not final accusation.
2. It gives risk score, probable cause, confidence, and evidence.
3. It opens field investigation cases only for high-risk predictions.
4. It stores field observations and final resolution separately from AI prediction.
5. It supports a future voice-first field copilot through controlled backend tools.
6. It is simulator-first but hardware-ready: virtual smart meters can later be replaced by ESP32/MQTT devices.

Best one-liner:

```text
Electron converts grid anomalies into explainable, prioritized field action.
```

## 3. System Architecture

Current implemented flow:

```text
Historical electricity datasets
  -> feature engineering
  -> ML model training
  -> prediction sample
  -> backend ingestion
  -> anomaly records
  -> investigation cases
  -> field observations
  -> checklist updates
  -> case resolution
  -> future feedback dataset
```

Runtime/demo flow:

```text
ML prediction export
  -> POST /ml/predictions/load-sample
  -> anomaly queue
  -> investigation queue
  -> consumer analysis
  -> copilot questions
  -> field workflow
```

Future IoT flow:

```text
Virtual smart meter / ESP32
  -> voltage, current, power, energy
  -> REST / MQTT / WebSocket
  -> backend telemetry ingestion
  -> database
  -> ML scoring
  -> dashboard / cases
```

## 4. How We Trained The Model

Training data used:

- `data/processed/features_sgcc.csv`
- `data/processed/features_electricity_theft.csv`

Target:

```text
0 = normal
1 = theft / tampering
```

We did not train on `telemetry_sample.csv`. That file is for backend and simulator demo flow, not real supervised training.

Feature engineering includes:

- mean, median, standard deviation
- min/max consumption
- recent 7/14/30-day consumption
- historical baseline
- recent vs historical drop percentage
- zero-reading ratio
- longest zero streak
- sustained low-consumption streak
- flatline ratio
- volatility change
- missing-reading ratio
- Isolation Forest anomaly score

Models compared:

- XGBoost
- LightGBM
- XGBoost + LightGBM ensemble
- RandomForest
- IsolationForest auxiliary baseline

Production model selected:

```text
XGBoost
```

Why:

- best inspection-ranking performance
- strongest `Precision@100`
- stable and explainable for prototype use

Current results:

| Metric | Result |
| --- | ---: |
| Merged holdout Precision@100 | 0.76 |
| Cross-grid Precision@100 | 0.79 |
| Critical risk-band precision | 0.6535 |

Important explanation:

```text
The model is not claiming perfect theft detection.
It is ranking consumers for inspection.
```

## 5. Backend Capabilities Implemented

Implemented APIs:

- health check
- telemetry ingestion
- ML prediction ingestion
- anomaly queue
- investigation queue
- investigation detail
- field observations
- checklist updates
- case resolution
- consumer analysis
- structured copilot questions
- voice-agent tool contracts

Important backend behavior:

- all ML predictions become anomaly records
- only `HIGH` and `CRITICAL` predictions create investigation cases
- cases start as `AI_FLAGGED`
- UI should display `AI_FLAGGED` as `Flagged for Review`
- field resolution stores actual outcome separately from predicted cause

## 6. How To Start The Demo

Run backend:

```powershell
python -m uvicorn backend.app.main:app --reload
```

Open Swagger:

```text
http://127.0.0.1:8000/docs
```

If browser opens `/` and shows `404`, that is fine. Use `/docs`.

## 7. Endpoint Demo Script

### Step 1: Health Check

Endpoint:

```text
GET /health
```

Expected:

```json
{
  "status": "ok"
}
```

Say:

```text
The backend is running.
```

### Step 2: Load ML Prediction Sample

Endpoint:

```text
POST /ml/predictions/load-sample
```

No request body.

Expected:

```json
{
  "accepted": 200,
  "cases_created": 26,
  "production_model": "XGBoost",
  "model_version": "xgboost_ranker_v1"
}
```

Say:

```text
We are loading predictions generated by the trained ML layer.
Each prediction contains risk, cause, confidence, evidence, and model version.
```

### Step 3: Dashboard Summary

Endpoint:

```text
GET /dashboard/summary
```

Expected shape:

```json
{
  "total_consumers": 201,
  "telemetry_readings": 0,
  "active_anomalies": 201,
  "high_risk_cases": 26,
  "active_investigations": 26,
  "latest_timestamp": null
}
```

Say:

```text
The backend created consumers and anomaly records from ML predictions.
Only high-risk predictions became investigation cases.
Telemetry is zero because live simulator/IoT data has not been streamed yet.
```

### Step 4: Anomaly Queue With Metadata

Endpoint:

```text
GET /anomalies/queue
```

Query:

```text
limit = 100
```

Expected shape:

```json
{
  "total": 201,
  "limit": 100,
  "returned": 100,
  "items": []
}
```

Say:

```text
This proves the anomaly queue contains many records.
Swagger may visually collapse the list, so this endpoint explicitly returns total and returned counts.
```

Copy one `consumer_id` from the first item.

### Step 5: Top Risky Consumers Question

Endpoint:

```text
POST /copilot/ask
```

Body:

```json
{
  "question": "Show me the top risky consumers",
  "limit": 5
}
```

Say:

```text
This is a structured question endpoint.
It does not call an LLM yet; it answers only from backend data.
```

### Step 6: Consumer Explanation Question

Endpoint:

```text
POST /copilot/ask
```

Body:

```json
{
  "question": "Why was this consumer flagged?",
  "consumer_id": "PASTE_CONSUMER_ID"
}
```

Expected:

- `data_available: true`
- risk score
- risk level
- predicted cause
- recommended action

Say:

```text
Electron explains why the consumer was flagged instead of simply saying theft detected.
```

### Step 7: Anomaly Detail

Endpoint:

```text
GET /anomalies
```

Query:

```text
limit = 10
```

Copy one `id`.

Then:

```text
GET /anomalies/{anomaly_id}
```

Say:

```text
Each anomaly stores ML evidence, confidence, cause, and model version.
```

### Step 8: Investigation Queue

Endpoint:

```text
GET /investigations
```

Query:

```text
limit = 10
```

Copy one `case_id`.

Say:

```text
These are not confirmed theft cases.
They are flagged-for-review cases created from HIGH and CRITICAL ML predictions.
```

### Step 9: Investigation Detail

Endpoint:

```text
GET /investigations/{case_id}
```

Expected response contains:

- case metadata
- linked anomaly
- checklist
- observations
- resolution

Say:

```text
This is the payload for an investigation workspace page.
```

### Step 10: Update Case Status

Endpoint:

```text
PATCH /investigations/{case_id}
```

Body:

```json
{
  "status": "UNDER_INVESTIGATION"
}
```

Say:

```text
The field team has started investigating this case.
```

### Step 11: Add Field Observation

Endpoint:

```text
POST /investigations/{case_id}/observations
```

Body:

```json
{
  "investigator_id": "FIELD_01",
  "source": "TEXT",
  "original_text": "Seal intact but connected load is higher than declared.",
  "normalized_evidence": {
    "seal_status": "INTACT",
    "load_mismatch": true
  },
  "language": "EN",
  "confidence": 0.9
}
```

Say:

```text
Field evidence is stored separately from the model prediction.
```

### Step 12: Update Checklist

Endpoint:

```text
PATCH /investigations/{case_id}/checklist
```

Body:

```json
{
  "item_id": "seal_inspected",
  "status": "DONE"
}
```

Another example:

```json
{
  "item_id": "connected_load_verified",
  "status": "DONE"
}
```

Say:

```text
The backend supports standardized field inspection workflow.
```

### Step 13: Voice Field Observation

Endpoint:

```text
POST /voice/tools/field-observation
```

Body:

```json
{
  "case_id": "PASTE_CASE_ID",
  "observation": "Bypass wire found near meter terminal.",
  "language": "EN",
  "source": "VOICE"
}
```

Say:

```text
This simulates what ElevenLabs will call after converting speech to text.
The voice agent does not directly access the database; it uses controlled backend tools.
```

### Step 14: Voice Checklist Update

Endpoint:

```text
POST /voice/tools/checklist-update
```

Body:

```json
{
  "case_id": "PASTE_CASE_ID",
  "item_id": "bypass_checked",
  "status": "DONE"
}
```

Say:

```text
Voice interaction can update structured investigation workflow.
```

### Step 15: Ask Case Checklist Question

Endpoint:

```text
POST /copilot/ask
```

Body:

```json
{
  "question": "What should the field team inspect?",
  "case_id": "PASTE_CASE_ID"
}
```

Say:

```text
The copilot answers from stored checklist data, not hallucinated instructions.
```

### Step 16: Resolve Case

Endpoint:

```text
POST /investigations/{case_id}/resolve
```

Body:

```json
{
  "actual_outcome": "METER_MALFUNCTION",
  "resolution_notes": "Meter display intermittently failed during site visit.",
  "resolved_by": "FIELD_01"
}
```

Say:

```text
Here the AI predicted theft/tampering, but field inspection found meter malfunction.
Electron stores both.
This is the closed feedback loop.
```

### Step 17: Ask Resolution Question

Endpoint:

```text
POST /copilot/ask
```

Body:

```json
{
  "question": "What was the resolution outcome?",
  "case_id": "PASTE_CASE_ID"
}
```

Say:

```text
Electron can compare predicted cause with actual field outcome.
This becomes future evaluation data.
```

### Step 18: Final Dashboard Check

Endpoint:

```text
GET /dashboard/summary
```

Expected:

- active investigations should reduce after case resolution

Say:

```text
The dashboard reflects case workflow state.
```

## 8. How To Explain AI_FLAGGED

Raw backend status:

```text
AI_FLAGGED
```

User-facing label:

```text
Flagged for Review
```

Explanation:

```text
AI_FLAGGED means the ML system recommended field review.
It is not confirmed theft.
```

## 9. How To Explain IoT

We are simulator-first because full hardware is not practical in the hackathon.

However, the architecture is hardware-ready:

```text
Virtual smart meter now
ESP32 / physical smart meter later
same backend telemetry endpoint
```

Future physical flow:

```text
ESP32 + voltage/current/energy sensor
  -> MQTT or REST
  -> POST /telemetry/readings
  -> database
  -> ML scoring
  -> dashboard and investigations
```

Current demo proves the backend path is ready for telemetry:

```text
POST /telemetry/readings
GET /telemetry/readings
GET /consumers/{consumer_id}/history
```

## 10. Final Closing Statement

Electron is not just an ML classifier.

It is an investigation platform:

```text
ML detects and prioritizes.
Backend explains and opens cases.
Field workers verify.
Final outcome becomes feedback.
```

That is the closed loop:

```text
Detect -> Diagnose -> Prioritize -> Explain -> Investigate -> Resolve -> Learn
```
