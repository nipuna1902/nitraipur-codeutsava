'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import type { TransformerLossEntry } from '@/types/dashboard';
import { formatEnergy, formatPct, riskLevelClass, riskLabel } from '@/lib/utils';

interface TransformerLossTableProps {
  losses: TransformerLossEntry[];
}

export default function TransformerLossTable({ losses }: TransformerLossTableProps) {
  const router = useRouter();

  const sortedLosses = [...losses].sort(
    (a, b) => b.unexplainedLossPct - a.unexplainedLossPct
  );

  return (
    <div className="card">
      <div className="section-header">
        <span className="section-title">Transformer / Feeder Loss</span>
        <a
          href="/investigations?filter=transformer_loss"
          className="section-link"
          onClick={(e) => { e.preventDefault(); router.push('/investigations?filter=transformer_loss'); }}
        >
          View all
        </a>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {/* Header row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '80px 1fr 1fr 100px 100px 80px',
            gap: 'var(--spacing-12)',
            padding: '0 0 8px 0',
            borderBottom: '1px solid var(--color-mist)',
          }}
        >
          {['ID', 'Input / Consumer', 'Technical loss', 'Unexplained', 'Risk', ''].map((h) => (
            <div
              key={h}
              style={{
                fontFamily: 'var(--font-inter)',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--color-slate)',
              }}
            >
              {h}
            </div>
          ))}
        </div>

        {sortedLosses.map((entry) => (
          <div
            key={entry.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '80px 1fr 1fr 100px 100px 80px',
              gap: 'var(--spacing-12)',
              padding: '12px 0',
              borderBottom: '1px solid var(--color-mist)',
              cursor: 'pointer',
              alignItems: 'center',
              transition: 'background 0.1s ease',
            }}
            onClick={() => router.push(`/simulation?transformer=${entry.id}`)}
          >
            {/* ID */}
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-polysans)',
                  fontSize: 15,
                  letterSpacing: '-0.02em',
                  color: 'var(--color-graphite)',
                }}
              >
                {entry.id}
              </div>
              {entry.suspiciousConsumers > 0 && (
                <div
                  style={{
                    fontFamily: 'var(--font-inter)',
                    fontSize: 11,
                    color: 'var(--color-ember-orange)',
                  }}
                >
                  {entry.suspiciousConsumers} suspicious
                </div>
              )}
            </div>

            {/* Input / Consumer energy */}
            <div>
              <div style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'var(--color-graphite)' }}>
                In: {formatEnergy(entry.inputEnergy)}
              </div>
              <div style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--color-slate)' }}>
                Out: {formatEnergy(entry.consumerEnergy)}
              </div>
            </div>

            {/* Technical loss */}
            <div>
              <div style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'var(--color-steel)' }}>
                {formatEnergy(entry.technicalLoss)}
              </div>
              <div style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'var(--color-slate)' }}>
                Observed: {formatEnergy(entry.observedLoss)}
              </div>
            </div>

            {/* Unexplained loss */}
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-polysans)',
                  fontSize: 16,
                  letterSpacing: '-0.02em',
                  color:
                    entry.unexplainedLossPct > 5 ? 'var(--color-ember-orange)' :
                    entry.unexplainedLossPct > 2 ? 'var(--color-brass)' :
                    'var(--color-graphite)',
                }}
              >
                {formatEnergy(entry.unexplainedLoss)}
              </div>
              <div style={{ fontFamily: 'var(--font-inter)', fontSize: 11, color: 'var(--color-slate)' }}>
                {formatPct(entry.unexplainedLossPct)}
              </div>
            </div>

            {/* Risk */}
            <div>
              <span className={`risk-badge ${riskLevelClass(entry.riskStatus)}`}>
                {riskLabel(entry.riskStatus)}
              </span>
            </div>

            {/* Arrow */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <ArrowRight size={14} color="var(--color-slate)" />
            </div>
          </div>
        ))}

        {sortedLosses.length === 0 && (
          <div className="empty-state">No transformer loss data available.</div>
        )}
      </div>
    </div>
  );
}
