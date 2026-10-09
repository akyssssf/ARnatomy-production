"use client";

/* Client leaf: peran (siswa/guru) dan asal sekolah. Dipakai akun Google baru (/lengkapi-profil)
   dan halaman Profil (ubah). Sekolah dipilih dari daftar resmi, atau ditulis sendiri bila tidak ada. */
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { GalatApi, lengkapiProfil } from "@/lib/mock-api";
import { alert, tombol } from "@/lib/variants";
import { type PilihanSekolah, PilihSekolah } from "./PilihSekolah";

export function FormLengkapiProfil({
  nama,
  peranAwal = "siswa",
  sekolahAwal = null,
  mode = "lengkapi",
}: {
  nama: string;
  peranAwal?: "siswa" | "guru";
  sekolahAwal?: PilihanSekolah;
  mode?: "lengkapi" | "ubah";
}) {
  const router = useRouter();
  const [role, setRole] = useState<"siswa" | "guru">(peranAwal);
  const [sekolah, setSekolah] = useState<PilihanSekolah>(sekolahAwal);
  const [galat, setGalat] = useState<string | null>(null);
  const [berhasil, setBerhasil] = useState(false);
  const [kirim, setKirim] = useState(false);

  async function saatSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBerhasil(false);
    if (!sekolah || sekolah.label.trim().length < 3) {
      setGalat("Pilih sekolahmu dari daftar, atau tulis namanya (minimal 3 karakter).");
      return;
    }
    setKirim(true);
    setGalat(null);
    try {
      await lengkapiProfil(sekolah.npsn ? { role, npsn: sekolah.npsn } : { role, asal_sekolah: sekolah.label.trim() });
      if (mode === "lengkapi") router.push("/beranda" as Route);
      else setBerhasil(true);
      router.refresh();
    } catch (kesalahan) {
      setGalat(kesalahan instanceof GalatApi ? kesalahan.message : "Tidak dapat menghubungi server.");
    } finally {
      setKirim(false);
    }
  }

  return (
    <form onSubmit={saatSubmit} noValidate className="space-y-5">
      {mode === "lengkapi" && (
        <p className="text-sm text-neutral-600">
          Halo, <strong>{nama}</strong>. Satu langkah lagi sebelum mulai belajar.
        </p>
      )}
      {galat && (
        <div role="alert" className={alert({ tipe: "error" })}>
          {galat}
        </div>
      )}
      {berhasil && (
        <div role="status" className={alert({ tipe: "sukses" })}>
          Profil disimpan.
        </div>
      )}
      <fieldset>
        <legend className="mikro mb-2">Saya adalah</legend>
        <div className="flex gap-3">
          {(["siswa", "guru"] as const).map((p) => (
            <label
              key={p}
              className={`flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                role === p ? "bg-neutral-900 text-white" : "bg-abu text-neutral-700 hover:bg-black/5"
              }`}
            >
              <input
                type="radio"
                name="role"
                value={p}
                checked={role === p}
                onChange={() => setRole(p)}
                className="sr-only"
              />
              {p === "siswa" ? "Siswa" : "Guru Biologi"}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label className="mikro mb-2 block" htmlFor="lp-sekolah">
          Asal sekolah
        </label>
        <PilihSekolah nilai={sekolah} onUbah={setSekolah} salah={Boolean(galat) && !sekolah} />
      </div>
      <button type="submit" disabled={kirim} className={tombol({ ukuran: "md" })}>
        {kirim ? (
          <>
            <Spinner /> Menyimpan
          </>
        ) : mode === "lengkapi" ? (
          "Simpan dan mulai"
        ) : (
          "Simpan perubahan"
        )}
      </button>
    </form>
  );
}
