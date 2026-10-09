/* ==========================================================================
   sekolah.ts — Pencarian sekolah (SMP, SMA, SMK) dari data Kemdikbud untuk
   mengisi asal sekolah di profil. Dapat dipakai akun yang belum melengkapi
   profil (karena dipakai justru untuk melengkapinya). Bila sekolah tidak ada,
   pengguna menulis sendiri nama sekolahnya.

   Data sekolah statis (64 ribu baris, ±15 MB), jadi dimuat sekali dari basis data
   ke memori dan dicari di sana: jauh lebih ringan daripada ILIKE '%kata%' (pemindaian
   seluruh tabel) ketika satu kelas mencari serentak.
   ========================================================================== */
import { asc } from "drizzle-orm";
import { Hono } from "hono";
import type { Db } from "../db/client";
import { sekolah } from "../db/schema";
import type { AppEnv, Deps } from "../konteks";
import { GalatApi } from "../lib/galat";

interface BarisSekolah {
  npsn: string;
  nama: string;
  bentuk: string;
  status: string;
  kabupaten_kota: string;
  provinsi: string;
  kecamatan: string;
}
interface Entri {
  baris: BarisSekolah;
  nama: string; // huruf kecil
  teks: string; // nama + kabupaten/kota, huruf kecil
}

function muatIndeks(db: Db): () => Promise<Entri[]> {
  let janji: Promise<Entri[]> | null = null;
  return () => {
    janji ??= db
      .select()
      .from(sekolah)
      .orderBy(asc(sekolah.nama))
      .then((rows) =>
        rows.map((b) => ({
          baris: b,
          nama: b.nama.toLowerCase(),
          teks: `${b.nama} ${b.kabupaten_kota}`.toLowerCase(),
        })),
      )
      .catch((e) => {
        janji = null; // coba lagi pada permintaan berikutnya
        throw e;
      });
    return janji;
  };
}

/** "smpn" juga berarti "smp negeri" (data memakai kedua gaya penulisan). */
function cocokKata(e: Entri, kata: string): boolean {
  const s = /^(smp|sma|smk)n$/.exec(kata);
  if (s) return e.nama.includes(kata) || e.nama.includes(`${s[1]} negeri`);
  return e.teks.includes(kata);
}

export function rutSekolah(deps: Deps) {
  const indeks = muatIndeks(deps.db);
  const r = new Hono<AppEnv>();

  /* GET /v1/sekolah?q=smpn 1 madiun&bentuk=SMP&limit=15 */
  r.get("/", async (c) => {
    const q = (c.req.query("q") ?? "").trim().toLowerCase();
    if (q.length < 3) throw new GalatApi(400, "Ketik minimal 3 huruf nama sekolah atau kota.", "KATA_KUNCI_PENDEK");
    const bentuk = c.req.query("bentuk");
    if (bentuk !== undefined && !["SMP", "SMA", "SMK"].includes(bentuk))
      throw new GalatApi(400, "Parameter bentuk harus SMP, SMA, atau SMK.");
    const batas = Math.min(Math.max(Number(c.req.query("limit")) || 15, 1), 25);
    const kata = q.split(/\s+/).slice(0, 6);
    const semua = await indeks();
    /* Dua putaran: nama yang diawali kueri lebih dulu, lalu yang hanya memuatnya (daftar sudah urut nama) */
    const hasil: BarisSekolah[] = [];
    const lain: BarisSekolah[] = [];
    for (const e of semua) {
      if (bentuk && e.baris.bentuk !== bentuk) continue;
      if (!kata.every((k) => cocokKata(e, k))) continue;
      if (e.nama.startsWith(q)) hasil.push(e.baris);
      else if (lain.length < batas) lain.push(e.baris);
      if (hasil.length >= batas) break;
    }
    return c.json([...hasil, ...lain].slice(0, batas));
  });

  return r;
}
