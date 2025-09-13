"use client";

import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/auth";

export type Schedule = {
  id: string;
  goalId?: string | null;
  milestoneId?: string | null;
  frequency: "daily" | "weekly" | "biweekly";
  nextDueAt?: string | null;
  milestone?: { id: string; title: string } | null;
};

export function LogCheckinModal({
  open,
  onClose,
  goalId,
  scheduleId,
  onLogged,
}: {
  open: boolean;
  onClose: () => void;
  goalId?: string;
  scheduleId?: string;
  onLogged?: () => void;
}) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedId, setSelectedId] = useState<string>(scheduleId || "");
  const [confidence, setConfidence] = useState<number>(3);
  const [updateProgress, setUpdateProgress] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const qs = goalId ? `?goalId=${goalId}` : "";
        const r = await apiClient.get(`/api/checkins/schedules${qs}`);
        const list: Schedule[] = r.data || [];
        setSchedules(list);
        if (!scheduleId && list.length > 0) setSelectedId(list[0].id);
      } catch {
        // ignore
      }
    })();
  }, [open, goalId, scheduleId]);

  useEffect(() => {
    if (scheduleId) setSelectedId(scheduleId);
  }, [scheduleId]);

  const selected = useMemo(() => schedules.find((s) => s.id === selectedId) || null, [schedules, selectedId]);

  async function submit() {
    if (!selectedId) {
      setError("Select a schedule");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const answers: any = { confidence };
      const payload: any = { answers };
      if (updateProgress && selected?.milestoneId) payload.progress = progress;
      if (notes) payload.notes = notes;
      await apiClient.post(`/api/checkins/schedules/${selectedId}/entries`, payload);
      onLogged?.();
      onClose();
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || "Failed to log";
      setError(String(msg));
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md bg-ctp-surface0 border border-ctp-overlay1/40 rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-ctp-text">Log Check-in</h2>
          <button className="text-sm" onClick={onClose}>Close</button>
        </div>

        {!scheduleId && (
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Schedule</label>
            <select
              className="w-full bg-ctp-base border border-ctp-overlay1/40 rounded px-3 py-2"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              <option value="">Select schedule…</option>
              {schedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.milestone?.title ? `${s.milestone.title} • ${s.frequency}` : `${s.frequency} schedule`}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mb-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium">Confidence</label>
            <span className="text-xs text-ctp-subtext0">{confidence}</span>
          </div>
          <input type="range" min={1} max={5} step={1} value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} className="w-full" />
          <div className="mt-1 flex justify-between text-[10px] text-ctp-subtext0">
            <span>1</span>
            <span>2</span>
            <span>3</span>
            <span>4</span>
            <span>5</span>
          </div>
        </div>

        {selected?.milestoneId && (
          <div className="mb-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={updateProgress} onChange={(e) => setUpdateProgress(e.target.checked)} />
              Update milestone progress
            </label>
            {updateProgress && (
              <div className="mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Progress</span>
                  <span className="text-xs text-ctp-subtext0">{progress}%</span>
                </div>
                <input type="range" min={0} max={100} value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="w-full" />
              </div>
            )}
          </div>
        )}

        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            className="w-full bg-ctp-base border border-ctp-overlay1/40 rounded px-3 py-2"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What did you do today?"
          />
        </div>

        {error && <div className="text-sm text-ctp-red-600 mb-2">{error}</div>}

        <div className="flex justify-end gap-2">
          <button className="px-3 py-2 bg-ctp-surface1 rounded" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="px-3 py-2 bg-ctp-blue-600 text-ctp-base rounded disabled:opacity-60" onClick={submit} disabled={saving || (!scheduleId && !selectedId)}>
            {saving ? "Saving…" : "Log Check-in"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LogCheckinModal;
