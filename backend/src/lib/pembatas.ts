/* ==========================================================================
   pembatas.ts — Pembatas laju di memori proses (satu server, sesuai SKPL Bab
   V.c). Dipakai untuk percobaan login gagal dan batas pertanyaan Asisten AI.
   Bila kelak ada banyak instance, ganti dengan penyimpanan bersama (mis. Redis).
   ========================================================================== */
interface Catatan {
  jumlah: number;
  mulai: number;
}

export class PembatasLaju {
  private readonly peta = new Map<string, Catatan>();
  constructor(
    private readonly batas: number,
    private readonly jendelaMs: number,
  ) {}

  private aktif(kunci: string, kini: number): Catatan | null {
    const c = this.peta.get(kunci);
    if (!c) return null;
    if (kini - c.mulai >= this.jendelaMs) {
      this.peta.delete(kunci);
      return null;
    }
    return c;
  }

  /** Sisa detik blokir bila sudah mencapai batas, selain itu 0. */
  sisaBlokir(kunci: string, kini = Date.now()): number {
    const c = this.aktif(kunci, kini);
    if (!c || c.jumlah < this.batas) return 0;
    return Math.max(1, Math.ceil((c.mulai + this.jendelaMs - kini) / 1000));
  }

  /** Mencatat satu kejadian; mengembalikan sisa jatah sebelum diblokir. */
  catat(kunci: string, kini = Date.now()): number {
    const c = this.aktif(kunci, kini) ?? { jumlah: 0, mulai: kini };
    c.jumlah += 1;
    this.peta.set(kunci, c);
    return Math.max(0, this.batas - c.jumlah);
  }

  hapus(kunci: string): void {
    this.peta.delete(kunci);
  }
}
