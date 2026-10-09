/* ==========================================================================
   llm.ts — Jembatan BFF ke model bahasa (FR-08). Berjalan hanya di server:
   kunci API dibaca dari envServer() dan tidak pernah sampai ke klien.
   Prompt sistem memasukkan konteks bagian tubuh (fakta SKPL + konten label)
   dan meminta bahasa jenjang SMP-SMA. Bila kunci tidak diatur, permintaan
   gagal, atau melewati batas waktu, mengembalikan null agar pemanggil
   memakai penyusun jawaban lokal (susunJawaban).
   ========================================================================== */
import "server-only";
import { z } from "zod";
import { pengetahuan_ai } from "./data";
import { kontenBagian } from "./db";
import { envServer } from "./env";
import type { BodyPart } from "./schemas";

const BATAS_WAKTU_MS = 12_000;
const RespAnthropicSchema = z.object({
  content: z.array(z.object({ type: z.string(), text: z.string().optional() })),
});

export function susunPromptSistem(bagian: BodyPart | null): string {
  const dasar = [
    "Kamu adalah Asisten AI ARnatomy, tutor anatomi untuk siswa SMP dan SMA di Indonesia.",
    "Jawab dalam bahasa Indonesia yang sederhana dan ramah, maksimal 120 kata, tanpa markdown.",
    "Batasi jawaban pada anatomi jantung (sistem peredaran darah) dan paru-paru (sistem pernapasan).",
    "Bila pertanyaan di luar itu, katakan dengan sopan bahwa materinya belum tersedia.",
  ];
  if (!bagian) return dasar.join(" ");
  const basis = pengetahuan_ai[String(bagian.id_bagian)];
  const konten = kontenBagian(bagian.id_bagian, "dasar");
  const fakta = bagian.fakta.map((f) => `${f.label}: ${f.nilai}`).join("; ");
  return [
    ...dasar,
    `Konteks bagian yang sedang dipelajari: ${bagian.nama_bagian_internal}.`,
    konten ? `Deskripsi label: ${konten.deskripsi}` : "",
    basis ? `Fungsi: ${basis.fungsi} Letak: ${basis.letak} Gangguan: ${basis.gangguan}` : "",
    fakta ? `Fakta kunci: ${fakta}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Jawaban LLM, atau null bila LLM tidak dikonfigurasi / gagal (pemanggil memakai cadangan lokal). */
export async function jawabDenganLlm(pertanyaan: string, bagian: BodyPart | null): Promise<string | null> {
  const env = envServer();
  if (!env.ANTHROPIC_API_KEY) return null;
  const pengendali = new AbortController();
  const penghitung = setTimeout(() => pengendali.abort(), BATAS_WAKTU_MS);
  try {
    const respons = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: pengendali.signal,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: env.AI_MODEL,
        max_tokens: 400,
        system: susunPromptSistem(bagian),
        messages: [{ role: "user", content: pertanyaan }],
      }),
    });
    if (!respons.ok) return null;
    const data = RespAnthropicSchema.safeParse(await respons.json());
    if (!data.success) return null;
    const teks = data.data.content
      .filter((c) => c.type === "text" && c.text)
      .map((c) => c.text?.trim())
      .join("\n")
      .trim();
    return teks || null;
  } catch {
    return null;
  } finally {
    clearTimeout(penghitung);
  }
}
