import type { NextConfig } from "next";
import { engineeringRedirects } from "./src/features/engineering-lab/routes";

const nextConfig: NextConfig = {
  transpilePackages: ["@ken-os/domain", "@ken-os/agents", "@ken-os/portfolio"],
  // Old Engineering and /lab pages land on the one-page roadmap (docs/architecture/engineering-claude-first.md, section 8).
  async redirects() {
    return engineeringRedirects;
  },
};

export default nextConfig;
