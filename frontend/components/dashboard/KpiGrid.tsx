'use client';

import { Users, AlertTriangle, TrendingDown, Radio, ShieldAlert } from 'lucide-react';
import type { NetworkSummary } from '@/types/dashboard';
import { formatPct } from '@/lib/utils';

interface KpiGridProps {
  summary: NetworkSummary;
  isLoading?: boolean;
}

function SkeletonCard() {
  return (
    <div className="kpi-card">
      <div className="skeleton" style={{ height: 12, width: '60%' }} />
      <div className="skeleton" style={{ height: 36, width: '50%', marginTop: 8 }} />
      <div className="skeleton" style={{ height: 12, width: '80%' }} />
    </div>
  );
}

export default function KpiGrid({ summary, isLoading }: KpiGridProps) {
  if (isLoading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--spacing-12)' }}>
        {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  const cards = [
    {
      label: 'Total Consumers',
      value: summary.totalConsumers.toLocaleString(),
      sub: `${summary.activeConsumers} active`,
      icon: Users,
      variant: 'normal',
    },
    {
      label: 'Active Anomalies',
      value: summary.activeAnomalies.toLocaleString(),
      sub: summary.activeAnomalies === 0 ? 'All clear' : 'Requires attention',
      icon: AlertTriangle,
      variant: summary.activeAnomalies > 0 ? 'alert' : 'normal',
    },
    {
      label: 'High / Critical Risk',
      value: (summary.highRisk + summary.criticalRisk).toLocaleString(),
      sub: `${summary.criticalRisk} critical · ${summary.highRisk} high`,
      icon: ShieldAlert,
      variant: summary.criticalRisk > 0 ? 'critical' : summary.highRisk > 0 ? 'alert' : 'normal',
    },
    {
      label: 'Unexplained Loss',
      value: `${summary.unexplainedLoss.toFixed(1)}%`,
      sub: 'Transformer/feeder level',
      icon: TrendingDown,
      variant: summary.unexplainedLoss > 5 ? 'alert' : summary.unexplainedLoss > 2 ? 'warn' : 'normal',
    },
    {
      label: 'Telemetry Health',
      value: formatPct(summary.telemetryHealth),
      sub: 'Meters communicating',
      icon: Radio,
      variant: summary.telemetryHealth < 80 ? 'critical' : summary.telemetryHealth < 90 ? 'alert' : 'normal',
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 'var(--spacing-12)',
      }}
    >
      {cards.map(({ label, value, sub, icon: Icon, variant }) => (
        <div
          key={label}
          className={`kpi-card${
            variant === 'critical' ? ' kpi-card--critical' :
            variant === 'alert' ? ' kpi-card--alert' : ''
          }`}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="kpi-card-label">{label}</span>
            <Icon
              size={16}
              color={
                variant === 'critical' ? 'var(--color-risk-critical)' :
                variant === 'alert' ? 'var(--color-ember-orange)' :
                'var(--color-slate)'
              }
            />
          </div>
          <div
            className="kpi-card-value"
            style={{
              color:
                variant === 'critical' ? 'var(--color-risk-critical)' :
                variant === 'alert' ? 'var(--color-ember-orange)' :
                'var(--color-graphite)',
            }}
          >
            {value}
          </div>
          <div className="kpi-card-sub">{sub}</div>
        </div>
      ))}
    </div>
  );
}
