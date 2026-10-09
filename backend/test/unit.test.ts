import { describe, expect, it } from "vitest";
import { muatKonfigurasi } from "../src/config/env";
import { PembatasLaju } from "../src/lib/pembatas";
import { cekSandi, hashSandi } from "../src/lib/sandi";
import { hitungSkorSus } from "../src/lib/sus";
import { bacaToken, terbitkanToken } from "../src/lib/token";
import { adalahGlb } from "../src/modules/aset";
import { buatKlienLlm, periksaKeluaran } from "../src/modules/asisten";
import { PenyimpananLokal } from "../src/storage/penyimpanan";

describe("sandi (bcrypt, NFR-01)", () => {
  it("menghasilkan hash bcrypt yang dapat diverifikasi", async () => {
    const h = await hashSandi("rahasia123", 4);
    expect(h).toMatch(/^\$2[aby]\$04\$/);
    expect(await cekSandi("rahasia123", h)).toBe(true);
    expect(await cekSandi("salah", h)).toBe(false);
    expect(await cekSandi("x", "bukan-hash")).toBe(false);
  });
});

describe("skor SUS", () => {
  it("rentang 0..100 dan contoh baku", () => {
    expect(hitungSkorSus([5, 1, 5, 1, 5, 1, 5, 1, 5, 1])).toBe(100);
    expect(hitungSkorSus([1, 5, 1, 5, 1, 5, 1, 5, 1, 5])).toBe(0);
    expect(hitungSkorSus(Array(10).fill(3))).toBe(50);
    expect(hitungSkorSus([4, 2, 4, 2, 4, 2, 4, 2, 4, 2])).toBe(75);
  });
});

describe("token JWT", () => {
  const cfg = {
    JWT_SECRET: "rahasia-uji-yang-cukup-panjang-untuk-hs256-0123456789",
    ACCESS_TTL_MENIT: 15,
    REFRESH_TTL_HARI: 7,
  };
  it("access dan refresh berbeda jenis dan membawa versi token", async () => {
    const t = await terbitkanToken(cfg, { id_user: 7, token_versi: 3 });
    expect(t.expires_in).toBe(900);
    expect(await bacaToken(cfg, t.access_token, "access")).toEqual({ sub: 7, tv: 3, jenis: "access" });
    expect(await bacaToken(cfg, t.access_token, "refresh")).toBeNull();
    expect(await bacaToken(cfg, t.refresh_token, "refresh")).toMatchObject({ sub: 7 });
  });
  it("menolak rahasia lain, token kedaluwarsa, dan token acak", async () => {
    const t = await terbitkanToken(cfg, { id_user: 1, token_versi: 0 });
    expect(
      await bacaToken({ JWT_SECRET: "rahasia-lain-yang-juga-panjang-0123456789abcdef" }, t.access_token, "access"),
    ).toBeNull();
    const kedaluwarsa = await terbitkanToken({ ...cfg, ACCESS_TTL_MENIT: 0 }, { id_user: 1, token_versi: 0 }).catch(
      () => null,
    );
    if (kedaluwarsa) expect(await bacaToken(cfg, kedaluwarsa.access_token, "access")).toBeNull();
    expect(await bacaToken(cfg, "abc", "access")).toBeNull();
  });
});

describe("pembatas laju", () => {
  it("memblokir setelah batas dan membuka kembali setelah jendela berakhir", () => {
    const p = new PembatasLaju(3, 1000);
    expect(p.catat("a", 0)).toBe(2);
    p.catat("a", 10);
    p.catat("a", 20);
    expect(p.sisaBlokir("a", 30)).toBeGreaterThan(0);
    expect(p.sisaBlokir("b", 30)).toBe(0);
    expect(p.sisaBlokir("a", 1500)).toBe(0);
    p.catat("c", 0);
    p.hapus("c");
    expect(p.sisaBlokir("c", 1)).toBe(0);
  });
});

