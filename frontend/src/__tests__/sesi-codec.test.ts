import { describe, expect, it } from "vitest";
import { SesiUserSchema } from "@/lib/schemas";
import { dekodeSesi, enkodeSesi, NAMA_COOKIE, UMUR_COOKIE_DETIK } from "@/lib/sesi-codec";

const user = SesiUserSchema.parse({
  id_user: 3,
  nama: "Admin",
  email: "admin@arnatomy.id",
  role: "admin",
  asal_sekolah: null,
});

describe("sesi-codec (HMAC)", () => {
  it("enkode lalu dekode mengembalikan pengguna yang sama", async () => {
    const cookie = await enkodeSesi(user);
    expect(cookie.split(".")).toHaveLength(2);
    expect(await dekodeSesi(cookie)).toEqual(user);
  });

  it("menolak cookie yang muatannya diubah (peran dinaikkan)", async () => {
    const cookie = await enkodeSesi({ ...user, role: "siswa" });
    const [, tanda] = cookie.split(".");
    const muatanPalsu = Buffer.from(JSON.stringify({ ...user, role: "admin" })).toString("base64url");
    expect(await dekodeSesi(`${muatanPalsu}.${tanda}`)).toBeNull();
  });

  it("menolak nilai kosong, tanpa titik, dan sampah", async () => {
    expect(await dekodeSesi(undefined)).toBeNull();
    expect(await dekodeSesi("")).toBeNull();
    expect(await dekodeSesi("abc")).toBeNull();
    expect(await dekodeSesi("abc.def")).toBeNull();
  });

  it("konstanta cookie", () => {
    expect(NAMA_COOKIE).toBe("arnatomy_sesi");
    expect(UMUR_COOKIE_DETIK).toBe(8 * 60 * 60);
  });
});
