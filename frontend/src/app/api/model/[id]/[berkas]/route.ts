/* GET /api/model/[id]/v<versi>.glb — menyajikan model unggahan admin (FR-12)
   dari memori server. Nama berkas memuat versi sehingga boleh di-cache lama;
   publik seperti berkas di public/models (model berlisensi terbuka). */
import { galat, idDariParam } from "@/lib/api-util";
import { backendAktif, panggil } from "@/lib/backend";
import { bytesAset } from "@/lib/db";
import { OrganIdSchema } from "@/lib/schemas";

export async function GET(_request: Request, ctx: RouteContext<"/api/model/[id]/[berkas]">) {
  const { id, berkas } = await ctx.params;
  const idOrgan = idDariParam(id, OrganIdSchema);
  const versi = /^v(\d+)\.glb$/.exec(berkas);
  if (idOrgan === null || !versi) return galat("model tidak ditemukan.", 404);
  if (backendAktif()) {
    const o = await panggil<{ model: { sumber: string; versi: number; url: string } }>(`/v1/organ/${idOrgan}`);
    const m = o.data?.model;
    if (o.status !== 200 || !m || m.sumber !== "unggahan" || m.versi !== Number(versi[1])) {
      return galat("model tidak ditemukan.", 404);
    }
    const asal = await fetch(m.url, { cache: "no-store" });
    if (!asal.ok || !asal.body) return galat("model tidak ditemukan.", 404);
    return new Response(asal.body, {
      headers: {
        "Content-Type": "model/gltf-binary",
        ...(asal.headers.get("content-length")
          ? { "Content-Length": asal.headers.get("content-length") as string }
          : {}),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }
  const bytes = bytesAset(idOrgan, Number(versi[1]));
  if (!bytes) return galat("model tidak ditemukan.", 404);
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "model/gltf-binary",
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
