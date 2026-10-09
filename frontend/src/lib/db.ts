/* ==========================================================================
   db.ts — "Basis data" mock di memori proses server (tanpa backend asli).
   Menyimpan entitas transaksional: part_content yang bisa diedit admin,
   learning_history, ai_conversations, laporan_kesalahan, umpan_balik (SUS),
   serta akun pengguna (seed + hasil registrasi) dengan kata sandi ter-hash.

   Disimpan di globalThis supaya tidak ter-reset setiap Hot Module Reload
   di mode dev. Data hilang saat proses `next dev`/`next start` dimatikan,
   dan data milik seorang pengguna dibersihkan saat ia keluar (logout),
   meniru perilaku versi vanilla yang hanya hidup selama sesi.

   Semua fungsi mengembalikan objek yang sudah "siap JSON" (waktu = ISO
   string) sehingga bentuknya identik antara Route Handler dan pemanggilan
   langsung dari Server Component.
   ========================================================================== */
import "server-only";
import { statSync } from "node:fs";
import { join } from "node:path";
import { organs, part_content_awal, users } from "./data";
import { daftarkanToko, jadwalkanSimpan } from "./persist";
import { cekSandi, hashSandi } from "./sandi";
import {
  type AiConversation,
  type Akun,
  type AkunBuat,
  type AkunPatch,
  type AsetModel,
  type BagianId,
  type DaftarForm,
  type JenisKonten,
  type KontenId,
  type KontenPatch,
  type LaporanId,
  LaporanIdSchema,
  type LaporanKesalahan,
  type LearningHistory,
  type OrganId,
  type PartContent,
  PercakapanIdSchema,
  type RiwayatId,
  RiwayatIdSchema,
  type SesiUser,
  type UmpanBalik,
  UmpanBalikIdSchema,
  type UserId,
  UserIdSchema,
} from "./schemas";

/** Akun tersimpan: kolom User tanpa password asli, ditambah hash-nya. */
interface AkunTersimpan extends Akun {
  sandi_hash: string;
}

/** Model 3D unggahan admin (FR-12): byte disimpan di memori proses. */
interface AsetUnggahan {
  nama_berkas: string;
  bytes: Uint8Array;
  versi: number;
  waktu: string;
}

interface Toko {
  part_content: PartContent[];
  learning_history: LearningHistory[];
  ai_conversations: AiConversation[];
  laporan_kesalahan: LaporanKesalahan[];
  umpan_balik: UmpanBalik[];
  aset_model: Map<number, AsetUnggahan>;
  /* Diisi malas (async) karena hashing seed memakai crypto.subtle */
  akun: AkunTersimpan[] | null;
  akunSiap: Promise<AkunTersimpan[]> | null;
  urutanId: number;
}

const kunciGlobal = Symbol.for("arnatomy.db");
type GlobalDenganToko = typeof globalThis & { [kunciGlobal]?: Toko };

function toko(): Toko {
  const g = globalThis as GlobalDenganToko;
  if (!g[kunciGlobal]) {
    g[kunciGlobal] = {
      part_content: part_content_awal.map((k) => ({ ...k })),
      learning_history: [],
      ai_conversations: [],
      laporan_kesalahan: [],
      umpan_balik: [],
      aset_model: new Map(),
      akun: null,
      akunSiap: null,
      urutanId: 1000,
    };
  }
  /* Toko yang lahir sebelum HMR menambah kolom baru tetap dipakai: lengkapi kolomnya */
  const t = g[kunciGlobal];
  t.umpan_balik ??= [];
  t.aset_model ??= new Map();
  return t;
}

/** Dipanggil setelah setiap mutasi: snapshot dijadwalkan bila persistensi aktif. */
function berubah(): void {
  jadwalkanSimpan();
}

/* ---------------- Serialisasi untuk lib/persist.ts ----------------
   Beberapa instance serverless dapat menulis snapshot bergantian, maka
   snapshot remote DIGABUNG (union per id) sebelum ditimpa, bukan diganti.
   Penghapusan dicatat sebagai tombstone: hapus_akun (id) dan bersih_user
   (id_user -> waktu ISO; riwayat/percakapan sebelum waktu itu dibuang).
   Uint8Array model unggahan menjadi base64 (hanya adapter berkas). */
