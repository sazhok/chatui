import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["100.97.153.111"],
  devIndicators: {
    position: "bottom-right",
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
