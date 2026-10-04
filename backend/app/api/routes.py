from __future__ import annotations

import asyncio
import json
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.schemas.anomaly import (
    AnomalyOut,
    AnomalyQueueOut,
    CaseResolutionIn,
    CaseResolutionOut,
    ChecklistItemOut,
    ChecklistUpdateIn,
    ConsumerAnalysisOut,
    CopilotAnswerOut,
    CopilotAskIn,
    FieldObservationIn,
    FieldObservationOut,
    InvestigationCaseDetailOut,
    InvestigationCaseOut,
    InvestigationCaseUpdateIn,
    MlPredictionBatchIn,
    MlPredictionIngestResponse,
)
from backend.app.schemas.grid import ConsumerSummary, TransformerSummary
from backend.app.schemas.telemetry import TelemetryBatchIn, TelemetryIngestResponse, TelemetryReadingOut
from backend.app.schemas.voice import (
    ChecklistUpdateRequest,
    ConsumerToolRequest,
    FieldObservationRequest,
    TransformerToolRequest,
    VoiceSessionRequest,
    VoiceSessionResponse,
    VoiceToolResponse,
)
from backend.app.services.repository import TelemetryRepository
from backend.app.websocket.manager import ws_manager

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parents[3]
PREDICTIONS_SAMPLE_PATH = BASE_DIR / "ml" / "evaluation" / "predictions_sample.json"


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def get_repository(db: Session = Depends(get_db)) -> TelemetryRepository:
    return TelemetryRepository(db)


@router.post("/telemetry/readings", response_model=TelemetryIngestResponse)
def ingest_telemetry(
    payload: TelemetryBatchIn,
    repository: TelemetryRepository = Depends(get_repository),
) -> TelemetryIngestResponse:
    saved = repository.ingest(payload.readings)
    latest = max((reading.timestamp for reading in saved), default=None)
    return TelemetryIngestResponse(accepted=len(saved), latest_timestamp=latest)


@router.get("/telemetry/readings", response_model=list[TelemetryReadingOut])
def list_telemetry(
    limit: int = 100,
    repository: TelemetryRepository = Depends(get_repository),
) -> list[TelemetryReadingOut]:
    limit = max(1, min(limit, 1000))
    return repository.list_telemetry(limit)


@router.get("/dashboard/summary")
def dashboard_summary(repository: TelemetryRepository = Depends(get_repository)) -> dict:
    status = repository.status()
    return {
        "total_consumers": status["consumers"],
        "telemetry_readings": status["telemetry_readings"],
        "active_anomalies": status["active_anomalies"],
        "high_risk_cases": status["high_risk_cases"],
        "active_investigations": status["active_investigations"],
        "latest_timestamp": status["latest_timestamp"],
    }


@router.get("/consumers", response_model=list[ConsumerSummary])
def list_consumers(repository: TelemetryRepository = Depends(get_repository)) -> list[ConsumerSummary]:
    return repository.list_consumers()


@router.get("/consumers/{consumer_id}", response_model=ConsumerSummary)
def get_consumer(
    consumer_id: str,
    repository: TelemetryRepository = Depends(get_repository),
) -> ConsumerSummary:
    consumer = repository.get_consumer(consumer_id)
    if consumer is None:
        raise HTTPException(status_code=404, detail="Consumer not found")
    return consumer


@router.get("/consumers/{consumer_id}/history", response_model=list[TelemetryReadingOut])
def get_consumer_history(
    consumer_id: str,
    limit: int = 100,
    repository: TelemetryRepository = Depends(get_repository),
) -> list[TelemetryReadingOut]:
    history = repository.consumer_history(consumer_id, limit=max(1, min(limit, 1000)))
    if not history:
        raise HTTPException(status_code=404, detail="Consumer not found")
    return history


@router.get("/consumers/{consumer_id}/analysis", response_model=ConsumerAnalysisOut)
def get_consumer_analysis(
    consumer_id: str,
    repository: TelemetryRepository = Depends(get_repository),
) -> ConsumerAnalysisOut:
    return repository.consumer_analysis(consumer_id)


@router.post("/ml/predictions", response_model=MlPredictionIngestResponse)
def ingest_ml_predictions(
    payload: MlPredictionBatchIn,
    repository: TelemetryRepository = Depends(get_repository),
) -> MlPredictionIngestResponse:
    predictions, cases = repository.ingest_predictions(payload.predictions)
    return MlPredictionIngestResponse(
        accepted=len(predictions),
        cases_created=len(cases),
        production_model=payload.production_model,
        model_version=payload.model_version,
    )


