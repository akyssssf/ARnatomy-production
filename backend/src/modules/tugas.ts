/* ==========================================================================
   tugas.ts — Tugas belajar (tambahan revisi SKPL, terkait FR-14): kuis dan
   simulasi alur (peredaran darah, pernapasan). Penilaian dilakukan di server
   sehingga skor tidak bisa dipalsukan klien. Setiap percobaan tersimpan dan
   membentuk progres belajar: tugas selesai bila skor terbaik mencapai ambang.
   ========================================================================== */
import { asc, desc, eq, inArray, max, sql } from "drizzle-orm";
import { Hono } from "hono";
import { langkah_simulasi, organs, percobaan_tugas, soal_kuis, tugas } from "../db/schema";
import type { AppEnv, Deps } from "../konteks";
import { GalatApi } from "../lib/galat";
import { bacaBody } from "../middleware";
import { idDariParam, PercobaanSchema, SoalBuatSchema, SoalPatchSchema } from "../schemas";

type BarisTugas = typeof tugas.$inferSelect;

async function ambilTugas(deps: Deps, id: number): Promise<BarisTugas> {
  const [t] = await deps.db.select().from(tugas).where(eq(tugas.id_tugas, id)).limit(1);
  if (!t?.aktif) throw new GalatApi(404, "Tugas tidak ditemukan.");
  return t;
}

/** Rekap percobaan satu pengguna per tugas: jumlah, skor terbaik. */
async function rekapPengguna(deps: Deps, idUser: number) {
  const baris = await deps.db
    .select({
      id_tugas: percobaan_tugas.id_tugas,
      percobaan: sql<number>`count(*)::int`,
      terbaik: max(percobaan_tugas.skor),
    })
    .from(percobaan_tugas)
    .where(eq(percobaan_tugas.id_user, idUser))
    .groupBy(percobaan_tugas.id_tugas);
  return new Map(baris.map((b) => [b.id_tugas, { percobaan: b.percobaan, terbaik: b.terbaik ?? 0 }]));
}

