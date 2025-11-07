import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "scontent-*.cdninstagram.com",
      },
      {
        protocol: "https",
        hostname: "*.fna.fbcdn.net", // covers instagram.fosu2-2.fna.fbcdn.net, etc.
      },
      {
        protocol: "https",
        hostname: "*.cdninstagram.com",
      },
      {
        protocol: "https",
        hostname: "instagram.com",
      },
      {
        protocol: "https",
        hostname: "www.instagram.com",
      },
    ],
  },
};

export default nextConfig;
