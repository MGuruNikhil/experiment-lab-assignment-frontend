"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export type SessionSummary = {
  id: string;
  sessionId: string;
  userId: string;
  summaryText: string;
  keyPoints?: string[] | null;
  actionItems?: Array<{ text: string; due?: string | Date | null }> | null;
  provider?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

type SummaryCardProps = {
  summary: SessionSummary;
  onCopyActions?: (items: Array<{ text: string; due?: string | Date | null }>) => void;
};

export default function SummaryCard({ summary, onCopyActions }: SummaryCardProps) {
  const [copied, setCopied] = useState(false);
  const actionItems = (summary.actionItems || []).filter(Boolean);
  const keyPoints = (summary.keyPoints || []).filter(Boolean);

  const providerText = useMemo(() => {
    const raw = (summary.provider || "").toString();
    const prov = raw.toLowerCase();
    const nice = prov.includes("openrouter")
      ? "AI"
      : raw
      ? raw.charAt(0).toUpperCase() + raw.slice(1)
      : "Unknown";
    let when = "";
    if (summary.createdAt) {
      const d = typeof summary.createdAt === "string" ? new Date(summary.createdAt) : summary.createdAt;
      if (!Number.isNaN(d.getTime())) when = d.toLocaleString();
    }
    return `${nice}${when ? ` • ${when}` : ""}`;
  }, [summary.provider, summary.createdAt]);

  function formatDue(due?: string | Date | null) {
    if (!due) return null;
    const d = typeof due === "string" ? new Date(due) : due;
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString();
  }

  async function handleCopy() {
    const lines = actionItems.map((a, i) => {
      const due = formatDue(a.due);
      return `${i + 1}. ${a.text}${due ? ` (due ${due})` : ""}`;
    });
    const payload = lines.join("\n");
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback no-op
    }
    onCopyActions?.(actionItems);
  }

  return (
    <div className="rounded-lg border border-ctp-overlay1/40 bg-ctp-surface1 p-3 shadow-sm">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="text-xs text-ctp-subtext0">Session summary</div>
        <div className="text-[11px] text-ctp-subtext0">{providerText}</div>
      </div>
      <div className="prose prose-invert max-w-none prose-sm">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary.summaryText}</ReactMarkdown>
      </div>

      {keyPoints.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-medium text-ctp-subtext0 mb-1">Key points</div>
          <ul className="list-disc list-inside space-y-1 text-sm text-ctp-text/90">
            {keyPoints.map((pt, i) => (
              <li key={i}>{pt}</li>
            ))}
          </ul>
        </div>
      )}

      {actionItems.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-ctp-subtext0 mb-1">Action items</div>
            <button
              onClick={handleCopy}
              className="text-[11px] px-2 py-1 rounded border border-ctp-overlay1/40 bg-ctp-base hover:bg-ctp-surface2"
              aria-label="Copy action items"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <ul className="space-y-1">
            {actionItems.map((a, i) => (
              <li key={i} className="text-sm text-ctp-text/90 flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-ctp-blue-600" />
                <div>
                  <div>{a.text}</div>
                  {formatDue(a.due) && (
                    <div className="text-[11px] text-ctp-subtext0">Due {formatDue(a.due)}</div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
