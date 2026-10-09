import { describe, expect, it } from "vitest";
import {
  AkunBuatSchema,
  AkunPatchSchema,
  AsetModelSchema,
  BagianIdSchema,
  BodyPartSchema,
  DaftarFormSchema,
  KontenFormSchema,
  LaporanFormSchema,
  LearningHistorySchema,
  LoginFormSchema,
  PertanyaanFormSchema,
  SesiUserSchema,
  UmpanBalikFormSchema,
  UserIdSchema,
  UserSchema,
} from "@/lib/schemas";

describe("skema entitas", () => {
  it("UserSchema menerima akun lengkap dan SesiUserSchema membuang password", () => {
    const user = UserSchema.parse({
      id_user: 1,
      nama: "Nehan",
      email: "siswa@arnatomy.id",
      password: "x",
      role: "siswa",
      asal_sekolah: null,
    });
    const sesi = SesiUserSchema.parse(user);
    expect(sesi).not.toHaveProperty("password");
    expect(sesi.role).toBe("siswa");
  });

  it("menolak peran di luar enum dan email tidak valid", () => {
    expect(
      UserSchema.safeParse({
        id_user: 1,
        nama: "a",
        email: "bukan-email",
        password: "x",
        role: "siswa",
        asal_sekolah: null,
      }).success,
    ).toBe(false);
    expect(
      UserSchema.safeParse({ id_user: 1, nama: "a", email: "a@b.id", password: "x", role: "dosen", asal_sekolah: null })
        .success,
    ).toBe(false);
  });

  it("branded id hanya menerima bilangan bulat positif", () => {
    expect(UserIdSchema.safeParse(0).success).toBe(false);
    expect(UserIdSchema.safeParse(1.5).success).toBe(false);
    expect(BagianIdSchema.parse(7)).toBe(7);
  });

  it("BodyPartSchema memvalidasi format koordinat dan default mesh_3d", () => {
    const dasar = {
      id_bagian: 1,
      id_organ: 1,
      nama_bagian_internal: "Atrium",
      parent_bagian_id: null,
      posisi_koordinat_3d: "-0.2,0.1,0.3",
      posisi_2d: "35,52",
      fakta: [],
    };
    expect(BodyPartSchema.parse(dasar).mesh_3d).toEqual([]);
    expect(BodyPartSchema.safeParse({ ...dasar, posisi_koordinat_3d: "0.1;0.2;0.3" }).success).toBe(false);
    expect(BodyPartSchema.safeParse({ ...dasar, posisi_2d: "-5,10" }).success).toBe(false);
  });

  it("LearningHistorySchema menuntut waktu ISO 8601", () => {
    const entri = {
      id_riwayat: 1001,
      id_user: 1,
      id_bagian: 2,
      jenis_konten: "dasar",
      waktu_akses: "2026-09-19T01:00:00.000Z",
      durasi: null,
    };
    expect(LearningHistorySchema.parse(entri).durasi).toBeNull();
    expect(LearningHistorySchema.safeParse({ ...entri, waktu_akses: "kemarin" }).success).toBe(false);
  });
});

describe("skema formulir", () => {
  it("LoginFormSchema memberi pesan per field", () => {
    const hasil = LoginFormSchema.safeParse({ email: "", password: "" });
    expect(hasil.success).toBe(false);
    if (!hasil.success) {
      const pesan = hasil.error.issues.map((i) => i.message);
      expect(pesan).toContain("Email wajib diisi.");
      expect(pesan).toContain("Kata sandi wajib diisi.");
    }
    const format = LoginFormSchema.safeParse({ email: "salah", password: "x" });
    expect(format.success).toBe(false);
    if (!format.success) expect(format.error.issues[0]?.message).toBe("Format email tidak valid.");
    expect(LoginFormSchema.parse({ email: "  a@b.id ", password: "x" }).email).toBe("a@b.id");
  });

  it("LaporanFormSchema memaksa id ke angka bermerek dan uraian minimal 10 karakter", () => {
    const ok = LaporanFormSchema.parse({ id_konten: "8", deskripsi_laporan: "  Ada salah ketik di sini  " });
    expect(ok.id_konten).toBe(8);
    expect(ok.deskripsi_laporan).toBe("Ada salah ketik di sini");
    expect(LaporanFormSchema.safeParse({ id_konten: 8, deskripsi_laporan: "pendek" }).success).toBe(false);
  });

  it("KontenFormSchema dan PertanyaanFormSchema membatasi panjang teks", () => {
    expect(
      KontenFormSchema.safeParse({ judul_tampil: "ab", deskripsi: "x".repeat(30), status_validasi: "draft" }).success,
    ).toBe(false);
    expect(
      KontenFormSchema.safeParse({ judul_tampil: "Judul", deskripsi: "x".repeat(30), status_validasi: "tervalidasi" })
        .success,
    ).toBe(true);
    expect(PertanyaanFormSchema.safeParse({ pertanyaan: "   ", id_bagian: null }).success).toBe(false);
    expect(PertanyaanFormSchema.safeParse({ pertanyaan: "x".repeat(501), id_bagian: 1 }).success).toBe(false);
  });
});

