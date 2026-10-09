/* PATCH /api/konten/:id — edit judul/deskripsi/status validasi (admin, FR-10) */
import { NextResponse } from "next/server";
import { bacaBody, galat, idDariParam, wajibSesi } from "@/lib/api-util";
import { backendAktif } from "@/lib/backend";
import { jeda, perbaruiKonten } from "@/lib/db";
import { terus } from "@/lib/rute-backend";
import { KontenFormSchema, KontenIdSchema } from "@/lib/schemas";

export async function PATCH(request: Request, konteks: RouteContext<"/api/konten/[id]">) {
  const auth = await wajibSesi(["admin"]);
  if (!auth.ok) return auth.respons;
  const { id } = await konteks.params;
  const idKonten = idDariParam(id, KontenIdSchema);
  if (!idKonten) return galat("id konten tidak valid.", 400);
  const body = await bacaBody(request, KontenFormSchema);
  if (!body.ok) return body.respons;

  if (backendAktif()) return terus(`/v1/admin/konten/${idKonten}`, { method: "PATCH", json: body.data });
  await jeda(500);
  const konten = perbaruiKonten(idKonten, body.data);
  if (!konten) return galat("konten tidak ditemukan.", 404);
  return NextResponse.json(konten);
}
