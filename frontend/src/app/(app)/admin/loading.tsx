/* Skeleton streaming untuk /admin (konvensi loading.tsx) */
import { Kerangka, KerangkaHalaman, KerangkaKartu } from "@/components/ui/Kerangka";

export default function MemuatAdmin() {
  return (
    <KerangkaHalaman label="Memuat dashboard admin" lebarJudul="w-80">
      <Kerangka kelas="mt-6 h-11 w-96 max-w-full rounded-full" />
      <KerangkaKartu jumlah={3} kelas="mt-5 sm:grid-cols-3" />
      <Kerangka kelas="mt-4 h-80 rounded-2xl" />
    </KerangkaHalaman>
  );
}
