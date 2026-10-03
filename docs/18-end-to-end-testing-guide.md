# End-To-End Testing Guide

This guide verifies the current Electron prototype after removing frontend demo data. The frontend should render live FastAPI data when the backend is available, and an honest empty/offline state when it is not. It should not fall back to bundled mock records.

## What This Tests

- Backend health and ML prediction ingestion.
- Dashboard summary, anomaly queue, investigation cases, consumers, and transformers.
- Multi-building guardrail fields in live API responses.
- Frontend live rendering from backend data.
- Simulator and known-injection pages render without hardcoded sample IDs.
- No stale frontend demo data is bundled or rendered.

## Prerequisites

Run commands from the repository root unless a command says otherwise.

```powershell
python --version
node --version
npm --version
```

Install dependencies if this is a fresh machine:

```powershell
pip install -r backend/requirements.txt
cd frontend
npm install
cd ..
```

## 1. Pull Latest Code

```powershell
git checkout main
git pull --ff-only
```

If testing an open feature branch:

```powershell
git checkout feature/remove-demo-data-e2e
git status --short --branch
```

Expected: no unrelated local changes.

## 2. Run Automated Checks

Backend:

```powershell
python -m unittest backend.tests.test_api
python -m unittest discover
```

Frontend:

```powershell
cd frontend
npm.cmd run typecheck
npm.cmd run build
cd ..
```

Important: backend tests reset the local SQLite database. If you run tests before browser E2E, reload ML predictions afterward.

## 3. Start Backend

```powershell
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

In a second terminal, verify health:

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8000/health
```

Expected:

```json
{ "status": "ok" }
```

## 4. Load Live ML Predictions

```powershell
Invoke-RestMethod `
  -Uri http://127.0.0.1:8000/ml/predictions/load-sample `
  -Method POST
```

Expected:

- `accepted` is greater than `0`.
- `cases_created` is greater than `0` on a clean database.
- `production_model` is `XGBoost`.
- `model_version` is `xgboost_ranker_v1`.

If the endpoint is called more than once, totals can increase because predictions are stored again.

## 5. Verify Backend Data

Dashboard summary:

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8000/dashboard/summary | ConvertTo-Json -Depth 4
```

Expected:

- `total_consumers` is greater than `0`.
- `active_anomalies` is greater than `0`.
- `high_risk_cases` is greater than `0`.
- `active_investigations` is greater than `0`.

Anomaly queue:

```powershell
$queue = Invoke-RestMethod -Uri "http://127.0.0.1:8000/anomalies/queue?limit=3"
$queue | ConvertTo-Json -Depth 8
```

Expected for each item:

- `risk_score` is present.
- `raw_risk_score` is present and preserves the ML score.
- `adjusted_risk_score` is present.
- `case_type` is `STANDARD` or `AGGREGATE_REVIEW`.
- `allocation_confidence`, `attribution_status`, `outlier_flags`, `recommendation`, and `risk_adjustment_reason` are present.

Investigation cases:

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/investigations?limit=3" | ConvertTo-Json -Depth 8
```

Expected:

- Cases include the same guardrail fields.
- Aggregate cases say `High-risk aggregate anomaly` in `recommendation`.
- No response should claim confirmed theft.

## 6. Start Frontend

In a separate terminal:

```powershell
cd frontend
$env:NEXT_PUBLIC_API_URL="http://127.0.0.1:8000"
npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
```

Open:

```text
http://127.0.0.1:3000
```

## 7. Verify Rendered Frontend

Use browser checks first:

- Header status shows `LIVE API`.
- It does not show `BACKEND OFFLINE`.
- Summary cards show non-zero backend counts after predictions are loaded.
- Risk curve shows backend consumers.
- Investigation queue shows backend cases.
- Aggregate cases show `High-risk aggregate anomaly`.
- Aggregate warning says Electron cannot attribute the anomaly to one building without field verification.
- Raw ML Risk and Adjusted Priority both display.
- Attribution Confidence and outlier flags display.
- `/simulation` renders.
- `/dual-injection` renders.
- Simulation and injection pages require user-entered IDs instead of hardcoded sample IDs.

Command-line page checks:

```powershell
$home = Invoke-WebRequest -Uri "http://127.0.0.1:3000" -UseBasicParsing
[pscustomobject]@{
  status = $home.StatusCode
  hasLiveApi = $home.Content.Contains("LIVE API")
  hasOffline = $home.Content.Contains("BACKEND OFFLINE")
  hasDemoData = $home.Content.Contains("DEMO DATA")
  hasAggregateCopy = $home.Content.Contains("High-risk aggregate anomaly")
} | ConvertTo-Json
```

Expected:

```json
{
  "status": 200,
  "hasLiveApi": true,
  "hasOffline": false,
  "hasDemoData": false,
  "hasAggregateCopy": true
}
```

Route checks:

```powershell
(Invoke-WebRequest -Uri "http://127.0.0.1:3000/simulation" -UseBasicParsing).StatusCode
(Invoke-WebRequest -Uri "http://127.0.0.1:3000/dual-injection" -UseBasicParsing).StatusCode
```

Expected: both return `200`.

## 8. Verify Demo Data Is Gone

Static code search:

```powershell
rg -n "demoData|demoAnomalies|DEMO DATA|fallback.*demo|DemoActions|demo-actions|ANM-2048|CASE-82|C-1172|TR-18|demo-generated" frontend -S
```

Expected: no runtime source hits. Documentation examples should use placeholders such as `<consumer_id>` and `<transformer_id>`.

Rendered page search:

```powershell
$home = Invoke-WebRequest -Uri "http://127.0.0.1:3000" -UseBasicParsing
$home.Content.Contains("DEMO DATA")
$home.Content.Contains("ANM-2048")
$home.Content.Contains("C-1172")
```

Expected: all three are `False`.

## 9. Backend Action Panel Checks

On the dashboard, use `Backend Actions`:

- `Check API` should return `{ "status": "ok" }`.
- `Load ML Sample` should call the backend prediction endpoint.
- `Sync Queue` should show returned anomaly queue counts.
- `Ask Electron` should answer backend-grounded questions.

Suggested questions:

```text
What is the current grid status?
Show top risky consumers
Give transformer summary
```

For consumer-specific questions, use a real `consumer_id` from `/anomalies/queue` or the dashboard.

## 10. Offline Behavior Check

Stop the backend and refresh the frontend.

Expected:

- Dashboard source shows `BACKEND OFFLINE`.
- Counts are zero.
- Empty states render.
- No bundled mock anomaly, case, consumer, or transformer data appears.

Restart backend and reload predictions before continuing live checks.

## Pass Criteria

The build is ready for review when:

- Backend tests pass.
- Frontend typecheck and build pass.
- Backend sample predictions load.
- Live backend endpoints return non-empty anomaly and investigation data.
- Frontend `/`, `/simulation`, and `/dual-injection` return `200`.
- Dashboard renders `LIVE API`.
- Old demo records and hardcoded sample IDs are not rendered.
- Aggregate guardrail wording is visible for aggregate cases.
