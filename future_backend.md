# Future Backend Plan

This document captures the backend layers to add after the current prototype branch is merged.

## Current Backend State

The backend currently provides a FastAPI foundation with in-memory storage.

Implemented:

- health check
- telemetry ingestion
- telemetry listing
- dashboard summary
- consumer summary
- consumer history
- transformer summary
- simulation readiness status

Not implemented yet:

- PostgreSQL persistence
- ML anomaly scoring
- investigation workflow
- WebSockets
- authentication
- ElevenLabs/OpenAI/MQTT/ThingsBoard integrations

## Layer 1 - PostgreSQL Persistence

Replace the in-memory store with real persistence.

Add:

- SQLAlchemy or SQLModel models
- database session management
- migrations
- repository/service layer
- test database setup

Tables:

- consumers
- telemetry_readings
- transformers
- transformer_energy_snapshots
- consumer_profiles
- anomalies
- investigation_cases
- field_observations
- case_resolutions
- simulation_events
- audit_events

Acceptance criteria:

- ingested telemetry survives server restart
- tests run against isolated test storage
- current API responses remain compatible

## Layer 2 - Simulator Integration

Connect the future simulator runner to backend APIs.

Endpoints:

- `POST /simulation/run`
- `POST /simulation/stop`
- `POST /simulation/scenario`
- `GET /simulation/status`
- `GET /simulation/results/{run_id}`

Backend responsibilities:

- store simulation run metadata
- store simulator ground truth separately from predictions
- ingest simulator telemetry through the same telemetry contract
- expose run status for frontend

## Layer 3 - Consumer Intelligence

Add profile and peer intelligence.

Endpoints:

- `GET /consumers/{consumer_id}/profile`
- `GET /consumers/{consumer_id}/analysis`
- `GET /consumers/{consumer_id}/peers`

Backend responsibilities:

- compute/store historical mean, median, min, max, and standard deviation
- compute expected baseline
- build peer groups
- expose personal deviation and peer deviation

## Layer 4 - Anomaly Engine Integration

Add anomaly and probable-cause APIs.

Endpoints:

- `GET /anomalies`
- `GET /anomalies/{anomaly_id}`

Backend responsibilities:

- store anomaly score
- store risk score
- store predicted cause
- store confidence
- store evidence payload
- keep `UNCERTAIN` available when evidence is weak

Important rule:

Do not classify every anomaly as theft. Backend responses must preserve uncertainty.

## Layer 5 - Transformer and Feeder Forensics

Add grid-loss analysis.

Endpoints:

- `GET /feeders`
- `GET /transformers/{transformer_id}/loss`
- `GET /transformers/{transformer_id}/consumers`

Backend responsibilities:

- compute transformer consumer energy totals
- compute expected technical loss from configurable policy
- compute unexplained loss
- correlate transformer loss with consumer anomalies
- provide inputs for inspection priority

Formula:

```text
unexplained_loss =
  transformer_input_energy
  - consumer_energy
  - expected_technical_loss
```

## Layer 6 - Investigation Workflow

Add case management.

Endpoints:

- `GET /investigations`
- `GET /investigations/{case_id}`
- `POST /investigations`
- `PATCH /investigations/{case_id}`
- `POST /investigations/{case_id}/observations`
- `PATCH /investigations/{case_id}/checklist`
- `POST /investigations/{case_id}/resolve`

Statuses:

- `OPEN`
- `AI_FLAGGED`
- `INSPECTION_PENDING`
- `UNDER_INVESTIGATION`
- `CONFIRMED`
- `DISMISSED`
- `RESOLVED`

Acceptance criteria:

- prediction and field outcome are stored separately
- field observations are timestamped
- case changes create audit events

## Layer 7 - WebSocket Live Updates

Add live update channels.

WebSockets:

- `/ws/grid`
- `/ws/investigations/{case_id}`

Used for:

- live telemetry summaries
- anomaly alerts
- simulation status
- case timeline updates

## Layer 8 - Security

Add backend security controls.

Add:

- JWT authentication
- role-based authorization
- input validation
- rate limiting
- audit logs
- secrets management

Roles:

- `ADMIN`
- `GRID_OPERATOR`
- `DATA_ANALYST`
- `FIELD_INVESTIGATOR`
- `VIEWER`

## Layer 9 - Voice Agent Tool APIs

Add narrow backend APIs for ElevenLabs.

Tools:

- `get_consumer_summary`
- `get_consumer_baseline`
- `get_peer_comparison`
- `get_anomaly_evidence`
- `get_transformer_summary`
- `get_investigation_case`
- `get_inspection_checklist`
- `add_field_observation`
- `update_checklist_item`
- `request_case_resolution`
- `generate_case_summary`

Rule:

The voice agent must not access the database directly. It should only call controlled backend tools.

## Layer 10 - Report Export

Add exports for dashboard and investigation use.

Endpoints:

- `GET /reports/investigations/{case_id}.json`
- `GET /reports/investigations/{case_id}.csv`
- `GET /reports/investigations/{case_id}.pdf`
- `GET /reports/anomalies/export`

Reports should include:

- consumer details
- anomaly evidence
- baseline comparison
- peer comparison
- transformer context
- field checklist
- case timeline
- resolution outcome, if available

## Recommended Next Backend Step

After merge, implement PostgreSQL persistence first. Keep the existing API shape stable and replace only the storage layer behind it.
