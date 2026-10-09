import Link from "next/link";
import { Ikon } from "@/components/ui/Ikon";
import { bagianById, organById } from "@/lib/data";
import { jeda } from "@/lib/db";
import { formatWaktu } from "@/lib/format";
import type { UserId } from "@/lib/schemas";
import { riwayatUser } from "@/lib/sumber";

/* Async Server Component: lima aktivitas terakhir, di-stream lewat <Suspense>
   dari beranda/page.tsx (jeda kecil meniru latensi kueri). */
export async function AktivitasTerakhir({ idUser }: { idUser: UserId }) {
  await jeda(350);
  const aktivitas = (await riwayatUser(idUser)).slice(-5).reverse();

  return (
    <section aria-labelledby="judul-aktivitas" className="rounded-3xl bg-white p-6">
      <h2 id="judul-aktivitas" className="titik-biru text-2xl font-semibold">
        Aktivitas terakhir
      </h2>
      {aktivitas.length ? (
        <ul className="mt-3 divide-y divide-black/5">
          {aktivitas.map((r) => {
            const bagian = bagianById(r.id_bagian);
            const organ = organById(bagian?.id_organ);
            return (
              <li key={r.id_riwayat} className="flex items-center gap-3 py-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-abu text-neutral-700">
                  <Ikon nama={r.jenis_konten === "dimmed" ? "lapisan" : "jantung"} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{bagian?.nama_bagian_internal ?? "-"}</span>
                  <span className="block text-[11px] text-neutral-400">
                    {organ?.nama_organ} &middot; label {r.jenis_konten}
                  </span>
                </span>
                <span className="text-[11px] text-neutral-400">{formatWaktu(r.waktu_akses)}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-neutral-500">
          Belum ada aktivitas. Buka salah satu bagian organ untuk mulai mencatat.
        </p>
      )}
      <Link href="/riwayat" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-biru">
        Lihat semua riwayat
        <Ikon nama="panah" />
      </Link>
    </section>
  );
}

/* Skeleton fallback untuk <Suspense> */
export function AktivitasTerakhirSkeleton() {
  return (
    <section aria-busy="true" aria-label="Memuat aktivitas terakhir" className="rounded-3xl bg-white p-6">
      <div className="tulang h-7 w-48 rounded-lg bg-abu" />
      <div className="mt-4 space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="tulang h-10 rounded-xl bg-abu" />
        ))}
      </div>
    </section>
  );
}
