import { beforeEach, describe, expect, it, vi } from "vitest";
import { SesiUserSchema, UserIdSchema } from "@/lib/schemas";
import { enkodeSesi, NAMA_COOKIE } from "@/lib/sesi-codec";

const toko = vi.hoisted(() => ({ nilai: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nama: string) => (nama === NAMA_COOKIE && toko.nilai ? { value: toko.nilai } : undefined),
  }),
}));

describe("ambilSesi", () => {
  beforeEach(() => {
    delete (globalThis as Record<symbol, unknown>)[Symbol.for("arnatomy.db")];
  });

  it("periksaSesi: tanpa-sesi, ok, lalu nonaktif setelah admin menonaktifkan / menghapus akun", async () => {
    const { periksaSesi } = await import("@/lib/auth");
    const db = await import("@/lib/db");
    toko.nilai = undefined;
    expect(await periksaSesi()).toEqual({ status: "tanpa-sesi" });
    const user = SesiUserSchema.parse({
      id_user: 1,
      nama: "Nehan",
      email: "siswa@arnatomy.id",
      role: "siswa",
      asal_sekolah: null,
    });
    toko.nilai = await enkodeSesi(user);
    expect(await periksaSesi()).toEqual({ status: "ok", sesi: user });
    await db.setAkunAktif(UserIdSchema.parse(1), false);
    expect(await periksaSesi()).toEqual({ status: "nonaktif" });
    await db.setAkunAktif(UserIdSchema.parse(1), true);
    await db.hapusAkun(UserIdSchema.parse(1));
    expect(await periksaSesi()).toEqual({ status: "nonaktif" });
  });

  it("null tanpa cookie, pengguna bila cookie sah", async () => {
    const { ambilSesi } = await import("@/lib/auth");
    toko.nilai = undefined;
    expect(await ambilSesi()).toBeNull();
    const user = SesiUserSchema.parse({
      id_user: 2,
      nama: "Bu Ratna",
      email: "guru@arnatomy.id",
      role: "guru",
      asal_sekolah: "SMAN 2",
    });
    toko.nilai = await enkodeSesi(user);
    expect(await ambilSesi()).toEqual(user);
  });
});
