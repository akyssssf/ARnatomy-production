import { beforeEach, describe, expect, it } from "vitest";
import { BATAS_GAGAL, catatGagal, hapusCatatan, JENDELA_MS, kunciLogin, sisaBlokir } from "@/lib/pembatas";

describe("pembatas laju login", () => {
  beforeEach(() => {
    delete (globalThis as Record<symbol, unknown>)[Symbol.for("arnatomy.pembatas")];
  });

  it("memblokir setelah BATAS_GAGAL kegagalan dalam satu jendela, lalu lepas saat jendela habis", () => {
    const t0 = 1_000_000;
    for (let i = 1; i < BATAS_GAGAL; i += 1) expect(catatGagal("k", t0 + i)).toBe(BATAS_GAGAL - i);
    expect(sisaBlokir("k", t0 + 10)).toBe(0);
    expect(catatGagal("k", t0 + 10)).toBe(0);
    expect(sisaBlokir("k", t0 + 10)).toBeGreaterThan(0);
    expect(sisaBlokir("k", t0 + 1 + JENDELA_MS)).toBe(0); // jendela dihitung dari kegagalan pertama
    /* kunci lain tidak terpengaruh */
    expect(sisaBlokir("lain", t0 + 10)).toBe(0);
  });

  it("hapusCatatan (login berhasil) mengosongkan hitungan", () => {
    catatGagal("k");
    catatGagal("k");
    hapusCatatan("k");
    expect(catatGagal("k")).toBe(BATAS_GAGAL - 1);
  });

  it("kunciLogin menggabungkan email huruf kecil dan IP pertama dari x-forwarded-for", () => {
    const req = new Request("http://localhost/api/login", { headers: { "x-forwarded-for": "10.0.0.7, 172.16.0.1" } });
    expect(kunciLogin(" Siswa@ARnatomy.id ", req)).toBe("siswa@arnatomy.id|10.0.0.7");
    expect(kunciLogin("a@b.id", new Request("http://localhost/api/login"))).toBe("a@b.id|lokal");
  });
});
