"use client";

/* Client leaf: simulasi alur (peredaran darah / pernapasan). Dua mode:
   1) Tonton: diagram SVG dengan penanda yang bergerak antar tahap (putar, jeda,
      sebelumnya/berikutnya, kecepatan) dan penjelasan tiap tahap.
   2) Tantangan: tahap diacak, pengguna menyusun urutan yang benar; dinilai backend. */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Ikon } from "@/components/ui/Ikon";
import { Spinner } from "@/components/ui/Spinner";
import { GalatApi, kirimPercobaan } from "@/lib/mock-api";
import type { HasilPercobaan, Langkah, RincianSimulasi, TugasRingkas } from "@/lib/tugas";
import { alert, kartu, tombol } from "@/lib/variants";
import { Simulasi3D } from "./Simulasi3D";

const BIRU = "#1566f4";
const MERAH = "#e5484d";
const UNGU = "#8e4ec6";
const AMBER = "#d9890a";

interface Titik {
  x: number;
  y: number;
  warna: string;
}
interface Diagram {
  judul: string;
  /* Kotak latar (organ) agar diagram mudah dibaca */
  latar: { x: number; y: number; w: number; h: number; label: string; warna: string }[];
  titik: Record<string, Titik>;
  /* Tahap terakhir kembali ke tahap pertama (siklus) */
  siklus: boolean;
}

const SIRKULASI: Diagram = {
  judul: "Diagram peredaran darah",
  siklus: true,
  latar: [{ x: 160, y: 112, w: 280, h: 158, label: "Jantung", warna: "#fdecec" }],
  titik: {
    vena_kava: { x: 90, y: 175, warna: BIRU },
    atrium_kanan: { x: 230, y: 140, warna: BIRU },
    katup_trikuspid: { x: 230, y: 190, warna: BIRU },
    ventrikel_kanan: { x: 230, y: 240, warna: BIRU },
    arteri_pulmonalis: { x: 100, y: 75, warna: BIRU },
    paru_paru: { x: 300, y: 38, warna: UNGU },
    vena_pulmonalis: { x: 500, y: 75, warna: MERAH },
    atrium_kiri: { x: 370, y: 140, warna: MERAH },
    katup_mitral: { x: 370, y: 190, warna: MERAH },
    ventrikel_kiri: { x: 370, y: 240, warna: MERAH },
    aorta: { x: 505, y: 200, warna: MERAH },
    seluruh_tubuh: { x: 300, y: 355, warna: MERAH },
  },
};

const PERNAPASAN: Diagram = {
  judul: "Diagram sistem pernapasan",
  siklus: false,
  latar: [{ x: 90, y: 255, w: 380, h: 135, label: "Paru-paru", warna: "#eaf1ff" }],
  titik: {
    diafragma: { x: 110, y: 60, warna: BIRU },
    hidung: { x: 300, y: 30, warna: BIRU },
    faring: { x: 300, y: 80, warna: BIRU },
    laring: { x: 300, y: 128, warna: BIRU },
    trakea: { x: 300, y: 176, warna: BIRU },
    bronkus: { x: 300, y: 224, warna: BIRU },
    bronkiolus: { x: 190, y: 292, warna: BIRU },
    alveolus: { x: 190, y: 350, warna: UNGU },
    kapiler: { x: 390, y: 350, warna: UNGU },
    ekspirasi: { x: 500, y: 128, warna: AMBER },
  },
};

function pilihDiagram(langkah: Langkah[]): Diagram | null {
  const kode = new Set(langkah.map((l) => l.kode));
  if (kode.has("vena_kava")) return SIRKULASI;
  if (kode.has("hidung")) return PERNAPASAN;
  return null;
}

const LEBAR_KOTAK = 118;
const TINGGI_KOTAK = 28;

