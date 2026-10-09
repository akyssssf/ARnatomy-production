/* ==========================================================================
   konten.ts — FR-06 (label dasar), FR-07 (label dimmed), FR-10 (admin
   menyusun dan mempublikasikan konten), NFR-06. Pengguna hanya melihat
   konten berstatus "tervalidasi"; draft hanya terlihat admin. Peninjauan
   dilakukan admin lebih dulu, jadi pengguna tidak menunggu saat membuka label.
   ========================================================================== */
import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { body_parts, part_content } from "../db/schema";
import type { AppEnv, Deps } from "../konteks";
import { GalatApi } from "../lib/galat";
import { bacaBody } from "../middleware";
import { idDariParam, JenisKontenSchema, KontenBuatSchema, KontenPatchSchema } from "../schemas";

export function rutKonten(deps: Deps) {
  const { db } = deps;
  const r = new Hono<AppEnv>();

  /* FR-06 + FR-07: seluruh label tervalidasi sekaligus (klien memuatnya sekali, lalu menyaring per bagian) */
  r.get("/konten", async (c) =>
    c.json(
      await db
        .select({
          id_konten: part_content.id_konten,
          id_bagian: part_content.id_bagian,
          jenis_konten: part_content.jenis_konten,
          judul_tampil: part_content.judul_tampil,
          deskripsi: part_content.deskripsi,
          status_tampilan: part_content.status_tampilan,
          status_validasi: part_content.status_validasi,
        })
        .from(part_content)
        .where(eq(part_content.status_validasi, "tervalidasi"))
        .orderBy(asc(part_content.id_konten)),
    ),
  );

  /* FR-06 + FR-07: label dasar dan/atau dimmed yang sudah tervalidasi */
  r.get("/bagian/:id/konten", async (c) => {
    const id = idDariParam(c.req.param("id"));
    if (!id) throw new GalatApi(400, "Id bagian tidak valid.");
    const jenisMentah = c.req.query("jenis");
    const jenis = jenisMentah === undefined ? null : JenisKontenSchema.safeParse(jenisMentah);
    if (jenis && !jenis.success) throw new GalatApi(400, "Parameter jenis harus dasar atau dimmed.");
    const [b] = await db
      .select({ id: body_parts.id_bagian })
      .from(body_parts)
      .where(eq(body_parts.id_bagian, id))
      .limit(1);
    if (!b) throw new GalatApi(404, "Bagian tubuh tidak ditemukan.");
    const kondisi = [eq(part_content.id_bagian, id), eq(part_content.status_validasi, "tervalidasi")];
    if (jenis?.success) kondisi.push(eq(part_content.jenis_konten, jenis.data));
    const baris = await db
      .select({
        id_konten: part_content.id_konten,
        id_bagian: part_content.id_bagian,
        jenis_konten: part_content.jenis_konten,
        judul_tampil: part_content.judul_tampil,
        deskripsi: part_content.deskripsi,
        status_tampilan: part_content.status_tampilan,
      })
      .from(part_content)
      .where(and(...kondisi))
      .orderBy(asc(part_content.jenis_konten));
    return c.json(baris);
  });

  return r;
}

/** Rute admin (dipasang di bawah /admin dengan wajibPeran("admin")). */
export function rutKontenAdmin(deps: Deps) {
  const { db } = deps;
  const r = new Hono<AppEnv>();

  r.get("/konten", async (c) => {
    const baris = await db
      .select({
        id_konten: part_content.id_konten,
        id_bagian: part_content.id_bagian,
        nama_bagian: body_parts.nama_bagian_internal,
        jenis_konten: part_content.jenis_konten,
        judul_tampil: part_content.judul_tampil,
        deskripsi: part_content.deskripsi,
        status_tampilan: part_content.status_tampilan,
        status_validasi: part_content.status_validasi,
      })
      .from(part_content)
      .innerJoin(body_parts, eq(body_parts.id_bagian, part_content.id_bagian))
      .orderBy(asc(part_content.id_konten));
    return c.json(baris);
  });

  /* FR-10 "menyusun": label baru untuk bagian yang belum punya label dengan jenis itu (draft secara bawaan) */
  r.post("/konten", async (c) => {
    const d = await bacaBody(c, KontenBuatSchema);
    const [b] = await db
      .select({ id: body_parts.id_bagian })
      .from(body_parts)
      .where(eq(body_parts.id_bagian, d.id_bagian))
      .limit(1);
    if (!b) throw new GalatApi(404, "Bagian tubuh tidak ditemukan.");
    const [ada] = await db
      .select({ id: part_content.id_konten })
      .from(part_content)
      .where(and(eq(part_content.id_bagian, d.id_bagian), eq(part_content.jenis_konten, d.jenis_konten)))
      .limit(1);
    if (ada)
      throw new GalatApi(
        409,
        "Bagian ini sudah punya label dengan jenis tersebut. Ubah yang sudah ada.",
        "KONTEN_SUDAH_ADA",
      );
    const [baru] = await db
      .insert(part_content)
      .values({ ...d, status_tampilan: d.jenis_konten === "dasar" ? "aktif" : "dimmed" })
      .returning();
    return c.json(baru, 201);
  });

  /* FR-10: edit teks dan/atau ubah status draft ↔ tervalidasi (publikasi) */
  r.patch("/konten/:id", async (c) => {
    const id = idDariParam(c.req.param("id"));
    if (!id) throw new GalatApi(400, "Id konten tidak valid.");
    const perubahan = await bacaBody(c, KontenPatchSchema);
    const [u] = await db.update(part_content).set(perubahan).where(eq(part_content.id_konten, id)).returning();
    if (!u) throw new GalatApi(404, "Konten tidak ditemukan.");
    return c.json(u);
  });

  return r;
}
