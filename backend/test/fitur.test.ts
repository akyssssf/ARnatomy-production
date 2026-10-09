import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { klien, type Lingkungan, siapkan } from "./helpers";

let env: Lingkungan;
let k: ReturnType<typeof klien>;
let siswa: string;
let guru: string;
let admin: string;
beforeAll(async () => {
  env = await siapkan();
  k = klien(env);
  [siswa, guru, admin] = await Promise.all([k.masuk("siswa"), k.masuk("guru"), k.masuk("admin")]);
});
afterAll(() => env.tutup());

describe("FR-14 riwayat belajar", () => {
  it("mencatat, menutup dengan durasi dari server, dan merekap", async () => {
    const a = await k.panggil<{ id_riwayat: number; durasi: number | null }>("POST", "/v1/riwayat", {
      token: siswa,
      json: { id_bagian: 1, jenis_konten: "dasar" },
    });
    expect(a.status).toBe(201);
    expect(a.body.durasi).toBeNull();
    await k.panggil("POST", "/v1/riwayat", { token: siswa, json: { id_bagian: 1, jenis_konten: "dimmed" } });
    await new Promise((s) => setTimeout(s, 1100));
    const t = await k.panggil<{ durasi: number }>("PATCH", `/v1/riwayat/${a.body.id_riwayat}/tutup`, { token: siswa });
    expect(t.body.durasi).toBeGreaterThanOrEqual(1);
    const lagi = await k.panggil<{ durasi: number }>("PATCH", `/v1/riwayat/${a.body.id_riwayat}/tutup`, {
      token: siswa,
    });
    expect(lagi.body.durasi).toBe(t.body.durasi);
    const r = await k.panggil<{
      entri: unknown[];
      rekap: { id_bagian: number; jumlah: number; dimmed_dibuka: boolean }[];
    }>("GET", "/v1/riwayat", { token: siswa });
    expect(r.body.entri).toHaveLength(2);
    expect(r.body.rekap[0]).toMatchObject({ id_bagian: 1, jumlah: 2, dimmed_dibuka: true });
  });
  it("hanya milik sendiri: guru tidak melihat atau menutup riwayat siswa", async () => {
    const g = await k.panggil<{ entri: unknown[] }>("GET", "/v1/riwayat", { token: guru });
    expect(g.body.entri).toHaveLength(0);
    const s = await k.panggil<{ id_riwayat: number }>("POST", "/v1/riwayat", {
      token: siswa,
      json: { id_bagian: 2, jenis_konten: "dasar" },
    });
    expect((await k.panggil("PATCH", `/v1/riwayat/${s.body.id_riwayat}/tutup`, { token: guru })).status).toBe(404);
  });
  it("validasi masukan", async () => {
    expect(
      (await k.panggil("POST", "/v1/riwayat", { token: siswa, json: { id_bagian: 999, jenis_konten: "dasar" } }))
        .status,
    ).toBe(404);
    expect(
      (await k.panggil("POST", "/v1/riwayat", { token: siswa, json: { id_bagian: 1, jenis_konten: "lain" } })).status,
    ).toBe(400);
    expect((await k.panggil("PATCH", "/v1/riwayat/x/tutup", { token: siswa })).status).toBe(400);
  });
});

