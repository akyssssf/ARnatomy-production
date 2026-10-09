/* ==========================================================================
   variants.ts — Pola CVA memakai pustaka class-variance-authority.
   Setiap komponen dengan variasi tampilan didefinisikan sekali sebagai peta
   `variant -> class Tailwind`, bukan rangkaian if-else class di komponen.
   Tipe props tiap varian diturunkan lewat VariantProps.
   ========================================================================== */
import { cva, type VariantProps } from "class-variance-authority";

export const tombol = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        utama: "bg-biru text-white hover:bg-biru-gelap",
        sekunder: "bg-neutral-900 text-white hover:bg-neutral-700",
        garis: "bg-white text-neutral-900 hover:bg-neutral-100",
        halus: "text-neutral-600 hover:bg-black/5 hover:text-neutral-900",
        bahaya: "bg-amber-500 text-white hover:bg-amber-600",
      },
      ukuran: {
        sm: "px-3.5 py-1.5 text-xs",
        md: "px-5 py-2.5 text-sm",
        lg: "px-6 py-3 text-sm",
      },
      lebar: { auto: "", penuh: "w-full" },
    },
    defaultVariants: { variant: "utama", ukuran: "md", lebar: "auto" },
  },
);
export type PropsTombol = VariantProps<typeof tombol>;

export const badge = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.08em]",
  {
    variants: {
      status: {
        draft: "bg-amber-100 text-amber-800",
        tervalidasi: "bg-emerald-100 text-emerald-800",
        baru: "bg-biru text-white",
        ditindaklanjuti: "bg-neutral-900 text-white",
        dasar: "bg-black/5 text-neutral-600",
        dimmed: "bg-neutral-900 text-white",
        netral: "bg-black/5 text-neutral-500",
      },
    },
    defaultVariants: { status: "netral" },
  },
);
export type PropsBadge = VariantProps<typeof badge>;

export const kartu = cva("rounded-2xl", {
  variants: {
    nada: { netral: "bg-white", brand: "bg-biru text-white", aksen: "bg-abu" },
    interaktif: { true: "transition hover:bg-[#fafafa]", false: "" },
    padding: { sm: "p-4", md: "p-5", lg: "p-6" },
  },
  defaultVariants: { nada: "netral", interaktif: false, padding: "md" },
});

export const bubble = cva("max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed", {
  variants: {
    peran: {
      user: "ml-auto rounded-br-md bg-biru text-white",
      ai: "mr-auto rounded-bl-md bg-abu text-neutral-800",
      sistem: "mx-auto bg-black/5 text-xs text-neutral-600",
    },
  },
  defaultVariants: { peran: "ai" },
});

export const toggleLayer = cva("whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition sm:px-3.5", {
  variants: {
    aktif: { true: "bg-neutral-900 text-white", false: "bg-white text-neutral-500 hover:text-neutral-900" },
  },
  defaultVariants: { aktif: false },
});

export const alert = cva("flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-sm", {
  variants: {
    tipe: {
      error: "bg-rose-50 text-rose-700",
      sukses: "bg-emerald-50 text-emerald-700",
      info: "bg-black/5 text-neutral-700",
    },
  },
  defaultVariants: { tipe: "info" },
});
export type TipeAlert = NonNullable<VariantProps<typeof alert>["tipe"]>;

export const input = cva(
  "w-full rounded-xl px-3.5 py-2.5 text-sm text-neutral-900 transition placeholder:text-neutral-400 focus:outline-none focus:ring-2",
  {
    variants: {
      keadaan: {
        normal: "bg-abu focus:bg-white focus:ring-biru",
        salah: "bg-rose-50 ring-1 ring-rose-400 focus:ring-rose-500",
      },
    },
    defaultVariants: { keadaan: "normal" },
  },
);

export const tab = cva("rounded-full px-4 py-2 text-sm font-medium transition", {
  variants: {
    terpilih: { true: "bg-neutral-900 text-white", false: "text-neutral-500 hover:text-neutral-900" },
  },
  defaultVariants: { terpilih: false },
});
