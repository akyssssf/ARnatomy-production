/* POST /api/login — verifikasi kredensial terhadap hash PBKDF2, batasi
   percobaan gagal per email+IP (429), lalu set cookie sesi httpOnly (FR-01). */
import { bacaBody, galat } from "@/lib/api-util";
import { backendAktif, panggil } from "@/lib/backend";
import { jeda, verifikasiLogin } from "@/lib/db";
import { catatGagal, hapusCatatan, kunciLogin, sisaBlokir } from "@/lib/pembatas";
import { ipDariPermintaan, responsSesi } from "@/lib/rute-backend";
import { LoginFormSchema } from "@/lib/schemas";
import { responsMasuk } from "@/lib/sesi-respons";

export async function POST(request: Request) {
  const body = await bacaBody(request, LoginFormSchema);
  if (!body.ok) return body.respons;

  if (backendAktif()) {
    const h = await panggil("/v1/auth/login", {
      json: body.data,
      ipKlien: ipDariPermintaan(request),
      tanpaToken: true,
    });
    return responsSesi(h);
  }

  const kunci = kunciLogin(body.data.email, request);
  const sisa = sisaBlokir(kunci);
  if (sisa > 0) {
    const menit = Math.ceil(sisa / 60);
    const respons = galat(`Terlalu banyak percobaan gagal. Coba lagi dalam ${menit} menit.`, 429);
    respons.headers.set("Retry-After", String(sisa));
    return respons;
  }

  await jeda(500); // simulasi pengecekan ke basis data akun
  const hasil = await verifikasiLogin(body.data.email, body.data.password);
  if (hasil.status === "nonaktif") return galat("Akun ini dinonaktifkan. Hubungi administrator.", 403);
  if (hasil.status === "salah") {
    const tersisa = catatGagal(kunci);
    return galat(
      tersisa > 0 ? `Email atau kata sandi salah. Sisa ${tersisa} percobaan.` : "Email atau kata sandi salah.",
      401,
    );
  }
  hapusCatatan(kunci);
  return responsMasuk(hasil.user);
}
