# Electron

**From Grid Anomaly to Field Action.**

Electron is planned as a closed-loop grid intelligence platform for electricity-distribution monitoring. It is designed to help utilities answer: what is abnormal, why it may be abnormal, how strong the evidence is, whether the issue correlates with transformer or feeder losses, and which cases deserve field inspection first.

## Problem

Unusual consumption does not automatically mean theft. A significant drop in readings may indicate theft or tampering, but it may also be caused by meter malfunction, communication failure, legitimate reduction, or seasonal behavior. Electron treats anomaly detection as the beginning of investigation, not the final verdict.

## Why Existing Approaches Fail

Simple thresholds often confuse abnormal behavior with confirmed theft. They usually ignore personal baselines, peer context, meter and communication health, transformer energy balance, and field investigation feedback.

## Our Solution

Electron will combine consumer profiling, anomaly and cause intelligence, grid forensics, case workflow, and a voice-first investigation copilot. The ML and statistical pipeline remains the source of truth for detection. Generative AI and ElevenLabs are planned only for grounded explanation and field interaction.

## Four Intelligence Layers

1. Consumer Intelligence: personal baseline, peer groups, temporal behavior, and consumer profile.
2. Anomaly + Cause Intelligence: abnormality detection and probable cause classification with uncertainty.
3. Grid Forensics + Prioritization: transformer and feeder loss correlation, cluster risk, and inspection priority.
4. Investigation Copilot: grounded summaries, checklists, reports, multilingual voice interaction, and feedback capture.

## Closed-Loop Intelligence

Electron is designed around the loop: detect, diagnose, correlate, prioritize, explain, investigate, verify, and learn. Model predictions and field outcomes are both stored so future evaluation and improvement are possible.

## Digital Twin

The Digital Twin is planned as a self-testing grid laboratory. It will generate known scenarios, stream telemetry into the same pipeline used by live data, and compare predictions with simulator ground truth. No model metrics are included until real evaluation exists.

## Voice-First Field Copilot

ElevenLabs is planned as the user-facing voice interface for field investigators in English, Hindi, Odia, and future configurable languages. It will call narrow Electron backend tools and must never invent readings, scores, losses, or findings.

## Architecture

See `docs/02-system-architecture.md` for the overall architecture and Mermaid diagrams. Detailed plans live under `docs/`.

## Planned Tech Stack

- Frontend: Next.js, TypeScript, Tailwind CSS, Recharts, React Flow or SVG, WebSocket client
- Backend: Python, FastAPI, Pydantic, SQLAlchemy or SQLModel, WebSockets
- Database: PostgreSQL
- ML: NumPy, Pandas, scikit-learn, Isolation Forest, XGBoost where appropriate, SHAP where appropriate
- Simulation: Python
- IoT: MQTT, optional ThingsBoard
- GenAI: evidence-grounded summaries and reports
- Voice: ElevenLabs agent integrated through controlled backend tools

## Repository Structure

- `docs/`: architecture, product, API, security, testing, deployment, roadmap
- `contracts/`: JSON schema contracts
- `simulator/`: Digital Twin planning area
- `ml/`: ML pipeline planning area
- `backend/`: backend planning area
- `frontend/`: frontend planning area
- `data/`: data storage conventions
- `tests/`: integration, scenario, and regression planning

## Implementation Status

Current phase: **architecture only**. Implementation has not started. See `BUILD_STATUS.md`.

## Hackathon Roadmap

The planned 28-hour roadmap is documented in `docs/15-implementation-roadmap.md`.

## Future Scope

Future work may include live MQTT ingestion, optional ThingsBoard visualization, production-grade authorization, multilingual voice operations, model explainability, field mobile support, and post-hackathon model improvement from confirmed case outcomes.
