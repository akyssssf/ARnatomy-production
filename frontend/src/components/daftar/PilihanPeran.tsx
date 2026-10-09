/* Server Component: pilihan peran registrasi (FR-02) sebagai radio tak terkendali.
   Tampilan "terpilih" diatur CSS (has-checked:) sehingga tidak perlu state klien;
   nilainya dibaca FormDaftar lewat FormData saat submit. */
const PERAN = [
  { nilai: "siswa", label: "Siswa", teks: "Belajar dan mencatat progres" },
  { nilai: "guru", label: "Guru", teks: "Memantau materi yang sama" },
] as const;

export function PilihanPeran() {
  return (
    <fieldset>
      <legend className="mikro mb-2">Peran</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {PERAN.map((p, i) => (
          <label
            key={p.nilai}
            className="group flex cursor-pointer items-start gap-3 rounded-xl bg-abu px-3.5 py-3 text-neutral-700 transition hover:bg-neutral-200 has-checked:bg-neutral-900 has-checked:text-white has-focus-visible:ring-2 has-focus-visible:ring-biru"
          >
            <input
              type="radio"
              name="role"
              id={`daftar-role-${p.nilai}`}
              value={p.nilai}
              defaultChecked={i === 0}
              className="mt-1 accent-biru"
            />
            <span>
              <span className="block text-sm font-semibold">{p.label}</span>
              <span className="block text-[11px] text-neutral-400 group-has-checked:text-white/75">{p.teks}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
