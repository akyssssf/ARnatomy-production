"use client";

/* Client leaf: aksi pada satu kartu aset (FR-12): unggah/ganti model .glb
   (multipart lewat useAsetModel().unggah) dan "Kembalikan bawaan" (hapus).
   Validasi ekstensi & ukuran di klien sebelum dikirim; server memeriksa
   ulang termasuk magic bytes. Setelah sukses: router.refresh() agar daftar
   (RSC) dan halaman eksplorasi membaca model aktif yang baru. */
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { useAsetModel } from "@/hooks/useAsetModel";
import { formatUkuran } from "@/lib/format";
import { type AsetModel, BATAS_UKURAN_MODEL } from "@/lib/schemas";
import { tombol } from "@/lib/variants";
import { useUIStore } from "@/store/useUIStore";

export function AksiAset({ aset, namaOrgan }: { aset: AsetModel; namaOrgan: string }) {
  const router = useRouter();
  const { unggah, hapus } = useAsetModel();
  const tampilkanToast = useUIStore((s) => s.tampilkanToast);
  const [galat, setGalat] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idInput = `unggah-${aset.id_organ}`;

  async function kirimBerkas(berkas: File | undefined) {
    setGalat(null);
    if (!berkas) return;
    if (!berkas.name.toLowerCase().endsWith(".glb")) {
      setGalat("Hanya berkas .glb yang diterima.");
      return;
    }
    if (berkas.size > BATAS_UKURAN_MODEL) {
      setGalat(`Ukuran maksimal ${formatUkuran(BATAS_UKURAN_MODEL)}.`);
      return;
    }
    try {
      await unggah.mutateAsync({ idOrgan: aset.id_organ, berkas });
      tampilkanToast(`Model ${namaOrgan} diperbarui.`, "sukses");
      router.refresh();
    } catch (kesalahan) {
      setGalat(kesalahan instanceof Error ? kesalahan.message : "Gagal mengunggah.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function kembalikan() {
    try {
      await hapus.mutateAsync(aset.id_organ);
      tampilkanToast(`Model ${namaOrgan} dikembalikan ke bawaan.`, "sukses");
      router.refresh();
    } catch (kesalahan) {
      tampilkanToast(`Gagal: ${kesalahan instanceof Error ? kesalahan.message : "galat tidak dikenal."}`, "error");
    }
  }

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label htmlFor={idInput} className={`${tombol({ variant: "sekunder", ukuran: "sm" })} cursor-pointer`}>
          {unggah.isPending ? (
            <>
              <Spinner /> Mengunggah
            </>
          ) : aset.sumber === "unggahan" ? (
            "Ganti model"
          ) : (
            "Unggah model"
          )}
        </label>
        <input
          id={idInput}
          ref={inputRef}
          type="file"
          accept=".glb,model/gltf-binary"
          disabled={unggah.isPending}
          aria-describedby={`galat-${idInput}`}
          className="sr-only"
          onChange={(e) => kirimBerkas(e.target.files?.[0])}
        />
        {aset.sumber === "unggahan" && (
          <button
            type="button"
            onClick={kembalikan}
            disabled={hapus.isPending}
            className={tombol({ variant: "bahaya", ukuran: "sm" })}
          >
            {hapus.isPending ? (
              <>
                <Spinner /> Menghapus
              </>
            ) : (
              "Kembalikan bawaan"
            )}
          </button>
        )}
      </div>
      <p id={`galat-${idInput}`} role="alert" className="mt-2 text-xs text-rose-600" hidden={!galat}>
        {galat}
      </p>
    </>
  );
}
