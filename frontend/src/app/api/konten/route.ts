/* GET /api/konten — seluruh konten label dasar & dimmed */
import { NextResponse } from "next/server";
import { wajibSesi } from "@/lib/api-util";
import { backendAktif } from "@/lib/backend";
import { jeda, semuaKonten } from "@/lib/db";
import { semuaKonten as semuaKontenSumber } from "@/lib/sumber";

export async function GET() {
  const auth = await wajibSesi();
  if (!auth.ok) return auth.respons;
  if (backendAktif()) return NextResponse.json(await semuaKontenSumber());
  await jeda(500);
  return NextResponse.json(semuaKonten());
}