describe("konfigurasi", () => {
  it("nilai bawaan pengembangan dan parsing daftar", () => {
    const c = muatKonfigurasi({ CORS_ORIGINS: "http://a.test, http://b.test", GOOGLE_CLIENT_IDS: "x,y" });
    expect(c.PORT).toBe(4000);
    expect(c.corsOrigins).toEqual(["http://a.test", "http://b.test"]);
    expect(c.googleClientIds).toEqual(["x", "y"]);
    expect(c.seedDemo).toBe(false);
  });
  it("produksi mewajibkan JWT_SECRET dan DATABASE_URL; demo tidak pernah aktif di produksi", () => {
    expect(() => muatKonfigurasi({ NODE_ENV: "production" })).toThrow(/JWT_SECRET/);
    expect(() => muatKonfigurasi({ NODE_ENV: "production", JWT_SECRET: "x".repeat(40) })).toThrow(/DATABASE_URL/);
    const c = muatKonfigurasi({
      NODE_ENV: "production",
      JWT_SECRET: "x".repeat(40),
      DATABASE_URL: "postgres://a",
      SEED_DEMO: "true",
    });
    expect(c.seedDemo).toBe(false);
  });
  it("menolak nilai tidak valid dan driver s3 tanpa kredensial", () => {
    expect(() => muatKonfigurasi({ PORT: "abc" })).toThrow(/tidak valid/);
    expect(() => muatKonfigurasi({ JWT_SECRET: "pendek" })).toThrow(/32/);
    expect(() => muatKonfigurasi({ STORAGE_DRIVER: "s3" })).toThrow(/S3_ENDPOINT/);
  });
});

describe("asisten: pemeriksaan keluaran dan klien LLM", () => {
  it("teks kosong atau saran medis diganti jawaban aman", () => {
    expect(periksaKeluaran("")).toContain("dokter");
    expect(periksaKeluaran("Sebaiknya minum obat setiap hari.")).toContain("dokter");
    expect(periksaKeluaran("Diagnosis PPOK dibuat dengan spirometri.")).toContain("spirometri");
    expect(periksaKeluaran("  Jantung memompa darah.  ")).toBe("Jantung memompa darah.");
  });
  it("klien LLM: null tanpa kunci; format OpenAI-compatible (Gemini/Groq) dan Anthropic dibaca benar", async () => {
    const gemini = {
      LLM_PROVIDER: "gemini" as const,
      LLM_API_KEY: "kunci",
      LLM_MODEL: undefined,
      LLM_BASE_URL: undefined,
    };
    expect(await buatKlienLlm({ ...gemini, LLM_API_KEY: undefined })("s", "q")).toBeNull();
    const tangkap: {
      url: string;
      header: Record<string, string>;
      body: { model: string; messages: { role: string }[] };
    }[] = [];
    const palsu = (isi: unknown) =>
      (async (url: string, init: RequestInit) => {
        tangkap.push({ url, header: init.headers as Record<string, string>, body: JSON.parse(init.body as string) });
        return new Response(JSON.stringify(isi), { status: 200 });
      }) as unknown as typeof fetch;
    const oa = palsu({ choices: [{ message: { content: " Halo dari Gemini " } }] });
    expect(await buatKlienLlm(gemini, oa)("sistem", "tanya")).toBe("Halo dari Gemini");
    expect(tangkap[0]?.url).toBe("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
    expect(tangkap[0]?.header.Authorization).toBe("Bearer kunci");
    expect(tangkap[0]?.body.model).toBe("gemini-3.5-flash");
    expect(tangkap[0]?.body.messages.map((m) => m.role)).toEqual(["system", "user"]);
    expect(
      await buatKlienLlm(
        { ...gemini, LLM_PROVIDER: "groq", LLM_BASE_URL: "https://llm.contoh.test/v1/", LLM_MODEL: "m-kecil" },
        oa,
      )("s", "q"),
    ).toBe("Halo dari Gemini");
    expect(tangkap[1]?.url).toBe("https://llm.contoh.test/v1/chat/completions");
    expect(tangkap[1]?.body.model).toBe("m-kecil");
    const an = palsu({ content: [{ type: "text", text: " Halo Claude " }] });
    expect(await buatKlienLlm({ ...gemini, LLM_PROVIDER: "anthropic" }, an)("s", "q")).toBe("Halo Claude");
    expect(tangkap[2]?.url).toBe("https://api.anthropic.com/v1/messages");
    expect(tangkap[2]?.header["x-api-key"]).toBe("kunci");
  });
  it("klien LLM: null bila HTTP gagal, jaringan putus, atau isi kosong", async () => {
    const cfg = { LLM_PROVIDER: "groq" as const, LLM_API_KEY: "k", LLM_MODEL: undefined, LLM_BASE_URL: undefined };
    const gagal = (async () => new Response("x", { status: 500 })) as unknown as typeof fetch;
    const pesan: string[] = [];
    expect(await buatKlienLlm(cfg, gagal, (m) => pesan.push(m))("s", "q")).toBeNull();
    expect(pesan[0]).toContain("HTTP 500");
    expect(pesan[0]).not.toContain("kunci");
    const putus = (async () => {
      throw new Error("jaringan");
    }) as unknown as typeof fetch;
    expect(await buatKlienLlm(cfg, putus, (m) => pesan.push(m))("s", "q")).toBeNull();
    expect(pesan[1]).toContain("jaringan");
    const kosong = (async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: null } }] }), {
        status: 200,
      })) as unknown as typeof fetch;
    expect(await buatKlienLlm(cfg, kosong)("s", "q")).toBeNull();
    const kosongAn = (async () =>
      new Response(JSON.stringify({ content: [] }), { status: 200 })) as unknown as typeof fetch;
    expect(await buatKlienLlm({ ...cfg, LLM_PROVIDER: "anthropic" }, kosongAn)("s", "q")).toBeNull();
  });
});

