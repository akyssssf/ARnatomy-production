import { beforeEach, describe, expect, it, vi } from "vitest";
import { BagianIdSchema, KontenIdSchema, UserIdSchema } from "@/lib/schemas";

const idUser = UserIdSchema.parse(1);
const idBagian = BagianIdSchema.parse(4);
const idKonten = KontenIdSchema.parse(8);

/* Toko hidup di globalThis; dibersihkan tiap uji agar independen */
function resetToko() {
  delete (globalThis as Record<symbol, unknown>)[Symbol.for("arnatomy.db")];
}

describe("db (memori server)", () => {
  beforeEach(() => {
    resetToko();
    vi.useRealTimers();
  });

  it("konten: baca, cari per bagian, dan perbarui sebagian (Partial)", async () => {
    const db = await import("@/lib/db");
    expect(db.semuaKonten()).toHaveLength(20);
    expect(db.kontenBagian(idBagian, "dasar")?.judul_tampil).toBe("Ventrikel Kiri");
    const hasil = db.perbaruiKonten(idKonten, { status_validasi: "draft" });
    expect(hasil?.status_validasi).toBe("draft");
    expect(db.kontenById(idKonten)?.judul_tampil).toBe("Aorta"); // kolom lain tidak berubah
    expect(db.perbaruiKonten(KontenIdSchema.parse(999), { deskripsi: "x".repeat(20) })).toBeNull();
  });

  it("riwayat: catat, tutup dengan durasi dari server, dan rekap", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-19T01:00:00.000Z"));
    const db = await import("@/lib/db");
    const entri = db.catatRiwayat(idUser, idBagian, "dasar");
    expect(entri.durasi).toBeNull();
    vi.setSystemTime(new Date("2026-09-19T01:00:12.400Z"));
    expect(db.tutupRiwayat(idUser, entri.id_riwayat)?.durasi).toBe(12);
    /* menutup dua kali tidak mengubah durasi */
    expect(db.tutupRiwayat(idUser, entri.id_riwayat)?.durasi).toBe(12);
    expect(db.tutupRiwayat(UserIdSchema.parse(2), entri.id_riwayat)).toBeNull();

    db.catatRiwayat(idUser, idBagian, "dimmed");
    const rekap = db.ringkasanRiwayat(idUser);
    expect(rekap).toHaveLength(1);
    expect(rekap[0]).toMatchObject({ id_bagian: idBagian, jumlah: 2, dimmedDibuka: true, totalDurasi: 12 });
    expect(db.riwayatUser(UserIdSchema.parse(2))).toEqual([]);
  });

  it("percakapan & laporan terikat pada pengguna, dan dibersihkan saat keluar", async () => {
    const db = await import("@/lib/db");
    db.tambahPercakapan(idUser, idBagian, "Apa fungsinya?", "Memompa darah.");
    db.tambahPercakapan(UserIdSchema.parse(2), null, "Halo", "Hai.");
    expect(db.percakapanUser(idUser)).toHaveLength(1);

    const laporan = db.tambahLaporan(idUser, idKonten, "Ada kesalahan angka diameter.");
    expect(laporan.status_tindak_lanjut).toBe("baru");
    expect(db.tindakLanjutiLaporan(laporan.id_laporan)?.status_tindak_lanjut).toBe("ditindaklanjuti");
    expect(db.tindakLanjutiLaporan(laporan.id_laporan)?.status_tindak_lanjut).toBe("ditindaklanjuti");

    db.catatRiwayat(idUser, idBagian, "dasar");
    db.bersihkanDataUser(idUser);
    expect(db.percakapanUser(idUser)).toEqual([]);
    expect(db.riwayatUser(idUser)).toEqual([]);
    /* laporan tetap ada untuk admin */
    expect(db.semuaLaporan()).toHaveLength(1);
    /* data pengguna lain tidak ikut terhapus */
    expect(db.percakapanUser(UserIdSchema.parse(2))).toHaveLength(1);
  });

  it("jeda menunggu selama ms yang diminta", async () => {
    vi.useFakeTimers();
    const db = await import("@/lib/db");
    const janji = db.jeda(500);
    vi.advanceTimersByTime(500);
    await expect(janji).resolves.toBeUndefined();
  });
});
