# Anomaly + Cause Engine

Purpose: distinguish abnormal behavior from probable cause.

## Planned Signals

- personal deviation
- peer deviation
- anomaly persistence
- meter health
- communication health
- voltage behavior
- current behavior
- power behavior
- missing readings
- zero readings
- transformer loss correlation
- cluster score

## Planned Classifications

- `NORMAL`
- `THEFT_TAMPERING`
- `METER_MALFUNCTION`
- `COMMUNICATION_FAILURE`
- `LEGITIMATE_ABNORMAL_CONSUMPTION`
- `UNCERTAIN`

## ML Pipeline

```mermaid
flowchart TD
  A[Validated Telemetry] --> B[Feature Engineering]
  B --> C[Personal Baseline Features]
  B --> D[Peer Comparison Features]
  B --> E[Health and Missingness Features]
  C --> F[Anomaly Scoring]
  D --> F
  E --> F
  F --> G[Cause Classification]
  G --> H[Risk Scoring]
  H --> I[Evidence Payload]
```

## Constraints

- Retain uncertainty.
- Do not equate unusual behavior with theft.
- Do not fabricate model confidence.
- Do not use LLM output as the source of anomaly detection.