interface Snapshot {
  part_content: PartContent[];
  learning_history: LearningHistory[];
  ai_conversations: AiConversation[];
  laporan_kesalahan: LaporanKesalahan[];
  umpan_balik: UmpanBalik[];
  akun: AkunTersimpan[] | null;
  aset_model: [number, { nama_berkas: string; versi: number; waktu: string; bytes_b64: string | null }][];
  urutanId: number;
  hapus_akun: number[];
  bersih_user: Record<string, string>;
}
const tombstone = { hapus_akun: new Set<number>(), bersih_user: new Map<number, string>() };

function gabungPerId<T>(lokal: T[], remote: T[], kunci: (x: T) => number, pilih?: (a: T, b: T) => T): T[] {
  const peta = new Map<number, T>();
  for (const r of remote) peta.set(kunci(r), r);
  for (const l of lokal) {
    const r = peta.get(kunci(l));
    peta.set(kunci(l), r && pilih ? pilih(l, r) : l);
  }
  return [...peta.values()];
}
function belumDibersihkan(idUser: number, waktu: string): boolean {
  const batas = tombstone.bersih_user.get(idUser);
  return !batas || waktu > batas;
}

daftarkanToko({
  serialisasi(denganBytes) {
    const t = toko();
    const snap: Snapshot = {
      part_content: t.part_content,
      learning_history: t.learning_history,
      ai_conversations: t.ai_conversations,
      laporan_kesalahan: t.laporan_kesalahan,
      umpan_balik: t.umpan_balik,
      akun: t.akun,
      aset_model: [...t.aset_model.entries()].map(([id, a]) => [
        id,
        {
          nama_berkas: a.nama_berkas,
          versi: a.versi,
          waktu: a.waktu,
          bytes_b64: denganBytes ? Buffer.from(a.bytes).toString("base64") : null,
        },
      ]),
      urutanId: t.urutanId,
      hapus_akun: [...tombstone.hapus_akun],
      bersih_user: Object.fromEntries([...tombstone.bersih_user].map(([k, v]) => [String(k), v])),
    };
    return snap;
  },
  pulihkan(mentah) {
    const snap = mentah as Partial<Snapshot>;
    const t = toko();
    for (const id of snap.hapus_akun ?? []) tombstone.hapus_akun.add(id);
    for (const [k, v] of Object.entries(snap.bersih_user ?? {})) {
      const lama = tombstone.bersih_user.get(Number(k));
      if (!lama || v > lama) tombstone.bersih_user.set(Number(k), v);
    }
    if (Array.isArray(snap.part_content)) {
      /* konten hanya diedit admin: versi remote dipakai bila lokal masih seed */
      t.part_content = gabungPerId(
        t.part_content,
        snap.part_content,
        (k) => k.id_konten,
        (l, r) =>
          part_content_awal.some(
            (awal) =>
              awal.id_konten === l.id_konten &&
              awal.deskripsi === l.deskripsi &&
              awal.judul_tampil === l.judul_tampil &&
              awal.status_validasi === l.status_validasi,
          )
            ? r
            : l,
      );
    }
    if (Array.isArray(snap.learning_history)) {
      t.learning_history = gabungPerId(t.learning_history, snap.learning_history, (r) => r.id_riwayat).filter((r) =>
        belumDibersihkan(r.id_user, r.waktu_akses),
      );
    }
    if (Array.isArray(snap.ai_conversations)) {
      t.ai_conversations = gabungPerId(t.ai_conversations, snap.ai_conversations, (p) => p.id_percakapan).filter((p) =>
        belumDibersihkan(p.id_user, p.waktu),
      );
    }
    if (Array.isArray(snap.laporan_kesalahan)) {
      t.laporan_kesalahan = gabungPerId(
        t.laporan_kesalahan,
        snap.laporan_kesalahan,
        (l) => l.id_laporan,
        (l, r) => (l.status_tindak_lanjut === "ditindaklanjuti" ? l : r),
      );
    }
    if (Array.isArray(snap.umpan_balik)) {
      t.umpan_balik = gabungPerId(
        t.umpan_balik,
        snap.umpan_balik,
        (u) => u.id_user,
        (l, r) => (l.waktu >= r.waktu ? l : r),
      );
    }
    if (Array.isArray(snap.akun)) {
      const gabungan = gabungPerId(t.akun ?? [], snap.akun, (a) => a.id_user).filter(
        (a) => !tombstone.hapus_akun.has(a.id_user),
      );
      t.akun = gabungan;
      t.akunSiap = Promise.resolve(gabungan);
    }
    if (Array.isArray(snap.aset_model)) {
      for (const [id, a] of snap.aset_model) {
        const lokal = t.aset_model.get(id);
        if (lokal && lokal.versi >= a.versi) continue;
        if (a.bytes_b64) t.aset_model.set(id, { ...a, bytes: new Uint8Array(Buffer.from(a.bytes_b64, "base64")) });
      }
    }
    if (typeof snap.urutanId === "number") t.urutanId = Math.max(t.urutanId, snap.urutanId);
  },
});

