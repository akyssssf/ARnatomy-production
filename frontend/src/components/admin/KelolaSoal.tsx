"use client";

/* Client leaf: admin menambah, mengubah, dan menghapus soal kuis (tugas belajar). Perubahan langsung
   berlaku untuk pengguna; router.refresh() memuat ulang daftar dari server. */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { GalatApi, hapusSoal, tambahSoal, ubahSoal } from "@/lib/mock-api";
import { type SoalAdmin, SoalFormSchema, type TugasAdmin } from "@/lib/tugas";
import { alert, input, kartu, tombol } from "@/lib/variants";
import { useUIStore } from "@/store/useUIStore";

const KOSONG = { pertanyaan: "", pilihan: ["", "", "", ""], jawaban_benar: 0, penjelasan: "" };

function FormSoal({
  awal,
  idTugas,
  idSoal,
  onSelesai,
}: {
  awal: typeof KOSONG;
  idTugas: number;
  idSoal?: number;
  onSelesai: () => void;
}) {
  const router = useRouter();
  const toast = useUIStore((s) => s.tampilkanToast);
  const [d, setD] = useState(awal);
  const [galat, setGalat] = useState<string | null>(null);
  const [kirim, setKirim] = useState(false);

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    const hasil = SoalFormSchema.safeParse({ ...d, pilihan: d.pilihan.map((p) => p.trim()).filter(Boolean) });
    if (!hasil.success) {
      setGalat(hasil.error.issues[0]?.message ?? "Isian belum benar.");
      return;
    }
    setKirim(true);
    setGalat(null);
    try {
      if (idSoal) await ubahSoal(idSoal, hasil.data);
      else await tambahSoal(idTugas, hasil.data);
      toast(idSoal ? "Soal diperbarui." : "Soal ditambahkan.", "sukses");
      router.refresh();
      onSelesai();
    } catch (err) {
      setGalat(err instanceof GalatApi ? err.message : "Gagal menyimpan soal.");
    } finally {
      setKirim(false);
    }
  }

  return (
    <form onSubmit={simpan} className="space-y-3 rounded-2xl bg-abu p-4" noValidate>
      {galat && (
        <div role="alert" className={alert({ tipe: "error" })}>
          {galat}
        </div>
      )}
      <label className="block text-xs font-medium text-neutral-600">
        Pertanyaan
        <textarea
          value={d.pertanyaan}
          onChange={(e) => setD({ ...d, pertanyaan: e.target.value })}
          rows={2}
          className={`${input({ keadaan: "normal" })} mt-1`}
        />
      </label>
      <fieldset>
        <legend className="text-xs font-medium text-neutral-600">
          Pilihan (pilih bulatan untuk jawaban yang benar)
        </legend>
        <div className="mt-1 space-y-2">
          {d.pilihan.map((p, i) => (
            <div key={`${i}-${d.pilihan.length}`} className="flex items-center gap-2">
              <input
                type="radio"
                name="benar"
                checked={d.jawaban_benar === i}
                onChange={() => setD({ ...d, jawaban_benar: i })}
                aria-label={`Pilihan ${i + 1} adalah jawaban benar`}
              />
              <input
                value={p}
                onChange={(e) => setD({ ...d, pilihan: d.pilihan.map((x, k) => (k === i ? e.target.value : x)) })}
                placeholder={`Pilihan ${String.fromCharCode(65 + i)}`}
                className={input({ keadaan: "normal" })}
              />
              {d.pilihan.length > 2 && (
                <button
                  type="button"
                  onClick={() =>
                    setD({
                      ...d,
                      pilihan: d.pilihan.filter((_, k) => k !== i),
                      jawaban_benar:
                        d.jawaban_benar >= i && d.jawaban_benar > 0 ? d.jawaban_benar - 1 : d.jawaban_benar,
                    })
                  }
                  className="text-xs text-neutral-400 hover:text-rose-600"
                  aria-label={`Hapus pilihan ${i + 1}`}
                >
                  Hapus
                </button>
              )}
            </div>
          ))}
        </div>
        {d.pilihan.length < 6 && (
          <button
            type="button"
            onClick={() => setD({ ...d, pilihan: [...d.pilihan, ""] })}
            className="mt-2 text-xs font-semibold underline underline-offset-2"
          >
            + Tambah pilihan
          </button>
        )}
      </fieldset>
      <label className="block text-xs font-medium text-neutral-600">
        Penjelasan jawaban
        <textarea
          value={d.penjelasan}
          onChange={(e) => setD({ ...d, penjelasan: e.target.value })}
          rows={2}
          className={`${input({ keadaan: "normal" })} mt-1`}
        />
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={kirim} className={tombol({ ukuran: "sm" })}>
          {kirim ? <Spinner /> : idSoal ? "Simpan perubahan" : "Tambah soal"}
        </button>
        <button type="button" onClick={onSelesai} className={tombol({ variant: "halus", ukuran: "sm" })}>
          Batal
        </button>
      </div>
    </form>
  );
}

