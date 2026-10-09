/* Pembantu uji: aplikasi lengkap di atas PGlite memori, data demo, LLM dan Google tiruan, penyimpanan di folder sementara. */
import { randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import postgres from "postgres";
import { buatApp } from "../src/app";
import { muatKonfigurasi } from "../src/config/env";
import { bukaKoneksi } from "../src/db/client";
import { jalankanMigrasi } from "../src/db/migrate";
import { isiDataAwal } from "../src/db/seed";
import type { IdentitasGoogle, KlienLlm, OpsiLlm, VerifikatorGoogle } from "../src/konteks";
import { PembatasLaju } from "../src/lib/pembatas";
import type { Embedder } from "../src/rag/embedder";
import { MesinRag } from "../src/rag/rag";
import { type Penyimpanan, PenyimpananLokal } from "../src/storage/penyimpanan";

/** Embedder uji: memakai vektor PyTorch fp32 asli untuk 20 pertanyaan di fixture; teks lain mendapat vektor acak (jauh dari semua chunk). */
export function embedderUji(): Embedder {
  const f = JSON.parse(readFileSync(join(import.meta.dirname, "fixtures", "vektor-pertanyaan.json"), "utf-8")) as {
    pertanyaan: string[];
    vektor: number[][];
  };
  const peta = new Map(f.pertanyaan.map((q, i) => [q, Float32Array.from(f.vektor[i] as number[])]));
  return {
    async embed(teks) {
      const ada = peta.get(teks);
      if (ada) return ada;
      let h = 2166136261;
      const v = new Float32Array(384);
      for (let i = 0; i < 384; i++) {
        h = Math.imul(h ^ (teks.charCodeAt(i % teks.length) + i), 16777619) >>> 0;
        v[i] = (h / 4294967296) * 2 - 1;
      }
      const n = Math.hypot(...v);
      return v.map((x) => x / n);
    },
  };
}

export interface Lingkungan {
  app: ReturnType<typeof buatApp>;
  tutup(): Promise<void>;
  google: { tabel: Map<string, IdentitasGoogle> };
  llm: {
    jawaban: string | null;
    dipanggil: number;
    terakhir: { sistem: string; pengguna: string; opsi?: OpsiLlm } | null;
  };
  db: ReturnType<typeof bukaKoneksi>["db"];
}

export async function siapkan(env: Record<string, string> = {}, penyimpananLain?: Penyimpanan): Promise<Lingkungan> {
  const folder = mkdtempSync(join(tmpdir(), "arnatomy-uji-"));
  const cfg = muatKonfigurasi({
    NODE_ENV: "test",
    TRUST_PROXY: "true",
    SEED_DEMO: "true",
    BCRYPT_COST: "4",
    ASISTEN_CACHE_MENIT: "0", // uji lain memakai pertanyaan yang sama berulang; cache diuji tersendiri
    JWT_SECRET: "rahasia-uji-yang-cukup-panjang-untuk-hs256-0123456789",
    GOOGLE_CLIENT_IDS: "klien-uji.apps.googleusercontent.com",
    STORAGE_DIR: folder,
    STORAGE_PUBLIC_URL: "http://localhost:4000/files",
    ...env,
  });
  /* Bila TEST_PG_URL diisi, seluruh uji berjalan di PostgreSQL sungguhan (satu database sementara per lingkungan);
     tanpa itu dipakai PGlite di memori. */
  const adminUrl = process.env.TEST_PG_URL;
  const namaDb = adminUrl ? `uji_${randomBytes(5).toString("hex")}` : null;
  let url: string | undefined;
  if (adminUrl && namaDb) {
    const admin = postgres(adminUrl, { max: 1, onnotice: () => {} });
    await admin.unsafe(`CREATE DATABASE ${namaDb}`);
    await admin.end();
    const u = new URL(adminUrl);
    u.pathname = `/${namaDb}`;
    url = u.toString();
  }
  const k = bukaKoneksi({ url });
  await jalankanMigrasi(k);
  await isiDataAwal(k.db, cfg);
  const google = { tabel: new Map<string, IdentitasGoogle>() };
  const verifikator: VerifikatorGoogle = async (t) => google.tabel.get(t) ?? null;
  const llm = {
    jawaban: null as string | null,
    dipanggil: 0,
    terakhir: null as { sistem: string; pengguna: string; opsi?: OpsiLlm } | null,
  };
  const klienLlm: KlienLlm = async (sistem, pengguna, opsi) => {
    llm.dipanggil += 1;
    llm.terakhir = { sistem, pengguna, opsi };
    return llm.jawaban;
  };
  const app = buatApp({
    cfg,
    db: k.db,
    penyimpanan: penyimpananLain ?? new PenyimpananLokal(folder, cfg.STORAGE_PUBLIC_URL),
    llm: klienLlm,
    rag: new MesinRag({ embedder: embedderUji() }),
    google: verifikator,
    pembatasLogin: new PembatasLaju(5, 10 * 60 * 1000),
    pembatasLoginEmail: new PembatasLaju(20, 10 * 60 * 1000),
    pembatasAsisten: new PembatasLaju(10, 60 * 1000),
  });
  return {
    app,
    google,
    llm,
    db: k.db,
    async tutup() {
      await k.tutup();
      if (adminUrl && namaDb) {
        const admin = postgres(adminUrl, { max: 1, onnotice: () => {} });
        await admin.unsafe(`DROP DATABASE IF EXISTS ${namaDb} WITH (FORCE)`);
        await admin.end();
      }
      rmSync(folder, { recursive: true, force: true });
    },
  };
}

export const AKUN = {
  siswa: { email: "siswa@arnatomy.id", password: "siswa123" },
  guru: { email: "guru@arnatomy.id", password: "guru123" },
  admin: { email: "admin@arnatomy.id", password: "admin123" },
};

type Metode = "GET" | "POST" | "PATCH" | "DELETE";
export interface Hasil<T = unknown> {
  status: number;
  body: T;
  header: Headers;
}

export function klien(env: Lingkungan) {
  async function panggil<T = Record<string, unknown>>(
    metode: Metode,
    jalur: string,
    opsi: { token?: string; json?: unknown; form?: FormData; ip?: string } = {},
  ): Promise<Hasil<T>> {
    const header: Record<string, string> = {};
    if (opsi.token) header.authorization = `Bearer ${opsi.token}`;
    if (opsi.ip) header["x-forwarded-for"] = opsi.ip;
    let body: string | FormData | undefined;
    if (opsi.json !== undefined) {
      header["content-type"] = "application/json";
      body = JSON.stringify(opsi.json);
    } else if (opsi.form) body = opsi.form;
    const r = await env.app.request(jalur, { method: metode, headers: header, body });
    const teks = await r.text();
    let isi: unknown = teks;
    try {
      isi = JSON.parse(teks);
    } catch {
      /* bukan JSON */
    }
    return { status: r.status, body: isi as T, header: r.headers };
  }
  async function masuk(peran: keyof typeof AKUN): Promise<string> {
    const r = await panggil<{ access_token: string }>("POST", "/v1/auth/login", { json: AKUN[peran] });
    return r.body.access_token;
  }
  return { panggil, masuk };
}
