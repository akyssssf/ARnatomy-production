/* Umpan balik sesi uji coba (FR-15): kuesioner System Usability Scale.
   Server Component: membaca kiriman pengguna langsung dari basis data mock,
   merender pernyataan dan ringkasan sebagai RSC, lalu mengoper keduanya ke
   FormSus (klien) yang hanya memegang mode, komentar, dan submit. */
import type { Metadata } from "next";
import { JudulHalaman } from "@/components/ui/JudulHalaman";
import { FormSus } from "@/components/umpan-balik/FormSus";
import { DaftarPernyataanSus } from "@/components/umpan-balik/PernyataanSus";
import { RingkasanSus } from "@/components/umpan-balik/RingkasanSus";
import { ambilSesi } from "@/lib/auth";
import { umpanBalikUser } from "@/lib/sumber";

export const metadata: Metadata = {
  title: "Umpan Balik",
  description: "Isi kuesioner System Usability Scale setelah mencoba ARnatomy.",
};

export default async function HalamanUmpanBalik() {
  const sesi = await ambilSesi();
  if (!sesi) return null;
  const sebelumnya = await umpanBalikUser(sesi.id_user);

  return (
    <section aria-labelledby="judul-umpan-balik" className="halaman-masuk">
      <JudulHalaman
        judul="Umpan balik sesi uji coba"
        deskripsi="Sepuluh pernyataan System Usability Scale (SUS). Pilih seberapa setuju kamu dengan tiap pernyataan; skor 0-100 dihitung otomatis."
        id="judul-umpan-balik"
        kicker="FR-15 · Kuesioner SUS"
      />
      <FormSus
        pernyataan={<DaftarPernyataanSus jawabanAwal={sebelumnya?.jawaban} />}
        ringkasan={sebelumnya ? <RingkasanSus umpanBalik={sebelumnya} /> : null}
        komentarAwal={sebelumnya?.komentar ?? ""}
      />
    </section>
  );
}
