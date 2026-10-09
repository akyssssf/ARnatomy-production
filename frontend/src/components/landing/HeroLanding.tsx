import Image from "next/image";
import Link from "next/link";
import { Hero3D } from "@/components/hero/Hero3D";
import { MunculSegera } from "@/components/motion/MunculSegera";
import { Ikon } from "@/components/ui/Ikon";
import { JudulKata } from "@/components/ui/JudulKata";
import { Marquee } from "@/components/ui/Marquee";
import type { Organ } from "@/lib/schemas";
import { tombol } from "@/lib/variants";

/* Server Component: hero landing (judul, ajakan, panggung organ 3D, marquee).
   Gambar statis diberi `priority` sebagai elemen LCP; Hero3D memudarkannya
   begitu model siap. */
export function HeroLanding({
  organ,
  sudahMasuk,
  jumlahTersedia,
  jumlahSistem,
}: {
  organ: Organ;
  sudahMasuk: boolean;
  jumlahTersedia: number;
  jumlahSistem: number;
}) {
  return (
    <section id="bagian-atas" aria-labelledby="judul-landing" className="pt-6 sm:pt-10">
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
        <h1
          id="judul-landing"
          className="titik-biru denyut text-[2.9rem] font-semibold leading-[0.92] sm:text-6xl lg:text-[5.75rem]"
        >
          <JudulKata
            baris={[
              ["Belajar", "anatomi"],
              ["lewat", "model", "3D"],
            ]}
          />
        </h1>
        <MunculSegera jeda={300} kelas="flex items-end justify-between gap-6 lg:mb-3">
          <p className="max-w-xs text-sm leading-relaxed text-neutral-500">
            Putar organ, ketuk bagiannya, baca labelnya, lalu tanyakan yang belum jelas ke asisten AI. Dibuat untuk
            siswa SMP dan SMA.
          </p>
          <Link href={sudahMasuk ? "/beranda" : "/login"} className={`${tombol({ ukuran: "lg" })} shrink-0`}>
            {sudahMasuk ? "Ke beranda" : "Masuk"}
            <Ikon nama="panah" />
          </Link>
        </MunculSegera>
      </div>

      <MunculSegera jeda={200} kelas="relative mt-10 overflow-hidden rounded-3xl bg-abu">
        <div className="relative aspect-[4/3] w-full sm:aspect-[16/9] lg:aspect-[21/9]">
          <span className="piringan-organ" aria-hidden="true" />
          <Hero3D urlModel={organ.file_model_3d} jarak={1.95} kecepatanPutar={0.7} />
          <Image
            src={organ.gambar}
            alt="Model 3D jantung manusia"
            width={675}
            height={675}
            priority
            fetchPriority="high"
            sizes="(max-width: 640px) 90vw, 675px"
            className="hero-gambar melayang pointer-events-none absolute left-1/2 top-1/2 h-[82%] w-auto -translate-x-1/2 -translate-y-1/2"
          />
          <p className="mikro kaca absolute left-4 top-4 rounded-full px-3 py-1.5">
            Model 3D &middot; {organ.nama_organ}
          </p>
          <p className="mikro kaca absolute right-4 top-4 hidden rounded-full px-3 py-1.5 sm:block">SKPL v1.0</p>
          <div className="kaca melayang-lambat absolute bottom-4 left-4 max-w-[min(18rem,80%)] rounded-2xl px-4 py-3">
            <p className="mikro">{organ.sistem_organ}</p>
            <p className="mt-1 text-sm font-medium leading-snug">{organ.julukan}. Seret untuk memutar.</p>
          </div>
          <div className="kaca absolute bottom-4 right-4 hidden rounded-2xl px-4 py-3 sm:block">
            <p className="mikro">Sistem organ</p>
            <p className="mt-1 text-2xl font-semibold leading-none">
              {jumlahTersedia} <span className="text-sm font-medium text-neutral-500">dari {jumlahSistem}</span>
            </p>
          </div>
        </div>
      </MunculSegera>

      <MunculSegera jeda={450} kelas="mt-8">
        <Marquee
          daftar={["Sistem Peredaran Darah", "Sistem Pernapasan", "Model Organ 3D", "Label Interaktif", "Asisten AI"]}
          label="Fitur"
        />
      </MunculSegera>
    </section>
  );
}
