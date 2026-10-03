'use client';

import { useRouter } from 'next/navigation';
import type { Alert } from '@/types/dashboard';
import { alertTypeLabel, riskLabel, riskLevelClass, timeAgo } from '@/lib/utils';
import { ArrowRight, Users } from 'lucide-react';

interface LiveAlertFeedProps {
  alerts: Alert[];
  maxVisible?: number;
  onViewAll?: () => void;
}

function RiskDot({ level }: { level: Alert['riskLevel'] }) {
  const colorMap = {
    CRITICAL: 'var(--color-risk-critical)',
    HIGH: 'var(--color-risk-high)',
    MEDIUM: 'var(--color-risk-medium)',
    LOW: 'var(--color-risk-low)',
    NORMAL: 'var(--color-risk-normal)',
  };
  return (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: colorMap[level],
        flexShrink: 0,
        marginTop: 2,
      }}
    />
  );
}

function AlertStatusBadge({ status }: { status: Alert['status'] }) {
  const styleMap = {
    ACTIVE: { background: '#fff7f4', color: 'var(--color-ember-orange)', border: '1px solid #ffd8c8' },
    ACKNOWLEDGED: { background: 'var(--color-fog)', color: 'var(--color-steel)', border: '1px solid var(--color-mist)' },
    INVESTIGATING: { background: '#fdf8f0', color: 'var(--color-brass)', border: '1px solid #e8d5a0' },
    RESOLVED: { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' },
  };
  return (
    <span
      style={{
        ...styleMap[status],
        display: 'inline-block',
        padding: '1px 8px',
        borderRadius: 'var(--radius-tags)',
        fontFamily: 'var(--font-inter)',
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}
    >
      {status}
    </span>
  );
}

export default function LiveAlertFeed({ alerts, maxVisible = 6, onViewAll }: LiveAlertFeedProps) {
  const router = useRouter();

  const handleAlertClick = (alert: Alert) => {
    if (alert.entityType === 'CONSUMER') {
      router.push(`/consumers/${alert.entityId}`);
    } else if (alert.entityType === 'TRANSFORMER') {
      router.push(`/simulation?transformer=${alert.entityId}`);
    } else if (alert.entityType === 'FEEDER') {
      router.push(`/simulation?feeder=${alert.entityId}`);
    } else if (alert.entityType === 'CLUSTER') {
      router.push(`/investigations?cluster=${alert.entityId}`);
    }
  };

  const visibleAlerts = alerts.slice(0, maxVisible);

  return (
    <div className="card" style={{ height: '100%' }}>
      <div className="section-header">
        <span className="section-title">Live Alerts</span>
        {alerts.length > maxVisible && (
          <button
            className="section-link"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            onClick={onViewAll ?? (() => router.push('/investigations?filter=alerts'))}
          >
            View all {alerts.length}
          </button>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="empty-state">
          <div
            style={{
              fontFamily: 'var(--font-polysans)',
              fontSize: 15,
              color: 'var(--color-graphite)',
              marginBottom: 4,
            }}
          >
            No active anomalies detected.
          </div>
          <div style={{ color: 'var(--color-slate)', fontSize: 13 }}>
            Network operating within normal parameters.
          </div>
        </div>
      ) : (
        <div>
          {visibleAlerts.map((alert) => (
            <div
              key={alert.id}
              className="alert-row"
              onClick={() => handleAlertClick(alert)}
              style={{
                gridTemplateColumns: 'auto 1fr auto',
                display: 'grid',
                gap: '12px',
                alignItems: 'start',
              }}
            >
              {/* Left — dot + score */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, paddingTop: 3 }}>
                <RiskDot level={alert.riskLevel} />
                <span
                  style={{
                    fontFamily: 'var(--font-polysans)',
                    fontSize: 16,
                    letterSpacing: '-0.02em',
                    color:
                      alert.riskLevel === 'CRITICAL' ? 'var(--color-risk-critical)' :
                      alert.riskLevel === 'HIGH' ? 'var(--color-ember-orange)' :
                      alert.riskLevel === 'MEDIUM' ? 'var(--color-brass)' :
                      'var(--color-slate)',
                  }}
                >
                  {alert.anomalyScore}
                </span>
              </div>

              {/* Center — content */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-polysans)',
                      fontSize: 15,
                      letterSpacing: '-0.02em',
                      color: 'var(--color-graphite)',
                    }}
                  >
                    {alert.entityId}
                  </span>
                  <span className={`risk-badge ${riskLevelClass(alert.riskLevel)}`}>
                    {riskLabel(alert.riskLevel)}
                  </span>
                  <AlertStatusBadge status={alert.status} />
                </div>

                <div
                  style={{
                    fontFamily: 'var(--font-inter)',
                    fontSize: 12,
                    color: 'var(--color-ember-orange)',
                    fontWeight: 500,
                  }}
                >
                  {alertTypeLabel(alert.alertType)}
                </div>

                <div
                  style={{
                    fontFamily: 'var(--font-inter)',
                    fontSize: 12,
                    color: 'var(--color-steel)',
                    lineHeight: 1.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {alert.explanation}
                </div>

                {alert.affectedConsumers && alert.affectedConsumers.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Users size={11} color="var(--color-slate)" />
                    <span style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'var(--color-slate)' }}>
                      {alert.affectedConsumers.slice(0, 4).join(', ')}
                      {alert.affectedConsumers.length > 4 && ` +${alert.affectedConsumers.length - 4} more`}
                    </span>
                  </div>
                )}
              </div>

              {/* Right — time + arrow */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'var(--color-slate)' }}>
                  {timeAgo(alert.timestamp)}
                </span>
                <ArrowRight size={14} color="var(--color-slate)" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
