import { GaugeCircle } from "lucide-react";
import type { Anomaly, Consumer } from "@/types/dashboard";

type ConsumerPanelProps = {
  consumers: Consumer[];
  anomalies: Anomaly[];
};

export function ConsumerPanel({ consumers, anomalies }: ConsumerPanelProps) {
  const anomalyByConsumer = new Map(anomalies.map((anomaly) => [anomaly.consumer_id, anomaly]));

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-600">
          <GaugeCircle />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Consumer Intelligence</p>
          <h2 className="text-xl font-semibold text-slate-950">Baseline-aware profiles</h2>
        </div>
      </div>
      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
        <div className="grid grid-cols-[1fr_0.8fr_0.7fr] bg-slate-50 px-4 py-3 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
          <span>Consumer</span>
          <span>Grid node</span>
          <span>Risk</span>
        </div>
        {consumers.slice(0, 6).map((consumer) => {
          const anomaly = anomalyByConsumer.get(consumer.consumer_id);
          return (
            <div key={consumer.consumer_id} className="grid grid-cols-[1fr_0.8fr_0.7fr] border-t border-slate-200 px-4 py-4 text-sm">
              <div>
                <p className="font-semibold text-slate-950">{consumer.consumer_id}</p>
                <p className="text-slate-500">{consumer.category} / {consumer.sanctioned_load} kW</p>
              </div>
              <div className="text-slate-700">
                <p>{consumer.transformer_id}</p>
                <p className="text-slate-500">{consumer.feeder_id}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-950">{anomaly?.risk_score ?? 0}</p>
                <p className="text-slate-500">{anomaly?.predicted_cause.replaceAll("_", " ") ?? "NORMAL"}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
