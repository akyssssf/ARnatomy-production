/* ==========================================================================
   useUIStore.ts — Zustand store untuk CLIENT UI STATE murni.
   Tidak ada data hasil fetch API di sini; data server dikelola TanStack
   Query. Komponen berlangganan lewat selector presisi, mis.
   useUIStore((s) => s.layerAktif), bukan seluruh store.
   ========================================================================== */
import { create } from "zustand";
import type { NamaLayer } from "@/lib/schemas";
import type { TipeAlert } from "@/lib/variants";

export type TabAdmin = "konten" | "laporan" | "akun" | "aset" | "umpan-balik" | "tugas";
export interface Toast {
  id: number;
  pesan: string;
  tipe: TipeAlert;
}

interface UIState {
  /* --- Halaman eksplorasi (FR-04, FR-05, FR-06) --- */
  layerAktif: Record<NamaLayer, boolean>;
  toggleLayer: (nama: NamaLayer) => void;
  panelEksplorasiTerbuka: boolean;
  bukaPanel: () => void;
  tutupPanel: () => void;
  bagianAktifId: number | null;
  setBagianAktif: (id: number | null) => void;
  putarOtomatis: boolean;
  setPutarOtomatis: (nyala: boolean) => void;

  /* --- Dashboard admin --- */
  tabAdminAktif: TabAdmin;
  setTabAdmin: (tab: TabAdmin) => void;

  /* --- Bendera demo jalur error (checkbox di halaman Asisten AI) --- */
  simulasiGagal: boolean;
  setSimulasiGagal: (nyala: boolean) => void;

  /* --- Toast global (aria-live) --- */
  toasts: Toast[];
  tampilkanToast: (pesan: string, tipe?: TipeAlert) => void;
  hapusToast: (id: number) => void;
}

let urutanToast = 0;

export const useUIStore = create<UIState>()((set) => ({
  /* Organ dalam selalu tampil; hanya selubung luar yang bisa dimatikan */
  layerAktif: { kulit: false, otot: false, tulang: false, organ_dalam: true },
  toggleLayer: (nama) =>
    set((s) => (nama === "organ_dalam" ? s : { layerAktif: { ...s.layerAktif, [nama]: !s.layerAktif[nama] } })),
  panelEksplorasiTerbuka: false,
  bukaPanel: () => set({ panelEksplorasiTerbuka: true }),
  tutupPanel: () => set({ panelEksplorasiTerbuka: false, bagianAktifId: null }),
  bagianAktifId: null,
  setBagianAktif: (id) => set({ bagianAktifId: id }),
  putarOtomatis: false,
  setPutarOtomatis: (nyala) => set({ putarOtomatis: nyala }),

  tabAdminAktif: "konten",
  setTabAdmin: (tab) => set({ tabAdminAktif: tab }),

  simulasiGagal: false,
  setSimulasiGagal: (nyala) => set({ simulasiGagal: nyala }),

  toasts: [],
  tampilkanToast: (pesan, tipe = "sukses") => {
    urutanToast += 1;
    const id = urutanToast;
    set((s) => ({ toasts: [...s.toasts, { id, pesan, tipe }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3800);
  },
  hapusToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
