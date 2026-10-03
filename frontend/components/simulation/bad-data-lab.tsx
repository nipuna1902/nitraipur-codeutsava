"use client";

import { useMemo, useState } from "react";
import { Activity, Copy, Gauge, RadioTower, ShieldAlert, WifiOff, ZapOff } from "lucide-react";

const injections = [
  {
    id: "ZERO_READING",
    label: "Zero Reading",
    icon: ZapOff,
    explanation: "Send energy and power as zero while the consumer should still be active."
  },
  {
    id: "SUDDEN_DROP",
    label: "Sudden Drop",
    icon: ShieldAlert,
    explanation: "Drop recent usage far below historical behavior."
  },
  {
    id: "SPIKE_THEN_DROP",
    label: "Spike Then Drop",
    icon: Activity,
    explanation: "Create a suspicious spike followed by a rapid fall."
  },
  {
    id: "FLATLINE",
    label: "Flatline Meter",
    icon: Gauge,
    explanation: "Repeat the same value for many intervals."
  },
  {
    id: "MISSING_PACKETS",
    label: "Missing Packets",
    icon: WifiOff,
    explanation: "Skip multiple telemetry intervals to imitate communication failure."
  },
  {
    id: "TRANSFORMER_MISMATCH",
    label: "Transformer Mismatch",
    icon: RadioTower,
    explanation: "Keep transformer input high while reported consumer energy is low."
  }
];

export function BadDataLab() {
  const [selected, setSelected] = useState(injections[1]);
  const [copied, setCopied] = useState(false);

  const payload = useMemo(
    () => ({
      injection_type: selected.id,
      consumer_id: "C-1172",
      transformer_id: "TR-18",
      timestamp: "demo-generated",
      voltage: selected.id === "MISSING_PACKETS" ? null : 229.4,
      current: selected.id === "ZERO_READING" ? 0 : 3.2,
      power: selected.id === "ZERO_READING" ? 0 : selected.id === "SUDDEN_DROP" ? 120 : 734,
      energy: selected.id === "ZERO_READING" ? 0 : selected.id === "SUDDEN_DROP" ? 2.1 : 12.8,
      communication_status: selected.id === "MISSING_PACKETS" ? "DISCONNECTED" : "CONNECTED",
      meter_status: selected.id === "FLATLINE" ? "SUSPECTED_FAULT" : "NORMAL",
      note: "This is a prototype payload preview. The backend injection endpoint is planned next."
    }),
    [selected]
  );

  async function copyPayload() {
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Controlled Failure Testing</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">Bad-data injection lab</h2>
        </div>
        <button
          type="button"
          onClick={copyPayload}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
        >
          <Copy size={16} />
          {copied ? "Copied" : "Copy Payload"}
        </button>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {injections.map((injection) => {
          const Icon = injection.icon;
          const active = selected.id === injection.id;
          return (
            <button
              key={injection.id}
              type="button"
              onClick={() => setSelected(injection)}
              className={`min-h-28 rounded-lg border p-4 text-left transition ${
                active
                  ? "border-slate-500 bg-slate-100 text-slate-950"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Icon size={20} />
              <p className="mt-3 font-semibold">{injection.label}</p>
              <p className="mt-1 text-sm leading-5 text-slate-500">{injection.explanation}</p>
            </button>
          );
        })}
      </div>

      <pre className="mt-6 max-h-80 overflow-auto rounded-lg border border-slate-200 bg-slate-950 p-5 text-xs leading-5 text-slate-100">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </section>
  );
}
