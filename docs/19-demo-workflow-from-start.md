# Electron Demo Workflow From Start

This is the end-to-end flow to show Electron from a clean start. The goal is to demonstrate live backend data, guardrailed anomaly prioritization, Ask Electron, simulator controls, and known-injection controls without claiming confirmed theft or using hidden demo fallbacks.

## 1. Start The System

Open two terminals from the repository.

Backend:

```powershell
cd C:\Users\ASHUTOSH\nitraipur\nitraipur-codeutsava
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
cd C:\Users\ASHUTOSH\nitraipur\nitraipur-codeutsava\frontend
$env:NEXT_PUBLIC_API_URL="http://127.0.0.1:8000"
npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
```

Open:

```text
http://127.0.0.1:3000
```

If the browser was already open, hard refresh with `Ctrl+Shift+R`.

## 2. Load Live Predictions

In a third terminal:

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8000/ml/predictions/load-sample -Method POST
Invoke-RestMethod -Uri http://127.0.0.1:8000/dashboard/summary | ConvertTo-Json
```

Expected result:

- Consumers and anomalies are greater than zero.
- Active investigations are greater than zero.
- The frontend header shows `LIVE API`, not `BACKEND OFFLINE`.

What to say:

```text
I am loading model predictions through the backend. The frontend is not using bundled demo records; every count and case is coming from FastAPI.
```

## 3. Show The Overview

On the home page, show:

- Summary cards.
- Demo Readiness panel.
- Top live risk scores graph.
- Investigation queue.
- Anomaly review board.
- Ask Electron panel.

What to say:

```text
Electron starts with grid-level triage. It shows current anomaly volume, high-risk cases, and the top live risk scores. This graph is not a fake chart; it is built from the backend anomaly queue.
```

The Demo Readiness panel should show backend, ML sample, queue, transformer, Ask Electron, and known-injection status. If it says `Needs data sync`, click `Load ML Sample` in Backend Actions and wait for the page counts to refresh.

## 4. Explain The Investigation Queue

Point to the investigation queue.

What to say:

```text
The queue is intentionally short on screen. We show the highest-priority cases here, then use the anomaly review board to browse the rest by cause and case status. This avoids burying the operator under a huge list.
```

Then use Ask Electron:

```text
Why is the investigation queue so long?
```

Expected answer:

- It should answer with `investigation_queue_summary`.
- It should not ask for a consumer ID.
- It should explain that active cases remain until field review or resolution.

## 5. Show Guardrails For Aggregate Cases

Open an aggregate review case in the queue or review board.

Show these fields:

- `High-risk aggregate anomaly`
- Raw ML Risk
- Adjusted Investigation Priority
- Attribution Confidence
- Outlier Flags
- Why Adjusted?
- Field Verification Needed

What to say:

```text
The model can still produce a high raw risk score, but Electron does not blame one building when the row may represent multiple buildings. It preserves the raw ML score, then adds adjusted investigation priority and attribution warnings for field verification.
```

Avoid saying:

```text
Theft detected in this building.
```

Use instead:

```text
High-risk aggregate anomaly. Field verification is needed before attribution.
```

## 6. Ask Electron General Questions

In the Ask Electron panel, show that different question types work.

Try:

```text
What is the current grid status?
Show me the top risky consumers.
Why is the investigation queue so long?
```

Then choose a consumer and ask:

```text
Why was this consumer flagged?
```

Then choose a case and ask:

```text
What should the field team inspect?
```

What to say:

```text
Ask Electron is grounded in backend routes. It is not an open-ended chatbot making up data. It answers dashboard, queue, consumer, case, checklist, and transformer questions using stored records.
```

## 7. Show Meter Fault And Communication Cases

Use the anomaly review board categories.

Show:

- Theft or tampering candidates.
- Meter-fault-like anomalies.
- Communication-heavy anomalies.
- Aggregate-review anomalies.

What to say:

```text
Electron separates likely meter faults and communication problems from theft escalation. That reduces false positives and gives field teams the right checklist.
```

## 8. Show The Simulator Page

Open:

```text
http://127.0.0.1:3000/simulation
```

Show:

- Scenario cards.
- Transformer dropdown.
- Target consumer dropdown.
- Live selection panel.
- JSON payload preview.

Change the transformer.

Expected behavior:

- Available consumer count changes.
- Target consumer updates to a consumer on the selected transformer.
- JSON payload changes immediately.

What to say:

```text
The transformer IDs come from the live backend `/transformers` route. When I change the transformer, the target consumer list is filtered to that transformer, and the generated payload updates immediately.
```

Important limitation:

```text
This simulator control currently previews the scenario payload. The backend run endpoint is the next integration step, so I am not claiming a full synthetic telemetry stream yet.
```

## 9. Show The Known Injection Lab

Open:

```text
http://127.0.0.1:3000/dual-injection
```

Show:

- Fault cards such as Sudden Drop, Flatline Meter, Missing Packets, Transformer Mismatch.
- Consumer dropdown.
- Transformer dropdown.
- Severity slider.
- Duration ticks.
- Injected Ground Truth panel.
- Expected Electron Output preview.
- Actual Backend Model Output panel.
- Payload preview.

Change:

- Fault type.
- Transformer.
- Consumer.
- Severity.
- Duration.

Expected behavior:

- Active fault card changes visually.
- Consumer options follow selected transformer.
- Injected Ground Truth updates immediately.
- Expected Electron Output preview updates immediately.
- Payload preview updates immediately.
- Click `Run Detection`.
- Actual Backend Model Output fills with predicted cause, risk score, evidence, and conclusion.

What to say:

```text
This page is for controlled bad-data experiments. The first output is the injected ground truth, which is the answer key. The expected Electron output preview shows what the model should return for that fault. When I click Run Detection, the frontend calls the backend `/simulation/compare` endpoint and derives a conclusion: whether the simulated model output matches the injected truth.
```

Important wording:

```text
This is a deterministic simulator comparator for the demo. It proves the compare workflow and conclusion UI. It does not claim the trained XGBoost pipeline has been rerun on synthetic telemetry yet.
```

## 10. Show The 3D Digital Twin

Open:

```text
http://127.0.0.1:3000/simulator
```

Show:

- What The 3D View Shows.
- Topology Mapping.
- Data Source.
- Network digital twin.
- Node Telemetry.
- Missing Links / Current Limits.

What to say:

```text
This is a simplified teaching topology, not an automatic map of every backend consumer. SS-01 feeds two feeders, which feed three residential zones mapped to C011, C023, and C035. The colors summarize downstream telemetry health from voltage, meter status, communication status, and freshness. Demo mode generates synthetic readings locally; backend mode polls live telemetry readings and marks nodes unknown when readings are missing or stale.
```

## 11. Mention OpenAI API Key

What to say if asked:

```text
An OpenAI API key is not required for this demo. Ask Electron is currently deterministic and grounded in backend data. If we add an LLM later, the key should stay only on the backend, and the model should summarize tool results rather than invent facts.
```

## 12. Close With The Main Value

What to say:

```text
Electron is not just a theft detector. It is an investigation-prioritization system. It keeps the ML risk score, adds context guardrails, separates likely causes, avoids unsafe building-level accusations for aggregate rows, and gives field teams a clear verification workflow.
```

## Quick Troubleshooting During Demo

If frontend shows old UI:

```text
Hard refresh with Ctrl+Shift+R.
```

If frontend shows backend offline:

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8000/health
```

If backend port `8000` is already occupied:

```powershell
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8001
```

Then start the frontend with the same backend URL:

```powershell
cd C:\Users\ASHUTOSH\nitraipur\nitraipur-codeutsava\frontend
$env:NEXT_PUBLIC_API_URL="http://127.0.0.1:8001"
npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
```

If data is empty after tests:

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8000/ml/predictions/load-sample -Method POST
```

If `npm run dev` fails in PowerShell:

```powershell
npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
```
