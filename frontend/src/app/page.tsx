/* Landing publik (Server Component). Seluruh bagian dirender di server dari
   data statis; klien hanya Hero3D (kanvas), NavKaca (gulir), dan Muncul. */
import type { Metadata } from "next";
import { AjakanMasuk } from "@/components/landing/AjakanMasuk";
import { HeroLanding } from "@/components/landing/HeroLanding";
import { KatalogSistem } from "@/components/landing/KatalogSistem";
import { LangkahBelajar } from "@/components/landing/LangkahBelajar";
import { Footer } from "@/components/layout/Footer";
import { NavKaca } from "@/components/layout/NavKaca";
import { ambilSesi } from "@/lib/auth";
import { organs, sistem_organ } from "@/lib/data";

export const metadata: Metadata = {
  title: "ARnatomy — Belajar anatomi lewat model 3D",
  description:
    "Katalog sistem organ ARnatomy: putar organ, ketuk bagiannya, baca labelnya, lalu tanyakan ke asisten AI.",
};

export default async function HalamanLanding() {
  const sesi = await ambilSesi();
  const organ = organs[0];
  const paru = organs[1];
  if (!organ || !paru) throw new Error("data organ awal tidak lengkap.");

  return (
    <>
      <NavKaca user={sesi} />
      <main id="konten-utama" tabIndex={-1} className="halaman-masuk mx-auto w-full max-w-6xl px-4 pb-16 pt-20 sm:px-6">
        <HeroLanding
          organ={organ}
          sudahMasuk={sesi !== null}
          jumlahTersedia={sistem_organ.filter((s) => s.status === "tersedia").length}
          jumlahSistem={sistem_organ.length}
        />
        <KatalogSistem sistem={sistem_organ} />
        <LangkahBelajar />
        <AjakanMasuk gambar={paru.gambar} />
      </main>
      <Footer />
    </>
  );
}
