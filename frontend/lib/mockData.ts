/**
 * GridGuard Mock Data Service
 *
 * This module provides mock data with the exact shape that the real FastAPI/WebSocket
 * will return. Replace the fetch/WebSocket calls in useDashboard.ts to switch to live data.
 *
 * IMPORTANT: No anomaly decisions are made here. All risk levels, probable causes,
 * anomaly scores, and recommendations come from the backend (mocked here as static data
 * that simulates what the backend would send).
 */

import type {
  DashboardData,
  ConsumptionDataPoint,
  SimulationMode,
} from '@/types/dashboard';

// ── helpers ──────────────────────────────────────────────────────────────────

function isoNow(offsetMinutes = 0): string {
  return new Date(Date.now() - offsetMinutes * 60 * 1000).toISOString();
}

function generateTrendData(
  hours: number,
  baseLoad: number,
  variance: number,
  includeBaseline: boolean
): ConsumptionDataPoint[] {
  const points: ConsumptionDataPoint[] = [];
  const now = Date.now();
  const step = (hours * 60 * 60 * 1000) / 48; // 48 data points

  for (let i = 48; i >= 0; i--) {
    const t = now - i * step;
    const hourOfDay = new Date(t).getHours();
    const dayCurve = 0.6 + 0.4 * Math.sin(((hourOfDay - 6) * Math.PI) / 12);
    const noise = (Math.random() - 0.5) * variance;
    const consumption = Math.max(0, baseLoad * dayCurve + noise);
    points.push({
      timestamp: new Date(t).toISOString(),
      consumption: Math.round(consumption * 10) / 10,
      baseline: includeBaseline ? Math.round((baseLoad * dayCurve) * 10) / 10 : null,
    });
  }
  return points;
}

// ── NORMAL scenario mock ──────────────────────────────────────────────────────

export const NORMAL_DASHBOARD: DashboardData = {
  isMockData: true,
  lastUpdated: isoNow(),

  networkSummary: {
    totalConsumers: 120,
    activeConsumers: 118,
    activeAnomalies: 2,
    highRisk: 0,
    criticalRisk: 0,
    unexplainedLoss: 1.2,
    telemetryHealth: 98.3,
  },

  networkHealth: {
    transformers: { total: 10, healthy: 10, elevatedLoss: 0, offline: 0 },
    feeders: { total: 18, healthy: 18, suspiciousLoss: 0, offline: 0 },
    communication: { connected: 118, offline: 2, delayed: 0, total: 120 },
    meters: { healthy: 116, suspectedMalfunction: 0, invalidReadings: 2, total: 120 },
  },

  alerts: [
    {
      id: 'ALT-001',
      entityId: 'C019',
      entityType: 'CONSUMER',
      alertType: 'ABNORMAL_CONSUMPTION',
      riskLevel: 'LOW',
      anomalyScore: 42,
      timestamp: isoNow(45),
      explanation: 'Consumption 18% above historical baseline. Pattern consistent with new appliance installation.',
      status: 'ACTIVE',
      priority: 5,
    },
  ],

  riskDistribution: { normal: 104, low: 12, medium: 4, high: 0, critical: 0 },

  consumptionTrend: {
    timeRange: '24h',
    unit: 'kWh',
    data: generateTrendData(24, 420, 30, true),
  },

  transformerLosses: [
    {
      id: 'T01', label: 'Transformer T01',
      inputEnergy: 1520, consumerEnergy: 1420, technicalLoss: 85,
      observedLoss: 100, unexplainedLoss: 15, unexplainedLossPct: 0.99,
      riskStatus: 'NORMAL', suspiciousConsumers: 0, suspiciousConsumerIds: [],
    },
    {
      id: 'T02', label: 'Transformer T02',
      inputEnergy: 980, consumerEnergy: 924, technicalLoss: 50,
      observedLoss: 56, unexplainedLoss: 6, unexplainedLossPct: 0.61,
      riskStatus: 'NORMAL', suspiciousConsumers: 0, suspiciousConsumerIds: [],
    },
  ],

  inspectionPriorities: [],

  simulationStatus: {
    mode: 'NORMAL',
    status: 'LIVE',
    activeConsumers: 30,
    readingFrequency: '1 reading/sec',
    lastTelemetryAt: isoNow(0),
    source: 'SIMULATOR',
  },
};

