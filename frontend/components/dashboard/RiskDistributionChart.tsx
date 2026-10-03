'use client';

import { useRouter } from 'next/navigation';
import type { RiskDistribution } from '@/types/dashboard';

interface RiskDistributionChartProps {
  distribution: RiskDistribution;
}

interface BarProps {
  label: string;
  count: number;
  total: number;
  color: string;
  bgColor: string;
  borderColor: string;
  onClick: () => void;
}

function Bar({ label, count, total, color, bgColor, borderColor, onClick }: BarProps) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div
      style={{ cursor: 'pointer' }}
      onClick={onClick}
      title={`${label}: ${count} consumers — click to filter`}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 4,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-inter)',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--color-slate)',
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-polysans)',
            fontSize: 16,
            letterSpacing: '-0.02em',
            color,
          }}
        >
          {count}
        </span>
      </div>
      <div
        style={{
          height: 8,
          background: 'var(--color-mist)',
          borderRadius: 4,
          overflow: 'hidden',
          transition: 'transform 0.15s ease',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: color,
            borderRadius: 4,
            transition: 'width 0.6s ease',
          }}
        />
      </div>
      <div
        style={{
          fontFamily: 'var(--font-inter)',
          fontSize: 11,
          color: 'var(--color-slate)',
          marginTop: 2,
        }}
      >
        {pct.toFixed(1)}%
      </div>
    </div>
  );
}

export default function RiskDistributionChart({ distribution }: RiskDistributionChartProps) {
  const router = useRouter();

  const total =
    distribution.normal +
    distribution.low +
    distribution.medium +
    distribution.high +
    distribution.critical;

  const navigate = (risk: string) => {
    router.push(`/investigations?risk=${risk.toLowerCase()}`);
  };

  const bars: Array<{
    key: keyof RiskDistribution;
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
  }> = [
    { key: 'critical', label: 'Critical', color: 'var(--color-risk-critical)', bgColor: '#fef2f2', borderColor: '#fecaca' },
    { key: 'high', label: 'High', color: 'var(--color-risk-high)', bgColor: '#fff7f4', borderColor: '#ffd8c8' },
    { key: 'medium', label: 'Medium', color: 'var(--color-risk-medium)', bgColor: '#fdf8f0', borderColor: '#e8d5a0' },
    { key: 'low', label: 'Low', color: 'var(--color-risk-low)', bgColor: 'var(--color-fog)', borderColor: 'var(--color-mist)' },
    { key: 'normal', label: 'Normal', color: 'var(--color-graphite)', bgColor: 'var(--color-ash)', borderColor: 'var(--color-mist)' },
  ];

  // Mini donut-style summary
  const hasRisk = distribution.critical + distribution.high + distribution.medium > 0;

  return (
    <div className="card">
      <div className="section-header">
        <span className="section-title">Risk Distribution</span>
        <span className="text-caption" style={{ color: 'var(--color-slate)' }}>
          {total} total
        </span>
      </div>

      {/* Summary row */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        {bars
          .filter(b => distribution[b.key] > 0)
          .map(({ key, label, color, bgColor, borderColor }) => (
            <button
              key={key}
              onClick={() => navigate(key)}
              style={{
                background: bgColor,
                border: `1px solid ${borderColor}`,
                borderRadius: 'var(--radius-tags)',
                padding: '3px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} />
              <span
                style={{
                  fontFamily: 'var(--font-inter)',
                  fontSize: 12,
                  color,
                  fontWeight: 500,
                }}
              >
                {distribution[key]} {label}
              </span>
            </button>
          ))}
      </div>

      {/* Stacked bar */}
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            height: 16,
            borderRadius: 8,
            overflow: 'hidden',
            display: 'flex',
          }}
        >
          {bars.map(({ key, label, color }) => {
            const pct = total > 0 ? (distribution[key] / total) * 100 : 0;
            if (pct === 0) return null;
            return (
              <div
                key={key}
                onClick={() => navigate(key)}
                style={{
                  width: `${pct}%`,
                  background: color,
                  cursor: 'pointer',
                  transition: 'width 0.6s ease',
                }}
                title={`${label}: ${distribution[key]}`}
              />
            );
          })}
        </div>
      </div>

      {/* Bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {bars.map(({ key, label, color, bgColor, borderColor }) => (
          <Bar
            key={key}
            label={label}
            count={distribution[key]}
            total={total}
            color={color}
            bgColor={bgColor}
            borderColor={borderColor}
            onClick={() => navigate(key)}
          />
        ))}
      </div>
    </div>
  );
}
