# Backend

Prototype FastAPI backend for Electron.

## Run

```powershell
uvicorn backend.app.main:app --reload
```

Open:

```text
http://127.0.0.1:8000/docs
```

## Implemented Now

- `GET /health`
- `POST /telemetry/readings`
- `GET /telemetry/readings`
- `POST /ml/predictions`
- `POST /ml/predictions/load-sample`
- `GET /anomalies`
- `GET /anomalies/queue`
- `GET /anomalies/{anomaly_id}`
- `POST /copilot/ask`
- `GET /dashboard/summary`
- `GET /consumers`
- `GET /consumers/{consumer_id}`
- `GET /consumers/{consumer_id}/history`
- `GET /consumers/{consumer_id}/analysis`
- `GET /investigations`
- `GET /investigations/{case_id}`
- `PATCH /investigations/{case_id}`
- `POST /investigations/{case_id}/observations`
- `PATCH /investigations/{case_id}/checklist`
- `POST /investigations/{case_id}/resolve`
- `GET /transformers`
- `GET /transformers/{transformer_id}`
- `GET /simulation/status`
- `POST /voice/session`
- `POST /voice/tools/consumer-summary`
- `POST /voice/tools/anomaly-evidence`
- `POST /voice/tools/transformer-summary`
- `POST /voice/tools/field-observation`
- `POST /voice/tools/checklist-update`

## Telemetry Ingestion Contract

`POST /telemetry/readings` accepts raw electrical readings. Clients should not send `meter_status`; the backend derives meter and communication status from telemetry values and recent history.

Minimal payload:

```json
{
  "readings": [
    {
      "consumer_id": "C001",
      "timestamp": "2026-10-03T00:00:00Z",
      "voltage": 230,
      "current": 4.5,
      "power": 1.1,
      "energy": 0.275,
      "source": "SIMULATOR"
    }
  ]
}
```

Readback endpoints still include derived `meter_status` and `communication_status` so the UI can show health. If derived status indicates meter malfunction or communication failure, the backend creates a telemetry-derived anomaly report.

## ElevenLabs / Voice Testing Endpoints

These endpoints are controlled backend tool contracts for future ElevenLabs integration. They do not call ElevenLabs yet.

Create placeholder voice session:

```powershell
Invoke-RestMethod `
  -Uri http://127.0.0.1:8000/voice/session `
  -Method POST `
  -Body '{"consumer_id":"C001","language":"HI"}' `
  -ContentType "application/json"
```

Get consumer summary for voice agent:

```powershell
Invoke-RestMethod `
  -Uri http://127.0.0.1:8000/voice/tools/consumer-summary `
  -Method POST `
  -Body '{"consumer_id":"C001"}' `
  -ContentType "application/json"
```

Get anomaly evidence:

```powershell
Invoke-RestMethod `
  -Uri http://127.0.0.1:8000/voice/tools/anomaly-evidence `
  -Method POST `
  -Body '{"consumer_id":"C001"}' `
  -ContentType "application/json"
```

Before ML predictions are loaded, unavailable evidence returns `data_available=false` and preserves `UNCERTAIN` instead of inventing facts. After loading predictions, this endpoint returns structured ML evidence.

## ML Prediction Testing

Load the generated prediction sample from `ml/evaluation/predictions_sample.json`:

```powershell
Invoke-RestMethod `
  -Uri http://127.0.0.1:8000/ml/predictions/load-sample `
  -Method POST
```

Then inspect:

- `GET /dashboard/summary`
- `GET /anomalies`
- `GET /investigations`
- `GET /consumers/{consumer_id}/analysis`
- `POST /voice/tools/anomaly-evidence`

Only `HIGH` and `CRITICAL` risk predictions create investigation cases automatically.

To verify anomaly list size clearly, use:

```powershell
Invoke-RestMethod `
  -Uri "http://127.0.0.1:8000/anomalies/queue?limit=100" `
  -Method GET
