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

type QueueState = {
  total: number;
  returned: number;
  limit: number;
  lastSyncedAt: string;
} | null;

type CopilotResponse = {
  data_available?: boolean;
  answer?: string;
  intent?: string;
  payload?: unknown;
  suggested_next_questions?: string[];
};

const defaultState: ActionState = {
  label: "Ready",
  status: "idle",
  message: "Use these controls during demo to verify backend connectivity and load ML predictions."
};

export function DemoActions() {
  const [state, setState] = useState<ActionState>(defaultState);
  const [queue, setQueue] = useState<QueueState>(null);
  const [question, setQuestion] = useState("What is the current grid status?");
  const [consumerId, setConsumerId] = useState("");
  const [caseId, setCaseId] = useState("");
  const [transformerId, setTransformerId] = useState("");
  const [copilot, setCopilot] = useState<CopilotResponse | null>(null);

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

  async function syncQueue(limit = 100) {
    setState({ label: "Sync Queue", status: "loading", message: "Calling GET /anomalies/queue?limit=100..." });
    try {
      const response = await fetch(`${API_BASE_URL}/anomalies/queue?limit=${limit}`);
      const body = await response.json();
      if (!response.ok) {
        setState({ label: "Sync Queue", status: "error", message: body?.detail ?? `Backend returned ${response.status}` });
        return;
      }
      setQueue({
        total: body.total ?? 0,
        returned: body.returned ?? body.items?.length ?? 0,
        limit: body.limit ?? limit,
        lastSyncedAt: new Date().toLocaleTimeString()
      });
      setState({ label: "Sync Queue", status: "success", message: JSON.stringify(body, null, 2) });
    } catch (error) {
      setState({ label: "Sync Queue", status: "error", message: error instanceof Error ? error.message : "Queue sync failed." });
    }
  }

  async function askElectron(nextQuestion = question) {
    const payload = {
      question: nextQuestion,
      consumer_id: consumerId || null,
      case_id: caseId || null,
      anomaly_id: null,
      transformer_id: transformerId || null,
      limit: 5
    };

    setState({ label: "Ask Electron", status: "loading", message: "Calling POST /copilot/ask..." });
    setCopilot(null);
    try {
      const response = await fetch(`${API_BASE_URL}/copilot/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const body = await response.json();
      if (!response.ok) {
        setState({ label: "Ask Electron", status: "error", message: body?.detail ?? `Backend returned ${response.status}` });
        return;
      }
      setQuestion(nextQuestion);
      setCopilot(body);
      setState({ label: "Ask Electron", status: "success", message: JSON.stringify(body, null, 2) });
    } catch (error) {
      setState({ label: "Ask Electron", status: "error", message: error instanceof Error ? error.message : "Copilot request failed." });
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
          <p className="mt-2 text-sm text-slate-600">Routes shown here match the backend endpoints used during demo.</p>
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
          onClick={() => syncQueue(100)}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
        >
          <ShieldAlert size={16} />
          Sync Queue
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

      {queue ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-medium text-slate-950">Queue synced at {queue.lastSyncedAt}</p>
          <p className="mt-1">
            Showing {queue.returned} of {queue.total} anomalies. Backend route:{" "}
            <code className="rounded bg-white px-1 py-0.5">/anomalies/queue?limit={queue.limit}</code>
          </p>
        </div>
      ) : null}

      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-slate-600" />
          <p className="font-semibold text-slate-950">Ask Electron</p>
          <span className="text-xs text-slate-500">POST /copilot/ask</span>
        </div>
        <div className="mt-4 grid gap-3">
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400"
            placeholder="Ask a backend-grounded question"
          />
          <div className="grid gap-3 md:grid-cols-3">
            <input value={consumerId} onChange={(event) => setConsumerId(event.target.value)} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400" placeholder="Consumer ID optional" />
            <input value={caseId} onChange={(event) => setCaseId(event.target.value)} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400" placeholder="Case ID optional" />
            <input value={transformerId} onChange={(event) => setTransformerId(event.target.value)} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400" placeholder="Transformer ID optional" />
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              "What is the current grid status?",
              "Show top risky consumers",
              "Why was this consumer flagged?",
              "What should the field team inspect?",
              "Give transformer summary"
            ].map((item) => (
              <button key={item} type="button" onClick={() => askElectron(item)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                {item}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => askElectron()} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50">
              <Bot size={16} />
              Ask
            </button>
            <button type="button" onClick={() => { setQuestion(""); setConsumerId(""); setCaseId(""); setTransformerId(""); setCopilot(null); }} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Clear
            </button>
          </div>
          {copilot ? (
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className={`rounded-md border px-2 py-1 ${copilot.data_available === false ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                  {copilot.data_available === false ? "No matching data" : "Data available"}
                </span>
                {copilot.intent ? <span>Intent: {copilot.intent}</span> : null}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-800">{copilot.answer ?? "No readable answer returned."}</p>
              {copilot.suggested_next_questions?.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {copilot.suggested_next_questions.map((item) => (
                    <button key={item} type="button" onClick={() => askElectron(item)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">
                      {item}
                    </button>
                  ))}
                </div>
              ) : null}
              <details className="mt-4">
                <summary className="cursor-pointer text-xs font-medium text-slate-500">Technical payload</summary>
                <pre className="mt-2 max-h-40 overflow-auto rounded-lg border border-slate-200 bg-slate-950 p-3 text-xs leading-5 text-slate-100">
                  {JSON.stringify(copilot.payload ?? copilot, null, 2)}
                </pre>
              </details>
            </div>
          ) : null}
        </div>
      </div>

      <pre className="mt-5 max-h-48 overflow-auto rounded-lg border border-slate-200 bg-slate-950 p-4 text-xs leading-5 text-slate-100">
        {state.message}
      </pre>
    </section>
  );
}
