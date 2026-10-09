/* ==========================================================================
   bandingkan-llm.ts — Membandingkan penyedia LLM pada pipeline RAG yang SAMA
   (retrieval, konteks, dan prompt identik), sehingga hanya modelnya yang berbeda.
   Penyedia dipilih dari kunci yang ada di .env:
     Gemini : LLM_PROVIDER=gemini + LLM_API_KEY (+ LLM_MODEL opsional)
     Groq   : GROQ_API_KEY (model bawaan openai/gpt-oss-20b, sesuai kontrak; ubah dengan GROQ_MODEL)
   Metrik objektif: fakta inti muncul (kata kunci dari tugas Sistem Cerdas), penolakan benar untuk
   pertanyaan di luar cakupan, jumlah kalimat (batas 4), kegagalan, dan latensi. Jawaban lengkap disimpan
   ke docs/perbandingan-llm.md untuk dinilai manual (akurasi fakta terhadap konteks tidak bisa dinilai otomatis).
   Pakai: npm run llm:bandingkan
   ========================================================================== */
import { writeFileSync } from "node:fs";
import { muatBerkasEnv, muatKonfigurasi } from "../src/config/env";
import type { KlienLlm } from "../src/konteks";
import { buatKlienLlm } from "../src/modules/asisten";
import { buatEmbedderTransformers } from "../src/rag/embedder";
import { MesinRag } from "../src/rag/rag";

muatBerkasEnv();
const cfg = muatKonfigurasi();

interface Uji {
  q: string;
  kunci: string | null; // alternatif kata kunci dipisah "|"; null = harus ditolak
}
const UJI: Uji[] = [
  { q: "Jantung manusia terdiri atas berapa ruang?", kunci: "empat|4" },
  { q: "Tekanan darah berapa yang disebut hipertensi?", kunci: "140" },
  { q: "Apa fungsi trombosit?", kunci: "pembekuan|membeku|menghentikan|menutup" },
  { q: "Di mana pertukaran gas terjadi di paru-paru?", kunci: "alveol" },
  { q: "Bakteri apa penyebab tuberkulosis?", kunci: "mycobacterium" },
  { q: "Apa fungsi epiglotis?", kunci: "menutup|tertutup" },
  { q: "Kenapa perokok mudah terkena gangguan paru-paru?", kunci: "silia|dahak|oksigen" },
  { q: "Bagaimana jalur peredaran darah kecil?", kunci: "paru" },
  { q: "Berapa jumlah tulang pada tubuh manusia dewasa?", kunci: null },
  { q: "Apa fungsi ginjal pada manusia?", kunci: null },
  { q: "Apa fungsi lambung dalam pencernaan?", kunci: null },
  { q: "Bagaimana cara kerja otak?", kunci: null },
];

const penyedia: { nama: string; model: string; klien: KlienLlm; reasoning?: string }[] = [];
if (cfg.LLM_API_KEY && cfg.LLM_PROVIDER !== "groq") {
  penyedia.push({ nama: cfg.LLM_PROVIDER, model: cfg.LLM_MODEL ?? "(bawaan)", klien: buatKlienLlm(cfg) });
}
const kunciGroq = process.env.GROQ_API_KEY || (cfg.LLM_PROVIDER === "groq" ? cfg.LLM_API_KEY : undefined);
if (kunciGroq) {
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
  penyedia.push({ nama: "groq", model, klien: buatKlienLlm({ LLM_PROVIDER: "groq", LLM_API_KEY: kunciGroq, LLM_MODEL: model, LLM_BASE_URL: undefined }), reasoning: "low" });
}
if (penyedia.length === 0) {
  console.error("Tidak ada kunci LLM. Isi LLM_API_KEY (Gemini) dan/atau GROQ_API_KEY di .env.");
  process.exit(1);
}

const embedder = cfg.RAG_EMBEDDING === "off" ? null : await buatEmbedderTransformers({ dtype: cfg.RAG_EMBEDDING === "fp32" ? "fp32" : "q8", cacheDir: cfg.RAG_CACHE_DIR });
const rag = new MesinRag({ embedder, batasJarak: cfg.RAG_BATAS_JARAK });
console.log(`RAG mode ${rag.modeAktif}; penyedia: ${penyedia.map((p) => `${p.nama}/${p.model}`).join(", ")}\n`);

