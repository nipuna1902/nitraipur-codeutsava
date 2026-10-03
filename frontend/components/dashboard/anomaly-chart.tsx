"use client";

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Anomaly } from "@/types/dashboard";

type AnomalyChartProps = {
  anomalies: Anomaly[];
};

function shortId(value: string) {
  if (value.length <= 10) return value;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function AnomalyChart({ anomalies }: AnomalyChartProps) {
  const chartData = anomalies.slice(0, 14).map((anomaly, index) => ({
    name: shortId(anomaly.consumer_id),
    consumer: anomaly.consumer_id,
    risk: Number((anomaly.risk_score ?? 0).toFixed(1)),
    adjusted: Number((anomaly.adjusted_risk_score ?? anomaly.risk_score ?? 0).toFixed(1)),
    anomaly: Math.round((anomaly.anomaly_score ?? 0) * 100),
    order: index + 1
  }));

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Anomaly Intelligence</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">Top live risk scores</h2>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
          Showing top {chartData.length} of {anomalies.length}
        </div>
      </div>
      <div className="mt-6 h-80">
        {chartData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ left: -10, right: 12, top: 12, bottom: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.24)" />
              <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} interval={0} />
              <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 12 }} />
              <Tooltip
                labelFormatter={(_, items) => items?.[0]?.payload?.consumer ?? ""}
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  color: "#0f172a"
                }}
              />
              <Bar dataKey="risk" name="Raw ML risk" fill="#0f766e" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="adjusted" name="Adjusted priority" stroke="#b45309" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center">
            <div>
              <p className="font-medium text-slate-800">No anomaly data loaded</p>
              <p className="mt-1 text-sm text-slate-500">Start the backend and load ML predictions to populate this graph.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
