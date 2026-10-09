import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { bacaCsv } from "../src/rag/csv";
import { FOLDER_RAG } from "../src/rag/konfigurasi";
import { MesinRag } from "../src/rag/rag";
import { tokenisasi } from "../src/rag/tfidf";
import { embedderUji } from "./helpers";

const ev = JSON.parse(readFileSync(join(FOLDER_RAG, "evaluasi.json"), "utf-8")) as {
  retrieval: { pertanyaan: string; kata_kunci: string }[];
};
const emas = JSON.parse(readFileSync(join(import.meta.dirname, "fixtures", "tfidf-scikit-learn.json"), "utf-8")) as {
  vocab: number;
  hasil: { q: string; top10: number[]; top10_skor: number[]; jumlah_positif: number }[];
};

describe("pembaca CSV", () => {
  it("kolom bertanda kutip: koma, baris baru, dan kutip ganda", () => {
    const r = bacaCsv('a,b,c\r\n1,"x, y",z\n2,"baris\nbaru","kata ""kutip"""\n');
    expect(r).toEqual([
      { a: "1", b: "x, y", c: "z" },
      { a: "2", b: "baris\nbaru", c: 'kata "kutip"' },
    ]);
    expect(bacaCsv("")).toEqual([]);
  });
});

describe("TF-IDF sama dengan scikit-learn TfidfVectorizer", () => {
  const m = new MesinRag();
  const tfidf = (m as unknown as { tfidf: { skor(q: string): Float64Array } }).tfidf;
  it("korpus 412 chunk dan tokenisasi \\w\\w+ dengan stopword", () => {
    expect(m.chunk).toHaveLength(412);
    expect(tokenisasi("Apa fungsi serambi pada jantung? A 17 ribu", new Set(["apa", "pada"]))).toEqual([
      "fungsi",
      "serambi",
      "jantung",
      "17",
      "ribu",
    ]);
  });
  it("20 pertanyaan: 10 hasil teratas dan jumlah hasil positif identik, skor selisih < 1e-12", () => {
    for (const h of emas.hasil) {
      const s = tfidf.skor(h.q);
      const urut = [...s.keys()]
        .filter((i) => (s[i] as number) > 0)
        .sort((a, b) => (s[b] as number) - (s[a] as number) || a - b);
      expect(urut.slice(0, 10), h.q).toEqual(h.top10);
      expect(urut.length, h.q).toBe(h.jumlah_positif);
      h.top10.forEach((idx, i) => {
        expect(Math.abs((s[idx] as number) - (h.top10_skor[i] as number))).toBeLessThan(1e-12);
      });
    }
  });
});

