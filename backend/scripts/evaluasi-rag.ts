/* Evaluasi retrieval RAG pada evaluation set tugas Sistem Cerdas (16 pertanyaan, kunci = kata kunci) dan
   kalibrasi batas penolakan. Pakai: RAG_EMBEDDING=q8|fp32|off npx tsx scripts/evaluasi-rag.ts */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { muatBerkasEnv, muatKonfigurasi } from "../src/config/env";
import { buatEmbedderTransformers } from "../src/rag/embedder";
import { FOLDER_RAG } from "../src/rag/konfigurasi";
import { MesinRag } from "../src/rag/rag";

muatBerkasEnv();
const mode = (process.env.RAG_EMBEDDING ?? "q8") as "q8" | "fp32" | "off";
const cfg = muatKonfigurasi();
const ev = JSON.parse(readFileSync(join(FOLDER_RAG, "evaluasi.json"), "utf-8")) as {
  retrieval: { pertanyaan: string; kata_kunci: string }[];
  dalam_cakupan_tambahan: string[];
  di_luar_cakupan: { pertanyaan: string; asal: string }[];
  acuan_kontrak: Record<string, number>;
};
const embedder = mode === "off" ? null : await buatEmbedderTransformers({ dtype: mode, cacheDir: cfg.RAG_CACHE_DIR });
const m = new MesinRag({ embedder });
const benar = (kunci: string) => new Set(m.chunk.filter((c) => kunci.split(";").every((k) => c.teks.toLowerCase().includes(k))).map((c) => c.id_chunk));

const hasil = await Promise.all(
  ev.retrieval.map(async (e) => {
    const gold = benar(e.kata_kunci);
    const h = await m.cari(e.pertanyaan, m.chunk.length);
    const peringkat = h.chunk.findIndex((c) => gold.has(c.id_chunk)) + 1;
    return { ...e, jumlahBenar: gold.size, peringkat, jarak: h.jarakTerdekat };
  }),
);
/* Embedding saja: inilah yang diukur pada "evaluasi Hari 2" di kontrak (Recall@5 0,812; MRR 0,668) */
const embeddingSaja = m.modeAktif === "hybrid"
  ? await Promise.all(
      ev.retrieval.map(async (e) => {
        const gold = benar(e.kata_kunci);
        const { urut } = (await m.urutanEmbedding(e.pertanyaan)) as { urut: number[] };
        return urut.findIndex((i) => gold.has((m.chunk[i] as { id_chunk: string }).id_chunk)) + 1;
      }),
    )
  : null;
const recall = (k: number) => hasil.filter((h) => h.peringkat > 0 && h.peringkat <= k).length / hasil.length;
const mrr = hasil.reduce((a, h) => a + (h.peringkat > 0 ? 1 / h.peringkat : 0), 0) / hasil.length;
console.log(`\nMode: ${m.modeAktif}${mode !== "off" ? ` (query ${mode}, dokumen fp32 PyTorch)` : ""}`);
console.log("Peringkat chunk benar pertama:");
for (const h of hasil) console.log(`  ${String(h.peringkat).padStart(3)}  [${h.jumlahBenar} chunk benar]  ${h.pertanyaan}`);
const baris = (k: string, v: number) => `${k}: ${v.toFixed(3)} (kontrak ${ev.acuan_kontrak[k]})`;
console.log(`\n${baris("Recall@1", recall(1))}\n${baris("Recall@3", recall(3))}\n${baris("Recall@5", recall(5))}\n${baris("MRR", mrr)}`);

if (embeddingSaja) {
  const r = (k: number) => embeddingSaja.filter((p) => p > 0 && p <= k).length / embeddingSaja.length;
  const mr = embeddingSaja.reduce((a, p) => a + (p > 0 ? 1 / p : 0), 0) / embeddingSaja.length;
  console.log(`\nEmbedding SAJA (pembanding langsung dengan angka kontrak): Recall@1 ${r(1).toFixed(3)} (0.562), Recall@3 ${r(3).toFixed(3)} (0.688), Recall@5 ${r(5).toFixed(3)} (0.812), MRR ${mr.toFixed(3)} (0.668)`);
  console.log(`  peringkat per pertanyaan: ${embeddingSaja.join(" ")}`);
}
if (m.modeAktif === "hybrid") {
  const dalam = [...ev.retrieval.map((e) => e.pertanyaan), ...ev.dalam_cakupan_tambahan];
  const jarak = async (qs: string[]) => Promise.all(qs.map(async (q) => ((await m.cari(q)).jarakTerdekat as number)));
  const dj = await jarak(dalam);
  const lj = await jarak(ev.di_luar_cakupan.map((x) => x.pertanyaan));
  console.log(`\nJarak embedding terdekat, DALAM cakupan (${dj.length}): min ${Math.min(...dj).toFixed(3)} maks ${Math.max(...dj).toFixed(3)}`);
  console.log(`Jarak embedding terdekat, DI LUAR cakupan (${lj.length}): min ${Math.min(...lj).toFixed(3)} maks ${Math.max(...lj).toFixed(3)}`);
  for (const b of [0.4, 0.43, 0.46, 0.5, 0.55, 0.6]) {
    console.log(`  batas ${b}: dalam ditolak ${dj.filter((x) => x > b).length}/${dj.length}, luar lolos ${lj.filter((x) => x <= b).length}/${lj.length}`);
  }
} else {
  const skor = async (qs: string[]) => Promise.all(qs.map(async (q) => (await m.cari(q)).skorTfidf));
  const dalam = [...ev.retrieval.map((e) => e.pertanyaan), ...ev.dalam_cakupan_tambahan];
  const dj = await skor(dalam);
  const lj = await skor(ev.di_luar_cakupan.map((x) => x.pertanyaan));
  console.log(`\nSkor TF-IDF tertinggi, DALAM cakupan: min ${Math.min(...dj).toFixed(3)} maks ${Math.max(...dj).toFixed(3)}`);
  console.log(`Skor TF-IDF tertinggi, DI LUAR cakupan: min ${Math.min(...lj).toFixed(3)} maks ${Math.max(...lj).toFixed(3)}`);
  for (const b of [0.03, 0.05, 0.06, 0.08, 0.1, 0.15]) {
    console.log(`  ambang ${b}: dalam ditolak ${dj.filter((x) => x < b).length}/${dj.length}, luar lolos ${lj.filter((x) => x >= b).length}/${lj.length}`);
  }
}
