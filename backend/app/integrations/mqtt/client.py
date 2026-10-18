from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any, Callable

import paho.mqtt.client as mqtt
from pydantic import ValidationError

from backend.app.schemas.common import TelemetrySource
from backend.app.schemas.telemetry import TelemetryReadingIn

logger = logging.getLogger("mqtt_client")

MqttIngestCallback = Callable[[list[TelemetryReadingIn], dict[str, Any]], dict[str, Any] | None]


def _env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


class MQTTClientManager:
    def __init__(
        self,
        broker_host: str | None = None,
        broker_port: int | None = None,
        topic: str | None = None,
        enabled: bool | None = None,
    ):
        self.broker_host = broker_host or os.getenv("MQTT_BROKER_HOST", "localhost")
        self.broker_port = broker_port or int(os.getenv("MQTT_BROKER_PORT", "1883"))
        self.topic = topic or os.getenv("MQTT_TOPIC", "smartmeter/telemetry/#")
        self.enabled = _env_bool("MQTT_ENABLED", True) if enabled is None else enabled
        self.username = os.getenv("MQTT_USERNAME")
        self.password = os.getenv("MQTT_PASSWORD")
        self.use_tls = _env_bool("MQTT_TLS", False)
        self.client_id = os.getenv("MQTT_CLIENT_ID", "electron_backend_consumer")
        self.client = mqtt.Client(client_id=self.client_id)
        self.ingest_callback: MqttIngestCallback | None = None
        self.broadcast_callback: Callable[[dict[str, Any]], None] | None = None
        self.connected = False
        self.started = False
        self.last_message_at: str | None = None
        self.last_error: str | None = None
        self.messages_received = 0
        self.readings_ingested = 0

    def set_ingest_callback(self, callback: MqttIngestCallback) -> None:
        self.ingest_callback = callback

    def set_broadcast_callback(self, callback: Callable[[dict[str, Any]], None]) -> None:
        self.broadcast_callback = callback

    def on_connect(self, client, userdata, flags, rc):
        self.connected = rc == 0
        if rc == 0:
            self.last_error = None
            logger.info("Connected to MQTT broker %s:%s", self.broker_host, self.broker_port)
            client.subscribe(self.topic)
            logger.info("Subscribed to MQTT topic %s", self.topic)
        else:
            self.last_error = f"MQTT connect failed with result code {rc}"
            logger.warning(self.last_error)

    def on_disconnect(self, client, userdata, rc):
        self.connected = False
        if rc:
            self.last_error = f"MQTT disconnected unexpectedly with result code {rc}"
            logger.warning(self.last_error)

    def on_message(self, client, userdata, msg):
        try:
            decoded = msg.payload.decode("utf-8")
            payload = json.loads(decoded)
            readings = mqtt_payload_to_readings(payload, msg.topic)
            self.messages_received += 1
            self.last_message_at = datetime.now(timezone.utc).isoformat()
            result = self.ingest_callback(readings, {"topic": msg.topic, "raw_payload": payload}) if self.ingest_callback else None
            self.readings_ingested += len(readings)
            event = {
                "source": "MQTT",
                "topic": msg.topic,
                "readings": [reading.model_dump(mode="json") for reading in readings],
                "ingest_result": result,
                "received_at": self.last_message_at,
            }
            if self.broadcast_callback:
                self.broadcast_callback(event)
        except (json.JSONDecodeError, ValidationError, ValueError, TypeError) as exc:
            self.last_error = f"MQTT payload rejected: {exc}"
            logger.warning(self.last_error)
        except Exception as exc:
            self.last_error = f"MQTT processing failed: {exc}"
            logger.exception(self.last_error)

    def start(self) -> None:
        if not self.enabled:
            logger.info("MQTT integration disabled. Set MQTT_ENABLED=true to enable.")
            return
        if self.started:
            return
        self.client.on_connect = self.on_connect
        self.client.on_disconnect = self.on_disconnect
        self.client.on_message = self.on_message
        if self.username:
            self.client.username_pw_set(self.username, self.password)
        if self.use_tls:
            self.client.tls_set()
        self.client.connect_async(self.broker_host, self.broker_port, 60)
        self.client.loop_start()
        self.started = True

    def stop(self) -> None:
        if not self.started:
            return
        self.client.loop_stop()
        self.client.disconnect()
        self.started = False
        self.connected = False

    def status(self) -> dict[str, Any]:
        return {
            "enabled": self.enabled,
            "started": self.started,
            "connected": self.connected,
            "broker_host": self.broker_host,
            "broker_port": self.broker_port,
            "topic": self.topic,
            "client_id": self.client_id,
            "last_message_at": self.last_message_at,
            "last_error": self.last_error,
            "messages_received": self.messages_received,
            "readings_ingested": self.readings_ingested,
        }


def mqtt_payload_to_readings(payload: Any, topic: str) -> list[TelemetryReadingIn]:
    if isinstance(payload, dict) and isinstance(payload.get("readings"), list):
        rows = payload["readings"]
    else:
        rows = [payload]
    return [_reading_from_payload(row, topic) for row in rows]


def _reading_from_payload(row: Any, topic: str) -> TelemetryReadingIn:
    if not isinstance(row, dict):
        raise ValueError("MQTT telemetry payload must be an object or { readings: [...] }")

    values = row.get("values") if isinstance(row.get("values"), dict) else row
    consumer_id = values.get("consumer_id") or values.get("meter_id") or values.get("device_id") or _consumer_from_topic(topic)
    timestamp = values.get("timestamp") or values.get("time") or values.get("ts") or datetime.now(timezone.utc).isoformat()
    if isinstance(timestamp, (int, float)):
        timestamp = datetime.fromtimestamp(timestamp / 1000 if timestamp > 10_000_000_000 else timestamp, tz=timezone.utc)

    return TelemetryReadingIn(
        consumer_id=str(consumer_id),
        timestamp=timestamp,
        voltage=_optional_float(values.get("voltage")),
        current=_optional_float(values.get("current")),
        power=_optional_float(values.get("power")),
        energy=_required_energy(values),
        source=TelemetrySource.MQTT_DEVICE_FUTURE,
    )


def _consumer_from_topic(topic: str) -> str:
    parts = [part for part in topic.split("/") if part and part != "#"]
    if not parts:
        raise ValueError("consumer_id missing and MQTT topic is empty")
    return parts[-1]


def _optional_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    return float(value)


def _required_energy(values: dict[str, Any]) -> float:
    energy = values.get("energy")
    if energy is None:
        energy = values.get("kwh")
    if energy is None:
        energy = values.get("energy_kwh")
    if energy is None:
        raise ValueError("MQTT telemetry payload must include energy, kwh, or energy_kwh")
    return float(energy)


mqtt_manager = MQTTClientManager()
