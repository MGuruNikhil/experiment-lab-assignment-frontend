"use client";

export default function BarChart({ items, width = 680, height = 220 }: { items: Array<{ label: string; value: number }>; width?: number; height?: number }) {
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const n = items.length || 1;
  const band = innerW / n;
  const barW = Math.max(4, band * 0.6);
  const maxY = Math.max(1, ...items.map((i) => i.value));
  const yScale = (v: number) => (v / maxY) * innerH;
  return (
    <svg width={width} height={height} role="img" aria-label="Bar chart">
      <rect x={0} y={0} width={width} height={height} fill="white" className="dark:fill-slate-900" />
      {items.map((it, i) => {
        const h = yScale(it.value);
        const x = padding.left + i * band + (band - barW) / 2;
        const y = padding.top + (innerH - h);
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={h} fill="#10b981" />
            <text x={x + barW / 2} y={height - 8} textAnchor="middle" fontSize="10" fill="#6b7280">
              {it.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
