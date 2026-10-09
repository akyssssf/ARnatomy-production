import Link from "next/link";
import { daftarTugas, progresTugas } from "@/lib/sumber";
import { badge, kartu, tombol } from "@/lib/variants";

const NAMA_JENIS = { kuis: "Kuis", simulasi: "Simulasi", rakit: "Rakit organ" } as const;

/* Server Component: progres tugas belajar dan tugas berikutnya. Tidak tampil tanpa backend. */
export async function KartuTugas() {
  const [daftar, progres] = await Promise.all([daftarTugas().catch(() => null), progresTugas().catch(() => null)]);
  if (!daftar || !progres || daftar.length === 0) return null;
  const berikut = daftar.filter((t) => !t.selesai).slice(0, 3);
  return (
    <section aria-labelledby="judul-tugas-beranda" className="mt-12">
      <div className={`${kartu({ padding: "lg" })} grid gap-6 lg:grid-cols-[0.8fr_1.2fr]`}>
        <div>
          <p className="mikro">Tugas belajar</p>
          <h2 id="judul-tugas-beranda" className="titik-biru mt-2 text-2xl font-semibold">
            {progres.tugas_selesai} dari {progres.tugas_total} selesai
          </h2>
          <div
            className="mt-4 h-2 overflow-hidden rounded-full bg-black/5"
            role="progressbar"
            aria-valuenow={progres.persen_selesai}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progres tugas belajar"
          >
            <div
              className="h-full rounded-full bg-biru transition-all"
              style={{ width: `${progres.persen_selesai}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-neutral-500">
            {progres.rata_skor_terbaik === null
              ? "Belum ada tugas yang dikerjakan. Mulai dari simulasi lalu kuis."
              : `Rata-rata skor terbaikmu ${progres.rata_skor_terbaik}.`}
          </p>
          <Link href="/tugas" className={`${tombol({ variant: "garis", ukuran: "sm" })} mt-4`}>
            Semua tugas
          </Link>
        </div>
        <div>
          {berikut.length === 0 ? (
            <p className="text-sm text-neutral-600">
              Semua tugas sudah lulus. Coba tingkatkan skormu atau tanya asisten AI.
            </p>
          ) : (
            <>
              <p className="mikro mb-3">Berikutnya</p>
              <ul className="space-y-2">
                {berikut.map((t) => (
                  <li key={t.id_tugas}>
                    <Link
                      href={`/tugas/${t.id_tugas}`}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-abu px-4 py-3 text-sm transition hover:bg-black/5"
                    >
                      <span>
                        <span className="font-semibold">{t.judul}</span>
                        <span className="mt-0.5 block text-xs text-neutral-500">
                          {t.percobaan > 0 ? `Skor terbaik ${t.skor_terbaik}, lulus ≥ ${t.ambang}` : "Belum dicoba"}
                        </span>
                      </span>
                      <span className={badge({ status: t.jenis === "kuis" ? "dasar" : "dimmed" })}>
                        {NAMA_JENIS[t.jenis]}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