export function rutTugas(deps: Deps) {
  const { db } = deps;
  const r = new Hono<AppEnv>();

  /* Daftar tugas beserta status pengguna */
  r.get("/tugas", async (c) => {
    const idUser = c.get("pengguna").id_user;
    const [daftar, soal, langkah, rekap] = await Promise.all([
      db
        .select({
          id_tugas: tugas.id_tugas,
          jenis: tugas.jenis,
          id_organ: tugas.id_organ,
          nama_organ: organs.nama_organ,
          judul: tugas.judul,
          deskripsi: tugas.deskripsi,
          ambang: tugas.ambang,
        })
        .from(tugas)
        .leftJoin(organs, eq(organs.id_organ, tugas.id_organ))
        .where(eq(tugas.aktif, true))
        .orderBy(asc(tugas.id_tugas)),
      db.select({ id: soal_kuis.id_tugas, n: sql<number>`count(*)::int` }).from(soal_kuis).groupBy(soal_kuis.id_tugas),
      db
        .select({ id: langkah_simulasi.id_tugas, n: sql<number>`count(*)::int` })
        .from(langkah_simulasi)
        .groupBy(langkah_simulasi.id_tugas),
      rekapPengguna(deps, idUser),
    ]);
    const jumlah = new Map([...soal, ...langkah].map((x) => [x.id, x.n]));
    return c.json(
      daftar.map((t) => {
        const rk = rekap.get(t.id_tugas);
        return {
          ...t,
          jumlah_item: jumlah.get(t.id_tugas) ?? 0,
          percobaan: rk?.percobaan ?? 0,
          skor_terbaik: rk ? rk.terbaik : null,
          selesai: rk ? rk.terbaik >= t.ambang : false,
        };
      }),
    );
  });

  /* Progres belajar: ringkasan seluruh tugas + percobaan terbaru */
  r.get("/tugas/progres", async (c) => {
    const idUser = c.get("pengguna").id_user;
    const [daftar, rekap, terbaru] = await Promise.all([
      db.select().from(tugas).where(eq(tugas.aktif, true)),
      rekapPengguna(deps, idUser),
      db
        .select({
          id_percobaan: percobaan_tugas.id_percobaan,
          id_tugas: percobaan_tugas.id_tugas,
          judul: tugas.judul,
          jenis: tugas.jenis,
          skor: percobaan_tugas.skor,
          benar: percobaan_tugas.benar,
          total: percobaan_tugas.total,
          waktu: percobaan_tugas.waktu,
        })
        .from(percobaan_tugas)
        .innerJoin(tugas, eq(tugas.id_tugas, percobaan_tugas.id_tugas))
        .where(eq(percobaan_tugas.id_user, idUser))
        .orderBy(desc(percobaan_tugas.waktu))
        .limit(10),
    ]);
    const selesai = daftar.filter((t) => (rekap.get(t.id_tugas)?.terbaik ?? -1) >= t.ambang).length;
    const dikerjakan = daftar.filter((t) => rekap.has(t.id_tugas));
    const rata = dikerjakan.length
      ? Math.round(dikerjakan.reduce((a, t) => a + (rekap.get(t.id_tugas)?.terbaik ?? 0), 0) / dikerjakan.length)
      : null;
    return c.json({
      tugas_total: daftar.length,
      tugas_selesai: selesai,
      persen_selesai: daftar.length ? Math.round((selesai / daftar.length) * 100) : 0,
      rata_skor_terbaik: rata,
      percobaan_terbaru: terbaru,
    });
  });

  /* Isi tugas. Soal kuis dikirim TANPA kunci jawaban. */
  r.get("/tugas/:id", async (c) => {
    const id = idDariParam(c.req.param("id"));
    if (!id) throw new GalatApi(400, "Id tugas tidak valid.");
    const t = await ambilTugas(deps, id);
    const rk = (await rekapPengguna(deps, c.get("pengguna").id_user)).get(id);
    const dasar = {
      id_tugas: t.id_tugas,
      jenis: t.jenis,
      id_organ: t.id_organ,
      judul: t.judul,
      deskripsi: t.deskripsi,
      ambang: t.ambang,
      percobaan: rk?.percobaan ?? 0,
      skor_terbaik: rk ? rk.terbaik : null,
      selesai: rk ? rk.terbaik >= t.ambang : false,
    };
    if (t.jenis === "kuis") {
      const soal = await db
        .select({
          id_soal: soal_kuis.id_soal,
          urutan: soal_kuis.urutan,
          pertanyaan: soal_kuis.pertanyaan,
          pilihan: soal_kuis.pilihan,
        })
        .from(soal_kuis)
        .where(eq(soal_kuis.id_tugas, id))
        .orderBy(asc(soal_kuis.urutan));
      return c.json({ ...dasar, soal });
    }
    const langkah = await db
      .select({
        id_langkah: langkah_simulasi.id_langkah,
        urutan: langkah_simulasi.urutan,
        kode: langkah_simulasi.kode,
        judul: langkah_simulasi.judul,
        deskripsi: langkah_simulasi.deskripsi,
        id_bagian: langkah_simulasi.id_bagian,
      })
      .from(langkah_simulasi)
      .where(eq(langkah_simulasi.id_tugas, id))
      .orderBy(asc(langkah_simulasi.urutan));
    return c.json({ ...dasar, langkah });
  });

  /* Kirim jawaban satu percobaan: dinilai di server */
  r.post("/tugas/:id/percobaan", async (c) => {
    const id = idDariParam(c.req.param("id"));
    if (!id) throw new GalatApi(400, "Id tugas tidak valid.");
    const t = await ambilTugas(deps, id);
    const { jawaban } = await bacaBody(c, PercobaanSchema);
    let benar = 0;
    let total = 0;
    let penalti = 0;
    let rincian: unknown[];
    if (t.jenis === "kuis") {
      const soal = await db.select().from(soal_kuis).where(eq(soal_kuis.id_tugas, id)).orderBy(asc(soal_kuis.urutan));
      if (jawaban.length !== soal.length)
        throw new GalatApi(400, `Jawaban harus ${soal.length} butir, sesuai jumlah soal.`, "JUMLAH_JAWABAN_SALAH");
      total = soal.length;
      rincian = soal.map((s, i) => {
        const pilih = jawaban[i] as number;
        if (pilih >= s.pilihan.length) throw new GalatApi(400, `Pilihan soal ${i + 1} di luar jangkauan.`);
        const betul = pilih === s.jawaban_benar;
        if (betul) benar += 1;
        return {
          id_soal: s.id_soal,
          benar: betul,
          jawaban_anda: pilih === -1 ? null : pilih,
          jawaban_benar: s.jawaban_benar,
          penjelasan: s.penjelasan,
        };
      });
    } else if (t.jenis === "simulasi") {
      const langkah = await db
        .select()
        .from(langkah_simulasi)
        .where(eq(langkah_simulasi.id_tugas, id))
        .orderBy(asc(langkah_simulasi.urutan));
      const ids = langkah.map((l) => l.id_langkah);
      const urut = [...jawaban].sort((a, b) => a - b);
      if (jawaban.length !== ids.length || urut.join() !== [...ids].sort((a, b) => a - b).join())
        throw new GalatApi(400, "Jawaban harus memuat setiap langkah tepat satu kali.", "URUTAN_TIDAK_LENGKAP");
      total = ids.length;
      rincian = langkah.map((l, i) => {
        const betul = jawaban[i] === l.id_langkah;
        if (betul) benar += 1;
        return {
          posisi: i + 1,
          id_langkah_anda: jawaban[i],
          id_langkah_benar: l.id_langkah,
          benar: betul,
          judul_benar: l.judul,
        };
      });
    } else {
      /* Rakit organ: jawaban[i] = berapa kali bagian ke-i dilepas sampai terpasang benar (0 = belum terpasang).
         Pemasangan benar dinilai klien (posisi 3D); server memeriksa kewajaran dan menghitung skor. */
      const bagian = await db
        .select()
        .from(langkah_simulasi)
        .where(eq(langkah_simulasi.id_tugas, id))
        .orderBy(asc(langkah_simulasi.urutan));
      if (jawaban.length !== bagian.length)
        throw new GalatApi(400, `Jawaban harus ${bagian.length} butir, sesuai jumlah bagian.`, "JUMLAH_JAWABAN_SALAH");
      if (jawaban.some((j) => j < 0 || j > 50))
        throw new GalatApi(400, "Jumlah percobaan per bagian harus 0 sampai 50.", "NILAI_TIDAK_WAJAR");
      total = bagian.length;
      benar = jawaban.filter((j) => j > 0).length;
      const salahTotal = jawaban.reduce((s, j) => s + Math.max(0, j - 1), 0);
      rincian = bagian.map((b, i) => ({
        id_langkah: b.id_langkah,
        judul: b.judul,
        terpasang: (jawaban[i] as number) > 0,
        percobaan: jawaban[i],
      }));
      penalti = Math.min(30, salahTotal * 2);
    }
    const skor = Math.max(0, Math.round((benar / total) * 100) - penalti);
    const [p] = await db
      .insert(percobaan_tugas)
      .values({ id_user: c.get("pengguna").id_user, id_tugas: id, skor, benar, total, jawaban })
      .returning();
    return c.json(
      { id_percobaan: p?.id_percobaan, skor, benar, total, ambang: t.ambang, selesai: skor >= t.ambang, rincian },
      201,
    );
  });

  return r;
}