describe("FR-08 asisten AI (RAG berbasis buku)", () => {
  const Q = "Bagaimana jalur peredaran darah kecil?";
  it("RAG: mengambil chunk buku, menyusun prompt sesuai jenjang, memanggil LLM dengan temperature 0, dan mengembalikan jawaban + sumber", async () => {
    env.llm.jawaban = "Darah miskin oksigen dipompa dari bilik kanan ke paru-paru lalu kembali ke serambi kiri.";
    env.llm.dipanggil = 0;
    const r = await k.panggil<{
      jawaban: string;
      asal: string;
      jenjang: string;
      mode_retrieval: string;
      sumber: { buku: string; halaman: number; cuplikan: string }[];
    }>("POST", "/v1/asisten/tanya", { token: siswa, json: { pertanyaan: Q, jenjang: "SMA" } });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ asal: "llm", jenjang: "SMA", mode_retrieval: "hybrid" });
    expect(r.body.jawaban).toContain("paru-paru");
    expect(r.body.sumber.length).toBeGreaterThan(0);
    expect(r.body.sumber[0]).toMatchObject({
      buku: expect.any(String),
      halaman: expect.any(Number),
      cuplikan: expect.any(String),
    });
    expect(new Set(r.body.sumber.map((x) => `${x.buku}|${x.halaman}`)).size).toBe(r.body.sumber.length);
    expect(env.llm.dipanggil).toBe(1);
    expect(env.llm.terakhir?.sistem).toContain("siswa SMA");
    expect(env.llm.terakhir?.pengguna).toContain("[1] ");
    expect(env.llm.terakhir?.pengguna).toContain(`Pertanyaan siswa: ${Q}`);
    expect(env.llm.terakhir?.opsi).toMatchObject({ temperature: 0, maxTokens: 2000 });
    const h = await k.panggil<unknown[]>("GET", "/v1/asisten/riwayat", { token: siswa });
    expect(h.body).toHaveLength(1);
  });
  it("jenjang bawaan SMP bila tidak dikirim; id_bagian disimpan sebagai konteks", async () => {
    env.llm.jawaban = "Jawaban singkat untuk siswa SMP tentang jalur peredaran darah kecil.";
    const r = await k.panggil<{ jenjang: string; id_bagian: number }>("POST", "/v1/asisten/tanya", {
      token: guru,
      json: { pertanyaan: Q, id_bagian: 1 },
    });
    expect(r.body).toMatchObject({ jenjang: "SMP", id_bagian: 1 });
    expect(env.llm.terakhir?.sistem).toContain("siswa SMP");
  });
  it("pertanyaan yang vektornya jauh dari semua chunk ditolak tanpa memanggil LLM", async () => {
    env.llm.dipanggil = 0;
    const r = await k.panggil<{ jawaban: string; asal: string; sumber: unknown[] }>("POST", "/v1/asisten/tanya", {
      token: guru,
      json: { pertanyaan: "Berapa jumlah tulang manusia?" },
    });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ asal: "penolakan", sumber: [] });
    expect(r.body.jawaban).toContain("belum ada di ARnatomy");
    expect(env.llm.dipanggil).toBe(0);
  });
  it("bila LLM menolak (di luar cakupan), sumber dikosongkan", async () => {
    env.llm.jawaban =
      "Maaf, materi itu belum ada di ARnatomy. Saat ini baru tersedia sistem peredaran darah dan sistem pernapasan.";
    const r = await k.panggil<{ asal: string; sumber: unknown[] }>("POST", "/v1/asisten/tanya", {
      token: guru,
      json: { pertanyaan: "Apa fungsi ginjal pada manusia?" },
    });
    expect(r.body).toMatchObject({ asal: "penolakan", sumber: [] });
  });
  it("LLM tidak tersedia: jawaban cadangan lokal (dengan konteks bagian) tetap menyertakan sumber buku", async () => {
    env.llm.jawaban = null;
    const a = await k.panggil<{ jawaban: string; asal: string; sumber: unknown[] }>("POST", "/v1/asisten/tanya", {
      token: guru,
      json: { pertanyaan: "Apa fungsi katup jantung?", id_bagian: 1 },
    });
    expect(a.body.asal).toBe("lokal");
    expect(a.body.jawaban).toContain("Atrium Kanan");
    const b = await k.panggil<{ jawaban: string; asal: string; sumber: unknown[] }>("POST", "/v1/asisten/tanya", {
      token: guru,
      json: { pertanyaan: Q },
    });
    expect(b.body.asal).toBe("lokal");
    expect(b.body.jawaban).toContain("tidak tersedia");
    expect(b.body.sumber.length).toBeGreaterThan(0);
  });
  it("keluaran berisi anjuran pengobatan diganti jawaban aman; istilah medis dalam penjelasan tidak; jawaban terlalu panjang dipangkas", async () => {
    env.llm.jawaban = "Sebaiknya minum obat dengan dosis 500 mg setiap hari.";
    const a = await k.panggil<{ jawaban: string }>("POST", "/v1/asisten/tanya", {
      token: guru,
      json: { pertanyaan: Q },
    });
    expect(a.body.jawaban).toContain("dokter");
    env.llm.jawaban = "Diagnosis PPOK dibuat lewat spirometri yang mengukur aliran udara.";
    const b = await k.panggil<{ jawaban: string }>("POST", "/v1/asisten/tanya", {
      token: guru,
      json: { pertanyaan: Q },
    });
    expect(b.body.jawaban).toContain("spirometri");
    env.llm.jawaban = "Kalimat penjelasan anatomi yang cukup panjang. ".repeat(60);
    const c = await k.panggil<{ jawaban: string }>("POST", "/v1/asisten/tanya", {
      token: guru,
      json: { pertanyaan: Q },
    });
    expect(c.body.jawaban.length).toBeLessThanOrEqual(1200);
  });
  it("memvalidasi masukan dan bagian tubuh", async () => {
    expect((await k.panggil("POST", "/v1/asisten/tanya", { token: siswa, json: { pertanyaan: "" } })).status).toBe(400);
    expect(
      (await k.panggil("POST", "/v1/asisten/tanya", { token: siswa, json: { pertanyaan: "x".repeat(501) } })).status,
    ).toBe(400);
    expect(
      (await k.panggil("POST", "/v1/asisten/tanya", { token: siswa, json: { pertanyaan: "Halo", id_bagian: 999 } }))
        .status,
    ).toBe(404);
    expect(
      (await k.panggil("POST", "/v1/asisten/tanya", { token: siswa, json: { pertanyaan: "Halo", jenjang: "SD" } }))
        .status,
    ).toBe(400);
  });
  it("membatasi 10 pertanyaan per menit per pengguna (429)", async () => {
    const e2 = await siapkan();
    const k2 = klien(e2);
    const t = await k2.masuk("siswa");
    let terakhir = 0;
    for (let i = 0; i < 11; i++)
      terakhir = (await k2.panggil("POST", "/v1/asisten/tanya", { token: t, json: { pertanyaan: `Pertanyaan ${i}` } }))
        .status;
    expect(terakhir).toBe(429);
    await e2.tutup();
  });
  it("klasifikasi sistem organ: parsing kategori, 'Lainnya' bila tidak cocok, 503 bila LLM tidak tersedia", async () => {
    env.llm.jawaban = "Pernapasan";
    expect(
      (
        await k.panggil<{ kategori: string }>("POST", "/v1/asisten/klasifikasi", {
          token: siswa,
          json: { pertanyaan: "Apa itu bronkitis?" },
        })
      ).body.kategori,
    ).toBe("Pernapasan");
    expect(env.llm.terakhir?.pengguna).toContain("Pertanyaan: Apa itu bronkitis?");
    env.llm.jawaban = "peredaran darah.";
    expect(
      (
        await k.panggil<{ kategori: string }>("POST", "/v1/asisten/klasifikasi", {
          token: siswa,
          json: { pertanyaan: "Kenapa nadi bisa diraba?" },
        })
      ).body.kategori,
    ).toBe("Peredaran Darah");
    env.llm.jawaban = "tidak tahu";
    expect(
      (
        await k.panggil<{ kategori: string }>("POST", "/v1/asisten/klasifikasi", {
          token: siswa,
          json: { pertanyaan: "Halo?" },
        })
      ).body.kategori,
    ).toBe("Lainnya");
    env.llm.jawaban = null;
    expect(
      (await k.panggil("POST", "/v1/asisten/klasifikasi", { token: siswa, json: { pertanyaan: "Halo?" } })).status,
    ).toBe(503);
    expect(
      (await k.panggil("POST", "/v1/asisten/klasifikasi", { token: siswa, json: { pertanyaan: "" } })).status,
    ).toBe(400);
  });
});

