"use client";

import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/auth";

export type Frequency = "daily" | "weekly" | "biweekly";

export type MilestoneOption = { id: string; title: string };

export function CreateCheckinForm({
  goalId,
  milestones,
  onCreated,
  onCancel,
}: {
  goalId?: string;
  milestones?: MilestoneOption[];
  onCreated?: (schedule: any) => void;
  onCancel?: () => void;
}) {
  const [frequency, setFrequency] = useState<Frequency>("weekly");
  const [milestoneId, setMilestoneId] = useState<string | "">("");
  const [startDate, setStartDate] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => !!frequency && !submitting, [frequency, submitting]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload: any = { frequency };
      if (goalId) payload.goalId = goalId;
      if (milestoneId) payload.milestoneId = milestoneId;
      if (startDate) payload.startDate = new Date(startDate).toISOString();
      const r = await apiClient.post("/api/checkins/schedules", payload);
      onCreated?.(r.data?.schedule ?? r.data);
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || "Failed to create";
      setError(String(msg));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Frequency</label>
        <select
          className="w-full bg-ctp-base border border-ctp-overlay1/40 rounded px-3 py-2"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as Frequency)}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="biweekly">Bi-weekly</option>
        </select>
      </div>

      {milestones && milestones.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-1">Link Milestone (optional)</label>
          <select
            className="w-full bg-ctp-base border border-ctp-overlay1/40 rounded px-3 py-2"
            value={milestoneId}
            onChange={(e) => setMilestoneId(e.target.value)}
          >
            <option value="">None</option>
            {milestones.map((m) => (
              <option key={m.id} value={m.id}>{m.title}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Start Date (optional)</label>
        <input
          type="date"
          className="w-full bg-ctp-base border border-ctp-overlay1/40 rounded px-3 py-2"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>

      {error && <div className="text-sm text-ctp-red-600">{error}</div>}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-3 py-2 bg-ctp-surface1 rounded">
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="px-3 py-2 bg-ctp-blue-600 text-ctp-base rounded disabled:opacity-60"
          disabled={!canSubmit}
        >
          {submitting ? "Creating…" : "Create"}
        </button>
      </div>
    </form>
  );
}

export default CreateCheckinForm;
