"use client";

/* Client leaf: kotak pencarian sekolah (data Kemdikbud lewat backend). Ketik nama sekolah atau kota,
   pilih dari daftar; bila sekolah tidak ada, pengguna boleh menulis sendiri. */
import { useEffect, useId, useState } from "react";
import { cariSekolah, type SekolahHasil } from "@/lib/mock-api";
import { input } from "@/lib/variants";

export type PilihanSekolah = { npsn: string; label: string } | { npsn: null; label: string } | null;

const NAMA_STATUS: Record<string, string> = { N: "Negeri", S: "Swasta" };

export function PilihSekolah({
  nilai,
  onUbah,
  salah,
}: {
  nilai: PilihanSekolah;
  onUbah: (p: PilihanSekolah) => void;
  salah?: boolean;
}) {
  const id = useId();
  const [teks, setTeks] = useState(nilai?.label ?? "");
  const [hasil, setHasil] = useState<SekolahHasil[]>([]);
  const [memuat, setMemuat] = useState(false);
  const [terbuka, setTerbuka] = useState(false);
  const [bebas, setBebas] = useState(nilai !== null && nilai.npsn === null);
  const [pesan, setPesan] = useState<string | null>(null);

  useEffect(() => {
    if (bebas || !terbuka || teks.trim().length < 3 || nilai?.label === teks) {
      setHasil([]);
      return;
    }
    let batal = false;
    setMemuat(true);
    const t = setTimeout(() => {
      cariSekolah(teks.trim())
        .then((h) => {
          if (batal) return;
          setHasil(h);
          setPesan(h.length ? null : 'Tidak ditemukan. Periksa ejaan, atau pilih "Sekolahku tidak ada".');
        })
        .catch(() => !batal && setPesan("Pencarian sekolah gagal. Coba lagi atau tulis sendiri."))
        .finally(() => !batal && setMemuat(false));
    }, 300);
    return () => {
      batal = true;
      clearTimeout(t);
    };
  }, [teks, terbuka, bebas, nilai]);

  return (
    <div className="relative">
      <input
        id={id}
        value={teks}
        autoComplete="off"
        role="combobox"
        aria-expanded={!bebas && terbuka && hasil.length > 0}
        aria-autocomplete="list"
        aria-controls={`${id}-daftar`}
        placeholder={bebas ? "Tulis nama sekolahmu" : "Ketik nama sekolah atau kota, mis. SMPN 1 Madiun"}
        onFocus={() => setTerbuka(true)}
        onBlur={() => setTimeout(() => setTerbuka(false), 150)}
        onChange={(e) => {
          setTeks(e.target.value);
          setPesan(null);
          onUbah(bebas ? { npsn: null, label: e.target.value } : null);
        }}
        aria-invalid={salah}
        className={input({ keadaan: salah ? "salah" : "normal" })}
      />
      {!bebas && terbuka && (hasil.length > 0 || pesan || memuat) && (
        <ul
          id={`${id}-daftar`}
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-2xl bg-white p-1 text-sm shadow-xl ring-1 ring-black/5"
        >
          {memuat && <li className="px-3 py-2 text-neutral-400">Mencari…</li>}
          {hasil.map((s) => (
            <li key={s.npsn}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  const label = `${s.nama}, ${s.kabupaten_kota}`;
                  setTeks(label);
                  setTerbuka(false);
                  setHasil([]);
                  onUbah({ npsn: s.npsn, label });
                }}
                className="block w-full rounded-xl px-3 py-2 text-left transition hover:bg-abu"
              >
                <span className="font-medium">{s.nama}</span>
                <span className="block text-xs text-neutral-500">
                  {s.bentuk} · {NAMA_STATUS[s.status] ?? s.status} · {s.kecamatan}, {s.kabupaten_kota}, {s.provinsi}
                </span>
              </button>
            </li>
          ))}
          {!memuat && pesan && <li className="px-3 py-2 text-neutral-500">{pesan}</li>}
        </ul>
      )}
      <p className="mt-2 text-xs text-neutral-500">
        {nilai && nilai.npsn !== null ? <>Sekolah terpilih dari daftar resmi (NPSN {nilai.npsn}). </> : null}
        <button
          type="button"
          onClick={() => {
            const berikut = !bebas;
            setBebas(berikut);
            setHasil([]);
            setTeks("");
            onUbah(null);
          }}
          className="font-semibold text-neutral-900 underline underline-offset-2"
        >
          {bebas ? "Cari dari daftar sekolah" : "Sekolahku tidak ada di daftar"}
        </button>
      </p>
    </div>
  );
}
