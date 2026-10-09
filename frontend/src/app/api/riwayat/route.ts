/* GET  /api/riwayat — riwayat belajar pengguna aktif
   POST /api/riwayat — catat pembukaan label (FR-14) */
import { NextResponse } from "next/server";
import { bacaBody, galat, wajibSesi } from "@/lib/api-util";
import { backendAktif } from "@/lib/backend";
import { bagianById } from "@/lib/data";
import { catatRiwayat, jeda, riwayatUser } from "@/lib/db";
import { terus } from "@/lib/rute-backend";
import { CatatRiwayatSchema } from "@/lib/schemas";
import { riwayatUser as riwayatUserSumber } from "@/lib/sumber";

export async function GET() {
  const auth = await wajibSesi();
  if (!auth.ok) return auth.respons;
  if (backendAktif()) return NextResponse.json(await riwayatUserSumber(auth.sesi.id_user));
  await jeda(300);
  return NextResponse.json(riwayatUser(auth.sesi.id_user));
}

export async function POST(request: Request) {
  const auth = await wajibSesi();
  if (!auth.ok) return auth.respons;
  const body = await bacaBody(request, CatatRiwayatSchema);
  if (!body.ok) return body.respons;
  if (backendAktif()) return terus("/v1/riwayat", { json: body.data }, undefined, 201);
  if (!bagianById(body.data.id_bagian)) return galat("bagian tubuh tidak ditemukan.", 404);
  return NextResponse.json(catatRiwayat(auth.sesi.id_user, body.data.id_bagian, body.data.jenis_konten), {
    status: 201,
  });
}
