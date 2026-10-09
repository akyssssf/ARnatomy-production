/* Server Component: balok skeleton untuk loading.tsx (kelas .tulang = kilau
   abu-abu). Dipakai bersama agar tiap halaman tidak menulis ulang markup. */
export function Kerangka({ kelas }: { kelas: string }) {
  return <div className={`tulang ${kelas}`} />;
}

/** Pembungkus loading.tsx: status aria-busy + kepala halaman (kicker, judul, keterangan). */
export function KerangkaHalaman({
  label,
  lebarJudul = "w-72",
  keterangan = true,
  children,
}: {
  label: string;
  lebarJudul?: string;
  keterangan?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className="pt-6 sm:pt-8">
      <Kerangka kelas="h-3 w-28 rounded" />
      <Kerangka kelas={`mt-3 h-12 ${lebarJudul} max-w-full rounded-xl`} />
      {keterangan && <Kerangka kelas="mt-4 h-4 w-96 max-w-full rounded" />}
      {children}
    </div>
  );
}

/** Deretan kartu setinggi sama (statistik, katalog). */
export function KerangkaKartu({
  jumlah,
  tinggi = "h-28",
  kelas = "",
}: {
  jumlah: number;
  tinggi?: string;
  kelas?: string;
}) {
  return (
    <div className={`grid gap-4 ${kelas}`}>
      {Array.from({ length: jumlah }, (_, i) => i).map((nomor) => (
        <Kerangka key={nomor} kelas={`${tinggi} rounded-2xl`} />
      ))}
    </div>
  );
}
