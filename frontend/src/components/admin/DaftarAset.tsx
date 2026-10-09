import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { organById } from "@/lib/data";
import { formatUkuran, formatWaktu } from "@/lib/format";
import { type AsetModel, BATAS_UKURAN_MODEL } from "@/lib/schemas";
import { kartu } from "@/lib/variants";
import { AksiAset } from "./AksiAset";

/* Server Component: tab Aset 3D (FR-12). Daftar model aktif per organ dibaca
   dari basis data di server dan dioper ke TabAdmin sebagai node; hanya
   tombol unggah/kembalikan (AksiAset) yang klien. Diperbarui lewat
   router.refresh() setelah mutasi. */
export function DaftarAset({ daftar }: { daftar: AsetModel[] }) {
  return (
    <>
      <p className="mb-3 text-xs text-neutral-500">
        Satu model aktif per organ. Unggahan (.glb, maks {formatUkuran(BATAS_UKURAN_MODEL)}) menggantikan model bawaan
        di halaman Eksplorasi; titik label menempel ke mesh bila nama node cocok, selain itu memakai koordinat cadangan.
      </p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {daftar.map((aset) => {
          const organ = organById(aset.id_organ);
          return (
            <li key={aset.id_organ} className={kartu({ padding: "md" })}>
              <div className="flex items-start gap-3">
                {organ && (
                  <Image
                    src={organ.gambar}
                    alt=""
                    width={64}
                    height={64}
                    className="h-16 w-16 shrink-0 object-contain"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold">{organ?.nama_organ ?? `Organ #${aset.id_organ}`}</h3>
                    <Badge status={aset.sumber === "unggahan" ? "baru" : "dasar"}>{aset.sumber}</Badge>
                  </div>
                  <p className="mt-1 truncate text-xs text-neutral-500" title={aset.nama_berkas}>
                    {aset.nama_berkas} · {formatUkuran(aset.ukuran_byte)}
                    {aset.waktu ? ` · ${formatWaktu(aset.waktu)}` : ""}
                  </p>
                  <p className="truncate text-[11px] text-neutral-400">{aset.url}</p>
                </div>
              </div>
              <AksiAset aset={aset} namaOrgan={organ?.nama_organ ?? `Organ #${aset.id_organ}`} />
            </li>
          );
        })}
      </ul>
    </>
  );
}
