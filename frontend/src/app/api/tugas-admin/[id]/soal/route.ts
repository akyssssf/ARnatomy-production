/* POST /api/tugas-admin/:id/soal — admin menambah soal kuis (hanya dengan BACKEND_URL). */
import { z } from "zod";
import { galat, idDariParam, wajibSesi } from "@/lib/api-util";
import { backendAktif } from "@/lib/backend";
import { terus } from "@/lib/rute-backend";
import { SoalFormSchema } from "@/lib/tugas";

export async function POST(request: Request, ctx: RouteContext<"/api/tugas-admin/[id]/soal">) {
  if (!backendAktif()) return galat("Kelola soal membutuhkan backend (atur BACKEND_URL).", 503);
  const auth = await wajibSesi(["admin"]);
  if (!auth.ok) return auth.respons;
  const id = idDariParam((await ctx.params).id, z.number().int().positive());
  if (id === null) return galat("id tugas tidak valid.", 400);
  let mentah: unknown;
  try {
    mentah = await request.json();
  } catch {
    return galat("body permintaan bukan JSON yang valid.", 400);
  }
  const d = SoalFormSchema.safeParse(mentah);
  if (!d.success) return galat(d.error.issues.map((i) => i.message).join(" "), 400);
  return terus(`/v1/admin/tugas/${id}/soal`, { json: d.data }, undefined, 201);
}
