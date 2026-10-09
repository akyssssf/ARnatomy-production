"use client";

/* ==========================================================================
   PenampilOrgan — Client Component utama halaman Eksplorasi.
   Wajib klien karena memakai kanvas WebGL (Three.js), event pointer, dan
   keyboard. Data organ/bagian/layer/konten diterima sebagai props dari
   Server Component (eksplorasi/page.tsx).

   Mencakup FR-03 (model 3D + mode AR: WebXR immersive-ar bila didukung,
   selain itu umpan kamera belakang di balik kanvas), FR-04 (rotasi & zoom), FR-05 (toggle layer,
   aria-pressed + aria-live), FR-06/FR-07 (label dasar & dimmed di panel),
   FR-09 (laporan), FR-14 (riwayat tercatat otomatis lewat mutasi).

   Pemisahan state:
   - Zustand (client UI): layerAktif, panelEksplorasiTerbuka, bagianAktifId,
     putarOtomatis.
   - TanStack Query (server state): riwayat belajar (query + mutasi).
   - useState lokal: status pemuatan model, mode cadangan 2D, modal laporan.
   ========================================================================== */
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Ikon, type NamaIkon } from "@/components/ui/Ikon";
import { Spinner } from "@/components/ui/Spinner";
import { useRiwayatBelajar } from "@/hooks/useRiwayatBelajar";
import { koordinat2d, koordinat3d } from "@/lib/data";
import type { BagianId, BodyPart, Layer, NamaLayer, Organ, PartContent, RiwayatId } from "@/lib/schemas";
import { toggleLayer as kelasToggle, tombol } from "@/lib/variants";
import { useUIStore } from "@/store/useUIStore";
import { dukungWebXR, type Penampil } from "@/three/viewer3d";
import { FormLaporan } from "./FormLaporan";
import { PanelBagian, PanelDaftar } from "./PanelPenjelasan";

type StatusPenampil = { mode: "memuat"; teks: string } | { mode: "siap" } | { mode: "cadangan"; alasan: string };

const ALAT: { aksi: "reset" | "zoom-in" | "zoom-out" | "putar" | "ar"; label: string; ikon: NamaIkon }[] = [
  { aksi: "reset", label: "Atur ulang tampilan", ikon: "ulang" },
  { aksi: "zoom-in", label: "Perbesar", ikon: "perbesar" },
  { aksi: "zoom-out", label: "Perkecil", ikon: "perkecil" },
  { aksi: "putar", label: "Putar otomatis", ikon: "putar" },
  { aksi: "ar", label: "Mode AR (kamera)", ikon: "kamera" },
];

/* FR-03: mode AR. "xr" = sesi WebXR immersive-ar (ARCore/ARKit lewat peramban);
   "kamera" = umpan kamera belakang di balik kanvas 3D (peramban tanpa WebXR). */
type ModeAR = "mati" | "xr" | "kamera";

