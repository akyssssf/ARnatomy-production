/* Syarat Penggunaan (publik): dirujuk pada layar persetujuan Google OAuth dan footer aplikasi. */
import type { Metadata } from "next";
import Link from "next/link";
import { EMAIL_KONTAK, HalamanHukum } from "@/components/hukum/HalamanHukum";

export const metadata: Metadata = {
  title: "Syarat Penggunaan",
  description: "Ketentuan memakai aplikasi pembelajaran ARnatomy.",
};

export default function SyaratPenggunaan() {
  return (
    <HalamanHukum judul="Syarat Penggunaan" diperbarui="9 Oktober 2026">
      <h2>Tujuan aplikasi</h2>
      <p>
        ARnatomy adalah alat bantu belajar anatomi sistem peredaran darah dan pernapasan untuk siswa SMP-SMA dan guru
        Biologi. Aplikasi ini dikembangkan sebagai proyek mata kuliah dan masih dalam tahap pengujian.
      </p>
      <h2>Bukan nasihat medis</h2>
      <p>
        Isi aplikasi, termasuk jawaban asisten AI, ditujukan untuk belajar, bukan untuk diagnosis atau pengobatan.
        Jawaban AI dapat keliru; periksa kembali pada buku acuan yang dicantumkan dan laporkan kesalahan lewat fitur
        laporan. Untuk masalah kesehatan, hubungi tenaga kesehatan.
      </p>
      <h2>Penggunaan yang wajar</h2>
      <ul>
        <li>Gunakan akun Anda sendiri dan jangan membagikan akses kepada orang lain.</li>
        <li>Jangan mencoba merusak, membebani berlebihan, atau mengakses data pengguna lain.</li>
        <li>
          Jangan menulis data pribadi atau konten yang melanggar hukum pada kolom pertanyaan, laporan, atau komentar.
        </li>
      </ul>
      <h2>Ketersediaan</h2>
      <p>
        Layanan disediakan apa adanya tanpa jaminan ketersediaan. Fitur dapat berubah atau dihentikan, dan akun dapat
        dinonaktifkan bila melanggar syarat ini.
      </p>
      <h2>Materi dan model 3D</h2>
      <p>
        Model 3D bersumber dari HuBMAP Human Reference Atlas (lisensi CC BY 4.0). Materi asisten AI merujuk pada buku
        acuan yang dicantumkan di setiap jawaban.
      </p>
      <h2>Data pribadi dan kontak</h2>
      <p>
        Lihat{" "}
        <Link href="/kebijakan-privasi" className="underline underline-offset-2">
          Kebijakan Privasi
        </Link>
        . Pertanyaan:{" "}
        <a href={`mailto:${EMAIL_KONTAK}`} className="underline underline-offset-2">
          {EMAIL_KONTAK}
        </a>
        .
      </p>
    </HalamanHukum>
  );
}
