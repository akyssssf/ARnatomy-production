/* Skeleton streaming untuk /beranda (konvensi loading.tsx) */
import { Kerangka, KerangkaHalaman, KerangkaKartu } from "@/components/ui/Kerangka";

export default function MemuatBeranda() {
  return (
    <KerangkaHalaman label="Memuat beranda" lebarJudul="w-80" keterangan={false}>
      <div className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Kerangka kelas="h-64 rounded-2xl" />
        <div className="grid gap-4">
          <Kerangka kelas="h-28 rounded-2xl" />
          <Kerangka kelas="h-32 rounded-2xl" />
        </div>
      </div>
      <KerangkaKartu jumlah={4} tinggi="h-36" kelas="mt-4 sm:grid-cols-2 lg:grid-cols-4" />
    </KerangkaHalaman>
  );
}
