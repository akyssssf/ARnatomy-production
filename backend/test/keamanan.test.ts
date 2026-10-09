import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AKUN, klien, type Lingkungan, siapkan } from "./helpers";

let env: Lingkungan;
let k: ReturnType<typeof klien>;
let admin: string;
let siswa: string;
beforeAll(async () => {
  env = await siapkan();
  k = klien(env);
  admin = await k.masuk("admin");
  siswa = await k.masuk("siswa");
});
afterAll(() => env.tutup());

describe("FR-10 menyusun label baru (POST /admin/konten)", () => {
  it("membuat label dimmed baru untuk bagian yang belum punya, berstatus draft sehingga belum tampil ke pengguna", async () => {
    const daftar = await k.panggil<{ id_bagian: number; jenis_konten: string }[]>("GET", "/v1/admin/konten", {
      token: admin,
    });
    const tanpaDimmed = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].find(
      (b) => !daftar.body.some((x) => x.id_bagian === b && x.jenis_konten === "dimmed"),
    );
    expect(tanpaDimmed).toBeTruthy();
    const baru = await k.panggil<{ id_konten: number; status_validasi: string; status_tampilan: string }>(
      "POST",
      "/v1/admin/konten",
      {
        token: admin,
        json: {
          id_bagian: tanpaDimmed,
          jenis_konten: "dimmed",
          judul_tampil: "Detail lanjutan",
          deskripsi: "Penjelasan lanjutan yang cukup panjang untuk lolos validasi.",
        },
      },
    );
    expect(baru.status).toBe(201);
    expect(baru.body).toMatchObject({ status_validasi: "draft", status_tampilan: "dimmed" });
    const sebelum = await k.panggil<unknown[]>("GET", `/v1/bagian/${tanpaDimmed}/konten?jenis=dimmed`, {
      token: siswa,
    });
    expect(sebelum.body).toHaveLength(0);
    await k.panggil("PATCH", `/v1/admin/konten/${baru.body.id_konten}`, {
      token: admin,
      json: { status_validasi: "tervalidasi" },
    });
    const sesudah = await k.panggil<unknown[]>("GET", `/v1/bagian/${tanpaDimmed}/konten?jenis=dimmed`, {
      token: siswa,
    });
    expect(sesudah.body).toHaveLength(1);
    const lagi = await k.panggil<{ kode: string }>("POST", "/v1/admin/konten", {
      token: admin,
      json: {
        id_bagian: tanpaDimmed,
        jenis_konten: "dimmed",
        judul_tampil: "Duplikat",
        deskripsi: "Deskripsi duplikat yang cukup panjang untuk validasi.",
      },
    });
    expect(lagi.status).toBe(409);
    expect(lagi.body.kode).toBe("KONTEN_SUDAH_ADA");
  });
  it("validasi, bagian tidak ada, dan peran", async () => {
    const dasar = {
      jenis_konten: "dasar",
      judul_tampil: "Judul",
      deskripsi: "Deskripsi yang cukup panjang untuk validasi.",
    };
    expect(
      (await k.panggil("POST", "/v1/admin/konten", { token: admin, json: { id_bagian: 999, ...dasar } })).status,
    ).toBe(404);
    expect(
      (
        await k.panggil("POST", "/v1/admin/konten", {
          token: admin,
          json: { id_bagian: 1, ...dasar, deskripsi: "pendek" },
        })
      ).status,
    ).toBe(400);
    expect(
      (await k.panggil("POST", "/v1/admin/konten", { token: siswa, json: { id_bagian: 1, ...dasar } })).status,
    ).toBe(403);
  });
});

