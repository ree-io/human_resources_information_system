import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: ["better-sqlite3"],
  // Dev-only: without this, Next 16 blocks HMR websocket upgrades from
  // 127.0.0.1 (treated as cross-origin), which prevents page hydration.
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    // Every route blocks on the session by design (see the Cache Components
    // auth guide's "adopt later" path — `connection()` moves the session read
    // into the request stage). Instant-navigation validation therefore only
    // produces dev-only noise. `manual-warning` validates only segments that
    // opt in with an explicit `instant` export — none do.
    instantInsights: { validationLevel: "manual-warning" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
