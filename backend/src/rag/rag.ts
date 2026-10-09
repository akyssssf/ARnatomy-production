/* ==========================================================================
   rag.ts — RAG tanya jawab anatomi berbasis buku PDF (kontrak komponen AI dari
   tugas Sistem Cerdas, data/rag/KONTRAK.md), ditulis ulang untuk backend Node:

   1. Retrieve (hybrid): peringkat embedding (cosine) + peringkat TF-IDF, digabung
      dengan Reciprocal Rank Fusion (1 / (60 + peringkat)); ambil 5 chunk teratas.
   2. Bila jarak embedding chunk terdekat > batas (0,46): tolak tanpa memanggil LLM.
   3. Augment: konteks "[no] teks" + pertanyaan ke template prompt.
   4. Generate: LLM menjawab sesuai jenjang (SMP/SMA).
   5. Sumber: satu entri per buku + halaman; kosong bila ditolak.

   Bila embedding tidak tersedia (RAG_EMBEDDING=off, RAM kecil, atau model belum
   termuat), mesin memakai TF-IDF saja dengan ambang skor sendiri.
   ========================================================================== */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { KlienLlm } from "../konteks";
import { bacaCsv } from "./csv";
import type { Embedder } from "./embedder";
import {
  FOLDER_RAG,
  type KonfigurasiKlasifikasi,
  type KonfigurasiRag,
  muatKonfigurasiKlasifikasi,
  muatKonfigurasiRag,
} from "./konfigurasi";
import { TfIdf } from "./tfidf";

export interface Chunk {
  id_chunk: string;
  sumber: string;
  singkat: string;
  halaman: number;
  sistem_organ: string;
  teks: string;
}
export interface SumberJawaban {
  buku: string;
  halaman: number;
  cuplikan: string;
}
export interface HasilCari {
  chunk: Chunk[];
  /** Jarak embedding (1 - cosine) chunk terdekat; null bila mode tfidf */
  jarakTerdekat: number | null;
  /** Skor TF-IDF tertinggi */
  skorTfidf: number;
  mode: "hybrid" | "tfidf";
}
export interface HasilRag {
  /** null bila LLM tidak tersedia/gagal (pemanggil memakai jawaban cadangan) */
  jawaban: string | null;
  sumber: SumberJawaban[];
  jenjang: string;
  ditolak: boolean;
  mode: "hybrid" | "tfidf";
}

const RRF_PEMBEDA = 0;
/** Ambang skor TF-IDF (cosine) untuk menolak pertanyaan di luar materi saat embedding tidak tersedia. */
export const AMBANG_TFIDF_BAWAAN = 0.1;

function isi(templat: string, nilai: Record<string, string>): string {
  let hasil = templat;
  for (const [k, v] of Object.entries(nilai)) hasil = hasil.split(`{${k}}`).join(v);
  return hasil;
}

export interface OpsiMesinRag {
  folder?: string;
  embedder?: Embedder | null;
  batasJarak?: number;
  ambangTfidf?: number;
  reasoningEffort?: string;
}

export class MesinRag {
  readonly cfg: KonfigurasiRag;
  readonly klasifikasi: KonfigurasiKlasifikasi;
  readonly chunk: Chunk[];
  private readonly vektor: Float32Array | null;
  private readonly dimensi: number;
  private readonly tfidf: TfIdf;
  private embedder: Embedder | null;
  private readonly batasJarak: number;
  private readonly ambangTfidf: number;

