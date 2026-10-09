/* Skeleton streaming untuk /eksplorasi: bingkai kanvas 3D + bilah samping */
import { Kerangka, KerangkaHalaman } from "@/components/ui/Kerangka";

export default function MemuatEksplorasi() {
  return (
    <KerangkaHalaman label="Memuat penampil organ" keterangan={false}>
      <div className="mt-8 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Kerangka kelas="aspect-[4/3] w-full rounded-3xl lg:aspect-auto lg:min-h-[520px]" />
        <div className="grid gap-4">
          <Kerangka kelas="h-24 rounded-2xl" />
          <Kerangka kelas="h-72 rounded-2xl" />
        </div>
      </div>
    </KerangkaHalaman>
  );
}
