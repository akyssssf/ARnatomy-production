import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BagianIdSchema, KontenIdSchema, OrganIdSchema, UserIdSchema } from "@/lib/schemas";

function resetToko() {
  delete (globalThis as Record<symbol, unknown>)[Symbol.for("arnatomy.db")];
}

describe("persist (snapshot basis data mock)", () => {
  let dir = "";
  beforeEach(() => {
    vi.resetModules();
    resetToko();
    dir = mkdtempSync(join(tmpdir(), "arnatomy-"));
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    rmSync(dir, { recursive: true, force: true });
  });

  it("tanpa adapter: memori saja, simpan/muat tidak melakukan apa pun", async () => {
    vi.stubEnv("DATA_DIR", "");
    vi.stubEnv("KV_REST_API_URL", "");
    const persist = await import("@/lib/persist");
    await import("@/lib/db");
    expect(persist.adapterAktif()).toBe("memori");
    await persist.simpanSekarang();
    expect(await persist.muatSnapshot()).toBe(false);
  });

  it("adapter berkas: mutasi -> snapshot JSON (termasuk byte model) -> dipulihkan di proses baru", async () => {
    vi.stubEnv("DATA_DIR", dir);
    vi.stubEnv("KV_REST_API_URL", "");
    const persist = await import("@/lib/persist");
    const db = await import("@/lib/db");
    expect(persist.adapterAktif()).toBe("berkas");
    const idUser = UserIdSchema.parse(1);
    db.catatRiwayat(idUser, BagianIdSchema.parse(4), "dasar");
    const glb = new Uint8Array([0x67, 0x6c, 0x54, 0x46, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    db.simpanAset(OrganIdSchema.parse(1), "jantung-baru.glb", glb);
    await db.daftarkanAkun({
      nama: "Dina",
      email: "dina@s.id",
      password: "rahasia123",
      konfirmasi: "rahasia123",
      role: "siswa",
      asal_sekolah: "SMP",
    });
    await persist.simpanSekarang();
    const teks = readFileSync(join(dir, "arnatomy-db.json"), "utf8");
    expect(teks).toContain("jantung-baru.glb");
    expect(teks).not.toContain("rahasia123"); // hanya hash yang disimpan

    /* "proses baru": modul & toko kosong, lalu snapshot dimuat */
    vi.resetModules();
    resetToko();
    const persist2 = await import("@/lib/persist");
    const db2 = await import("@/lib/db");
    expect(db2.riwayatUser(idUser)).toHaveLength(0);
    expect(await persist2.muatSnapshot()).toBe(true);
    expect(db2.riwayatUser(idUser)).toHaveLength(1);
    expect(db2.asetOrgan(OrganIdSchema.parse(1))).toMatchObject({
      sumber: "unggahan",
      nama_berkas: "jantung-baru.glb",
    });
    expect(db2.bytesAset(OrganIdSchema.parse(1), 1)?.byteLength).toBe(13);
    expect(await db2.verifikasiLogin("dina@s.id", "rahasia123")).toMatchObject({ status: "ok" });
    /* id baru tidak menabrak id lama */
    const baru = db2.catatRiwayat(idUser, BagianIdSchema.parse(5), "dimmed");
    expect(baru.id_riwayat).toBeGreaterThan(1002);
  });

  it("pulihkan menggabungkan entri transaksional: laporan ditindaklanjuti menang, SUS terbaru menang, data pasca-logout dibuang", async () => {
    vi.stubEnv("DATA_DIR", dir);
    vi.stubEnv("KV_REST_API_URL", "");
    const persist = await import("@/lib/persist");
    const db = await import("@/lib/db");
    const idSiswa = UserIdSchema.parse(1);
    const idBagian = BagianIdSchema.parse(4);

    /* Keadaan lokal: laporan sudah ditindaklanjuti, SUS baru, riwayat aktif */
    const laporan = db.tambahLaporan(idSiswa, KontenIdSchema.parse(8), "Deskripsi aorta keliru.");
    db.tindakLanjutiLaporan(laporan.id_laporan);
    const susBaru = db.tambahUmpanBalik(idSiswa, [5, 1, 5, 1, 5, 1, 5, 1, 5, 1], "versi baru");
    db.catatRiwayat(idSiswa, idBagian, "dasar");

    /* Snapshot "instance lain": laporan sama tapi masih baru, SUS lebih lama,
       plus percakapan & riwayat milik pengguna yang di sini sudah logout */
    const lampau = "2020-01-01T00:00:00.000Z";
    writeFileSync(
      join(dir, "arnatomy-db.json"),
      JSON.stringify({
        laporan_kesalahan: [{ ...laporan, status_tindak_lanjut: "baru" }],
        umpan_balik: [{ ...susBaru, id_umpan_balik: 9001, skor_sus: 10, komentar: "versi lama", waktu: lampau }],
        ai_conversations: [
          { id_percakapan: 9002, id_user: 1, id_bagian: null, pertanyaan: "p", jawaban: "j", waktu: lampau },
        ],
        learning_history: [
          { id_riwayat: 9003, id_user: 1, id_bagian: 4, jenis_konten: "dasar", waktu_akses: lampau, durasi: null },
        ],
        akun: null,
        aset_model: [],
        urutanId: 0,
        hapus_akun: [],
        bersih_user: {},
      }),
    );
    /* Pengguna keluar: data belajarnya dibuang -> tombstone menahan data lama dari snapshot */
    db.bersihkanDataUser(idSiswa);
    expect(await persist.muatSnapshot()).toBe(true);

    expect(db.semuaLaporan()[0]?.status_tindak_lanjut).toBe("ditindaklanjuti");
    expect(db.umpanBalikUser(idSiswa)).toMatchObject({ skor_sus: 100, komentar: "versi baru" });
    expect(db.percakapanUser(idSiswa)).toEqual([]);
    expect(db.riwayatUser(idSiswa)).toEqual([]);
  });

  it("adapter KV: GET-gabung-SET lewat REST tanpa byte model; instance lain tidak tertimpa; snapshot rusak diabaikan", async () => {
    vi.stubEnv("DATA_DIR", "");
    vi.stubEnv("KV_REST_API_URL", "https://kv.uji.io");
    vi.stubEnv("KV_REST_API_TOKEN", "token-uji");
    /* "instance A" sudah menulis snapshot berisi akun Alpin; instance ini (B) menambah Dimas */
    const akunAlpin = {
      id_user: 1001,
      nama: "Alpin",
      email: "alpin@r.id",
      role: "siswa",
      asal_sekolah: null,
      aktif: true,
      sandi_hash: "pbkdf2-sha256$1$a$b",
    };
    let snapshotRemote = JSON.stringify({
      akun: [akunAlpin],
      umpan_balik: [],
      urutanId: 1001,
      hapus_akun: [],
      bersih_user: {},
    });
    /* Jawaban dibuat per-jenis-permintaan (bukan mockResolvedValueOnce) supaya
       penyimpanan terjadwal (debounce) yang ikut berjalan tidak menggeser urutan mock. */
    const fetchMock = vi.fn<typeof fetch>(async (masukan) => {
      const url = String(masukan);
      if (url.endsWith("/get/arnatomy:db")) return new Response(JSON.stringify({ result: snapshotRemote }));
      return new Response('{"result":"OK"}');
    });
    vi.stubGlobal("fetch", fetchMock);
    const setTerakhir = () => {
      const post = fetchMock.mock.calls.filter(([, init]) => init?.method === "POST").at(-1);
      const [cmd, kunci, nilai] = JSON.parse(String(post?.[1]?.body)) as [string, string, string];
      expect([cmd, kunci]).toEqual(["SET", "arnatomy:db"]);
      expect(((post?.[1]?.headers ?? {}) as Record<string, string>).Authorization).toBe("Bearer token-uji");
      return JSON.parse(nilai);
    };

    const persist = await import("@/lib/persist");
    const db = await import("@/lib/db");
    expect(persist.adapterAktif()).toBe("kv");
    db.simpanAset(
      OrganIdSchema.parse(2),
      "paru.glb",
      new Uint8Array([0x67, 0x6c, 0x54, 0x46, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    );
    const dibuat = await db.daftarkanAkun({
      nama: "Dimas",
      email: "dimas@r.id",
      password: "rahasia123",
      konfirmasi: "rahasia123",
      role: "siswa",
      asal_sekolah: "SV",
    });
    await persist.simpanSekarang();

    expect(fetchMock.mock.calls.some(([u]) => String(u).endsWith("/get/arnatomy:db"))).toBe(true);
    const ditulis = setTerakhir();
    /* byte model tidak ikut ke KV (batas ukuran nilai) */
    expect(ditulis.aset_model[0][1].bytes_b64).toBeNull();
    /* akun dari instance lain tetap ada, akun lokal ikut tertulis */
    expect(ditulis.akun.map((a: { nama: string }) => a.nama).sort()).toEqual([
      "Admin Konten",
      "Alpin",
      "Bu Ratna, S.Pd.",
      "Dimas",
      "Nehan Raki Alfawzi",
    ]);
    expect(await db.akunById(UserIdSchema.parse(1001))).toMatchObject({ nama: "Alpin" });
    /* id berbasis waktu: tidak menabrak id instance lain */
    expect(dibuat?.id_user).toBeGreaterThan(1001);

    /* tombstone: akun yang dihapus di sini tidak hidup lagi dari snapshot remote */
    await db.hapusAkun(UserIdSchema.parse(1001));
    await persist.simpanSekarang();
    const lagi = setTerakhir();
    expect(lagi.hapus_akun).toEqual([1001]);
    expect(lagi.akun.some((a: { id_user: number }) => a.id_user === 1001)).toBe(false);

    /* snapshot remote rusak atau GET gagal -> muatSnapshot false, tidak melempar */
    snapshotRemote = "{bukan json";
    expect(await persist.muatSnapshot()).toBe(false);
    fetchMock.mockResolvedValueOnce(new Response("", { status: 500 }));
    expect(await persist.muatSnapshot()).toBe(false);
  });
});
