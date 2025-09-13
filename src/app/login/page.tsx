"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { storeToken, apiClient, AxiosErrorResponse } from "@/lib/auth";

export default function LoginPage() {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Read ?next= from URL (client only)
	const nextPath = useMemo(() => {
		if (typeof window === "undefined") return null;
		try {
			const url = new URL(window.location.href);
			const n = url.searchParams.get("next");
			return n && n.startsWith("/") ? n : null;
		} catch {
			return null;
		}
	}, []);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		const form = e.currentTarget;
		const formData = new FormData(form);
		const email = String(formData.get("email") || "").trim();
		const password = String(formData.get("password") || "").trim();

		if (!email || !password) {
			setError("email and password are required");
			return;
		}

		setLoading(true);
		try {
			const response = await apiClient.post("/api/auth/login", { email, password });
			if (response.data?.accessToken) {
				storeToken(response.data.accessToken);
				router.push(nextPath || "/dashboard");
			} else {
				throw new Error("No token returned");
			}
		} catch (err: unknown) {
			const axiosErr = err as AxiosErrorResponse;
			const errorMessage = axiosErr?.response?.data?.message || axiosErr?.message || "Login failed";
			setError(errorMessage);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-ctp-base p-4">
				<div className="w-full max-w-md bg-ctp-surface0 border border-ctp-overlay1/40 rounded-xl p-6 shadow-sm">
					<div className="mb-2 text-center text-xl font-semibold text-ctp-text">GoalForge</div>
					<h1 className="text-2xl font-semibold mb-6 text-ctp-text">Login</h1>
					{error && (
						<div className="mb-4 text-sm text-ctp-red-600" role="alert">
						{error}
					</div>
				)}
				<form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
					<div>
						<label htmlFor="email" className="block text-sm font-medium text-ctp-subtext0">Email</label>
						<input
							id="email"
							name="email"
							type="email"
							inputMode="email"
							autoComplete="email"
							autoCorrect="off"
							autoCapitalize="none"
							required
							className="mt-1 block w-full rounded-md border border-ctp-overlay1/50 bg-ctp-base text-ctp-text shadow-sm focus-visible:outline-none focus:ring-2 focus:ring-ctp-blue-400 px-3 py-2"
						/>
					</div>
					<div>
						<label htmlFor="password" className="block text-sm font-medium text-ctp-subtext0">Password</label>
						<input
							id="password"
							name="password"
							type="password"
							autoComplete="current-password"
							required
							className="mt-1 block w-full rounded-md border border-ctp-overlay1/50 bg-ctp-base text-ctp-text shadow-sm focus-visible:outline-none focus:ring-2 focus:ring-ctp-blue-400 px-3 py-2"
						/>
					</div>
					<button
						type="submit"
						disabled={loading}
							className="w-full inline-flex justify-center rounded-md bg-ctp-blue-600 px-4 py-2 text-ctp-base hover:bg-ctp-blue-700 disabled:opacity-50"
					>
						{loading ? "Signing in..." : "Login"}
					</button>
				</form>
					<p className="mt-4 text-sm text-ctp-subtext0">
						Don&apos;t have an account? <a href="/register" className="text-ctp-blue-600 underline">Register</a>
				</p>
			</div>
		</div>
	);
}


