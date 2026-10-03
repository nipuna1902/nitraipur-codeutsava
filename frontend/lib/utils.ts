import type { RiskLevel, AlertType, ProbableCause } from '@/types/dashboard';

/** Map a RiskLevel to the Ventriloc CSS classes */
export function riskLevelClass(level: RiskLevel): string {
  switch (level) {
    case 'CRITICAL': return 'risk-critical';
    case 'HIGH':     return 'risk-high';
    case 'MEDIUM':   return 'risk-medium';
    case 'LOW':      return 'risk-low';
    default:         return 'risk-normal';
  }
}

/** Human-readable risk label */
export function riskLabel(level: RiskLevel): string {
  return level.charAt(0) + level.slice(1).toLowerCase();
}

/** Human-readable alert type label */
export function alertTypeLabel(type: AlertType): string {
  const map: Record<AlertType, string> = {
    PROBABLE_THEFT_TAMPERING: 'Probable theft/tampering',
    METER_MALFUNCTION: 'Meter malfunction',
    COMMUNICATION_FAILURE: 'Communication failure',
    ABNORMAL_CONSUMPTION: 'Abnormal consumption',
    SEASONAL_VARIATION: 'Seasonal variation',
    SUSPICIOUS_TRANSFORMER_LOSS: 'Suspicious transformer loss',
    SUSPICIOUS_CONSUMER_CLUSTER: 'Suspicious consumer cluster',
    LEGITIMATE_ABNORMAL_CONSUMPTION: 'Legitimate abnormal consumption',
  };
  return map[type] ?? type;
}

/** Human-readable probable cause label */
export function probableCauseLabel(cause: ProbableCause): string {
  const map: Record<ProbableCause, string> = {
    PROBABLE_THEFT_TAMPERING: 'Probable theft/tampering',
    METER_MALFUNCTION: 'Meter malfunction',
    COMMUNICATION_FAILURE: 'Communication failure',
    ABNORMAL_CONSUMPTION: 'Abnormal consumption',
    TRANSFORMER_UNEXPLAINED_LOSS: 'Transformer unexplained loss',
    COORDINATED_THEFT_CLUSTER: 'Coordinated theft cluster',
    SEASONAL_VARIATION: 'Seasonal variation',
    LEGITIMATE_CHANGE: 'Legitimate consumption change',
  };
  return map[cause] ?? cause;
}

/** Format a relative timestamp: "2m ago", "1h ago", etc. */
export function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Format a number with commas */
export function formatNumber(n: number): string {
  return n.toLocaleString();
}

/** Format kWh */
export function formatEnergy(kwh: number): string {
  if (kwh >= 1000) return `${(kwh / 1000).toFixed(1)} MWh`;
  return `${kwh.toLocaleString()} kWh`;
}

/** Format percentage */
export function formatPct(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`;
}

/** Map RiskLevel to a plain dot color for charts */
export function riskColor(level: RiskLevel): string {
  switch (level) {
    case 'CRITICAL': return '#dc2626';
    case 'HIGH':     return '#ff682c';
    case 'MEDIUM':   return '#816729';
    case 'LOW':      return '#828282';
    default:         return '#202020';
  }
}

/** Score color — higher score = warmer */
export function scoreColor(score: number): string {
  if (score >= 90) return '#dc2626';
  if (score >= 75) return '#ff682c';
  if (score >= 50) return '#816729';
  return '#828282';
}
