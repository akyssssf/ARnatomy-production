/* konfigurasi.ts — Memuat konfigurasi RAG dan klasifikasi dari data/rag (kontrak komponen AI tugas Sistem Cerdas). */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

export const FOLDER_RAG = fileURLToPath(new URL("../../data/rag", import.meta.url));

const RagSchema = z.object({
  k: z.number().int().positive(),
  batas_jarak: z.number(),
  retrieve: z.object({ rrf_k: z.number(), stopword: z.array(z.string()) }),
  jenjang: z.record(z.string(), z.string()),
  jenjang_default: z.string(),
  system_prompt: z.string(),
  template_prompt: z.string(),
  format_konteks: z.string(),
  pesan_tidak_ada: z.string(),
  panjang_cuplikan: z.number().int().positive(),
  nama_embedding: z.string(),
  jumlah_chunk: z.number().int(),
});
export type KonfigurasiRag = z.infer<typeof RagSchema>;

const KlasifikasiSchema = z.object({
  kategori: z.array(z.string()),
  instruksi: z.string(),
  contoh: z.string(),
  template_prompt: z.string(),
  jika_tidak_cocok: z.string(),
});
export type KonfigurasiKlasifikasi = z.infer<typeof KlasifikasiSchema>;

export function muatKonfigurasiRag(folder = FOLDER_RAG): KonfigurasiRag {
  return RagSchema.parse(JSON.parse(readFileSync(join(folder, "konfigurasi_rag.json"), "utf-8")));
}
export function muatKonfigurasiKlasifikasi(folder = FOLDER_RAG): KonfigurasiKlasifikasi {
  return KlasifikasiSchema.parse(JSON.parse(readFileSync(join(folder, "konfigurasi_klasifikasi.json"), "utf-8")));
}
