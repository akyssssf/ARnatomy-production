/* ==========================================================================
   umpan-balik.ts — FR-15 / NFR-07: kuesioner System Usability Scale (10 butir,
   skala 1–5). Skor dihitung di server. Satu kuesioner per pengguna: kiriman
   ulang menggantikan yang lama. Admin melihat ringkasan (target SUS ≥ 68).
   ========================================================================== */
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { sus_jawaban, umpan_balik } from "../db/schema";
import type { AppEnv, Deps } from "../konteks";
import { GalatApi } from "../lib/galat";
import { hitungSkorSus } from "../lib/sus";
import { bacaBody } from "../middleware";
import { UmpanBalikSchema } from "../schemas";

const TARGET_SUS = 68;

async function muat(deps: Deps, idUser: number) {
  const [u] = await deps.db.select().from(umpan_balik).where(eq(umpan_balik.id_user, idUser)).limit(1);
  if (!u) return null;
  const j = await deps.db.select().from(sus_jawaban).where(eq(sus_jawaban.id_umpan_balik, u.id_umpan_balik));
  return {
    id_umpan_balik: u.id_umpan_balik,
    id_user: u.id_user,
    jawaban: j.sort((a, b) => a.no_butir - b.no_butir).map((x) => x.nilai),
    skor_sus: Number(u.skor_sus),
    komentar: u.komentar,
    waktu: u.waktu,
  };
}

export function rutUmpanBalik(deps: Deps) {
  const { db } = deps;
  const r = new Hono<AppEnv>();

  r.post("/umpan-balik", async (c) => {
    const idUser = c.get("pengguna").id_user;
    const d = await bacaBody(c, UmpanBalikSchema);
    const skor = hitungSkorSus(d.jawaban);
    await db.transaction(async (tx) => {
      await tx.delete(umpan_balik).where(eq(umpan_balik.id_user, idUser));
      const [baru] = await tx
        .insert(umpan_balik)
        .values({ id_user: idUser, skor_sus: skor.toFixed(1), komentar: d.komentar?.trim() ? d.komentar.trim() : null })
        .returning();
      if (!baru) throw new GalatApi(500, "Gagal menyimpan umpan balik.");
      await tx
        .insert(sus_jawaban)
        .values(d.jawaban.map((nilai, i) => ({ id_umpan_balik: baru.id_umpan_balik, no_butir: i + 1, nilai })));
    });
    return c.json(await muat(deps, idUser), 201);
  });

  r.get("/umpan-balik/saya", async (c) => {
    const u = await muat(deps, c.get("pengguna").id_user);
    if (!u) throw new GalatApi(404, "Kamu belum mengisi kuesioner.");
    return c.json(u);
  });

  return r;
}

export function rutUmpanBalikAdmin(deps: Deps) {
  const { db } = deps;
  const r = new Hono<AppEnv>();

  /* Seluruh kiriman (untuk tabel admin) */
  r.get("/umpan-balik", async (c) => {
    const semua = await db.select().from(umpan_balik).orderBy(umpan_balik.id_umpan_balik);
    const butir = await db.select().from(sus_jawaban);
    return c.json(
      semua.map((u) => ({
        id_umpan_balik: u.id_umpan_balik,
        id_user: u.id_user,
        jawaban: butir
          .filter((b) => b.id_umpan_balik === u.id_umpan_balik)
          .sort((a, b) => a.no_butir - b.no_butir)
          .map((b) => b.nilai),
        skor_sus: Number(u.skor_sus),
        komentar: u.komentar,
        waktu: u.waktu,
      })),
    );
  });

  r.get("/umpan-balik/ringkasan", async (c) => {
    const semua = await db.select().from(umpan_balik);
    const butir = await db.select().from(sus_jawaban);
    const skor = semua.map((u) => Number(u.skor_sus));
    const rata = skor.length ? Math.round((skor.reduce((a, b) => a + b, 0) / skor.length) * 10) / 10 : null;
    const perButir = Array.from({ length: 10 }, (_, i) => {
      const nilai = butir.filter((b) => b.no_butir === i + 1).map((b) => b.nilai);
      return nilai.length ? Math.round((nilai.reduce((a, b) => a + b, 0) / nilai.length) * 100) / 100 : null;
    });
    return c.json({
      jumlah_responden: skor.length,
      rata_rata_skor: rata,
      target: TARGET_SUS,
      memenuhi_target: rata !== null && rata >= TARGET_SUS,
      rata_rata_per_butir: perButir,
    });
  });

  return r;
}
