import { Bot, Languages, Mic2 } from "lucide-react";

export function VoiceCopilot() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-600">
          <Bot />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Investigation Copilot</p>
          <h2 className="text-xl font-semibold text-slate-950">Grounded voice workflow</h2>
        </div>
      </div>
      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-5">
        <div className="flex items-center gap-3">
          <Mic2 className="text-slate-600" />
          <p className="font-semibold text-slate-950">Ask: “Why is C-1172 high priority?”</p>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          The copilot is designed to call narrow backend tools for consumer summaries, anomaly evidence, transformer
          context, checklist updates, and field observations.
        </p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <Languages className="text-slate-600" />
          <p className="mt-3 font-semibold text-slate-950">Multilingual ready</p>
          <p className="mt-1 text-sm text-slate-500">English, Hindi, Odia, and configurable future languages.</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <Bot className="text-slate-600" />
          <p className="mt-3 font-semibold text-slate-950">No invented facts</p>
          <p className="mt-1 text-sm text-slate-500">Readings, losses, and scores stay anchored to structured data.</p>
        </div>
      </div>
    </section>
  );
}
