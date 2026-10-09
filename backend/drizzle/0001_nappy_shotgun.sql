CREATE TABLE "langkah_simulasi" (
	"id_langkah" serial PRIMARY KEY NOT NULL,
	"id_tugas" integer NOT NULL,
	"urutan" smallint NOT NULL,
	"kode" varchar(40) NOT NULL,
	"judul" varchar(80) NOT NULL,
	"deskripsi" text NOT NULL,
	"id_bagian" integer
);
--> statement-breakpoint
CREATE TABLE "percobaan_tugas" (
	"id_percobaan" serial PRIMARY KEY NOT NULL,
	"id_user" integer NOT NULL,
	"id_tugas" integer NOT NULL,
	"skor" smallint NOT NULL,
	"benar" smallint NOT NULL,
	"total" smallint NOT NULL,
	"jawaban" jsonb NOT NULL,
	"waktu" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "percobaan_skor_ck" CHECK ("percobaan_tugas"."skor" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE TABLE "soal_kuis" (
	"id_soal" serial PRIMARY KEY NOT NULL,
	"id_tugas" integer NOT NULL,
	"urutan" smallint NOT NULL,
	"pertanyaan" varchar(300) NOT NULL,
	"pilihan" jsonb NOT NULL,
	"jawaban_benar" smallint NOT NULL,
	"penjelasan" text NOT NULL,
	CONSTRAINT "soal_jawaban_ck" CHECK ("soal_kuis"."jawaban_benar" >= 0)
);
--> statement-breakpoint
CREATE TABLE "tugas" (
	"id_tugas" serial PRIMARY KEY NOT NULL,
	"jenis" varchar(10) NOT NULL,
	"id_organ" integer,
	"judul" varchar(120) NOT NULL,
	"deskripsi" text NOT NULL,
	"ambang" smallint DEFAULT 70 NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL,
	CONSTRAINT "tugas_jenis_ck" CHECK ("tugas"."jenis" IN ('kuis','simulasi','rakit')),
	CONSTRAINT "tugas_ambang_ck" CHECK ("tugas"."ambang" BETWEEN 1 AND 100)
);
--> statement-breakpoint
ALTER TABLE "langkah_simulasi" ADD CONSTRAINT "langkah_simulasi_id_tugas_tugas_id_tugas_fk" FOREIGN KEY ("id_tugas") REFERENCES "public"."tugas"("id_tugas") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "langkah_simulasi" ADD CONSTRAINT "langkah_simulasi_id_bagian_body_parts_id_bagian_fk" FOREIGN KEY ("id_bagian") REFERENCES "public"."body_parts"("id_bagian") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "percobaan_tugas" ADD CONSTRAINT "percobaan_tugas_id_user_users_id_user_fk" FOREIGN KEY ("id_user") REFERENCES "public"."users"("id_user") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "percobaan_tugas" ADD CONSTRAINT "percobaan_tugas_id_tugas_tugas_id_tugas_fk" FOREIGN KEY ("id_tugas") REFERENCES "public"."tugas"("id_tugas") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soal_kuis" ADD CONSTRAINT "soal_kuis_id_tugas_tugas_id_tugas_fk" FOREIGN KEY ("id_tugas") REFERENCES "public"."tugas"("id_tugas") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tugas" ADD CONSTRAINT "tugas_id_organ_organs_id_organ_fk" FOREIGN KEY ("id_organ") REFERENCES "public"."organs"("id_organ") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_langkah_tugas_urutan" ON "langkah_simulasi" USING btree ("id_tugas","urutan");--> statement-breakpoint
CREATE INDEX "idx_percobaan_user_tugas" ON "percobaan_tugas" USING btree ("id_user","id_tugas");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_soal_tugas_urutan" ON "soal_kuis" USING btree ("id_tugas","urutan");