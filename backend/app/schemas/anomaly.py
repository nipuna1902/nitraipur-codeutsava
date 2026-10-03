from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class EvidenceItem(BaseModel):
    feature: str
    value: float | int | str | None = None
    direction: str = "supports_anomaly"


class MlPredictionIn(BaseModel):
    consumer_id: str = Field(min_length=1)
    risk_score: float = Field(ge=0, le=100)
    risk_level: str
    predicted_cause: str
    confidence: float = Field(ge=0, le=1)
    anomaly_score: float = Field(ge=0, le=1)
    model_version: str
    evidence: list[EvidenceItem] = Field(default_factory=list)


class MlPredictionBatchIn(BaseModel):
    model_version: str | None = None
    production_model: str | None = None
    predictions: list[MlPredictionIn]


class AnomalyOut(BaseModel):
    id: str
    consumer_id: str
    anomaly_score: float
    risk_score: float
    risk_level: str
    predicted_cause: str
    confidence: float
    evidence: list[dict]
    model_version: str
    created_at: datetime


class InvestigationCaseOut(BaseModel):
    id: str
    case_id: str
    consumer_id: str
    anomaly_id: str
    risk_score: float
    predicted_cause: str
    priority: str
    status: str
    created_at: datetime
    updated_at: datetime


class MlPredictionIngestResponse(BaseModel):
    accepted: int
    cases_created: int
    production_model: str | None = None
    model_version: str | None = None


class ConsumerAnalysisOut(BaseModel):
    consumer_id: str
    data_available: bool
    latest_anomaly: AnomalyOut | None = None
    investigation_case: InvestigationCaseOut | None = None
    recommended_action: str