describe("aset dan penyimpanan", () => {
  it("adalahGlb memeriksa tanda glTF dan panjang minimum", () => {
    const ok = new Uint8Array(20);
    ok.set([0x67, 0x6c, 0x54, 0x46]);
    expect(adalahGlb(ok)).toBe(true);
    expect(adalahGlb(new Uint8Array(20))).toBe(false);
    expect(adalahGlb(new Uint8Array(4))).toBe(false);
  });
  it("penyimpanan lokal menolak kunci di luar folder", () => {
    const p = new PenyimpananLokal("./uploads-uji", "http://x/files/");
    expect(p.url("a/b.glb")).toBe("http://x/files/a/b.glb");
    expect(() => p.lokasiBerkas("../rahasia")).toThrow();
  });
});

describe("penyimpanan S3 (aws4fetch, tanpa jaringan)", () => {
  it("mengunggah dengan PUT bertanda tangan dan menghapus; galat HTTP dilaporkan", async () => {
    const { PenyimpananS3 } = await import("../src/storage/penyimpanan");
    const panggilan: { metode: string; url: string; otorisasi: string | null }[] = [];
    let status = 200;
    const asli = globalThis.fetch;
    globalThis.fetch = (async (masuk: Request | string | URL, init?: RequestInit) => {
      const r = masuk instanceof Request ? masuk : new Request(masuk, init);
      panggilan.push({ metode: r.method, url: r.url, otorisasi: r.headers.get("authorization") });
      return new Response("", { status });
    }) as typeof fetch;
    try {
      const s = new PenyimpananS3(
        {
          endpoint: "https://s3.contoh.test",
          bucket: "arnatomy",
          region: "auto",
          accessKeyId: "AKIA",
          secretAccessKey: "rahasia",
        },
        "https://cdn.contoh.test/",
      );
      await s.simpan("models/1/v1.glb", new Uint8Array([1, 2, 3]), "model/gltf-binary");
      expect(panggilan[0]).toMatchObject({ metode: "PUT", url: "https://s3.contoh.test/arnatomy/models/1/v1.glb" });
      expect(panggilan[0]?.otorisasi).toContain("AWS4-HMAC-SHA256");
      expect(s.url("models/1/v1.glb")).toBe("https://cdn.contoh.test/models/1/v1.glb");
      await s.hapus("models/1/v1.glb");
      expect(panggilan[1]?.metode).toBe("DELETE");
      status = 404;
      await expect(s.hapus("x.glb")).resolves.toBeUndefined();
      status = 500;
      await expect(s.simpan("x.glb", new Uint8Array([1]), "model/gltf-binary")).rejects.toThrow(/500/);
      await expect(s.hapus("x.glb")).rejects.toThrow(/500/);
    } finally {
      globalThis.fetch = asli;
    }
  });
  it("buatPenyimpanan memilih driver menurut konfigurasi", async () => {
    const { buatPenyimpanan, PenyimpananS3, PenyimpananLokal: Lokal } = await import("../src/storage/penyimpanan");
    expect(buatPenyimpanan(muatKonfigurasi({}))).toBeInstanceOf(Lokal);
    const s3 = muatKonfigurasi({
      STORAGE_DRIVER: "s3",
      S3_ENDPOINT: "https://s3.contoh.test",
      S3_BUCKET: "b",
      S3_ACCESS_KEY_ID: "a",
      S3_SECRET_ACCESS_KEY: "s",
    });
    expect(buatPenyimpanan(s3)).toBeInstanceOf(PenyimpananS3);
  });
});

