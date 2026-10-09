import { Badge } from "@/components/ui/Badge";
import { bagianById, organById } from "@/lib/data";
import type { RekapRiwayat } from "@/lib/db";
import { formatDurasi, formatWaktu } from "@/lib/format";
import type { PartContent } from "@/lib/schemas";
import { kartu } from "@/lib/variants";

/* Server Component: tabel rekap riwayat belajar per bagian tubuh */
export function TabelRiwayat({ rekap, konten }: { rekap: RekapRiwayat[]; konten: PartContent[] }) {
  return (
    <div className={`${kartu({ padding: "sm" })} overflow-x-auto`}>
      <table className="w-full min-w-[34rem] border-collapse text-left">
        <caption className="sr-only">Daftar bagian tubuh yang telah dipelajari beserta waktu akses terakhir</caption>
        <thead>
          <tr className="border-b border-black/5 text-[11px] uppercase tracking-wide text-neutral-400">
            <th scope="col" className="px-3 py-2.5 font-semibold">
              Bagian tubuh
            </th>
            <th scope="col" className="hidden px-3 py-2.5 font-semibold sm:table-cell">
              Organ
            </th>
            <th scope="col" className="px-3 py-2.5 font-semibold">
              Label dibuka
            </th>
            <th scope="col" className="px-3 py-2.5 font-semibold">
              Kunjungan
            </th>
            <th scope="col" className="hidden px-3 py-2.5 font-semibold md:table-cell">
              Durasi
            </th>
            <th scope="col" className="px-3 py-2.5 font-semibold">
              Waktu akses
            </th>
          </tr>
        </thead>
        <tbody>
          {rekap.map((r) => {
            const bagian = bagianById(r.id_bagian);
            const organ = organById(bagian?.id_organ);
            const dasar = konten.find((k) => k.id_bagian === r.id_bagian && k.jenis_konten === "dasar");
            return (
              <tr key={r.id_bagian} className="border-b border-black/5 last:border-0">
                <th scope="row" className="px-3 py-3 text-left align-top">
                  <span className="block text-sm font-semibold">{bagian?.nama_bagian_internal ?? "-"}</span>
                  <span className="block text-xs text-neutral-500">
                    {dasar ? `${dasar.deskripsi.slice(0, 48)}...` : "-"}
                  </span>
                </th>
                <td className="hidden px-3 py-3 align-top text-sm text-neutral-500 sm:table-cell">
                  {organ?.nama_organ}
                  <span className="block text-[11px] text-neutral-400">{organ?.sistem_organ}</span>
                </td>
                <td className="px-3 py-3 align-top">
                  <Badge status={r.dimmedDibuka ? "dimmed" : "dasar"}>
                    {r.dimmedDibuka ? "dasar + dimmed" : "dasar"}
                  </Badge>
                </td>
                <td className="px-3 py-3 align-top text-sm text-neutral-500">{r.jumlah}</td>
                <td className="hidden px-3 py-3 align-top text-sm text-neutral-500 md:table-cell">
                  {formatDurasi(r.totalDurasi)}
                </td>
                <td className="px-3 py-3 align-top text-sm text-neutral-500">{formatWaktu(r.terakhir)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
