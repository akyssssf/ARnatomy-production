/* Server Component: bilah progres aksesibel */
export function ProgressBar({ persen, label, kelas = "flex-1" }: { persen: number; label: string; kelas?: string }) {
  return (
    <div
      className={`h-1.5 overflow-hidden rounded-full bg-black/8 ${kelas}`}
      role="progressbar"
      aria-valuenow={persen}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className="h-full rounded-full bg-biru" style={{ width: `${persen}%` }} />
    </div>
  );
}
