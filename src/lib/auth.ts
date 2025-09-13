"use client";

import axios, { AxiosInstance } from "axios";

export const TOKEN_STORAGE_KEY = "auth_token";
// Prefer environment variables in production; fall back to relative "/api" which
// can be proxied via Next.js rewrites to your backend. For local dev, default to localhost.
const BACKEND_URL =
	process.env.NEXT_PUBLIC_API_BASE_URL ||
	(typeof window === "undefined"
		? process.env.API_BASE_URL || "http://localhost:4000"
		: "/api");

export function getStoredToken(): string | null {
	if (typeof window === "undefined") return null;
	try {
		return localStorage.getItem(TOKEN_STORAGE_KEY);
	} catch {
		return null;
	}
}

export function storeToken(token: string): void {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(TOKEN_STORAGE_KEY, token);
	} catch {
		// ignore
	}
}

export function clearStoredToken(): void {
	if (typeof window === "undefined") return;
	try {
		localStorage.removeItem(TOKEN_STORAGE_KEY);
	} catch {
		// ignore
	}
}

// Create axios instance with base URL
const apiClient: AxiosInstance = axios.create({
	baseURL: BACKEND_URL,
	headers: {
		"Content-Type": "application/json",
	},
	// Support cookie auth in addition to Bearer tokens
	withCredentials: true,
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use((config) => {
	const token = getStoredToken();
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

// Type for axios error response
export interface AxiosErrorResponse {
	response?: {
		data?: {
			message?: string;
	error?: string;
		};
	};
	message?: string;
}

export { apiClient };

// Redirect to login on 401/Unauthorized globally (client-side only)
apiClient.interceptors.response.use(
	(res) => res,
		(error) => {
		try {
			const status: number | undefined = error?.response?.status;
			const message: string = String(error?.response?.data?.message || error?.message || "");
				const cfg = (error?.config ?? {}) as Partial<{ url?: string; skipAuthRedirect?: boolean }>;
				const url: string = typeof cfg?.url === "string" ? cfg.url : "";

			// Skip redirect for auth endpoints or when explicitly requested
				const skip: boolean = Boolean(cfg?.skipAuthRedirect) || url.startsWith("/api/auth/");

			if ((status === 401 || /unauthorized/i.test(message)) && !skip) {
				clearStoredToken();
				if (typeof window !== "undefined") {
					const here = window.location.pathname + window.location.search;
					const next = encodeURIComponent(here);
					if (window.location.pathname !== "/login") {
						window.location.replace(`/login?next=${next}`);
					}
				}
			}
		} catch {
			// no-op
		}
		return Promise.reject(error);
	},
);


