# Frontend End-To-End Test Guide

Use this guide to test the Electron frontend exactly the way a judge or teammate would use it. The goal is to prove that the UI is connected to the live backend, does not show old demo records, refreshes after loading predictions, and that Overview, Ask Electron, Simulator, and Known Injection all behave correctly.

## 1. Start From A Clean State

From the repository root:

```powershell
git status --short --branch
```

Expected:

- You are on the branch you want to test.
- There are no unexpected local changes.

Run the automated checks first:

```powershell
python -m unittest backend.tests.test_api
cd frontend
npm.cmd run typecheck
npm.cmd run build
cd ..
```

Expected:

- Backend tests pass.
- Frontend typecheck passes.
- Frontend production build passes.

Important: backend tests reset the local test database. Load the ML sample again after running tests.

## 2. Start Backend

Terminal 1:

```powershell
cd C:\Users\ASHUTOSH\nitraipur\nitraipur-codeutsava
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

If port `8000` is already occupied, use `8001`:

```powershell
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8001
```

Health check from another terminal:

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8000/health
```

Expected:

```json
{ "status": "ok" }
```

If using port `8001`, replace `8000` with `8001` in every command below.

## 3. Start Frontend

Terminal 2:

```powershell
cd C:\Users\ASHUTOSH\nitraipur\nitraipur-codeutsava\frontend
$env:NEXT_PUBLIC_API_URL="http://127.0.0.1:8000"
npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
```

If backend is on `8001`:

```powershell
$env:NEXT_PUBLIC_API_URL="http://127.0.0.1:8001"
npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
```

Open:

```text
http://127.0.0.1:3000
```

Hard refresh with `Ctrl+Shift+R` if the tab was already open.

## 4. Load ML Data From The UI

On the Overview page:

1. Find `Backend Actions`.
2. Click `Check API`.
3. Expected: response shows backend health.
4. Click `Load ML Sample`.
5. Wait for the action result to show accepted predictions.
6. The page should refresh its server-rendered counts automatically.

Expected after loading:

- Header system posture shows `LIVE API`.
- `Demo Readiness` changes from `Needs data sync` to `Ready to show` when data is available.
- Summary cards show non-zero values for consumers, anomalies, high-risk cases, or investigations.
- No `DEMO DATA` label appears.
- No stale empty dashboard remains after the sample load.

