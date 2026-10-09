import { beforeEach, describe, expect, it } from "vitest";
import { UserIdSchema } from "@/lib/schemas";
import { predikatSus } from "@/lib/sus";

function resetToko() {
  delete (globalThis as Record<symbol, unknown>)[Symbol.for("arnatomy.db")];
}
const idSiswa = UserIdSchema.parse(1);

describe("db: akun pengguna (FR-01, FR-02, FR-13)", () => {
  beforeEach(resetToko);

  it("seed di-hash sekali: verifikasiLogin ok/salah, email tidak peka huruf besar", async () => {
    const db = await import("@/lib/db");
    expect(await db.verifikasiLogin("SISWA@arnatomy.id", "siswa123")).toMatchObject({
      status: "ok",
      user: { id_user: 1 },
    });
    expect(await db.verifikasiLogin("siswa@arnatomy.id", "salah")).toEqual({ status: "salah" });
    expect(await db.verifikasiLogin("tidak@ada.id", "siswa123")).toEqual({ status: "salah" });
    const akun = await db.semuaAkun();
    expect(akun).toHaveLength(3);
    for (const a of akun) {
      expect(a).not.toHaveProperty("password");
      expect(a).not.toHaveProperty("sandi_hash");
    }
  });

  it("daftarkanAkun menolak email ganda dan akun baru langsung bisa masuk", async () => {
    const db = await import("@/lib/db");
    const input = {
      nama: "Dina",
      email: "Dina@sekolah.sch.id",
      password: "rahasia123",
      konfirmasi: "rahasia123",
      role: "guru" as const,
      asal_sekolah: "SMAN 1",
    };
    const user = await db.daftarkanAkun(input);
    expect(user).toMatchObject({ nama: "Dina", email: "dina@sekolah.sch.id", role: "guru" });
    expect(user).not.toHaveProperty("aktif");
    expect(await db.daftarkanAkun(input)).toBeNull();
    expect(await db.verifikasiLogin("dina@sekolah.sch.id", "rahasia123")).toMatchObject({ status: "ok" });
    expect((await db.akunById(user?.id_user as never))?.aktif).toBe(true);
  });

  it("setAkunAktif memblokir login; hapusAkun membuang akun beserta data belajarnya", async () => {
    const db = await import("@/lib/db");
    expect((await db.setAkunAktif(idSiswa, false))?.aktif).toBe(false);
    expect(await db.verifikasiLogin("siswa@arnatomy.id", "siswa123")).toEqual({ status: "nonaktif" });
    expect(await db.setAkunAktif(UserIdSchema.parse(999), false)).toBeNull();

    db.catatRiwayat(idSiswa, 4 as never, "dasar");
    db.tambahUmpanBalik(idSiswa, [3, 3, 3, 3, 3, 3, 3, 3, 3, 3], null);
    expect(await db.hapusAkun(idSiswa)).toBe(true);
    expect(await db.hapusAkun(idSiswa)).toBe(false);
    expect(await db.akunById(idSiswa)).toBeNull();
    expect(db.riwayatUser(idSiswa)).toEqual([]);
    expect(db.umpanBalikUser(idSiswa)).toBeNull();
  });
});

describe("db: aset model 3D (FR-12)", () => {
  beforeEach(resetToko);

  it("bawaan melaporkan ukuran berkas public/models; unggahan menaikkan versi; hapus mengembalikan bawaan", async () => {
    const db = await import("@/lib/db");
    const { OrganIdSchema } = await import("@/lib/schemas");
    const id = OrganIdSchema.parse(2);
    const bawaan = db.asetOrgan(id);
    expect(bawaan).toMatchObject({ sumber: "bawaan", nama_berkas: "lungs.glb", url: "/models/lungs.glb", versi: 0 });
    expect(bawaan?.ukuran_byte).toBeGreaterThan(1_000_000);
    expect(db.asetOrgan(OrganIdSchema.parse(99))).toBeNull();
    expect(db.simpanAset(OrganIdSchema.parse(99), "x.glb", new Uint8Array(20))).toBeNull();

    const bytes = new Uint8Array(20);
    bytes.set([0x67, 0x6c, 0x54, 0x46]);
    expect(db.adalahGlb(bytes)).toBe(true);
    expect(db.adalahGlb(new Uint8Array(20))).toBe(false);
    expect(db.adalahGlb(new Uint8Array(4))).toBe(false);
    expect(db.simpanAset(id, "paru.glb", bytes)).toMatchObject({
      sumber: "unggahan",
      versi: 1,
      url: "/api/model/2/v1.glb",
    });
    expect(db.simpanAset(id, "paru2.glb", bytes)?.versi).toBe(2);
    expect(db.bytesAset(id, 1)).toBeNull();
    expect(db.bytesAset(id, 2)?.byteLength).toBe(20);
    expect(db.semuaAset().map((a) => a.sumber)).toEqual(["bawaan", "unggahan"]);
    expect(db.hapusAset(id)).toBe(true);
    expect(db.hapusAset(id)).toBe(false);
    expect(db.asetOrgan(id)?.sumber).toBe("bawaan");
  });
});

describe("db: umpan balik SUS (FR-15)", () => {
  beforeEach(resetToko);

  it("hitungSkorSus: butir ganjil positif, genap dibalik, dikali 2,5", async () => {
    const { hitungSkorSus } = await import("@/lib/db");
    expect(hitungSkorSus([5, 1, 5, 1, 5, 1, 5, 1, 5, 1])).toBe(100);
    expect(hitungSkorSus([1, 5, 1, 5, 1, 5, 1, 5, 1, 5])).toBe(0);
    expect(hitungSkorSus([3, 3, 3, 3, 3, 3, 3, 3, 3, 3])).toBe(50);
    expect(hitungSkorSus([4, 2, 4, 2, 4, 2, 4, 2, 4, 3])).toBe(72.5);
  });

  it("satu kuesioner per pengguna: kiriman ulang menggantikan; komentar kosong -> null", async () => {
    const db = await import("@/lib/db");
    const pertama = db.tambahUmpanBalik(idSiswa, [3, 3, 3, 3, 3, 3, 3, 3, 3, 3], "  ");
    expect(pertama.komentar).toBeNull();
    expect(pertama.skor_sus).toBe(50);
    const kedua = db.tambahUmpanBalik(idSiswa, [5, 1, 5, 1, 5, 1, 5, 1, 5, 1], "Bagus");
    expect(db.semuaUmpanBalik()).toHaveLength(1);
    expect(db.umpanBalikUser(idSiswa)).toMatchObject({
      id_umpan_balik: kedua.id_umpan_balik,
      skor_sus: 100,
      komentar: "Bagus",
    });
    /* salinan: mengubah hasil tidak mengubah toko */
    const salinan = db.semuaUmpanBalik();
    salinan[0]?.jawaban.fill(1);
    expect(db.umpanBalikUser(idSiswa)?.jawaban[0]).toBe(5);
  });

  it("predikatSus mengikuti skala adjektif", () => {
    expect(predikatSus(90)).toBe("Sangat baik");
    expect(predikatSus(75)).toBe("Baik");
    expect(predikatSus(60)).toBe("Cukup");
    expect(predikatSus(30)).toBe("Perlu perbaikan");
  });
});
