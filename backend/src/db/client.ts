/* ==========================================================================
   client.ts — Koneksi basis data. DATABASE_URL berawalan postgres:// memakai
   PostgreSQL sungguhan (postgres.js). Tanpa URL dipakai PGlite (PostgreSQL
   WASM) sehingga backend dan uji berjalan tanpa instalasi PostgreSQL; di
   pengembangan datanya disimpan di berkas, di uji hanya di memori.
   ========================================================================== */
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export interface Koneksi {
  db: Db;
  jenis: "postgres" | "pglite";
  tutup(): Promise<void>;
  /** Untuk migrator khusus driver */
  mentah: { jenis: "postgres"; klien: ReturnType<typeof postgres> } | { jenis: "pglite"; klien: PGlite };
}

export function bukaKoneksi(opsi: { url?: string; dataDir?: string }): Koneksi {
  if (opsi.url?.startsWith("postgres")) {
    const klien = postgres(opsi.url, { max: 20, onnotice: () => {} });
    return {
      db: drizzlePostgres(klien, { schema }) as unknown as Db,
      jenis: "postgres",
      tutup: () => klien.end(),
      mentah: { jenis: "postgres", klien },
    };
  }
  if (opsi.dataDir) mkdirSync(dirname(opsi.dataDir), { recursive: true });
  const klien = new PGlite(opsi.dataDir);
  return {
    db: drizzlePglite(klien, { schema }) as unknown as Db,
    jenis: "pglite",
    tutup: () => klien.close(),
    mentah: { jenis: "pglite", klien },
  };
}
