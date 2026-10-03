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
- `GET /dashboard/summary`
- `GET /consumers`
- `GET /consumers/{consumer_id}`
- `GET /consumers/{consumer_id}/history`
- `GET /transformers`
- `GET /transformers/{transformer_id}`
- `GET /simulation/status`

## Current Storage

The backend currently uses an in-memory prototype store. PostgreSQL models and migrations are the next backend step.

## Not Implemented Yet

- authentication
- PostgreSQL persistence
- ML anomaly scoring
- investigation workflow
- WebSockets
- ElevenLabs, OpenAI, MQTT, or ThingsBoard integrations
