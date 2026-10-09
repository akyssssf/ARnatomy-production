/* GET /api/sekolah?q= — pencarian sekolah (SMP/SMA/SMK) lewat backend; hanya dengan BACKEND_URL. */
import { NextResponse } from "next/server";
import { galat, wajibSesi } from "@/lib/api-util";
import { backendAktif } from "@/lib/backend";
import { terus } from "@/lib/rute-backend";

export async function GET(request: Request) {
  if (!backendAktif()) return NextResponse.json([]);
  const auth = await wajibSesi();
  if (!auth.ok) return auth.respons;
  const q = new URL(request.url).searchParams.get("q") ?? "";
  if (q.trim().length < 3) return galat("Ketik minimal 3 huruf.", 400);
  return terus(`/v1/sekolah?q=${encodeURIComponent(q.trim())}&limit=12`);
}
