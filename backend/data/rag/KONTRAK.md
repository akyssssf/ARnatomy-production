# Kontrak Komponen AI ARnatomy (LLM + RAG)

Project: ARnatomy (Tim Sukses Lancar ProjekNYA). Dibuat dengan Python
3.13.15. Pasang library dengan `pip install -r requirements.txt`.
Salin `.env.example` menjadi `.env`, lalu isi GROQ_API_KEY milik tim backend
(API key tidak boleh ada di aplikasi AR/mobile).

## 1. RAG: Tanya Jawab Anatomi Berdasarkan Buku PDF
Cakupan: Sistem Peredaran Darah, Sistem Pernapasan.

File: folder `data/vectordb` (vector database ChromaDB, collection
`arnatomy_pdf`, 412 chunk), `models/konfigurasi_rag_arnatomy.json`
(seluruh pengaturan), dan `data/processed/knowledge_base_pdf.csv` (isi chunk).

Knowledge base dibangun dari (chunk 60 kata,
tumpang tindih 15 kata):
- `ipa_smp.pdf` (IPA SMP Kelas VIII), halaman PDF 53-66, 67-83
- `sirkulasi_sma.pdf` (Biologi SMA Kelas XI), halaman PDF 105-142
- `Buku Anatomi dan Fisiologi Tubuh Manusia (1).pdf` (Buku Anatomi dan Fisiologi), halaman PDF 27-34, 53-60
- `BUKU_GG SISTEM PERNAFASAN.pdf` (Buku Ajar Gangguan Sistem Pernafasan), halaman PDF 11-100

### Persiapan saat server dinyalakan (sekali)
- Buka collection `arnatomy_pdf` di folder `data/vectordb` dengan embedding
  `paraphrase-multilingual-MiniLM-L12-v2`.
- Baca `data/processed/knowledge_base_pdf.csv`, lalu bangun `TfidfVectorizer(stop_words=stopword)`
  dari kolom `teks` (daftar `stopword` ada di konfigurasi).

### Alur yang harus dijalankan backend untuk setiap pertanyaan
1. **Retrieve (hybrid):**
   a. Urutkan SEMUA chunk dengan ChromaDB (jarak cosine) -> peringkat embedding.
   b. Hitung cosine similarity TF-IDF pertanyaan vs semua chunk; urutkan chunk dengan
      skor > 0 -> peringkat TF-IDF.
   c. Skor setiap chunk = jumlah `1 / (60 + peringkat)` dari a dan b
      (Reciprocal Rank Fusion). Ambil 5 chunk dengan skor tertinggi.
2. Jika jarak embedding chunk TERDEKAT (peringkat 1 di langkah 1a) > 0.46: langsung jawab
   "Maaf, materi itu belum ada di ARnatomy. Saat ini baru tersedia sistem peredaran darah dan sistem pernapasan." tanpa memanggil LLM.
3. **Augment:** susun konteks, satu chunk per baris dengan format
   `[{no}] {teks}` (nomor urut mulai 1, tanpa nama buku), lalu isi
   `template_prompt` dengan konteks, pertanyaan, dan pesan tidak ada.
4. **Generate:** isi `{jenjang}` pada `system_prompt` dengan
   `jenjang[<pilihan siswa>]` dan `{tidak_ada}` dengan `pesan_tidak_ada` (pilihan: SMP, SMA; default
   SMP), lalu kirim ke `openai/gpt-oss-20b` di `https://api.groq.com/openai/v1/`
   dengan temperature 0, max_tokens 2000,
   reasoning_effort low.
5. **Sumber:** jika jawaban tidak memuat "belum ada di ARnatomy", susun `sumber`
   dari metadata chunk hasil Retrieve (buku = `singkat`, `halaman`, `cuplikan` =
   200 karakter pertama teks chunk), satu entri per buku + halaman.
   Jika ditolak, `sumber` = `[]`.

### Format input dan output (JSON)
- Input: `{"pertanyaan": str, "jenjang": "SMP" | "SMA"}`
- Output: `{"jawaban": str, "sumber": [{"buku": str, "halaman": int, "cuplikan": str}], "jenjang": str}`

### Tampilan di aplikasi
- `jawaban` ditampilkan di bubble chat. Jawaban sudah bersih dari nama buku dan halaman.
- `sumber` ditampilkan di bawah bubble sebagai dropdown **"Sumber jawaban (n)"**
  yang tertutup secara default. Jika `sumber` kosong, dropdown tidak ditampilkan.

### Hasil evaluasi Hari 2 (16 pertanyaan)
```json
{
  "Recall@1": 0.562,
  "Recall@3": 0.688,
  "Recall@5": 0.812,
  "MRR": 0.668
}
```

