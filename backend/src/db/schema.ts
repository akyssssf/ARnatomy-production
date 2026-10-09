/* ==========================================================================
   schema.ts — Skema basis data ARnatomy (PostgreSQL) via Drizzle ORM.
   Sumber: kamus data dan PDM SKPL Bab VI, dilengkapi tabel yang dibutuhkan
   FR-12 (aset_model) dan FR-15 (umpan_balik, sus_jawaban). 19 tabel (15 SKPL + 4 tugas belajar: tugas, soal_kuis, langkah_simulasi, percobaan_tugas); 15 tabel pertama sama
   dengan PDM pada berkas Pemberkasan Sistem Blok. Kolom tambahan pada users
   untuk login Google dan pencabutan token: google_sub, profil_lengkap,
   token_versi; password_hash boleh kosong bagi akun yang hanya memakai Google.
   ========================================================================== */
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

const waktu = (nama: string) => timestamp(nama, { withTimezone: true, mode: "date" });

export const users = pgTable(
  "users",
  {
    id_user: serial("id_user").primaryKey(),
    nama: varchar("nama", { length: 100 }).notNull(),
    email: varchar("email", { length: 150 }).notNull().unique(),
    password_hash: text("password_hash"),
    role: varchar("role", { length: 10 }).notNull().default("siswa"),
    asal_sekolah: varchar("asal_sekolah", { length: 150 }),
    aktif: boolean("aktif").notNull().default(true),
    google_sub: varchar("google_sub", { length: 64 }).unique(),
    profil_lengkap: boolean("profil_lengkap").notNull().default(true),
    token_versi: integer("token_versi").notNull().default(0),
    /* NPSN sekolah bila dipilih dari daftar resmi; kosong bila pengguna menulis sendiri */
    npsn_sekolah: varchar("npsn_sekolah", { length: 12 }),
    created_at: waktu("created_at").notNull().defaultNow(),
  },
  (t) => [
    check("users_role_ck", sql`${t.role} IN ('siswa','guru','admin')`),
    check("users_masuk_ck", sql`${t.password_hash} IS NOT NULL OR ${t.google_sub} IS NOT NULL`),
  ],
);

export const organs = pgTable(
  "organs",
  {
    id_organ: serial("id_organ").primaryKey(),
    nama_organ: varchar("nama_organ", { length: 100 }).notNull(),
    sistem_organ: varchar("sistem_organ", { length: 100 }).notNull(),
    julukan: varchar("julukan", { length: 100 }).notNull(),
    file_model_3d: varchar("file_model_3d", { length: 255 }).notNull(),
    gambar: varchar("gambar", { length: 255 }).notNull(),
    deskripsi: text("deskripsi").notNull(),
    created_at: waktu("created_at").notNull().defaultNow(),
  },
  (t) => [check("organs_model_ck", sql`${t.file_model_3d} LIKE '%.glb'`)],
);

export const organ_fakta = pgTable("organ_fakta", {
  id_fakta: serial("id_fakta").primaryKey(),
  id_organ: integer("id_organ")
    .notNull()
    .references(() => organs.id_organ, { onDelete: "cascade" }),
  label: varchar("label", { length: 60 }).notNull(),
  nilai: varchar("nilai", { length: 160 }).notNull(),
});

export const sistem_organ = pgTable(
  "sistem_organ",
  {
    id_sistem: serial("id_sistem").primaryKey(),
    nama: varchar("nama", { length: 100 }).notNull(),
    id_organ: integer("id_organ").references(() => organs.id_organ, { onDelete: "set null" }),
    status: varchar("status", { length: 10 }).notNull(),
    organ: varchar("organ", { length: 60 }).notNull(),
    gambar: varchar("gambar", { length: 255 }).notNull(),
  },
  (t) => [check("sistem_organ_status_ck", sql`${t.status} IN ('tersedia','segera')`)],
);

export const layers = pgTable(
  "layers",
  {
    id_layer: serial("id_layer").primaryKey(),
    id_organ: integer("id_organ")
      .notNull()
      .references(() => organs.id_organ, { onDelete: "cascade" }),
    nama_layer: varchar("nama_layer", { length: 12 }).notNull(),
    label: varchar("label", { length: 40 }).notNull(),
    urutan_tampil: smallint("urutan_tampil").notNull(),
  },
  (t) => [
    uniqueIndex("layers_organ_nama_uq").on(t.id_organ, t.nama_layer),
    check("layers_nama_ck", sql`${t.nama_layer} IN ('kulit','otot','tulang','organ_dalam')`),
    check("layers_urutan_ck", sql`${t.urutan_tampil} >= 1`),
  ],
);

