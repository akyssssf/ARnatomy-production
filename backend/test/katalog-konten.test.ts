import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { klien, type Lingkungan, siapkan } from "./helpers";

let env: Lingkungan;
let k: ReturnType<typeof klien>;
let siswa: string;
let admin: string;
beforeAll(async () => {
  env = await siapkan();
  k = klien(env);
  siswa = await k.masuk("siswa");
  admin = await k.masuk("admin");
});
afterAll(() => env.tutup());

describe("katalog (FR-03, FR-05)", () => {
  it("daftar sistem organ dan organ beserta model aktif", async () => {
    const s = await k.panggil<unknown[]>("GET", "/v1/sistem-organ", { token: siswa });
    expect(s.body.length).toBe(8);
    const o = await k.panggil<{ nama_organ: string; model: { sumber: string; url: string } }[]>("GET", "/v1/organ", {
      token: siswa,
    });
    expect(o.body.map((x) => x.nama_organ)).toEqual(["Jantung", "Paru-paru"]);
    expect(o.body[0]?.model).toMatchObject({ sumber: "bawaan" });
  });
  it("detail organ memuat fakta, layer berurutan, bagian dengan mesh dan fakta", async () => {
    const r = await k.panggil<{
      nama_organ: string;
      fakta: unknown[];
      layer: { urutan_tampil: number }[];
      bagian: { nama_bagian_internal: string; mesh_3d: string[]; fakta: unknown[] }[];
    }>("GET", "/v1/organ/1", { token: siswa });
    expect(r.status).toBe(200);
    expect(r.body.nama_organ).toBe("Jantung");
    expect(r.body.fakta.length).toBeGreaterThan(0);
    const urutan = r.body.layer.map((l) => l.urutan_tampil);
    expect(urutan).toEqual([...urutan].sort((a, b) => a - b));
    const atrium = r.body.bagian.find((b) => b.nama_bagian_internal === "Atrium Kanan");
    expect(atrium?.mesh_3d).toContain("VH_M_right_cardiac_atrium");
    expect(atrium?.fakta.length).toBe(3);
  });
  it("layer organ, bagian tunggal, dan galat id tidak valid / tidak ada", async () => {
    const l = await k.panggil<unknown[]>("GET", "/v1/organ/2/layer", { token: siswa });
    expect(l.body.length).toBe(4);
    expect((await k.panggil("GET", "/v1/bagian/1", { token: siswa })).status).toBe(200);
    expect((await k.panggil("GET", "/v1/organ/abc", { token: siswa })).status).toBe(400);
    expect((await k.panggil("GET", "/v1/organ/999", { token: siswa })).status).toBe(404);
    expect((await k.panggil("GET", "/v1/bagian/999", { token: siswa })).status).toBe(404);
    expect((await k.panggil("GET", "/v1/organ/999/layer", { token: siswa })).status).toBe(404);
  });
});

