"use client";

/* Error boundary segmen akar untuk halaman publik (landing, login, daftar).
   Halaman setelah masuk memakai (app)/error.tsx yang dirender di dalam
   layout bernavigasi. Wajib Client Component. */
import Link from "next/link";
import { useEffect } from "react";
import { Ikon } from "@/components/ui/Ikon";
import { kartu, tombol } from "@/lib/variants";

export default function GalatPublik({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      id="konten-utama"
      tabIndex={-1}
      className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-4 sm:px-6"
    >
      <section role="alert" aria-live="assertive" className={`${kartu({ padding: "lg" })} max-w-xl`}>
        <span className="grid h-11 w-11 place-items-center rounded-full bg-rose-50 text-rose-700">
          <Ikon nama="peringatan" kelas="h-5 w-5" />
        </span>
        <p className="mikro mt-5">Terjadi kesalahan</p>
        <h1 className="titik-biru mt-2 text-3xl font-semibold">Halaman gagal dimuat</h1>
        <p className="mt-3 text-sm text-neutral-500">{error.message || "Galat tidak dikenal."}</p>
        {error.digest && <p className="mt-1 text-[11px] text-neutral-400">Kode: {error.digest}</p>}
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={reset} className={tombol({ ukuran: "md" })}>
            Coba lagi
          </button>
          <Link href="/" className={tombol({ variant: "garis", ukuran: "md" })}>
            Ke halaman depan
          </Link>
        </div>
      </section>
    </main>
  );
}
