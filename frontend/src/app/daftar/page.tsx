/* Halaman Registrasi (FR-02). Server Component pembungkus: kepala tamu,
   panduan, dan pilihan peran dirender di server; FormDaftar (klien) hanya
   memegang galat + submit. Sudah masuk -> proxy.ts mengalihkan ke beranda. */
import type { Metadata } from "next";
import { DaftarGoogle } from "@/components/daftar/DaftarGoogle";
import { FormDaftar } from "@/components/daftar/FormDaftar";
import { PanduanDaftar } from "@/components/daftar/PanduanDaftar";
import { PilihanPeran } from "@/components/daftar/PilihanPeran";
import { KepalaTamu } from "@/components/layout/KepalaTamu";
import { MunculSegera } from "@/components/motion/MunculSegera";
import { envPublic } from "@/lib/env";
import { kartu } from "@/lib/variants";

export const metadata: Metadata = {
  title: "Daftar akun",
  description: "Buat akun siswa atau guru untuk mulai belajar anatomi dengan model organ 3D.",
};

export default function HalamanDaftar() {
  return (
    <main id="konten-utama" tabIndex={-1} className="halaman-masuk mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
      <section aria-labelledby="judul-daftar" className="pb-6">
        <KepalaTamu tautan={{ href: "/login", label: "Sudah punya akun? Masuk" }} />
        <div className="mt-2 grid gap-4 lg:grid-cols-[1fr_1.15fr]">
          <MunculSegera kelas={`${kartu({ nada: "aksen", padding: "lg" })} flex flex-col justify-between`}>
            <PanduanDaftar />
          </MunculSegera>
          <MunculSegera jeda={120} kelas={kartu({ padding: "lg" })}>
            {envPublic.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? (
              <DaftarGoogle clientId={envPublic.NEXT_PUBLIC_GOOGLE_CLIENT_ID} />
            ) : (
              <FormDaftar pilihanPeran={<PilihanPeran />} />
            )}
          </MunculSegera>
        </div>
      </section>
    </main>
  );
}
