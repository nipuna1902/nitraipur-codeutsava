import Link from "next/link";
import { ArrowLeft, GitCompareArrows, ShieldCheck } from "lucide-react";
import { AppNavigation } from "@/components/dashboard/app-navigation";
import { BadDataLab } from "@/components/simulation/bad-data-lab";
import { getDashboardData } from "@/lib/api";

export default async function DualInjectionPage() {
  const data = await getDashboardData();

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
              <GitCompareArrows />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Dual / Bad-Data Lab</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Known wrong-data injection</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                This page is for testing Electron with deliberately incorrect telemetry. It helps us prove that the
                system separates theft-like behavior, meter faults, and communication failures.
              </p>
            </div>
          </div>
        </header>

        <BadDataLab consumers={data.consumers} transformers={data.transformers} />

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-600">
              <ShieldCheck />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Validation Guardrail</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">Known truth stays separate from prediction</h2>
              <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
                The injected fault label is the test truth. The ML prediction is the model output. We should present both
                to judges because this is how Electron becomes a self-testing decision-support system.
              </p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
