/* ==========================================================================
   kunci-query.ts — Query key terstruktur, satu tempat, agar invalidasi
   cache konsisten di seluruh hook.
   ========================================================================== */
export const KUNCI = {
  percakapan: ["percakapan"] as const,
  laporan: ["laporan"] as const,
  konten: ["konten"] as const,
  riwayat: ["riwayat"] as const,
  akun: ["akun"] as const,
  umpanBalik: ["umpan-balik"] as const,
  aset: ["aset"] as const,
};
