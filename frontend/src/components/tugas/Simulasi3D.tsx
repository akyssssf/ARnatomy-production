"use client";

/* Client leaf: simulasi alur dengan model organ 3D (jantung untuk peredaran darah,
   paru-paru untuk pernapasan). Three.js diimpor dinamis; bila WebGL tidak tersedia,
   pemanggil jatuh ke diagram 2D. */
import { useEffect, useRef, useState } from "react";
import type { JenisSim, MesinSim } from "@/three/simulasi3d";

const MODEL: Record<JenisSim, string> = { darah: "/models/heart.glb", napas: "/models/lungs.glb" };

export function Simulasi3D({
  jenis,
  kode,
  cepat,
  onGagal,
}: {
  jenis: JenisSim;
  kode: string;
  cepat: boolean;
  onGagal: () => void;
}) {
  const wadah = useRef<HTMLDivElement>(null);
  const mesin = useRef<MesinSim | null>(null);
  const kodeTerbaru = useRef(kode);
  const cepatTerbaru = useRef(cepat);
  const [siap, setSiap] = useState(false);
  const gagalTerbaru = useRef(onGagal);
  gagalTerbaru.current = onGagal;
  kodeTerbaru.current = kode;
  cepatTerbaru.current = cepat;

  useEffect(() => {
    const el = wadah.current;
    if (!el) return;
    let batal = false;
    (async () => {
      try {
        const { mulaiSimulasi3D } = await import("@/three/simulasi3d");
        const m = await mulaiSimulasi3D({ wadah: el, jenis, urlModel: MODEL[jenis] });
        if (batal) {
          m.bersihkan();
          return;
        }
        mesin.current = m;
        m.setCepat(cepatTerbaru.current);
        m.setTahap(kodeTerbaru.current);
        setSiap(true);
      } catch {
        if (!batal) gagalTerbaru.current();
      }
    })();
    return () => {
      batal = true;
      mesin.current?.bersihkan();
      mesin.current = null;
    };
  }, [jenis]);

  useEffect(() => {
    mesin.current?.setTahap(kode);
  }, [kode]);
  useEffect(() => {
    mesin.current?.setCepat(cepat);
  }, [cepat]);

  return (
    <div className="relative">
      <div
        ref={wadah}
        className="aspect-square w-full overflow-hidden rounded-2xl bg-abu sm:aspect-[4/3]"
        role="img"
        aria-label={jenis === "darah" ? "Model 3D jantung dengan alur darah" : "Model 3D paru-paru dengan aliran udara"}
      />
      {!siap && (
        <p className="absolute inset-0 grid place-items-center text-sm text-neutral-400" aria-live="polite">
          Memuat model 3D…
        </p>
      )}
      <p className="pointer-events-none absolute bottom-3 right-4 text-[11px] text-neutral-400">Seret untuk memutar</p>
    </div>
  );
}
