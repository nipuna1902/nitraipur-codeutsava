# Backend PostgreSQL Persistence

This document explains the database persistence layer added to the backend and what remains for the next backend phases.

## What Was Added

The backend now has a SQLAlchemy-based persistence layer.

Current behavior:

- Uses SQLite locally by default.
- Can use PostgreSQL by setting `DATABASE_URL`.
- Creates prototype tables on backend startup.
- Stores telemetry readings in the database instead of memory.
- Keeps the same API shape as the earlier in-memory backend.

The current implementation is intentionally simple so the ML and frontend teams can continue using stable API endpoints while the database layer improves underneath.

## Files Added

### `backend/app/database.py`

Defines:

- SQLAlchemy engine
- session factory
- declarative base
- `init_db()`
- `get_db()` FastAPI dependency

Default database:

```text
sqlite:///./electron_backend.db
```

PostgreSQL database example:

```powershell
$env:DATABASE_URL="postgresql+psycopg://USER:PASSWORD@localhost:5432/electron"
python -m uvicorn backend.app.main:app --reload
```

### `backend/app/models/db_models.py`

Defines SQLAlchemy tables:

- `Transformer`
- `Consumer`
- `TelemetryReading`

These are the first persistent backend entities. More tables will be added as the ML, investigation, simulation, and security layers are implemented.

### `backend/app/services/repository.py`

Contains the database-backed repository.

Responsibilities:

- seed default transformers
- ingest telemetry readings
- create missing consumers automatically during telemetry ingestion
- list telemetry readings
- return consumer summaries
- return consumer history
- return transformer summaries
- return dashboard status counts

### `backend/app/services/store.py`

The old in-memory store was replaced with a small facade.

Current purpose:

- provide `store.reset()` for tests and local development cleanup

It is not the main storage layer anymore.

## Current Tables

### `transformers`

Stores default transformer metadata.

Important fields:

- `transformer_id`
- `feeder_id`
- `rated_capacity`
- `expected_technical_loss_ratio`

Current default transformers:

- `T01` under `F01`
- `T02` under `F01`
- `T03` under `F02`
- `T04` under `F02`

### `consumers`

Stores consumers discovered from telemetry.

Current behavior:

- If telemetry arrives for a new consumer, the backend creates a basic consumer record.
- Transformer is inferred from consumer ID:
  - `C001-C012` -> `T01`
  - `C013-C024` -> `T02`
  - `C025-C036` -> `T03`
  - `C037+` -> `T04`

This inference is acceptable for the prototype but should later be replaced with simulator or dataset-provided topology.

### `telemetry_readings`

Stores meter readings.

Important fields:

- `consumer_id`
- `timestamp`
- `voltage`
- `current`
- `power`
- `energy`
- `meter_status`
- `communication_status`
- `source`

## API Behavior Preserved

The following endpoints still work:

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

The implementation changed from memory to SQLAlchemy, but the API contract stayed stable.

## How To Test

Run automated tests:

```powershell
python -m unittest backend.tests.test_api
```

Expected:

```text
Ran 5 tests
OK
```

Run backend:

```powershell
python -m uvicorn backend.app.main:app --reload
```

Open:

```text
http://127.0.0.1:8000/docs
```

Insert telemetry:

```powershell
$body = @'
{
  "readings": [
    {
      "consumer_id": "C001",
      "timestamp": "2026-10-03T00:00:00Z",
      "voltage": 230,
      "current": 4.5,
      "power": 1.1,
      "energy": 0.275,
      "meter_status": "NORMAL",
      "communication_status": "CONNECTED",
      "source": "SIMULATOR"
    }
  ]
}
'@

Invoke-RestMethod `
  -Uri http://127.0.0.1:8000/telemetry/readings `
  -Method POST `
  -Body $body `
  -ContentType "application/json"
```

Check readback:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/consumers/C001
```

Restart the backend and call the same endpoint again. If `C001` still exists, persistence is working.

## What Still Needs To Be Done

### 1. Add Alembic Migrations

Current table creation uses `Base.metadata.create_all()`.

Next step:

- add Alembic
- create initial migration
- stop relying on automatic table creation for production-like environments

### 2. Replace Prototype Consumer Inference

Current consumer-to-transformer mapping is inferred from IDs.

Next step:

- load topology from simulator output, dataset metadata, or seed file
- store real consumer category, sanctioned load, tariff, feeder, transformer, and area

### 3. Add Remaining Domain Tables

Needed tables:

- `consumer_profiles`
- `anomalies`
- `transformer_energy_snapshots`
- `simulation_events`
- `investigation_cases`
- `field_observations`
- `case_resolutions`
- `audit_events`

### 4. Add ML Integration Tables

When the ML teammate has model outputs, backend should store:

- anomaly score
- risk score
- predicted cause
- confidence
- feature values
- evidence payload
- model version

Important:

The backend must preserve uncertainty. Weak evidence should produce `UNCERTAIN` or review state, not forced theft classification.

### 5. Add Transformer Energy Snapshots

The backend needs a dedicated transformer snapshot table for:

- transformer input energy
- consumer reported energy
- expected technical loss
- unexplained loss
- timestamp

This will support transformer/feeder forensics.

### 6. Add Investigation Workflow Persistence

Add persistent case management:

- case creation from anomaly
- status transitions
- assignment
- checklist updates
- field observations
- resolution outcome

Prediction and field outcome must be stored separately.

### 7. Add Authentication And Audit Logs

Future backend security should include:

- JWT authentication
- role-based access control
- audit events for case changes
- rate limiting
- input validation

### 8. Add WebSocket Layer

Needed channels:

- `/ws/grid`
- `/ws/investigations/{case_id}`

These should stream:

- telemetry updates
- anomaly alerts
- investigation updates
- simulation status

## Recommended Next Backend Task

After this branch is merged, the next backend task should be:

1. Add Alembic migrations.
2. Add full domain tables.
3. Add simulator/dataset topology seeding.
4. Prepare anomaly output ingestion for the ML teammate.

This order keeps the backend stable while making it ready for ML integration.