/** Id berikutnya, langsung "dimerek" lewat skema yang diminta.
    Berbasis waktu (ms × 1000) ditambah 3 digit acak dari CSPRNG agar dua
    instance serverless yang berjalan bersamaan tidak menghasilkan id yang
    sama saat snapshot digabung; tetap monoton naik terhadap id yang pernah
    dipakai di proses ini. */
function acak1000(): number {
  return crypto.getRandomValues(new Uint16Array(1))[0] ?? 0;
}
function idBaru<T>(skema: { parse: (nilai: unknown) => T }): T {
  const t = toko();
  const kandidat = Date.now() * 1000 + (acak1000() % 1000);
  t.urutanId = Math.max(t.urutanId + 1, kandidat);
  return skema.parse(t.urutanId);
}

/** Jeda buatan agar loading state terlihat (meniru latensi jaringan). */
export function jeda(ms: number): Promise<void> {
  return new Promise((selesai) => setTimeout(selesai, ms));
}

/* ---------------- part_content (FR-06, FR-07, FR-10) ---------------- */
export function semuaKonten(): PartContent[] {
  return toko().part_content.map((k) => ({ ...k }));
}
export function kontenById(idKonten: KontenId): PartContent | null {
  return toko().part_content.find((k) => k.id_konten === idKonten) ?? null;
}
export function kontenBagian(idBagian: BagianId, jenis: JenisKonten): PartContent | null {
  return toko().part_content.find((k) => k.id_bagian === idBagian && k.jenis_konten === jenis) ?? null;
}
export function perbaruiKonten(idKonten: KontenId, perubahan: KontenPatch): PartContent | null {
  const konten = toko().part_content.find((k) => k.id_konten === idKonten);
  if (!konten) return null;
  Object.assign(konten, perubahan);
  berubah();
  return { ...konten };
}

/* ---------------- learning_history (FR-14) ---------------- */
export function riwayatUser(idUser: UserId): LearningHistory[] {
  return toko()
    .learning_history.filter((r) => r.id_user === idUser)
    .map((r) => ({ ...r }));
}
export function catatRiwayat(idUser: UserId, idBagian: BagianId, jenis: JenisKonten): LearningHistory {
  const entri: LearningHistory = {
    id_riwayat: idBaru(RiwayatIdSchema),
    id_user: idUser,
    id_bagian: idBagian,
    jenis_konten: jenis,
    waktu_akses: new Date().toISOString(),
    durasi: null,
  };
  toko().learning_history.push(entri);
  berubah();
  return { ...entri };
}
/** Durasi dihitung di server dari waktu_akses sampai saat entri ditutup. */
export function tutupRiwayat(idUser: UserId, idRiwayat: RiwayatId): LearningHistory | null {
  const entri = toko().learning_history.find((r) => r.id_riwayat === idRiwayat && r.id_user === idUser);
  if (!entri) return null;
  if (entri.durasi === null) {
    entri.durasi = Math.max(1, Math.round((Date.now() - new Date(entri.waktu_akses).getTime()) / 1000));
    berubah();
  }
  return { ...entri };
}

