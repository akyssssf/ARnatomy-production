# Checklist FR dan NFR SKPL v1.0 terhadap backend

Status: **Lengkap** = diimplementasikan dan diuji otomatis; **Sisi klien** = bukan tanggung jawab backend;
**Belum terbukti** = kode ada tetapi belum diuji di kondisi nyata.

| Kode | Kebutuhan | Backend | Status | Bukti |
| --- | --- | --- | --- | --- |
| FR-01 | Login email + password | `POST /v1/auth/login`, JWT, bcrypt; + Google, refresh, logout | Lengkap (Google Web diuji dengan token Google sungguhan; Android/iOS belum) | test/auth.test.ts |
| FR-02 | Registrasi (data diri, peran, sekolah) | `POST /v1/auth/register`; akun Google melengkapi profil | Lengkap | test/auth.test.ts |
| FR-03 | Model 3D AR | `GET /v1/organ`, `/organ/:id` memuat model aktif + bagian + layer | Backend lengkap; render AR **sisi klien** | test/katalog-konten.test.ts |
| FR-04 | Rotasi dan zoom | - | **Sisi klien** | - |
| FR-05 | Tampil/sembunyi layer | `GET /v1/organ/:id/layer` | Lengkap | test/katalog-konten.test.ts |
| FR-06 | Label dasar | `GET /v1/bagian/:id/konten?jenis=dasar` (hanya tervalidasi) | Lengkap | test/katalog-konten.test.ts |
| FR-07 | Label dimmed | `GET /v1/bagian/:id/konten?jenis=dimmed` | Lengkap | test/katalog-konten.test.ts |
| FR-08 | Asisten AI | `POST /v1/asisten/tanya`: RAG berbasis 4 buku (hybrid embedding + TF-IDF) → LLM → jawaban + sumber; cadangan lokal; batas 10/menit; `POST /v1/asisten/klasifikasi` | Lengkap; diuji dengan Gemini sungguhan dan embedding sungguhan | test/fitur.test.ts, rag.test.ts |
| FR-09 | Laporkan kesalahan | `POST /v1/laporan` | Lengkap | test/fitur.test.ts |
| FR-10 | Susun dan terbitkan konten | `POST/PATCH /v1/admin/konten` | Lengkap | test/keamanan.test.ts, katalog-konten.test.ts |
| FR-11 | Tindak lanjut laporan | `GET/PATCH /v1/admin/laporan` | Lengkap | test/fitur.test.ts |
| FR-12 | Kelola aset model 3D | `POST/DELETE /v1/admin/aset/:idOrgan` (.glb, ≤ 15 MB, object storage) | Lengkap (S3 diuji ke server S3-compatible) | test/aset.test.ts, integrasi-s3.test.ts |
| FR-13 | Kelola akun | `GET/POST/PATCH/DELETE /v1/admin/akun` | Lengkap | test/fitur.test.ts |
| FR-14 | Riwayat belajar | `POST/PATCH/GET /v1/riwayat` (durasi dari server) | Lengkap | test/fitur.test.ts |
| FR-15 | Umpan balik SUS | `POST /v1/umpan-balik`, ringkasan admin | Lengkap (belum ada responden nyata) | test/fitur.test.ts |
| FR-16 (tambahan revisi) | Kuis | `GET /v1/tugas`, `/tugas/:id` (soal tanpa kunci), `POST /v1/tugas/:id/percobaan` (dinilai server); admin: `/v1/admin/tugas`, `/admin/tugas/:id/soal`, `/admin/soal/:id` | Lengkap | test/tugas.test.ts |
| FR-17 (tambahan revisi) | Simulasi alur peredaran darah dan pernapasan | Langkah di `GET /v1/tugas/:id`; tantangan urutan dinilai server | Backend lengkap; animasi 3D **sisi klien** (diuji di peramban) | test/tugas.test.ts |
| FR-18 (tambahan revisi) | Rakit organ 3D | Bagian di `GET /v1/tugas/:id`; skor dari percobaan per bagian | Backend lengkap; ketepatan posisi 3D **dinilai klien** (server memeriksa kewajaran) | test/tugas.test.ts |
| FR-19 (tambahan revisi) | Login Google, profil, pilih sekolah | `POST /v1/auth/google`, `PATCH /v1/auth/profil` (NPSN atau teks bebas), `GET /v1/sekolah` (64.716 SMP/SMA/SMK) | Lengkap; Google diuji dengan akun nyata (web) | test/auth.test.ts, tugas.test.ts |
| NFR-01 | Autentikasi + bcrypt | bcrypt 12, JWT, RBAC, batas login, validasi, ORM terparameter | Lengkap | test/auth.test.ts, keamanan.test.ts |
| NFR-02 | Model 3D ≤ 5 detik | Berkas dari object storage/CDN, cache immutable | **Belum terbukti** (waktu muat di perangkat belum diukur) | - |
| NFR-03 | Android/iOS | API netral klien | Backend siap; **klien mobile belum ada** | - |
| NFR-04 | Uptime ≥ 99% | `/healthz`, `/readyz`, restart otomatis di compose | **Belum terbukti** (butuh masa uji coba) | - |
| NFR-05 | 40 pengguna serentak | bcrypt thread pool, katalog ringan | Uji lokal: 40 login median 1,0 s, semua sukses; **bukan pada VPS target** | `npm run uji-beban` |
| NFR-06 | Konten ditinjau sebelum terbit | Pengguna hanya melihat `tervalidasi`; hanya admin yang menerbitkan; AI hanya memakai konten tervalidasi | Lengkap | test/katalog-konten.test.ts |
| NFR-07 | Usabilitas (SUS ≥ 68) | Modul SUS + ringkasan | Modul lengkap; **belum ada responden** | test/fitur.test.ts |
| NFR-08 | Portabilitas | Docker Compose, konfigurasi env | Lengkap (dicek dengan `docker compose up --build`) | README |

Ringkasan: 13 FR lengkap di backend, 1 FR sisi klien (FR-04), FR-03 setengahnya sisi klien (render AR); FR-16 sampai FR-19 adalah tambahan revisi SKPL (tidak ada FR yang dikurangi);
NFR yang bergantung pengukuran di perangkat atau masa uji coba (NFR-02, NFR-04, NFR-07) belum bisa dibuktikan dari backend saja.
