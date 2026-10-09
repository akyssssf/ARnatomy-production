import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SesiUserSchema } from "@/lib/schemas";
import { enkodeSesi, NAMA_COOKIE } from "@/lib/sesi-codec";

/* Jar cookie tiruan untuk next/headers; fetch tiruan menjawab menurut tabel rute per uji. */
const jar = vi.hoisted(() => ({ map: new Map<string, string>(), tulis: [] as { nama: string; nilai: string }[] }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nama: string) => (jar.map.has(nama) ? { value: jar.map.get(nama) as string } : undefined),
    set: (nama: string, nilai: string) => {
      jar.map.set(nama, nilai);
      jar.tulis.push({ nama, nilai });
    },
  }),
}));

type Penjawab = (url: string, init: RequestInit) => Response | Promise<Response> | undefined;
let penjawab: Penjawab = () => undefined;
const panggilan: { url: string; init: RequestInit }[] = [];

const json = (isi: unknown, status = 200) =>
  new Response(JSON.stringify(isi), { status, headers: { "content-type": "application/json" } });

beforeEach(() => {
  jar.map.clear();
  jar.tulis.length = 0;
  panggilan.length = 0;
  penjawab = () => undefined;
  vi.stubEnv("BACKEND_URL", "http://api.test/");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit = {}) => {
      panggilan.push({ url, init });
      const r = await penjawab(url, init);
      if (!r) throw new Error(`rute tak terdaftar: ${url}`);
      return r;
    }),
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const hdr = (i: number) => (panggilan[i]?.init.headers ?? {}) as Record<string, string>;
const TOKEN = JSON.stringify({ a: "akses-lama", r: "segar-lama" });
const pengguna = SesiUserSchema.parse({
  id_user: 7,
  nama: "Uji",
  email: "uji@contoh.test",
  role: "siswa",
  asal_sekolah: "SMPN 1",
});
const admin = SesiUserSchema.parse({ ...pengguna, id_user: 1, role: "admin" });

async function masukSebagai(u: typeof pengguna) {
  jar.map.set(NAMA_COOKIE, await enkodeSesi(u));
  jar.map.set("arnatomy_token", TOKEN);
}

