'use client';

import { useEffect, useRef, useState } from 'react';
import { useDashboard } from '@/hooks/useDashboard';
import type { SimulationMode } from '@/types/dashboard';

import Navbar from '@/components/dashboard/Navbar';
import KpiGrid from '@/components/dashboard/KpiGrid';
import NetworkHealthPanel from '@/components/dashboard/NetworkHealthPanel';
import LiveAlertFeed from '@/components/dashboard/LiveAlertFeed';
import RiskDistributionChart from '@/components/dashboard/RiskDistributionChart';
import ConsumptionTrendChart from '@/components/dashboard/ConsumptionTrendChart';
import TransformerLossTable from '@/components/dashboard/TransformerLossTable';
import InspectionPriorityList from '@/components/dashboard/InspectionPriorityList';
import SimulationStatusBar from '@/components/dashboard/SimulationStatusBar';

export default function OverviewPage() {
  const { data, isLoading, error, isMockMode, lastPulseAt, refresh, setScenario } = useDashboard({
    scenario: 'THEFT_TAMPERING',
    autoRefresh: true,
  });

  const [flashKey, setFlashKey] = useState(0);
  const prevAnomalies = useRef<number | null>(null);

  // Flash when new anomalies arrive
  useEffect(() => {
    if (!data) return;
    const current = data.networkSummary.activeAnomalies;
    if (prevAnomalies.current !== null && current !== prevAnomalies.current) {
      setFlashKey((k) => k + 1);
    }
    prevAnomalies.current = current;
  }, [data?.networkSummary.activeAnomalies]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-canvas-white)' }}>
      <Navbar
        simulationStatus={data?.simulationStatus}
        lastPulseAt={lastPulseAt}
        isMockMode={isMockMode}
        onRefresh={refresh}
      />

      <main>
        {/* ── Simulation status bar ──────────────────────────────── */}
        <div style={{ background: 'var(--color-fog)', borderBottom: '1px solid var(--color-mist)' }}>
          <div className="page-container" style={{ padding: '12px var(--spacing-20)' }}>
            {data && (
              <SimulationStatusBar
                status={data.simulationStatus}
                onScenarioChange={(mode: SimulationMode) => setScenario(mode)}
                isMockMode={isMockMode}
              />
            )}
            {!data && isLoading && (
              <div style={{ height: 44, display: 'flex', alignItems: 'center' }}>
                <div className="skeleton" style={{ width: 200, height: 20 }} />
              </div>
            )}
          </div>
        </div>

        {/* ── Page header ────────────────────────────────────────── */}
        <div style={{ background: 'var(--color-canvas-white)', paddingTop: 36, paddingBottom: 24 }}>
          <div className="page-container">
            <div style={{ marginBottom: 24 }}>
              <h1
                style={{
                  fontFamily: 'var(--font-polysans)',
                  fontSize: 32,
                  fontWeight: 400,
                  letterSpacing: '-0.64px',
                  lineHeight: 1.19,
                  color: 'var(--color-graphite)',
                  margin: 0,
                }}
              >
                Overview
              </h1>
              <p
                style={{
                  fontFamily: 'var(--font-inter)',
                  fontSize: 15,
                  color: 'var(--color-slate)',
                  margin: '6px 0 0 0',
                  lineHeight: 1.5,
                }}
              >
                Current network state · What is happening right now
              </p>
            </div>

            {/* ── KPI section ──────────────────────────────────── */}
            {isLoading ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: 'var(--spacing-12)',
                }}
              >
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="kpi-card"
                    style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                  >
                    <div className="skeleton" style={{ height: 12, width: '60%' }} />
                    <div className="skeleton" style={{ height: 36, width: '50%' }} />
                    <div className="skeleton" style={{ height: 12, width: '80%' }} />
                  </div>
                ))}
              </div>
            ) : data ? (
              <div key={flashKey} className={flashKey > 0 ? 'flash-update' : ''}>
                <KpiGrid summary={data.networkSummary} />
              </div>
            ) : null}

            {error && (
              <div
                style={{
                  marginTop: 16,
                  padding: '10px 16px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 'var(--radius-cards)',
                  fontFamily: 'var(--font-inter)',
                  fontSize: 13,
                  color: '#dc2626',
                }}
              >
                {error}
              </div>
            )}
          </div>
        </div>

        {/* ── Main content — alternating ash/white bands ─────────── */}

        {/* Band 1 — ASH: Health + Alerts (side by side) */}
        <div style={{ background: 'var(--color-ash)', padding: '36px 0' }}>
          <div className="page-container">
            {isLoading ? (
              <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 'var(--spacing-20)' }}>
                <div className="skeleton" style={{ height: 400, borderRadius: 'var(--radius-cards)' }} />
                <div className="skeleton" style={{ height: 400, borderRadius: 'var(--radius-cards)' }} />
              </div>
            ) : data ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '320px 1fr',
                  gap: 'var(--spacing-20)',
                  alignItems: 'start',
                }}
              >
                <NetworkHealthPanel health={data.networkHealth} />
                <LiveAlertFeed
                  alerts={data.alerts}
                  maxVisible={6}
                />
              </div>
            ) : null}
          </div>
        </div>

        {/* Band 2 — WHITE: Consumption trend + Risk distribution */}
        <div style={{ background: 'var(--color-canvas-white)', padding: '36px 0' }}>
          <div className="page-container">
            {isLoading ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 'var(--spacing-20)' }}>
                <div className="skeleton" style={{ height: 320, borderRadius: 'var(--radius-cards)' }} />
                <div className="skeleton" style={{ height: 320, borderRadius: 'var(--radius-cards)' }} />
              </div>
            ) : data ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 340px',
                  gap: 'var(--spacing-20)',
                  alignItems: 'start',
                }}
              >
                <ConsumptionTrendChart trend={data.consumptionTrend} />
                <RiskDistributionChart distribution={data.riskDistribution} />
              </div>
            ) : null}
          </div>
        </div>

        {/* Band 3 — ASH: Transformer loss */}
        <div style={{ background: 'var(--color-ash)', padding: '36px 0' }}>
          <div className="page-container">
            {isLoading ? (
              <div className="skeleton" style={{ height: 280, borderRadius: 'var(--radius-cards)' }} />
            ) : data ? (
              <TransformerLossTable losses={data.transformerLosses} />
            ) : null}
          </div>
        </div>

        {/* Band 4 — WHITE: Inspection priorities */}
        <div style={{ background: 'var(--color-canvas-white)', padding: '36px 0 60px' }}>
          <div className="page-container">
            {isLoading ? (
              <div className="skeleton" style={{ height: 360, borderRadius: 'var(--radius-cards)' }} />
            ) : data ? (
              <InspectionPriorityList priorities={data.inspectionPriorities} />
            ) : null}
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div
          style={{
            background: 'var(--color-ash)',
            borderTop: '1px solid var(--color-mist)',
            padding: '16px 0',
          }}
        >
          <div
            className="page-container"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-inter)',
                fontSize: 12,
                color: 'var(--color-slate)',
              }}
            >
              GridGuard · Anomaly Detection Command Center
              {data?.isMockData && ' · Running on mock data'}
            </span>
            {data && (
              <span
                style={{
                  fontFamily: 'var(--font-inter)',
                  fontSize: 12,
                  color: 'var(--color-slate)',
                }}
              >
                Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
