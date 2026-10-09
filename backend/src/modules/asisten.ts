/* ==========================================================================
   asisten.ts — FR-08: asisten penjelasan AI. Konteks bagian tubuh (fakta dan
   label TERVALIDASI) dikirim ke LLM lewat backend, sehingga kunci API tidak
   pernah sampai ke klien (SKPL Bab V.b). Bila LLM tidak dikonfigurasi,
   gagal, atau melewati batas waktu, jawaban disusun dari basis pengetahuan
   lokal. Keluaran diperiksa otomatis oleh program (bukan manusia): dipangkas
   bila terlalu panjang dan diganti jawaban aman bila memuat saran medis.
   ========================================================================== */
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import type { Konfigurasi } from "../config/env";
import { ai_conversations, bagian_fakta, body_parts, part_content } from "../db/schema";
import seed from "../db/seed-data.json";
import type { AppEnv, Deps, KlienLlm } from "../konteks";
import { GalatApi } from "../lib/galat";
import { bacaBody } from "../middleware";
import { KlasifikasiSchema, PertanyaanSchema } from "../schemas";

const BASIS: Record<string, { fungsi: string; letak: string; gangguan: string; ringkas: string }> = seed.pengetahuan_ai;
const BATAS_WAKTU_MS = 12_000;
const MAKS_PANJANG = 1200;
/* Hanya anjuran pengobatan yang diblokir; istilah medis dalam penjelasan buku (mis. "diagnosis PPOK") tetap boleh */
const POLA_SARAN_MEDIS =
  /\b(minum|konsumsi|makan|telan)\s+obat\b|\bdosis\s*\d|\bobat\s+\w+\s+\d+\s*mg\b|\bresep\s+dokter\b/i;
const JAWABAN_AMAN =
  "Aku hanya bisa menjelaskan anatomi untuk belajar. Untuk keluhan kesehatan, silakan bertanya kepada dokter atau tenaga kesehatan.";

interface BagianKonteks {
  id_bagian: number;
  id_organ: number;
  nama_bagian_internal: string;
  fakta: { label: string; nilai: string }[];
  deskripsi_dasar: string | null;
  judul_dimmed: string | null;
}