/** Rekap per bagian tubuh untuk halaman Riwayat & Beranda. */
export interface RekapRiwayat {
  id_bagian: BagianId;
  jumlah: number;
  dimmedDibuka: boolean;
  terakhir: string;
  totalDurasi: number;
}
export function ringkasanRiwayat(idUser: UserId): RekapRiwayat[] {
  const peta = new Map<number, RekapRiwayat>();
  for (const r of riwayatUser(idUser)) {
    const baris = peta.get(r.id_bagian) ?? {
      id_bagian: r.id_bagian,
      jumlah: 0,
      dimmedDibuka: false,
      terakhir: r.waktu_akses,
      totalDurasi: 0,
    };
    baris.jumlah += 1;
    if (r.jenis_konten === "dimmed") baris.dimmedDibuka = true;
    if (r.waktu_akses > baris.terakhir) baris.terakhir = r.waktu_akses;
    baris.totalDurasi += r.durasi ?? 0;
    peta.set(r.id_bagian, baris);
  }
  return [...peta.values()].sort((a, b) => (a.terakhir < b.terakhir ? 1 : -1));
}

/* ---------------- ai_conversations (FR-08) ---------------- */
export function percakapanUser(idUser: UserId): AiConversation[] {
  return toko()
    .ai_conversations.filter((p) => p.id_user === idUser)
    .map((p) => ({ ...p }));
}
export function tambahPercakapan(
  idUser: UserId,
  idBagian: BagianId | null,
  pertanyaan: string,
  jawaban: string,
): AiConversation {
  const entri: AiConversation = {
    id_percakapan: idBaru(PercakapanIdSchema),
    id_user: idUser,
    id_bagian: idBagian,
    pertanyaan,
    jawaban,
    waktu: new Date().toISOString(),
  };
  toko().ai_conversations.push(entri);
  berubah();
  return { ...entri };
}

/* ---------------- laporan_kesalahan (FR-09, FR-11) ---------------- */
export function semuaLaporan(): LaporanKesalahan[] {
  return toko().laporan_kesalahan.map((l) => ({ ...l }));
}
export function tambahLaporan(idUser: UserId, idKonten: KontenId, deskripsi: string): LaporanKesalahan {
  const entri: LaporanKesalahan = {
    id_laporan: idBaru(LaporanIdSchema),
    id_user: idUser,
    id_konten: idKonten,
    deskripsi_laporan: deskripsi,
    status_tindak_lanjut: "baru",
    waktu: new Date().toISOString(),
  };
  toko().laporan_kesalahan.unshift(entri);
  berubah();
  return { ...entri };
}
export function tindakLanjutiLaporan(idLaporan: LaporanId): LaporanKesalahan | null {
  const laporan = toko().laporan_kesalahan.find((l) => l.id_laporan === idLaporan);
  if (!laporan) return null;
  laporan.status_tindak_lanjut = "ditindaklanjuti";
  berubah();
  return { ...laporan };
}

/* ---------------- umpan_balik: kuesioner SUS (FR-15) ----------------
   Skor SUS: butir ganjil (positif) = jawaban - 1, butir genap (negatif) =
   5 - jawaban; jumlah dikali 2,5 -> rentang 0..100. */
export function hitungSkorSus(jawaban: number[]): number {
  const total = jawaban.reduce((akum, nilai, i) => akum + (i % 2 === 0 ? nilai - 1 : 5 - nilai), 0);
  return Math.round(total * 2.5 * 10) / 10;
}
export function semuaUmpanBalik(): UmpanBalik[] {
  return toko().umpan_balik.map((u) => ({ ...u, jawaban: [...u.jawaban] }));
}
export function umpanBalikUser(idUser: UserId): UmpanBalik | null {
  const u = toko().umpan_balik.find((x) => x.id_user === idUser);
  return u ? { ...u, jawaban: [...u.jawaban] } : null;
}
export function tambahUmpanBalik(idUser: UserId, jawaban: number[], komentar: string | null): UmpanBalik {
  const entri: UmpanBalik = {
    id_umpan_balik: idBaru(UmpanBalikIdSchema),
    id_user: idUser,
    jawaban: [...jawaban],
    skor_sus: hitungSkorSus(jawaban),
    komentar: komentar?.trim() ? komentar.trim() : null,
    waktu: new Date().toISOString(),
  };
  /* Satu kuesioner per pengguna: kiriman ulang menggantikan yang lama */
  const t = toko();
  t.umpan_balik = t.umpan_balik.filter((u) => u.id_user !== idUser);
  t.umpan_balik.unshift(entri);
  berubah();
  return { ...entri, jawaban: [...entri.jawaban] };
}

/* ---------------- akun pengguna (FR-01, FR-02, FR-13) ----------------
   Seed dari data.ts di-hash sekali saat pertama diakses; akun hasil
   registrasi ditambahkan ke daftar yang sama. */
