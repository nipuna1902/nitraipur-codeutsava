from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from uuid import uuid4

from backend.app.schemas.grid import ConsumerSummary, TransformerSummary
from backend.app.schemas.telemetry import TelemetryReadingIn, TelemetryReadingOut


class InMemoryStore:
    """Prototype store. Replace with PostgreSQL repositories in the database phase."""

    def __init__(self) -> None:
        self.telemetry: list[TelemetryReadingOut] = []
        self.consumer_transformers: dict[str, str] = {}
        self.transformer_feeders: dict[str, str] = {
            "T01": "F01",
            "T02": "F01",
            "T03": "F02",
            "T04": "F02",
        }

    def reset(self) -> None:
        self.telemetry.clear()
        self.consumer_transformers.clear()

    def ingest(self, readings: list[TelemetryReadingIn]) -> list[TelemetryReadingOut]:
        saved: list[TelemetryReadingOut] = []
        for reading in readings:
            record = TelemetryReadingOut(id=str(uuid4()), **reading.model_dump())
            self.telemetry.append(record)
            self.consumer_transformers.setdefault(record.consumer_id, self._infer_transformer(record.consumer_id))
            saved.append(record)
        return saved

    def latest_timestamp(self) -> datetime | None:
        if not self.telemetry:
            return None
        return max(reading.timestamp for reading in self.telemetry)

    def list_consumers(self) -> list[ConsumerSummary]:
        by_consumer: dict[str, list[TelemetryReadingOut]] = defaultdict(list)
        for reading in self.telemetry:
            by_consumer[reading.consumer_id].append(reading)
        return [self._consumer_summary(consumer_id, readings) for consumer_id, readings in sorted(by_consumer.items())]

    def get_consumer(self, consumer_id: str) -> ConsumerSummary | None:
        readings = [reading for reading in self.telemetry if reading.consumer_id == consumer_id]
        if not readings:
            return None
        return self._consumer_summary(consumer_id, readings)

    def consumer_history(self, consumer_id: str, limit: int = 100) -> list[TelemetryReadingOut]:
        readings = [reading for reading in self.telemetry if reading.consumer_id == consumer_id]
        return sorted(readings, key=lambda reading: reading.timestamp)[-limit:]

    def list_transformers(self) -> list[TransformerSummary]:
        summaries = []
        for transformer_id, feeder_id in self.transformer_feeders.items():
            summaries.append(self._transformer_summary(transformer_id, feeder_id))
        return summaries

    def get_transformer(self, transformer_id: str) -> TransformerSummary | None:
        feeder_id = self.transformer_feeders.get(transformer_id)
        if feeder_id is None:
            return None
        return self._transformer_summary(transformer_id, feeder_id)

    def status(self) -> dict:
        return {
            "telemetry_readings": len(self.telemetry),
            "consumers": len({reading.consumer_id for reading in self.telemetry}),
            "latest_timestamp": self.latest_timestamp(),
        }

    def _consumer_summary(self, consumer_id: str, readings: list[TelemetryReadingOut]) -> ConsumerSummary:
        latest = max(readings, key=lambda reading: reading.timestamp)
        return ConsumerSummary(
            consumer_id=consumer_id,
            latest_energy=latest.energy,
            latest_power=latest.power,
            latest_voltage=latest.voltage,
            meter_status=latest.meter_status.value,
            communication_status=latest.communication_status.value,
            readings_count=len(readings),
        )

    def _transformer_summary(self, transformer_id: str, feeder_id: str) -> TransformerSummary:
        consumers = [
            consumer_id
            for consumer_id, mapped_transformer_id in self.consumer_transformers.items()
            if mapped_transformer_id == transformer_id
        ]
        latest_by_consumer = []
        for consumer_id in consumers:
            history = self.consumer_history(consumer_id, limit=1)
            if history:
                latest_by_consumer.append(history[-1])
        consumer_energy = sum(reading.energy for reading in latest_by_consumer)
        expected_loss = consumer_energy * 0.05
        unexplained_loss = 0.0
        return TransformerSummary(
            transformer_id=transformer_id,
            feeder_id=feeder_id,
            consumer_count=len(consumers),
            latest_consumer_energy=round(consumer_energy, 3),
            latest_unexplained_loss=round(unexplained_loss + expected_loss * 0, 3),
        )

    def _infer_transformer(self, consumer_id: str) -> str:
        try:
            number = int(consumer_id.removeprefix("C"))
        except ValueError:
            return "T01"
        if number <= 12:
            return "T01"
        if number <= 24:
            return "T02"
        if number <= 36:
            return "T03"
        return "T04"


store = InMemoryStore()
