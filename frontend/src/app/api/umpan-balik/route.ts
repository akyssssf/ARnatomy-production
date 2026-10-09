/* /api/umpan-balik — kuesioner SUS (FR-15).
   GET: admin melihat semua kiriman; pengguna biasa melihat kirimannya sendiri.
   POST: pengguna mengirim 10 jawaban Likert (+ komentar), skor dihitung server. */
import { NextResponse } from "next/server";
import { bacaBody, wajibSesi } from "@/lib/api-util";
import { backendAktif } from "@/lib/backend";
import { jeda, semuaUmpanBalik, tambahUmpanBalik, umpanBalikUser } from "@/lib/db";
import { terus } from "@/lib/rute-backend";
import { UmpanBalikFormSchema } from "@/lib/schemas";
import { semuaUmpanBalik as semuaUmpanBalikSumber, umpanBalikUser as umpanBalikUserSumber } from "@/lib/sumber";

export async function GET() {
  const auth = await wajibSesi();
  if (!auth.ok) return auth.respons;
  if (backendAktif()) {
    if (auth.sesi.role === "admin") return NextResponse.json(await semuaUmpanBalikSumber());
    const milik = await umpanBalikUserSumber(auth.sesi.id_user);
    return NextResponse.json(milik ? [milik] : []);
  }
  await jeda(300);
  if (auth.sesi.role === "admin") return NextResponse.json(semuaUmpanBalik());
  const milik = umpanBalikUser(auth.sesi.id_user);
  return NextResponse.json(milik ? [milik] : []);
}

export async function POST(request: Request) {
  const auth = await wajibSesi();
  if (!auth.ok) return auth.respons;
  const body = await bacaBody(request, UmpanBalikFormSchema);
  if (!body.ok) return body.respons;

  if (backendAktif()) return terus("/v1/umpan-balik", { json: body.data }, undefined, 201);
  await jeda(500);
  const entri = tambahUmpanBalik(auth.sesi.id_user, body.data.jawaban, body.data.komentar ?? null);
  return NextResponse.json(entri, { status: 201 });
}
