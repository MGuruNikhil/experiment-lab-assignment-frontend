"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { storeToken, apiClient, AxiosErrorResponse } from "@/lib/auth";

export default function LoginPage() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setLoading(true);
		try {
			const response = await apiClient.post("/api/auth/login", {
				email,
				password,
			});
			if (response.data?.accessToken) {
				storeToken(response.data.accessToken);
				router.push("/dashboard");
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
		<div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
			<div className="w-full max-w-md bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
				<h1 className="text-2xl font-semibold mb-6 text-gray-900">Login</h1>
				{error && (
					<div className="mb-4 text-sm text-red-600" role="alert">
						{error}
					</div>
				)}
				<form onSubmit={handleSubmit} className="space-y-4">
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
						{loading ? "Signing in..." : "Login"}
					</button>
				</form>
				<p className="mt-4 text-sm text-gray-600">
					Don&apos;t have an account? <a href="/register" className="text-gray-900 underline">Register</a>
				</p>
			</div>
		</div>
	);
}