// ── THEFT_TAMPERING scenario mock ─────────────────────────────────────────────

export const THEFT_DASHBOARD: DashboardData = {
  isMockData: true,
  lastUpdated: isoNow(),

  networkSummary: {
    totalConsumers: 120,
    activeConsumers: 118,
    activeAnomalies: 14,
    highRisk: 7,
    criticalRisk: 2,
    unexplainedLoss: 8.7,
    telemetryHealth: 94.2,
  },

  networkHealth: {
    transformers: { total: 10, healthy: 8, elevatedLoss: 2, offline: 0 },
    feeders: { total: 18, healthy: 17, suspiciousLoss: 1, offline: 0 },
    communication: { connected: 113, offline: 5, delayed: 2, total: 120 },
    meters: { healthy: 108, suspectedMalfunction: 3, invalidReadings: 4, total: 120 },
  },

  alerts: [
    {
      id: 'ALT-042',
      entityId: 'C042',
      entityType: 'CONSUMER',
      alertType: 'PROBABLE_THEFT_TAMPERING',
      riskLevel: 'HIGH',
      anomalyScore: 94,
      timestamp: isoNow(8),
      explanation: 'Consumption is 74% below historical baseline while communication and meter health remain normal. Pattern matches sustained energy diversion.',
      status: 'ACTIVE',
      priority: 1,
    },
    {
      id: 'ALT-078',
      entityId: 'C078',
      entityType: 'CONSUMER',
      alertType: 'PROBABLE_THEFT_TAMPERING',
      riskLevel: 'HIGH',
      anomalyScore: 89,
      timestamp: isoNow(22),
      explanation: 'Consumption dropped 68% below baseline over 5 days. No meter fault detected. Transformer loss correlation confirmed.',
      status: 'ACTIVE',
      priority: 2,
    },
    {
      id: 'ALT-T01',
      entityId: 'T01',
      entityType: 'TRANSFORMER',
      alertType: 'SUSPICIOUS_TRANSFORMER_LOSS',
      riskLevel: 'HIGH',
      anomalyScore: 84,
      timestamp: isoNow(30),
      explanation: 'Unexplained loss of 100 kWh (6.6% of input) detected. 4 suspicious consumers identified on this transformer.',
      status: 'ACTIVE',
      priority: 3,
    },
    {
      id: 'ALT-CLUSTER-T01',
      entityId: 'CLUSTER-T01',
      entityType: 'CLUSTER',
      alertType: 'SUSPICIOUS_CONSUMER_CLUSTER',
      riskLevel: 'HIGH',
      anomalyScore: 87,
      timestamp: isoNow(35),
      explanation: 'C042, C078, C033 and C101 on Transformer T01 show correlated consumption drops. Coordinated anomaly pattern detected.',
      status: 'ACTIVE',
      priority: 4,
      affectedConsumers: ['C042', 'C078', 'C033', 'C101'],
    },
    {
      id: 'ALT-055',
      entityId: 'C055',
      entityType: 'CONSUMER',
      alertType: 'COMMUNICATION_FAILURE',
      riskLevel: 'MEDIUM',
      anomalyScore: 62,
      timestamp: isoNow(55),
      explanation: 'Readings missing for 47 minutes while communication status indicates disconnection. Not classified as theft — communication failure is the identified cause.',
      status: 'ACTIVE',
      priority: 6,
    },
    {
      id: 'ALT-033',
      entityId: 'C033',
      entityType: 'CONSUMER',
      alertType: 'PROBABLE_THEFT_TAMPERING',
      riskLevel: 'CRITICAL',
      anomalyScore: 97,
      timestamp: isoNow(12),
      explanation: 'Consumption 81% below baseline for 8 consecutive days. Meter health normal. Part of suspicious cluster on T01.',
      status: 'ACTIVE',
      priority: 5,
    },
    {
      id: 'ALT-011',
      entityId: 'C011',
      entityType: 'CONSUMER',
      alertType: 'METER_MALFUNCTION',
      riskLevel: 'MEDIUM',
      anomalyScore: 71,
      timestamp: isoNow(90),
      explanation: 'Meter reporting erratic voltage readings and zero-consumption periods inconsistent with historical pattern. Probable meter fault.',
      status: 'INVESTIGATING',
      priority: 7,
    },
  ],

  riskDistribution: { normal: 78, low: 22, medium: 13, high: 5, critical: 2 },

  consumptionTrend: {
    timeRange: '24h',
    unit: 'kWh',
    data: generateTrendData(24, 380, 45, true),
  },

  transformerLosses: [
    {
      id: 'T01', label: 'Transformer T01',
      inputEnergy: 1520, consumerEnergy: 1335, technicalLoss: 85,
      observedLoss: 185, unexplainedLoss: 100, unexplainedLossPct: 6.58,
      riskStatus: 'HIGH', suspiciousConsumers: 4,
      suspiciousConsumerIds: ['C042', 'C078', 'C033', 'C101'],
    },
    {
      id: 'T03', label: 'Transformer T03',
      inputEnergy: 1140, consumerEnergy: 1052, technicalLoss: 60,
      observedLoss: 88, unexplainedLoss: 28, unexplainedLossPct: 2.46,
      riskStatus: 'MEDIUM', suspiciousConsumers: 1,
      suspiciousConsumerIds: ['C019'],
    },
    {
      id: 'T02', label: 'Transformer T02',
      inputEnergy: 980, consumerEnergy: 924, technicalLoss: 50,
      observedLoss: 56, unexplainedLoss: 6, unexplainedLossPct: 0.61,
      riskStatus: 'NORMAL', suspiciousConsumers: 0, suspiciousConsumerIds: [],
    },
    {
      id: 'T05', label: 'Transformer T05',
      inputEnergy: 870, consumerEnergy: 816, technicalLoss: 45,
      observedLoss: 54, unexplainedLoss: 9, unexplainedLossPct: 1.03,
      riskStatus: 'LOW', suspiciousConsumers: 0, suspiciousConsumerIds: [],
    },
  ],

  inspectionPriorities: [
    {
      rank: 1,
      entityId: 'C042',
      entityType: 'CONSUMER',
      riskLevel: 'HIGH',
      anomalyScore: 94,
      probableCause: 'PROBABLE_THEFT_TAMPERING',
      confidence: 91,
      detectionPeriod: '2024-01-15 to 2024-01-22',
      keyEvidence: [
        '74% consumption drop vs baseline',
        'Meter health normal — rules out malfunction',
        'Communication status healthy — rules out comm failure',
        'Correlated with T01 unexplained loss increase',
      ],
      recommendedAction: 'Schedule immediate field inspection. Verify meter seal integrity and bypass indicators.',
    },
    {
      rank: 2,
      entityId: 'C033',
      entityType: 'CONSUMER',
      riskLevel: 'CRITICAL',
      anomalyScore: 97,
      probableCause: 'PROBABLE_THEFT_TAMPERING',
      confidence: 94,
      detectionPeriod: '2024-01-14 to 2024-01-22',
      keyEvidence: [
        '81% consumption drop vs 8-day baseline',
        'Part of suspicious cluster on T01',
        'No meter or communication anomalies',
      ],
      recommendedAction: 'Priority field inspection. Coordinate with C042 and C078 inspections — possible organized ring.',
    },
    {
      rank: 3,
      entityId: 'C078',
      entityType: 'CONSUMER',
      riskLevel: 'HIGH',
      anomalyScore: 89,
      probableCause: 'PROBABLE_THEFT_TAMPERING',
      confidence: 87,
      detectionPeriod: '2024-01-16 to 2024-01-22',
      keyEvidence: [
        '68% consumption drop vs baseline',
        'No meter fault detected',
        'Transformer loss correlation confirmed',
      ],
      recommendedAction: 'Field inspection within 24 hours. Check for external bypass devices.',
    },
    {
      rank: 4,
      entityId: 'T01',
      entityType: 'TRANSFORMER',
      riskLevel: 'HIGH',
      anomalyScore: 84,
      probableCause: 'TRANSFORMER_UNEXPLAINED_LOSS',
      confidence: 84,
      detectionPeriod: '2024-01-15 to 2024-01-22',
      keyEvidence: [
        '6.6% unexplained loss (100 kWh)',
        '4 suspicious consumers identified',
        'Loss grew progressively over 7 days',
      ],
      recommendedAction: 'Inspect all 4 flagged consumers on T01. Check for shared bypass technique.',
    },
    {
      rank: 5,
      entityId: 'C011',
      entityType: 'CONSUMER',
      riskLevel: 'MEDIUM',
      anomalyScore: 71,
      probableCause: 'METER_MALFUNCTION',
      confidence: 78,
      detectionPeriod: '2024-01-20 to 2024-01-22',
      keyEvidence: [
        'Erratic voltage readings outside normal range',
        'Zero-consumption periods inconsistent with tariff category',
        'Meter health flag raised by backend',
      ],
      recommendedAction: 'Schedule meter replacement/verification. Do not assume theft — meter malfunction is the identified cause.',
    },
  ],

  simulationStatus: {
    mode: 'THEFT_TAMPERING',
    status: 'LIVE',
    activeConsumers: 30,
    readingFrequency: '1 reading/sec',
    lastTelemetryAt: isoNow(0),
    source: 'SIMULATOR',
  },
};