/** FR-12: satu model aktif per organ yang diunggah admin; berkasnya ada di object storage. */
export const aset_model = pgTable(
  "aset_model",
  {
    id_aset: serial("id_aset").primaryKey(),
    id_organ: integer("id_organ")
      .notNull()
      .unique()
      .references(() => organs.id_organ, { onDelete: "cascade" }),
    nama_berkas: varchar("nama_berkas", { length: 255 }).notNull(),
    ukuran_byte: integer("ukuran_byte").notNull(),
    versi: integer("versi").notNull().default(1),
    kunci_penyimpanan: varchar("kunci_penyimpanan", { length: 255 }).notNull(),
    url_penyimpanan: text("url_penyimpanan").notNull(),
    waktu_unggah: waktu("waktu_unggah").notNull().defaultNow(),
  },
  (t) => [
    check("aset_model_ukuran_ck", sql`${t.ukuran_byte} >= 0`),
    check("aset_model_versi_ck", sql`${t.versi} >= 1`),
  ],
);

export const body_parts = pgTable(
  "body_parts",
  {
    id_bagian: serial("id_bagian").primaryKey(),
    id_organ: integer("id_organ")
      .notNull()
      .references(() => organs.id_organ, { onDelete: "cascade" }),
    parent_bagian_id: integer("parent_bagian_id").references((): AnyPgColumn => body_parts.id_bagian, {
      onDelete: "set null",
    }),
    nama_bagian_internal: varchar("nama_bagian_internal", { length: 100 }).notNull(),
    posisi_koordinat_3d: varchar("posisi_koordinat_3d", { length: 100 }).notNull(),
    posisi_2d: varchar("posisi_2d", { length: 20 }).notNull(),
  },
  (t) => [
    index("idx_body_parts_organ").on(t.id_organ),
    check(
      "body_parts_3d_ck",
      sql`${t.posisi_koordinat_3d} ~ '^-?[0-9]+(\\.[0-9]+)?,-?[0-9]+(\\.[0-9]+)?,-?[0-9]+(\\.[0-9]+)?$'`,
    ),
    check("body_parts_2d_ck", sql`${t.posisi_2d} ~ '^[0-9]+(\\.[0-9]+)?,[0-9]+(\\.[0-9]+)?$'`),
  ],
);

export const bagian_fakta = pgTable("bagian_fakta", {
  id_fakta: serial("id_fakta").primaryKey(),
  id_bagian: integer("id_bagian")
    .notNull()
    .references(() => body_parts.id_bagian, { onDelete: "cascade" }),
  label: varchar("label", { length: 60 }).notNull(),
  nilai: varchar("nilai", { length: 160 }).notNull(),
});

export const bagian_mesh = pgTable("bagian_mesh", {
  id_mesh: serial("id_mesh").primaryKey(),
  id_bagian: integer("id_bagian")
    .notNull()
    .references(() => body_parts.id_bagian, { onDelete: "cascade" }),
  pola_node: varchar("pola_node", { length: 120 }).notNull(),
});

export const part_content = pgTable(
  "part_content",
  {
    id_konten: serial("id_konten").primaryKey(),
    id_bagian: integer("id_bagian")
      .notNull()
      .references(() => body_parts.id_bagian, { onDelete: "cascade" }),
    jenis_konten: varchar("jenis_konten", { length: 6 }).notNull(),
    judul_tampil: varchar("judul_tampil", { length: 120 }).notNull(),
    deskripsi: text("deskripsi").notNull(),
    status_tampilan: varchar("status_tampilan", { length: 6 }).notNull(),
    status_validasi: varchar("status_validasi", { length: 12 }).notNull().default("draft"),
  },
  (t) => [
    uniqueIndex("part_content_bagian_jenis_uq").on(t.id_bagian, t.jenis_konten),
    index("idx_part_content_bagian").on(t.id_bagian),
    check("part_content_jenis_ck", sql`${t.jenis_konten} IN ('dasar','dimmed')`),
    check("part_content_tampilan_ck", sql`${t.status_tampilan} IN ('aktif','dimmed')`),
    check("part_content_validasi_ck", sql`${t.status_validasi} IN ('draft','tervalidasi')`),
    check("part_content_judul_ck", sql`char_length(${t.judul_tampil}) >= 3`),
    check("part_content_deskripsi_ck", sql`char_length(${t.deskripsi}) >= 20`),
  ],
);

