import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "coverage",
      include: ["src/**"],
      exclude: ["src/server.ts", "src/db/*-cli.ts", "src/db/seed-data.ts"],
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 70 },
    },
  },
});
