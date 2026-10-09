/* Eksplorasi organ 3D (FR-03..FR-07, FR-09, FR-14).
   Server Component: memilih organ dari ?organ=<id>, membaca data statis
   (organ, bagian, layer) dan part_content terkini dari basis data mock,
   lalu mengoper semuanya sebagai props ke PenampilOrgan (Client Component
   yang memegang kanvas Three.js). Metadata dinamis lewat generateMetadata.
   Riwayat belajar di-prefetch ke cache TanStack Query untuk penanda
   "sudah dibuka" pada daftar bagian. */
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KepalaEksplorasi } from "@/components/eksplorasi/KepalaEksplorasi";
import { KeteranganModel } from "@/components/eksplorasi/KeteranganModel";
import { PemilihOrgan } from "@/components/eksplorasi/PemilihOrgan";
import { PenampilOrgan } from "@/components/eksplorasi/PenampilOrgan";
import { KUNCI } from "@/hooks/kunci-query";
import { ambilSesi } from "@/lib/auth";
import { bagianOrgan, layerOrgan, organById, organs } from "@/lib/data";
import { asetOrgan, riwayatUser, semuaKonten } from "@/lib/sumber";

/* Tanpa ?organ= -> organ pertama; ?organ= yang tidak terdaftar -> null (404) */
function organDariQuery(nilai: string | string[] | undefined) {
  if (nilai === undefined || nilai === "") return organs[0] ?? null;
  return organById(Number(nilai));
}

export async function generateMetadata(props: PageProps<"/eksplorasi">): Promise<Metadata> {
  const organ = organDariQuery((await props.searchParams).organ);
  return {
    title: organ ? `Eksplorasi ${organ.nama_organ}` : "Eksplorasi",
    description: organ
      ? `Model 3D ${organ.nama_organ} (${organ.sistem_organ}): putar, perbesar, dan buka label tiap bagian.`
      : undefined,
  };
}

export default async function HalamanEksplorasi(props: PageProps<"/eksplorasi">) {
  const [sesi, query] = await Promise.all([ambilSesi(), props.searchParams]);
  if (!sesi) return null;
  const organDasar = organDariQuery(query.organ);
  if (!organDasar) notFound();
  /* FR-12: model unggahan admin (bila ada) menggantikan berkas bawaan */
  const aset = await asetOrgan(organDasar.id_organ);
  const organ = { ...organDasar, file_model_3d: aset?.url ?? organDasar.file_model_3d };

  const bagian = bagianOrgan(organ.id_organ);
  /* Organ dalam selalu tampil, jadi hanya selubung luar yang jadi toggle */
  const layers = layerOrgan(organ.id_organ).filter((l) => l.nama_layer !== "organ_dalam");
  const idBagian = new Set(bagian.map((b) => b.id_bagian));
  const konten = (await semuaKonten()).filter((k) => idBagian.has(k.id_bagian));

  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({ queryKey: KUNCI.riwayat, queryFn: () => riwayatUser(sesi.id_user) });

  return (
    <section aria-labelledby="judul-eksplorasi" className="halaman-masuk">
      <HydrationBoundary state={dehydrate(queryClient)}>
        {/* key = id organ: penampil dibangun ulang saat organ berganti.
            Judul dan pemilih organ tetap Server Component, dioper sebagai node. */}
        <PenampilOrgan
          key={organ.id_organ}
          organ={organ}
          bagian={bagian}
          layers={layers}
          konten={konten}
          judul={<KepalaEksplorasi organ={organ} />}
          pemilihOrgan={<PemilihOrgan organs={organs} aktifId={organ.id_organ} />}
          keterangan={<KeteranganModel organ={organ} aset={aset} />}
        />
      </HydrationBoundary>
    </section>
  );
}
