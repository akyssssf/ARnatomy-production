"use client";

/* Client leaf: modal formulir laporan kesalahan konten (FR-09).
   Validasi LaporanFormSchema (Zod), mutasi useLaporanKesalahan().kirim
   dengan loading state + role="alert" saat gagal; bendera simulasiGagal
   (Zustand) ikut dikirim agar jalur error bisa didemokan. */
import { useState } from "react";
import { Modal } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/Spinner";
import { useLaporanKesalahan } from "@/hooks/useLaporanKesalahan";
import { GalatApi } from "@/lib/mock-api";
import { type BodyPart, type KontenId, LaporanFormSchema, type PartContent } from "@/lib/schemas";
import { alert, input, tombol } from "@/lib/variants";
import { useUIStore } from "@/store/useUIStore";

export function FormLaporan({
  bagian,
  konten,
  onTutup,
}: {
  bagian: BodyPart;
  konten: PartContent[];
  onTutup: () => void;
}) {
  const { kirim } = useLaporanKesalahan();
  const simulasiGagal = useUIStore((s) => s.simulasiGagal);
  const tampilkanToast = useUIStore((s) => s.tampilkanToast);
  const [idKonten, setIdKonten] = useState<KontenId | null>(konten[0]?.id_konten ?? null);
  const [uraian, setUraian] = useState("");
  const [galatUraian, setGalatUraian] = useState<string | null>(null);
  const [galatKirim, setGalatKirim] = useState<string | null>(null);

  async function saatSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGalatKirim(null);
    const hasil = LaporanFormSchema.safeParse({ id_konten: idKonten, deskripsi_laporan: uraian });
    if (!hasil.success) {
      setGalatUraian(hasil.error.issues[0]?.message ?? "Isian tidak valid.");
      document.getElementById("isi-laporan")?.focus();
      return;
    }
    setGalatUraian(null);
    try {
      await kirim.mutateAsync({ ...hasil.data, simulasiGagal });
      tampilkanToast("Laporan terkirim ke dashboard Administrator.", "sukses");
      onTutup();
    } catch (kesalahan) {
      setGalatKirim(
        `Laporan gagal dikirim: ${kesalahan instanceof GalatApi ? kesalahan.message : "galat tidak dikenal."} Periksa koneksi lalu coba lagi.`,
      );
    }
  }

  return (
    <Modal judul="Laporkan kesalahan konten" onTutup={onTutup}>
      <form onSubmit={saatSubmit} noValidate className="space-y-3">
        <p className="text-xs text-neutral-500">Bagian tubuh: {bagian.nama_bagian_internal}</p>
        <div>
          <label htmlFor="pilih-konten" className="mikro mb-2 block">
            Label yang dilaporkan
          </label>
          <select
            id="pilih-konten"
            value={idKonten ?? ""}
            onChange={(e) => setIdKonten(konten.find((k) => k.id_konten === Number(e.target.value))?.id_konten ?? null)}
            className={input()}
          >
            {konten.map((k) => (
              <option key={k.id_konten} value={k.id_konten}>
                {k.judul_tampil} ({k.jenis_konten})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="isi-laporan" className="mikro mb-2 block">
            Uraian kesalahan
          </label>
          <textarea
            id="isi-laporan"
            rows={4}
            value={uraian}
            onChange={(e) => setUraian(e.target.value)}
            aria-invalid={Boolean(galatUraian)}
            aria-describedby="galat-laporan"
            className={input({ keadaan: galatUraian ? "salah" : "normal" })}
          />
          <p id="galat-laporan" className="mt-1 text-xs text-rose-600" hidden={!galatUraian}>
            {galatUraian}
          </p>
        </div>
        {galatKirim && (
          <div role="alert" aria-live="assertive" className={alert({ tipe: "error" })}>
            {galatKirim}
          </div>
        )}
        <button type="submit" disabled={kirim.isPending} className={tombol({ lebar: "penuh" })}>
          {kirim.isPending ? (
            <>
              <Spinner /> Mengirim
            </>
          ) : (
            "Kirim laporan"
          )}
        </button>
      </form>
    </Modal>
  );
}
