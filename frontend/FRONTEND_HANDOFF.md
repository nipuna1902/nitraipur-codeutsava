# Frontend Handoff And Testing Guide

## What Was Added

The frontend now has three usable pages:

- `/`
- `/simulation`
- `/dual-injection`

The dashboard is still a prototype. It shows live backend data where backend endpoints exist, and it shows preview controls where backend endpoints are not implemented yet.

## Current Pages

### `/`

Purpose:

- main demo dashboard
- show backend summary
- show anomaly risk curve
- show investigation queue
- show consumer panel
- show transformer forensics panel
- show voice copilot concept

Added controls:

- `Check API`
- `Load ML Sample`
- `Check Queue`
- `Ask Copilot`
- `Refresh`

How to test:

1. Start backend:

   ```powershell
   uvicorn backend.app.main:app --reload
   ```

2. Start frontend:

   ```powershell
   cd frontend
   npm run dev
   ```

3. Open:

   ```text
   http://localhost:3000
   ```

4. Click `Check API`.

   Expected:

   ```json
   {
     "status": "ok"
   }
   ```

5. Click `Load ML Sample`.

   Expected:

   ```json
   {
     "accepted": 201,
     "cases_created": 26,
     ...
   }
   ```

6. Click `Check Queue`.

   Expected:

   ```json
   {
     "total": 201,
     "limit": 10,
     "returned": 10,
     "items": [...]
   }
   ```

7. Click `Ask Copilot`.

   Expected:

   A structured answer about current grid status.

Important:

If backend is off, the dashboard falls back to demo data. That is useful for presentation, but for real testing backend must be running.

## Simulator Page

URL:

```text
http://localhost:3000/simulation
```

Purpose:

This is the future Digital Twin control room.

It currently lets the user choose:

- Normal
- Inject Theft
- Meter Fault
- Communication Failure
- Seasonal Shift
- Coordinated Theft

What it does right now:

- changes selected scenario in UI
- shows a JSON payload preview
- explains the planned simulator pipeline

What it does not do yet:

- it does not start the real simulator
- it does not stream telemetry
- it does not write anything to the backend
- it does not calculate evaluation metrics

How to test it now:

1. Open:

   ```text
   http://localhost:3000/simulation
   ```

2. Click each scenario button.

3. Confirm the selected scenario panel changes.

4. Confirm the JSON payload changes.

5. Confirm page is responsive and readable.

This is a UI prototype for the future simulator backend.

## Dual / Bad-Data Injection Page

URL:

```text
http://localhost:3000/dual-injection
```

Better name suggestion:

```text
Bad-Data Lab
```

Purpose:

This page is for showing how we will deliberately inject wrong or suspicious telemetry into Electron.

It is useful because we cannot build full hardware during the hackathon. Instead, we show how bad hardware readings would be simulated.

Current injection options:

- Zero Reading
- Sudden Drop
- Spike Then Drop
- Flatline Meter
- Missing Packets
- Transformer Mismatch

What it does right now:

- lets user choose a bad-data type
- shows the telemetry-like JSON payload that would be sent later
- lets user copy that payload

What it does not do yet:

- it does not send the payload to backend
- it does not modify the ML model output
- it does not create a real anomaly by itself
- it does not update dashboard counts

How to test it now:

1. Open:

   ```text
   http://localhost:3000/dual-injection
   ```

2. Click `Zero Reading`.

   Expected:

   Payload should show:

   ```json
   {
     "injection_type": "ZERO_READING",
     "current": 0,
     "power": 0,
     "energy": 0
   }
   ```

3. Click `Sudden Drop`.

   Expected:

   Payload should show lower power and energy.

4. Click `Missing Packets`.

   Expected:

   Payload should show:

   ```json
   {
     "communication_status": "DISCONNECTED"
   }
   ```

5. Click `Flatline Meter`.

   Expected:

   Payload should show:

   ```json
   {
     "meter_status": "SUSPECTED_FAULT"
   }
   ```

6. Click `Copy Payload`.

   Expected:

   Button briefly changes to `Copied`.

The page is testing the UI and planned payload design, not backend injection yet.

## How To Properly Test The Whole Frontend

### 1. Backend Health

Open:

```text
http://127.0.0.1:8000/health
```

Expected:

```json
{
  "status": "ok"
}
```

### 2. Swagger

Open:

```text
http://127.0.0.1:8000/docs
```

Use this to test backend endpoints manually.

### 3. Frontend Overview

Open:

```text
http://localhost:3000
```

