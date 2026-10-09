/* ==========================================================================
   sus.ts — Butir System Usability Scale (Brooke, 1996) dalam bahasa
   Indonesia, dipakai formulir FR-15 dan ringkasan admin. Butir ganjil
   bernada positif, butir genap bernada negatif (dibalik saat penskoran).
   ========================================================================== */
export const PERNYATAAN_SUS: readonly string[] = [
  "Saya ingin menggunakan ARnatomy ini lebih sering.",
  "Saya merasa ARnatomy ini tidak perlu dibuat serumit ini.",
  "Saya merasa ARnatomy ini mudah digunakan.",
  "Saya membutuhkan bantuan orang teknis untuk bisa memakai ARnatomy ini.",
  "Saya merasa fitur-fitur di ARnatomy ini terpadu dengan baik.",
  "Saya merasa ada terlalu banyak hal yang tidak konsisten di ARnatomy ini.",
  "Saya rasa kebanyakan orang akan cepat belajar memakai ARnatomy ini.",
  "Saya merasa ARnatomy ini merepotkan untuk dipakai.",
  "Saya merasa percaya diri saat memakai ARnatomy ini.",
  "Saya perlu mempelajari banyak hal dulu sebelum bisa memakai ARnatomy ini.",
];

export const SKALA_LIKERT: readonly { nilai: number; label: string }[] = [
  { nilai: 1, label: "Sangat tidak setuju" },
  { nilai: 2, label: "Tidak setuju" },
  { nilai: 3, label: "Netral" },
  { nilai: 4, label: "Setuju" },
  { nilai: 5, label: "Sangat setuju" },
];

/** Predikat skor SUS menurut skala adjektif Bangor dkk. (2009). */
export function predikatSus(skor: number): string {
  if (skor >= 85) return "Sangat baik";
  if (skor >= 72) return "Baik";
  if (skor >= 52) return "Cukup";
  return "Perlu perbaikan";
}
