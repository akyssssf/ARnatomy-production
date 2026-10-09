/* ==========================================================================
   laporan.ts — FR-09 (User melaporkan kesalahan konten) dan FR-11 (admin
   meninjau dan menindaklanjuti). Perbaikan kontennya sendiri dilakukan lewat
   PATCH /admin/konten/:id.
   ========================================================================== */
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { body_parts, laporan_kesalahan, part_content, users } from "../db/schema";
import type { AppEnv, Deps } from "../konteks";
import { GalatApi } from "../lib/galat";
import { bacaBody } from "../middleware";
import { idDariParam, LaporanSchema } from "../schemas";

export function rutLaporan(deps: Deps) {
  const { db } = deps;
  const r = new Hono<AppEnv>();

  r.post("/laporan", async (c) => {
    const d = await bacaBody(c, LaporanSchema);
    const [k] = await db
      .select({ id: part_content.id_konten })
      .from(part_content)
      .where(eq(part_content.id_konten, d.id_konten))
      .limit(1);
    if (!k) throw new GalatApi(404, "Label yang dilaporkan tidak ditemukan.");
    const [baru] = await db
      .insert(laporan_kesalahan)
      .values({ id_user: c.get("pengguna").id_user, id_konten: d.id_konten, deskripsi_laporan: d.deskripsi_laporan })
      .returning();
    return c.json(baru, 201);
  });

  r.get("/laporan/saya", async (c) =>
    c.json(
      await db
        .select()
        .from(laporan_kesalahan)
        .where(eq(laporan_kesalahan.id_user, c.get("pengguna").id_user))
        .orderBy(desc(laporan_kesalahan.waktu)),
    ),
  );

  return r;
}

export function rutLaporanAdmin(deps: Deps) {
  const { db } = deps;
  const r = new Hono<AppEnv>();

  r.get("/laporan", async (c) => {
    const status = c.req.query("status");
    if (status !== undefined && status !== "baru" && status !== "ditindaklanjuti") {
      throw new GalatApi(400, "Parameter status harus baru atau ditindaklanjuti.");
    }
    const baris = await db
      .select({
        id_laporan: laporan_kesalahan.id_laporan,
        id_konten: laporan_kesalahan.id_konten,
        judul_konten: part_content.judul_tampil,
        jenis_konten: part_content.jenis_konten,
        nama_bagian: body_parts.nama_bagian_internal,
        id_user: laporan_kesalahan.id_user,
        nama_pelapor: users.nama,
        deskripsi_laporan: laporan_kesalahan.deskripsi_laporan,
        status_tindak_lanjut: laporan_kesalahan.status_tindak_lanjut,
        waktu: laporan_kesalahan.waktu,
      })
      .from(laporan_kesalahan)
      .innerJoin(part_content, eq(part_content.id_konten, laporan_kesalahan.id_konten))
      .innerJoin(body_parts, eq(body_parts.id_bagian, part_content.id_bagian))
      .innerJoin(users, eq(users.id_user, laporan_kesalahan.id_user))
      .where(status ? eq(laporan_kesalahan.status_tindak_lanjut, status) : undefined)
      .orderBy(desc(laporan_kesalahan.waktu));
    return c.json(baris);
  });

  r.patch("/laporan/:id", async (c) => {
    const id = idDariParam(c.req.param("id"));
    if (!id) throw new GalatApi(400, "Id laporan tidak valid.");
    const [u] = await db
      .update(laporan_kesalahan)
      .set({ status_tindak_lanjut: "ditindaklanjuti" })
      .where(eq(laporan_kesalahan.id_laporan, id))
      .returning();
    if (!u) throw new GalatApi(404, "Laporan tidak ditemukan.");
    return c.json(u);
  });

  return r;
}
