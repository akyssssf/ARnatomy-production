import { KartuSistemProgres } from "@/components/beranda/KartuSistemProgres";
import { Muncul } from "@/components/motion/Muncul";
import { sistem_organ } from "@/lib/data";

/* Server Component: judul + grid progres tiap sistem organ (katalog SKPL) */
export function GridSistemOrgan({ persenOrgan }: { persenOrgan: (idOrgan: number) => number }) {
  return (
    <>
      <div className="mt-12 flex flex-wrap items-end justify-between gap-4">
        <h2 className="titik-biru text-3xl font-semibold sm:text-4xl">Sistem organ</h2>
        <p className="text-sm text-neutral-500">Progres tiap sistem tercatat otomatis.</p>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sistem_organ.map((s, i) => (
          <Muncul key={s.id_sistem} jeda={Math.min(i, 8) * 55}>
            <KartuSistemProgres sistem={s} persen={s.id_organ ? persenOrgan(s.id_organ) : null} />
          </Muncul>
        ))}
      </div>
    </>
  );
}
