/* google.ts — Verifikasi ID token Google (OpenID Connect) memakai google-auth-library:
   tanda tangan (JWKS Google), penerbit, kedaluwarsa, dan audiens (daftar Client ID Web/Android/iOS). */
import { OAuth2Client } from "google-auth-library";
import type { IdentitasGoogle, VerifikatorGoogle } from "./konteks";

export function buatVerifikatorGoogle(clientIds: string[]): VerifikatorGoogle {
  const klien = new OAuth2Client();
  return async (idToken): Promise<IdentitasGoogle | null> => {
    if (clientIds.length === 0) return null;
    try {
      const tiket = await klien.verifyIdToken({ idToken, audience: clientIds });
      const p = tiket.getPayload();
      if (!p?.sub || !p.email) return null;
      return { sub: p.sub, email: p.email, email_verified: p.email_verified === true, name: p.name, nonce: p.nonce };
    } catch {
      return null;
    }
  };
}
