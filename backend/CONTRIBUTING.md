# Berkontribusi

Repositori ini dikerjakan berdua. Setiap orang bekerja di cabang sendiri dengan akun GitHub-nya sendiri, lalu mengajukan Pull Request ke `main`
yang ditinjau anggota lain. Jangan menulis atau mengubah nama penulis commit atas nama orang lain.

## Alur kerja

```bash
git clone <url-repo> && cd arnatomy-backend
git switch -c fitur/nama-singkat
npm ci
npm run lint && npm run typecheck && npm test      # harus lulus sebelum PR
git commit -m "Pesan yang menjelaskan alasan perubahan"
git push -u origin fitur/nama-singkat              # lalu buka Pull Request
```

Uji berjalan tanpa instalasi basis data (PGlite). Rahasia (kunci LLM, JWT) hanya di `.env`, tidak pernah di-commit.

## Pekerjaan yang masih terbuka

| Pekerjaan | Keterangan |
| --- | --- |
| Periksa isi kuis dan simulasi | Materi di `src/db/tugas-data.ts`; cocokkan dengan buku dan koreksi bila ada yang kurang tepat. Tidak butuh pengetahuan backend mendalam. |
| Uji pengguna dan SUS | Minta teman sekelas memakai aplikasi, isi kuesioner SUS, catat temuan. |
| Pemasangan di server kampus | Ikuti `docs/DEPLOY.md` dan `arnatomy-deploy/README.md`, lalu catat hasilnya. |
| Admin organ/bagian | API untuk menambah organ dan bagian tubuh (saat ini lewat seed). |
| Penyimpanan bersama pembatas laju | Diperlukan bila aplikasi dijalankan lebih dari satu salinan. |
| Perbandingan LLM | Jalankan `npm run llm:bandingkan` dengan kunci Gemini dan Groq. |
