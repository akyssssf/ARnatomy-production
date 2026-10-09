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
  siswa = await k.masuk("siswa");
  guru = await k.masuk("guru");
  admin = await k.masuk("admin");
});
afterAll(() => env.tutup());

interface RingkasTugas {
  id_tugas: number;
  jenis: string;
  jumlah_item: number;
  percobaan: number;
  skor_terbaik: number | null;
  selesai: boolean;
}
interface Soal {
  id_soal: number;
  pilihan: string[];
  jawaban_benar?: number;
}

describe("tugas belajar: kuis dan simulasi", () => {
  it("daftar memuat 2 kuis, 2 simulasi, dan 2 rakit organ, belum ada percobaan", async () => {
    const r = await k.panggil<RingkasTugas[]>("GET", "/v1/tugas", { token: siswa });
    expect(r.status).toBe(200);
    expect(r.body.map((t) => t.jenis).sort()).toEqual(["kuis", "kuis", "rakit", "rakit", "simulasi", "simulasi"]);
    expect(r.body.every((t) => t.jumlah_item >= 7 && t.percobaan === 0 && t.skor_terbaik === null && !t.selesai)).toBe(
      true,
    );
    expect((await k.panggil("GET", "/v1/tugas")).status).toBe(401);
  });

  it("soal kuis dikirim tanpa kunci jawaban", async () => {
    const lst = await k.panggil<RingkasTugas[]>("GET", "/v1/tugas", { token: siswa });
    const kuis = lst.body.find((t) => t.jenis === "kuis");
    const r = await k.panggil<{ soal: Soal[] }>("GET", `/v1/tugas/${kuis?.id_tugas}`, { token: siswa });
    expect(r.status).toBe(200);
    expect(r.body.soal.length).toBeGreaterThanOrEqual(8);
    expect(JSON.stringify(r.body)).not.toContain("jawaban_benar");
    expect(JSON.stringify(r.body)).not.toContain("penjelasan");
    expect((await k.panggil("GET", "/v1/tugas/9999", { token: siswa })).status).toBe(404);
    expect((await k.panggil("GET", "/v1/tugas/abc", { token: siswa })).status).toBe(400);
  });

  it("percobaan kuis dinilai server: semua salah lalu semua benar, skor terbaik dan progres naik", async () => {
    const lst = await k.panggil<RingkasTugas[]>("GET", "/v1/tugas", { token: guru });
    const kuis = lst.body.find((t) => t.jenis === "kuis") as RingkasTugas;
    const kunci = await k.panggil<{ soal: { id_soal: number; jawaban_benar: number }[] }[]>("GET", "/v1/admin/tugas", {
      token: admin,
    });
    const jawabBenar = (
      kunci.body.find((t) => (t as unknown as { id_tugas: number }).id_tugas === kuis.id_tugas) as {
        soal: { jawaban_benar: number }[];
      }
    ).soal.map((s) => s.jawaban_benar);

    const kosong = await k.panggil<{ skor: number; selesai: boolean }>("POST", `/v1/tugas/${kuis.id_tugas}/percobaan`, {
      token: guru,
      json: { jawaban: jawabBenar.map(() => -1) },
    });
    expect(kosong.status).toBe(201);
    expect(kosong.body.skor).toBe(0);
    expect(kosong.body.selesai).toBe(false);

    const sempurna = await k.panggil<{ skor: number; selesai: boolean; rincian: { penjelasan: string }[] }>(
      "POST",
      `/v1/tugas/${kuis.id_tugas}/percobaan`,
      { token: guru, json: { jawaban: jawabBenar } },
    );
    expect(sempurna.body.skor).toBe(100);
    expect(sempurna.body.selesai).toBe(true);
    expect(sempurna.body.rincian[0]?.penjelasan.length).toBeGreaterThan(10);

    const lagi = await k.panggil<RingkasTugas[]>("GET", "/v1/tugas", { token: guru });
    const baris = lagi.body.find((t) => t.id_tugas === kuis.id_tugas);
    expect(baris).toMatchObject({ percobaan: 2, skor_terbaik: 100, selesai: true });
    const progres = await k.panggil<{ tugas_selesai: number; tugas_total: number; percobaan_terbaru: unknown[] }>(
      "GET",
      "/v1/tugas/progres",
      { token: guru },
    );
    expect(progres.body).toMatchObject({ tugas_total: 6, tugas_selesai: 1 });
    expect(progres.body.percobaan_terbaru).toHaveLength(2);
    /* pengguna lain tidak melihat percobaan guru */
    const milikSiswa = await k.panggil<{ tugas_selesai: number }>("GET", "/v1/tugas/progres", { token: siswa });
    expect(milikSiswa.body.tugas_selesai).toBe(0);
  });

  it("jumlah jawaban atau pilihan yang tidak masuk akal ditolak", async () => {
    const lst = await k.panggil<RingkasTugas[]>("GET", "/v1/tugas", { token: siswa });
    const kuis = lst.body.find((t) => t.jenis === "kuis") as RingkasTugas;
    expect(
      (await k.panggil("POST", `/v1/tugas/${kuis.id_tugas}/percobaan`, { token: siswa, json: { jawaban: [0] } }))
        .status,
    ).toBe(400);
    expect(
      (
        await k.panggil("POST", `/v1/tugas/${kuis.id_tugas}/percobaan`, {
          token: siswa,
          json: { jawaban: Array(kuis.jumlah_item).fill(99) },
        })
      ).status,
    ).toBe(400);
    expect((await k.panggil("POST", `/v1/tugas/${kuis.id_tugas}/percobaan`, { token: siswa, json: {} })).status).toBe(
      400,
    );
  });

  it("simulasi: langkah berurutan; urutan benar skor 100, urutan terbalik rendah, urutan tak lengkap ditolak", async () => {
    const lst = await k.panggil<RingkasTugas[]>("GET", "/v1/tugas", { token: siswa });
    const sim = lst.body.find((t) => t.jenis === "simulasi") as RingkasTugas;
    const isi = await k.panggil<{ langkah: { id_langkah: number; urutan: number; kode: string }[] }>(
      "GET",
      `/v1/tugas/${sim.id_tugas}`,
      { token: siswa },
    );
    const ids = isi.body.langkah.map((l) => l.id_langkah);
    expect(isi.body.langkah.map((l) => l.urutan)).toEqual(ids.map((_, i) => i + 1));
    const benar = await k.panggil<{ skor: number; selesai: boolean }>("POST", `/v1/tugas/${sim.id_tugas}/percobaan`, {
      token: siswa,
      json: { jawaban: ids },
    });
    expect(benar.body).toMatchObject({ skor: 100, selesai: true });
    const terbalik = await k.panggil<{ skor: number; selesai: boolean }>(
      "POST",
      `/v1/tugas/${sim.id_tugas}/percobaan`,
      {
        token: siswa,
        json: { jawaban: [...ids].reverse() },
      },
    );
    expect(terbalik.body.skor).toBeLessThan(40);
    expect(terbalik.body.selesai).toBe(false);
    expect(
      (
        await k.panggil("POST", `/v1/tugas/${sim.id_tugas}/percobaan`, {
          token: siswa,
          json: { jawaban: ids.slice(1) },
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await k.panggil("POST", `/v1/tugas/${sim.id_tugas}/percobaan`, {
          token: siswa,
          json: { jawaban: ids.map(() => ids[0]) },
        })
      ).status,
    ).toBe(400);
  });

  it("admin mengelola soal; siswa dilarang", async () => {
    const lst = await k.panggil<RingkasTugas[]>("GET", "/v1/tugas", { token: admin });
    const kuis = lst.body.find((t) => t.jenis === "kuis") as RingkasTugas;
    const sim = lst.body.find((t) => t.jenis === "simulasi") as RingkasTugas;
    const soalBaru = {
      pertanyaan: "Apa nama pembuluh terbesar tubuh?",
      pilihan: ["Aorta", "Vena kava", "Kapiler"],
      jawaban_benar: 0,
      penjelasan: "Aorta adalah arteri terbesar yang keluar dari ventrikel kiri.",
    };
    expect(
      (await k.panggil("POST", `/v1/admin/tugas/${kuis.id_tugas}/soal`, { token: siswa, json: soalBaru })).status,
    ).toBe(403);
    expect(
      (await k.panggil("POST", `/v1/admin/tugas/${sim.id_tugas}/soal`, { token: admin, json: soalBaru })).status,
    ).toBe(409);
    expect(
      (
        await k.panggil("POST", `/v1/admin/tugas/${kuis.id_tugas}/soal`, {
          token: admin,
          json: { ...soalBaru, jawaban_benar: 5 },
        })
      ).status,
    ).toBe(400);
    const dibuat = await k.panggil<{ id_soal: number; urutan: number }>(
      "POST",
      `/v1/admin/tugas/${kuis.id_tugas}/soal`,
      {
        token: admin,
        json: soalBaru,
      },
    );
    expect(dibuat.status).toBe(201);
    const baru = await k.panggil<{ jumlah_item: number }[]>("GET", "/v1/tugas", { token: siswa });
    expect(baru.body.find((t) => (t as unknown as { id_tugas: number }).id_tugas === kuis.id_tugas)?.jumlah_item).toBe(
      kuis.jumlah_item + 1,
    );
    const ubah = await k.panggil<{ jawaban_benar: number }>("PATCH", `/v1/admin/soal/${dibuat.body.id_soal}`, {
      token: admin,
      json: { jawaban_benar: 1 },
    });
    expect(ubah.body.jawaban_benar).toBe(1);
    expect(
      (await k.panggil("PATCH", `/v1/admin/soal/${dibuat.body.id_soal}`, { token: admin, json: { jawaban_benar: 9 } }))
        .status,
    ).toBe(400);
    expect((await k.panggil("DELETE", `/v1/admin/soal/${dibuat.body.id_soal}`, { token: admin })).status).toBe(200);
    expect((await k.panggil("DELETE", `/v1/admin/soal/${dibuat.body.id_soal}`, { token: admin })).status).toBe(404);
  });
});

describe("rakit organ", () => {
  it("penilaian: semua terpasang tanpa salah = 100; salah letak mengurangi; sebagian = proporsional; nilai liar ditolak", async () => {
    const lst = await k.panggil<RingkasTugas[]>("GET", "/v1/tugas", { token: siswa });
    const rakit = lst.body.find((t) => t.jenis === "rakit") as RingkasTugas;
    const isi = await k.panggil<{ langkah: { kode: string }[] }>("GET", `/v1/tugas/${rakit.id_tugas}`, {
      token: siswa,
    });
    const n = isi.body.langkah.length;
    expect(n).toBeGreaterThanOrEqual(7);
    const kirim = (jawaban: number[]) =>
      k.panggil<{ skor: number; selesai: boolean; benar: number }>("POST", `/v1/tugas/${rakit.id_tugas}/percobaan`, {
        token: siswa,
        json: { jawaban },
      });
    expect((await kirim(Array(n).fill(1))).body).toMatchObject({ skor: 100, selesai: true, benar: n });
    expect((await kirim(Array(n).fill(3))).body.skor).toBe(100 - Math.min(30, n * 2 * 2));
    const setengah = await kirim(Array.from({ length: n }, (_, i) => (i < Math.floor(n / 2) ? 1 : 0)));
    expect(setengah.body.skor).toBe(Math.round((Math.floor(n / 2) / n) * 100));
    expect(setengah.body.selesai).toBe(false);
    expect((await kirim(Array(n).fill(0))).body.skor).toBe(0);
    expect((await kirim(Array(n - 1).fill(1))).status).toBe(400);
    expect((await kirim(Array(n).fill(99))).status).toBe(400);
  });
});

describe("pencarian sekolah dan profil", () => {
  it("mencari sekolah dari data Kemdikbud, menolak kata kunci pendek, dan memakai NPSN di profil Google", async () => {
    const pendek = await k.panggil("GET", "/v1/sekolah?q=ab", { token: siswa });
    expect(pendek.status).toBe(400);
    expect((await k.panggil("GET", "/v1/sekolah?q=madiun")).status).toBe(401);
    const hasil = await k.panggil<{ npsn: string; nama: string; kabupaten_kota: string }[]>(
      "GET",
      "/v1/sekolah?q=smp negeri 1 madiun&bentuk=SMP",
      { token: siswa },
    );
    expect(hasil.status).toBe(200);
    expect(hasil.body.length).toBeGreaterThan(0);
    expect(hasil.body.every((s) => /madiun/i.test(`${s.nama} ${s.kabupaten_kota}`))).toBe(true);
    expect((await k.panggil("GET", "/v1/sekolah?q=madiun&bentuk=SD", { token: siswa })).status).toBe(400);
    /* % dan _ diperlakukan sebagai huruf biasa */
    const liar = await k.panggil<unknown[]>("GET", "/v1/sekolah?q=%25%25%25", { token: siswa });
    expect(liar.body).toHaveLength(0);

    /* profil: NPSN dari daftar menggantikan teks bebas; NPSN palsu ditolak; teks bebas tetap boleh */
    const pilihan = hasil.body[0] as { npsn: string; nama: string };
    const ok = await k.panggil<{ user: { asal_sekolah: string; npsn_sekolah: string } }>("PATCH", "/v1/auth/profil", {
      token: guru,
      json: { role: "guru", npsn: pilihan.npsn },
    });
    expect(ok.status).toBe(200);
    expect(ok.body.user.npsn_sekolah).toBe(pilihan.npsn);
    expect(ok.body.user.asal_sekolah).toContain(pilihan.nama);
    expect(
      (await k.panggil("PATCH", "/v1/auth/profil", { token: guru, json: { role: "guru", npsn: "99999999" } })).status,
    ).toBe(404);
    const bebas = await k.panggil<{ user: { asal_sekolah: string; npsn_sekolah: string | null } }>(
      "PATCH",
      "/v1/auth/profil",
      {
        token: guru,
        json: { role: "guru", asal_sekolah: "Sekolah Alam Contoh" },
      },
    );
    expect(bebas.body.user).toMatchObject({ asal_sekolah: "Sekolah Alam Contoh", npsn_sekolah: null });
    expect((await k.panggil("PATCH", "/v1/auth/profil", { token: guru, json: { role: "guru" } })).status).toBe(400);
  });
});
