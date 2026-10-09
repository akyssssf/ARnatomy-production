/* ==========================================================================
   vitest.config.ts — Vitest (berbasis Vite, Native ESM) untuk unit test.
   - alias "@/" sama dengan tsconfig.json
   - "server-only" diganti stub karena di luar Next tidak ada kondisi react-server
   - lingkungan bawaan node; berkas uji komponen/hook memakai jsdom lewat
     komentar // @vitest-environment jsdom
   - coverage v8 (lcov untuk SonarQube) dengan ambang 80% pada kode yang diuji;
     komponen presentasional dan penampil WebGL diverifikasi lewat browser, bukan unit test.
   ========================================================================== */
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./src/test/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "coverage",
      include: ["src/lib/**", "src/store/**", "src/hooks/**", "src/app/api/**", "src/proxy.ts"],
      exclude: ["src/lib/data.ts", "src/**/*.test.*", "src/test/**"],
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 70 },
    },
  },
});
