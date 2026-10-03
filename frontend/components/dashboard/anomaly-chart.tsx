"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Anomaly } from "@/types/dashboard";

type AnomalyChartProps = {
  anomalies: Anomaly[];
};

export function AnomalyChart({ anomalies }: AnomalyChartProps) {
  const chartData = anomalies.map((anomaly, index) => ({
    name: anomaly.consumer_id,
    risk: anomaly.risk_score,
    anomaly: Math.round(anomaly.anomaly_score * 100),
    confidence: Math.round((anomaly.confidence ?? 0.5) * 100),
    order: index + 1
  }));

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Anomaly Intelligence</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">Risk curve by consumer</h2>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
          Model scores are evidence, not verdicts
        </div>
      </div>
      <div className="mt-6 h-72">
        {chartData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ left: -18, right: 8, top: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#64748b" stopOpacity={0.24} />
                  <stop offset="95%" stopColor="#64748b" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" />
              <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  color: "#0f172a"
                }}
              />
              <Area type="monotone" dataKey="risk" stroke="#334155" strokeWidth={2} fill="url(#riskGradient)" />
              <Area type="monotone" dataKey="confidence" stroke="#64748b" strokeWidth={2} fill="transparent" />
              <Area type="monotone" dataKey="anomaly" stroke="#94a3b8" strokeWidth={2} fill="transparent" />
            </AreaChart>
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