describe("FR-09 + FR-11 laporan kesalahan", () => {
  it("siswa melapor, admin melihat dan menindaklanjuti", async () => {
    const l = await k.panggil<{ id_laporan: number; status_tindak_lanjut: string }>("POST", "/v1/laporan", {
      token: siswa,
      json: { id_konten: 1, deskripsi_laporan: "Tebal dinding atrium kanan kurang tepat." },
    });
    expect(l.status).toBe(201);
    expect(l.body.status_tindak_lanjut).toBe("baru");
    const saya = await k.panggil<unknown[]>("GET", "/v1/laporan/saya", { token: siswa });
    expect(saya.body).toHaveLength(1);
    const baru = await k.panggil<{ id_laporan: number; nama_pelapor: string; nama_bagian: string }[]>(
      "GET",
      "/v1/admin/laporan?status=baru",
      { token: admin },
    );
    expect(baru.body[0]).toMatchObject({ nama_bagian: "Atrium Kanan" });
    const t = await k.panggil<{ status_tindak_lanjut: string }>("PATCH", `/v1/admin/laporan/${l.body.id_laporan}`, {
      token: admin,
    });
    expect(t.body.status_tindak_lanjut).toBe("ditindaklanjuti");
    const sisa = await k.panggil<unknown[]>("GET", "/v1/admin/laporan?status=baru", { token: admin });
    expect(sisa.body).toHaveLength(0);
  });
  it("validasi: uraian pendek, konten tidak ada, status tidak valid, laporan tidak ada", async () => {
    expect(
      (await k.panggil("POST", "/v1/laporan", { token: siswa, json: { id_konten: 1, deskripsi_laporan: "pendek" } }))
        .status,
    ).toBe(400);
    expect(
      (
        await k.panggil("POST", "/v1/laporan", {
          token: siswa,
          json: { id_konten: 9999, deskripsi_laporan: "Uraian yang cukup panjang." },
        })
      ).status,
    ).toBe(404);
    expect((await k.panggil("GET", "/v1/admin/laporan?status=lain", { token: admin })).status).toBe(400);
    expect((await k.panggil("PATCH", "/v1/admin/laporan/9999", { token: admin })).status).toBe(404);
    expect((await k.panggil("PATCH", "/v1/admin/laporan/x", { token: admin })).status).toBe(400);
  });
});

