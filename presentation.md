# Electron Presentation Notes

## One-Liner

Electron converts grid anomalies into explainable, prioritized field action while keeping humans in the loop for final verification.

## Problem

Electricity distribution networks face losses from multiple causes:

- electricity theft or tampering
- faulty meters
- communication failures
- abnormal consumption
- seasonal or behavioral changes
- transformer or feeder-level losses

The key insight is:

```text
abnormal consumption does not always mean theft
```

A simple threshold system can create false alarms. Electron is designed as a decision-support platform that explains what is abnormal, why it may be abnormal, how strong the evidence is, and which cases field teams should inspect first.

## What We Built

We built a prototype backend and ML pipeline for an investigation-first grid intelligence platform.

Current implemented flow:

```text
Historical electricity data
  -> feature engineering
  -> ML risk scoring
  -> anomaly ranking
  -> backend ingestion
  -> anomaly records
  -> investigation cases
  -> dashboard / voice-agent APIs
```

Implemented capabilities:

- ML feature extraction from real electricity datasets.
- Model comparison across XGBoost, LightGBM, ensemble, RandomForest, and IsolationForest.
- XGBoost selected as the production model for inspection ranking.
- Backend API to load ML predictions.
- Backend anomaly records.
- Automatic investigation case creation for HIGH and CRITICAL predictions.
- Consumer analysis API.
- Voice-agent evidence API for future ElevenLabs integration.

## ML Summary

The ML model is used for decision support, not final accusation.

The model outputs:

- anomaly score
- risk score
- risk level
- probable cause
- confidence
- supporting evidence
- model version

Training data:

- `data/processed/features_sgcc.csv`
- `data/processed/features_electricity_theft.csv`

These contain binary labels:

- `0`: normal
- `1`: theft/tampering

We do not train the supervised model on demo telemetry samples. Demo telemetry is for backend ingestion and simulation flow.

## Current Results

Current production model:

```text
XGBoost
```

Why XGBoost:

- LightGBM was installed and evaluated.
- XGBoost + LightGBM ensemble was evaluated.
- XGBoost gave the best inspection-ranking performance.

Current metrics:

| Metric | Result |
| --- | ---: |
| Merged holdout Precision@100 | 0.76 |
| Cross-grid Precision@100 | 0.79 |
| Critical risk-band precision | 0.6535 |

Interpretation:

Electron is strongest as an inspection-priority engine. It helps field teams decide which consumers to inspect first. It should not be presented as a perfect theft detector.

## Backend Summary

Implemented backend APIs:

- `GET /health`
- `POST /telemetry/readings`
- `GET /telemetry/readings`
- `POST /ml/predictions`
- `POST /ml/predictions/load-sample`
- `GET /anomalies`
- `GET /anomalies/{anomaly_id}`
- `GET /dashboard/summary`
- `GET /consumers`
- `GET /consumers/{consumer_id}`
- `GET /consumers/{consumer_id}/history`
- `GET /consumers/{consumer_id}/analysis`
- `GET /investigations`
- `GET /transformers`
- `GET /transformers/{transformer_id}`
- `GET /simulation/status`
- voice tool contract endpoints

Backend validation flow:

```text
POST /ml/predictions/load-sample
  -> GET /anomalies
  -> GET /investigations
  -> GET /consumers/{consumer_id}/analysis
  -> POST /voice/tools/anomaly-evidence
```

If `/anomalies` returns 200 records, ML prediction ingestion is working.

## IoT And Hardware Simulation Plan

Full physical hardware is not required for the hackathon prototype.

Electron is:

```text
hardware-ready but simulator-first
```

Planned IoT flow:

```text
Virtual Smart Meter / ESP32
  -> voltage, current, power, energy readings
  -> MQTT / WebSocket / REST API
  -> Backend telemetry ingestion
  -> Database
  -> ML scoring
  -> Anomaly case
  -> Dashboard update
```

The simulator represents:

- normal consumption
- theft/tampering
- meter fault
- communication failure
- seasonal variation
- legitimate consumption reduction

Why this is useful:

- It lets us demo continuous live readings without needing full hardware.
- It lets us generate known ground truth scenarios.
- It turns the Digital Twin into an ML testing lab.
- A future ESP32 or physical meter can replace the simulator without changing the backend architecture.

## Voice Copilot Plan

ElevenLabs is planned as the natural-language interface for field workers.

The voice agent should not detect anomalies itself. It should call controlled backend tools.

Example future flow:

```text
Field Worker
  -> speaks naturally
  -> ElevenLabs voice agent
  -> Electron backend tool
  -> structured ML evidence
  -> spoken explanation
```

Current backend already supports voice tool contracts such as:

- consumer summary
- anomaly evidence
- transformer summary
- field observation placeholder
- checklist update placeholder

The voice agent must stay grounded in backend evidence and should not invent readings, losses, confidence, or field findings.

## Demo Script

1. Open Swagger:

```text
http://127.0.0.1:8000/docs
```

2. Check backend health:

```text
GET /health
```

3. Load ML prediction sample:

```text
POST /ml/predictions/load-sample
```

4. Show dashboard summary:

```text
GET /dashboard/summary
```

Expected:

- active anomalies exist
- high-risk cases exist
- active investigations exist

5. Show anomaly queue:

```text
GET /anomalies
```

Explain:

> These are ranked consumers. The highest-risk consumers should be inspected first.

6. Show investigation queue:

```text
GET /investigations
```

Explain:

> Only HIGH and CRITICAL predictions are converted into field investigation cases.

7. Pick one consumer from `/anomalies` and show:

```text
GET /consumers/{consumer_id}/analysis
```

Explain:

> The backend returns risk, probable cause, evidence, and recommended action for this consumer.

8. Show voice-agent evidence:

```text
POST /voice/tools/anomaly-evidence
```

Body:

```json
{
  "consumer_id": "PASTE_CONSUMER_ID_HERE"
}
```

Explain:

> This is the controlled tool ElevenLabs will call. The voice agent will only speak evidence that exists in the backend.

## What To Say To Judges

Electron is not a threshold alarm system. It combines historical behavior, anomaly scoring, probable cause classification, and investigation workflow.

The model currently performs best as a ranked inspection queue. Our top 100 inspection candidates have around 76-79% precision in evaluation, and critical-risk cases are significantly cleaner than scanning all consumers.

The final value is the closed loop:

```text
Detect
  -> Diagnose
  -> Prioritize
  -> Explain
  -> Investigate
  -> Resolve
  -> Learn
```

Field teams verify the outcome. That result becomes future ground truth for improving the model.

## What Is Next

Immediate next work:

- complete case status update APIs
- store field observations
- add case resolution
- connect frontend to anomaly and investigation APIs
- connect simulator stream to backend telemetry ingestion

Future work:

- peer-group comparison
- transformer/feeder loss correlation
- real MQTT integration
- ElevenLabs live voice session
- OpenAI-generated evidence-grounded reports
- field feedback dataset for model improvement
