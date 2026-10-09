/* Halaman melengkapi profil untuk akun Google baru (FR-02). Dilindungi proxy.ts
   (butuh sesi); bila profil sudah lengkap langsung ke beranda. */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KepalaTamu } from "@/components/layout/KepalaTamu";
import { FormLengkapiProfil } from "@/components/profil/FormLengkapiProfil";
import { ambilSesi } from "@/lib/auth";
import { kartu } from "@/lib/variants";

export const metadata: Metadata = { title: "Lengkapi profil", robots: { index: false, follow: false } };

export default async function HalamanLengkapiProfil() {
  const sesi = await ambilSesi();
  if (!sesi) redirect("/login?auth_error=1");
  if (sesi.profil_lengkap !== false) redirect(sesi.role === "admin" ? "/admin" : "/beranda");
  return (
    <main id="konten-utama" tabIndex={-1} className="halaman-masuk mx-auto w-full max-w-xl px-4 pb-16 sm:px-6">
      <KepalaTamu tautan={{ href: "/login", label: "Kembali ke halaman masuk" }} />
      <div className={`${kartu({ padding: "lg" })} mt-6`}>
        <p className="mikro">Akun Google</p>
        <h1 className="titik-biru mb-6 mt-3 text-3xl font-semibold">Lengkapi profil</h1>
        <FormLengkapiProfil nama={sesi.nama} />
        <a href="/api/logout" className="mt-6 block text-xs text-neutral-500 underline underline-offset-2">
          Keluar dari akun ini
        </a>
      </div>
    </main>
  );
}
