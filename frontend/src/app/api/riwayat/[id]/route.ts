/* PATCH /api/riwayat/:id — tutup entri riwayat; durasi dihitung server */
import { NextResponse } from "next/server";
import { galat, idDariParam, wajibSesi } from "@/lib/api-util";
import { backendAktif } from "@/lib/backend";
import { tutupRiwayat } from "@/lib/db";
import { terus } from "@/lib/rute-backend";
import { RiwayatIdSchema } from "@/lib/schemas";

export async function PATCH(_request: Request, konteks: RouteContext<"/api/riwayat/[id]">) {
  const auth = await wajibSesi();
  if (!auth.ok) return auth.respons;
  const { id } = await konteks.params;
  const idRiwayat = idDariParam(id, RiwayatIdSchema);
  if (!idRiwayat) return galat("id riwayat tidak valid.", 400);
  if (backendAktif()) return terus(`/v1/riwayat/${idRiwayat}/tutup`, { method: "PATCH" });
  const entri = tutupRiwayat(auth.sesi.id_user, idRiwayat);
  if (!entri) return galat("entri riwayat tidak ditemukan.", 404);
  return NextResponse.json(entri);
}
