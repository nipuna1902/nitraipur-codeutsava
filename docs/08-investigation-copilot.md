# Investigation Copilot

Purpose: turn machine evidence into field-usable investigation support.

## Responsibilities

- summarize anomaly evidence
- present alternative explanations
- provide inspection checklist
- support field observation capture
- generate case summaries and reports
- preserve uncertainty

## Investigation Lifecycle

```mermaid
stateDiagram-v2
  [*] --> OPEN
  OPEN --> AI_FLAGGED
  AI_FLAGGED --> INSPECTION_PENDING
  INSPECTION_PENDING --> UNDER_INVESTIGATION
  UNDER_INVESTIGATION --> CONFIRMED
  UNDER_INVESTIGATION --> DISMISSED
  CONFIRMED --> RESOLVED
  DISMISSED --> RESOLVED
```

## Checklist

- meter physically inspected
- seal inspected
- connected load verified
- meter reading verified
- bypass checked
- physical anomaly observed
- additional notes

## Field Feedback Loop

```mermaid
flowchart LR
  A[AI Prediction] --> B[Investigation Case]
  B --> C[Field Evidence]
  C --> D[Actual Outcome]
  D --> E[Evaluation Dataset]
  E --> F[Future Model Improvement]
```
