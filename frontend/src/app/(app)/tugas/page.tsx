/* Daftar Tugas Belajar: kuis dan simulasi alur untuk tiap organ. Progres dihitung
   backend dari percobaan; tugas selesai bila skor terbaik mencapai ambang. */
import type { Metadata } from "next";
import Link from "next/link";
import { JudulHalaman } from "@/components/ui/JudulHalaman";
import { KartuStatistik } from "@/components/ui/KartuStatistik";
import { KondisiKosong } from "@/components/ui/KondisiKosong";
import { daftarTugas, progresTugas } from "@/lib/sumber";
import { badge, kartu, tombol } from "@/lib/variants";

export const metadata: Metadata = {
  title: "Tugas Belajar",
  description: "Kuis dan simulasi alur peredaran darah dan pernapasan, lengkap dengan skor dan progres.",
};

const LABEL_JENIS = { kuis: "Kuis", simulasi: "Simulasi", rakit: "Rakit organ" } as const;

export default async function HalamanTugas() {
  const [daftar, progres] = await Promise.all([daftarTugas(), progresTugas()]);
  if (!daftar || !progres) {
    return (
      <section aria-labelledby="judul-tugas" className="halaman-masuk">
        <JudulHalaman judul="Tugas Belajar" id="judul-tugas" kicker="Latihan" />
        <KondisiKosong
          judul="Tugas belajar membutuhkan backend"
          deskripsi="Atur BACKEND_URL agar kuis dan simulasi dapat dimuat dari server."
        />
      </section>
    );
  }
  return (
    <section aria-labelledby="judul-tugas" className="halaman-masuk">
      <JudulHalaman
        judul="Tugas Belajar"
        deskripsi="Pelajari alurnya lewat simulasi, lalu uji pemahamanmu dengan kuis. Skor dinilai server dan tercatat di progres belajarmu."
        id="judul-tugas"
        kicker="Latihan"
      />
      <KartuStatistik
        daftar={[
          { label: "Tugas selesai", nilai: `${progres.tugas_selesai} / ${progres.tugas_total}` },
          { label: "Progres", nilai: `${progres.persen_selesai}%` },
          {
            label: "Rata-rata skor terbaik",
            nilai: progres.rata_skor_terbaik === null ? "-" : String(progres.rata_skor_terbaik),
          },
        ]}
      />
      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        {daftar.map((t) => (
          <li key={t.id_tugas} className={`${kartu({ padding: "lg" })} flex flex-col`}>
            <div className="flex items-center justify-between gap-2">
              <span className={badge({ status: t.jenis === "kuis" ? "dasar" : "dimmed" })}>{LABEL_JENIS[t.jenis]}</span>
              {t.selesai ? (
                <span className={badge({ status: "tervalidasi" })}>Selesai</span>
              ) : t.percobaan > 0 ? (
                <span className={badge({ status: "draft" })}>Belum lulus</span>
              ) : (
                <span className={badge()}>Belum dicoba</span>
              )}
            </div>
            <h2 className="mt-4 text-xl font-semibold">{t.judul}</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-500">{t.deskripsi}</p>
            <p className="mt-4 text-xs text-neutral-400">
              {t.jumlah_item} {t.jenis === "kuis" ? "soal" : t.jenis === "rakit" ? "bagian" : "langkah"} · lulus ≥{" "}
              {t.ambang} · dicoba {t.percobaan}×{t.skor_terbaik !== null && ` · skor terbaik ${t.skor_terbaik}`}
            </p>
            <Link href={`/tugas/${t.id_tugas}`} className={`${tombol({ ukuran: "md" })} mt-4 self-start`}>
              {t.percobaan > 0
                ? "Coba lagi"
                : t.jenis === "kuis"
                  ? "Mulai kuis"
                  : t.jenis === "rakit"
                    ? "Mulai merakit"
                    : "Mulai simulasi"}
            </Link>
          </li>
        ))}
      </ul>
      {progres.percobaan_terbaru.length > 0 && (
        <div className={`${kartu({ padding: "lg" })} mt-4`}>
          <h2 className="text-base font-semibold">Percobaan terbaru</h2>
          <ul className="mt-3 divide-y divide-black/5 text-sm">
            {progres.percobaan_terbaru.map((p) => (
              <li key={p.id_percobaan} className="flex items-center justify-between gap-3 py-2">
                <span>{p.judul}</span>
                <span className="text-neutral-500">
                  {p.benar}/{p.total} benar · skor <strong className="text-neutral-900">{p.skor}</strong> ·{" "}
                  {new Date(p.waktu).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
