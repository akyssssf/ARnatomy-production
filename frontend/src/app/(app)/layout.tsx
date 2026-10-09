/* Nested Layout kedua (Server Component) untuk area setelah login:
   navigasi kaca + footer dibagikan ke /beranda, /eksplorasi, /asisten,
   /riwayat, /admin dan TIDAK dirender ulang saat berpindah antar rute itu.
   Sesi dibaca dari cookie di server; proxy.ts sudah menjamin keberadaannya. */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Footer } from "@/components/layout/Footer";
import { NavKaca } from "@/components/layout/NavKaca";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { periksaSesi } from "@/lib/auth";

/* Area setelah masuk tidak diindeks mesin pencari (juga di robots.txt) */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function LayoutAplikasi({ children }: LayoutProps<"/">) {
  const hasil = await periksaSesi();
  if (hasil.status === "tanpa-sesi") redirect("/login?auth_error=1");
  /* Akun dinonaktifkan/dihapus admin: cookie dibuang lewat handler logout
     (Server Component tidak bisa menulis cookie), lalu ke /login dengan pesan */
  if (hasil.status === "nonaktif") redirect("/api/logout?alasan=nonaktif");
  const { sesi } = hasil;
  /* Akun Google baru: lengkapi peran + sekolah dulu (FR-02) */
  if (sesi.profil_lengkap === false) redirect("/lengkapi-profil");

  /* QueryProvider hanya di segmen ini: halaman publik (landing/login) tidak
     memuat TanStack Query sama sekali (bundle klien lebih kecil). Keluar dari
     segmen (logout) melepas provider sehingga cache ikut dibuang. */
  return (
    <QueryProvider>
      <NavKaca user={sesi} />
      <main id="konten-utama" tabIndex={-1} className="mx-auto w-full max-w-6xl px-4 pb-16 pt-20 sm:px-6">
        {children}
      </main>
      <Footer />
    </QueryProvider>
  );
}
