/* Mengunduh model embedding (q8, ±120 MB) ke RAG_CACHE_DIR agar server tidak perlu mengunduh saat pertama dijalankan.
   Dipakai di Dockerfile; di mesin sendiri: npm run rag:unduh-model. Tidak butuh konfigurasi server lengkap. */
import { muatBerkasEnv } from "../src/config/env";
import { buatEmbedderTransformers } from "../src/rag/embedder";

muatBerkasEnv();
const cacheDir = process.env.RAG_CACHE_DIR || "./.cache/hf";
const e = await buatEmbedderTransformers({ dtype: "q8", cacheDir });
const v = await e.embed("uji unduh model");
console.log(`Model embedding siap di ${cacheDir} (dimensi ${v.length})`);
