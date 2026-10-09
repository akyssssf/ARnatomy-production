/* ==========================================================================
   token.ts — JWT (HS256) untuk manajemen sesi (SKPL Bab VIII). Access token
   berumur pendek, refresh token lebih panjang. Tiap token membawa "tv"
   (versi token pengguna): menaikkan users.token_versi (ganti sandi, keluar
   dari semua perangkat) langsung membatalkan semua token lama.
   ========================================================================== */
import { jwtVerify, SignJWT } from "jose";
import type { Konfigurasi } from "../config/env";

export type JenisToken = "access" | "refresh";
export interface IsiToken {
  sub: number;
  tv: number;
  jenis: JenisToken;
}

const ISSUER = "arnatomy-backend";
const kunci = (rahasia: string) => new TextEncoder().encode(rahasia);

export async function terbitkanToken(
  cfg: Pick<Konfigurasi, "JWT_SECRET" | "ACCESS_TTL_MENIT" | "REFRESH_TTL_HARI">,
  user: { id_user: number; token_versi: number },
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const buat = (jenis: JenisToken, detik: number) =>
    new SignJWT({ tv: user.token_versi, jenis })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(String(user.id_user))
      .setIssuer(ISSUER)
      .setIssuedAt()
      .setExpirationTime(`${detik}s`)
      .sign(kunci(cfg.JWT_SECRET));
  const accessDetik = cfg.ACCESS_TTL_MENIT * 60;
  const [access_token, refresh_token] = await Promise.all([
    buat("access", accessDetik),
    buat("refresh", cfg.REFRESH_TTL_HARI * 86400),
  ]);
  return { access_token, refresh_token, expires_in: accessDetik };
}

/** Memverifikasi tanda tangan, penerbit, kedaluwarsa, dan jenis token; null bila tidak sah. */
export async function bacaToken(
  cfg: Pick<Konfigurasi, "JWT_SECRET">,
  token: string,
  jenis: JenisToken,
): Promise<IsiToken | null> {
  try {
    const { payload } = await jwtVerify(token, kunci(cfg.JWT_SECRET), { issuer: ISSUER, algorithms: ["HS256"] });
    const sub = Number(payload.sub);
    if (!Number.isInteger(sub) || payload.jenis !== jenis || typeof payload.tv !== "number") return null;
    return { sub, tv: payload.tv, jenis };
  } catch {
    return null;
  }
}
