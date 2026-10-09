/* POST /api/tugas/:id/percobaan — kirim jawaban kuis/simulasi; dinilai backend.
   Hanya tersedia bila BACKEND_URL diatur. */
import { z } from "zod";
import { bacaBody, galat, idDariParam, wajibSesi } from "@/lib/api-util";
import { backendAktif } from "@/lib/backend";
import { terus } from "@/lib/rute-backend";

const Skema = z.object({ jawaban: z.array(z.number().int().min(-1)).min(1).max(100) });

export async function POST(request: Request, ctx: RouteContext<"/api/tugas/[id]/percobaan">) {
  if (!backendAktif()) return galat("Tugas belajar membutuhkan backend (atur BACKEND_URL).", 503);
  const auth = await wajibSesi();
  if (!auth.ok) return auth.respons;
  const id = idDariParam((await ctx.params).id, z.number().int().positive());
  if (id === null) return galat("id tugas tidak valid.", 400);
  const body = await bacaBody(request, Skema);
  if (!body.ok) return body.respons;
  return terus(`/v1/tugas/${id}/percobaan`, { json: body.data }, undefined, 201);
}
