/* ==========================================================================
   embedder.ts — Embedding kalimat (paraphrase-multilingual-MiniLM-L12-v2, 384
   dimensi) memakai ONNX lewat @huggingface/transformers. Pustaka dimuat malas
   agar server yang mematikan embedding (RAG_EMBEDDING=off) tidak memuat ONNX Runtime.
   q8 (terkuantisasi, ±120 MB) hemat memori; fp32 paling setia pada model asli
   tetapi memakai RAM jauh lebih besar.
   ========================================================================== */
export interface Embedder {
  /** Vektor ternormalisasi (panjang 1) sehingga cosine = hasil kali titik. */
  embed(teks: string): Promise<Float32Array>;
}

export interface OpsiEmbedder {
  dtype: "q8" | "fp32";
  cacheDir: string;
  model?: string;
}

export async function buatEmbedderTransformers(opsi: OpsiEmbedder): Promise<Embedder> {
  const { pipeline, env } = await import("@huggingface/transformers");
  env.cacheDir = opsi.cacheDir;
  const ekstrak = await pipeline("feature-extraction", opsi.model ?? "Xenova/paraphrase-multilingual-MiniLM-L12-v2", {
    dtype: opsi.dtype,
  });
  return {
    async embed(teks) {
      const keluaran = await ekstrak(teks, { pooling: "mean", normalize: true });
      return Float32Array.from(keluaran.data as Float32Array);
    },
  };
}
