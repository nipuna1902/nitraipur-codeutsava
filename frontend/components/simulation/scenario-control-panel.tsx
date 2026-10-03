"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, CloudOff, Gauge, RadioTower, ShieldAlert, Zap } from "lucide-react";

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

export function ScenarioControlPanel() {
  const [selected, setSelected] = useState(scenarios[1]);

  const payload = useMemo(
    () => ({
      scenario: selected.id,
      transformer_id: selected.id === "COORDINATED_THEFT" ? "TR-18" : "TR-06",
      target_consumers: selected.id === "COORDINATED_THEFT" ? ["C-1172", "C-1888", "C-2781"] : ["C-1172"],
      ticks: 96,
      stream_to_backend: false,
      note: "UI control is ready. Backend simulator run endpoint is the next integration step."
    }),
    [selected]
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

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {scenarios.map((scenario) => {
          const Icon = scenario.icon;
          const active = selected.id === scenario.id;
          return (
            <button
              key={scenario.id}
              type="button"
              onClick={() => setSelected(scenario)}
              className={`min-h-32 rounded-lg border p-4 text-left transition ${
                active
                  ? "border-slate-500 bg-slate-100 text-slate-950"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Icon size={20} />
              <p className="mt-3 font-semibold">{scenario.label}</p>
              <p className="mt-1 text-sm leading-5 text-slate-500">{scenario.description}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-950">Selected scenario</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{selected.label}</p>
          <p className="mt-3 text-sm leading-6 text-slate-600">{selected.description}</p>
        </div>
        <pre className="max-h-72 overflow-auto rounded-lg border border-slate-200 bg-slate-950 p-5 text-xs leading-5 text-slate-100">
          {JSON.stringify(payload, null, 2)}
        </pre>
      </div>
    </section>
  );
}
