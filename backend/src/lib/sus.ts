/* sus.ts — Skor System Usability Scale (FR-15): butir ganjil = jawaban - 1, genap = 5 - jawaban; jumlah × 2,5. */
export const JUMLAH_BUTIR_SUS = 10;

export function hitungSkorSus(jawaban: readonly number[]): number {
  const total = jawaban.reduce((akum, nilai, i) => akum + (i % 2 === 0 ? nilai - 1 : 5 - nilai), 0);
  return Math.round(total * 2.5 * 10) / 10;
}