describe("lib/backend: klien server-ke-server", () => {
  it("alamatBackend memangkas garis miring; kosong berarti mode tiruan", async () => {
    const { alamatBackend, backendAktif } = await import("@/lib/backend");
    expect(alamatBackend()).toBe("http://api.test");
    expect(backendAktif()).toBe(true);
    vi.stubEnv("BACKEND_URL", "  ");
    expect(alamatBackend()).toBeNull();
    expect(backendAktif()).toBe(false);
  });

  it("tanpa cookie token: 401 tanpa menyentuh jaringan; tanpaToken tetap memanggil dan meneruskan IP + JSON", async () => {
    const { panggil } = await import("@/lib/backend");
    expect((await panggil("/v1/x")).status).toBe(401);
    expect(panggilan).toHaveLength(0);
    penjawab = () => json({ ok: 1 });
    const h = await panggil("/v1/auth/login", { json: { a: 1 }, ipKlien: "9.9.9.9", tanpaToken: true });
    expect(h).toMatchObject({ status: 200, data: { ok: 1 } });
    const init = panggilan[0]?.init as RequestInit & { headers: Record<string, string> };
    expect(init.method).toBe("POST");
    expect(init.headers["x-forwarded-for"]).toBe("9.9.9.9");
    expect(init.headers["content-type"]).toBe("application/json");
    expect(init.headers.authorization).toBeUndefined();
  });

  it("membawa Bearer; galat backend dipetakan ke pesan dan kode", async () => {
    const { panggil } = await import("@/lib/backend");
    jar.map.set("arnatomy_token", TOKEN);
    penjawab = () => json({ pesan: "Ditolak", kode: "DILARANG" }, 403);
    const h = await panggil("/v1/admin/x");
    expect(h).toMatchObject({ status: 403, pesan: "Ditolak", kode: "DILARANG" });
    expect(hdr(0).authorization).toBe("Bearer akses-lama");
    penjawab = () => new Response("bukan json", { status: 500 });
    expect((await panggil("/v1/x")).pesan).toContain("500");
  });

  it("access token kedaluwarsa: refresh, ulangi permintaan, dan simpan pasangan token baru", async () => {
    const { panggil } = await import("@/lib/backend");
    jar.map.set("arnatomy_token", TOKEN);
    penjawab = (url, init) => {
      const auth = (init.headers as Record<string, string>).authorization;
      if (url.endsWith("/v1/auth/refresh")) return json({ access_token: "akses-baru", refresh_token: "segar-baru" });
      return auth === "Bearer akses-baru"
        ? json({ data: "ok" })
        : json({ pesan: "habis", kode: "SESI_TIDAK_SAH" }, 401);
    };
    const h = await panggil("/v1/riwayat");
    expect(h).toMatchObject({ status: 200, data: { data: "ok" } });
    expect(JSON.parse(jar.map.get("arnatomy_token") as string)).toEqual({ a: "akses-baru", r: "segar-baru" });
  });

  it("refresh gagal: hasil 401 asli dikembalikan dan cookie tidak diubah", async () => {
    const { panggil } = await import("@/lib/backend");
    jar.map.set("arnatomy_token", TOKEN);
    penjawab = (url) =>
      url.endsWith("/v1/auth/refresh") ? json({ pesan: "dicabut" }, 401) : json({ pesan: "habis" }, 401);
    const h = await panggil("/v1/riwayat");
    expect(h.status).toBe(401);
    expect(jar.tulis).toHaveLength(0);
  });

  it("jaringan putus: 503 BACKEND_MATI; ambil() melempar galat bila bukan 2xx", async () => {
    const { ambil, panggil } = await import("@/lib/backend");
    jar.map.set("arnatomy_token", TOKEN);
    penjawab = () => undefined; // fetch tiruan melempar
    expect(await panggil("/v1/x")).toMatchObject({ status: 503, kode: "BACKEND_MATI" });
    await expect(ambil("/v1/x")).rejects.toThrow(/503/);
    penjawab = () => json([1, 2]);
    expect(await ambil("/v1/x")).toEqual([1, 2]);
  });

  it("kirim FormData tanpa Content-Type JSON", async () => {
    const { panggil } = await import("@/lib/backend");
    jar.map.set("arnatomy_token", TOKEN);
    penjawab = () => json({ ok: true }, 201);
    const form = new FormData();
    form.set("berkas", new Blob(["x"]), "a.glb");
    await panggil("/v1/admin/aset/1", { form });
    const init = panggilan[0]?.init as RequestInit & { headers: Record<string, string> };
    expect(init.method).toBe("POST");
    expect(init.body).toBe(form);
    expect(init.headers["content-type"]).toBeUndefined();
  });
});

