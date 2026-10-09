/* PATCH/DELETE /api/soal/:id — admin mengubah atau menghapus soal kuis (hanya dengan BACKEND_URL). */
import { z } from "zod";
import { galat, idDariParam, wajibSesi } from "@/lib/api-util";
import { backendAktif } from "@/lib/backend";
import { terus } from "@/lib/rute-backend";
import { SoalFormSchema } from "@/lib/tugas";

async function siap(ctx: RouteContext<"/api/soal/[id]">) {
  if (!backendAktif()) return { respons: galat("Kelola soal membutuhkan backend (atur BACKEND_URL).", 503) };
  const auth = await wajibSesi(["admin"]);
  if (!auth.ok) return { respons: auth.respons };
  const id = idDariParam((await ctx.params).id, z.number().int().positive());
  if (id === null) return { respons: galat("id soal tidak valid.", 400) };
  return { id };
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/soal/[id]">) {
  const s = await siap(ctx);
  if (!("id" in s)) return s.respons;
  let mentah: unknown;
  try {
    mentah = await request.json();
  } catch {
    return galat("body permintaan bukan JSON yang valid.", 400);
  }
  const d = SoalFormSchema.safeParse(mentah);
  if (!d.success) return galat(d.error.issues.map((i) => i.message).join(" "), 400);
  return terus(`/v1/admin/soal/${s.id}`, { method: "PATCH", json: d.data });
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/soal/[id]">) {
  const s = await siap(ctx);
  if (!("id" in s)) return s.respons;
  return terus(`/v1/admin/soal/${s.id}`, { method: "DELETE" });
}
