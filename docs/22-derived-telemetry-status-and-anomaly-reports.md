# Derived Telemetry Status And Anomaly Reports

This change moves meter health out of the telemetry input contract.

## Previous Behavior

`POST /telemetry/readings` required clients to send:

- voltage
- current
- power
- energy
- `meter_status`
- `communication_status`
- source

That made the backend trust a status label supplied by the client. For a theft/fault detection system, this is the wrong direction: the model layer should infer health and anomaly evidence from readings.

## Current Behavior

Telemetry ingestion now accepts raw readings without `meter_status`.

Minimal request:

```json
{
  "readings": [
    {
      "consumer_id": "C001",
      "timestamp": "2026-10-03T00:00:00Z",
      "voltage": 230,
      "current": 4.5,
      "power": 1.1,
      "energy": 0.275,
      "source": "SIMULATOR"
    }
  ]
}
```

The backend derives:

- `communication_status` from missing voltage/current/power values.
- `meter_status` from impossible zero/stuck readings and recent consumer history.
- telemetry-derived anomaly reports when derived status indicates meter malfunction or communication failure.

The response includes:

- accepted reading count;
- latest timestamp;
- created telemetry anomaly report count;
- derived meter-status counts.

## Why This Is Safer

- Raw telemetry remains factual sensor data.
- The backend does not trust a caller-supplied meter-health label.
- The UI still receives `meter_status` and `communication_status` on readback, but those fields are backend-derived.
- Meter fault and communication problems become anomaly reports rather than input assumptions.

## Current Inference Rules

- All voltage/current/power values missing -> `DISCONNECTED` communication and `UNKNOWN` meter status.
- Some voltage/current/power values missing -> `DEGRADED` communication.
- Normal voltage with zero power/current after recent active readings -> `SUSPECTED_FAULT`.
- Repeated identical nonzero power over recent readings -> `SUSPECTED_FAULT`.
- Otherwise -> `NORMAL`.

## Limits

This is a guardrailed telemetry-status inference layer, not final field truth. It uses short local history and simple evidence rules. The trained XGBoost artifact remains focused on theft-risk ranking; field teams still confirm actual outcomes.
