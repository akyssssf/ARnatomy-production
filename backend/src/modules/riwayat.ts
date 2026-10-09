/* ==========================================================================
   riwayat.ts — FR-14: mencatat bagian organ yang dipelajari (termasuk label
   dimmed yang dibuka). Durasi dihitung di server dari waktu_akses sampai
   entri ditutup, jadi tidak bisa dipalsukan klien. Data hanya milik pemanggil.
   ========================================================================== */
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { body_parts, learning_history } from "../db/schema";
import type { AppEnv, Deps } from "../konteks";
import { GalatApi } from "../lib/galat";
import { bacaBody } from "../middleware";
import { CatatRiwayatSchema, idDariParam } from "../schemas";

export function rutRiwayat(deps: Deps) {
  const { db } = deps;
  const r = new Hono<AppEnv>();

  r.post("/riwayat", async (c) => {
    const d = await bacaBody(c, CatatRiwayatSchema);
    const [b] = await db
      .select({ id: body_parts.id_bagian })
      .from(body_parts)
      .where(eq(body_parts.id_bagian, d.id_bagian))
      .limit(1);
    if (!b) throw new GalatApi(404, "Bagian tubuh tidak ditemukan.");
    const [baru] = await db
      .insert(learning_history)
      .values({ id_user: c.get("pengguna").id_user, id_bagian: d.id_bagian, jenis_konten: d.jenis_konten })
      .returning();
    return c.json(baru, 201);
  });

  r.patch("/riwayat/:id/tutup", async (c) => {
    const id = idDariParam(c.req.param("id"));
    if (!id) throw new GalatApi(400, "Id riwayat tidak valid.");
    const idUser = c.get("pengguna").id_user;
    const [entri] = await db
      .select()
      .from(learning_history)
      .where(and(eq(learning_history.id_riwayat, id), eq(learning_history.id_user, idUser)))
      .limit(1);
    if (!entri) throw new GalatApi(404, "Riwayat tidak ditemukan.");
    if (entri.durasi !== null) return c.json(entri);
    const durasi = Math.max(1, Math.round((Date.now() - entri.waktu_akses.getTime()) / 1000));
    const [u] = await db
      .update(learning_history)
      .set({ durasi })
      .where(eq(learning_history.id_riwayat, id))
      .returning();
    return c.json(u);
  });

  /* Entri terbaru dan rekap per bagian tubuh */
  r.get("/riwayat", async (c) => {
    const idUser = c.get("pengguna").id_user;
    const entri = await db
      .select()
      .from(learning_history)
      .where(eq(learning_history.id_user, idUser))
      .orderBy(desc(learning_history.waktu_akses))
      .limit(200);
    const peta = new Map<
      number,
      { id_bagian: number; jumlah: number; dimmed_dibuka: boolean; terakhir: Date; total_durasi: number }
    >();
    for (const e of entri) {
      const baris = peta.get(e.id_bagian) ?? {
        id_bagian: e.id_bagian,
        jumlah: 0,
        dimmed_dibuka: false,
        terakhir: e.waktu_akses,
        total_durasi: 0,
      };
      baris.jumlah += 1;
      if (e.jenis_konten === "dimmed") baris.dimmed_dibuka = true;
      if (e.waktu_akses > baris.terakhir) baris.terakhir = e.waktu_akses;
      baris.total_durasi += e.durasi ?? 0;
      peta.set(e.id_bagian, baris);
    }
    return c.json({ entri, rekap: [...peta.values()].sort((a, b) => b.terakhir.getTime() - a.terakhir.getTime()) });
  });

  return r;
}
