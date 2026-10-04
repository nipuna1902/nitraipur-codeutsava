import Link from "next/link";
import { Activity, GaugeCircle, GitCompareArrows, Network, RadioTower, SatelliteDish, ShieldAlert } from "lucide-react";
import type { MqttStatus } from "@/types/dashboard";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://127.0.0.1:8000";

const navItems = [
  { href: "/", label: "Overview", icon: Activity, step: "1" },
  { href: "/simulator", label: "3D Simulator", icon: RadioTower, step: "2" },
  { href: "/dual-injection", label: "Known Injection", icon: GitCompareArrows, step: "3" },
  { href: `${API_BASE_URL}/docs`, label: "Swagger", icon: Network, external: true },
  { href: `${API_BASE_URL}/mqtt/status`, label: "MQTT", icon: SatelliteDish, external: true },
  { href: `${API_BASE_URL}/anomalies/queue?limit=100`, label: "ML Queue", icon: ShieldAlert, external: true },
  { href: `${API_BASE_URL}/dashboard/summary`, label: "API Summary", icon: GaugeCircle, external: true }
];

export function AppNavigation({ mqtt }: { mqtt?: MqttStatus }) {
  const mqttLabel = mqtt?.connected ? "MQTT LIVE" : mqtt?.started ? "MQTT WAITING" : mqtt?.enabled === false ? "MQTT OFF" : "MQTT READY";
  const mqttClass = mqtt?.connected
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : mqtt?.last_error
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <nav className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
                {item.step ? <span className="text-xs text-slate-400">{item.step}</span> : null}
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </div>
        <span className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${mqttClass}`}>
          <SatelliteDish size={15} />
          {mqttLabel}
          {mqtt ? <span className="font-normal">/ {mqtt.readings_ingested} readings</span> : null}
        </span>
      </div>
    </nav>
  );
}
