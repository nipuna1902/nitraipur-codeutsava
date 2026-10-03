# Grid Forensics + Prioritization

Purpose: correlate consumer anomalies with transformer and feeder energy balance.

## Transformer Forensics Flow

```mermaid
flowchart TD
  A[Transformer Input Energy] --> D[Energy Balance]
  B[Reported Consumer Energy] --> D
  C[Expected Technical Loss Config] --> D
  D --> E[Unexplained Loss]
  E --> F[Correlate With Consumer Anomalies]
  F --> G[Cluster Risk]
  G --> H[Inspection Priority]
```

## Key Formula

```text
unexplained_loss =
  transformer_input_energy
  - total_consumer_energy
  - expected_technical_loss
```

Expected technical-loss assumptions must be configurable per transformer, feeder, or policy profile. They must not be hard-coded.

## Outputs

- transformer unexplained loss
- feeder-level loss context
- suspicious consumer clusters
- transformer loss score
- inspection priority inputs
