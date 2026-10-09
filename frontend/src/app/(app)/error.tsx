"use client";

/* Error boundary segmen (app): wajib Client Component. Menangkap galat
   render/fetch di halaman anak dan menawarkan coba lagi (reset). */
import { useEffect } from "react";
import { Ikon } from "@/components/ui/Ikon";
import { kartu, tombol } from "@/lib/variants";

export default function GalatAplikasi({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section
      role="alert"
      aria-live="assertive"
      className={`${kartu({ padding: "lg" })} mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center`}
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-700">
        <Ikon nama="peringatan" kelas="h-5 w-5" />
      </span>
      <div className="flex-1">
        <h2 className="text-base font-semibold">Terjadi kesalahan saat memuat halaman</h2>
        <p className="mt-0.5 max-w-lg text-sm text-neutral-500">{error.message || "Galat tidak dikenal."}</p>
      </div>
      <button type="button" onClick={reset} className={tombol({ variant: "sekunder", ukuran: "sm" })}>
        Coba lagi
      </button>
    </section>
  );
}
