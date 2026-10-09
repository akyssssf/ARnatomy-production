import Image from "next/image";
import Link from "next/link";
import { Ikon } from "@/components/ui/Ikon";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { BodyPart, Organ } from "@/lib/schemas";
import { tombol } from "@/lib/variants";

/* Server Component: kartu "lanjutkan/mulai belajar" organ terakhir */
export function KartuLanjutkan({
  organ,
  bagianTerakhir,
  progres,
}: {
  organ: Organ;
  bagianTerakhir: BodyPart | null;
  progres: { dipelajari: number; total: number; persen: number };
}) {
  const adaRiwayat = bagianTerakhir !== null;
  return (
    <article className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-white p-6 sm:p-7">
      <div className="relative z-10 max-w-sm">
        <p className="mikro">{adaRiwayat ? "Lanjutkan belajar" : "Mulai belajar"}</p>
        <h2 className="titik-biru mt-3 text-3xl font-semibold">{organ.nama_organ}</h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-500">
          {organ.sistem_organ} &middot; {progres.dipelajari} dari {progres.total} bagian dibuka
          {bagianTerakhir ? `. Terakhir: ${bagianTerakhir.nama_bagian_internal}.` : "."}
        </p>
      </div>
      <div className="relative z-10 mt-8 flex flex-wrap items-center gap-4">
        <Link href={{ pathname: "/eksplorasi", query: { organ: organ.id_organ } }} className={tombol({ ukuran: "md" })}>
          {adaRiwayat ? "Lanjutkan" : "Buka model"}
          <Ikon nama="panah" />
        </Link>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <ProgressBar persen={progres.persen} label={`Progres ${organ.nama_organ}`} kelas="w-28" />
          <span className="font-semibold tabular-nums">{progres.persen}%</span>
        </div>
      </div>
      <Image
        src={organ.gambar}
        alt=""
        width={256}
        height={256}
        className="organ-abu pointer-events-none absolute -bottom-10 -right-10 w-44 opacity-25 sm:-right-4 sm:w-60 sm:opacity-100 lg:-right-2 lg:w-64"
      />
    </article>
  );
}
