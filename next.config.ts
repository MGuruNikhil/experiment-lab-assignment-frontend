import type { NextConfig } from "next";

// Resolve backend URL for API rewrites. In Vercel, set API_BASE_URL as an env var.
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:4000";

const nextConfig: NextConfig = {
  eslint: {
    // Don't block production builds on ESLint issues
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_BASE_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
