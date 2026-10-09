/* ==========================================================================
   schemas.ts — Skema Zod untuk seluruh entitas (kamus data SKPL Bab VI)
   dan skema formulir. Tipe TypeScript diturunkan lewat z.infer sehingga
   satu sumber kebenaran untuk validasi runtime maupun pengecekan tipe.
   Dipakai di tiga tempat: seed data, Route Handler (validasi body),
   dan klien (validasi respons API sebelum masuk cache TanStack Query).
   ========================================================================== */
import { z } from "zod";

/* ---------------- Branded ID ----------------
   Setiap jenis id diberi "merek" (brand) sehingga id_user tidak bisa
   tertukar dengan id_bagian pada level tipe, walau keduanya number di runtime.
   Nilai bermerek hanya lahir dari parse skema (atau dari data yang sudah diparse). */
const idPositif = () => z.number().int().positive();
export const UserIdSchema = idPositif().brand<"UserId">();
export const OrganIdSchema = idPositif().brand<"OrganId">();
export const BagianIdSchema = idPositif().brand<"BagianId">();
export const KontenIdSchema = idPositif().brand<"KontenId">();
export const RiwayatIdSchema = idPositif().brand<"RiwayatId">();
export const PercakapanIdSchema = idPositif().brand<"PercakapanId">();
export const LaporanIdSchema = idPositif().brand<"LaporanId">();
export const UmpanBalikIdSchema = idPositif().brand<"UmpanBalikId">();
export type UserId = z.infer<typeof UserIdSchema>;
export type OrganId = z.infer<typeof OrganIdSchema>;
export type BagianId = z.infer<typeof BagianIdSchema>;
export type KontenId = z.infer<typeof KontenIdSchema>;
export type RiwayatId = z.infer<typeof RiwayatIdSchema>;
export type PercakapanId = z.infer<typeof PercakapanIdSchema>;
export type LaporanId = z.infer<typeof LaporanIdSchema>;
export type UmpanBalikId = z.infer<typeof UmpanBalikIdSchema>;

/* ---------------- Entitas master ---------------- */
export const PeranSchema = z.enum(["siswa", "guru", "admin"]);
export type Peran = z.infer<typeof PeranSchema>;

export const UserSchema = z.object({
  id_user: UserIdSchema,
  nama: z.string().min(1),
  email: z.email(),
  password: z.string().min(1),
  role: PeranSchema,
  asal_sekolah: z.string().nullable(),
  /* FR-13: admin dapat menonaktifkan akun; akun nonaktif ditolak saat login */
  aktif: z.boolean().default(true),
});
export type User = z.infer<typeof UserSchema>;

/** Data sesi yang disimpan di cookie: tanpa password dan tanpa bendera aktif
    (status aktif diperiksa ulang ke basis data pada tiap permintaan). */
export const SesiUserSchema = UserSchema.omit({ password: true, aktif: true }).extend({
  /* Hanya diisi backend nyata: akun Google baru wajib melengkapi peran + sekolah dulu */
  profil_lengkap: z.boolean().optional(),
});
export type SesiUser = z.infer<typeof SesiUserSchema>;

/** Baris akun untuk dashboard admin (FR-13): tanpa password. */
export const AkunSchema = UserSchema.omit({ password: true });
export type Akun = z.infer<typeof AkunSchema>;

export const StatusSistemSchema = z.enum(["tersedia", "segera"]);
export const SistemOrganSchema = z.object({
  id_sistem: z.number().int().positive(),
  nama: z.string().min(1),
  id_organ: OrganIdSchema.nullable(),
  status: StatusSistemSchema,
  organ: z.string().min(1),
  gambar: z.string().startsWith("/"),
});
export type SistemOrgan = z.infer<typeof SistemOrganSchema>;

export const FaktaSchema = z.object({ label: z.string().min(1), nilai: z.string().min(1) });
export type Fakta = z.infer<typeof FaktaSchema>;

export const OrganSchema = z.object({
  id_organ: OrganIdSchema,
  nama_organ: z.string().min(1),
  sistem_organ: z.string().min(1),
  julukan: z.string().min(1),
  file_model_3d: z.string().endsWith(".glb"),
  gambar: z.string().startsWith("/"),
  deskripsi: z.string().min(20),
  fakta: z.array(FaktaSchema),
});
export type Organ = z.infer<typeof OrganSchema>;

export const NamaLayerSchema = z.enum(["kulit", "otot", "tulang", "organ_dalam"]);
export type NamaLayer = z.infer<typeof NamaLayerSchema>;

export const LayerSchema = z.object({
  id_layer: z.number().int().positive(),
  id_organ: OrganIdSchema,
  nama_layer: NamaLayerSchema,
  label: z.string().min(1),
  urutan_tampil: z.number().int().min(1),
});
export type Layer = z.infer<typeof LayerSchema>;

/* posisi_koordinat_3d tetap berformat "x,y,z" sesuai SKPL */
const POLA_KOORDINAT_3D = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/;
const POLA_KOORDINAT_2D = /^\d+(\.\d+)?,\d+(\.\d+)?$/;

