import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { KontenIdSchema, type SesiUser } from "@/lib/schemas";

const ambilSesi = vi.fn<() => Promise<SesiUser | null>>();
vi.mock("@/lib/auth", () => ({
  ambilSesi: () => ambilSesi(),
  periksaSesi: async () => {
    const sesi = await ambilSesi();
    return sesi ? { status: "ok", sesi } : { status: "tanpa-sesi" };
  },
}));

const siswa: SesiUser = {
  id_user: 1,
  nama: "Nehan",
  email: "siswa@arnatomy.id",
  role: "siswa",
  asal_sekolah: null,
} as SesiUser;

describe("api-util", () => {
  beforeEach(() => ambilSesi.mockReset());

  it("bacaBody: JSON rusak -> 400, skema gagal -> 400 berisi pesan Zod, valid -> data", async () => {
    const { bacaBody } = await import("@/lib/api-util");
    const skema = z.object({ nama: z.string().min(3, "Nama minimal 3.") });
    const rusak = await bacaBody(new Request("http://x", { method: "POST", body: "{bukan json" }), skema);
    expect(rusak.ok).toBe(false);
    if (!rusak.ok) expect(rusak.respons.status).toBe(400);
    const salah = await bacaBody(
      new Request("http://x", { method: "POST", body: JSON.stringify({ nama: "ab" }) }),
      skema,
    );
    expect(salah.ok).toBe(false);
    if (!salah.ok) expect(await salah.respons.json()).toEqual({ pesan: "Nama minimal 3." });
    const benar = await bacaBody(
      new Request("http://x", { method: "POST", body: JSON.stringify({ nama: "abc" }) }),
      skema,
    );
    expect(benar).toEqual({ ok: true, data: { nama: "abc" } });
  });

  it("wajibSesi: 401 tanpa sesi, 403 peran salah, ok bila cocok", async () => {
    const { wajibSesi } = await import("@/lib/api-util");
    ambilSesi.mockResolvedValueOnce(null);
    const tanpa = await wajibSesi();
    expect(tanpa.ok).toBe(false);
    if (!tanpa.ok) expect(tanpa.respons.status).toBe(401);

    ambilSesi.mockResolvedValueOnce(siswa);
    const salahPeran = await wajibSesi(["admin"]);
    expect(salahPeran.ok).toBe(false);
    if (!salahPeran.ok) {
      expect(salahPeran.respons.status).toBe(403);
      expect((await salahPeran.respons.json()).pesan).toMatch(/admin/);
    }

    ambilSesi.mockResolvedValueOnce(siswa);
    const ok = await wajibSesi(["siswa", "guru"]);
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.sesi.id_user).toBe(1);
  });

  it("idDariParam mengubah segmen URL menjadi id bermerek", async () => {
    const { idDariParam, galat } = await import("@/lib/api-util");
    expect(idDariParam("8", KontenIdSchema)).toBe(8);
    expect(idDariParam("abc", KontenIdSchema)).toBeNull();
    expect(idDariParam("-1", KontenIdSchema)).toBeNull();
    const r = galat("uji", 418);
    expect(r.status).toBe(418);
    expect(await r.json()).toEqual({ pesan: "uji" });
  });
});