If the UI still looks empty, run:

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8000/dashboard/summary | ConvertTo-Json
Invoke-RestMethod -Uri http://127.0.0.1:8000/ml/predictions/load-sample -Method POST
```

Then click `Sync Queue` or refresh the browser.

## 5. Test Overview Page

URL:

```text
http://127.0.0.1:3000
```

Check these sections:

- Header says `ELECTRON` and `LIVE API`.
- Summary cards display live backend counts.
- `Demo Readiness` shows backend, ML sample, queue, transformers, Ask Electron, and known-injection readiness.
- `Top live risk scores` graph is visible and has plotted backend records.
- `Investigation Queue` shows a short list of highest-priority cases.
- `Anomaly Review` shows categories for aggregate review, theft/tampering, meter fault, and communication.
- Consumer and transformer panels show live IDs from the backend.

Expected wording:

- Aggregate cases say `High-risk aggregate anomaly`.
- The UI avoids wording like `Theft detected in this building`.
- Aggregate rows show field-verification language.

Fail conditions:

- The graph is blank while `/anomalies` has records.
- The page says `BACKEND OFFLINE` while backend health works.
- The page shows old hardcoded IDs such as `ANM-2048`, `CASE-82`, `C-1172`, or `TR-18`.

## 6. Test Ask Electron

In `Backend Actions`, use the Ask Electron input.

Ask general questions first:

```text
What is the current grid status?
Why is the investigation queue so long?
Show me the top risky consumers.
```

Expected:

- The answers return readable text.
- `Why is the investigation queue so long?` should not require a consumer ID.
- The intent for the queue question should be `investigation_queue_summary`.
- The answer should be grounded in backend counts and open cases.

Then use selected records:

1. Choose a real consumer from the Consumer dropdown.
2. Click `Explain selected consumer`.
3. Choose a real case from the Case dropdown.
4. Click `Selected case checklist`.
5. Choose a transformer.
6. Click `Selected transformer`.

Expected:

- Consumer answer explains risk/evidence for the selected consumer.
- Case answer gives field inspection/checklist guidance.
- Transformer answer summarizes the selected transformer.
- Technical payload is available in the expandable details area.

Fail conditions:

- General questions return blank answers.
- Ask Electron always asks for a consumer ID.
- The payload uses fake demo IDs.

## 7. Test Investigation And Guardrail UI

On the Overview page:

1. Inspect the `Investigation Queue`.
2. Find an aggregate review case if available.
3. Scroll to `Anomaly Review`.
4. Click or scroll to each category:
   - Aggregate review
   - Theft/tampering
   - Meter fault
   - Communication

Expected:

- Investigation queue is intentionally short.
- Remaining records are visible through the review board.
- Each category shows a count.
- Meter fault and communication anomalies are separate from theft/tampering.
- Aggregate cards show:
  - Raw ML risk
  - Adjusted priority
  - Case type
  - Outlier flags or `No outlier flags`
  - Recommendation text

Fail conditions:

- Meter faults or communication cases are impossible to find when backend data contains them.
- All anomalies are presented as direct theft.
- Raw risk score is hidden or overwritten.

## 8. Test Simulator Page

URL:

```text
http://127.0.0.1:3000/simulation
```

Check initial render:

- Page loads without runtime errors.
- Scenario cards are visible.
- Transformer dropdown is populated from live `/transformers`.
- Target consumer dropdown is populated from live `/consumers`.
- Live selection panel is visible.
- JSON payload preview is visible.

Interaction test:

1. Change the scenario.
2. Change the transformer.
3. Confirm available consumer count changes.
4. Confirm selected consumer changes to a consumer on the selected transformer.
5. Change target consumer.
6. Confirm the JSON payload updates immediately.

Expected:

- Transformer IDs are real backend IDs such as `T01`, `T02`, `T03`, `T04`.
- Consumer list is filtered by selected transformer.
- Payload `transformer_id` matches the selected transformer.
- Payload target consumer matches the selected consumer.

Fail conditions:

- Changing transformer does not change consumers.
- Payload stays frozen after UI changes.
- Consumer dropdown is empty while `/consumers` returns records.

## 9. Test Known Injection Page

URL:

```text
http://127.0.0.1:3000/dual-injection
```

Check initial render:

- Fault cards are visible.
- Transformer dropdown is populated.
- Consumer dropdown is populated.
- Severity control is visible.
- Duration control is visible.
- Injected Ground Truth panel is visible.
- Expected Output Preview panel is visible.
- Actual Backend Model Output panel is visible.
- `What changed from normal` table is visible.
- Technical payload is available behind a details control.

Interaction test:

1. Select each fault type.
2. Change transformer.
3. Confirm consumer options follow the selected transformer.
4. Change consumer.
5. Change severity.
6. Change duration.
7. Watch Injected Ground Truth, Expected Output Preview, target fields, and `What changed from normal`.
8. Click `Run Detection`.
9. Watch Actual Backend Model Output.

Expected:

- Active fault card changes visually.
- Injected Ground Truth changes when fault type changes.
- Expected Output Preview changes when fault type or severity changes.
- The changed-fields table changes when fault type changes.
- Target consumer, transformer, severity, duration, and technical payload change when their controls change.
- Previous Actual Backend Model Output clears when scenario controls change.
- The page clearly treats injected fault as known truth, not model prediction.
- Before `Run Detection`, the actual backend panel says `No backend run`.
- Actual Backend Model Output is populated from `POST /simulation/compare`.
- The conclusion says whether backend simulated detection matches the injected ground truth.
- The response includes predicted cause, risk score, confidence, evidence, and recommended next step.
- Low severity or very short duration can intentionally return `UNCERTAIN` rather than forcing a theft/fault match.
- Non-theft scenarios should return non-theft outputs: `Missing Packets` returns communication failure, `Flatline Meter` and `Zero Reading` return meter malfunction, and `Spike Then Drop` remains uncertain/review.

Fail conditions:

- Fault cards cannot be switched.
- Transformer changes do not update consumer choices.
- Injected Ground Truth, Expected Output Preview, target fields, technical payload, or backend result state remains stale after controls change.
- Every scenario returns `THEFT TAMPERING`.
- `Run Detection` does not populate Actual Backend Model Output while the backend is running.

## 10. Test 3D Digital Twin Page

URL:

```text
http://127.0.0.1:3000/simulator
```

Check initial render:

- Page loads without a client-side application error.
- Canvas is visible.
- `What The 3D View Shows` is visible.
- `Topology Mapping` is visible.
- `Data Source` is visible.
- `Missing Links / Current Limits` is visible.
- `Node Telemetry` is visible.

Expected:

- The page explains that the 3D view is a simplified topology, not a full load-flow solver.
- It identifies SS-01, F01, F02, R-01/C011, R-02/C023, and R-03/C035.
- It explains that colors come from downstream telemetry health.
- It explains Demo mode versus Backend telemetry mode.

Interaction test:

1. Select a node in the 3D scene or Network inventory.
2. Confirm Node Telemetry changes.
3. Inject a fault on a feeder.
4. Confirm affected downstream nodes become critical.
5. Clear all injections.
6. Switch to Backend telemetry.

Expected:

- Demo mode uses synthetic local readings.
- Backend mode polls `/api/telemetry/readings`.
- Missing/stale readings show unknown rather than fake data.
- The page explains current limits: not every backend consumer is rendered and transformer assets are not yet separate 3D objects.

## 11. Test Offline Behavior

Stop the backend server and refresh:

```text
http://127.0.0.1:3000
```

Expected:

- Header source shows `BACKEND OFFLINE`.
- Summary cards show zero or empty values.
- Demo Readiness shows waiting states.
- No bundled demo records appear.
- The frontend does not crash.

Restart backend, reload ML data, and refresh to return to live mode.

## 12. Browser Console Checks

Open DevTools Console while testing each page.

Expected:

- No red runtime errors.
- No hydration mismatch errors.
- No failed requests to the wrong backend port.

If requests go to the wrong port:

1. Stop the frontend.
2. Set `NEXT_PUBLIC_API_URL` again.
3. Restart `npm.cmd run dev`.

The frontend reads `NEXT_PUBLIC_API_URL` at startup.

## 13. Command-Line Smoke Checks

With backend and frontend running:

```powershell
$home = Invoke-WebRequest -Uri "http://127.0.0.1:3000" -UseBasicParsing
[pscustomobject]@{
  status = $home.StatusCode
  liveApi = $home.Content.Contains("LIVE API")
  offline = $home.Content.Contains("BACKEND OFFLINE")
  demoData = $home.Content.Contains("DEMO DATA")
  readiness = $home.Content.Contains("Demo Readiness")
} | ConvertTo-Json
```

Expected:

```json
{
  "status": 200,
  "liveApi": true,
  "offline": false,
  "demoData": false,
  "readiness": true
}
```

Route status:

```powershell
(Invoke-WebRequest -Uri "http://127.0.0.1:3000/" -UseBasicParsing).StatusCode
(Invoke-WebRequest -Uri "http://127.0.0.1:3000/simulation" -UseBasicParsing).StatusCode
(Invoke-WebRequest -Uri "http://127.0.0.1:3000/dual-injection" -UseBasicParsing).StatusCode
```

Expected:

```text
200
200
200
```

Search for removed runtime demo records:

```powershell
rg -n "demoData|demoAnomalies|DEMO DATA|DemoActions|demo-actions|ANM-2048|CASE-82|C-1172|TR-18" frontend -S
```

Expected:

- No runtime source hits.
- Documentation-only references are acceptable if they explain what should not appear.

## Pass Criteria

Frontend E2E passes when:

- Backend and frontend start successfully.
- Automated backend tests, typecheck, and build pass.
- `Load ML Sample` updates the visible dashboard without stale empty state.
- Overview shows `LIVE API`, readiness, graph, queue, anomaly review, consumers, and transformers.
- Ask Electron answers general and selected-record questions.
- Simulator controls update consumer options and payload immediately.
- Known Injection controls update ground truth and payload immediately.
- Offline behavior is honest and does not show fake fallback data.
- No old hardcoded demo records appear in rendered UI.
