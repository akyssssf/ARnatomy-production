/* Server Component: kepala halaman editorial (label mikro, judul bertitik biru, keterangan) */
export function JudulHalaman({
  judul,
  deskripsi,
  id,
  kicker,
}: {
  judul: string;
  deskripsi?: string;
  id?: string;
  kicker?: string;
}) {
  return (
    <header className="mb-6 pt-6 sm:pt-8">
      {kicker && <p className="mikro mb-3">{kicker}</p>}
      <h1 id={id} className="titik-biru text-4xl font-semibold leading-[0.95] sm:text-5xl lg:text-6xl">
        {judul}
      </h1>
      {deskripsi && <p className="mt-4 max-w-xl text-sm leading-relaxed text-neutral-500">{deskripsi}</p>}
    </header>
  );
}