describe("FR-15 umpan balik SUS", () => {
  const terbaik = [5, 1, 5, 1, 5, 1, 5, 1, 5, 1];
  it("menghitung skor di server dan menyimpan jawaban", async () => {
    const r = await k.panggil<{ skor_sus: number; jawaban: number[] }>("POST", "/v1/umpan-balik", {
      token: siswa,
      json: { jawaban: terbaik, komentar: "Mudah dipakai" },
    });
    expect(r.status).toBe(201);
    expect(r.body.skor_sus).toBe(100);
    expect(r.body.jawaban).toEqual(terbaik);
    const s = await k.panggil<{ komentar: string }>("GET", "/v1/umpan-balik/saya", { token: siswa });
    expect(s.body.komentar).toBe("Mudah dipakai");
  });
  it("kiriman ulang menggantikan yang lama; ringkasan admin menghitung rata-rata dan target 68", async () => {
    await k.panggil("POST", "/v1/umpan-balik", { token: siswa, json: { jawaban: Array(10).fill(3) } });
    await k.panggil("POST", "/v1/umpan-balik", { token: guru, json: { jawaban: terbaik } });
    const r = await k.panggil<{
      jumlah_responden: number;
      rata_rata_skor: number;
      memenuhi_target: boolean;
      rata_rata_per_butir: number[];
    }>("GET", "/v1/admin/umpan-balik/ringkasan", { token: admin });
    expect(r.body.jumlah_responden).toBe(2);
    expect(r.body.rata_rata_skor).toBe(75);
    expect(r.body.memenuhi_target).toBe(true);
    expect(r.body.rata_rata_per_butir).toHaveLength(10);
  });
  it("validasi 10 butir skala 1-5; belum mengisi = 404; ringkasan kosong", async () => {
    expect((await k.panggil("POST", "/v1/umpan-balik", { token: siswa, json: { jawaban: [1, 2, 3] } })).status).toBe(
      400,
    );
    expect(
      (await k.panggil("POST", "/v1/umpan-balik", { token: siswa, json: { jawaban: Array(10).fill(6) } })).status,
    ).toBe(400);
    const e2 = await siapkan();
    const k2 = klien(e2);
    expect((await k2.panggil("GET", "/v1/umpan-balik/saya", { token: await k2.masuk("siswa") })).status).toBe(404);
    const kosong = await k2.panggil<{ jumlah_responden: number; rata_rata_skor: number | null }>(
      "GET",
      "/v1/admin/umpan-balik/ringkasan",
      { token: await k2.masuk("admin") },
    );
    expect(kosong.body).toMatchObject({ jumlah_responden: 0, rata_rata_skor: null });
    await e2.tutup();
  });
});

