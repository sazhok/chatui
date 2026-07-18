import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["100.97.153.111"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8002/api/:path*",
      },
    ];
  },
};

export default nextConfig;
