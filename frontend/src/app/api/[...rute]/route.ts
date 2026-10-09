/* Catch-all /api/* — endpoint yang tidak dikenal membalas JSON 404, bukan
   halaman HTML not-found, supaya klien API selalu menerima amplop {pesan}. */
import { galat } from "@/lib/api-util";

function tidakAda(request: Request) {
  const { pathname } = new URL(request.url);
  return galat(`endpoint ${request.method} ${pathname} tidak ditemukan.`, 404);
}

export const GET = tidakAda;
export const POST = tidakAda;
export const PUT = tidakAda;
export const PATCH = tidakAda;
export const DELETE = tidakAda;
