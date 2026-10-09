"use client";

/* Client: isi panel penjelasan di dalam penampil.
   - PanelDaftar: organ + daftar seluruh bagian (jalan masuk alternatif
     untuk pengguna keyboard/pembaca layar selain titik 3D).
   - PanelBagian: label dasar (FR-06) + label dimmed sebagai akordeon
     aria-expanded/aria-controls yang membuka DI TEMPAT (FR-07), tombol
     Tanya Asisten AI dan Laporkan kesalahan. */
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { DaftarFakta } from "@/components/ui/DaftarFakta";
import { Ikon } from "@/components/ui/Ikon";
import type { BagianId, BodyPart, Organ, PartContent } from "@/lib/schemas";
import { tombol } from "@/lib/variants";

export function PanelDaftar({
  organ,
  bagian,
  sudahDibuka,
  onPilih,
}: {
  organ: Organ;
  bagian: BodyPart[];
  sudahDibuka: Set<number>;
  onPilih: (id: BagianId, pemicu: HTMLElement) => void;
}) {
  return (
    <>
      <p className="mikro">{organ.sistem_organ}</p>
      <h2 id="judul-panel" tabIndex={-1} className="titik-biru mt-2 text-3xl font-semibold">
        {organ.nama_organ}
      </h2>
      <p className="mt-0.5 text-sm italic text-neutral-400">{organ.julukan}</p>
      <p className="mt-3 text-sm leading-relaxed text-neutral-500">{organ.deskripsi}</p>
      <DaftarFakta fakta={organ.fakta} />
      <h3 className="mikro mt-6">Bagian tubuh</h3>
      <ul className="mt-2 space-y-1">
        {bagian.map((b, i) => {
          const induk = b.parent_bagian_id ? bagian.find((x) => x.id_bagian === b.parent_bagian_id) : null;
          const sudah = sudahDibuka.has(b.id_bagian);
          return (
            <li key={b.id_bagian}>
              <button
                type="button"
                onClick={(e) => onPilih(b.id_bagian, e.currentTarget)}
                className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition hover:bg-abu"
              >
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${sudah ? "bg-biru text-white" : "bg-abu text-neutral-500"}`}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{b.nama_bagian_internal}</span>
                  <span className="block truncate text-[11px] text-neutral-400">
                    {induk ? `Sub-bagian ${induk.nama_bagian_internal}` : "Label dasar"}
                  </span>
                </span>
                <Ikon nama="panah" kelas="h-4 w-4 shrink-0 text-neutral-300" />
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function PanelBagian({
  bagian,
  induk,
  dasar,
  dimmed,
  onKeDaftar,
  onBukaDimmed,
  onLapor,
}: {
  bagian: BodyPart;
  induk: BodyPart | null;
  dasar: PartContent;
  dimmed: PartContent | null;
  onKeDaftar: () => void;
  onBukaDimmed: () => void;
  onLapor: () => void;
}) {
  const [dimmedTerbuka, setDimmedTerbuka] = useState(false);
  const idDetail = `detail-dimmed-${bagian.id_bagian}`;

  function toggleDimmed() {
    const terbuka = !dimmedTerbuka;
    setDimmedTerbuka(terbuka);
    if (terbuka) onBukaDimmed(); // FR-14: pembukaan label dimmed ikut tercatat
  }

  return (
    <>
      <button
        type="button"
        onClick={onKeDaftar}
        className="mikro mb-4 flex items-center gap-1.5 transition hover:text-neutral-900"
      >
        <Ikon nama="panah" kelas="h-3.5 w-3.5 rotate-180" />
        Semua bagian
      </button>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="mikro">Bagian tubuh</p>
          <h2 id="judul-panel" tabIndex={-1} className="titik-biru mt-2 text-3xl font-semibold">
            {bagian.nama_bagian_internal}
          </h2>
          {induk && <p className="mt-0.5 text-sm italic text-neutral-400">Sub-bagian {induk.nama_bagian_internal}</p>}
        </div>
        <Badge status={dasar.status_validasi}>{dasar.status_validasi}</Badge>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-neutral-500">{dasar.deskripsi}</p>
      <DaftarFakta fakta={bagian.fakta} />

      {dimmed ? (
        <section className="mt-5">
          <button
            type="button"
            onClick={toggleDimmed}
            aria-expanded={dimmedTerbuka}
            aria-controls={idDetail}
            className={`w-full rounded-xl border border-dashed border-neutral-300 bg-abu/60 px-3.5 py-3 text-left transition hover:opacity-100 focus-visible:opacity-100 ${dimmedTerbuka ? "" : "opacity-60"}`}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold">{dimmed.judul_tampil}</span>
              <Badge status="dimmed">dimmed</Badge>
            </span>
            <span className="mt-1 block text-[11px] text-neutral-400">
              {dimmedTerbuka ? "Ketuk lagi untuk menutup" : "Ketuk untuk membuka penjelasan lanjutan"}
            </span>
          </button>
          <div
            id={idDetail}
            className={`akordeon ${dimmedTerbuka ? "akordeon-terbuka" : ""}`}
            aria-hidden={!dimmedTerbuka}
          >
            <p className="mt-2 rounded-xl bg-abu p-3.5 text-xs leading-relaxed text-neutral-600">{dimmed.deskripsi}</p>
          </div>
        </section>
      ) : (
        <p className="mt-5 rounded-xl bg-abu px-3.5 py-2.5 text-xs text-neutral-400">
          Tidak ada penjelasan lanjutan untuk bagian ini.
        </p>
      )}

      <div className="mt-6 grid gap-2">
        <Link
          href={{ pathname: "/asisten", query: { bagian: bagian.id_bagian } }}
          className={tombol({ lebar: "penuh" })}
        >
          <Ikon nama="chat" />
          Tanya Asisten AI
        </Link>
        <button type="button" onClick={onLapor} className={`${tombol({ variant: "garis", lebar: "penuh" })} bg-abu`}>
          <Ikon nama="peringatan" />
          Laporkan kesalahan
        </button>
      </div>
    </>
  );
}
