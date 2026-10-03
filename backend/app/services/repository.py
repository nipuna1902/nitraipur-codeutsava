from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from sqlalchemy.exc import IntegrityError
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from backend.app.models import AnomalyPrediction, Consumer, InvestigationCase, TelemetryReading, Transformer
from backend.app.schemas.anomaly import (
    AnomalyOut,
    ConsumerAnalysisOut,
    InvestigationCaseOut,
    MlPredictionIn,
)
from backend.app.schemas.common import CommunicationStatus, MeterStatus, TelemetrySource
from backend.app.schemas.grid import ConsumerSummary, TransformerSummary
from backend.app.schemas.telemetry import TelemetryReadingIn, TelemetryReadingOut


DEFAULT_TRANSFORMERS = {
    "T01": "F01",
    "T02": "F01",
    "T03": "F02",
    "T04": "F02",
}

CASE_CREATING_RISK_LEVELS = {"HIGH", "CRITICAL"}


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
        anomaly_count = self.db.scalar(select(func.count(AnomalyPrediction.id))) or 0
        high_risk_count = self.db.scalar(
            select(func.count(AnomalyPrediction.id)).where(AnomalyPrediction.risk_level.in_(CASE_CREATING_RISK_LEVELS))
        ) or 0
        active_case_count = self.db.scalar(
            select(func.count(InvestigationCase.id)).where(InvestigationCase.status != "RESOLVED")
        ) or 0
        return {
            "telemetry_readings": telemetry_count,
            "consumers": consumer_count,
            "active_anomalies": anomaly_count,
            "high_risk_cases": high_risk_count,
            "active_investigations": active_case_count,
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

    def ingest_predictions(self, predictions: list[MlPredictionIn]) -> tuple[list[AnomalyOut], list[InvestigationCaseOut]]:
        saved_predictions: list[AnomalyOut] = []
        created_cases: list[InvestigationCaseOut] = []
        for prediction in predictions:
            self._ensure_consumer(prediction.consumer_id)
            record = AnomalyPrediction(
                id=str(uuid4()),
                consumer_id=prediction.consumer_id,
                anomaly_score=prediction.anomaly_score,
                risk_score=prediction.risk_score,
                risk_level=prediction.risk_level,
                predicted_cause=prediction.predicted_cause,
                confidence=prediction.confidence,
                evidence=[item.model_dump() for item in prediction.evidence],
                model_version=prediction.model_version,
            )
            self.db.add(record)
            self.db.flush()
            saved_predictions.append(self._to_anomaly_out(record))
            if prediction.risk_level in CASE_CREATING_RISK_LEVELS:
                case = self._create_case_for_prediction(record)
                created_cases.append(self._to_case_out(case))
        self.db.commit()
        return saved_predictions, created_cases

    def list_anomalies(self, limit: int = 100) -> list[AnomalyOut]:
        rows = self.db.scalars(
            select(AnomalyPrediction).order_by(AnomalyPrediction.risk_score.desc()).limit(limit)
        ).all()
        return [self._to_anomaly_out(row) for row in rows]

    def get_anomaly(self, anomaly_id: str) -> AnomalyOut | None:
        anomaly = self.db.scalar(select(AnomalyPrediction).where(AnomalyPrediction.id == anomaly_id))
        if anomaly is None:
            return None
        return self._to_anomaly_out(anomaly)

    def get_latest_anomaly_for_consumer(self, consumer_id: str) -> AnomalyOut | None:
        anomaly = self.db.scalar(
            select(AnomalyPrediction)
            .where(AnomalyPrediction.consumer_id == consumer_id)
            .order_by(AnomalyPrediction.created_at.desc())
            .limit(1)
        )
        if anomaly is None:
            return None
        return self._to_anomaly_out(anomaly)

    def list_investigation_cases(self, limit: int = 100) -> list[InvestigationCaseOut]:
        rows = self.db.scalars(
            select(InvestigationCase).order_by(InvestigationCase.risk_score.desc()).limit(limit)
        ).all()
        return [self._to_case_out(row) for row in rows]

    def get_case_for_consumer(self, consumer_id: str) -> InvestigationCaseOut | None:
        case = self.db.scalar(
            select(InvestigationCase)
            .where(InvestigationCase.consumer_id == consumer_id)
            .order_by(InvestigationCase.created_at.desc())
            .limit(1)
        )
        if case is None:
            return None
        return self._to_case_out(case)

    def consumer_analysis(self, consumer_id: str) -> ConsumerAnalysisOut:
        anomaly = self.get_latest_anomaly_for_consumer(consumer_id)
        case = self.get_case_for_consumer(consumer_id)
        if anomaly is None:
            return ConsumerAnalysisOut(
                consumer_id=consumer_id,
                data_available=False,
                recommended_action="No ML anomaly prediction is available for this consumer.",
            )
        return ConsumerAnalysisOut(
            consumer_id=consumer_id,
            data_available=True,
            latest_anomaly=anomaly,
            investigation_case=case,
            recommended_action=self._recommended_action(anomaly.risk_level),
        )

    def reset(self) -> None:
        self.db.execute(delete(InvestigationCase))
        self.db.execute(delete(AnomalyPrediction))
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

    def _create_case_for_prediction(self, prediction: AnomalyPrediction) -> InvestigationCase:
        existing = self.db.scalar(
            select(InvestigationCase)
            .where(InvestigationCase.anomaly_id == prediction.id)
            .limit(1)
        )
        if existing is not None:
            return existing
        case = InvestigationCase(
            id=str(uuid4()),
            case_id=f"CASE-{prediction.consumer_id}-{prediction.id[:8]}",
            consumer_id=prediction.consumer_id,
            anomaly_id=prediction.id,
            risk_score=prediction.risk_score,
            predicted_cause=prediction.predicted_cause,
            priority=prediction.risk_level,
            status="AI_FLAGGED",
        )
        self.db.add(case)
        self.db.flush()
        return case

    def _recommended_action(self, risk_level: str) -> str:
        if risk_level == "CRITICAL":
            return "Immediate field inspection recommended."
        if risk_level == "HIGH":
            return "Prioritize for field inspection."
        if risk_level == "MEDIUM":
            return "Review evidence and monitor before dispatch."
        if risk_level == "LOW":
            return "No immediate field action."
        return "Evidence is insufficient; keep case under review."

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

    def _to_anomaly_out(self, anomaly: AnomalyPrediction) -> AnomalyOut:
        return AnomalyOut(
            id=anomaly.id,
            consumer_id=anomaly.consumer_id,
            anomaly_score=anomaly.anomaly_score,
            risk_score=anomaly.risk_score,
            risk_level=anomaly.risk_level,
            predicted_cause=anomaly.predicted_cause,
            confidence=anomaly.confidence,
            evidence=anomaly.evidence or [],
            model_version=anomaly.model_version,
            created_at=anomaly.created_at,
        )

    def _to_case_out(self, case: InvestigationCase) -> InvestigationCaseOut:
        return InvestigationCaseOut(
            id=case.id,
            case_id=case.case_id,
            consumer_id=case.consumer_id,
            anomaly_id=case.anomaly_id,
            risk_score=case.risk_score,
            predicted_cause=case.predicted_cause,
            priority=case.priority,
            status=case.status,
            created_at=case.created_at,
            updated_at=case.updated_at,
        )
