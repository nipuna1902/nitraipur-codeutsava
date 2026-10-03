from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import uuid4

from backend.app.database import get_db
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

router = APIRouter()


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
        "active_anomalies": 0,
        "high_risk_cases": 0,
        "active_investigations": 0,
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
def voice_anomaly_evidence(payload: ConsumerToolRequest) -> VoiceToolResponse:
    return VoiceToolResponse(
        data_available=False,
        message="Anomaly evidence is unavailable because the ML anomaly layer is not integrated yet.",
        payload={
            "consumer_id": payload.consumer_id,
            "predicted_cause": "UNCERTAIN",
            "evidence": [],
        },
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
def voice_field_observation(payload: FieldObservationRequest) -> VoiceToolResponse:
    return VoiceToolResponse(
        data_available=False,
        message="Field observation was accepted for contract testing only. Persistent case workflow is not implemented yet.",
        payload={
            "case_id": payload.case_id,
            "observation": payload.observation,
            "language": payload.language,
            "source": payload.source,
            "requires_confirmation": True,
        },
    )


@router.post("/voice/tools/checklist-update", response_model=VoiceToolResponse)
def voice_checklist_update(payload: ChecklistUpdateRequest) -> VoiceToolResponse:
    return VoiceToolResponse(
        data_available=False,
        message="Checklist update was accepted for contract testing only. Persistent checklist workflow is not implemented yet.",
        payload={
            "case_id": payload.case_id,
            "item_id": payload.item_id,
            "status": payload.status,
            "requires_confirmation": True,
        },
    )
