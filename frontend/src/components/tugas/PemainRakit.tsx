"use client";

/* Client leaf: mini game Rakit Organ. Model 3D organ terurai; pemain menyeret tiap bagian ke
   posisinya hingga utuh. Skor dihitung server dari jumlah bagian terpasang dan salah letak. */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { GalatApi, kirimPercobaan } from "@/lib/mock-api";
import type { HasilPercobaan, Langkah, TugasRingkas } from "@/lib/tugas";
import { alert, kartu, tombol } from "@/lib/variants";
import type { MesinRakit } from "@/three/rakit3d";

const MODEL: Record<number, string> = { 1: "/models/heart.glb", 2: "/models/lungs.glb" };

function format(detik: number) {
  return `${Math.floor(detik / 60)}:${String(detik % 60).padStart(2, "0")}`;
}

export function PemainRakit({ tugas, bagian }: { tugas: TugasRingkas; bagian: Langkah[] }) {
  const router = useRouter();
  const [putaran, setPutaran] = useState(0);
  const [terpasang, setTerpasang] = useState<Record<string, number>>({});
  const [dipilih, setDipilih] = useState<string | null>(null);
  const [terakhir, setTerakhir] = useState<string | null>(null);
  const [siap, setSiap] = useState(false);
  const [gagal, setGagal] = useState(false);
  const [detik, setDetik] = useState(0);
  const [hasil, setHasil] = useState<HasilPercobaan | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [kirim, setKirim] = useState(false);
  const wadah = useRef<HTMLDivElement>(null);
  const mesin = useRef<MesinRakit | null>(null);
  const salah = useRef<Record<string, number>>({});
  const mulaiWaktu = useRef(0);

  const total = bagian.length;
  const jumlah = Object.keys(terpasang).length;
  const utuh = jumlah === total && total > 0;

  // biome-ignore lint/correctness/useExhaustiveDependencies: `putaran` sengaja memulai ulang permainan
  useEffect(() => {
    const el = wadah.current;
    if (!el || !tugas.id_organ) return;
    let batal = false;
    setTerpasang({});
    setDipilih(null);
    setTerakhir(null);
    setHasil(null);
    setSiap(false);
    salah.current = {};
    (async () => {
      try {
        const { mulaiRakit, POLA_JANTUNG, POLA_PARU } = await import("@/three/rakit3d");
        const urut = tugas.id_organ === 1 ? POLA_JANTUNG : POLA_PARU;
        const m = await mulaiRakit({
          wadah: el,
          urlModel: MODEL[tugas.id_organ as number] ?? "/models/heart.glb",
          pola: urut.filter((p) => bagian.some((b) => b.kode === p.kode)),
          saatPilih: setDipilih,
          saatSalah: (kode, n) => {
            salah.current[kode] = n;
          },
          saatPasang: (kode, percobaan) => {
            setTerpasang((s) => ({ ...s, [kode]: percobaan }));
            setTerakhir(kode);
            setDipilih(null);
          },
        });
        if (batal) {
          m.bersihkan();
          return;
        }
        mesin.current = m;
        /* Pintu uji untuk verifikasi otomatis; tidak ada di build produksi */
        if (process.env.NODE_ENV === "development") (window as unknown as { __rakit?: MesinRakit }).__rakit = m;
        mulaiWaktu.current = Date.now();
        setSiap(true);
      } catch {
        if (!batal) setGagal(true);
      }
    })();
    return () => {
      batal = true;
      mesin.current?.bersihkan();
      mesin.current = null;
    };
  }, [putaran, tugas.id_organ]);

  useEffect(() => {
    if (!siap || hasil || utuh) return;
    const t = setInterval(() => setDetik(Math.round((Date.now() - mulaiWaktu.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [siap, hasil, utuh]);

  useEffect(() => {
    mesin.current?.tonjolkan(dipilih);
  }, [dipilih]);

  async function nilai() {
    setKirim(true);
    setGalat(null);
    try {
      const jawaban = bagian.map((b) => terpasang[b.kode] ?? 0);
      setHasil(await kirimPercobaan(tugas.id_tugas, jawaban));
      router.refresh();
    } catch (e) {
      setGalat(e instanceof GalatApi ? e.message : "Tidak dapat menghubungi server.");
    } finally {
      setKirim(false);
    }
  }

  const aktif = bagian.find((b) => b.kode === (dipilih ?? terakhir));

  if (gagal) {
    return (
      <div className={kartu({ padding: "lg" })}>
        <p className="text-sm text-neutral-600">
          Permainan ini membutuhkan WebGL, yang tidak tersedia di peramban ini. Coba peramban lain atau perangkat yang
          lebih baru.
        </p>
        <Link href="/tugas" className={`${tombol({ ukuran: "md" })} mt-4`}>
          Kembali ke daftar tugas
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className={kartu({ padding: "md" })}>
        <div className="relative">
          <div
            ref={wadah}
            className="aspect-square w-full overflow-hidden rounded-2xl bg-abu sm:aspect-[4/3]"
            role="application"
            aria-label="Area merakit organ 3D: seret bagian ke posisinya"
          />
          {!siap && (
            <p className="absolute inset-0 grid place-items-center text-sm text-neutral-400" aria-live="polite">
              Memuat model 3D…
            </p>
          )}
          <p className="pointer-events-none absolute bottom-3 left-4 text-[11px] text-neutral-400">
            Seret bagian ke bayangannya · seret ruang kosong untuk memutar
          </p>
          <p className="kaca pointer-events-none absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-semibold">
            {jumlah}/{total} · {format(detik)}
          </p>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!siap || utuh || Boolean(hasil)}
            onClick={() => {
              const k = mesin.current?.petunjuk();
              if (k) setDipilih(null);
            }}
            className={tombol({ variant: "garis", ukuran: "md" })}
          >
            Petunjuk
          </button>
          <button
            type="button"
            disabled={!siap || utuh || Boolean(hasil)}
            onClick={() => mesin.current?.acak()}
            className={tombol({ variant: "garis", ukuran: "md" })}
          >
            Sebar ulang
          </button>
          <button
            type="button"
            disabled={kirim || jumlah === 0 || Boolean(hasil)}
            onClick={nilai}
            className={`${tombol({ variant: utuh ? "utama" : "sekunder", ukuran: "md" })} ml-auto`}
          >
            {kirim ? (
              <>
                <Spinner /> Menilai
              </>
            ) : utuh ? (
              "Kirim skor"
            ) : (
              "Selesai dan nilai"
            )}
          </button>
        </div>
        {galat && (
          <div role="alert" className={`${alert({ tipe: "error" })} mt-3`}>
            {galat}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {hasil ? (
          <div className={kartu({ nada: hasil.selesai ? "brand" : "aksen", padding: "lg" })} role="status">
            <p className="mikro">{hasil.selesai ? "Lulus" : "Belum lulus"}</p>
            <p className="mt-2 text-5xl font-semibold">{hasil.skor}</p>
            <p className="mt-2 text-sm opacity-80">
              {hasil.benar} dari {hasil.total} bagian terpasang dalam {format(detik)}. Batas lulus {hasil.ambang}.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setDetik(0);
                  setPutaran((n) => n + 1);
                }}
                className={tombol({ variant: hasil.selesai ? "garis" : "utama", ukuran: "md" })}
              >
                Main lagi
              </button>
              <Link href="/tugas" className={tombol({ variant: "garis", ukuran: "md" })}>
                Daftar tugas
              </Link>
            </div>
          </div>
        ) : (
          <div className={kartu({ padding: "lg" })} aria-live="polite">
            <p className="mikro">{dipilih ? "Bagian dipegang" : terakhir ? "Terpasang" : "Cara bermain"}</p>
            <h2 className="mt-2 text-xl font-semibold">{aktif?.judul ?? "Rakit kembali organnya"}</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              {aktif?.deskripsi ??
                "Bagian organ tersebar di sekeliling. Pegang satu bagian, lalu lepaskan di dekat bayangan posisinya. Bagian yang tepat akan menempel."}
            </p>
          </div>
        )}
        <ul className={`${kartu({ padding: "md" })} space-y-1`}>
          {bagian.map((b) => {
            const ok = b.kode in terpasang;
            return (
              <li
                key={b.id_langkah}
                onMouseEnter={() => !ok && setDipilih(b.kode)}
                onMouseLeave={() => setDipilih(null)}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${ok ? "text-emerald-700" : "text-neutral-500"}`}
              >
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] ${ok ? "bg-emerald-100" : "bg-black/5"}`}
                  aria-hidden="true"
                >
                  {ok ? "✓" : ""}
                </span>
                <span className={ok ? "font-medium" : ""}>{b.judul}</span>
                {ok && (terpasang[b.kode] ?? 1) > 1 && (
                  <span className="ml-auto text-[11px] text-neutral-400">{terpasang[b.kode]}x coba</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