Click:

- `Check API`
- `Load ML Sample`
- `Check Queue`
- `Ask Copilot`

### 4. Simulator Page

Open:

```text
http://localhost:3000/simulation
```

Click every scenario and verify payload changes.

### 5. Bad-Data Lab

Open:

```text
http://localhost:3000/dual-injection
```

Click every injection type and verify payload changes.

### 6. Production Build

Run:

```powershell
cd frontend
npm run typecheck
npm run build
```

Both should pass.

## What Teammate Should Improve Next

### 0. Make The App Easier To Understand

The current UI has useful pages, but a new user may not immediately know where to go.

Add a simple guided structure:

```text
1. Overview
2. Load ML Sample
3. Inspect Anomaly Queue
4. Run Simulator
5. Inject Known Bad Data
6. Compare Prediction With Ground Truth
7. Open Investigation Case
8. Resolve Case
```

Recommended UI additions:

- a persistent left sidebar or top stepper
- active page highlight
- a `Start Demo` button on the overview page
- short page subtitles like `Step 1 of 5`
- breadcrumbs on every page
- a compact `Where am I?` panel
- a `Next: Simulator` button at the bottom of overview
- a `Next: Bad-Data Lab` button at the bottom of simulator
- a `Next: Investigation Queue` button after injection

Suggested navigation labels:

```text
Overview
ML Queue
Simulator
Known Injection
Investigations
Field Copilot
Stress Test
```

The goal is that judges can understand the flow without us explaining every click.

### 0.1 Full Simulation Story To Show

We should make the simulator tell a complete story:

```text
We inject known bad data
        ↓
Electron receives telemetry-shaped data
        ↓
ML predicts risk and probable cause
        ↓
System compares prediction with known truth
        ↓
Dashboard shows whether Electron was correct
        ↓
High-risk case is sent to investigation
```

This is the core Digital Twin idea.

The UI should show two things side by side:

```text
Known Truth                    Electron Prediction
-----------                    -------------------
Injected scenario: Theft        Predicted: Theft
Consumer: C-1172                Risk: Critical
Transformer: TR-18              Confidence: 0.91
Duration: 24 ticks              Evidence: sudden drop, zero streak
```

Then show:

```text
Result: MATCH
```

or:

```text
Result: MISMATCH
```

This will help judges understand that we are not only showing a fake animation. We are building a self-testing lab.

### 0.2 Needed UI For Known Injection

On `/dual-injection`, add a clearer workflow:

```text
Step 1: Choose fault type
Step 2: Choose consumer / transformer
Step 3: Set severity and duration
Step 4: Inject known data
Step 5: Run Electron detection
Step 6: Compare with ground truth
```

Add controls:

- consumer dropdown
- transformer dropdown
- severity slider
- duration/ticks input
- `Inject Known Data` button
- `Run Detection` button
- `Compare Result` button

Until backend endpoints exist, keep these as disabled or preview-only buttons with labels like:

```text
Backend endpoint pending
```

Do not make the UI imply that backend injection is already working.

### 0.3 Ground Truth vs Prediction Panel

Add a panel to `/dual-injection`:

```text
Ground Truth
- injection type
- target consumer
- target transformer
- severity
- duration

Electron Prediction
- predicted cause
- risk score
- confidence
- evidence

Evaluation
- match / mismatch
- false positive / false negative
- detection latency
```

This panel should stay empty until a backend run result exists.

Temporary prototype state can show:

```text
Waiting for backend simulation result
```

### 0.4 Where Each Feature Lives

Add a small `Feature Map` section on the overview page:

| User Question | Page |
| --- | --- |
| What is happening right now? | Overview |
| Which consumers are risky? | Overview / ML Queue |
| Can we simulate grid behavior? | Simulator |
| Can we inject known wrong data? | Bad-Data Lab |
| Did Electron predict correctly? | Stress Test / Bad-Data Lab |
| What should field teams inspect? | Investigations |
| Can field workers talk to Electron? | Field Copilot |

This makes the product easier to understand during judging.

### 1. Change Font

Current UI uses system font. It looks clean but slightly generic.

Recommended fonts:

- `Inter`
- `Manrope`
- `DM Sans`
- `Geist`
- `IBM Plex Sans`

Best choice:

```text
Geist or Manrope
```

Reason:

- professional
- modern
- less default-looking
- good dashboard readability

Implementation options:

- use `next/font/google`
- update `frontend/app/layout.tsx`
- apply font variable in `frontend/app/globals.css`

