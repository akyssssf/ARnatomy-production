/* Asisten AI (FR-08). Server Component: menyiapkan daftar organ/bagian
   (data statis) dan konteks awal dari ?bagian=, mem-prefetch riwayat
   percakapan ke cache TanStack Query, lalu menyerahkan interaksi ke
   ChatAsisten (Client Component). */
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import type { Metadata } from "next";
import { ChatAsisten } from "@/components/asisten/ChatAsisten";
import { OpsiKonteks } from "@/components/asisten/OpsiKonteks";
import { JudulHalaman } from "@/components/ui/JudulHalaman";
import { KUNCI } from "@/hooks/kunci-query";
import { ambilSesi } from "@/lib/auth";
import { bagianById, body_parts, organs } from "@/lib/data";
import { percakapanUser } from "@/lib/sumber";

export const metadata: Metadata = {
  title: "Asisten AI",
  description: "Tanya jawab anatomi dengan konteks bagian tubuh yang sedang dipelajari.",
};

export default async function HalamanAsisten(props: PageProps<"/asisten">) {
  const [sesi, query] = await Promise.all([ambilSesi(), props.searchParams]);
  if (!sesi) return null;
  const idBagianAwal = bagianById(Number(query.bagian))?.id_bagian ?? null;

  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({ queryKey: KUNCI.percakapan, queryFn: () => percakapanUser(sesi.id_user) });

  return (
    <section aria-labelledby="judul-asisten" className="halaman-masuk mx-auto max-w-4xl">
      <JudulHalaman
        judul="Asisten AI"
        id="judul-asisten"
        kicker="Tanya jawab"
        deskripsi="Jawaban disusun menurut bagian tubuh yang dipilih sebagai konteks, dengan bahasa untuk jenjang SMP dan SMA."
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ChatAsisten
          bagian={body_parts}
          idBagianAwal={idBagianAwal}
          opsiKonteks={<OpsiKonteks organs={organs} bagian={body_parts} />}
        />
      </HydrationBoundary>
    </section>
  );
}
