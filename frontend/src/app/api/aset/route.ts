/* /api/aset — FR-12 (admin). GET daftar model aktif per organ;
   POST multipart {id_organ, berkas}: mengunggah / memperbarui model .glb
   (diperiksa ekstensi, ukuran maksimal, dan magic bytes "glTF"). */
import { NextResponse } from "next/server";
import { galat, wajibSesi } from "@/lib/api-util";
import { backendAktif } from "@/lib/backend";
import { adalahGlb, jeda, semuaAset, simpanAset } from "@/lib/db";
import { terus, ubahModel } from "@/lib/rute-backend";
import { BATAS_UKURAN_MODEL, OrganIdSchema } from "@/lib/schemas";
import { semuaAset as semuaAsetSumber } from "@/lib/sumber";

export async function GET() {
  const auth = await wajibSesi(["admin"]);
  if (!auth.ok) return auth.respons;
  if (backendAktif()) return NextResponse.json(await semuaAsetSumber());
  await jeda(300);
  return NextResponse.json(semuaAset());
}

export async function POST(request: Request) {
  const auth = await wajibSesi(["admin"]);
  if (!auth.ok) return auth.respons;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return galat("body harus multipart/form-data.", 400);
  }
  const idOrgan = OrganIdSchema.safeParse(Number(form.get("id_organ")));
  if (!idOrgan.success) return galat("id_organ tidak valid.", 400);
  const berkas = form.get("berkas");
  if (!(berkas instanceof File) || !berkas.size) return galat("Pilih berkas model .glb.", 400);
  if (!berkas.name.toLowerCase().endsWith(".glb")) return galat("Hanya berkas .glb (glTF Binary) yang diterima.", 400);
  if (berkas.size > BATAS_UKURAN_MODEL) {
    return galat(`Ukuran maksimal ${Math.round(BATAS_UKURAN_MODEL / 1024 / 1024)} MB.`, 413);
  }
  const bytes = new Uint8Array(await berkas.arrayBuffer());
  if (!adalahGlb(bytes)) return galat("Isi berkas bukan glTF Binary yang valid.", 400);

  if (backendAktif()) {
    const kirim = new FormData();
    kirim.set("berkas", berkas);
    return terus<{ model: Parameters<typeof ubahModel>[1] }>(
      `/v1/admin/aset/${idOrgan.data}`,
      { form: kirim },
      (d) => ubahModel(idOrgan.data, d.model),
      201,
    );
  }
  await jeda(400);
  const aset = simpanAset(idOrgan.data, berkas.name, bytes);
  if (!aset) return galat("organ tidak ditemukan.", 404);
  return NextResponse.json(aset, { status: 201 });
}
