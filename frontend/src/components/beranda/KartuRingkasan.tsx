/* Server Component: kartu biru ringkasan progres keseluruhan */
function pesanProgres(persen: number): string {
  if (persen === 0) return "Belum ada bagian yang dibuka. Mulai dari jantung.";
  if (persen < 50) return `${persen}% bagian sudah dibuka. Lanjutkan ke bagian berikutnya.`;
  if (persen < 100) return `${persen}% bagian sudah dipelajari, tinggal sedikit lagi.`;
  return "Semua bagian sudah dibuka. Gunakan asisten untuk memperdalam.";
}

export function KartuRingkasan({
  persen,
  dibuka,
  total,
  dimmed,
  tanya,
}: {
  persen: number;
  dibuka: number;
  total: number;
  dimmed: number;
  tanya: number;
}) {
  const angka = [
    {
      label: "Dibuka",
      nilai: (
        <>
          {dibuka}
          <span className="text-sm text-white/90">/{total}</span>
        </>
      ),
    },
    { label: "Dimmed", nilai: dimmed },
    { label: "Tanya AI", nilai: tanya },
  ];
  return (
    <article className="flex flex-col justify-between rounded-3xl bg-biru p-6 text-white sm:p-7">
      <div>
        <p className="mikro text-white/90">Ringkasan</p>
        <p className="mt-3 text-5xl font-semibold tracking-tight">{persen}%</p>
        <p className="mt-2 text-sm leading-relaxed text-white/90">{pesanProgres(persen)}</p>
      </div>
      <dl className="mt-8 grid grid-cols-3 gap-3 border-t border-white/15 pt-5">
        {angka.map((a) => (
          <div key={a.label}>
            <dt className="text-[11px] uppercase tracking-[0.08em] text-white/90">{a.label}</dt>
            <dd className="mt-1 text-2xl font-semibold">{a.nilai}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
