/* ==========================================================================
   env.ts — Konfigurasi dari variabel lingkungan, divalidasi Zod sekali saat
   boot (gagal cepat bila salah). Rahasia hanya dibaca di sini.
   ========================================================================== */
import { z } from "zod";

/** Memuat berkas .env ke process.env bila ada. Variabel yang sudah diatur di lingkungan (mis. Docker) tidak ditimpa. */
export function muatBerkasEnv(jalur = ".env"): boolean {
  try {
    process.loadEnvFile(jalur);
    return true;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw e;
  }
}

const kosongJadiUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const opsional = <T extends z.ZodType>(skema: T) => z.preprocess(kosongJadiUndefined, skema.optional());

const SKEMA = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: opsional(z.string().min(1)),
  JWT_SECRET: opsional(z.string().min(32, "JWT_SECRET minimal 32 karakter.")),
  ACCESS_TTL_MENIT: z.preprocess(kosongJadiUndefined, z.coerce.number().int().min(1).default(15)),
  REFRESH_TTL_HARI: z.preprocess(kosongJadiUndefined, z.coerce.number().int().min(1).default(7)),
  BCRYPT_COST: z.preprocess(kosongJadiUndefined, z.coerce.number().int().min(4).max(15).default(12)),
  /* RAG asisten AI: auto/q8 = embedding ONNX terkuantisasi (±700 MB RAM), fp32 = lebih setia tetapi ±1,2 GB, off = TF-IDF saja (VPS kecil) */
  RAG_EMBEDDING: z.preprocess(kosongJadiUndefined, z.enum(["auto", "q8", "fp32", "off"]).default("auto")),
  RAG_CACHE_DIR: z.preprocess(kosongJadiUndefined, z.string().default("./.cache/hf")),
  RAG_BATAS_JARAK: opsional(z.coerce.number().min(0).max(2)),
  /* Cache jawaban asisten untuk pertanyaan identik, dalam menit (0 = nonaktif); menghemat kuota LLM */
  ASISTEN_CACHE_MENIT: z.coerce.number().int().min(0).max(1440).default(15),
  /* true bila backend ada di belakang proxy tepercaya (Nginx/Cloudflare): IP klien dibaca dari X-Forwarded-For. */
  TRUST_PROXY: z.preprocess(kosongJadiUndefined, z.enum(["true", "false"]).default("false")),
  CORS_ORIGINS: z.preprocess(kosongJadiUndefined, z.string().default("http://localhost:3000")),
  GOOGLE_CLIENT_IDS: opsional(z.string()),
  /* Asisten AI: penyedia LLM. Kunci kosong = jawaban dari basis pengetahuan lokal. */
  LLM_PROVIDER: z.preprocess(
    kosongJadiUndefined,
    z.enum(["gemini", "groq", "openrouter", "anthropic", "openai", "ollama"]).default("gemini"),
  ),
  LLM_API_KEY: opsional(z.string().min(1)),
  LLM_MODEL: opsional(z.string().min(1)),
  LLM_BASE_URL: opsional(z.url()),
  /* Batas tunggu jawaban LLM (detik). Bawaan 12 untuk layanan cloud, 25 untuk ollama (CPU lebih lambat). */
  LLM_TIMEOUT_DETIK: opsional(z.coerce.number().int().min(3).max(28)),
  STORAGE_DRIVER: z.preprocess(kosongJadiUndefined, z.enum(["lokal", "s3"]).default("lokal")),
  STORAGE_DIR: z.preprocess(kosongJadiUndefined, z.string().default("./uploads")),
  STORAGE_PUBLIC_URL: z.preprocess(kosongJadiUndefined, z.string().default("http://localhost:4000/files")),
  S3_ENDPOINT: opsional(z.url()),
  S3_BUCKET: opsional(z.string()),
  S3_REGION: z.preprocess(kosongJadiUndefined, z.string().default("auto")),
  S3_ACCESS_KEY_ID: opsional(z.string()),
  S3_SECRET_ACCESS_KEY: opsional(z.string()),
  SEED_DEMO: z.preprocess(kosongJadiUndefined, z.enum(["true", "false"]).default("false")),
  ADMIN_EMAIL: opsional(z.email()),
  ADMIN_PASSWORD: opsional(z.string().min(8)),
});

export interface Konfigurasi
  extends Omit<
    z.infer<typeof SKEMA>,
    "JWT_SECRET" | "CORS_ORIGINS" | "GOOGLE_CLIENT_IDS" | "SEED_DEMO" | "TRUST_PROXY"
  > {
  JWT_SECRET: string;
  corsOrigins: string[];
  googleClientIds: string[];
  seedDemo: boolean;
  trustProxy: boolean;
}

const RAHASIA_DEV = "arnatomy-backend-dev-secret-jangan-dipakai-di-produksi-0123456789";

export function muatKonfigurasi(sumber: Record<string, string | undefined> = process.env): Konfigurasi {
  const hasil = SKEMA.safeParse(sumber);
  if (!hasil.success) {
    const rincian = hasil.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Konfigurasi tidak valid: ${rincian}`);
  }
  const e = hasil.data;
  if (e.NODE_ENV === "production") {
    if (!e.JWT_SECRET) throw new Error("JWT_SECRET wajib diatur di produksi.");
    if (!e.DATABASE_URL) throw new Error("DATABASE_URL wajib diatur di produksi.");
  }
  if (e.STORAGE_DRIVER === "s3" && !(e.S3_ENDPOINT && e.S3_BUCKET && e.S3_ACCESS_KEY_ID && e.S3_SECRET_ACCESS_KEY)) {
    throw new Error("STORAGE_DRIVER=s3 membutuhkan S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY.");
  }
  const { JWT_SECRET, CORS_ORIGINS, GOOGLE_CLIENT_IDS, SEED_DEMO, TRUST_PROXY, ...sisa } = e;
  return {
    ...sisa,
    JWT_SECRET: JWT_SECRET ?? RAHASIA_DEV,
    corsOrigins: CORS_ORIGINS.split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    googleClientIds: (GOOGLE_CLIENT_IDS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    trustProxy: TRUST_PROXY === "true",
    seedDemo: SEED_DEMO === "true" && e.NODE_ENV !== "production",
  };
}
