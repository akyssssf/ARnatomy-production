/* /api/logout — hapus cookie sesi dan bersihkan data belajar pengguna.
   POST: dipanggil tombol Keluar (balasan JSON).
   GET ?alasan=nonaktif: dipakai layout saat akun dinonaktifkan admin di
   tengah sesi; cookie dibuang lalu dialihkan ke /login dengan pesan. */
import { NextResponse } from "next/server";
import { ambilSesi } from "@/lib/auth";
import { backendAktif } from "@/lib/backend";
import { bersihkanDataUser } from "@/lib/db";
import { hapusCookieSesi, keluarBackend } from "@/lib/rute-backend";

async function bersihkan(): Promise<void> {
  if (backendAktif()) return keluarBackend();
  const sesi = await ambilSesi();
  if (sesi) bersihkanDataUser(sesi.id_user);
}

export async function POST() {
  await bersihkan();
  const respons = NextResponse.json({ ok: true });
  return hapusCookieSesi(respons);
}

export async function GET(request: Request) {
  await bersihkan();
  const alasan = new URL(request.url).searchParams.get("alasan") === "nonaktif" ? "nonaktif" : "keluar";
  const tujuan = new URL("/login", request.url);
  tujuan.searchParams.set("auth_error", alasan);
  const respons = NextResponse.redirect(tujuan, 303);
  return hapusCookieSesi(respons);
}
