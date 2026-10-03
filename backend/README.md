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
- ML anomaly scoring
- investigation workflow
- WebSockets
- ElevenLabs, OpenAI, MQTT, or ThingsBoard integrations
