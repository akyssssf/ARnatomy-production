/* ==========================================================================
   format.ts — Pemformat waktu dan durasi (id-ID). Aman dipakai di server
   maupun klien.
   ========================================================================== */
const formatterWaktu = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

export function formatWaktu(iso: string): string {
  return formatterWaktu.format(new Date(iso));
}

export function formatDurasi(detik: number): string {
  if (!detik) return "-";
  if (detik < 60) return `${detik} detik`;
  return `${Math.floor(detik / 60)} menit ${detik % 60} detik`;
}

export function sapaan(jam: number): string {
  if (jam < 11) return "Selamat pagi";
  if (jam < 15) return "Selamat siang";
  if (jam < 19) return "Selamat sore";
  return "Selamat malam";
}

/** Ukuran berkas ringkas: KB di bawah 1 MB, selain itu MB satu desimal. */
export function formatUkuran(byte: number): string {
  return byte >= 1024 * 1024 ? `${(byte / 1024 / 1024).toFixed(1)} MB` : `${Math.round(byte / 1024)} KB`;
}
