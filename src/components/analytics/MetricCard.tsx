"use client";

import Link from "next/link";

export function MetricCard({ title, value, href }: { title: string; value: string | number; href?: string }) {
  const inner = (
    <div className="block bg-ctp-surface0 border border-ctp-overlay1/40 rounded-lg p-4 hover:shadow-sm">
      <div className="text-xs uppercase tracking-wide text-ctp-subtext0">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-ctp-text">{value}</div>
      {href && <div className="mt-2 text-xs text-ctp-blue-700">View details →</div>}
    </div>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

export default MetricCard;