export function PenampilOrgan({
  organ,
  bagian,
  layers,
  konten,
  judul,
  pemilihOrgan,
  keterangan,
}: {
  organ: Organ;
  bagian: BodyPart[];
  layers: Layer[];
  konten: PartContent[];
  /* Potongan Server Component yang dioper sebagai node (tetap dirender di server) */
  judul: React.ReactNode;
  pemilihOrgan: React.ReactNode;
  keterangan: React.ReactNode;
}) {
  /* --- Client UI state (Zustand, selector presisi) --- */
  const layerAktif = useUIStore((s) => s.layerAktif);
  const toggleLayer = useUIStore((s) => s.toggleLayer);
  const panelTerbuka = useUIStore((s) => s.panelEksplorasiTerbuka);
  const bukaPanelStore = useUIStore((s) => s.bukaPanel);
  const tutupPanelStore = useUIStore((s) => s.tutupPanel);
  const bagianAktifId = useUIStore((s) => s.bagianAktifId);
  const setBagianAktif = useUIStore((s) => s.setBagianAktif);
  const putarOtomatis = useUIStore((s) => s.putarOtomatis);
  const setPutarOtomatis = useUIStore((s) => s.setPutarOtomatis);
  const tampilkanToast = useUIStore((s) => s.tampilkanToast);

  /* --- Server state (TanStack Query) --- */
  const { daftar: riwayat, catat, tutup } = useRiwayatBelajar({ aktif: true });
  const sudahDibuka = new Set((riwayat.data ?? []).map((r) => r.id_bagian));

  /* --- State lokal --- */
  const [status, setStatus] = useState<StatusPenampil>({ mode: "memuat", teks: "Menyiapkan penampil 3D" });
  const [statusLayer, setStatusLayer] = useState("");
  const [laporUntuk, setLaporUntuk] = useState<BodyPart | null>(null);
  const [modeAR, setModeAR] = useState<ModeAR>("mati");
  /* Pilihan mode saat pertama masuk (AR kamera atau 3D saja); diingat selama sesi peramban */
  const [tanyaMode, setTanyaMode] = useState(false);
  const [galatKamera, setGalatKamera] = useState<string | null>(null);
  const sudahDitanya = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const aliranKamera = useRef<MediaStream | null>(null);

  const wadah3d = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const penampil = useRef<Penampil | null>(null);
  const elTitik = useRef(new Map<number, HTMLButtonElement>());
  const pemicuTerakhir = useRef<HTMLElement | null>(null);
  const titikTekan = useRef<{ x: number; y: number } | null>(null);
  /* Entri riwayat yang sedang berjalan (id datang setelah mutasi selesai) */
  const riwayatBerjalan = useRef<Promise<RiwayatId | null> | null>(null);

  const mode3d = status.mode === "siap";
  const bagianAktif = bagian.find((b) => b.id_bagian === bagianAktifId) ?? null;
  const kontenDasar = bagianAktif
    ? (konten.find((k) => k.id_bagian === bagianAktif.id_bagian && k.jenis_konten === "dasar") ?? null)
    : null;
  const kontenDimmed = bagianAktif
    ? (konten.find((k) => k.id_bagian === bagianAktif.id_bagian && k.jenis_konten === "dimmed") ?? null)
    : null;

  /* ---------- Inisialisasi penampil 3D (sekali per organ) ---------- */
  useEffect(() => {
    const el = wadah3d.current;
    if (!el) return;
    let dibatalkan = false;

    const titik = bagian
      .map((b) => {
        const k = koordinat3d(b);
        const elemen = elTitik.current.get(b.id_bagian);
        return elemen ? { id: b.id_bagian, el: elemen, x: k.x, y: k.y, z: k.z, mesh: b.mesh_3d } : null;
      })
      .filter((t) => t !== null);

    (async () => {
      try {
        setStatus({ mode: "memuat", teks: "Memuat model 3D" });
        const { buatPenampil } = await import("@/three/viewer3d");
        if (dibatalkan) return;
        const instans = await buatPenampil({
          wadah: el,
          urlModel: organ.file_model_3d,
          titik,
          saatProgres: (persen) => {
            if (!dibatalkan) setStatus({ mode: "memuat", teks: `Memuat model 3D ${persen}%` });
          },
        });
        if (dibatalkan) {
          instans.bersihkan();
          return;
        }
        penampil.current = instans;
        setStatus({ mode: "siap" });
      } catch (kesalahan) {
        if (!dibatalkan)
          setStatus({
            mode: "cadangan",
            alasan: kesalahan instanceof Error ? kesalahan.message : "galat tidak dikenal.",
          });
      }
    })();

    return () => {
      dibatalkan = true;
      penampil.current?.bersihkan();
      penampil.current = null;
    };
  }, [organ.file_model_3d, bagian]);

  /* Saat komponen dilepas (pindah halaman/organ), panel & pilihan direset */
  useEffect(
    () => () => {
      tutupPanelStore();
      setPutarOtomatis(false);
    },
    [tutupPanelStore, setPutarOtomatis],
  );

  /* ---------- FR-05: terapkan layer dari store ke scene ---------- */
  useEffect(() => {
    if (!mode3d || !penampil.current) return;
    for (const nama of Object.keys(layerAktif) as NamaLayer[]) penampil.current.setLapisan(nama, layerAktif[nama]);
  }, [layerAktif, mode3d]);

  useEffect(() => {
    if (mode3d) penampil.current?.setAutoRotasi(putarOtomatis);
  }, [putarOtomatis, mode3d]);

  /* ---------- Panel: geser model & fokus judul saat isi berubah ---------- */
  useEffect(() => {
    if (!mode3d || !penampil.current) return;
    if (!panelTerbuka) {
      penampil.current.geserTampilan(0, 0);
      return;
    }
    const kotak = panelRef.current?.getBoundingClientRect();
    if (!kotak) return;
    /* Layar lebar: model ke kiri sejauh setengah lebar panel; layar sempit:
       panel dari bawah, model ke atas sejauh setengah tinggi panel. */
    if (window.innerWidth >= 768) penampil.current.geserTampilan(Math.round(kotak.width / 2 + 8), 0);
    else penampil.current.geserTampilan(0, Math.round(kotak.height / 2 + 8));
  }, [panelTerbuka, mode3d]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: fokus dipindah ulang setiap bagian aktif berganti
  useEffect(() => {
    if (!panelTerbuka) return;
    document.getElementById("judul-panel")?.focus({ preventScroll: true });
  }, [panelTerbuka, bagianAktifId]);

  /* ---------- Riwayat (FR-14) ---------- */
  /* Durasi dihitung server (waktu_akses -> saat ditutup), klien cukup mengirim id */
  function tutupRiwayatBerjalan() {
    const berjalan = riwayatBerjalan.current;
    riwayatBerjalan.current = null;
    if (!berjalan) return;
    void berjalan.then((idRiwayat) => {
      if (idRiwayat) tutup.mutate(idRiwayat);
    });
  }
  function mulaiRiwayat(idBagian: BagianId, jenis: "dasar" | "dimmed") {
    const janji = catat
      .mutateAsync({ id_bagian: idBagian, jenis_konten: jenis })
      .then((entri) => entri.id_riwayat)
      .catch(() => {
        tampilkanToast("Riwayat belajar gagal dicatat.", "error");
        return null;
      });
    if (jenis === "dasar") riwayatBerjalan.current = janji;
  }

  /* ---------- Buka/tutup panel & memilih bagian (FR-06) ---------- */
  function bukaDaftar(pemicu?: HTMLElement) {
    tutupRiwayatBerjalan();
    setBagianAktif(null);
    if (mode3d) {
      penampil.current?.lepasFokus();
      penampil.current?.sorotTitik(null);
    }
    if (pemicu) pemicuTerakhir.current = pemicu;
    bukaPanelStore();
  }

  function tutupPanel() {
    if (!panelTerbuka) return;
    tutupRiwayatBerjalan();
    if (mode3d) {
      penampil.current?.lepasFokus();
      penampil.current?.sorotTitik(null);
    }
    tutupPanelStore();
    const pemicu = pemicuTerakhir.current;
    pemicuTerakhir.current = null;
    if (pemicu && document.contains(pemicu)) pemicu.focus({ preventScroll: true });
  }

  function pilihBagian(idBagian: BagianId, pemicu?: HTMLElement) {
    if (!konten.some((k) => k.id_bagian === idBagian && k.jenis_konten === "dasar")) return;
    tutupRiwayatBerjalan();
    mulaiRiwayat(idBagian, "dasar"); // riwayat tercatat begitu label dasar dibuka
    setBagianAktif(idBagian);
    if (pemicu) pemicuTerakhir.current = pemicu;
    if (mode3d) {
      penampil.current?.fokusKe(idBagian, window.innerWidth >= 768 ? 0.66 : 0.88);
      penampil.current?.sorotTitik(idBagian);
    }
    bukaPanelStore();
  }

  /* Escape menutup panel (kecuali saat modal terbuka: modal menanganinya sendiri) */
  useEffect(() => {
    function saatTombol(e: KeyboardEvent) {
      if (e.key !== "Escape" || e.defaultPrevented || laporUntuk) return;
      tutupPanel();
    }
    document.addEventListener("keydown", saatTombol);
    return () => document.removeEventListener("keydown", saatTombol);
  });

  /* ---------- FR-03: mode AR ---------- */
  function hentikanKamera() {
    for (const jalur of aliranKamera.current?.getTracks() ?? []) jalur.stop();
    aliranKamera.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }
  /* Kamera dilepas saat komponen dibongkar (pindah organ/halaman); hanya ref yang disentuh */
  useEffect(
    () => () => {
      for (const jalur of aliranKamera.current?.getTracks() ?? []) jalur.stop();
      aliranKamera.current = null;
    },
    [],
  );
  async function keluarAR() {
    if (modeAR === "xr") await penampil.current?.hentikanAR();
    hentikanKamera();
    setModeAR("mati");
  }
  async function masukAR() {
    const instans = penampil.current;
    if (!instans) return;
    setGalatKamera(null);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setGalatKamera(
        "Kamera hanya dapat dipakai lewat koneksi aman (HTTPS). Buka situs lewat alamat https://, lalu coba lagi. Sementara itu, model tetap dapat dijelajahi dalam mode 3D.",
      );
      return;
    }
    if (await dukungWebXR()) {
      try {
        /* sesi bisa diakhiri dari gestur sistem: state ikut kembali ke "mati" */
        await instans.mulaiAR(() => setModeAR("mati"));
        setModeAR("xr");
        tampilkanToast("Mode AR aktif. Arahkan kamera ke permukaan datar.", "info");
        return;
      } catch (kesalahan) {
        tampilkanToast(
          `WebXR gagal (${kesalahan instanceof Error ? kesalahan.message : "galat"}); memakai kamera biasa.`,
          "info",
        );
      }
    }
    try {
      const aliran = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      aliranKamera.current = aliran;
      setModeAR("kamera");
      /* video dipasang setelah render berikutnya menampilkan elemennya */
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = aliran;
          void videoRef.current.play().catch(() => undefined);
        }
      });
      setPutarOtomatis(false);
      tampilkanToast("Mode AR kamera: seret untuk memutar model di atas tampilan kamera.", "info");
    } catch (kesalahan) {
      const ditolak = kesalahan instanceof DOMException && kesalahan.name === "NotAllowedError";
      setGalatKamera(
        ditolak
          ? "Izin kamera ditolak. Izinkan kamera pada pengaturan situs di peramban, lalu pilih mode AR lagi. Model tetap dapat dijelajahi dalam mode 3D."
          : "Kamera tidak ditemukan atau sedang dipakai aplikasi lain. Model tetap dapat dijelajahi dalam mode 3D.",
      );
    }
  }

  /* Pilihan mode: dapat diganti kapan saja lewat pengalih di kanan atas */
  function simpanPilihan(nilai: "3d" | "ar") {
    try {
      sessionStorage.setItem("arnatomy_mode_eksplorasi", nilai);
    } catch {
      /* penyimpanan sesi tidak tersedia: pilihan berlaku untuk halaman ini saja */
    }
  }
  async function pilihMode(nilai: "3d" | "ar") {
    simpanPilihan(nilai);
    setTanyaMode(false);
    setGalatKamera(null);
    if (nilai === "3d") {
      if (modeAR !== "mati") await keluarAR();
    } else if (modeAR === "mati") {
      await masukAR();
    }
  }

  /* Penampil siap: ikuti pilihan yang diingat, atau tanyakan sekali */
  // biome-ignore lint/correctness/useExhaustiveDependencies: hanya dijalankan sekali ketika penampil pertama kali siap
  useEffect(() => {
    if (!mode3d || sudahDitanya.current) return;
    sudahDitanya.current = true;
    let tersimpan: string | null = null;
    try {
      tersimpan = sessionStorage.getItem("arnatomy_mode_eksplorasi");
    } catch {
      tersimpan = null;
    }
    if (tersimpan === "ar") void masukAR();
    else if (tersimpan !== "3d") setTanyaMode(true);
  }, [mode3d]);

  /* ---------- FR-04: alat kamera ---------- */
  function jalankanAlat(aksi: (typeof ALAT)[number]["aksi"]) {
    if (!mode3d || !penampil.current) {
      tampilkanToast(
        aksi === "ar"
          ? "Mode AR memerlukan model 3D; gambar cadangan tidak mendukungnya."
          : "Kendali 3D tidak tersedia pada gambar cadangan.",
        "info",
      );
      return;
    }
    if (aksi === "ar") {
      void (modeAR === "mati" ? masukAR() : keluarAR());
      return;
    }
    if (aksi === "reset") {
      penampil.current.reset();
      setPutarOtomatis(false);
    }
    if (aksi === "zoom-in") penampil.current.ubahJarak(0.82);
    if (aksi === "zoom-out") penampil.current.ubahJarak(1.22);
    if (aksi === "putar") setPutarOtomatis(!putarOtomatis);
  }

  function saatToggleLayer(layer: Layer) {
    const aktifBaru = !layerAktif[layer.nama_layer];
    toggleLayer(layer.nama_layer);
    if (!mode3d) tampilkanToast("Layer hanya tersedia pada mode 3D.", "info");
    setStatusLayer(`Layer ${layer.label} ${aktifBaru ? "ditampilkan." : "disembunyikan."}`);
  }

  /* Titik interaktif: <button> bernomor, diposisikan viewer (3D) atau persen (2D) */
  const daftarTitik = bagian.map((b, i) => {
    const posisi2d = koordinat2d(b);
    return (
      <button
        key={b.id_bagian}
        type="button"
        className="titik-3d"
        ref={(el) => {
          if (el) elTitik.current.set(b.id_bagian, el);
          else elTitik.current.delete(b.id_bagian);
        }}
        aria-label={`Buka label ${b.nama_bagian_internal}`}
        aria-pressed={bagianAktifId === b.id_bagian}
        style={status.mode === "cadangan" ? { left: `${posisi2d.x}%`, top: `${posisi2d.y}%` } : undefined}
        onClick={(e) => pilihBagian(b.id_bagian, e.currentTarget)}
      >
        <span className="nomor-titik">{i + 1}</span>
        <span className="nama-titik">{b.nama_bagian_internal}</span>
      </button>
    );
  });

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 pt-4">
        {judul}
        <div className="flex flex-wrap items-center gap-2">
          {pemilihOrgan}
          <button
            type="button"
            aria-controls="panel-samping"
            aria-expanded={panelTerbuka}
            onClick={(e) => (panelTerbuka && !bagianAktif ? tutupPanel() : bukaDaftar(e.currentTarget))}
            className={tombol({ variant: "garis", ukuran: "md" })}
          >
            <Ikon nama="lapisan" />
            Daftar bagian
          </button>
        </div>
      </div>

      <figure className="m-0 mt-5">
        <div className={`relative overflow-hidden rounded-3xl ${modeAR === "kamera" ? "bg-black" : "bg-abu"}`}>
          <div className="relative h-[min(78vh,52rem)] min-h-[26rem] w-full">
            {modeAR === "kamera" ? (
              /* Umpan kamera belakang di balik kanvas 3D (kanvas WebGL bersifat alpha) */
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                aria-label="Tampilan kamera perangkat"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <span className="piringan-organ" aria-hidden="true" style={{ width: "min(64%, 34rem)" }} />
            )}

            {/* Kanvas 3D; klik singkat (bukan seretan) menutup panel */}
            <div
              ref={wadah3d}
              className="absolute inset-0"
              onPointerDown={(e) => {
                titikTekan.current = { x: e.clientX, y: e.clientY };
              }}
              onPointerUp={(e) => {
                const awal = titikTekan.current;
                titikTekan.current = null;
                if (awal && Math.hypot(e.clientX - awal.x, e.clientY - awal.y) < 6) tutupPanel();
              }}
            >
              {status.mode === "cadangan" && (
                <div className="flex h-full w-full items-center justify-center p-6">
                  <div className="relative h-full" style={{ aspectRatio: "1 / 1" }}>
                    <Image
                      src={organ.gambar}
                      alt={organ.nama_organ}
                      width={640}
                      height={640}
                      className="h-full w-full object-contain"
                    />
                    <div className="titik-2d pointer-events-none absolute inset-0">{daftarTitik}</div>
                  </div>
                </div>
              )}
            </div>
            {status.mode !== "cadangan" && (
              <div className="pointer-events-none absolute inset-0" hidden={status.mode === "memuat"}>
                {daftarTitik}
              </div>
            )}

            {status.mode === "memuat" && (
              <div
                role="status"
                aria-live="polite"
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-abu/85 text-sm font-medium text-neutral-500"
              >
                <Spinner kelas="h-6 w-6" />
                <span>{status.teks}</span>
              </div>
            )}
            {status.mode === "cadangan" && (
              <p
                role="status"
                className="kaca absolute inset-x-4 top-16 z-10 rounded-2xl px-4 py-3 text-xs text-neutral-700 sm:left-auto sm:right-4 sm:max-w-xs"
              >
                Model 3D tidak dapat ditampilkan ({status.alasan}) Gambar dua dimensi dipakai sebagai gantinya.
              </p>
            )}

            <div className="absolute left-4 top-4 flex flex-col gap-2">
              {ALAT.map((a) => (
                <button
                  key={a.aksi}
                  type="button"
                  onClick={() => jalankanAlat(a.aksi)}
                  aria-label={a.label}
                  title={a.label}
                  aria-pressed={a.aksi === "putar" ? putarOtomatis : undefined}
                  className="kaca grid h-11 w-11 place-items-center rounded-full text-neutral-700 transition hover:text-biru aria-pressed:bg-neutral-900 aria-pressed:text-white"
                >
                  <Ikon nama={a.ikon} kelas="h-[18px] w-[18px]" />
                </button>
              ))}
            </div>

            {/* Pengalih mode: jelajah 3D saja atau AR dengan kamera; dapat diganti kapan saja */}
            <fieldset className="kaca absolute right-3 top-3 z-10 m-0 flex min-w-0 items-center gap-0.5 rounded-full border-0 p-1 sm:right-4 sm:top-4">
              <legend className="sr-only">Mode tampilan</legend>
              <button
                type="button"
                aria-pressed={modeAR === "mati"}
                onClick={() => void pilihMode("3d")}
                disabled={!mode3d}
                className="rounded-full px-3 py-1.5 text-xs font-semibold text-neutral-600 transition aria-pressed:bg-neutral-900 aria-pressed:text-white disabled:opacity-50"
              >
                Jelajah 3D
              </button>
              <button
                type="button"
                aria-pressed={modeAR !== "mati"}
                onClick={() => void pilihMode("ar")}
                disabled={!mode3d}
                className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-neutral-600 transition aria-pressed:bg-biru aria-pressed:text-white disabled:opacity-50"
              >
                <Ikon nama="kamera" kelas="h-3.5 w-3.5" />
                {modeAR === "xr" ? "AR (WebXR)" : "AR kamera"}
              </button>
            </fieldset>
            {modeAR === "mati" && (
              <p className="mikro kaca pointer-events-none absolute right-4 top-16 hidden rounded-full px-3 py-1.5 lg:block">
                Seret untuk memutar &middot; Ctrl + gulir untuk zoom
              </p>
            )}

            {galatKamera && (
              <div
                role="alert"
                className="kaca absolute inset-x-3 top-16 z-20 rounded-2xl p-4 text-xs leading-relaxed text-neutral-800 sm:left-auto sm:right-4 sm:max-w-sm"
              >
                <p>{galatKamera}</p>
                <button
                  type="button"
                  onClick={() => {
                    simpanPilihan("3d");
                    setGalatKamera(null);
                  }}
                  className={`${tombol({ variant: "sekunder", ukuran: "sm" })} mt-3`}
                >
                  Lanjut dengan 3D
                </button>
              </div>
            )}

            {/* Pilihan awal mode (sekali per sesi) */}
            {tanyaMode && mode3d && (
              <div
                role="dialog"
                aria-modal="false"
                aria-label="Pilih mode tampilan"
                className="absolute inset-0 z-30 grid place-items-center bg-black/35 p-4 backdrop-blur-[2px]"
              >
                <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
                  <p className="mikro">Mode tampilan</p>
                  <h2 className="titik-biru mt-2 text-2xl font-semibold leading-tight">Mau coba AR?</h2>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                    Dengan AR, model {organ.nama_organ.toLowerCase()} tampil di atas tampilan kamera perangkatmu. Kamu
                    bisa kembali ke mode 3D biasa atau berpindah mode kapan saja lewat tombol di kanan atas.
                  </p>
                  <div className="mt-5 grid gap-2.5">
                    <button
                      type="button"
                      onClick={() => void pilihMode("ar")}
                      className={tombol({ ukuran: "lg", lebar: "penuh" })}
                    >
                      <Ikon nama="kamera" /> Coba AR dengan kamera
                    </button>
                    <button
                      type="button"
                      onClick={() => void pilihMode("3d")}
                      className={tombol({ variant: "garis", ukuran: "lg", lebar: "penuh" })}
                    >
                      Jelajahi 3D saja
                    </button>
                  </div>
                  <p className="mt-3 text-[11px] leading-relaxed text-neutral-500">
                    AR memerlukan izin kamera dan koneksi HTTPS. Video kamera tidak direkam dan tidak dikirim ke mana
                    pun.
                  </p>
                </div>
              </div>
            )}

            {/* FR-05: bilah layer; organ dalam selalu tampil */}
            <section
              aria-labelledby="judul-layer"
              className="kaca absolute bottom-3 left-1/2 z-10 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-1 rounded-full p-1 sm:bottom-4 sm:gap-1.5 sm:p-1.5"
            >
              <h2 id="judul-layer" className="mikro ml-2 mr-1 flex items-center gap-1.5">
                <Ikon nama="lapisan" />
                <span className="hidden sm:inline">Layer</span>
              </h2>
              {layers.map((l) => (
                <button
                  key={l.id_layer}
                  type="button"
                  onClick={() => saatToggleLayer(l)}
                  aria-pressed={layerAktif[l.nama_layer]}
                  className={kelasToggle({ aktif: layerAktif[l.nama_layer] })}
                >
                  {l.label}
                </button>
              ))}
              <p className="sr-only" role="status" aria-live="polite">
                {statusLayer}
              </p>
            </section>

            {/* Panel penjelasan, meluncur masuk di dalam penampil */}
            <aside
              id="panel-samping"
              ref={panelRef}
              role="dialog"
              aria-modal="false"
              aria-labelledby="judul-panel"
              aria-hidden={!panelTerbuka}
              className={`panel-samping kaca kaca-tebal flex flex-col rounded-3xl ${panelTerbuka ? "terbuka" : ""}`}
            >
              <div className="flex items-center justify-between px-5 pt-4">
                <span className="h-1.5 w-10 rounded-full bg-neutral-300 md:hidden" aria-hidden="true" />
                <span className="mikro hidden md:inline">Penjelasan</span>
                <button
                  type="button"
                  onClick={tutupPanel}
                  aria-label="Tutup panel"
                  tabIndex={panelTerbuka ? 0 : -1}
                  className="grid h-9 w-9 place-items-center rounded-full bg-white text-neutral-500 transition hover:text-neutral-900"
                >
                  <Ikon nama="silang" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 pb-6 pt-3">
                {panelTerbuka &&
                  (bagianAktif && kontenDasar ? (
                    <PanelBagian
                      key={bagianAktif.id_bagian}
                      bagian={bagianAktif}
                      induk={bagian.find((x) => x.id_bagian === bagianAktif.parent_bagian_id) ?? null}
                      dasar={kontenDasar}
                      dimmed={kontenDimmed}
                      onKeDaftar={() => bukaDaftar()}
                      onBukaDimmed={() => mulaiRiwayat(bagianAktif.id_bagian, "dimmed")}
                      onLapor={() => setLaporUntuk(bagianAktif)}
                    />
                  ) : (
                    <PanelDaftar organ={organ} bagian={bagian} sudahDibuka={sudahDibuka} onPilih={pilihBagian} />
                  ))}
              </div>
            </aside>
          </div>
        </div>
        {keterangan}
      </figure>

      {laporUntuk && (
        <FormLaporan
          bagian={laporUntuk}
          konten={konten.filter((k) => k.id_bagian === laporUntuk.id_bagian)}
          onTutup={() => setLaporUntuk(null)}
        />
      )}
    </>
  );
}
