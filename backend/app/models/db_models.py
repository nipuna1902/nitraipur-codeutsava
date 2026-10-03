from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import DateTime, Float, ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database import Base


class Transformer(Base):
    __tablename__ = "transformers"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    transformer_id: Mapped[str] = mapped_column(String, unique=True, index=True)
    feeder_id: Mapped[str] = mapped_column(String, index=True)
    rated_capacity: Mapped[float] = mapped_column(Float, default=250.0)
    expected_technical_loss_ratio: Mapped[float] = mapped_column(Float, default=0.05)

    consumers: Mapped[list["Consumer"]] = relationship(back_populates="transformer")


class Consumer(Base):
    __tablename__ = "consumers"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    consumer_id: Mapped[str] = mapped_column(String, unique=True, index=True)
    category: Mapped[str] = mapped_column(String, default="UNKNOWN")
    sanctioned_load: Mapped[float] = mapped_column(Float, default=0.0)
    tariff: Mapped[str | None] = mapped_column(String, nullable=True)
    transformer_id: Mapped[str] = mapped_column(String, ForeignKey("transformers.transformer_id"), index=True)
    feeder_id: Mapped[str] = mapped_column(String, index=True)
    area: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    transformer: Mapped[Transformer] = relationship(back_populates="consumers")
    telemetry_readings: Mapped[list["TelemetryReading"]] = relationship(back_populates="consumer")
    anomaly_predictions: Mapped[list["AnomalyPrediction"]] = relationship(back_populates="consumer")


class TelemetryReading(Base):
    __tablename__ = "telemetry_readings"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    consumer_id: Mapped[str] = mapped_column(String, ForeignKey("consumers.consumer_id"), index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    voltage: Mapped[float | None] = mapped_column(Float, nullable=True)
    current: Mapped[float | None] = mapped_column(Float, nullable=True)
    power: Mapped[float | None] = mapped_column(Float, nullable=True)
    energy: Mapped[float] = mapped_column(Float)
    meter_status: Mapped[str] = mapped_column(String)
    communication_status: Mapped[str] = mapped_column(String)
    source: Mapped[str] = mapped_column(String, default="SIMULATOR")

    consumer: Mapped[Consumer] = relationship(back_populates="telemetry_readings")


class AnomalyPrediction(Base):
    __tablename__ = "anomaly_predictions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    consumer_id: Mapped[str] = mapped_column(String, ForeignKey("consumers.consumer_id"), index=True)
    anomaly_score: Mapped[float] = mapped_column(Float)
    risk_score: Mapped[float] = mapped_column(Float, index=True)
    risk_level: Mapped[str] = mapped_column(String, index=True)
    predicted_cause: Mapped[str] = mapped_column(String, index=True)
    confidence: Mapped[float] = mapped_column(Float)
    evidence: Mapped[list[dict]] = mapped_column(JSON, default=list)
    model_version: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    consumer: Mapped[Consumer] = relationship(back_populates="anomaly_predictions")


class InvestigationCase(Base):
    __tablename__ = "investigation_cases"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    case_id: Mapped[str] = mapped_column(String, unique=True, index=True)
    consumer_id: Mapped[str] = mapped_column(String, ForeignKey("consumers.consumer_id"), index=True)
    anomaly_id: Mapped[str] = mapped_column(String, ForeignKey("anomaly_predictions.id"), index=True)
    risk_score: Mapped[float] = mapped_column(Float)
    predicted_cause: Mapped[str] = mapped_column(String, index=True)
    priority: Mapped[str] = mapped_column(String, index=True)
    status: Mapped[str] = mapped_column(String, default="AI_FLAGGED", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class FieldObservation(Base):
    __tablename__ = "field_observations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    case_id: Mapped[str] = mapped_column(String, ForeignKey("investigation_cases.case_id"), index=True)
    investigator_id: Mapped[str | None] = mapped_column(String, nullable=True)
    source: Mapped[str] = mapped_column(String, default="TEXT")
    original_text: Mapped[str] = mapped_column(String)
    normalized_evidence: Mapped[dict] = mapped_column(JSON, default=dict)
    language: Mapped[str] = mapped_column(String, default="EN")
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class ChecklistItem(Base):
    __tablename__ = "checklist_items"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    case_id: Mapped[str] = mapped_column(String, ForeignKey("investigation_cases.case_id"), index=True)
    item_id: Mapped[str] = mapped_column(String, index=True)
    label: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="PENDING")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class CaseResolution(Base):
    __tablename__ = "case_resolutions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    case_id: Mapped[str] = mapped_column(String, ForeignKey("investigation_cases.case_id"), unique=True, index=True)
    predicted_cause: Mapped[str] = mapped_column(String)
    actual_outcome: Mapped[str] = mapped_column(String)
    resolution_notes: Mapped[str | None] = mapped_column(String, nullable=True)
    resolved_by: Mapped[str] = mapped_column(String)
    resolved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
