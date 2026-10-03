from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from sqlalchemy.exc import IntegrityError
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from backend.app.models import Consumer, TelemetryReading, Transformer
from backend.app.schemas.common import CommunicationStatus, MeterStatus, TelemetrySource
from backend.app.schemas.grid import ConsumerSummary, TransformerSummary
from backend.app.schemas.telemetry import TelemetryReadingIn, TelemetryReadingOut


DEFAULT_TRANSFORMERS = {
    "T01": "F01",
    "T02": "F01",
    "T03": "F02",
    "T04": "F02",
}


class TelemetryRepository:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.ensure_transformers()

    def ensure_transformers(self) -> None:
        for transformer_id, feeder_id in DEFAULT_TRANSFORMERS.items():
            with self.db.no_autoflush:
                exists = self.db.scalar(select(Transformer).where(Transformer.transformer_id == transformer_id))
            if exists is None:
                self.db.add(
                    Transformer(
                        id=str(uuid4()),
                        transformer_id=transformer_id,
                        feeder_id=feeder_id,
                        rated_capacity=250.0,
                        expected_technical_loss_ratio=0.05,
                    )
                )
                try:
                    self.db.commit()
                except IntegrityError:
                    self.db.rollback()

    def ingest(self, readings: list[TelemetryReadingIn]) -> list[TelemetryReadingOut]:
        saved: list[TelemetryReadingOut] = []
        for reading in readings:
            self._ensure_consumer(reading.consumer_id)
            record = TelemetryReading(
                id=str(uuid4()),
                consumer_id=reading.consumer_id,
                timestamp=reading.timestamp,
                voltage=reading.voltage,
                current=reading.current,
                power=reading.power,
                energy=reading.energy,
                meter_status=reading.meter_status.value,
                communication_status=reading.communication_status.value,
                source=reading.source.value,
            )
            self.db.add(record)
            saved.append(self._to_telemetry_out(record))
        self.db.commit()
        return saved

    def list_telemetry(self, limit: int = 100) -> list[TelemetryReadingOut]:
        rows = self.db.scalars(
            select(TelemetryReading).order_by(TelemetryReading.timestamp.desc()).limit(limit)
        ).all()
        return [self._to_telemetry_out(row) for row in reversed(rows)]

    def latest_timestamp(self) -> datetime | None:
        return self.db.scalar(select(func.max(TelemetryReading.timestamp)))

    def status(self) -> dict:
        telemetry_count = self.db.scalar(select(func.count(TelemetryReading.id))) or 0
        consumer_count = self.db.scalar(select(func.count(Consumer.id))) or 0
        return {
            "telemetry_readings": telemetry_count,
            "consumers": consumer_count,
            "latest_timestamp": self.latest_timestamp(),
        }

    def list_consumers(self) -> list[ConsumerSummary]:
        consumers = self.db.scalars(select(Consumer).order_by(Consumer.consumer_id)).all()
        return [summary for consumer in consumers if (summary := self.get_consumer(consumer.consumer_id)) is not None]

    def get_consumer(self, consumer_id: str) -> ConsumerSummary | None:
        readings_count = self.db.scalar(
            select(func.count(TelemetryReading.id)).where(TelemetryReading.consumer_id == consumer_id)
        ) or 0
        if readings_count == 0:
            return None
        latest = self.db.scalar(
            select(TelemetryReading)
            .where(TelemetryReading.consumer_id == consumer_id)
            .order_by(TelemetryReading.timestamp.desc())
            .limit(1)
        )
        if latest is None:
            return None
        return ConsumerSummary(
            consumer_id=consumer_id,
            latest_energy=latest.energy,
            latest_power=latest.power,
            latest_voltage=latest.voltage,
            meter_status=latest.meter_status,
            communication_status=latest.communication_status,
            readings_count=readings_count,
        )

    def consumer_history(self, consumer_id: str, limit: int = 100) -> list[TelemetryReadingOut]:
        rows = self.db.scalars(
            select(TelemetryReading)
            .where(TelemetryReading.consumer_id == consumer_id)
            .order_by(TelemetryReading.timestamp.desc())
            .limit(limit)
        ).all()
        return [self._to_telemetry_out(row) for row in reversed(rows)]

    def list_transformers(self) -> list[TransformerSummary]:
        transformers = self.db.scalars(select(Transformer).order_by(Transformer.transformer_id)).all()
        return [self._transformer_summary(transformer) for transformer in transformers]

    def get_transformer(self, transformer_id: str) -> TransformerSummary | None:
        transformer = self.db.scalar(select(Transformer).where(Transformer.transformer_id == transformer_id))
        if transformer is None:
            return None
        return self._transformer_summary(transformer)

    def reset(self) -> None:
        self.db.execute(delete(TelemetryReading))
        self.db.execute(delete(Consumer))
        self.db.execute(delete(Transformer))
        self.db.commit()
        self.ensure_transformers()

    def _ensure_consumer(self, consumer_id: str) -> Consumer:
        consumer = self.db.scalar(select(Consumer).where(Consumer.consumer_id == consumer_id))
        if consumer is not None:
            return consumer

        transformer_id = self._infer_transformer(consumer_id)
        transformer = self.db.scalar(select(Transformer).where(Transformer.transformer_id == transformer_id))
        if transformer is None:
            transformer = Transformer(
                id=str(uuid4()),
                transformer_id=transformer_id,
                feeder_id=DEFAULT_TRANSFORMERS.get(transformer_id, "F01"),
                rated_capacity=250.0,
                expected_technical_loss_ratio=0.05,
            )
            self.db.add(transformer)
            self.db.flush()

        consumer = Consumer(
            id=str(uuid4()),
            consumer_id=consumer_id,
            category="UNKNOWN",
            sanctioned_load=0.0,
            tariff=None,
            transformer_id=transformer.transformer_id,
            feeder_id=transformer.feeder_id,
            area=None,
        )
        self.db.add(consumer)
        self.db.flush()
        return consumer

    def _transformer_summary(self, transformer: Transformer) -> TransformerSummary:
        consumers = self.db.scalars(
            select(Consumer.consumer_id).where(Consumer.transformer_id == transformer.transformer_id)
        ).all()
        latest_energy = 0.0
        for consumer_id in consumers:
            latest = self.db.scalar(
                select(TelemetryReading)
                .where(TelemetryReading.consumer_id == consumer_id)
                .order_by(TelemetryReading.timestamp.desc())
                .limit(1)
            )
            if latest is not None:
                latest_energy += latest.energy
        return TransformerSummary(
            transformer_id=transformer.transformer_id,
            feeder_id=transformer.feeder_id,
            consumer_count=len(consumers),
            latest_consumer_energy=round(latest_energy, 3),
            latest_unexplained_loss=0.0,
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

    def _to_telemetry_out(self, reading: TelemetryReading) -> TelemetryReadingOut:
        return TelemetryReadingOut(
            id=reading.id,
            consumer_id=reading.consumer_id,
            timestamp=reading.timestamp,
            voltage=reading.voltage,
            current=reading.current,
            power=reading.power,
            energy=reading.energy,
            meter_status=MeterStatus(reading.meter_status),
            communication_status=CommunicationStatus(reading.communication_status),
            source=TelemetrySource(reading.source),
        )
