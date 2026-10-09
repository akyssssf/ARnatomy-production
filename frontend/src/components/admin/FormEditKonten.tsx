"use client";

/* Client leaf: modal edit konten label (FR-10). Validasi KontenFormSchema
   (Zod), galat per-field dengan aria-invalid, mutasi useKontenLabel().perbarui
   menginvalidasi cache ['konten'], lalu router.refresh() agar Server
   Component (eksplorasi/riwayat) membaca konten terbaru. */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/Spinner";
import { useKontenLabel } from "@/hooks/useKontenLabel";
import { bagianById } from "@/lib/data";
import { GalatApi } from "@/lib/mock-api";
import { KontenFormSchema, type PartContent, type StatusValidasi } from "@/lib/schemas";
import { alert, input, tombol } from "@/lib/variants";
import { useUIStore } from "@/store/useUIStore";

export function FormEditKonten({ konten, onTutup }: { konten: PartContent; onTutup: () => void }) {
  const router = useRouter();
  const { perbarui } = useKontenLabel();
  const tampilkanToast = useUIStore((s) => s.tampilkanToast);
  const [judul, setJudul] = useState(konten.judul_tampil);
  const [deskripsi, setDeskripsi] = useState(konten.deskripsi);
  const [status, setStatus] = useState<StatusValidasi>(konten.status_validasi);
  const [galat, setGalat] = useState<{ judul_tampil?: string; deskripsi?: string }>({});
  const [galatUmum, setGalatUmum] = useState<string | null>(null);
  const bagian = bagianById(konten.id_bagian);

  async function saatSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGalatUmum(null);
    const hasil = KontenFormSchema.safeParse({ judul_tampil: judul, deskripsi, status_validasi: status });
    if (!hasil.success) {
      const baru: typeof galat = {};
      for (const isu of hasil.error.issues) {
        const f = isu.path[0];
        if ((f === "judul_tampil" || f === "deskripsi") && !baru[f]) baru[f] = isu.message;
      }
      setGalat(baru);
      document.getElementById(baru.judul_tampil ? "edit-judul" : "edit-deskripsi")?.focus();
      return;
    }
    setGalat({});
    try {
      await perbarui.mutateAsync({ idKonten: konten.id_konten, input: hasil.data });
      tampilkanToast("Konten label diperbarui.", "sukses");
      router.refresh();
      onTutup();
    } catch (kesalahan) {
      setGalatUmum(kesalahan instanceof GalatApi ? kesalahan.message : "Gagal menyimpan perubahan.");
    }
  }

  return (
    <Modal judul="Edit konten label" onTutup={onTutup}>
      <form onSubmit={saatSubmit} noValidate className="space-y-3">
        <p className="mikro">
          {bagian?.nama_bagian_internal} &middot; {konten.jenis_konten}
        </p>
        {galatUmum && (
          <div role="alert" aria-live="assertive" className={alert({ tipe: "error" })}>
            {galatUmum}
          </div>
        )}
        <div>
          <label htmlFor="edit-judul" className="mikro mb-2 block">
            Judul tampil
          </label>
          <input
            id="edit-judul"
            type="text"
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
            aria-invalid={Boolean(galat.judul_tampil)}
            aria-describedby="galat-judul"
            className={input({ keadaan: galat.judul_tampil ? "salah" : "normal" })}
          />
          <p id="galat-judul" className="mt-1 text-xs text-rose-600" hidden={!galat.judul_tampil}>
            {galat.judul_tampil}
          </p>
        </div>
        <div>
          <label htmlFor="edit-deskripsi" className="mikro mb-2 block">
            Deskripsi
          </label>
          <textarea
            id="edit-deskripsi"
            rows={6}
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
            aria-invalid={Boolean(galat.deskripsi)}
            aria-describedby="galat-konten"
            className={input({ keadaan: galat.deskripsi ? "salah" : "normal" })}
          />
          <p id="galat-konten" className="mt-1 text-xs text-rose-600" hidden={!galat.deskripsi}>
            {galat.deskripsi}
          </p>
        </div>
        <div>
          <label htmlFor="edit-status" className="mikro mb-2 block">
            Status validasi
          </label>
          <select
            id="edit-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusValidasi)}
            className={input()}
          >
            <option value="draft">draft</option>
            <option value="tervalidasi">tervalidasi</option>
          </select>
        </div>
        <button type="submit" disabled={perbarui.isPending} className={tombol({ lebar: "penuh" })}>
          {perbarui.isPending ? (
            <>
              <Spinner /> Menyimpan
            </>
          ) : (
            "Simpan perubahan"
          )}
        </button>
      </form>
    </Modal>
  );
}
