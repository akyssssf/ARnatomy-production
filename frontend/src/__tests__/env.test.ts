import { afterEach, describe, expect, it, vi } from "vitest";

describe("env", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("memberi nilai bawaan di development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SESSION_SECRET", "");
    const { envServer, envPublic } = await import("@/lib/env");
    expect(envServer().SESSION_SECRET.length).toBeGreaterThanOrEqual(32);
    expect(envPublic.NEXT_PUBLIC_APP_NAME).toBe("ARnatomy");
  });

  it("menolak SESSION_SECRET pendek", async () => {
    vi.stubEnv("SESSION_SECRET", "pendek");
    const { envServer } = await import("@/lib/env");
    expect(() => envServer()).toThrow();
  });

  it("mewajibkan SESSION_SECRET di produksi", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_SECRET", "");
    const { envServer } = await import("@/lib/env");
    expect(() => envServer()).toThrow(/produksi/);
  });
});
