import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ken-os/domain", "@ken-os/drive", "@ken-os/agents"],
};

export default nextConfig;
