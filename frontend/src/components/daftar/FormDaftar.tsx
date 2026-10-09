"use client";

/* Client leaf: formulir registrasi (FR-02). Input tak terkendali; saat submit
   nilai dibaca lewat FormData lalu divalidasi Zod (DaftarFormSchema) sebelum
   POST /api/daftar. Galat per-field lewat aria-invalid + aria-describedby,
   galat umum lewat role="alert". Pilihan peran dioper sebagai Server
   Component (pilihanPeran) karena tampilannya murni CSS.
   Berhasil -> server sudah memasang cookie sesi, klien ke /beranda. */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Ikon } from "@/components/ui/Ikon";
import { Spinner } from "@/components/ui/Spinner";
import { daftar, GalatApi } from "@/lib/mock-api";
import { type DaftarForm, DaftarFormSchema } from "@/lib/schemas";
import { alert, input, tombol } from "@/lib/variants";

type Field = keyof DaftarForm;
type GalatField = Partial<Record<Field, string>>;
const URUTAN_FIELD: Field[] = ["nama", "email", "role", "asal_sekolah", "password", "konfirmasi"];

function adalahField(nilai: unknown): nilai is Field {
  return typeof nilai === "string" && (URUTAN_FIELD as string[]).includes(nilai);
}

export function FormDaftar({ pilihanPeran }: { pilihanPeran: React.ReactNode }) {
  const router = useRouter();
  const [lihatSandi, setLihatSandi] = useState(false);
  const [galat, setGalat] = useState<GalatField>({});
  const [galatUmum, setGalatUmum] = useState<string | null>(null);
  const [sedangKirim, setSedangKirim] = useState(false);

  async function saatSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGalatUmum(null);
    const form = e.currentTarget;

    const hasil = DaftarFormSchema.safeParse(Object.fromEntries(new FormData(form)));
    if (!hasil.success) {
      const baru: GalatField = {};
      for (const isu of hasil.error.issues) {
        const field = isu.path[0];
        if (adalahField(field) && !baru[field]) baru[field] = isu.message;
      }
      setGalat(baru);
      setGalatUmum("Periksa kembali isian yang ditandai.");
      const pertama = URUTAN_FIELD.find((f) => baru[f]);
      if (pertama) document.getElementById(`daftar-${pertama}`)?.focus();
      return;
    }
    setGalat({});

    setSedangKirim(true);
    try {
      await daftar(hasil.data);
      router.push("/beranda");
      router.refresh();
    } catch (kesalahan) {
      setGalatUmum(kesalahan instanceof GalatApi ? kesalahan.message : "Tidak dapat menghubungi server.");
      if (kesalahan instanceof GalatApi && kesalahan.status === 409) {
        setGalat({ email: "Email sudah terdaftar." });
        document.getElementById("daftar-email")?.focus();
      }
      setSedangKirim(false);
    }
  }

  const field = (kunci: Exclude<Field, "role">, label: string, props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div>
      <label htmlFor={`daftar-${kunci}`} className="mikro mb-2 block">
        {label}
      </label>
      <input
        id={`daftar-${kunci}`}
        name={kunci}
        aria-invalid={Boolean(galat[kunci])}
        aria-describedby={`galat-${kunci}${kunci === "password" ? " syarat-sandi" : ""}`}
        className={input({ keadaan: galat[kunci] ? "salah" : "normal" })}
        {...props}
      />
      <p id={`galat-${kunci}`} className="mt-1 text-xs text-rose-600" hidden={!galat[kunci]}>
        {galat[kunci]}
      </p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="mikro">Data diri</p>
        <h2 className="titik-biru mt-2 text-2xl font-semibold">Isi formulir berikut</h2>
      </div>

      {galatUmum && (
        <div role="alert" aria-live="assertive" className={alert({ tipe: "error" })}>
          {galatUmum}
        </div>
      )}

      <form onSubmit={saatSubmit} noValidate className="space-y-4">
        {field("nama", "Nama lengkap", { type: "text", autoComplete: "name", placeholder: "Nama sesuai sekolah" })}
        {field("email", "Email", { type: "email", autoComplete: "email", placeholder: "nama@sekolah.sch.id" })}
        {pilihanPeran}
        {field("asal_sekolah", "Asal sekolah", {
          type: "text",
          autoComplete: "organization",
          placeholder: "SMPN 1 Madiun",
        })}
        <div className="grid gap-4 sm:grid-cols-2">
          {field("password", "Kata sandi", { type: lihatSandi ? "text" : "password", autoComplete: "new-password" })}
          {field("konfirmasi", "Ulangi kata sandi", {
            type: lihatSandi ? "text" : "password",
            autoComplete: "new-password",
          })}
        </div>
        <div className="flex items-center justify-between gap-3">
          <p id="syarat-sandi" className="text-[11px] text-neutral-400">
            Minimal 8 karakter, memuat huruf dan angka.
          </p>
          <button
            type="button"
            onClick={() => setLihatSandi((v) => !v)}
            aria-pressed={lihatSandi}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-500 transition hover:text-neutral-900"
          >
            <Ikon nama={lihatSandi ? "silang" : "mata"} kelas="h-3.5 w-3.5" />
            {lihatSandi ? "Sembunyikan" : "Tampilkan"} sandi
          </button>
        </div>

        <div className="flex items-center justify-end pt-1">
          <button type="submit" disabled={sedangKirim} className={tombol({ ukuran: "md" })}>
            {sedangKirim ? (
              <>
                <Spinner /> Mendaftarkan
              </>
            ) : (
              <>
                Daftar dan masuk
                <Ikon nama="panah" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
