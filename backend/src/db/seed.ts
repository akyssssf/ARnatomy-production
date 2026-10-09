/* ==========================================================================
   seed.ts — Mengisi data awal secara idempoten: data master anatomi (organ,
   bagian tubuh, layer, label) dari seed-data.json, akun demo (hanya bila
   SEED_DEMO=true dan bukan produksi), serta akun admin awal dari env.
   ========================================================================== */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { count, eq, sql } from "drizzle-orm";
import type { Konfigurasi } from "../config/env";
import { hashSandi } from "../lib/sandi";
import { bacaCsv } from "../rag/csv";
import type { Db } from "./client";
import {
  bagian_fakta,
  bagian_mesh,
  body_parts,
  langkah_simulasi,
  layers,
  organ_fakta,
  organs,
  part_content,
  sekolah,
  sistem_organ,
  soal_kuis,
  tugas,
  users,
} from "./schema";
import seed from "./seed-data.json";
import { TUGAS_AWAL } from "./tugas-data";

const TABEL_SERIAL: [string, string][] = [
  ["users", "id_user"],
  ["organs", "id_organ"],
  ["sistem_organ", "id_sistem"],
  ["layers", "id_layer"],
  ["body_parts", "id_bagian"],
  ["part_content", "id_konten"],
];

export async function isiDataMaster(db: Db): Promise<boolean> {
  const [{ n }] = (await db.select({ n: count() }).from(organs)) as [{ n: number }];
  if (n > 0) return false;
  await db.transaction(async (tx) => {
    await tx.insert(organs).values(
      seed.organs.map(({ fakta: _f, ...o }) => ({
        id_organ: o.id_organ,
        nama_organ: o.nama_organ,
        sistem_organ: o.sistem_organ,
        julukan: o.julukan,
        file_model_3d: o.file_model_3d,
        gambar: o.gambar,
        deskripsi: o.deskripsi,
      })),
    );
    await tx
      .insert(organ_fakta)
      .values(seed.organs.flatMap((o) => o.fakta.map((f) => ({ id_organ: o.id_organ, ...f }))));
    await tx.insert(sistem_organ).values(seed.sistem_organ);
    await tx.insert(layers).values(seed.layers);
    /* parent_bagian_id diisi sesudah semua baris ada (induk bisa berid lebih besar) */
    await tx.insert(body_parts).values(
      seed.body_parts.map((b) => ({
        id_bagian: b.id_bagian,
        id_organ: b.id_organ,
        nama_bagian_internal: b.nama_bagian_internal,
        posisi_koordinat_3d: b.posisi_koordinat_3d,
        posisi_2d: b.posisi_2d,
      })),
    );
    for (const b of seed.body_parts) {
      if (b.parent_bagian_id) {
        await tx
          .update(body_parts)
          .set({ parent_bagian_id: b.parent_bagian_id })
          .where(eq(body_parts.id_bagian, b.id_bagian));
      }
    }
    await tx
      .insert(bagian_fakta)
      .values(seed.body_parts.flatMap((b) => b.fakta.map((f) => ({ id_bagian: b.id_bagian, ...f }))));
    const mesh = seed.body_parts.flatMap((b) => b.mesh_3d.map((pola_node) => ({ id_bagian: b.id_bagian, pola_node })));
    if (mesh.length) await tx.insert(bagian_mesh).values(mesh);
    await tx.insert(part_content).values(seed.part_content);
  });
  return true;
}

/** Daftar sekolah dari data/sekolah/sekolah.csv; dilewati bila tabel sudah terisi atau berkasnya tidak ada. */
export async function isiDataSekolah(db: Db): Promise<number> {
  const [{ n }] = (await db.select({ n: count() }).from(sekolah)) as [{ n: number }];
  if (n > 0) return 0;
  let isi: string;
  try {
    isi = readFileSync(join(import.meta.dirname, "..", "..", "data", "sekolah", "sekolah.csv"), "utf-8");
  } catch {
    return 0;
  }
  const baris = bacaCsv(isi).map((r) => ({
    npsn: r.npsn as string,
    nama: (r.nama as string).slice(0, 200),
    bentuk: r.bentuk as string,
    status: (r.status as string).slice(0, 1) || "S",
    kabupaten_kota: (r.kabupaten_kota as string).slice(0, 80),
    provinsi: (r.provinsi as string).slice(0, 80),
    kecamatan: (r.kecamatan as string).slice(0, 80),
  }));
  for (let i = 0; i < baris.length; i += 2000) {
    await db
      .insert(sekolah)
      .values(baris.slice(i, i + 2000))
      .onConflictDoNothing();
  }
  return baris.length;
}

