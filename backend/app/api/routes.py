from fastapi import APIRouter, HTTPException

from backend.app.schemas.grid import ConsumerSummary, TransformerSummary
from backend.app.schemas.telemetry import TelemetryBatchIn, TelemetryIngestResponse, TelemetryReadingOut
from backend.app.services import store

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/telemetry/readings", response_model=TelemetryIngestResponse)
def ingest_telemetry(payload: TelemetryBatchIn) -> TelemetryIngestResponse:
    saved = store.ingest(payload.readings)
    latest = max((reading.timestamp for reading in saved), default=None)
    return TelemetryIngestResponse(accepted=len(saved), latest_timestamp=latest)


@router.get("/telemetry/readings", response_model=list[TelemetryReadingOut])
def list_telemetry(limit: int = 100) -> list[TelemetryReadingOut]:
    limit = max(1, min(limit, 1000))
    return store.telemetry[-limit:]


@router.get("/dashboard/summary")
def dashboard_summary() -> dict:
    status = store.status()
    return {
        "total_consumers": status["consumers"],
        "telemetry_readings": status["telemetry_readings"],
        "active_anomalies": 0,
        "high_risk_cases": 0,
        "active_investigations": 0,
        "latest_timestamp": status["latest_timestamp"],
    }


@router.get("/consumers", response_model=list[ConsumerSummary])
def list_consumers() -> list[ConsumerSummary]:
    return store.list_consumers()


@router.get("/consumers/{consumer_id}", response_model=ConsumerSummary)
def get_consumer(consumer_id: str) -> ConsumerSummary:
    consumer = store.get_consumer(consumer_id)
    if consumer is None:
        raise HTTPException(status_code=404, detail="Consumer not found")
    return consumer


@router.get("/consumers/{consumer_id}/history", response_model=list[TelemetryReadingOut])
def get_consumer_history(consumer_id: str, limit: int = 100) -> list[TelemetryReadingOut]:
    history = store.consumer_history(consumer_id, limit=max(1, min(limit, 1000)))
    if not history:
        raise HTTPException(status_code=404, detail="Consumer not found")
    return history


@router.get("/transformers", response_model=list[TransformerSummary])
def list_transformers() -> list[TransformerSummary]:
    return store.list_transformers()


@router.get("/transformers/{transformer_id}", response_model=TransformerSummary)
def get_transformer(transformer_id: str) -> TransformerSummary:
    transformer = store.get_transformer(transformer_id)
    if transformer is None:
        raise HTTPException(status_code=404, detail="Transformer not found")
    return transformer


@router.get("/simulation/status")
def simulation_status() -> dict:
    return {
        "mode": "backend_ready_for_simulator_data",
        "hardware_required": False,
        **store.status(),
    }
