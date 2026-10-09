/* ==========================================================================
   utils.ts — `cn()` ala shadcn/ui: gabungkan class (clsx) lalu selesaikan
   konflik utility Tailwind (tailwind-merge), mis. "p-4" + "p-6" -> "p-6".
   ========================================================================== */
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