// ── COMMUNICATION_FAILURE scenario mock ───────────────────────────────────────

export const COMM_FAILURE_DASHBOARD: DashboardData = {
  ...THEFT_DASHBOARD,
  isMockData: true,
  lastUpdated: isoNow(),

  networkSummary: {
    totalConsumers: 120,
    activeConsumers: 110,
    activeAnomalies: 6,
    highRisk: 1,
    criticalRisk: 0,
    unexplainedLoss: 2.1,
    telemetryHealth: 72.5,
  },

  networkHealth: {
    transformers: { total: 10, healthy: 10, elevatedLoss: 0, offline: 0 },
    feeders: { total: 18, healthy: 17, suspiciousLoss: 1, offline: 0 },
    communication: { connected: 87, offline: 24, delayed: 9, total: 120 },
    meters: { healthy: 98, suspectedMalfunction: 2, invalidReadings: 6, total: 120 },
  },

  alerts: [
    {
      id: 'ALT-055',
      entityId: 'C055',
      entityType: 'CONSUMER',
      alertType: 'COMMUNICATION_FAILURE',
      riskLevel: 'MEDIUM',
      anomalyScore: 82,
      timestamp: isoNow(12),
      explanation: 'Readings missing while communication status indicates disconnection. System identifies communication failure — NOT theft.',
      status: 'ACTIVE',
      priority: 1,
    },
    {
      id: 'ALT-FEEDER-F02',
      entityId: 'F02',
      entityType: 'FEEDER',
      alertType: 'COMMUNICATION_FAILURE',
      riskLevel: 'HIGH',
      anomalyScore: 88,
      timestamp: isoNow(18),
      explanation: '24 meters on Feeder F02 simultaneously lost communication. Probable feeder-level communication fault.',
      status: 'ACTIVE',
      priority: 2,
    },
  ],

  simulationStatus: {
    mode: 'COMMUNICATION_FAILURE',
    status: 'LIVE',
    activeConsumers: 30,
    readingFrequency: '1 reading/sec',
    lastTelemetryAt: isoNow(0),
    source: 'SIMULATOR',
  },
};

// ── Scenario registry ─────────────────────────────────────────────────────────

export const MOCK_SCENARIOS: Record<SimulationMode, DashboardData> = {
  NORMAL: NORMAL_DASHBOARD,
  THEFT_TAMPERING: THEFT_DASHBOARD,
  METER_MALFUNCTION: {
    ...THEFT_DASHBOARD,
    simulationStatus: { ...THEFT_DASHBOARD.simulationStatus, mode: 'METER_MALFUNCTION' },
  },
  COMMUNICATION_FAILURE: COMM_FAILURE_DASHBOARD,
  SEASONAL_VARIATION: NORMAL_DASHBOARD,
  LEGITIMATE_ABNORMAL_CONSUMPTION: NORMAL_DASHBOARD,
  COORDINATED_THEFT: THEFT_DASHBOARD,
};

export function getMockDashboard(mode: SimulationMode = 'NORMAL'): DashboardData {
  const base = MOCK_SCENARIOS[mode] ?? NORMAL_DASHBOARD;
  // Always refresh timestamps
  return {
    ...base,
    lastUpdated: new Date().toISOString(),
    simulationStatus: {
      ...base.simulationStatus,
      lastTelemetryAt: new Date().toISOString(),
    },
  };
}
