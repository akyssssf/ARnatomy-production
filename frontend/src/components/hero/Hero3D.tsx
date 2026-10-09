"use client";

/* Client leaf: organ 3D berputar pelan sebagai hero dekoratif.
   Prioritas Core Web Vitals: gambar statis (LCP) tampil dulu; Three.js
   baru diimpor dinamis SETELAH event load + saat main thread idle, sehingga
   tidak menambah Total Blocking Time / menunda LCP. Gambar memudar begitu
   model siap (kelas .hero-3d-siap) dan tetap tampil bila WebGL gagal atau
   pengguna memilih prefers-reduced-motion. */
import { useEffect, useRef } from "react";

const JEDA_SETELAH_LOAD_MS = 1500;

export function Hero3D({
  urlModel,
  jarak = 1.5,
  kecepatanPutar = 0.7,
}: {
  urlModel: string;
  jarak?: number;
  kecepatanPutar?: number;
}) {
  const wadah = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wadah.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let dibatalkan = false;
    let hancurkan: (() => void) | null = null;
    let penghitung: number | undefined;
    let idIdle: number | undefined;

    async function mulai() {
      if (dibatalkan) return;
      try {
        const { buatPenampil } = await import("@/three/viewer3d");
        if (dibatalkan) return;
        const penampil = await buatPenampil({
          wadah: el as HTMLDivElement,
          urlModel,
          titik: [],
          dekoratif: true,
          jarak,
          kecepatanPutar,
        });
        if (dibatalkan) {
          penampil.bersihkan();
          return;
        }
        hancurkan = penampil.bersihkan;
        el?.parentElement?.classList.add("hero-3d-siap");
      } catch {
        /* Gambar statis tetap tampil sebagai pengganti */
      }
    }

    function jadwalkan() {
      penghitung = window.setTimeout(() => {
        /* requestIdleCallback belum ada di Safari: pakai bila tersedia */
        if ("requestIdleCallback" in window) idIdle = window.requestIdleCallback(() => void mulai(), { timeout: 2000 });
        else void mulai();
      }, JEDA_SETELAH_LOAD_MS);
    }

    if (document.readyState === "complete") jadwalkan();
    else window.addEventListener("load", jadwalkan, { once: true });

    return () => {
      dibatalkan = true;
      window.removeEventListener("load", jadwalkan);
      if (penghitung !== undefined) window.clearTimeout(penghitung);
      if (idIdle !== undefined && "cancelIdleCallback" in window) window.cancelIdleCallback(idIdle);
      hancurkan?.();
      el.parentElement?.classList.remove("hero-3d-siap");
    };
  }, [urlModel, jarak, kecepatanPutar]);

  return <div ref={wadah} className="absolute inset-0" aria-hidden="true" />;
}
