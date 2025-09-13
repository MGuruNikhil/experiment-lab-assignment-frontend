"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient, clearStoredToken, getStoredToken, AxiosErrorResponse } from "@/lib/auth";
import LogCheckinModal from "@/components/checkin/LogCheckinModal";
import CheckinList from "@/components/checkin/CheckinList";
import Link from "next/link";
import MetricCard from "@/components/analytics/MetricCard";
import DualBarChart from "@/components/analytics/DualBarChart";

type MeResponse = { name: string; email: string };
type Analytics = {
	totalGoals: number;
	completedGoals: number;
	avgCompletionPercent: number; // 0..100
	activeGoals: number;
	learningVelocityPerWeek: number;
	totalTutorSessions: number;
	avgSessionLengthMinutes: number;
	goalsTimeseries?: { weekStart: string; createdCount: number; completedCount: number }[];
};

export default function DashboardPage() {
	const router = useRouter();
	const [user, setUser] = useState<MeResponse | null>(null);
	const [metrics, setMetrics] = useState<Analytics | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [logOpen, setLogOpen] = useState(false);
	const [listVersion, setListVersion] = useState(0);

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
					apiClient.get<Analytics>("/api/analytics/overview"),
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
			const chartData = useMemo(() => timeseries.map((t, idx) => ({ label: String(idx + 1), a: t.createdCount, b: t.completedCount })), [timeseries]);

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
					<div className="flex items-center gap-2">
						<button onClick={() => setLogOpen(true)} className="rounded-md bg-ctp-blue-600 px-4 py-2 text-ctp-base hover:bg-ctp-blue-700">Log Check-in</button>
						<button onClick={handleLogout} className="rounded-md bg-ctp-surface1 px-4 py-2 hover:bg-ctp-surface2">Logout</button>
					</div>
				</div>

				{/* Metric cards */}
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
					<MetricCard title="Total Goals" value={metrics?.totalGoals ?? 0} href="/goals" />
					<MetricCard title="Completed Goals" value={metrics?.completedGoals ?? 0} href="/goals?status=completed" />
					<MetricCard title="Avg Completion %" value={`${Math.round(metrics?.avgCompletionPercent ?? 0)}%`} href="/goals" />
					<MetricCard title="Active Goals" value={metrics?.activeGoals ?? 0} href="/goals?status=active" />
					<MetricCard title="Learning Velocity" value={`${(metrics?.learningVelocityPerWeek ?? 0).toFixed(2)}/wk`} href="/goals" />
					<MetricCard title="Avg Session Length" value={`${(metrics?.avgSessionLengthMinutes ?? 0).toFixed(1)}m`} href="/goals" />
				</div>

				{/* Chart */}
				<div className="bg-ctp-surface0 border border-ctp-overlay1/40 rounded-lg p-4">
								<div className="text-sm font-medium text-ctp-subtext0 mb-2">Goals per week</div>
								<DualBarChart
									title="Goals created vs completed per week"
									legendA="Created"
									legendB="Completed"
									items={chartData}
								/>
				</div>

				{/* Recent Check-ins */}
				<div className="bg-ctp-surface0 border border-ctp-overlay1/40 rounded-lg p-4">
					<div className="flex items-center justify-between mb-2">
						<div className="text-sm font-medium text-ctp-text">Recent check-ins</div>
						<div className="flex items-center gap-2">
							<button className="px-3 py-1.5 text-xs border border-ctp-overlay1/40 rounded" onClick={() => setLogOpen(true)}>Log</button>
							<Link className="text-xs text-ctp-blue-700 hover:underline" href="/checkins">View all →</Link>
						</div>
					</div>
					<CheckinList key={listVersion} limit={3} condensed />
				</div>
			</div>
			<LogCheckinModal
				open={logOpen}
				onClose={() => setLogOpen(false)}
				onLogged={() => setListVersion((v) => v + 1)}
			/>
		</div>
	);
}

// MetricCard moved to shared component
