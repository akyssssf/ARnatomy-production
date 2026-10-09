/* ==========================================================================
   sandi.ts — Hash kata sandi dengan bcrypt (NFR-01, SKPL Bab VIII). Memakai
   @node-rs/bcrypt yang berjalan di thread pool, sehingga login serentak
   (NFR-05) tidak memblokir event loop. Cost 12 bawaan; diturunkan hanya di uji.
   ========================================================================== */
import { compare, hash } from "@node-rs/bcrypt";

export function hashSandi(sandi: string, cost = 12): Promise<string> {
  return hash(sandi, { cost });
}

export function cekSandi(sandi: string, hashTersimpan: string): Promise<boolean> {
  return compare(sandi, hashTersimpan).catch(() => false);
}
