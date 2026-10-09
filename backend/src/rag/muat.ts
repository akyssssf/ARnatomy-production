/* muat.ts — Menyiapkan MesinRag untuk server: chunk + TF-IDF dimuat langsung; model embedding dimuat di latar belakang
   (unduhan pertama ±120 MB) sehingga server tetap bisa melayani (mode tfidf) selama model belum siap. */
import type { Konfigurasi } from "../config/env";
import { buatEmbedderTransformers } from "./embedder";
import { MesinRag } from "./rag";

export function siapkanRag(cfg: Konfigurasi, catat: (pesan: string) => void = console.log): MesinRag {
  const rag = new MesinRag({ batasJarak: cfg.RAG_BATAS_JARAK });
  if (cfg.RAG_EMBEDDING === "off") {
    catat("RAG: embedding dimatikan (RAG_EMBEDDING=off), memakai TF-IDF saja");
    return rag;
  }
  const dtype = cfg.RAG_EMBEDDING === "fp32" ? "fp32" : "q8";
  catat(`RAG: ${rag.chunk.length} chunk dimuat (TF-IDF aktif); memuat model embedding ${dtype} di latar belakang...`);
  buatEmbedderTransformers({ dtype, cacheDir: cfg.RAG_CACHE_DIR })
    .then((e) => {
      rag.pasangEmbedder(e);
      catat(`RAG: model embedding siap, mode ${rag.modeAktif}`);
    })
    .catch((e: Error) => catat(`RAG: model embedding gagal dimuat (${e.message}); tetap memakai TF-IDF saja`));
  return rag;
}
