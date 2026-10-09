import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Self-host (Docker): NEXT_OUTPUT=standalone menghasilkan server Node mandiri. Di Vercel dibiarkan kosong. */
  ...(process.env.NEXT_OUTPUT === "standalone" ? { output: "standalone" as const } : {}),
  /* React Compiler (React 19): memoization otomatis, tanpa useMemo/useCallback manual */
  reactCompiler: true,
  /* Tautan bertipe: href pada <Link> dan router.push() dicek TypeScript */
  typedRoutes: true,
  /* Akar proyek eksplisit agar Turbopack tidak menebak dari lockfile di luar folder */
  turbopack: { root: import.meta.dirname },
  /* Header keamanan sisi klien (CSP per permintaan diatur di src/proxy.ts) */
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
