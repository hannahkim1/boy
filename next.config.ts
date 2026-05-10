import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: false,
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.scdn.co",
      },
    ],
  },
};

export default nextConfig;
