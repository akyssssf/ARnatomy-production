/* ==========================================================================
   schemas.ts — Skema validasi masukan (Zod). Pesan galat berbahasa Indonesia
   mengikuti skema formulir pada aplikasi klien agar konsisten.
   ========================================================================== */
import { z } from "zod";

const email = z.string().trim().min(1, "Email wajib diisi.").pipe(z.email("Format email tidak valid."));
const sandi = z
  .string()
  .min(8, "Kata sandi minimal 8 karakter.")
  .regex(/[A-Za-z]/, "Kata sandi harus memuat huruf.")
  .regex(/\d/, "Kata sandi harus memuat angka.");
const nama = z.string().trim().min(3, "Nama minimal 3 karakter.").max(80, "Nama terlalu panjang.");
const sekolah = z.string().trim().min(3, "Nama sekolah minimal 3 karakter.").max(120, "Nama sekolah terlalu panjang.");

export const PeranSchema = z.enum(["siswa", "guru", "admin"]);
export const PeranDaftarSchema = z.enum(["siswa", "guru"]);
export type Peran = z.infer<typeof PeranSchema>;

/** FR-02: peran admin tidak pernah diterima dari pendaftaran publik. */
export const DaftarSchema = z.object({ nama, email, password: sandi, role: PeranDaftarSchema, asal_sekolah: sekolah });
export const LoginSchema = z.object({ email, password: z.string().min(1, "Kata sandi wajib diisi.") });
export const RefreshSchema = z.object({ refresh_token: z.string().min(1, "refresh_token wajib diisi.") });
/** nonce opsional: bila dikirim klien, harus sama dengan klaim nonce di ID token (mencegah pemakaian ulang token curian). */
export const GoogleSchema = z.object({
  id_token: z.string().min(20, "id_token tidak valid."),
  nonce: z.string().min(8).max(200).optional(),
});
/** Melengkapi profil akun Google (FR-02): peran dan sekolah. */
export const ProfilSchema = z
  .object({
    role: PeranDaftarSchema,
    /** Tulis sendiri bila sekolah tidak ada di daftar */
    asal_sekolah: sekolah.optional(),
    /** NPSN sekolah yang dipilih dari daftar resmi (diutamakan) */
    npsn: z
      .string()
      .trim()
      .regex(/^\d{6,12}$/, "NPSN tidak valid.")
      .optional(),
  })
  .refine((d) => d.npsn !== undefined || d.asal_sekolah !== undefined, {
    path: ["asal_sekolah"],
    message: "Pilih sekolah dari daftar atau tulis nama sekolah.",
  });
export const GantiSandiSchema = z.object({ sandi_lama: z.string().min(1), sandi_baru: sandi });

/** FR-13: admin menambah / mengubah akun. */
export const AkunBuatSchema = z.object({
  nama,
  email,
  password: sandi,
  role: PeranSchema,
  asal_sekolah: z
    .string()
    .trim()
    .max(120, "Nama sekolah terlalu panjang.")
    .transform((v) => (v ? v : null)),
});
export const AkunPatchSchema = AkunBuatSchema.partial()
  .extend({ aktif: z.boolean().optional(), password: sandi.or(z.literal("")).optional() })
  .refine((d) => Object.keys(d).length > 0, "Tidak ada perubahan.");

export const JenisKontenSchema = z.enum(["dasar", "dimmed"]);
export const StatusValidasiSchema = z.enum(["draft", "tervalidasi"]);
/** FR-10: admin menyusun/mengedit/mempublikasikan konten. */
export const KontenPatchSchema = z
  .object({
    judul_tampil: z.string().trim().min(3, "Judul minimal 3 karakter.").max(120),
    deskripsi: z.string().trim().min(20, "Deskripsi minimal 20 karakter."),
    status_validasi: StatusValidasiSchema,
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, "Tidak ada perubahan.");

/** FR-10: admin menyusun label baru untuk sebuah bagian tubuh (satu label dasar dan satu dimmed per bagian). */
export const KontenBuatSchema = z.object({
  id_bagian: z.number().int().positive(),
  jenis_konten: JenisKontenSchema,
  judul_tampil: z.string().trim().min(3, "Judul minimal 3 karakter.").max(120),
  deskripsi: z.string().trim().min(20, "Deskripsi minimal 20 karakter."),
  status_validasi: StatusValidasiSchema.default("draft"),
});

export const LaporanSchema = z.object({
  id_konten: z.coerce.number().int().positive("Pilih label yang dilaporkan."),
  deskripsi_laporan: z.string().trim().min(10, "Uraian minimal 10 karakter."),
});

export const PertanyaanSchema = z.object({
  pertanyaan: z.string().trim().min(1, "Tulis pertanyaan terlebih dahulu.").max(500, "Pertanyaan terlalu panjang."),
  id_bagian: z.number().int().positive().nullable().default(null),
  /** Gaya bahasa jawaban (kontrak RAG): SMP (bawaan) atau SMA */
  jenjang: z.enum(["SMP", "SMA"]).optional(),
});
export const KlasifikasiSchema = z.object({
  pertanyaan: z.string().trim().min(1, "Tulis pertanyaan terlebih dahulu.").max(500, "Pertanyaan terlalu panjang."),
});

export const CatatRiwayatSchema = z.object({ id_bagian: z.number().int().positive(), jenis_konten: JenisKontenSchema });

export const UmpanBalikSchema = z.object({
  jawaban: z.array(z.number().int().min(1).max(5)).length(10, "Jawab semua 10 pernyataan."),
  komentar: z.string().trim().max(500, "Komentar maksimal 500 karakter.").optional(),
});

export const BATAS_UKURAN_MODEL = 15 * 1024 * 1024;

/** Id dari segmen URL; null bila bukan bilangan bulat positif. */
export function idDariParam(nilai: string | undefined): number | null {
  const n = Number(nilai);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Tugas belajar: jawaban satu percobaan. Kuis = indeks pilihan per soal (-1 = tidak dijawab);
    simulasi = urutan id_langkah menurut jawaban pengguna. */
export const PercobaanSchema = z.object({
  jawaban: z.array(z.number().int().min(-1)).min(1, "Jawaban kosong.").max(100),
});

/** Admin menyusun/mengubah soal kuis. */
export const SoalBuatSchema = z
  .object({
    pertanyaan: z.string().trim().min(10, "Pertanyaan minimal 10 karakter.").max(300),
    pilihan: z.array(z.string().trim().min(1).max(200)).min(2, "Minimal 2 pilihan.").max(6, "Maksimal 6 pilihan."),
    jawaban_benar: z.number().int().min(0),
    penjelasan: z.string().trim().min(10, "Penjelasan minimal 10 karakter."),
  })
  .refine((d) => d.jawaban_benar < d.pilihan.length, {
    path: ["jawaban_benar"],
    message: "Jawaban benar di luar pilihan.",
  });
export const SoalPatchSchema = z
  .object({
    pertanyaan: z.string().trim().min(10).max(300),
    pilihan: z.array(z.string().trim().min(1).max(200)).min(2).max(6),
    jawaban_benar: z.number().int().min(0),
    penjelasan: z.string().trim().min(10),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, "Tidak ada perubahan.");
