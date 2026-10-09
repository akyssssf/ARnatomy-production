# Panduan deploy backend ARnatomy

Untuk pengelola server (dosen, laboratorium, atau tim). Backend berjalan sebagai satu aplikasi Node.js + PostgreSQL;
cara termudah adalah Docker Compose. Lama pemasangan pertama sekitar 15–30 menit.

## 1. Kebutuhan server

| Kebutuhan | Nilai | Catatan |
| --- | --- | --- |
| OS | Ubuntu 22.04 LTS (sesuai SKPL Bab V.c); Linux lain yang mendukung Docker juga bisa | |
| Docker | Docker Engine 24+ dan plugin Compose v2 | Atau Node.js 22+ dan PostgreSQL 14+ (lihat bagian 3) |
| RAM | **≥ 2 GB** untuk asisten AI mode penuh; **1 GB** bila `RAG_EMBEDDING=off` | Mode penuh memakai ±500–700 MB untuk model embedding |
| Disk | ≥ 5 GB | Image ±1,5 GB, basis data kecil, model 3D unggahan ≤ 15 MB per organ |
| Port | 80 dan 443 terbuka ke internet; 4000 hanya lokal | Backend sendiri tidak membuka HTTPS, Nginx yang melakukannya |
| Domain | Satu (sub)domain, mis. `api.contoh.ac.id`, dengan HTTPS | Klien web di Vercel (HTTPS) tidak boleh memanggil API `http://` |
| Akses keluar | `accounts.google.com` / `www.googleapis.com` (login Google), API LLM (Gemini/Groq) | Tanpa akses LLM, asisten tetap menjawab dari basis pengetahuan lokal |

Tim menyerahkan: folder proyek (atau akses repositori privat), berkas `.env` berisi rahasia (jangan dikirim lewat chat umum),
dan daftar origin klien yang diizinkan.

## 2. Cara A (disarankan): Docker Compose

```bash
# 1. pasang Docker (Ubuntu): https://docs.docker.com/engine/install/ubuntu/
# 2. salin folder proyek ke server, mis. /opt/arnatomy-backend, lalu:
cd /opt/arnatomy-backend
cp .env.example .env
nano .env        # isi sesuai tabel bagian 5 (minimal JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, CORS_ORIGINS)
docker compose up -d --build
```

Saat pertama dijalankan, otomatis: image dibangun (model embedding ikut diunduh), migrasi basis data dijalankan (20 tabel), 64.716 sekolah dan 6 tugas belajar dimuat,
data master anatomi diisi, dan akun admin dibuat dari `ADMIN_EMAIL` + `ADMIN_PASSWORD`. Akun demo **tidak** dibuat di produksi.

Periksa:

```bash
docker compose ps                       # api dan db: healthy
curl -s http://localhost:4000/readyz    # {"status":"siap"}
docker compose logs api | tail -20      # "RAG: model embedding siap, mode hybrid" dan "backend siap"
curl -s -X POST http://localhost:4000/v1/auth/login -H 'content-type: application/json' \
  -d '{"email":"<ADMIN_EMAIL>","password":"<ADMIN_PASSWORD>"}'
```

Port 4000 pada compose sebaiknya hanya dapat diakses dari server itu sendiri; ubah baris `ports` di `docker-compose.yml`
menjadi `"127.0.0.1:4000:4000"` bila Nginx berada di server yang sama.

## 3. Cara B: tanpa Docker (belum diuji pada mesin pengembangan)

```bash
sudo apt install -y postgresql nodejs      # Node.js 22+ (mis. dari NodeSource); PostgreSQL 14+
sudo -u postgres psql -c "CREATE USER arnatomy WITH PASSWORD 'ganti-ini'; CREATE DATABASE arnatomy OWNER arnatomy;"
cd /opt/arnatomy-backend && npm ci --omit=dev && npm run rag:unduh-model
# DATABASE_URL=postgres://arnatomy:ganti-ini@localhost:5432/arnatomy di .env
```

Unit systemd `/etc/systemd/system/arnatomy.service`:

```ini
[Unit]
Description=ARnatomy backend
After=network.target postgresql.service

[Service]
WorkingDirectory=/opt/arnatomy-backend
EnvironmentFile=/opt/arnatomy-backend/.env
Environment=NODE_ENV=production UV_THREADPOOL_SIZE=8
ExecStart=/usr/bin/npx tsx src/server.ts
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
```

`sudo systemctl daemon-reload && sudo systemctl enable --now arnatomy`.

## 4. Nginx dan HTTPS

