CREATE TABLE "sekolah" (
	"npsn" varchar(12) PRIMARY KEY NOT NULL,
	"nama" varchar(200) NOT NULL,
	"bentuk" varchar(10) NOT NULL,
	"status" varchar(1) NOT NULL,
	"kabupaten_kota" varchar(80) NOT NULL,
	"provinsi" varchar(80) NOT NULL,
	"kecamatan" varchar(80) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "npsn_sekolah" varchar(12);--> statement-breakpoint
CREATE INDEX "idx_sekolah_nama" ON "sekolah" USING btree ("nama");--> statement-breakpoint
CREATE INDEX "idx_sekolah_kabkota" ON "sekolah" USING btree ("kabupaten_kota");