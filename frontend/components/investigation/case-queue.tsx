import { ClipboardCheck, MapPin } from "lucide-react";
import type { InvestigationCase } from "@/types/dashboard";

type CaseQueueProps = {
  cases: InvestigationCase[];
  anomalies?: unknown[];
};

const priorityClass: Record<string, string> = {
  CRITICAL: "bg-red-50 text-red-700 border-red-200",
  HIGH: "bg-amber-50 text-amber-700 border-amber-200",
  MEDIUM: "bg-blue-50 text-blue-700 border-blue-200",
  LOW: "bg-slate-50 text-slate-700 border-slate-200"
};

export function CaseQueue({ cases, anomalies }: CaseQueueProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-600">
          <ClipboardCheck />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Field Action</p>
          <h2 className="text-xl font-semibold text-slate-950">Investigation queue</h2>
        </div>
      </div>
      <div className="mt-6 space-y-3">
        {cases.length ? cases.map((item) => (
          <article key={`${item.case_id}-${item.consumer_id}`} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-950">{item.case_id ?? item.anomaly_id}</p>
                <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                  <MapPin size={14} /> Consumer {item.consumer_id}
                </p>
              </div>
              <span className={`rounded-md border px-3 py-1 text-xs font-medium ${priorityClass[item.priority ?? "LOW"]}`}>
                {item.priority ?? "LOW"}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-700">{(item.status ?? "OPEN").replaceAll("_", " ")}</span>
              <span className="text-slate-500">{item.assigned_to ?? "Unassigned"}</span>
            </div>
          </article>
        )) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <p className="font-medium text-slate-800">No investigation cases returned</p>
            <p className="mt-1 text-sm text-slate-500">Use Load ML Sample or backend case creation to populate this queue.</p>
          </div>
        )}
      </div>
    </section>
  );
}
