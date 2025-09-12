"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { storeToken, apiClient, AxiosErrorResponse } from "@/lib/auth";

export default function RegisterPage() {
	const router = useRouter();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
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

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setLoading(true);
		try {
			const response = await apiClient.post("/api/auth/register", {
				name,
				email,
				password,
			});
			if (response.data?.accessToken) {
				storeToken(response.data.accessToken);
				router.push(nextPath || "/dashboard");
			} else {
				router.push("/login");
			}
		} catch (err: unknown) {
			const axiosErr = err as AxiosErrorResponse;
			const errorMessage = axiosErr?.response?.data?.message || axiosErr?.message || "Registration failed";
			setError(errorMessage);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-4">
			<div className="w-full max-w-md bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-6 shadow-sm">
				<h1 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-slate-50">Create an account</h1>
				{error && (
					<div className="mb-4 text-sm text-red-600" role="alert">
						{error}
					</div>
				)}
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700">Name</label>
						<input
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
							className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-gray-900"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700">Email</label>
						<input
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-gray-900"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700">Password</label>
						<input
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-gray-900"
						/>
					</div>
					<button
						type="submit"
						disabled={loading}
						className="w-full inline-flex justify-center rounded-md bg-gray-900 px-4 py-2 text-white hover:bg-black disabled:opacity-50"
					>
						{loading ? "Creating..." : "Register"}
					</button>
				</form>
				<p className="mt-4 text-sm text-gray-600">
					Already have an account? <a href="/login" className="text-gray-900 underline">Login</a>
				</p>
			</div>
		</div>
	);
}


