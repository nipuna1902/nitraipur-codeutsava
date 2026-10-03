from datetime import datetime

from pydantic import BaseModel, Field

from .common import CommunicationStatus, MeterStatus, TelemetrySource


class TelemetryReadingIn(BaseModel):
    consumer_id: str = Field(min_length=1)
    timestamp: datetime
    voltage: float | None = None
    current: float | None = None
    power: float | None = None
    energy: float = Field(ge=0)
    meter_status: MeterStatus
    communication_status: CommunicationStatus
    source: TelemetrySource = TelemetrySource.SIMULATOR


class TelemetryBatchIn(BaseModel):
    readings: list[TelemetryReadingIn] = Field(min_length=1)


class TelemetryReadingOut(TelemetryReadingIn):
    id: str


class TelemetryIngestResponse(BaseModel):
    accepted: int
    latest_timestamp: datetime | None
