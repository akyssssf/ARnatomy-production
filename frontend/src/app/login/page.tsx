/* Halaman Login (Server Component pembungkus). Hero, statistik, dan kartu
   dirender di server; hanya FormLogin (state + Zod) dan Hero3D yang klien.
   Pesan dari proxy (?auth_error=1) dibaca lewat searchParams. */
import type { Metadata } from "next";
import Link from "next/link";
import { KepalaTamu } from "@/components/layout/KepalaTamu";
import { FormLogin } from "@/components/login/FormLogin";
import { HeroLogin } from "@/components/login/HeroLogin";
import { MunculSegera } from "@/components/motion/MunculSegera";
import { body_parts, organs, part_content_awal } from "@/lib/data";
import { envPublic } from "@/lib/env";
import { kartu } from "@/lib/variants";

export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk ke ARnatomy dengan akun siswa, guru, atau administrator.",
};

export default async function HalamanLogin(props: PageProps<"/login">) {
  const query = await props.searchParams;
  const pesanAuth: Record<string, string> = {
    "1": "Masuk dulu untuk membuka halaman itu.",
    nonaktif: "Akun ini dinonaktifkan oleh administrator. Hubungi pengelola untuk mengaktifkannya kembali.",
    keluar: "Sesi sudah diakhiri. Silakan masuk kembali.",
  };
  const pesanAwal = typeof query.auth_error === "string" ? (pesanAuth[query.auth_error] ?? null) : null;
  const tujuan = typeof query.next === "string" ? query.next : null;
  const organ = organs[0];
  if (!organ) throw new Error("data organ awal tidak lengkap.");

  return (
    <main id="konten-utama" tabIndex={-1} className="halaman-masuk mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
      <section aria-labelledby="judul-login" className="pb-6">
        <KepalaTamu tautan={{ href: "/daftar", label: "Belum punya akun? Daftar" }} />

        <div className="mt-1 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="order-2 lg:order-1">
            <HeroLogin
              organ={organ}
              jumlahOrgan={organs.length}
              jumlahBagian={body_parts.length}
              jumlahLabel={part_content_awal.length}
            />
          </div>
          <MunculSegera
            jeda={150}
            kelas={`${kartu({ padding: "lg" })} order-1 flex flex-col justify-center lg:order-2 lg:h-[min(640px,calc(100vh-150px))] lg:px-12`}
          >
            <p className="mikro">Masuk</p>
            <h2 className="titik-biru mt-3 text-4xl font-semibold leading-tight">Selamat datang</h2>
            <p className="mb-8 mt-3 max-w-sm text-sm leading-relaxed text-neutral-500">
              Masuk dengan akun Google untuk melanjutkan belajar, atau daftar otomatis saat pertama kali masuk.
            </p>
            <FormLogin
              pesanAwal={pesanAwal}
              tujuanAwal={tujuan}
              googleClientId={envPublic.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? null}
            />
            <p className="mt-8 border-t border-black/5 pt-5 text-xs text-neutral-500">
              Belum punya akun?{" "}
              <Link href="/daftar" className="font-semibold text-neutral-900 underline underline-offset-2">
                Daftar sebagai siswa atau guru
              </Link>
              {" · "}
              <Link href="/kebijakan-privasi" className="underline underline-offset-2">
                Privasi
              </Link>
              {" · "}
              <Link href="/syarat" className="underline underline-offset-2">
                Syarat
              </Link>
            </p>
          </MunculSegera>
        </div>
      </section>
    </main>
  );
}
