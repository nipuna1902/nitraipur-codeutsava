from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import DateTime, Float, ForeignKey, String
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
