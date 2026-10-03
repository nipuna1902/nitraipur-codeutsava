'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { InspectionPriority } from '@/types/dashboard';
import { riskLevelClass, riskLabel, probableCauseLabel, formatPct } from '@/lib/utils';

interface InspectionPriorityListProps {
  priorities: InspectionPriority[];
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className="score-bar-track" style={{ flex: 1 }}>
        <div
          className="score-bar-fill"
          style={{
            width: `${confidence}%`,
            background:
              confidence >= 85 ? 'var(--color-ember-orange)' :
              confidence >= 70 ? 'var(--color-brass)' :
              'var(--color-slate)',
          }}
        />
      </div>
      <span
        style={{
          fontFamily: 'var(--font-inter)',
          fontSize: 12,
          color: 'var(--color-steel)',
          minWidth: 36,
        }}
      >
        {formatPct(confidence, 0)}
      </span>
    </div>
  );
}

function PriorityRow({ priority }: { priority: InspectionPriority }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  const handleNavigate = () => {
    if (priority.entityType === 'CONSUMER') {
      router.push(`/consumers/${priority.entityId}`);
    } else if (priority.entityType === 'TRANSFORMER') {
      router.push(`/simulation?transformer=${priority.entityId}`);
    } else {
      router.push(`/investigations?cluster=${priority.entityId}`);
    }
  };

  return (
    <div
      style={{
        borderBottom: '1px solid var(--color-mist)',
        transition: 'background 0.1s ease',
      }}
    >
      {/* Main row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '40px 120px auto 1fr auto',
          gap: 'var(--spacing-12)',
          padding: '14px 0',
          alignItems: 'center',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Rank */}
        <div
          className="priority-rank"
          style={{
            fontFamily: 'var(--font-polysans)',
            fontSize: 24,
            letterSpacing: '-0.04em',
            color: expanded ? 'var(--color-graphite)' : 'var(--color-mist)',
            transition: 'color 0.2s ease',
          }}
        >
          {priority.rank < 10 ? `0${priority.rank}` : priority.rank}
        </div>

        {/* Entity */}
        <div>
          <div
            style={{
              fontFamily: 'var(--font-polysans)',
              fontSize: 16,
              letterSpacing: '-0.02em',
              color: 'var(--color-graphite)',
            }}
          >
            {priority.entityId}
          </div>
          <div style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'var(--color-slate)' }}>
            {priority.entityType}
          </div>
        </div>

        {/* Risk + score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`risk-badge ${riskLevelClass(priority.riskLevel)}`}>
            {riskLabel(priority.riskLevel)}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-polysans)',
              fontSize: 20,
              letterSpacing: '-0.02em',
              color:
                priority.anomalyScore >= 90 ? 'var(--color-risk-critical)' :
                priority.anomalyScore >= 75 ? 'var(--color-ember-orange)' :
                'var(--color-graphite)',
            }}
          >
            {priority.anomalyScore}
          </span>
        </div>

        {/* Cause + confidence */}
        <div>
          <div
            style={{
              fontFamily: 'var(--font-inter)',
              fontSize: 13,
              color: 'var(--color-steel)',
              marginBottom: 4,
            }}
          >
            {probableCauseLabel(priority.probableCause)}
          </div>
          <ConfidenceBar confidence={priority.confidence} />
        </div>

        {/* Expand chevron */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          {expanded ? (
            <ChevronDown size={16} color="var(--color-slate)" />
          ) : (
            <ChevronRight size={16} color="var(--color-slate)" />
          )}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div
          style={{
            padding: '0 0 16px 52px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {/* Detection period */}
          <div>
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
              Detection Period
            </span>
            <div
              style={{
                fontFamily: 'var(--font-inter)',
                fontSize: 13,
                color: 'var(--color-steel)',
                marginTop: 2,
              }}
            >
              {priority.detectionPeriod}
            </div>
          </div>

          {/* Key evidence */}
          <div>
            <div
              style={{
                fontFamily: 'var(--font-inter)',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--color-slate)',
                marginBottom: 6,
              }}
            >
              Key Evidence
            </div>
            <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {priority.keyEvidence.map((e, i) => (
                <li
                  key={i}
                  style={{
                    fontFamily: 'var(--font-inter)',
                    fontSize: 13,
                    color: 'var(--color-steel)',
                    lineHeight: 1.5,
                  }}
                >
                  {e}
                </li>
              ))}
            </ul>
          </div>

          {/* Recommended action */}
          <div
            style={{
              background: 'var(--color-ivory)',
              borderRadius: 'var(--radius-cards)',
              padding: '10px 14px',
              borderLeft: '3px solid var(--color-brass)',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-inter)',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--color-brass)',
                marginBottom: 4,
              }}
            >
              Recommended Action
            </div>
            <div
              style={{
                fontFamily: 'var(--font-inter)',
                fontSize: 13,
                color: 'var(--color-steel)',
                lineHeight: 1.5,
              }}
            >
              {priority.recommendedAction}
            </div>
          </div>

          {/* Navigate button */}
          <button
            className="btn-primary"
            style={{ alignSelf: 'flex-start', fontSize: 13 }}
            onClick={handleNavigate}
          >
            Open Investigation
            <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function InspectionPriorityList({ priorities }: InspectionPriorityListProps) {
  const router = useRouter();

  return (
    <div className="card">
      <div className="section-header">
        <span className="section-title">Inspection Priorities</span>
        {priorities.length > 0 && (
          <a
            href="/investigations"
            className="section-link"
            onClick={(e) => { e.preventDefault(); router.push('/investigations'); }}
          >
            Open Investigations
          </a>
        )}
      </div>

      {priorities.length === 0 ? (
        <div className="empty-state">
          <div
            style={{
              fontFamily: 'var(--font-polysans)',
              fontSize: 15,
              color: 'var(--color-graphite)',
              marginBottom: 4,
            }}
          >
            No inspection priorities.
          </div>
          <div style={{ color: 'var(--color-slate)', fontSize: 13 }}>
            The anomaly engine has not flagged any cases requiring field inspection.
          </div>
        </div>
      ) : (
        <div>
          {priorities.map((p) => (
            <PriorityRow key={p.entityId} priority={p} />
          ))}
        </div>
      )}
    </div>
  );
}
