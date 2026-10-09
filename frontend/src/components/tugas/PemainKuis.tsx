"use client";

/* Client leaf: pemain kuis pilihan ganda. Satu soal per layar, jawaban dikirim
   sekaligus; backend menilai dan mengembalikan penjelasan tiap soal. */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { GalatApi, kirimPercobaan } from "@/lib/mock-api";
import type { HasilPercobaan, RincianKuis, Soal, TugasRingkas } from "@/lib/tugas";
import { alert, kartu, tombol } from "@/lib/variants";

export function PemainKuis({ tugas, soal }: { tugas: TugasRingkas; soal: Soal[] }) {
  const router = useRouter();
  const [jawaban, setJawaban] = useState<number[]>(() => soal.map(() => -1));
  const [indeks, setIndeks] = useState(0);
  const [hasil, setHasil] = useState<HasilPercobaan | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [kirim, setKirim] = useState(false);

  const s = soal[indeks];
  const terjawab = jawaban.filter((j) => j >= 0).length;

  async function selesai() {
    setKirim(true);
    setGalat(null);
    try {
      setHasil(await kirimPercobaan(tugas.id_tugas, jawaban));
      router.refresh();
    } catch (e) {
      setGalat(e instanceof GalatApi ? e.message : "Tidak dapat menghubungi server.");
    } finally {
      setKirim(false);
    }
  }

  function ulang() {
    setJawaban(soal.map(() => -1));
    setIndeks(0);
    setHasil(null);
  }

  if (hasil) {
    const rincian = hasil.rincian as RincianKuis[];
    return (
      <div className="space-y-4">
        <div className={`${kartu({ nada: hasil.selesai ? "brand" : "aksen", padding: "lg" })}`} role="status">
          <p className="mikro">{hasil.selesai ? "Lulus" : "Belum lulus"}</p>
          <p className="mt-2 text-5xl font-semibold">{hasil.skor}</p>
          <p className="mt-2 text-sm opacity-80">
            {hasil.benar} dari {hasil.total} soal benar. Batas lulus {hasil.ambang}.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={ulang}
              className={tombol({ variant: hasil.selesai ? "garis" : "utama", ukuran: "md" })}
            >
              Coba lagi
            </button>
            <Link href="/tugas" className={tombol({ variant: "garis", ukuran: "md" })}>
              Daftar tugas
            </Link>
          </div>
        </div>
        <ol className="space-y-3">
          {soal.map((q, i) => {
            const r = rincian[i];
            if (!r) return null;
            return (
              <li key={q.id_soal} className={kartu({ padding: "md" })}>
                <p className="text-sm font-semibold">
                  {i + 1}. {q.pertanyaan}
                </p>
                <p className={`mt-2 text-sm ${r.benar ? "text-emerald-700" : "text-rose-600"}`}>
                  {r.benar
                    ? "Benar"
                    : `Jawabanmu: ${r.jawaban_anda === null ? "tidak dijawab" : q.pilihan[r.jawaban_anda]}`}
                  {!r.benar && <span className="text-neutral-700"> · Yang benar: {q.pilihan[r.jawaban_benar]}</span>}
                </p>
                <p className="mt-1 text-sm text-neutral-500">{r.penjelasan}</p>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  if (!s) return null;
  const terakhir = indeks === soal.length - 1;
  return (
    <div className={kartu({ padding: "lg" })}>
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>
          Soal {indeks + 1} dari {soal.length}
        </span>
        <span>{terjawab} terjawab</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/5" aria-hidden="true">
        <div
          className="h-full rounded-full bg-biru transition-all"
          style={{ width: `${((indeks + 1) / soal.length) * 100}%` }}
        />
      </div>
      {galat && (
        <div role="alert" className={`${alert({ tipe: "error" })} mt-4`}>
          {galat}
        </div>
      )}
      <fieldset className="mt-5">
        <legend className="text-lg font-semibold leading-snug">{s.pertanyaan}</legend>
        <div className="mt-4 space-y-2">
          {s.pilihan.map((p, i) => (
            <label
              key={p}
              className={`flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                jawaban[indeks] === i ? "bg-biru text-white" : "bg-abu text-neutral-800 hover:bg-black/5"
              }`}
            >
              <input
                type="radio"
                name={`soal-${s.id_soal}`}
                className="sr-only"
                checked={jawaban[indeks] === i}
                onChange={() => setJawaban((a) => a.map((v, k) => (k === indeks ? i : v)))}
              />
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/80 text-xs font-semibold text-neutral-700">
                {String.fromCharCode(65 + i)}
              </span>
              {p}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          disabled={indeks === 0}
          onClick={() => setIndeks((i) => i - 1)}
          className={tombol({ variant: "halus", ukuran: "md" })}
        >
          Sebelumnya
        </button>
        {terakhir ? (
          <button
            type="button"
            disabled={kirim || terjawab === 0}
            onClick={selesai}
            className={tombol({ ukuran: "md" })}
          >
            {kirim ? (
              <>
                <Spinner /> Menilai
              </>
            ) : (
              `Kirim jawaban (${terjawab}/${soal.length})`
            )}
          </button>
        ) : (
          <button type="button" onClick={() => setIndeks((i) => i + 1)} className={tombol({ ukuran: "md" })}>
            Berikutnya
          </button>
        )}
      </div>
    </div>
  );
}
