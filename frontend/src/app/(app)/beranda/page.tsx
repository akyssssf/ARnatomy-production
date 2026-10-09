/* Beranda: dashboard belajar siswa (Server Component, async).
   Progres dihitung di server dari learning_history milik pengguna;
   aktivitas terakhir di-stream lewat <Suspense>. */
import type { Metadata } from "next";
import { Suspense } from "react";
import { AktivitasTerakhir, AktivitasTerakhirSkeleton } from "@/components/beranda/AktivitasTerakhir";
import { GridSistemOrgan } from "@/components/beranda/GridSistemOrgan";
import { KartuLanjutkan } from "@/components/beranda/KartuLanjutkan";
import { KartuRingkasan } from "@/components/beranda/KartuRingkasan";
import { KartuTugas } from "@/components/beranda/KartuTugas";
import { Pintasan } from "@/components/beranda/Pintasan";
import { SapaanBeranda } from "@/components/beranda/SapaanBeranda";
import { Muncul } from "@/components/motion/Muncul";
import { Alert } from "@/components/ui/Alert";
import { ambilSesi } from "@/lib/auth";
import { bagianById, bagianOrgan, body_parts, organById, organs } from "@/lib/data";
import { percakapanUser, riwayatUser } from "@/lib/sumber";

export const metadata: Metadata = {
  title: "Beranda",
  description: "Dashboard belajar: progres tiap sistem organ, lanjutkan belajar, dan aktivitas terakhir.",
};

function progresOrgan(idOrgan: number, idBagianDibuka: Set<number>) {
  const semua = bagianOrgan(idOrgan);
  const dipelajari = semua.filter((b) => idBagianDibuka.has(b.id_bagian)).length;
  return { dipelajari, total: semua.length, persen: semua.length ? Math.round((dipelajari / semua.length) * 100) : 0 };
}

export default async function HalamanBeranda(props: PageProps<"/beranda">) {
  const [sesi, query] = await Promise.all([ambilSesi(), props.searchParams]);
  if (!sesi) return null; // dijaga proxy + layout
  const pesanKhusus = query.pesan === "khusus-admin";

  const riwayat = await riwayatUser(sesi.id_user);
  const idDibuka = new Set(riwayat.map((r) => r.id_bagian));
  const persenTotal = body_parts.length ? Math.round((idDibuka.size / body_parts.length) * 100) : 0;
  const bagianTerakhir = bagianById(riwayat.at(-1)?.id_bagian);
  const organLanjut = organById(bagianTerakhir?.id_organ) ?? organs[0];
  if (!organLanjut) throw new Error("data organ awal tidak lengkap.");

  return (
    <section aria-labelledby="judul-beranda" className="halaman-masuk">
      {pesanKhusus && (
        <Alert tipe="info" kelas="mt-4">
          Dashboard Admin hanya untuk peran administrator. Kamu diarahkan ke beranda.
        </Alert>
      )}
      <SapaanBeranda sesi={sesi} />

      <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Muncul>
          <KartuLanjutkan
            organ={organLanjut}
            bagianTerakhir={bagianTerakhir}
            progres={progresOrgan(organLanjut.id_organ, idDibuka)}
          />
        </Muncul>
        <Muncul jeda={80}>
          <KartuRingkasan
            persen={persenTotal}
            dibuka={idDibuka.size}
            total={body_parts.length}
            dimmed={riwayat.filter((r) => r.jenis_konten === "dimmed").length}
            tanya={(await percakapanUser(sesi.id_user)).length}
          />
        </Muncul>
      </div>

      <GridSistemOrgan persenOrgan={(idOrgan) => progresOrgan(idOrgan, idDibuka).persen} />

      <Suspense fallback={null}>
        <KartuTugas />
      </Suspense>

      <div className="mt-12 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Suspense fallback={<AktivitasTerakhirSkeleton />}>
          <AktivitasTerakhir idUser={sesi.id_user} />
        </Suspense>
        <Pintasan peran={sesi.role} />
      </div>
    </section>
  );
}