function Gambar({ diagram, langkah, indeks }: { diagram: Diagram; langkah: Langkah[]; indeks: number }) {
  const posisi = langkah.map((l) => diagram.titik[l.kode]).filter((t): t is Titik => Boolean(t));
  const aktif = langkah[indeks] ? diagram.titik[langkah[indeks].kode] : undefined;
  return (
    <svg viewBox="0 0 600 410" role="img" aria-label={diagram.judul} className="h-auto w-full">
      <title>{diagram.judul}</title>
      {diagram.latar.map((l) => (
        <g key={l.label}>
          <rect x={l.x} y={l.y} width={l.w} height={l.h} rx={22} fill={l.warna} />
          <text x={l.x + 14} y={l.y + 18} fontSize={11} fill="#737373" fontWeight={600}>
            {l.label.toUpperCase()}
          </text>
        </g>
      ))}
      {/* jalur antar tahap */}
      {posisi.slice(0, -1).map((a, i) => {
        const b = posisi[i + 1] as Titik;
        const lewat = i < indeks;
        return (
          <line
            key={`${langkah[i]?.kode}-${langkah[i + 1]?.kode}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={lewat ? b.warna : "#c7c7cc"}
            strokeWidth={lewat ? 4 : 2}
            strokeLinecap="round"
            opacity={lewat ? 0.9 : 0.7}
          />
        );
      })}
      {diagram.siklus && posisi.length > 1 && (
        <line
          x1={(posisi[posisi.length - 1] as Titik).x}
          y1={(posisi[posisi.length - 1] as Titik).y}
          x2={(posisi[0] as Titik).x}
          y2={(posisi[0] as Titik).y}
          stroke="#c7c7cc"
          strokeWidth={2}
          strokeDasharray="5 6"
        />
      )}
      {/* kotak tahap */}
      {langkah.map((l, i) => {
        const t = diagram.titik[l.kode];
        if (!t) return null;
        const sekarang = i === indeks;
        const lewat = i < indeks;
        return (
          <g key={l.id_langkah}>
            <rect
              x={t.x - LEBAR_KOTAK / 2}
              y={t.y - TINGGI_KOTAK / 2}
              width={LEBAR_KOTAK}
              height={TINGGI_KOTAK}
              rx={14}
              fill={sekarang ? t.warna : lewat ? "#ffffff" : "#f4f4f5"}
              stroke={sekarang || lewat ? t.warna : "#d4d4d8"}
              strokeWidth={sekarang ? 2.5 : 1.5}
            />
            <text
              x={t.x}
              y={t.y + 4}
              textAnchor="middle"
              fontSize={11}
              fontWeight={sekarang ? 700 : 500}
              fill={sekarang ? "#ffffff" : "#262626"}
            >
              {l.judul}
            </text>
          </g>
        );
      })}
      {/* penanda bergerak */}
      {aktif && (
        <g
          className="transition-transform duration-1000 ease-in-out motion-reduce:transition-none"
          style={{ transform: `translate(${aktif.x}px, ${aktif.y - TINGGI_KOTAK / 2 - 12}px)` }}
        >
          <circle r={11} fill={aktif.warna} opacity={0.2} />
          <circle r={6} fill={aktif.warna} stroke="#fff" strokeWidth={2} />
        </g>
      )}
    </svg>
  );
}

function acak<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j] as T, b[i] as T];
  }
  return b;
}

export function PemainSimulasi({ tugas, langkah }: { tugas: TugasRingkas; langkah: Langkah[] }) {
  const router = useRouter();
  const diagram = pilihDiagram(langkah);
  const [mode, setMode] = useState<"tonton" | "tantang">("tonton");
  const [indeks, setIndeks] = useState(0);
  const [main, setMain] = useState(false);
  const [cepat, setCepat] = useState(false);
  const [pool, setPool] = useState<Langkah[]>([]);
  const [susunan, setSusunan] = useState<Langkah[]>([]);
  const [hasil, setHasil] = useState<HasilPercobaan | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [kirim, setKirim] = useState(false);
  const [gagal3d, setGagal3d] = useState(false);

  useEffect(() => {
    if (!main) return;
    const t = setTimeout(
      () => {
        if (indeks >= langkah.length - 1) setMain(false);
        else setIndeks((i) => i + 1);
      },
      cepat ? 1500 : 3200,
    );
    return () => clearTimeout(t);
  }, [main, indeks, cepat, langkah.length]);

  const sekarang = langkah[indeks];

  function mulaiTantangan() {
    setMain(false);
    let a = acak(langkah);
    if (a.every((l, i) => l.id_langkah === langkah[i]?.id_langkah)) a = [...a].reverse();
    setPool(a);
    setSusunan([]);
    setHasil(null);
    setGalat(null);
    setMode("tantang");
  }

  async function nilai() {
    setKirim(true);
    setGalat(null);
    try {
      setHasil(
        await kirimPercobaan(
          tugas.id_tugas,
          susunan.map((l) => l.id_langkah),
        ),
      );
      router.refresh();
    } catch (e) {
      setGalat(e instanceof GalatApi ? e.message : "Tidak dapat menghubungi server.");
    } finally {
      setKirim(false);
    }
  }

  if (mode === "tantang") {
    const rincian = hasil ? (hasil.rincian as RincianSimulasi[]) : null;
    return (
      <div className="space-y-4">
        <div className={kartu({ padding: "lg" })}>
          <h2 className="text-base font-semibold">Tantangan: urutkan alurnya</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Pilih tahap satu per satu sesuai urutan yang benar. Ketuk tahap di susunanmu untuk mengeluarkannya lagi.
          </p>
          {galat && (
            <div role="alert" className={`${alert({ tipe: "error" })} mt-4`}>
              {galat}
            </div>
          )}
          {!hasil && (
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <p className="mikro mb-2">Tahap tersedia</p>
                <ul className="space-y-2">
                  {pool.map((l) => (
                    <li key={l.id_langkah}>
                      <button
                        type="button"
                        onClick={() => {
                          setPool((p) => p.filter((x) => x.id_langkah !== l.id_langkah));
                          setSusunan((s) => [...s, l]);
                        }}
                        className="w-full rounded-xl bg-abu px-3 py-2 text-left text-sm transition hover:bg-black/5"
                      >
                        {l.judul}
                      </button>
                    </li>
                  ))}
                  {pool.length === 0 && <li className="text-sm text-neutral-400">Semua tahap sudah ditempatkan.</li>}
                </ul>
              </div>
              <div>
                <p className="mikro mb-2">
                  Urutanmu ({susunan.length}/{langkah.length})
                </p>
                <ol className="space-y-2">
                  {susunan.map((l, i) => (
                    <li key={l.id_langkah}>
                      <button
                        type="button"
                        onClick={() => {
                          setSusunan((s) => s.filter((x) => x.id_langkah !== l.id_langkah));
                          setPool((p) => [...p, l]);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl bg-biru px-3 py-2 text-left text-sm text-white transition hover:bg-biru-gelap"
                      >
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/25 text-[11px]">
                          {i + 1}
                        </span>
                        {l.judul}
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
          {!hasil && (
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={kirim || pool.length > 0}
                onClick={nilai}
                className={tombol({ ukuran: "md" })}
              >
                {kirim ? (
                  <>
                    <Spinner /> Menilai
                  </>
                ) : (
                  "Periksa urutan"
                )}
              </button>
              <button
                type="button"
                onClick={() => setMode("tonton")}
                className={tombol({ variant: "halus", ukuran: "md" })}
              >
                Kembali menonton
              </button>
            </div>
          )}
        </div>
        {hasil && rincian && (
          <div className="space-y-4">
            <div className={kartu({ nada: hasil.selesai ? "brand" : "aksen", padding: "lg" })} role="status">
              <p className="mikro">{hasil.selesai ? "Lulus" : "Belum lulus"}</p>
              <p className="mt-2 text-5xl font-semibold">{hasil.skor}</p>
              <p className="mt-2 text-sm opacity-80">
                {hasil.benar} dari {hasil.total} tahap tepat posisinya. Batas lulus {hasil.ambang}.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={mulaiTantangan}
                  className={tombol({ variant: hasil.selesai ? "garis" : "utama", ukuran: "md" })}
                >
                  Acak ulang dan coba lagi
                </button>
                <button
                  type="button"
                  onClick={() => setMode("tonton")}
                  className={tombol({ variant: "garis", ukuran: "md" })}
                >
                  Tonton lagi
                </button>
                <Link href="/tugas" className={tombol({ variant: "garis", ukuran: "md" })}>
                  Daftar tugas
                </Link>
              </div>
            </div>
            <ol className={`${kartu({ padding: "lg" })} space-y-2 text-sm`}>
              {rincian.map((r) => (
                <li key={r.posisi} className="flex items-baseline gap-2">
                  <span className="w-6 shrink-0 text-neutral-400">{r.posisi}.</span>
                  <span className={r.benar ? "text-emerald-700" : "text-rose-600"}>{r.benar ? "Tepat" : "Keliru"}</span>
                  <span className="text-neutral-700">
                    {r.judul_benar}
                    {!r.benar && (
                      <span className="text-neutral-400">
                        {" "}
                        (kamu menaruh: {langkah.find((l) => l.id_langkah === r.id_langkah_anda)?.judul})
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className={kartu({ padding: "md" })}>
        {diagram && !gagal3d ? (
          <Simulasi3D
            jenis={diagram === SIRKULASI ? "darah" : "napas"}
            kode={sekarang?.kode ?? ""}
            cepat={cepat}
            onGagal={() => setGagal3d(true)}
          />
        ) : diagram ? (
          <Gambar diagram={diagram} langkah={langkah} indeks={indeks} />
        ) : (
          <p className="p-6 text-sm text-neutral-500">
            Diagram untuk simulasi ini belum tersedia, ikuti penjelasan langkahnya.
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (!main && indeks >= langkah.length - 1) setIndeks(0);
              setMain((m) => !m);
            }}
            className={tombol({ ukuran: "md" })}
          >
            <Ikon nama="putar" /> {main ? "Jeda" : indeks >= langkah.length - 1 ? "Ulangi" : "Putar"}
          </button>
          <button
            type="button"
            disabled={indeks === 0}
            onClick={() => {
              setMain(false);
              setIndeks((i) => i - 1);
            }}
            className={tombol({ variant: "garis", ukuran: "md" })}
          >
            Sebelumnya
          </button>
          <button
            type="button"
            disabled={indeks >= langkah.length - 1}
            onClick={() => {
              setMain(false);
              setIndeks((i) => i + 1);
            }}
            className={tombol({ variant: "garis", ukuran: "md" })}
          >
            Berikutnya
          </button>
          <label className="ml-auto flex items-center gap-2 text-xs text-neutral-500">
            <input type="checkbox" checked={cepat} onChange={(e) => setCepat(e.target.checked)} /> Cepat
          </label>
        </div>
        <ul
          className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-neutral-500"
          aria-label="Keterangan warna"
        >
          {diagram === SIRKULASI ? (
            <>
              <li className="flex items-center gap-1">
                <span className="h-2 w-5 rounded" style={{ background: BIRU }} /> miskin oksigen
              </li>
              <li className="flex items-center gap-1">
                <span className="h-2 w-5 rounded" style={{ background: MERAH }} /> kaya oksigen
              </li>
              <li className="flex items-center gap-1">
                <span className="h-2 w-5 rounded" style={{ background: UNGU }} /> pertukaran gas
              </li>
            </>
          ) : (
            <>
              <li className="flex items-center gap-1">
                <span className="h-2 w-5 rounded" style={{ background: BIRU }} /> udara masuk
              </li>
              <li className="flex items-center gap-1">
                <span className="h-2 w-5 rounded" style={{ background: UNGU }} /> pertukaran gas
              </li>
              <li className="flex items-center gap-1">
                <span className="h-2 w-5 rounded" style={{ background: AMBER }} /> udara keluar
              </li>
            </>
          )}
        </ul>
      </div>
      <div className="space-y-4">
        <div className={kartu({ padding: "lg" })} aria-live="polite">
          <p className="mikro">
            Tahap {indeks + 1} dari {langkah.length}
          </p>
          <h2 className="mt-2 text-2xl font-semibold">{sekarang?.judul}</h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">{sekarang?.deskripsi}</p>
          {sekarang?.id_bagian && (
            <Link href="/eksplorasi" className="mt-3 inline-block text-xs font-semibold underline underline-offset-2">
              Lihat bagian ini di model 3D
            </Link>
          )}
        </div>
        <ol className={`${kartu({ padding: "md" })} space-y-1`}>
          {langkah.map((l, i) => (
            <li key={l.id_langkah}>
              <button
                type="button"
                onClick={() => {
                  setMain(false);
                  setIndeks(i);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition ${
                  i === indeks
                    ? "bg-biru text-white"
                    : i < indeks
                      ? "text-neutral-700 hover:bg-black/5"
                      : "text-neutral-400 hover:bg-black/5"
                }`}
              >
                <span className="w-5 shrink-0 text-xs opacity-70">{i + 1}</span>
                {l.judul}
              </button>
            </li>
          ))}
        </ol>
        <div className={`${kartu({ nada: "aksen", padding: "md" })}`}>
          <p className="text-sm text-neutral-600">
            {tugas.percobaan > 0 ? `Skor terbaikmu ${tugas.skor_terbaik}. ` : "Sudah paham alurnya? "}
            Uji dengan menyusun urutannya sendiri.
          </p>
          <button
            type="button"
            onClick={mulaiTantangan}
            className={`${tombol({ variant: "sekunder", ukuran: "md" })} mt-3`}
          >
            Mulai tantangan urutan
          </button>
        </div>
      </div>
    </div>
  );
}
