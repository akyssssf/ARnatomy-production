"use client";

/* Client leaf: pil navigasi kaca mengambang. Lebar (ikon + label) saat
   halaman di atas; menyusut jadi ikon saja begitu digulir (> 48 px).
   Dua varian: publik (landing, tombol gulir ke bagian) dan aplikasi
   (tautan rute + tombol keluar). */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Ikon, type NamaIkon } from "@/components/ui/Ikon";
import { keluar } from "@/lib/mock-api";
import type { SesiUser } from "@/lib/schemas";
import { useUIStore } from "@/store/useUIStore";

type Rute = "/beranda" | "/eksplorasi" | "/tugas" | "/asisten" | "/riwayat" | "/profil" | "/admin";
const MENU: { rute: Rute; label: string; ikon: NamaIkon; hanyaAdmin?: boolean }[] = [
  { rute: "/beranda", label: "Beranda", ikon: "rumah" },
  { rute: "/eksplorasi", label: "Eksplorasi", ikon: "jantung" },
  { rute: "/tugas", label: "Tugas", ikon: "tugas" },
  { rute: "/asisten", label: "Asisten", ikon: "chat" },
  { rute: "/riwayat", label: "Riwayat", ikon: "riwayat" },
  { rute: "/profil", label: "Profil", ikon: "profil" },
  { rute: "/admin", label: "Admin", ikon: "perisai", hanyaAdmin: true },
];
const MENU_PUBLIK: { gulir: string; label: string; ikon: NamaIkon }[] = [
  { gulir: "atas", label: "Beranda", ikon: "rumah" },
  { gulir: "sistem", label: "Sistem organ", ikon: "lapisan" },
  { gulir: "cara", label: "Cara belajar", ikon: "riwayat" },
];

const KELAS_BUTIR = "nav-butir flex h-10 items-center gap-2 rounded-full text-[13px] font-medium transition";
const KELAS_AKTIF = "bg-white text-neutral-900";
const KELAS_PASIF = "text-white/85 hover:bg-white/12 hover:text-white";

export function NavKaca({ user }: { user: SesiUser | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const tampilkanToast = useUIStore((s) => s.tampilkanToast);
  const [ringkas, setRingkas] = useState(false);
  /* Varian publik: bagian landing yang sedang terlihat (untuk penanda aktif) */
  const [bagianAktif, setBagianAktif] = useState("atas");
  const [sedangKeluar, setSedangKeluar] = useState(false);
  const terjadwal = useRef(false);
  /* Selama gulir halus hasil klik, penanda aktif dikunci ke tujuan klik */
  const terkunci = useRef(false);

  useEffect(() => {
    function saatGulir() {
      if (terjadwal.current) return;
      terjadwal.current = true;
      requestAnimationFrame(() => {
        setRingkas(window.scrollY > 48);
        /* Bagian aktif = bagian terakhir yang tepinya sudah lewat sepertiga layar */
        if (!terkunci.current) {
          let aktif = "atas";
          for (const m of MENU_PUBLIK) {
            const el = document.getElementById(`bagian-${m.gulir}`);
            if (el && el.getBoundingClientRect().top <= window.innerHeight / 3) aktif = m.gulir;
          }
          setBagianAktif(aktif);
        }
        terjadwal.current = false;
      });
    }
    window.addEventListener("scroll", saatGulir, { passive: true });
    saatGulir();
    return () => window.removeEventListener("scroll", saatGulir);
  }, []);

  async function saatKeluar() {
    setSedangKeluar(true);
    try {
      await keluar();
      tampilkanToast("Sesi diakhiri.", "info");
      router.push("/");
      router.refresh();
    } catch {
      tampilkanToast("Gagal mengakhiri sesi, coba lagi.", "error");
      setSedangKeluar(false);
    }
  }

  function gulirKe(tujuan: string) {
    setBagianAktif(tujuan);
    terkunci.current = true;
    setTimeout(() => {
      terkunci.current = false;
    }, 900);
    if (tujuan === "atas") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    document.getElementById(`bagian-${tujuan}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-40 flex justify-center px-4">
      <nav
        aria-label="Navigasi utama"
        className={`nav-kaca kaca-gelap pointer-events-auto flex items-center gap-1 rounded-full p-1.5 ${ringkas ? "nav-ringkas" : ""}`}
      >
        <Link
          href={user ? "/beranda" : "/"}
          aria-label="ARnatomy"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-biru"
        >
          <Ikon nama="jantung" kelas="h-5 w-5" />
        </Link>
        <ul className="flex items-center gap-0.5">
          {user
            ? MENU.filter((m) => !m.hanyaAdmin || user.role === "admin").map((m) => {
                const aktif = pathname.startsWith(m.rute);
                return (
                  <li key={m.rute}>
                    <Link
                      href={m.rute}
                      title={m.label}
                      aria-current={aktif ? "page" : undefined}
                      className={`${KELAS_BUTIR} ${aktif ? KELAS_AKTIF : KELAS_PASIF}`}
                    >
                      <Ikon nama={m.ikon} kelas="h-[18px] w-[18px] shrink-0" />
                      <span className="nav-label">{m.label}</span>
                    </Link>
                  </li>
                );
              })
            : MENU_PUBLIK.map((m) => (
                <li key={m.gulir}>
                  <button
                    type="button"
                    title={m.label}
                    onClick={() => gulirKe(m.gulir)}
                    aria-current={bagianAktif === m.gulir ? "true" : undefined}
                    className={`${KELAS_BUTIR} ${bagianAktif === m.gulir ? KELAS_AKTIF : KELAS_PASIF}`}
                  >
                    <Ikon nama={m.ikon} kelas="h-[18px] w-[18px] shrink-0" />
                    <span className="nav-label">{m.label}</span>
                  </button>
                </li>
              ))}
        </ul>
        <span className="mx-1 h-6 w-px bg-white/15" aria-hidden="true" />
        {user ? (
          <button
            type="button"
            onClick={saatKeluar}
            disabled={sedangKeluar}
            title="Keluar"
            aria-label="Keluar dari sesi"
            className="grid h-10 w-10 place-items-center rounded-full text-white/85 transition hover:bg-white/12 hover:text-white disabled:opacity-50"
          >
            <Ikon nama="keluar" kelas="h-[18px] w-[18px]" />
          </button>
        ) : (
          <Link
            href="/login"
            className="nav-butir flex h-10 items-center gap-2 rounded-full bg-biru text-[13px] font-semibold text-white transition hover:bg-biru-gelap"
          >
            <span className="nav-label">Masuk</span>
            <Ikon nama="panah" kelas="h-[18px] w-[18px] shrink-0" />
          </Link>
        )}
      </nav>
    </div>
  );
}
