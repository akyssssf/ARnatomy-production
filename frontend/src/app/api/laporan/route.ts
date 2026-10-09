/* GET  /api/laporan — daftar laporan (khusus admin, FR-11)
   POST /api/laporan — kirim laporan kesalahan konten (FR-09) */
import { NextResponse } from "next/server";
import { bacaBody, galat, wajibSesi } from "@/lib/api-util";
import { backendAktif } from "@/lib/backend";
import { jeda, kontenById, semuaLaporan, tambahLaporan } from "@/lib/db";
import { terus } from "@/lib/rute-backend";
import { LaporanFormSchema, OpsiSimulasiSchema } from "@/lib/schemas";

export async function GET() {
  const auth = await wajibSesi(["admin"]);
  if (!auth.ok) return auth.respons;
  if (backendAktif()) return terus("/v1/admin/laporan");
  await jeda(600);
  return NextResponse.json(semuaLaporan());
}

export async function POST(request: Request) {
  const auth = await wajibSesi();
  if (!auth.ok) return auth.respons;
  const body = await bacaBody(request, LaporanFormSchema.extend(OpsiSimulasiSchema.shape));
  if (!body.ok) return body.respons;

  await jeda(700);
  if (body.data.simulasiGagal) return galat("simulasi kegagalan pengiriman laporan ke server.", 503);
  if (backendAktif()) {
    const { simulasiGagal: _s, ...kirim } = body.data;
    return terus("/v1/laporan", { json: kirim }, undefined, 201);
  }
  if (!kontenById(body.data.id_konten)) return galat("konten yang dilaporkan tidak ditemukan.", 404);

  return NextResponse.json(tambahLaporan(auth.sesi.id_user, body.data.id_konten, body.data.deskripsi_laporan), {
    status: 201,
  });
}
