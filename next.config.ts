import type { NextConfig } from "next";

const config: NextConfig = {
  // PGlite is only used by tests; keep it out of the server bundle.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Space icons may be 1 MB (PRD-06 US-14); the multipart envelope needs a little room on top.
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
};

export default config;
