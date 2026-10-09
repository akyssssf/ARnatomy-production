/* ==========================================================================
   mock-api.ts — Lapisan pemanggilan REST dari sisi klien.
   Setiap fungsi: fetch + async/await + batas waktu (AbortController),
   pesan galat yang bisa dibaca pengguna, lalu respons DIVALIDASI dengan
   skema Zod sebelum dikembalikan ke TanStack Query (end-to-end type safety).
   Endpoint sesungguhnya adalah Route Handler di src/app/api/* yang
   mensimulasikan backend ARnatomy dengan jeda buatan.
   ========================================================================== */
import { z } from "zod";
import {
  type AiConversation,
  AiConversationSchema,
  type Akun,
  type AkunBuat,
  type AkunPatch,
  AkunSchema,
  type AsetModel,
  AsetModelSchema,
  type CatatRiwayatInput,
  type DaftarForm,
  type KontenForm,
  type KontenId,
  type LaporanForm,
  type LaporanId,
  type LaporanKesalahan,
  LaporanKesalahanSchema,
  type LearningHistory,
  LearningHistorySchema,
  type LoginForm,
  type OrganId,
  type PartContent,
  PartContentSchema,
  type PertanyaanForm,
  RespDaftarSchema,
  RespGalatSchema,
  RespLoginSchema,
  RespOkSchema,
  type RiwayatId,
  type SesiUser,
  type UmpanBalik,
  type UmpanBalikForm,
  UmpanBalikSchema,
  type UserId,
} from "./schemas";
import { type HasilPercobaan, HasilPercobaanSchema, type SoalForm } from "./tugas";

const BATAS_WAKTU_MS = 8000;

/** Galat API dengan kode status, supaya UI bisa membedakan 401/403/503. */
export class GalatApi extends Error {
  constructor(
    pesan: string,
    public readonly status: number,
  ) {
    super(pesan);
    this.name = "GalatApi";
  }
}

async function ambilJson<T>(skema: z.ZodType<T>, url: string, init?: RequestInit): Promise<T> {
  const pengendali = new AbortController();
  const penghitung = setTimeout(() => pengendali.abort(), BATAS_WAKTU_MS);
  try {
    /* Body FormData (unggah berkas): biarkan peramban menyetel boundary multipart */
    const jsonBody = !(init?.body instanceof FormData);
    const respons = await fetch(url, {
      ...init,
      signal: pengendali.signal,
      headers: { ...(jsonBody ? { "Content-Type": "application/json" } : {}), ...(init?.headers ?? {}) },
    });
    const mentah: unknown = await respons.json().catch(() => null);
    if (!respons.ok) {
      const galat = RespGalatSchema.safeParse(mentah);
      throw new GalatApi(
        galat.success ? galat.data.pesan : `server membalas status ${respons.status}.`,
        respons.status,
      );
    }
    /* Validasi runtime: data yang tidak sesuai skema tidak pernah masuk cache */
    return skema.parse(mentah);
  } catch (kesalahan) {
    if (kesalahan instanceof GalatApi) throw kesalahan;
    if (kesalahan instanceof z.ZodError) throw new GalatApi("bentuk data dari server tidak sesuai skema.", 500);
    if (kesalahan instanceof DOMException && kesalahan.name === "AbortError") {
      throw new GalatApi(`permintaan melebihi batas waktu ${BATAS_WAKTU_MS / 1000} detik.`, 408);
    }
    throw new GalatApi("server tidak dapat dihubungi.", 0);
  } finally {
    clearTimeout(penghitung);
  }
}

const kirim = (metode: "POST" | "PATCH" | "DELETE", muatan: unknown): RequestInit => ({
  method: metode,
  body: JSON.stringify(muatan),
});

/* ---------------- Autentikasi (FR-01) ---------------- */
export async function masuk(input: LoginForm): Promise<SesiUser> {
  const { user } = await ambilJson(RespLoginSchema, "/api/login", kirim("POST", input));
  return user;
}
/** Login Google: ID token dari Google Identity Services dikirim ke BFF, yang meneruskannya ke backend. */
export async function masukGoogle(idToken: string): Promise<SesiUser> {
  const { user } = await ambilJson(RespLoginSchema, "/api/google", kirim("POST", { id_token: idToken }));
  return user;
}
export interface SekolahHasil {
  npsn: string;
  nama: string;
  bentuk: string;
  status: string;
  kabupaten_kota: string;
  provinsi: string;
  kecamatan: string;
}
const SekolahSchema = z.object({
  npsn: z.string(),
  nama: z.string(),
  bentuk: z.string(),
  status: z.string(),
  kabupaten_kota: z.string(),
  provinsi: z.string(),
  kecamatan: z.string(),
});
export function cariSekolah(q: string): Promise<SekolahHasil[]> {
  return ambilJson(z.array(SekolahSchema), `/api/sekolah?q=${encodeURIComponent(q)}`);
}
/** Melengkapi peran + sekolah akun Google (FR-02). */
export async function lengkapiProfil(input: {
  role: "siswa" | "guru";
  asal_sekolah?: string;
  npsn?: string;
}): Promise<SesiUser> {
  const { user } = await ambilJson(RespLoginSchema, "/api/profil", kirim("PATCH", input));
  return user;
}
export async function keluar(): Promise<void> {
  await ambilJson(RespOkSchema, "/api/logout", { method: "POST" });
}

