import { muatBerkasEnv, muatKonfigurasi } from "../config/env";
import { bukaKoneksi } from "./client";
import { jalankanMigrasi } from "./migrate";

muatBerkasEnv();
const cfg = muatKonfigurasi();
const k = bukaKoneksi({ url: cfg.DATABASE_URL, dataDir: ".data/pglite" });
await jalankanMigrasi(k);
console.log(`Migrasi selesai (${k.jenis}).`);
await k.tutup();
