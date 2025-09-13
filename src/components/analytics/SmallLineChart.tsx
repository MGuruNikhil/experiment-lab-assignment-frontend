"use client";

export default function SmallLineChart({ points, width = 680, height = 220, color = "#3b82f6" }: { points: Array<{ x: number; y: number }>; width?: number; height?: number; color?: string }) {
  const padding = { top: 20, right: 20, bottom: 30, left: 30 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const maxX = Math.max(1, ...points.map((p) => p.x));
  const maxY = Math.max(1, ...points.map((p) => p.y));
  const path = points
    .map((p, i) => {
      const x = padding.left + (p.x / maxX) * innerW;
      const y = padding.top + innerH - (p.y / maxY) * innerH;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} role="img" aria-label="Line chart">
      <rect x={0} y={0} width={width} height={height} fill="white" className="dark:fill-slate-900" />
      <path d={path} stroke={color} fill="none" strokeWidth={2} />
    </svg>
  );
}
