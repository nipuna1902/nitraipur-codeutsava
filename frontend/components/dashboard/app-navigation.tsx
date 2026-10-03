import Link from "next/link";
import { Activity, GaugeCircle, GitCompareArrows, Network, RadioTower, ShieldAlert } from "lucide-react";

const navItems = [
  { href: "/", label: "Overview", icon: Activity },
  { href: "/simulation", label: "Simulator", icon: RadioTower },
  { href: "/dual-injection", label: "Bad-Data Lab", icon: GitCompareArrows },
  { href: "http://127.0.0.1:8000/docs", label: "Swagger", icon: Network, external: true },
  { href: "http://127.0.0.1:8000/anomalies/queue?limit=100", label: "Anomaly Queue", icon: ShieldAlert, external: true },
  { href: "http://127.0.0.1:8000/dashboard/summary", label: "API Summary", icon: GaugeCircle, external: true }
];

export function AppNavigation() {
  return (
    <nav className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const className =
            "inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white hover:text-slate-950";

          if (item.external) {
            return (
              <a key={item.href} href={item.href} target="_blank" rel="noreferrer" className={className}>
                <Icon size={16} />
                {item.label}
              </a>
            );
          }

          return (
            <Link key={item.href} href={item.href} className={className}>
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
