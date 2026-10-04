import { AlertTriangle, ClipboardList, Radio, Wrench } from "lucide-react";
import type { Anomaly, InvestigationCase } from "@/types/dashboard";

type AnomalyReviewBoardProps = {
  anomalies: Anomaly[];
  cases: InvestigationCase[];
};

type FilterId = "ALL" | "AGGREGATE_REVIEW" | "THEFT_TAMPERING" | "METER_MALFUNCTION" | "COMMUNICATION_FAILURE";

const filters: Array<{ id: FilterId; label: string }> = [
  { id: "ALL", label: "All anomalies" },
  { id: "AGGREGATE_REVIEW", label: "Aggregate review" },
  { id: "THEFT_TAMPERING", label: "Theft/tampering" },
  { id: "METER_MALFUNCTION", label: "Meter fault" },
  { id: "COMMUNICATION_FAILURE", label: "Communication" }
];

const causeIcon = {
  THEFT_TAMPERING: AlertTriangle,
  METER_MALFUNCTION: Wrench,
  COMMUNICATION_FAILURE: Radio,
  LEGITIMATE_ABNORMAL_CONSUMPTION: ClipboardList,
  NORMAL: ClipboardList,
  UNCERTAIN: ClipboardList
};

function scoreLabel(score: number) {
  if (score >= 85) return "CRITICAL";
  if (score >= 65) return "HIGH";
  if (score >= 45) return "MEDIUM";
  return "LOW";
}

export function AnomalyReviewBoard({ anomalies, cases }: AnomalyReviewBoardProps) {
  const caseByAnomaly = new Map(cases.map((item) => [item.anomaly_id, item]));
  const counts = filters.reduce<Record<FilterId, number>>(
    (acc, filter) => {
      acc[filter.id] = anomalies.filter((anomaly) => {
        if (filter.id === "ALL") return true;
        if (filter.id === "AGGREGATE_REVIEW") return anomaly.case_type === "AGGREGATE_REVIEW";
        return anomaly.predicted_cause === filter.id;
      }).length;
      return acc;
    },
    {
      ALL: 0,
      AGGREGATE_REVIEW: 0,
      THEFT_TAMPERING: 0,
      METER_MALFUNCTION: 0,
      COMMUNICATION_FAILURE: 0
    }
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Anomaly Review</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">Browse by cause and case status</h2>
        </div>
        <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
          {anomalies.length} live records
        </span>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {filters.map((filter) => (
          <a
            key={filter.id}
            href={`#${filter.id}`}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
          >
            {filter.label}
            <span className="ml-2 text-slate-400">{counts[filter.id]}</span>
          </a>
        ))}
      </div>

      <div className="mt-6 grid gap-5">
        {filters.slice(1).map((filter) => {
          const filtered = anomalies
            .filter((anomaly) => {
              if (filter.id === "AGGREGATE_REVIEW") return anomaly.case_type === "AGGREGATE_REVIEW";
              return anomaly.predicted_cause === filter.id;
            })
            .slice(0, 5);

          return (
            <div key={filter.id} id={filter.id} className="rounded-lg border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                <p className="font-semibold text-slate-950">{filter.label}</p>
                <span className="text-xs font-medium text-slate-500">{counts[filter.id]} found</span>
              </div>

              {filtered.length ? (
                <div className="divide-y divide-slate-200">
                  {filtered.map((anomaly) => {
                    const linkedCase = anomaly.id ? caseByAnomaly.get(anomaly.id) : undefined;
                    const Icon = causeIcon[anomaly.predicted_cause] ?? ClipboardList;
                    const adjustedScore = anomaly.adjusted_risk_score ?? anomaly.risk_score;
                    const flags = anomaly.outlier_flags ?? [];

                    return (
                      <article key={anomaly.id ?? anomaly.consumer_id} className="grid gap-4 px-4 py-4 lg:grid-cols-[1fr_0.45fr]">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Icon size={16} className="text-slate-500" />
                            <p className="font-semibold text-slate-950">{anomaly.consumer_id}</p>
                            <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600">
                              {anomaly.predicted_cause.replaceAll("_", " ")}
                            </span>
                            <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600">
                              {anomaly.case_type ?? "STANDARD"}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {anomaly.recommendation ?? "Review backend evidence before field action."}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {flags.length ? flags.map((flag) => (
                              <span key={flag} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-500">
                                {flag.replaceAll("_", " ")}
                              </span>
                            )) : (
                              <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-500">
                                No outlier flags
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid gap-2 text-sm">
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-500">Raw ML risk</span>
                            <span className="font-semibold text-slate-950">{(anomaly.raw_risk_score ?? anomaly.risk_score).toFixed(1)}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-500">Adjusted priority</span>
                            <span className="font-semibold text-slate-950">{adjustedScore.toFixed(1)} / {scoreLabel(adjustedScore)}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-500">Case</span>
                            <span className="text-right font-semibold text-slate-950">
                              {linkedCase?.case_id ?? "Review-only anomaly"}
                            </span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-6 text-sm text-slate-500">No live backend records in this category.</div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
