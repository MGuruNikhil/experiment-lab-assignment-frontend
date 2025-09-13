"use client";

type Item = { label: string; a: number; b: number };

type Props = {
  items: Item[];
  height?: number;
  colorA?: string;
  colorB?: string;
  title?: string;
  legendA?: string;
  legendB?: string;
};

export default function DualBarChart({
  items,
  height = 220,
  colorA = "#3b82f6",
  colorB = "#10b981",
  title = "Dual bar chart",
  legendA = "Series A",
  legendB = "Series B",
}: Props) {
  const padding = { top: 28, right: 16, bottom: 36, left: 40 };
  const n = Math.max(1, items.length);
  const vbWidth = 800;
  const vbHeight = height;
  const innerW = vbWidth - padding.left - padding.right;
  const innerH = vbHeight - padding.top - padding.bottom;
  const band = innerW / n;
  const barW = Math.max(2, Math.min(20, band * 0.33));
  const gap = Math.min(6, band * 0.08);
  const maxY = Math.max(1, ...items.map((i) => Math.max(i.a, i.b)));
  const tickCount = 5;
  const tickStep = Math.max(1, Math.ceil(maxY / tickCount));
  const ticks = Array.from({ length: Math.floor(maxY / tickStep) + 1 }, (_, i) => i * tickStep);
  const yScale = (v: number) => (v / maxY) * innerH;

  return (
    <svg role="img" aria-label={title} viewBox={`0 0 ${vbWidth} ${vbHeight}`} width="100%" height={vbHeight} preserveAspectRatio="xMidYMid meet" className="block">
      <title>{title}</title>
      {/* Axes */}
      <line x1={padding.left} y1={padding.top} x2={padding.left} y2={vbHeight - padding.bottom} stroke="#9ca3af" strokeWidth={1} />
      <line x1={padding.left} y1={vbHeight - padding.bottom} x2={vbWidth - padding.right} y2={vbHeight - padding.bottom} stroke="#9ca3af" strokeWidth={1} />

      {/* Grid + Y ticks */}
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

      {/* Bars + X labels */}
      {items.map((it, i) => {
        const hA = yScale(it.a);
        const hB = yScale(it.b);
        const center = padding.left + i * band + band / 2;
        const xA = center - gap / 2 - barW;
        const xB = center + gap / 2;
        const yA = padding.top + (innerH - hA);
        const yB = padding.top + (innerH - hB);
        return (
          <g key={i}>
            <rect x={xA} y={yA} width={barW} height={hA} fill={colorA} rx={2}>
              <title>{`${legendA}: ${it.a}`}</title>
            </rect>
            <rect x={xB} y={yB} width={barW} height={hB} fill={colorB} rx={2}>
              <title>{`${legendB}: ${it.b}`}</title>
            </rect>
            {(() => {
              const maxLabels = 12;
              const step = Math.ceil(n / maxLabels);
              if (n <= maxLabels || i % step === 0) {
                return (
                  <text x={center} y={vbHeight - 8} textAnchor="middle" fontSize={12} fill="#4b5563" className="select-none">
                    {it.label}
                  </text>
                );
              }
              return null;
            })()}
          </g>
        );
      })}

      {/* Legend */}
      <g>
        <rect x={vbWidth - 200} y={8} width={12} height={12} fill={colorA} rx={2} />
        <text x={vbWidth - 182} y={18} fontSize={12} fill="#374151">{legendA}</text>
        <rect x={vbWidth - 110} y={8} width={12} height={12} fill={colorB} rx={2} />
        <text x={vbWidth - 92} y={18} fontSize={12} fill="#374151">{legendB}</text>
      </g>
    </svg>
  );
}
