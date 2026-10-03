'use client';

import { use, useState, useMemo } from 'react';
import Link from 'next/link';
import Navbar from '@/components/dashboard/Navbar';
import { useDashboard } from '@/hooks/useDashboard';
import {
  riskLevelClass,
  riskLabel,
  alertTypeLabel,
  scoreColor,
  timeAgo,
} from '@/lib/utils';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import {
  ArrowLeft,
  ShieldAlert,
  AlertTriangle,
  Zap,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Download,
  Share2,
  Calendar,
} from 'lucide-react';

interface ConsumerPageProps {
  params: Promise<{ id: string }>;
}

export default function ConsumerDetailPage({ params }: ConsumerPageProps) {
  const resolvedParams = use(params);
  const consumerId = resolvedParams.id.toUpperCase();

  const { data, isMockMode, lastPulseAt, refresh } = useDashboard({
    scenario: 'THEFT_TAMPERING',
    autoRefresh: false,
  });

  const [timeRange, setTimeRange] = useState<'24h' | '7d'>('24h');
  const [investigationStatus, setInvestigationStatus] = useState<'FLAGGED' | 'INVESTIGATING' | 'VERIFIED_THEFT' | 'CLEARED'>('FLAGGED');

  // Generate hourly mock profile for this consumer
  const chartData = useMemo(() => {
    const points = [];
    const count = timeRange === '24h' ? 24 : 7;
    const now = Date.now();

    for (let i = count; i >= 0; i--) {
      if (timeRange === '24h') {
        const time = new Date(now - i * 3600 * 1000);
        const hour = time.getHours();
        // Normal baseline commercial profile with daytime peak
        const baseline = Math.round((12 + 18 * Math.sin(((hour - 6) * Math.PI) / 12) + (Math.random() * 2)) * 10) / 10;
        // Suppressed observed consumption simulating a bypass tamper
        const isTampered = hour >= 9 && hour <= 21;
        const observed = isTampered ? Math.round(baseline * 0.26 * 10) / 10 : Math.round(baseline * 0.9 * 10) / 10;

        points.push({
          label: `${hour.toString().padStart(2, '0')}:00`,
          observed: Math.max(0.5, observed),
          baseline: Math.max(2.0, baseline),
          peerAverage: Math.max(2.0, Math.round(baseline * 0.95 * 10) / 10),
        });
      } else {
        const d = new Date(now - i * 24 * 3600 * 1000);
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        const baseline = 240 + Math.round((Math.random() - 0.5) * 20);
        const observed = 68 + Math.round((Math.random() - 0.5) * 15);

        points.push({
          label: dayName,
          observed,
          baseline,
          peerAverage: 232,
        });
      }
    }
    return points;
  }, [timeRange]);

  // Consumer metadata (adaptive to ID)
  const isHighRisk = ['C042', 'C078', 'C033', 'C101'].includes(consumerId);
  const anomalyScore = isHighRisk ? (consumerId === 'C033' ? 97 : 94) : 38;
  const riskCategory = isHighRisk ? (consumerId === 'C033' ? 'CRITICAL' : 'HIGH') : 'LOW';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-canvas-white)' }}>
      <Navbar
        simulationStatus={data?.simulationStatus}
        lastPulseAt={lastPulseAt}
        isMockMode={isMockMode}
        onRefresh={refresh}
      />

      <main>
        {/* Navigation Breadcrumb & Back */}
        <div style={{ background: 'var(--color-canvas-white)', borderBottom: '1px solid var(--color-mist)', padding: '16px 0' }}>
          <div className="page-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Link
                href="/investigations"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: 'var(--color-slate)',
                  textDecoration: 'none',
                  fontSize: 13,
                  fontFamily: 'var(--font-inter)',
                }}
              >
                <ArrowLeft size={14} />
                Back to Investigations
              </Link>
              <span style={{ color: 'var(--color-mist)' }}>/</span>
              <span style={{ fontSize: 13, color: 'var(--color-graphite)', fontWeight: 500 }}>
                Consumer {consumerId}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => alert(`Telemetry export initiated for ${consumerId} (CSV format).`)}
                className="btn-secondary"
                style={{ fontSize: 12, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Download size={13} />
                Export CSV
              </button>
              <button
                onClick={() => alert(`Inspection docket dispatched to field tablet for ${consumerId}.`)}
                className="btn-primary"
                style={{ fontSize: 12, padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <FileText size={13} />
                Dispatch Inspection Crew
              </button>
            </div>
          </div>
        </div>

        {/* Consumer Overview Header */}
        <div style={{ background: 'var(--color-canvas-white)', paddingTop: 28, paddingBottom: 28 }}>
          <div className="page-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <span className={`risk-dot ${riskLevelClass(riskCategory)}`} style={{ width: 12, height: 12 }} />
                  <h1
                    style={{
                      fontFamily: 'var(--font-polysans)',
                      fontSize: 32,
                      fontWeight: 400,
                      letterSpacing: '-0.64px',
                      margin: 0,
                      color: 'var(--color-graphite)',
                    }}
                  >
                    Meter Profile: {consumerId}
                  </h1>
                  <span className={`tag ${riskLevelClass(riskCategory)}`} style={{ fontSize: 12 }}>
                    {riskLabel(riskCategory)} Risk
                  </span>
                  <span className="tag" style={{ fontSize: 12 }}>
                    Commercial (Tariff LT-3)
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--color-slate)' }}>
                  Connected to <strong style={{ color: 'var(--color-graphite)' }}>Transformer T01</strong> · Feeder F01 · Raipur Industrial Substation 33/11kV
                </p>
              </div>

              {/* Status pill & toggle */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--color-slate)' }}>Forensic Status:</span>
                  <select
                    value={investigationStatus}
                    onChange={(e) => setInvestigationStatus(e.target.value as any)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-cards)',
                      border: '1px solid var(--color-mist)',
                      background: 'var(--color-canvas-white)',
                      fontSize: 13,
                      fontFamily: 'var(--font-inter)',
                      fontWeight: 500,
                      color: 'var(--color-graphite)',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="FLAGGED">Flagged for Tamper</option>
                    <option value="INVESTIGATING">Field Crew Dispatched</option>
                    <option value="VERIFIED_THEFT">Confirmed Diversion</option>
                    <option value="CLEARED">Cleared / False Positive</option>
                  </select>
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-slate)' }}>
                  Last telemetry packet received 42 seconds ago
                </div>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 'var(--spacing-12)',
                marginTop: 24,
              }}
            >
              <div className="kpi-card" style={{ padding: '16px 20px' }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-slate)', marginBottom: 4 }}>
                  Anomaly Score
                </div>
                <div style={{ fontSize: 28, fontFamily: 'var(--font-polysans)', fontWeight: 600, color: scoreColor(anomalyScore) }}>
                  {anomalyScore}<span style={{ fontSize: 16, color: 'var(--color-slate)', fontWeight: 400 }}> / 100</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-slate)', marginTop: 4 }}>
                  Probability of theft: {isHighRisk ? '96.2%' : '14.1%'}
                </div>
              </div>

              <div className="kpi-card" style={{ padding: '16px 20px' }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-slate)', marginBottom: 4 }}>
                  Observed vs Baseline
                </div>
                <div style={{ fontSize: 28, fontFamily: 'var(--font-polysans)', fontWeight: 600, color: isHighRisk ? '#dc2626' : 'var(--color-graphite)' }}>
                  {isHighRisk ? '-74.2%' : '+2.4%'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-slate)', marginTop: 4 }}>
                  Expected: 240 kWh/day · Current: 62 kWh/day
                </div>
              </div>

              <div className="kpi-card" style={{ padding: '16px 20px' }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-slate)', marginBottom: 4 }}>
                  Hardware Telemetry
                </div>
                <div style={{ fontSize: 20, fontFamily: 'var(--font-polysans)', fontWeight: 500, color: 'var(--color-graphite)', marginTop: 4 }}>
                  234.2 V · PF 0.94
                </div>
                <div style={{ fontSize: 12, color: '#15803d', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle2 size={13} />
                  Communication healthy (RSSI: -64 dBm)
                </div>
              </div>

              <div className="kpi-card" style={{ padding: '16px 20px' }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-slate)', marginBottom: 4 }}>
                  Tamper Sensor Trigger
                </div>
                <div style={{ fontSize: 18, fontFamily: 'var(--font-polysans)', fontWeight: 500, color: isHighRisk ? '#dc2626' : 'var(--color-graphite)', marginTop: 6 }}>
                  {isHighRisk ? 'Neutral Bypass Signal' : 'All Sensors Normal'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-slate)', marginTop: 4 }}>
                  Terminal cover seal intact
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Forensic Visualizer: Consumption vs Baseline Curve */}
        <div style={{ background: 'var(--color-ash)', padding: '36px 0' }}>
          <div className="page-container">
            <div className="kpi-card" style={{ padding: '28px 32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h2
                    style={{
                      fontFamily: 'var(--font-polysans)',
                      fontSize: 20,
                      fontWeight: 400,
                      letterSpacing: '-0.3px',
                      margin: 0,
                      color: 'var(--color-graphite)',
                    }}
                  >
                    Forensic Load Profile Comparison
                  </h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: 13, color: 'var(--color-slate)' }}>
                    Actual recorded energy consumption vs 90-day seasonal baseline and peer group average
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setTimeRange('24h')}
                    className={`btn-secondary ${timeRange === '24h' ? 'active' : ''}`}
                    style={{
                      fontSize: 12,
                      padding: '6px 14px',
                      background: timeRange === '24h' ? 'var(--color-graphite)' : 'transparent',
                      color: timeRange === '24h' ? '#ffffff' : 'var(--color-graphite)',
                    }}
                  >
                    24 Hours (Hourly)
                  </button>
                  <button
                    onClick={() => setTimeRange('7d')}
                    className={`btn-secondary ${timeRange === '7d' ? 'active' : ''}`}
                    style={{
                      fontSize: 12,
                      padding: '6px 14px',
                      background: timeRange === '7d' ? 'var(--color-graphite)' : 'transparent',
                      color: timeRange === '7d' ? '#ffffff' : 'var(--color-graphite)',
                    }}
                  >
                    7 Days (Daily)
                  </button>
                </div>
              </div>

              {/* Chart container */}
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="observedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-ember-orange)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--color-ember-orange)" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="baselineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#828282" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#828282" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="#828282"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#e8e8e8' }}
                    />
                    <YAxis
                      stroke="#828282"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      unit=" kWh"
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div
                            style={{
                              background: '#202020',
                              color: '#fff',
                              padding: '10px 14px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontFamily: 'var(--font-inter)',
                            }}
                          >
                            <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
                            {payload.map((p, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                                <span style={{ color: p.color }}>{p.name}:</span>
                                <strong>{p.value} kWh</strong>
                              </div>
                            ))}
                          </div>
                        );
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
                    <Area
                      type="monotone"
                      dataKey="baseline"
                      name="Expected Baseline (AI Model)"
                      stroke="#828282"
                      strokeDasharray="4 4"
                      fill="url(#baselineGrad)"
                      strokeWidth={1.5}
                    />
                    <Area
                      type="monotone"
                      dataKey="observed"
                      name="Observed Meter Reading"
                      stroke="var(--color-ember-orange)"
                      fill="url(#observedGrad)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {isHighRisk && (
                <div
                  style={{
                    marginTop: 20,
                    padding: '12px 16px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 'var(--radius-cards)',
                    fontSize: 13,
                    color: '#991b1b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Unexplained Divergence Detected:</strong> During peak commercial operating hours, meter reported 74% less energy than historical baseline. Concurrently, Transformer T01 recorded an unexplained loss spike of 100 kWh.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Forensic Evidence Breakdown & Transformer Association */}
        <div style={{ background: 'var(--color-canvas-white)', padding: '36px 0 60px' }}>
          <div className="page-container">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-20)' }}>
              {/* Left Card: Explainable AI Feature Attribution */}
              <div className="kpi-card" style={{ padding: '24px 28px' }}>
                <h3
                  style={{
                    fontFamily: 'var(--font-polysans)',
                    fontSize: 18,
                    fontWeight: 400,
                    margin: '0 0 16px 0',
                    color: 'var(--color-graphite)',
                  }}
                >
                  Model Feature Attribution (SHAP)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: 'var(--color-graphite)' }}>Drop from 90-day baseline profile</span>
                      <strong style={{ color: '#dc2626' }}>+44% risk contribution</strong>
                    </div>
                    <div className="progress-bar-track">
                      <div className="progress-bar-fill risk-critical" style={{ width: '88%' }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: 'var(--color-graphite)' }}>Transformer T01 energy loss correlation</span>
                      <strong style={{ color: '#ff682c' }}>+26% risk contribution</strong>
                    </div>
                    <div className="progress-bar-track">
                      <div className="progress-bar-fill risk-high" style={{ width: '65%' }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: 'var(--color-graphite)' }}>Commercial peer group divergence</span>
                      <strong style={{ color: '#816729' }}>+18% risk contribution</strong>
                    </div>
                    <div className="progress-bar-track">
                      <div className="progress-bar-fill risk-medium" style={{ width: '45%' }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: 'var(--color-graphite)' }}>Communication & hardware fault suppression</span>
                      <strong style={{ color: '#15803d' }}>Negative (-12%)</strong>
                    </div>
                    <div className="progress-bar-track">
                      <div className="progress-bar-fill" style={{ width: '20%', background: '#15803d' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Card: Transformer Topology Association */}
              <div className="kpi-card" style={{ padding: '24px 28px' }}>
                <h3
                  style={{
                    fontFamily: 'var(--font-polysans)',
                    fontSize: 18,
                    fontWeight: 400,
                    margin: '0 0 16px 0',
                    color: 'var(--color-graphite)',
                  }}
                >
                  Grid Topology & Co-Located Meters
                </h3>
                <div style={{ fontSize: 13, color: 'var(--color-slate)', marginBottom: 16 }}>
                  This meter is installed on distribution secondary loop <strong>Transformer T01</strong> alongside 29 other consumer meters.
                </div>

                <div style={{ background: 'var(--color-fog)', padding: '16px 20px', borderRadius: 'var(--radius-cards)', marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                    <span style={{ color: 'var(--color-slate)' }}>Transformer T01 Status:</span>
                    <strong style={{ color: '#dc2626' }}>ELEVATED UNEXPLAINED LOSS (6.6%)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--color-slate)' }}>Suspicious Neighbors on T01:</span>
                    <strong style={{ color: 'var(--color-graphite)' }}>C078, C033, C101</strong>
                  </div>
                </div>

                <Link
                  href="/simulation?transformer=T01"
                  className="btn-secondary"
                  style={{ textDecoration: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, width: '100%', fontSize: 13 }}
                >
                  <Zap size={14} color="var(--color-ember-orange)" />
                  Inspect Transformer T01 Topology in Digital Twin
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
