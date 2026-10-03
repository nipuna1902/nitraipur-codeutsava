import { AlertTriangle, ClipboardCheck, Gauge, Info, MapPin } from "lucide-react";
import type { Anomaly, InvestigationCase } from "@/types/dashboard";

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

function priorityFromScore(score: number) {
  if (score >= 85) return "CRITICAL";
  if (score >= 65) return "HIGH";
  if (score >= 45) return "MEDIUM";
  return "LOW";
}

export function CaseQueue({ cases, anomalies }: CaseQueueProps) {
  const anomalyById = new Map(anomalies.map((anomaly) => [anomaly.id, anomaly]));
  const anomalyByConsumer = new Map(anomalies.map((anomaly) => [anomaly.consumer_id, anomaly]));
  const fallbackCases = cases.length
    ? cases
    : anomalies.slice(0, 4).map((anomaly, index) => ({
        case_id: `CASE-${index + 1}`,
        anomaly_id: anomaly.id,
        consumer_id: anomaly.consumer_id,
        priority: priorityFromScore(anomaly.adjusted_risk_score ?? anomaly.risk_score),
        status: "EVIDENCE_REVIEW",
        assigned_to: index === 0 ? "Team Alpha" : null,
        case_type: anomaly.case_type,
        raw_risk_score: anomaly.raw_risk_score ?? anomaly.risk_score,
        adjusted_risk_score: anomaly.adjusted_risk_score ?? anomaly.risk_score,
        allocation_confidence: anomaly.allocation_confidence,
        attribution_status: anomaly.attribution_status,
        outlier_flags: anomaly.outlier_flags,
        recommendation: anomaly.recommendation,
        risk_adjustment_reason: anomaly.risk_adjustment_reason
      }));

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
        {fallbackCases.map((item) => {
          const anomaly = anomalyById.get(item.anomaly_id) ?? anomalyByConsumer.get(item.consumer_id);
          const rawRisk = item.raw_risk_score ?? anomaly?.raw_risk_score ?? anomaly?.risk_score ?? 0;
          const adjustedRisk = item.adjusted_risk_score ?? anomaly?.adjusted_risk_score ?? rawRisk;
          const priority = item.priority ?? priorityFromScore(adjustedRisk);
          const caseType = item.case_type ?? anomaly?.case_type ?? "STANDARD";
          const flags = item.outlier_flags ?? anomaly?.outlier_flags ?? [];
          const attributionConfidence = item.allocation_confidence ?? anomaly?.allocation_confidence ?? "UNKNOWN";
          const attributionStatus = item.attribution_status ?? anomaly?.attribution_status ?? "AGGREGATE_ONLY";
          const recommendation = item.recommendation ?? anomaly?.recommendation ?? "Review evidence before dispatch.";
          const adjustmentReason = item.risk_adjustment_reason ?? anomaly?.risk_adjustment_reason;

          return (
            <article
              key={`${item.case_id}-${item.consumer_id}`}
              className={`rounded-lg border p-4 ${
                caseType === "AGGREGATE_REVIEW" ? "border-amber-200 bg-amber-50/40" : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-slate-950">
                    {caseType === "AGGREGATE_REVIEW" ? "High-risk aggregate anomaly" : "Investigation case"}
                    <span className="text-sm font-medium text-slate-500">{item.case_id ?? item.anomaly_id}</span>
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                    <MapPin size={14} /> Consumer {item.consumer_id}
                  </p>
                </div>
                <span className={`rounded-md border px-3 py-1 text-xs font-medium ${priorityClass[priority]}`}>
                  {priority}
                </span>
              </div>

              {caseType === "AGGREGATE_REVIEW" ? (
                <div className="mt-4 flex gap-2 rounded-md border border-amber-200 bg-white p-3 text-sm leading-5 text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    This reading may represent multiple buildings. Electron cannot attribute the anomaly to one building
                    without field verification.
                  </span>
                </div>
              ) : null}

              <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 sm:grid-cols-3">
                <div>
                  <p className="flex items-center gap-2 text-xs font-medium uppercase text-slate-500">
                    <Gauge size={13} /> Raw ML Risk
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">{rawRisk.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">Adjusted Priority</p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">{adjustedRisk.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">Attribution Confidence</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">{attributionConfidence.replaceAll("_", " ")}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600">
                  {attributionStatus.replaceAll("_", " ")}
                </span>
                {flags.map((flag) => (
                  <span key={flag} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600">
                    {flag.replaceAll("_", " ")}
                  </span>
                ))}
              </div>

              <div className="mt-4 flex gap-2 text-sm leading-6 text-slate-600">
                <Info className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                <p>
                  {recommendation}
                  {adjustmentReason ? ` Why adjusted: ${adjustmentReason}.` : ""}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-700">{(item.status ?? "OPEN").replaceAll("_", " ")}</span>
                <span className="text-slate-500">{item.assigned_to ?? "Unassigned"}</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
