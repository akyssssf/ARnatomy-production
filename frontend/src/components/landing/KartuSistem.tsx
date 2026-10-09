import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import type { SistemOrgan } from "@/lib/schemas";

/* Server Component: kartu katalog sistem organ; yang belum tersedia abu-abu */
export function KartuSistem({ sistem }: { sistem: SistemOrgan }) {
  const tersedia = sistem.status === "tersedia";
  return (
    <article
      className={`kartu-angkat group relative flex items-center gap-4 overflow-hidden rounded-2xl bg-white p-4 sm:p-5 ${tersedia ? "" : "opacity-80"}`}
    >
      <div className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl bg-abu sm:h-28 sm:w-28">
        <Image
          src={sistem.gambar}
          alt=""
          width={96}
          height={96}
          className={`${tersedia ? "organ-abu" : "grayscale opacity-70"} h-20 w-20 object-contain sm:h-24 sm:w-24`}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="mikro">{sistem.organ}</p>
        <h3 className="mt-1 text-xl font-semibold leading-tight">{sistem.nama}</h3>
        <Badge status={tersedia ? "tervalidasi" : "netral"} kelas="mt-3">
          {tersedia ? "Tersedia" : "Segera hadir"}
        </Badge>
      </div>
    </article>
  );
}
