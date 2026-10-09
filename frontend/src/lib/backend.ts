/* ==========================================================================
   backend.ts — Klien server-ke-server untuk backend ARnatomy (repo
   arnatomy-backend, API /v1). Aktif bila BACKEND_URL diatur; tanpa itu
   aplikasi memakai basis data tiruan di memori (lib/db.ts) seperti semula.

   Token JWT (access 15 menit + refresh 7 hari) disimpan di cookie httpOnly,
   tidak pernah dibaca JavaScript di peramban. Access token yang kedaluwarsa
   ditukar otomatis lewat refresh token.
   ========================================================================== */
import "server-only";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

export const NAMA_COOKIE_TOKEN = "arnatomy_token";
const UMUR_TOKEN_DETIK = 60 * 60 * 24 * 7;

export interface PasanganToken {
  access_token: string;
  refresh_token: string;
}

/** Alamat dasar backend tanpa garis miring akhir; null = mode tiruan. */
export function alamatBackend(): string | null {
  const nilai = process.env.BACKEND_URL?.trim();
  return nilai ? nilai.replace(/\/+$/, "") : null;
}
export const backendAktif = (): boolean => alamatBackend() !== null;

const opsiCookie = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: UMUR_TOKEN_DETIK,
  secure: process.env.NODE_ENV === "production" && process.env.COOKIE_AMAN !== "false",
});

export function setTokenPada(respons: NextResponse, t: PasanganToken): void {
  respons.cookies.set(NAMA_COOKIE_TOKEN, JSON.stringify({ a: t.access_token, r: t.refresh_token }), opsiCookie());
}

async function bacaToken(): Promise<{ a: string; r: string } | null> {
  const mentah = (await cookies()).get(NAMA_COOKIE_TOKEN)?.value;
  if (!mentah) return null;
  try {
    const t = JSON.parse(mentah) as { a?: unknown; r?: unknown };
    return typeof t.a === "string" && typeof t.r === "string" ? { a: t.a, r: t.r } : null;
  } catch {
    return null;
  }
}

export interface HasilBackend<T = unknown> {
  status: number;
  data: T;
  /** Pesan galat dari backend ({pesan, kode}) bila status bukan 2xx */
  pesan?: string;
  kode?: string;
}

export interface OpsiPanggil {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  json?: unknown;
  form?: FormData;
  /** Header IP klien asli, diteruskan agar pembatas login backend memakai IP yang benar */
  ipKlien?: string;
  tanpaToken?: boolean;
}

async function kirim(path: string, o: OpsiPanggil, access: string | null): Promise<Response> {
  const dasar = alamatBackend();
  if (!dasar) throw new Error("BACKEND_URL belum diatur.");
  const header: Record<string, string> = {};
  if (access) header.authorization = `Bearer ${access}`;
  if (o.json !== undefined) header["content-type"] = "application/json";
  if (o.ipKlien) header["x-forwarded-for"] = o.ipKlien;
  return fetch(`${dasar}${path}`, {
    method: o.method ?? (o.json !== undefined || o.form ? "POST" : "GET"),
    headers: header,
    body: o.form ?? (o.json !== undefined ? JSON.stringify(o.json) : undefined),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
}

async function uraikan(r: Response): Promise<HasilBackend> {
  const teks = await r.text();
  let data: unknown = null;
  try {
    data = teks ? JSON.parse(teks) : null;
  } catch {
    data = null;
  }
  if (r.ok) return { status: r.status, data };
  const g = (data ?? {}) as { pesan?: string; kode?: string };
  return { status: r.status, data, pesan: g.pesan ?? `backend membalas status ${r.status}.`, kode: g.kode };
}

/** Memanggil backend dengan token milik pengguna; sekali mencoba refresh bila access token ditolak. */
export async function panggil<T = unknown>(path: string, o: OpsiPanggil = {}): Promise<HasilBackend<T>> {
  try {
    if (o.tanpaToken) return (await uraikan(await kirim(path, o, null))) as HasilBackend<T>;
    const t = await bacaToken();
    if (!t) return { status: 401, data: null as T, pesan: "sesi tidak ditemukan, silakan masuk kembali." };
    let hasil = await uraikan(await kirim(path, o, t.a));
    if (hasil.status === 401) {
      const baru = await uraikan(await kirim("/v1/auth/refresh", { json: { refresh_token: t.r } }, null));
      if (baru.status !== 200) return hasil as HasilBackend<T>;
      const pasangan = baru.data as PasanganToken;
      try {
        (await cookies()).set(
          NAMA_COOKIE_TOKEN,
          JSON.stringify({ a: pasangan.access_token, r: pasangan.refresh_token }),
          opsiCookie(),
        );
      } catch {
        /* Server Component tidak boleh menulis cookie; permintaan berikutnya melakukan refresh lagi */
      }
      hasil = await uraikan(await kirim(path, o, pasangan.access_token));
    }
    return hasil as HasilBackend<T>;
  } catch {
    return { status: 503, data: null as T, pesan: "backend tidak dapat dihubungi.", kode: "BACKEND_MATI" };
  }
}

/** Ambil data atau lempar Error (untuk Server Component yang menolak merender tanpa data). */
export async function ambil<T>(path: string): Promise<T> {
  const h = await panggil<T>(path);
  if (h.status >= 200 && h.status < 300) return h.data;
  throw new Error(`backend ${path}: ${h.status} ${h.pesan ?? ""}`);
}
