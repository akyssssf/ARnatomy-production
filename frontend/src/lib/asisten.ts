/* ==========================================================================
   asisten.ts — Menyusun jawaban kontekstual Asisten AI (FR-08) di server.
   Jawaban dirakit dari basis pengetahuan berdasarkan kata kunci pertanyaan
   dan bagian tubuh yang dipilih sebagai konteks.
   ========================================================================== */
import "server-only";
import { pengetahuan_ai } from "./data";
import { kontenBagian } from "./db";
import type { BodyPart } from "./schemas";

export function susunJawaban(pertanyaan: string, bagian: BodyPart | null): string {
  const teks = pertanyaan.toLowerCase();
  const basis = bagian ? pengetahuan_ai[String(bagian.id_bagian)] : undefined;

  if (!bagian || !basis) {
    return (
      "Untuk saat ini aku baru menguasai materi jantung (sistem peredaran darah) dan paru-paru " +
      "(sistem pernapasan). Pilih salah satu bagiannya pada daftar konteks, lalu ajukan pertanyaannya lagi."
    );
  }

  const potongan: string[] = [];
  if (/fungsi|guna|tugas|kerja|peran|untuk apa/.test(teks)) potongan.push(basis.fungsi);
  if (/letak|dimana|di mana|posisi|lokasi/.test(teks)) potongan.push(basis.letak);
  if (/gangguan|penyakit|kelainan|masalah|sakit/.test(teks)) potongan.push(basis.gangguan);
  if (/beda|perbedaan|banding|dibanding/.test(teks)) {
    potongan.push(
      bagian.id_organ === 2
        ? "Bedanya, paru kanan punya tiga lobus dan lebih besar, sedangkan paru kiri hanya dua lobus karena berbagi ruang dengan jantung."
        : "Bedanya terletak pada tujuan aliran darah: sisi kanan jantung mengurus perjalanan ke paru-paru, sedangkan sisi kiri mengurus perjalanan ke seluruh tubuh.",
    );
  }
  if (!potongan.length) potongan.push(basis.fungsi, basis.ringkas);

  const dimmed = kontenBagian(bagian.id_bagian, "dimmed");
  const catatan = dimmed
    ? ` Untuk penjelasan lanjutan, buka label redup "${dimmed.judul_tampil}" pada bagian ini di halaman Eksplorasi.`
    : " Bagian lain pada model bisa dibuka untuk perbandingan.";

  return `Tentang ${bagian.nama_bagian_internal}: ${potongan.join(" ")}${catatan}`;
}
