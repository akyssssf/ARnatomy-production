/* /api/akun — FR-13. GET daftar akun; POST tambah akun (peran apa pun). Khusus admin. */
import { NextResponse } from "next/server";
import { bacaBody, galat, wajibSesi } from "@/lib/api-util";
import { backendAktif } from "@/lib/backend";
import { jeda, semuaAkun, tambahAkunAdmin } from "@/lib/db";
import { terus } from "@/lib/rute-backend";
import { AkunBuatSchema } from "@/lib/schemas";

export async function GET() {
  const auth = await wajibSesi(["admin"]);
  if (!auth.ok) return auth.respons;
  await jeda(300);
  if (backendAktif()) return terus("/v1/admin/akun");
  return NextResponse.json(await semuaAkun());
}

export async function POST(request: Request) {
  const auth = await wajibSesi(["admin"]);
  if (!auth.ok) return auth.respons;
  const body = await bacaBody(request, AkunBuatSchema);
  if (!body.ok) return body.respons;

  await jeda(400);
  if (backendAktif()) return terus("/v1/admin/akun", { json: body.data }, undefined, 201);
  const akun = await tambahAkunAdmin(body.data);
  if (!akun) return galat("Email sudah terdaftar.", 409);
  return NextResponse.json(akun, { status: 201 });
}