const jeda = (ms: number) => new Promise((r) => setTimeout(r, ms));
const kalimat = (t: string) => (t.match(/[.!?](\s|$)/g) ?? []).length || 1;

interface Hasil { uji: Uji; jawaban: string | null; ditolak: boolean; ms: number; benar: boolean }
const semua = new Map<string, Hasil[]>();
for (const p of penyedia) {
  const hasil: Hasil[] = [];
  for (const u of UJI) {
    const t0 = Date.now();
    let r = await rag.jawab(u.q, "SMP", p.klien, p.reasoning);
    if (r.jawaban === null) {
      /* kemungkinan kena batas laju (tier gratis): tunggu lalu coba sekali lagi, kegagalan tetap dihitung bila gagal lagi */
      process.stdout.write(`${p.nama.padEnd(7)} … gagal, menunggu 40 detik lalu mencoba lagi\n`);
      await jeda(40_000);
      r = await rag.jawab(u.q, "SMP", p.klien, p.reasoning);
    }
    const ms = Date.now() - t0;
    const teks = (r.jawaban ?? "").toLowerCase();
    const benar = u.kunci === null ? r.ditolak : !r.ditolak && r.jawaban !== null && u.kunci.split("|").some((k) => teks.includes(k));
    hasil.push({ uji: u, jawaban: r.jawaban, ditolak: r.ditolak, ms, benar });
    process.stdout.write(`${p.nama.padEnd(7)} ${benar ? "✓" : "✗"} ${String(ms).padStart(6)} ms  ${u.q}\n`);
    await jeda(6000);
  }
  semua.set(p.nama, hasil);
}

const baris: string[] = ["| Penyedia | Model | Benar (fakta/penolakan) | Gagal (null) | Median latensi | Jawaban > 4 kalimat |", "| --- | --- | --- | --- | --- | --- |"];
for (const p of penyedia) {
  const h = semua.get(p.nama) as Hasil[];
  const panggilan = h.filter((x) => !(x.uji.kunci === null && x.ditolak && x.ms < 200));
  const ms = panggilan.map((x) => x.ms).sort((a, b) => a - b);
  const panjang = h.filter((x) => x.jawaban && !x.ditolak && kalimat(x.jawaban) > 4).length;
  baris.push(`| ${p.nama} | ${p.model} | ${h.filter((x) => x.benar).length}/${h.length} | ${h.filter((x) => x.jawaban === null).length} | ${ms.length ? ms[Math.floor(ms.length / 2)] : "-"} ms | ${panjang} |`);
}
const md = [
  "# Perbandingan LLM pada RAG ARnatomy",
  "",
  `Pipeline sama untuk semua penyedia (mode retrieval: ${rag.modeAktif}, 5 chunk, jenjang SMP, temperature 0). ${UJI.length} pertanyaan: ${UJI.filter((u) => u.kunci).length} dalam cakupan (benar bila jawaban memuat kata kunci fakta) dan ${UJI.filter((u) => !u.kunci).length} di luar cakupan (benar bila ditolak).`,
  "",
  ...baris,
  "",
  "Metrik otomatis hanya memeriksa kata kunci dan penolakan; akurasi seluruh fakta terhadap konteks buku perlu dinilai manual dari jawaban di bawah.",
  "",
  ...UJI.flatMap((u, i) => [
    `## ${i + 1}. ${u.q}${u.kunci ? ` (kunci: ${u.kunci})` : " (harus ditolak)"}`,
    ...penyedia.map((p) => {
      const h = (semua.get(p.nama) as Hasil[])[i] as Hasil;
      return `- **${p.nama}** ${h.benar ? "✓" : "✗"} (${h.ms} ms): ${h.jawaban === null ? "_LLM gagal_" : h.jawaban.replace(/\n+/g, " ")}`;
    }),
    "",
  ]),
].join("\n");
writeFileSync(new URL("../docs/perbandingan-llm.md", import.meta.url), md);
console.log(`\n${baris.join("\n")}\n\nJawaban lengkap: docs/perbandingan-llm.md`);
