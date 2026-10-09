import { kartu } from "@/lib/variants";
import { Ikon } from "./Ikon";

/* Server Component: empty state seragam */
export function KondisiKosong({
  judul,
  deskripsi,
  aksi,
}: {
  judul: string;
  deskripsi: string;
  aksi?: React.ReactNode;
}) {
  return (
    <div className={`${kartu({ padding: "lg" })} flex flex-col items-start gap-4 sm:flex-row sm:items-center`}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-abu text-neutral-700">
        <Ikon nama="info" kelas="h-5 w-5" />
      </span>
      <div className="flex-1">
        <h2 className="text-base font-semibold">{judul}</h2>
        <p className="mt-0.5 max-w-lg text-sm text-neutral-500">{deskripsi}</p>
      </div>
      {aksi}
    </div>
  );
}