@router.post("/ml/predictions/load-sample", response_model=MlPredictionIngestResponse)
def load_ml_prediction_sample(
    repository: TelemetryRepository = Depends(get_repository),
) -> MlPredictionIngestResponse:
    if not PREDICTIONS_SAMPLE_PATH.exists():
        raise HTTPException(status_code=404, detail="ML predictions sample file not found")
    with PREDICTIONS_SAMPLE_PATH.open("r", encoding="utf-8") as f:
        payload = MlPredictionBatchIn.model_validate(json.load(f))
    predictions, cases = repository.ingest_predictions(payload.predictions)
    return MlPredictionIngestResponse(
        accepted=len(predictions),
        cases_created=len(cases),
        production_model=payload.production_model,
        model_version=payload.model_version,
    )


@router.get("/anomalies", response_model=list[AnomalyOut])
def list_anomalies(
    limit: int = 100,
    repository: TelemetryRepository = Depends(get_repository),
) -> list[AnomalyOut]:
    return repository.list_anomalies(limit=max(1, min(limit, 1000)))


@router.get("/anomalies/queue", response_model=AnomalyQueueOut)
def get_anomaly_queue(
    limit: int = 100,
    repository: TelemetryRepository = Depends(get_repository),
) -> AnomalyQueueOut:
    return repository.anomaly_queue(limit=max(1, min(limit, 1000)))


@router.get("/anomalies/{anomaly_id}", response_model=AnomalyOut)
def get_anomaly(
    anomaly_id: str,
    repository: TelemetryRepository = Depends(get_repository),
) -> AnomalyOut:
    anomaly = repository.get_anomaly(anomaly_id)
    if anomaly is None:
        raise HTTPException(status_code=404, detail="Anomaly not found")
    return anomaly


@router.post("/copilot/ask", response_model=CopilotAnswerOut)
def ask_copilot(
    payload: CopilotAskIn,
    repository: TelemetryRepository = Depends(get_repository),
) -> CopilotAnswerOut:
    return repository.answer_question(payload)


@router.get("/investigations", response_model=list[InvestigationCaseOut])
def list_investigations(
    limit: int = 100,
    repository: TelemetryRepository = Depends(get_repository),
) -> list[InvestigationCaseOut]:
    return repository.list_investigation_cases(limit=max(1, min(limit, 1000)))


