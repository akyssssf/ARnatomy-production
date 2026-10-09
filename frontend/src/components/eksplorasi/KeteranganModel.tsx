import { formatUkuran, formatWaktu } from "@/lib/format";
import type { AsetModel, Organ } from "@/lib/schemas";

/* Server Component: keterangan gambar di bawah kanvas 3D, termasuk asal
   model aktif (bawaan HRA atau unggahan admin, FR-12). Dioper ke
   PenampilOrgan (klien) sebagai node. */
export function KeteranganModel({ organ, aset }: { organ: Organ; aset: AsetModel | null }) {
  const asal =
    aset?.sumber === "unggahan"
      ? `model unggahan admin ${aset.nama_berkas}, ${formatUkuran(aset.ukuran_byte)}${aset.waktu ? `, ${formatWaktu(aset.waktu)}` : ""}`
      : `model bawaan ${aset?.nama_berkas ?? organ.file_model_3d} dari HuBMAP Human Reference Atlas (CC BY 4.0)`;
  return (
    <figcaption className="mt-3 px-1 text-[11px] text-neutral-400">
      Gambar 1. Model 3D {organ.nama_organ}: {asal}. Ketuk titik bernomor untuk membuka label; kamera AR perangkat tidak
      diaktifkan pada prototipe web.
    </figcaption>
  );
}
