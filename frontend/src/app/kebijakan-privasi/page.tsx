/* Kebijakan Privasi (publik): dirujuk pada layar persetujuan Google OAuth dan footer aplikasi. */
import type { Metadata } from "next";
import { EMAIL_KONTAK, HalamanHukum } from "@/components/hukum/HalamanHukum";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description: "Data apa yang dikumpulkan ARnatomy, untuk apa, dan bagaimana menghapusnya.",
};

export default function KebijakanPrivasi() {
  return (
    <HalamanHukum judul="Kebijakan Privasi" diperbarui="9 Oktober 2026">
      <p>
        ARnatomy adalah aplikasi pembelajaran anatomi yang dikembangkan sebagai proyek mata kuliah. Halaman ini
        menjelaskan data apa yang kami simpan dan bagaimana kami memakainya.
      </p>
      <h2>Data yang kami kumpulkan</h2>
      <ul>
        <li>
          <strong>Akun Google:</strong> nama dan alamat email (dari proses Masuk dengan Google). Kami tidak menerima
          kata sandi Google dan tidak meminta akses ke Gmail, kontak, atau berkas Anda.
        </li>
        <li>
          <strong>Profil:</strong> peran (siswa atau guru) dan asal sekolah yang Anda pilih atau tulis sendiri.
        </li>
        <li>
          <strong>Aktivitas belajar:</strong> bagian organ yang dibuka beserta durasinya, hasil kuis dan simulasi (skor
          dan jawaban), serta laporan kesalahan konten dan kuesioner kegunaan (SUS) yang Anda kirim.
        </li>
        <li>
          <strong>Pertanyaan ke asisten AI</strong> beserta jawabannya.
        </li>
        <li>
          <strong>Data teknis:</strong> cookie sesi untuk menjaga Anda tetap masuk, dan catatan teknis server (waktu,
          alamat IP) untuk keamanan dan pembatasan percobaan masuk.
        </li>
      </ul>
      <h2>Untuk apa data dipakai</h2>
      <ul>
        <li>Mengenali Anda saat masuk dan menampilkan riwayat serta progres belajar Anda.</li>
        <li>Memberi pengelola gambaran penggunaan aplikasi dan menilai kegunaannya (skor SUS).</li>
        <li>Menjaga keamanan dan mencegah penyalahgunaan.</li>
      </ul>
      <p>Data tidak dijual dan tidak dipakai untuk iklan.</p>
      <h2>Layanan pihak ketiga</h2>
      <ul>
        <li>
          <strong>Google:</strong> untuk Masuk dengan Google.
        </li>
        <li>
          <strong>Penyedia model bahasa (saat ini Google Gemini):</strong> teks pertanyaan Anda kepada asisten AI
          dikirim ke layanan ini untuk menyusun jawaban. Nama dan email Anda tidak ikut dikirim. Mohon tidak menuliskan
          data pribadi di kolom pertanyaan.
        </li>
      </ul>
      <h2>Siapa yang dapat melihat data</h2>
      <p>
        Administrator aplikasi dapat melihat daftar akun (nama, email, peran, sekolah), laporan kesalahan, dan ringkasan
        kuesioner. Pengguna lain tidak dapat melihat data Anda.
      </p>
      <h2>Penyimpanan dan keamanan</h2>
      <p>
        Data disimpan di basis data server aplikasi. Akses memakai HTTPS, sesi memakai cookie yang tidak dapat dibaca
        skrip peramban, dan akses data dibatasi per pengguna. Tidak ada sistem yang sepenuhnya bebas risiko, tetapi kami
        berupaya menjaganya.
      </p>
      <h2>Menghapus data Anda</h2>
      <p>
        Anda dapat meminta penghapusan akun beserta riwayat belajarnya kapan saja dengan mengirim email ke{" "}
        <a href={`mailto:${EMAIL_KONTAK}`} className="underline underline-offset-2">
          {EMAIL_KONTAK}
        </a>{" "}
        dari alamat email akun Anda. Anda juga dapat mencabut akses aplikasi di pengaturan akun Google Anda. Data akan
        dihapus paling lambat 30 hari setelah permintaan.
      </p>
      <h2>Anak-anak</h2>
      <p>
        Aplikasi ditujukan bagi siswa SMP-SMA. Pengguna di bawah usia yang diizinkan hukum setempat sebaiknya memakai
        aplikasi dengan sepengetahuan orang tua atau guru.
      </p>
      <h2>Perubahan dan kontak</h2>
      <p>
        Kebijakan ini dapat diperbarui; tanggal perubahan terakhir tercantum di bagian atas halaman. Pertanyaan:{" "}
        <a href={`mailto:${EMAIL_KONTAK}`} className="underline underline-offset-2">
          {EMAIL_KONTAK}
        </a>
        .
      </p>
    </HalamanHukum>
  );
}