export const BodyPartSchema = z.object({
  id_bagian: BagianIdSchema,
  id_organ: OrganIdSchema,
  nama_bagian_internal: z.string().min(1),
  parent_bagian_id: BagianIdSchema.nullable(),
  posisi_koordinat_3d: z.string().regex(POLA_KOORDINAT_3D, "format harus x,y,z"),
  posisi_2d: z.string().regex(POLA_KOORDINAT_2D, "format harus x,y (persen)"),
  /* Pola nama node pada berkas .glb (boleh memakai *) yang membentuk bagian ini.
     Bila cocok, titik ditambatkan ke pusat mesh dan mesh itulah yang disorot;
     bila kosong/tidak cocok, posisi_koordinat_3d dipakai sebagai cadangan. */
  mesh_3d: z.array(z.string()).default([]),
  fakta: z.array(FaktaSchema),
});
export type BodyPart = z.infer<typeof BodyPartSchema>;

export const JenisKontenSchema = z.enum(["dasar", "dimmed"]);
export type JenisKonten = z.infer<typeof JenisKontenSchema>;
export const StatusValidasiSchema = z.enum(["draft", "tervalidasi"]);
export type StatusValidasi = z.infer<typeof StatusValidasiSchema>;

export const PartContentSchema = z.object({
  id_konten: KontenIdSchema,
  id_bagian: BagianIdSchema,
  jenis_konten: JenisKontenSchema,
  judul_tampil: z.string().min(3),
  deskripsi: z.string().min(20),
  status_tampilan: z.enum(["aktif", "dimmed"]),
  status_validasi: StatusValidasiSchema,
});
export type PartContent = z.infer<typeof PartContentSchema>;

/* ---------------- Entitas transaksional (server state) ----------------
   Waktu dikirim sebagai string ISO 8601 karena melewati JSON. */
export const LearningHistorySchema = z.object({
  id_riwayat: RiwayatIdSchema,
  id_user: UserIdSchema,
  id_bagian: BagianIdSchema,
  jenis_konten: JenisKontenSchema,
  waktu_akses: z.iso.datetime(),
  durasi: z.number().int().min(0).nullable(),
});
export type LearningHistory = z.infer<typeof LearningHistorySchema>;

export const AiConversationSchema = z.object({
  id_percakapan: PercakapanIdSchema,
  id_user: UserIdSchema,
  id_bagian: BagianIdSchema.nullable(),
  pertanyaan: z.string().min(1),
  jawaban: z.string().min(1),
  waktu: z.iso.datetime(),
});
export type AiConversation = z.infer<typeof AiConversationSchema>;

export const StatusTindakLanjutSchema = z.enum(["baru", "ditindaklanjuti"]);
export const LaporanKesalahanSchema = z.object({
  id_laporan: LaporanIdSchema,
  id_user: UserIdSchema,
  id_konten: KontenIdSchema,
  deskripsi_laporan: z.string().min(10),
  status_tindak_lanjut: StatusTindakLanjutSchema,
  waktu: z.iso.datetime(),
});
export type LaporanKesalahan = z.infer<typeof LaporanKesalahanSchema>;

/* FR-15: kuesioner System Usability Scale (10 pernyataan, skala Likert 1-5) */
export const JAWABAN_SUS = 10;
export const JawabanSusSchema = z
  .array(z.number().int().min(1).max(5))
  .length(JAWABAN_SUS, "Jawab semua 10 pernyataan.");
export const UmpanBalikSchema = z.object({
  id_umpan_balik: UmpanBalikIdSchema,
  id_user: UserIdSchema,
  jawaban: JawabanSusSchema,
  skor_sus: z.number().min(0).max(100),
  komentar: z.string().nullable(),
  waktu: z.iso.datetime(),
});
export type UmpanBalik = z.infer<typeof UmpanBalikSchema>;

/* ---------------- Skema formulir (input pengguna) ---------------- */
export const LoginFormSchema = z.object({
  email: z.string().trim().min(1, "Email wajib diisi.").pipe(z.email("Format email tidak valid.")),
  password: z.string().min(1, "Kata sandi wajib diisi."),
});
export type LoginForm = z.infer<typeof LoginFormSchema>;

/* FR-02: registrasi akun siswa/guru. Aturan sandi: minimal 8 karakter dengan
   huruf dan angka. Konfirmasi dicek lewat refine agar galat menempel ke field-nya. */
export const PeranDaftarSchema = z.enum(["siswa", "guru"]);
const SandiSchema = z
  .string()
  .min(8, "Kata sandi minimal 8 karakter.")
  .regex(/[A-Za-z]/, "Kata sandi harus memuat huruf.")
  .regex(/\d/, "Kata sandi harus memuat angka.");
export const DaftarFormSchema = z
  .object({
    nama: z.string().trim().min(3, "Nama minimal 3 karakter.").max(80, "Nama terlalu panjang."),
    email: z.string().trim().min(1, "Email wajib diisi.").pipe(z.email("Format email tidak valid.")),
    password: SandiSchema,
    konfirmasi: z.string().min(1, "Ulangi kata sandi."),
    role: PeranDaftarSchema,
    asal_sekolah: z
      .string()
      .trim()
      .min(3, "Nama sekolah minimal 3 karakter.")
      .max(120, "Nama sekolah terlalu panjang."),
  })
  .refine((d) => d.password === d.konfirmasi, { path: ["konfirmasi"], message: "Konfirmasi tidak sama." });
