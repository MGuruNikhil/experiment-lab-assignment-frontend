"use client";

import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/auth";

export type CheckinEntry = {
  id: string;
  createdAt: string;
  notes?: string | null;
  progress?: number | null;
  answers?: any;
};

export default function CheckinList({ goalId, limit = 5, condensed = false }: { goalId?: string; limit?: number; condensed?: boolean }) {
  const [entries, setEntries] = useState<CheckinEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (goalId) qs.set("goalId", goalId);
      if (limit) qs.set("limit", String(limit));
      const r = await apiClient.get(`/api/checkins/entries?${qs.toString()}`);
      setEntries(r.data || []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalId, limit]);

  if (loading) return <div className="text-ctp-subtext0 text-sm">Loading check-ins…</div>;
  if (!entries.length) return <div className="text-ctp-subtext0 text-sm">No recent check-ins.</div>;

  return (
    <ul className="divide-y divide-ctp-overlay1/30">
      {entries.map((e) => (
        <li key={e.id} className="py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm text-ctp-text">
                {new Date(e.createdAt).toLocaleString()}
                {typeof e.answers?.confidence === "number" && (
                  <span className="ml-2 text-ctp-subtext0">Confidence: {e.answers.confidence}</span>
                )}
              </div>
              {e.notes && <div className="text-sm text-ctp-subtext0 mt-0.5 line-clamp-2">{e.notes}</div>}
            </div>
            {typeof e.progress === "number" && (
              <div className="text-sm font-medium">{e.progress}%</div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