function daftarAkun(): Promise<AkunTersimpan[]> {
  const t = toko();
  if (t.akun) return Promise.resolve(t.akun);
  if (!t.akunSiap) {
    t.akunSiap = Promise.all(
      users.map(async ({ password, ...u }) => ({ ...u, sandi_hash: await hashSandi(password) })),
    ).then((akun) => {
      t.akun = akun;
      return akun;
    });
  }
  return t.akunSiap;
}
function keAkun(akun: AkunTersimpan): Akun {
  return {
    id_user: akun.id_user,
    nama: akun.nama,
    email: akun.email,
    role: akun.role,
    asal_sekolah: akun.asal_sekolah,
    aktif: akun.aktif,
  };
}
function keSesi(akun: AkunTersimpan): SesiUser {
  return {
    id_user: akun.id_user,
    nama: akun.nama,
    email: akun.email,
    role: akun.role,
    asal_sekolah: akun.asal_sekolah,
  };
}

export async function semuaAkun(): Promise<Akun[]> {
  return (await daftarAkun()).map(keAkun);
}
export async function akunById(idUser: UserId): Promise<Akun | null> {
  const a = (await daftarAkun()).find((x) => x.id_user === idUser);
  return a ? keAkun(a) : null;
}

export type HasilLogin = { status: "ok"; user: SesiUser } | { status: "salah" } | { status: "nonaktif" };
/** Memeriksa email + kata sandi terhadap hash; membedakan akun nonaktif. */
export async function verifikasiLogin(email: string, password: string): Promise<HasilLogin> {
  const akun = (await daftarAkun()).find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
  if (!akun || !(await cekSandi(password, akun.sandi_hash))) return { status: "salah" };
  if (!akun.aktif) return { status: "nonaktif" };
  return { status: "ok", user: keSesi(akun) };
}

/** Registrasi (FR-02): null bila email sudah terpakai. */
export async function daftarkanAkun(input: DaftarForm): Promise<SesiUser | null> {
  const semua = await daftarAkun();
  if (semua.some((a) => a.email.toLowerCase() === input.email.toLowerCase())) return null;
  const akun: AkunTersimpan = {
    id_user: idBaru(UserIdSchema),
    nama: input.nama,
    email: input.email.toLowerCase(),
    role: input.role,
    asal_sekolah: input.asal_sekolah,
    aktif: true,
    sandi_hash: await hashSandi(input.password),
  };
  semua.push(akun);
  berubah();
  return keSesi(akun);
}

/** FR-13: nonaktifkan/aktifkan kembali akun. */
export async function setAkunAktif(idUser: UserId, aktif: boolean): Promise<Akun | null> {
  const akun = (await daftarAkun()).find((a) => a.id_user === idUser);
  if (!akun) return null;
  akun.aktif = aktif;
  berubah();
  return keAkun(akun);
}
/** FR-13: admin menambah akun (peran apa pun); null bila email sudah terpakai. */
export async function tambahAkunAdmin(input: AkunBuat): Promise<Akun | null> {
  const semua = await daftarAkun();
  if (semua.some((a) => a.email.toLowerCase() === input.email.toLowerCase())) return null;
  const akun: AkunTersimpan = {
    id_user: idBaru(UserIdSchema),
    nama: input.nama,
    email: input.email.toLowerCase(),
    role: input.role,
    asal_sekolah: input.asal_sekolah,
    aktif: true,
    sandi_hash: await hashSandi(input.password),
  };
  semua.push(akun);
  berubah();
  return keAkun(akun);
}
export type HasilPerbarui = { status: "ok"; akun: Akun } | { status: "tidak-ada" } | { status: "email-ganda" };
/** FR-13: admin mengubah data akun; sandi kosong/absen = tidak diganti. */
export async function perbaruiAkun(idUser: UserId, perubahan: AkunPatch): Promise<HasilPerbarui> {
  const semua = await daftarAkun();
  const akun = semua.find((a) => a.id_user === idUser);
  if (!akun) return { status: "tidak-ada" };
  const emailBaru = perubahan.email?.toLowerCase();
  if (emailBaru && semua.some((a) => a.id_user !== idUser && a.email.toLowerCase() === emailBaru)) {
    return { status: "email-ganda" };
  }
  if (perubahan.nama !== undefined) akun.nama = perubahan.nama;
  if (emailBaru) akun.email = emailBaru;
  if (perubahan.role !== undefined) akun.role = perubahan.role;
  if (perubahan.asal_sekolah !== undefined) akun.asal_sekolah = perubahan.asal_sekolah;
  if (perubahan.aktif !== undefined) akun.aktif = perubahan.aktif;
  if (perubahan.password) akun.sandi_hash = await hashSandi(perubahan.password);
  berubah();
  return { status: "ok", akun: keAkun(akun) };
}
/** FR-13: hapus akun beserta data belajarnya. */
export async function hapusAkun(idUser: UserId): Promise<boolean> {
  const t = toko();
  const semua = await daftarAkun();
  const indeks = semua.findIndex((a) => a.id_user === idUser);
  if (indeks < 0) return false;
  semua.splice(indeks, 1);
  tombstone.hapus_akun.add(idUser);
  bersihkanDataUser(idUser);
  t.umpan_balik = t.umpan_balik.filter((u) => u.id_user !== idUser);
  berubah();
  return true;
}

