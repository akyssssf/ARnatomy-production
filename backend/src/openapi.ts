/* ==========================================================================
   openapi.ts — Dokumentasi API (OpenAPI 3.1) yang dibangkitkan dari skema Zod
   yang sama dengan validasi runtime. Disajikan di GET /openapi.json. Uji
   memastikan setiap rute yang terdaftar di aplikasi ada di dokumentasi ini.
   ========================================================================== */
import { z } from "zod";
import {
  AkunBuatSchema,
  AkunPatchSchema,
  CatatRiwayatSchema,
  DaftarSchema,
  GantiSandiSchema,
  GoogleSchema,
  KlasifikasiSchema,
  KontenBuatSchema,
  KontenPatchSchema,
  LaporanSchema,
  LoginSchema,
  PertanyaanSchema,
  ProfilSchema,
  RefreshSchema,
  UmpanBalikSchema,
} from "./schemas";

type Akses = "publik" | "user" | "admin";
interface Rute {
  metode: "get" | "post" | "patch" | "delete";
  path: string;
  ringkas: string;
  tag: string;
  akses: Akses;
  body?: z.ZodType;
  multipart?: string;
  /** Rute khusus akun yang profilnya belum lengkap (tanpa kewajiban profil_lengkap) */
  tanpaProfil?: boolean;
}

