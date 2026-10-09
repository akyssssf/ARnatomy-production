/* Server Component: sepuluh pernyataan SUS (FR-15) sebagai fieldset radio tak
   terkendali. Tampilan pilihan terpilih dan penanda "belum dijawab" murni CSS:
   - label memakai has-checked: untuk gaya terpilih;
   - fieldset memakai group-data-diperiksa:not-has-checked: sehingga baru
     ditandai merah setelah FormSus (klien) memberi data-diperiksa pada <form>. */
import { PERNYATAAN_SUS, SKALA_LIKERT } from "@/lib/sus";
import { kartu } from "@/lib/variants";

export function DaftarPernyataanSus({ jawabanAwal }: { jawabanAwal?: number[] }) {
  return (
    <ol className="space-y-3">
      {PERNYATAAN_SUS.map((pernyataan, i) => (
        <li key={pernyataan}>
          <fieldset
            className={`${kartu({ padding: "md" })} group-data-diperiksa:not-has-checked:ring-1 group-data-diperiksa:not-has-checked:ring-rose-400`}
          >
            <legend className="sr-only">
              Pernyataan {i + 1}: {pernyataan}
            </legend>
            <p aria-hidden="true" className="grid grid-cols-[1.5rem_1fr] gap-2 text-sm font-medium">
              <span className="text-neutral-400">{i + 1}.</span>
              <span>{pernyataan}</span>
            </p>
            <div className="mt-3 grid grid-cols-5 gap-1.5 sm:gap-2">
              {SKALA_LIKERT.map((s) => (
                <label
                  key={s.nilai}
                  className="flex cursor-pointer flex-col items-center gap-1 rounded-xl bg-abu px-1 py-2 text-center text-neutral-600 transition hover:bg-neutral-200 has-checked:bg-neutral-900 has-checked:text-white has-focus-visible:ring-2 has-focus-visible:ring-biru"
                >
                  <input
                    type="radio"
                    id={`sus-${i}-${s.nilai}`}
                    name={`sus-${i}`}
                    value={s.nilai}
                    defaultChecked={jawabanAwal?.[i] === s.nilai}
                    className="sr-only"
                  />
                  <span className="text-base font-semibold">{s.nilai}</span>
                  <span className="hidden text-[10px] leading-tight text-neutral-400 sm:block [label:has(:checked)_&]:text-white/75">
                    {s.label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </li>
      ))}
    </ol>
  );
}
