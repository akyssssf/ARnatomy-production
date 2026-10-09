"use client";

import { alert } from "@/lib/variants";
/* Client leaf: menampilkan toast dari Zustand store lewat region aria-live */
import { useUIStore } from "@/store/useUIStore";

export function Toaster() {
  const toasts = useUIStore((s) => s.toasts);
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-4 pb-4"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`${alert({ tipe: t.tipe })} pointer-events-auto max-w-md rounded-full bg-neutral-900 px-5 text-white shadow-[0_10px_30px_rgba(0,0,0,0.18)]`}
        >
          {t.pesan}
        </div>
      ))}
    </div>
  );
}
