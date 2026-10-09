/* POST /api/google — login Google (FR-01). ID token dari Google Identity
   Services diteruskan ke backend, yang memverifikasi tanda tangan, audiens,
   dan email_verified lalu menerbitkan JWT. Hanya tersedia bila BACKEND_URL diatur. */
import { z } from "zod";
import { bacaBody, galat } from "@/lib/api-util";
import { backendAktif, panggil } from "@/lib/backend";
import { ipDariPermintaan, responsSesi } from "@/lib/rute-backend";

const Skema = z.object({ id_token: z.string().min(20, "id_token tidak valid.") });

export async function POST(request: Request) {
  if (!backendAktif()) return galat("Login Google membutuhkan backend (atur BACKEND_URL).", 503);
  const body = await bacaBody(request, Skema);
  if (!body.ok) return body.respons;
  const h = await panggil("/v1/auth/google", { json: body.data, ipKlien: ipDariPermintaan(request), tanpaToken: true });
  return responsSesi(h);
}
