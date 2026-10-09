import Image from "next/image";
import { Hero3D } from "@/components/hero/Hero3D";
import { MunculSegera } from "@/components/motion/MunculSegera";
import { JudulKata } from "@/components/ui/JudulKata";
import type { Organ } from "@/lib/schemas";

/* Server Component: panel kiri halaman login. Satu kartu setinggi layar: judul di kiri atas,
   model jantung 3D mengisi kartu, dan ringkasan isi di kiri bawah. */
export function HeroLogin({
  organ,
  jumlahOrgan,
  jumlahBagian,
  jumlahLabel,
}: {
  organ: Organ;
  jumlahOrgan: number;
  jumlahBagian: number;
  jumlahLabel: number;
}) {
  return (
    <MunculSegera
      jeda={100}
      kelas="relative h-[440px] overflow-hidden rounded-3xl bg-abu lg:h-[min(640px,calc(100vh-150px))]"
    >
      <span className="piringan-organ" aria-hidden="true" />
      <Hero3D urlModel={organ.file_model_3d} jarak={2.7} kecepatanPutar={0.8} />
      <Image
        src={organ.gambar}
        alt="Model 3D jantung manusia"
        width={520}
        height={520}
        priority
        fetchPriority="high"
        sizes="(max-width: 640px) 90vw, 560px"
        className="hero-gambar melayang pointer-events-none absolute bottom-[4%] left-1/2 h-[42%] w-auto sm:h-[56%] -translate-x-1/2 object-contain"
      />
      <div className="pointer-events-none absolute left-6 top-6 z-10 sm:left-8 sm:top-8">
        <h1
          id="judul-login"
          className="titik-biru denyut text-[2.4rem] font-semibold leading-[0.92] sm:text-5xl lg:text-[3.4rem]"
        >
          <JudulKata
            baris={[
              ["Belajar", "anatomi"],
              ["lewat", "model", "3D"],
            ]}
          />
        </h1>
        <p className="mt-3 max-w-xs text-sm leading-relaxed text-neutral-500">
          Putar organ, buka label tiap bagian, kerjakan tugas, dan tanya asisten AI.
        </p>
      </div>
      <p className="mikro kaca absolute right-5 top-5 z-10 hidden rounded-full px-3 py-1.5 sm:block">Model 3D</p>
      <div className="kaca melayang-lambat absolute bottom-5 left-5 z-10 rounded-2xl px-4 py-3">
        <p className="mikro">{jumlahOrgan} organ</p>
        <p className="mt-1 text-2xl font-semibold leading-none">
          {jumlahBagian} <span className="text-sm font-medium text-neutral-500">bagian</span>
        </p>
        <p className="mt-1 text-xs text-neutral-500">{jumlahLabel} label dasar dan dimmed</p>
      </div>
    </MunculSegera>
  );
}
