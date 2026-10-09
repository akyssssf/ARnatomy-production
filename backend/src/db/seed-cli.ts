import { muatBerkasEnv, muatKonfigurasi } from "../config/env";
import { bukaKoneksi } from "./client";
import { jalankanMigrasi } from "./migrate";
import { isiDataAwal } from "./seed";

muatBerkasEnv();
const cfg = muatKonfigurasi();
const k = bukaKoneksi({ url: cfg.DATABASE_URL, dataDir: ".data/pglite" });
await jalankanMigrasi(k);
await isiDataAwal(k.db, cfg);
console.log(`Seed selesai (${k.jenis}, demo=${cfg.seedDemo}).`);
await k.tutup();
