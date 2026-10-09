import { JudulKata } from "@/components/ui/JudulKata";
import { sapaan } from "@/lib/format";
import type { SesiUser } from "@/lib/schemas";

/* Server Component: kepala beranda (sapaan menurut jam WIB, nama depan, peran) */
export function SapaanBeranda({ sesi }: { sesi: SesiUser }) {
  const namaDepan = sesi.nama.split(" ")[0] ?? sesi.nama;
  const jam = Number(
    new Intl.DateTimeFormat("id-ID", { hour: "numeric", hour12: false, timeZone: "Asia/Jakarta" }).format(new Date()),
  );
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 pt-4">
      <div>
        <p className="mikro mb-3">Dashboard belajar</p>
        <h1 id="judul-beranda" className="titik-biru text-4xl font-semibold leading-[0.95] sm:text-5xl">
          <JudulKata baris={[[`${sapaan(jam)},`], [namaDepan]]} />
        </h1>
      </div>
      <p className="mikro">
        {sesi.role}
        {sesi.asal_sekolah ? ` · ${sesi.asal_sekolah}` : ""}
      </p>
    </div>
  );
}
