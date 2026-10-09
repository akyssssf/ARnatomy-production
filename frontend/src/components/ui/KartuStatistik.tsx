import { kartu } from "@/lib/variants";

/* Server Component: deretan kartu angka ringkas (dl/dt/dd) */
export function KartuStatistik({ daftar }: { daftar: { label: string; nilai: string; kelas?: string }[] }) {
  return (
    <dl className="mb-4 grid gap-4 sm:grid-cols-3">
      {daftar.map((s) => (
        <div key={s.label} className={kartu({ nada: "aksen", padding: "md" })}>
          <dt className="mikro">{s.label}</dt>
          <dd className={`mt-3 text-4xl font-semibold tracking-tight ${s.kelas ?? ""}`}>{s.nilai}</dd>
        </div>
      ))}
    </dl>
  );
}
