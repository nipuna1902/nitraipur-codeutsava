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
- `POST /voice/session`
- `POST /voice/tools/consumer-summary`
- `POST /voice/tools/anomaly-evidence`
- `POST /voice/tools/transformer-summary`
- `POST /voice/tools/field-observation`
- `POST /voice/tools/checklist-update`

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
- full investigation workflow updates/resolution
- WebSockets
- ElevenLabs, OpenAI, MQTT, or ThingsBoard integrations