describe("FR-13 kelola akun", () => {
  it("admin menambah, mengubah, menonaktifkan (token langsung tak berlaku), dan menghapus", async () => {
    const baru = await k.panggil<{ id_user: number; role: string }>("POST", "/v1/admin/akun", {
      token: admin,
      json: {
        nama: "Guru Baru",
        email: "guru.baru@contoh.id",
        password: "guru12345",
        role: "guru",
        asal_sekolah: "SMAN 3 Madiun",
      },
    });
    expect(baru.status).toBe(201);
    expect(JSON.stringify(baru.body)).not.toContain("hash");
    const dobel = await k.panggil("POST", "/v1/admin/akun", {
      token: admin,
      json: { nama: "Dobel", email: "GURU.BARU@contoh.id", password: "guru12345", role: "guru", asal_sekolah: "" },
    });
    expect(dobel.status).toBe(409);

    const tokenBaru = (
      await k.panggil<{ access_token: string }>("POST", "/v1/auth/login", {
        json: { email: "guru.baru@contoh.id", password: "guru12345" },
        ip: "10.7.7.7",
      })
    ).body.access_token;
    expect((await k.panggil("GET", "/v1/auth/me", { token: tokenBaru })).status).toBe(200);

    const ubah = await k.panggil<{ nama: string; asal_sekolah: string }>(
      "PATCH",
      `/v1/admin/akun/${baru.body.id_user}`,
      { token: admin, json: { nama: "Guru Diganti", asal_sekolah: "SMAN 4 Madiun" } },
    );
    expect(ubah.body).toMatchObject({ nama: "Guru Diganti", asal_sekolah: "SMAN 4 Madiun" });
    expect((await k.panggil("GET", "/v1/auth/me", { token: tokenBaru })).status).toBe(200);

    const nonaktif = await k.panggil("PATCH", `/v1/admin/akun/${baru.body.id_user}`, {
      token: admin,
      json: { aktif: false },
    });
    expect(nonaktif.status).toBe(200);
    expect((await k.panggil("GET", "/v1/auth/me", { token: tokenBaru })).status).toBe(401);
    expect(
      (
        await k.panggil("POST", "/v1/auth/login", {
          json: { email: "guru.baru@contoh.id", password: "guru12345" },
          ip: "10.7.7.8",
        })
      ).status,
    ).toBe(403);

    expect((await k.panggil("DELETE", `/v1/admin/akun/${baru.body.id_user}`, { token: admin })).status).toBe(200);
    expect((await k.panggil("DELETE", `/v1/admin/akun/${baru.body.id_user}`, { token: admin })).status).toBe(404);
    const daftar = await k.panggil<{ email: string }[]>("GET", "/v1/admin/akun", { token: admin });
    expect(daftar.body.some((a) => a.email === "guru.baru@contoh.id")).toBe(false);
  });
  it("admin tidak dapat menonaktifkan, menurunkan, atau menghapus dirinya sendiri; validasi lain", async () => {
    const saya = (await k.panggil<{ user: { id_user: number } }>("GET", "/v1/auth/me", { token: admin })).body.user
      .id_user;
    expect((await k.panggil("PATCH", `/v1/admin/akun/${saya}`, { token: admin, json: { aktif: false } })).status).toBe(
      409,
    );
    expect((await k.panggil("PATCH", `/v1/admin/akun/${saya}`, { token: admin, json: { role: "guru" } })).status).toBe(
      409,
    );
    expect((await k.panggil("DELETE", `/v1/admin/akun/${saya}`, { token: admin })).status).toBe(409);
    expect(
      (await k.panggil("PATCH", "/v1/admin/akun/9999", { token: admin, json: { nama: "Tidak Ada" } })).status,
    ).toBe(404);
    expect((await k.panggil("PATCH", `/v1/admin/akun/${saya}`, { token: admin, json: {} })).status).toBe(400);
    expect((await k.panggil("PATCH", "/v1/admin/akun/1", { token: admin, json: { email: AKUN_ADMIN } })).status).toBe(
      409,
    );
    expect((await k.panggil("PATCH", "/v1/admin/akun/x", { token: admin, json: { nama: "Abc Def" } })).status).toBe(
      400,
    );
  });
  it("mengganti kata sandi akun oleh admin mencabut sesi lama dan sandi baru berlaku", async () => {
    const t = await k.masuk("siswa");
    expect(
      (await k.panggil("PATCH", "/v1/admin/akun/1", { token: admin, json: { password: "baruAman123" } })).status,
    ).toBe(200);
    expect((await k.panggil("GET", "/v1/auth/me", { token: t })).status).toBe(401);
    expect(
      (
        await k.panggil("POST", "/v1/auth/login", {
          json: { email: "siswa@arnatomy.id", password: "baruAman123" },
          ip: "10.6.6.6",
        })
      ).status,
    ).toBe(200);
  });
});

