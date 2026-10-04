# Frontend

Next.js / React frontend with a dedicated interactive digital twin at `/simulator`.

## Run locally

Requires Node.js 20.9+ and npm. From this directory:

```sh
npm install
npm run dev
```

Open http://localhost:3000/simulator. `/` redirects there. On PowerShell systems that block scripts, use `npm.cmd`.

Demo mode works without the backend. For backend telemetry and snapshot publishing, run the existing FastAPI service from the repository root:

```sh
python -m uvicorn backend.app.main:app --reload --port 8000
```

Requests to `/api/*` are proxied to `http://127.0.0.1:8000/*`. To change this, set `BACKEND_URL` in `frontend/.env.local` and restart Next.js.

## Simulator behavior

- Six selectable nodes, five power lines, orbit/pan/zoom controls, camera reset and a keyboard-accessible node inventory.
- Demo telemetry updates every two seconds. Faults apply to the selected node's downstream meters; upstream aggregate health reflects affected meters. Clear all injections restores the baseline.
- Backend mode polls `GET /telemetry/readings?limit=1000` every three seconds. Missing or older-than-30-second readings show unknown health. Connection failures are shown and retried; demo values never replace backend values.
- The simplified topology represents C011 (T01/F01), C023 (T02/F01), and C035 (T03/F02), matching existing repository transformer assignment. It is not an automatic visualization of every backend consumer. The backend's latest-1000 window can omit quiet consumers; those show no data.
- Voltage is mean downstream residential voltage in volts, current is summed amperes, and power is summed kW. The substation/feeder values represent downstream meter aggregates, not high-voltage bus measurements or a load-flow solver.
- Normal is green, warning yellow (outside 216–244 V), critical red (outside 200–260 V or meter/communication fault), and missing/stale telemetry slate. Faulted geometry pulses unless reduced motion is enabled.
- **Publish snapshot to backend** explicitly sends three raw electrical readings through `POST /telemetry/readings`, with `source: SIMULATOR`. The frontend does not send `meter_status`; the backend derives meter and communication status, then creates telemetry-derived anomaly reports when the reading indicates meter or communication trouble. These readings are saved in the existing database, visible in backend mode and existing consumer/dashboard APIs. IDs C011/C023/C035 may also have existing readings. Snapshot energy is zero because this view does not simulate cumulative energy. Fault controls never command hardware or control the standalone MQTT process.
- Pause stops demo ticks or backend polling. Fault controls and camera remain interactive. Individual injections can be cleared while an upstream fault still affects the same node.
- WebGL failure leaves telemetry, accessible node selection and fault controls available.

## Verify

```sh
npm test
npm run typecheck
npm run build
npx playwright test
```

Browser tests use locally installed Google Chrome. They mock API responses by default. To also run the real publishing round trip, start a backend with an isolated `DATABASE_URL`, set `BACKEND_URL` to its URL and `TEST_REAL_BACKEND=1` before running Playwright. The round-trip test writes three simulator readings.

Implementation references: [React Three Fiber installation](https://r3f.docs.pmnd.rs/getting-started/installation), [Next.js rewrites](https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites), [Tailwind Next.js setup](https://tailwindcss.com/docs/installation/framework-guides/nextjs).
Next.js dashboard prototype for Electron.

## What It Shows

- system summary cards
- anomaly risk curve
- investigation case queue
- consumer risk panel
- transformer loss correlation panel
- voice copilot placeholder card
- digital twin readiness panel

The frontend reads live backend data from FastAPI. If the backend is unavailable, it renders an empty offline state instead of bundled mock records.

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

Load ML predictions if needed:

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

Full live backend/frontend testing is documented in:

```text
../docs/18-end-to-end-testing-guide.md
```

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
