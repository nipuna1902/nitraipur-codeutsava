'use client';

import { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { ConsumptionTrend } from '@/types/dashboard';
import { formatEnergy } from '@/lib/utils';

interface ConsumptionTrendChartProps {
  trend: ConsumptionTrend;
  onTimeRangeChange?: (range: '24h' | '7d' | '30d') => void;
}

const TIME_RANGES: { value: '24h' | '7d' | '30d'; label: string }[] = [
  { value: '24h', label: '24 h' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
];

function formatTimestamp(iso: string, range: '24h' | '7d' | '30d'): string {
  const d = new Date(iso);
  if (range === '24h') {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div
      style={{
        background: 'var(--color-canvas-white)',
        border: '1px solid var(--color-mist)',
        borderRadius: 'var(--radius-cards)',
        padding: '10px 14px',
        fontFamily: 'var(--font-inter)',
        fontSize: 12,
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ color: 'var(--color-slate)', marginBottom: 6, fontSize: 11 }}>{label}</div>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color, display: 'inline-block' }} />
          <span style={{ color: 'var(--color-steel)' }}>{entry.name}:</span>
          <span style={{ color: 'var(--color-graphite)', fontWeight: 500 }}>
            {formatEnergy(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function ConsumptionTrendChart({ trend, onTimeRangeChange }: ConsumptionTrendChartProps) {
  const [selectedRange, setSelectedRange] = useState<'24h' | '7d' | '30d'>(trend.timeRange);

  const handleRangeChange = (range: '24h' | '7d' | '30d') => {
    setSelectedRange(range);
    onTimeRangeChange?.(range);
  };

  const hasBaseline = trend.data.some(d => d.baseline !== null);

  const chartData = trend.data.map(d => ({
    ...d,
    label: formatTimestamp(d.timestamp, selectedRange),
  }));

  return (
    <div className="card-white" style={{ padding: 'var(--spacing-20)' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <div>
          <div className="section-title">Network Consumption</div>
          <div
            style={{
              fontFamily: 'var(--font-inter)',
              fontSize: 12,
              color: 'var(--color-slate)',
              marginTop: 2,
            }}
          >
            Aggregate demand across all monitored consumers
          </div>
        </div>

        {/* Time range selector */}
        <div
          style={{
            display: 'flex',
            background: 'var(--color-ash)',
            borderRadius: 'var(--radius-nav-pills)',
            padding: '4px',
          }}
        >
          {TIME_RANGES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleRangeChange(value)}
              style={{
                background: selectedRange === value ? 'var(--color-canvas-white)' : 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-nav-pills)',
                padding: '4px 14px',
                cursor: 'pointer',
                fontFamily: 'var(--font-inter)',
                fontSize: 12,
                fontWeight: selectedRange === value ? 500 : 400,
                color: selectedRange === value ? 'var(--color-graphite)' : 'var(--color-slate)',
                transition: 'all 0.15s ease',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
          <defs>
            <linearGradient id="consumptionGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ff682c" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#ff682c" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="baselineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#816729" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#816729" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-mist)" />
          <XAxis
            dataKey="label"
            tick={{ fontFamily: 'var(--font-inter)', fontSize: 11, fill: 'var(--color-slate)' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontFamily: 'var(--font-inter)', fontSize: 11, fill: 'var(--color-slate)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v} kWh`}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          {hasBaseline && (
            <Area
              type="monotone"
              dataKey="baseline"
              name="Baseline"
              stroke="var(--color-brass)"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              fill="url(#baselineGradient)"
              dot={false}
              connectNulls={false}
            />
          )}
          <Area
            type="monotone"
            dataKey="consumption"
            name="Consumption"
            stroke="var(--color-ember-orange)"
            strokeWidth={2}
            fill="url(#consumptionGradient)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>

      {!hasBaseline && (
        <div
          style={{
            textAlign: 'center',
            fontFamily: 'var(--font-inter)',
            fontSize: 12,
            color: 'var(--color-slate)',
            marginTop: 8,
          }}
        >
          Insufficient historical data for baseline comparison
        </div>
      )}
    </div>
  );
}