```

This returns `total`, `limit`, `returned`, and `items`.

## Structured Copilot Questions

`POST /copilot/ask` answers from structured backend data only. It does not call an LLM and does not invent missing values.

Grid status:

```powershell
Invoke-RestMethod `
  -Uri http://127.0.0.1:8000/copilot/ask `
  -Method POST `
  -Body '{"question":"What is the current grid status?"}' `
  -ContentType "application/json"
```

Top risky consumers:

```powershell
Invoke-RestMethod `
  -Uri http://127.0.0.1:8000/copilot/ask `
  -Method POST `
  -Body '{"question":"Show me the top risky consumers","limit":5}' `
  -ContentType "application/json"
```

Consumer explanation:

```powershell
Invoke-RestMethod `
  -Uri http://127.0.0.1:8000/copilot/ask `
  -Method POST `
  -Body '{"question":"Why was this consumer flagged?","consumer_id":"CONSUMER_ID_HERE"}' `
  -ContentType "application/json"
```

Case checklist:

```powershell
Invoke-RestMethod `
  -Uri http://127.0.0.1:8000/copilot/ask `
  -Method POST `
  -Body '{"question":"What should the field team inspect?","case_id":"CASE_ID_HERE"}' `
  -ContentType "application/json"
```

Transformer summary:

```powershell
Invoke-RestMethod `
  -Uri http://127.0.0.1:8000/copilot/ask `
  -Method POST `
  -Body '{"question":"Give transformer summary","transformer_id":"T01"}' `
  -ContentType "application/json"
```

## Investigation Workflow Testing

After loading ML predictions, get a case:

```powershell
Invoke-RestMethod `
  -Uri http://127.0.0.1:8000/investigations `
  -Method GET
```

Copy a `case_id`, then fetch full case context:

```powershell
Invoke-RestMethod `
  -Uri http://127.0.0.1:8000/investigations/CASE_ID_HERE `
  -Method GET
```

Update status:

```powershell
Invoke-RestMethod `
  -Uri http://127.0.0.1:8000/investigations/CASE_ID_HERE `
  -Method PATCH `
  -Body '{"status":"UNDER_INVESTIGATION"}' `
  -ContentType "application/json"
```

Add a field observation:

```powershell
Invoke-RestMethod `
  -Uri http://127.0.0.1:8000/investigations/CASE_ID_HERE/observations `
  -Method POST `
  -Body '{"investigator_id":"FIELD_01","source":"TEXT","original_text":"Seal intact but connected load is higher than declared.","normalized_evidence":{"seal_status":"INTACT","load_mismatch":true},"language":"EN","confidence":0.9}' `
  -ContentType "application/json"
```

Update checklist:

```powershell
Invoke-RestMethod `
  -Uri http://127.0.0.1:8000/investigations/CASE_ID_HERE/checklist `
  -Method PATCH `
  -Body '{"item_id":"seal_inspected","status":"DONE"}' `
  -ContentType "application/json"
```

Resolve the case:

```powershell
Invoke-RestMethod `
  -Uri http://127.0.0.1:8000/investigations/CASE_ID_HERE/resolve `
  -Method POST `
  -Body '{"actual_outcome":"METER_MALFUNCTION","resolution_notes":"Meter display intermittently failed during site visit.","resolved_by":"FIELD_01"}' `
  -ContentType "application/json"
```

The resolution stores `predicted_cause` and `actual_outcome` separately so Electron can later evaluate model predictions against field truth.

## Current Storage

The backend now uses SQLAlchemy models and a repository layer.

By default it runs with local SQLite for easy testing:

```text
sqlite:///./electron_backend.db
```

For PostgreSQL, set `DATABASE_URL` before starting the server:

```powershell
$env:DATABASE_URL="postgresql+psycopg://USER:PASSWORD@localhost:5432/electron"
python -m uvicorn backend.app.main:app --reload
```

Tables are created on startup for the prototype. A migration tool should be added before production use.

## Not Implemented Yet

- authentication
- live ML model inference from telemetry
- WebSockets
- ElevenLabs, OpenAI, MQTT, or ThingsBoard integrations
