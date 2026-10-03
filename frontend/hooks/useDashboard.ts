'use client';

/**
 * useDashboard — WebSocket-ready dashboard data hook.
 *
 * Currently uses mock data. To switch to live data:
 * 1. Set NEXT_PUBLIC_API_URL in .env.local
 * 2. Set NEXT_PUBLIC_WS_URL in .env.local
 * 3. The hook will automatically connect to the WebSocket when the URLs are present.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { DashboardData, SimulationMode, DashboardUpdate } from '@/types/dashboard';
import { getMockDashboard } from '@/lib/mockData';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const WS_URL = process.env.NEXT_PUBLIC_WS_URL;
const MOCK_REFRESH_INTERVAL = 3000; // ms — simulates telemetry pulse

interface UseDashboardOptions {
  scenario?: SimulationMode;
  autoRefresh?: boolean;
}

interface UseDashboardReturn {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  isMockMode: boolean;
  lastPulseAt: Date | null;
  refresh: () => void;
  setScenario: (mode: SimulationMode) => void;
}

export function useDashboard({
  scenario = 'THEFT_TAMPERING',
  autoRefresh = true,
}: UseDashboardOptions = {}): UseDashboardReturn {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentScenario, setCurrentScenario] = useState<SimulationMode>(scenario);
  const [lastPulseAt, setLastPulseAt] = useState<Date | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMockMode = !API_URL;

  const loadMockData = useCallback(() => {
    const freshData = getMockDashboard(currentScenario);
    setData(freshData);
    setLastPulseAt(new Date());
    setIsLoading(false);
    setIsConnected(false);
    setError(null);
  }, [currentScenario]);

  const fetchFromAPI = useCallback(async () => {
    if (!API_URL) return;
    try {
      const res = await fetch(`${API_URL}/dashboard/overview`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: DashboardData = await res.json();
      setData(json);
      setLastPulseAt(new Date());
      setError(null);
    } catch (err) {
      setError(`Failed to fetch dashboard data: ${err}`);
      // Fallback to mock data on error
      loadMockData();
    } finally {
      setIsLoading(false);
    }
  }, [loadMockData]);

  const connectWebSocket = useCallback(() => {
    if (!WS_URL || wsRef.current) return;

    const ws = new WebSocket(`${WS_URL}/ws/dashboard`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const update: DashboardUpdate = JSON.parse(event.data);
        if (update.type === 'FULL_SNAPSHOT') {
          setData(update.payload as DashboardData);
        } else {
          setData((prev) => {
            if (!prev) return prev;
            return { ...prev, ...update.payload, lastUpdated: update.timestamp };
          });
        }
        setLastPulseAt(new Date());
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = () => {
      setError('WebSocket connection error. Falling back to polling.');
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;
      // Reconnect after 5 seconds
      setTimeout(connectWebSocket, 5000);
    };
  }, []);

  // Initial load
  useEffect(() => {
    setIsLoading(true);
    if (isMockMode) {
      loadMockData();
    } else {
      fetchFromAPI();
      connectWebSocket();
    }

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh for mock mode or when WebSocket is not available
  useEffect(() => {
    if (!autoRefresh) return;

    if (isMockMode) {
      refreshIntervalRef.current = setInterval(loadMockData, MOCK_REFRESH_INTERVAL);
    } else if (!WS_URL) {
      // Polling fallback
      refreshIntervalRef.current = setInterval(fetchFromAPI, 10000);
    }

    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [autoRefresh, isMockMode, loadMockData, fetchFromAPI]);

  // Re-load when scenario changes (mock mode)
  useEffect(() => {
    if (isMockMode) {
      loadMockData();
    }
  }, [currentScenario, isMockMode, loadMockData]);

  const refresh = useCallback(() => {
    if (isMockMode) {
      loadMockData();
    } else {
      fetchFromAPI();
    }
  }, [isMockMode, loadMockData, fetchFromAPI]);

  return {
    data,
    isLoading,
    error,
    isConnected: isMockMode ? false : isConnected,
    isMockMode,
    lastPulseAt,
    refresh,
    setScenario: setCurrentScenario,
  };
}
