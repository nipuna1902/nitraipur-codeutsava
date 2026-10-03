from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy.exc import IntegrityError
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from backend.app.models import (
    AnomalyPrediction,
    CaseResolution,
    ChecklistItem,
    Consumer,
    FieldObservation,
    InvestigationCase,
    TelemetryReading,
    Transformer,
)
from backend.app.schemas.anomaly import (
    AnomalyOut,
    AnomalyQueueOut,
    CaseResolutionIn,
    CaseResolutionOut,
    ChecklistItemOut,
    ChecklistUpdateIn,
    CopilotAnswerOut,
    CopilotAskIn,
    ConsumerAnalysisOut,
    FieldObservationIn,
    FieldObservationOut,
    InvestigationCaseDetailOut,
    InvestigationCaseOut,
    InvestigationCaseUpdateIn,
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
DIRECT_ATTRIBUTION_STATUSES = {"SINGLE_BUILDING", "DIRECT_METER"}
CONFIDENT_ALLOCATIONS = {"HIGH", "MEDIUM"}

DEFAULT_CHECKLIST = {
    "attribution_scope_verified": "Attribution scope verified",
    "meter_inspected": "Meter physically inspected",
    "seal_inspected": "Seal inspected",
    "connected_load_verified": "Connected load verified",
    "meter_reading_verified": "Meter reading verified",
    "communication_path_checked": "Communication path checked",
    "meter_fault_ruled_out": "Meter fault ruled out",
    "bypass_checked": "Bypass checked",
    "physical_anomaly_observed": "Physical anomaly observed",
    "additional_notes": "Additional notes captured",
}


@dataclass(frozen=True)
class GuardrailContext:
    case_type: str
    raw_risk_score: float
    adjusted_risk_score: float
    adjusted_priority: str
    outlier_flags: list[str]
    allocation_confidence: str
    attribution_status: str
    recommendation: str
    risk_adjustment_reason: str


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
            select(func.count(InvestigationCase.id)).where(InvestigationCase.status.not_in(["RESOLVED", "DISMISSED"]))
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
        return [self._consumer_summary(consumer) for consumer in consumers]

    def get_consumer(self, consumer_id: str) -> ConsumerSummary | None:
        consumer = self.db.scalar(select(Consumer).where(Consumer.consumer_id == consumer_id))
        if consumer is None:
            return None
        return self._consumer_summary(consumer)

    def _consumer_summary(self, consumer: Consumer) -> ConsumerSummary:
        readings_count = self.db.scalar(
            select(func.count(TelemetryReading.id)).where(TelemetryReading.consumer_id == consumer.consumer_id)
        ) or 0
        latest = self.db.scalar(
            select(TelemetryReading)
            .where(TelemetryReading.consumer_id == consumer.consumer_id)
            .order_by(TelemetryReading.timestamp.desc())
            .limit(1)
        )
        return ConsumerSummary(
            consumer_id=consumer.consumer_id,
            category=consumer.category,
            sanctioned_load=consumer.sanctioned_load,
            tariff=consumer.tariff,
            transformer_id=consumer.transformer_id,
            feeder_id=consumer.feeder_id,
            area=consumer.area,
            latest_energy=latest.energy if latest is not None else None,
            latest_power=latest.power if latest is not None else None,
            latest_voltage=latest.voltage if latest is not None else None,
            meter_status=latest.meter_status if latest is not None else None,
            communication_status=latest.communication_status if latest is not None else None,
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

    def anomaly_queue(self, limit: int = 100) -> AnomalyQueueOut:
        total = self.db.scalar(select(func.count(AnomalyPrediction.id))) or 0
        items = self.list_anomalies(limit)
        return AnomalyQueueOut(total=total, limit=limit, returned=len(items), items=items)

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

    def get_investigation_case(self, case_id: str) -> InvestigationCaseDetailOut | None:
        case = self._get_case_model(case_id)
        if case is None:
            return None
        anomaly = self.db.scalar(select(AnomalyPrediction).where(AnomalyPrediction.id == case.anomaly_id))
        if anomaly is None:
            return None
        self._ensure_checklist(case.case_id)
        observations = self.db.scalars(
            select(FieldObservation)
            .where(FieldObservation.case_id == case.case_id)
            .order_by(FieldObservation.timestamp.asc())
        ).all()
        checklist = self.db.scalars(
            select(ChecklistItem)
            .where(ChecklistItem.case_id == case.case_id)
            .order_by(ChecklistItem.item_id.asc())
        ).all()
        resolution = self.db.scalar(select(CaseResolution).where(CaseResolution.case_id == case.case_id))
        return InvestigationCaseDetailOut(
            case=self._to_case_out(case),
            anomaly=self._to_anomaly_out(anomaly),
            observations=[self._to_observation_out(row) for row in observations],
            checklist=[self._to_checklist_out(row) for row in checklist],
            resolution=self._to_resolution_out(resolution) if resolution is not None else None,
        )

    def update_investigation_case(
        self, case_id: str, payload: InvestigationCaseUpdateIn
    ) -> InvestigationCaseOut | None:
        case = self._get_case_model(case_id)
        if case is None:
            return None
        if payload.status is not None:
            case.status = payload.status
        case.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(case)
        return self._to_case_out(case)

    def add_field_observation(self, case_id: str, payload: FieldObservationIn) -> FieldObservationOut | None:
        case = self._get_case_model(case_id)
        if case is None:
            return None
        observation = FieldObservation(
            id=str(uuid4()),
            case_id=case.case_id,
            investigator_id=payload.investigator_id,
            source=payload.source,
            original_text=payload.original_text,
            normalized_evidence=payload.normalized_evidence,
            language=payload.language,
            confidence=payload.confidence,
        )
        case.status = "UNDER_INVESTIGATION" if case.status == "AI_FLAGGED" else case.status
        case.updated_at = datetime.now(timezone.utc)
        self.db.add(observation)
        self.db.commit()
        self.db.refresh(observation)
        return self._to_observation_out(observation)

    def update_checklist_item(self, case_id: str, payload: ChecklistUpdateIn) -> ChecklistItemOut | None:
        case = self._get_case_model(case_id)
        if case is None:
            return None
        self._ensure_checklist(case.case_id)
        item = self.db.scalar(
            select(ChecklistItem)
            .where(ChecklistItem.case_id == case.case_id)
            .where(ChecklistItem.item_id == payload.item_id)
        )
        if item is None:
            item = ChecklistItem(
                id=str(uuid4()),
                case_id=case.case_id,
                item_id=payload.item_id,
                label=payload.item_id.replace("_", " ").title(),
                status=payload.status,
            )
            self.db.add(item)
        else:
            item.status = payload.status
            item.updated_at = datetime.now(timezone.utc)
        case.status = "UNDER_INVESTIGATION" if case.status == "AI_FLAGGED" else case.status
        case.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(item)
        return self._to_checklist_out(item)

    def resolve_case(self, case_id: str, payload: CaseResolutionIn) -> CaseResolutionOut | None:
        case = self._get_case_model(case_id)
        if case is None:
            return None
        existing = self.db.scalar(select(CaseResolution).where(CaseResolution.case_id == case.case_id))
        if existing is None:
            resolution = CaseResolution(
                id=str(uuid4()),
                case_id=case.case_id,
                predicted_cause=case.predicted_cause,
                actual_outcome=payload.actual_outcome,
                resolution_notes=payload.resolution_notes,
                resolved_by=payload.resolved_by,
            )
            self.db.add(resolution)
        else:
            resolution = existing
            resolution.actual_outcome = payload.actual_outcome
            resolution.resolution_notes = payload.resolution_notes
            resolution.resolved_by = payload.resolved_by
            resolution.resolved_at = datetime.now(timezone.utc)
        case.status = "RESOLVED"
        case.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(resolution)
        return self._to_resolution_out(resolution)

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
            recommended_action=anomaly.recommendation,
        )

    def answer_question(self, payload: CopilotAskIn) -> CopilotAnswerOut:
        question = payload.question.lower()
        if payload.transformer_id is not None or "transformer" in question:
            if payload.transformer_id is None:
                return self._no_data("transformer_summary", "A transformer_id is required.")
            transformer = self.get_transformer(payload.transformer_id)
            if transformer is None:
                return self._no_data("transformer_summary", "Transformer was not found.")
            return CopilotAnswerOut(
                data_available=True,
                intent="transformer_summary",
                answer=(
                    f"Transformer {transformer.transformer_id} is on feeder {transformer.feeder_id} "
                    f"with {transformer.consumer_count} known consumers and latest consumer energy "
                    f"{transformer.latest_consumer_energy}."
                ),
                payload=transformer.model_dump(),
                suggested_next_questions=["Show me risky consumers", "What is the grid status?"],
            )

        if any(term in question for term in ["dashboard", "grid status", "current status", "summary"]):
            status = self.status()
            return CopilotAnswerOut(
                data_available=True,
                intent="dashboard_summary",
                answer=(
                    f"Electron currently has {status['consumers']} consumers, "
                    f"{status['active_anomalies']} anomaly records, "
                    f"{status['high_risk_cases']} high-risk cases, and "
                    f"{status['active_investigations']} active investigations."
                ),
                payload=status,
                suggested_next_questions=[
                    "Show me the top risky consumers",
                    "Which cases need inspection?",
                ],
            )

        if any(term in question for term in ["top", "risky", "highest risk", "anomaly queue", "anomalies"]):
            queue = self.anomaly_queue(payload.limit)
            if queue.returned == 0:
                return self._no_data("top_risky_consumers", "No anomaly records are available.")
            top = queue.items[0]
            return CopilotAnswerOut(
                data_available=True,
                intent="top_risky_consumers",
                answer=(
                    f"Found {queue.total} anomaly records. The highest-risk consumer is "
                    f"{top.consumer_id} with raw risk score {top.raw_risk_score:.1f}, "
                    f"adjusted score {top.adjusted_risk_score:.1f}, and case type {top.case_type}."
                ),
                payload=queue.model_dump(),
                suggested_next_questions=[
                    "Why was this consumer flagged?",
                    "Which cases need field inspection?",
                ],
            )

        if any(
            term in question
            for term in [
                "investigation queue",
                "inspection queue",
                "case queue",
                "cases need",
                "active investigations",
                "investigation backlog",
                "queue so long",
            ]
        ):
            cases = self.list_investigation_cases(limit=payload.limit)
            status = self.status()
            aggregate_count = sum(1 for case in cases if case.case_type == "AGGREGATE_REVIEW")
            answer = (
                f"Electron has {status['active_investigations']} active investigations. "
                f"The queue is ordered by adjusted investigation priority, so high-risk and aggregate-review "
                f"items stay visible until field review or resolution. Showing {len(cases)} case(s) in this answer; "
                f"{aggregate_count} of them are aggregate-review cases that need attribution checks before any "
                f"building-level conclusion."
            )
            return CopilotAnswerOut(
                data_available=True,
                intent="investigation_queue_summary",
                answer=answer,
                payload={
                    "summary": status,
                    "cases": [case.model_dump() for case in cases],
                },
                suggested_next_questions=[
                    "Which cases need field inspection?",
                    "Show me the top risky consumers",
                    "What is the current grid status?",
                ],
            )

        if payload.consumer_id is not None or any(term in question for term in ["consumer", "flagged", "why"]):
            if payload.consumer_id is None:
                return self._no_data("consumer_analysis", "A consumer_id is required to explain a consumer.")
            analysis = self.consumer_analysis(payload.consumer_id)
            if not analysis.data_available or analysis.latest_anomaly is None:
                return self._no_data("consumer_analysis", "No ML prediction exists for this consumer.")
            anomaly = analysis.latest_anomaly
            return CopilotAnswerOut(
                data_available=True,
                intent="consumer_analysis",
                answer=(
                    f"Consumer {payload.consumer_id} was flagged as {anomaly.risk_level} risk "
                    f"with raw score {anomaly.raw_risk_score:.1f} and adjusted score "
                    f"{anomaly.adjusted_risk_score:.1f}. The probable cause is "
                    f"{anomaly.predicted_cause}. Recommended action: {analysis.recommended_action}"
                ),
                payload=analysis.model_dump(),
                suggested_next_questions=[
                    "What evidence supports this?",
                    "What is the investigation status?",
                ],
            )

        if payload.case_id is not None or any(term in question for term in ["case", "investigation", "checklist", "observation", "resolution", "outcome"]):
            if payload.case_id is None:
                return self._no_data("investigation_case", "A case_id is required to answer case questions.")
            detail = self.get_investigation_case(payload.case_id)
            if detail is None:
                return self._no_data("investigation_case", "Investigation case was not found.")
            if "checklist" in question or "inspect" in question:
                pending = [item.label for item in detail.checklist if item.status != "DONE"]
                answer = (
                    "Remaining checklist items: " + ", ".join(pending)
                    if pending
                    else "All checklist items are marked done."
                )
                intent = "case_checklist"
            elif "observation" in question or "field" in question:
                answer = f"This case has {len(detail.observations)} field observation(s)."
                intent = "case_observations"
            elif "resolution" in question or "outcome" in question:
                if detail.resolution is None:
                    answer = "This case has not been resolved yet."
                else:
                    answer = (
                        f"The predicted cause was {detail.resolution.predicted_cause}; "
                        f"the actual field outcome was {detail.resolution.actual_outcome}."
                    )
                intent = "case_resolution"
            else:
                answer = (
                    f"Case {payload.case_id} is {detail.case.status}. It is linked to consumer "
                    f"{detail.case.consumer_id}, raw risk score {detail.case.raw_risk_score:.1f}, "
                    f"adjusted score {detail.case.adjusted_risk_score:.1f}, and case type "
                    f"{detail.case.case_type}."
                )
                intent = "case_status"
            return CopilotAnswerOut(
                data_available=True,
                intent=intent,
                answer=answer,
                payload=detail.model_dump(),
                suggested_next_questions=[
                    "What should the field team inspect?",
                    "What observations are stored?",
                    "What is the resolution?",
                ],
            )

        return self._no_data(
            "unsupported",
            "I can answer questions about dashboard status, risky consumers, consumers, cases, checklist, observations, resolutions, and transformers.",
        )

    def reset(self) -> None:
        self.db.execute(delete(CaseResolution))
        self.db.execute(delete(ChecklistItem))
        self.db.execute(delete(FieldObservation))
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

    def _get_case_model(self, case_id: str) -> InvestigationCase | None:
        return self.db.scalar(select(InvestigationCase).where(InvestigationCase.case_id == case_id))

    def _ensure_checklist(self, case_id: str) -> None:
        existing = set(
            self.db.scalars(select(ChecklistItem.item_id).where(ChecklistItem.case_id == case_id)).all()
        )
        for item_id, label in DEFAULT_CHECKLIST.items():
            if item_id not in existing:
                self.db.add(
                    ChecklistItem(
                        id=str(uuid4()),
                        case_id=case_id,
                        item_id=item_id,
                        label=label,
                        status="PENDING",
                    )
                )
        self.db.flush()

    def _create_case_for_prediction(self, prediction: AnomalyPrediction) -> InvestigationCase:
        existing = self.db.scalar(
            select(InvestigationCase)
            .where(InvestigationCase.anomaly_id == prediction.id)
            .limit(1)
        )
        if existing is not None:
            return existing
        guardrail = self._guardrail_for_prediction(prediction)
        case = InvestigationCase(
            id=str(uuid4()),
            case_id=f"CASE-{prediction.consumer_id}-{prediction.id[:8]}",
            consumer_id=prediction.consumer_id,
            anomaly_id=prediction.id,
            risk_score=prediction.risk_score,
            predicted_cause=prediction.predicted_cause,
            priority=guardrail.adjusted_priority,
            status="AI_FLAGGED",
        )
        self.db.add(case)
        self.db.flush()
        self._ensure_checklist(case.case_id)
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

    def _guardrail_for_prediction(self, prediction: AnomalyPrediction) -> GuardrailContext:
        return self._guardrail_context(
            risk_score=prediction.risk_score,
            risk_level=prediction.risk_level,
            predicted_cause=prediction.predicted_cause,
            confidence=prediction.confidence,
            evidence=prediction.evidence or [],
        )

    def _guardrail_context(
        self,
        risk_score: float,
        risk_level: str,
        predicted_cause: str,
        confidence: float,
        evidence: list[dict],
    ) -> GuardrailContext:
        allocation_confidence = self._normalized_evidence_value(
            evidence,
            {"allocation_confidence", "building_allocation_confidence"},
            "UNKNOWN",
        )
        attribution_status = self._normalized_evidence_value(
            evidence,
            {"attribution_status", "building_attribution_status"},
            "AGGREGATE_ONLY",
        )
        outlier_flags = set(self._declared_outlier_flags(evidence))

        direct_attribution = (
            attribution_status in DIRECT_ATTRIBUTION_STATUSES
            and allocation_confidence in CONFIDENT_ALLOCATIONS
        )
        if not direct_attribution:
            outlier_flags.add("AGGREGATE_ATTRIBUTION")
        if self._is_communication_heavy(predicted_cause, evidence):
            outlier_flags.add("COMMUNICATION_HEAVY")
        if self._is_meter_fault_like(predicted_cause, evidence):
            outlier_flags.add("METER_FAULT_LIKE")
        if self._is_large_load_outlier(risk_score, evidence):
            outlier_flags.add("LARGE_LOAD_OUTLIER")

        corroborating_evidence = [
            item for item in evidence
            if str(item.get("feature", "")).lower()
            not in {"allocation_confidence", "building_allocation_confidence", "attribution_status", "building_attribution_status", "outlier_flags"}
        ]
        if confidence < 0.65 or not corroborating_evidence:
            outlier_flags.add("WEAK_CORROBORATION")

        high_or_critical = risk_level in CASE_CREATING_RISK_LEVELS
        case_type = "AGGREGATE_REVIEW" if high_or_critical and not direct_attribution else "STANDARD"

        penalties: list[tuple[str, float]] = []
        if case_type == "AGGREGATE_REVIEW":
            penalties.append(("multi-building or unknown attribution", 15.0))
        if "COMMUNICATION_HEAVY" in outlier_flags:
            penalties.append(("communication issue may dominate the anomaly", 20.0))
        if "METER_FAULT_LIKE" in outlier_flags:
            penalties.append(("meter fault signal may dominate the anomaly", 20.0))
        if "WEAK_CORROBORATION" in outlier_flags:
            penalties.append(("weak corroborating evidence", 10.0))
        if "LARGE_LOAD_OUTLIER" in outlier_flags and case_type == "AGGREGATE_REVIEW":
            penalties.append(("large-load aggregate row increases false-positive risk", 5.0))

        adjusted_risk_score = round(max(0.0, risk_score - sum(penalty for _, penalty in penalties)), 1)
        adjusted_priority = self._risk_level_from_score(adjusted_risk_score)

        if case_type == "AGGREGATE_REVIEW":
            recommendation = (
                "High-risk aggregate anomaly. Field verification needed before attributing this anomaly "
                "to a specific building."
            )
        elif "COMMUNICATION_HEAVY" in outlier_flags:
            recommendation = "Review communication health before theft/tampering escalation."
        elif "METER_FAULT_LIKE" in outlier_flags:
            recommendation = "Treat as meter-fault review before theft/tampering escalation."
        elif "WEAK_CORROBORATION" in outlier_flags:
            recommendation = "Review evidence and monitor before dispatch."
        else:
            recommendation = self._recommended_action(risk_level)

        reason = (
            "; ".join(reason for reason, _ in penalties)
            if penalties
            else "No aggregate or outlier adjustment applied."
        )

        return GuardrailContext(
            case_type=case_type,
            raw_risk_score=risk_score,
            adjusted_risk_score=adjusted_risk_score,
            adjusted_priority=adjusted_priority,
            outlier_flags=sorted(outlier_flags),
            allocation_confidence=allocation_confidence,
            attribution_status=attribution_status,
            recommendation=recommendation,
            risk_adjustment_reason=reason,
        )

    def _normalized_evidence_value(self, evidence: list[dict], feature_names: set[str], default: str) -> str:
        for item in evidence:
            feature = str(item.get("feature", "")).lower()
            if feature in feature_names:
                value = item.get("value")
                if value is not None:
                    return str(value).upper().replace(" ", "_")
        return default

    def _declared_outlier_flags(self, evidence: list[dict]) -> list[str]:
        flags: list[str] = []
        for item in evidence:
            if str(item.get("feature", "")).lower() != "outlier_flags":
                continue
            value = item.get("value")
            if isinstance(value, list):
                flags.extend(str(flag) for flag in value)
            elif value is not None:
                flags.extend(str(value).replace(";", ",").split(","))
        return [flag.strip().upper().replace(" ", "_") for flag in flags if flag.strip()]

    def _is_communication_heavy(self, predicted_cause: str, evidence: list[dict]) -> bool:
        if predicted_cause == "COMMUNICATION_FAILURE":
            return True
        for item in evidence:
            feature = str(item.get("feature", "")).lower()
            value = item.get("value")
            value_text = str(value).lower()
            if "communication" not in feature and "comm" not in feature:
                continue
            if any(term in feature for term in ["gap", "missing", "failure", "disconnect"]):
                return True
            if any(term in value_text for term in ["degraded", "disconnected", "missing", "failed", "low"]):
                return True
            if isinstance(value, (int, float)) and ("health" in feature or "score" in feature) and value <= 0.4:
                return True
        return False

    def _is_meter_fault_like(self, predicted_cause: str, evidence: list[dict]) -> bool:
        if predicted_cause == "METER_MALFUNCTION":
            return True
        for item in evidence:
            feature = str(item.get("feature", "")).lower()
            value = item.get("value")
            value_text = str(value).lower()
            if "meter" not in feature:
                continue
            if any(term in feature for term in ["fault", "malfunction", "stuck", "diagnostic"]):
                return True
            if any(term in value_text for term in ["fault", "suspected_fault", "malfunction", "stuck", "failed"]):
                return True
            if isinstance(value, (int, float)) and ("health" in feature or "score" in feature) and value <= 0.4:
                return True
        return False

    def _is_large_load_outlier(self, risk_score: float, evidence: list[dict]) -> bool:
        if risk_score < 75:
            return False
        for item in evidence:
            feature = str(item.get("feature", "")).lower()
            value = item.get("value")
            if not isinstance(value, (int, float)):
                continue
            if any(term in feature for term in ["load", "energy", "demand"]) and abs(value) >= 50:
                return True
        return False

    def _risk_level_from_score(self, score: float) -> str:
        if score >= 85:
            return "CRITICAL"
        if score >= 65:
            return "HIGH"
        if score >= 45:
            return "MEDIUM"
        return "LOW"

    def _no_data(self, intent: str, answer: str) -> CopilotAnswerOut:
        return CopilotAnswerOut(
            data_available=False,
            intent=intent,
            answer=answer,
            payload={},
            suggested_next_questions=[
                "Show me the current grid status",
                "Show me the top risky consumers",
            ],
        )

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
        transformer_ids = sorted(DEFAULT_TRANSFORMERS)
        try:
            number = int(consumer_id.removeprefix("C"))
        except ValueError:
            checksum = sum(ord(char) for char in consumer_id)
            return transformer_ids[checksum % len(transformer_ids)]
        return transformer_ids[(number - 1) % len(transformer_ids)]

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
        guardrail = self._guardrail_for_prediction(anomaly)
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
            case_type=guardrail.case_type,
            raw_risk_score=guardrail.raw_risk_score,
            adjusted_risk_score=guardrail.adjusted_risk_score,
            outlier_flags=guardrail.outlier_flags,
            allocation_confidence=guardrail.allocation_confidence,
            attribution_status=guardrail.attribution_status,
            recommendation=guardrail.recommendation,
            risk_adjustment_reason=guardrail.risk_adjustment_reason,
        )

    def _to_case_out(self, case: InvestigationCase) -> InvestigationCaseOut:
        anomaly = self.db.scalar(select(AnomalyPrediction).where(AnomalyPrediction.id == case.anomaly_id))
        if anomaly is not None:
            guardrail = self._guardrail_for_prediction(anomaly)
        else:
            guardrail = self._guardrail_context(
                risk_score=case.risk_score,
                risk_level=case.priority,
                predicted_cause=case.predicted_cause,
                confidence=1.0,
                evidence=[],
            )
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
            case_type=guardrail.case_type,
            raw_risk_score=guardrail.raw_risk_score,
            adjusted_risk_score=guardrail.adjusted_risk_score,
            outlier_flags=guardrail.outlier_flags,
            allocation_confidence=guardrail.allocation_confidence,
            attribution_status=guardrail.attribution_status,
            recommendation=guardrail.recommendation,
            risk_adjustment_reason=guardrail.risk_adjustment_reason,
        )

    def _to_observation_out(self, observation: FieldObservation) -> FieldObservationOut:
        return FieldObservationOut(
            id=observation.id,
            case_id=observation.case_id,
            investigator_id=observation.investigator_id,
            source=observation.source,
            original_text=observation.original_text,
            normalized_evidence=observation.normalized_evidence or {},
            language=observation.language,
            confidence=observation.confidence,
            timestamp=observation.timestamp,
        )

    def _to_checklist_out(self, item: ChecklistItem) -> ChecklistItemOut:
        return ChecklistItemOut(
            id=item.id,
            case_id=item.case_id,
            item_id=item.item_id,
            label=item.label,
            status=item.status,
            updated_at=item.updated_at,
        )

    def _to_resolution_out(self, resolution: CaseResolution) -> CaseResolutionOut:
        return CaseResolutionOut(
            id=resolution.id,
            case_id=resolution.case_id,
            predicted_cause=resolution.predicted_cause,
            actual_outcome=resolution.actual_outcome,
            resolution_notes=resolution.resolution_notes,
            resolved_by=resolution.resolved_by,
            resolved_at=resolution.resolved_at,
        )
