# 28-Hour Implementation Roadmap

## Phase 0 - Architecture

Goal: create blueprint. Input: product requirements. Output: folders, schemas, contracts, docs, roadmap. Dependencies: none. Acceptance: architecture package complete. Time: 2-3h. Parallelization: docs, schemas, UX planning.

## Phase 1 - Digital Twin Foundation

Goal: generate controlled grid telemetry. Input: topology and scenario contracts. Output: consumers, profiles, telemetry generator, scenario engine, ground truth. Dependencies: Phase 0. Acceptance: repeatable scenario output. Time: 3h. Parallelization: topology, profiles, scenarios.

## Phase 2 - Consumer Intelligence

Goal: build normal behavior profiles. Input: telemetry. Output: baselines, peer groups, feature tables. Dependencies: Phase 1. Acceptance: explainable baseline and peer features. Time: 3h. Parallelization: preprocessing and peer grouping.

## Phase 3 - Detection

Goal: score anomalies and probable causes. Input: features. Output: Isolation Forest, risk scoring, cause classification. Dependencies: Phase 2. Acceptance: predictions stored with evidence. Time: 3h. Parallelization: scoring and cause rules/model.

## Phase 4 - Grid Forensics

Goal: correlate anomalies with transformer balance. Input: transformer snapshots and consumer totals. Output: unexplained loss, clusters, inspection priority. Dependencies: Phases 1-3. Acceptance: priority uses grid context. Time: 2h. Parallelization: accounting and clustering.

## Phase 5 - Backend

Goal: expose APIs and persistence. Input: schemas and services. Output: FastAPI, PostgreSQL, WebSocket, case workflow. Dependencies: Phases 1-4. Acceptance: documented endpoints function. Time: 4h. Parallelization: API, DB, WebSocket.

## Phase 6 - Frontend

Goal: build operational UI. Input: backend APIs. Output: dashboard, grid visualization, consumer explorer, investigation workspace, simulation controls. Dependencies: Phase 5. Acceptance: demo flow navigable. Time: 5h. Parallelization: pages and components.

## Phase 7 - Closed Loop

Goal: capture field outcomes. Input: investigation cases. Output: checklist, observations, resolution, feedback dataset. Dependencies: Phase 5. Acceptance: prediction and actual outcome stored separately. Time: 2h. Parallelization: UI and API updates.

## Phase 8 - ElevenLabs

Goal: add voice interaction. Input: voice tool contracts. Output: agent tools, Hindi/English/Odia interaction, field observation capture. Dependencies: Phases 5 and 7. Acceptance: controlled tools only, grounded responses. Time: 2h. Parallelization: tool gateway and prompts.

## Phase 9 - Generative AI

Goal: produce grounded reports. Input: structured evidence. Output: summaries, alternatives, recommended field actions. Dependencies: Phases 5 and 7. Acceptance: no unsupported facts. Time: 1.5h. Parallelization: templates and API.

## Phase 10 - Self Testing

Goal: evaluate predictions against simulator truth. Input: simulator runs and predictions. Output: scenario runner, metrics, stress-test dashboard. Dependencies: Phases 1-4 and 6. Acceptance: metrics segmented by scenario. Time: 2h. Parallelization: backend metrics and UI.

## Phase 11 - Optional IoT

Goal: connect live ingestion if time permits. Input: MQTT/device config. Output: MQTT and optional ThingsBoard path. Dependencies: backend. Acceptance: optional path does not block core demo. Time: 1h. Parallelization: one engineer only.

## Phase 12 - Harden + Demo

Goal: make the demo reliable. Input: integrated system. Output: tests, deployment, demo data, demo script, failure recovery. Dependencies: all selected phases. Acceptance: demo path works end to end. Time: 2h. Parallelization: QA, deployment, script.
