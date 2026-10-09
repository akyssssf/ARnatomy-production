/* server.ts — Titik masuk: muat konfigurasi, buka basis data, migrasi, isi data awal, jalankan server HTTP. */
import { serve } from "@hono/node-server";
import { buatApp } from "./app";
import { muatBerkasEnv, muatKonfigurasi } from "./config/env";
import { bukaKoneksi } from "./db/client";
import { jalankanMigrasi } from "./db/migrate";
import { isiDataAwal } from "./db/seed";
import { buatVerifikatorGoogle } from "./google";
import { PembatasLaju } from "./lib/pembatas";
import { buatKlienLlm } from "./modules/asisten";
import { siapkanRag } from "./rag/muat";
import { buatPenyimpanan } from "./storage/penyimpanan";

muatBerkasEnv();
const cfg = muatKonfigurasi();
const koneksi = bukaKoneksi({ url: cfg.DATABASE_URL, dataDir: ".data/pglite" });
await jalankanMigrasi(koneksi);
await isiDataAwal(koneksi.db, cfg);

const app = buatApp({
  cfg,
  db: koneksi.db,
  penyimpanan: buatPenyimpanan(cfg),
  llm: buatKlienLlm(cfg),
  rag: siapkanRag(cfg),
  google: buatVerifikatorGoogle(cfg.googleClientIds),
  pembatasLogin: new PembatasLaju(5, 10 * 60 * 1000),
  pembatasLoginEmail: new PembatasLaju(20, 10 * 60 * 1000),
  pembatasAsisten: new PembatasLaju(10, 60 * 1000),
});

console.log(
  cfg.LLM_API_KEY
    ? `Asisten AI: ${cfg.LLM_PROVIDER} (kunci terpasang)`
    : "Asisten AI: tanpa LLM_API_KEY, memakai jawaban lokal",
);
const server = serve({ fetch: app.fetch, port: cfg.PORT }, (info) => {
  console.log(`ARnatomy backend siap di http://localhost:${info.port} (db: ${koneksi.jenis}, demo: ${cfg.seedDemo})`);
});

const matikan = async () => {
  server.close();
  await koneksi.tutup();
  process.exit(0);
};
process.on("SIGINT", matikan);
process.on("SIGTERM", matikan);
