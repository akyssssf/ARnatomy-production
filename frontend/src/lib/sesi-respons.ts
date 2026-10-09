/* Respons sukses masuk (login & registrasi): JSON {user} + cookie sesi httpOnly. */
import "server-only";
import { NextResponse } from "next/server";
import type { SesiUser } from "./schemas";
import { enkodeSesi, NAMA_COOKIE, UMUR_COOKIE_DETIK } from "./sesi-codec";

export async function responsMasuk(user: SesiUser, status = 200): Promise<NextResponse> {
  const respons = NextResponse.json({ user }, { status });
  respons.cookies.set(NAMA_COOKIE, await enkodeSesi(user), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: UMUR_COOKIE_DETIK,
    secure: process.env.NODE_ENV === "production",
  });
  return respons;
}
