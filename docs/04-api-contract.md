# API Contract

This document defines planned endpoints only. No endpoints are implemented.

All API routes require authentication except `GET /health`. Authorization is role-based using `ADMIN`, `GRID_OPERATOR`, `DATA_ANALYST`, `FIELD_INVESTIGATOR`, and `VIEWER`.

## Common Errors

- `400`: invalid request
- `401`: unauthenticated
- `403`: unauthorized role
- `404`: resource not found
- `409`: invalid state transition
- `422`: schema validation failed
- `429`: rate limit exceeded
- `500`: internal error

## System

`GET /health`

Purpose: service health check. Auth: none. Response: `{ "status": "ok" }`.

`GET /mqtt/status`

Purpose: report MQTT ingestion state, broker config, last message time, and persisted MQTT reading count.

## Dashboard

`GET /dashboard/summary`

Purpose: aggregate system counts and live status. Roles: `ADMIN`, `GRID_OPERATOR`, `DATA_ANALYST`, `VIEWER`. Response includes total consumers, active anomalies, high-risk cases, transformer unexplained loss, active investigations, and live events.

## Consumers

- `GET /consumers`: filterable consumer list.
- `GET /consumers/{consumer_id}`: consumer metadata.
- `GET /consumers/{consumer_id}/history`: telemetry history.
- `GET /consumers/{consumer_id}/profile`: profile and baseline.
- `GET /consumers/{consumer_id}/analysis`: risk, probable cause, and evidence.
- `GET /consumers/{consumer_id}/peers`: peer group comparison.

Roles: all authenticated roles may read, subject to data-scope policy.

## Anomalies

- `GET /anomalies`: filter anomalies by risk, cause, time, transformer, or status.
- `GET /anomalies/{anomaly_id}`: anomaly detail.

Response schema references `contracts/anomaly.schema.json`.

## Grid

- `GET /feeders`
- `GET /transformers`
- `GET /transformers/{transformer_id}`
- `GET /transformers/{transformer_id}/loss`
- `GET /transformers/{transformer_id}/consumers`

Purpose: feeder and transformer context, energy balance, and affected consumers.

## Investigations

- `GET /investigations`: case queue sorted by priority.
- `GET /investigations/{case_id}`: investigation workspace context.
- `POST /investigations`: create case from anomaly.
- `PATCH /investigations/{case_id}`: update assignment or status.
- `POST /investigations/{case_id}/observations`: add field observation.
- `PATCH /investigations/{case_id}/checklist`: update checklist item.
- `POST /investigations/{case_id}/resolve`: submit confirmed or dismissed outcome.

Case resolution changes require `FIELD_INVESTIGATOR`, `GRID_OPERATOR`, or `ADMIN`; consequential updates should require user confirmation in UI or voice flow.

## Copilot

- `POST /copilot/case/{case_id}/summary`: generate grounded case summary.
- `POST /copilot/case/{case_id}/ask`: answer grounded investigation question.

The copilot may only use structured case context and must not invent missing facts.

## Voice

- `POST /voice/session`: initialize voice session metadata.
- `POST /voice/tools/consumer-summary`
- `POST /voice/tools/anomaly-evidence`
- `POST /voice/tools/transformer-summary`
- `POST /voice/tools/field-observation`
- `POST /voice/tools/checklist-update`

Voice tools are narrow backend APIs for the ElevenLabs agent. Their schemas are in `contracts/voice-agent-tools.schema.json`.

## Simulation

- `POST /simulation/scenario`: define scenario.
- `POST /simulation/run`: start run.
- `POST /simulation/compare`: compare injected ground truth with deterministic simulated detection output.
- `GET /simulation/status`: current run status.
- `GET /simulation/results/{run_id}`: predictions compared with ground truth.

`/simulation/compare` is a demo-safe deterministic comparator for known injections. Full simulation-run metrics exist only after a completed simulation run.

## Real Time

- `WebSocket /ws/grid`: grid events, telemetry summaries, anomaly updates.
- `WebSocket /ws/investigations/{case_id}`: case timeline and checklist updates.
