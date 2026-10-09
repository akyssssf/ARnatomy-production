/* ==========================================================================
   sumber.ts — Satu pintu pembacaan data untuk Server Component.
   Bila BACKEND_URL diatur, data diambil dari backend ARnatomy (/v1);
   bila tidak, dari basis data tiruan di memori (lib/db.ts). Bentuk
   kembalian sama persis, jadi halaman tidak perlu tahu sumbernya.
   ========================================================================== */
import "server-only";
import { ambilSesi } from "./auth";
import { ambil, backendAktif } from "./backend";
import type { RekapRiwayat } from "./db";
import * as tiruan from "./db";
import type {
  AiConversation,
  Akun,
  AsetModel,
  LaporanKesalahan,
  LearningHistory,
  OrganId,
  PartContent,
  UmpanBalik,
  UserId,
} from "./schemas";

export type { RekapRiwayat };

export async function semuaKonten(): Promise<PartContent[]> {
  if (!backendAktif()) return tiruan.semuaKonten();
  const sesi = await ambilSesi();
  return ambil<PartContent[]>(sesi?.role === "admin" ? "/v1/admin/konten" : "/v1/konten");
}

interface RespRiwayat {
  entri: LearningHistory[];
  rekap: { id_bagian: number; jumlah: number; dimmed_dibuka: boolean; terakhir: string; total_durasi: number }[];
}

/** Urutan lama -> baru (seperti basis data tiruan); backend mengirim terbaru lebih dulu. */
export async function riwayatUser(idUser: UserId): Promise<LearningHistory[]> {
  if (!backendAktif()) return tiruan.riwayatUser(idUser);
  const r = await ambil<RespRiwayat>("/v1/riwayat");
  return [...r.entri].reverse();
}

export async function ringkasanRiwayat(idUser: UserId): Promise<RekapRiwayat[]> {
  if (!backendAktif()) return tiruan.ringkasanRiwayat(idUser);
  const r = await ambil<RespRiwayat>("/v1/riwayat");
  return r.rekap.map((b) => ({
    id_bagian: b.id_bagian as RekapRiwayat["id_bagian"],
    jumlah: b.jumlah,
    dimmedDibuka: b.dimmed_dibuka,
    terakhir: b.terakhir,
    totalDurasi: b.total_durasi,
  }));
}

export async function percakapanUser(idUser: UserId): Promise<AiConversation[]> {
  if (!backendAktif()) return tiruan.percakapanUser(idUser);
  return ambil<AiConversation[]>("/v1/asisten/riwayat");
}

export async function semuaLaporan(): Promise<LaporanKesalahan[]> {
  if (!backendAktif()) return tiruan.semuaLaporan();
  return ambil<LaporanKesalahan[]>("/v1/admin/laporan");
}

export async function semuaUmpanBalik(): Promise<UmpanBalik[]> {
  if (!backendAktif()) return tiruan.semuaUmpanBalik();
  return ambil<UmpanBalik[]>("/v1/admin/umpan-balik");
}

export async function umpanBalikUser(idUser: UserId): Promise<UmpanBalik | null> {
  if (!backendAktif()) return tiruan.umpanBalikUser(idUser);
  const { panggil } = await import("./backend");
  const h = await panggil<UmpanBalik>("/v1/umpan-balik/saya");
  if (h.status === 404) return null;
  if (h.status !== 200) throw new Error(`backend /v1/umpan-balik/saya: ${h.status}`);
  return h.data;
}

export async function semuaAkun(): Promise<Akun[]> {
  if (!backendAktif()) return tiruan.semuaAkun();
  return ambil<Akun[]>("/v1/admin/akun");
}

interface ModelBackend {
  sumber: "bawaan" | "unggahan";
  versi: number;
  nama_berkas: string;
  ukuran_byte: number | null;
}

/** Model aktif sebuah organ. Unggahan disajikan lewat /api/model agar tetap satu asal (CSP). */
export function ubahModel(idOrgan: OrganId, m: ModelBackend & { waktu?: string | null }): AsetModel {
  if (m.sumber === "bawaan") return tiruan.asetOrgan(idOrgan) as AsetModel;
  return {
    id_organ: idOrgan,
    nama_berkas: m.nama_berkas,
    ukuran_byte: m.ukuran_byte ?? 0,
    sumber: "unggahan",
    url: `/api/model/${idOrgan}/v${m.versi}.glb`,
    versi: m.versi,
    waktu: m.waktu ?? null,
  };
}

export async function semuaAset(): Promise<AsetModel[]> {
  if (!backendAktif()) return tiruan.semuaAset();
  const daftar = await ambil<{ id_organ: number; model: ModelBackend }[]>("/v1/admin/aset");
  return daftar.map((o) => ubahModel(o.id_organ as OrganId, o.model));
}

export async function asetOrgan(idOrgan: OrganId): Promise<AsetModel | null> {
  if (!backendAktif()) return tiruan.asetOrgan(idOrgan);
  const o = await ambil<{ model: ModelBackend }>(`/v1/organ/${idOrgan}`);
  return ubahModel(idOrgan, o.model);
}

/* ---------------- Tugas belajar (hanya tersedia dengan backend) ---------------- */
import type { IsiTugas, ProgresTugas, TugasRingkas } from "./tugas";

/** null = mode tiruan (tanpa backend): halaman menampilkan keterangan, bukan galat. */
export async function daftarTugas(): Promise<TugasRingkas[] | null> {
  if (!backendAktif()) return null;
  return ambil<TugasRingkas[]>("/v1/tugas");
}
export async function progresTugas(): Promise<ProgresTugas | null> {
  if (!backendAktif()) return null;
  return ambil<ProgresTugas>("/v1/tugas/progres");
}
export async function isiTugas(id: number): Promise<IsiTugas | null> {
  if (!backendAktif()) return null;
  const { panggil } = await import("./backend");
  const h = await panggil<IsiTugas>(`/v1/tugas/${id}`);
  if (h.status === 404 || h.status === 400) return null;
  if (h.status !== 200) throw new Error(`backend /v1/tugas/${id}: ${h.status}`);
  return h.data;
}

/* ---------------- Profil ---------------- */
export interface ProfilPengguna {
  id_user: number;
  nama: string;
  email: string;
  role: "siswa" | "guru" | "admin";
  asal_sekolah: string | null;
  npsn_sekolah: string | null;
}
export async function profilSaya(): Promise<ProfilPengguna | null> {
  const sesi = await ambilSesi();
  if (!sesi) return null;
  if (!backendAktif()) return { ...sesi, npsn_sekolah: null };
  const d = await ambil<{ user: ProfilPengguna }>("/v1/auth/me");
  return d.user;
}

export async function tugasAdmin(): Promise<import("./tugas").TugasAdmin[] | null> {
  if (!backendAktif()) return null;
  return ambil<import("./tugas").TugasAdmin[]>("/v1/admin/tugas");
}
