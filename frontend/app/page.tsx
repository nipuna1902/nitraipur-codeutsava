import { Activity, BrainCircuit, RadioTower, Route, ShieldAlert, Zap } from "lucide-react";
import { AnomalyChart } from "@/components/dashboard/anomaly-chart";
import { CaseQueue } from "@/components/investigation/case-queue";
import { ConsumerPanel } from "@/components/consumers/consumer-panel";
import { GridForensics } from "@/components/grid/grid-forensics";
import { StatCard } from "@/components/dashboard/stat-card";
import { VoiceCopilot } from "@/components/voice/voice-copilot";
import { getDashboardData } from "@/lib/api";

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-6 sm:px-8 lg:px-10">
        <header className="grid gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-[1.4fr_0.6fr]">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              <Zap size={14} /> ELECTRON
            </div>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              From Grid Anomaly to Field Action
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              A closed-loop grid intelligence dashboard that moves from abnormal consumption signals to transformer
              correlation, investigation priority, and grounded field guidance.
            </p>
          </div>
          <div className="grid content-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">System posture</span>
              <span className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                {data.source}
              </span>
            </div>
            <div>
              <p className="text-3xl font-semibold text-slate-950">{data.summary.active_anomalies}</p>
              <p className="text-sm text-slate-500">active anomalies under investigation</p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full w-[72%] rounded-full bg-slate-700" />
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Activity} label="Telemetry readings" value={data.summary.telemetry_readings} tone="cyan" />
          <StatCard icon={ShieldAlert} label="High-risk cases" value={data.summary.high_risk_cases} tone="rose" />
          <StatCard icon={RadioTower} label="Consumers covered" value={data.summary.total_consumers} tone="amber" />
          <StatCard icon={Route} label="Active investigations" value={data.summary.active_investigations} tone="emerald" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <AnomalyChart anomalies={data.anomalies} />
          <CaseQueue cases={data.investigations} anomalies={data.anomalies} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <ConsumerPanel consumers={data.consumers} anomalies={data.anomalies} />
          <GridForensics transformers={data.transformers} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <VoiceCopilot />
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-600">
                <BrainCircuit />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Digital Twin</p>
                <h2 className="text-xl font-semibold text-slate-950">Self-testing grid laboratory</h2>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {["Generate known scenarios", "Stream telemetry", "Compare with ground truth"].map((step, index) => (
                <div key={step} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-lg font-semibold text-slate-900">0{index + 1}</p>
                  <p className="mt-2 text-sm text-slate-600">{step}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm leading-6 text-slate-600">
              The UI is ready for simulator events and keeps generated explanations separate from the measured readings,
              model scores, and backend evidence.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}
