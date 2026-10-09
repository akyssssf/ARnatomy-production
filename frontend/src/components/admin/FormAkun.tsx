"use client";

/* Client leaf: modal tambah / ubah akun (FR-13). Input tak terkendali dibaca
   lewat FormData saat submit; validasi Zod (AkunBuatSchema saat tambah,
   AkunPatchSchema saat ubah; sandi kosong = tidak diganti). Galat per-field
   lewat aria-invalid + aria-describedby; galat umum role="alert". */
import { useState } from "react";
import { Modal } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/Spinner";
import { useAkun } from "@/hooks/useAkun";
import { GalatApi } from "@/lib/mock-api";
import { type Akun, AkunBuatSchema, AkunPatchSchema, PeranSchema } from "@/lib/schemas";
import { alert, input, tombol } from "@/lib/variants";
import { useUIStore } from "@/store/useUIStore";

type Field = "nama" | "email" | "role" | "asal_sekolah" | "password";
const URUTAN: Field[] = ["nama", "email", "role", "asal_sekolah", "password"];
const LABEL_PERAN: Record<Akun["role"], string> = { siswa: "Siswa", guru: "Guru", admin: "Administrator" };

export function FormAkun({ akun, onTutup }: { akun: Akun | null; onTutup: () => void }) {
  const { tambah, ubah } = useAkun();
  const tampilkanToast = useUIStore((s) => s.tampilkanToast);
  const [galat, setGalat] = useState<Partial<Record<Field, string>>>({});
  const [galatUmum, setGalatUmum] = useState<string | null>(null);
  const sedang = tambah.isPending || ubah.isPending;

  async function saatSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGalatUmum(null);
    const mentah = Object.fromEntries(new FormData(e.currentTarget));
    const hasil = akun ? AkunPatchSchema.safeParse(mentah) : AkunBuatSchema.safeParse(mentah);
    if (!hasil.success) {
      const baru: typeof galat = {};
      for (const isu of hasil.error.issues) {
        const f = isu.path[0];
        if (typeof f === "string" && (URUTAN as string[]).includes(f) && !baru[f as Field])
          baru[f as Field] = isu.message;
      }
      setGalat(baru);
      setGalatUmum(
        Object.keys(baru).length ? "Periksa kembali isian yang ditandai." : (hasil.error.issues[0]?.message ?? null),
      );
      const pertama = URUTAN.find((f) => baru[f]);
      if (pertama) document.getElementById(`akun-${pertama}`)?.focus();
      return;
    }
    setGalat({});
    try {
      if (akun) {
        await ubah.mutateAsync({ idUser: akun.id_user, input: hasil.data });
        tampilkanToast(`Akun ${hasil.data.nama ?? akun.nama} diperbarui.`, "sukses");
      } else {
        const dibuat = await tambah.mutateAsync(hasil.data as Parameters<typeof tambah.mutateAsync>[0]);
        tampilkanToast(`Akun ${dibuat.nama} ditambahkan.`, "sukses");
      }
      onTutup();
    } catch (kesalahan) {
      const pesan = kesalahan instanceof GalatApi ? kesalahan.message : "Gagal menyimpan akun.";
      setGalatUmum(pesan);
      if (kesalahan instanceof GalatApi && kesalahan.status === 409) {
        setGalat({ email: "Email sudah dipakai." });
        document.getElementById("akun-email")?.focus();
      }
    }
  }

  const field = (kunci: Exclude<Field, "role">, label: string, props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div>
      <label htmlFor={`akun-${kunci}`} className="mikro mb-2 block">
        {label}
      </label>
      <input
        id={`akun-${kunci}`}
        name={kunci}
        aria-invalid={Boolean(galat[kunci])}
        aria-describedby={`galat-akun-${kunci}`}
        className={input({ keadaan: galat[kunci] ? "salah" : "normal" })}
        {...props}
      />
      <p id={`galat-akun-${kunci}`} className="mt-1 text-xs text-rose-600" hidden={!galat[kunci]}>
        {galat[kunci]}
      </p>
    </div>
  );

  return (
    <Modal judul={akun ? "Ubah akun" : "Tambah akun"} onTutup={onTutup}>
      <form onSubmit={saatSubmit} noValidate className="space-y-3">
        {galatUmum && (
          <div role="alert" aria-live="assertive" className={alert({ tipe: "error" })}>
            {galatUmum}
          </div>
        )}
        {field("nama", "Nama lengkap", { type: "text", defaultValue: akun?.nama ?? "", autoComplete: "off" })}
        {field("email", "Email", { type: "email", defaultValue: akun?.email ?? "", autoComplete: "off" })}
        <div>
          <label htmlFor="akun-role" className="mikro mb-2 block">
            Peran
          </label>
          <select
            id="akun-role"
            name="role"
            defaultValue={akun?.role ?? "siswa"}
            className={input({ keadaan: galat.role ? "salah" : "normal" })}
          >
            {PeranSchema.options.map((p) => (
              <option key={p} value={p}>
                {LABEL_PERAN[p]}
              </option>
            ))}
          </select>
        </div>
        {field("asal_sekolah", "Asal sekolah (kosongkan untuk admin)", {
          type: "text",
          defaultValue: akun?.asal_sekolah ?? "",
          autoComplete: "off",
        })}
        {field("password", akun ? "Kata sandi baru (kosongkan bila tetap)" : "Kata sandi", {
          type: "password",
          autoComplete: "new-password",
          placeholder: "Minimal 8 karakter, huruf dan angka",
        })}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onTutup} className={tombol({ variant: "garis", ukuran: "sm" })}>
            Batal
          </button>
          <button type="submit" disabled={sedang} className={tombol({ ukuran: "sm" })}>
            {sedang ? (
              <>
                <Spinner /> Menyimpan
              </>
            ) : akun ? (
              "Simpan perubahan"
            ) : (
              "Tambah akun"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