@router.get("/investigations/{case_id}", response_model=InvestigationCaseDetailOut)
def get_investigation(
    case_id: str,
    repository: TelemetryRepository = Depends(get_repository),
) -> InvestigationCaseDetailOut:
    case = repository.get_investigation_case(case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Investigation case not found")
    return case


@router.patch("/investigations/{case_id}", response_model=InvestigationCaseOut)
def update_investigation(
    case_id: str,
    payload: InvestigationCaseUpdateIn,
    repository: TelemetryRepository = Depends(get_repository),
) -> InvestigationCaseOut:
    case = repository.update_investigation_case(case_id, payload)
    if case is None:
        raise HTTPException(status_code=404, detail="Investigation case not found")
    return case


@router.post("/investigations/{case_id}/observations", response_model=FieldObservationOut)
def add_investigation_observation(
    case_id: str,
    payload: FieldObservationIn,
    repository: TelemetryRepository = Depends(get_repository),
) -> FieldObservationOut:
    observation = repository.add_field_observation(case_id, payload)
    if observation is None:
        raise HTTPException(status_code=404, detail="Investigation case not found")
    return observation


@router.patch("/investigations/{case_id}/checklist", response_model=ChecklistItemOut)
def update_investigation_checklist(
    case_id: str,
    payload: ChecklistUpdateIn,
    repository: TelemetryRepository = Depends(get_repository),
) -> ChecklistItemOut:
    item = repository.update_checklist_item(case_id, payload)
    if item is None:
        raise HTTPException(status_code=404, detail="Investigation case not found")
    return item


@router.post("/investigations/{case_id}/resolve", response_model=CaseResolutionOut)
def resolve_investigation(
    case_id: str,
    payload: CaseResolutionIn,
    repository: TelemetryRepository = Depends(get_repository),
) -> CaseResolutionOut:
    resolution = repository.resolve_case(case_id, payload)
    if resolution is None:
        raise HTTPException(status_code=404, detail="Investigation case not found")
    return resolution


@router.get("/transformers", response_model=list[TransformerSummary])
def list_transformers(repository: TelemetryRepository = Depends(get_repository)) -> list[TransformerSummary]:
    return repository.list_transformers()


@router.get("/transformers/{transformer_id}", response_model=TransformerSummary)
def get_transformer(
    transformer_id: str,
    repository: TelemetryRepository = Depends(get_repository),
) -> TransformerSummary:
    transformer = repository.get_transformer(transformer_id)
    if transformer is None:
        raise HTTPException(status_code=404, detail="Transformer not found")
    return transformer


@router.get("/simulation/status")
def simulation_status(repository: TelemetryRepository = Depends(get_repository)) -> dict:
    return {
        "mode": "backend_ready_for_simulator_data",
        "hardware_required": False,
        **repository.status(),
    }


@router.post("/voice/session", response_model=VoiceSessionResponse)
def create_voice_session(payload: VoiceSessionRequest) -> VoiceSessionResponse:
    return VoiceSessionResponse(
        session_id=str(uuid4()),
        status="READY_FOR_TOOL_TESTING",
        language=payload.language,
        provider="ELEVENLABS_FUTURE",
        message="Voice session placeholder created. No external ElevenLabs API call was made.",
    )


@router.post("/voice/tools/consumer-summary", response_model=VoiceToolResponse)
def voice_consumer_summary(
    payload: ConsumerToolRequest,
    repository: TelemetryRepository = Depends(get_repository),
) -> VoiceToolResponse:
    consumer = repository.get_consumer(payload.consumer_id)
    if consumer is None:
        return VoiceToolResponse(
            data_available=False,
            message="Consumer summary is unavailable because no telemetry exists for this consumer.",
            payload={"consumer_id": payload.consumer_id},
        )
    return VoiceToolResponse(
        data_available=True,
        message="Consumer summary retrieved from structured backend data.",
        payload=consumer.model_dump(),
    )


@router.post("/voice/tools/anomaly-evidence", response_model=VoiceToolResponse)
def voice_anomaly_evidence(
    payload: ConsumerToolRequest,
    repository: TelemetryRepository = Depends(get_repository),
) -> VoiceToolResponse:
    analysis = repository.consumer_analysis(payload.consumer_id)
    if not analysis.data_available or analysis.latest_anomaly is None:
        return VoiceToolResponse(
            data_available=False,
            message="Anomaly evidence is unavailable because no ML prediction exists for this consumer.",
            payload={
                "consumer_id": payload.consumer_id,
                "predicted_cause": "UNCERTAIN",
                "evidence": [],
            },
        )
    return VoiceToolResponse(
        data_available=True,
        message="Anomaly evidence retrieved from ML prediction records.",
        payload=analysis.model_dump(),
    )


@router.post("/voice/tools/transformer-summary", response_model=VoiceToolResponse)
def voice_transformer_summary(
    payload: TransformerToolRequest,
    repository: TelemetryRepository = Depends(get_repository),
) -> VoiceToolResponse:
    transformer = repository.get_transformer(payload.transformer_id)
    if transformer is None:
        return VoiceToolResponse(
            data_available=False,
            message="Transformer summary is unavailable because the transformer does not exist.",
            payload={"transformer_id": payload.transformer_id},
        )
    return VoiceToolResponse(
        data_available=True,
        message="Transformer summary retrieved from structured backend data.",
        payload=transformer.model_dump(),
    )


@router.post("/voice/tools/field-observation", response_model=VoiceToolResponse)
def voice_field_observation(
    payload: FieldObservationRequest,
    repository: TelemetryRepository = Depends(get_repository),
) -> VoiceToolResponse:
    observation = repository.add_field_observation(
        payload.case_id,
        FieldObservationIn(
            source=payload.source,
            original_text=payload.observation,
            normalized_evidence={"raw_observation": payload.observation},
            language=payload.language,
            confidence=None,
        ),
    )
    if observation is None:
        return VoiceToolResponse(
            data_available=False,
            message="Field observation could not be stored because the case does not exist.",
            payload={"case_id": payload.case_id},
        )
    return VoiceToolResponse(
        data_available=True,
        message="Field observation stored in the investigation case.",
        payload={
            "observation": observation.model_dump(),
            "requires_confirmation": True,
        },
    )


@router.post("/voice/tools/checklist-update", response_model=VoiceToolResponse)
def voice_checklist_update(
    payload: ChecklistUpdateRequest,
    repository: TelemetryRepository = Depends(get_repository),
) -> VoiceToolResponse:
    item = repository.update_checklist_item(
        payload.case_id,
        ChecklistUpdateIn(item_id=payload.item_id, status=payload.status),
    )
    if item is None:
        return VoiceToolResponse(
            data_available=False,
            message="Checklist update could not be stored because the case does not exist.",
            payload={"case_id": payload.case_id, "item_id": payload.item_id},
        )
    return VoiceToolResponse(
        data_available=True,
        message="Checklist update stored in the investigation case.",
        payload={
            "checklist_item": item.model_dump(),
            "requires_confirmation": True,
        },
    )

@router.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
