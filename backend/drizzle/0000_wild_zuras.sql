CREATE TABLE "ai_conversations" (
	"id_percakapan" serial PRIMARY KEY NOT NULL,
	"id_user" integer NOT NULL,
	"id_bagian" integer,
	"pertanyaan" varchar(500) NOT NULL,
	"jawaban" text NOT NULL,
	"waktu" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aset_model" (
	"id_aset" serial PRIMARY KEY NOT NULL,
	"id_organ" integer NOT NULL,
	"nama_berkas" varchar(255) NOT NULL,
	"ukuran_byte" integer NOT NULL,
	"versi" integer DEFAULT 1 NOT NULL,
	"kunci_penyimpanan" varchar(255) NOT NULL,
	"url_penyimpanan" text NOT NULL,
	"waktu_unggah" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "aset_model_id_organ_unique" UNIQUE("id_organ"),
	CONSTRAINT "aset_model_ukuran_ck" CHECK ("aset_model"."ukuran_byte" >= 0),
	CONSTRAINT "aset_model_versi_ck" CHECK ("aset_model"."versi" >= 1)
);
--> statement-breakpoint
CREATE TABLE "bagian_fakta" (
	"id_fakta" serial PRIMARY KEY NOT NULL,
	"id_bagian" integer NOT NULL,
	"label" varchar(60) NOT NULL,
	"nilai" varchar(160) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bagian_mesh" (
	"id_mesh" serial PRIMARY KEY NOT NULL,
	"id_bagian" integer NOT NULL,
	"pola_node" varchar(120) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "body_parts" (
	"id_bagian" serial PRIMARY KEY NOT NULL,
	"id_organ" integer NOT NULL,
	"parent_bagian_id" integer,
	"nama_bagian_internal" varchar(100) NOT NULL,
	"posisi_koordinat_3d" varchar(100) NOT NULL,
	"posisi_2d" varchar(20) NOT NULL,
	CONSTRAINT "body_parts_3d_ck" CHECK ("body_parts"."posisi_koordinat_3d" ~ '^-?[0-9]+(\.[0-9]+)?,-?[0-9]+(\.[0-9]+)?,-?[0-9]+(\.[0-9]+)?$'),
	CONSTRAINT "body_parts_2d_ck" CHECK ("body_parts"."posisi_2d" ~ '^[0-9]+(\.[0-9]+)?,[0-9]+(\.[0-9]+)?$')
);
--> statement-breakpoint
CREATE TABLE "laporan_kesalahan" (
	"id_laporan" serial PRIMARY KEY NOT NULL,
	"id_user" integer NOT NULL,
	"id_konten" integer NOT NULL,
	"deskripsi_laporan" text NOT NULL,
	"status_tindak_lanjut" varchar(16) DEFAULT 'baru' NOT NULL,
	"waktu" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "laporan_status_ck" CHECK ("laporan_kesalahan"."status_tindak_lanjut" IN ('baru','ditindaklanjuti')),
	CONSTRAINT "laporan_deskripsi_ck" CHECK (char_length("laporan_kesalahan"."deskripsi_laporan") >= 10)
);
--> statement-breakpoint
CREATE TABLE "layers" (
	"id_layer" serial PRIMARY KEY NOT NULL,
	"id_organ" integer NOT NULL,
	"nama_layer" varchar(12) NOT NULL,
	"label" varchar(40) NOT NULL,
	"urutan_tampil" smallint NOT NULL,
	CONSTRAINT "layers_nama_ck" CHECK ("layers"."nama_layer" IN ('kulit','otot','tulang','organ_dalam')),
	CONSTRAINT "layers_urutan_ck" CHECK ("layers"."urutan_tampil" >= 1)
);
--> statement-breakpoint
CREATE TABLE "learning_history" (
	"id_riwayat" serial PRIMARY KEY NOT NULL,
	"id_user" integer NOT NULL,
	"id_bagian" integer NOT NULL,
	"jenis_konten" varchar(6) NOT NULL,
	"waktu_akses" timestamp with time zone DEFAULT now() NOT NULL,
	"durasi" integer,
	CONSTRAINT "learning_history_jenis_ck" CHECK ("learning_history"."jenis_konten" IN ('dasar','dimmed')),
	CONSTRAINT "learning_history_durasi_ck" CHECK ("learning_history"."durasi" IS NULL OR "learning_history"."durasi" >= 0)
);
--> statement-breakpoint
CREATE TABLE "organ_fakta" (
	"id_fakta" serial PRIMARY KEY NOT NULL,
	"id_organ" integer NOT NULL,
	"label" varchar(60) NOT NULL,
	"nilai" varchar(160) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organs" (
	"id_organ" serial PRIMARY KEY NOT NULL,
	"nama_organ" varchar(100) NOT NULL,
	"sistem_organ" varchar(100) NOT NULL,
	"julukan" varchar(100) NOT NULL,
	"file_model_3d" varchar(255) NOT NULL,
	"gambar" varchar(255) NOT NULL,
	"deskripsi" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organs_model_ck" CHECK ("organs"."file_model_3d" LIKE '%.glb')
);
--> statement-breakpoint
CREATE TABLE "part_content" (
	"id_konten" serial PRIMARY KEY NOT NULL,
	"id_bagian" integer NOT NULL,
	"jenis_konten" varchar(6) NOT NULL,
	"judul_tampil" varchar(120) NOT NULL,
	"deskripsi" text NOT NULL,
	"status_tampilan" varchar(6) NOT NULL,
	"status_validasi" varchar(12) DEFAULT 'draft' NOT NULL,
	CONSTRAINT "part_content_jenis_ck" CHECK ("part_content"."jenis_konten" IN ('dasar','dimmed')),
	CONSTRAINT "part_content_tampilan_ck" CHECK ("part_content"."status_tampilan" IN ('aktif','dimmed')),
	CONSTRAINT "part_content_validasi_ck" CHECK ("part_content"."status_validasi" IN ('draft','tervalidasi')),
	CONSTRAINT "part_content_judul_ck" CHECK (char_length("part_content"."judul_tampil") >= 3),
	CONSTRAINT "part_content_deskripsi_ck" CHECK (char_length("part_content"."deskripsi") >= 20)
);
--> statement-breakpoint
CREATE TABLE "sistem_organ" (
	"id_sistem" serial PRIMARY KEY NOT NULL,
	"nama" varchar(100) NOT NULL,
	"id_organ" integer,
	"status" varchar(10) NOT NULL,
	"organ" varchar(60) NOT NULL,
	"gambar" varchar(255) NOT NULL,
	CONSTRAINT "sistem_organ_status_ck" CHECK ("sistem_organ"."status" IN ('tersedia','segera'))
);
--> statement-breakpoint
CREATE TABLE "sus_jawaban" (
	"id_umpan_balik" integer NOT NULL,
	"no_butir" smallint NOT NULL,
	"nilai" smallint NOT NULL,
	CONSTRAINT "sus_jawaban_id_umpan_balik_no_butir_pk" PRIMARY KEY("id_umpan_balik","no_butir"),
	CONSTRAINT "sus_butir_ck" CHECK ("sus_jawaban"."no_butir" BETWEEN 1 AND 10),
	CONSTRAINT "sus_nilai_ck" CHECK ("sus_jawaban"."nilai" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "umpan_balik" (
	"id_umpan_balik" serial PRIMARY KEY NOT NULL,
	"id_user" integer NOT NULL,
	"skor_sus" numeric(4, 1) NOT NULL,
	"komentar" varchar(500),
	"waktu" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "umpan_balik_id_user_unique" UNIQUE("id_user"),
	CONSTRAINT "umpan_balik_skor_ck" CHECK ("umpan_balik"."skor_sus" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id_user" serial PRIMARY KEY NOT NULL,
	"nama" varchar(100) NOT NULL,
	"email" varchar(150) NOT NULL,
	"password_hash" text,
	"role" varchar(10) DEFAULT 'siswa' NOT NULL,
	"asal_sekolah" varchar(150),
	"aktif" boolean DEFAULT true NOT NULL,
	"google_sub" varchar(64),
	"profil_lengkap" boolean DEFAULT true NOT NULL,
	"token_versi" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_google_sub_unique" UNIQUE("google_sub"),
	CONSTRAINT "users_role_ck" CHECK ("users"."role" IN ('siswa','guru','admin')),
	CONSTRAINT "users_masuk_ck" CHECK ("users"."password_hash" IS NOT NULL OR "users"."google_sub" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_id_user_users_id_user_fk" FOREIGN KEY ("id_user") REFERENCES "public"."users"("id_user") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_id_bagian_body_parts_id_bagian_fk" FOREIGN KEY ("id_bagian") REFERENCES "public"."body_parts"("id_bagian") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aset_model" ADD CONSTRAINT "aset_model_id_organ_organs_id_organ_fk" FOREIGN KEY ("id_organ") REFERENCES "public"."organs"("id_organ") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bagian_fakta" ADD CONSTRAINT "bagian_fakta_id_bagian_body_parts_id_bagian_fk" FOREIGN KEY ("id_bagian") REFERENCES "public"."body_parts"("id_bagian") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bagian_mesh" ADD CONSTRAINT "bagian_mesh_id_bagian_body_parts_id_bagian_fk" FOREIGN KEY ("id_bagian") REFERENCES "public"."body_parts"("id_bagian") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "body_parts" ADD CONSTRAINT "body_parts_id_organ_organs_id_organ_fk" FOREIGN KEY ("id_organ") REFERENCES "public"."organs"("id_organ") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "body_parts" ADD CONSTRAINT "body_parts_parent_bagian_id_body_parts_id_bagian_fk" FOREIGN KEY ("parent_bagian_id") REFERENCES "public"."body_parts"("id_bagian") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "laporan_kesalahan" ADD CONSTRAINT "laporan_kesalahan_id_user_users_id_user_fk" FOREIGN KEY ("id_user") REFERENCES "public"."users"("id_user") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "laporan_kesalahan" ADD CONSTRAINT "laporan_kesalahan_id_konten_part_content_id_konten_fk" FOREIGN KEY ("id_konten") REFERENCES "public"."part_content"("id_konten") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "layers" ADD CONSTRAINT "layers_id_organ_organs_id_organ_fk" FOREIGN KEY ("id_organ") REFERENCES "public"."organs"("id_organ") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_history" ADD CONSTRAINT "learning_history_id_user_users_id_user_fk" FOREIGN KEY ("id_user") REFERENCES "public"."users"("id_user") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_history" ADD CONSTRAINT "learning_history_id_bagian_body_parts_id_bagian_fk" FOREIGN KEY ("id_bagian") REFERENCES "public"."body_parts"("id_bagian") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organ_fakta" ADD CONSTRAINT "organ_fakta_id_organ_organs_id_organ_fk" FOREIGN KEY ("id_organ") REFERENCES "public"."organs"("id_organ") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_content" ADD CONSTRAINT "part_content_id_bagian_body_parts_id_bagian_fk" FOREIGN KEY ("id_bagian") REFERENCES "public"."body_parts"("id_bagian") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sistem_organ" ADD CONSTRAINT "sistem_organ_id_organ_organs_id_organ_fk" FOREIGN KEY ("id_organ") REFERENCES "public"."organs"("id_organ") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sus_jawaban" ADD CONSTRAINT "sus_jawaban_id_umpan_balik_umpan_balik_id_umpan_balik_fk" FOREIGN KEY ("id_umpan_balik") REFERENCES "public"."umpan_balik"("id_umpan_balik") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "umpan_balik" ADD CONSTRAINT "umpan_balik_id_user_users_id_user_fk" FOREIGN KEY ("id_user") REFERENCES "public"."users"("id_user") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ai_conversations_user_waktu" ON "ai_conversations" USING btree ("id_user","waktu");--> statement-breakpoint
CREATE INDEX "idx_body_parts_organ" ON "body_parts" USING btree ("id_organ");--> statement-breakpoint
CREATE INDEX "idx_laporan_status" ON "laporan_kesalahan" USING btree ("status_tindak_lanjut","waktu");--> statement-breakpoint
CREATE INDEX "idx_laporan_konten" ON "laporan_kesalahan" USING btree ("id_konten");--> statement-breakpoint
CREATE UNIQUE INDEX "layers_organ_nama_uq" ON "layers" USING btree ("id_organ","nama_layer");--> statement-breakpoint
CREATE INDEX "idx_learning_history_user_waktu" ON "learning_history" USING btree ("id_user","waktu_akses");--> statement-breakpoint
CREATE INDEX "idx_learning_history_bagian" ON "learning_history" USING btree ("id_bagian");--> statement-breakpoint
CREATE UNIQUE INDEX "part_content_bagian_jenis_uq" ON "part_content" USING btree ("id_bagian","jenis_konten");--> statement-breakpoint
CREATE INDEX "idx_part_content_bagian" ON "part_content" USING btree ("id_bagian");