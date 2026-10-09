/* Skeleton streaming untuk /asisten: kepala halaman + bidang percakapan */
import { Kerangka, KerangkaHalaman } from "@/components/ui/Kerangka";

export default function MemuatAsisten() {
  return (
    <KerangkaHalaman label="Memuat asisten" lebarJudul="w-64">
      <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_2fr]">
        <Kerangka kelas="h-56 rounded-2xl" />
        <Kerangka kelas="h-[28rem] rounded-2xl" />
      </div>
    </KerangkaHalaman>
  );
}
