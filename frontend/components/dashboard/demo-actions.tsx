"use client";

import { useState } from "react";
import { Bot, DatabaseZap, RefreshCw, Server, ShieldAlert } from "lucide-react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000";

type ActionState = {
  label: string;
  status: "idle" | "loading" | "success" | "error";
  message: string;
};

const defaultState: ActionState = {
  label: "Ready",
  status: "idle",
  message: "Use these controls during demo to verify backend connectivity and load ML predictions."
};

export function DemoActions() {
  const [state, setState] = useState<ActionState>(defaultState);

  async function runAction(label: string, request: () => Promise<Response>) {
    setState({ label, status: "loading", message: "Calling backend..." });
    try {
      const response = await request();
      const body = await response.json();

      if (!response.ok) {
        setState({
          label,
          status: "error",
          message: body?.detail ?? `Backend returned ${response.status}`
        });
        return;
      }

      setState({
        label,
        status: "success",
        message: JSON.stringify(body, null, 2)
      });
    } catch (error) {
      setState({
        label,
        status: "error",
        message: error instanceof Error ? error.message : "Backend request failed."
      });
    }
  }

  const statusClass =
    state.status === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : state.status === "error"
        ? "border-red-200 bg-red-50 text-red-800"
        : state.status === "loading"
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Demo Controls</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">Backend actions</h2>
        </div>
        <span className={`rounded-md border px-3 py-1 text-xs font-medium ${statusClass}`}>{state.label}</span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => runAction("Health", () => fetch(`${API_BASE_URL}/health`))}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
        >
          <Server size={16} />
          Check API
        </button>
        <button
          type="button"
          onClick={() => runAction("Load ML", () => fetch(`${API_BASE_URL}/ml/predictions/load-sample`, { method: "POST" }))}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
        >
          <DatabaseZap size={16} />
          Load ML Sample
        </button>
        <button
          type="button"
          onClick={() => runAction("Queue", () => fetch(`${API_BASE_URL}/anomalies/queue?limit=10`))}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
        >
          <ShieldAlert size={16} />
          Check Queue
        </button>
        <button
          type="button"
          onClick={() =>
            runAction("Copilot", () =>
              fetch(`${API_BASE_URL}/copilot/ask`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: "What is the current grid status?" })
              })
            )
          }
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
        >
          <Bot size={16} />
          Ask Copilot
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <pre className="mt-5 max-h-48 overflow-auto rounded-lg border border-slate-200 bg-slate-950 p-4 text-xs leading-5 text-slate-100">
        {state.message}
      </pre>
    </section>
  );
}
