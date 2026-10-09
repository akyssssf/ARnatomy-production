/* Profil pengguna: identitas dari akun Google, peran dan asal sekolah (dapat diubah),
   serta ringkasan progres belajar. */
import type { Metadata } from "next";
import Link from "next/link";
import { FormLengkapiProfil } from "@/components/profil/FormLengkapiProfil";
import { TombolKeluar } from "@/components/profil/TombolKeluar";
import { Badge } from "@/components/ui/Badge";
import { JudulHalaman } from "@/components/ui/JudulHalaman";
import { profilSaya, progresTugas } from "@/lib/sumber";
import { kartu } from "@/lib/variants";

export const metadata: Metadata = { title: "Profil" };

const NAMA_PERAN = { siswa: "Siswa", guru: "Guru Biologi", admin: "Administrator" } as const;

export default async function HalamanProfil() {
  const [p, progres] = await Promise.all([profilSaya(), progresTugas().catch(() => null)]);
  if (!p) return null;
  const inisial = p.nama
    .split(/\s+/)
    .slice(0, 2)
    .map((k) => k[0]?.toUpperCase() ?? "")
    .join("");
  const bisaUbah = p.role !== "admin";
  return (
    <section aria-labelledby="judul-profil" className="halaman-masuk">
      <JudulHalaman judul="Profil" id="judul-profil" kicker="Akunku" />
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className={`${kartu({ nada: "aksen", padding: "lg" })} flex flex-col`}>
          <span
            className="grid h-20 w-20 place-items-center rounded-full bg-biru text-2xl font-semibold text-white"
            aria-hidden="true"
          >
            {inisial || "?"}
          </span>
          <h2 className="mt-4 text-2xl font-semibold">{p.nama}</h2>
          <p className="mt-1 break-all text-sm text-neutral-500">{p.email}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>{NAMA_PERAN[p.role]}</Badge>
            {p.npsn_sekolah && <Badge>Sekolah terverifikasi</Badge>}
          </div>
          <dl className="mt-6 space-y-3 text-sm">
            <div>
              <dt className="mikro">Asal sekolah</dt>
              <dd className="mt-1">{p.asal_sekolah ?? "Belum diisi"}</dd>
            </div>
            {p.npsn_sekolah && (
              <div>
                <dt className="mikro">NPSN</dt>
                <dd className="mt-1">{p.npsn_sekolah}</dd>
              </div>
            )}
            {progres && (
              <div>
                <dt className="mikro">Progres tugas</dt>
                <dd className="mt-1">
                  {progres.tugas_selesai} dari {progres.tugas_total} selesai ({progres.persen_selesai}%)
                  {progres.rata_skor_terbaik !== null && <> · rata-rata skor terbaik {progres.rata_skor_terbaik}</>}
                  {" · "}
                  <Link href="/tugas" className="font-semibold underline underline-offset-2">
                    lihat tugas
                  </Link>
                </dd>
              </div>
            )}
          </dl>
          <div className="mt-auto pt-6">
            <TombolKeluar />
          </div>
        </div>
        <div className={kartu({ padding: "lg" })}>
          <p className="mikro">Data diri</p>
          <h2 className="titik-biru mb-5 mt-2 text-2xl font-semibold">Peran dan sekolah</h2>
          {bisaUbah ? (
            <FormLengkapiProfil
              nama={p.nama}
              mode="ubah"
              peranAwal={p.role === "guru" ? "guru" : "siswa"}
              sekolahAwal={
                p.asal_sekolah
                  ? p.npsn_sekolah
                    ? { npsn: p.npsn_sekolah, label: p.asal_sekolah }
                    : { npsn: null, label: p.asal_sekolah }
                  : null
              }
            />
          ) : (
            <p className="text-sm text-neutral-500">Profil administrator dikelola lewat menu Admin &gt; Akun.</p>
          )}
        </div>
      </div>
    </section>
  );
}
