/* ==========================================================================
   sesi-codec.ts — Enkode/dekode isi cookie sesi dengan tanda tangan HMAC.
   Format: base64url(JSON user) + "." + base64url(HMAC-SHA256(muatan, rahasia)).
   Cookie yang diubah di sisi klien gagal verifikasi dan dianggap tidak ada.
   Memakai Web Crypto (crypto.subtle) sehingga jalan di Route Handler, RSC,
   maupun proxy.ts. PROTOTIPE: bukan pengganti sesi server/JWT produksi.
   ========================================================================== */
import { envServer } from "./env";
import { type SesiUser, SesiUserSchema } from "./schemas";

export const NAMA_COOKIE = "arnatomy_sesi";
export const UMUR_COOKIE_DETIK = 60 * 60 * 8; // 8 jam

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

async function kunciHmac(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(envServer().SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function enkodeSesi(user: SesiUser): Promise<string> {
  const muatan = keBase64Url(enc.encode(JSON.stringify(user)));
  const tanda = new Uint8Array(await crypto.subtle.sign("HMAC", await kunciHmac(), enc.encode(muatan)));
  return `${muatan}.${keBase64Url(tanda)}`;
}

/** null bila cookie kosong, rusak, tanda tangan tidak cocok, atau bentuknya tidak lolos skema. */
export async function dekodeSesi(nilai: string | undefined): Promise<SesiUser | null> {
  if (!nilai) return null;
  const [muatan, tanda] = nilai.split(".");
  if (!muatan || !tanda) return null;
  try {
    const sah = await crypto.subtle.verify("HMAC", await kunciHmac(), dariBase64Url(tanda), enc.encode(muatan));
    if (!sah) return null;
    const teks = new TextDecoder().decode(dariBase64Url(muatan));
    const hasil = SesiUserSchema.safeParse(JSON.parse(teks));
    return hasil.success ? hasil.data : null;
  } catch {
    return null;
  }
}
