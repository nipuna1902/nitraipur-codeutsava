import unittest
from datetime import datetime, timezone

from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services import store


class BackendApiTest(unittest.TestCase):
    def setUp(self):
        store.reset()
        self.client = TestClient(app)

    def test_health(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_ingest_and_read_consumer_history(self):
        payload = {
            "readings": [
                {
                    "consumer_id": "C001",
                    "timestamp": datetime(2026, 10, 3, tzinfo=timezone.utc).isoformat(),
                    "voltage": 230.0,
                    "current": 4.5,
                    "power": 1.1,
                    "energy": 0.275,
                    "meter_status": "NORMAL",
                    "communication_status": "CONNECTED",
                    "source": "SIMULATOR",
                }
            ]
        }

        ingest = self.client.post("/telemetry/readings", json=payload)
        self.assertEqual(ingest.status_code, 200)
        self.assertEqual(ingest.json()["accepted"], 1)

        consumer = self.client.get("/consumers/C001")
        self.assertEqual(consumer.status_code, 200)
        self.assertEqual(consumer.json()["consumer_id"], "C001")
        self.assertEqual(consumer.json()["readings_count"], 1)

        history = self.client.get("/consumers/C001/history")
        self.assertEqual(history.status_code, 200)
        self.assertEqual(len(history.json()), 1)

    def test_missing_consumer_returns_404(self):
        response = self.client.get("/consumers/C999")
        self.assertEqual(response.status_code, 404)

    def test_dashboard_summary_starts_empty(self):
        response = self.client.get("/dashboard/summary")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["total_consumers"], 0)

    def test_default_transformers_are_created_in_database(self):
        response = self.client.get("/transformers")
        self.assertEqual(response.status_code, 200)
        transformer_ids = {item["transformer_id"] for item in response.json()}
        self.assertEqual(transformer_ids, {"T01", "T02", "T03", "T04"})

    def test_voice_session_placeholder_does_not_call_external_provider(self):
        response = self.client.post("/voice/session", json={"consumer_id": "C001", "language": "HI"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["provider"], "ELEVENLABS_FUTURE")
        self.assertEqual(response.json()["language"], "HI")

    def test_voice_consumer_summary_uses_structured_backend_data(self):
        payload = {
            "readings": [
                {
                    "consumer_id": "C001",
                    "timestamp": datetime(2026, 10, 3, tzinfo=timezone.utc).isoformat(),
                    "voltage": 230.0,
                    "current": 4.5,
                    "power": 1.1,
                    "energy": 0.275,
                    "meter_status": "NORMAL",
                    "communication_status": "CONNECTED",
                    "source": "SIMULATOR",
                }
            ]
        }
        self.client.post("/telemetry/readings", json=payload)

        response = self.client.post("/voice/tools/consumer-summary", json={"consumer_id": "C001"})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["data_available"])
        self.assertEqual(response.json()["payload"]["consumer_id"], "C001")

    def test_voice_anomaly_evidence_preserves_uncertainty_before_ml_integration(self):
        response = self.client.post("/voice/tools/anomaly-evidence", json={"consumer_id": "C001"})
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["data_available"])
        self.assertEqual(response.json()["payload"]["predicted_cause"], "UNCERTAIN")

    def test_ingest_ml_prediction_creates_anomaly_and_case(self):
        payload = {
            "model_version": "xgboost_ranker_v1",
            "production_model": "XGBoost",
            "predictions": [
                {
                    "consumer_id": "C031",
                    "risk_score": 91.0,
                    "risk_level": "CRITICAL",
                    "predicted_cause": "THEFT_TAMPERING",
                    "confidence": 0.91,
                    "anomaly_score": 0.91,
                    "model_version": "xgboost_ranker_v1",
                    "evidence": [
                        {
                            "feature": "recent_vs_hist_drop_pct",
                            "value": 60.0,
                            "direction": "supports_anomaly",
                        }
                    ],
                }
            ],
        }

        ingest = self.client.post("/ml/predictions", json=payload)
        self.assertEqual(ingest.status_code, 200)
        self.assertEqual(ingest.json()["accepted"], 1)
        self.assertEqual(ingest.json()["cases_created"], 1)

        anomalies = self.client.get("/anomalies")
        self.assertEqual(anomalies.status_code, 200)
        self.assertEqual(len(anomalies.json()), 1)
        self.assertEqual(anomalies.json()[0]["consumer_id"], "C031")
        self.assertEqual(anomalies.json()[0]["raw_risk_score"], 91.0)
        self.assertLess(anomalies.json()[0]["adjusted_risk_score"], anomalies.json()[0]["raw_risk_score"])
        self.assertEqual(anomalies.json()[0]["case_type"], "AGGREGATE_REVIEW")

        cases = self.client.get("/investigations")
        self.assertEqual(cases.status_code, 200)
        self.assertEqual(len(cases.json()), 1)
        self.assertEqual(cases.json()[0]["status"], "AI_FLAGGED")
        self.assertEqual(cases.json()[0]["allocation_confidence"], "UNKNOWN")
        self.assertEqual(cases.json()[0]["attribution_status"], "AGGREGATE_ONLY")
        self.assertIn("AGGREGATE_ATTRIBUTION", cases.json()[0]["outlier_flags"])

    def test_consumer_analysis_and_voice_use_ml_prediction(self):
        self.client.post(
            "/ml/predictions",
            json={
                "model_version": "xgboost_ranker_v1",
                "production_model": "XGBoost",
                "predictions": [
                    {
                        "consumer_id": "C044",
                        "risk_score": 72.0,
                        "risk_level": "HIGH",
                        "predicted_cause": "THEFT_TAMPERING",
                        "confidence": 0.72,
                        "anomaly_score": 0.72,
                        "model_version": "xgboost_ranker_v1",
                        "evidence": [],
                    }
                ],
            },
        )

        analysis = self.client.get("/consumers/C044/analysis")
        self.assertEqual(analysis.status_code, 200)
        self.assertTrue(analysis.json()["data_available"])
        self.assertEqual(analysis.json()["latest_anomaly"]["risk_level"], "HIGH")

        voice = self.client.post("/voice/tools/anomaly-evidence", json={"consumer_id": "C044"})
        self.assertEqual(voice.status_code, 200)
        self.assertTrue(voice.json()["data_available"])
        self.assertEqual(voice.json()["payload"]["latest_anomaly"]["predicted_cause"], "THEFT_TAMPERING")

    def test_load_ml_prediction_sample_from_evaluation_file(self):
        response = self.client.post("/ml/predictions/load-sample")
        self.assertEqual(response.status_code, 200)
        self.assertGreater(response.json()["accepted"], 0)

        summary = self.client.get("/dashboard/summary")
        self.assertEqual(summary.status_code, 200)
        self.assertGreater(summary.json()["active_anomalies"], 0)

        consumers = self.client.get("/consumers")
        self.assertEqual(consumers.status_code, 200)
        self.assertGreater(len(consumers.json()), 0)
        self.assertIn("transformer_id", consumers.json()[0])

        transformers = self.client.get("/transformers")
        self.assertEqual(transformers.status_code, 200)
        counts = {item["transformer_id"]: item["consumer_count"] for item in transformers.json()}
        self.assertTrue(all(count > 0 for count in counts.values()))

    def test_anomaly_queue_includes_total_and_returned_counts(self):
        self._create_prediction("C090", risk_level="CRITICAL", risk_score=95.0)
        self._create_prediction("C091", risk_level="HIGH", risk_score=75.0)

        queue = self.client.get("/anomalies/queue?limit=1")
        self.assertEqual(queue.status_code, 200)
        self.assertEqual(queue.json()["total"], 2)
        self.assertEqual(queue.json()["limit"], 1)
        self.assertEqual(queue.json()["returned"], 1)
        self.assertEqual(len(queue.json()["items"]), 1)

    def test_high_risk_unknown_aggregate_row_creates_aggregate_review_case(self):
        self._create_prediction("C092", risk_level="CRITICAL", risk_score=96.0)

        case = self.client.get("/investigations").json()[0]
        self.assertEqual(case["case_type"], "AGGREGATE_REVIEW")
        self.assertEqual(case["raw_risk_score"], 96.0)
        self.assertLess(case["adjusted_risk_score"], 96.0)
        self.assertEqual(case["allocation_confidence"], "UNKNOWN")
        self.assertEqual(case["attribution_status"], "AGGREGATE_ONLY")
        self.assertIn("Field verification needed", case["recommendation"])

    def test_high_confidence_single_building_case_remains_standard(self):
        self._create_prediction(
            "C093",
            risk_level="HIGH",
            risk_score=76.0,
            evidence=[
                {"feature": "allocation_confidence", "value": "HIGH", "direction": "context"},
                {"feature": "attribution_status", "value": "SINGLE_BUILDING", "direction": "context"},
                {"feature": "recent_vs_hist_drop_pct", "value": 42, "direction": "supports_anomaly"},
            ],
        )

        case = self.client.get("/investigations").json()[0]
        self.assertEqual(case["case_type"], "STANDARD")
        self.assertEqual(case["raw_risk_score"], 76.0)
        self.assertEqual(case["adjusted_risk_score"], 76.0)
        self.assertEqual(case["allocation_confidence"], "HIGH")
        self.assertEqual(case["attribution_status"], "SINGLE_BUILDING")

    def test_communication_heavy_anomaly_avoids_direct_theft_wording(self):
        self._create_prediction(
            "C094",
            risk_level="HIGH",
            risk_score=82.0,
            predicted_cause="THEFT_TAMPERING",
            evidence=[
                {"feature": "allocation_confidence", "value": "HIGH", "direction": "context"},
                {"feature": "attribution_status", "value": "SINGLE_BUILDING", "direction": "context"},
                {"feature": "communication_health_score", "value": 0.2, "direction": "supports_anomaly"},
            ],
        )

        anomaly = self.client.get("/anomalies").json()[0]
        self.assertEqual(anomaly["predicted_cause"], "THEFT_TAMPERING")
        self.assertIn("COMMUNICATION_HEAVY", anomaly["outlier_flags"])
        self.assertIn("communication health", anomaly["recommendation"])
        self.assertNotIn("Theft detected", anomaly["recommendation"])

    def test_meter_fault_like_anomaly_is_separated_from_theft_escalation(self):
        self._create_prediction(
            "C095",
            risk_level="HIGH",
            risk_score=80.0,
            predicted_cause="THEFT_TAMPERING",
            evidence=[
                {"feature": "allocation_confidence", "value": "HIGH", "direction": "context"},
                {"feature": "attribution_status", "value": "SINGLE_BUILDING", "direction": "context"},
                {"feature": "meter_health_score", "value": 0.25, "direction": "supports_anomaly"},
            ],
        )

        anomaly = self.client.get("/anomalies").json()[0]
        self.assertIn("METER_FAULT_LIKE", anomaly["outlier_flags"])
        self.assertIn("meter-fault review", anomaly["recommendation"])
        self.assertLess(anomaly["adjusted_risk_score"], anomaly["raw_risk_score"])

    def test_copilot_answers_dashboard_and_top_risk_questions(self):
        self._create_prediction("C101", risk_level="CRITICAL", risk_score=94.0)
        self._create_prediction("C102", risk_level="HIGH", risk_score=74.0)

        dashboard = self.client.post("/copilot/ask", json={"question": "What is the current grid status?"})
        self.assertEqual(dashboard.status_code, 200)
        self.assertTrue(dashboard.json()["data_available"])
        self.assertEqual(dashboard.json()["intent"], "dashboard_summary")

        top = self.client.post("/copilot/ask", json={"question": "Show me the top risky consumers", "limit": 1})
        self.assertEqual(top.status_code, 200)
        self.assertTrue(top.json()["data_available"])
        self.assertEqual(top.json()["intent"], "top_risky_consumers")
        self.assertEqual(top.json()["payload"]["returned"], 1)

    def test_copilot_answers_investigation_queue_without_selected_consumer(self):
        self._create_prediction("C105", risk_level="CRITICAL", risk_score=96.0)
        self._create_prediction("C106", risk_level="HIGH", risk_score=79.0)

        response = self.client.post(
            "/copilot/ask",
            json={"question": "Why is the investigation queue so long?", "limit": 5},
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["data_available"])
        self.assertEqual(response.json()["intent"], "investigation_queue_summary")
        self.assertIn("active investigations", response.json()["answer"])
        self.assertEqual(len(response.json()["payload"]["cases"]), 2)

    def test_copilot_answers_consumer_case_and_transformer_questions(self):
        self._create_prediction("C111", risk_level="CRITICAL", risk_score=93.0)
        case_id = self.client.get("/investigations").json()[0]["case_id"]

        consumer = self.client.post(
            "/copilot/ask",
            json={"question": "Why was this consumer flagged?", "consumer_id": "C111"},
        )
        self.assertEqual(consumer.status_code, 200)
        self.assertTrue(consumer.json()["data_available"])
        self.assertEqual(consumer.json()["intent"], "consumer_analysis")

        checklist = self.client.post(
            "/copilot/ask",
            json={"question": "What should the field team inspect?", "case_id": case_id},
        )
        self.assertEqual(checklist.status_code, 200)
        self.assertTrue(checklist.json()["data_available"])
        self.assertEqual(checklist.json()["intent"], "case_checklist")

        transformer = self.client.post(
            "/copilot/ask",
            json={"question": "Give transformer summary", "transformer_id": "T01"},
        )
        self.assertEqual(transformer.status_code, 200)
        self.assertTrue(transformer.json()["data_available"])
        self.assertEqual(transformer.json()["intent"], "transformer_summary")

    def test_copilot_returns_no_data_for_missing_identifiers(self):
        response = self.client.post(
            "/copilot/ask",
            json={"question": "Why was this consumer flagged?", "consumer_id": "MISSING"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["data_available"])
        self.assertEqual(response.json()["intent"], "consumer_analysis")

    def test_simulation_compare_returns_detection_conclusion(self):
        response = self.client.post(
            "/simulation/compare",
            json={
                "injection_type": "MISSING_PACKETS",
                "consumer_id": "C011",
                "transformer_id": "T01",
                "severity": 0.75,
                "duration_ticks": 24,
                "ground_truth": {
                    "expected_cause": "COMMUNICATION_FAILURE",
                    "known_injection": True,
                },
                "changed_fields": [
                    {"field": "communication_status", "before": "CONNECTED", "after": "DISCONNECTED"}
                ],
            },
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], "COMPLETED")
        self.assertEqual(body["model_output"]["predicted_cause"], "COMMUNICATION_FAILURE")
        self.assertTrue(body["comparison"]["matches_ground_truth"])
        self.assertIn("matches", body["conclusion"])

    def test_investigation_lifecycle_persists_updates(self):
        self._create_prediction("C077", risk_level="CRITICAL", risk_score=93.0)
        cases = self.client.get("/investigations").json()
        case_id = cases[0]["case_id"]

        detail = self.client.get(f"/investigations/{case_id}")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.json()["case"]["case_id"], case_id)
        self.assertGreaterEqual(len(detail.json()["checklist"]), 7)
        self.assertEqual(detail.json()["resolution"], None)

        status_update = self.client.patch(
            f"/investigations/{case_id}",
            json={"status": "INSPECTION_PENDING"},
        )
        self.assertEqual(status_update.status_code, 200)
        self.assertEqual(status_update.json()["status"], "INSPECTION_PENDING")

        observation = self.client.post(
            f"/investigations/{case_id}/observations",
            json={
                "investigator_id": "FIELD_01",
                "source": "TEXT",
                "original_text": "Seal intact but connected load is higher than declared.",
                "normalized_evidence": {"seal_status": "INTACT", "load_mismatch": True},
                "language": "EN",
                "confidence": 0.9,
            },
        )
        self.assertEqual(observation.status_code, 200)
        self.assertEqual(observation.json()["normalized_evidence"]["load_mismatch"], True)

        checklist = self.client.patch(
            f"/investigations/{case_id}/checklist",
            json={"item_id": "seal_inspected", "status": "DONE"},
        )
        self.assertEqual(checklist.status_code, 200)
        self.assertEqual(checklist.json()["status"], "DONE")

        resolution = self.client.post(
            f"/investigations/{case_id}/resolve",
            json={
                "actual_outcome": "METER_MALFUNCTION",
                "resolution_notes": "Meter display intermittently failed during site visit.",
                "resolved_by": "FIELD_01",
            },
        )
        self.assertEqual(resolution.status_code, 200)
        self.assertEqual(resolution.json()["predicted_cause"], "THEFT_TAMPERING")
        self.assertEqual(resolution.json()["actual_outcome"], "METER_MALFUNCTION")

        final_detail = self.client.get(f"/investigations/{case_id}").json()
        self.assertEqual(final_detail["case"]["status"], "RESOLVED")
        self.assertEqual(len(final_detail["observations"]), 1)
        self.assertEqual(final_detail["resolution"]["actual_outcome"], "METER_MALFUNCTION")

        summary = self.client.get("/dashboard/summary").json()
        self.assertEqual(summary["active_investigations"], 0)

    def test_voice_tools_write_to_investigation_case(self):
        self._create_prediction("C088", risk_level="HIGH", risk_score=78.0)
        case_id = self.client.get("/investigations").json()[0]["case_id"]

        voice_observation = self.client.post(
            "/voice/tools/field-observation",
            json={
                "case_id": case_id,
                "observation": "Bypass wire found near meter terminal.",
                "language": "EN",
                "source": "VOICE",
            },
        )
        self.assertEqual(voice_observation.status_code, 200)
        self.assertTrue(voice_observation.json()["data_available"])

        voice_checklist = self.client.post(
            "/voice/tools/checklist-update",
            json={"case_id": case_id, "item_id": "bypass_checked", "status": "DONE"},
        )
        self.assertEqual(voice_checklist.status_code, 200)
        self.assertTrue(voice_checklist.json()["data_available"])

        detail = self.client.get(f"/investigations/{case_id}").json()
        self.assertEqual(len(detail["observations"]), 1)
        bypass = [item for item in detail["checklist"] if item["item_id"] == "bypass_checked"][0]
        self.assertEqual(bypass["status"], "DONE")

    def _create_prediction(
        self,
        consumer_id: str,
        risk_level: str = "CRITICAL",
        risk_score: float = 91.0,
        predicted_cause: str = "THEFT_TAMPERING",
        evidence: list[dict] | None = None,
    ):
        return self.client.post(
            "/ml/predictions",
            json={
                "model_version": "xgboost_ranker_v1",
                "production_model": "XGBoost",
                "predictions": [
                    {
                        "consumer_id": consumer_id,
                        "risk_score": risk_score,
                        "risk_level": risk_level,
                        "predicted_cause": predicted_cause,
                        "confidence": risk_score / 100.0,
                        "anomaly_score": risk_score / 100.0,
                        "model_version": "xgboost_ranker_v1",
                        "evidence": evidence if evidence is not None else [
                            {
                                "feature": "recent_vs_hist_drop_pct",
                                "value": 60,
                                "direction": "supports_anomaly",
                            }
                        ],
                    }
                ],
            },
        )


if __name__ == "__main__":
    unittest.main()