describe("lib/rute-backend: penerus /api ke /v1", () => {
  it("galatDari dan terus memetakan status, Retry-After, dan bentuk isi", async () => {
    const { galatDari, terus, ipDariPermintaan } = await import("@/lib/rute-backend");
    const r429 = galatDari({ status: 429, data: null, pesan: "Terlalu banyak" });
    expect(r429.status).toBe(429);
    expect(r429.headers.get("Retry-After")).toBe("60");
    expect(await r429.json()).toEqual({ pesan: "Terlalu banyak" });
    expect(galatDari({ status: 200, data: null }).status).toBe(502);

    jar.map.set("arnatomy_token", TOKEN);
    penjawab = () => json({ model: { versi: 3 } }, 200);
    const diubah = await terus<{ model: { versi: number } }>("/v1/x", {}, (d) => ({ v: d.model.versi }), 201);
    expect(diubah.status).toBe(201);
    expect(await diubah.json()).toEqual({ v: 3 });
    penjawab = () => json({ pesan: "nope" }, 404);
    expect((await terus("/v1/x")).status).toBe(404);

    const req = new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } });
    expect(ipDariPermintaan(req)).toBe("1.2.3.4");
    expect(ipDariPermintaan(new Request("http://x"))).toBeUndefined();
  });

  it("responsSesi memasang cookie sesi + token dan membawa profil_lengkap; gagal dipetakan ke galat", async () => {
    const { responsSesi } = await import("@/lib/rute-backend");
    const ok = await responsSesi(
      {
        status: 200,
        data: {
          user: { ...pengguna, profil_lengkap: false },
          access_token: "a1",
          refresh_token: "r1",
        },
      },
      201,
    );
    expect(ok.status).toBe(201);
    expect((await ok.json()).user).toMatchObject({ email: "uji@contoh.test", profil_lengkap: false });
    expect(ok.cookies.get(NAMA_COOKIE)?.value).toBeTruthy();
    expect(JSON.parse(ok.cookies.get("arnatomy_token")?.value as string)).toEqual({ a: "a1", r: "r1" });
    expect((await responsSesi({ status: 401, data: null, pesan: "salah" })).status).toBe(401);
  });

  it("hapusCookieSesi membuang kedua cookie; keluarBackend hanya memanggil backend bila ada sesi", async () => {
    const { hapusCookieSesi, keluarBackend } = await import("@/lib/rute-backend");
    const { NextResponse } = await import("next/server");
    const r = hapusCookieSesi(NextResponse.json({ ok: true }));
    expect(r.cookies.get(NAMA_COOKIE)?.value).toBe("");
    expect(r.cookies.get("arnatomy_token")?.value).toBe("");
    penjawab = () => json({ ok: true });
    await keluarBackend();
    expect(panggilan).toHaveLength(0);
    await masukSebagai(pengguna);
    await keluarBackend();
    expect(panggilan[0]?.url).toBe("http://api.test/v1/auth/logout");
  });
});

