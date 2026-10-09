import Link from "next/link";
import { Ikon, type NamaIkon } from "@/components/ui/Ikon";
import type { Peran } from "@/lib/schemas";

type Rute = "/asisten" | "/riwayat" | "/umpan-balik" | "/admin";
const DAFTAR: { rute: Rute; ikon: NamaIkon; judul: string; teks: string; hanyaAdmin?: boolean }[] = [
  { rute: "/asisten", ikon: "chat", judul: "Asisten AI", teks: "Tanya fungsi, letak, atau gangguan" },
  { rute: "/riwayat", ikon: "riwayat", judul: "Riwayat belajar", teks: "Rekam bagian yang sudah dibuka" },
  { rute: "/umpan-balik", ikon: "kirim", judul: "Umpan balik", teks: "Kuesioner SUS setelah mencoba" },
  {
    rute: "/admin",
    ikon: "perisai",
    judul: "Dashboard Admin",
    teks: "Konten, laporan, akun, aset 3D, SUS",
    hanyaAdmin: true,
  },
];

/* Server Component: pintasan ke halaman lain sesuai peran */
export function Pintasan({ peran }: { peran: Peran }) {
  return (
    <section aria-labelledby="judul-pintasan">
      <h2 id="judul-pintasan" className="titik-biru text-2xl font-semibold">
        Pintasan
      </h2>
      <div className="mt-3 grid gap-3">
        {DAFTAR.filter((p) => !p.hanyaAdmin || peran === "admin").map((p) => (
          <Link key={p.rute} href={p.rute} className="kartu-angkat flex items-center gap-3 rounded-2xl bg-white p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-abu text-neutral-800">
              <Ikon nama={p.ikon} kelas="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{p.judul}</span>
              <span className="block truncate text-[11px] text-neutral-400">{p.teks}</span>
            </span>
            <Ikon nama="panah" kelas="h-4 w-4 text-neutral-400" />
          </Link>
        ))}
      </div>
    </section>
  );
}
