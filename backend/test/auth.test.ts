import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AKUN, klien, type Lingkungan, siapkan } from "./helpers";

let env: Lingkungan;
let k: ReturnType<typeof klien>;
beforeAll(async () => {
  env = await siapkan();
  k = klien(env);
});
afterAll(() => env.tutup());

const dataDaftar = {
  nama: "Budi Santoso",
  email: "budi@contoh.id",
  password: "rahasia123",
  role: "siswa",
  asal_sekolah: "SMPN 2 Madiun",
};

describe("FR-02 registrasi", () => {
  it("mendaftarkan siswa dan langsung memberi token", async () => {
    const r = await k.panggil<{ user: { email: string; role: string }; access_token: string; refresh_token: string }>(
      "POST",
      "/v1/auth/register",
      { json: dataDaftar },
    );
    expect(r.status).toBe(201);
    expect(r.body.user).toMatchObject({ email: "budi@contoh.id", role: "siswa" });
    expect(r.body.access_token).toBeTruthy();
  });
  it("menolak email yang sudah terdaftar (tanpa membedakan huruf besar)", async () => {
    const r = await k.panggil<{ kode: string }>("POST", "/v1/auth/register", {
      json: { ...dataDaftar, email: "BUDI@contoh.id" },
    });
    expect(r.status).toBe(409);
    expect(r.body.kode).toBe("EMAIL_TERPAKAI");
  });
  it("tidak menerima peran admin dari pendaftaran publik", async () => {
    const r = await k.panggil("POST", "/v1/auth/register", {
      json: { ...dataDaftar, email: "x@contoh.id", role: "admin" },
    });
    expect(r.status).toBe(400);
  });
  it("memvalidasi sandi (huruf dan angka, minimal 8 karakter)", async () => {
    const r = await k.panggil<{ pesan: string }>("POST", "/v1/auth/register", {
      json: { ...dataDaftar, email: "y@contoh.id", password: "abcdefgh" },
    });
    expect(r.status).toBe(400);
    expect(r.body.pesan).toContain("angka");
  });
  it("menolak body yang bukan JSON", async () => {
    const r = await env.app.request("/v1/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{bukan json",
    });
    expect(r.status).toBe(400);
  });
});

