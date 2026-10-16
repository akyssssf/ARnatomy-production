# LLM lokal ARnatomy di VPS (Ollama)

Asisten AI (FR-08) bisa memakai model bahasa yang berjalan di server sendiri, tanpa layanan cloud.
Backend memanggilnya lewat API OpenAI-compatible, jadi cukup tiga variabel (`LLM_PROVIDER=ollama`, `LLM_BASE_URL`, `LLM_API_KEY`).

```
backend ARnatomy ──HTTPS + Bearer──► Caddy (443) ──► Ollama (11434, tidak terbuka)   [VPS LLM]
```

## 1. Spesifikasi VPS
| | Minimum | Disarankan |
| --- | --- | --- |
| OS | Ubuntu 22.04/24.04 (amd64) | Ubuntu 24.04 |
| RAM | 4 GB (model 3B + sistem) | 8 GB |
| vCPU | 2 | 4 |
| Disk | 20 GB | 40 GB |

Tanpa GPU, model 3B menjawab sekitar 5-10 token/detik (jawaban asisten maksimal 4 kalimat: sekitar 10-25 detik).
Backend menunggu paling lama 25 detik (`LLM_TIMEOUT_DETIK`, maksimal 28 karena frontend memutus di 30 detik),
setelah itu memakai jawaban lokal dari basis pengetahuan. Gunakan VPS yang lebih cepat bila sering melewati batas.

## 2. Pasang
```bash
# di VPS (sebagai root atau user sudo)
curl -fsSL https://get.docker.com | sh
git clone https://github.com/akyssssf/arnatomy-deploy.git && cd arnatomy-deploy/llm-vps   # atau salin folder ini
cp .env.example .env && nano .env        # isi LLM_DOMAIN dan LLM_API_KEY
ufw allow 80,443/tcp && ufw allow OpenSSH && ufw enable   # firewall; port 11434 jangan dibuka
docker compose up -d
docker compose exec ollama ollama pull qwen2.5:3b          # unduh model (±2 GB)
```

## 3. Uji dari laptop
```bash
curl -s https://$LLM_DOMAIN/v1/chat/completions \
  -H "Authorization: Bearer $LLM_API_KEY" -H "Content-Type: application/json" \
  -d '{"model":"qwen2.5:3b","messages":[{"role":"user","content":"Apa fungsi jantung? Jawab satu kalimat."}]}'
```
Tanpa header Authorization hasilnya harus `unauthorized` (401).

## 4. Pasang di backend
Variabel backend (Railway `api`, atau `.env` compose):
```
LLM_PROVIDER=ollama
LLM_BASE_URL=https://<LLM_DOMAIN>/v1
LLM_API_KEY=<nilai LLM_API_KEY di VPS>
LLM_MODEL=qwen2.5:3b
```
Log backend saat mulai harus menampilkan `Asisten AI: ollama (LLM lokal) di https://…`.

## Memilih model
| Model | Ukuran | Catatan |
| --- | --- | --- |
| `qwen2.5:3b` (bawaan) | ±2 GB | seimbang, cukup baik berbahasa Indonesia |
| `llama3.2:3b` | ±2 GB | alternatif |
| `qwen2.5:7b` | ±4,7 GB | lebih baik, butuh 8 GB RAM dan jauh lebih lambat di CPU |

Ganti dengan `ollama pull <model>` lalu ubah `LLM_MODEL`.

## Keamanan
- Ollama tidak punya autentikasi. Jangan memetakan port 11434 ke host atau membuka di firewall; hanya Caddy yang terbuka.
- Simpan `LLM_API_KEY` hanya di `.env` VPS dan variabel backend, jangan di repo atau chat.
- Ganti kunci bila bocor: ubah di kedua tempat, lalu `docker compose up -d`.
