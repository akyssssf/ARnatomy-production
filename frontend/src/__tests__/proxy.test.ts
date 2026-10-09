import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { SesiUserSchema } from "@/lib/schemas";
import { enkodeSesi, NAMA_COOKIE } from "@/lib/sesi-codec";
import { proxy } from "@/proxy";

async function permintaan(path: string, sesi?: { role: "siswa" | "admin" }) {
  const req = new NextRequest(`http://localhost:3000${path}`);
  if (sesi) {
    const user = SesiUserSchema.parse({
      id_user: sesi.role === "admin" ? 3 : 1,
      nama: "U",
      email: "u@arnatomy.id",
      role: sesi.role,
      asal_sekolah: null,
    });
    req.cookies.set(NAMA_COOKIE, await enkodeSesi(user));
  }
  return req;
}

describe("proxy (route guard + CSP)", () => {
  it("mengalihkan rute terproteksi tanpa sesi ke /login dengan next=", async () => {
    const r = await proxy(await permintaan("/eksplorasi?organ=2"));
    expect(r.status).toBe(307);
    const tujuan = new URL(r.headers.get("location") ?? "");
    expect(tujuan.pathname).toBe("/login");
    expect(tujuan.searchParams.get("auth_error")).toBe("1");
    expect(tujuan.searchParams.get("next")).toBe("/eksplorasi");
    expect(r.headers.get("set-cookie")).toMatch(/arnatomy_sesi=;/);
  });

  it("cookie yang dipalsukan dianggap tidak ada", async () => {
    const req = new NextRequest("http://localhost:3000/beranda");
    req.cookies.set(
      NAMA_COOKIE,
      `${Buffer.from(JSON.stringify({ id_user: 3, role: "admin" })).toString("base64url")}.palsu`,
    );
    const r = await proxy(req);
    expect(r.headers.get("location")).toMatch(/\/login/);
  });

  it("non-admin ke /admin dialihkan ke beranda dengan pesan; admin lolos", async () => {
    const siswa = await proxy(await permintaan("/admin", { role: "siswa" }));
    expect(siswa.headers.get("location")).toMatch(/\/beranda\?pesan=khusus-admin/);
    const admin = await proxy(await permintaan("/admin", { role: "admin" }));
    expect(admin.status).toBe(200);
  });

  it("sudah masuk lalu membuka /login atau /daftar dialihkan sesuai peran", async () => {
    expect((await proxy(await permintaan("/login", { role: "siswa" }))).headers.get("location")).toMatch(/\/beranda$/);
    expect((await proxy(await permintaan("/login", { role: "admin" }))).headers.get("location")).toMatch(/\/admin$/);
    expect((await proxy(await permintaan("/daftar", { role: "siswa" }))).headers.get("location")).toMatch(/\/beranda$/);
    expect((await proxy(await permintaan("/daftar"))).status).toBe(200);
  });

  it("/umpan-balik ikut terproteksi", async () => {
    expect((await proxy(await permintaan("/umpan-balik"))).headers.get("location")).toMatch(/\/login\?/);
    expect((await proxy(await permintaan("/umpan-balik", { role: "siswa" }))).status).toBe(200);
  });

  it("permintaan yang lolos membawa CSP ber-nonce dan header x-nonce untuk Next", async () => {
    const r = await proxy(await permintaan("/"));
    expect(r.status).toBe(200);
    const csp = r.headers.get("content-security-policy") ?? "";
    expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
    expect(csp).toMatch(/frame-ancestors 'none'/);
    expect(csp).toMatch(/object-src 'none'/);
    /* header permintaan yang diteruskan ke Next */
    expect(r.headers.get("x-middleware-request-x-nonce")).toBeTruthy();
  });
});
