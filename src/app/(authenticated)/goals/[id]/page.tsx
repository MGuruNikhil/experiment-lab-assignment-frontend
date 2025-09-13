"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/auth";
import dynamic from "next/dynamic";

const TutorPanel = dynamic(() => import("@/components/tutor/TutorPanel"), { ssr: false });

type Milestone = {
  id: string;
  title: string;
  description?: string | null;
  orderIndex: number;
  startWeek?: number | null;
  endWeek?: number | null;
  estimatedHours?: number | null;
  progress: number;
};

export default function GoalDetailPage() {
  const params = useParams<{ id: string }>();
  const goalId = params?.id as string;
  const router = useRouter();
  type Journey = { id: string; title?: string | null; milestones?: Milestone[] };
  type Goal = { id: string; title: string; description?: string | null; journeys?: Journey[] };
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editProgress, setEditProgress] = useState<number>(0);
  const [unmetDeps, setUnmetDeps] = useState<Array<{ id: string; title: string }>>([]);
  type SuggestionJourney = {
    journeyId?: string;
    journeyTitle: string;
    durationWeeks: number;
    chunking: "weekly" | "biweekly";
    milestones: Array<{
      title: string;
      description?: string;
      startWeek?: number;
      endWeek?: number;
      estimatedHours?: number;
    }>;
  };
  type SuggestionHistoryItem = { id: string; provider: string; createdAt: string; expiresAt: string | null; response: unknown };
  function getParsedJourneyTitle(resp: unknown): string | null {
    if (resp && typeof resp === "object" && resp !== null && "parsed" in (resp as Record<string, unknown>)) {
      const p = (resp as { parsed?: { journeyTitle?: string } }).parsed;
      return typeof p?.journeyTitle === "string" ? p.journeyTitle : null;
    }
    return null;
  }
  const [useAI, setUseAI] = useState<boolean>(false);
  const [heuristic, setHeuristic] = useState<SuggestionJourney | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<SuggestionJourney | null>(null);
  const [suggestLoading, setSuggestLoading] = useState<boolean>(false);
  const [suggestInfo, setSuggestInfo] = useState<string | null>(null);
  const [suggestWarning, setSuggestWarning] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
  const [history, setHistory] = useState<SuggestionHistoryItem[]>([]);
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [previewSuggestion, setPreviewSuggestion] = useState<SuggestionJourney | null>(null);
  const [previewProvider, setPreviewProvider] = useState<"openrouter" | "heuristic" | null>(null);
  const [previewAccepting, setPreviewAccepting] = useState<boolean>(false);
  const [expandedDesc, setExpandedDesc] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState<boolean>(false);
  const [suggestModalOpen, setSuggestModalOpen] = useState<boolean>(false);
  const [tutorOpen, setTutorOpen] = useState<boolean>(false);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);

  // Safely parse a stored history response back into a SuggestionJourney
  function parseSuggestionFromHistory(resp: unknown): SuggestionJourney | null {
    if (!resp || typeof resp !== "object") return null;
    const r = resp as Record<string, unknown>;

    // Case 1: AI provider shape => { parsed: {...} }
    if ("parsed" in r && r.parsed && typeof r.parsed === "object") {
      const p = r.parsed as Record<string, unknown>;
      const journeyTitle = typeof p.journeyTitle === "string" ? p.journeyTitle : null;
      const durationWeeks = typeof p.durationWeeks === "number" ? p.durationWeeks : null;
      const chunkRaw = p.chunking;
      const chunking = chunkRaw === "weekly" || chunkRaw === "biweekly" ? chunkRaw : null;
      const rawMilestones = Array.isArray(p.milestones) ? (p.milestones as unknown[]) : [];
      const milestones = rawMilestones
        .map((m): SuggestionJourney["milestones"][number] | null => {
          if (!m || typeof m !== "object") return null;
          const mr = m as Record<string, unknown>;
          const title = typeof mr.title === "string" ? mr.title : null;
          if (!title) return null;
          return {
            title,
            description: typeof mr.description === "string" ? mr.description : undefined,
            startWeek: typeof mr.startWeek === "number" ? mr.startWeek : undefined,
            endWeek: typeof mr.endWeek === "number" ? mr.endWeek : undefined,
            estimatedHours: typeof mr.estimatedHours === "number" ? mr.estimatedHours : undefined,
          };
        })
        .filter(Boolean) as SuggestionJourney["milestones"]; 

      if (journeyTitle && durationWeeks !== null && chunking && milestones.length > 0) {
        return { journeyTitle, durationWeeks, chunking, milestones };
      }
    }

    // Case 2: Heuristic or direct SuggestionJourney shape persisted
    const journeyTitle = typeof r["journeyTitle"] === "string" ? (r["journeyTitle"] as string) : null;
    const durationWeeks = typeof r["durationWeeks"] === "number" ? (r["durationWeeks"] as number) : null;
    const chunkRaw = r["chunking"];
    const chunking = chunkRaw === "weekly" || chunkRaw === "biweekly" ? (chunkRaw as "weekly" | "biweekly") : null;
    const msRaw = Array.isArray(r["milestones"]) ? (r["milestones"] as unknown[]) : null;
    if (journeyTitle && durationWeeks !== null && chunking && msRaw) {
      const milestones = msRaw
        .map((m): SuggestionJourney["milestones"][number] | null => {
          if (!m || typeof m !== "object") return null;
          const mr = m as Record<string, unknown>;
          const title = typeof mr.title === "string" ? mr.title : null;
          if (!title) return null;
          return {
            title,
            description: typeof mr.description === "string" ? mr.description : undefined,
            startWeek: typeof mr.startWeek === "number" ? mr.startWeek : undefined,
            endWeek: typeof mr.endWeek === "number" ? mr.endWeek : undefined,
            estimatedHours: typeof mr.estimatedHours === "number" ? mr.estimatedHours : undefined,
          };
        })
        .filter(Boolean) as SuggestionJourney["milestones"]; 
      if (milestones.length > 0) return { journeyTitle, durationWeeks, chunking, milestones };
    }

    return null;
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await apiClient.get<Goal>(`/api/goals/${goalId}`);
      setGoal(r.data);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      setError(err.response?.data?.error ?? err.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (goalId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalId]);

  const milestones = useMemo(() => {
    if (!goal) return [] as Milestone[];
    return (goal.journeys ?? []).flatMap((j) => j.milestones ?? []) as Milestone[];
  }, [goal]);

  const overallProgress = useMemo(() => {
    if (milestones.length === 0) return 0;
    const total = milestones.reduce((sum, m) => sum + (m.progress ?? 0), 0);
    return Math.round(total / milestones.length);
  }, [milestones]);

  async function saveProgress(milestoneId: string) {
    try {
      await apiClient.put(`/api/milestones/${milestoneId}`, { progress: editProgress });
      setEditing(null);
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string; unmetDependencies?: Array<{ id: string; title: string }> } }; message?: string };
      const unmet = err.response?.data?.unmetDependencies ?? [];
      if (editProgress === 100 && unmet.length > 0) {
        setUnmetDeps(unmet);
        return;
      }
      setError(err.response?.data?.error ?? err.message ?? "Failed to save");
    }
  }

  function progressColor(p: number): string {
  if (p >= 100) return "bg-ctp-green-700";
  if (p >= 67) return "bg-ctp-blue-700";
  if (p >= 34) return "bg-ctp-yellow-600";
  if (p > 0) return "bg-ctp-rosewater-600";
  return "bg-ctp-surface2";
  }

  function toggleDesc(id: string) {
    setExpandedDesc((prev) => ({ ...prev, [id]: !prev[id] }));
  }


  if (loading) return <div className="p-6 text-ctp-subtext0">Loading...</div>;
  if (error) return <div className="p-6 text-ctp-red-600">{error}</div>;
  if (!goal) return <div className="p-6 text-ctp-subtext0">Not found</div>;

  return (
  <div className="p-6 space-y-6 bg-ctp-base">
    <div className="rounded-xl border border-ctp-overlay1/40 bg-ctp-surface0 shadow-sm p-5">
        <div className="flex items-start justify-between gap-3">
      <h1 className="text-2xl font-semibold text-ctp-text">{goal.title}</h1>
          <div className="flex gap-2">
            <button
        className="px-3 py-1.5 text-xs sm:text-sm border border-ctp-overlay1/50 rounded bg-ctp-surface1 hover:bg-ctp-surface2"
              disabled={deleting}
              onClick={() => router.push(`/goals/${goalId}/edit`)}
            >
              Edit
            </button>
            <button
        className="px-3 py-1.5 text-xs sm:text-sm border border-ctp-overlay1/50 rounded bg-ctp-rosewater-100/60 text-ctp-rosewater-700 hover:bg-ctp-rosewater-200/60 disabled:opacity-60"
              disabled={deleting}
              aria-busy={deleting}
              onClick={async () => {
                if (deleting) return;
                const yes = window.confirm("Delete this goal and all its data?");
                if (!yes) return;
                setDeleting(true);
                try {
                  await apiClient.delete(`/api/goals/${goalId}`);
                  router.push("/goals");
                } catch (_e) {
                  // Optional: surface error
                  alert("Failed to delete. Please try again.");
                  setDeleting(false);
                }
              }}
            >
              {deleting ? (
                <span className="inline-flex items-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                  Deleting...
                </span>
              ) : (
                "Delete"
              )}
            </button>
          </div>
        </div>
        {goal.description && (
          <div className="text-ctp-subtext0 mt-1 leading-relaxed">{goal.description}</div>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={useAI} onChange={(e) => setUseAI(e.target.checked)} />
            Use AI (OpenRouter)
          </label>
          <button
            className="px-3 py-2 text-sm border border-ctp-overlay1/50 rounded bg-ctp-surface1 hover:bg-ctp-surface2 disabled:opacity-60"
            disabled={suggestLoading}
            onClick={async () => {
              setSuggestWarning(null);
              setSuggestInfo(null);
              setSuggestLoading(true);
              try {
                const h = await apiClient.post(`/api/goals/${goalId}/suggest`, { useLLM: false });
                setHeuristic(h.data as SuggestionJourney);
                setSuggestModalOpen(true);
                if (useAI) {
                  setSuggestInfo("Generating AI suggestion...");
                  try {
                    const resp = await apiClient.post(`/api/goals/${goalId}/suggest`, { useLLM: true });
                    const data = resp.data as Partial<SuggestionJourney> & { cached?: boolean; cachedAt?: string; llmError?: boolean };
                    if (data?.cached) {
                      const when = data?.cachedAt ? new Date(data.cachedAt) : null;
                      const hours = when ? Math.max(0, Math.round((Date.now() - when.getTime()) / 3600000)) : null;
                      setSuggestInfo(hours !== null ? `Using cached suggestion from ${hours} hours ago` : `Using cached suggestion`);
                    }
                    if (data?.llmError) {
                      setSuggestWarning("AI suggestion failed. Showing heuristic.");
                    }
                    if (data?.journeyTitle && data?.milestones) {
                      setAiSuggestion(data as SuggestionJourney);
                    }
                  } catch (e: unknown) {
                    const anyErr = e as { response?: { status?: number; data?: { retryAfter?: number } } };
                    const status = anyErr?.response?.status;
                    if (status === 429) {
                      const retryAfter = anyErr?.response?.data?.retryAfter;
                      const d = new Date(Date.now() + (retryAfter ?? 0) * 1000);
                      const hh = String(d.getHours()).padStart(2, "0");
                      const mm = String(d.getMinutes()).padStart(2, "0");
                      setSuggestWarning(`AI suggestion limit reached. Try again after ${hh}:${mm}`);
                    } else {
                      setSuggestWarning("AI suggestion failed.");
                    }
                  } finally {
                    setSuggestLoading(false);
                    setSuggestInfo(null);
                  }
                } else {
                  setSuggestLoading(false);
                }
              } catch {
                setSuggestLoading(false);
              }
            }}
          >
            Suggest
          </button>
          <button
            className="px-3 py-2 text-sm border border-ctp-overlay1/50 rounded bg-ctp-surface1 hover:bg-ctp-surface2"
            onClick={() => {
              setSelectedMilestoneId(null);
              setTutorOpen(true);
            }}
          >
            Tutor
          </button>
          <button
            className="px-3 py-2 text-sm border rounded"
            onClick={async () => {
              try {
                const r = await apiClient.get(`/api/goals/${goalId}/suggestions`);
                setHistory(r.data || []);
                setHistoryOpen(true);
              } catch {
                // ignore
              }
            }}
          >
            History
          </button>
        </div>
        {suggestInfo && <div className="text-sm text-ctp-blue-700 mt-2">{suggestInfo}</div>}
        {suggestWarning && <div className="text-sm text-ctp-yellow-700 mt-2">{suggestWarning}</div>}
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-ctp-subtext0">Overall Progress</span>
            <span className="font-medium text-ctp-text">{overallProgress}%</span>
          </div>
          <div className="w-full h-2 bg-ctp-surface1 rounded">
            <div className={`h-2 rounded ${progressColor(overallProgress)}`} style={{ width: `${overallProgress}%` }} />
          </div>
        </div>
      </div>

      {goal.journeys?.map((j) => (
        <div key={j.id} className="rounded-xl border border-ctp-overlay1/40 bg-ctp-surface0 shadow-sm p-5">
          <div className="font-semibold text-lg text-ctp-text">{j.title ?? "Journey"}</div>
          <ol className="mt-4 grid gap-3 sm:grid-cols-2">
            {j.milestones?.map((m: Milestone) => {
              const isExpanded = expandedDesc[m.id] ?? false;
              const hasLongDesc = (m.description?.length ?? 0) > 220;
              const shownDesc = !hasLongDesc || isExpanded ? m.description : `${m.description?.slice(0, 220)}…`;
              return (
                <li
                  key={m.id}
                  className="relative rounded-lg border border-ctp-overlay1/40 shadow-sm hover:shadow-md transition bg-ctp-surface0 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-ctp-text truncate">{m.title}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ctp-surface1 text-ctp-subtext0">
                          Weeks {m.startWeek ?? "?"}-{m.endWeek ?? "?"}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ctp-surface1 text-ctp-subtext0">
                          ~{m.estimatedHours ?? "?"}h
                        </span>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-ctp-text whitespace-nowrap">{m.progress}%</div>
                  </div>
                  <div className="w-full h-2 bg-ctp-surface1 rounded mt-3">
                    <div className={`h-2 rounded ${progressColor(m.progress)}`} style={{ width: `${m.progress}%` }} />
                  </div>
                  {m.description && (
                    <div className="mt-3 text-sm text-ctp-subtext0">
                      {shownDesc}
                      {hasLongDesc && (
                        <button
                          className="ml-2 text-ctp-blue-700 hover:underline"
                          onClick={() => toggleDesc(m.id)}
                        >
                          {isExpanded ? "Show less" : "Read more"}
                        </button>
                      )}
                    </div>
                  )}
                  <div className="mt-3 flex gap-2">
                    <button
                      className="px-3 py-1.5 text-xs sm:text-sm border border-ctp-overlay1/50 rounded bg-ctp-surface1 hover:bg-ctp-surface2"
                      onClick={() => {
                        setEditing(m.id);
                        setEditProgress(m.progress);
                      }}
                    >
                      Update Progress
                    </button>
                    <button
                      className="px-3 py-1.5 text-xs sm:text-sm border border-ctp-overlay1/50 rounded bg-ctp-surface1 hover:bg-ctp-surface2"
                      onClick={() => {
                        setSelectedMilestoneId(m.id);
                        setTutorOpen(true);
                      }}
                    >
                      Tutor
                    </button>
                  </div>
                  {editing === m.id && (
                    <div className="mt-3 p-3 border border-ctp-overlay1/40 rounded bg-ctp-surface1">
                      <label className="block text-sm font-medium text-ctp-text">Progress: {editProgress}%</label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={editProgress}
                        onChange={(e) => setEditProgress(Number(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex gap-2 mt-2">
                        <button className="px-3 py-1 bg-ctp-blue-600 text-ctp-base rounded" onClick={() => saveProgress(m.id)}>
                          Save
                        </button>
                        <button className="px-3 py-1 bg-ctp-surface1 rounded" onClick={() => setEditing(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      ))}

      {/* unmet dependency dialog */}
      {unmetDeps.length > 0 && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-ctp-surface0 border border-ctp-overlay1/40 rounded shadow-lg max-w-lg w-full p-6">
            <h2 className="text-lg font-semibold text-ctp-text">Cannot mark complete yet</h2>
            <p className="text-sm text-ctp-subtext0 mt-2">You must complete these dependent milestones first:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-ctp-text">
              {unmetDeps.map((d) => (
                <li key={d.id}>{d.title}</li>
              ))}
            </ul>
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-4 py-2 bg-ctp-surface1 rounded" onClick={() => setUnmetDeps([])}>Close</button>
            </div>
          </div>
        </div>
      )}

  {/* Tutor Panel */}
  <TutorPanel open={tutorOpen} onClose={() => setTutorOpen(false)} goalId={goalId} milestoneId={selectedMilestoneId ?? undefined} />
  </div>
  );
}
