'use client';

import { useRouter } from 'next/navigation';
import type { SimulationStatusInfo, SimulationMode } from '@/types/dashboard';
import { timeAgo } from '@/lib/utils';
import { Play, Pause, Activity } from 'lucide-react';

interface SimulationStatusBarProps {
  status: SimulationStatusInfo;
  onScenarioChange?: (mode: SimulationMode) => void;
  isMockMode?: boolean;
}

const SCENARIO_OPTIONS: { value: SimulationMode; label: string }[] = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'THEFT_TAMPERING', label: 'Theft/Tampering' },
  { value: 'METER_MALFUNCTION', label: 'Meter Malfunction' },
  { value: 'COMMUNICATION_FAILURE', label: 'Comm. Failure' },
  { value: 'COORDINATED_THEFT', label: 'Coordinated Theft' },
  { value: 'SEASONAL_VARIATION', label: 'Seasonal Variation' },
  { value: 'LEGITIMATE_ABNORMAL_CONSUMPTION', label: 'Legitimate Abnormal' },
];

function statusStyle(s: SimulationStatusInfo['status']) {
  const map: Record<SimulationStatusInfo['status'], string> = {
    LIVE: 'sim-status--live',
    PAUSED: 'sim-status--paused',
    NO_TELEMETRY: 'sim-status--no-telemetry',
    RECONNECTING: 'sim-status--reconnecting',
  };
  return map[s];
}

function statusLabel(s: SimulationStatusInfo['status']) {
  const map: Record<SimulationStatusInfo['status'], string> = {
    LIVE: 'LIVE — Simulator',
    PAUSED: 'PAUSED',
    NO_TELEMETRY: 'NO TELEMETRY',
    RECONNECTING: 'RECONNECTING',
  };
  return map[s];
}

export default function SimulationStatusBar({
  status,
  onScenarioChange,
  isMockMode = true,
}: SimulationStatusBarProps) {
  const router = useRouter();

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 'var(--spacing-12)',
        padding: '14px var(--spacing-20)',
        background: 'var(--color-fog)',
        borderRadius: 'var(--radius-cards)',
      }}
    >
      {/* Left — status + telemetry info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-16)', flexWrap: 'wrap' }}>
        <span className={`sim-status ${statusStyle(status.status)}`}>
          <span
            className={`sim-dot ${status.status === 'LIVE' ? 'sim-dot--live' : ''}`}
          />
          {statusLabel(status.status)}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Activity size={13} color="var(--color-slate)" />
          <span
            style={{
              fontFamily: 'var(--font-inter)',
              fontSize: 13,
              color: 'var(--color-steel)',
            }}
          >
            {status.activeConsumers} consumers · {status.readingFrequency} · Last update{' '}
            <strong style={{ color: 'var(--color-graphite)' }}>
              {timeAgo(status.lastTelemetryAt)}
            </strong>
          </span>
        </div>

        {/* Scenario badge */}
        <div
          style={{
            background: 'var(--color-ash)',
            border: '1px solid var(--color-mist)',
            borderRadius: 'var(--radius-tags)',
            padding: '2px 10px',
            fontFamily: 'var(--font-inter)',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--color-steel)',
          }}
        >
          {status.mode.replace(/_/g, ' ')}
        </div>
      </div>

      {/* Right — demo controls (only visible in mock mode) */}
      {isMockMode && onScenarioChange && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontFamily: 'var(--font-inter)',
              fontSize: 11,
              color: 'var(--color-slate)',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Demo scenario:
          </span>
          <select
            value={status.mode}
            onChange={(e) => onScenarioChange(e.target.value as SimulationMode)}
            style={{
              fontFamily: 'var(--font-inter)',
              fontSize: 13,
              color: 'var(--color-graphite)',
              background: 'var(--color-canvas-white)',
              border: '1px solid var(--color-mist)',
              borderRadius: 4,
              padding: '4px 10px',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {SCENARIO_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <button
            className="btn-ghost"
            style={{ padding: '4px 12px', fontSize: 12 }}
            onClick={() => router.push('/simulation')}
          >
            Open Digital Twin
          </button>

          <button
            className="btn-ghost"
            style={{ padding: '4px 12px', fontSize: 12 }}
            onClick={() => router.push('/stress-test')}
          >
            Stress Test
          </button>
        </div>
      )}
    </div>
  );
}
