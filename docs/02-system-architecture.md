# System Architecture

## Overall Architecture

```mermaid
flowchart TD
  A[Digital Twin] --> C[Data Ingestion]
  B[Historical Data] --> C
  IOT[Future IoT / MQTT] --> C
  C --> D[Consumer Intelligence]
  D --> E[Anomaly + Cause Engine]
  E --> F[Grid Forensics]
  F --> G[Investigation Service]
  G --> H[Dashboard]
  G --> V[ElevenLabs Voice Agent]
  H --> W[Field Investigator]
  V --> W
  W --> X[Field Evidence]
  X --> Y[Case Resolution]
  Y --> Z[Feedback Dataset]
  Z --> Q[Evaluation / Future Model Improvement]
```

## Four Intelligence Layers

```mermaid
flowchart TB
  L1[Layer 1: Consumer Intelligence]
  L2[Layer 2: Anomaly + Cause Intelligence]
  L3[Layer 3: Grid Forensics + Prioritization]
  L4[Layer 4: Investigation Copilot]
  S[Security Layer]
  S --- L1
  S --- L2
  S --- L3
  S --- L4
  L1 --> L2 --> L3 --> L4
```

## Telemetry Pipeline

```mermaid
flowchart LR
  A[Simulator / Historical / MQTT] --> B[Validation]
  B --> C[Raw Telemetry Store]
  C --> D[Feature Engineering]
  D --> E[Consumer Profile]
  D --> F[Anomaly Engine]
  F --> G[Grid Correlation]
  G --> H[Investigation Cases]
  H --> I[WebSocket Events]
```

## Architectural Decisions

- Keep ML/statistical detection separate from LLM explanation.
- Keep ElevenLabs behind controlled backend tool contracts.
- Use PostgreSQL as the system of record.
- Use configurable technical-loss assumptions, not hard-coded percentages.
- Store simulator ground truth separately from predictions.
- Support graceful degradation when OpenAI, ElevenLabs, or ThingsBoard are unavailable.
