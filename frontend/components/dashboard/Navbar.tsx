'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, LayoutGrid, Search, Zap, RefreshCw } from 'lucide-react';
import type { SimulationStatusInfo } from '@/types/dashboard';
import { timeAgo } from '@/lib/utils';

interface NavbarProps {
  simulationStatus?: SimulationStatusInfo;
  lastPulseAt?: Date | null;
  isMockMode?: boolean;
  onRefresh?: () => void;
}

const navItems = [
  { href: '/', label: 'Overview', icon: Activity },
  { href: '/simulation', label: 'Digital Twin', icon: LayoutGrid },
  { href: '/investigations', label: 'Investigations', icon: Search },
  { href: '/stress-test', label: 'Stress Test', icon: Zap },
];

function SimStatusDot({ status }: { status: SimulationStatusInfo['status'] }) {
  const classMap = {
    LIVE: 'sim-status--live',
    PAUSED: 'sim-status--paused',
    NO_TELEMETRY: 'sim-status--no-telemetry',
    RECONNECTING: 'sim-status--reconnecting',
  };
  const labelMap = {
    LIVE: 'LIVE — Simulator',
    PAUSED: 'PAUSED',
    NO_TELEMETRY: 'NO TELEMETRY',
    RECONNECTING: 'RECONNECTING',
  };

  return (
    <span className={`sim-status ${classMap[status]}`}>
      <span className={`sim-dot ${status === 'LIVE' ? 'sim-dot--live' : ''}`} />
      {labelMap[status]}
    </span>
  );
}

export default function Navbar({
  simulationStatus,
  lastPulseAt,
  isMockMode = true,
  onRefresh,
}: NavbarProps) {
  const pathname = usePathname();

  return (
    <header
      style={{
        borderBottom: '1px solid var(--color-mist)',
        background: 'var(--color-canvas-white)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {isMockMode && (
        <div className="mock-banner">
          Dashboard is running on mock data — backend not connected. Replace{' '}
          <code>NEXT_PUBLIC_API_URL</code> and <code>NEXT_PUBLIC_WS_URL</code> to connect to live
          data.
        </div>
      )}

      <div
        className="page-container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 60,
          gap: 'var(--spacing-20)',
        }}
      >
        {/* Brand */}
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 28,
              height: 28,
              background: 'var(--color-graphite)',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Zap size={14} color="white" />
          </span>
          <span
            className="font-polysans"
            style={{ fontSize: 16, color: 'var(--color-graphite)' }}
          >
            GridGuard
          </span>
        </Link>

        {/* Nav pill */}
        <nav className="nav-pill">
          {navItems.map(({ href, label }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`nav-item ${isActive ? 'nav-item--active' : ''}`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right side — simulation status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {simulationStatus && (
            <SimStatusDot status={simulationStatus.status} />
          )}
          {lastPulseAt && (
            <span
              className="text-caption"
              style={{ color: 'var(--color-slate)', whiteSpace: 'nowrap' }}
            >
              {timeAgo(lastPulseAt.toISOString())}
            </span>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="btn-ghost"
              style={{ padding: '6px 10px', fontSize: 13 }}
              title="Refresh dashboard"
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