Gunakan `deploy/nginx.conf.example` (sintaksnya sudah diuji dengan `nginx -t`): ganti `api.contoh.ac.id`, pasang sertifikat
(`certbot --nginx` atau sertifikat kampus), lalu `nginx -t && systemctl reload nginx`. Di `.env` wajib
`TRUST_PROXY=true` agar pembatas login membaca IP klien yang benar (tanpa itu semua pengguna tampak berasal dari IP proxy).

## 5. Variabel `.env`

| Variabel | Wajib? | Keterangan |
| --- | --- | --- |
| `NODE_ENV` | ya | `production` (compose sudah mengatur) |
| `JWT_SECRET` | **ya** | ≥ 32 karakter acak: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. Mengganti nilai ini membuat semua sesi keluar |
| `DATABASE_URL` | ya (cara B) | Compose mengisinya otomatis |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | **ya** (pertama kali) | Akun admin awal; sandi ≥ 8 karakter. Ganti lewat menu kelola akun setelah masuk |
| `CORS_ORIGINS` | **ya** | Alamat klien web yang diizinkan, dipisah koma: `https://arnatomy.vercel.app,https://web.contoh.ac.id` |
| `TRUST_PROXY` | ya bila di belakang Nginx | `true` |
| `GOOGLE_CLIENT_IDS` | untuk login Google | Client ID (Web, Android, iOS) dipisah koma. Di Google Cloud Console, tambahkan domain klien ke *Authorized JavaScript origins* |
| `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL` | untuk asisten AI | Bawaan `gemini`. Tanpa kunci: jawaban dari basis pengetahuan lokal |
| `RAG_EMBEDDING` | tidak | `q8` (bawaan), `fp32`, atau `off` untuk server 1 GB |
| `STORAGE_DRIVER`, `STORAGE_DIR`, `STORAGE_PUBLIC_URL` | tidak | Bawaan `lokal` (folder `uploads` di volume Docker). Bila memakai `lokal` di produksi, atur Nginx menyajikan `/files/` atau biarkan backend menyajikannya; `STORAGE_PUBLIC_URL` harus `https://api.contoh.ac.id/files` |
| `S3_*` | bila `STORAGE_DRIVER=s3` | Endpoint, bucket, kunci akses object storage (R2, S3, MinIO-kompatibel) |

## 6. Pemeliharaan

```bash
# log
docker compose logs -f api
# backup basis data (jalankan terjadwal, mis. harian lewat cron) dan volume unggahan
docker compose exec -T db pg_dump -U arnatomy arnatomy | gzip > arnatomy-$(date +%F).sql.gz
docker run --rm -v arnatomy-backend_uploads:/data -v "$PWD":/cadangan alpine tar czf /cadangan/uploads-$(date +%F).tgz -C /data .
# pembaruan kode
git pull   # atau salin folder baru
docker compose up -d --build
```

Pantau ketersediaan (NFR-04) dengan layanan seperti UptimeRobot yang memanggil `https://api.contoh.ac.id/healthz` tiap
5 menit. `/readyz` juga memeriksa basis data; Docker memulai ulang kontainer otomatis (`restart: unless-stopped`).

## 7. Pemecahan masalah

| Gejala | Penyebab umum |
| --- | --- |
| Server menolak start: `JWT_SECRET wajib diatur` | `.env` belum diisi atau tidak terbaca |
| Login Google menjawab 503 `GOOGLE_NONAKTIF` | `GOOGLE_CLIENT_IDS` kosong |
| Login Google gagal dari klien web (`origin_mismatch`) | Domain klien belum ada di *Authorized JavaScript origins* |
| Asisten selalu "lokal" | `LLM_API_KEY` kosong, kuota gratis habis (HTTP 429, lihat `docker compose logs api`), atau nama model sudah ditutup Google; ubah `LLM_MODEL` |
| Log: `model embedding gagal dimuat` | RAM kurang; set `RAG_EMBEDDING=off` |
| Semua pengguna terkena pembatas login bersamaan | `TRUST_PROXY` belum `true` di belakang Nginx |
| Model 3D unggahan tidak tampil | `STORAGE_PUBLIC_URL` tidak mengarah ke alamat yang bisa dibuka klien |

## 8. Paket lengkap dengan frontend

Untuk menjalankan frontend web, backend, dan PostgreSQL sekaligus, pakai folder `arnatomy-deploy` (satu `docker compose up`):
hanya frontend yang dibuka ke luar, dan HTTPS wajib karena cookie sesi bertanda Secure. Lihat `arnatomy-deploy/README.md`.

## 9. Yang belum teruji

Pemasangan di Linux amd64 dan Ubuntu 22.04 sungguhan (pengembangan di macOS arm64), cara B (tanpa Docker), serta beban
pada server kampus. Uji asap pasca-deploy di bagian 2 cukup untuk memastikan semuanya berjalan.
