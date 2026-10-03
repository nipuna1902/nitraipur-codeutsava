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


if __name__ == "__main__":
    unittest.main()