export const learning_history = pgTable(
  "learning_history",
  {
    id_riwayat: serial("id_riwayat").primaryKey(),
    id_user: integer("id_user")
      .notNull()
      .references(() => users.id_user, { onDelete: "cascade" }),
    id_bagian: integer("id_bagian")
      .notNull()
      .references(() => body_parts.id_bagian, { onDelete: "cascade" }),
    jenis_konten: varchar("jenis_konten", { length: 6 }).notNull(),
    waktu_akses: waktu("waktu_akses").notNull().defaultNow(),
    durasi: integer("durasi"),
  },
  (t) => [
    index("idx_learning_history_user_waktu").on(t.id_user, t.waktu_akses),
    index("idx_learning_history_bagian").on(t.id_bagian),
    check("learning_history_jenis_ck", sql`${t.jenis_konten} IN ('dasar','dimmed')`),
    check("learning_history_durasi_ck", sql`${t.durasi} IS NULL OR ${t.durasi} >= 0`),
  ],
);

export const ai_conversations = pgTable(
  "ai_conversations",
  {
    id_percakapan: serial("id_percakapan").primaryKey(),
    id_user: integer("id_user")
      .notNull()
      .references(() => users.id_user, { onDelete: "cascade" }),
    id_bagian: integer("id_bagian").references(() => body_parts.id_bagian, { onDelete: "set null" }),
    pertanyaan: varchar("pertanyaan", { length: 500 }).notNull(),
    jawaban: text("jawaban").notNull(),
    waktu: waktu("waktu").notNull().defaultNow(),
  },
  (t) => [index("idx_ai_conversations_user_waktu").on(t.id_user, t.waktu)],
);

export const laporan_kesalahan = pgTable(
  "laporan_kesalahan",
  {
    id_laporan: serial("id_laporan").primaryKey(),
    id_user: integer("id_user")
      .notNull()
      .references(() => users.id_user, { onDelete: "cascade" }),
    id_konten: integer("id_konten")
      .notNull()
      .references(() => part_content.id_konten, { onDelete: "cascade" }),
    deskripsi_laporan: text("deskripsi_laporan").notNull(),
    status_tindak_lanjut: varchar("status_tindak_lanjut", { length: 16 }).notNull().default("baru"),
    waktu: waktu("waktu").notNull().defaultNow(),
  },
  (t) => [
    index("idx_laporan_status").on(t.status_tindak_lanjut, t.waktu),
    index("idx_laporan_konten").on(t.id_konten),
    check("laporan_status_ck", sql`${t.status_tindak_lanjut} IN ('baru','ditindaklanjuti')`),
    check("laporan_deskripsi_ck", sql`char_length(${t.deskripsi_laporan}) >= 10`),
  ],
);

export const umpan_balik = pgTable(
  "umpan_balik",
  {
    id_umpan_balik: serial("id_umpan_balik").primaryKey(),
    id_user: integer("id_user")
      .notNull()
      .unique()
      .references(() => users.id_user, { onDelete: "cascade" }),
    skor_sus: numeric("skor_sus", { precision: 4, scale: 1 }).notNull(),
    komentar: varchar("komentar", { length: 500 }),
    waktu: waktu("waktu").notNull().defaultNow(),
  },
  (t) => [check("umpan_balik_skor_ck", sql`${t.skor_sus} BETWEEN 0 AND 100`)],
);

export const sus_jawaban = pgTable(
  "sus_jawaban",
  {
    id_umpan_balik: integer("id_umpan_balik")
      .notNull()
      .references(() => umpan_balik.id_umpan_balik, { onDelete: "cascade" }),
    no_butir: smallint("no_butir").notNull(),
    nilai: smallint("nilai").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.id_umpan_balik, t.no_butir] }),
    check("sus_butir_ck", sql`${t.no_butir} BETWEEN 1 AND 10`),
    check("sus_nilai_ck", sql`${t.nilai} BETWEEN 1 AND 5`),
  ],
);

