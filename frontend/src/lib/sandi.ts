/* ==========================================================================
   sandi.ts — Hashing kata sandi dengan PBKDF2-SHA256 (Web Crypto), garam
   acak 16 byte, 100.000 iterasi. Format simpan:
     pbkdf2-sha256$<iterasi>$<garam base64url>$<hash base64url>
   Kata sandi asli tidak pernah disimpan (NFR-01). Perbandingan hash memakai
   waktu konstan agar tidak bocor lewat timing. Tanpa dependensi native
   sehingga jalan di Route Handler maupun lingkungan uji.
   ========================================================================== */
const ALGORITMA = "pbkdf2-sha256";
const ITERASI = 100_000;
const PANJANG_GARAM = 16;
const PANJANG_HASH_BIT = 256;

const enc = new TextEncoder();

function keBase64Url(bytes: Uint8Array): string {
  let biner = "";
  for (const b of bytes) biner += String.fromCharCode(b);
  return btoa(biner).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function dariBase64Url(teks: string): Uint8Array<ArrayBuffer> {
  const b64 = teks
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(teks.length / 4) * 4, "=");
  const biner = atob(b64);
  const bytes = new Uint8Array(new ArrayBuffer(biner.length));
  for (let i = 0; i < biner.length; i += 1) bytes[i] = biner.charCodeAt(i);
  return bytes;
}

async function turunkan(sandi: string, garam: Uint8Array<ArrayBuffer>, iterasi: number): Promise<Uint8Array> {
  const kunci = await crypto.subtle.importKey("raw", enc.encode(sandi), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: garam, iterations: iterasi },
    kunci,
    PANJANG_HASH_BIT,
  );
  return new Uint8Array(bits);
}

function samaKonstan(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let beda = 0;
  for (let i = 0; i < a.length; i += 1) beda |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return beda === 0;
}

/** Menghasilkan string hash yang aman disimpan. */
export async function hashSandi(sandi: string): Promise<string> {
  const garam = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(PANJANG_GARAM)));
  const hash = await turunkan(sandi, garam, ITERASI);
  return `${ALGORITMA}$${ITERASI}$${keBase64Url(garam)}$${keBase64Url(hash)}`;
}

/** Benar bila `sandi` cocok dengan hash tersimpan; false untuk format yang tidak dikenal. */
export async function cekSandi(sandi: string, tersimpan: string): Promise<boolean> {
  const [algo, iterasiTeks, garamTeks, hashTeks] = tersimpan.split("$");
  const iterasi = Number(iterasiTeks);
  if (algo !== ALGORITMA || !Number.isInteger(iterasi) || iterasi < 1 || !garamTeks || !hashTeks) return false;
  const hash = await turunkan(sandi, dariBase64Url(garamTeks), iterasi);
  return samaKonstan(hash, dariBase64Url(hashTeks));
}
