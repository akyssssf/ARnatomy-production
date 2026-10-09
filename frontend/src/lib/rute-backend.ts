/* ==========================================================================
   rute-backend.ts — Penerus (adapter) Route Handler /api/* ke backend /v1.
   Dipakai hanya bila BACKEND_URL diatur. Bentuk respons dijaga sama dengan
   mode tiruan sehingga klien (mock-api.ts, hooks, UI) tidak berubah.
   ========================================================================== */
import "server-only";
import { NextResponse } from "next/server";
import { ambilSesi } from "./auth";
import {
  type HasilBackend,
  NAMA_COOKIE_TOKEN,
  type OpsiPanggil,
  type PasanganToken,
  panggil,
  setTokenPada,
} from "./backend";
import { type SesiUser, SesiUserSchema } from "./schemas";
import { NAMA_COOKIE } from "./sesi-codec";
import { responsMasuk } from "./sesi-respons";
import { ubahModel } from "./sumber";

const galat = (pesan: string, status: number) => NextResponse.json({ pesan }, { status });

/** Mengubah hasil backend yang gagal menjadi amplop galat {pesan}. */
export function galatDari(h: HasilBackend): NextResponse {
  const status = h.status >= 400 ? h.status : 502;
  const respons = galat(h.pesan ?? "backend membalas galat.", status);
  if (h.status === 429) respons.headers.set("Retry-After", "60");
  return respons;
}

/** Meneruskan satu panggilan; bila sukses, `ubah` boleh membentuk ulang isinya. */
export async function terus<T = unknown>(
  path: string,
  o: OpsiPanggil = {},
  ubah?: (data: T) => unknown | Promise<unknown>,
  statusSukses?: number,
): Promise<NextResponse> {
  const h = await panggil<T>(path, o);
  if (h.status < 200 || h.status >= 300) return galatDari(h);
  const isi = ubah ? await ubah(h.data) : h.data;
  return NextResponse.json(isi, { status: statusSukses ?? h.status });
}

/** IP klien asli dari proxy di depan Next.js, untuk pembatas login backend. */
export function ipDariPermintaan(request: Request): string | undefined {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
}

interface RespMasuk extends PasanganToken {
  user: SesiUser & { profil_lengkap?: boolean };
}

/** Login/registrasi/Google: sesi cookie (untuk proxy.ts) + cookie token (untuk panggilan ke backend). */
export async function responsSesi(h: HasilBackend, status?: number): Promise<NextResponse> {
  if (h.status < 200 || h.status >= 300) return galatDari(h);
  const d = h.data as RespMasuk;
  const user = SesiUserSchema.parse(d.user);
  const respons = await responsMasuk(user, status ?? h.status);
  /* profil_lengkap ikut ke klien agar UI Google bisa mengarahkan ke pelengkapan profil */
  const isi = { user: { ...user, profil_lengkap: d.user.profil_lengkap ?? true } };
  const hasil = NextResponse.json(isi, { status: status ?? h.status });
  for (const c of respons.cookies.getAll()) hasil.cookies.set(c);
  setTokenPada(hasil, d);
  return hasil;
}

export function hapusCookieSesi(respons: NextResponse): NextResponse {
  respons.cookies.delete(NAMA_COOKIE);
  respons.cookies.delete(NAMA_COOKIE_TOKEN);
  return respons;
}

export async function keluarBackend(): Promise<void> {
  if (await ambilSesi()) await panggil("/v1/auth/logout", { method: "POST" });
}

export { ubahModel };

/** Sesi diperbarui (mis. setelah profil dilengkapi): cookie sesi baru, token tetap. */
export async function sesiBaruDariBackend(h: HasilBackend): Promise<NextResponse> {
  const d = h.data as { user: SesiUser & { profil_lengkap?: boolean } };
  const user = SesiUserSchema.parse(d.user);
  return responsMasuk(user, 200);
}
