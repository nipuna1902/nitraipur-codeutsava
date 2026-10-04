import Link from "next/link";
import { Bot, DatabaseZap, GitCompareArrows, LineChart, RadioTower, Server } from "lucide-react";
import type { DashboardData } from "@/types/dashboard";

type DemoReadinessProps = {
  data: DashboardData;
};

const readyClass = "border-emerald-200 bg-emerald-50 text-emerald-800";
const waitClass = "border-amber-200 bg-amber-50 text-amber-800";

export function DemoReadiness({ data }: DemoReadinessProps) {
  const backendReady = data.source === "LIVE API";
  const sampleReady = data.summary.active_anomalies > 0 && data.anomalies.length > 0;
  const queueReady = data.summary.active_investigations > 0 || data.investigations.length > 0;
  const transformerReady = data.transformers.length > 0;
  const graphReady = data.anomalies.length > 0;
  const askReady = backendReady;

  const checks = [
    {
      label: "Backend",
      value: data.source,
      ready: backendReady,
      icon: Server
    },
    {
      label: "ML sample",
      value: `${data.summary.active_anomalies.toLocaleString()} anomalies`,
      ready: sampleReady,
      icon: DatabaseZap
    },
    {
      label: "Queue",
      value: `${data.summary.active_investigations.toLocaleString()} active cases`,
      ready: queueReady,
      icon: LineChart
    },
    {
      label: "Transformers",
      value: `${data.transformers.length.toLocaleString()} loaded`,
      ready: transformerReady,
      icon: RadioTower
    },
    {
      label: "Ask Electron",
      value: askReady ? "Grounded routes ready" : "Waiting for API",
      ready: askReady,
      icon: Bot
    },
    {
      label: "Known injection",
      value: transformerReady ? "Live IDs available" : "Waiting for IDs",
      ready: transformerReady,
      icon: GitCompareArrows
    }
  ];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Demo Readiness</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">Live workflow status</h2>
        </div>
        <span className={`rounded-md border px-3 py-1 text-xs font-medium ${backendReady && sampleReady && graphReady ? readyClass : waitClass}`}>
          {backendReady && sampleReady && graphReady ? "Ready to show" : "Needs data sync"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {checks.map((check) => {
          const Icon = check.icon;
          return (
            <div key={check.label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="rounded-md border border-slate-200 bg-white p-2 text-slate-600">
                  <Icon size={17} />
                </div>
                <span className={`rounded-md border px-2 py-1 text-xs font-medium ${check.ready ? readyClass : waitClass}`}>
                  {check.ready ? "Ready" : "Waiting"}
                </span>
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-950">{check.label}</p>
              <p className="mt-1 text-sm text-slate-600">{check.value}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/simulation" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white">
          Simulator
        </Link>
        <Link href="/dual-injection" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white">
          Known Injection
        </Link>
      </div>
    </section>
  );
}
