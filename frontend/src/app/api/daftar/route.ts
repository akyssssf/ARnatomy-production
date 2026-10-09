/* POST /api/daftar — registrasi akun siswa/guru (FR-02). Email unik (409),
   kata sandi disimpan sebagai hash PBKDF2, lalu langsung masuk (cookie sesi). */
import { bacaBody, galat } from "@/lib/api-util";
import { backendAktif, panggil } from "@/lib/backend";
import { daftarkanAkun, jeda } from "@/lib/db";
import { ipDariPermintaan, responsSesi } from "@/lib/rute-backend";
import { DaftarFormSchema } from "@/lib/schemas";
import { responsMasuk } from "@/lib/sesi-respons";

export async function POST(request: Request) {
  const body = await bacaBody(request, DaftarFormSchema);
  if (!body.ok) return body.respons;

  if (backendAktif()) {
    const { konfirmasi: _konfirmasi, ...kirim } = body.data;
    return responsSesi(
      await panggil("/v1/auth/register", { json: kirim, ipKlien: ipDariPermintaan(request), tanpaToken: true }),
      201,
    );
  }

  await jeda(600);
  const user = await daftarkanAkun(body.data);
  if (!user) return galat("Email sudah terdaftar. Gunakan email lain atau masuk.", 409);
  return responsMasuk(user, 201);
}
