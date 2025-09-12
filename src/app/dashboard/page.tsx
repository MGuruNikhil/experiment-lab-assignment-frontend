"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient, clearStoredToken, getStoredToken, AxiosErrorResponse } from "@/lib/auth";

type MeResponse = {
	name: string;
	email: string;
};

export default function DashboardPage() {
	const router = useRouter();
	const [user, setUser] = useState<MeResponse | null>(null);
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
				const response = await apiClient.get("/api/auth/me");
				setUser(response.data);
			} catch (err: unknown) {
				const axiosErr = err as AxiosErrorResponse;
				const errorMessage = axiosErr?.response?.data?.message || axiosErr?.message || "Failed to load user";
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

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
				<p className="text-gray-700">Loading...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
				<div className="w-full max-w-md bg-white border border-gray-200 rounded-lg p-6 shadow-sm text-center">
					<p className="text-red-600 mb-4">{error}</p>
					<button onClick={handleLogout} className="rounded-md bg-gray-900 px-4 py-2 text-white hover:bg-black">Go to Login</button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 p-6">
			<div className="max-w-3xl mx-auto flex items-center justify-between">
				<h1 className="text-2xl font-semibold text-gray-900">{user ? `Welcome ${user.name}` : "Dashboard"}</h1>
				<button onClick={handleLogout} className="rounded-md bg-gray-900 px-4 py-2 text-white hover:bg-black">Logout</button>
			</div>
		</div>
	);
}


