/* /api/akun/[id] — FR-13: PATCH mengubah data akun (nama, email, peran,
   sekolah, sandi baru, status aktif), DELETE menghapus akun beserta data
   belajarnya. Admin tidak dapat mengubah/menghapus akunnya sendiri dari sini
   agar sistem tidak kehilangan administrator. */
import { NextResponse } from "next/server";
import { bacaBody, galat, idDariParam, wajibSesi } from "@/lib/api-util";
import { backendAktif } from "@/lib/backend";
import { hapusAkun, jeda, perbaruiAkun } from "@/lib/db";
import { terus } from "@/lib/rute-backend";
import { AkunPatchSchema, UserIdSchema } from "@/lib/schemas";

export async function PATCH(request: Request, ctx: RouteContext<"/api/akun/[id]">) {
  const auth = await wajibSesi(["admin"]);
  if (!auth.ok) return auth.respons;
  const idUser = idDariParam((await ctx.params).id, UserIdSchema);
  if (idUser === null) return galat("id akun tidak valid.", 400);
  if (idUser === auth.sesi.id_user) return galat("Akun sendiri tidak dapat diubah dari sini.", 400);
  const body = await bacaBody(request, AkunPatchSchema);
  if (!body.ok) return body.respons;

  if (backendAktif()) return terus(`/v1/admin/akun/${idUser}`, { method: "PATCH", json: body.data });
  await jeda(300);
  const hasil = await perbaruiAkun(idUser, body.data);
  if (hasil.status === "tidak-ada") return galat("akun tidak ditemukan.", 404);
  if (hasil.status === "email-ganda") return galat("Email sudah dipakai akun lain.", 409);
  return NextResponse.json(hasil.akun);
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/akun/[id]">) {
  const auth = await wajibSesi(["admin"]);
  if (!auth.ok) return auth.respons;
  const idUser = idDariParam((await ctx.params).id, UserIdSchema);
  if (idUser === null) return galat("id akun tidak valid.", 400);
  if (idUser === auth.sesi.id_user) return galat("Akun sendiri tidak dapat dihapus.", 400);

  if (backendAktif()) return terus(`/v1/admin/akun/${idUser}`, { method: "DELETE" });
  await jeda(300);
  if (!(await hapusAkun(idUser))) return galat("akun tidak ditemukan.", 404);
  return NextResponse.json({ ok: true });
}