describe("FR-01 login, JWT, dan sesi", () => {
  it("login berhasil dan /me mengembalikan profil tanpa kata sandi", async () => {
    const token = await k.masuk("siswa");
    const me = await k.panggil<{ user: Record<string, unknown> }>("GET", "/v1/auth/me", { token });
    expect(me.status).toBe(200);
    expect(me.body.user).toMatchObject({ email: AKUN.siswa.email, role: "siswa" });
    expect(JSON.stringify(me.body)).not.toContain("hash");
  });
  it("kata sandi salah dan email tak dikenal memberi pesan yang sama", async () => {
    const a = await k.panggil<{ pesan: string }>("POST", "/v1/auth/login", {
      json: { email: AKUN.siswa.email, password: "salah123" },
      ip: "10.0.0.1",
    });
    const b = await k.panggil<{ pesan: string }>("POST", "/v1/auth/login", {
      json: { email: "tidak-ada@contoh.id", password: "salah123" },
      ip: "10.0.0.2",
    });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.pesan).toBe(b.body.pesan);
  });
  it("memblokir setelah 5 percobaan gagal (429 + Retry-After) dan berhasil memulihkan setelah login benar di kunci lain", async () => {
    for (let i = 0; i < 5; i++) {
      await k.panggil("POST", "/v1/auth/login", {
        json: { email: AKUN.guru.email, password: "salah123" },
        ip: "10.9.9.9",
      });
    }
    const blok = await k.panggil("POST", "/v1/auth/login", { json: AKUN.guru, ip: "10.9.9.9" });
    expect(blok.status).toBe(429);
    expect(Number(blok.header.get("retry-after"))).toBeGreaterThan(0);
    const lain = await k.panggil("POST", "/v1/auth/login", { json: AKUN.guru, ip: "10.8.8.8" });
    expect(lain.status).toBe(200);
  });
  it("menolak permintaan terlindungi tanpa token atau dengan token rusak", async () => {
    expect((await k.panggil("GET", "/v1/organ")).status).toBe(401);
    expect((await k.panggil("GET", "/v1/organ", { token: "bukan.jwt.valid" })).status).toBe(401);
  });
  it("refresh token menerbitkan sepasang token baru; access token tidak diterima sebagai refresh", async () => {
    const l = await k.panggil<{ access_token: string; refresh_token: string }>("POST", "/v1/auth/login", {
      json: AKUN.siswa,
      ip: "10.1.1.1",
    });
    const baru = await k.panggil<{ access_token: string }>("POST", "/v1/auth/refresh", {
      json: { refresh_token: l.body.refresh_token },
    });
    expect(baru.status).toBe(200);
    expect((await k.panggil("GET", "/v1/auth/me", { token: baru.body.access_token })).status).toBe(200);
    expect((await k.panggil("POST", "/v1/auth/refresh", { json: { refresh_token: l.body.access_token } })).status).toBe(
      401,
    );
    expect((await k.panggil("GET", "/v1/auth/me", { token: l.body.refresh_token })).status).toBe(401);
  });
  it("logout-semua mencabut seluruh token yang beredar", async () => {
    const l = await k.panggil<{ access_token: string; refresh_token: string }>("POST", "/v1/auth/login", {
      json: AKUN.guru,
      ip: "10.2.2.2",
    });
    expect((await k.panggil("POST", "/v1/auth/logout-semua", { token: l.body.access_token })).status).toBe(200);
    expect((await k.panggil("GET", "/v1/auth/me", { token: l.body.access_token })).status).toBe(401);
    expect(
      (await k.panggil("POST", "/v1/auth/refresh", { json: { refresh_token: l.body.refresh_token } })).status,
    ).toBe(401);
  });
  it("ganti kata sandi: sandi lama wajib benar, token lama dicabut, sandi baru berlaku", async () => {
    await k.panggil("POST", "/v1/auth/register", { json: { ...dataDaftar, email: "ganti@contoh.id" } });
    const l = await k.panggil<{ access_token: string }>("POST", "/v1/auth/login", {
      json: { email: "ganti@contoh.id", password: "rahasia123" },
      ip: "10.3.3.3",
    });
    const token = l.body.access_token;
    expect(
      (
        await k.panggil("POST", "/v1/auth/ganti-sandi", {
          token,
          json: { sandi_lama: "salah", sandi_baru: "baru12345" },
        })
      ).status,
    ).toBe(400);
    const ok = await k.panggil<{ access_token: string }>("POST", "/v1/auth/ganti-sandi", {
      token,
      json: { sandi_lama: "rahasia123", sandi_baru: "baru12345" },
    });
    expect(ok.status).toBe(200);
    expect((await k.panggil("GET", "/v1/auth/me", { token })).status).toBe(401);
    expect((await k.panggil("GET", "/v1/auth/me", { token: ok.body.access_token })).status).toBe(200);
    expect(
      (
        await k.panggil("POST", "/v1/auth/login", {
          json: { email: "ganti@contoh.id", password: "baru12345" },
          ip: "10.3.3.4",
        })
      ).status,
    ).toBe(200);
  });
});

