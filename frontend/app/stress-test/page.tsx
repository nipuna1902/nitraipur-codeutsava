'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/dashboard/Navbar';
import { useDashboard } from '@/hooks/useDashboard';
import type { SimulationMode } from '@/types/dashboard';
import {
  Zap,
  Activity,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Gauge,
  Sliders,
  Terminal,
  ShieldCheck,
} from 'lucide-react';

interface ScenarioDef {
  id: SimulationMode;
  name: string;
  tag: string;
  description: string;
  expectedOutcome: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'NORMAL';
}

const SCENARIOS: ScenarioDef[] = [
  {
    id: 'THEFT_TAMPERING',
    name: 'Coordinated Commercial Theft',
    tag: 'Energy Diversion',
    description: 'Bypasses 70% of current on 4 commercial meters on Transformer T01 while keeping smart meter communication links active.',
    expectedOutcome: 'System detects transformer energy gap, flags meters as PROBABLE_THEFT_TAMPERING within 2 simulation cycles.',
    severity: 'CRITICAL',
  },
  {
    id: 'COMMUNICATION_FAILURE',
    name: 'AMI Communication Blackout',
    tag: 'RF Mesh Disconnect',
    description: 'Simulates sudden packet drop for 24 meters on Feeder F02 due to gateway outage.',
    expectedOutcome: 'System correctly identifies COMMUNICATION_FAILURE and SUPPRESSES false theft alarms.',
    severity: 'MEDIUM',
  },
  {
    id: 'METER_MALFUNCTION',
    name: 'Meter Voltage Transducer Glitch',
    tag: 'Sensor Fault',
    description: 'Injects erratic voltage harmonics and inconsistent pulse counts into Meter C011.',
    expectedOutcome: 'Classified as METER_MALFUNCTION rather than theft. Recommends bench calibration.',
    severity: 'HIGH',
  },
  {
    id: 'SEASONAL_VARIATION',
    name: 'Summer Heatwave Load Surge',
    tag: 'Legitimate Surge',
    description: 'Increases all residential air conditioning loads by 45% on Feeder F01 without transformer imbalance.',
    expectedOutcome: 'Energy balance matches at transformer level. Zero theft alerts triggered (0% false positives).',
    severity: 'NORMAL',
  },
];

