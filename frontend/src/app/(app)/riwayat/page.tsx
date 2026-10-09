/* Riwayat Belajar (FR-14): Server Component async. Data dibaca langsung
   dari basis data mock di server; selama menunggu, riwayat/loading.tsx
   ditampilkan otomatis lewat Streaming SSR. */
import type { Metadata } from "next";
import Link from "next/link";
import { TabelRiwayat } from "@/components/riwayat/TabelRiwayat";
import { JudulHalaman } from "@/components/ui/JudulHalaman";
import { KartuStatistik } from "@/components/ui/KartuStatistik";
import { KondisiKosong } from "@/components/ui/KondisiKosong";
import { ambilSesi } from "@/lib/auth";
import { body_parts } from "@/lib/data";
import { jeda } from "@/lib/db";
import { progresTugas, ringkasanRiwayat, semuaKonten } from "@/lib/sumber";
import { tombol } from "@/lib/variants";

export const metadata: Metadata = {
  title: "Riwayat Belajar",
  description: "Rekam jejak bagian tubuh yang sudah dibuka pada sesi belajar ini.",
};

export default async function HalamanRiwayat() {
  const sesi = await ambilSesi();
  if (!sesi) return null;
  await jeda(600); // latensi buatan supaya loading.tsx terlihat
  const [rekap, tugas] = await Promise.all([ringkasanRiwayat(sesi.id_user), progresTugas().catch(() => null)]);

  const tombolMulai = (
    <Link href="/eksplorasi" className={tombol({ ukuran: "sm" })}>
      Buka halaman Eksplorasi
    </Link>
  );

  const bagianTugas = tugas && tugas.percobaan_terbaru.length > 0 && (
    <div className="mt-6 rounded-2xl bg-white p-6">
      <h2 className="text-base font-semibold">Riwayat tugas belajar</h2>
      <p className="mt-1 text-xs text-neutral-500">
        {tugas.tugas_selesai} dari {tugas.tugas_total} tugas selesai · rata-rata skor terbaik{" "}
        {tugas.rata_skor_terbaik ?? "-"}
      </p>
      <ul className="mt-3 divide-y divide-black/5 text-sm">
        {tugas.percobaan_terbaru.map((p) => (
          <li key={p.id_percobaan} className="flex items-center justify-between gap-3 py-2">
            <span>{p.judul}</span>
            <span className="text-neutral-500">
              {p.benar}/{p.total} · skor <strong className="text-neutral-900">{p.skor}</strong> ·{" "}
              {new Date(p.waktu).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );

  if (!rekap.length) {
    return (
      <section aria-labelledby="judul-riwayat" className="halaman-masuk">
        <JudulHalaman
          judul="Riwayat Belajar"
          deskripsi="Bagian tubuh yang telah dibuka pada sesi ini."
          id="judul-riwayat"
          kicker="Rekam jejak"
        />
        <KondisiKosong
          judul="Belum ada riwayat"
          deskripsi="Riwayat terisi otomatis setiap kali label dibuka pada halaman Eksplorasi."
          aksi={tombolMulai}
        />
        {bagianTugas}
      </section>
    );
  }

  const totalKunjungan = rekap.reduce((jml, r) => jml + r.jumlah, 0);
  const totalDimmed = rekap.filter((r) => r.dimmedDibuka).length;
  const statistik = [
    { label: "Bagian dipelajari", nilai: `${rekap.length} / ${body_parts.length}` },
    { label: "Total kunjungan label", nilai: String(totalKunjungan) },
    { label: "Label dimmed dibuka", nilai: String(totalDimmed) },
  ];

  return (
    <section aria-labelledby="judul-riwayat" className="halaman-masuk">
      <JudulHalaman
        judul="Riwayat Belajar"
        deskripsi="Bagian tubuh yang telah dibuka pada sesi ini."
        id="judul-riwayat"
        kicker="Rekam jejak"
      />
      <KartuStatistik daftar={statistik} />
      <TabelRiwayat rekap={rekap} konten={await semuaKonten()} />
      {bagianTugas}
      <p className="mt-3 px-1 text-xs text-neutral-400">
        Riwayat disimpan di memori server selama sesi berjalan dan dibuang saat kamu keluar.
      </p>
    </section>
  );
}
