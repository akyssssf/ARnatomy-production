"use client";

/* Client: tab Konten Label (FR-10). useKontenLabel() -> loading skeleton,
   error banner, lalu tabel; tombol Edit membuka FormEditKonten. */
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { useKontenLabel } from "@/hooks/useKontenLabel";
import { bagianById, organById } from "@/lib/data";
import type { PartContent } from "@/lib/schemas";
import { alert, kartu, tombol } from "@/lib/variants";
import { FormEditKonten } from "./FormEditKonten";

export function PanelKonten() {
  const { daftar } = useKontenLabel();
  const [diedit, setDiedit] = useState<PartContent | null>(null);

  if (daftar.isPending) {
    return (
      <div role="status" aria-busy="true" aria-label="Memuat konten label" className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="tulang h-28 rounded-2xl" />
          ))}
        </div>
        <div className="tulang h-72 rounded-2xl" />
      </div>
    );
  }
  if (daftar.isError) {
    return (
      <div role="alert" className={`${alert({ tipe: "error" })} items-center justify-between`}>
        <span>Gagal memuat konten: {daftar.error.message}</span>
        <button
          type="button"
          onClick={() => daftar.refetch()}
          className={tombol({ variant: "sekunder", ukuran: "sm" })}
        >
          Coba lagi
        </button>
      </div>
    );
  }

  const konten = daftar.data;
  const draft = konten.filter((k) => k.status_validasi === "draft").length;
  const statistik = [
    { label: "Total konten", nilai: konten.length, warna: "" },
    { label: "Masih draft", nilai: draft, warna: "text-amber-700" },
    { label: "Tervalidasi", nilai: konten.length - draft, warna: "text-emerald-700" },
  ];

  return (
    <>
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        {statistik.map((s) => (
          <div key={s.label} className={kartu({ nada: "aksen", padding: "md" })}>
            <p className="mikro">{s.label}</p>
            <p className={`mt-3 text-4xl font-semibold tracking-tight ${s.warna}`}>{s.nilai}</p>
          </div>
        ))}
      </div>
      <div className={`${kartu({ padding: "sm" })} overflow-x-auto ${daftar.isFetching ? "opacity-70" : ""}`}>
        <table className="w-full min-w-[38rem] border-collapse text-left">
          <caption className="sr-only">Daftar konten label dasar dan dimmed beserta status validasinya</caption>
          <thead>
            <tr className="border-b border-black/5 text-[11px] uppercase tracking-wide text-neutral-400">
              <th scope="col" className="px-3 py-2.5 font-semibold">
                Judul dan bagian
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                Jenis
              </th>
              <th scope="col" className="hidden px-3 py-2.5 font-semibold lg:table-cell">
                Cuplikan deskripsi
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                Status
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {konten.map((k) => {
              const bagian = bagianById(k.id_bagian);
              const organ = organById(bagian?.id_organ);
              return (
                <tr key={k.id_konten} className="border-b border-black/5 last:border-0">
                  <th scope="row" className="px-3 py-3 text-left align-top">
                    <span className="block text-sm font-semibold">{k.judul_tampil}</span>
                    <span className="block text-xs text-neutral-400">
                      {bagian?.nama_bagian_internal} &middot; {organ?.nama_organ}
                    </span>
                  </th>
                  <td className="px-3 py-3 align-top">
                    <Badge status={k.jenis_konten}>{k.jenis_konten}</Badge>
                  </td>
                  <td className="hidden max-w-md px-3 py-3 align-top text-xs leading-relaxed text-neutral-500 lg:table-cell">
                    {k.deskripsi.slice(0, 110)}
                    {k.deskripsi.length > 110 ? "..." : ""}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <Badge status={k.status_validasi}>{k.status_validasi}</Badge>
                  </td>
                  <td className="px-3 py-3 align-top text-right">
                    <button
                      type="button"
                      onClick={() => setDiedit(k)}
                      className={tombol({ variant: "sekunder", ukuran: "sm" })}
                      aria-label={`Edit ${k.judul_tampil}`}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {diedit && <FormEditKonten konten={diedit} onTutup={() => setDiedit(null)} />}
    </>
  );
}
