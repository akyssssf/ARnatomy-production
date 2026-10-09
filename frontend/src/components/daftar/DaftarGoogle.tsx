"use client";

/* Client leaf: pendaftaran lewat Google (FR-02). Akun dibuat saat pertama kali masuk dengan
   Google; sesudah itu pengguna melengkapi peran dan sekolah di /lengkapi-profil. */
import { useState } from "react";
import { TombolGoogle } from "@/components/login/TombolGoogle";
import { alert } from "@/lib/variants";

const LANGKAH = [
  ["1", "Masuk dengan Google", "Pilih akun Gmail milikmu. Kami hanya menerima nama dan email."],
  ["2", "Lengkapi profil", "Pilih siswa atau guru, lalu cari sekolahmu dari daftar sekolah."],
  ["3", "Mulai belajar", "Jelajahi model 3D, kerjakan tugas, dan tanya asisten AI."],
] as const;

export function DaftarGoogle({ clientId }: { clientId: string }) {
  const [galat, setGalat] = useState<string | null>(null);
  return (
    <div className="space-y-5">
      <div>
        <p className="mikro">Daftar</p>
        <h2 className="titik-biru mt-2 text-3xl font-semibold">Lanjutkan dengan Google</h2>
      </div>
      {galat && (
        <div role="alert" className={alert({ tipe: "error" })}>
          {galat}
        </div>
      )}
      <TombolGoogle clientId={clientId} tujuanAwal={null} onGalat={setGalat} teks="signup_with" />
      <ol className="space-y-3">
        {LANGKAH.map(([no, judul, isi]) => (
          <li key={no} className="flex gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-biru text-xs font-semibold text-white">
              {no}
            </span>
            <div>
              <p className="text-sm font-semibold">{judul}</p>
              <p className="text-sm text-neutral-500">{isi}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
