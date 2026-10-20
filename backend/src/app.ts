/* ==========================================================================
   app.ts — Merakit aplikasi Hono: keamanan (header, CORS), penangan galat
   seragam {pesan, kode}, rute publik (health, auth, berkas lokal), dan rute
   terlindungi (JWT + profil lengkap), termasuk rute admin (RBAC).
   ========================================================================== */
import { createReadStream, existsSync, statSync } from "node:fs";
import { Readable } from "node:stream";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { HALAMAN_DOKUMENTASI } from "./dokumentasi";
import type { AppEnv, Deps } from "./konteks";
import { GalatApi } from "./lib/galat";
import { autentikasi, wajibPeran, wajibProfilLengkap } from "./middleware";
import { rutAkunAdmin } from "./modules/akun";
import { rutAsetAdmin } from "./modules/aset";
import { rutAsisten } from "./modules/asisten";
import { rutAuth } from "./modules/auth";
import { rutHealth } from "./modules/health";
import { rutKatalog } from "./modules/katalog";
import { rutKonten, rutKontenAdmin } from "./modules/konten";
import { rutLaporan, rutLaporanAdmin } from "./modules/laporan";
import { rutRiwayat } from "./modules/riwayat";
import { rutSekolah } from "./modules/sekolah";
import { rutTugas, rutTugasAdmin } from "./modules/tugas";
import { rutUmpanBalik, rutUmpanBalikAdmin } from "./modules/umpan-balik";
import { bangunOpenApi } from "./openapi";
import { PenyimpananLokal } from "./storage/penyimpanan";

export function buatApp(deps: Deps) {
  const app = new Hono();

  app.use(secureHeaders({ crossOriginResourcePolicy: "cross-origin" }));
  app.use(
    cors({
      origin: (asal) => (deps.cfg.corsOrigins.includes(asal) ? asal : null),
      allowHeaders: ["Authorization", "Content-Type"],
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      maxAge: 600,
    }),
  );

  /* Batas ukuran body 256 KB untuk semua rute kecuali unggahan model 3D (punya batas sendiri 16 MB) */
  const batasUmum = bodyLimit({
    maxSize: 256 * 1024,
    onError: () => {
      throw new GalatApi(413, "Isi permintaan terlalu besar.", "TERLALU_BESAR");
    },
  });
  app.use("*", (c, lanjut) => (c.req.path.startsWith("/v1/admin/aset/") ? lanjut() : batasUmum(c, lanjut)));

  app.onError((err, c) => {
    if (err instanceof GalatApi) return c.json({ pesan: err.message, kode: err.kode }, err.status);
    if (err instanceof SyntaxError)
      return c.json({ pesan: "Body permintaan bukan JSON yang valid.", kode: "BODY_TIDAK_VALID" }, 400);
    console.error("Galat tak terduga:", err);
    return c.json({ pesan: "Terjadi kesalahan pada server.", kode: "GALAT_SERVER" }, 500);
  });
  app.notFound((c) => c.json({ pesan: "Rute tidak ditemukan.", kode: "TIDAK_ADA" }, 404));

  const dokumen = bangunOpenApi();
  app.get("/openapi.json", (c) => c.json(dokumen));
  /* Dokumentasi interaktif (Swagger UI dari CDN, versi dikunci); "Authorize" menerima access token untuk mencoba rute */
  app.get("/docs", (c) => c.html(HALAMAN_DOKUMENTASI));
  app.route("/", rutHealth(deps));
  app.route("/v1/auth", rutAuth(deps));

  /* Mode pengembangan: berkas unggahan dilayani dari disk. Produksi memakai CDN/object storage. */
  if (deps.penyimpanan instanceof PenyimpananLokal) {
    const lokal = deps.penyimpanan;
    app.get("/files/*", (c) => {
      const kunci = decodeURIComponent(c.req.path.replace(/^\/files\//, ""));
      let jalur: string;
      try {
        jalur = lokal.lokasiBerkas(kunci);
      } catch {
        return c.json({ pesan: "Berkas tidak ditemukan.", kode: "TIDAK_ADA" }, 404);
      }
      if (!existsSync(jalur) || !statSync(jalur).isFile())
        return c.json({ pesan: "Berkas tidak ditemukan.", kode: "TIDAK_ADA" }, 404);
      return new Response(Readable.toWeb(createReadStream(jalur)) as ReadableStream, {
        headers: { "Content-Type": "model/gltf-binary", "Cache-Control": "public, max-age=31536000, immutable" },
      });
    });
  }

  /* Pencarian sekolah: cukup login (dipakai saat melengkapi profil), tanpa syarat profil lengkap */
  const sekolahApi = new Hono<AppEnv>();
  sekolahApi.use(autentikasi(deps));
  sekolahApi.route("/", rutSekolah(deps));
  app.route("/v1/sekolah", sekolahApi);

  const terlindungi = new Hono<AppEnv>();
  terlindungi.use(autentikasi(deps));
  terlindungi.use(wajibProfilLengkap);
  terlindungi.route("/", rutKatalog(deps));
  terlindungi.route("/", rutKonten(deps));
  terlindungi.route("/", rutRiwayat(deps));
  terlindungi.route("/", rutAsisten(deps));
  terlindungi.route("/", rutLaporan(deps));
  terlindungi.route("/", rutUmpanBalik(deps));
  terlindungi.route("/", rutTugas(deps));

  const admin = new Hono<AppEnv>();
  admin.use(wajibPeran("admin"));
  admin.route("/", rutKontenAdmin(deps));
  admin.route("/", rutLaporanAdmin(deps));
  admin.route("/", rutAsetAdmin(deps));
  admin.route("/", rutAkunAdmin(deps));
  admin.route("/", rutUmpanBalikAdmin(deps));
  admin.route("/", rutTugasAdmin(deps));
  terlindungi.route("/admin", admin);

  app.route("/v1", terlindungi);
  return app;
}
