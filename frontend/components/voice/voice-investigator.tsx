"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ConversationProvider,
  useConversation,
} from "@elevenlabs/react";
import {
  AlertCircle,
  Headphones,
  LoaderCircle,
  MessageSquareText,
  Mic2,
  MicOff,
  Radio,
  Send,
  ShieldCheck,
  Square,
  Volume2,
} from "lucide-react";

type TranscriptEntry = {
  id: number;
  role: "user" | "agent";
  text: string;
};

type SessionState = "ready" | "connecting" | "listening" | "speaking" | "error";

const stateStyles: Record<SessionState, string> = {
  ready: "border-slate-200 bg-slate-100 text-slate-700",
  connecting: "border-amber-200 bg-amber-50 text-amber-700",
  listening: "border-teal-200 bg-teal-50 text-teal-700",
  speaking: "border-sky-200 bg-sky-50 text-sky-700",
  error: "border-red-200 bg-red-50 text-red-700",
};

function describeMicrophoneError(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return "Microphone access was denied. Allow microphone access in your browser, then try again.";
    }
    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      return "No microphone was found. Connect a microphone, then try again.";
    }
  }

  return "Electron could not access the microphone. Check your browser permissions and audio device.";
}

function VoiceInvestigatorSession() {
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID?.trim();
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [requestingMicrophone, setRequestingMicrophone] = useState(false);
  const [textMessage, setTextMessage] = useState("");
  const [textError, setTextError] = useState<string | null>(null);
  const [isSendingText, setIsSendingText] = useState(false);
  const nextTranscriptId = useRef(1);
  const pendingTypedMessage = useRef<string | null>(null);
  const transcriptEnd = useRef<HTMLDivElement | null>(null);

  const appendTranscript = useCallback((role: TranscriptEntry["role"], text: string) => {
    setTranscript((current) => [
      ...current,
      {
        id: nextTranscriptId.current++,
        role,
        text,
      },
    ]);
  }, []);

  const conversation = useConversation({
    onConnect: () => setSessionError(null),
    onError: (error) => {
      const message = typeof error === "string" ? error : "The ElevenLabs session encountered an unexpected error.";
      setSessionError(message);
      setTextError(message);
      setIsSendingText(false);
    },
    onMessage: ({ message, source }) => {
      const text = message.trim();
      if (!text) return;

      if (source === "user" && pendingTypedMessage.current === text) {
        pendingTypedMessage.current = null;
        return;
      }

      appendTranscript(source === "user" ? "user" : "agent", text);
      if (source !== "user") {
        pendingTypedMessage.current = null;
        setIsSendingText(false);
        setTextError(null);
      }
    },
  });

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [transcript]);

  useEffect(() => {
    if (conversation.status === "disconnected" && isSendingText) {
      pendingTypedMessage.current = null;
      setIsSendingText(false);
      setTextError("The conversation disconnected before Electron completed its response.");
    }
  }, [conversation.status, isSendingText]);

  const state = useMemo<SessionState>(() => {
    if (sessionError) return "error";
    if (requestingMicrophone || conversation.status === "connecting") return "connecting";
    if (conversation.status === "connected" && conversation.isSpeaking) return "speaking";
    if (conversation.status === "connected") return "listening";
    return "ready";
  }, [conversation.isSpeaking, conversation.status, requestingMicrophone, sessionError]);

  const stateLabel = {
    ready: "Ready",
    connecting: "Connecting",
    listening: conversation.isMuted ? "Listening paused" : "Listening",
    speaking: "Speaking",
    error: "Disconnected / Error",
  }[state];

  const startConversation = useCallback(async () => {
    setSessionError(null);

    if (!agentId) {
      setSessionError("Set NEXT_PUBLIC_ELEVENLABS_AGENT_ID in frontend/.env.local, then restart the frontend.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setSessionError("Voice input is unavailable in this browser or context. Use a supported browser over HTTPS or localhost.");
      return;
    }

    setRequestingMicrophone(true);
    try {
      const permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      permissionStream.getTracks().forEach((track) => track.stop());
      setTranscript([]);
      await conversation.startSession({
  agentId: agentId,
  environment: "staging",
});
    } catch (error) {
      setSessionError(describeMicrophoneError(error));
    } finally {
      setRequestingMicrophone(false);
    }
  }, [agentId, conversation]);

  const endConversation = useCallback(async () => {
    setSessionError(null);
    try {
      await conversation.endSession();
    } catch {
      setSessionError("Electron could not close the voice session cleanly. Refresh the page before starting another session.");
    }
  }, [conversation]);

  const connected = conversation.status === "connected";

  const submitTextMessage = async (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();

  const message = textMessage.trim();

  if (!message) {
    setTextError("Enter a message before sending it to Electron.");
    return;
  }

  if (!agentId) {
    setTextError(
      "Electron is not configured. Set NEXT_PUBLIC_ELEVENLABS_AGENT_ID and restart the frontend."
    );
    return;
  }

  if (!connected) {
    setTextError("Start the voice session before sending a text message.");
    return;
  }

  setTextError(null);
  setIsSendingText(true);
  pendingTypedMessage.current = message;
  appendTranscript("user", message);
  setTextMessage("");

  try {
    /*
     * If the user mentions a consumer ID, fetch the REAL backend
     * data before asking ElevenLabs to answer.
     */
    const consumerMatch = message.match(
      /\b(?:GS|ETH)-[A-Za-z0-9-]+\b/i
    );

    if (consumerMatch) {
      const consumerId = consumerMatch[0];

      console.log(
        "[Electron] Fetching backend data for:",
        consumerId
      );

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/voice/tools/consumer-summary`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            consumer_id: consumerId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Electron backend returned HTTP ${response.status}`
        );
      }

      const result = await response.json();

      console.log(
        "[Electron] Backend consumer result:",
        result
      );

      /*
       * Give ElevenLabs the REAL backend result as conversation
       * context. This does not invent or modify any data.
       */
      await conversation.sendContextualUpdate(
        `AUTHORITATIVE ELECTRON BACKEND DATA FOR CONSUMER ${consumerId}:

${JSON.stringify(result, null, 2)}

Use this backend data as the source of truth when answering the user's current question.

Do not claim that ${consumerId} is unknown.
Do not invent values.
Do not replace these backend values with general knowledge.

If data_available is false, clearly tell the user that Electron's backend has no available data for this consumer.`
      );
    }

    /*
     * Now send the actual user request to ElevenLabs.
     */
    conversation.sendUserMessage(message);
  } catch (error) {
    console.error(
      "[Electron] Failed to prepare message:",
      error
    );

    pendingTypedMessage.current = null;
    setIsSendingText(false);

    setTextError(
      error instanceof Error
        ? error.message
        : "Electron could not send the text message."
    );
  }
};

  const handleTextKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
      <section className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-teal-50/80 to-transparent" />
        <div className="relative flex min-h-[470px] flex-col items-center justify-center text-center">
          <div className={`mb-8 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${stateStyles[state]}`}>
            <span className={`size-2 rounded-full ${state === "error" ? "bg-red-500" : state === "ready" ? "bg-slate-400" : "animate-pulse bg-current"}`} />
            <span aria-live="polite">{stateLabel}</span>
          </div>

          <div className="relative mb-8 grid size-44 place-items-center sm:size-52" aria-hidden="true">
            {(state === "listening" || state === "speaking") && (
              <>
                <span className="absolute inset-0 animate-ping rounded-full border border-teal-300/70" />
                <span className="absolute inset-5 animate-pulse rounded-full border border-sky-200 bg-sky-50/50" />
              </>
            )}
            <div
              className={`relative grid size-32 place-items-center rounded-full border shadow-lg transition sm:size-36 ${
                state === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : state === "speaking"
                    ? "border-sky-300 bg-sky-600 text-white"
                    : state === "listening"
                      ? "border-teal-300 bg-teal-600 text-white"
                      : "border-slate-200 bg-slate-950 text-white"
              }`}
            >
              {state === "speaking" ? <Volume2 size={48} /> : state === "error" ? <AlertCircle size={48} /> : <Mic2 size={48} />}
            </div>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Talk to Electron</h2>
          <p className="mt-3 max-w-lg text-sm leading-6 text-slate-600">
            Microphone audio is sent to the configured ElevenLabs agent. Its existing tools continue to retrieve
            consumer and anomaly evidence from the Electron backend.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            {connected ? (
              <>
                <button
                  type="button"
                  onClick={endConversation}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <Square size={16} fill="currentColor" />
                  End session
                </button>
                <button
                  type="button"
                  onClick={() => conversation.setMuted(!conversation.isMuted)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                >
                  {conversation.isMuted ? <Mic2 size={17} /> : <MicOff size={17} />}
                  {conversation.isMuted ? "Resume microphone" : "Mute microphone"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={startConversation}
                disabled={requestingMicrophone || conversation.status === "connecting"}
                className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-teal-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-wait disabled:opacity-60"
              >
                <Mic2 size={18} />
                {state === "connecting" ? "Connecting…" : "Talk to Electron"}
              </button>
            )}
          </div>

          {sessionError && (
            <div className="mt-6 flex max-w-xl items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-left text-sm leading-5 text-red-800" role="alert">
              <AlertCircle className="mt-0.5 shrink-0" size={17} />
              <span>{sessionError}</span>
            </div>
          )}

          <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} /> Backend-grounded tools</span>
            <span className="inline-flex items-center gap-1.5"><Radio size={14} /> Live voice session</span>
            <span className="inline-flex items-center gap-1.5"><Headphones size={14} /> Use headphones for best results</span>
          </div>
        </div>
      </section>

      <section className="flex min-h-[470px] flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Conversation</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">Session transcript</h2>
        </header>

        <div className="flex min-h-[280px] max-h-[470px] flex-1 flex-col gap-4 overflow-y-auto p-5 sm:p-6" aria-live="polite">
          {transcript.length === 0 ? (
            <div className="m-auto max-w-xs text-center">
              <div className="mx-auto grid size-12 place-items-center rounded-full bg-slate-100 text-slate-500">
                <Radio size={20} />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-800">No conversation yet</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Start a voice session and ask about a consumer using its exact ID. Supported transcript messages will
                appear here.
              </p>
            </div>
          ) : (
            transcript.map((entry) => (
              <div key={entry.id} className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[88%] rounded-xl px-4 py-3 text-sm leading-6 ${
                    entry.role === "user"
                      ? "rounded-br-sm bg-slate-900 text-white"
                      : "rounded-bl-sm border border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  <p className={`mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${entry.role === "user" ? "text-slate-300" : "text-teal-700"}`}>
                    {entry.role === "user" ? "You" : "Electron"}
                  </p>
                  <p>{entry.text}</p>
                </div>
              </div>
            ))
          )}
          <div ref={transcriptEnd} />
        </div>

        <form className="border-t border-slate-200 bg-slate-50/70 p-4 sm:p-5" onSubmit={submitTextMessage}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <label htmlFor="electron-text-message" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
              <MessageSquareText size={17} className="text-teal-700" />
              Ask Electron
            </label>
            <span className="text-xs text-slate-500">Same live investigation session</span>
          </div>
          <div className="flex items-end gap-2 rounded-xl border border-slate-300 bg-white p-2 shadow-sm focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100">
            <textarea
              id="electron-text-message"
              value={textMessage}
              rows={2}
              onChange={(event) => {
                setTextMessage(event.target.value);
                setTextError(null);
                if (connected) conversation.sendUserActivity();
              }}
              onKeyDown={handleTextKeyDown}
              placeholder="Ask about a consumer, anomaly, meter, or investigation..."
              className="max-h-32 min-h-12 flex-1 resize-y border-0 bg-transparent px-2 py-2 text-sm leading-5 text-slate-900 outline-none placeholder:text-slate-400"
              aria-describedby={textError ? "electron-text-error" : "electron-text-help"}
            />
            <button
              type="submit"
              disabled={isSendingText}
              className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-wait disabled:opacity-60"
            >
              {isSendingText ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />}
              {isSendingText ? "Processing" : "Send"}
            </button>
          </div>
          <div className="mt-2 min-h-5 text-xs leading-5">
            {textError ? (
              <p id="electron-text-error" className="flex items-start gap-1.5 text-red-700" role="alert">
                <AlertCircle className="mt-0.5 shrink-0" size={13} />
                {textError}
              </p>
            ) : isSendingText ? (
              <p className="text-teal-700" aria-live="polite">Electron is processing the request through the active agent session.</p>
            ) : (
              <p id="electron-text-help" className="text-slate-500">Press Enter to send. Use Shift+Enter for a new line.</p>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}

export function VoiceInvestigator() {
  return (
    <ConversationProvider>
      <VoiceInvestigatorSession />
    </ConversationProvider>
  );
}
