"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/auth";

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
  type Journey = { id: string; title?: string | null; milestones?: Milestone[] };
  type Goal = { id: string; title: string; description?: string | null; journeys?: Journey[] };
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editProgress, setEditProgress] = useState<number>(0);
  const [unmetDeps, setUnmetDeps] = useState<Array<{ id: string; title: string }>>([]);

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

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!goal) return <div className="p-6">Not found</div>;

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{goal.title}</h1>
        <div className="text-gray-600">{goal.description}</div>
        <div className="mt-3">
          <div className="flex justify-between text-sm mb-1">
            <span>Overall Progress</span>
            <span>{overallProgress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded">
            <div className="h-2 bg-indigo-600 rounded" style={{ width: `${overallProgress}%` }} />
          </div>
        </div>
      </div>

      {goal.journeys?.map((j) => (
        <div key={j.id} className="border rounded p-4">
          <div className="font-medium text-lg">{j.title ?? "Journey"}</div>
          <ol className="mt-3 space-y-2">
            {j.milestones?.map((m: Milestone) => (
              <li key={m.id} className="border rounded p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{m.title}</div>
                    <div className="text-sm text-gray-600">
                      Weeks {m.startWeek ?? "?"} - {m.endWeek ?? "?"} · ~{m.estimatedHours ?? "?"}h
                    </div>
                  </div>
                  <div className="text-sm">{m.progress}%</div>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded mt-2">
                  <div className="h-2 bg-green-500 rounded" style={{ width: `${m.progress}%` }} />
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    className="px-3 py-1 text-sm border rounded"
                    onClick={() => {
                      setEditing(m.id);
                      setEditProgress(m.progress);
                    }}
                  >
                    Update Progress
                  </button>
                </div>
                {editing === m.id && (
                  <div className="mt-3 p-3 border rounded bg-gray-50 dark:bg-slate-800">
                    <label className="block text-sm font-medium text-slate-900 dark:text-slate-50">Progress: {editProgress}%</label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={editProgress}
                      onChange={(e) => setEditProgress(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex gap-2 mt-2">
                      <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={() => saveProgress(m.id)}>
                        Save
                      </button>
                      <button className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-50 rounded" onClick={() => setEditing(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      ))}

      {unmetDeps.length > 0 && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-800 rounded shadow-lg max-w-lg w-full p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Cannot complete milestone</h2>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">The following dependencies are not complete:</p>
            <ul className="list-disc pl-6 mt-3 space-y-1 text-slate-800 dark:text-slate-100">
              {unmetDeps.map((d) => (
                <li key={d.id}>{d.title}</li>
              ))}
            </ul>
            <div className="flex justify-end mt-4">
              <button className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-50 rounded" onClick={() => setUnmetDeps([])}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