describe("skema formulir tambahan (FR-02, FR-15)", () => {
  const dasar = {
    nama: " Dina ",
    email: "dina@sekolah.sch.id",
    password: "rahasia123",
    konfirmasi: "rahasia123",
    role: "siswa",
    asal_sekolah: "SMPN 3",
  };

  it("DaftarFormSchema: trim nama, tolak sandi tanpa angka, konfirmasi beda menempel ke field konfirmasi", () => {
    expect(DaftarFormSchema.parse(dasar).nama).toBe("Dina");
    const lemah = DaftarFormSchema.safeParse({ ...dasar, password: "hanyahuruf", konfirmasi: "hanyahuruf" });
    expect(lemah.success).toBe(false);
    if (!lemah.success) expect(lemah.error.issues[0]?.message).toMatch(/angka/);
    const beda = DaftarFormSchema.safeParse({ ...dasar, konfirmasi: "rahasia124" });
    expect(beda.success).toBe(false);
    if (!beda.success) expect(beda.error.issues[0]?.path).toEqual(["konfirmasi"]);
    expect(DaftarFormSchema.safeParse({ ...dasar, role: "admin" }).success).toBe(false);
  });

  it("UmpanBalikFormSchema: tepat 10 jawaban 1-5, komentar opsional maks 500", () => {
    expect(UmpanBalikFormSchema.safeParse({ jawaban: Array(10).fill(3) }).success).toBe(true);
    expect(UmpanBalikFormSchema.safeParse({ jawaban: Array(9).fill(3) }).success).toBe(false);
    expect(UmpanBalikFormSchema.safeParse({ jawaban: [...Array(9).fill(3), 6] }).success).toBe(false);
    expect(UmpanBalikFormSchema.safeParse({ jawaban: Array(10).fill(3), komentar: "x".repeat(501) }).success).toBe(
      false,
    );
  });
});

describe("skema admin (FR-12, FR-13)", () => {
  it("AkunBuatSchema: sekolah kosong -> null; AkunPatchSchema: objek kosong ditolak, sandi kosong diizinkan", () => {
    const dibuat = AkunBuatSchema.parse({
      nama: "Admin 2",
      email: "a2@arnatomy.id",
      password: "sandi1234",
      role: "admin",
      asal_sekolah: "",
    });
    expect(dibuat.asal_sekolah).toBeNull();
    expect(AkunPatchSchema.safeParse({}).success).toBe(false);
    expect(AkunPatchSchema.safeParse({ password: "" }).success).toBe(true);
    expect(AkunPatchSchema.safeParse({ password: "lemah" }).success).toBe(false);
    expect(AkunPatchSchema.safeParse({ role: "dewa" }).success).toBe(false);
  });

  it("AsetModelSchema: url harus berawalan / dan berakhiran .glb", () => {
    const dasar = { id_organ: 1, nama_berkas: "heart.glb", ukuran_byte: 10, sumber: "bawaan", versi: 0, waktu: null };
    expect(AsetModelSchema.safeParse({ ...dasar, url: "/models/heart.glb" }).success).toBe(true);
    expect(AsetModelSchema.safeParse({ ...dasar, url: "/api/model/1/v1" }).success).toBe(false);
    expect(AsetModelSchema.safeParse({ ...dasar, url: "http://x/heart.glb" }).success).toBe(false);
  });
});
