/* GET  /api/asisten — riwayat percakapan pengguna aktif
   POST /api/asisten — kirim pertanyaan; `simulasiGagal` memaksa 503 (FR-08, TC-07).
   Jawaban: LLM lewat BFF (lib/llm.ts) bila ANTHROPIC_API_KEY diatur, selain itu
   penyusun jawaban lokal (lib/asisten.ts). Kunci API tidak pernah ke klien. */
import { NextResponse } from "next/server";
import { bacaBody, galat, wajibSesi } from "@/lib/api-util";
import { susunJawaban } from "@/lib/asisten";
import { backendAktif } from "@/lib/backend";
import { bagianById } from "@/lib/data";
import { jeda, percakapanUser, tambahPercakapan } from "@/lib/db";
import { jawabDenganLlm } from "@/lib/llm";
import { terus } from "@/lib/rute-backend";
import { OpsiSimulasiSchema, PertanyaanFormSchema } from "@/lib/schemas";
import { percakapanUser as percakapanSumber } from "@/lib/sumber";

export async function GET() {
  const auth = await wajibSesi();
  if (!auth.ok) return auth.respons;
  if (backendAktif()) return NextResponse.json(await percakapanSumber(auth.sesi.id_user));
  await jeda(400);
  return NextResponse.json(percakapanUser(auth.sesi.id_user));
}

export async function POST(request: Request) {
  const auth = await wajibSesi();
  if (!auth.ok) return auth.respons;
  const body = await bacaBody(request, PertanyaanFormSchema.extend(OpsiSimulasiSchema.shape));
  if (!body.ok) return body.respons;

  if (body.data.simulasiGagal) {
    await jeda(900);
    return galat("simulasi kegagalan koneksi ke layanan asisten AI.", 503);
  }

  if (backendAktif()) {
    const { simulasiGagal: _s, ...kirim } = body.data;
    return terus("/v1/asisten/tanya", { json: kirim }, undefined, 201);
  }
  const bagian = bagianById(body.data.id_bagian);
  const dariLlm = await jawabDenganLlm(body.data.pertanyaan, bagian);
  if (!dariLlm) await jeda(900); // "asisten sedang mengetik" untuk jawaban lokal
  const jawaban = dariLlm ?? susunJawaban(body.data.pertanyaan, bagian);
  return NextResponse.json(
    tambahPercakapan(auth.sesi.id_user, bagian?.id_bagian ?? null, body.data.pertanyaan, jawaban),
    { status: 201 },
  );
}
