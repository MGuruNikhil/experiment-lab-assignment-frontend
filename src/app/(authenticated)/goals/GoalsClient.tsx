"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/auth";

type GoalListItem = {
  id: string;
  title: string;
  description?: string | null;
  complexity?: number | null;
  suggestedWeeks?: number | null;
  chunking?: "weekly" | "biweekly" | null;
  createdAt: string;
  updatedAt: string;
  latestSuggestionAt?: string | null;
};

export default function GoalsClient() {
  const search = useSearchParams();
  const [goals, setGoals] = useState<GoalListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    apiClient
      .get<GoalListItem[]>("/api/goals")
      .then((res) => {
        if (!mounted) return;
        setGoals(res.data);
      })
      .catch((e: unknown) => {
        const err = e as { response?: { data?: { error?: string } }; message?: string };
        setError(err.response?.data?.error ?? err.message ?? "Failed to load");
      })
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch per-goal progress in background
  useEffect(() => {
    let cancelled = false;
    async function fetchProgress() {
      type Milestone = { progress: number };
      type Journey = { milestones?: Milestone[] };
      type GoalDetail = { journeys?: Journey[] };
      const entries = await Promise.all(
        goals.map(async (g) => {
          try {
            const r = await apiClient.get<GoalDetail>(`/api/goals/${g.id}`);
            const journeys = r.data?.journeys ?? [];
            const milestones = journeys.flatMap((j) => j.milestones ?? []);
            if (milestones.length === 0) return [g.id, 0] as const;
            const pct = Math.round(
              (milestones.reduce((sum, m) => sum + (m.progress ?? 0), 0) / (milestones.length * 100)) * 100,
            );
            return [g.id, pct] as const;
          } catch {
            return [g.id, 0] as const;
          }
        }),
      );
      if (!cancelled) setProgressMap(Object.fromEntries(entries));
    }
    if (goals.length > 0) fetchProgress();
    return () => {
      cancelled = true;
    };
  }, [goals]);

  const filtered = useMemo(() => {
    const status = (search.get("status") || "").toLowerCase();
    if (!status) return goals;
    if (status === "completed") {
      return goals.filter((g) => (progressMap[g.id] ?? 0) >= 100);
    }
    if (status === "active") {
      return goals.filter((g) => (progressMap[g.id] ?? 0) < 100);
    }
    return goals;
  }, [goals, progressMap, search]);

  if (loading) return <div className="p-6 text-ctp-subtext0">Loading goals...</div>;
  if (error) return <div className="p-6 text-ctp-red-600">{error}</div>;

  if (filtered.length === 0)
    return (
      <div className="p-6">
        <div className="mb-4 text-ctp-subtext0">No goals yet.</div>
        <Link href="/goals/create" className="inline-block px-4 py-2 bg-ctp-blue-600 text-ctp-base rounded">
          Create New Goal
        </Link>
      </div>
    );

  return (
    <div className="p-6 space-y-4 bg-ctp-base">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-ctp-text">Your Goals</h1>
        <Link href="/goals/create" className="px-4 py-2 bg-ctp-blue-600 text-ctp-base rounded">
          Create New Goal
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((g) => (
          <div key={g.id} className="border border-ctp-overlay1/40 rounded-xl p-4 hover:shadow-sm bg-ctp-surface0">
            <Link href={`/goals/${g.id}`} className="block">
              <div className="font-medium text-lg text-ctp-text">{g.title}</div>
              <div className="text-sm text-ctp-subtext0 mt-1">
                Duration: {g.suggestedWeeks ?? "—"} weeks · {g.chunking ?? "—"}
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-ctp-text">Progress</span>
                  <span className="text-ctp-text">{progressMap[g.id] ?? 0}%</span>
                </div>
                <div className="w-full h-2 bg-ctp-surface1 rounded">
                  <div className="h-2 bg-ctp-green-600 rounded" style={{ width: `${progressMap[g.id] ?? 0}%` }} />
                </div>
              </div>
            </Link>
            <div className="mt-3 flex gap-2">
              <Link href={`/goals/${g.id}/edit`} className="px-3 py-1.5 text-xs sm:text-sm border border-ctp-overlay1/50 rounded bg-ctp-surface1 hover:bg-ctp-surface2">
                Edit
              </Link>
              <button
                className="px-3 py-1.5 text-xs sm:text-sm border border-ctp-overlay1/50 rounded bg-ctp-rosewater-100/60 text-ctp-rosewater-700 hover:bg-ctp-rosewater-200/60 disabled:opacity-60"
                disabled={deletingId === g.id}
                aria-busy={deletingId === g.id}
                onClick={async () => {
                  if (deletingId) return;
                  const yes = window.confirm(`Delete goal "${g.title}"? This will remove all journeys and milestones.`);
                  if (!yes) return;
                  setDeletingId(g.id);
                  try {
                    await apiClient.delete(`/api/goals/${g.id}`);
                    setGoals((prev) => prev.filter((x) => x.id !== g.id));
                  } catch (e: unknown) {
                    const err = e as { response?: { data?: { error?: string } }; message?: string };
                    setError(err.response?.data?.error ?? err.message ?? "Failed to delete goal");
                  } finally {
                    setDeletingId(null);
                  }
                }}
              >
                {deletingId === g.id ? (
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
        ))}
      </div>
    </div>
  );
}
