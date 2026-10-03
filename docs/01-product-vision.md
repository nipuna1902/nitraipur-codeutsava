# Product Vision

Electron is a closed-loop grid intelligence platform.

## Target Workflow

```mermaid
flowchart TD
  A[Electricity Data] --> B[Consumer Profiling]
  B --> C[Personal Baseline]
  C --> D[Peer Comparison]
  D --> E[Anomaly Detection]
  E --> F[Probable Cause Classification]
  F --> G[Grid-Level Correlation]
  G --> H[Risk + Inspection Priority]
  H --> I[Explainable Investigation]
  I --> J[Natural-Language Voice Copilot]
  J --> K[Field Investigation]
  K --> L[Case Resolution]
  L --> M[Feedback]
  M --> N[Evaluation / Future Model Improvement]
```

## Expected Behavior

Electron should produce investigation support such as:

- consumer risk score
- probable cause
- evidence list
- alternative explanations
- transformer or feeder correlation
- recommended inspection priority

It must not simply output "theft detected."

## Closed Loop

Predictions and field results are stored separately. If the AI predicts theft but the field team confirms meter malfunction, both facts are retained for evaluation.
