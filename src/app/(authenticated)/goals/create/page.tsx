"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { apiClient } from "@/lib/auth";

type HeuristicSuggestion = {
  journeyTitle: string;
  durationWeeks: number;
  chunking: "weekly" | "biweekly";
  milestones: Array<{
    title: string;
    description?: string;
    orderIndex: number;
    startWeek?: number;
    endWeek?: number;
    estimatedHours?: number;
  }>;
};

export default function CreateGoalPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [complexity, setComplexity] = useState(5);
  const [durationWeeks, setDurationWeeks] = useState<number | "">("");
  const [chunking, setChunking] = useState<"weekly" | "biweekly">("weekly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [suggestion, setSuggestion] = useState<HeuristicSuggestion | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [createdGoalId, setCreatedGoalId] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [useAI, setUseAI] = useState<boolean>(true);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiInfo, setAiInfo] = useState<string | null>(null);
  const [aiWarning, setAiWarning] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
  type SuggestionHistoryItem = { id: string; provider: string; createdAt: string; expiresAt: string | null; response: unknown };
  const [suggestionSource, setSuggestionSource] = useState<"heuristic" | "ai" | null>(null);
  const [suggestionCached, setSuggestionCached] = useState<boolean>(false);
  function getParsedJourneyTitle(resp: unknown): string | null {
    if (resp && typeof resp === "object" && resp !== null && "parsed" in (resp as Record<string, unknown>)) {
      const p = (resp as { parsed?: { journeyTitle?: string } }).parsed;
      return typeof p?.journeyTitle === "string" ? p.journeyTitle : null;
    }
    return null;
  }
  // Parse a stored history response into a Suggestion for preview
  function parseSuggestionFromHistory(resp: unknown): HeuristicSuggestion | null {
    if (!resp || typeof resp !== "object") return null;
    const r = resp as Record<string, unknown>;
    if ("parsed" in r && r.parsed && typeof r.parsed === "object") {
      const p = r.parsed as Record<string, unknown>;
      const journeyTitle = typeof p.journeyTitle === "string" ? p.journeyTitle : null;
      const durationWeeks = typeof p.durationWeeks === "number" ? p.durationWeeks : null;
      const chunkRaw = p.chunking;
      const chunking = chunkRaw === "weekly" || chunkRaw === "biweekly" ? chunkRaw : null;
      const rawMilestones = Array.isArray(p.milestones) ? (p.milestones as unknown[]) : [];
      const milestones = rawMilestones
        .map((m, idx): HeuristicSuggestion["milestones"][number] | null => {
          if (!m || typeof m !== "object") return null;
          const mr = m as Record<string, unknown>;
          const title = typeof mr.title === "string" ? mr.title : null;
          if (!title) return null;
          return {
            title,
            description: typeof mr.description === "string" ? mr.description : undefined,
            orderIndex: typeof mr["orderIndex"] === "number" ? (mr["orderIndex"] as number) : idx,
            startWeek: typeof mr.startWeek === "number" ? mr.startWeek : undefined,
            endWeek: typeof mr.endWeek === "number" ? mr.endWeek : undefined,
            estimatedHours: typeof mr.estimatedHours === "number" ? mr.estimatedHours : undefined,
          };
        })
        .filter(Boolean) as HeuristicSuggestion["milestones"]; 
      if (journeyTitle && durationWeeks !== null && chunking && milestones.length > 0) {
        return { journeyTitle, durationWeeks, chunking, milestones };
      }
    }
    // direct heuristic shape
    const journeyTitle = typeof r["journeyTitle"] === "string" ? (r["journeyTitle"] as string) : null;
    const durationWeeks = typeof r["durationWeeks"] === "number" ? (r["durationWeeks"] as number) : null;
    const chunkRaw = r["chunking"];
    const chunking = chunkRaw === "weekly" || chunkRaw === "biweekly" ? (chunkRaw as "weekly" | "biweekly") : null;
    const msRaw = Array.isArray(r["milestones"]) ? (r["milestones"] as unknown[]) : null;
    if (journeyTitle && durationWeeks !== null && chunking && msRaw) {
      const milestones = msRaw
        .map((m, idx): HeuristicSuggestion["milestones"][number] | null => {
          if (!m || typeof m !== "object") return null;
          const mr = m as Record<string, unknown>;
          const title = typeof mr.title === "string" ? mr.title : null;
          if (!title) return null;
          return {
            title,
            description: typeof mr.description === "string" ? mr.description : undefined,
            orderIndex: typeof mr["orderIndex"] === "number" ? (mr["orderIndex"] as number) : idx,
            startWeek: typeof mr.startWeek === "number" ? mr.startWeek : undefined,
            endWeek: typeof mr.endWeek === "number" ? mr.endWeek : undefined,
            estimatedHours: typeof mr.estimatedHours === "number" ? mr.estimatedHours : undefined,
          };
        })
        .filter(Boolean) as HeuristicSuggestion["milestones"]; 
      if (milestones.length > 0) return { journeyTitle, durationWeeks, chunking, milestones };
    }
    return null;
  }
  const [history, setHistory] = useState<SuggestionHistoryItem[]>([]);
  type AISuggestionResp = Partial<HeuristicSuggestion> & { cached?: boolean; llmError?: boolean; journeyId?: string };

  async function onSubmit(_e: React.FormEvent) {
    _e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data: goal } = await apiClient.post("/api/goals", {
        title,
        description: description || undefined,
        complexity,
        suggestedWeeks: durationWeeks === "" ? undefined : Number(durationWeeks),
        chunking,
      });

      setCreatedGoalId(goal.id);
      setAiWarning(null);
      setSuggestion(null);

      if (useAI) {
        // Show modal with loading state while waiting for AI
        setShowModal(true);
        setAiLoading(true);
        setAiInfo("Generating AI suggestion...");
        try {
          const { data: ai } = await apiClient.post(`/api/goals/${goal.id}/suggest`, {
            useLLM: true,
            chunking,
            durationWeeks: durationWeeks === "" ? undefined : Number(durationWeeks),
          });
          const aiData = ai as AISuggestionResp;
          console.log("[ui] suggest.ai.response", { cached: aiData.cached, llmError: aiData.llmError, hasJourney: Boolean(aiData.journeyTitle && aiData.milestones) });
          setSuggestionCached(Boolean(aiData?.cached));

          if (aiData?.journeyTitle && aiData?.milestones) {
            setSuggestion(aiData as HeuristicSuggestion);
            setSuggestionSource("ai");
          } else {
            // Fallback to heuristic if AI did not return a valid plan
            if (aiData?.llmError) setAiWarning("AI suggestion failed. Showing heuristic instead.");
            const { data: sug } = await apiClient.post(`/api/goals/${goal.id}/suggest`, {
              useLLM: false,
              chunking,
              durationWeeks: durationWeeks === "" ? undefined : Number(durationWeeks),
            });
            setSuggestion(sug as HeuristicSuggestion);
            setSuggestionSource("heuristic");
            setSuggestionCached(false);
          }
        } catch (err: unknown) {
          // On error (including 429), fallback to heuristic
          const anyErr = err as { response?: { status?: number; data?: { retryAfter?: number } } };
          const status = anyErr?.response?.status;
          if (status === 429) {
            const retryAfter = anyErr?.response?.data?.retryAfter;
            const d = new Date(Date.now() + (retryAfter ?? 0) * 1000);
            const hh = String(d.getHours()).padStart(2, "0");
            const mm = String(d.getMinutes()).padStart(2, "0");
            setAiWarning(`AI suggestion limit reached. Showing heuristic instead (limit resets ~${hh}:${mm}).`);
          } else {
            setAiWarning("AI suggestion failed. Showing heuristic instead.");
          }
          const { data: sug } = await apiClient.post(`/api/goals/${goal.id}/suggest`, {
            useLLM: false,
            chunking,
            durationWeeks: durationWeeks === "" ? undefined : Number(durationWeeks),
          });
          setSuggestion(sug as HeuristicSuggestion);
          setSuggestionSource("heuristic");
          setSuggestionCached(false);
        } finally {
          setAiLoading(false);
          setAiInfo(null);
        }
      } else {
        // No AI: get heuristic and show
        const { data: sug } = await apiClient.post(`/api/goals/${goal.id}/suggest`, {
          useLLM: false,
          chunking,
          durationWeeks: durationWeeks === "" ? undefined : Number(durationWeeks),
        });
        setSuggestion(sug as HeuristicSuggestion);
        setSuggestionSource("heuristic");
        setSuggestionCached(false);
        setShowModal(true);
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      setError(err.response?.data?.error ?? err.message ?? "Failed to create goal");
    } finally {
      setLoading(false);
    }
  }

  async function acceptSuggestion() {
    if (!suggestion) return;
    try {
  setAccepting(true);
      const goalId = createdGoalId ?? (await getLatestGoalId());
      // Heuristic suggestions need explicit creation; AI suggestions may have already created journey server-side
      if (!(suggestion as unknown as { journeyId?: string }).journeyId) {
        // Avoid duplicates by checking for an existing journey with the same title
        const existingGoal = await apiClient.get(`/api/goals/${goalId}`);
        const existingJourney = (existingGoal.data?.journeys ?? []).find((j: { title?: string | null }) => (j.title ?? "") === suggestion.journeyTitle);
        if (existingJourney) {
          // Journey already exists (likely from earlier accept or AI). Do not re-add milestones.
          setShowModal(false);
          router.push(`/goals/${goalId}`);
          return;
        } else {
          const { data: journey } = await apiClient.post(`/api/goals/${goalId}/journeys`, {
            title: suggestion.journeyTitle,
            startDate: undefined,
            endDate: undefined,
            meta: { generated: suggestionSource === "ai" ? "openrouter" : "heuristic" },
          });
          const journeyId = journey.id as string;
          for (const [idx, m] of suggestion.milestones.entries()) {
            await apiClient.post(`/api/journeys/${journeyId}/milestones`, {
              title: m.title,
              description: m.description,
              orderIndex: typeof m.orderIndex === "number" ? m.orderIndex : idx,
              startWeek: m.startWeek,
              endWeek: m.endWeek,
              estimatedHours: m.estimatedHours,
            });
          }
        }
      }
  setShowModal(false);
      router.push(`/goals/${goalId}`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      setError(err.response?.data?.error ?? err.message ?? "Failed to accept suggestion");
    } finally {
      setAccepting(false);
    }
  }

  async function getLatestGoalId(): Promise<string> {
    const r = await apiClient.get("/api/goals");
    return r.data?.[0]?.id as string;
  }

  async function openHistory() {
    try {
      if (!createdGoalId) return;
      const r = await apiClient.get(`/api/goals/${createdGoalId}/suggestions`);
      setHistory(r.data || []);
      setHistoryOpen(true);
  } catch {
      // ignore errors
    }
  }

  const diffNote = useMemo(() => {
    if (!suggestion) return null;
    // We don't have the original heuristic stored separately; basic hint if AI modified title or milestone count vs a baseline could be integrated if we keep both.
    // For now, show the count and title from the current suggestion.
    const count = suggestion.milestones.length;
    return `${count} milestones · Title: ${suggestion.journeyTitle}`;
  }, [suggestion]);

  return (
    <div className="p-6 max-w-2xl mx-auto bg-ctp-base">
      <h1 className="text-2xl font-semibold mb-4 text-ctp-text">Create New Goal</h1>
      {error && <div className="mb-4 text-ctp-red-600">{error}</div>}
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ctp-subtext0">Title</label>
          <input
            className="mt-1 w-full border border-ctp-overlay1/50 bg-ctp-surface0 text-ctp-text rounded px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ctp-subtext0">Description</label>
          <textarea
            className="mt-1 w-full border border-ctp-overlay1/50 bg-ctp-surface0 text-ctp-text rounded px-3 py-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ctp-subtext0">Complexity: {complexity}</label>
          <input
            type="range"
            min={1}
            max={10}
            value={complexity}
            onChange={(e) => setComplexity(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ctp-subtext0">Duration Weeks (optional)</label>
            <input
              type="number"
              min={1}
              className="mt-1 w-full border border-ctp-overlay1/50 bg-ctp-surface0 text-ctp-text rounded px-3 py-2"
              value={durationWeeks}
              onChange={(e) => setDurationWeeks(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ctp-subtext0">Chunking</label>
            <select
              className="mt-1 w-full border border-ctp-overlay1/50 bg-ctp-surface0 text-ctp-text rounded px-3 py-2"
              value={chunking}
              onChange={(e) => setChunking(e.target.value === "biweekly" ? "biweekly" : "weekly")}
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={useAI} onChange={(e) => setUseAI(e.target.checked)} />
            Use AI
          </label>
          <button
            type="submit"
            className="px-4 py-2 bg-ctp-blue-600 text-ctp-base rounded"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Goal"}
          </button>
          {createdGoalId && (
            <button type="button" className="px-3 py-2 text-sm border border-ctp-overlay1/50 rounded" onClick={openHistory}>History</button>
          )}
        </div>
      </form>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-ctp-surface0 border border-ctp-overlay1/40 rounded shadow-lg max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold text-ctp-text">Suggested Journey</h2>
              <div className="flex items-center gap-2">
                {suggestionSource && (
                  <span className={`text-xs px-2 py-1 rounded ${suggestionSource === "ai" ? "bg-ctp-blue-100 text-ctp-blue-700" : "bg-ctp-surface1 text-ctp-subtext0"}`}>
                    {suggestionSource === "ai" ? "AI suggested" : "Heuristic"}
                  </span>
                )}
                {suggestionCached && (
                  <span className="text-xs px-2 py-1 rounded bg-ctp-yellow-100 text-ctp-yellow-700">Cached</span>
                )}
              </div>
            </div>
            {aiLoading && (
              <div className="mb-4">
                <div className="text-sm text-ctp-blue-700 mb-2">{aiInfo ?? "Generating AI suggestion..."}</div>
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-ctp-surface1 rounded w-1/3" />
                  <div className="h-3 bg-ctp-surface1 rounded w-2/3" />
                  <div className="h-3 bg-ctp-surface1 rounded w-1/2" />
                </div>
              </div>
            )}
            {!aiLoading && aiInfo && <div className="text-sm text-ctp-blue-700 mb-2">{aiInfo}</div>}
            {aiWarning && <div className="text-sm text-ctp-yellow-700 mb-2">{aiWarning}</div>}
            {suggestion && (
              <>
                <div className="text-sm text-ctp-subtext0 mb-4">
                  {suggestion.durationWeeks} weeks · {suggestion.chunking}
                </div>
                {diffNote && <div className="text-xs text-slate-500 mb-2">{diffNote}</div>}
                <ol className="list-decimal pl-6 space-y-2 max-h-80 overflow-auto">
                  {suggestion.milestones.map((m, idx) => (
                    <li key={`${idx}-${m.title}`}>
                      <div className="font-medium text-ctp-text">{m.title}</div>
                      <div className="text-sm text-ctp-subtext0">
                        Weeks {m.startWeek} - {m.endWeek} · ~{m.estimatedHours}h
                      </div>
                      {m.description && <div className="text-sm text-ctp-subtext0">{m.description}</div>}
                    </li>
                  ))}
                </ol>
              </>
            )}
            <div className="flex justify-end gap-3 mt-4">
              <button className="px-4 py-2 bg-ctp-surface1 text-ctp-text rounded" onClick={() => setShowModal(false)}>Close</button>
              <button className="px-4 py-2 bg-ctp-green-600 text-ctp-base rounded disabled:opacity-60" onClick={acceptSuggestion} disabled={accepting || !suggestion}>
                Accept Suggestion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History modal */}
      {historyOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-ctp-surface0 border border-ctp-overlay1/40 rounded shadow-lg max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold text-ctp-text">Suggestion History</h2>
              <button className="px-3 py-1 bg-ctp-surface1 rounded" onClick={() => setHistoryOpen(false)}>Close</button>
            </div>
            <ul className="space-y-2 max-h-80 overflow-auto">
        {history.map((h, idx) => (
                <li key={h.id} className="border border-ctp-overlay1/40 rounded p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-ctp-subtext0">
          #{idx + 1} · {new Date(h.createdAt).toLocaleString()} · {(() => { const title = getParsedJourneyTitle(h.response); if (title) return title; const p = (h.provider || "").toString().toLowerCase(); return p.includes("openrouter") ? "AI" : (p || ""); })()}
                    </div>
                    <button className="text-sm px-2 py-1 border rounded" onClick={() => {
                      const parsed = parseSuggestionFromHistory(h.response);
                      if (parsed) {
                        setSuggestion(parsed);
                        setSuggestionSource("ai");
                        setSuggestionCached(Boolean((h as unknown as { cached?: boolean })?.cached));
                        setShowModal(true);
                      }
                    }}>Preview</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