/* ---------------- aset model 3D (FR-12) ----------------
   Setiap organ punya satu model aktif: unggahan admin (memori) bila ada,
   selain itu berkas bawaan di public/models. URL unggahan memuat nomor versi
   agar cache peramban tidak menyajikan model lama. */
const MAGIC_GLB = "glTF";
export function adalahGlb(bytes: Uint8Array): boolean {
  return bytes.length > 12 && String.fromCharCode(...bytes.subarray(0, 4)) === MAGIC_GLB;
}
function ukuranBawaan(path: string): number {
  try {
    return statSync(join(process.cwd(), "public", path)).size;
  } catch {
    return 0;
  }
}
export function asetOrgan(idOrgan: OrganId): AsetModel | null {
  const organ = organs.find((o) => o.id_organ === idOrgan);
  if (!organ) return null;
  const unggahan = toko().aset_model.get(idOrgan);
  if (unggahan) {
    return {
      id_organ: idOrgan,
      nama_berkas: unggahan.nama_berkas,
      ukuran_byte: unggahan.bytes.byteLength,
      sumber: "unggahan",
      url: `/api/model/${idOrgan}/v${unggahan.versi}.glb`,
      versi: unggahan.versi,
      waktu: unggahan.waktu,
    };
  }
  return {
    id_organ: idOrgan,
    nama_berkas: organ.file_model_3d.split("/").pop() ?? organ.file_model_3d,
    ukuran_byte: ukuranBawaan(organ.file_model_3d),
    sumber: "bawaan",
    url: organ.file_model_3d,
    versi: 0,
    waktu: null,
  };
}
export function semuaAset(): AsetModel[] {
  return organs.flatMap((o) => asetOrgan(o.id_organ) ?? []);
}
/** Mengunggah / memperbarui model organ; null bila organ tidak ada. */
export function simpanAset(idOrgan: OrganId, namaBerkas: string, bytes: Uint8Array): AsetModel | null {
  if (!organs.some((o) => o.id_organ === idOrgan)) return null;
  const t = toko();
  const versi = (t.aset_model.get(idOrgan)?.versi ?? 0) + 1;
  t.aset_model.set(idOrgan, { nama_berkas: namaBerkas, bytes, versi, waktu: new Date().toISOString() });
  berubah();
  return asetOrgan(idOrgan);
}
/** Menghapus unggahan sehingga organ kembali ke model bawaan; false bila tidak ada unggahan. */
export function hapusAset(idOrgan: OrganId): boolean {
  const dihapus = toko().aset_model.delete(idOrgan);
  if (dihapus) berubah();
  return dihapus;
}
export function bytesAset(idOrgan: OrganId, versi: number): Uint8Array | null {
  const u = toko().aset_model.get(idOrgan);
  return u && u.versi === versi ? u.bytes : null;
}

/* ---------------- Sesi ---------------- */
/** Saat keluar, data belajar pribadi pengguna dibuang (seperti versi lama). */
export function bersihkanDataUser(idUser: UserId): void {
  const t = toko();
  tombstone.bersih_user.set(idUser, new Date().toISOString());
  t.learning_history = t.learning_history.filter((r) => r.id_user !== idUser);
  t.ai_conversations = t.ai_conversations.filter((p) => p.id_user !== idUser);
  berubah();
}
