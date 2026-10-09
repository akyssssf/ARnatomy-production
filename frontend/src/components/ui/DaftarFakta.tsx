import type { Fakta } from "@/lib/schemas";

/* Server-safe: daftar fakta kunci (juga dipakai di dalam panel klien) */
export function DaftarFakta({ fakta }: { fakta: Fakta[] }) {
  if (!fakta.length) return null;
  return (
    <section className="mt-5">
      <h3 className="mikro">Fakta kunci</h3>
      <dl className="mt-2 space-y-1">
        {fakta.map((f) => (
          <div
            key={f.label}
            className="grid grid-cols-[6.5rem_1fr] items-baseline gap-3 rounded-lg px-2 py-1.5 odd:bg-abu"
          >
            <dt className="text-[11px] text-neutral-400">{f.label}</dt>
            <dd className="text-xs font-semibold text-neutral-700">{f.nilai}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
