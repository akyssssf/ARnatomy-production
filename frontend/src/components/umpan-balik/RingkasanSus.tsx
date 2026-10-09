import { KartuStatistik } from "@/components/ui/KartuStatistik";
import { formatWaktu } from "@/lib/format";
import type { UmpanBalik } from "@/lib/schemas";
import { PERNYATAAN_SUS, predikatSus } from "@/lib/sus";
import { kartu } from "@/lib/variants";

/* Server Component: ringkasan kuesioner SUS yang sudah dikirim pengguna */
export function RingkasanSus({ umpanBalik }: { umpanBalik: UmpanBalik }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
      <div>
        <KartuStatistik
          daftar={[
            { label: "Skor SUS", nilai: String(umpanBalik.skor_sus) },
            { label: "Predikat", nilai: predikatSus(umpanBalik.skor_sus), kelas: "text-2xl" },
            { label: "Dikirim", nilai: formatWaktu(umpanBalik.waktu), kelas: "text-lg" },
          ]}
        />
        <p className="text-xs text-neutral-500">Satu kuesioner per akun; kiriman ulang menggantikan yang lama.</p>
      </div>
      <div className={kartu({ padding: "lg" })}>
        <p className="mikro">Jawabanmu</p>
        <ol className="mt-3 space-y-2">
          {PERNYATAAN_SUS.map((p, i) => (
            <li key={p} className="grid grid-cols-[1.5rem_1fr_auto] items-baseline gap-2 text-sm">
              <span className="text-neutral-400">{i + 1}.</span>
              <span className="text-neutral-700">{p}</span>
              <span className="font-semibold">{umpanBalik.jawaban[i]}</span>
            </li>
          ))}
        </ol>
        {umpanBalik.komentar && (
          <p className="mt-4 rounded-xl bg-abu px-3.5 py-2.5 text-sm text-neutral-600">{umpanBalik.komentar}</p>
        )}
      </div>
    </div>
  );
}
