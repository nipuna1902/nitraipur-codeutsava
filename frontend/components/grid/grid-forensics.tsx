import { Network } from "lucide-react";
import type { Transformer } from "@/types/dashboard";

type GridForensicsProps = {
  transformers: Transformer[];
};

export function GridForensics({ transformers }: GridForensicsProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-600">
          <Network />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Grid Forensics</p>
          <h2 className="text-xl font-semibold text-slate-950">Transformer loss correlation</h2>
        </div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {transformers.slice(0, 3).map((transformer) => {
          const snapshot = transformer.energy_snapshot;
          const unexplained = snapshot?.unexplained_loss ?? 0;
          const input = snapshot?.input_energy ?? transformer.rated_capacity;
          const lossPercent = input ? Math.min(100, Math.round((unexplained / input) * 100)) : 0;
          return (
            <article key={transformer.transformer_id} className="rounded-lg border border-slate-200 bg-white p-5">
              <p className="text-lg font-semibold text-slate-950">{transformer.transformer_id}</p>
              <p className="text-sm text-slate-500">{transformer.feeder_id} · {transformer.rated_capacity} kVA</p>
              <div className="mt-6">
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-slate-500">Unexplained loss</span>
                  <span className="font-semibold text-slate-900">{lossPercent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-slate-700" style={{ width: `${lossPercent}%` }} />
                </div>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-slate-500">Input</dt>
                  <dd className="font-semibold text-slate-950">{snapshot?.input_energy ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Consumer</dt>
                  <dd className="font-semibold text-slate-950">{snapshot?.consumer_energy ?? "—"}</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>
    </section>
  );
}
