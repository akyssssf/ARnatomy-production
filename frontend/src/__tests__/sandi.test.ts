import { describe, expect, it } from "vitest";
import { cekSandi, hashSandi } from "@/lib/sandi";

describe("sandi (PBKDF2-SHA256)", () => {
  it("hash berformat pbkdf2-sha256$iterasi$garam$hash dan berbeda tiap kali (garam acak)", async () => {
    const a = await hashSandi("rahasia123");
    const b = await hashSandi("rahasia123");
    expect(a).toMatch(/^pbkdf2-sha256\$100000\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/);
    expect(a).not.toBe(b);
    expect(a).not.toContain("rahasia123");
  });

  it("cekSandi benar hanya untuk sandi yang sama; format rusak -> false", async () => {
    const h = await hashSandi("rahasia123");
    expect(await cekSandi("rahasia123", h)).toBe(true);
    expect(await cekSandi("rahasia124", h)).toBe(false);
    expect(await cekSandi("rahasia123", "")).toBe(false);
    expect(await cekSandi("rahasia123", "md5$1$abc$def")).toBe(false);
    expect(await cekSandi("rahasia123", "pbkdf2-sha256$0$abc$def")).toBe(false);
  });
});