describe("pembatas login", () => {
  it("brute force dari banyak IP ke satu email ditahan oleh batas per email (20 gagal)", async () => {
    const e = await siapkan();
    const kk = klien(e);
    let status = 0;
    for (let i = 0; i < 21; i++) {
      status = (
        await kk.panggil("POST", "/v1/auth/login", {
          json: { email: AKUN.guru.email, password: `salah${i}12` },
          ip: `192.0.2.${i}`,
        })
      ).status;
    }
    expect(status).toBe(429);
    const benar = await kk.panggil("POST", "/v1/auth/login", { json: AKUN.guru, ip: "198.51.100.7" });
    expect(benar.status).toBe(429);
    await e.tutup();
  });
  it("tanpa TRUST_PROXY, header X-Forwarded-For palsu tidak menghindari pembatas per IP", async () => {
    const e = await siapkan({ TRUST_PROXY: "false" });
    const kk = klien(e);
    for (let i = 0; i < 5; i++) {
      await kk.panggil("POST", "/v1/auth/login", {
        json: { email: AKUN.siswa.email, password: "salah123" },
        ip: `203.0.113.${i}`,
      });
    }
    const r = await kk.panggil("POST", "/v1/auth/login", { json: AKUN.siswa, ip: "203.0.113.99" });
    expect(r.status).toBe(429);
    await e.tutup();
  });
});

describe("batas ukuran dan nonce Google", () => {
  it("body JSON di atas 256 KB ditolak 413", async () => {
    const besar = {
      nama: "Abc Def",
      email: "besar@contoh.id",
      password: "rahasia123",
      role: "siswa",
      asal_sekolah: "x".repeat(300_000),
    };
    const r = await k.panggil<{ kode: string }>("POST", "/v1/auth/register", { json: besar });
    expect(r.status).toBe(413);
    expect(r.body.kode).toBe("TERLALU_BESAR");
  });
  it("nonce yang dikirim klien harus sama dengan klaim di ID token", async () => {
    env.google.tabel.set("token-nonce-0123456789012345678", {
      sub: "sub-nonce",
      email: "nonce@gmail.com",
      email_verified: true,
      name: "Nonce",
      nonce: "nonce-benar-123",
    });
    const salah = await k.panggil("POST", "/v1/auth/google", {
      json: { id_token: "token-nonce-0123456789012345678", nonce: "nonce-salah-123" },
    });
    expect(salah.status).toBe(401);
    const benar = await k.panggil("POST", "/v1/auth/google", {
      json: { id_token: "token-nonce-0123456789012345678", nonce: "nonce-benar-123" },
    });
    expect(benar.status).toBe(200);
    const tanpa = await k.panggil("POST", "/v1/auth/google", { json: { id_token: "token-nonce-0123456789012345678" } });
    expect(tanpa.status).toBe(200);
  });
});

describe("dokumentasi OpenAPI", () => {
  it("setiap rute yang terdaftar terdokumentasi, dan sebaliknya", async () => {
    const { KUNCI_TERDOKUMENTASI } = await import("../src/openapi");
    const terdaftar = new Set(env.app.routes.filter((r) => r.method !== "ALL").map((r) => `${r.method} ${r.path}`));
    const tanpaDokumen = [...terdaftar].filter((x) => !KUNCI_TERDOKUMENTASI.has(x));
    expect(tanpaDokumen).toEqual([]);
    const tanpaRute = [...KUNCI_TERDOKUMENTASI].filter((x) => x !== "GET /files/*" && !terdaftar.has(x));
    expect(tanpaRute).toEqual([]);
  });
  it("GET /openapi.json valid: versi 3.1, skema body dari Zod, keamanan bearer", async () => {
    const r = await k.panggil<{
      openapi: string;
      paths: Record<
        string,
        Record<
          string,
          {
            security?: unknown;
            requestBody?: { content: Record<string, { schema: { properties?: Record<string, unknown> } }> };
          }
        >
      >;
    }>("GET", "/openapi.json");
    expect(r.status).toBe(200);
    expect(r.body.openapi).toBe("3.1.0");
    const login = r.body.paths["/v1/auth/login"]?.post;
    expect(login?.security).toBeUndefined();
    expect(Object.keys(login?.requestBody?.content["application/json"]?.schema.properties ?? {})).toEqual([
      "email",
      "password",
    ]);
    expect(r.body.paths["/v1/admin/akun/{id}"]?.patch?.security).toBeTruthy();
    expect(r.body.paths["/v1/admin/aset/{idOrgan}"]?.post?.requestBody?.content["multipart/form-data"]).toBeTruthy();
  });
});