  constructor(opsi: OpsiMesinRag = {}) {
    const folder = opsi.folder ?? FOLDER_RAG;
    this.cfg = muatKonfigurasiRag(folder);
    this.klasifikasi = muatKonfigurasiKlasifikasi(folder);
    this.chunk = bacaCsv(readFileSync(join(folder, "knowledge_base.csv"), "utf-8")).map((b) => ({
      id_chunk: b.id_chunk as string,
      sumber: b.sumber as string,
      singkat: b.singkat as string,
      halaman: Number(b.halaman),
      sistem_organ: b.sistem_organ as string,
      teks: b.teks as string,
    }));
    this.tfidf = new TfIdf(
      this.chunk.map((c) => c.teks),
      this.cfg.retrieve.stopword,
    );
    this.embedder = opsi.embedder ?? null;
    this.batasJarak = opsi.batasJarak ?? this.cfg.batas_jarak;
    this.ambangTfidf = opsi.ambangTfidf ?? AMBANG_TFIDF_BAWAAN;
    try {
      const meta = JSON.parse(readFileSync(join(folder, "embeddings.json"), "utf-8")) as {
        dimensi: number;
        jumlah: number;
      };
      const mentah = readFileSync(join(folder, "embeddings.f32"));
      this.dimensi = meta.dimensi;
      if (meta.jumlah !== this.chunk.length || mentah.byteLength !== meta.jumlah * meta.dimensi * 4) {
        throw new Error(
          "embeddings.f32 tidak sesuai dengan knowledge_base.csv; jalankan ulang scripts/ekspor-embedding.py",
        );
      }
      this.vektor = new Float32Array(mentah.buffer.slice(mentah.byteOffset, mentah.byteOffset + mentah.byteLength));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      this.vektor = null;
      this.dimensi = 0;
    }
  }

  /** Dipasang setelah model embedding selesai dimuat di latar belakang. */
  pasangEmbedder(e: Embedder | null): void {
    this.embedder = e;
  }

  get modeAktif(): "hybrid" | "tfidf" {
    return this.embedder && this.vektor ? "hybrid" : "tfidf";
  }

