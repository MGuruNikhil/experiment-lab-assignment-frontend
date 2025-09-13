"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient, clearStoredToken, getStoredToken, AxiosErrorResponse } from "@/lib/auth";

type MeResponse = { name: string; email: string };
type Analytics = {
	totalGoals: number;
	completedGoals: number;
	avgCompletionPercent: number; // 0..100
	activeGoals: number;
	learningVelocityPerWeek: number;
	goalsTimeseries: { weekStart: string; createdCount: number; completedCount: number }[];
};

export default function DashboardPage() {
	const router = useRouter();
	const [user, setUser] = useState<MeResponse | null>(null);
	const [metrics, setMetrics] = useState<Analytics | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const token = getStoredToken();
		if (!token) {
			router.replace("/login");
			return;
		}
		(async () => {
			try {
				const [meRes, analyticsRes] = await Promise.all([
					apiClient.get<MeResponse>("/api/auth/me"),
					apiClient.get<Analytics>("/api/analytics"),
				]);
				setUser(meRes.data);
				setMetrics(analyticsRes.data);
			} catch (err: unknown) {
				const axiosErr = err as AxiosErrorResponse;
				const errorMessage = axiosErr?.response?.data?.message || axiosErr?.response?.data?.error || axiosErr?.message || "Failed to load";
				setError(errorMessage);
			} finally {
				setLoading(false);
			}
		})();
	}, [router]);

	function handleLogout() {
		clearStoredToken();
		router.replace("/login");
	}

	// Prepare chart data and memoized drawing BEFORE any early returns
	const timeseries = useMemo(() => metrics?.goalsTimeseries ?? [], [metrics]);
		const maxY = useMemo(() => {
			const maxVal = Math.max(1, ...timeseries.map((t) => Math.max(t.createdCount, t.completedCount)));
			return maxVal;
		}, [timeseries]);

		// Simple SVG dual-bar chart per week
		const chart = useMemo(() => {
			const width = 680;
			const height = 220;
			const padding = { top: 20, right: 20, bottom: 30, left: 30 };
			const innerW = width - padding.left - padding.right;
			const innerH = height - padding.top - padding.bottom;
			const n = timeseries.length || 1;
			const band = innerW / n;
			const barW = band / 3;
			function yScale(v: number) {
				return innerH - (v / maxY) * innerH;
			}
			const bars = timeseries.map((t, i) => {
				const x0 = padding.left + i * band;
				const createdH = innerH - yScale(t.createdCount);
				const completedH = innerH - yScale(t.completedCount);
				const xCreated = x0 + band / 2 - barW - 2;
				const xCompleted = x0 + band / 2 + 2;
				return (
					<g key={t.weekStart}>
						<rect x={xCreated} y={padding.top + yScale(t.createdCount)} width={barW} height={createdH} fill="#3b82f6" />
						<rect x={xCompleted} y={padding.top + yScale(t.completedCount)} width={barW} height={completedH} fill="#10b981" />
					</g>
				);
			});
			// Y axis ticks 0..maxY
			const yTicks = Array.from({ length: Math.min(5, maxY) + 1 }).map((_, i) => {
				const val = Math.round((i * maxY) / Math.min(5, maxY));
				const y = padding.top + yScale(val);
				return (
					<g key={val}>
						<line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e5e7eb" />
						<text x={padding.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#6b7280">{val}</text>
					</g>
				);
			});
			// X labels: show every 3rd label to avoid clutter
			const xLabels = timeseries.map((t, i) => (
				<text key={t.weekStart} x={padding.left + i * band + band / 2} y={height - 8} textAnchor="middle" fontSize="9" fill="#6b7280">
					{i % 3 === 0 ? t.weekStart.slice(5) : ""}
				</text>
			));
			return (
				<svg width={width} height={height} role="img" aria-label="Goals created vs completed per week">
					<rect x={0} y={0} width={width} height={height} fill="white" className="dark:fill-slate-900" />
					<g>{yTicks}</g>
					<g>{bars}</g>
					<g>{xLabels}</g>
					<g>
						<rect x={width - 180} y={8} width={10} height={10} fill="#3b82f6" />
						<text x={width - 164} y={17} fontSize="12" fill="#374151">Created</text>
						<rect x={width - 100} y={8} width={10} height={10} fill="#10b981" />
						<text x={width - 84} y={17} fontSize="12" fill="#374151">Completed</text>
					</g>
				</svg>
			);
		}, [timeseries, maxY]);

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-ctp-base p-4">
				<p className="text-ctp-subtext0">Loading...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-ctp-base p-4">
				<div className="w-full max-w-md bg-ctp-surface0 border border-ctp-overlay1/40 rounded-lg p-6 shadow-sm text-center">
					<p className="text-ctp-red-600 mb-4">{error}</p>
					<button onClick={handleLogout} className="rounded-md bg-ctp-blue-600 px-4 py-2 text-ctp-base hover:bg-ctp-blue-700">Go to Login</button>
				</div>
			</div>
		);
	}
	return (
		<div className="min-h-screen bg-ctp-base p-6">
			<div className="max-w-5xl mx-auto space-y-6">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-semibold text-ctp-text">{user ? `Welcome ${user.name}` : "Dashboard"}</h1>
					<button onClick={handleLogout} className="rounded-md bg-ctp-blue-600 px-4 py-2 text-ctp-base hover:bg-ctp-blue-700">Logout</button>
				</div>

				{/* Metric cards */}
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
					<MetricCard title="Total Goals" value={metrics?.totalGoals ?? 0} href="/goals" />
					<MetricCard title="Completed Goals" value={metrics?.completedGoals ?? 0} href="/goals?status=completed" />
					<MetricCard title="Avg Completion %" value={`${Math.round(metrics?.avgCompletionPercent ?? 0)}%`} href="/goals" />
					<MetricCard title="Active Goals" value={metrics?.activeGoals ?? 0} href="/goals?status=active" />
					<MetricCard title="Learning Velocity" value={`${(metrics?.learningVelocityPerWeek ?? 0).toFixed(2)}/wk`} href="/goals" />
				</div>

				{/* Chart */}
				<div className="bg-ctp-surface0 border border-ctp-overlay1/40 rounded-lg p-4">
					<div className="text-sm font-medium text-ctp-subtext0 mb-2">Goals per week</div>
					<div className="overflow-x-auto">{chart}</div>
				</div>
			</div>
		</div>
	);
}

function MetricCard({ title, value, href }: { title: string; value: string | number; href: string }) {
	return (
		<Link href={href} className="block bg-ctp-surface0 border border-ctp-overlay1/40 rounded-lg p-4 hover:shadow-sm">
			<div className="text-xs uppercase tracking-wide text-ctp-subtext0">{title}</div>
			<div className="mt-2 text-2xl font-semibold text-ctp-text">{value}</div>
			<div className="mt-2 text-xs text-ctp-blue-700">View details →</div>
		</Link>
	);
}
