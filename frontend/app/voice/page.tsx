import Link from "next/link";
import { ArrowLeft, Mic2 } from "lucide-react";
import { AppNavigation } from "@/components/dashboard/app-navigation";
import { VoiceInvestigator } from "@/components/voice/voice-investigator";

export default function VoiceInvestigatorPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-6 sm:px-8 lg:px-10">
        <AppNavigation />

        <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"
          >
            <ArrowLeft size={16} />
            Back to overview
          </Link>
          <div className="mt-5 flex items-start gap-4">
            <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-teal-700">
              <Mic2 />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Electron</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
                Electron Voice Investigator
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Ask Electron about consumers, smart-grid telemetry, and anomaly evidence through the configured voice
                investigation agent.
              </p>
            </div>
          </div>
        </header>

        <VoiceInvestigator />
      </section>
    </main>
  );
}
