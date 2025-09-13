"use client";

// Responsive SVG bar chart: scales to container width using viewBox
type BarItem = { label: string; value: number };
type Props = {
  items: BarItem[];
  height?: number;
  color?: string; // hex or css color
  title?: string; // accessible chart title
};

export default function BarChart({ items, height = 220, color = "#10b981", title = "Bar chart" }: Props) {
  const padding = { top: 20, right: 16, bottom: 36, left: 40 };
  const n = Math.max(1, items.length);
  // Use a fixed internal width so the chart always stretches to the container without adding artificial scroll.
  const vbWidth = 800; // viewBox width in px units; SVG scales to 100% width
  const innerW = vbWidth - padding.left - padding.right;
  const vbHeight = height; // use provided height as viewBox height
  const innerH = vbHeight - padding.top - padding.bottom;
  const band = innerW / n;
  const barW = Math.max(2, Math.min(28, band * 0.7)); // keep bars visible but avoid huge gaps
  const maxY = Math.max(1, ...items.map((i) => i.value));
  // Choose up to 5 ticks (0..maxY)
  const tickCount = 5;
  const tickStep = Math.max(1, Math.ceil(maxY / tickCount));
  const ticks = Array.from({ length: Math.floor(maxY / tickStep) + 1 }, (_, i) => i * tickStep);
  const yScale = (v: number) => (v / maxY) * innerH;

  return (
    <svg
      role="img"
      aria-label={title}
      viewBox={`0 0 ${vbWidth} ${vbHeight}`}
      width="100%"
      height={vbHeight}
      preserveAspectRatio="xMidYMid meet"
      className="block"
    >
      {/* Background and title for accessibility */}
      <rect x={0} y={0} width={vbWidth} height={vbHeight} fill="transparent" />
      <title>{title}</title>

      {/* Axes */}
      <line x1={padding.left} y1={padding.top} x2={padding.left} y2={vbHeight - padding.bottom} stroke="#9ca3af" strokeWidth={1} />
      <line x1={padding.left} y1={vbHeight - padding.bottom} x2={vbWidth - padding.right} y2={vbHeight - padding.bottom} stroke="#9ca3af" strokeWidth={1} />

      {/* Y grid lines and tick labels */}
      {ticks.map((t) => {
        const y = padding.top + (innerH - yScale(t));
        return (
          <g key={`tick-${t}`}>
            <line x1={padding.left} y1={y} x2={vbWidth - padding.right} y2={y} stroke="#e5e7eb" strokeWidth={0.5} />
            <text x={padding.left - 6} y={y + 4} textAnchor="end" fontSize={12} fill="#4b5563" className="select-none">
              {t}
            </text>
          </g>
        );
      })}

      {/* Bars and labels */}
      {/* Bars and bottom labels (decimated) */}
      {items.map((it, i) => {
        const h = yScale(it.value);
        const x = padding.left + i * band + (band - barW) / 2;
        const y = padding.top + (innerH - h);
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={h} fill={color} rx={2}>
              <title>{`${it.label}: ${it.value}`}</title>
            </rect>
            {(() => {
              // Show at most ~12 labels evenly spaced
              const maxLabels = 12;
              const step = Math.ceil(n / maxLabels);
              if (n <= maxLabels || i % step === 0) {
                return (
                  <text x={x + barW / 2} y={vbHeight - 8} textAnchor="middle" fontSize={12} fill="#4b5563" className="select-none">
                    {it.label}
                  </text>
                );
              }
              return null;
            })()}
          </g>
        );
      })}
    </svg>
  );
}
