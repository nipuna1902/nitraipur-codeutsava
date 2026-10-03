"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, CloudOff, Gauge, RadioTower, ShieldAlert, Zap } from "lucide-react";
import type { Consumer, Transformer } from "@/types/dashboard";

const scenarios = [
  {
    id: "NORMAL",
    label: "Normal",
    icon: CheckCircle2,
    description: "Stable voltage, expected power, regular reporting cadence."
  },
  {
    id: "THEFT_TAMPERING",
    label: "Inject Theft",
    icon: ShieldAlert,
    description: "Reported energy falls sharply while the assumed load remains active."
  },
  {
    id: "METER_MALFUNCTION",
    label: "Meter Fault",
    icon: Gauge,
    description: "Flatline or impossible readings from one meter."
  },
  {
    id: "COMMUNICATION_FAILURE",
    label: "Comm Failure",
    icon: CloudOff,
    description: "Missing intervals and degraded communication health."
  },
  {
    id: "SEASONAL_VARIATION",
    label: "Seasonal Shift",
    icon: Zap,
    description: "Gradual demand shift that should not become a theft accusation."
  },
  {
    id: "COORDINATED_THEFT",
    label: "Coordinated Theft",
    icon: AlertTriangle,
    description: "Multiple consumers on one transformer drop together."
  }
];

type ScenarioControlPanelProps = {
  consumers: Consumer[];
  transformers: Transformer[];
};

export function ScenarioControlPanel({ consumers, transformers }: ScenarioControlPanelProps) {
  const [selected, setSelected] = useState(scenarios[1]);
  const [transformerId, setTransformerId] = useState(transformers[0]?.transformer_id ?? "");
  const [targetConsumers, setTargetConsumers] = useState(consumers[0]?.consumer_id ?? "");

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
      setTargetConsumers("");
      return;
    }
    if (!filteredConsumers.some((consumer) => consumer.consumer_id === targetConsumers)) {
      setTargetConsumers(filteredConsumers[0].consumer_id);
    }
  }, [filteredConsumers, targetConsumers]);

  function updateTransformer(nextTransformerId: string) {
    setTransformerId(nextTransformerId);
    const nextConsumer = consumers.find((consumer) =>
      nextTransformerId ? consumer.transformer_id === nextTransformerId : true
    );
    setTargetConsumers(nextConsumer?.consumer_id ?? "");
  }

  const payload = useMemo(
    () => ({
      scenario: selected.id,
      transformer_id: transformerId,
      target_consumers: targetConsumers
        .split(",")
        .map((consumer) => consumer.trim())
        .filter(Boolean),
      ticks: 96,
      stream_to_backend: false,
      note: "UI control is ready. Backend simulator run endpoint is the next integration step."
    }),
    [selected, targetConsumers, transformerId]
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-600">
          <RadioTower />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Digital Twin</p>
          <h2 className="text-xl font-semibold text-slate-950">Scenario controls</h2>
        </div>
      </div>

      <div className="mt-6 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
        {scenarios.map((scenario) => {
          const Icon = scenario.icon;
          const active = selected.id === scenario.id;
          return (
            <button
              key={scenario.id}
              type="button"
              onClick={() => setSelected(scenario)}
              aria-pressed={active}
              className={`min-h-28 cursor-pointer rounded-lg border p-4 text-left transition ${
                active
                  ? "border-teal-500 bg-teal-50 text-slate-950 ring-2 ring-teal-100"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
              }`}
            >
              <Icon size={20} />
              <p className="mt-3 font-semibold">{scenario.label}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{scenario.description}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-950">Selected scenario</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{selected.label}</p>
          <p className="mt-3 text-sm leading-6 text-slate-600">{selected.description}</p>
          <div className="mt-5 grid gap-3">
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
            <label className="grid gap-1 text-sm">
              <span className="text-slate-600">Target consumers</span>
              <select
                value={targetConsumers}
                onChange={(event) => setTargetConsumers(event.target.value)}
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
            <div className="rounded-lg border border-teal-100 bg-white p-3 text-xs leading-5 text-slate-600">
              <p className="font-semibold text-slate-900">Live selection</p>
              <p>Transformer: {transformerId || "None selected"}{selectedTransformer ? ` / ${selectedTransformer.feeder_id}` : ""}</p>
              <p>Available consumers on this transformer: {filteredConsumers.length}</p>
              <p>Selected consumer: {targetConsumers || "None selected"}</p>
            </div>
            <p className="text-xs leading-5 text-slate-500">
              Transformer IDs come from the live backend `/transformers` route. Consumers come from `/consumers`.
            </p>
          </div>
        </div>
        <pre className="max-h-72 overflow-auto rounded-lg border border-slate-200 bg-slate-950 p-5 text-xs leading-5 text-slate-100">
          {JSON.stringify(payload, null, 2)}
        </pre>
      </div>
    </section>
  );
}
