/* ==========================================================================
   pembatas.ts — Pembatas laju percobaan login (mitigasi brute force).
   Menghitung kegagalan per kunci (email + alamat IP) di memori proses;
   setelah BATAS_GAGAL kegagalan dalam JENDELA_MS, kunci diblokir sampai
   jendela berakhir. Percobaan yang berhasil menghapus hitungannya.
   Di produksi multi-instance ini diganti penyimpanan bersama (mis. Redis).
   ========================================================================== */
export const BATAS_GAGAL = 5;
export const JENDELA_MS = 10 * 60 * 1000;

interface Catatan {
  gagal: number;
  mulai: number;
}

const kunciGlobal = Symbol.for("arnatomy.pembatas");
type GlobalDenganPembatas = typeof globalThis & { [kunciGlobal]?: Map<string, Catatan> };

function peta(): Map<string, Catatan> {
  const g = globalThis as GlobalDenganPembatas;
  if (!g[kunciGlobal]) g[kunciGlobal] = new Map();
  return g[kunciGlobal];
}

function catatanAktif(kunci: string, kini: number): Catatan | null {
  const c = peta().get(kunci);
  if (!c) return null;
  if (kini - c.mulai >= JENDELA_MS) {
    peta().delete(kunci);
    return null;
  }
  return c;
}

/** Sisa detik blokir bila kunci sedang diblokir, selain itu 0. */
export function sisaBlokir(kunci: string, kini = Date.now()): number {
  const c = catatanAktif(kunci, kini);
  if (!c || c.gagal < BATAS_GAGAL) return 0;
  return Math.max(1, Math.ceil((c.mulai + JENDELA_MS - kini) / 1000));
}

/** Mencatat satu kegagalan; mengembalikan sisa percobaan sebelum diblokir. */
export function catatGagal(kunci: string, kini = Date.now()): number {
  const c = catatanAktif(kunci, kini) ?? { gagal: 0, mulai: kini };
  c.gagal += 1;
  peta().set(kunci, c);
  return Math.max(0, BATAS_GAGAL - c.gagal);
}

export function hapusCatatan(kunci: string): void {
  peta().delete(kunci);
}

/** Kunci pembatas dari email (huruf kecil) dan IP klien di balik proxy. */
export function kunciLogin(email: string, request: Request): string {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "lokal";
  return `${email.trim().toLowerCase()}|${ip}`;
}
