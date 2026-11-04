import type { NextConfig } from "next";
import { engineeringRedirects } from "./src/features/engineering-lab/routes";

const nextConfig: NextConfig = {
  transpilePackages: ["@ken-os/domain", "@ken-os/agents", "@ken-os/portfolio"],
  // Old Engineering and /lab pages land on the one-page roadmap (docs/architecture/engineering-claude-first.md, section 8).
  async redirects() {
    return engineeringRedirects;
  },
  images: {
    // Google's favicon service (company-avatar.tsx) and Simple Icons' CDN (skill-logo.tsx) -- every next/image
    // src outside the app itself.
    remotePatterns: [
      { protocol: "https", hostname: "www.google.com", pathname: "/s2/favicons" },
      { protocol: "https", hostname: "cdn.simpleicons.org" },
    ],
  },
};

export default nextConfig;