export function KelolaSoal({ daftar }: { daftar: TugasAdmin[] }) {
  const router = useRouter();
  const toast = useUIStore((s) => s.tampilkanToast);
  const [tambahPada, setTambahPada] = useState<number | null>(null);
  const [ubah, setUbah] = useState<number | null>(null);

  async function hapus(s: SoalAdmin) {
    if (!window.confirm("Hapus soal ini? Skor percobaan lama tidak berubah.")) return;
    try {
      await hapusSoal(s.id_soal);
      toast("Soal dihapus.", "sukses");
      router.refresh();
    } catch (err) {
      toast(err instanceof GalatApi ? err.message : "Gagal menghapus soal.", "error");
    }
  }

  return (
    <div className="mt-4 space-y-6">
      <p className="text-sm text-neutral-500">
        Soal yang diubah langsung berlaku untuk pengguna. Kunci jawaban tidak pernah dikirim ke peramban pengguna.
        Langkah simulasi dan bagian rakit organ saat ini dikelola lewat basis data.
      </p>
      {daftar.map((t) => (
        <section key={t.id_tugas} className={kartu({ padding: "lg" })} aria-label={t.judul}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-lg font-semibold">{t.judul}</h3>
            <p className="text-xs text-neutral-500">
              {t.jenis === "kuis"
                ? `${t.soal.length} soal`
                : `${t.langkah.length} ${t.jenis === "rakit" ? "bagian" : "langkah"}`}{" "}
              · lulus ≥ {t.ambang}
            </p>
          </div>
          {t.jenis !== "kuis" ? (
            <p className="mt-2 text-sm text-neutral-500">{t.deskripsi}</p>
          ) : (
            <>
              <ol className="mt-4 space-y-3">
                {t.soal.map((s, i) =>
                  ubah === s.id_soal ? (
                    <li key={s.id_soal}>
                      <FormSoal
                        awal={{
                          pertanyaan: s.pertanyaan,
                          pilihan: s.pilihan,
                          jawaban_benar: s.jawaban_benar,
                          penjelasan: s.penjelasan,
                        }}
                        idTugas={t.id_tugas}
                        idSoal={s.id_soal}
                        onSelesai={() => setUbah(null)}
                      />
                    </li>
                  ) : (
                    <li key={s.id_soal} className="rounded-2xl bg-abu px-4 py-3 text-sm">
                      <p className="font-semibold">
                        {i + 1}. {s.pertanyaan}
                      </p>
                      <ul className="mt-2 space-y-0.5 text-neutral-600">
                        {s.pilihan.map((p, k) => (
                          <li key={p} className={k === s.jawaban_benar ? "font-semibold text-emerald-700" : ""}>
                            {String.fromCharCode(65 + k)}. {p}
                            {k === s.jawaban_benar && " (benar)"}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-xs text-neutral-500">{s.penjelasan}</p>
                      <div className="mt-2 flex gap-3 text-xs">
                        <button
                          type="button"
                          onClick={() => setUbah(s.id_soal)}
                          className="font-semibold underline underline-offset-2"
                        >
                          Ubah
                        </button>
                        <button
                          type="button"
                          onClick={() => hapus(s)}
                          className="text-rose-600 underline underline-offset-2"
                        >
                          Hapus
                        </button>
                      </div>
                    </li>
                  ),
                )}
              </ol>
              <div className="mt-4">
                {tambahPada === t.id_tugas ? (
                  <FormSoal awal={KOSONG} idTugas={t.id_tugas} onSelesai={() => setTambahPada(null)} />
                ) : (
                  <button
                    type="button"
                    onClick={() => setTambahPada(t.id_tugas)}
                    className={tombol({ variant: "garis", ukuran: "sm" })}
                  >
                    Tambah soal
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      ))}
    </div>
  );
}
