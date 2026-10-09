/* Dashboard Administrator (FR-10, FR-11, FR-12, FR-13, FR-15). Server Component:
   memeriksa peran (lapisan kedua setelah proxy.ts), lalu MEM-PREFETCH query
   ['konten'], ['laporan'], ['akun'] di server (tab Aset 3D dan Umpan Balik
   dirender sebagai RSC dari basis data) dan mengirimnya lewat
   HydrationBoundary sehingga useQuery di klien langsung terisi tanpa
   loading tambahan. loading.tsx tampil selama prefetch berjalan. */
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DaftarAset } from "@/components/admin/DaftarAset";
import { PanelTugasAdmin } from "@/components/admin/PanelTugasAdmin";
import { RingkasanSusAdmin } from "@/components/admin/RingkasanSusAdmin";
import { TabAdmin } from "@/components/admin/TabAdmin";
import { JudulHalaman } from "@/components/ui/JudulHalaman";
import { KUNCI } from "@/hooks/kunci-query";
import { ambilSesi } from "@/lib/auth";
import { jeda } from "@/lib/db";
import { semuaAkun, semuaAset, semuaKonten, semuaLaporan, semuaUmpanBalik } from "@/lib/sumber";

export const metadata: Metadata = {
  title: "Dashboard Admin",
  description: "Kelola konten label, laporan kesalahan, akun pengguna, aset model 3D, dan hasil kuesioner SUS.",
};

export default async function HalamanAdmin() {
  const sesi = await ambilSesi();
  if (sesi?.role !== "admin") redirect("/beranda?pesan=khusus-admin");

  const queryClient = new QueryClient();
  await jeda(500);
  const akun = await semuaAkun();
  await Promise.all([
    queryClient.prefetchQuery({ queryKey: KUNCI.konten, queryFn: () => semuaKonten() }),
    queryClient.prefetchQuery({ queryKey: KUNCI.laporan, queryFn: () => semuaLaporan() }),
    queryClient.prefetchQuery({ queryKey: KUNCI.akun, queryFn: () => akun }),
  ]);

  return (
    <section aria-labelledby="judul-admin" className="halaman-masuk">
      <JudulHalaman
        judul="Dashboard Admin"
        deskripsi="Kelola konten label, tindak lanjuti laporan kesalahan, atur akun pengguna dan aset model 3D, serta pantau skor SUS."
        id="judul-admin"
        kicker="Administrator"
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <TabAdmin
          idAdmin={sesi.id_user}
          panelAset={<DaftarAset daftar={await semuaAset()} />}
          panelTugas={<PanelTugasAdmin />}
          panelUmpanBalik={<RingkasanSusAdmin daftar={await semuaUmpanBalik()} akun={akun} />}
        />
      </HydrationBoundary>
    </section>
  );
}
