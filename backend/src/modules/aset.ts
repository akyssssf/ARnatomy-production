/* ==========================================================================
   aset.ts — FR-12: admin mengunggah, memperbarui, dan menghapus model 3D
   organ. Berkas divalidasi (ekstensi .glb, tanda "glTF", maks 15 MB) lalu
   disimpan di object storage; basis data menyimpan metadata. URL berversi
   agar cache klien tidak menyajikan model lama.
   ========================================================================== */
import { randomBytes } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { aset_model, organs } from "../db/schema";
import type { AppEnv, Deps } from "../konteks";
import { GalatApi } from "../lib/galat";
import { BATAS_UKURAN_MODEL, idDariParam } from "../schemas";
import { modelAktif } from "./katalog";

export function adalahGlb(bytes: Uint8Array): boolean {
  return bytes.length > 12 && String.fromCharCode(...bytes.subarray(0, 4)) === "glTF";
}

export function rutAsetAdmin(deps: Deps) {
  const { db, penyimpanan } = deps;
  const r = new Hono<AppEnv>();

  r.get("/aset", async (c) => {
    const [daftar, aset] = await Promise.all([
      db.select().from(organs).orderBy(asc(organs.id_organ)),
      db.select().from(aset_model),
    ]);
    return c.json(
      daftar.map((o) => ({
        id_organ: o.id_organ,
        nama_organ: o.nama_organ,
        model: modelAktif(
          o,
          aset.find((a) => a.id_organ === o.id_organ),
        ),
      })),
    );
  });

  r.post(
    "/aset/:idOrgan",
    bodyLimit({
      maxSize: BATAS_UKURAN_MODEL + 1024 * 1024,
      onError: () => {
        throw new GalatApi(413, "Berkas terlalu besar (maksimal 15 MB).", "BERKAS_TERLALU_BESAR");
      },
    }),
    async (c) => {
      const idOrgan = idDariParam(c.req.param("idOrgan"));
      if (!idOrgan) throw new GalatApi(400, "Id organ tidak valid.");
      const [organ] = await db.select().from(organs).where(eq(organs.id_organ, idOrgan)).limit(1);
      if (!organ) throw new GalatApi(404, "Organ tidak ditemukan.");
      let berkas: unknown;
      try {
        berkas = (await c.req.formData()).get("berkas");
      } catch {
        throw new GalatApi(400, 'Kirim berkas sebagai multipart/form-data dengan field "berkas".');
      }
      if (!(berkas instanceof File)) throw new GalatApi(400, 'Field "berkas" wajib berisi berkas .glb.');
      if (!berkas.name.toLowerCase().endsWith(".glb"))
        throw new GalatApi(422, "Hanya berkas .glb yang diterima.", "FORMAT_SALAH");
      if (berkas.size > BATAS_UKURAN_MODEL)
        throw new GalatApi(413, "Berkas terlalu besar (maksimal 15 MB).", "BERKAS_TERLALU_BESAR");
      const bytes = new Uint8Array(await berkas.arrayBuffer());
      if (!adalahGlb(bytes))
        throw new GalatApi(422, "Isi berkas bukan model glTF Binary (.glb) yang valid.", "FORMAT_SALAH");

      const [lama] = await db.select().from(aset_model).where(eq(aset_model.id_organ, idOrgan)).limit(1);
      const versi = (lama?.versi ?? 0) + 1;
      const kunci = `models/${idOrgan}/v${versi}-${randomBytes(6).toString("hex")}.glb`;
      await penyimpanan.simpan(kunci, bytes, "model/gltf-binary");
      const nilai = {
        nama_berkas: berkas.name.slice(0, 255),
        ukuran_byte: bytes.byteLength,
        versi,
        kunci_penyimpanan: kunci,
        url_penyimpanan: penyimpanan.url(kunci),
        waktu_unggah: new Date(),
      };
      const [baru] = lama
        ? await db.update(aset_model).set(nilai).where(eq(aset_model.id_organ, idOrgan)).returning()
        : await db
            .insert(aset_model)
            .values({ id_organ: idOrgan, ...nilai })
            .returning();
      if (lama) await penyimpanan.hapus(lama.kunci_penyimpanan).catch(() => {});
      return c.json(
        { id_organ: idOrgan, nama_organ: organ.nama_organ, model: modelAktif(organ, baru) },
        lama ? 200 : 201,
      );
    },
  );

  /* Hapus unggahan: organ kembali memakai model bawaan */
  r.delete("/aset/:idOrgan", async (c) => {
    const idOrgan = idDariParam(c.req.param("idOrgan"));
    if (!idOrgan) throw new GalatApi(400, "Id organ tidak valid.");
    const [lama] = await db.select().from(aset_model).where(eq(aset_model.id_organ, idOrgan)).limit(1);
    if (!lama) throw new GalatApi(404, "Organ ini tidak memiliki model unggahan.");
    await db.delete(aset_model).where(eq(aset_model.id_organ, idOrgan));
    await penyimpanan.hapus(lama.kunci_penyimpanan).catch(() => {});
    return c.json({ ok: true });
  });

  return r;
}