describe("lib/sumber dan auth dalam mode backend", () => {
  it("konten: admin memakai /admin/konten, pengguna /konten", async () => {
    const { semuaKonten } = await import("@/lib/sumber");
    penjawab = () => json([{ id_konten: 1 }]);
    await masukSebagai(pengguna);
    await semuaKonten();
    expect(panggilan.at(-1)?.url).toBe("http://api.test/v1/konten");
    await masukSebagai(admin);
    await semuaKonten();
    expect(panggilan.at(-1)?.url).toBe("http://api.test/v1/admin/konten");
  });

  it("riwayat dibalik ke urutan lama-baru dan rekap diubah ke bentuk klien", async () => {
    const { riwayatUser, ringkasanRiwayat } = await import("@/lib/sumber");
    await masukSebagai(pengguna);
    penjawab = () =>
      json({
        entri: [{ id_riwayat: 2 }, { id_riwayat: 1 }],
        rekap: [
          { id_bagian: 4, jumlah: 2, dimmed_dibuka: true, terakhir: "2026-01-01T00:00:00.000Z", total_durasi: 30 },
        ],
      });
    const idUser = pengguna.id_user;
    expect((await riwayatUser(idUser)).map((e) => e.id_riwayat)).toEqual([1, 2]);
    expect(await ringkasanRiwayat(idUser)).toEqual([
      { id_bagian: 4, jumlah: 2, dimmedDibuka: true, terakhir: "2026-01-01T00:00:00.000Z", totalDurasi: 30 },
    ]);
  });

  it("umpanBalikUser: 404 menjadi null, 500 melempar; tugas dan profil", async () => {
    const s = await import("@/lib/sumber");
    await masukSebagai(pengguna);
    penjawab = () => json({ pesan: "belum" }, 404);
    expect(await s.umpanBalikUser(pengguna.id_user)).toBeNull();
    penjawab = () => json({ pesan: "rusak" }, 500);
    await expect(s.umpanBalikUser(pengguna.id_user)).rejects.toThrow();
    penjawab = () => json({ id_umpan_balik: 1 });
    expect(await s.umpanBalikUser(pengguna.id_user)).toMatchObject({ id_umpan_balik: 1 });

    penjawab = (url) =>
      url.endsWith("/v1/tugas/99") ? json({ pesan: "x" }, 404) : json({ id_tugas: 3, jenis: "kuis" });
    expect(await s.isiTugas(99)).toBeNull();
    expect(await s.isiTugas(3)).toMatchObject({ id_tugas: 3 });
    penjawab = () => json([{ id_tugas: 1 }]);
    expect(await s.daftarTugas()).toHaveLength(1);
    penjawab = () => json({ tugas_total: 6 });
    expect(await s.progresTugas()).toMatchObject({ tugas_total: 6 });
    penjawab = () => json({ user: { ...pengguna, npsn_sekolah: "123" } });
    expect(await s.profilSaya()).toMatchObject({ npsn_sekolah: "123" });
  });

  it("aset: unggahan memakai URL /api/model berversi; bawaan memakai data lokal", async () => {
    const s = await import("@/lib/sumber");
    const { OrganIdSchema } = await import("@/lib/schemas");
    const id = OrganIdSchema.parse(1);
    await masukSebagai(admin);
    penjawab = () => json({ model: { sumber: "unggahan", versi: 4, nama_berkas: "j.glb", ukuran_byte: 99 } });
    expect(await s.asetOrgan(id)).toMatchObject({
      sumber: "unggahan",
      url: "/api/model/1/v4.glb",
      ukuran_byte: 99,
      versi: 4,
    });
    penjawab = () => json({ model: { sumber: "bawaan", versi: 0, nama_berkas: "heart.glb", ukuran_byte: null } });
    expect(await s.asetOrgan(id)).toMatchObject({ sumber: "bawaan", url: "/models/heart.glb" });
    penjawab = () =>
      json([{ id_organ: 1, model: { sumber: "bawaan", versi: 0, nama_berkas: "heart.glb", ukuran_byte: null } }]);
    expect(await s.semuaAset()).toHaveLength(1);
  });

  it("periksaSesi memakai /auth/me: ok, nonaktif saat 401, tetap ok saat backend mati; wajibSesi memeriksa peran", async () => {
    const { periksaSesi } = await import("@/lib/auth");
    const { wajibSesi } = await import("@/lib/api-util");
    await masukSebagai(pengguna);
    penjawab = () => json({ user: { ...pengguna, nama: "Baru" } });
    expect(await periksaSesi()).toMatchObject({ status: "ok", sesi: { nama: "Baru" } });
    penjawab = () => json({ pesan: "dicabut" }, 401);
    expect(await periksaSesi()).toEqual({ status: "nonaktif" });
    penjawab = () => undefined;
    expect((await periksaSesi()).status).toBe("ok");

    expect((await wajibSesi()).ok).toBe(true);
    const ditolak = await wajibSesi(["admin"]);
    expect(ditolak.ok).toBe(false);
    if (!ditolak.ok) expect(ditolak.respons.status).toBe(403);
    jar.map.delete(NAMA_COOKIE);
    const tanpa = await wajibSesi();
    expect(tanpa.ok).toBe(false);
  });

  it("mode tiruan: fungsi tugas mengembalikan null tanpa menyentuh jaringan", async () => {
    vi.stubEnv("BACKEND_URL", "");
    const s = await import("@/lib/sumber");
    expect(await s.daftarTugas()).toBeNull();
    expect(await s.progresTugas()).toBeNull();
    expect(await s.isiTugas(1)).toBeNull();
    expect(panggilan).toHaveLength(0);
  });
});

