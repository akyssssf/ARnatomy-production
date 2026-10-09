# ARnatomy: paket produksi

Aplikasi pembelajaran anatomi (sistem peredaran darah dan pernapasan) dengan model organ 3D, kuis, simulasi, rakit organ, dan asisten AI.
Repositori ini berisi **semua yang dibutuhkan untuk dipasang di server**: frontend (Next.js), backend (Hono + PostgreSQL), dan satu `docker-compose.yml`.
Pengembangan dilakukan di repositori lain (ARnatomy dan arnatomy-backend); repositori ini hanya menerima hasil rilisnya.

```
docker-compose.yml   menjalankan web + api + db
.env.example         daftar pengaturan (salin menjadi .env)
frontend/            kode frontend
backend/             kode backend dan data (buku acuan, daftar sekolah)
deploy/              contoh konfigurasi Nginx
```

## Kebutuhan server

| Kebutuhan | Nilai |
| --- | --- |
| OS | Linux (disarankan Ubuntu 22.04) dengan **Docker Engine 24+ dan Compose v2** |
| RAM | **≥ 2 GB** (asisten AI mode penuh); 1 GB bila `RAG_EMBEDDING=off` di `.env` |
| Disk | ≥ 6 GB |
| Domain | Satu (sub)domain dengan **HTTPS** (wajib, lihat bagian HTTPS) |
| Akses keluar | `accounts.google.com` (login Google) dan API Gemini/LLM (asisten AI; tanpa ini asisten memakai jawaban cadangan) |

## Pemasangan

```bash
git clone https://github.com/akyssssf/ARnatomy-production.git
cd ARnatomy-production
cp .env.example .env
nano .env                         # isi sesuai tabel di bawah
docker compose up -d --build      # pertama kali ±10 menit
docker compose ps                 # db, api, web harus "healthy"
```

Buat nilai acak untuk rahasia dengan: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
(atau `openssl rand -base64 48`).

### Isi `.env`

| Variabel | Wajib | Keterangan |
| --- | --- | --- |
| `SITE_URL` | ya | Alamat publik situs, tanpa garis miring akhir: `https://arnatomyuns.tifpsdku.com` |
| `JWT_SECRET`, `SESSION_SECRET` | **ya** | Acak, ≥ 32 karakter, **berbeda satu sama lain**. Jangan dibagikan |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | **ya** | Akun administrator awal (sandi ≥ 8 karakter, huruf dan angka). Ganti setelah masuk |
| `DB_PASSWORD` | disarankan | Sandi basis data internal |
| `GOOGLE_CLIENT_ID` | untuk login Google | Client ID (Web). Nilainya tertanam saat build, jadi bila diubah jalankan `docker compose up -d --build web` |
| `LLM_API_KEY`, `LLM_PROVIDER`, `LLM_MODEL` | opsional | Kunci Gemini (atau Groq/OpenRouter). Tanpa kunci, asisten menjawab dari basis pengetahuan lokal |
| `RAG_EMBEDDING` | opsional | `q8` (bawaan), `fp32`, atau `off` untuk server 1 GB |
| `PORT_HOST` | opsional | Port web di server (bawaan 3000) |
| `COOKIE_AMAN` | opsional | Biarkan `true`. Ubah `false` **hanya** untuk uji lewat `http://localhost` |

Berkas `.env` berisi rahasia: jangan dimasukkan ke Git dan jangan dikirim lewat saluran umum.

## Domain

Alamat yang direncanakan: **`arnatomyuns.tifpsdku.com`**. Arahkan catatan DNS **A** (atau CNAME) subdomain itu ke alamat IP server, lalu pasang HTTPS di depannya (bagian berikut).
Isi `SITE_URL=https://arnatomyuns.tifpsdku.com` di `.env`. Halaman publik yang dirujuk Google tersedia di aplikasi itu sendiri:
`/kebijakan-privasi` dan `/syarat`.

## HTTPS (wajib)