/** Tugas belajar awal (kuis, simulasi, rakit). Idempoten per judul: tugas yang belum ada ditambahkan,
    sehingga basis data lama ikut mendapat tugas baru tanpa menimpa yang sudah diubah admin. */
export async function isiDataTugas(db: Db): Promise<boolean> {
  const ada = new Set((await db.select({ judul: tugas.judul }).from(tugas)).map((t) => t.judul));
  const baru = TUGAS_AWAL.filter((t) => !ada.has(t.judul));
  if (baru.length === 0) return false;
  await db.transaction(async (tx) => {
    for (const t of baru) {
      const [dibuat] = await tx
        .insert(tugas)
        .values({ jenis: t.jenis, id_organ: t.id_organ, judul: t.judul, deskripsi: t.deskripsi })
        .returning({ id: tugas.id_tugas });
      if (!dibuat) throw new Error("Gagal mengisi tugas awal.");
      if (t.soal?.length)
        await tx.insert(soal_kuis).values(t.soal.map((s, i) => ({ ...s, id_tugas: dibuat.id, urutan: i + 1 })));
      if (t.langkah?.length)
        await tx
          .insert(langkah_simulasi)
          .values(t.langkah.map((l, i) => ({ ...l, id_tugas: dibuat.id, urutan: i + 1 })));
    }
  });
  return true;
}

export async function isiAkunDemo(db: Db, cost: number): Promise<void> {
  for (const u of seed.users) {
    await db
      .insert(users)
      .values({
        id_user: u.id_user,
        nama: u.nama,
        email: u.email,
        password_hash: await hashSandi(u.password, cost),
        role: u.role,
        asal_sekolah: u.asal_sekolah,
      })
      .onConflictDoNothing();
  }
}

/** Admin awal untuk produksi: dibuat bila belum ada admin sama sekali. */
export async function isiAdminAwal(db: Db, email: string, sandi: string, cost: number): Promise<boolean> {
  const [{ n }] = (await db.select({ n: count() }).from(users).where(eq(users.role, "admin"))) as [{ n: number }];
  if (n > 0) return false;
  await db.insert(users).values({
    nama: "Administrator",
    email: email.toLowerCase(),
    password_hash: await hashSandi(sandi, cost),
    role: "admin",
    asal_sekolah: null,
  });
  return true;
}

export async function selaraskanUrutan(db: Db): Promise<void> {
  for (const [tabel, kolom] of TABEL_SERIAL) {
    await db.execute(
      sql.raw(
        `SELECT setval(pg_get_serial_sequence('${tabel}', '${kolom}'), GREATEST((SELECT COALESCE(MAX(${kolom}), 0) FROM ${tabel}), 1))`,
      ),
    );
  }
}

export async function isiDataAwal(
  db: Db,
  cfg: Pick<Konfigurasi, "seedDemo" | "BCRYPT_COST" | "ADMIN_EMAIL" | "ADMIN_PASSWORD">,
): Promise<void> {
  await isiDataMaster(db);
  await isiDataTugas(db);
  await isiDataSekolah(db);
  if (cfg.seedDemo) await isiAkunDemo(db, cfg.BCRYPT_COST);
  else if (cfg.ADMIN_EMAIL && cfg.ADMIN_PASSWORD)
    await isiAdminAwal(db, cfg.ADMIN_EMAIL, cfg.ADMIN_PASSWORD, cfg.BCRYPT_COST);
  await selaraskanUrutan(db);
}
