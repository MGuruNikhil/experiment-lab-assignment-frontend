"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { apiClient } from "@/lib/auth";

type TutorMessage = {
  id: string;
  sender: "user" | "assistant" | "system";
  content: string;
  createdAt?: string;
  metadata?: any;
};

type TutorSession = {
  id: string;
  title?: string | null;
  status: "open" | "closed";
  goalId?: string | null;
  milestoneId?: string | null;
  createdAt?: string;
};

export type TutorPanelProps = {
  open: boolean;
  onClose: () => void;
  sessionId?: string;
  goalId?: string;
  milestoneId?: string;
  placeholderHint?: string;
};

export default function TutorPanel({ open, onClose, sessionId, goalId, milestoneId, placeholderHint }: TutorPanelProps) {
  const [session, setSession] = useState<TutorSession | null>(null);
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [useAI, setUseAI] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [open, messages.length]);

  // Bootstrap or reuse a session when the panel opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function boot() {
      setLoading(true);
      setBootError(null);
      try {
        let active: TutorSession | null = null;
        // If sessionId provided, fetch that one directly
        if (sessionId) {
          active = { id: sessionId, status: "open" } as TutorSession; // minimal shape; messages fetch will validate access
        } else {
          // 1) List sessions and try to find an open one for this goal/milestone
          const list = await apiClient.get<{ sessions: TutorSession[] }>("/api/tutor/sessions");
          const sessions = list.data.sessions || [];
          const existing = sessions.find((s) => s.status !== "closed" && (
            (goalId && s.goalId === goalId) || (milestoneId && s.milestoneId === milestoneId)
          ));
          active = existing ?? null;
        }
        if (cancelled) return;
        setSession(active);
        if (active) {
          // 3) Fetch messages
          const msgs = await apiClient.get<{ messages: TutorMessage[] }>(`/api/tutor/sessions/${active.id}/messages`);
          if (cancelled) return;
          setMessages(msgs.data.messages || []);
        } else {
          setMessages([]);
        }
      } catch (e: any) {
        if (cancelled) return;
        const errMsg = e?.response?.data?.error || e?.message || "Failed to open tutor";
        setBootError(String(errMsg));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, [open, goalId, milestoneId, sessionId]);

  async function handleSend() {
    if (sending) return;
    const content = text.trim();
    if (!content) return;
    setSending(true);
    setText("");

    const localId = `local-${Date.now()}`;
    setMessages((prev) => [...prev, { id: localId, sender: "user", content }]);

    try {
      let active = session;
      // Lazily create a session if none exists yet and we have goal/milestone
      if (!active) {
        const body: { goalId?: string; milestoneId?: string; title?: string } = {};
        if (goalId) body.goalId = goalId;
        if (milestoneId) body.milestoneId = milestoneId;
        body.title = "Tutor Chat";
        const created = await apiClient.post<{ session: TutorSession }>("/api/tutor/sessions", body);
        active = created.data.session;
        setSession(active);
      }
      if (!active) throw new Error("No session available");

      const res = await apiClient.post<{ assistantMessage: TutorMessage }>(
        `/api/tutor/sessions/${active.id}/message`,
        { content, useLLM: useAI }
      );
      const assistant = res.data.assistantMessage;
      setMessages((prev) => [...prev, assistant]);
    } catch (e: any) {
      // Replace the optimistic user message with one that indicates failure, and try to refetch
      const msg = e?.response?.data?.error || e?.message || "Failed to send";
      setMessages((prev) => prev.map((m) => (m.id === localId ? { ...m, content: `${content}\n\n(Delivery failed: ${String(msg)})` } : m)));
      // Sync with server to catch potential system messages
      try {
        const sid = session?.id;
        if (sid) {
          const sync = await apiClient.get<{ messages: TutorMessage[] }>(`/api/tutor/sessions/${sid}/messages`);
          setMessages(sync.data.messages || []);
        }
      } catch {
        // ignore
      }
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  // Styling helpers
  const title = useMemo(() => {
    if (session?.title) return session.title;
    if (milestoneId) return "Tutor – Milestone";
    if (goalId) return "Tutor – Goal";
    return "AI Tutor";
  }, [session?.title, goalId, milestoneId]);

  return (
    <div className={`fixed inset-0 z-40 ${open ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!open}>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`absolute right-0 top-0 h-full w-full sm:w-[28rem] lg:w-[32rem] transform transition-transform duration-200 ease-out
          ${open ? "translate-x-0" : "translate-x-full"}
        `}
      >
        <div className="h-full flex flex-col bg-ctp-surface0 border-l border-ctp-overlay1/40 shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-ctp-overlay1/40 bg-ctp-surface1">
            <div className="text-sm font-semibold text-ctp-text truncate">{title}</div>
            <button
              className="px-2 py-1 text-sm rounded border border-ctp-overlay1/50 bg-ctp-base hover:bg-ctp-surface2"
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading && <div className="text-ctp-subtext0 text-sm">Loading conversation…</div>}
            {bootError && (
              <div className="text-ctp-yellow-700 text-sm">{bootError}</div>
            )}
            {!loading && messages.length === 0 && !bootError && (
              <div className="text-ctp-subtext0 text-sm">Say hi to your tutor to get started.</div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`max-w-[85%] sm:max-w-[75%] ${m.sender === "user" ? "ml-auto" : "mr-auto"}`}>
                <div
                  className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words shadow-sm border
                    ${m.sender === "user" ? "bg-ctp-blue-600 text-ctp-base border-transparent" : m.sender === "assistant" ? "bg-ctp-surface1 text-ctp-text border-ctp-overlay1/40" : "bg-ctp-yellow-100/20 text-ctp-yellow-700 border-yellow-400/30"}
                  `}
                >
                  <div className="mb-1 text-[11px] opacity-80">
                    <span className="inline-flex items-center gap-1">
                      <span className="px-1.5 py-0.5 rounded-full border border-ctp-overlay1/30 bg-ctp-base text-ctp-text">
                        {m.sender === "assistant" ? "Tutor" : m.sender === "system" ? "System" : "You"}
                      </span>
                      {m.createdAt ? (
                        <span className="tabular-nums">{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      ) : null}
                    </span>
                  </div>
                  <div className="prose prose-invert max-w-none prose-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Composer */}
          <div className="p-3 border-t border-ctp-overlay1/40 bg-ctp-surface1">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-ctp-subtext0 mr-2">
                <input type="checkbox" checked={useAI} onChange={(e) => setUseAI(e.target.checked)} />
                Use AI
              </label>
              <input
                className="flex-1 px-3 py-2 rounded border border-ctp-overlay1/40 bg-ctp-base text-ctp-text placeholder-ctp-subtext0 focus:outline-none focus:ring-2 focus:ring-ctp-blue-700"
                placeholder={placeholderHint ? `Ask about "${placeholderHint}"…` : "Type your message…"}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={!open || loading || sending}
              />
              <button
                className="px-3 py-2 rounded bg-ctp-blue-600 text-ctp-base disabled:opacity-60"
                disabled={!text.trim() || sending}
                onClick={() => void handleSend()}
              >
                {sending ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
