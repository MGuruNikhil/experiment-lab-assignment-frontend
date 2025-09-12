"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/auth";

type Goal = {
  id: string;
  title: string;
  description?: string | null;
  complexity?: number | null;
  suggestedWeeks?: number | null;
  chunking?: "weekly" | "biweekly" | null;
};

export default function EditGoalPage() {
  const { id } = useParams<{ id: string }>();
  const goalId = id as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState<string>("");
  const [complexity, setComplexity] = useState<number | "">("");
  const [suggestedWeeks, setSuggestedWeeks] = useState<number | "">("");
  const [chunking, setChunking] = useState<"weekly" | "biweekly" | "">("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data } = await apiClient.get<Goal>(`/api/goals/${goalId}`);
        if (!mounted) return;
        setTitle(data.title);
        setDescription(data.description ?? "");
  setComplexity(typeof data.complexity === "number" ? data.complexity : "");
  setSuggestedWeeks(typeof data.suggestedWeeks === "number" ? data.suggestedWeeks : "");
  setChunking(data.chunking ?? "");
      } catch (e: unknown) {
        const err = e as { response?: { data?: { error?: string } }; message?: string };
        setError(err.response?.data?.error ?? err.message ?? "Failed to load goal");
      } finally {
        setLoading(false);
      }
    }
    if (goalId) load();
    return () => {
      mounted = false;
    };
  }, [goalId]);

  type UpdatePayload = {
    title?: string;
    description?: string | null;
    complexity?: number | null;
    suggestedWeeks?: number | null;
    chunking?: "weekly" | "biweekly" | null;
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
  const payload: UpdatePayload = {};
      if (title.trim().length > 0) payload.title = title.trim();
      // allow clearing with empty string -> null
      if (description.trim() !== "") payload.description = description.trim(); else payload.description = null;
  if (complexity !== "") payload.complexity = Number(complexity);
  if (suggestedWeeks !== "") payload.suggestedWeeks = Number(suggestedWeeks);
  if (chunking !== "") payload.chunking = chunking as "weekly" | "biweekly";

      await apiClient.put(`/api/goals/${goalId}`, payload);
      router.push(`/goals/${goalId}`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      setError(err.response?.data?.error ?? err.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Edit Goal</h1>
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
            placeholder="Optional"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium">Complexity</label>
            <input
              type="number"
              min={1}
              max={10}
              className="mt-1 w-full border rounded px-3 py-2"
              value={complexity}
              onChange={(e) => setComplexity(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="1-10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Duration Weeks</label>
            <input
              type="number"
              min={1}
              className="mt-1 w-full border rounded px-3 py-2"
              value={suggestedWeeks}
              onChange={(e) => setSuggestedWeeks(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Chunking</label>
            <select
              className="mt-1 w-full border rounded px-3 py-2"
              value={chunking}
              onChange={(e) => setChunking(e.target.value === "" ? "" : (e.target.value === "biweekly" ? "biweekly" : "weekly"))}
            >
              <option value="">(unchanged)</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3">
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button type="button" className="px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded" onClick={() => router.back()}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
