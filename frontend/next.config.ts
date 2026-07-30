import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["100.97.153.111"],
  devIndicators: {
    position: "bottom-right",
  },
  async redirects() {
    // Root is just an entry point: every product lives under its own path
    // (/chats now, /checklists etc. later).
    return [
      {
        source: "/",
        destination: "/chats",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8002/api/:path*",
      },
      {
        source: "/admin/:path*",
        destination: "http://localhost:8002/admin/:path*",
      },
    ];
  },
};

export default nextConfig;