Cookie sesi bertanda *Secure*, sehingga situs harus dibuka lewat HTTPS. Pasang Nginx (atau proxy kampus) di depan port 3000, atau
gunakan Caddy/Traefik. Contoh Nginx ada di `deploy/nginx.conf.example` (ubah `server_name`, sertifikat, dan `proxy_pass` ke `http://127.0.0.1:3000`).
Hanya port web yang dibuka ke luar; backend dan basis data hanya terjangkau dari jaringan Docker. Untuk unggahan model 3D (maks. 15 MB)
naikkan `client_max_body_size` di Nginx menjadi `16m`.

## Login Google

1. Google Cloud Console → Google Auth Platform → **Clients** → client Web → *Authorized JavaScript origins* → tambahkan `https://arnatomyuns.tifpsdku.com` persis.
   Pada **Branding**: Authorized domain `tifpsdku.com`; halaman utama `https://arnatomyuns.tifpsdku.com`; kebijakan privasi `https://arnatomyuns.tifpsdku.com/kebijakan-privasi`; syarat `https://arnatomyuns.tifpsdku.com/syarat`.
2. Pastikan status aplikasi **In production** (menu *Audience*) agar semua akun Google bisa masuk.
3. Isi `GOOGLE_CLIENT_ID` di `.env`, lalu `docker compose up -d --build web`.

## Memastikan berjalan (uji asap)

```bash
docker compose ps                                              # tiga layanan healthy
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/syarat   # 200
docker compose logs api | tail -20      # "backend siap" dan "RAG: model embedding siap, mode hybrid"
```

Lalu buka `SITE_URL` di peramban: halaman masuk tampil, login Google berhasil, dan login administrator (tautan "Administrator? Masuk dengan email")
memakai `ADMIN_EMAIL` dan `ADMIN_PASSWORD`. Dashboard admin ada di `/admin`.

## Perawatan

```bash
docker compose logs -f api web                       # log
git pull && docker compose up -d --build             # pembaruan versi
# cadangan basis data (jadwalkan harian lewat cron) dan berkas unggahan
docker compose exec -T db pg_dump -U arnatomy arnatomy | gzip > arnatomy-$(date +%F).sql.gz
docker run --rm -v "$(basename "$PWD" | tr 'A-Z' 'a-z')_uploads":/data -v "$PWD":/cadangan alpine tar czf /cadangan/uploads-$(date +%F).tgz -C /data .
```

Pantau ketersediaan dengan layanan seperti UptimeRobot yang memanggil `https://<domain>/login` tiap 5 menit. Kontainer memulai ulang otomatis
(`restart: unless-stopped`).

## Pemecahan masalah

| Gejala | Penyebab umum |
| --- | --- |
| `docker compose up` menolak jalan: variabel wajib | `.env` belum diisi (`JWT_SECRET`, `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`) |
| Login berhasil lalu langsung keluar lagi | Situs dibuka lewat `http://` (cookie Secure ditolak); pakai HTTPS |
| Tombol Google tidak muncul | `GOOGLE_CLIENT_ID` kosong saat build; isi lalu bangun ulang `web` |
| Google: `origin_mismatch` | `SITE_URL` belum ada di *Authorized JavaScript origins* |
| Google: "Access blocked" | Aplikasi masih berstatus *Testing*; ubah ke *In production* atau tambahkan email di *Test users* |
| Asisten selalu menjawab "AI tidak tersedia" | `LLM_API_KEY` kosong atau kuota habis (HTTP 429, lihat `docker compose logs api`) |
| `api` tidak healthy, log menyebut model embedding | RAM kurang; set `RAG_EMBEDDING=off` |
| Unggah model 3D gagal | Batas ukuran Nginx (`client_max_body_size`) |

## Yang sudah dan belum teruji

Diuji di macOS (Docker Desktop, arm64): ketiga layanan sehat; daftar, login, katalog, asisten, kuis, simulasi, rakit organ, admin, unggah model;
beban 40 pengguna serentak pada PostgreSQL 16 (semua sukses). **Belum diuji:** Linux amd64/Ubuntu 22.04, HTTPS lewat Nginx,
login Google dari domain publik, dan beban di server kampus. Pada pemasangan pertama, jalankan uji asap di atas.

Dokumentasi lebih rinci backend: `backend/README.md` dan `backend/docs/DEPLOY.md`.
