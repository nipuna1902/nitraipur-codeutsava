# MQTT Live Ingestion Guide

Electron can ingest live smart-meter readings from MQTT and persist them through the same telemetry path used by the simulator and REST API.

## Environment

Default values:

```powershell
$env:MQTT_ENABLED="true"
$env:MQTT_BROKER_HOST="localhost"
$env:MQTT_BROKER_PORT="1883"
$env:MQTT_TOPIC="smartmeter/telemetry/#"
$env:MQTT_CLIENT_ID="electron_backend_consumer"
```

Optional:

```powershell
$env:MQTT_USERNAME="user"
$env:MQTT_PASSWORD="password"
$env:MQTT_TLS="true"
```

Then start the backend:

```powershell
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

## Payload

Publish raw readings only. Do not send `meter_status`.

```json
{
  "consumer_id": "C011",
  "timestamp": "2026-10-04T00:00:00Z",
  "voltage": 229.4,
  "current": 3.2,
  "power": 0.74,
  "energy": 12.8
}
```

If `consumer_id` is omitted, Electron uses the final topic segment. For example:

```text
smartmeter/telemetry/C011
```

## Sample Publisher

With a local broker running:

```powershell
python scripts/publish_mqtt_sample.py --host 127.0.0.1 --topic smartmeter/telemetry/C011
```

Publish a meter-fault-like zero reading:

```powershell
python scripts/publish_mqtt_sample.py --host 127.0.0.1 --topic smartmeter/telemetry/C011 --power 0 --current 0 --energy 0
```

## Verify

Check MQTT status:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/mqtt/status
```

Check telemetry persisted:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/consumers/C011/history
```

The backend derives `meter_status` and `communication_status` after ingestion. If the reading indicates meter or communication trouble, Electron creates a telemetry-derived anomaly report.

## Demo Checklist

1. Start an MQTT broker on port `1883`.
2. Start backend after the broker is running.
3. Open `http://127.0.0.1:8000/mqtt/status` and confirm `connected` is `true`.
4. Start frontend and open `http://127.0.0.1:3000`.
5. Confirm the top navigation shows `MQTT LIVE`.
6. Publish a normal sample reading.
7. Confirm `readings_ingested` increases.
8. Publish a zero-reading sample.
9. Confirm `/anomalies` contains a `METER_MALFUNCTION` report for the test consumer.

## Frontend

The Overview navigation bar shows an MQTT badge:

- `MQTT LIVE` means connected to broker.
- `MQTT WAITING` means MQTT loop started but broker is not connected.
- `MQTT OFF` means disabled by configuration.
- The count shows persisted MQTT readings.
