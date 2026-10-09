/* Skeleton streaming untuk /riwayat (konvensi loading.tsx) */
import { Kerangka, KerangkaHalaman, KerangkaKartu } from "@/components/ui/Kerangka";

export default function MemuatRiwayat() {
  return (
    <KerangkaHalaman label="Memuat riwayat belajar">
      <KerangkaKartu jumlah={3} kelas="mt-8 sm:grid-cols-3" />
      <Kerangka kelas="mt-4 h-72 rounded-2xl" />
    </KerangkaHalaman>
  );
}