const AKUN_ADMIN = "admin@arnatomy.id";

describe("cache jawaban asisten", () => {
  const Q = "Bagaimana jalur peredaran darah kecil?";
  it("pertanyaan identik (huruf besar/tanda baca berbeda) dijawab dari cache tanpa memanggil LLM lagi; jawaban cadangan tidak di-cache", async () => {
    const lingkungan = await siapkan({ ASISTEN_CACHE_MENIT: "15" });
    try {
      const k = klien(lingkungan);
      const token = await k.masuk("siswa");
      lingkungan.llm.jawaban = "Jantung memompa darah ke seluruh tubuh lewat pembuluh arteri dan vena.";
      lingkungan.llm.dipanggil = 0;
      const tanya = (q: string, jenjang?: string) =>
        k.panggil<{ asal: string; dari_cache: boolean; jawaban: string }>("POST", "/v1/asisten/tanya", {
          token,
          json: { pertanyaan: q, jenjang },
        });
      const a = await tanya(Q);
      const b = await tanya(`  ${Q.toUpperCase()}!! `);
      expect([a.body.dari_cache, b.body.dari_cache]).toEqual([false, true]);
      expect(b.body.jawaban).toBe(a.body.jawaban);
      expect(lingkungan.llm.dipanggil).toBe(1);
      /* LLM gagal: jawaban lokal tidak disimpan di cache, jadi pemanggilan berikutnya mencoba LLM lagi */
      lingkungan.llm.jawaban = null;
      const c = await tanya(Q, "SMA");
      const d = await tanya(Q, "SMA");
      expect([c.body.asal, d.body.asal, d.body.dari_cache]).toEqual(["lokal", "lokal", false]);
      expect(lingkungan.llm.dipanggil).toBe(3);
    } finally {
      await lingkungan.tutup();
    }
  });
});
