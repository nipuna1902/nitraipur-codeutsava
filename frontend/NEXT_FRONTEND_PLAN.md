# Next Frontend Creation Plan

This file tracks frontend items that do not fit cleanly into the current single-dashboard prototype.

## Pages To Build Next

### `/investigations/[id]`

- case detail workspace
- risk explanation
- checklist editing
- field observation form
- resolution workflow
- voice copilot panel scoped to the case

### `/consumers/[id]`

- consumption history
- baseline comparison
- peer comparison
- latest anomaly evidence
- linked transformer and feeder
- investigation history

### `/grid`

- substation to feeder to transformer to consumer hierarchy
- transformer unexplained loss panel
- suspicious cluster view
- filter by feeder, transformer, risk, and communication health

### `/stress-test`

- scenario distribution
- confusion matrix
- precision, recall, F1
- false-positive and false-negative lists
- detection latency by scenario

## Backend Endpoints Needed

- `POST /simulation/scenario`
- `POST /simulation/run`
- `GET /simulation/results/{run_id}`
- `POST /telemetry/inject`
- `POST /telemetry/inject/fault`
- `GET /grid/topology`
- `GET /stress-test/runs`
- `GET /stress-test/runs/{run_id}`

## UI Controls Needed Later

- start, pause, reset simulator
- stream rate slider
- scenario severity slider
- target transformer selector
- target consumer selector
- export evaluation report
- assign case to field team
- resolve case with confirmation
- push structured observation from voice transcript

## Important Constraint

The frontend can preview simulator and bad-data payloads now, but it should not pretend that streaming or injection is implemented until backend endpoints exist.