describe("login Google (OIDC)", () => {
  const idBaru = { sub: "google-sub-001", email: "dina@gmail.com", email_verified: true, name: "Dina Putri" };
  const TOKEN = "token-google-valid-dina-0123456789";

  it("akun baru: dibuat tanpa kata sandi, profil belum lengkap, fitur lain diblokir sampai profil diisi", async () => {
    env.google.tabel.set(TOKEN, idBaru);
    const r = await k.panggil<{ user: { profil_lengkap: boolean; role: string }; access_token: string }>(
      "POST",
      "/v1/auth/google",
      { json: { id_token: TOKEN } },
    );
    expect(r.status).toBe(200);
    expect(r.body.user.profil_lengkap).toBe(false);
    const token = r.body.access_token;
    const blok = await k.panggil<{ kode: string }>("GET", "/v1/organ", { token });
    expect(blok.status).toBe(403);
    expect(blok.body.kode).toBe("PROFIL_BELUM_LENGKAP");
    const patch = await k.panggil<{ user: { profil_lengkap: boolean; role: string; asal_sekolah: string } }>(
      "PATCH",
      "/v1/auth/profil",
      { token, json: { role: "guru", asal_sekolah: "SMAN 1 Madiun" } },
    );
    expect(patch.status).toBe(200);
    expect(patch.body.user).toMatchObject({ profil_lengkap: true, role: "guru", asal_sekolah: "SMAN 1 Madiun" });
    expect((await k.panggil("GET", "/v1/organ", { token })).status).toBe(200);
  });
  it("masuk lagi dengan sub yang sama memakai akun yang sama", async () => {
    const r = await k.panggil<{ user: { email: string; profil_lengkap: boolean } }>("POST", "/v1/auth/google", {
      json: { id_token: TOKEN },
    });
    expect(r.status).toBe(200);
    expect(r.body.user).toMatchObject({ email: "dina@gmail.com", profil_lengkap: true });
  });
  it("tidak menautkan otomatis ke email yang sudah terdaftar dengan kata sandi", async () => {
    env.google.tabel.set("token-bentrok-0123456789012345", {
      sub: "google-sub-002",
      email: AKUN.siswa.email,
      email_verified: true,
    });
    const r = await k.panggil<{ kode: string }>("POST", "/v1/auth/google", {
      json: { id_token: "token-bentrok-0123456789012345" },
    });
    expect(r.status).toBe(409);
    expect(r.body.kode).toBe("AKUN_SUDAH_ADA");
  });
  it("menolak token tidak sah dan email yang belum terverifikasi", async () => {
    expect(
      (await k.panggil("POST", "/v1/auth/google", { json: { id_token: "token-tidak-dikenal-0123456789" } })).status,
    ).toBe(401);
    env.google.tabel.set("token-belum-verif-0123456789012", { sub: "s3", email: "x@gmail.com", email_verified: false });
    expect(
      (await k.panggil("POST", "/v1/auth/google", { json: { id_token: "token-belum-verif-0123456789012" } })).status,
    ).toBe(401);
  });
  it("akun admin tidak boleh masuk atau menautkan Google", async () => {
    env.google.tabel.set("token-admin-0123456789012345678", {
      sub: "s4",
      email: "baru-admin@gmail.com",
      email_verified: true,
    });
    const adminToken = await k.masuk("admin");
    const t = await k.panggil<{ kode: string }>("POST", "/v1/auth/tautkan/google", {
      token: adminToken,
      json: { id_token: "token-admin-0123456789012345678" },
    });
    expect(t.status).toBe(403);
    expect(t.body.kode).toBe("ADMIN_TANPA_GOOGLE");
  });
  it("pengguna yang sudah masuk dapat menautkan lalu melepas Google", async () => {
    const tokenSiswa = await k.masuk("siswa");
    env.google.tabel.set("token-tautkan-siswa-01234567890", {
      sub: "google-sub-siswa",
      email: "siswa.pribadi@gmail.com",
      email_verified: true,
    });
    expect(
      (
        await k.panggil("POST", "/v1/auth/tautkan/google", {
          token: tokenSiswa,
          json: { id_token: "token-tautkan-siswa-01234567890" },
        })
      ).status,
    ).toBe(200);
    const lewatGoogle = await k.panggil<{ user: { email: string } }>("POST", "/v1/auth/google", {
      json: { id_token: "token-tautkan-siswa-01234567890" },
    });
    expect(lewatGoogle.body.user.email).toBe(AKUN.siswa.email);
    expect((await k.panggil("DELETE", "/v1/auth/tautkan/google", { token: tokenSiswa })).status).toBe(200);
  });
  it("sub yang sudah dipakai pengguna lain tidak bisa ditautkan", async () => {
    const tokenGuru = await k.masuk("guru");
    const r = await k.panggil<{ kode: string }>("POST", "/v1/auth/tautkan/google", {
      token: tokenGuru,
      json: { id_token: TOKEN },
    });
    expect(r.status).toBe(409);
    expect(r.body.kode).toBe("GOOGLE_TERPAKAI");
  });
  it("login Google dinonaktifkan bila Client ID tidak diatur", async () => {
    const e2 = await siapkan({ GOOGLE_CLIENT_IDS: "" });
    const r = await klien(e2).panggil("POST", "/v1/auth/google", {
      json: { id_token: "token-apa-saja-0123456789012" },
    });
    expect(r.status).toBe(503);
    await e2.tutup();
  });
});
