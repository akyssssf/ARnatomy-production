/* ==========================================================================
   middleware.ts — Autentikasi JWT, kewajiban profil lengkap, dan RBAC
   (User vs Administrator; SKPL Bab VIII). Status akun dicocokkan ulang ke
   basis data pada tiap permintaan: akun nonaktif/dihapus atau token dengan
   versi lama langsung ditolak.
   ========================================================================== */
import { eq } from "drizzle-orm";
import type { MiddlewareHandler } from "hono";
import { users } from "./db/schema";
import type { AppEnv, Deps, Pengguna } from "./konteks";
import { GalatApi } from "./lib/galat";
import { bacaToken } from "./lib/token";
import type { Peran } from "./schemas";

export function autentikasi(deps: Deps): MiddlewareHandler<AppEnv> {
  return async (c, lanjut) => {
    const header = c.req.header("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token) throw new GalatApi(401, "Sesi tidak ditemukan, silakan masuk kembali.", "TANPA_SESI");
    const isi = await bacaToken(deps.cfg, token, "access");
    if (!isi) throw new GalatApi(401, "Sesi tidak sah atau sudah berakhir, silakan masuk kembali.", "SESI_TIDAK_SAH");
    const [u] = await deps.db.select().from(users).where(eq(users.id_user, isi.sub)).limit(1);
    if (!u?.aktif) throw new GalatApi(401, "Akun ini sudah dinonaktifkan atau dihapus.", "AKUN_NONAKTIF");
    if (u.token_versi !== isi.tv) throw new GalatApi(401, "Sesi sudah dicabut, silakan masuk kembali.", "SESI_DICABUT");
    const pengguna: Pengguna = {
      id_user: u.id_user,
      nama: u.nama,
      email: u.email,
      role: u.role as Peran,
      asal_sekolah: u.asal_sekolah,
      npsn_sekolah: u.npsn_sekolah,
      profil_lengkap: u.profil_lengkap,
    };
    c.set("pengguna", pengguna);
    await lanjut();
  };
}

/** Akun Google baru wajib melengkapi peran dan sekolah dulu (FR-02). */
export const wajibProfilLengkap: MiddlewareHandler<AppEnv> = async (c, lanjut) => {
  if (!c.get("pengguna").profil_lengkap) {
    throw new GalatApi(403, "Lengkapi peran dan asal sekolah terlebih dahulu.", "PROFIL_BELUM_LENGKAP");
  }
  await lanjut();
};

export function wajibPeran(...peran: Peran[]): MiddlewareHandler<AppEnv> {
  return async (c, lanjut) => {
    if (!peran.includes(c.get("pengguna").role)) {
      throw new GalatApi(403, `Aksi ini hanya untuk peran ${peran.join("/")}.`, "DILARANG");
    }
    await lanjut();
  };
}

/** Membaca body JSON lalu memvalidasi dengan Zod; galat 400 berisi pesan seragam. */
export async function bacaBody<T>(
  c: { req: { json(): Promise<unknown> } },
  skema: {
    safeParse(v: unknown): { success: true; data: T } | { success: false; error: { issues: { message: string }[] } };
  },
): Promise<T> {
  let mentah: unknown;
  try {
    mentah = await c.req.json();
  } catch {
    throw new GalatApi(400, "Body permintaan bukan JSON yang valid.", "BODY_TIDAK_VALID");
  }
  const hasil = skema.safeParse(mentah);
  if (!hasil.success) {
    throw new GalatApi(
      400,
      hasil.error.issues.map((i) => i.message).join(" ") || "Data permintaan tidak valid.",
      "VALIDASI",
    );
  }
  return hasil.data;
}
