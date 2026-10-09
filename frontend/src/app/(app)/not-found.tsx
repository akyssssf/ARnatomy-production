import Link from "next/link";
import { KondisiKosong } from "@/components/ui/KondisiKosong";
import { tombol } from "@/lib/variants";

/* Server Component: 404 di dalam area aplikasi (dipicu notFound() dari
   halaman, mis. ?organ= yang tidak ada). Dirender di dalam layout (app)
   sehingga navigasi dan sesi tetap tersedia. */
export default function TidakDitemukanAplikasi() {
  return (
    <section aria-labelledby="judul-404" className="halaman-masuk pt-6 sm:pt-8">
      <p className="mikro mb-3">404</p>
      <h1 id="judul-404" className="titik-biru mb-6 text-4xl font-semibold sm:text-5xl">
        Tidak ditemukan
      </h1>
      <KondisiKosong
        judul="Data yang diminta tidak ada"
        deskripsi="Organ atau halaman yang dibuka tidak terdaftar. Pilih organ dari katalog yang tersedia."
        aksi={
          <Link href="/eksplorasi" className={tombol({ ukuran: "sm" })}>
            Ke Eksplorasi
          </Link>
        }
      />
    </section>
  );
}