export const RUTE: Rute[] = [
  { metode: "get", path: "/healthz", ringkas: "Proses hidup", tag: "Operasional (NFR-04)", akses: "publik" },
  { metode: "get", path: "/readyz", ringkas: "Basis data siap", tag: "Operasional (NFR-04)", akses: "publik" },
  {
    metode: "post",
    path: "/v1/auth/register",
    ringkas: "Registrasi siswa/guru",
    tag: "FR-02 Registrasi",
    akses: "publik",
    body: DaftarSchema,
  },
  {
    metode: "post",
    path: "/v1/auth/login",
    ringkas: "Login email + kata sandi (bcrypt), mengembalikan JWT",
    tag: "FR-01 Login",
    akses: "publik",
    body: LoginSchema,
  },
  {
    metode: "post",
    path: "/v1/auth/refresh",
    ringkas: "Tukar refresh token dengan sepasang token baru",
    tag: "FR-01 Login",
    akses: "publik",
    body: RefreshSchema,
  },
  {
    metode: "post",
    path: "/v1/auth/google",
    ringkas: "Login Google: kirim ID token (Android/iOS/web)",
    tag: "FR-01 Login",
    akses: "publik",
    body: GoogleSchema,
  },
  {
    metode: "get",
    path: "/v1/auth/me",
    ringkas: "Profil pengguna yang sedang masuk",
    tag: "FR-01 Login",
    akses: "user",
    tanpaProfil: true,
  },
  {
    metode: "patch",
    path: "/v1/auth/profil",
    ringkas: "Lengkapi peran + sekolah (akun Google baru)",
    tag: "FR-02 Registrasi",
    akses: "user",
    body: ProfilSchema,
    tanpaProfil: true,
  },
  {
    metode: "post",
    path: "/v1/auth/tautkan/google",
    ringkas: "Tautkan akun Google ke akun yang sedang masuk",
    tag: "FR-01 Login",
    akses: "user",
    body: GoogleSchema,
    tanpaProfil: true,
  },
  {
    metode: "delete",
    path: "/v1/auth/tautkan/google",
    ringkas: "Lepas tautan Google (harus punya kata sandi)",
    tag: "FR-01 Login",
    akses: "user",
    tanpaProfil: true,
  },
  {
    metode: "post",
    path: "/v1/auth/ganti-sandi",
    ringkas: "Ganti kata sandi; token lama dicabut",
    tag: "FR-01 Login",
    akses: "user",
    body: GantiSandiSchema,
    tanpaProfil: true,
  },
  {
    metode: "post",
    path: "/v1/auth/logout",
    ringkas: "Keluar (klien membuang token)",
    tag: "FR-01 Login",
    akses: "user",
    tanpaProfil: true,
  },
  {
    metode: "post",
    path: "/v1/auth/logout-semua",
    ringkas: "Cabut seluruh token pengguna di semua perangkat",
    tag: "FR-01 Login",
    akses: "user",
    tanpaProfil: true,
  },
  { metode: "get", path: "/v1/sistem-organ", ringkas: "Katalog sistem organ", tag: "FR-03 Model 3D", akses: "user" },
  { metode: "get", path: "/v1/organ", ringkas: "Daftar organ + model aktif", tag: "FR-03 Model 3D", akses: "user" },
  {
    metode: "get",
    path: "/v1/organ/:id",
    ringkas: "Organ lengkap: fakta, layer, bagian tubuh, model aktif",
    tag: "FR-03 Model 3D",
    akses: "user",
  },
  { metode: "get", path: "/v1/organ/:id/layer", ringkas: "Layer anatomi organ", tag: "FR-05 Layer", akses: "user" },
  { metode: "get", path: "/v1/bagian/:id", ringkas: "Satu bagian tubuh", tag: "FR-06/07 Label", akses: "user" },
  { metode: "get", path: "/v1/konten", ringkas: "Seluruh label tervalidasi", tag: "FR-06/07 Label", akses: "user" },
  {
    metode: "get",
    path: "/v1/bagian/:id/konten",
    ringkas: "Label dasar/dimmed yang tervalidasi (?jenis=dasar|dimmed)",
    tag: "FR-06/07 Label",
    akses: "user",
  },
  {
    metode: "post",
    path: "/v1/asisten/tanya",
    ringkas: "Tanya asisten AI: RAG berbasis buku (hybrid embedding + TF-IDF) → LLM; mengembalikan jawaban + sumber",
    tag: "FR-08 Asisten AI",
    akses: "user",
    body: PertanyaanSchema,
  },
  {
    metode: "post",
    path: "/v1/asisten/klasifikasi",
    ringkas: "Klasifikasi sistem organ dari pertanyaan: Peredaran Darah / Pernapasan / Di luar cakupan",
    tag: "FR-08 Asisten AI",
    akses: "user",
    body: KlasifikasiSchema,
  },
  {
    metode: "get",
    path: "/v1/asisten/riwayat",
    ringkas: "Riwayat percakapan AI milik sendiri",
    tag: "FR-08 Asisten AI",
    akses: "user",
  },
  {
    metode: "post",
    path: "/v1/laporan",
    ringkas: "Laporkan kesalahan konten",
    tag: "FR-09 Laporan",
    akses: "user",
    body: LaporanSchema,
  },
  { metode: "get", path: "/v1/laporan/saya", ringkas: "Laporan milik sendiri", tag: "FR-09 Laporan", akses: "user" },
  {
    metode: "get",
    path: "/v1/admin/konten",
    ringkas: "Semua konten termasuk draft",
    tag: "FR-10 Konten (admin)",
    akses: "admin",
  },
  {
    metode: "post",
    path: "/v1/admin/konten",
    ringkas: "Susun label baru (draft)",
    tag: "FR-10 Konten (admin)",
    akses: "admin",
    body: KontenBuatSchema,
  },
  {
    metode: "patch",
    path: "/v1/admin/konten/:id",
    ringkas: "Edit dan/atau terbitkan (status_validasi = tervalidasi)",
    tag: "FR-10 Konten (admin)",
    akses: "admin",
    body: KontenPatchSchema,
  },
  {
    metode: "get",
    path: "/v1/admin/laporan",
    ringkas: "Daftar laporan (?status=baru|ditindaklanjuti)",
    tag: "FR-11 Laporan (admin)",
    akses: "admin",
  },
  {
    metode: "patch",
    path: "/v1/admin/laporan/:id",
    ringkas: "Tandai laporan ditindaklanjuti",
    tag: "FR-11 Laporan (admin)",
    akses: "admin",
  },
  {
    metode: "get",
    path: "/v1/admin/aset",
    ringkas: "Model aktif tiap organ",
    tag: "FR-12 Aset 3D (admin)",
    akses: "admin",
  },
  {
    metode: "post",
    path: "/v1/admin/aset/:idOrgan",
    ringkas: "Unggah/ganti model .glb (maks 15 MB)",
    tag: "FR-12 Aset 3D (admin)",
    akses: "admin",
    multipart: "berkas",
  },
  {
    metode: "delete",
    path: "/v1/admin/aset/:idOrgan",
    ringkas: "Hapus unggahan; kembali ke model bawaan",
    tag: "FR-12 Aset 3D (admin)",
    akses: "admin",
  },
  { metode: "get", path: "/v1/admin/akun", ringkas: "Daftar akun", tag: "FR-13 Akun (admin)", akses: "admin" },
  {
    metode: "post",
    path: "/v1/admin/akun",
    ringkas: "Tambah akun",
    tag: "FR-13 Akun (admin)",
    akses: "admin",
    body: AkunBuatSchema,
  },
  {
    metode: "patch",
    path: "/v1/admin/akun/:id",
    ringkas: "Ubah/nonaktifkan akun (sesi lama dicabut)",
    tag: "FR-13 Akun (admin)",
    akses: "admin",
    body: AkunPatchSchema,
  },
  {
    metode: "delete",
    path: "/v1/admin/akun/:id",
    ringkas: "Hapus akun beserta data belajarnya",
    tag: "FR-13 Akun (admin)",
    akses: "admin",
  },
  {
    metode: "post",
    path: "/v1/riwayat",
    ringkas: "Catat bagian yang dipelajari",
    tag: "FR-14 Riwayat",
    akses: "user",
    body: CatatRiwayatSchema,
  },
  {
    metode: "patch",
    path: "/v1/riwayat/:id/tutup",
    ringkas: "Tutup entri; durasi dihitung server",
    tag: "FR-14 Riwayat",
    akses: "user",
  },
  {
    metode: "get",
    path: "/v1/riwayat",
    ringkas: "Riwayat + rekap per bagian tubuh",
    tag: "FR-14 Riwayat",
    akses: "user",
  },
  {
    metode: "post",
    path: "/v1/umpan-balik",
    ringkas: "Kirim kuesioner SUS (10 butir); skor dihitung server",
    tag: "FR-15 SUS",
    akses: "user",
    body: UmpanBalikSchema,
  },
  {
    metode: "get",
    path: "/v1/umpan-balik/saya",
    ringkas: "Kuesioner SUS milik sendiri",
    tag: "FR-15 SUS",
    akses: "user",
  },
  {
    metode: "get",
    path: "/v1/admin/umpan-balik",
    ringkas: "Daftar seluruh kiriman SUS",
    tag: "FR-15 SUS",
    akses: "admin",
  },
  {
    metode: "get",
    path: "/v1/admin/umpan-balik/ringkasan",
    ringkas: "Ringkasan SUS dibanding target 68",
    tag: "FR-15 SUS",
    akses: "admin",
  },
  {
    metode: "get",
    path: "/v1/sekolah",
    ringkas: "Cari sekolah (?q=&bentuk=SMP|SMA|SMK&limit=)",
    tag: "Profil",
    akses: "user",
  },
  {
    metode: "get",
    path: "/v1/tugas",
    ringkas: "Daftar tugas belajar + status pengguna",
    tag: "Tugas belajar",
    akses: "user",
  },
  {
    metode: "get",
    path: "/v1/tugas/progres",
    ringkas: "Progres belajar (tugas selesai, skor)",
    tag: "Tugas belajar",
    akses: "user",
  },
  {
    metode: "get",
    path: "/v1/tugas/:id",
    ringkas: "Isi tugas (soal tanpa kunci / langkah simulasi)",
    tag: "Tugas belajar",
    akses: "user",
  },
  {
    metode: "post",
    path: "/v1/tugas/:id/percobaan",
    ringkas: "Kirim jawaban; dinilai server",
    tag: "Tugas belajar",
    akses: "user",
  },
  {
    metode: "get",
    path: "/v1/admin/tugas",
    ringkas: "Tugas beserta kunci jawaban",
    tag: "Tugas belajar",
    akses: "admin",
  },
  {
    metode: "post",
    path: "/v1/admin/tugas/:id/soal",
    ringkas: "Tambah soal kuis",
    tag: "Tugas belajar",
    akses: "admin",
  },
  { metode: "patch", path: "/v1/admin/soal/:id", ringkas: "Ubah soal kuis", tag: "Tugas belajar", akses: "admin" },
  { metode: "delete", path: "/v1/admin/soal/:id", ringkas: "Hapus soal kuis", tag: "Tugas belajar", akses: "admin" },
];

