"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
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
      const { data: sug } = await apiClient.post(`/api/goals/${goal.id}/suggest`, {
        useLLM: false,
        chunking,
        durationWeeks: durationWeeks === "" ? undefined : Number(durationWeeks),
      });

      setSuggestion(sug as HeuristicSuggestion);
      setShowModal(true);
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
      // Create a journey for the goal first
      const goalId = createdGoalId ?? (await getLatestGoalId());
      const { data: journey } = await apiClient.post(`/api/goals/${goalId}/journeys`, {
        title: suggestion.journeyTitle,
        startDate: undefined,
        endDate: undefined,
        meta: { generated: "heuristic" },
      });

      // Sequentially create milestones
      for (const m of suggestion.milestones) {
        await apiClient.post(`/api/journeys/${journey.id}/milestones`, {
          title: m.title,
          description: m.description,
          orderIndex: m.orderIndex,
          startWeek: m.startWeek,
          endWeek: m.endWeek,
          estimatedHours: m.estimatedHours,
        });
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

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Create New Goal</h1>
      {error && <div className="mb-4 text-red-600">{error}</div>}
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Title</label>
          <input
            className="mt-1 w-full border rounded px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Description</label>
          <textarea
            className="mt-1 w-full border rounded px-3 py-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Complexity: {complexity}</label>
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
            <label className="block text-sm font-medium">Duration Weeks (optional)</label>
            <input
              type="number"
              min={1}
              className="mt-1 w-full border rounded px-3 py-2"
              value={durationWeeks}
              onChange={(e) => setDurationWeeks(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Chunking</label>
            <select
              className="mt-1 w-full border rounded px-3 py-2"
              value={chunking}
              onChange={(e) => setChunking(e.target.value === "biweekly" ? "biweekly" : "weekly")}
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Goal"}
          </button>
        </div>
      </form>

      {showModal && suggestion && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-800 rounded shadow-lg max-w-2xl w-full p-6">
            <h2 className="text-xl font-semibold mb-2 text-slate-900 dark:text-slate-50">Suggested Journey</h2>
            <div className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              {suggestion.durationWeeks} weeks · {suggestion.chunking}
            </div>
            <ol className="list-decimal pl-6 space-y-2 max-h-80 overflow-auto">
              {suggestion.milestones.map((m) => (
                <li key={m.orderIndex}>
                  <div className="font-medium text-slate-900 dark:text-slate-50">{m.title}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-300">
                    Weeks {m.startWeek} - {m.endWeek} · ~{m.estimatedHours}h
                  </div>
                  {m.description && <div className="text-sm text-slate-700 dark:text-slate-200">{m.description}</div>}
                </li>
              ))}
            </ol>
            <div className="flex justify-end gap-3 mt-4">
              <button className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-50 rounded" onClick={() => setShowModal(false)}>Close</button>
              <button className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-60" onClick={acceptSuggestion} disabled={accepting}>
                Accept Suggestion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


