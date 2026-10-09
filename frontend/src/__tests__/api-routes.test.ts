import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SesiUser } from "@/lib/schemas";

const ambilSesi = vi.hoisted(() => vi.fn<() => Promise<SesiUser | null>>());
/* periksaSesi diturunkan dari mock yang sama; jalur "nonaktif" diuji di auth.test.ts */
vi.mock("@/lib/auth", () => ({
  ambilSesi,
  periksaSesi: async () => {
    const sesi = await ambilSesi();
    return sesi ? { status: "ok", sesi } : { status: "tanpa-sesi" };
  },
}));
/* Jeda buatan dilewati agar uji cepat */
vi.mock("@/lib/db", async (asli) => ({ ...(await asli<typeof import("@/lib/db")>()), jeda: () => Promise.resolve() }));

const siswa = { id_user: 1, nama: "Nehan", email: "siswa@arnatomy.id", role: "siswa", asal_sekolah: null } as SesiUser;
const admin = { id_user: 3, nama: "Admin", email: "admin@arnatomy.id", role: "admin", asal_sekolah: null } as SesiUser;

const post = (url: string, body: unknown) =>
  new Request(`http://localhost${url}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
const patch = (url: string, body?: unknown) =>
  new Request(`http://localhost${url}`, { method: "PATCH", body: body === undefined ? null : JSON.stringify(body) });
const hapus = (url: string) => new Request(`http://localhost${url}`, { method: "DELETE" });
const konteks = (id: string) => ({ params: Promise.resolve({ id }) });

describe("Route Handlers", () => {
  beforeEach(() => {
    ambilSesi.mockReset();
    delete (globalThis as Record<symbol, unknown>)[Symbol.for("arnatomy.db")];
    delete (globalThis as Record<symbol, unknown>)[Symbol.for("arnatomy.pembatas")];
  });

  it("POST /api/login: 400 body kosong, 401 sandi salah, 200 + cookie httpOnly bila benar", async () => {
    const { POST } = await import("@/app/api/login/route");
    expect((await POST(post("/api/login", { email: "", password: "" }))).status).toBe(400);
    expect((await POST(post("/api/login", { email: "siswa@arnatomy.id", password: "salah" }))).status).toBe(401);
    const ok = await POST(post("/api/login", { email: "SISWA@arnatomy.id", password: "siswa123" }));
    expect(ok.status).toBe(200);
    const { user } = await ok.json();
    expect(user).toMatchObject({ id_user: 1, role: "siswa" });
    expect(user).not.toHaveProperty("password");
    const cookie = ok.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/arnatomy_sesi=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
  });

  it("POST /api/login: 403 akun nonaktif, 429 setelah 5 kegagalan (Retry-After)", async () => {
    const db = await import("@/lib/db");
    const { POST } = await import("@/app/api/login/route");
    await db.setAkunAktif(siswa.id_user, false);
    expect((await POST(post("/api/login", { email: "siswa@arnatomy.id", password: "siswa123" }))).status).toBe(403);

    for (let i = 0; i < 5; i += 1) {
      const r = await POST(post("/api/login", { email: "guru@arnatomy.id", password: "salah" }));
      expect(r.status).toBe(401);
    }
    const diblokir = await POST(post("/api/login", { email: "guru@arnatomy.id", password: "guru123" }));
    expect(diblokir.status).toBe(429);
    expect(Number(diblokir.headers.get("Retry-After"))).toBeGreaterThan(0);
    /* email lain tidak ikut terblokir */
    expect((await POST(post("/api/login", { email: "admin@arnatomy.id", password: "admin123" }))).status).toBe(200);
  });

  it("POST /api/daftar: 400 sandi lemah, 409 email terpakai, 201 + cookie lalu bisa masuk", async () => {
    const { POST } = await import("@/app/api/daftar/route");
    const { POST: login } = await import("@/app/api/login/route");
    const dasar = { nama: "Dina", email: "dina@sekolah.sch.id", role: "siswa", asal_sekolah: "SMPN 3 Madiun" };
    expect((await POST(post("/api/daftar", { ...dasar, password: "pendek1", konfirmasi: "pendek1" }))).status).toBe(
      400,
    );
    expect(
      (
        await POST(
          post("/api/daftar", {
            ...dasar,
            email: "siswa@arnatomy.id",
            password: "rahasia123",
            konfirmasi: "rahasia123",
          }),
        )
      ).status,
    ).toBe(409);
    const dibuat = await POST(post("/api/daftar", { ...dasar, password: "rahasia123", konfirmasi: "rahasia123" }));
    expect(dibuat.status).toBe(201);
    const { user } = await dibuat.json();
    expect(user).toMatchObject({ nama: "Dina", role: "siswa", asal_sekolah: "SMPN 3 Madiun" });
    expect(user).not.toHaveProperty("password");
    expect(dibuat.headers.get("set-cookie")).toMatch(/arnatomy_sesi=.*HttpOnly/i);
    expect((await login(post("/api/login", { email: "DINA@sekolah.sch.id", password: "rahasia123" }))).status).toBe(
      200,
    );
  });

  it("GET /api/logout?alasan=nonaktif membuang cookie dan mengalihkan ke /login", async () => {
    ambilSesi.mockResolvedValue(null);
    const { GET } = await import("@/app/api/logout/route");
    const r = await GET(new Request("http://localhost/api/logout?alasan=nonaktif"));
    expect(r.status).toBe(303);
    expect(r.headers.get("location")).toMatch(/\/login\?auth_error=nonaktif$/);
    expect(r.headers.get("set-cookie")).toMatch(/arnatomy_sesi=;/);
  });

  it("/api/akun: hanya admin; tidak boleh mengubah/menghapus akun sendiri", async () => {
    const { GET } = await import("@/app/api/akun/route");
    const { DELETE, PATCH } = await import("@/app/api/akun/[id]/route");
    ambilSesi.mockResolvedValue(siswa);
    expect((await GET()).status).toBe(403);

    ambilSesi.mockResolvedValue(admin);
    expect(await (await GET()).json()).toHaveLength(3);
    expect((await PATCH(patch("/api/akun/3", { aktif: false }), konteks("3"))).status).toBe(400);
    expect((await PATCH(patch("/api/akun/x", { aktif: false }), konteks("x"))).status).toBe(400);
    expect((await PATCH(patch("/api/akun/999", { aktif: false }), konteks("999"))).status).toBe(404);
    expect((await PATCH(patch("/api/akun/1", { aktif: "ya" }), konteks("1"))).status).toBe(400);
    const nonaktif = await PATCH(patch("/api/akun/1", { aktif: false }), konteks("1"));
    expect((await nonaktif.json()).aktif).toBe(false);
    expect((await DELETE(hapus("/api/akun/3"), konteks("3"))).status).toBe(400);
    expect((await DELETE(hapus("/api/akun/999"), konteks("999"))).status).toBe(404);
    expect((await DELETE(hapus("/api/akun/1"), konteks("1"))).status).toBe(200);
    expect(await (await GET()).json()).toHaveLength(2);
  });

  it("/api/akun: POST tambah (409 email ganda) dan PATCH ubah data/sandi (409 email akun lain)", async () => {
    const { POST } = await import("@/app/api/akun/route");
    const { PATCH } = await import("@/app/api/akun/[id]/route");
    const db = await import("@/lib/db");
    ambilSesi.mockResolvedValue(siswa);
    expect((await POST(post("/api/akun", {}))).status).toBe(403);

    ambilSesi.mockResolvedValue(admin);
    const dasar = {
      nama: "Pak Budi",
      email: "budi@sekolah.sch.id",
      password: "sandi1234",
      role: "guru",
      asal_sekolah: "",
    };
    expect((await POST(post("/api/akun", { ...dasar, password: "lemah" }))).status).toBe(400);
    const dibuat = await POST(post("/api/akun", dasar));
    expect(dibuat.status).toBe(201);
    const akun = await dibuat.json();
    expect(akun).toMatchObject({ nama: "Pak Budi", role: "guru", asal_sekolah: null, aktif: true });
    expect((await POST(post("/api/akun", dasar))).status).toBe(409);

    const id = String(akun.id_user);
    expect((await PATCH(patch(`/api/akun/${id}`, {}), konteks(id))).status).toBe(400);
    expect((await PATCH(patch(`/api/akun/${id}`, { email: "siswa@arnatomy.id" }), konteks(id))).status).toBe(409);
    const diubah = await PATCH(
      patch(`/api/akun/${id}`, { nama: "Pak Budi S.", role: "admin", password: "baru12345" }),
      konteks(id),
    );
    expect(diubah.status).toBe(200);
    expect(await diubah.json()).toMatchObject({ nama: "Pak Budi S.", role: "admin" });
    expect(await db.verifikasiLogin("budi@sekolah.sch.id", "baru12345")).toMatchObject({ status: "ok" });
    /* sandi kosong = tidak diganti */
    await PATCH(patch(`/api/akun/${id}`, { password: "", nama: "Budi" }), konteks(id));
    expect(await db.verifikasiLogin("budi@sekolah.sch.id", "baru12345")).toMatchObject({ status: "ok" });
  });

  it("/api/aset & /api/model: unggah .glb (validasi magic bytes), sajikan, kembalikan bawaan", async () => {
    const { GET, POST } = await import("@/app/api/aset/route");
    const { DELETE } = await import("@/app/api/aset/[id]/route");
    const { GET: ambilModel } = await import("@/app/api/model/[id]/[berkas]/route");
    ambilSesi.mockResolvedValue(admin);

    const awal = await (await GET()).json();
    expect(awal).toHaveLength(2);
    expect(awal[0]).toMatchObject({ id_organ: 1, sumber: "bawaan", url: "/models/heart.glb" });

    const glb = new Uint8Array(new ArrayBuffer(24));
    glb.set([0x67, 0x6c, 0x54, 0x46], 0); // "glTF"
    const multipart = (nama: string, isi: Uint8Array<ArrayBuffer>, idOrgan = "1") => {
      const form = new FormData();
      form.set("id_organ", idOrgan);
      form.set("berkas", new File([isi], nama, { type: "model/gltf-binary" }));
      return new Request("http://localhost/api/aset", { method: "POST", body: form });
    };
    expect((await POST(post("/api/aset", {}))).status).toBe(400);
    expect((await POST(multipart("jantung.glb", glb, "99"))).status).toBe(404);
    expect((await POST(multipart("jantung.obj", glb))).status).toBe(400);
    expect((await POST(multipart("palsu.glb", new Uint8Array(new ArrayBuffer(24))))).status).toBe(400);
    const diunggah = await POST(multipart("jantung-baru.glb", glb));
    expect(diunggah.status).toBe(201);
    const aset = await diunggah.json();
    expect(aset).toMatchObject({
      id_organ: 1,
      sumber: "unggahan",
      versi: 1,
      url: "/api/model/1/v1.glb",
      ukuran_byte: 24,
    });

    const berkas = await ambilModel(new Request("http://localhost/api/model/1/v1.glb"), {
      params: Promise.resolve({ id: "1", berkas: "v1.glb" }),
    });
    expect(berkas.status).toBe(200);
    expect(berkas.headers.get("content-type")).toBe("model/gltf-binary");
    expect((await berkas.arrayBuffer()).byteLength).toBe(24);
    expect(
      (
        await ambilModel(new Request("http://localhost/api/model/1/v9.glb"), {
          params: Promise.resolve({ id: "1", berkas: "v9.glb" }),
        })
      ).status,
    ).toBe(404);

    /* unggah ulang menaikkan versi */
    expect((await (await POST(multipart("jantung-v2.glb", glb))).json()).versi).toBe(2);
    expect((await DELETE(hapus("/api/aset/2"), konteks("2"))).status).toBe(404);
    const kembali = await DELETE(hapus("/api/aset/1"), konteks("1"));
    expect(await kembali.json()).toMatchObject({ sumber: "bawaan", url: "/models/heart.glb" });
    ambilSesi.mockResolvedValue(siswa);
    expect((await GET()).status).toBe(403);
  });

  it("/api/umpan-balik: skor SUS dihitung server; siswa hanya melihat miliknya, admin semua", async () => {
    const { GET, POST } = await import("@/app/api/umpan-balik/route");
    ambilSesi.mockResolvedValue(siswa);
    expect((await POST(post("/api/umpan-balik", { jawaban: [5, 1, 5] }))).status).toBe(400);
    const dibuat = await POST(
      post("/api/umpan-balik", { jawaban: [5, 1, 5, 1, 5, 1, 5, 1, 5, 1], komentar: " Mantap " }),
    );
    expect(dibuat.status).toBe(201);
    expect(await dibuat.json()).toMatchObject({ id_user: 1, skor_sus: 100, komentar: "Mantap" });
    expect(await (await GET()).json()).toHaveLength(1);

    ambilSesi.mockResolvedValue({ ...siswa, id_user: 2 as SesiUser["id_user"] });
    expect(await (await GET()).json()).toHaveLength(0);
    ambilSesi.mockResolvedValue(admin);
    expect(await (await GET()).json()).toHaveLength(1);
  });

  it("catch-all /api/*: endpoint tak dikenal membalas JSON 404", async () => {
    const { GET, POST } = await import("@/app/api/[...rute]/route");
    const r = await GET(new Request("http://localhost/api/tidak-ada"));
    expect(r.status).toBe(404);
    expect((await r.json()).pesan).toMatch(/GET \/api\/tidak-ada/);
    expect((await POST(new Request("http://localhost/api/x", { method: "POST" }))).status).toBe(404);
  });

  it("POST /api/logout menghapus cookie dan membersihkan data pengguna", async () => {
    const db = await import("@/lib/db");
    db.catatRiwayat(siswa.id_user, 4 as never, "dasar");
    ambilSesi.mockResolvedValue(siswa);
    const { POST } = await import("@/app/api/logout/route");
    const r = await POST();
    expect(await r.json()).toEqual({ ok: true });
    expect(r.headers.get("set-cookie")).toMatch(/arnatomy_sesi=;/);
    expect(db.riwayatUser(siswa.id_user)).toEqual([]);
  });

  it("/api/asisten: 401 tanpa sesi, 503 saat simulasiGagal, 201 jawaban kontekstual, GET daftar", async () => {
    const { GET, POST } = await import("@/app/api/asisten/route");
    ambilSesi.mockResolvedValueOnce(null);
    expect((await GET()).status).toBe(401);

    ambilSesi.mockResolvedValue(siswa);
    expect((await POST(post("/api/asisten", { pertanyaan: "x", id_bagian: 5, simulasiGagal: true }))).status).toBe(503);
    const dibuat = await POST(post("/api/asisten", { pertanyaan: "apa fungsinya?", id_bagian: 5 }));
    expect(dibuat.status).toBe(201);
    expect((await dibuat.json()).jawaban).toMatch(/^Tentang Aorta/);
    expect(await (await GET()).json()).toHaveLength(1);
    expect((await POST(post("/api/asisten", { pertanyaan: "", id_bagian: null }))).status).toBe(400);
  });

  it("/api/laporan: siswa boleh kirim, hanya admin boleh membaca dan menindaklanjuti", async () => {
    const { GET, POST } = await import("@/app/api/laporan/route");
    const { PATCH } = await import("@/app/api/laporan/[id]/route");
    ambilSesi.mockResolvedValue(siswa);
    expect(
      (await POST(post("/api/laporan", { id_konten: 8, deskripsi_laporan: "x".repeat(12), simulasiGagal: true })))
        .status,
    ).toBe(503);
    expect((await POST(post("/api/laporan", { id_konten: 999, deskripsi_laporan: "x".repeat(12) }))).status).toBe(404);
    const dibuat = await POST(post("/api/laporan", { id_konten: 8, deskripsi_laporan: "Diameter aorta salah tulis." }));
    expect(dibuat.status).toBe(201);
    const laporan = await dibuat.json();
    expect((await GET()).status).toBe(403);
    expect((await PATCH(patch(`/api/laporan/${laporan.id_laporan}`), konteks(String(laporan.id_laporan)))).status).toBe(
      403,
    );

    ambilSesi.mockResolvedValue(admin);
    expect(await (await GET()).json()).toHaveLength(1);
    expect((await PATCH(patch("/api/laporan/abc"), konteks("abc"))).status).toBe(400);
    expect((await PATCH(patch("/api/laporan/999"), konteks("999"))).status).toBe(404);
    const selesai = await PATCH(patch(`/api/laporan/${laporan.id_laporan}`), konteks(String(laporan.id_laporan)));
    expect((await selesai.json()).status_tindak_lanjut).toBe("ditindaklanjuti");
  });

  it("/api/konten: GET untuk semua peran, PATCH hanya admin dan tervalidasi Zod", async () => {
    const { GET } = await import("@/app/api/konten/route");
    const { PATCH } = await import("@/app/api/konten/[id]/route");
    ambilSesi.mockResolvedValue(siswa);
    expect(await (await GET()).json()).toHaveLength(20);
    const input = { judul_tampil: "Aorta", deskripsi: "x".repeat(25), status_validasi: "tervalidasi" };
    expect((await PATCH(patch("/api/konten/8", input), konteks("8"))).status).toBe(403);

    ambilSesi.mockResolvedValue(admin);
    expect((await PATCH(patch("/api/konten/8", { ...input, deskripsi: "pendek" }), konteks("8"))).status).toBe(400);
    expect((await PATCH(patch("/api/konten/x", input), konteks("x"))).status).toBe(400);
    expect((await PATCH(patch("/api/konten/999", input), konteks("999"))).status).toBe(404);
    const ok = await PATCH(patch("/api/konten/8", input), konteks("8"));
    expect((await ok.json()).status_validasi).toBe("tervalidasi");
  });

  it("/api/riwayat: catat lalu tutup; durasi dihitung server", async () => {
    const { GET, POST } = await import("@/app/api/riwayat/route");
    const { PATCH } = await import("@/app/api/riwayat/[id]/route");
    ambilSesi.mockResolvedValue(siswa);
    expect((await POST(post("/api/riwayat", { id_bagian: 999, jenis_konten: "dasar" }))).status).toBe(404);
    const dibuat = await POST(post("/api/riwayat", { id_bagian: 4, jenis_konten: "dasar" }));
    expect(dibuat.status).toBe(201);
    const entri = await dibuat.json();
    expect(entri.durasi).toBeNull();
    const ditutup = await PATCH(patch(`/api/riwayat/${entri.id_riwayat}`), konteks(String(entri.id_riwayat)));
    expect((await ditutup.json()).durasi).toBeGreaterThanOrEqual(1);
    expect((await PATCH(patch("/api/riwayat/999"), konteks("999"))).status).toBe(404);
    expect((await PATCH(patch("/api/riwayat/x"), konteks("x"))).status).toBe(400);
    expect(await (await GET()).json()).toHaveLength(1);
  });
});
