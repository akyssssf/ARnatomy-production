import Image from "next/image";
import Link from "next/link";
import type { OrganRingkas } from "@/lib/schemas";

/* Server Component: pemilih organ (tautan ?organ=<id>) di kepala halaman */
export function PemilihOrgan({ organs, aktifId }: { organs: OrganRingkas[]; aktifId: number }) {
  return (
    <nav aria-label="Pilih organ" className="flex items-center gap-1 rounded-full bg-white p-1">
      {organs.map((o) => {
        const aktif = o.id_organ === aktifId;
        return (
          <Link
            key={o.id_organ}
            href={{ pathname: "/eksplorasi", query: { organ: o.id_organ } }}
            aria-current={aktif ? "true" : undefined}
            className={`flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-sm font-medium transition ${aktif ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-black/5"}`}
          >
            <Image
              src={o.gambar}
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 rounded-full bg-white object-contain p-0.5"
            />
            {o.nama_organ}
          </Link>
        );
      })}
    </nav>
  );
}
