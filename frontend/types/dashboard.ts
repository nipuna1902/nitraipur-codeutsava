// GridGuard Dashboard Data Contract
// This defines the exact shape of the API/WebSocket response.
// The frontend NEVER computes risk, theft, or anomaly decisions — only the backend does.

export type RiskLevel = 'NORMAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AlertType =
  | 'PROBABLE_THEFT_TAMPERING'
  | 'METER_MALFUNCTION'
  | 'COMMUNICATION_FAILURE'
  | 'ABNORMAL_CONSUMPTION'
  | 'SEASONAL_VARIATION'
  | 'SUSPICIOUS_TRANSFORMER_LOSS'
  | 'SUSPICIOUS_CONSUMER_CLUSTER'
  | 'LEGITIMATE_ABNORMAL_CONSUMPTION';

export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'INVESTIGATING';

export type SimulationMode =
  | 'NORMAL'
  | 'THEFT_TAMPERING'
  | 'METER_MALFUNCTION'
  | 'COMMUNICATION_FAILURE'
  | 'SEASONAL_VARIATION'
  | 'LEGITIMATE_ABNORMAL_CONSUMPTION'
  | 'COORDINATED_THEFT';

export type SimulationConnectionStatus = 'LIVE' | 'PAUSED' | 'NO_TELEMETRY' | 'RECONNECTING';

// ─── Network Summary (KPI cards) ───────────────────────────────────────────

export interface NetworkSummary {
  totalConsumers: number;
  activeConsumers: number;
  activeAnomalies: number;
  highRisk: number;
  criticalRisk: number;
  unexplainedLoss: number;
  telemetryHealth: number;
}

// ─── Network Health ────────────────────────────────────────────────────────

export interface TransformerHealth {
  total: number;
  healthy: number;
  elevatedLoss: number;
  offline: number;
}

export interface FeederHealth {
  total: number;
  healthy: number;
  suspiciousLoss: number;
  offline: number;
}

export interface CommunicationHealth {
  connected: number;
  offline: number;
  delayed: number;
  total: number;
}

export interface MeterHealth {
  healthy: number;
  suspectedMalfunction: number;
  invalidReadings: number;
  total: number;
}

export interface NetworkHealth {
  transformers: TransformerHealth;
  feeders: FeederHealth;
  communication: CommunicationHealth;
  meters: MeterHealth;
}

// ─── Alert ─────────────────────────────────────────────────────────────────

export interface Alert {
  id: string;
  entityId: string;
  entityType: 'CONSUMER' | 'TRANSFORMER' | 'FEEDER' | 'CLUSTER';
  alertType: AlertType;
  riskLevel: RiskLevel;
  anomalyScore: number;
  timestamp: string;
  explanation: string;
  status: AlertStatus;
  priority: number;
  affectedConsumers?: string[];
}

// ─── Risk Distribution ─────────────────────────────────────────────────────

export interface RiskDistribution {
  normal: number;
  low: number;
  medium: number;
  high: number;
  critical: number;
}

// ─── Consumption Trend ─────────────────────────────────────────────────────

export interface ConsumptionDataPoint {
  timestamp: string;
  consumption: number;
  baseline: number | null;
}

export interface ConsumptionTrend {
  timeRange: '24h' | '7d' | '30d';
  unit: string;
  data: ConsumptionDataPoint[];
}

// ─── Transformer / Feeder Loss ─────────────────────────────────────────────

export interface TransformerLossEntry {
  id: string;
  label: string;
  inputEnergy: number;
  consumerEnergy: number;
  technicalLoss: number;
  observedLoss: number;
  unexplainedLoss: number;
  unexplainedLossPct: number;
  riskStatus: RiskLevel;
  suspiciousConsumers: number;
  suspiciousConsumerIds: string[];
}

// ─── Inspection Priorities ─────────────────────────────────────────────────

export type ProbableCause =
  | 'PROBABLE_THEFT_TAMPERING'
  | 'METER_MALFUNCTION'
  | 'COMMUNICATION_FAILURE'
  | 'ABNORMAL_CONSUMPTION'
  | 'TRANSFORMER_UNEXPLAINED_LOSS'
  | 'COORDINATED_THEFT_CLUSTER'
  | 'SEASONAL_VARIATION'
  | 'LEGITIMATE_CHANGE';

export interface InspectionPriority {
  rank: number;
  entityId: string;
  entityType: 'CONSUMER' | 'TRANSFORMER' | 'CLUSTER';
  riskLevel: RiskLevel;
  anomalyScore: number;
  probableCause: ProbableCause;
  confidence: number;
  detectionPeriod: string;
  keyEvidence: string[];
  recommendedAction: string;
}

// ─── Simulation Status ─────────────────────────────────────────────────────

export interface SimulationStatusInfo {
  mode: SimulationMode;
  status: SimulationConnectionStatus;
  activeConsumers: number;
  readingFrequency: string;
  lastTelemetryAt: string;
  source: 'SIMULATOR' | 'CSV_UPLOAD' | 'MQTT_DEVICE_FUTURE';
}

// ─── Root Dashboard Response ───────────────────────────────────────────────

export interface DashboardData {
  networkSummary: NetworkSummary;
  networkHealth: NetworkHealth;
  alerts: Alert[];
  riskDistribution: RiskDistribution;
  consumptionTrend: ConsumptionTrend;
  transformerLosses: TransformerLossEntry[];
  inspectionPriorities: InspectionPriority[];
  simulationStatus: SimulationStatusInfo;
  lastUpdated: string;
  isMockData: boolean;
}

// ─── WebSocket message types ────────────────────────────────────────────────

export type DashboardUpdateType =
  | 'FULL_SNAPSHOT'
  | 'ANOMALY_DETECTED'
  | 'ALERT_UPDATED'
  | 'TELEMETRY_PULSE'
  | 'SIMULATION_STATUS';

export interface DashboardUpdate {
  type: DashboardUpdateType;
  payload: Partial<DashboardData>;
  timestamp: string;
}
