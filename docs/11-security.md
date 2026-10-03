# Security Architecture

Security is a cross-cutting layer under the platform, not a fifth intelligence layer.

## Planned Controls

- API authentication
- role-based access control
- device authentication
- MQTT authentication
- encrypted transport
- input validation
- telemetry validation
- audit logs
- case-change audit history
- agent tool authorization
- rate limiting
- secrets management

## Roles

- `ADMIN`: platform configuration, users, all case actions
- `GRID_OPERATOR`: grid monitoring, case assignment, operational updates
- `DATA_ANALYST`: read analytics, evaluate models and simulation results
- `FIELD_INVESTIGATOR`: assigned cases, checklist, observations, resolution requests
- `VIEWER`: read-only dashboard and reports

## Authorization Boundaries

- Voice tools receive the same authorization checks as normal API calls.
- Field investigators may update only assigned or authorized cases.
- Case resolution requires explicit actor identity and audit event.
- Device telemetry ingestion must validate device identity and payload shape.
- Optional ThingsBoard integration must not bypass Electron authorization.

## Secrets

Secrets live in environment variables and must not be committed. `.env.example` contains variable names only.
