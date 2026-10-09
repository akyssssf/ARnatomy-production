/* ==========================================================================
   proxy.ts — Berjalan di server SEBELUM halaman dirender (Next.js 16 mengganti
   nama konvensi `middleware.ts` menjadi `proxy.ts`; isinya sama).

   Dua tugas:
   1. Proteksi rute berbasis cookie sesi (ditandatangani HMAC):
      - rute terproteksi tanpa sesi  -> /login?auth_error=1&next=<rute>
      - /admin oleh peran non-admin  -> /beranda?pesan=khusus-admin
      - /login & /daftar saat sudah masuk -> /beranda | /admin
   2. Content Security Policy per permintaan dengan nonce acak, dikirim lewat
      header `x-nonce` agar skrip inline Next.js ikut diberi nonce (mitigasi XSS).
   ========================================================================== */
import { type NextRequest, NextResponse } from "next/server";
import { dekodeSesi, NAMA_COOKIE } from "@/lib/sesi-codec";

const RUTE_TERPROTEKSI = [
  "/beranda",
  "/eksplorasi",
  "/tugas",
  "/profil",
  "/asisten",
  "/riwayat",
  "/umpan-balik",
  "/admin",
  "/lengkapi-profil",
];
const RUTE_TAMU = ["/login", "/daftar"];

function buatCsp(nonce: string): string {
  const dev = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    /* 'wasm-unsafe-eval' untuk decoder Meshopt (WebAssembly) pada penampil 3D;
       'unsafe-eval' hanya di dev untuk HMR/React Refresh */
    /* 'unsafe-inline' https: http: hanya cadangan untuk peramban lama; peramban
       yang paham nonce + 'strict-dynamic' mengabaikannya */
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'${dev ? " 'unsafe-eval'" : ""} 'unsafe-inline' https: http:`,
    "style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self' https://accounts.google.com${dev ? " ws: wss:" : ""}`,
    "frame-src https://accounts.google.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sesi = await dekodeSesi(request.cookies.get(NAMA_COOKIE)?.value);
  const terproteksi = RUTE_TERPROTEKSI.some((r) => pathname === r || pathname.startsWith(`${r}/`));

  if (terproteksi && !sesi) {
    const tujuan = new URL("/login", request.url);
    tujuan.searchParams.set("auth_error", "1");
    tujuan.searchParams.set("next", pathname);
    const respons = NextResponse.redirect(tujuan);
    respons.cookies.delete(NAMA_COOKIE); // cookie rusak/kedaluwarsa ikut dibersihkan
    return respons;
  }
  if (pathname.startsWith("/admin") && sesi && sesi.role !== "admin") {
    const tujuan = new URL("/beranda", request.url);
    tujuan.searchParams.set("pesan", "khusus-admin");
    return NextResponse.redirect(tujuan);
  }
  if (RUTE_TAMU.includes(pathname) && sesi) {
    return NextResponse.redirect(new URL(sesi.role === "admin" ? "/admin" : "/beranda", request.url));
  }

  /* CSP dengan nonce: header permintaan x-nonce dibaca Next untuk skrip inline-nya */
  const nonce = btoa(crypto.randomUUID());
  const csp = buatCsp(nonce);
  const headerPermintaan = new Headers(request.headers);
  headerPermintaan.set("x-nonce", nonce);
  headerPermintaan.set("content-security-policy", csp);
  const respons = NextResponse.next({ request: { headers: headerPermintaan } });
  respons.headers.set("content-security-policy", csp);
  return respons;
}

export const config = {
  matcher: [
    /* Semua rute halaman & API, kecuali aset statis dan berkas publik */
    {
      source: "/((?!_next/static|_next/image|favicon.ico|models/|img/|.*\\.(?:webp|png|svg|glb|woff2)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
