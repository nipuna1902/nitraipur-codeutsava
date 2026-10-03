import Link from "next/link";
import { ArrowLeft, ClipboardList, RadioTower, Route } from "lucide-react";
import { AppNavigation } from "@/components/dashboard/app-navigation";
import { ScenarioControlPanel } from "@/components/simulation/scenario-control-panel";

export default function SimulationPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-6 sm:px-8 lg:px-10">
        <AppNavigation />
        <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950">
            <ArrowLeft size={16} />
            Back to overview
          </Link>
          <div className="mt-5 flex items-start gap-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-600">
              <RadioTower />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Simulator Page</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Virtual grid scenario runner</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                This page is the planned control room for generating known scenarios, streaming telemetry-shaped payloads,
                and comparing model predictions against ground truth.
              </p>
            </div>
          </div>
        </header>

        <ScenarioControlPanel />

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <Route className="text-slate-600" />
            <h2 className="mt-4 text-xl font-semibold text-slate-950">Planned simulator flow</h2>
            <div className="mt-5 grid gap-3">
              {["Choose scenario", "Generate ground truth", "Emit telemetry", "Run Electron pipeline", "Compare prediction"].map(
                (step, index) => (
                  <div key={step} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <span className="grid size-8 place-items-center rounded-md bg-white text-sm font-semibold text-slate-700">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-700">{step}</span>
                  </div>
                )
              )}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <ClipboardList className="text-slate-600" />
            <h2 className="mt-4 text-xl font-semibold text-slate-950">Acceptance checklist</h2>
            <div className="mt-5 space-y-3 text-sm text-slate-600">
              <p>Scenario controls must use the same telemetry schema as hardware.</p>
              <p>Ground truth must be stored separately from model predictions.</p>
              <p>Evaluation must report precision, recall, F1, false positives, and latency by scenario.</p>
              <p>Live IoT can be added later without changing the investigation workflow.</p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
