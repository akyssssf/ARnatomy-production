import type { Organ } from "@/lib/schemas";

/* Server Component: kicker sistem organ + judul halaman eksplorasi */
export function KepalaEksplorasi({ organ }: { organ: Organ }) {
  return (
    <div>
      <p className="mikro mb-2">{organ.sistem_organ}</p>
      <h1 id="judul-eksplorasi" className="titik-biru text-4xl font-semibold leading-none sm:text-5xl">
        {organ.nama_organ}
      </h1>
    </div>
  );
}