function StressTestContent() {
  const [selectedScenario, setSelectedScenario] = useState<SimulationMode>('THEFT_TAMPERING');
  const [readingRate, setReadingRate] = useState<number>(60);
  const [isInjecting, setIsInjecting] = useState<boolean>(false);
  const [eventLogs, setEventLogs] = useState<string[]>([
    'System initialized in benchmark mode.',
    'Telemetry baseline verified across 120 smart meters.',
    'Model inference engine running XGBoost + Isolation Forest dual pipeline.',
  ]);

  const { data, isMockMode, lastPulseAt, refresh, setScenario } = useDashboard({
    scenario: selectedScenario,
    autoRefresh: true,
  });

  const handleApplyScenario = (scenarioId: SimulationMode) => {
    setSelectedScenario(scenarioId);
    setScenario(scenarioId);
    setIsInjecting(true);
    setEventLogs((prev) => [
      `[${new Date().toLocaleTimeString()}] INJECTED: Scenario switched to ${scenarioId}`,
      `[${new Date().toLocaleTimeString()}] Telemetry flow adjusted: ${readingRate} readings/sec`,
      `[${new Date().toLocaleTimeString()}] AI engine re-evaluating distribution state...`,
      ...prev.slice(0, 10),
    ]);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-canvas-white)' }}>
      <Navbar
        simulationStatus={data?.simulationStatus}
        lastPulseAt={lastPulseAt}
        isMockMode={isMockMode}
        onRefresh={refresh}
      />

      <main>
        {/* Header */}
        <div style={{ background: 'var(--color-canvas-white)', paddingTop: 32, paddingBottom: 24, borderBottom: '1px solid var(--color-mist)' }}>
          <div className="page-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                    Stress Test & Scenario Injection
                  </h1>
                  <span className="tag" style={{ background: 'var(--color-graphite)', color: '#fff', fontSize: 11 }}>
                    BENCHMARK LAB
                  </span>
                </div>
                <p
                  style={{
                    fontFamily: 'var(--font-inter)',
                    fontSize: 15,
                    color: 'var(--color-slate)',
                    margin: '6px 0 0 0',
                  }}
                >
                  Evaluate AI model robustness, detection latency, and false-positive suppression under adverse conditions
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <Link
                  href="/"
                  className="btn-secondary"
                  style={{ textDecoration: 'none', fontSize: 13, padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  View in Overview Dashboard
                </Link>
                <Link
                  href="/simulation"
                  className="btn-primary"
                  style={{ textDecoration: 'none', fontSize: 13, padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  <Zap size={14} />
                  View in Digital Twin
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Workspace */}
        <div style={{ background: 'var(--color-ash)', padding: '28px 0 60px' }}>
          <div className="page-container">
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(360px, 1fr) 440px', gap: 'var(--spacing-20)', alignItems: 'start' }}>
              {/* Left Column: Attack & Stress Scenarios */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-slate)', paddingLeft: 4 }}>
                  Select Scenario to Inject into Real-Time Simulator
                </div>

                {SCENARIOS.map((sc) => {
                  const isSelected = sc.id === selectedScenario;
                  return (
                    <div
                      key={sc.id}
                      onClick={() => handleApplyScenario(sc.id)}
                      className="kpi-card"
                      style={{
                        padding: '20px 24px',
                        cursor: 'pointer',
                        border: isSelected
                          ? '2px solid var(--color-graphite)'
                          : '1px solid var(--color-mist)',
                        boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                        background: '#ffffff',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background:
                                sc.severity === 'CRITICAL'
                                  ? '#dc2626'
                                  : sc.severity === 'HIGH'
                                  ? '#ff682c'
                                  : sc.severity === 'MEDIUM'
                                  ? '#816729'
                                  : '#15803d',
                            }}
                          />
                          <span style={{ fontFamily: 'var(--font-polysans)', fontSize: 17, fontWeight: 500, color: 'var(--color-graphite)' }}>
                            {sc.name}
                          </span>
                        </div>
                        <span className="tag" style={{ fontSize: 11 }}>
                          {sc.tag}
                        </span>
                      </div>

                      <p style={{ margin: '0 0 12px 0', fontSize: 13, color: 'var(--color-steel)', lineHeight: 1.5 }}>
                        {sc.description}
                      </p>

                      <div
                        style={{
                          background: 'var(--color-fog)',
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-cards)',
                          fontSize: 12,
                          color: 'var(--color-graphite)',
                          lineHeight: 1.4,
                        }}
                      >
                        <strong>Expected AI Behavior:</strong> {sc.expectedOutcome}
                      </div>

                      {isSelected && (
                        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-ember-orange)', fontWeight: 600 }}>
                          <CheckCircle2 size={14} /> Currently Active in Dashboard & Simulator
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Performance Benchmarks & Engine Telemetry Rate */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Rate Control Card */}
                <div className="kpi-card" style={{ padding: '24px 28px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <Sliders size={20} color="var(--color-graphite)" />
                    <h2
                      style={{
                        fontFamily: 'var(--font-polysans)',
                        fontSize: 18,
                        fontWeight: 400,
                        margin: 0,
                        color: 'var(--color-graphite)',
                      }}
                    >
                      Telemetry Injection Rate
                    </h2>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                      <span style={{ color: 'var(--color-slate)' }}>Streaming Frequency:</span>
                      <strong>{readingRate} readings / sec</strong>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={300}
                      step={10}
                      value={readingRate}
                      onChange={(e) => setReadingRate(Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--color-ember-orange)', cursor: 'pointer' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-slate)', marginTop: 4 }}>
                      <span>10/s (Standard)</span>
                      <span>150/s (Stress)</span>
                      <span>300/s (Peak Flood)</span>
                    </div>
                  </div>

                  <div style={{ background: 'var(--color-fog)', padding: '12px 16px', borderRadius: 'var(--radius-cards)', fontSize: 12, color: 'var(--color-steel)' }}>
                    High-frequency injection evaluates whether the isolation-forest + loss-balance inference pipeline drops packets or degrades detection fidelity under peak grid load.
                  </div>
                </div>

                {/* AI Pipeline Telemetry Metrics */}
                <div className="kpi-card" style={{ padding: '24px 28px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <Gauge size={20} color="var(--color-graphite)" />
                    <h2
                      style={{
                        fontFamily: 'var(--font-polysans)',
                        fontSize: 18,
                        fontWeight: 400,
                        margin: 0,
                        color: 'var(--color-graphite)',
                      }}
                    >
                      AI Pipeline Latency & Accuracy
                    </h2>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
                    <div style={{ background: 'var(--color-fog)', padding: '12px 16px', borderRadius: 'var(--radius-cards)' }}>
                      <div style={{ fontSize: 11, color: 'var(--color-slate)' }}>Ingestion Latency</div>
                      <div style={{ fontSize: 20, fontFamily: 'var(--font-polysans)', fontWeight: 600, color: 'var(--color-graphite)' }}>
                        14 ms
                      </div>
                    </div>
                    <div style={{ background: 'var(--color-fog)', padding: '12px 16px', borderRadius: 'var(--radius-cards)' }}>
                      <div style={{ fontSize: 11, color: 'var(--color-slate)' }}>Feature Extraction</div>
                      <div style={{ fontSize: 20, fontFamily: 'var(--font-polysans)', fontWeight: 600, color: 'var(--color-graphite)' }}>
                        28 ms
                      </div>
                    </div>
                    <div style={{ background: 'var(--color-fog)', padding: '12px 16px', borderRadius: 'var(--radius-cards)' }}>
                      <div style={{ fontSize: 11, color: 'var(--color-slate)' }}>Inference Time</div>
                      <div style={{ fontSize: 20, fontFamily: 'var(--font-polysans)', fontWeight: 600, color: 'var(--color-graphite)' }}>
                        8 ms
                      </div>
                    </div>
                    <div style={{ background: 'var(--color-fog)', padding: '12px 16px', borderRadius: 'var(--radius-cards)' }}>
                      <div style={{ fontSize: 11, color: 'var(--color-slate)' }}>False Positive Suppress</div>
                      <div style={{ fontSize: 20, fontFamily: 'var(--font-polysans)', fontWeight: 600, color: '#15803d' }}>
                        99.4%
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--color-slate)' }}>
                    <ShieldCheck size={16} color="#15803d" />
                    Robust against ambient noise and seasonal bias
                  </div>
                </div>

                {/* Console Log Feed */}
                <div className="kpi-card" style={{ padding: '20px 24px', background: '#1c1c1c', color: '#eaeaea' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Terminal size={15} color="var(--color-ember-orange)" />
                    <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#999', textTransform: 'uppercase' }}>
                      Simulator Telemetry Stream
                    </span>
                  </div>

                  <div style={{ fontFamily: 'monospace', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                    {eventLogs.map((log, idx) => (
                      <div key={idx} style={{ color: idx === 0 ? 'var(--color-ember-orange)' : '#bbb' }}>
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function StressTestPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="skeleton" style={{ width: 300, height: 24 }} />
        </div>
      }
    >
      <StressTestContent />
    </Suspense>
  );
}
