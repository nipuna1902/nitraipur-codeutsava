import type { Anomaly, Consumer, DashboardData, DashboardSummary, InvestigationCase, Transformer } from "@/types/dashboard";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000";

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
      getJson<Anomaly[]>("/anomalies?limit=24"),
      getJson<Consumer[]>("/consumers"),
      getJson<InvestigationCase[]>("/investigations?limit=12"),
      getJson<Transformer[]>("/transformers")
    ]);

    const hasDisplayData = anomalies.length > 0 || consumers.length > 0 || investigations.length > 0 || transformers.length > 0;

    if (!hasDisplayData) {
      return demoData;
    }

    return {
      source: "LIVE API",
      summary,
      anomalies: anomalies.length ? anomalies : demoData.anomalies,
      consumers: consumers.length ? consumers : demoData.consumers,
      investigations: investigations.length ? investigations : demoData.investigations,
      transformers: transformers.length ? transformers : demoData.transformers
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
    case_type: "AGGREGATE_REVIEW",
    raw_risk_score: 91,
    adjusted_risk_score: 76,
    allocation_confidence: "UNKNOWN",
    attribution_status: "AGGREGATE_ONLY",
    outlier_flags: ["AGGREGATE_ATTRIBUTION", "LARGE_LOAD_OUTLIER"],
    recommendation: "High-risk aggregate anomaly. Field verification needed before attributing this anomaly to a specific building.",
    risk_adjustment_reason: "multi-building or unknown attribution; large-load aggregate row increases false-positive risk",
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
  },
  {
    id: "ANM-2052",
    consumer_id: "C-0442",
    timestamp: "2026-10-03T12:50:00Z",
    anomaly_score: 0.52,
    risk_score: 41,
    predicted_cause: "LEGITIMATE_ABNORMAL_CONSUMPTION",
    confidence: 0.62,
    personal_deviation: 28,
    peer_deviation: 12,
    persistence_score: 0.3,
    meter_health_score: 0.88,
    communication_health_score: 0.92,
    transformer_loss_score: 0.15,
    cluster_score: 0.12,
    evidence: ["Short demand spike", "Meter and communication health normal", "No transformer loss correlation"],
    model_version: "ensemble-0.3"
  },
  {
    id: "ANM-2053",
    consumer_id: "C-1888",
    timestamp: "2026-10-03T13:00:00Z",
    anomaly_score: 0.88,
    risk_score: 84,
    predicted_cause: "THEFT_TAMPERING",
    confidence: 0.81,
    personal_deviation: -39,
    peer_deviation: -33,
    persistence_score: 0.77,
    meter_health_score: 0.86,
    communication_health_score: 0.89,
    transformer_loss_score: 0.72,
    cluster_score: 0.69,
    evidence: ["Repeated low readings during high-load window", "Cluster signal present", "Transformer unexplained loss high"],
    model_version: "ensemble-0.3"
  },
  {
    id: "ANM-2054",
    consumer_id: "C-0715",
    timestamp: "2026-10-03T13:10:00Z",
    anomaly_score: 0.61,
    risk_score: 48,
    predicted_cause: "COMMUNICATION_FAILURE",
    confidence: 0.64,
    personal_deviation: -14,
    peer_deviation: -11,
    persistence_score: 0.36,
    meter_health_score: 0.8,
    communication_health_score: 0.22,
    transformer_loss_score: 0.18,
    cluster_score: 0.2,
    evidence: ["Missing interval packets", "Weak signal health", "Consumption pattern recovered later"],
    model_version: "ensemble-0.3"
  },
  {
    id: "ANM-2055",
    consumer_id: "C-1326",
    timestamp: "2026-10-03T13:20:00Z",
    anomaly_score: 0.71,
    risk_score: 63,
    predicted_cause: "METER_MALFUNCTION",
    confidence: 0.7,
    personal_deviation: -24,
    peer_deviation: -9,
    persistence_score: 0.51,
    meter_health_score: 0.29,
    communication_health_score: 0.84,
    transformer_loss_score: 0.27,
    cluster_score: 0.23,
    evidence: ["Meter diagnostic drift", "No strong neighborhood cluster", "Transformer loss low"],
    model_version: "ensemble-0.3"
  },
  {
    id: "ANM-2056",
    consumer_id: "C-2190",
    timestamp: "2026-10-03T13:30:00Z",
    anomaly_score: 0.79,
    risk_score: 72,
    predicted_cause: "UNCERTAIN",
    confidence: 0.55,
    personal_deviation: -31,
    peer_deviation: -21,
    persistence_score: 0.57,
    meter_health_score: 0.73,
    communication_health_score: 0.76,
    transformer_loss_score: 0.48,
    cluster_score: 0.42,
    evidence: ["Mixed evidence", "Moderate transformer correlation", "Needs field confirmation"],
    model_version: "ensemble-0.3"
  },
  {
    id: "ANM-2057",
    consumer_id: "C-3012",
    timestamp: "2026-10-03T13:40:00Z",
    anomaly_score: 0.47,
    risk_score: 35,
    predicted_cause: "LEGITIMATE_ABNORMAL_CONSUMPTION",
    confidence: 0.73,
    personal_deviation: 19,
    peer_deviation: 8,
    persistence_score: 0.25,
    meter_health_score: 0.9,
    communication_health_score: 0.93,
    transformer_loss_score: 0.1,
    cluster_score: 0.08,
    evidence: ["Low persistence", "No grid-loss correlation", "Likely seasonal load change"],
    model_version: "ensemble-0.3"
  },
  {
    id: "ANM-2058",
    consumer_id: "C-2781",
    timestamp: "2026-10-03T13:50:00Z",
    anomaly_score: 0.9,
    risk_score: 88,
    predicted_cause: "THEFT_TAMPERING",
    confidence: 0.83,
    personal_deviation: -42,
    peer_deviation: -36,
    persistence_score: 0.81,
    meter_health_score: 0.82,
    communication_health_score: 0.87,
    transformer_loss_score: 0.74,
    cluster_score: 0.7,
    evidence: ["Sustained load suppression", "Peer group normal", "Transformer loss elevated"],
    model_version: "ensemble-0.3"
  },
  {
    id: "ANM-2059",
    consumer_id: "C-0961",
    timestamp: "2026-10-03T14:00:00Z",
    anomaly_score: 0.66,
    risk_score: 54,
    predicted_cause: "METER_MALFUNCTION",
    confidence: 0.68,
    personal_deviation: -17,
    peer_deviation: -6,
    persistence_score: 0.43,
    meter_health_score: 0.35,
    communication_health_score: 0.79,
    transformer_loss_score: 0.24,
    cluster_score: 0.19,
    evidence: ["Meter health is weak", "Loss correlation is low", "Single consumer issue likely"],
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
    { consumer_id: "C-2011", category: "Agricultural", sanctioned_load: 7.5, tariff: "Agri", transformer_id: "TR-18", feeder_id: "FD-03", area: "Periphery" },
    { consumer_id: "C-0442", category: "Residential", sanctioned_load: 5, tariff: "LT-Domestic", transformer_id: "TR-09", feeder_id: "FD-04", area: "Civil Lines" },
    { consumer_id: "C-1888", category: "Commercial", sanctioned_load: 15, tariff: "LT-Commercial", transformer_id: "TR-18", feeder_id: "FD-03", area: "Warehouse Belt" },
    { consumer_id: "C-0715", category: "Residential", sanctioned_load: 2.5, tariff: "LT-Domestic", transformer_id: "TR-06", feeder_id: "FD-01", area: "Lake View" },
    { consumer_id: "C-1326", category: "Industrial", sanctioned_load: 35, tariff: "LT-Industrial", transformer_id: "TR-22", feeder_id: "FD-05", area: "Small Industries" },
    { consumer_id: "C-2190", category: "Residential", sanctioned_load: 6, tariff: "LT-Domestic", transformer_id: "TR-11", feeder_id: "FD-02", area: "Market Road" },
    { consumer_id: "C-3012", category: "Agricultural", sanctioned_load: 10, tariff: "Agri", transformer_id: "TR-24", feeder_id: "FD-06", area: "Canal Road" },
    { consumer_id: "C-2781", category: "Commercial", sanctioned_load: 18, tariff: "LT-Commercial", transformer_id: "TR-22", feeder_id: "FD-05", area: "Bus Stand" },
    { consumer_id: "C-0961", category: "Residential", sanctioned_load: 4, tariff: "LT-Domestic", transformer_id: "TR-09", feeder_id: "FD-04", area: "Civil Lines" }
  ],
  investigations: [
    {
      case_id: "CASE-82",
      anomaly_id: "ANM-2048",
      consumer_id: "C-1172",
      priority: "HIGH",
      status: "READY_FOR_FIELD_VISIT",
      assigned_to: "Team Alpha",
      created_at: "2026-10-03T12:15:00Z",
      risk_score: 91,
      predicted_cause: "THEFT_TAMPERING",
      case_type: "AGGREGATE_REVIEW",
      raw_risk_score: 91,
      adjusted_risk_score: 76,
      allocation_confidence: "UNKNOWN",
      attribution_status: "AGGREGATE_ONLY",
      outlier_flags: ["AGGREGATE_ATTRIBUTION", "LARGE_LOAD_OUTLIER"],
      recommendation: "High-risk aggregate anomaly. Field verification needed before attributing this anomaly to a specific building.",
      risk_adjustment_reason: "multi-building or unknown attribution; large-load aggregate row increases false-positive risk"
    },
    { case_id: "CASE-83", anomaly_id: "ANM-2051", consumer_id: "C-2011", priority: "HIGH", status: "EVIDENCE_REVIEW", assigned_to: "Team Beta", created_at: "2026-10-03T12:42:00Z" },
    { case_id: "CASE-84", anomaly_id: "ANM-2049", consumer_id: "C-0904", priority: "MEDIUM", status: "METER_CHECK", assigned_to: null, created_at: "2026-10-03T12:28:00Z" },
    { case_id: "CASE-85", anomaly_id: "ANM-2053", consumer_id: "C-1888", priority: "CRITICAL", status: "READY_FOR_FIELD_VISIT", assigned_to: "Team Gamma", created_at: "2026-10-03T13:04:00Z" },
    { case_id: "CASE-86", anomaly_id: "ANM-2058", consumer_id: "C-2781", priority: "HIGH", status: "EVIDENCE_REVIEW", assigned_to: "Team Alpha", created_at: "2026-10-03T13:52:00Z" },
    { case_id: "CASE-87", anomaly_id: "ANM-2056", consumer_id: "C-2190", priority: "MEDIUM", status: "SUPERVISOR_REVIEW", assigned_to: null, created_at: "2026-10-03T13:33:00Z" }
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
    },
    {
      transformer_id: "TR-22",
      feeder_id: "FD-05",
      rated_capacity: 315,
      energy_snapshot: {
        timestamp: "2026-10-03T12:45:00Z",
        input_energy: 1510,
        consumer_energy: 1284,
        expected_technical_loss: 75,
        unexplained_loss: 151
      }
    },
    {
      transformer_id: "TR-09",
      feeder_id: "FD-04",
      rated_capacity: 200,
      energy_snapshot: {
        timestamp: "2026-10-03T12:45:00Z",
        input_energy: 970,
        consumer_energy: 902,
        expected_technical_loss: 49,
        unexplained_loss: 19
      }
    },
    {
      transformer_id: "TR-24",
      feeder_id: "FD-06",
      rated_capacity: 100,
      energy_snapshot: {
        timestamp: "2026-10-03T12:45:00Z",
        input_energy: 480,
        consumer_energy: 444,
        expected_technical_loss: 24,
        unexplained_loss: 12
      }
    }
  ]
};
