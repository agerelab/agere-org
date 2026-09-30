import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  // The first freshDb() of a file boots PGlite and runs every migration; with many files in parallel
  // that can take longer than the default 10 s hook limit, so hooks get the same budget as tests.
  test: { environment: "node", include: ["tests/**/*.test.ts"], testTimeout: 20000, hookTimeout: 30000 },
});
