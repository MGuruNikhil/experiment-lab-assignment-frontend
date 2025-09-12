"use client";

import axios, { AxiosInstance } from "axios";

export const TOKEN_STORAGE_KEY = "auth_token";
const BACKEND_URL = "http://localhost:4000";

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
		};
	};
	message?: string;
}

export { apiClient };


