import { Muncul } from "@/components/motion/Muncul";
import { kartu } from "@/lib/variants";

const LANGKAH = [
  {
    nomor: "01",
    judul: "Pilih sistem organ",
    teks: "Mulai dari peredaran darah atau pernapasan. Sistem lain menyusul.",
  },
  {
    nomor: "02",
    judul: "Putar dan ketuk titik",
    teks: "Model 3D bisa diputar bebas. Titik bernomor membuka label dasar, label redup membuka detail lanjutan.",
  },
  {
    nomor: "03",
    judul: "Tanya asisten",
    teks: "Yang belum jelas ditanyakan ke asisten AI dengan konteks bagian yang sedang dilihat.",
  },
];

/* Server Component: tiga langkah cara belajar */
export function LangkahBelajar() {
  return (
    <section id="bagian-cara" aria-labelledby="judul-cara" className="scroll-mt-24 pt-16">
      <p className="mikro mb-3">Alur</p>
      <h2 id="judul-cara" className="titik-biru text-4xl font-semibold sm:text-5xl">
        Cara belajar
      </h2>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {LANGKAH.map((l, i) => (
          <Muncul key={l.nomor} sebagai="article" jeda={i * 55} kelas={kartu({ nada: "aksen", padding: "lg" })}>
            <p className="text-5xl font-semibold tracking-tight text-biru">{l.nomor}</p>
            <h3 className="mt-6 text-xl font-semibold">{l.judul}</h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-500">{l.teks}</p>
          </Muncul>
        ))}
      </div>
    </section>
  );
}
