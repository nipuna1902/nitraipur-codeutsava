from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from .common import CommunicationStatus, MeterStatus, TelemetrySource


class TelemetryReadingIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    consumer_id: str = Field(min_length=1)
    timestamp: datetime
    voltage: float | None = None
    current: float | None = None
    power: float | None = None
    energy: float = Field(ge=0)
    communication_status: CommunicationStatus
    source: TelemetrySource = TelemetrySource.SIMULATOR


class TelemetryBatchIn(BaseModel):
    readings: list[TelemetryReadingIn] = Field(min_length=1)


class TelemetryReadingOut(TelemetryReadingIn):
    id: str
    meter_status: MeterStatus


class TelemetryAnalysisOut(BaseModel):
    consumer_id: str
    status: str
    readings_used: int
    minimum_readings: int
    inferred_meter_status: MeterStatus
    risk_score: float | None = None
    risk_level: str | None = None
    predicted_cause: str | None = None
    confidence: float | None = None
    anomaly_id: str | None = None
    case_id: str | None = None
    model_version: str | None = None
    message: str


class TelemetryIngestResponse(BaseModel):
    accepted: int
    latest_timestamp: datetime | None
    analyses: list[TelemetryAnalysisOut] = Field(default_factory=list)
    anomaly_reports_created: int = 0
    cases_created: int = 0
