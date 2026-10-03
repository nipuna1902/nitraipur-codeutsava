export type DashboardSummary = {
  total_consumers: number;
  telemetry_readings: number;
  active_anomalies: number;
  high_risk_cases: number;
  active_investigations: number;
  latest_timestamp?: string | null;
};

export type Anomaly = {
  id?: string;
  consumer_id: string;
  timestamp: string;
  anomaly_score: number;
  risk_score: number;
  predicted_cause:
    | "NORMAL"
    | "THEFT_TAMPERING"
    | "METER_MALFUNCTION"
    | "COMMUNICATION_FAILURE"
    | "LEGITIMATE_ABNORMAL_CONSUMPTION"
    | "UNCERTAIN";
  confidence?: number;
  personal_deviation?: number;
  peer_deviation?: number;
  persistence_score?: number;
  meter_health_score?: number;
  communication_health_score?: number;
  transformer_loss_score?: number;
  cluster_score?: number;
  evidence?: string[];
  model_version?: string;
};

export type Consumer = {
  consumer_id: string;
  category: string;
  sanctioned_load: number;
  tariff?: string;
  transformer_id: string;
  feeder_id: string;
  area?: string;
};

export type InvestigationCase = {
  case_id?: string;
  anomaly_id?: string;
  consumer_id: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status?: string;
  assigned_to?: string | null;
  created_at?: string;
};

export type Transformer = {
  transformer_id: string;
  feeder_id: string;
  rated_capacity: number;
  energy_snapshot?: {
    timestamp?: string;
    input_energy?: number;
    consumer_energy?: number;
    expected_technical_loss?: number;
    unexplained_loss?: number;
  };
};

export type DashboardData = {
  source: "LIVE API" | "DEMO DATA";
  summary: DashboardSummary;
  anomalies: Anomaly[];
  consumers: Consumer[];
  investigations: InvestigationCase[];
  transformers: Transformer[];
};
