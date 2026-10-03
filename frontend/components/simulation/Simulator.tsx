"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, ArrowUpRight, Box, Check, ChevronRight, CircleHelp, Cpu, Gauge, Layers3, Pause, Play, Radio, RotateCcw, Send, ShieldCheck, Unplug, Zap } from "lucide-react";
import { aggregate, COLORS, demoReadings, NODES, type Reading, type Telemetry } from "@/lib/grid";
const GridScene = dynamic(() => import("@/components/grid/GridScene"), { ssr: false, loading: () => <div className="grid h-full place-items-center text-sm text-slate-400">Initializing digital twin…</div> });
const format = (value: number | null, digits = 1) => value === null ? "—" : value.toFixed(digits);
export default function Simulator() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
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
  const log = (message: string) => setEvents(previous => [message, ...previous].slice(0, 4));
  useEffect(() => { if (paused) return; const timer = setInterval(() => setStep(s => s + 1), 2000); return () => clearInterval(timer); }, [paused]);
  useEffect(() => {
    if (mode !== "live" || paused) return;
    let stopped = false; let timer: ReturnType<typeof setTimeout>; const controller = new AbortController();
    setConnection("Connecting");
    async function poll() {
      try {
        const response = await fetch("/api/telemetry/readings?limit=1000", { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]), cache: "no-store" });
        if (!response.ok) throw new Error(`Backend returned ${response.status}`);
        const data: Reading[] = await response.json();
        if (!Array.isArray(data)) throw new Error("Invalid telemetry response");
        if (!stopped) { setReadings(data); setConnection(data.length ? "Connected" : "No readings yet"); }
      } catch { if (!stopped) setConnection("Backend unavailable · retrying"); }
      finally { if (!stopped) timer = setTimeout(poll, 3000); }
    }
    void poll(); return () => { stopped = true; controller.abort(); clearTimeout(timer); };
  }, [mode, paused]);
  const demo = useMemo(() => demoReadings(step, faults), [step, faults]);
  const telemetry = useMemo(() => Object.fromEntries(NODES.map(node => [node.id, aggregate(node, mode === "demo" ? demo : readings)])) as Record<string, Telemetry>, [mode, demo, readings, step]);
  const node = NODES.find(n => n.id === selected)!;
  const current = telemetry[selected];
  const critical = NODES.filter(n => telemetry[n.id].health === "critical").length;
  const normal = NODES.filter(n => telemetry[n.id].health === "normal").length;
  const toggleFault = (id: string) => { const active = faults.has(id); setFaults(previous => { const next = new Set(previous); active ? next.delete(id) : next.add(id); return next; }); log(`${id} · ${active ? "Fault injection cleared" : "Undervoltage fault injected"}`); };
  async function publish() {
    if (publishLock.current) return; publishLock.current = true; setPublishing(true); setNotice("");
    try {
      const response = await fetch("/api/telemetry/readings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ readings: demoReadings(step, faults) }), signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error(`Backend returned ${response.status}`);
      const result = await response.json(); setNotice(`${result.accepted} simulated readings saved to the backend.`); log("Snapshot published to Electron telemetry pipeline.");
    } catch (error) { setNotice(`Publish failed. ${error instanceof Error ? error.message : "Check the backend connection."}`); }
    finally { publishLock.current = false; setPublishing(false); }
  }
  return <div className="min-h-screen bg-slate-950">
    <header className="flex h-18 items-center justify-between border-b border-slate-800 px-5 lg:px-9">
      <a href="/simulator" className="flex items-center gap-3"><span className="rounded-xl bg-cyan-400 p-2 text-slate-950"><Zap size={23} fill="currentColor" /></span><span className="text-xl font-bold tracking-tight">electron<span className="text-cyan-400">.</span></span><span className="ml-4 hidden border-l border-slate-700 pl-5 text-xs text-slate-500 sm:block">GRID INTELLIGENCE PLATFORM</span></a>
      <span className="flex items-center gap-2 rounded-full border border-cyan-900 bg-cyan-950/30 px-3 py-1.5 text-[11px] text-cyan-300"><Box size={13} /> Simulation workspace</span>
    </header>
    <main className="mx-auto max-w-[1700px] px-4 py-7 md:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-5"><div><div className="mb-3 flex items-center gap-2 text-xs text-slate-500">Workspace <ChevronRight size={12} /> <span className="text-slate-300">Digital twin</span></div><h1 className="text-3xl font-semibold tracking-tight">Grid simulator<span className="ml-3 align-middle text-xs font-normal text-cyan-400">/ LAB</span></h1><p className="mt-2 text-sm text-slate-400">Explore the network. Inject a fault. See the impact.</p></div>
        <div className="flex flex-wrap gap-2"><label className="control"><Radio size={14} /><select aria-label="Telemetry source" value={mode} onChange={e => { setMode(e.target.value as "demo" | "live"); setPaused(false); setNotice(""); }} className="bg-transparent outline-none"><option value="demo">Demo simulation</option><option value="live">Backend telemetry</option></select></label><button className="control" onClick={() => setPaused(p => !p)}>{paused ? <Play size={14} /> : <Pause size={14} />}{paused ? "Resume" : "Pause"}</button></div>
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{[
        { label: "Network nodes", value: "06", detail: "1 substation · 2 feeders · 3 zones", icon: Layers3, color: "text-cyan-400" },
        { label: "Monitored load", value: `${format(telemetry["SS-01"].power)} kW`, detail: "Aggregate residential active power", icon: Activity, color: "text-cyan-400" },
        { label: "Healthy nodes", value: `${normal.toString().padStart(2, "0")} / 06`, detail: "Within normal operating range", icon: ShieldCheck, color: "text-emerald-400" },
        { label: "Critical nodes", value: critical.toString().padStart(2, "0"), detail: critical ? "Faults detected in the network" : "No critical faults detected", icon: Unplug, color: critical ? "text-rose-400" : "text-slate-400" },
      ].map(item => <div key={item.label} className="panel p-4"><div className="flex items-center justify-between"><span className="eyebrow">{item.label}</span><item.icon size={16} className={item.color} /></div><p className="my-2 text-2xl font-semibold tabular-nums">{item.value}</p><p className="text-[11px] text-slate-500">{item.detail}</p></div>)}</div>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4"><section className="panel overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 px-5 py-4"><div className="flex items-center gap-2 text-sm font-medium"><Box size={16} className="text-cyan-400" /> Network digital twin</div><span className="text-[10px] tracking-wider text-slate-400">{paused ? "PAUSED" : mode === "demo" ? "● DEMO RUNNING" : connection.toUpperCase()}</span></div>
          <div className="relative h-[390px] sm:h-[490px]"><div className="pointer-events-none absolute left-5 top-5 z-10"><p className="eyebrow">ELECTRON / DISTRIBUTION NETWORK</p><p className="mt-1 text-[11px] text-slate-500">{mode === "demo" ? "Synthetic telemetry · 2 second intervals" : "Backend telemetry · 3 second polling"}</p></div><GridScene telemetry={telemetry} selected={selected} onSelect={setSelected} resetKey={resetKey} /><button onClick={() => setResetKey(k => k + 1)} className="control absolute bottom-4 right-4"><RotateCcw size={13} /> Reset view</button></div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-5 py-3"><div className="flex gap-4 text-[10px] text-slate-400">{Object.entries(COLORS).map(([health, color]) => <span key={health} className="flex items-center gap-1.5 capitalize"><span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />{health === "unknown" ? "No / stale data" : health}</span>)}</div><span className="text-[10px] text-slate-500">Drag to orbit · Scroll to zoom · Right-drag to pan</span></div>
        </section>
        <section className="panel p-5"><div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-medium">Network inventory</h2><span className="eyebrow">Select a node to inspect</span></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{NODES.map(n => <button key={n.id} onClick={() => setSelected(n.id)} aria-pressed={selected === n.id} className={`rounded-lg border p-3 text-left transition-colors ${selected === n.id ? "border-cyan-600 bg-cyan-950/30" : "border-slate-800 hover:border-slate-600"}`}><div className="flex items-center justify-between text-xs"><span className="font-mono">{n.id}</span><span style={{ color: COLORS[telemetry[n.id].health] }}>● <span className="text-[10px] capitalize">{telemetry[n.id].health}</span></span></div><p className="mt-1 text-[11px] text-slate-400">{n.name}</p></button>)}</div></section>
        <section className="panel px-5 py-4"><h2 className="mb-3 flex items-center gap-2 text-xs font-medium"><Activity size={14} className="text-cyan-400" /> Simulation activity</h2><ul className="space-y-2 text-xs text-slate-400" aria-live="polite">{events.map((event, i) => <li key={`${event}-${i}`} className="flex gap-2"><span className={i === 0 ? "text-cyan-400" : "text-slate-600"}>↳</span>{event}</li>)}</ul></section>
        </div>
        <aside className="panel overflow-hidden"><div className="border-b border-slate-800 p-5"><h2 className="flex items-center gap-2 text-sm font-semibold"><Cpu size={17} className="text-cyan-400" /> Node Telemetry</h2><div className="mt-5 flex items-start justify-between"><div><p className="font-mono text-xs text-cyan-400">{node.id}</p><h3 className="mt-1 text-lg font-medium">{node.name}</h3><p className="mt-1 text-xs text-slate-500">{node.kind} · {node.consumers.length} monitored meter{node.consumers.length > 1 ? "s" : ""}</p></div><ArrowUpRight size={18} className="text-slate-600" /></div></div>
          <div className="space-y-5 p-5"><div><p className="eyebrow">Status Indicator</p><div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 p-3" style={{ color: COLORS[current.health] }}><span>●</span><span className="text-xs font-medium capitalize">{current.health === "unknown" ? "No recent telemetry" : `${current.health} ${current.health === "critical" ? " / Fault detected" : "operation"}`}</span></div></div>
          <div className="grid grid-cols-2 gap-3">{[{ name: "Voltage", value: format(current.voltage), unit: "V" }, { name: "Current load", value: format(current.current), unit: "A" }].map(metric => <div key={metric.name} className="rounded-lg border border-slate-800 p-3"><p className="text-[11px] text-slate-400">{metric.name}</p><p className="mt-2 text-2xl font-medium tabular-nums">{metric.value}<span className="ml-1 text-xs text-slate-500">{metric.unit}</span></p></div>)}</div>
          <div className="flex justify-between text-xs"><span className="text-slate-400">Active power</span><span className="font-mono">{format(current.power, 2)} kW</span></div><div className="flex justify-between text-xs"><span className="text-slate-400">Last sample</span><span>{mounted && current.timestamp ? new Date(current.timestamp).toLocaleTimeString() : "Awaiting data"}</span></div><p className="text-[10px] leading-relaxed text-slate-500">Voltage is the mean of downstream meter readings; current and power are sums. This is a simplified distribution model.</p>
          </div>
          <div className="border-t border-slate-800 p-5"><h2 className="flex items-center gap-2 text-sm font-semibold"><Zap size={16} className="text-amber-300" /> Simulate Anomaly</h2><p className="mt-2 text-[11px] leading-relaxed text-slate-400">Inject an undervoltage fault into a node and its downstream meters. Clear the injection to restore its baseline.</p>
            {mode === "live" ? <div className="mt-4 rounded-lg bg-cyan-950/30 p-3 text-xs leading-relaxed text-cyan-200">Viewing backend readings. Switch to Demo simulation to inject faults and publish a snapshot.<button className="control mt-3 w-full" onClick={() => setMode("demo")}>Open demo simulation <ChevronRight size={14} /></button></div> : <><div className="my-4 space-y-2">{NODES.map(n => <div key={n.id} className="flex items-center justify-between gap-2"><span className="text-xs text-slate-400">{n.id} <span className="text-slate-600">/ {n.kind}</span></span><button aria-label={`${faults.has(n.id) ? "Clear" : "Inject"} fault on ${n.id}`} aria-pressed={faults.has(n.id)} onClick={() => toggleFault(n.id)} className={`rounded-md border px-2 py-1.5 text-[10px] ${faults.has(n.id) ? "border-rose-500/50 bg-rose-500/10 text-rose-300" : "border-slate-700 text-slate-300 hover:border-rose-400"}`}>{faults.has(n.id) ? "Clear fault" : "Inject fault"}</button></div>)}</div><button className="control w-full" onClick={() => { setFaults(new Set()); log("All fault injections cleared."); }}><RotateCcw size={13} /> Clear all injections</button><button className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-400 px-3 py-3 text-xs font-semibold text-slate-950 hover:bg-cyan-300" disabled={publishing} onClick={publish}>{publishing ? <Gauge size={14} /> : <Send size={14} />}{publishing ? "Publishing…" : "Publish snapshot to backend"}</button><p className="mt-2 text-[10px] leading-relaxed text-slate-500">Saves 3 SIMULATOR readings for C011, C023 and C035. Injections remain local until published.</p></>}
            {notice && <p role="status" className="mt-3 rounded-lg border border-slate-700 p-3 text-xs text-slate-300">{notice}</p>}
          </div><div className="flex gap-2 border-t border-slate-800 bg-slate-900/40 p-4 text-[10px] leading-relaxed text-slate-400"><CircleHelp size={16} className="shrink-0 text-cyan-400" />Simulation faults are known test conditions, not ML predictions or physical grid commands.</div>
        </aside>
      </div><footer className="mt-6 flex items-center justify-between text-[10px] text-slate-600"><span>ELECTRON / DIGITAL TWIN LABORATORY</span><span className="flex items-center gap-1"><Check size={12} /> Hardware-independent simulation</span></footer>
    </main>
  </div>;
}
