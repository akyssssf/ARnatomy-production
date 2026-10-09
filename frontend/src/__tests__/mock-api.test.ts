import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ambilAkun,
  ambilKonten,
  ambilLaporan,
  ambilPercakapan,
  ambilRiwayat,
  catatRiwayat,
  daftar,
  GalatApi,
  hapusAkun,
  hapusAsetModel,
  keluar,
  kirimLaporan,
  kirimPertanyaan,
  masuk,
  perbaruiKonten,
  tambahAkun,
  tindakLanjutiLaporan,
  tutupRiwayat,
  ubahAkun,
  unggahAset,
} from "@/lib/mock-api";
import {
  BagianIdSchema,
  KontenIdSchema,
  LaporanIdSchema,
  OrganIdSchema,
  RiwayatIdSchema,
  UserIdSchema,
} from "@/lib/schemas";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const percakapan = {
  id_percakapan: 1001,
  id_user: 1,
  id_bagian: 5,
  pertanyaan: "Apa fungsi aorta?",
  jawaban: "Menyalurkan darah.",
  waktu: "2026-09-19T01:00:00.000Z",
};

describe("mock-api (lapisan fetch klien)", () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("mem-parse respons dengan skema Zod dan mengirim body JSON", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([percakapan]));
    const daftar = await ambilPercakapan();
    expect(daftar[0]?.pertanyaan).toBe("Apa fungsi aorta?");

    fetchMock.mockResolvedValueOnce(jsonResponse(percakapan, 201));
    await kirimPertanyaan({ pertanyaan: "x", id_bagian: null, simulasiGagal: false });
    const [url, init] = fetchMock.mock.calls[1] ?? [];
    expect(url).toBe("/api/asisten");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toMatchObject({ pertanyaan: "x", simulasiGagal: false });
  });

  it("akun & aset: JSON untuk akun, multipart tanpa Content-Type JSON untuk unggah model", async () => {
    const akun = { id_user: 1001, nama: "Dina", email: "dina@s.id", role: "siswa", asal_sekolah: null, aktif: true };
    fetchMock.mockResolvedValueOnce(jsonResponse({ user: { ...akun, aktif: undefined } }, 201));
    await daftar({
      nama: "Dina",
      email: "dina@s.id",
      password: "rahasia123",
      konfirmasi: "rahasia123",
      role: "siswa",
      asal_sekolah: "SMP",
    });
    fetchMock.mockResolvedValueOnce(jsonResponse([akun]));
    expect((await ambilAkun())[0]?.aktif).toBe(true);
    fetchMock.mockResolvedValueOnce(jsonResponse(akun, 201));
    await tambahAkun({ nama: "Dina", email: "dina@s.id", password: "rahasia123", role: "siswa", asal_sekolah: null });
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...akun, aktif: false }));
    expect((await ubahAkun(UserIdSchema.parse(1001), { aktif: false })).aktif).toBe(false);
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));
    await hapusAkun(UserIdSchema.parse(1001));
    expect(fetchMock.mock.calls[4]?.[1]?.method).toBe("DELETE");

    const aset = {
      id_organ: 1,
      nama_berkas: "x.glb",
      ukuran_byte: 24,
      sumber: "unggahan",
      url: "/api/model/1/v1.glb",
      versi: 1,
      waktu: "2026-09-19T01:00:00.000Z",
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(aset, 201));
    await unggahAset(OrganIdSchema.parse(1), new File([new Uint8Array(24)], "x.glb"));
    const [url, init] = fetchMock.mock.calls[5] ?? [];
    expect(url).toBe("/api/aset");
    expect(init?.body).toBeInstanceOf(FormData);
    expect((init?.headers ?? {}) as Record<string, string>).not.toHaveProperty("Content-Type");
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ ...aset, sumber: "bawaan", url: "/models/heart.glb", versi: 0, waktu: null }),
    );
    expect((await hapusAsetModel(OrganIdSchema.parse(1))).sumber).toBe("bawaan");
  });

  it("galat server diubah jadi GalatApi dengan pesan dari body dan status", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ pesan: "simulasi kegagalan koneksi." }, 503));
    await expect(kirimPertanyaan({ pertanyaan: "x", id_bagian: null, simulasiGagal: true })).rejects.toMatchObject({
      name: "GalatApi",
      status: 503,
      message: "simulasi kegagalan koneksi.",
    });
    fetchMock.mockResolvedValueOnce(new Response("bukan json", { status: 500 }));
    await expect(ambilKonten()).rejects.toMatchObject({ status: 500, message: /status 500/ });
  });

  it("respons yang tidak sesuai skema ditolak sebelum masuk cache", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([{ ...percakapan, waktu: "kemarin" }]));
    await expect(ambilPercakapan()).rejects.toMatchObject({ status: 500, message: /skema/ });
  });

  it("kegagalan jaringan dan batas waktu menghasilkan pesan yang bisa dibaca", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(keluar()).rejects.toMatchObject({ status: 0, message: /tidak dapat dihubungi/ });

    fetchMock.mockImplementationOnce((_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      });
    });
    vi.useFakeTimers();
    const janji = tindakLanjutiLaporan(LaporanIdSchema.parse(5));
    const hasil = expect(janji).rejects.toMatchObject({ status: 408, message: /batas waktu/ });
    await vi.advanceTimersByTimeAsync(8001);
    await hasil;
    vi.useRealTimers();
  });

  it("masuk mengembalikan pengguna dari amplop { user }", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        user: { id_user: 1, nama: "Nehan", email: "siswa@arnatomy.id", role: "siswa", asal_sekolah: null },
      }),
    );
    const user = await masuk({ email: "siswa@arnatomy.id", password: "siswa123" });
    expect(user.role).toBe("siswa");
    expect(new GalatApi("x", 1).name).toBe("GalatApi");
  });

  it("fungsi lain memetakan ke endpoint dan metode yang benar", async () => {
    const laporan = {
      id_laporan: 1,
      id_user: 1,
      id_konten: 8,
      deskripsi_laporan: "x".repeat(12),
      status_tindak_lanjut: "baru",
      waktu: percakapan.waktu,
    };
    const konten = {
      id_konten: 8,
      id_bagian: 5,
      jenis_konten: "dasar",
      judul_tampil: "Aorta",
      deskripsi: "x".repeat(25),
      status_tampilan: "aktif",
      status_validasi: "draft",
    };
    const riwayat = {
      id_riwayat: 1001,
      id_user: 1,
      id_bagian: 4,
      jenis_konten: "dasar",
      waktu_akses: percakapan.waktu,
      durasi: null,
    };
    fetchMock
      .mockResolvedValueOnce(jsonResponse([laporan]))
      .mockResolvedValueOnce(jsonResponse(laporan, 201))
      .mockResolvedValueOnce(jsonResponse(konten))
      .mockResolvedValueOnce(jsonResponse([riwayat]))
      .mockResolvedValueOnce(jsonResponse(riwayat, 201))
      .mockResolvedValueOnce(jsonResponse({ ...riwayat, durasi: 3 }));
    expect(await ambilLaporan()).toHaveLength(1);
    await kirimLaporan({ id_konten: KontenIdSchema.parse(8), deskripsi_laporan: "x".repeat(12), simulasiGagal: false });
    await perbaruiKonten(KontenIdSchema.parse(8), {
      judul_tampil: "Aorta",
      deskripsi: "x".repeat(25),
      status_validasi: "draft",
    });
    expect(await ambilRiwayat()).toHaveLength(1);
    await catatRiwayat({ id_bagian: BagianIdSchema.parse(4), jenis_konten: "dasar" });
    expect((await tutupRiwayat(RiwayatIdSchema.parse(1001))).durasi).toBe(3);
    const panggilan = fetchMock.mock.calls.map(([url, init]) => `${init?.method ?? "GET"} ${url}`);
    expect(panggilan).toEqual([
      "GET /api/laporan",
      "POST /api/laporan",
      "PATCH /api/konten/8",
      "GET /api/riwayat",
      "POST /api/riwayat",
      "PATCH /api/riwayat/1001",
    ]);
  });
});