/** Rute admin: lihat tugas beserta kunci, dan kelola soal kuis. */
export function rutTugasAdmin(deps: Deps) {
  const { db } = deps;
  const r = new Hono<AppEnv>();

  r.get("/tugas", async (c) => {
    const daftar = await db.select().from(tugas).orderBy(asc(tugas.id_tugas));
    const ids = daftar.map((t) => t.id_tugas);
    const soal = ids.length
      ? await db.select().from(soal_kuis).where(inArray(soal_kuis.id_tugas, ids)).orderBy(asc(soal_kuis.urutan))
      : [];
    const langkah = ids.length
      ? await db
          .select()
          .from(langkah_simulasi)
          .where(inArray(langkah_simulasi.id_tugas, ids))
          .orderBy(asc(langkah_simulasi.urutan))
      : [];
    return c.json(
      daftar.map((t) => ({
        ...t,
        soal: soal.filter((s) => s.id_tugas === t.id_tugas),
        langkah: langkah.filter((l) => l.id_tugas === t.id_tugas),
      })),
    );
  });

  r.post("/tugas/:id/soal", async (c) => {
    const id = idDariParam(c.req.param("id"));
    if (!id) throw new GalatApi(400, "Id tugas tidak valid.");
    const [t] = await db.select().from(tugas).where(eq(tugas.id_tugas, id)).limit(1);
    if (!t) throw new GalatApi(404, "Tugas tidak ditemukan.");
    if (t.jenis !== "kuis") throw new GalatApi(409, "Soal hanya untuk tugas berjenis kuis.", "BUKAN_KUIS");
    const d = await bacaBody(c, SoalBuatSchema);
    const [{ terakhir }] = (await db
      .select({ terakhir: sql<number>`coalesce(max(${soal_kuis.urutan}), 0)::int` })
      .from(soal_kuis)
      .where(eq(soal_kuis.id_tugas, id))) as [{ terakhir: number }];
    const [baru] = await db
      .insert(soal_kuis)
      .values({ ...d, id_tugas: id, urutan: terakhir + 1 })
      .returning();
    return c.json(baru, 201);
  });

  r.patch("/soal/:id", async (c) => {
    const id = idDariParam(c.req.param("id"));
    if (!id) throw new GalatApi(400, "Id soal tidak valid.");
    const d = await bacaBody(c, SoalPatchSchema);
    const [lama] = await db.select().from(soal_kuis).where(eq(soal_kuis.id_soal, id)).limit(1);
    if (!lama) throw new GalatApi(404, "Soal tidak ditemukan.");
    const pilihan = d.pilihan ?? lama.pilihan;
    const kunci = d.jawaban_benar ?? lama.jawaban_benar;
    if (kunci >= pilihan.length) throw new GalatApi(400, "Jawaban benar di luar pilihan.");
    const [u] = await db.update(soal_kuis).set(d).where(eq(soal_kuis.id_soal, id)).returning();
    return c.json(u);
  });

  r.delete("/soal/:id", async (c) => {
    const id = idDariParam(c.req.param("id"));
    if (!id) throw new GalatApi(400, "Id soal tidak valid.");
    const hapus = await db.delete(soal_kuis).where(eq(soal_kuis.id_soal, id)).returning({ id: soal_kuis.id_soal });
    if (hapus.length === 0) throw new GalatApi(404, "Soal tidak ditemukan.");
    return c.json({ ok: true });
  });

  return r;
}
