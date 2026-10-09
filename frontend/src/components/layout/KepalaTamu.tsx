import Link from "next/link";

/* Server Component: baris kepala halaman tamu (login, daftar): merek + satu tautan silang */
export function KepalaTamu({ tautan }: { tautan?: { href: "/login" | "/daftar"; label: string } }) {
  return (
    <div className="flex items-center justify-between py-5">
      <Link href="/" className="tampilan titik-biru text-lg font-semibold">
        ARnatomy
      </Link>
      {tautan ? (
        <Link href={tautan.href} className="mikro transition hover:text-neutral-900">
          {tautan.label}
        </Link>
      ) : (
        <p className="mikro">SKPL v1.0</p>
      )}
    </div>
  );
}
