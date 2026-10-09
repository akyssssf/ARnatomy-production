/* Server Component: indikator memuat kecil, warna mengikuti teks induk */
export function Spinner({ kelas = "h-4 w-4" }: { kelas?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block ${kelas} animate-spin rounded-full border-2 border-current border-t-transparent opacity-70`}
    />
  );
}
