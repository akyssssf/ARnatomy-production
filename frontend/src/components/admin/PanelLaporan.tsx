"use client";

/* Client: tab Laporan Kesalahan (FR-11). useLaporanKesalahan({aktif:true})
   -> loading/error/empty state; "Tandai ditindaklanjuti" = mutasi +
   invalidasi cache; "Perbaiki konten" membuka FormEditKonten. */
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { KondisiKosong } from "@/components/ui/KondisiKosong";
import { Spinner } from "@/components/ui/Spinner";
import { useKontenLabel } from "@/hooks/useKontenLabel";
import { useLaporanKesalahan } from "@/hooks/useLaporanKesalahan";
import { bagianById } from "@/lib/data";
import { formatWaktu } from "@/lib/format";
import type { LaporanId, PartContent } from "@/lib/schemas";
import { alert, kartu, tombol } from "@/lib/variants";
import { useUIStore } from "@/store/useUIStore";
import { FormEditKonten } from "./FormEditKonten";

export function PanelLaporan() {
  const { daftar, tindakLanjuti } = useLaporanKesalahan({ aktif: true });
  const { daftar: konten } = useKontenLabel();
  const tampilkanToast = useUIStore((s) => s.tampilkanToast);
  const [diedit, setDiedit] = useState<PartContent | null>(null);

  if (daftar.isPending) {
    return (
      <div role="status" aria-busy="true" aria-label="Memuat laporan" className="space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="tulang h-36 rounded-2xl" />
        ))}
      </div>
    );
  }
  if (daftar.isError) {
    return (
      <div role="alert" className={`${alert({ tipe: "error" })} items-center justify-between`}>
        <span>Gagal memuat laporan: {daftar.error.message}</span>
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
  if (!daftar.data.length) {
    return (
      <KondisiKosong
        judul="Belum ada laporan masuk"
        deskripsi="Laporan muncul di sini setelah User mengirim formulir laporan kesalahan pada halaman Eksplorasi."
        aksi={
          <Link href="/eksplorasi" className={tombol({ variant: "garis", ukuran: "sm" })}>
            Buka halaman Eksplorasi
          </Link>
        }
      />
    );
  }

  async function tandai(idLaporan: LaporanId) {
    try {
      await tindakLanjuti.mutateAsync(idLaporan);
      tampilkanToast("Laporan ditandai ditindaklanjuti.", "sukses");
    } catch (kesalahan) {
      tampilkanToast(`Gagal: ${kesalahan instanceof Error ? kesalahan.message : "galat tidak dikenal."}`, "error");
    }
  }

  return (
    <>
      <ul className="space-y-3">
        {daftar.data.map((l) => {
          const k = konten.data?.find((x) => x.id_konten === l.id_konten) ?? null;
          const bagian = bagianById(k?.id_bagian);
          const selesai = l.status_tindak_lanjut === "ditindaklanjuti";
          const sedang = tindakLanjuti.isPending && tindakLanjuti.variables === l.id_laporan;
          return (
            <li key={l.id_laporan} className={kartu({ padding: "md" })}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold">{k?.judul_tampil ?? "Konten tidak ditemukan"}</h3>
                  <p className="text-xs text-neutral-400">
                    {bagian ? `${bagian.nama_bagian_internal}, ` : ""}Dilaporkan {formatWaktu(l.waktu)}
                  </p>
                </div>
                <Badge status={selesai ? "ditindaklanjuti" : "baru"}>{l.status_tindak_lanjut}</Badge>
              </div>
              <p className="mt-3 rounded-xl bg-abu px-3.5 py-2.5 text-sm leading-relaxed text-neutral-500">
                {l.deskripsi_laporan}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {k && (
                  <button
                    type="button"
                    onClick={() => setDiedit(k)}
                    className={tombol({ variant: "sekunder", ukuran: "sm" })}
                  >
                    Perbaiki konten
                  </button>
                )}
                {!selesai && (
                  <button
                    type="button"
                    onClick={() => tandai(l.id_laporan)}
                    disabled={sedang}
                    className={tombol({ variant: "bahaya", ukuran: "sm" })}
                  >
                    {sedang ? (
                      <>
                        <Spinner /> Menyimpan
                      </>
                    ) : (
                      "Tandai ditindaklanjuti"
                    )}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {diedit && <FormEditKonten konten={diedit} onTutup={() => setDiedit(null)} />}
    </>
  );
}
