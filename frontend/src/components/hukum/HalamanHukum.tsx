import Link from "next/link";
import { KepalaTamu } from "@/components/layout/KepalaTamu";

export const EMAIL_KONTAK = "b00124354@gmail.com";

/* Server Component: kerangka halaman dokumen hukum publik (kebijakan privasi, syarat penggunaan). */
export function HalamanHukum({
  judul,
  diperbarui,
  children,
}: {
  judul: string;
  diperbarui: string;
  children: React.ReactNode;
}) {
  return (
    <main id="konten-utama" tabIndex={-1} className="mx-auto w-full max-w-3xl px-4 pb-16 sm:px-6">
      <KepalaTamu tautan={{ href: "/login", label: "Masuk" }} />
      <article className="mt-4 rounded-3xl bg-white p-6 sm:p-10">
        <p className="mikro">Dokumen</p>
        <h1 className="titik-biru mt-2 text-4xl font-semibold leading-tight">{judul}</h1>
        <p className="mt-2 text-xs text-neutral-500">Terakhir diperbarui: {diperbarui}</p>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-neutral-700 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-neutral-900 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
          {children}
        </div>
        <nav className="mt-10 flex flex-wrap gap-4 border-t border-black/5 pt-5 text-xs" aria-label="Dokumen lain">
          <Link href="/" className="underline underline-offset-2">
            Beranda
          </Link>
          <Link href="/kebijakan-privasi" className="underline underline-offset-2">
            Kebijakan Privasi
          </Link>
          <Link href="/syarat" className="underline underline-offset-2">
            Syarat Penggunaan
          </Link>
        </nav>
      </article>
    </main>
  );
}
