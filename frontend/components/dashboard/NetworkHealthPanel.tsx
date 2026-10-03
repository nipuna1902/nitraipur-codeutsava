'use client';

import { useRouter } from 'next/navigation';
import { Wifi, WifiOff, Clock, Zap } from 'lucide-react';
import type { NetworkHealth } from '@/types/dashboard';

interface NetworkHealthPanelProps {
  health: NetworkHealth;
}

function HealthBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? (value / total) * 100 : 100;
  return (
    <div className="score-bar-track" style={{ height: 6 }}>
      <div
        className="score-bar-fill"
        style={{
          width: `${pct}%`,
          background: pct > 90
            ? 'var(--color-graphite)'
            : pct > 70
            ? 'var(--color-brass)'
            : 'var(--color-ember-orange)',
        }}
      />
    </div>
  );
}

interface SectionProps {
  title: string;
  items: { label: string; value: string | number; sub?: string; clickable?: boolean; onClick?: () => void }[];
  barValue?: number;
  barTotal?: number;
}

function HealthSection({ title, items, barValue, barTotal }: SectionProps) {
  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--font-inter)',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--color-slate)',
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      {barValue !== undefined && barTotal !== undefined && (
        <div style={{ marginBottom: 8 }}>
          <HealthBar value={barValue} total={barTotal} />
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map(({ label, value, sub, onClick }) => (
          <div
            key={label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: onClick ? 'pointer' : 'default',
            }}
            onClick={onClick}
          >
            <span
              style={{
                fontFamily: 'var(--font-inter)',
                fontSize: 13,
                color: 'var(--color-steel)',
              }}
            >
              {label}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-polysans)',
                fontSize: 15,
                letterSpacing: '-0.02em',
                color: 'var(--color-graphite)',
              }}
            >
              {value}
              {sub && (
                <span
                  style={{
                    fontFamily: 'var(--font-inter)',
                    fontSize: 11,
                    color: 'var(--color-slate)',
                    marginLeft: 4,
                  }}
                >
                  {sub}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NetworkHealthPanel({ health }: NetworkHealthPanelProps) {
  const router = useRouter();

  return (
    <div className="card" style={{ height: '100%' }}>
      <div className="section-header">
        <span className="section-title">Network Health</span>
        <button
          className="btn-ghost"
          style={{ padding: '4px 10px', fontSize: 12 }}
          onClick={() => router.push('/simulation')}
        >
          View Digital Twin
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Transformers */}
        <HealthSection
          title="Transformers"
          barValue={health.transformers.healthy}
          barTotal={health.transformers.total}
          items={[
            {
              label: 'Healthy',
              value: `${health.transformers.healthy} / ${health.transformers.total}`,
              onClick: () => router.push('/simulation'),
            },
            ...(health.transformers.elevatedLoss > 0 ? [{
              label: 'Elevated unexplained loss',
              value: health.transformers.elevatedLoss,
              onClick: () => router.push('/investigations?filter=transformer_loss'),
            }] : []),
            ...(health.transformers.offline > 0 ? [{
              label: 'Offline',
              value: health.transformers.offline,
            }] : []),
          ]}
        />

        <div className="divider" style={{ margin: '4px 0' }} />

        {/* Feeders */}
        <HealthSection
          title="Feeders"
          barValue={health.feeders.healthy}
          barTotal={health.feeders.total}
          items={[
            {
              label: 'Healthy',
              value: `${health.feeders.healthy} / ${health.feeders.total}`,
            },
            ...(health.feeders.suspiciousLoss > 0 ? [{
              label: 'Suspicious loss patterns',
              value: health.feeders.suspiciousLoss,
              onClick: () => router.push('/investigations?filter=feeder_loss'),
            }] : []),
          ]}
        />

        <div className="divider" style={{ margin: '4px 0' }} />

        {/* Communication */}
        <div>
          <div
            style={{
              fontFamily: 'var(--font-inter)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--color-slate)',
              marginBottom: 10,
            }}
          >
            Communication
          </div>
          <HealthBar value={health.communication.connected} total={health.communication.total} />
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Wifi size={12} color="var(--color-graphite)" />
              <span style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--color-steel)' }}>
                {health.communication.connected} connected
              </span>
            </div>
            {health.communication.offline > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <WifiOff size={12} color="var(--color-ember-orange)" />
                <span style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--color-ember-orange)' }}>
                  {health.communication.offline} offline
                </span>
              </div>
            )}
            {health.communication.delayed > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={12} color="var(--color-brass)" />
                <span style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--color-brass)' }}>
                  {health.communication.delayed} delayed
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="divider" style={{ margin: '4px 0' }} />

        {/* Meters */}
        <HealthSection
          title="Meter Health"
          barValue={health.meters.healthy}
          barTotal={health.meters.total}
          items={[
            { label: 'Healthy', value: health.meters.healthy },
            ...(health.meters.suspectedMalfunction > 0 ? [{
              label: 'Suspected malfunction',
              value: health.meters.suspectedMalfunction,
              onClick: () => router.push('/investigations?filter=meter_malfunction'),
            }] : []),
            ...(health.meters.invalidReadings > 0 ? [{
              label: 'Invalid / noisy readings',
              value: health.meters.invalidReadings,
            }] : []),
          ]}
        />
      </div>
    </div>
  );
}
