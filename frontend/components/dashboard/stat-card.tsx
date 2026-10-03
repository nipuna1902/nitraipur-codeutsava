import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: number;
  tone: "cyan" | "rose" | "amber" | "emerald";
};

const tones = {
  cyan: "text-slate-600",
  rose: "text-slate-600",
  amber: "text-slate-600",
  emerald: "text-slate-600"
};

export function StatCard({ icon: Icon, label, value, tone }: StatCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className={`rounded-lg border border-slate-200 bg-slate-50 p-3 ${tones[tone]}`}>
          <Icon size={22} />
        </div>
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Live</span>
      </div>
      <p className="mt-5 text-3xl font-semibold text-slate-950">{value.toLocaleString()}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </article>
  );
}