### 2. Make It Feel Less AI-Generated

Current issue:

- many cards look similar
- sections are very evenly spaced
- some text feels explanatory instead of operational

Improve by:

- making dashboard more dense
- reducing overly descriptive paragraphs
- using compact status chips
- using more table-like layouts for operational areas
- adding timestamps and operator labels
- using realistic utility terms
- showing IDs like feeder, transformer, case, region
- replacing generic copy with operational labels

Examples:

Instead of:

```text
Self-testing grid laboratory
```

Use:

```text
Scenario Runner
```

Instead of:

```text
Grounded voice workflow
```

Use:

```text
Field Copilot
```

### 3. Connect All Pages Better

Add:

- persistent top nav
- active page state
- breadcrumbs
- clickable consumer IDs
- clickable case IDs
- clickable transformer IDs

Suggested links:

- dashboard anomaly row -> `/consumers/[id]`
- case queue item -> `/investigations/[case_id]`
- transformer card -> `/grid?transformer=TR-18`
- simulation scenario result -> `/stress-test`
- bad-data payload -> backend injection result page

### 4. Add Real Backend Integration For Dual Injection

Needed backend endpoint:

```text
POST /telemetry/inject/fault
```

Example request:

```json
{
  "injection_type": "SUDDEN_DROP",
  "consumer_id": "C-1172",
  "transformer_id": "TR-18",
  "duration_ticks": 24,
  "severity": 0.75
}
```

Expected response:

```json
{
  "run_id": "RUN-001",
  "accepted": true,
  "readings_created": 24,
  "ground_truth": {
    "consumer_id": "C-1172",
    "actual_scenario": "THEFT_TAMPERING"
  }
}
```

Then frontend can:

- send selected injection to backend
- show run ID
- refresh anomaly queue
- show whether ML flagged it correctly

### 5. Add Real Backend Integration For Simulator

Needed backend endpoints:

```text
POST /simulation/run
GET /simulation/results/{run_id}
```

Frontend should show:

- run status
- generated consumers
- ground truth
- model predictions
- precision / recall / F1
- false positives
- false negatives

### 6. Improve Visual Design

Recommended changes:

- use a warmer light background, not plain slate everywhere
- keep white cards only for actual panels
- add subtle left borders for critical items
- use compact charts
- add status timeline
- add small map/grid visual
- use less centered hero-like composition
- make it feel like an operator console

Avoid:

- too many huge cards
- too much explanatory text
- purple-blue AI gradients
- fake metrics
- fake hardware claims

### 7. Add Page-Specific Empty States

If backend has no data:

- show `No live telemetry loaded`
- show `Load ML Sample`
- show `Start simulator run`

Do not silently hide everything.

### 8. Add Real Investigation Workspace

Next most important frontend page:

```text
/investigations/[case_id]
```

It should contain:

- consumer summary
- risk and probable cause
- evidence list
- transformer context
- checklist
- field observations
- case timeline
- resolve button
- voice copilot panel

This will make the project feel complete because Electron is about moving from anomaly to field action.

## Current Known Limitation

The dashboard buttons can call existing backend endpoints.

The simulator and bad-data pages are currently UI prototypes with payload previews because the backend endpoints for simulator execution and telemetry fault injection do not exist yet.

That is intentional. Do not present them as fully implemented streaming systems yet.

## Queue Sync Issue To Fix

Current behavior:

When clicking `Check Queue`, the UI calls:

```text
GET /anomalies/queue?limit=10
```

So the response correctly shows only 10 returned records, even if the backend has 201 total anomalies.

Example:

```json
{
  "total": 201,
  "limit": 10,
  "returned": 10,
  "items": [...]
}
```

This is not a backend bug. The route is paginated/limited.

What the frontend should show clearly:

```text
Showing 10 of 201 anomalies
```

Current problem:

The UI can make it look like only the returned items exist. This confuses users because dashboard summary may say 201 active anomalies while the queue preview shows only 10 or 100.

Frontend improvement needed:

- add a `Sync Queue` button
- call backend route:

  ```text
  GET /anomalies/queue?limit=100
  ```

- show:

  ```text
  Total anomalies: 201
  Displayed: 100
  ```

- optionally add page-size buttons:

  ```text
  10 / 25 / 50 / 100
  ```

- do not imply the visible rows are the full dataset unless `returned === total`

Better UI labels:

```text
Sync Queue
Refresh From Backend
Showing 100 of 201
Backend route: /anomalies/queue
```

