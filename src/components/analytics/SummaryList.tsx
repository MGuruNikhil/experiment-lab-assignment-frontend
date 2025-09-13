"use client";

import { useState } from "react";
import SummaryCard, { type SessionSummary as TutorSessionSummary } from "@/components/tutor/SummaryCard";

export type SessionSummary = {
  sessionId: string;
  summaryText: string;
  createdAt: string;
  keyPoints?: string[] | null;
  actionItems?: Array<{ text: string; due?: string | Date | null }> | null;
  provider?: string | null;
};

export default function SummaryList({ items, generate }: { items: SessionSummary[]; generate?: (sessionId: string) => Promise<void> }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  return (
    <div className="space-y-3">
      {items.map((s) => {
        const hydrated: TutorSessionSummary = {
          id: `${s.sessionId}-${s.createdAt}`,
          sessionId: s.sessionId,
          userId: "",
          summaryText: s.summaryText,
          keyPoints: s.keyPoints ?? [],
          actionItems: s.actionItems ?? [],
          provider: s.provider ?? "AI",
          createdAt: s.createdAt,
        };
        return (
          <div key={s.sessionId + s.createdAt} className="border border-ctp-overlay1/40 rounded p-3 bg-ctp-surface0">
            <div className="flex items-center justify-between">
              <div className="text-sm text-ctp-subtext0">{new Date(s.createdAt).toLocaleString()}</div>
              <div className="flex items-center gap-2">
                {generate && (
                  <button className="text-xs px-2 py-1 border rounded" onClick={() => generate(s.sessionId)}>Regenerate</button>
                )}
                <button className="text-xs px-2 py-1 border rounded" onClick={() => setExpanded((e) => ({ ...e, [s.sessionId]: !e[s.sessionId] }))}>
                  {expanded[s.sessionId] ? "Collapse" : "Expand"}
                </button>
              </div>
            </div>
            {expanded[s.sessionId] ? (
              <div className="mt-2">
                <SummaryCard summary={hydrated} />
              </div>
            ) : (
              <div className="mt-2 text-ctp-text line-clamp-3">{s.summaryText}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
