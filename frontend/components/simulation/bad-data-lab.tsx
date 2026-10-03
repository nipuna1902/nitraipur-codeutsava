"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Copy, Gauge, RadioTower, ShieldAlert, WifiOff, ZapOff } from "lucide-react";
import type { Consumer, Transformer } from "@/types/dashboard";

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

type BadDataLabProps = {
  consumers: Consumer[];
  transformers: Transformer[];
};

export function BadDataLab({ consumers, transformers }: BadDataLabProps) {
  const [selected, setSelected] = useState(injections[1]);
  const [consumerId, setConsumerId] = useState(consumers[0]?.consumer_id ?? "");
  const [transformerId, setTransformerId] = useState(transformers[0]?.transformer_id ?? "");
  const [severity, setSeverity] = useState(75);
  const [durationTicks, setDurationTicks] = useState(24);
  const [copied, setCopied] = useState(false);

  const selectedTransformer = useMemo(
    () => transformers.find((transformer) => transformer.transformer_id === transformerId),
    [transformerId, transformers]
  );
  const filteredConsumers = useMemo(
    () =>
      transformerId
        ? consumers.filter((consumer) => consumer.transformer_id === transformerId)
        : consumers,
    [consumers, transformerId]
  );

  useEffect(() => {
    if (!filteredConsumers.length) {
      setConsumerId("");
      return;
    }
    if (!filteredConsumers.some((consumer) => consumer.consumer_id === consumerId)) {
      setConsumerId(filteredConsumers[0].consumer_id);
    }
  }, [consumerId, filteredConsumers]);

  function updateTransformer(nextTransformerId: string) {
    setTransformerId(nextTransformerId);
    const nextConsumer = consumers.find((consumer) =>
      nextTransformerId ? consumer.transformer_id === nextTransformerId : true
    );
    setConsumerId(nextConsumer?.consumer_id ?? "");
  }

  const payload = useMemo(
    () => ({
      injection_type: selected.id,
      consumer_id: consumerId,
      transformer_id: transformerId,
      severity: severity / 100,
      duration_ticks: durationTicks,
      timestamp: "preview-generated",
      voltage: selected.id === "MISSING_PACKETS" ? null : 229.4,
      current: selected.id === "ZERO_READING" ? 0 : 3.2,
      power: selected.id === "ZERO_READING" ? 0 : selected.id === "SUDDEN_DROP" ? 120 : 734,
      energy: selected.id === "ZERO_READING" ? 0 : selected.id === "SUDDEN_DROP" ? 2.1 : 12.8,
      communication_status: selected.id === "MISSING_PACKETS" ? "DISCONNECTED" : "CONNECTED",
      meter_status: selected.id === "FLATLINE" ? "SUSPECTED_FAULT" : "NORMAL",
      note: "This is a prototype payload preview. The backend injection endpoint is planned next."
    }),
    [consumerId, durationTicks, selected, severity, transformerId]
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

      <div className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {["Choose fault", "Choose target", "Set severity", "Inject known data", "Run detection", "Compare result"].map(
          (step, index) => (
            <div key={step} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-500">Step {index + 1}</p>
              <p className="mt-1 text-sm font-medium text-slate-800">{step}</p>
            </div>
          )
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
        {injections.map((injection) => {
          const Icon = injection.icon;
          const active = selected.id === injection.id;
          return (
            <button
              key={injection.id}
              type="button"
              onClick={() => setSelected(injection)}
              aria-pressed={active}
              className={`min-h-28 cursor-pointer rounded-lg border p-4 text-left transition ${
                active
                  ? "border-teal-500 bg-teal-50 text-slate-950 ring-2 ring-teal-100"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
              }`}
            >
              <Icon size={20} />
              <p className="mt-3 font-semibold">{injection.label}</p>
              <p className="mt-1 text-sm leading-5 text-slate-500">{injection.explanation}</p>
            </button>
          );
        })}
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-950">Target and run settings</p>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm">
              <span className="text-slate-600">Consumer</span>
              <select
                value={consumerId}
                onChange={(event) => setConsumerId(event.target.value)}
                className="min-h-10 rounded-lg border border-slate-200 bg-white px-3"
              >
                <option value="">Select consumer</option>
                {filteredConsumers.slice(0, 80).map((consumer) => (
                  <option key={consumer.consumer_id} value={consumer.consumer_id}>
                    {consumer.consumer_id} / {consumer.transformer_id}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-slate-600">Transformer</span>
              <select
                value={transformerId}
                onChange={(event) => updateTransformer(event.target.value)}
                className="min-h-10 rounded-lg border border-slate-200 bg-white px-3"
              >
                <option value="">Select transformer</option>
                {transformers.map((transformer) => (
                  <option key={transformer.transformer_id} value={transformer.transformer_id}>
                    {transformer.transformer_id} / {transformer.feeder_id}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs leading-5 text-slate-500">
              Use live backend IDs from `/consumers` and `/transformers`; changing a fault card updates the payload preview immediately.
            </p>
            <div className="rounded-lg border border-teal-100 bg-white p-3 text-xs leading-5 text-slate-600">
              <p className="font-semibold text-slate-900">Live selection</p>
              <p>Transformer: {transformerId || "None selected"}{selectedTransformer ? ` / ${selectedTransformer.feeder_id}` : ""}</p>
              <p>Available consumers on this transformer: {filteredConsumers.length}</p>
              <p>Selected consumer: {consumerId || "None selected"}</p>
            </div>
            <label className="grid gap-2 text-sm">
              <span className="text-slate-600">Severity: {severity}%</span>
              <input type="range" min="10" max="100" value={severity} onChange={(event) => setSeverity(Number(event.target.value))} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-slate-600">Duration ticks</span>
              <input type="number" min="1" max="240" value={durationTicks} onChange={(event) => setDurationTicks(Number(event.target.value))} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3" />
            </label>
            <div className="grid gap-2 sm:grid-cols-3">
              {["Inject Known Data", "Run Detection", "Compare Result"].map((label) => (
                <button key={label} type="button" disabled className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-400">
                  {label}
                  <span className="block text-[10px] font-normal">Backend endpoint pending</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm font-semibold text-slate-950">Ground Truth</p>
          <dl className="mt-4 grid gap-2 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Injection type</dt><dd className="font-medium text-slate-900">{selected.id}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Target consumer</dt><dd className="font-medium text-slate-900">{consumerId}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Transformer</dt><dd className="font-medium text-slate-900">{transformerId}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Severity</dt><dd className="font-medium text-slate-900">{severity}%</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Duration</dt><dd className="font-medium text-slate-900">{durationTicks} ticks</dd></div>
          </dl>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm font-semibold text-slate-950">Electron Prediction</p>
          <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            Waiting for backend simulation result. This panel will show predicted cause, risk score, confidence,
            evidence, match/mismatch, false-positive/false-negative status, and detection latency.
          </div>
        </div>
      </div>

      <pre className="mt-6 max-h-80 overflow-auto rounded-lg border border-slate-200 bg-slate-950 p-5 text-xs leading-5 text-slate-100">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </section>
  );
}
