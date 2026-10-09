/* konteks.ts — Tipe bersama: dependensi aplikasi (disuntikkan agar mudah diuji) dan data sesi di konteks Hono. */
import type { Konfigurasi } from "./config/env";
import type { Db } from "./db/client";
import type { PembatasLaju } from "./lib/pembatas";
import type { MesinRag } from "./rag/rag";
import type { Peran } from "./schemas";
import type { Penyimpanan } from "./storage/penyimpanan";

export interface IdentitasGoogle {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  nonce?: string;
}
/** Memverifikasi ID token Google; null bila tidak sah. */
export type VerifikatorGoogle = (idToken: string) => Promise<IdentitasGoogle | null>;
/** Meminta jawaban ke model bahasa; null bila gagal/tidak dikonfigurasi (pemanggil memakai cadangan lokal). */
export interface OpsiLlm {
  temperature?: number;
  maxTokens?: number;
  /** Hanya dikirim ke penyedia yang mendukung (Groq gpt-oss) */
  reasoningEffort?: string;
}
export type KlienLlm = (sistem: string, pertanyaan: string, opsi?: OpsiLlm) => Promise<string | null>;

export interface Deps {
  cfg: Konfigurasi;
  db: Db;
  penyimpanan: Penyimpanan;
  llm: KlienLlm;
  rag: MesinRag;
  google: VerifikatorGoogle;
  pembatasLogin: PembatasLaju;
  /** Batas percobaan gagal per email (semua IP): menahan brute force dari banyak alamat */
  pembatasLoginEmail: PembatasLaju;
  pembatasAsisten: PembatasLaju;
}

export interface Pengguna {
  id_user: number;
  nama: string;
  email: string;
  role: Peran;
  asal_sekolah: string | null;
  npsn_sekolah: string | null;
  profil_lengkap: boolean;
}

export type AppEnv = { Variables: { pengguna: Pengguna } };
