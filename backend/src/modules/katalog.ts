/* ==========================================================================
   katalog.ts — Data master anatomi untuk tampilan AR: FR-03 (model 3D),
   FR-05 (layer), serta bagian tubuh beserta titik interaktifnya (FR-06/07
   memakai konten dari modul konten). Hanya baca; admin mengubah lewat modul lain.
   ========================================================================== */
import { asc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import {
  aset_model,
  bagian_fakta,
  bagian_mesh,
  body_parts,
  layers,
  organ_fakta,
  organs,
  sistem_organ,
} from "../db/schema";
import type { AppEnv, Deps } from "../konteks";
import { GalatApi } from "../lib/galat";
import { idDariParam } from "../schemas";

/** Model aktif sebuah organ: unggahan admin (object storage) bila ada, selain itu berkas bawaan. */
export function modelAktif(organ: { file_model_3d: string }, aset: typeof aset_model.$inferSelect | undefined) {
  return aset
    ? {
        sumber: "unggahan" as const,
        url: aset.url_penyimpanan,
        versi: aset.versi,
        nama_berkas: aset.nama_berkas,
        ukuran_byte: aset.ukuran_byte,
      }
    : {
        sumber: "bawaan" as const,
        url: organ.file_model_3d,
        versi: 0,
        nama_berkas: organ.file_model_3d.split("/").pop() ?? organ.file_model_3d,
        ukuran_byte: null,
      };
}

export function rutKatalog(deps: Deps) {
  const { db } = deps;
  const r = new Hono<AppEnv>();

  r.get("/sistem-organ", async (c) =>
    c.json(await db.select().from(sistem_organ).orderBy(asc(sistem_organ.id_sistem))),
  );

  r.get("/organ", async (c) => {
    const [daftar, aset] = await Promise.all([
      db.select().from(organs).orderBy(asc(organs.id_organ)),
      db.select().from(aset_model),
    ]);
    return c.json(
      daftar.map((o) => ({
        id_organ: o.id_organ,
        nama_organ: o.nama_organ,
        sistem_organ: o.sistem_organ,
        julukan: o.julukan,
        gambar: o.gambar,
        model: modelAktif(
          o,
          aset.find((a) => a.id_organ === o.id_organ),
        ),
      })),
    );
  });

  /* Organ lengkap: fakta, layer, bagian tubuh (dengan fakta dan pola mesh) dan model aktif */
  r.get("/organ/:id", async (c) => {
    const id = idDariParam(c.req.param("id"));
    if (!id) throw new GalatApi(400, "Id organ tidak valid.");
    const [organ] = await db.select().from(organs).where(eq(organs.id_organ, id)).limit(1);
    if (!organ) throw new GalatApi(404, "Organ tidak ditemukan.");
    const [fakta, lapisan, bagian, [aset]] = await Promise.all([
      db
        .select({ label: organ_fakta.label, nilai: organ_fakta.nilai })
        .from(organ_fakta)
        .where(eq(organ_fakta.id_organ, id))
        .orderBy(asc(organ_fakta.id_fakta)),
      db.select().from(layers).where(eq(layers.id_organ, id)).orderBy(asc(layers.urutan_tampil)),
      db.select().from(body_parts).where(eq(body_parts.id_organ, id)).orderBy(asc(body_parts.id_bagian)),
      db.select().from(aset_model).where(eq(aset_model.id_organ, id)).limit(1),
    ]);
    const idBagian = bagian.map((b) => b.id_bagian);
    const [faktaBagian, mesh] = idBagian.length
      ? await Promise.all([
          db
            .select()
            .from(bagian_fakta)
            .where(inArray(bagian_fakta.id_bagian, idBagian))
            .orderBy(asc(bagian_fakta.id_fakta)),
          db
            .select()
            .from(bagian_mesh)
            .where(inArray(bagian_mesh.id_bagian, idBagian))
            .orderBy(asc(bagian_mesh.id_mesh)),
        ])
      : [[], []];
    return c.json({
      ...organ,
      created_at: undefined,
      fakta,
      layer: lapisan,
      model: modelAktif(organ, aset),
      bagian: bagian.map((b) => ({
        ...b,
        mesh_3d: mesh.filter((m) => m.id_bagian === b.id_bagian).map((m) => m.pola_node),
        fakta: faktaBagian.filter((f) => f.id_bagian === b.id_bagian).map((f) => ({ label: f.label, nilai: f.nilai })),
      })),
    });
  });

  /* FR-05 */
  r.get("/organ/:id/layer", async (c) => {
    const id = idDariParam(c.req.param("id"));
    if (!id) throw new GalatApi(400, "Id organ tidak valid.");
    const [organ] = await db.select({ id: organs.id_organ }).from(organs).where(eq(organs.id_organ, id)).limit(1);
    if (!organ) throw new GalatApi(404, "Organ tidak ditemukan.");
    return c.json(await db.select().from(layers).where(eq(layers.id_organ, id)).orderBy(asc(layers.urutan_tampil)));
  });

  r.get("/bagian/:id", async (c) => {
    const id = idDariParam(c.req.param("id"));
    if (!id) throw new GalatApi(400, "Id bagian tidak valid.");
    const [b] = await db.select().from(body_parts).where(eq(body_parts.id_bagian, id)).limit(1);
    if (!b) throw new GalatApi(404, "Bagian tubuh tidak ditemukan.");
    const [fakta, mesh] = await Promise.all([
      db
        .select({ label: bagian_fakta.label, nilai: bagian_fakta.nilai })
        .from(bagian_fakta)
        .where(eq(bagian_fakta.id_bagian, id)),
      db.select({ pola: bagian_mesh.pola_node }).from(bagian_mesh).where(eq(bagian_mesh.id_bagian, id)),
    ]);
    return c.json({ ...b, mesh_3d: mesh.map((m) => m.pola), fakta });
  });

  return r;
}