/* ---- Tugas belajar (tambahan revisi SKPL): kuis, simulasi alur, dan (kelak) rakit organ.
   Hasil percobaan dinilai server dan menjadi bahan progres belajar pengguna. ---- */
export const tugas = pgTable(
  "tugas",
  {
    id_tugas: serial("id_tugas").primaryKey(),
    jenis: varchar("jenis", { length: 10 }).notNull(),
    id_organ: integer("id_organ").references(() => organs.id_organ, { onDelete: "set null" }),
    judul: varchar("judul", { length: 120 }).notNull(),
    deskripsi: text("deskripsi").notNull(),
    ambang: smallint("ambang").notNull().default(70),
    aktif: boolean("aktif").notNull().default(true),
  },
  (t) => [
    check("tugas_jenis_ck", sql`${t.jenis} IN ('kuis','simulasi','rakit')`),
    check("tugas_ambang_ck", sql`${t.ambang} BETWEEN 1 AND 100`),
  ],
);

export const soal_kuis = pgTable(
  "soal_kuis",
  {
    id_soal: serial("id_soal").primaryKey(),
    id_tugas: integer("id_tugas")
      .notNull()
      .references(() => tugas.id_tugas, { onDelete: "cascade" }),
    urutan: smallint("urutan").notNull(),
    pertanyaan: varchar("pertanyaan", { length: 300 }).notNull(),
    pilihan: jsonb("pilihan").$type<string[]>().notNull(),
    jawaban_benar: smallint("jawaban_benar").notNull(),
    penjelasan: text("penjelasan").notNull(),
  },
  (t) => [
    uniqueIndex("uq_soal_tugas_urutan").on(t.id_tugas, t.urutan),
    check("soal_jawaban_ck", sql`${t.jawaban_benar} >= 0`),
  ],
);

export const langkah_simulasi = pgTable(
  "langkah_simulasi",
  {
    id_langkah: serial("id_langkah").primaryKey(),
    id_tugas: integer("id_tugas")
      .notNull()
      .references(() => tugas.id_tugas, { onDelete: "cascade" }),
    urutan: smallint("urutan").notNull(),
    kode: varchar("kode", { length: 40 }).notNull(),
    judul: varchar("judul", { length: 80 }).notNull(),
    deskripsi: text("deskripsi").notNull(),
    id_bagian: integer("id_bagian").references(() => body_parts.id_bagian, { onDelete: "set null" }),
  },
  (t) => [uniqueIndex("uq_langkah_tugas_urutan").on(t.id_tugas, t.urutan)],
);

export const percobaan_tugas = pgTable(
  "percobaan_tugas",
  {
    id_percobaan: serial("id_percobaan").primaryKey(),
    id_user: integer("id_user")
      .notNull()
      .references(() => users.id_user, { onDelete: "cascade" }),
    id_tugas: integer("id_tugas")
      .notNull()
      .references(() => tugas.id_tugas, { onDelete: "cascade" }),
    skor: smallint("skor").notNull(),
    benar: smallint("benar").notNull(),
    total: smallint("total").notNull(),
    jawaban: jsonb("jawaban").$type<number[]>().notNull(),
    waktu: waktu("waktu").notNull().defaultNow(),
  },
  (t) => [
    index("idx_percobaan_user_tugas").on(t.id_user, t.id_tugas),
    check("percobaan_skor_ck", sql`${t.skor} BETWEEN 0 AND 100`),
  ],
);

/* Daftar sekolah (SMP, SMA, SMK) dari data Kemdikbud, dipakai untuk memilih asal sekolah di profil. */
export const sekolah = pgTable(
  "sekolah",
  {
    npsn: varchar("npsn", { length: 12 }).primaryKey(),
    nama: varchar("nama", { length: 200 }).notNull(),
    bentuk: varchar("bentuk", { length: 10 }).notNull(),
    status: varchar("status", { length: 1 }).notNull(),
    kabupaten_kota: varchar("kabupaten_kota", { length: 80 }).notNull(),
    provinsi: varchar("provinsi", { length: 80 }).notNull(),
    kecamatan: varchar("kecamatan", { length: 80 }).notNull(),
  },
  (t) => [index("idx_sekolah_nama").on(t.nama), index("idx_sekolah_kabkota").on(t.kabupaten_kota)],
);
