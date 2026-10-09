"""Menghitung embedding 412 chunk knowledge base dengan model yang sama dengan kontrak
(paraphrase-multilingual-MiniLM-L12-v2, PyTorch fp32) dan menyimpannya sebagai Float32 biner
yang dibaca backend Node. Pakai: python scripts/ekspor-embedding.py  (butuh sentence-transformers)."""
import csv
import json
import sys
from pathlib import Path

import numpy as np
from sentence_transformers import SentenceTransformer

akar = Path(__file__).resolve().parent.parent / "data" / "rag"
baris = list(csv.DictReader(open(akar / "knowledge_base.csv", encoding="utf-8")))
model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
vektor = model.encode([b["teks"] for b in baris], batch_size=32, normalize_embeddings=True, show_progress_bar=False).astype("<f4")
(akar / "embeddings.f32").write_bytes(vektor.tobytes())
json.dump(
    {"model": "paraphrase-multilingual-MiniLM-L12-v2", "dtype": "fp32", "jumlah": len(baris), "dimensi": int(vektor.shape[1]),
     "normalisasi": True, "id_chunk_pertama": baris[0]["id_chunk"], "id_chunk_terakhir": baris[-1]["id_chunk"]},
    open(akar / "embeddings.json", "w"), indent=1,
)
print("embedding disimpan:", vektor.shape)

# Opsional: simpan embedding pertanyaan acuan untuk uji kesamaan dengan Node (argumen: berkas JSON berisi daftar pertanyaan)
if len(sys.argv) > 1:
    qs = json.load(open(sys.argv[1], encoding="utf-8"))
    qv = model.encode(qs, normalize_embeddings=True).astype("float32")
    json.dump({"pertanyaan": qs, "vektor": qv.tolist()}, open(sys.argv[2], "w"))
    print("embedding pertanyaan acuan disimpan:", qv.shape)