export type DaftarForm = z.infer<typeof DaftarFormSchema>;

/* FR-13: admin menambah / mengubah akun. Sandi wajib saat tambah, opsional saat ubah. */
export const AkunBuatSchema = z.object({
  nama: z.string().trim().min(3, "Nama minimal 3 karakter.").max(80, "Nama terlalu panjang."),
  email: z.string().trim().min(1, "Email wajib diisi.").pipe(z.email("Format email tidak valid.")),
  password: SandiSchema,
  role: PeranSchema,
  asal_sekolah: z
    .string()
    .trim()
    .max(120, "Nama sekolah terlalu panjang.")
    .transform((v) => (v ? v : null)),
});
export type AkunBuat = z.infer<typeof AkunBuatSchema>;
export const AkunPatchSchema = AkunBuatSchema.partial()
  .extend({ aktif: z.boolean().optional(), password: SandiSchema.or(z.literal("")).optional() })
  .refine((d) => Object.keys(d).length > 0, "Tidak ada perubahan.");
export type AkunPatch = z.infer<typeof AkunPatchSchema>;

/* FR-12: aset model 3D per organ. Satu model aktif per organ: bawaan (berkas
   statis public/models) atau unggahan admin yang disimpan di memori server. */
export const SumberAsetSchema = z.enum(["bawaan", "unggahan"]);
export const AsetModelSchema = z.object({
  id_organ: OrganIdSchema,
  nama_berkas: z.string().min(1),
  ukuran_byte: z.number().int().min(0),
  sumber: SumberAsetSchema,
  url: z.string().startsWith("/").endsWith(".glb"),
  versi: z.number().int().min(0),
  waktu: z.iso.datetime().nullable(),
});
export type AsetModel = z.infer<typeof AsetModelSchema>;
export const BATAS_UKURAN_MODEL = 15 * 1024 * 1024;

/* FR-15: kiriman kuesioner SUS */
export const UmpanBalikFormSchema = z.object({
  jawaban: JawabanSusSchema,
  komentar: z.string().trim().max(500, "Komentar maksimal 500 karakter.").optional(),
});
export type UmpanBalikForm = z.infer<typeof UmpanBalikFormSchema>;

export const LaporanFormSchema = z.object({
  id_konten: z.coerce.number().int().positive("Pilih label yang dilaporkan.").pipe(KontenIdSchema),
  deskripsi_laporan: z.string().trim().min(10, "Uraian minimal 10 karakter."),
});
export type LaporanForm = z.infer<typeof LaporanFormSchema>;

export const KontenFormSchema = z.object({
  judul_tampil: z.string().trim().min(3, "Judul minimal 3 karakter."),
  deskripsi: z.string().trim().min(20, "Deskripsi minimal 20 karakter."),
  status_validasi: StatusValidasiSchema,
});
export type KontenForm = z.infer<typeof KontenFormSchema>;

export const PertanyaanFormSchema = z.object({
  pertanyaan: z.string().trim().min(1, "Tulis pertanyaan terlebih dahulu.").max(500, "Pertanyaan terlalu panjang."),
  id_bagian: BagianIdSchema.nullable(),
});
export type PertanyaanForm = z.infer<typeof PertanyaanFormSchema>;

export const CatatRiwayatSchema = z.object({
  id_bagian: BagianIdSchema,
  jenis_konten: JenisKontenSchema,
});
export type CatatRiwayatInput = z.infer<typeof CatatRiwayatSchema>;

/* Bendera "simulasikan gagal" ikut dikirim ke endpoint supaya jalur error
   dapat diperagakan tanpa memutus koneksi sungguhan. */
export const OpsiSimulasiSchema = z.object({ simulasiGagal: z.boolean().optional() });

/* ---------------- Amplop respons API ---------------- */
export const RespGalatSchema = z.object({ pesan: z.string() });
export const RespLoginSchema = z.object({ user: SesiUserSchema });
export const RespOkSchema = z.object({ ok: z.literal(true) });
export const RespDaftarSchema = z.object({ user: SesiUserSchema });

/* ---------------- Utility Types ----------------
   Tipe turunan dari entitas di atas, bukan definisi ulang, sehingga tetap
   sinkron bila skema berubah. */
/** Ringkasan organ untuk pemilih/kartu: hanya kolom yang ditampilkan. */
export type OrganRingkas = Pick<Organ, "id_organ" | "nama_organ" | "gambar">;
/** Perubahan konten oleh admin: sebagian kolom, semuanya opsional. */
export type KontenPatch = Partial<Pick<PartContent, "judul_tampil" | "deskripsi" | "status_validasi">>;
/** Data pengguna yang aman dibagikan ke klien (tanpa password) — padanan TS dari SesiUserSchema. */
export type UserAman = Omit<User, "password">;
