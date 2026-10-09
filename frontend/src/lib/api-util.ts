/* ==========================================================================
   api-util.ts — Pembantu Route Handler: respons galat seragam, pembacaan
   body JSON yang divalidasi Zod, dan penjaga sesi/peran.
   ========================================================================== */
import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { ambilSesi, periksaSesi } from "./auth";
import { backendAktif } from "./backend";
import type { Peran, SesiUser } from "./schemas";

export function galat(pesan: string, status: number) {
  return NextResponse.json({ pesan }, { status });
}

/** Membaca body JSON lalu memvalidasinya; mengembalikan data atau respons 400. */
export async function bacaBody<T>(
  request: Request,
  skema: z.ZodType<T>,
): Promise<{ ok: true; data: T } | { ok: false; respons: NextResponse }> {
  let mentah: unknown;
  try {
    mentah = await request.json();
  } catch {
    return { ok: false, respons: galat("body permintaan bukan JSON yang valid.", 400) };
  }
  const hasil = skema.safeParse(mentah);
  if (!hasil.success) {
    const pesan = hasil.error.issues.map((i) => i.message).join(" ");
    return { ok: false, respons: galat(pesan || "data permintaan tidak valid.", 400) };
  }
  return { ok: true, data: hasil.data };
}

/** Sesi wajib ada; opsional membatasi peran (mis. admin). */
export async function wajibSesi(
  peran?: Peran[],
): Promise<{ ok: true; sesi: SesiUser } | { ok: false; respons: NextResponse }> {
  if (backendAktif()) {
    /* Backend memeriksa token sendiri (401/403); di sini cukup cookie sesi untuk peran */
    const sesi = await ambilSesi();
    if (!sesi) return { ok: false, respons: galat("sesi tidak ditemukan, silakan masuk kembali.", 401) };
    if (peran && !peran.includes(sesi.role)) {
      return { ok: false, respons: galat(`aksi ini hanya untuk peran ${peran.join("/")}.`, 403) };
    }
    return { ok: true, sesi };
  }
  const hasil = await periksaSesi();
  if (hasil.status === "tanpa-sesi") {
    return { ok: false, respons: galat("sesi tidak ditemukan, silakan masuk kembali.", 401) };
  }
  if (hasil.status === "nonaktif") {
    return { ok: false, respons: galat("akun ini sudah dinonaktifkan atau dihapus.", 401) };
  }
  const { sesi } = hasil;
  if (peran && !peran.includes(sesi.role)) {
    return { ok: false, respons: galat(`aksi ini hanya untuk peran ${peran.join("/")}.`, 403) };
  }
  return { ok: true, sesi };
}

/** Mengubah segmen URL menjadi id bermerek lewat skema; null bila tidak valid. */
export function idDariParam<S extends z.ZodTypeAny>(nilai: string, skema: S): z.output<S> | null {
  const hasil = skema.safeParse(Number(nilai));
  return hasil.success ? hasil.data : null;
}