describe("konten label (FR-06, FR-07, FR-10, NFR-06)", () => {
  it("pengguna melihat label dasar dan dimmed yang tervalidasi, bisa disaring per jenis", async () => {
    const semua = await k.panggil<{ jenis_konten: string }[]>("GET", "/v1/bagian/1/konten", { token: siswa });
    expect(semua.status).toBe(200);
    expect(semua.body.map((x) => x.jenis_konten).sort()).toEqual(["dasar", "dimmed"]);
    const dasar = await k.panggil<{ jenis_konten: string }[]>("GET", "/v1/bagian/1/konten?jenis=dasar", {
      token: siswa,
    });
    expect(dasar.body).toHaveLength(1);
    expect((await k.panggil("GET", "/v1/bagian/1/konten?jenis=lain", { token: siswa })).status).toBe(400);
    expect((await k.panggil("GET", "/v1/bagian/999/konten", { token: siswa })).status).toBe(404);
  });
  it("GET /v1/konten memuat semua label tervalidasi sekaligus; GET /v1/admin/umpan-balik hanya untuk admin", async () => {
    const semua = await k.panggil<{ status_validasi: string }[]>("GET", "/v1/konten", { token: siswa });
    expect(semua.status).toBe(200);
    expect(semua.body.length).toBeGreaterThan(2);
    expect(semua.body.every((x) => x.status_validasi === "tervalidasi")).toBe(true);
    expect((await k.panggil("GET", "/v1/admin/umpan-balik", { token: siswa })).status).toBe(403);
    const daftar = await k.panggil<unknown[]>("GET", "/v1/admin/umpan-balik", { token: admin });
    expect(daftar.status).toBe(200);
    expect(Array.isArray(daftar.body)).toBe(true);
  });
  it("draft tidak tampil ke pengguna; setelah diterbitkan admin langsung tampil", async () => {
    const daftar = await k.panggil<{ id_konten: number; id_bagian: number; jenis_konten: string }[]>(
      "GET",
      "/v1/admin/konten",
      { token: admin },
    );
    const target = daftar.body.find((x) => x.id_bagian === 2 && x.jenis_konten === "dasar");
    expect(target).toBeTruthy();
    const draft = await k.panggil("PATCH", `/v1/admin/konten/${target?.id_konten}`, {
      token: admin,
      json: { status_validasi: "draft" },
    });
    expect(draft.status).toBe(200);
    const sebelum = await k.panggil<{ jenis_konten: string }[]>("GET", "/v1/bagian/2/konten?jenis=dasar", {
      token: siswa,
    });
    expect(sebelum.body).toHaveLength(0);
    const terbit = await k.panggil<{ deskripsi: string; status_validasi: string }>(
      "PATCH",
      `/v1/admin/konten/${target?.id_konten}`,
      {
        token: admin,
        json: {
          status_validasi: "tervalidasi",
          deskripsi: "Deskripsi baru yang sudah ditinjau dan lebih dari dua puluh karakter.",
        },
      },
    );
    expect(terbit.body.status_validasi).toBe("tervalidasi");
    const sesudah = await k.panggil<{ deskripsi: string }[]>("GET", "/v1/bagian/2/konten?jenis=dasar", {
      token: siswa,
    });
    expect(sesudah.body[0]?.deskripsi).toContain("sudah ditinjau");
  });
  it("validasi perubahan konten dan galat id", async () => {
    expect((await k.panggil("PATCH", "/v1/admin/konten/1", { token: admin, json: {} })).status).toBe(400);
    expect(
      (await k.panggil("PATCH", "/v1/admin/konten/1", { token: admin, json: { deskripsi: "pendek" } })).status,
    ).toBe(400);
    expect(
      (await k.panggil("PATCH", "/v1/admin/konten/9999", { token: admin, json: { judul_tampil: "Judul baru" } }))
        .status,
    ).toBe(404);
    expect(
      (await k.panggil("PATCH", "/v1/admin/konten/abc", { token: admin, json: { judul_tampil: "Judul baru" } })).status,
    ).toBe(400);
  });
});

describe("RBAC: User vs Administrator", () => {
  it("rute admin ditolak untuk siswa dan guru (403), diterima admin", async () => {
    const guru = await k.masuk("guru");
    for (const jalur of [
      "/v1/admin/konten",
      "/v1/admin/laporan",
      "/v1/admin/aset",
      "/v1/admin/akun",
      "/v1/admin/umpan-balik/ringkasan",
    ]) {
      expect((await k.panggil("GET", jalur, { token: siswa })).status).toBe(403);
      expect((await k.panggil("GET", jalur, { token: guru })).status).toBe(403);
      expect((await k.panggil("GET", jalur, { token: admin })).status).toBe(200);
    }
  });
});

describe("infrastruktur", () => {
  it("health, readiness, rute tak dikenal, CORS, dan header keamanan", async () => {
    expect((await k.panggil("GET", "/healthz")).status).toBe(200);
    expect((await k.panggil("GET", "/readyz")).status).toBe(200);
    const nf = await k.panggil<{ kode: string }>("GET", "/tidak-ada");
    expect(nf.status).toBe(404);
    expect(nf.body.kode).toBe("TIDAK_ADA");
    const diizinkan = await env.app.request("/v1/organ", {
      method: "OPTIONS",
      headers: { origin: "http://localhost:3000", "access-control-request-method": "GET" },
    });
    expect(diizinkan.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
    const asing = await env.app.request("/healthz", { headers: { origin: "https://jahat.example" } });
    expect(asing.headers.get("access-control-allow-origin")).toBeNull();
    expect(asing.headers.get("x-content-type-options")).toBe("nosniff");
  });
});
