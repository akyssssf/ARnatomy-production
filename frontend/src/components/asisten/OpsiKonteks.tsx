import type { BodyPart, Organ } from "@/lib/schemas";

/* Server Component: <optgroup> per organ berisi bagian tubuh, dioper ke
   <select> milik ChatAsisten (klien) sebagai children sehingga daftar
   statis ini dirender di server. */
export function OpsiKonteks({ organs, bagian }: { organs: Organ[]; bagian: BodyPart[] }) {
  return (
    <>
      <option value="">Tanpa konteks</option>
      {organs.map((o) => (
        <optgroup key={o.id_organ} label={o.nama_organ}>
          {bagian
            .filter((b) => b.id_organ === o.id_organ)
            .map((b) => (
              <option key={b.id_bagian} value={b.id_bagian}>
                {b.nama_bagian_internal}
              </option>
            ))}
        </optgroup>
      ))}
    </>
  );
}
