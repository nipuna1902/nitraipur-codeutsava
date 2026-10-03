'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/dashboard/Navbar';
import { useDashboard } from '@/hooks/useDashboard';
import {
  riskLevelClass,
  riskLabel,
  formatEnergy,
  formatPct,
  scoreColor,
} from '@/lib/utils';
import {
  Zap,
  Activity,
  AlertTriangle,
  Play,
  Pause,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronRight,
  Server,
  Layers,
  Users,
} from 'lucide-react';

interface TransformerNode {
  id: string;
  name: string;
  feeder: string;
  inputKwh: number;
  outputKwh: number;
  technicalLossPct: number;
  unexplainedLossKwh: number;
  unexplainedLossPct: number;
  status: 'NORMAL' | 'ELEVATED_LOSS' | 'CRITICAL_LEAK';
  meterCount: number;
  meters: {
    id: string;
    kwh: number;
    baseline: number;
    risk: 'NORMAL' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    tamperFlag: boolean;
  }[];
}

const TRANSFORMERS_DATA: TransformerNode[] = [
  {
    id: 'T01',
    name: 'Transformer T01 (Commercial Complex)',
    feeder: 'F01',
    inputKwh: 1520,
    outputKwh: 1335,
    technicalLossPct: 5.6,
    unexplainedLossKwh: 100,
    unexplainedLossPct: 6.6,
    status: 'CRITICAL_LEAK',
    meterCount: 30,
    meters: [
      { id: 'C042', kwh: 4.8, baseline: 18.5, risk: 'HIGH', tamperFlag: true },
      { id: 'C078', kwh: 5.2, baseline: 16.0, risk: 'HIGH', tamperFlag: true },
      { id: 'C033', kwh: 3.1, baseline: 19.2, risk: 'CRITICAL', tamperFlag: true },
      { id: 'C101', kwh: 6.0, baseline: 17.8, risk: 'HIGH', tamperFlag: true },
      { id: 'C005', kwh: 14.2, baseline: 14.0, risk: 'NORMAL', tamperFlag: false },
      { id: 'C012', kwh: 15.6, baseline: 15.2, risk: 'NORMAL', tamperFlag: false },
      { id: 'C028', kwh: 18.0, baseline: 17.5, risk: 'NORMAL', tamperFlag: false },
      { id: 'C039', kwh: 12.4, baseline: 13.0, risk: 'NORMAL', tamperFlag: false },
    ],
  },
  {
    id: 'T02',
    name: 'Transformer T02 (Residential Block A)',
    feeder: 'F01',
    inputKwh: 980,
    outputKwh: 924,
    technicalLossPct: 5.1,
    unexplainedLossKwh: 6,
    unexplainedLossPct: 0.6,
    status: 'NORMAL',
    meterCount: 25,
    meters: [
      { id: 'C014', kwh: 8.5, baseline: 8.2, risk: 'NORMAL', tamperFlag: false },
      { id: 'C019', kwh: 11.2, baseline: 9.5, risk: 'NORMAL', tamperFlag: false },
      { id: 'C025', kwh: 7.8, baseline: 8.0, risk: 'NORMAL', tamperFlag: false },
      { id: 'C031', kwh: 9.1, baseline: 9.0, risk: 'NORMAL', tamperFlag: false },
    ],
  },
  {
    id: 'T03',
    name: 'Transformer T03 (Mixed Commercial)',
    feeder: 'F02',
    inputKwh: 1140,
    outputKwh: 1060,
    technicalLossPct: 5.4,
    unexplainedLossKwh: 18,
    unexplainedLossPct: 1.6,
    status: 'NORMAL',
    meterCount: 22,
    meters: [
      { id: 'C051', kwh: 14.5, baseline: 14.0, risk: 'NORMAL', tamperFlag: false },
      { id: 'C055', kwh: 0.0, baseline: 12.0, risk: 'MEDIUM', tamperFlag: false },
      { id: 'C062', kwh: 13.8, baseline: 13.5, risk: 'NORMAL', tamperFlag: false },
    ],
  },
  {
    id: 'T04',
    name: 'Transformer T04 (Residential Block B)',
    feeder: 'F02',
    inputKwh: 850,
    outputKwh: 808,
    technicalLossPct: 4.8,
    unexplainedLossKwh: 1,
    unexplainedLossPct: 0.1,
    status: 'NORMAL',
    meterCount: 20,
    meters: [
      { id: 'C071', kwh: 6.5, baseline: 6.8, risk: 'NORMAL', tamperFlag: false },
      { id: 'C075', kwh: 7.2, baseline: 7.0, risk: 'NORMAL', tamperFlag: false },
    ],
  },
  {
    id: 'T05',
    name: 'Transformer T05 (Light Industrial)',
    feeder: 'F03',
    inputKwh: 2100,
    outputKwh: 1985,
    technicalLossPct: 5.2,
    unexplainedLossKwh: 6,
    unexplainedLossPct: 0.3,
    status: 'NORMAL',
    meterCount: 15,
    meters: [
      { id: 'C091', kwh: 45.0, baseline: 44.0, risk: 'NORMAL', tamperFlag: false },
      { id: 'C098', kwh: 52.0, baseline: 51.5, risk: 'NORMAL', tamperFlag: false },
    ],
  },
];

function SimulationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const transformerParam = searchParams.get('transformer')?.toUpperCase() || '';
  const feederParam = searchParams.get('feeder')?.toUpperCase() || '';

  const { data, isMockMode, lastPulseAt, refresh } = useDashboard({
    scenario: 'THEFT_TAMPERING',
    autoRefresh: true,
  });

  const [selectedTransformerId, setSelectedTransformerId] = useState<string>(
    transformerParam || 'T01'
  );
  const [selectedFeeder, setSelectedFeeder] = useState<string>(feederParam || 'ALL');
  const [isSimRunning, setIsSimRunning] = useState<boolean>(true);

  useEffect(() => {
    if (transformerParam) {
      setSelectedTransformerId(transformerParam);
    }
  }, [transformerParam]);

  const selectedTransformer =
    TRANSFORMERS_DATA.find((t) => t.id === selectedTransformerId) || TRANSFORMERS_DATA[0];

  const filteredTransformers =
    selectedFeeder === 'ALL'
      ? TRANSFORMERS_DATA
      : TRANSFORMERS_DATA.filter((t) => t.feeder === selectedFeeder);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-canvas-white)' }}>
      <Navbar
        simulationStatus={data?.simulationStatus}
        lastPulseAt={lastPulseAt}
        isMockMode={isMockMode}
        onRefresh={refresh}
      />

      <main>
        {/* Header Bar */}
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
                    Digital Twin Grid Topology
                  </h1>
                  <span className="sim-status sim-status--live" style={{ marginTop: 2 }}>
                    <span className="sim-dot sim-dot--live" />
                    LIVE MODEL
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
                  Interactive Substation &rarr; Feeder &rarr; Transformer &rarr; Meter energy flow balance
                </p>
              </div>

              {/* Simulation Run/Pause controls */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button
                  onClick={() => setIsSimRunning((r) => !r)}
                  className="btn-secondary"
                  style={{ fontSize: 13, padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  {isSimRunning ? <Pause size={14} color="#dc2626" /> : <Play size={14} color="#15803d" />}
                  {isSimRunning ? 'Pause Stream' : 'Resume Stream'}
                </button>
                <Link
                  href="/stress-test"
                  className="btn-primary"
                  style={{ textDecoration: 'none', fontSize: 13, padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  <Zap size={14} />
                  Simulate Grid Attack
                </Link>
              </div>
            </div>

            {/* Feeder selector tabs */}
            <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
              {['ALL', 'F01', 'F02', 'F03'].map((f) => (
                <button
                  key={f}
                  onClick={() => setSelectedFeeder(f)}
                  className={`btn-secondary ${selectedFeeder === f ? 'active' : ''}`}
                  style={{
                    fontSize: 12,
                    padding: '6px 14px',
                    background: selectedFeeder === f ? 'var(--color-graphite)' : 'transparent',
                    color: selectedFeeder === f ? '#ffffff' : 'var(--color-graphite)',
                  }}
                >
                  {f === 'ALL' ? 'All Feeders' : `Feeder ${f}`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Digital Twin Workspace */}
        <div style={{ background: 'var(--color-ash)', padding: '28px 0 60px' }}>
          <div className="page-container">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(380px, 1fr) 420px',
                gap: 'var(--spacing-20)',
                alignItems: 'start',
              }}
            >
              {/* Left Column: Grid Hierarchy Topology Visualizer */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Root Substation Node */}
                <div
                  className="kpi-card"
                  style={{
                    padding: '20px 24px',
                    borderLeft: '4px solid var(--color-ember-orange)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Server size={24} color="var(--color-ember-orange)" />
                    <div>
                      <div style={{ fontFamily: 'var(--font-polysans)', fontSize: 18, fontWeight: 500, color: 'var(--color-graphite)' }}>
                        Raipur Central Substation (33/11 kV)
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-slate)' }}>
                        Supply Frequency: 50.02 Hz · 3 Feeders Active · 120 Connected Meters
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--color-slate)' }}>Aggregated Grid Infeed</div>
                    <div style={{ fontSize: 18, fontFamily: 'var(--font-polysans)', fontWeight: 600, color: 'var(--color-graphite)' }}>
                      6,590 kWh
                    </div>
                  </div>
                </div>

                {/* Transformer Network Nodes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-slate)', paddingLeft: 4 }}>
                    Distribution Transformers on Selected Feeder
                  </div>

                  {filteredTransformers.map((t) => {
                    const isSelected = t.id === selectedTransformer.id;
                    const hasLoss = t.status === 'CRITICAL_LEAK';

                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTransformerId(t.id)}
                        className="kpi-card"
                        style={{
                          padding: '18px 24px',
                          cursor: 'pointer',
                          border: isSelected
                            ? '2px solid var(--color-graphite)'
                            : hasLoss
                            ? '1.5px solid #fca5a5'
                            : '1px solid var(--color-mist)',
                          background: hasLoss ? '#fff5f5' : '#ffffff',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Zap
                              size={18}
                              color={hasLoss ? '#dc2626' : 'var(--color-ember-orange)'}
                            />
                            <span style={{ fontFamily: 'var(--font-polysans)', fontSize: 16, fontWeight: 500, color: 'var(--color-graphite)' }}>
                              {t.name}
                            </span>
                            <span className="tag" style={{ fontSize: 11 }}>
                              Feeder {t.feeder}
                            </span>
                          </div>

                          <span
                            style={{
                              fontSize: 11,
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontWeight: 600,
                              background: hasLoss ? '#fee2e2' : '#dcfce7',
                              color: hasLoss ? '#dc2626' : '#15803d',
                            }}
                          >
                            {hasLoss ? 'UNEXPLAINED LOSS DETECTED' : 'NORMAL BALANCE'}
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, fontSize: 12 }}>
                          <div>
                            <span style={{ color: 'var(--color-slate)' }}>Input: </span>
                            <strong>{t.inputKwh} kWh</strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--color-slate)' }}>Consumer Sum: </span>
                            <strong>{t.outputKwh} kWh</strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--color-slate)' }}>Tech Loss: </span>
                            <strong>{t.technicalLossPct}%</strong>
                          </div>
                          <div>
                            <span style={{ color: hasLoss ? '#dc2626' : 'var(--color-slate)' }}>
                              Unexplained:{' '}
                            </span>
                            <strong style={{ color: hasLoss ? '#dc2626' : 'var(--color-graphite)' }}>
                              {t.unexplainedLossKwh} kWh ({t.unexplainedLossPct}%)
                            </strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Transformer Detail & Downstream Meters */}
              <div
                className="kpi-card"
                style={{
                  padding: '24px 28px',
                  position: 'sticky',
                  top: 80,
                }}
              >
                <div style={{ borderBottom: '1px solid var(--color-mist)', paddingBottom: 16, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span className="tag">{selectedTransformer.feeder}</span>
                    <span style={{ fontSize: 12, color: 'var(--color-slate)' }}>
                      {selectedTransformer.meterCount} Meters Connected
                    </span>
                  </div>
                  <h2
                    style={{
                      fontFamily: 'var(--font-polysans)',
                      fontSize: 22,
                      fontWeight: 400,
                      margin: 0,
                      color: 'var(--color-graphite)',
                    }}
                  >
                    {selectedTransformer.name}
                  </h2>
                </div>

                {/* Energy Balance Breakdown */}
                <div style={{ background: 'var(--color-fog)', padding: '16px 20px', borderRadius: 'var(--radius-cards)', marginBottom: 20 }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-slate)', marginBottom: 12 }}>
                    Energy Balance Equation
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-slate)' }}>Transformer Secondary Infeed:</span>
                      <strong>{selectedTransformer.inputKwh} kWh</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-slate)' }}>Aggregated Consumer Meter Readings:</span>
                      <strong>- {selectedTransformer.outputKwh} kWh</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-slate)' }}>Expected Technical Resistance Loss:</span>
                      <strong>- {Math.round(selectedTransformer.inputKwh * (selectedTransformer.technicalLossPct / 100))} kWh</strong>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        paddingTop: 8,
                        marginTop: 4,
                        borderTop: '1px dashed var(--color-mist)',
                        color: selectedTransformer.unexplainedLossKwh > 20 ? '#dc2626' : 'var(--color-graphite)',
                        fontWeight: 600,
                      }}
                    >
                      <span>Unexplained Energy Deficit:</span>
                      <span>{selectedTransformer.unexplainedLossKwh} kWh ({selectedTransformer.unexplainedLossPct}%)</span>
                    </div>
                  </div>
                </div>

                {/* Downstream Meter Sample */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-slate)' }}>
                      Connected Meters ({selectedTransformer.meters.length} Shown)
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--color-slate)' }}>Click to inspect</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
                    {selectedTransformer.meters.map((m) => (
                      <Link
                        key={m.id}
                        href={`/consumers/${m.id}`}
                        style={{
                          textDecoration: 'none',
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-cards)',
                          background: m.tamperFlag ? '#fff5f5' : 'var(--color-canvas-white)',
                          border: m.tamperFlag ? '1px solid #fecaca' : '1px solid var(--color-mist)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          color: 'var(--color-graphite)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className={`risk-dot ${riskLevelClass(m.risk)}`} />
                          <strong style={{ fontSize: 13 }}>{m.id}</strong>
                          {m.tamperFlag && (
                            <span style={{ fontSize: 11, color: '#dc2626', background: '#fee2e2', padding: '1px 6px', borderRadius: 4 }}>
                              Tamper Suspect
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
                          <div>
                            <span style={{ color: 'var(--color-slate)' }}>Now: </span>
                            <strong>{m.kwh} kWh</strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--color-slate)' }}>Exp: </span>
                            <span>{m.baseline} kWh</span>
                          </div>
                          <ChevronRight size={14} color="var(--color-slate)" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--color-mist)' }}>
                  <Link
                    href={`/investigations?filter=transformer_loss`}
                    className="btn-secondary"
                    style={{ textDecoration: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, width: '100%', fontSize: 13 }}
                  >
                    View All Transformer Loss Cases
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SimulationPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="skeleton" style={{ width: 300, height: 24 }} />
        </div>
      }
    >
      <SimulationContent />
    </Suspense>
  );
}