### Contoh input dan output
Input:
```json
{
  "pertanyaan": "Bagaimana jalur peredaran darah kecil?",
  "jenjang": "SMP"
}
```
Output:
```json
{
  "jawaban": "Peredaran darah kecil dimulai ketika darah rendah oksigen masuk ke bilik kanan jantung. Jantung memompa darah itu lewat arteri pulmonalis ke paru‑paru. Di paru‑paru, karbon dioksida dilepaskan dan oksigen diserap. Darah kaya oksigen kemudian kembali ke jantung lewat vena pulmonalis.",
  "sumber": [
    {
      "buku": "Buku Anatomi dan Fisiologi",
      "halaman": 33,
      "cuplikan": "dari kepala dan lengan menuju jantung. Kedua, vena cava inferior yang membawa darah dari perut dan kaki menuju jantung. Jadi, peredaran darah besar bekerja dari jantung ke seluruh tubuh, kemudian kemb..."
    },
    {
      "buku": "Buku Anatomi dan Fisiologi",
      "halaman": 32,
      "cuplikan": "dioksida ke paru-paru. Bilik kiri perannya memompa darah yang mengandung oksigen ke seluruh tubuh. Sistem peredaran darah manusia terbagi dua, yaitu peredaran darah besar dan peredaran kecil...."
    },
    {
      "buku": "IPA SMP Kelas VIII",
      "halaman": 57,
      "cuplikan": "Bagaimana cara darah beredar ke seluruh tubuh? Coba perhatikan Gambar 1.22. Sistem peredaran darah manusia adalah sistem peredaran darah ganda, artinya darah dua kali melewati jantung. Pertama melalui..."
    }
  ],
  "jenjang": "SMP"
}
```
Input:
```json
{
  "pertanyaan": "Kenapa perokok mudah terkena gangguan paru-paru?",
  "jenjang": "SMA"
}
```
Output:
```json
{
  "jawaban": "Perokok sering mengalami gangguan paru-paru karena asap rokok menurunkan jumlah oksigen yang diantarkan darah; darah perokok mengandung lebih sedikit oksigen dibandingkan yang tidak merokok.  \nAsap rokok merusak silia di saluran pernapasan, sehingga dahak tidak dapat bersih keluar dan menumpuk, meningkatkan risiko infeksi dan bronkitis kronis.  \nKarbon monoksida yang tinggi di dalam darah memicu detak jantung meningkat dan menekan sistem peredaran darah, sehingga paru-paru harus bekerja lebih keras.  \nAkumulasi bahan kimia berbahaya ini membuat perokok lebih rentan terhadap penyakit paru-paru kronis seperti PPOK dan infeksi paru-paru yang berlangsung lama.",
  "sumber": [
    {
      "buku": "Biologi SMA Kelas XI",
      "halaman": 123,
      "cuplikan": "infeksi akan lebih tinggi. Perokok akan mudah batuk-batuk dan produksi dahak berlebihan. Akibat tidak berfungsinya silia, perokok aktif lebih berisiko tinggi terkena bronkitis kronis atau infeksi pada..."
    },
    {
      "buku": "Buku Ajar Gangguan Sistem Pernafasan",
      "halaman": 51,
      "cuplikan": "tersebut mempengaruhi timbulnya PPOK tidak diketahui. Faktor Lingkungan: Asap tembakau Merokok merupakan faktor resiko utama. Perokok sigaret mempunyai prevalensi yang tinggi kelainan faal paru, keluh..."
    },
    {
      "buku": "IPA SMP Kelas VIII",
      "halaman": 81,
      "cuplikan": "kesehatan. Penyakit Jantung Berapa pun usia Anda, menjadi perokok pasif berisiko terkena penyakit jantung dan stroke. Kanker Paru-Paru Perokok pasif berisiko terkena kanker paru-paru terutama jika tin..."
    },
    {
      "buku": "IPA SMP Kelas VIII",
      "halaman": 75,
      "cuplikan": "menyebabkan jumlah oksigen yang diantarkan darah ke seluruh tubuh menjadi berkurang. Untuk mendapatkan tambahan oksigen, perokok akan bernapas lebih berat dan detak jantung pun akan meningkat. Kadar k..."
    }
  ],
  "jenjang": "SMA"
}
```
Input:
```json
{
  "pertanyaan": "Apa fungsi lambung dalam pencernaan?",
  "jenjang": "SMP"
}
```
Output:
```json
{
  "jawaban": "Maaf, materi itu belum ada di ARnatomy. Saat ini baru tersedia sistem peredaran darah dan sistem pernapasan.",
  "sumber": [],
  "jenjang": "SMP"
}
```

## 2. LLM Classification: Sistem Organ dari Pertanyaan Siswa
File: `models/konfigurasi_klasifikasi_arnatomy.json`. Mode final: zero-shot
(akurasi evaluation set 100%). Dipakai aplikasi AR untuk
memilih model 3D (jantung/paru-paru) atau menolak pertanyaan di luar cakupan.

### Alur yang harus dijalankan backend untuk setiap input
1. Isi `template_prompt` dengan `instruksi`, `contoh`, dan pertanyaan siswa.
2. Kirim sebagai pesan role `user` ke `openai/gpt-oss-20b` (temperature
   0, max_tokens 2000).
3. Ambil kategori pertama dari ['Peredaran Darah', 'Pernapasan', 'Di luar cakupan'] yang muncul di jawaban
   (huruf besar/kecil tidak dibedakan). Jika tidak ada, hasilnya
   "Lainnya".

### Contoh input dan output
Input:
```json
{
  "pertanyaan": "Kenapa detak jantung bisa diraba di pergelangan tangan?"
}
```
Output:
```json
{
  "kategori": "Peredaran Darah"
}
```
Input:
```json
{
  "pertanyaan": "Apa itu bronkitis?"
}
```
Output:
```json
{
  "kategori": "Pernapasan"
}
```
Input:
```json
{
  "pertanyaan": "Bagaimana mata bisa melihat warna?"
}
```
Output:
```json
{
  "kategori": "Di luar cakupan"
}
```