describe("verifikator Google", () => {
  it("menolak token acak dan selalu null bila Client ID kosong", async () => {
    const { buatVerifikatorGoogle } = await import("../src/google");
    expect(await buatVerifikatorGoogle([])("token-apa-saja-0123456789")).toBeNull();
    expect(await buatVerifikatorGoogle(["x.apps.googleusercontent.com"])("bukan-jwt")).toBeNull();
  });
});

describe("basis data berkas (PGlite) bertahan antar proses", () => {
  it("data tetap ada setelah koneksi ditutup lalu dibuka lagi, dan migrasi/seed idempoten", async () => {
    const { mkdtempSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const { bukaKoneksi } = await import("../src/db/client");
    const { jalankanMigrasi } = await import("../src/db/migrate");
    const { isiDataAwal } = await import("../src/db/seed");
    const { organs } = await import("../src/db/schema");
    const dir = mkdtempSync(join(tmpdir(), "arnatomy-db-"));
    const cfg = muatKonfigurasi({ NODE_ENV: "test", SEED_DEMO: "true", BCRYPT_COST: "4" });
    try {
      const a = bukaKoneksi({ dataDir: join(dir, "dalam", "pglite") });
      await jalankanMigrasi(a);
      await isiDataAwal(a.db, cfg);
      await a.tutup();
      const b = bukaKoneksi({ dataDir: join(dir, "dalam", "pglite") });
      await jalankanMigrasi(b);
      await isiDataAwal(b.db, cfg);
      expect((await b.db.select().from(organs)).length).toBe(2);
      await b.tutup();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("pemuat .env", () => {
  it("memuat variabel dari berkas, tidak menimpa yang sudah ada, dan diam bila berkas tidak ada", async () => {
    const { mkdtempSync, rmSync, writeFileSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const { muatBerkasEnv } = await import("../src/config/env");
    const dir = mkdtempSync(join(tmpdir(), "arnatomy-env-"));
    const berkas = join(dir, ".env");
    writeFileSync(berkas, "UJI_ENV_BARU=dari-berkas\nUJI_ENV_ADA=dari-berkas\n");
    process.env.UJI_ENV_ADA = "dari-lingkungan";
    try {
      expect(muatBerkasEnv(berkas)).toBe(true);
      expect(process.env.UJI_ENV_BARU).toBe("dari-berkas");
      expect(process.env.UJI_ENV_ADA).toBe("dari-lingkungan");
      expect(muatBerkasEnv(join(dir, "tidak-ada.env"))).toBe(false);
    } finally {
      delete process.env.UJI_ENV_BARU;
      delete process.env.UJI_ENV_ADA;
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
