/* DELETE /api/aset/[id] — FR-12 (admin): menghapus model unggahan organ [id]
   sehingga organ kembali memakai model bawaan. */
import { NextResponse } from "next/server";
import { galat, idDariParam, wajibSesi } from "@/lib/api-util";
import { backendAktif } from "@/lib/backend";
import { asetOrgan, hapusAset, jeda } from "@/lib/db";
import { terus } from "@/lib/rute-backend";
import { OrganIdSchema } from "@/lib/schemas";
import { asetOrgan as asetOrganSumber } from "@/lib/sumber";

export async function DELETE(_request: Request, ctx: RouteContext<"/api/aset/[id]">) {
  const auth = await wajibSesi(["admin"]);
  if (!auth.ok) return auth.respons;
  const idOrgan = idDariParam((await ctx.params).id, OrganIdSchema);
  if (idOrgan === null) return galat("id organ tidak valid.", 400);

  if (backendAktif()) {
    return terus(`/v1/admin/aset/${idOrgan}`, { method: "DELETE" }, async () => await asetOrganSumber(idOrgan));
  }
  await jeda(300);
  if (!hapusAset(idOrgan)) return galat("organ ini tidak memiliki model unggahan.", 404);
  return NextResponse.json(asetOrgan(idOrgan));
}
