'use client';

import { Suspense, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/dashboard/Navbar';
import { useDashboard } from '@/hooks/useDashboard';
import {
  riskLevelClass,
  riskLabel,
  alertTypeLabel,
  probableCauseLabel,
  scoreColor,
  timeAgo,
} from '@/lib/utils';
import type { RiskLevel, AlertType, ProbableCause, Alert } from '@/types/dashboard';
import {
  Search,
  Filter,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  FileText,
  UserCheck,
  Zap,
} from 'lucide-react';

interface InvestigationCase {
  id: string;
  entityId: string;
  entityType: 'CONSUMER' | 'TRANSFORMER' | 'FEEDER' | 'CLUSTER';
  riskLevel: RiskLevel;
  anomalyScore: number;
  probableCause: ProbableCause;
  confidence: number;
  detectedAt: string;
  status: 'ACTIVE' | 'INVESTIGATING' | 'RESOLVED';
  evidence: string[];
  recommendedAction: string;
  affectedConsumers?: string[];
  assignedOfficer?: string;
  notes?: string;
}

const INITIAL_CASES: InvestigationCase[] = [
  {
    id: 'CASE-042',
    entityId: 'C042',
    entityType: 'CONSUMER',
    riskLevel: 'HIGH',
    anomalyScore: 94,
    probableCause: 'PROBABLE_THEFT_TAMPERING',
    confidence: 96,
    detectedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    status: 'ACTIVE',
    evidence: [
      'Consumption dropped 74% below 90-day baseline during peak evening hours (18:00 - 22:00)',
      'Smart meter communication link and diagnostic ping remain 100% healthy',
      'Correlated with 100 kWh unexplained loss at upstream Transformer T01',
      'No solar generation or vacation notice registered',
    ],
    recommendedAction: 'Physical on-site inspection of service terminal & CT/PT seal verification on Transformer T01 loop.',
    assignedOfficer: 'Field Crew Alpha',
    notes: 'Prior tamper alert recorded 6 months ago on same feeder branch.',
  },
  {
    id: 'CASE-078',
    entityId: 'C078',
    entityType: 'CONSUMER',
    riskLevel: 'HIGH',
    anomalyScore: 89,
    probableCause: 'PROBABLE_THEFT_TAMPERING',
    confidence: 92,
    detectedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    status: 'INVESTIGATING',
    evidence: [
      'Consumption dropped 68% below historical baseline over consecutive 5 billing cycles',
      'Zero consumption during prime business operating hours (Commercial connection)',
      'Substation feeder current mismatch verified against Transformer T01 secondary',
    ],
    recommendedAction: 'Inspect internal meter optical port and terminal bypass loop.',
    assignedOfficer: 'Officer S. Verma',
    notes: 'Inspection scheduled for today 16:00 IST.',
  },
  {
    id: 'CASE-033',
    entityId: 'C033',
    entityType: 'CONSUMER',
    riskLevel: 'CRITICAL',
    anomalyScore: 97,
    probableCause: 'PROBABLE_THEFT_TAMPERING',
    confidence: 98,
    detectedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    status: 'ACTIVE',
    evidence: [
      'Consumption 81% below baseline for 8 consecutive days',
      'Meter diagnostic voltage indicates phase cut / bypass hook on neutral line',
      'Part of suspicious coordinated cluster on Transformer T01',
    ],
    recommendedAction: 'Urgent priority dispatch: Immediate physical raid with local enforcement.',
    assignedOfficer: 'Rapid Response Unit 1',
    notes: 'Escalated to Vigilance Directorate.',
  },
  {
    id: 'CASE-T01',
    entityId: 'T01',
    entityType: 'TRANSFORMER',
    riskLevel: 'HIGH',
    anomalyScore: 84,
    probableCause: 'TRANSFORMER_UNEXPLAINED_LOSS',
    confidence: 89,
    detectedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    status: 'ACTIVE',
    evidence: [
      'Input energy 1520 kWh vs 1335 kWh aggregated consumer meters (185 kWh total loss)',
      'Estimated technical line loss is 85 kWh (5.6%); unexplained residual is 100 kWh (6.6%)',
      'High statistical concentration of abnormal meters downstream (C042, C078, C033, C101)',
    ],
    recommendedAction: 'Comprehensive secondary circuit energy audit and loop balance verification.',
    assignedOfficer: 'Substation Engineer D. Rao',
    notes: 'Feeder F01 distribution branch.',
  },
  {
    id: 'CASE-CL01',
    entityId: 'CLUSTER-T01',
    entityType: 'CLUSTER',
    riskLevel: 'HIGH',
    anomalyScore: 87,
    probableCause: 'COORDINATED_THEFT_CLUSTER',
    confidence: 91,
    detectedAt: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
    status: 'ACTIVE',
    affectedConsumers: ['C042', 'C078', 'C033', 'C101'],
    evidence: [
      'Simultaneous step-down in daily consumption across 4 neighboring commercial meters',
      'Cross-correlation coefficient between load drops > 0.88',
      'Common low-voltage distribution pole tap point identified',
    ],
    recommendedAction: 'Inspect communal service pole junction box for unauthorized busbar taps.',
    assignedOfficer: 'Field Crew Beta',
    notes: 'Coordinated commercial diversion suspected.',
  },
  {
    id: 'CASE-011',
    entityId: 'C011',
    entityType: 'CONSUMER',
    riskLevel: 'MEDIUM',
    anomalyScore: 71,
    probableCause: 'METER_MALFUNCTION',
    confidence: 85,
    detectedAt: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    status: 'INVESTIGATING',
    evidence: [
      'Erratic voltage fluctuations recorded (180V to 260V spikes without feeder correlation)',
      'Intermittent clock drift in optical head timestamp logs',
      'Neutral current imbalance indicates faulty current transducer inside meter',
    ],
    recommendedAction: 'Schedule meter replacement/bench calibration. Cause is hardware fault, NOT energy theft.',
    assignedOfficer: 'Meter Lab Tech P. Nair',
    notes: 'Replacement meter issued from stores (Model Gen-3).',
  },
  {
    id: 'CASE-055',
    entityId: 'C055',
    entityType: 'CONSUMER',
    riskLevel: 'MEDIUM',
    anomalyScore: 62,
    probableCause: 'COMMUNICATION_FAILURE',
    confidence: 90,
    detectedAt: new Date(Date.now() - 130 * 60 * 1000).toISOString(),
    status: 'RESOLVED',
    evidence: [
      'Smart meter failed 12 consecutive periodic telemetry check-ins',
      'Downstream RF mesh repeater signal attenuation due to storm interference',
      'Diagnostic re-poll confirmed internal memory registers intact; consumption resumed accurately',
    ],
    recommendedAction: 'Mesh repeater repositioning completed. Case verified as non-theft communication gap.',
    assignedOfficer: 'Telecom Specialist M. Khan',
    notes: 'Confirmed resolved. Communication health restored.',
  },
];

function InvestigationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get('filter') || '';
  const initialRisk = searchParams.get('risk') || '';
  const initialCluster = searchParams.get('cluster') || '';

  const { data, isMockMode, lastPulseAt, refresh } = useDashboard({
    scenario: 'THEFT_TAMPERING',
    autoRefresh: false,
  });

  const [cases, setCases] = useState<InvestigationCase[]>(INITIAL_CASES);
  const [searchQuery, setSearchQuery] = useState(initialCluster || '');
  const [selectedRisk, setSelectedRisk] = useState<string>(initialRisk.toUpperCase() || 'ALL');
  const [selectedCause, setSelectedCause] = useState<string>(() => {
    if (initialFilter === 'transformer_loss') return 'TRANSFORMER_UNEXPLAINED_LOSS';
    if (initialFilter === 'feeder_loss') return 'TRANSFORMER_UNEXPLAINED_LOSS';
    if (initialFilter === 'meter_malfunction') return 'METER_MALFUNCTION';
    return 'ALL';
  });
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [activeCaseId, setActiveCaseId] = useState<string>('CASE-042');

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesId = c.id.toLowerCase().includes(q);
        const matchesEntity = c.entityId.toLowerCase().includes(q);
        const matchesAction = c.recommendedAction.toLowerCase().includes(q);
        const matchesAffected = c.affectedConsumers?.some((a) => a.toLowerCase().includes(q));
        if (!matchesId && !matchesEntity && !matchesAction && !matchesAffected) {
          return false;
        }
      }
      if (selectedRisk !== 'ALL' && c.riskLevel !== selectedRisk) {
        return false;
      }
      if (selectedCause !== 'ALL' && c.probableCause !== selectedCause) {
        return false;
      }
      if (selectedStatus !== 'ALL' && c.status !== selectedStatus) {
        return false;
      }
      return true;
    });
  }, [cases, searchQuery, selectedRisk, selectedCause, selectedStatus]);

  const activeCase = cases.find((c) => c.id === activeCaseId) || filteredCases[0] || cases[0];

  const updateCaseStatus = (caseId: string, newStatus: 'ACTIVE' | 'INVESTIGATING' | 'RESOLVED') => {
    setCases((prev) =>
      prev.map((c) => (c.id === caseId ? { ...c, status: newStatus } : c))
    );
  };

  const criticalCount = cases.filter((c) => c.riskLevel === 'CRITICAL').length;
  const highCount = cases.filter((c) => c.riskLevel === 'HIGH').length;
  const activeCount = cases.filter((c) => c.status === 'ACTIVE').length;
  const investigatingCount = cases.filter((c) => c.status === 'INVESTIGATING').length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-canvas-white)' }}>
      <Navbar
        simulationStatus={data?.simulationStatus}
        lastPulseAt={lastPulseAt}
        isMockMode={isMockMode}
        onRefresh={refresh}
      />

      <main>
        {/* Page Header */}
        <div style={{ background: 'var(--color-canvas-white)', paddingTop: 32, paddingBottom: 24, borderBottom: '1px solid var(--color-mist)' }}>
          <div className="page-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div>
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
                  Investigation Center
                </h1>
                <p
                  style={{
                    fontFamily: 'var(--font-inter)',
                    fontSize: 15,
                    color: 'var(--color-slate)',
                    margin: '6px 0 0 0',
                  }}
                >
                  Forensic audit trail, root-cause classification, and field dispatch queue
                </p>
              </div>

              {/* Status summary badges */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <div className="kpi-card" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="risk-dot risk-critical" />
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--color-slate)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Critical</div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-graphite)' }}>{criticalCount}</div>
                  </div>
                </div>
                <div className="kpi-card" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="risk-dot risk-high" />
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--color-slate)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>High Risk</div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-graphite)' }}>{highCount}</div>
                  </div>
                </div>
                <div className="kpi-card" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Clock size={16} color="var(--color-ember-orange)" />
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--color-slate)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>In Progress</div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-graphite)' }}>{investigatingCount}</div>
                  </div>
                </div>
                <div className="kpi-card" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <AlertTriangle size={16} color="var(--color-steel)" />
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--color-slate)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending Review</div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-graphite)' }}>{activeCount}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter controls */}
            <div
              style={{
                marginTop: 24,
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
                alignItems: 'center',
                paddingTop: 16,
                borderTop: '1px solid var(--color-mist)',
              }}
            >
              {/* Search box */}
              <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
                <Search
                  size={15}
                  color="var(--color-slate)"
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  placeholder="Filter by Consumer (C042), Transformer, or Cluster..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: 'var(--radius-cards)',
                    border: '1px solid var(--color-mist)',
                    background: 'var(--color-canvas-white)',
                    fontSize: 13,
                    fontFamily: 'var(--font-inter)',
                    color: 'var(--color-graphite)',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Risk Level Filter */}
              <select
                value={selectedRisk}
                onChange={(e) => setSelectedRisk(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-cards)',
                  border: '1px solid var(--color-mist)',
                  background: 'var(--color-canvas-white)',
                  fontSize: 13,
                  fontFamily: 'var(--font-inter)',
                  color: 'var(--color-graphite)',
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">All Risk Levels</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              {/* Cause Category Filter */}
              <select
                value={selectedCause}
                onChange={(e) => setSelectedCause(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-cards)',
                  border: '1px solid var(--color-mist)',
                  background: 'var(--color-canvas-white)',
                  fontSize: 13,
                  fontFamily: 'var(--font-inter)',
                  color: 'var(--color-graphite)',
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">All Probable Causes</option>
                <option value="PROBABLE_THEFT_TAMPERING">Theft & Tampering</option>
                <option value="TRANSFORMER_UNEXPLAINED_LOSS">Transformer Loss</option>
                <option value="COORDINATED_THEFT_CLUSTER">Coordinated Cluster</option>
                <option value="METER_MALFUNCTION">Meter Malfunction</option>
                <option value="COMMUNICATION_FAILURE">Communication Failure</option>
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-cards)',
                  border: '1px solid var(--color-mist)',
                  background: 'var(--color-canvas-white)',
                  fontSize: 13,
                  fontFamily: 'var(--font-inter)',
                  color: 'var(--color-graphite)',
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active (Needs Action)</option>
                <option value="INVESTIGATING">Under Investigation</option>
                <option value="RESOLVED">Resolved / Verified</option>
              </select>

              {(searchQuery || selectedRisk !== 'ALL' || selectedCause !== 'ALL' || selectedStatus !== 'ALL') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedRisk('ALL');
                    setSelectedCause('ALL');
                    setSelectedStatus('ALL');
                  }}
                  style={{
                    padding: '8px 14px',
                    fontSize: 13,
                    fontFamily: 'var(--font-inter)',
                    color: 'var(--color-ember-orange)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Master-Detail Investigation Workspace */}
        <div style={{ background: 'var(--color-ash)', padding: '28px 0 60px' }}>
          <div className="page-container">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(340px, 480px) 1fr',
                gap: 'var(--spacing-20)',
                alignItems: 'start',
              }}
            >
              {/* Left Column: Case List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-slate)', paddingLeft: 4 }}>
                  Showing {filteredCases.length} case{filteredCases.length === 1 ? '' : 's'}
                </div>

                {filteredCases.length === 0 ? (
                  <div className="kpi-card" style={{ padding: 40, textAlign: 'center', color: 'var(--color-slate)' }}>
                    No investigation cases match the selected filters.
                  </div>
                ) : (
                  filteredCases.map((c) => {
                    const isSelected = c.id === activeCase?.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => setActiveCaseId(c.id)}
                        className="kpi-card"
                        style={{
                          padding: '16px 20px',
                          cursor: 'pointer',
                          border: isSelected
                            ? '1.5px solid var(--color-graphite)'
                            : '1px solid var(--color-mist)',
                          boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                          background: isSelected ? '#ffffff' : 'var(--color-canvas-white)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className={`risk-dot ${riskLevelClass(c.riskLevel)}`} />
                            <span style={{ fontFamily: 'var(--font-polysans)', fontSize: 15, fontWeight: 500, color: 'var(--color-graphite)' }}>
                              {c.entityId}
                            </span>
                            <span className="tag" style={{ fontSize: 11, padding: '2px 8px' }}>
                              {c.entityType}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: scoreColor(c.anomalyScore),
                                background: `${scoreColor(c.anomalyScore)}15`,
                                padding: '2px 8px',
                                borderRadius: 12,
                              }}
                            >
                              Score {c.anomalyScore}
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                padding: '2px 8px',
                                borderRadius: 4,
                                background:
                                  c.status === 'RESOLVED'
                                    ? '#dcfce7'
                                    : c.status === 'INVESTIGATING'
                                    ? '#fef3c7'
                                    : '#fee2e2',
                                color:
                                  c.status === 'RESOLVED'
                                    ? '#15803d'
                                    : c.status === 'INVESTIGATING'
                                    ? '#b45309'
                                    : '#b91c1c',
                                fontWeight: 500,
                              }}
                            >
                              {c.status}
                            </span>
                          </div>
                        </div>

                        <div style={{ fontSize: 13, color: 'var(--color-graphite)', fontWeight: 500, marginBottom: 4 }}>
                          {probableCauseLabel(c.probableCause)}
                        </div>

                        <div style={{ fontSize: 12, color: 'var(--color-slate)', marginBottom: 8 }}>
                          AI Confidence: {c.confidence}% · Detected {timeAgo(c.detectedAt)}
                        </div>

                        <div
                          style={{
                            fontSize: 12,
                            color: 'var(--color-steel)',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            lineHeight: 1.4,
                          }}
                        >
                          {c.evidence[0]}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Right Column: Case Deep-Dive Detail */}
              {activeCase && (
                <div
                  className="kpi-card"
                  style={{
                    padding: '28px 32px',
                    position: 'sticky',
                    top: 80,
                  }}
                >
                  {/* Detail Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--color-mist)', paddingBottom: 20 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span className={`risk-dot ${riskLevelClass(activeCase.riskLevel)}`} style={{ width: 10, height: 10 }} />
                        <h2
                          style={{
                            fontFamily: 'var(--font-polysans)',
                            fontSize: 24,
                            fontWeight: 400,
                            letterSpacing: '-0.4px',
                            margin: 0,
                            color: 'var(--color-graphite)',
                          }}
                        >
                          Case File: {activeCase.id} ({activeCase.entityId})
                        </h2>
                        <span className="tag">{activeCase.entityType}</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--color-slate)' }}>
                        Detected: {new Date(activeCase.detectedAt).toLocaleString()} ({timeAgo(activeCase.detectedAt)})
                      </div>
                    </div>

                    {/* Navigation drilldown to entity detail */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      {activeCase.entityType === 'CONSUMER' && (
                        <Link
                          href={`/consumers/${activeCase.entityId}`}
                          className="btn-secondary"
                          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
                        >
                          Forensic Meter Trace
                          <ExternalLink size={14} />
                        </Link>
                      )}
                      {(activeCase.entityType === 'TRANSFORMER' || activeCase.entityType === 'FEEDER') && (
                        <Link
                          href={`/simulation?transformer=${activeCase.entityId}`}
                          className="btn-secondary"
                          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
                        >
                          View in Digital Twin
                          <ExternalLink size={14} />
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Root Cause & Diagnostic Summary */}
                  <div style={{ padding: '20px 0', borderBottom: '1px solid var(--color-mist)' }}>
                    <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-slate)', marginBottom: 8 }}>
                      Primary Diagnosis & Root Cause
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <div
                        style={{
                          fontSize: 18,
                          fontFamily: 'var(--font-polysans)',
                          color: 'var(--color-graphite)',
                          fontWeight: 500,
                        }}
                      >
                        {probableCauseLabel(activeCase.probableCause)}
                      </div>
                      <span className={`tag ${riskLevelClass(activeCase.riskLevel)}`}>
                        {riskLabel(activeCase.riskLevel)} Risk
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16 }}>
                      <div style={{ background: 'var(--color-fog)', padding: '12px 16px', borderRadius: 'var(--radius-cards)' }}>
                        <div style={{ fontSize: 11, color: 'var(--color-slate)' }}>Anomaly Score</div>
                        <div style={{ fontSize: 20, fontWeight: 600, color: scoreColor(activeCase.anomalyScore) }}>
                          {activeCase.anomalyScore} / 100
                        </div>
                      </div>
                      <div style={{ background: 'var(--color-fog)', padding: '12px 16px', borderRadius: 'var(--radius-cards)' }}>
                        <div style={{ fontSize: 11, color: 'var(--color-slate)' }}>AI Engine Confidence</div>
                        <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-graphite)' }}>
                          {activeCase.confidence}%
                        </div>
                      </div>
                      <div style={{ background: 'var(--color-fog)', padding: '12px 16px', borderRadius: 'var(--radius-cards)' }}>
                        <div style={{ fontSize: 11, color: 'var(--color-slate)' }}>Assigned Unit</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-graphite)', marginTop: 4 }}>
                          {activeCase.assignedOfficer || 'Unassigned'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Forensic Evidence Checklist */}
                  <div style={{ padding: '20px 0', borderBottom: '1px solid var(--color-mist)' }}>
                    <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-slate)', marginBottom: 12 }}>
                      Forensic Audit Findings
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {activeCase.evidence.map((point, idx) => (
                        <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <CheckCircle2 size={16} color="var(--color-ember-orange)" style={{ marginTop: 2, flexShrink: 0 }} />
                          <span style={{ fontSize: 14, color: 'var(--color-graphite)', lineHeight: 1.5 }}>
                            {point}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Cluster Members (if applicable) */}
                  {activeCase.affectedConsumers && (
                    <div style={{ padding: '20px 0', borderBottom: '1px solid var(--color-mist)' }}>
                      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-slate)', marginBottom: 10 }}>
                        Correlated Meters in this Cluster
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {activeCase.affectedConsumers.map((cid) => (
                          <Link
                            key={cid}
                            href={`/consumers/${cid}`}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 'var(--radius-cards)',
                              background: 'var(--color-fog)',
                              border: '1px solid var(--color-mist)',
                              fontSize: 13,
                              color: 'var(--color-graphite)',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <span>{cid}</span>
                            <ArrowRight size={12} color="var(--color-slate)" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommended Action & Dispatch Protocol */}
                  <div style={{ padding: '20px 0', borderBottom: '1px solid var(--color-mist)' }}>
                    <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-slate)', marginBottom: 8 }}>
                      Recommended Protocol
                    </div>
                    <div
                      style={{
                        padding: '14px 16px',
                        background: '#fef3c7',
                        border: '1px solid #fde68a',
                        borderRadius: 'var(--radius-cards)',
                        fontSize: 14,
                        color: '#92400e',
                        lineHeight: 1.5,
                      }}
                    >
                      {activeCase.recommendedAction}
                    </div>
                  </div>

                  {/* Case Management Actions */}
                  <div style={{ paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, color: 'var(--color-slate)' }}>Update Status:</span>
                      <button
                        onClick={() => updateCaseStatus(activeCase.id, 'ACTIVE')}
                        className={`btn-secondary ${activeCase.status === 'ACTIVE' ? 'active' : ''}`}
                        style={{
                          fontSize: 12,
                          padding: '6px 12px',
                          background: activeCase.status === 'ACTIVE' ? 'var(--color-graphite)' : 'transparent',
                          color: activeCase.status === 'ACTIVE' ? '#ffffff' : 'var(--color-graphite)',
                        }}
                      >
                        Pending
                      </button>
                      <button
                        onClick={() => updateCaseStatus(activeCase.id, 'INVESTIGATING')}
                        className={`btn-secondary ${activeCase.status === 'INVESTIGATING' ? 'active' : ''}`}
                        style={{
                          fontSize: 12,
                          padding: '6px 12px',
                          background: activeCase.status === 'INVESTIGATING' ? 'var(--color-graphite)' : 'transparent',
                          color: activeCase.status === 'INVESTIGATING' ? '#ffffff' : 'var(--color-graphite)',
                        }}
                      >
                        Investigating
                      </button>
                      <button
                        onClick={() => updateCaseStatus(activeCase.id, 'RESOLVED')}
                        className={`btn-secondary ${activeCase.status === 'RESOLVED' ? 'active' : ''}`}
                        style={{
                          fontSize: 12,
                          padding: '6px 12px',
                          background: activeCase.status === 'RESOLVED' ? 'var(--color-graphite)' : 'transparent',
                          color: activeCase.status === 'RESOLVED' ? '#ffffff' : 'var(--color-graphite)',
                        }}
                      >
                        Resolved
                      </button>
                    </div>

                    <button
                      onClick={() => alert(`Inspection report generated for Case ${activeCase.id}. Dispatched to ${activeCase.assignedOfficer || 'Field Crew'}.`)}
                      className="btn-primary"
                      style={{ fontSize: 13, padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                    >
                      <FileText size={15} />
                      Export Inspection Dossier
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function InvestigationsPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="skeleton" style={{ width: 300, height: 24 }} />
        </div>
      }
    >
      <InvestigationsContent />
    </Suspense>
  );
}
