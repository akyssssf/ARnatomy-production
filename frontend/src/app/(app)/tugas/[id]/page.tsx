/* Halaman satu tugas: pemain kuis atau simulasi alur (Client Component). */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PemainKuis } from "@/components/tugas/PemainKuis";
import { PemainRakit } from "@/components/tugas/PemainRakit";
import { PemainSimulasi } from "@/components/tugas/PemainSimulasi";
import { JudulHalaman } from "@/components/ui/JudulHalaman";
import { KondisiKosong } from "@/components/ui/KondisiKosong";
import { isiTugas } from "@/lib/sumber";

export const metadata: Metadata = { title: "Tugas" };

export default async function HalamanSatuTugas(props: PageProps<"/tugas/[id]">) {
  const id = Number((await props.params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const tugas = await isiTugas(id).catch(() => null);
  if (!tugas) {
    return (
      <section className="halaman-masuk">
        <KondisiKosong
          judul="Tugas tidak ditemukan"
          deskripsi="Tugas belum tersedia atau backend belum dihubungkan."
          aksi={
            <Link href="/tugas" className="text-sm font-semibold underline">
              Kembali ke daftar tugas
            </Link>
          }
        />
      </section>
    );
  }
  return (
    <section aria-labelledby="judul-tugas" className="halaman-masuk">
      <Link href="/tugas" className="mt-4 inline-block text-xs text-neutral-500 underline underline-offset-2">
        ← Semua tugas
      </Link>
      <JudulHalaman
        judul={tugas.judul}
        deskripsi={tugas.deskripsi}
        id="judul-tugas"
        kicker={tugas.jenis === "kuis" ? "Kuis" : tugas.jenis === "rakit" ? "Rakit organ" : "Simulasi"}
      />
      {tugas.jenis === "kuis" && tugas.soal ? <PemainKuis tugas={tugas} soal={tugas.soal} /> : null}
      {tugas.jenis === "simulasi" && tugas.langkah ? <PemainSimulasi tugas={tugas} langkah={tugas.langkah} /> : null}
      {tugas.jenis === "rakit" && tugas.langkah ? <PemainRakit tugas={tugas} bagian={tugas.langkah} /> : null}
    </section>
  );
}
