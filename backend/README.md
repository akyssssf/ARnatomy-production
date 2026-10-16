# ARnatomy Backend

Backend REST API untuk aplikasi pembelajaran anatomi berbasis Augmented Reality **ARnatomy** (jantung dan paru-paru).
Dirancang mengikuti **SKPL v1.0**: 15 kebutuhan fungsional (FR), 8 kebutuhan non-fungsional (NFR), arsitektur three-tier,
kamus data Bab VI, dan kontrol keamanan Bab VIII (bcrypt, JWT, RBAC, ORM terparameter).

Kelompok *sukses lancar projekNYA*: Muhammad Akyas Febryansah (V3925029), Nehan Raki Alfawzi (V3925013), TI B,
D3 Teknik Informatika, Sekolah Vokasi UNS.

> Repositori ini hanya backend. Klien web ada di repositori terpisah (`Arnatomy`, mata kuliah lain); aplikasi
> mobile AR (Unity) pada SKPL belum dibangun. API tidak bergantung pada klien tertentu.

## Stack

| Lapisan | Pilihan | Alasan singkat |
| --- | --- | --- |
| Bahasa | TypeScript, Node.js 22+ | Sama dengan klien web; skema Zod bisa dipakai bersama |
| Framework HTTP | [Hono](https://hono.dev) | Kecil, berbasis Web `Request`/`Response`, mudah diuji tanpa membuka port |
| Basis data | PostgreSQL 16 lewat [Drizzle ORM](https://orm.drizzle.team) | Kueri terparameter (SKPL Bab VIII), migrasi terversi (`drizzle/`) |
| Dev & uji | PGlite (PostgreSQL WASM) | Berjalan tanpa instalasi PostgreSQL; datanya di `.data/` |
| Validasi | Zod 4 | Satu skema untuk validasi runtime dan tipe |
| Auth | JWT HS256 (`jose`) + bcrypt (`@node-rs/bcrypt`, cost 12) | Sesuai SKPL; bcrypt jalan di thread pool |
| Login Google | `google-auth-library` (OpenID Connect) | Android, iOS, web memakai endpoint yang sama |
| Asisten AI | **RAG berbasis buku** (hybrid embedding + TF-IDF, 412 chunk dari 4 buku PDF) + LLM lewat REST: Gemini (bawaan) / Groq / OpenRouter, Anthropic / OpenAI opsional, **Ollama (LLM lokal di server sendiri)**; jawaban cadangan lokal | Kontrak komponen AI dari tugas Sistem Cerdas (`data/rag/KONTRAK.md`); kunci API tidak pernah ke klien |
| Aset 3D | Object storage: lokal (dev) atau S3-compatible (R2/S3/MinIO) | SKPL Bab V.b: cloud storage |
| Mutu | Vitest + v8 coverage, Biome, GitHub Actions | Sama dengan praktik repositori klien |

Catatan: SKPL Bab V.c menyebut Laravel + MySQL. Framework bebas menurut ketentuan tugas; kontrol yang SKPL minta
(ORM/prepared statement, bcrypt, JWT, RBAC, REST) dipenuhi di sini. Perbedaan ini dicatat sebagai catatan revisi SKPL.

## Menjalankan

```bash
npm install
cp .env.example .env        # isi bila perlu; semua bagian opsional di mode pengembangan
npm run dev                 # http://localhost:4000 (PGlite + data demo, migrasi dan seed otomatis)
```

Akun demo (hanya bila `SEED_DEMO=true` dan bukan produksi): `siswa@arnatomy.id / siswa123`,
`guru@arnatomy.id / guru123`, `admin@arnatomy.id / admin123`.

Dengan PostgreSQL sungguhan: isi `DATABASE_URL=postgres://...` lalu `npm run db:migrate && npm run db:seed`
(migrasi dan seed juga berjalan otomatis saat server mulai). Satu perintah untuk backend + PostgreSQL:
`docker compose up --build` (butuh `JWT_SECRET` di `.env`).

Produksi: `NODE_ENV=production` mewajibkan `JWT_SECRET` (≥ 32 karakter) dan `DATABASE_URL`; akun demo tidak pernah
dibuat, admin awal dibuat dari `ADMIN_EMAIL` + `ADMIN_PASSWORD`.

Dokumentasi API (OpenAPI 3.1, dibangkitkan dari skema Zod dan diuji agar selalu sama dengan rute): `GET /openapi.json`.

Perintah lain: `npm test`, `npm run test:coverage`, `npm run lint`, `npm run typecheck`,
`npm run db:generate` (setelah mengubah `src/db/schema.ts`), `npm run uji-beban`.

## Endpoint

Semua di bawah `/v1`. Kecuali `/healthz`, `/readyz`, `/v1/auth/register|login|refresh|google` dan `/files/*`, token
dikirim sebagai `Authorization: Bearer <access_token>`. Galat berbentuk `{ "pesan": "...", "kode": "..." }`.

| FR | Endpoint | Peran |
| --- | --- | --- |
| FR-01 | `POST /auth/login`, `/auth/refresh`, `/auth/google`; `GET /auth/me`; `POST /auth/logout`, `/auth/logout-semua`, `/auth/ganti-sandi` | semua |
| FR-02 | `POST /auth/register`; `PATCH /auth/profil` (akun Google melengkapi peran + sekolah); `POST/DELETE /auth/tautkan/google` | User |
| FR-03 | `GET /organ`, `/organ/:id` (model aktif, bagian, layer); `GET /files/*` (mode lokal) | User |
| FR-04 | Dikerjakan di klien (rotasi dan zoom); backend hanya menyajikan model | - |
| FR-05 | `GET /organ/:id/layer` | User |
| FR-06, 07 | `GET /bagian/:id/konten?jenis=dasar\|dimmed` (hanya yang tervalidasi); `GET /bagian/:id` | User |
| FR-08 | `POST /asisten/tanya` (RAG + sumber buku, `jenjang` SMP/SMA); `POST /asisten/klasifikasi`; `GET /asisten/riwayat` | User |
| FR-09 | `POST /laporan`; `GET /laporan/saya` | User |
| FR-10 | `GET /admin/konten`; `POST /admin/konten` (susun label baru, draft); `PATCH /admin/konten/:id` (edit + terbitkan: `status_validasi`) | Admin |
| FR-11 | `GET /admin/laporan?status=`; `PATCH /admin/laporan/:id` | Admin |
| FR-12 | `GET /admin/aset`; `POST /admin/aset/:idOrgan` (multipart `berkas`, .glb ≤ 15 MB); `DELETE /admin/aset/:idOrgan` | Admin |
| FR-13 | `GET/POST /admin/akun`; `PATCH/DELETE /admin/akun/:id` | Admin |
| FR-14 | `POST /riwayat`; `PATCH /riwayat/:id/tutup`; `GET /riwayat` | User |
| FR-15 | `POST /umpan-balik`; `GET /umpan-balik/saya`; `GET /admin/umpan-balik`, `/admin/umpan-balik/ringkasan` | User / Admin |
| FR-16 s.d. FR-18 (tambahan revisi: kuis, simulasi alur, rakit organ) | `GET /tugas`, `/tugas/progres`, `/tugas/:id`; `POST /tugas/:id/percobaan`; admin: `GET /admin/tugas`, `POST /admin/tugas/:id/soal`, `PATCH/DELETE /admin/soal/:id` | User / Admin |
| FR-19 (tambahan revisi: profil dan sekolah) | `GET /sekolah?q=&bentuk=` (64.716 SMP/SMA/SMK dari `data/sekolah/sekolah.csv`); `PATCH /auth/profil` menerima `npsn` atau `asal_sekolah` bebas; `GET /konten` (semua label tervalidasi) | User |

Siswa dan guru adalah satu aktor *User* (SKPL Bab II.b): RBAC hanya dua peran hak akses, `User` dan `Admin`.
Peran siswa/guru tersimpan sebagai atribut profil (`users.role`) dan tidak membedakan hak akses.

## Asisten AI: RAG berbasis buku

Alur mengikuti `data/rag/KONTRAK.md` (hasil tugas Sistem Cerdas, ditulis ulang di TypeScript):
1. **Retrieve (hybrid):** peringkat embedding (`paraphrase-multilingual-MiniLM-L12-v2`, cosine) + peringkat TF-IDF digabung
   dengan Reciprocal Rank Fusion (`1/(60+peringkat)`), ambil 5 chunk teratas.
2. Bila jarak embedding chunk terdekat > **0,46**, jawab "belum ada di ARnatomy" tanpa memanggil LLM.
3. **Augment:** konteks `[no] teks` + pertanyaan masuk ke template prompt; gaya bahasa menurut `jenjang` (SMP bawaan, atau SMA).
4. **Generate:** LLM (temperature 0) menjawab maksimal 4 kalimat; prompt melarang menambah fakta di luar konteks.
5. **Sumber:** satu entri `{buku, halaman, cuplikan}` per buku + halaman; kosong bila ditolak.

Knowledge base: 412 chunk dari IPA SMP Kelas VIII, Biologi SMA Kelas XI, Buku Anatomi dan Fisiologi, dan Buku Ajar Gangguan
Sistem Pernafasan (`data/rag/knowledge_base.csv`, vektor di `embeddings.f32`). Teksnya berasal dari buku, jadi **simpan repositori
sebagai privat**.

Mode menurut sumber daya (`RAG_EMBEDDING`):

| Mode | RAM proses | Perilaku |
| --- | --- | --- |
| `q8` / `auto` (bawaan) | ±700 MB (kontainer Docker ±500–600 MB) | Hybrid penuh; model ±120 MB diunduh otomatis atau lewat `npm run rag:unduh-model` |
| `fp32` | ±1,2 GB | Paling setia pada model asli |
| `off` | kecil | TF-IDF saja untuk VPS 1 GB. Pencarian lebih lemah untuk kata sehari-hari, dan penolakan topik lain diserahkan ke LLM (skor TF-IDF di luar cakupan tumpang tindih dengan yang dalam cakupan) |

Selama model belum selesai dimuat, server tetap melayani memakai TF-IDF. Bukti kesetaraan dengan kode Python asli:
`npm run rag:evaluasi` (16 pertanyaan evaluasi) dan uji otomatis `test/rag.test.ts`:

| Pembanding | Hasil |
| --- | --- |
| TF-IDF vs scikit-learn (20 pertanyaan: 10 hasil teratas, jumlah hasil, skor) | Identik (selisih skor < 1e-12) |
| Embedding saja, query fp32 (angka kontrak Recall@1/3/5, MRR: 0,562 / 0,688 / 0,812 / 0,668) | 0,563 / 0,688 / 0,813 / 0,668 |
| Embedding saja, query q8 | 0,563 / 0,625 / 0,813 / 0,652 (kuantisasi menggeser satu pertanyaan) |
| Hybrid (query q8 atau fp32) | Recall@1/3/5 = 0,625 / 0,750 / 0,875; MRR 0,740, lebih baik dari embedding saja |

Catatan: set evaluasinya hanya 16 pertanyaan. Dari 11 pertanyaan di luar cakupan yang saya coba, 4 lolos batas jarak 0,46 dan
bergantung pada LLM untuk menolak (contoh: ginjal, lambung, otak); penolakan LLM ini bagian dari rancangan kontrak.

## Login Google (Android, iOS, web)

Klien mendapat **ID token** dari Google lalu mengirimnya ke `POST /v1/auth/google`; backend memverifikasi tanda tangan,
penerbit, audiens (`GOOGLE_CLIENT_IDS`), dan `email_verified`, lalu menerbitkan JWT miliknya sendiri.

- Android: Sign in with Google (Credential Manager). Buat OAuth client tipe **Android** (package name + SHA-1 untuk
  debug, release, dan Play App Signing) dan **Web**; gunakan Client ID Web sebagai `serverClientId` agar `aud` token cocok.
- iOS: Google Sign-In SDK (OAuth client tipe iOS). Web: Google Identity Services (OAuth client tipe Web).
- Isi semua Client ID yang dipakai, dipisah koma, di `GOOGLE_CLIENT_IDS`. Kosong = endpoint menjawab 503.
- Uji tanpa aplikasi klien: `python3 -m http.server 3000 --directory scripts`, buka `http://localhost:3000/uji-google.html`, isi Client ID, klik tombol Google. Halaman mengirim ID token (dengan nonce) ke backend dan menampilkan responsnya.
- Akun baru wajib melengkapi peran dan sekolah (`PATCH /auth/profil`); sebelum itu endpoint lain menjawab
  `403 PROFIL_BELUM_LENGKAP`.
- Email yang sudah terdaftar dengan kata sandi **tidak** ditautkan otomatis (mencegah pengambilalihan akun): pengguna masuk
  dengan kata sandi lalu memanggil `POST /auth/tautkan/google`. Akun admin tidak dapat masuk atau menautkan Google.

## Pemenuhan NFR (status jujur)

| NFR | Cara di backend | Status |
| --- | --- | --- |
| NFR-01 Keamanan | bcrypt cost 12, JWT berumur pendek + `token_versi` (pencabutan), RBAC, Zod, Drizzle terparameter, batas login (5 gagal/10 menit per email+IP, 20 per email), IP dari `X-Forwarded-For` hanya bila `TRUST_PROXY=true`, batas body 256 KB, nonce Google opsional, header keamanan, CORS whitelist | Diuji otomatis |
| NFR-02 Model 3D ≤ 5 detik | Berkas dilayani dari object storage/CDN dengan `Cache-Control: immutable`; URL berversi | Sisi server saja; waktu muat di perangkat belum diukur |
| NFR-03 Android/iOS | API REST/JSON tanpa sesi server, token di header | Backend netral; klien mobile belum dibangun |
| NFR-04 Uptime 99% | `/healthz`, `/readyz`, `restart: unless-stopped` di compose | Belum diukur (butuh masa uji coba) |
| NFR-05 40 pengguna | bcrypt di thread pool, katalog ringan. Uji lokal lewat Docker Compose (PostgreSQL 16, `UV_THREADPOOL_SIZE=8`, bcrypt cost 12, mesin pengembangan): 40 login serentak sukses semua, median 1,0 detik; 100 login median 2,5 detik; baca katalog 40 serentak median 56 ms. Paket gabungan (PostgreSQL 16, jaringan Docker, 40 serentak, semua sukses): login median 1,05 s, baca katalog 48 ms, cari sekolah 112 ms (indeks di memori; permintaan pertama setelah boot ±1 detik memuat 64 ribu sekolah), daftar tugas 20 ms, kirim kuis 24 ms | Bukan uji pada VPS target; atur `UV_THREADPOOL_SIZE` ≈ jumlah core |
| NFR-06 Akurasi konten | Pengguna hanya melihat konten `tervalidasi`; hanya admin yang menerbitkan; asisten hanya memakai konten tervalidasi | Diuji otomatis |
| NFR-07 SUS | Skor dihitung di server; ringkasan admin dibandingkan target 68 | Modul diuji; belum ada responden nyata |
| NFR-08 Portabilitas | `docker compose up --build` (API + PostgreSQL), konfigurasi lewat env, tanpa vendor lock-in | Compose dijalankan dan dicek: migrasi, 20 tabel, admin awal dari env, tanpa akun demo |

## Basis data

20 tabel (15 kamus data SKPL Bab VI + 4 tugas belajar + 1 sekolah; rincian: kamus data SKPL Bab VI + `aset_model` untuk FR-12 + `umpan_balik`, `sus_jawaban` untuk FR-15, dan tabel fakta/mesh
hasil pemecahan atribut multi-nilai): `users`, `organs`, `organ_fakta`, `sistem_organ`, `layers`, `aset_model`,
`body_parts`, `bagian_fakta`, `bagian_mesh`, `part_content`, `learning_history`, `ai_conversations`, `laporan_kesalahan`,
`umpan_balik`, `sus_jawaban`, ditambah `tugas`, `soal_kuis`, `langkah_simulasi`, `percobaan_tugas`, dan `sekolah` (tambahan revisi). Skema ada di `src/db/schema.ts`, migrasi di `drizzle/`, data awal di `src/db/seed-data.json`.
Kolom tambahan pada `users`: `google_sub`, `profil_lengkap`, `token_versi`, `npsn_sekolah`; `password_hash` boleh kosong bagi akun Google.

## Status verifikasi

| Bagian | Cara verifikasi | Hasil |
| --- | --- | --- |
| Seluruh fitur | 78 uji otomatis (Vitest, PGlite) + 2 uji integrasi S3 opsional | Lulus; coverage ±92% baris |
| PostgreSQL sungguhan | Seluruh suite dijalankan di PostgreSQL 16 (Docker) dengan `TEST_PG_URL=postgres://...` (satu database sementara per uji) | 70/70 lulus saat itu |
| Docker | `docker compose up --build`: API + PostgreSQL, login admin dari env, 20 tabel, akun demo tidak ada | Berjalan |
| Object storage S3 | `TEST_S3_ENDPOINT=... npx vitest run test/integrasi-s3.test.ts` terhadap server S3-compatible (RustFS, tanda tangan SigV4) | Lulus; kredensial salah menggagalkan uji (kontrol negatif) |
| Verifikasi ID token Google | Verifikator tiruan di uji otomatis; token Google sungguhan lewat `scripts/uji-google.html` (OAuth client tipe Web, origin `http://localhost:3000`, akun test user) | Lulus: `200` dengan JWT (9 Okt 2026). Client Android/iOS belum diuji (aplikasi mobile belum ada) |
| RAG hybrid sungguhan | Server dan `docker compose` dijalankan dengan model embedding q8 + Gemini + PostgreSQL: jawaban dan sumber sesuai contoh di kontrak (mis. Buku Anatomi hal. 32-33, IPA SMP hal. 57); pertanyaan ginjal dan jumlah tulang ditolak | Lulus |
| LLM sungguhan | Format Gemini/OpenAI-compatible dan Anthropic diuji dengan `fetch` tiruan; Gemini sungguhan dicoba dengan kunci Google AI Studio (9 Okt 2026): `gemini-3.5-flash` menjawab dalam ±3 detik. Nama model Google sering berganti (2.5-flash sudah tertutup bagi pengguna baru), ubah lewat `LLM_MODEL` | Lulus untuk Gemini; Groq/OpenRouter/Anthropic belum dicoba |
| Cloudflare R2 / AWS S3 | - | **Belum** (protokolnya sama dengan yang diuji) |

Menjalankan uji di PostgreSQL asli: `docker run -d --name pg-uji -e POSTGRES_PASSWORD=uji -p 55432:5432 postgres:16` lalu
`TEST_PG_URL=postgres://postgres:uji@localhost:55432/postgres npm test`.

## Yang belum atau tidak dilakukan

- Google Sign-In di perangkat Android/iOS belum diuji (aplikasi mobile belum ada).
- Pembatas laju disimpan di memori proses (cukup untuk satu server sesuai SKPL); butuh penyimpanan bersama bila banyak instance.
- URL berkas model dibaca langsung klien: bucket harus dapat dibaca publik atau lewat CDN (`STORAGE_PUBLIC_URL`).
- Notifikasi push (disebut SKPL Bab V.b) tidak diimplementasikan karena tidak ada FR/NFR yang memintanya.
- Admin belum bisa membuat organ/bagian tubuh baru lewat API (data master dari seed); SKPL hanya meminta kelola aset model, label, laporan, dan akun.

## Tim

Proyek kelompok *sukses lancar projekNYA*, Program Studi D3 Teknik Informatika, Sekolah Vokasi, Universitas Sebelas Maret (Kampus Kab. Madiun), kelas TI B:

- Muhammad Akyas Febryansah (V3925029)
- Nehan Raki Alfawzi (V3925013)

Riwayat commit mencatat kontribusi tiap orang menurut akun GitHub yang dipakai; pembagian tugas ada di [CONTRIBUTING.md](CONTRIBUTING.md).
