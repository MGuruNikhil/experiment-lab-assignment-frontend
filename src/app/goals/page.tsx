"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

export default function GoalsPage() {
  const [goals, setGoals] = useState<GoalListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});

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

  const content = useMemo(() => {
    if (loading) return <div className="p-6">Loading goals...</div>;
    if (error) return <div className="p-6 text-red-600">{error}</div>;
    if (goals.length === 0)
      return (
        <div className="p-6">
          <div className="mb-4">No goals yet.</div>
          <Link href="/goals/create" className="inline-block px-4 py-2 bg-blue-600 text-white rounded">
            Create New Goal
          </Link>
        </div>
      );
    return (
      <div className="p-6 space-y-4 bg-gray-50 dark:bg-slate-900">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Your Goals</h1>
          <Link href="/goals/create" className="px-4 py-2 bg-blue-600 text-white rounded">
            Create New Goal
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((g) => (
            <Link key={g.id} href={`/goals/${g.id}`} className="block border rounded p-4 hover:shadow bg-white dark:bg-slate-800">
              <div className="font-medium text-lg text-slate-900 dark:text-slate-50">{g.title}</div>
              <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                Duration: {g.suggestedWeeks ?? "—"} weeks · {g.chunking ?? "—"}
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-900 dark:text-slate-50">Progress</span>
                  <span className="text-slate-900 dark:text-slate-50">{progressMap[g.id] ?? 0}%</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded">
                  <div
                    className="h-2 bg-green-500 rounded"
                    style={{ width: `${progressMap[g.id] ?? 0}%` }}
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }, [loading, error, goals, progressMap]);

  return content;
}


