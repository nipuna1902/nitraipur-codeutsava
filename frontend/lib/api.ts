import type { Anomaly, Consumer, DashboardData, DashboardSummary, InvestigationCase, Transformer } from "@/types/dashboard";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://127.0.0.1:8000";

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${path}`);
  }

  return response.json() as Promise<T>;
}

const emptySummary: DashboardSummary = {
  total_consumers: 0,
  telemetry_readings: 0,
  active_anomalies: 0,
  high_risk_cases: 0,
  active_investigations: 0,
  latest_timestamp: null
};

export async function getDashboardData(): Promise<DashboardData> {
  try {
    const [summary, anomalies, consumers, investigations, transformers] = await Promise.all([
      getJson<DashboardSummary>("/dashboard/summary"),
      getJson<Anomaly[]>("/anomalies?limit=100"),
      getJson<Consumer[]>("/consumers"),
      getJson<InvestigationCase[]>("/investigations?limit=12"),
      getJson<Transformer[]>("/transformers")
    ]);

    return {
      source: "LIVE API",
      summary,
      anomalies,
      consumers,
      investigations,
      transformers
    };
  } catch {
    return {
      source: "BACKEND OFFLINE",
      summary: emptySummary,
      anomalies: [],
      consumers: [],
      investigations: [],
      transformers: []
    };
  }
}
