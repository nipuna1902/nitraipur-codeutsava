# ElevenLabs real-data verification

The existing ElevenLabs webhook contract is unchanged. The live backend was loaded through its existing telemetry API with `data/processed/telemetry_sample.csv`: 3,000 readings across 100 processed consumers. The readings are persisted in the existing SQLAlchemy database, `electron_backend.db`. No backend source files were changed.

## Repeat the data load

From the repository root, with the backend running:

```powershell
python scripts/load_processed_telemetry.py
```

The loader refuses to add the sample again when any of its consumer IDs already exists, preventing accidental duplicate readings.

## Verified examples

Use these exact test questions:

1. `Give me the latest summary for consumer ETH_1076840055.`
2. `Why is consumer ETH_1076840055 anomalous?`
3. `Tell me about consumer FAKE-999.`

Expected behavior:

- The consumer tool returns `data_available=true`, 31 readings, and latest energy `3.8` from the processed dataset's 2015-01-31 record.
- Voltage and power are `null`, and meter and communication status are `UNKNOWN`, because those fields do not exist for that day in the processed source. They were deliberately not invented.
- The anomaly tool returns `data_available=false` and `predicted_cause=UNCERTAIN`; the agent must say ML anomaly evidence is not integrated.
- The missing consumer returns `data_available=false` and no telemetry payload.

The existing ngrok webhook remains:

```text
https://grant-pecan-subsiding.ngrok-free.dev/voice/tools/consumer-summary
```

Ngrok inspection confirms successful `ElevenLabs/1.0` requests to both existing voice endpoints. The current backend has no authentication layer, so use this setup only for controlled testing.
