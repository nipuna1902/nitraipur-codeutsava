"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Box,
  Check,
  ChevronRight,
  CircleHelp,
  Cpu,
  Gauge,
  Layers3,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Send,
  ShieldCheck,
  Unplug,
  Zap
} from "lucide-react";
import { aggregate, COLORS, demoReadings, NODES, type Reading, type Telemetry } from "@/lib/grid";

const GridScene = dynamic(() => import("@/components/grid/GridScene"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-slate-500">Initializing digital twin...</div>
});

const format = (value: number | null, digits = 1) => (value === null ? "n/a" : value.toFixed(digits));

function StatusDot({ color }: { color: string }) {
  return <span className="inline-block size-2 rounded-full align-middle" style={{ backgroundColor: color }} />;
}

export default function Simulator() {
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState("SS-01");
  const [mode, setMode] = useState<"demo" | "live">("demo");
  const [faults, setFaults] = useState<Set<string>>(new Set());
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [connection, setConnection] = useState("Connecting");
  const [resetKey, setResetKey] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState("");
  const [events, setEvents] = useState<string[]>(["Digital twin initialized. Select a node to inspect its telemetry."]);
  const publishLock = useRef(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => setStep((current) => current + 1), 2000);
    return () => clearInterval(timer);
  }, [paused]);

  useEffect(() => {
    if (mode !== "live" || paused) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();

    setConnection("Connecting");

    async function poll() {
      try {
        const response = await fetch("/api/telemetry/readings?limit=1000", {
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]),
          cache: "no-store"
        });
        if (!response.ok) throw new Error(`Backend returned ${response.status}`);
        const data: Reading[] = await response.json();
        if (!Array.isArray(data)) throw new Error("Invalid telemetry response");
        if (!stopped) {
          setReadings(data);
          setConnection(data.length ? "Connected" : "No readings yet");
        }
      } catch {
        if (!stopped) setConnection("Backend unavailable - retrying");
      } finally {
        if (!stopped) timer = setTimeout(poll, 3000);
      }
    }

    void poll();
    return () => {
      stopped = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [mode, paused]);

  const log = (message: string) => setEvents((previous) => [message, ...previous].slice(0, 4));
  const demo = useMemo(() => demoReadings(step, faults), [step, faults]);
  const telemetry = useMemo(
    () => Object.fromEntries(NODES.map((node) => [node.id, aggregate(node, mode === "demo" ? demo : readings)])) as Record<string, Telemetry>,
    [mode, demo, readings]
  );
  const node = NODES.find((item) => item.id === selected)!;
  const current = telemetry[selected];
  const critical = NODES.filter((item) => telemetry[item.id].health === "critical").length;
  const normal = NODES.filter((item) => telemetry[item.id].health === "normal").length;

  function toggleFault(id: string) {
    const active = faults.has(id);
    setFaults((previous) => {
      const next = new Set(previous);
      if (active) next.delete(id);
      else next.add(id);
      return next;
    });
    log(`${id} - ${active ? "Fault injection cleared" : "Undervoltage fault injected"}`);
  }

  async function publish() {
    if (publishLock.current) return;
    publishLock.current = true;
    setPublishing(true);
    setNotice("");

    try {
      const response = await fetch("/api/telemetry/readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readings: demoReadings(step, faults) }),
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) throw new Error(`Backend returned ${response.status}`);
      const result = await response.json();
      setNotice(`${result.accepted} simulated readings saved to the backend.`);
      log("Snapshot published to Electron telemetry pipeline.");
    } catch (error) {
      setNotice(`Publish failed. ${error instanceof Error ? error.message : "Check the backend connection."}`);
    } finally {
      publishLock.current = false;
      setPublishing(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="flex min-h-18 items-center justify-between border-b border-slate-200 bg-white px-5 shadow-sm lg:px-9">
        <a href="/" className="flex items-center gap-3">
          <span className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-700">
            <Zap size={23} fill="currentColor" />
          </span>
          <span className="text-xl font-bold tracking-tight">
            electron<span className="text-teal-700">.</span>
          </span>
          <span className="ml-4 hidden border-l border-slate-200 pl-5 text-xs text-slate-500 sm:block">GRID INTELLIGENCE PLATFORM</span>
        </a>
        <span className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-600">
          <Box size={13} /> Simulation workspace
        </span>
      </header>

      <main className="mx-auto max-w-[1700px] px-4 py-7 md:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
              Workspace <ChevronRight size={12} /> <span className="text-slate-700">Digital twin</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              Grid simulator<span className="ml-3 align-middle text-xs font-normal text-teal-700">/ LAB</span>
            </h1>
            <p className="mt-2 text-sm text-slate-600">Explore the network, inject a fault, and see the impact.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="control">
              <Radio size={14} />
              <select
                aria-label="Telemetry source"
                value={mode}
                onChange={(event) => {
                  setMode(event.target.value as "demo" | "live");
                  setPaused(false);
                  setNotice("");
                }}
                className="bg-transparent outline-none"
              >
                <option value="demo">Demo simulation</option>
                <option value="live">Backend telemetry</option>
              </select>
            </label>
            <button className="control" onClick={() => setPaused((value) => !value)}>
              {paused ? <Play size={14} /> : <Pause size={14} />}
              {paused ? "Resume" : "Pause"}
            </button>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Network nodes", value: "06", detail: "1 substation, 2 feeders, 3 zones", icon: Layers3, color: "text-teal-700" },
            { label: "Monitored load", value: `${format(telemetry["SS-01"].power)} kW`, detail: "Aggregate residential active power", icon: Activity, color: "text-teal-700" },
            { label: "Healthy nodes", value: `${normal.toString().padStart(2, "0")} / 06`, detail: "Within normal operating range", icon: ShieldCheck, color: "text-emerald-600" },
            { label: "Critical nodes", value: critical.toString().padStart(2, "0"), detail: critical ? "Faults detected in the network" : "No critical faults detected", icon: Unplug, color: critical ? "text-rose-600" : "text-slate-500" }
          ].map((item) => (
            <div key={item.label} className="panel p-4">
              <div className="flex items-center justify-between">
                <span className="eyebrow">{item.label}</span>
                <item.icon size={16} className={item.color} />
              </div>
              <p className="my-2 text-2xl font-semibold tabular-nums text-slate-950">{item.value}</p>
              <p className="text-[11px] text-slate-500">{item.detail}</p>
            </div>
          ))}
        </div>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-4">
            <section className="panel overflow-hidden">
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-5 py-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                  <Box size={16} className="text-teal-700" /> Network digital twin
                </div>
                <span className="text-[10px] font-medium tracking-wider text-slate-500">
                  {paused ? "PAUSED" : mode === "demo" ? "DEMO RUNNING" : connection.toUpperCase()}
                </span>
              </div>
              <div className="relative h-[390px] sm:h-[490px]">
                <div className="pointer-events-none absolute left-5 top-5 z-10">
                  <p className="eyebrow">ELECTRON / DISTRIBUTION NETWORK</p>
                  <p className="mt-1 text-[11px] text-slate-500">{mode === "demo" ? "Synthetic telemetry - 2 second intervals" : "Backend telemetry - 3 second polling"}</p>
                </div>
                <GridScene telemetry={telemetry} selected={selected} onSelect={setSelected} resetKey={resetKey} />
                <button onClick={() => setResetKey((key) => key + 1)} className="control absolute bottom-4 right-4">
                  <RotateCcw size={13} /> Reset view
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3">
                <div className="flex flex-wrap gap-4 text-[10px] text-slate-500">
                  {Object.entries(COLORS).map(([health, color]) => (
                    <span key={health} className="flex items-center gap-1.5 capitalize">
                      <StatusDot color={color} />
                      {health === "unknown" ? "No / stale data" : health}
                    </span>
                  ))}
                </div>
                <span className="text-[10px] text-slate-500">Drag to orbit - Scroll to zoom - Right-drag to pan</span>
              </div>
            </section>

            <section className="panel p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-medium text-slate-900">Network inventory</h2>
                <span className="eyebrow">Select a node to inspect</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {NODES.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelected(item.id)}
                    aria-pressed={selected === item.id}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      selected === item.id ? "border-teal-500 bg-teal-50" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-mono text-slate-800">{item.id}</span>
                      <span className="inline-flex items-center gap-1.5 text-[10px] capitalize text-slate-500">
                        <StatusDot color={COLORS[telemetry[item.id].health]} />
                        {telemetry[item.id].health}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">{item.name}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="panel px-5 py-4">
              <h2 className="mb-3 flex items-center gap-2 text-xs font-medium text-slate-900">
                <Activity size={14} className="text-teal-700" /> Simulation activity
              </h2>
              <ul className="space-y-2 text-xs text-slate-500" aria-live="polite">
                {events.map((event, index) => (
                  <li key={`${event}-${index}`} className="flex gap-2">
                    <span className={index === 0 ? "text-teal-700" : "text-slate-400"}>-</span>
                    {event}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="panel overflow-hidden">
            <div className="border-b border-slate-200 p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Cpu size={17} className="text-teal-700" /> Node Telemetry
              </h2>
              <div className="mt-5 flex items-start justify-between">
                <div>
                  <p className="font-mono text-xs text-teal-700">{node.id}</p>
                  <h3 className="mt-1 text-lg font-medium text-slate-950">{node.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">{node.kind} / {node.consumers.length} monitored meter{node.consumers.length > 1 ? "s" : ""}</p>
                </div>
                <ArrowUpRight size={18} className="text-slate-400" />
              </div>
            </div>

            <div className="space-y-5 p-5">
              <div>
                <p className="eyebrow">Status Indicator</p>
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3" style={{ color: COLORS[current.health] }}>
                  <StatusDot color={COLORS[current.health]} />
                  <span className="text-xs font-medium capitalize">{current.health === "unknown" ? "No recent telemetry" : `${current.health} ${current.health === "critical" ? " / Fault detected" : "operation"}`}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: "Voltage", value: format(current.voltage), unit: "V" },
                  { name: "Current load", value: format(current.current), unit: "A" }
                ].map((metric) => (
                  <div key={metric.name} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] text-slate-500">{metric.name}</p>
                    <p className="mt-2 text-2xl font-medium tabular-nums text-slate-950">
                      {metric.value}<span className="ml-1 text-xs text-slate-500">{metric.unit}</span>
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Active power</span>
                <span className="font-mono text-slate-800">{format(current.power, 2)} kW</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Last sample</span>
                <span className="text-slate-800">{mounted && current.timestamp ? new Date(current.timestamp).toLocaleTimeString() : "Awaiting data"}</span>
              </div>
              <p className="text-[10px] leading-relaxed text-slate-500">Voltage is the mean of downstream meter readings; current and power are sums. This is a simplified distribution model.</p>
            </div>

            <div className="border-t border-slate-200 p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Zap size={16} className="text-amber-500" /> Simulate Anomaly
              </h2>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">Inject an undervoltage fault into a node and its downstream meters. Clear the injection to restore its baseline.</p>
              {mode === "live" ? (
                <div className="mt-4 rounded-lg border border-teal-100 bg-teal-50 p-3 text-xs leading-relaxed text-teal-800">
                  Viewing backend readings. Switch to Demo simulation to inject faults and publish a snapshot.
                  <button className="control mt-3 w-full" onClick={() => setMode("demo")}>
                    Open demo simulation <ChevronRight size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="my-4 space-y-2">
                    {NODES.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-500">{item.id} <span className="text-slate-400">/ {item.kind}</span></span>
                        <button
                          aria-label={`${faults.has(item.id) ? "Clear" : "Inject"} fault on ${item.id}`}
                          aria-pressed={faults.has(item.id)}
                          onClick={() => toggleFault(item.id)}
                          className={`rounded-md border px-2 py-1.5 text-[10px] ${
                            faults.has(item.id) ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 text-slate-600 hover:border-rose-300"
                          }`}
                        >
                          {faults.has(item.id) ? "Clear fault" : "Inject fault"}
                        </button>
                      </div>
                    ))}
                  </div>
                  <button className="control w-full" onClick={() => { setFaults(new Set()); log("All fault injections cleared."); }}>
                    <RotateCcw size={13} /> Clear all injections
                  </button>
                  <button
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-3 text-xs font-semibold text-white hover:bg-slate-800"
                    disabled={publishing}
                    onClick={publish}
                  >
                    {publishing ? <Gauge size={14} /> : <Send size={14} />}
                    {publishing ? "Publishing..." : "Publish snapshot to backend"}
                  </button>
                  <p className="mt-2 text-[10px] leading-relaxed text-slate-500">Saves 3 SIMULATOR readings for C011, C023 and C035. Injections remain local until published.</p>
                </>
              )}
              {notice ? <p role="status" className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">{notice}</p> : null}
            </div>
            <div className="flex gap-2 border-t border-slate-200 bg-slate-50 p-4 text-[10px] leading-relaxed text-slate-500">
              <CircleHelp size={16} className="shrink-0 text-teal-700" />
              Simulation faults are known test conditions, not ML predictions or physical grid commands.
            </div>
          </aside>
        </div>

        <footer className="mt-6 flex items-center justify-between text-[10px] text-slate-500">
          <span>ELECTRON / DIGITAL TWIN LABORATORY</span>
          <span className="flex items-center gap-1"><Check size={12} /> Hardware-independent simulation</span>
        </footer>
      </main>
    </div>
  );
}
