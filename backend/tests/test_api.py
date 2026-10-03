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


if __name__ == "__main__":
    unittest.main()
