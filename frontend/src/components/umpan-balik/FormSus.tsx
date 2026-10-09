"use client";

/* Client: pembungkus formulir SUS (FR-15). Pernyataan (radio tak terkendali)
   dan ringkasan kiriman sebelumnya dioper sebagai Server Component; komponen
   ini hanya memegang mode lihat/isi, komentar, dan submit: FormData ->
   UmpanBalikFormSchema (Zod) -> useUmpanBalik().kirim -> router.refresh()
   agar ringkasan RSC dirender ulang dengan skor terbaru. */
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { Ikon } from "@/components/ui/Ikon";
import { Spinner } from "@/components/ui/Spinner";
import { useUmpanBalik } from "@/hooks/useUmpanBalik";
import { GalatApi } from "@/lib/mock-api";
import { JAWABAN_SUS, UmpanBalikFormSchema } from "@/lib/schemas";
import { alert, kartu, tombol } from "@/lib/variants";
import { useUIStore } from "@/store/useUIStore";

export function FormSus({
  pernyataan,
  ringkasan,
  komentarAwal,
}: {
  pernyataan: React.ReactNode;
  ringkasan: React.ReactNode | null;
  komentarAwal: string;
}) {
  const router = useRouter();
  const { kirim } = useUmpanBalik();
  const tampilkanToast = useUIStore((s) => s.tampilkanToast);
  const [mode, setMode] = useState<"lihat" | "isi">(ringkasan ? "lihat" : "isi");
  const [komentar, setKomentar] = useState(komentarAwal);
  const [diperiksa, setDiperiksa] = useState(false);
  const [galatUmum, setGalatUmum] = useState<string | null>(null);

  async function saatSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGalatUmum(null);
    setDiperiksa(true);
    const data = new FormData(e.currentTarget);
    const jawaban = Array.from({ length: JAWABAN_SUS }, (_, i) => Number(data.get(`sus-${i}`) ?? 0));
    const kosong = jawaban.flatMap((j, i) => (j === 0 ? [i + 1] : []));
    if (kosong.length) {
      setGalatUmum(`Pernyataan ${kosong.join(", ")} belum dijawab.`);
      document.getElementById(`sus-${(kosong[0] ?? 1) - 1}-1`)?.focus();
      return;
    }
    const hasil = UmpanBalikFormSchema.safeParse({ jawaban, komentar: komentar || undefined });
    if (!hasil.success) {
      setGalatUmum(hasil.error.issues[0]?.message ?? "Isian tidak valid.");
      return;
    }
    try {
      const entri = await kirim.mutateAsync(hasil.data);
      tampilkanToast(`Terima kasih! Skor SUS kamu ${entri.skor_sus}.`, "sukses");
      /* refresh + ganti mode dalam satu transisi: ringkasan lama tidak sempat tampil */
      startTransition(() => {
        router.refresh();
        setMode("lihat");
        setDiperiksa(false);
      });
    } catch (kesalahan) {
      setGalatUmum(kesalahan instanceof GalatApi ? kesalahan.message : "Gagal mengirim kuesioner.");
    }
  }

  if (ringkasan && mode === "lihat") {
    return (
      <div>
        {ringkasan}
        <button
          type="button"
          onClick={() => setMode("isi")}
          className={`${tombol({ variant: "sekunder", ukuran: "sm" })} mt-4`}
        >
          Isi ulang kuesioner
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={saatSubmit} noValidate data-diperiksa={diperiksa ? "" : undefined} className="group space-y-4">
      {galatUmum && (
        <div role="alert" aria-live="assertive" className={alert({ tipe: "error" })}>
          {galatUmum}
        </div>
      )}

      {pernyataan}

      <div className={kartu({ padding: "md" })}>
        <label htmlFor="sus-komentar" className="mikro mb-2 block">
          Komentar (opsional)
        </label>
        <textarea
          id="sus-komentar"
          name="komentar"
          value={komentar}
          onChange={(e) => setKomentar(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Bagian mana yang paling membantu atau membingungkan?"
          className="w-full rounded-xl bg-abu px-3.5 py-2.5 text-sm text-neutral-900 transition placeholder:text-neutral-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-biru"
        />
        <p className="mt-1 text-right text-[11px] text-neutral-400">{komentar.length}/500</p>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {ringkasan && (
          <button type="button" onClick={() => setMode("lihat")} className={tombol({ variant: "garis", ukuran: "md" })}>
            Batal
          </button>
        )}
        <button type="submit" disabled={kirim.isPending} className={tombol({ ukuran: "md" })}>
          {kirim.isPending ? (
            <>
              <Spinner /> Mengirim
            </>
          ) : (
            <>
              Kirim kuesioner
              <Ikon nama="kirim" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
