"use client";

/* Client leaf: formulir login (FR-01, TC-01, TC-02).
   Validasi Zod (LoginFormSchema) di klien sebelum POST /api/login; galat
   per-field lewat aria-invalid + aria-describedby, galat umum lewat role="alert".
   Berhasil -> router.push ke /beranda atau /admin (cookie sudah di-set server). */
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Ikon } from "@/components/ui/Ikon";
import { Spinner } from "@/components/ui/Spinner";
import { GalatApi, masuk } from "@/lib/mock-api";
import { LoginFormSchema } from "@/lib/schemas";
import { alert, input, tombol } from "@/lib/variants";
import { TombolGoogle } from "./TombolGoogle";

const AKUN_DEMO = [
  { email: "siswa@arnatomy.id", password: "siswa123", peran: "Siswa" },
  { email: "guru@arnatomy.id", password: "guru123", peran: "Guru" },
  { email: "admin@arnatomy.id", password: "admin123", peran: "Administrator" },
];

type GalatField = { email?: string; password?: string };

export function FormLogin({
  pesanAwal,
  tujuanAwal,
  googleClientId = null,
}: {
  pesanAwal: string | null;
  tujuanAwal: string | null;
  googleClientId?: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lihatSandi, setLihatSandi] = useState(false);
  const [galat, setGalat] = useState<GalatField>({});
  const [galatUmum, setGalatUmum] = useState<string | null>(pesanAwal);
  const [sedangMasuk, setSedangMasuk] = useState(false);
  /* Mode Google: formulir email hanya untuk administrator, dibuka lewat tautan */
  const [emailTerbuka, setEmailTerbuka] = useState(false);
  const tampilEmail = !googleClientId || emailTerbuka;

  function isiAkun(akun: (typeof AKUN_DEMO)[number]) {
    setEmail(akun.email);
    setPassword(akun.password);
    setGalat({});
    setGalatUmum(null);
    document.getElementById("input-password")?.focus();
  }

  async function saatSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGalatUmum(null);

    /* Validasi input kosong & format email dengan skema Zod */
    const hasil = LoginFormSchema.safeParse({ email, password });
    if (!hasil.success) {
      const baru: GalatField = {};
      for (const isu of hasil.error.issues) {
        const field = isu.path[0];
        if ((field === "email" || field === "password") && !baru[field]) baru[field] = isu.message;
      }
      setGalat(baru);
      setGalatUmum("Periksa kembali isian yang ditandai.");
      document.getElementById(baru.email ? "input-email" : "input-password")?.focus();
      return;
    }
    setGalat({});

    setSedangMasuk(true);
    try {
      const user = await masuk(hasil.data);
      const bawaan: Route = user.role === "admin" ? "/admin" : "/beranda";
      /* Kembali ke rute yang tadi diminta (?next=) bila peran mengizinkan */
      const bolehKeTujuan = tujuanAwal?.startsWith("/") && !(tujuanAwal.startsWith("/admin") && user.role !== "admin");
      /* refresh() supaya layout server membaca cookie sesi yang baru */
      router.push(bolehKeTujuan && tujuanAwal ? (tujuanAwal as Route) : bawaan);
      router.refresh();
    } catch (kesalahan) {
      setGalatUmum(kesalahan instanceof GalatApi ? kesalahan.message : "Tidak dapat menghubungi server.");
      setPassword("");
      setSedangMasuk(false);
      document.getElementById("input-password")?.focus();
    }
  }

  return (
    <div className="space-y-4">
      {!googleClientId && (
        <ul className="nav-miring flex items-center" aria-label="Isi cepat akun uji coba">
          {AKUN_DEMO.map((a) => (
            <li key={a.email}>
              <button
                type="button"
                onClick={() => isiAkun(a)}
                className="text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-500 transition hover:text-biru"
              >
                {a.peran}
              </button>
            </li>
          ))}
        </ul>
      )}

      {galatUmum && (
        <div role="alert" aria-live="assertive" className={alert({ tipe: "error" })}>
          {galatUmum}
        </div>
      )}

      {googleClientId && (
        <>
          <TombolGoogle clientId={googleClientId} tujuanAwal={tujuanAwal} onGalat={setGalatUmum} />
          {!emailTerbuka && (
            <p className="text-center text-xs text-neutral-500">
              Akun siswa dan guru masuk lewat Google.{" "}
              <button
                type="button"
                onClick={() => setEmailTerbuka(true)}
                className="font-semibold text-neutral-900 underline underline-offset-2"
              >
                Administrator? Masuk dengan email
              </button>
            </p>
          )}
        </>
      )}

      {tampilEmail && (
        <form onSubmit={saatSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="input-email" className="mikro mb-2 block">
              Email
            </label>
            <input
              id="input-email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="nama@sekolah.sch.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(galat.email)}
              aria-describedby="galat-email"
              className={input({ keadaan: galat.email ? "salah" : "normal" })}
            />
            <p id="galat-email" className="mt-1 text-xs text-rose-600" hidden={!galat.email}>
              {galat.email}
            </p>
          </div>
          <div>
            <label htmlFor="input-password" className="mikro mb-2 block">
              Kata sandi
            </label>
            <div className="relative">
              <input
                id="input-password"
                name="password"
                type={lihatSandi ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Kata sandi"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={Boolean(galat.password)}
                aria-describedby="galat-password"
                className={`${input({ keadaan: galat.password ? "salah" : "normal" })} pr-11`}
              />
              <button
                type="button"
                onClick={() => setLihatSandi((v) => !v)}
                aria-pressed={lihatSandi}
                aria-label={lihatSandi ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-neutral-400 transition hover:bg-white hover:text-neutral-900"
              >
                <Ikon nama={lihatSandi ? "silang" : "mata"} />
              </button>
            </div>
            <p id="galat-password" className="mt-1 text-xs text-rose-600" hidden={!galat.password}>
              {galat.password}
            </p>
          </div>
          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-[11px] text-neutral-400">Prototipe: kata sandi tidak dienkripsi.</p>
            <button type="submit" disabled={sedangMasuk} className={tombol({ ukuran: "md" })}>
              {sedangMasuk ? (
                <>
                  <Spinner /> Memeriksa
                </>
              ) : (
                <>
                  Masuk
                  <Ikon nama="panah" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