The frontend should match backend routes exactly and document which route each button calls.

Suggested route map:

| UI Button | Backend Route | Purpose |
| --- | --- | --- |
| Check API | `GET /health` | backend health |
| Load ML Sample | `POST /ml/predictions/load-sample` | load model predictions |
| Sync Queue | `GET /anomalies/queue?limit=100` | get total + returned anomaly queue |
| Ask Copilot | `POST /copilot/ask` | structured backend-grounded answer |
| Dashboard Summary | `GET /dashboard/summary` | counts for overview cards |
| Consumers | `GET /consumers` | consumer list |
| Investigations | `GET /investigations?limit=12` | case queue |
| Transformers | `GET /transformers` | transformer cards |

Recommended frontend state for queue:

```ts
type QueueState = {
  total: number;
  returned: number;
  limit: number;
  items: Anomaly[];
  lastSyncedAt: string;
};
```

Recommended display:

```text
Queue synced at 14:32:08
Showing 100 of 201 anomalies
```

If a teammate builds a full anomaly queue page later, use:

```text
/anomalies or /queue
```

and call:

```text
GET /anomalies/queue?limit=100
```

until backend pagination adds `offset` or `page`.

Future backend improvement:

```text
GET /anomalies/queue?limit=100&offset=0
```

or:

```text
GET /anomalies/queue?page=1&page_size=100
```

This will let frontend show true pagination instead of only top-N preview.

## Question Asking / Copilot Issue To Fix

Current behavior:

The overview page has an `Ask Copilot` button, but it sends a fixed backend request:

```json
{
  "question": "What is the current grid status?"
}
```

So it is not yet a real question box.

Current problem:

- user cannot type their own question
- user cannot attach context like `consumer_id`, `case_id`, or `transformer_id`
- frontend does not show suggested next questions
- response is shown as raw JSON instead of a readable answer panel
- it is not obvious which backend route is being called

Backend route:

```text
POST /copilot/ask
```

Backend request shape:

```json
{
  "question": "Why was this consumer flagged?",
  "consumer_id": "C-1172",
  "case_id": null,
  "anomaly_id": null,
  "transformer_id": null,
  "limit": 5
}
```

Backend response shape:

```json
{
  "data_available": true,
  "answer": "...",
  "intent": "consumer_analysis",
  "payload": {},
  "suggested_next_questions": []
}
```

Frontend improvement needed:

- replace the fixed `Ask Copilot` button with a text input
- add optional context fields:
  - consumer ID
  - case ID
  - transformer ID
- add quick question buttons
- show `answer` as readable text first
- show `payload` in a collapsible technical section
- show `suggested_next_questions` as clickable chips
- display `data_available=false` clearly when backend has no relevant data

Recommended UI:

```text
Ask Electron

[ Why was this consumer flagged?                         ]

Context:
[ Consumer ID ] [ Case ID ] [ Transformer ID ]

[ Ask ] [ Clear ]

Answer:
This consumer is high risk because...

Suggested:
[ What should the field team inspect? ]
[ Is transformer loss correlated? ]
```

Quick questions to add:

- `What is the current grid status?`
- `Show top risky consumers`
- `Why was this consumer flagged?`
- `What should the field team inspect?`
- `What is the case status?`
- `Give transformer summary`

Important:

The frontend should not call this an AI chatbot yet. It is currently a structured backend Q&A endpoint. Better labels:

```text
Ask Electron
Evidence Q&A
Structured Copilot
```

Avoid labels like:

```text
AI Chat
ChatGPT
Autonomous Assistant
```

because the endpoint is not using an LLM yet and should stay grounded in backend data.

Testing the question endpoint manually:

1. Load ML sample from overview or Swagger.

2. Use a known consumer ID from anomaly queue.

3. Send:

   ```json
   {
     "question": "Why was this consumer flagged?",
     "consumer_id": "ETH_9347970357"
   }
   ```

4. Expected:

   - `data_available` should be `true`
   - `intent` should be related to consumer analysis
   - `answer` should explain the stored ML evidence

5. Test no-data behavior:

   ```json
   {
     "question": "Why was this consumer flagged?",
     "consumer_id": "UNKNOWN"
   }
   ```

6. Expected:

   - `data_available` should be `false`
   - answer should say data is unavailable
   - it should not invent readings or scores

Future frontend page:

```text
/copilot
```

or include it inside:

```text
/investigations/[case_id]
```

Best product fit:

Put the full question asking experience inside the investigation workspace, because field teams usually ask questions about a specific case.
