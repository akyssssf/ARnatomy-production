/* PATCH /api/profil — melengkapi peran + sekolah akun Google (FR-02). */
import { z } from "zod";
import { bacaBody, galat, wajibSesi } from "@/lib/api-util";
import { backendAktif, panggil } from "@/lib/backend";
import { galatDari, sesiBaruDariBackend } from "@/lib/rute-backend";
import { PeranDaftarSchema } from "@/lib/schemas";

const Skema = z.object({
  role: PeranDaftarSchema,
  asal_sekolah: z
    .string()
    .trim()
    .min(3, "Nama sekolah minimal 3 karakter.")
    .max(120, "Nama sekolah terlalu panjang.")
    .optional(),
  npsn: z
    .string()
    .trim()
    .regex(/^\d{6,12}$/, "NPSN tidak valid.")
    .optional(),
});

export async function PATCH(request: Request) {
  if (!backendAktif()) return galat("Fitur ini membutuhkan backend (atur BACKEND_URL).", 503);
  const auth = await wajibSesi();
  if (!auth.ok) return auth.respons;
  const body = await bacaBody(request, Skema);
  if (!body.ok) return body.respons;
  const h = await panggil("/v1/auth/profil", { method: "PATCH", json: body.data });
  if (h.status !== 200) return galatDari(h);
  return sesiBaruDariBackend(h);
}
