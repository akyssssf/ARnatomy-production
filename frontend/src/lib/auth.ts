/* ==========================================================================
   auth.ts — Membaca sesi dari cookie httpOnly di sisi server.
   "server-only" memastikan modul ini tidak pernah terbundel ke klien.
   ========================================================================== */
import "server-only";
import { cookies } from "next/headers";
import { backendAktif, panggil } from "./backend";
import { akunById } from "./db";
import type { SesiUser } from "./schemas";
import { dekodeSesi, NAMA_COOKIE } from "./sesi-codec";

/** Sesi pengguna dari cookie (tanda tangan valid), atau null bila belum masuk. */
export async function ambilSesi(): Promise<SesiUser | null> {
  const toko = await cookies();
  return await dekodeSesi(toko.get(NAMA_COOKIE)?.value);
}

export type StatusSesi = { status: "ok"; sesi: SesiUser } | { status: "tanpa-sesi" } | { status: "nonaktif" };

/** Sesi yang dicocokkan ulang ke basis data: akun yang dihapus atau
    dinonaktifkan admin (FR-13) tidak lagi diterima walau cookie-nya masih sah. */
export async function periksaSesi(): Promise<StatusSesi> {
  const sesi = await ambilSesi();
  if (!sesi) return { status: "tanpa-sesi" };
  if (backendAktif()) {
    /* Backend mencabut token akun yang dinonaktifkan/dihapus/diubah perannya */
    const h = await panggil<{ user: SesiUser }>("/v1/auth/me");
    if (h.status === 200) return { status: "ok", sesi: { ...sesi, ...h.data.user } };
    return { status: h.status === 503 ? "ok" : "nonaktif" } as StatusSesi;
  }
  const akun = await akunById(sesi.id_user);
  if (!akun?.aktif) return { status: "nonaktif" };
  return { status: "ok", sesi };
}