describe("MesinRag", () => {
  const tanpaEmbedding = new MesinRag();
  const hybrid = new MesinRag({ embedder: embedderUji() });

  it("mode: tfidf tanpa embedder, hybrid dengan embedder; embedding.f32 sesuai CSV", () => {
    expect(tanpaEmbedding.modeAktif).toBe("tfidf");
    expect(hybrid.modeAktif).toBe("hybrid");
    hybrid.pasangEmbedder(null);
    expect(hybrid.modeAktif).toBe("tfidf");
    hybrid.pasangEmbedder(embedderUji());
    expect(hybrid.modeAktif).toBe("hybrid");
  });

  it("metrik retrieval pada 16 pertanyaan evaluasi: embedding saja setara kontrak, hybrid lebih baik", async () => {
    const benar = (kunci: string) =>
      new Set(
        hybrid.chunk
          .filter((c) => kunci.split(";").every((k) => c.teks.toLowerCase().includes(k)))
          .map((c) => c.id_chunk),
      );
    const peringkatEmb: number[] = [];
    const peringkatHyb: number[] = [];
    for (const e of ev.retrieval) {
      const gold = benar(e.kata_kunci);
      const { urut } = (await hybrid.urutanEmbedding(e.pertanyaan)) as { urut: number[] };
      peringkatEmb.push(urut.findIndex((i) => gold.has((hybrid.chunk[i] as { id_chunk: string }).id_chunk)) + 1);
      const h = await hybrid.cari(e.pertanyaan, hybrid.chunk.length);
      peringkatHyb.push(h.chunk.findIndex((c) => gold.has(c.id_chunk)) + 1);
    }
    const r = (p: number[], k: number) => p.filter((x) => x > 0 && x <= k).length / p.length;
    const mrr = (p: number[]) => p.reduce((a, x) => a + (x > 0 ? 1 / x : 0), 0) / p.length;
    /* angka kontrak (evaluasi Hari 2, embedding saja): Recall@1 0,562; @3 0,688; @5 0,812; MRR 0,668 */
    expect(r(peringkatEmb, 1)).toBeCloseTo(0.5625, 3);
    expect(r(peringkatEmb, 3)).toBeCloseTo(0.6875, 3);
    expect(r(peringkatEmb, 5)).toBeCloseTo(0.8125, 3);
    expect(mrr(peringkatEmb)).toBeCloseTo(0.668, 2);
    expect(r(peringkatHyb, 5)).toBeGreaterThanOrEqual(r(peringkatEmb, 5));
    expect(mrr(peringkatHyb)).toBeGreaterThan(mrr(peringkatEmb));
  });

  it("hybrid: 5 chunk, jarak terdekat dilaporkan, soal jalur peredaran darah kecil menemukan buku yang benar", async () => {
    const h = await hybrid.cari("Bagaimana jalur peredaran darah kecil?");
    expect(h.mode).toBe("hybrid");
    expect(h.chunk).toHaveLength(5);
    expect(h.jarakTerdekat).toBeLessThan(0.3);
    expect(h.chunk.some((c) => c.teks.toLowerCase().includes("peredaran darah kecil"))).toBe(true);
  });

  it("tfidf saja: pertanyaan tanpa satu pun kata yang dikenal ditolak; yang relevan lolos (penolakan topik lain diserahkan ke LLM)", async () => {
    const lolos = await tanpaEmbedding.jawab("Apa itu aterosklerosis?", "SMP", async () => "Jawaban uji.");
    expect(lolos).toMatchObject({ ditolak: false, mode: "tfidf", jawaban: "Jawaban uji." });
    const tolak = await tanpaEmbedding.jawab("xyz qwerty", "SMP", async () => "TIDAK BOLEH DIPANGGIL");
    expect(tolak.ditolak).toBe(true);
    expect(tolak.sumber).toEqual([]);
  });

  it("batas jarak: nilai yang lebih ketat menolak pertanyaan dalam cakupan tanpa memanggil LLM", async () => {
    const ketat = new MesinRag({ embedder: embedderUji(), batasJarak: 0.01 });
    let dipanggil = 0;
    const hasil = await ketat.jawab("Bagaimana jalur peredaran darah kecil?", "SMP", async () => {
      dipanggil++;
      return "x";
    });
    expect(hasil.ditolak).toBe(true);
    expect(dipanggil).toBe(0);
  });

  it("prompt mengikuti kontrak: konteks bernomor tanpa nama buku, pesan tidak-ada, gaya jenjang", async () => {
    const h = await hybrid.cari("Apa itu PPOK?");
    const { sistem, pengguna } = hybrid.susunPrompt("Apa itu PPOK?", h.chunk, "SMA");
    expect(sistem).toContain("siswa SMA (usia 16-18 tahun)");
    expect(sistem).toContain("Maaf, materi itu belum ada di ARnatomy.");
    expect(sistem).not.toContain("{");
    expect(pengguna).toMatch(/^Konteks dari buku:\n\[1\] /);
    expect(pengguna).toContain("[5] ");
    expect(pengguna).toContain("Pertanyaan siswa: Apa itu PPOK?");
    expect(pengguna).not.toContain("{");
    expect(pengguna).not.toContain("Buku Ajar");
    expect(hybrid.normalisasiJenjang("SD")).toBe("SMP");
  });

  it("daftar sumber: satu entri per buku + halaman, cuplikan 200 karakter diakhiri '...'", () => {
    const c = hybrid.chunk.slice(0, 3).map((x) => ({ ...x, singkat: "Buku A", halaman: 5 }));
    const s = hybrid.daftarSumber([...c, { ...c[0], halaman: 6, teks: "pendek" } as (typeof c)[0]]);
    expect(s).toHaveLength(2);
    expect(s[0]?.cuplikan.length).toBe(203);
    expect(s[0]?.cuplikan.endsWith("...")).toBe(true);
    expect(s[1]?.cuplikan).toBe("pendek");
  });

  it("klasifikasi: kategori pertama dalam urutan konfigurasi yang muncul di jawaban LLM", async () => {
    expect(await hybrid.klasifikasiSistem("x", async () => "Di luar cakupan")).toBe("Di luar cakupan");
    expect(await hybrid.klasifikasiSistem("x", async () => "Pernapasan, bukan Peredaran Darah")).toBe(
      "Peredaran Darah",
    );
    expect(await hybrid.klasifikasiSistem("x", async () => "entah")).toBe("Lainnya");
    expect(await hybrid.klasifikasiSistem("x", async () => null)).toBeNull();
  });
});
