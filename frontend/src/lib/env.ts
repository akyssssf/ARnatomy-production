/* ==========================================================================
   env.ts — Isolasi variabel lingkungan.
   - Rahasia server (SESSION_SECRET) dibaca hanya di sini, divalidasi Zod,
     dan tidak pernah dikirim ke klien (tanpa awalan NEXT_PUBLIC_).
   - Variabel publik (NEXT_PUBLIC_*) boleh terbundel ke klien; hanya nilai
     tidak sensitif yang ditaruh di sana.
   Sengaja tanpa "server-only" agar bisa dipakai proxy.ts (berjalan di server
   sebelum render) — modul ini tetap tidak boleh diimpor komponen klien.
   ========================================================================== */
import { z } from "zod";

const EnvServerSchema = z.object({
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET minimal 32 karakter (lihat .env.example).")
    .default("arnatomy-dev-secret-jangan-dipakai-di-produksi-0123456789"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  /* Opsional: bila diisi, Asisten AI (FR-08) memakai LLM lewat BFF; tanpa
     kunci, jawaban disusun dari basis pengetahuan lokal. Tidak pernah ke klien. */
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  AI_MODEL: z.string().min(1).default("claude-haiku-4-5-20251001"),
  /* Opsional: persistensi snapshot basis data mock (lihat lib/persist.ts) */
  DATA_DIR: z.string().min(1).optional(),
  KV_REST_API_URL: z.url().optional(),
  KV_REST_API_TOKEN: z.string().min(1).optional(),
});

const EnvPublicSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("ARnatomy"),
  /* Asal situs untuk metadataBase, sitemap, robots, dan gambar Open Graph */
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  /* Client ID Google (Web). Kosong = tombol "Masuk dengan Google" disembunyikan. Bukan rahasia. */
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().min(10).optional(),
});

/* Nilai NEXT_PUBLIC_* harus dirujuk secara literal supaya diganti saat build.
   String kosong diperlakukan seperti tidak diatur agar nilai bawaan berlaku. */
export const envPublic = EnvPublicSchema.parse({
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || undefined,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || undefined,
});

let cacheServer: z.infer<typeof EnvServerSchema> | null = null;

/** Variabel server, divalidasi sekali. Di produksi SESSION_SECRET wajib diisi. */
export function envServer(): z.infer<typeof EnvServerSchema> {
  if (cacheServer) return cacheServer;
  /* String kosong diperlakukan seperti tidak diatur agar nilai bawaan berlaku */
  const rahasia = process.env.SESSION_SECRET || undefined;
  if (process.env.NODE_ENV === "production" && !rahasia) {
    throw new Error("SESSION_SECRET wajib diatur di lingkungan produksi.");
  }
  const hasil = EnvServerSchema.parse({
    SESSION_SECRET: rahasia,
    NODE_ENV: process.env.NODE_ENV || undefined,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || undefined,
    AI_MODEL: process.env.AI_MODEL || undefined,
    DATA_DIR: process.env.DATA_DIR || undefined,
    KV_REST_API_URL: process.env.KV_REST_API_URL || undefined,
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN || undefined,
  });
  cacheServer = hasil;
  return hasil;
}
