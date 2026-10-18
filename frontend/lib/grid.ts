export type Health = "normal" | "warning" | "critical" | "unknown";
export type GridNode = { id: string; name: string; kind: "Substation" | "Feeder" | "Residential"; position: [number, number, number]; consumers: string[] };
export type Reading = { consumer_id: string; timestamp: string; voltage: number | null; current: number | null; power: number | null; energy: number; meter_status?: string; communication_status?: string; source: string };
export type Telemetry = { voltage: number | null; current: number | null; power: number | null; health: Health; timestamp: string | null };
export const COLORS: Record<Health, string> = { normal: "#34d399", warning: "#facc15", critical: "#ff4564", unknown: "#64748b" };
// Dedicated simulator IDs map to the backend's T01, T02 and T03 transformer ranges.
const north = ["C011"], east = ["C023"], south = ["C035"];
export const NODES: GridNode[] = [
  { id: "SS-01", name: "Central substation", kind: "Substation", position: [-4, 0, -2], consumers: [...north, ...east, ...south] },
  { id: "F01", name: "North feeder", kind: "Feeder", position: [0, 0, -4], consumers: [...north, ...east] },
  { id: "F02", name: "South feeder", kind: "Feeder", position: [-1, 0, 3], consumers: south },
  { id: "R-01", name: "North residential", kind: "Residential", position: [4, 0, -5], consumers: north },
  { id: "R-02", name: "East residential", kind: "Residential", position: [5, 0, 0], consumers: east },
  { id: "R-03", name: "South residential", kind: "Residential", position: [3, 0, 5], consumers: south },
];
export const EDGES = [["SS-01", "F01"], ["SS-01", "F02"], ["F01", "R-01"], ["F01", "R-02"], ["F02", "R-03"]];
// SQLite returns the backend's UTC timestamps without their timezone suffix.
export function utcTimestamp(timestamp: string): string {
  return /(?:Z|[+-]\d{2}:\d{2})$/i.test(timestamp) ? timestamp : `${timestamp}Z`;
}
export function healthOf(r: Reading): Health {
  if (r.meter_status === "FAULT" || r.communication_status === "DISCONNECTED" || (r.voltage !== null && (r.voltage < 200 || r.voltage > 260))) return "critical";
  if (r.meter_status === "SUSPECTED_FAULT" || r.communication_status === "DEGRADED" || (r.voltage !== null && (r.voltage < 216 || r.voltage > 244))) return "warning";
  if (r.voltage === null || r.meter_status === "UNKNOWN" || r.communication_status === "UNKNOWN") return "unknown";
  return "normal";
}
export function aggregate(node: GridNode, readings: Reading[], now = Date.now()): Telemetry {
  const latest = new Map<string, Reading>();
  for (const raw of readings) {
    const r = { ...raw, timestamp: utcTimestamp(raw.timestamp) };
    if (node.consumers.includes(r.consumer_id) && (!latest.has(r.consumer_id) || Date.parse(r.timestamp) > Date.parse(latest.get(r.consumer_id)!.timestamp))) latest.set(r.consumer_id, r);
  }
  const rows = [...latest.values()];
  const values = (key: "voltage" | "current" | "power") => rows.map(r => r[key]).filter((v): v is number => v !== null && Number.isFinite(v));
  const sum = (key: "voltage" | "current" | "power") => values(key).reduce((a, b) => a + b, 0);
  const states = rows.map(healthOf);
  const stale = rows.some(r => !Number.isFinite(Date.parse(r.timestamp)) || now - Date.parse(r.timestamp) > 30000);
  return { voltage: values("voltage").length ? sum("voltage") / values("voltage").length : null, current: values("current").length ? sum("current") : null, power: values("power").length ? sum("power") : null, health: rows.length < node.consumers.length || stale ? "unknown" : states.includes("critical") ? "critical" : states.includes("warning") ? "warning" : states.includes("unknown") ? "unknown" : "normal", timestamp: rows.length ? rows.map(r => r.timestamp).sort()[0] : null };
}
export function demoReadings(step: number, faults: Set<string>, timestamp = new Date().toISOString()): Reading[] {
  return NODES.filter(n => n.kind === "Residential").map((n, index) => {
    const faulted = NODES.some(parent => faults.has(parent.id) && parent.consumers.includes(n.consumers[0]));
    const voltage = faulted ? 184 : 230 + Math.sin(step / 3 + index) * 3;
    const current = faulted ? 2.4 : 18 + index * 7 + Math.sin(step / 4 + index) * 4;
    return { consumer_id: n.consumers[0], timestamp, voltage, current, power: voltage * current * .95 / 1000, energy: 0, source: "SIMULATOR" };
  });
}
