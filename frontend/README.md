# Frontend

Next.js dashboard prototype for Electron.

## What It Shows

- system summary cards
- anomaly risk curve
- investigation case queue
- consumer risk panel
- transformer loss correlation panel
- voice copilot placeholder card
- digital twin readiness panel

The frontend reads live backend data when the FastAPI server is available. If the backend is unavailable or empty, it falls back to demo data so the dashboard still opens during presentation.

## Backend Integration

Default API URL:

```text
http://localhost:8000
```

To override it, set:

```text
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

The frontend currently calls:

- `GET /dashboard/summary`
- `GET /anomalies?limit=24`
- `GET /consumers`
- `GET /investigations?limit=12`
- `GET /transformers`

## Run Locally

Start backend from the repository root:

```powershell
uvicorn backend.app.main:app --reload
```

Load ML demo predictions if needed:

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8000/ml/predictions/load-sample -Method POST
```

Start frontend:

```powershell
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Verify

Backend:

```powershell
python -m unittest backend.tests.test_api
```

Frontend:

```powershell
cd frontend
npm run typecheck
npm run build
```

Note: frontend verification requires `npm install` to complete successfully.