  /** Peringkat semua chunk menurut jarak embedding (1 - cosine), terdekat dulu; null bila embedding tidak tersedia. */
  async urutanEmbedding(pertanyaan: string): Promise<{ urut: number[]; jarak: Float64Array } | null> {
    if (!(this.embedder && this.vektor)) return null;
    const q = await this.embedder.embed(pertanyaan);
    const n = this.chunk.length;
    const jarak = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let dot = 0;
      const dasar = i * this.dimensi;
      for (let d = 0; d < this.dimensi; d++) dot += (q[d] as number) * (this.vektor[dasar + d] as number);
      jarak[i] = 1 - dot;
    }
    return { urut: [...jarak.keys()].sort((a, b) => (jarak[a] as number) - (jarak[b] as number) || a - b), jarak };
  }

  async cari(pertanyaan: string, k = this.cfg.k): Promise<HasilCari> {
    const sTfidf = this.tfidf.skor(pertanyaan);
    const urutTfidf = [...sTfidf.keys()]
      .filter((i) => (sTfidf[i] as number) > 0)
      .sort((a, b) => (sTfidf[b] as number) - (sTfidf[a] as number) || a - b);
    const skorTertinggi = urutTfidf.length ? (sTfidf[urutTfidf[0] as number] as number) : 0;

    if (!(this.embedder && this.vektor)) {
      return {
        chunk: urutTfidf.slice(0, k).map((i) => this.chunk[i] as Chunk),
        jarakTerdekat: null,
        skorTfidf: skorTertinggi,
        mode: "tfidf",
      };
    }
    const { urut: urutEmbedding, jarak } = (await this.urutanEmbedding(pertanyaan)) as {
      urut: number[];
      jarak: Float64Array;
    };
    const n = this.chunk.length;
    const rrf = this.cfg.retrieve.rrf_k;
    const skor = new Float64Array(n);
    urutEmbedding.forEach((idx, r) => {
      skor[idx] = (skor[idx] as number) + 1 / (rrf + r + 1 + RRF_PEMBEDA);
    });
    urutTfidf.forEach((idx, r) => {
      skor[idx] = (skor[idx] as number) + 1 / (rrf + r + 1);
    });
    const peringkatEmb = new Map(urutEmbedding.map((idx, r) => [idx, r]));
    const urutAkhir = [...skor.keys()].sort(
      (a, b) =>
        (skor[b] as number) - (skor[a] as number) || (peringkatEmb.get(a) as number) - (peringkatEmb.get(b) as number),
    );
    return {
      chunk: urutAkhir.slice(0, k).map((i) => this.chunk[i] as Chunk),
      jarakTerdekat: jarak[urutEmbedding[0] as number] as number,
      skorTfidf: skorTertinggi,
      mode: "hybrid",
    };
  }

  private ditolakRetrieval(h: HasilCari): boolean {
    if (h.chunk.length === 0) return true;
    return h.jarakTerdekat !== null ? h.jarakTerdekat > this.batasJarak : h.skorTfidf < this.ambangTfidf;
  }

  daftarSumber(chunk: Chunk[]): SumberJawaban[] {
    const hasil: SumberJawaban[] = [];
    const sudah = new Set<string>();
    for (const c of chunk) {
      const kunci = `${c.singkat}|${c.halaman}`;
      if (sudah.has(kunci)) continue;
      sudah.add(kunci);
      hasil.push({
        buku: c.singkat,
        halaman: c.halaman,
        cuplikan:
          c.teks.length > this.cfg.panjang_cuplikan ? `${c.teks.slice(0, this.cfg.panjang_cuplikan)}...` : c.teks,
      });
    }
    return hasil;
  }

  /** Susun prompt sistem dan pesan pengguna sesuai kontrak (tanpa memanggil LLM). */
  susunPrompt(pertanyaan: string, chunk: Chunk[], jenjang: string): { sistem: string; pengguna: string } {
    const tidakAda = this.cfg.pesan_tidak_ada;
    const gaya = this.cfg.jenjang[jenjang] ?? (this.cfg.jenjang[this.cfg.jenjang_default] as string);
    const konteks = chunk.map((c, i) => isi(this.cfg.format_konteks, { no: String(i + 1), teks: c.teks })).join("\n");
    return {
      sistem: isi(this.cfg.system_prompt, { jenjang: gaya, tidak_ada: tidakAda }),
      pengguna: isi(this.cfg.template_prompt, { konteks, tidak_ada: tidakAda, pertanyaan }),
    };
  }

  normalisasiJenjang(jenjang?: string): string {
    return jenjang && jenjang in this.cfg.jenjang ? jenjang : this.cfg.jenjang_default;
  }

  async jawab(
    pertanyaan: string,
    jenjangMasuk: string | undefined,
    llm: KlienLlm,
    reasoningEffort?: string,
  ): Promise<HasilRag> {
    const jenjang = this.normalisasiJenjang(jenjangMasuk);
    const hasil = await this.cari(pertanyaan);
    if (this.ditolakRetrieval(hasil)) {
      return { jawaban: this.cfg.pesan_tidak_ada, sumber: [], jenjang, ditolak: true, mode: hasil.mode };
    }
    const { sistem, pengguna } = this.susunPrompt(pertanyaan, hasil.chunk, jenjang);
    const dariLlm = await llm(sistem, pengguna, { temperature: 0, maxTokens: 2000, reasoningEffort });
    if (dariLlm === null) {
      return { jawaban: null, sumber: this.daftarSumber(hasil.chunk), jenjang, ditolak: false, mode: hasil.mode };
    }
    const ditolak = dariLlm.toLowerCase().includes("belum ada di arnatomy");
    return {
      jawaban: dariLlm,
      sumber: ditolak ? [] : this.daftarSumber(hasil.chunk),
      jenjang,
      ditolak,
      mode: hasil.mode,
    };
  }

  /** Klasifikasi sistem organ dari pertanyaan (zero-shot, sesuai kontrak bagian 2). */
  async klasifikasiSistem(pertanyaan: string, llm: KlienLlm, reasoningEffort?: string): Promise<string | null> {
    const k = this.klasifikasi;
    const prompt = isi(k.template_prompt, { instruksi: k.instruksi, contoh: k.contoh, pertanyaan });
    const jawaban = await llm("", prompt, { temperature: 0, maxTokens: 2000, reasoningEffort });
    if (jawaban === null) return null;
    return k.kategori.find((kat) => jawaban.toLowerCase().includes(kat.toLowerCase())) ?? k.jika_tidak_cocok;
  }
}
