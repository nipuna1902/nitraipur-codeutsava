# Injection Comparator And Frontend Fix Notes

This note documents the latest Known Injection and frontend cleanup work.

## What Changed

- The Known Injection page now separates three ideas clearly:
  - `Injected Ground Truth` is the answer key.
  - `Expected Output Preview` is the expected class before a backend run.
  - `Actual Backend Model Output` appears only after `Run Detection`.
- The confusing `Baseline` wording was replaced with `Normal reference`.
- The changed-fields table now shows only the healthy reading versus the injected bad-data reading.
- The raw technical payload is behind a `Technical payload` details control instead of being the main demo surface.
- Changing fault, transformer, consumer, severity, or duration clears the previous backend output.
- `/simulation/compare` now attempts trained XGBoost artifact inference for risk score, probability, confidence, model version, and evidence features.
- The backend comparator intentionally returns `UNCERTAIN` with `REVIEW` priority for weak or very short signals.
- Non-theft scenarios no longer all look like theft:
  - `Missing Packets` maps to `COMMUNICATION_FAILURE`.
  - `Flatline Meter` and `Zero Reading` map to `METER_MALFUNCTION`.
  - `Spike Then Drop` remains `UNCERTAIN`.
  - `Sudden Drop` and `Transformer Mismatch` can map to `THEFT_TAMPERING`.
- Frontend backend defaults now point to `http://127.0.0.1:8000`, matching the normal FastAPI command and Swagger link.

## Demo Wording

Use this wording:

```text
This page is a controlled bad-data experiment. The ground truth is the known injected fault. The expected preview is the answer key. When I click Run Detection, the frontend calls `/simulation/compare` and shows whether the simulated backend output matches the known injection.
```

Avoid this wording:

```text
The model has confirmed theft for every scenario.
```

## Verification Done

- Backend unit tests cover low-signal `UNCERTAIN` behavior.
- Backend unit tests cover non-theft comparator profiles.
- Frontend browser tests cover switching from a theft-like scenario to a communication-failure scenario.
- Frontend browser tests verify the old backend result clears after scenario controls change.
- Frontend browser tests use a longer 3D canvas wait so dynamic scene loading is not treated as a crash.

## What Is Model-Backed Now

Electron already supports ML prediction ingestion for the main dashboard, anomaly queue, and investigation workflow. Those screens use model prediction records and then apply guardrails before showing cases.

The Known Injection lab now also uses the persisted trained XGBoost artifact when it is available. The endpoint converts the normal reference and injected test reading into the same feature columns stored in `ml/artifacts/feature_columns.json`, loads `ml/artifacts/best_production_model.pkl`, and uses `predict_proba` to produce the risk score, confidence, raw trained risk, and model probability.

The important limitation is cause classification. The trained artifact is a binary theft-risk ranking model, not a multiclass root-cause model. For that reason, Electron uses trained-model risk plus guardrail cause rules:

- communication-heavy injections can remain `COMMUNICATION_FAILURE`;
- meter-fault-like injections can remain `METER_MALFUNCTION`;
- weak or short injections can remain `UNCERTAIN`;
- theft-like injections can still show `THEFT_TAMPERING` when the scenario evidence supports it.

So the correct statement is:

```text
The main anomaly workflow uses ML prediction records. The Known Injection comparator now uses the trained XGBoost artifact for risk scoring and keeps guardrails for probable-cause wording because the artifact is a binary theft-risk model.
```

## Future Improvements

- Replace the synthetic one-row feature builder with full telemetry replay through the production feature pipeline.
- Train a real multiclass cause model after field-resolution labels are available.
- Add a persistent run history table for previous injection runs.
- Add side-by-side screenshots or sparklines for normal versus injected readings.
- Add an explicit warning when the selected transformer has no consumers.
- Add an API health badge directly inside the Known Injection page.
