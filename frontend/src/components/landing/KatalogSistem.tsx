import { Muncul } from "@/components/motion/Muncul";
import type { SistemOrgan } from "@/lib/schemas";
import { KartuSistem } from "./KartuSistem";

/* Server Component: katalog sistem organ (tersedia / segera hadir) */
export function KatalogSistem({ sistem }: { sistem: SistemOrgan[] }) {
  return (
    <section id="bagian-sistem" aria-labelledby="judul-sistem" className="scroll-mt-24 pt-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mikro mb-3">Katalog</p>
          <h2 id="judul-sistem" className="titik-biru text-4xl font-semibold sm:text-5xl">
            Sistem organ
          </h2>
        </div>
        <p className="max-w-sm text-sm text-neutral-500">
          Dua sistem sudah bisa dijelajah dengan model 3D. Sistem lain sedang disiapkan.
        </p>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sistem.map((s, i) => (
          <Muncul key={s.id_sistem} jeda={Math.min(i, 8) * 55}>
            <KartuSistem sistem={s} />
          </Muncul>
        ))}
      </div>
    </section>
  );
}
