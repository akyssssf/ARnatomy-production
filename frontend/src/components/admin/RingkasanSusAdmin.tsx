import { KartuStatistik } from "@/components/ui/KartuStatistik";
import { KondisiKosong } from "@/components/ui/KondisiKosong";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatWaktu } from "@/lib/format";
import type { Akun, UmpanBalik } from "@/lib/schemas";
import { PERNYATAAN_SUS, predikatSus } from "@/lib/sus";
import { kartu } from "@/lib/variants";

/* Server Component: tab Umpan Balik di dashboard admin (FR-15). Rata-rata
   skor SUS, sebaran per butir, dan komentar dihitung di server dari basis
   data mock; dioper ke TabAdmin (klien) sebagai node. Diperbarui lewat
   router.refresh() setelah akun dihapus. */
export function RingkasanSusAdmin({ daftar, akun }: { daftar: UmpanBalik[]; akun: Akun[] }) {
  if (!daftar.length) {
    return (
      <KondisiKosong
        judul="Belum ada kuesioner masuk"
        deskripsi="Skor SUS muncul di sini setelah pengguna mengisi halaman Umpan Balik."
      />
    );
  }

  const n = daftar.length;
  const rata = Math.round((daftar.reduce((a, u) => a + u.skor_sus, 0) / n) * 10) / 10;
  const rataButir = PERNYATAAN_SUS.map(
    (_, i) => Math.round((daftar.reduce((a, u) => a + (u.jawaban[i] ?? 0), 0) / n) * 10) / 10,
  );
  const nama = (idUser: number) => akun.find((a) => a.id_user === idUser)?.nama ?? `Pengguna #${idUser}`;

  return (
    <>
      <KartuStatistik
        daftar={[
          { label: "Rata-rata SUS", nilai: String(rata) },
          { label: "Predikat", nilai: predikatSus(rata), kelas: "text-2xl" },
          { label: "Responden", nilai: String(n) },
        ]}
      />
      <div className={kartu({ padding: "lg" })}>
        <p className="mikro">Rata-rata per pernyataan (1-5)</p>
        <ol className="mt-3 space-y-2.5">
          {PERNYATAAN_SUS.map((p, i) => (
            <li key={p} className="grid grid-cols-[1.5rem_1fr_2.5rem] items-center gap-2 text-sm">
              <span className="text-neutral-400">{i + 1}.</span>
              <div>
                <p className="mb-1 text-xs text-neutral-700">{p}</p>
                <ProgressBar persen={((rataButir[i] ?? 0) / 5) * 100} label={`Rata-rata pernyataan ${i + 1}`} />
              </div>
              <span className="text-right text-xs font-semibold">{rataButir[i]}</span>
            </li>
          ))}
        </ol>
      </div>
      <ul className="mt-4 space-y-3">
        {daftar.map((u) => (
          <li key={u.id_umpan_balik} className={kartu({ padding: "md" })}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-neutral-400">
                {nama(u.id_user)} · {formatWaktu(u.waktu)}
              </p>
              <p className="text-sm font-semibold">
                {u.skor_sus} <span className="text-xs font-normal text-neutral-400">{predikatSus(u.skor_sus)}</span>
              </p>
            </div>
            {u.komentar && (
              <p className="mt-2 rounded-xl bg-abu px-3.5 py-2.5 text-sm text-neutral-600">{u.komentar}</p>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