const kunciRute = (metode: string, path: string) => `${metode.toUpperCase()} ${path}`;
export const KUNCI_TERDOKUMENTASI = new Set([
  ...RUTE.map((r) => kunciRute(r.metode, r.path)),
  "GET /openapi.json",
  "GET /docs",
  "GET /files/*",
]);

export function bangunOpenApi() {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const r of RUTE) {
    const path = r.path.replace(/:(\w+)/g, "{$1}");
    const parameter = [...r.path.matchAll(/:(\w+)/g)].map((m) => ({
      name: m[1],
      in: "path",
      required: true,
      schema: { type: "integer", minimum: 1 },
    }));
    const op: Record<string, unknown> = {
      summary: r.ringkas,
      tags: [r.tag],
      ...(parameter.length ? { parameters: parameter } : {}),
      ...(r.akses === "publik" ? {} : { security: [{ bearerAuth: [] }] }),
      "x-akses":
        r.akses === "admin"
          ? "Administrator"
          : r.akses === "user"
            ? r.tanpaProfil
              ? "Pengguna masuk"
              : "Pengguna masuk dengan profil lengkap"
            : "Publik",
      responses: {
        "200": { description: "Berhasil" },
        ...(r.akses === "publik" ? {} : { "401": { description: "Token tidak ada / tidak sah / dicabut" } }),
        ...(r.akses === "admin" ? { "403": { description: "Bukan administrator" } } : {}),
        ...(r.body ? { "400": { description: "Validasi gagal: {pesan, kode}" } } : {}),
      },
    };
    if (r.body)
      op.requestBody = {
        required: true,
        content: { "application/json": { schema: z.toJSONSchema(r.body, { io: "input", unrepresentable: "any" }) } },
      };
    if (r.multipart) {
      op.requestBody = {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              required: [r.multipart],
              properties: { [r.multipart]: { type: "string", format: "binary" } },
            },
          },
        },
      };
    }
    const entri = paths[path] ?? {};
    paths[path] = entri;
    entri[r.metode] = op;
  }
  return {
    openapi: "3.1.0",
    info: {
      title: "ARnatomy Backend API",
      version: "0.1.0",
      description:
        "REST API ARnatomy (SKPL v1.0). Galat berbentuk {pesan, kode}. Token JWT dikirim sebagai Authorization: Bearer. RBAC dua peran: User (siswa/guru) dan Admin.",
    },
    /* relatif: "Try it out" di /docs memanggil server yang sama dengan halamannya */
    servers: [{ url: "/" }],
    components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } } },
    paths,
  };
}
