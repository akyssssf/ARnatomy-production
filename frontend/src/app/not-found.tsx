import Link from "next/link";
import { tombol } from "@/lib/variants";

/* Server Component: halaman 404 */
export default function TidakDitemukan() {
  return (
    <main
      id="konten-utama"
      tabIndex={-1}
      className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-start justify-center px-4 sm:px-6"
    >
      <p className="mikro mb-3">404</p>
      <h1 className="titik-biru text-5xl font-semibold">Halaman tidak ditemukan</h1>
      <p className="mt-4 max-w-md text-sm text-neutral-500">
        Alamat yang dibuka tidak ada. Kembali ke halaman depan atau beranda belajar.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/" className={tombol({ ukuran: "lg" })}>
          Ke halaman depan
        </Link>
        <Link href="/beranda" className={tombol({ variant: "garis", ukuran: "lg" })}>
          Beranda belajar
        </Link>
      </div>
    </main>
  );
}
