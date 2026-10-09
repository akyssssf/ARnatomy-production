/* PATCH /api/laporan/:id — tandai laporan ditindaklanjuti (admin, FR-11) */
import { NextResponse } from "next/server";
import { galat, idDariParam, wajibSesi } from "@/lib/api-util";
import { backendAktif } from "@/lib/backend";
import { jeda, tindakLanjutiLaporan } from "@/lib/db";
import { terus } from "@/lib/rute-backend";
import { LaporanIdSchema } from "@/lib/schemas";

export async function PATCH(_request: Request, konteks: RouteContext<"/api/laporan/[id]">) {
  const auth = await wajibSesi(["admin"]);
  if (!auth.ok) return auth.respons;
  const { id } = await konteks.params;
  const idLaporan = idDariParam(id, LaporanIdSchema);
  if (!idLaporan) return galat("id laporan tidak valid.", 400);

  if (backendAktif()) return terus(`/v1/admin/laporan/${idLaporan}`, { method: "PATCH" });
  await jeda(400);
  const laporan = tindakLanjutiLaporan(idLaporan);
  if (!laporan) return galat("laporan tidak ditemukan.", 404);
  return NextResponse.json(laporan);
}