/* ---------------- Registrasi (FR-02) ---------------- */
export async function daftar(input: DaftarForm): Promise<SesiUser> {
  const { user } = await ambilJson(RespDaftarSchema, "/api/daftar", kirim("POST", input));
  return user;
}

/* ---------------- Kelola akun (FR-13, khusus admin) ---------------- */
export function ambilAkun(): Promise<Akun[]> {
  return ambilJson(z.array(AkunSchema), "/api/akun");
}
export function tambahAkun(input: AkunBuat): Promise<Akun> {
  return ambilJson(AkunSchema, "/api/akun", kirim("POST", input));
}
export function ubahAkun(idUser: UserId, input: AkunPatch): Promise<Akun> {
  return ambilJson(AkunSchema, `/api/akun/${idUser}`, kirim("PATCH", input));
}
export async function hapusAkun(idUser: UserId): Promise<void> {
  await ambilJson(RespOkSchema, `/api/akun/${idUser}`, { method: "DELETE" });
}

/* ---------------- Aset model 3D (FR-12, khusus admin) ---------------- */
export function unggahAset(idOrgan: OrganId, berkas: File): Promise<AsetModel> {
  const form = new FormData();
  form.set("id_organ", String(idOrgan));
  form.set("berkas", berkas);
  return ambilJson(AsetModelSchema, "/api/aset", { method: "POST", body: form });
}
export function hapusAsetModel(idOrgan: OrganId): Promise<AsetModel> {
  return ambilJson(AsetModelSchema, `/api/aset/${idOrgan}`, { method: "DELETE" });
}

/* ---------------- Umpan balik SUS (FR-15) ---------------- */
export function kirimUmpanBalik(input: UmpanBalikForm): Promise<UmpanBalik> {
  return ambilJson(UmpanBalikSchema, "/api/umpan-balik", kirim("POST", input));
}

/* ---------------- Asisten AI (FR-08) ---------------- */
export function ambilPercakapan(): Promise<AiConversation[]> {
  return ambilJson(z.array(AiConversationSchema), "/api/asisten");
}
export function kirimPertanyaan(input: PertanyaanForm & { simulasiGagal: boolean }): Promise<AiConversation> {
  return ambilJson(AiConversationSchema, "/api/asisten", kirim("POST", input));
}

/* ---------------- Laporan kesalahan (FR-09, FR-11) ---------------- */
export function ambilLaporan(): Promise<LaporanKesalahan[]> {
  return ambilJson(z.array(LaporanKesalahanSchema), "/api/laporan");
}
export function kirimLaporan(input: LaporanForm & { simulasiGagal: boolean }): Promise<LaporanKesalahan> {
  return ambilJson(LaporanKesalahanSchema, "/api/laporan", kirim("POST", input));
}
export function tindakLanjutiLaporan(idLaporan: LaporanId): Promise<LaporanKesalahan> {
  return ambilJson(
    LaporanKesalahanSchema,
    `/api/laporan/${idLaporan}`,
    kirim("PATCH", { status_tindak_lanjut: "ditindaklanjuti" }),
  );
}

/* ---------------- Konten label (FR-10) ---------------- */
export function ambilKonten(): Promise<PartContent[]> {
  return ambilJson(z.array(PartContentSchema), "/api/konten");
}
export function perbaruiKonten(idKonten: KontenId, input: KontenForm): Promise<PartContent> {
  return ambilJson(PartContentSchema, `/api/konten/${idKonten}`, kirim("PATCH", input));
}

/* ---------------- Tugas belajar: kuis dan simulasi ---------------- */
export function kirimPercobaan(idTugas: number, jawaban: number[]): Promise<HasilPercobaan> {
  return ambilJson(HasilPercobaanSchema, `/api/tugas/${idTugas}/percobaan`, kirim("POST", { jawaban }));
}

const SoalTersimpanSchema = z.object({ id_soal: z.number().int() });
export function tambahSoal(idTugas: number, input: SoalForm) {
  return ambilJson(SoalTersimpanSchema, `/api/tugas-admin/${idTugas}/soal`, kirim("POST", input));
}
export function ubahSoal(idSoal: number, input: SoalForm) {
  return ambilJson(SoalTersimpanSchema, `/api/soal/${idSoal}`, kirim("PATCH", input));
}
export async function hapusSoal(idSoal: number): Promise<void> {
  await ambilJson(RespOkSchema, `/api/soal/${idSoal}`, { method: "DELETE" });
}

/* ---------------- Riwayat belajar (FR-14) ---------------- */
export function ambilRiwayat(): Promise<LearningHistory[]> {
  return ambilJson(z.array(LearningHistorySchema), "/api/riwayat");
}
export function catatRiwayat(input: CatatRiwayatInput): Promise<LearningHistory> {
  return ambilJson(LearningHistorySchema, "/api/riwayat", kirim("POST", input));
}
export function tutupRiwayat(idRiwayat: RiwayatId): Promise<LearningHistory> {
  return ambilJson(LearningHistorySchema, `/api/riwayat/${idRiwayat}`, { method: "PATCH" });
}
