import type { Anomaly, Consumer, DashboardData, DashboardSummary, InvestigationCase, Transformer } from "@/types/dashboard";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    next: { revalidate: 10 }
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${path}`);
  }

  return response.json() as Promise<T>;
}

export async function getDashboardData(): Promise<DashboardData> {
  try {
    const [summary, anomalies, consumers, investigations, transformers] = await Promise.all([
      getJson<DashboardSummary>("/dashboard/summary"),
      getJson<Anomaly[]>("/anomalies?limit=12"),
      getJson<Consumer[]>("/consumers"),
      getJson<InvestigationCase[]>("/investigations?limit=8"),
      getJson<Transformer[]>("/transformers")
    ]);

    return {
      source: "LIVE API",
      summary,
      anomalies,
      consumers,
      investigations,
      transformers
    };
  } catch {
    return demoData;
  }
}

const demoAnomalies: Anomaly[] = [
  {
    id: "ANM-2048",
    consumer_id: "C-1172",
    timestamp: "2026-10-03T12:10:00Z",
    anomaly_score: 0.93,
    risk_score: 91,
    predicted_cause: "THEFT_TAMPERING",
    confidence: 0.86,
    personal_deviation: -44,
    peer_deviation: -38,
    persistence_score: 0.82,
    meter_health_score: 0.91,
    communication_health_score: 0.96,
    transformer_loss_score: 0.79,
    cluster_score: 0.72,
    evidence: ["Load dropped 44% against personal baseline", "Transformer loss rose in same interval", "Peer group stayed stable"],
    model_version: "ensemble-0.3"
  },
  {
    id: "ANM-2049",
    consumer_id: "C-0904",
    timestamp: "2026-10-03T12:20:00Z",
    anomaly_score: 0.74,
    risk_score: 68,
    predicted_cause: "METER_MALFUNCTION",
    confidence: 0.71,
    personal_deviation: -22,
    peer_deviation: -8,
    persistence_score: 0.48,
    meter_health_score: 0.33,
    communication_health_score: 0.81,
    transformer_loss_score: 0.31,
    cluster_score: 0.25,
    evidence: ["Meter health degraded", "Transformer loss correlation weak", "No nearby cluster pattern"],
    model_version: "ensemble-0.3"
  },
  {
    id: "ANM-2050",
    consumer_id: "C-1540",
    timestamp: "2026-10-03T12:30:00Z",
    anomaly_score: 0.69,
    risk_score: 56,
    predicted_cause: "COMMUNICATION_FAILURE",
    confidence: 0.66,
    personal_deviation: -18,
    peer_deviation: -12,
    persistence_score: 0.39,
    meter_health_score: 0.76,
    communication_health_score: 0.28,
    transformer_loss_score: 0.2,
    cluster_score: 0.18,
    evidence: ["Telemetry gap detected", "Communication health low", "Energy balance does not confirm theft"],
    model_version: "ensemble-0.3"
  },
  {
    id: "ANM-2051",
    consumer_id: "C-2011",
    timestamp: "2026-10-03T12:40:00Z",
    anomaly_score: 0.81,
    risk_score: 77,
    predicted_cause: "THEFT_TAMPERING",
    confidence: 0.78,
    personal_deviation: -35,
    peer_deviation: -30,
    persistence_score: 0.72,
    meter_health_score: 0.84,
    communication_health_score: 0.9,
    transformer_loss_score: 0.67,
    cluster_score: 0.61,
    evidence: ["Persistent evening drop", "Transformer unexplained loss elevated", "Neighboring consumers normal"],
    model_version: "ensemble-0.3"
  }
];

const demoData: DashboardData = {
  source: "DEMO DATA",
  summary: {
    total_consumers: 1284,
    telemetry_readings: 48216,
    active_anomalies: 42,
    high_risk_cases: 11,
    active_investigations: 8,
    latest_timestamp: "2026-10-03T12:40:00Z"
  },
  anomalies: demoAnomalies,
  consumers: [
    { consumer_id: "C-1172", category: "Residential", sanctioned_load: 4.5, tariff: "LT-Domestic", transformer_id: "TR-18", feeder_id: "FD-03", area: "Sector 7" },
    { consumer_id: "C-0904", category: "Commercial", sanctioned_load: 12, tariff: "LT-Commercial", transformer_id: "TR-11", feeder_id: "FD-02", area: "Market Road" },
    { consumer_id: "C-1540", category: "Residential", sanctioned_load: 3, tariff: "LT-Domestic", transformer_id: "TR-06", feeder_id: "FD-01", area: "Lake View" },
    { consumer_id: "C-2011", category: "Agricultural", sanctioned_load: 7.5, tariff: "Agri", transformer_id: "TR-18", feeder_id: "FD-03", area: "Periphery" }
  ],
  investigations: [
    { case_id: "CASE-82", anomaly_id: "ANM-2048", consumer_id: "C-1172", priority: "CRITICAL", status: "READY_FOR_FIELD_VISIT", assigned_to: "Team Alpha", created_at: "2026-10-03T12:15:00Z" },
    { case_id: "CASE-83", anomaly_id: "ANM-2051", consumer_id: "C-2011", priority: "HIGH", status: "EVIDENCE_REVIEW", assigned_to: "Team Beta", created_at: "2026-10-03T12:42:00Z" },
    { case_id: "CASE-84", anomaly_id: "ANM-2049", consumer_id: "C-0904", priority: "MEDIUM", status: "METER_CHECK", assigned_to: null, created_at: "2026-10-03T12:28:00Z" }
  ],
  transformers: [
    {
      transformer_id: "TR-18",
      feeder_id: "FD-03",
      rated_capacity: 250,
      energy_snapshot: {
        timestamp: "2026-10-03T12:45:00Z",
        input_energy: 1240,
        consumer_energy: 1032,
        expected_technical_loss: 62,
        unexplained_loss: 146
      }
    },
    {
      transformer_id: "TR-11",
      feeder_id: "FD-02",
      rated_capacity: 160,
      energy_snapshot: {
        timestamp: "2026-10-03T12:45:00Z",
        input_energy: 840,
        consumer_energy: 772,
        expected_technical_loss: 42,
        unexplained_loss: 26
      }
    },
    {
      transformer_id: "TR-06",
      feeder_id: "FD-01",
      rated_capacity: 100,
      energy_snapshot: {
        timestamp: "2026-10-03T12:45:00Z",
        input_energy: 540,
        consumer_energy: 510,
        expected_technical_loss: 27,
        unexplained_loss: 3
      }
    }
  ]
};
