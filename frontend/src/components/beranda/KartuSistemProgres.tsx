import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Ikon } from "@/components/ui/Ikon";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { SistemOrgan } from "@/lib/schemas";

/* Server Component: kartu sistem organ dengan bilah progres belajar */
export function KartuSistemProgres({ sistem, persen }: { sistem: SistemOrgan; persen: number | null }) {
  const tersedia = sistem.status === "tersedia" && sistem.id_organ !== null;
  const isi = (
    <>
      <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-abu">
        <Image
          src={sistem.gambar}
          alt=""
          width={64}
          height={64}
          className={`${tersedia ? "organ-abu" : "grayscale opacity-60"} h-16 w-16 object-contain`}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="mikro">{sistem.organ}</p>
        <h3 className="mt-0.5 truncate text-lg font-semibold leading-tight">{sistem.nama}</h3>
        {tersedia && persen !== null ? (
          <div className="mt-2.5 flex items-center gap-3">
            <ProgressBar persen={persen} label={`Progres ${sistem.nama}`} />
            <span className="text-xs font-semibold tabular-nums">{persen}%</span>
          </div>
        ) : (
          <Badge status="netral" kelas="mt-2.5">
            Segera hadir
          </Badge>
        )}
      </div>
    </>
  );

  if (!tersedia)
    return <article className="flex items-center gap-4 rounded-2xl bg-white p-4 opacity-75">{isi}</article>;
  return (
    <article className="kartu-angkat group relative flex items-center gap-4 rounded-2xl bg-white p-4">
      {isi}
      <Link
        href={{ pathname: "/eksplorasi", query: { organ: sistem.id_organ } }}
        aria-label={`Buka ${sistem.nama}`}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-biru text-white after:absolute after:inset-0"
      >
        <Ikon nama="panah" />
      </Link>
    </article>
  );
}
