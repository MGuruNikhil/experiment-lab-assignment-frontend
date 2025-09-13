"use client";

import { useState } from "react";

export type SessionSummary = { sessionId: string; summaryText: string; createdAt: string; keyPoints?: string[] | null; actionItems?: Array<{ text: string; due?: string }> | null };

export default function SummaryList({ items, generate }: { items: SessionSummary[]; generate?: (sessionId: string) => Promise<void> }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  return (
    <div className="space-y-3">
      {items.map((s) => (
        <div key={s.sessionId} className="border border-ctp-overlay1/40 rounded p-3 bg-ctp-surface0">
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
            <div className="mt-2 space-y-2">
              <div className="text-ctp-text whitespace-pre-wrap">{s.summaryText}</div>
              {Array.isArray(s.keyPoints) && s.keyPoints.length > 0 && (
                <ul className="list-disc ml-5 text-sm text-ctp-subtext0">
                  {s.keyPoints.map((kp, i) => (<li key={i}>{kp}</li>))}
                </ul>
              )}
              {Array.isArray(s.actionItems) && s.actionItems.length > 0 && (
                <ul className="list-decimal ml-5 text-sm text-ctp-subtext0">
                  {s.actionItems.map((ai, i) => (<li key={i}>{ai.text}{ai.due ? ` (due ${new Date(ai.due).toLocaleDateString()})` : ""}</li>))}
                </ul>
              )}
            </div>
          ) : (
            <div className="mt-2 text-ctp-text line-clamp-3">{s.summaryText}</div>
          )}
        </div>
      ))}
    </div>
  );
}
