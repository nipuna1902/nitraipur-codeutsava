import assert from "node:assert/strict";
import test from "node:test";
import { aggregate, demoHistoryReadings, demoReadings, healthOf, NODES, utcTimestamp } from "./grid";
test("SQLite timestamps preserve UTC when the backend omits the timezone", () => {
  const timestamp = new Date().toISOString();
  const rows = demoReadings(0, new Set(["F01"]), timestamp.replace("Z", ""));
  assert.equal(aggregate(NODES[0], rows).health, "critical");
  assert.equal(aggregate(NODES[0], rows).timestamp, timestamp);
  assert.equal(utcTimestamp("2026-10-03T12:00:00+05:30"), "2026-10-03T12:00:00+05:30");
});
test("feeder injection affects only downstream residential meters", () => {
  const rows = demoReadings(0, new Set(["F01"]));
  assert.deepEqual(rows.map(healthOf), ["critical", "critical", "normal"]);
  assert.equal(aggregate(NODES[0], rows).health, "critical");
  assert.equal(aggregate(NODES[2], rows).health, "normal");
});
test("clearing an individual injection preserves its upstream fault", () => {
  const faults = new Set(["SS-01", "R-01"]); faults.delete("R-01");
  assert.ok(demoReadings(0, faults).every(r => healthOf(r) === "critical"));
  assert.ok(demoReadings(0, new Set()).every(r => healthOf(r) === "normal"));
});
test("aggregation selects newest readings regardless of response order", () => {
  const old = demoReadings(0, new Set(["SS-01"]), "2020-01-01T00:00:00Z");
  const rows = demoReadings(0, new Set());
  const result = aggregate(NODES[0], [...rows, ...old]);
  assert.equal(result.health, "normal");
  assert.equal(result.current, rows.reduce((sum, r) => sum + r.current!, 0));
});
test("missing, partial, null and stale data are never reported healthy", () => {
  assert.equal(aggregate(NODES[0], []).health, "unknown");
  assert.equal(aggregate(NODES[0], demoReadings(0, new Set()).slice(0, 1)).health, "unknown");
  assert.equal(aggregate(NODES[0], demoReadings(0, new Set(), "2020-01-01T00:00:00Z")).health, "unknown");
  assert.equal(healthOf({ ...demoReadings(0, new Set())[0], voltage: null }), "unknown");
});
test("warning thresholds and snapshot contract", () => {
  const rows = demoReadings(4, new Set());
  assert.equal(healthOf({ ...rows[0], voltage: 210 }), "warning");
  assert.equal(healthOf({ ...rows[0], communication_status: "DISCONNECTED" }), "critical");
  assert.ok(rows.every(r => r.source === "SIMULATOR" && r.energy >= 0 && Number.isFinite(Date.parse(r.timestamp))));
});
test("published simulator history contains raw telemetry without meter diagnosis", () => {
  const rows = demoHistoryReadings(0, new Set(["F01"]));
  assert.equal(rows.length, 135);
  assert.ok(rows.every(row => !("meter_status" in row)));
  assert.equal(rows.filter(row => row.consumer_id === "C011" && row.energy === 0).length, 30);
});
