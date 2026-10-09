/* migrate.ts — Menerapkan migrasi terversi (folder drizzle/) ke basis data. */
import { fileURLToPath } from "node:url";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";
import type { Koneksi } from "./client";

const FOLDER = fileURLToPath(new URL("../../drizzle", import.meta.url));

export async function jalankanMigrasi(k: Koneksi): Promise<void> {
  if (k.mentah.jenis === "postgres") {
    await migratePostgres(drizzlePostgres(k.mentah.klien), { migrationsFolder: FOLDER });
  } else {
    await migratePglite(drizzlePglite(k.mentah.klien), { migrationsFolder: FOLDER });
  }
}