export function susunPromptSistem(b: BagianKonteks | null): string {
  const dasar = [
    "Kamu adalah Asisten AI ARnatomy, tutor anatomi untuk siswa SMP dan SMA di Indonesia.",
    "Jawab dalam bahasa Indonesia yang sederhana dan ramah, maksimal 120 kata, tanpa markdown.",
    "Batasi jawaban pada anatomi jantung (sistem peredaran darah) dan paru-paru (sistem pernapasan).",
    "Jangan memberi diagnosis atau saran pengobatan. Bila pertanyaan di luar materi, katakan dengan sopan bahwa materinya belum tersedia.",
  ];
  if (!b) return dasar.join(" ");
  const basis = BASIS[String(b.id_bagian)];
  const fakta = b.fakta.map((f) => `${f.label}: ${f.nilai}`).join("; ");
  return [
    ...dasar,
    `Konteks bagian yang sedang dipelajari: ${b.nama_bagian_internal}.`,
    b.deskripsi_dasar ? `Deskripsi label: ${b.deskripsi_dasar}` : "",
    basis ? `Fungsi: ${basis.fungsi} Letak: ${basis.letak} Gangguan: ${basis.gangguan}` : "",
    fakta ? `Fakta kunci: ${fakta}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Jawaban cadangan dari basis pengetahuan lokal berdasarkan kata kunci pertanyaan. */
export function susunJawabanLokal(pertanyaan: string, b: BagianKonteks | null): string {
  const teks = pertanyaan.toLowerCase();
  const basis = b ? BASIS[String(b.id_bagian)] : undefined;
  if (!b || !basis) {
    return (
      "Untuk saat ini aku baru menguasai materi jantung (sistem peredaran darah) dan paru-paru " +
      "(sistem pernapasan). Pilih salah satu bagiannya, lalu ajukan pertanyaannya lagi."
    );
  }
  const potongan: string[] = [];
  if (/fungsi|guna|tugas|kerja|peran|untuk apa/.test(teks)) potongan.push(basis.fungsi);
  if (/letak|dimana|di mana|posisi|lokasi/.test(teks)) potongan.push(basis.letak);
  if (/gangguan|penyakit|kelainan|masalah|sakit/.test(teks)) potongan.push(basis.gangguan);
  if (/beda|perbedaan|banding|dibanding/.test(teks)) {
    potongan.push(
      b.id_organ === 2
        ? "Bedanya, paru kanan punya tiga lobus dan lebih besar, sedangkan paru kiri hanya dua lobus karena berbagi ruang dengan jantung."
        : "Bedanya terletak pada tujuan aliran darah: sisi kanan jantung mengurus perjalanan ke paru-paru, sedangkan sisi kiri mengurus perjalanan ke seluruh tubuh.",
    );
  }
  if (!potongan.length) potongan.push(basis.fungsi, basis.ringkas);
  const catatan = b.judul_dimmed
    ? ` Untuk penjelasan lanjutan, buka label redup "${b.judul_dimmed}" pada bagian ini.`
    : " Bagian lain pada model bisa dibuka untuk perbandingan.";
  return `Tentang ${b.nama_bagian_internal}: ${potongan.join(" ")}${catatan}`;
}

/** Pemeriksaan keluaran otomatis (jaring pengaman, bukan jaminan kebenaran isi). */
export function periksaKeluaran(teks: string): string {
  const bersih = teks.replace(/\s+\n/g, "\n").trim();
  if (!bersih || POLA_SARAN_MEDIS.test(bersih)) return JAWABAN_AMAN;
  if (bersih.length <= MAKS_PANJANG) return bersih;
  const potong = bersih.slice(0, MAKS_PANJANG);
  const akhir = Math.max(potong.lastIndexOf(". "), potong.lastIndexOf("."));
  return akhir > 200 ? potong.slice(0, akhir + 1) : `${potong.trimEnd()}…`;
}

interface PraSetelLlm {
  baseUrl: string;
  model: string;
}
/** Prasetel penyedia LLM. Semua kecuali anthropic memakai format OpenAI-compatible (/chat/completions). */
export const PRASETEL_LLM: Record<string, PraSetelLlm> = {
  gemini: { baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-3.5-flash" },
  groq: { baseUrl: "https://api.groq.com/openai/v1", model: "openai/gpt-oss-20b" },
  openrouter: { baseUrl: "https://openrouter.ai/api/v1", model: "meta-llama/llama-3.3-70b-instruct:free" },
  anthropic: { baseUrl: "https://api.anthropic.com/v1", model: "claude-haiku-4-5-20251001" },
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
};

/** Klien LLM; null bila kunci tidak diatur, gagal, atau melewati batas waktu (pemanggil memakai cadangan lokal). */
export function buatKlienLlm(
  cfg: Pick<Konfigurasi, "LLM_PROVIDER" | "LLM_API_KEY" | "LLM_MODEL" | "LLM_BASE_URL">,
  fetcher: typeof fetch = fetch,
  peringatan: (pesan: string) => void = (pesan) => console.warn(pesan),
): KlienLlm {
  const prasetel = PRASETEL_LLM[cfg.LLM_PROVIDER] as PraSetelLlm;
  const baseUrl = (cfg.LLM_BASE_URL ?? prasetel.baseUrl).replace(/\/$/, "");
  const model = cfg.LLM_MODEL ?? prasetel.model;
  return async (sistem, pertanyaan, opsi) => {
    if (!cfg.LLM_API_KEY) return null;
    const pengendali = new AbortController();
    const penghitung = setTimeout(() => pengendali.abort(), BATAS_WAKTU_MS);
    try {
      const anthropic = cfg.LLM_PROVIDER === "anthropic";
      const respons = await fetcher(anthropic ? `${baseUrl}/messages` : `${baseUrl}/chat/completions`, {
        method: "POST",
        signal: pengendali.signal,
        headers: anthropic
          ? { "Content-Type": "application/json", "x-api-key": cfg.LLM_API_KEY, "anthropic-version": "2023-06-01" }
          : { "Content-Type": "application/json", Authorization: `Bearer ${cfg.LLM_API_KEY}` },
        body: JSON.stringify(
          anthropic
            ? {
                model,
                max_tokens: opsi?.maxTokens ?? 800,
                ...(opsi?.temperature !== undefined && { temperature: opsi.temperature }),
                ...(sistem && { system: sistem }),
                messages: [{ role: "user", content: pertanyaan }],
              }
            : {
                model,
                max_tokens: opsi?.maxTokens ?? 800,
                ...(opsi?.temperature !== undefined && { temperature: opsi.temperature }),
                ...(opsi?.reasoningEffort && cfg.LLM_PROVIDER === "groq" && { reasoning_effort: opsi.reasoningEffort }),
                messages: [
                  ...(sistem ? [{ role: "system", content: sistem }] : []),
                  { role: "user", content: pertanyaan },
                ],
              },
        ),
      });
      if (!respons.ok) {
        const isi = (await respons.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 200);
        peringatan(`LLM (${cfg.LLM_PROVIDER}/${model}) gagal: HTTP ${respons.status} ${isi}. Memakai jawaban lokal.`);
        return null;
      }
      const data = (await respons.json()) as {
        content?: { type: string; text?: string }[];
        choices?: { message?: { content?: string | null } }[];
      };
      const teks = anthropic
        ? (data.content ?? [])
            .filter((x) => x.type === "text" && x.text)
            .map((x) => x.text?.trim())
            .join("\n")
        : (data.choices?.[0]?.message?.content ?? "");
      if (!teks.trim())
        peringatan(`LLM (${cfg.LLM_PROVIDER}/${model}) mengembalikan jawaban kosong. Memakai jawaban lokal.`);
      return teks.trim() || null;
    } catch (e) {
      peringatan(
        `LLM (${cfg.LLM_PROVIDER}/${model}) tidak terjangkau: ${(e as Error).name === "AbortError" ? "melewati batas waktu" : (e as Error).message}. Memakai jawaban lokal.`,
      );
      return null;
    } finally {
      clearTimeout(penghitung);
    }
  };
}

export function rutAsisten(deps: Deps) {
  const { db } = deps;
  const r = new Hono<AppEnv>();
  const reasoning = deps.cfg.LLM_PROVIDER === "groq" ? "low" : undefined;

  /* Cache jawaban LLM untuk pertanyaan identik (mis. satu kelas menanyakan hal yang sama): menghemat kuota
     LLM gratis dan mempercepat jawaban. Hanya jawaban sukses (bukan cadangan lokal) yang disimpan. */
  type HasilRag = Awaited<ReturnType<Deps["rag"]["jawab"]>>;
  const cache = new Map<string, { sampai: number; hasil: HasilRag }>();
  const umurCache = deps.cfg.ASISTEN_CACHE_MENIT * 60_000;
  const kunciCache = (q: string, jenjang: string | undefined) =>
    `${jenjang ?? "SMP"}|${q
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim()}`;

  async function muatKonteks(idBagian: number): Promise<BagianKonteks | null> {
    const [b] = await db.select().from(body_parts).where(eq(body_parts.id_bagian, idBagian)).limit(1);
    if (!b) return null;
    const [fakta, konten] = await Promise.all([
      db
        .select({ label: bagian_fakta.label, nilai: bagian_fakta.nilai })
        .from(bagian_fakta)
        .where(eq(bagian_fakta.id_bagian, idBagian)),
      db
        .select()
        .from(part_content)
        .where(and(eq(part_content.id_bagian, idBagian), eq(part_content.status_validasi, "tervalidasi"))),
    ]);
    return {
      id_bagian: b.id_bagian,
      id_organ: b.id_organ,
      nama_bagian_internal: b.nama_bagian_internal,
      fakta,
      deskripsi_dasar: konten.find((k) => k.jenis_konten === "dasar")?.deskripsi ?? null,
      judul_dimmed: konten.find((k) => k.jenis_konten === "dimmed")?.judul_tampil ?? null,
    };
  }

  /* FR-08: RAG berbasis buku (hybrid embedding + TF-IDF) -> LLM -> jawaban + sumber */
  r.post("/asisten/tanya", async (c) => {
    const p = c.get("pengguna");
    const d = await bacaBody(c, PertanyaanSchema);
    const kunci = `asisten|${p.id_user}`;
    const tunggu = deps.pembatasAsisten.sisaBlokir(kunci);
    if (tunggu > 0) {
      c.header("Retry-After", String(tunggu));
      throw new GalatApi(
        429,
        "Terlalu banyak pertanyaan. Tunggu sebentar lalu coba lagi.",
        "TERLALU_BANYAK_PERTANYAAN",
      );
    }
    deps.pembatasAsisten.catat(kunci);
    let konteks: BagianKonteks | null = null;
    if (d.id_bagian) {
      konteks = await muatKonteks(d.id_bagian);
      if (!konteks) throw new GalatApi(404, "Bagian tubuh tidak ditemukan.");
    }
    const kc = kunciCache(d.pertanyaan, d.jenjang);
    const tersimpan = umurCache > 0 ? cache.get(kc) : undefined;
    const dariCache = tersimpan !== undefined && tersimpan.sampai > Date.now();
    const hasil = dariCache
      ? (tersimpan as { hasil: HasilRag }).hasil
      : await deps.rag.jawab(d.pertanyaan, d.jenjang, deps.llm, reasoning);
    if (!dariCache && umurCache > 0 && hasil.jawaban !== null) {
      if (cache.size >= 200) cache.delete(cache.keys().next().value as string);
      cache.set(kc, { sampai: Date.now() + umurCache, hasil });
    }
    let jawaban: string;
    let asal: "llm" | "lokal" | "penolakan";
    if (hasil.jawaban !== null) {
      jawaban = hasil.ditolak ? hasil.jawaban : periksaKeluaran(hasil.jawaban);
      asal = hasil.ditolak ? "penolakan" : "llm";
    } else {
      /* LLM tidak tersedia/gagal: jawaban cadangan dari basis pengetahuan lokal (NFR-04) */
      jawaban = konteks
        ? susunJawabanLokal(d.pertanyaan, konteks)
        : "Penjelasan AI sedang tidak tersedia. Bagian buku yang paling relevan ada di daftar sumber di bawah ini.";
      asal = "lokal";
    }
    const [baris] = await db
      .insert(ai_conversations)
      .values({ id_user: p.id_user, id_bagian: konteks?.id_bagian ?? null, pertanyaan: d.pertanyaan, jawaban })
      .returning();
    return c.json(
      {
        ...baris,
        asal,
        jenjang: hasil.jenjang,
        sumber: hasil.sumber,
        mode_retrieval: hasil.mode,
        dari_cache: dariCache,
      },
      201,
    );
  });

  /* Klasifikasi sistem organ dari pertanyaan (zero-shot): memilih model 3D atau menolak di luar cakupan */
  r.post("/asisten/klasifikasi", async (c) => {
    const d = await bacaBody(c, KlasifikasiSchema);
    const kategori = await deps.rag.klasifikasiSistem(d.pertanyaan, deps.llm, reasoning);
    if (kategori === null)
      throw new GalatApi(503, "Klasifikasi membutuhkan LLM yang belum tersedia.", "LLM_TIDAK_TERSEDIA");
    return c.json({ kategori });
  });

  r.get("/asisten/riwayat", async (c) =>
    c.json(
      await db
        .select()
        .from(ai_conversations)
        .where(eq(ai_conversations.id_user, c.get("pengguna").id_user))
        .orderBy(desc(ai_conversations.waktu))
        .limit(50),
    ),
  );

  return r;
}
