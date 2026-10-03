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


class InvestigationCaseUpdateIn(BaseModel):
    status: str | None = None
    assigned_to: str | None = None


class FieldObservationIn(BaseModel):
    investigator_id: str | None = None
    source: str = Field(default="TEXT")
    original_text: str = Field(min_length=1)
    normalized_evidence: dict = Field(default_factory=dict)
    language: str = Field(default="EN")
    confidence: float | None = Field(default=None, ge=0, le=1)


class FieldObservationOut(FieldObservationIn):
    id: str
    case_id: str
    timestamp: datetime


class ChecklistUpdateIn(BaseModel):
    item_id: str = Field(min_length=1)
    status: str = Field(min_length=1)


class ChecklistItemOut(BaseModel):
    id: str
    case_id: str
    item_id: str
    label: str
    status: str
    updated_at: datetime


class CaseResolutionIn(BaseModel):
    actual_outcome: str = Field(min_length=1)
    resolution_notes: str | None = None
    resolved_by: str = Field(min_length=1)


class CaseResolutionOut(BaseModel):
    id: str
    case_id: str
    predicted_cause: str
    actual_outcome: str
    resolution_notes: str | None = None
    resolved_by: str
    resolved_at: datetime


class InvestigationCaseDetailOut(BaseModel):
    case: InvestigationCaseOut
    anomaly: AnomalyOut
    observations: list[FieldObservationOut]
    checklist: list[ChecklistItemOut]
    resolution: CaseResolutionOut | None = None


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