describe("Route Handler dalam mode backend", () => {
  const post = (url: string, isi: unknown) =>
    new Request(`http://web${url}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "8.8.8.8" },
      body: JSON.stringify(isi),
    });

  it("login dan google: meneruskan ke backend dan memasang sesi; salah kredensial = 401", async () => {
    const login = await import("@/app/api/login/route");
    const google = await import("@/app/api/google/route");
    penjawab = (url) =>
      url.endsWith("/v1/auth/login")
        ? json({ user: pengguna, access_token: "a", refresh_token: "r", token_type: "Bearer" })
        : url.endsWith("/v1/auth/google")
          ? json({ user: { ...pengguna, profil_lengkap: false }, access_token: "a", refresh_token: "r" }, 201)
          : undefined;
    const r = await login.POST(post("/api/login", { email: "uji@contoh.test", password: "x" }));
    expect(r.status).toBe(200);
    expect(r.headers.getSetCookie().join(";")).toContain("arnatomy_token");
    expect(hdr(0)["x-forwarded-for"]).toBe("8.8.8.8");
    const g = await google.POST(post("/api/google", { id_token: "x".repeat(30) }));
    expect(g.status).toBe(201);
    expect((await g.json()).user.profil_lengkap).toBe(false);
    expect((await google.POST(post("/api/google", { id_token: "pendek" }))).status).toBe(400);
    penjawab = () => json({ pesan: "salah", kode: "KREDENSIAL_SALAH" }, 401);
    expect((await login.POST(post("/api/login", { email: "uji@contoh.test", password: "x" }))).status).toBe(401);
    vi.stubEnv("BACKEND_URL", "");
    expect((await google.POST(post("/api/google", { id_token: "x".repeat(30) }))).status).toBe(503);
  });

  it("percobaan tugas, pencarian sekolah, dan profil diteruskan dengan sesi", async () => {
    const percobaan = await import("@/app/api/tugas/[id]/percobaan/route");
    const sekolah = await import("@/app/api/sekolah/route");
    const profil = await import("@/app/api/profil/route");
    await masukSebagai(pengguna);
    penjawab = (url) => {
      if (url.includes("/percobaan"))
        return json({ skor: 100, benar: 2, total: 2, ambang: 70, selesai: true, rincian: [] }, 201);
      if (url.includes("/v1/sekolah")) return json([{ npsn: "1", nama: "SMPN 1" }]);
      if (url.includes("/v1/auth/profil")) return json({ user: { ...pengguna, profil_lengkap: true } });
      return undefined;
    };
    const ctx = (id: string) => ({ params: Promise.resolve({ id }) }) as never;
    expect((await percobaan.POST(post("/api/tugas/1/percobaan", { jawaban: [0, 1] }), ctx("1"))).status).toBe(201);
    expect((await percobaan.POST(post("/api/tugas/x/percobaan", { jawaban: [0] }), ctx("x"))).status).toBe(400);
    expect((await percobaan.POST(post("/api/tugas/1/percobaan", { jawaban: [] }), ctx("1"))).status).toBe(400);

    expect((await sekolah.GET(new Request("http://web/api/sekolah?q=smp"))).status).toBe(200);
    expect((await sekolah.GET(new Request("http://web/api/sekolah?q=sm"))).status).toBe(400);
    expect(panggilan.at(-1)?.url).toContain("/v1/sekolah?q=smp&limit=12");

    const ubah = await profil.PATCH(
      new Request("http://web/api/profil", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: "guru", npsn: "20507767" }),
      }),
    );
    expect(ubah.status).toBe(200);
    const buruk = await profil.PATCH(
      new Request("http://web/api/profil", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: "admin" }),
      }),
    );
    expect(buruk.status).toBe(400);
  });

  it("konten/laporan/riwayat/asisten/umpan balik/akun/aset meneruskan ke endpoint yang benar", async () => {
    await masukSebagai(admin);
    const dilihat: string[] = [];
    penjawab = (url, init) => {
      dilihat.push(`${init.method ?? "GET"} ${url.replace("http://api.test", "")}`);
      if (url.endsWith("/v1/riwayat") && (init.method ?? "GET") === "GET") return json({ entri: [], rekap: [] });
      if (url.includes("/v1/organ/"))
        return json({ model: { sumber: "bawaan", versi: 0, nama_berkas: "heart.glb", ukuran_byte: null } });
      if (url.includes("/v1/admin/aset") && init.method === "POST")
        return json({ model: { sumber: "unggahan", versi: 1, nama_berkas: "a.glb", ukuran_byte: 20 } }, 201);
      return json({ ok: true, id_riwayat: 1 });
    };
    const j = (m: string, isi?: unknown) =>
      new Request("http://web/x", {
        method: m,
        headers: { "content-type": "application/json" },
        body: isi === undefined ? undefined : JSON.stringify(isi),
      });
    const id = (n: string) => ({ params: Promise.resolve({ id: n }) }) as never;

    const konten = await import("@/app/api/konten/[id]/route");
    await konten.PATCH(
      j("PATCH", {
        judul_tampil: "Judul baru",
        deskripsi: "Deskripsi yang cukup panjang untuk lolos validasi.",
        status_validasi: "tervalidasi",
      }),
      id("3"),
    );
    const laporan = await import("@/app/api/laporan/route");
    await laporan.POST(j("POST", { id_konten: 1, deskripsi_laporan: "Teks label kurang tepat", simulasiGagal: false }));
    const laporanId = await import("@/app/api/laporan/[id]/route");
    await laporanId.PATCH(j("PATCH"), id("2"));
    const riwayat = await import("@/app/api/riwayat/route");
    await riwayat.POST(j("POST", { id_bagian: 1, jenis_konten: "dasar" }));
    const riwayatId = await import("@/app/api/riwayat/[id]/route");
    await riwayatId.PATCH(j("PATCH"), id("5"));
    const asisten = await import("@/app/api/asisten/route");
    await asisten.POST(j("POST", { pertanyaan: "Apa itu aorta?", id_bagian: null, simulasiGagal: false }));
    expect(
      (await asisten.POST(j("POST", { pertanyaan: "Apa itu aorta?", id_bagian: null, simulasiGagal: true }))).status,
    ).toBe(503);
    const umpan = await import("@/app/api/umpan-balik/route");
    await umpan.POST(j("POST", { jawaban: [4, 2, 4, 2, 4, 2, 4, 2, 4, 2] }));
    const akun = await import("@/app/api/akun/route");
    await akun.POST(
      j("POST", {
        nama: "Akun Baru",
        email: "baru@contoh.test",
        password: "Rahasia123",
        role: "guru",
        asal_sekolah: "",
      }),
    );
    const akunId = await import("@/app/api/akun/[id]/route");
    await akunId.PATCH(j("PATCH", { aktif: false }), id("9"));
    await akunId.DELETE(j("DELETE"), id("9"));
    const asetId = await import("@/app/api/aset/[id]/route");
    expect((await asetId.DELETE(j("DELETE"), id("1"))).status).toBe(200);
    const aset = await import("@/app/api/aset/route");
    const form = new FormData();
    form.set("id_organ", "1");
    form.set("berkas", new File([new Uint8Array([103, 108, 84, 70, 2, 0, 0, 0, 20, 0, 0, 0, 1, 2, 3, 4])], "a.glb"));
    const up = await aset.POST(new Request("http://web/api/aset", { method: "POST", body: form }));
    expect(up.status).toBe(201);
    expect((await up.json()).url).toBe("/api/model/1/v1.glb");

    expect(dilihat).toEqual(
      expect.arrayContaining([
        "PATCH /v1/admin/konten/3",
        "POST /v1/laporan",
        "PATCH /v1/admin/laporan/2",
        "POST /v1/riwayat",
        "PATCH /v1/riwayat/5/tutup",
        "POST /v1/asisten/tanya",
        "POST /v1/umpan-balik",
        "POST /v1/admin/akun",
        "PATCH /v1/admin/akun/9",
        "DELETE /v1/admin/akun/9",
        "DELETE /v1/admin/aset/1",
        "POST /v1/admin/aset/1",
      ]),
    );
  });

  it("model unggahan disalurkan dari backend; versi tak cocok = 404", async () => {
    const model = await import("@/app/api/model/[id]/[berkas]/route");
    const ctx = (id: string, berkas: string) => ({ params: Promise.resolve({ id, berkas }) }) as never;
    penjawab = (url) => {
      if (url.includes("/v1/organ/1"))
        return json({ model: { sumber: "unggahan", versi: 2, url: "http://api.test/files/models/1/v2.glb" } });
      if (url.includes("/files/models/1/v2.glb"))
        return new Response(new Uint8Array([1, 2, 3]), { headers: { "content-length": "3" } });
      return undefined;
    };
    await masukSebagai(pengguna);
    const ok = await model.GET(new Request("http://web/x"), ctx("1", "v2.glb"));
    expect(ok.status).toBe(200);
    expect(ok.headers.get("content-type")).toBe("model/gltf-binary");
    expect(new Uint8Array(await ok.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    expect((await model.GET(new Request("http://web/x"), ctx("1", "v9.glb"))).status).toBe(404);
    expect((await model.GET(new Request("http://web/x"), ctx("1", "salah"))).status).toBe(404);
  });

  it("kelola soal: hanya admin, validasi sebelum diteruskan, dan 503 tanpa backend", async () => {
    const tambah = await import("@/app/api/tugas-admin/[id]/soal/route");
    const soal = await import("@/app/api/soal/[id]/route");
    const sumber = await import("@/lib/sumber");
    const id = (n: string) => ({ params: Promise.resolve({ id: n }) }) as never;
    const sah = {
      pertanyaan: "Pembuluh apa yang paling besar di tubuh?",
      pilihan: ["Aorta", "Vena kava", "Kapiler"],
      jawaban_benar: 0,
      penjelasan: "Aorta adalah arteri terbesar dari ventrikel kiri.",
    };
    const j = (m: string, isi?: unknown) =>
      new Request("http://web/x", {
        method: m,
        headers: { "content-type": "application/json" },
        body: isi === undefined ? undefined : JSON.stringify(isi),
      });
    const dilihat: string[] = [];
    penjawab = (url, init) => {
      dilihat.push(`${init.method ?? "GET"} ${url.replace("http://api.test", "")}`);
      return json(
        url.endsWith("/v1/admin/tugas") ? [{ id_tugas: 1 }] : { id_soal: 5, ok: true },
        init.method === "POST" ? 201 : 200,
      );
    };
    await masukSebagai(pengguna);
    expect((await tambah.POST(j("POST", sah), id("1"))).status).toBe(403);
    await masukSebagai(admin);
    expect((await tambah.POST(j("POST", sah), id("1"))).status).toBe(201);
    expect((await tambah.POST(j("POST", { ...sah, jawaban_benar: 9 }), id("1"))).status).toBe(400);
    expect((await tambah.POST(j("POST", sah), id("nol"))).status).toBe(400);
    expect((await soal.PATCH(j("PATCH", sah), id("5"))).status).toBe(200);
    expect((await soal.PATCH(j("PATCH", { pertanyaan: "x" }), id("5"))).status).toBe(400);
    expect((await soal.DELETE(j("DELETE"), id("5"))).status).toBe(200);
    expect(await sumber.tugasAdmin()).toHaveLength(1);
    expect(dilihat).toEqual(
      expect.arrayContaining([
        "POST /v1/admin/tugas/1/soal",
        "PATCH /v1/admin/soal/5",
        "DELETE /v1/admin/soal/5",
        "GET /v1/admin/tugas",
      ]),
    );
    vi.stubEnv("BACKEND_URL", "");
    expect((await soal.DELETE(j("DELETE"), id("5"))).status).toBe(503);
    expect(await sumber.tugasAdmin()).toBeNull();
  });
});
