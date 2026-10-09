import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUIStore } from "@/store/useUIStore";

describe("useUIStore (client UI state)", () => {
  beforeEach(() => {
    useUIStore.setState({
      layerAktif: { kulit: false, otot: false, tulang: false, organ_dalam: true },
      panelEksplorasiTerbuka: false,
      bagianAktifId: null,
      putarOtomatis: false,
      tabAdminAktif: "konten",
      simulasiGagal: false,
      toasts: [],
    });
    vi.useRealTimers();
  });

  it("toggleLayer membalik selubung tetapi organ dalam tidak bisa dimatikan", () => {
    const s = useUIStore.getState();
    s.toggleLayer("kulit");
    s.toggleLayer("organ_dalam");
    expect(useUIStore.getState().layerAktif).toEqual({ kulit: true, otot: false, tulang: false, organ_dalam: true });
  });

  it("buka/tutup panel mereset bagian aktif", () => {
    const s = useUIStore.getState();
    s.setBagianAktif(4);
    s.bukaPanel();
    expect(useUIStore.getState()).toMatchObject({ panelEksplorasiTerbuka: true, bagianAktifId: 4 });
    s.tutupPanel();
    expect(useUIStore.getState()).toMatchObject({ panelEksplorasiTerbuka: false, bagianAktifId: null });
  });

  it("tab admin, putar otomatis, dan bendera simulasi", () => {
    const s = useUIStore.getState();
    s.setTabAdmin("laporan");
    s.setPutarOtomatis(true);
    s.setSimulasiGagal(true);
    expect(useUIStore.getState()).toMatchObject({ tabAdminAktif: "laporan", putarOtomatis: true, simulasiGagal: true });
  });

  it("toast muncul lalu hilang otomatis setelah 3,8 detik", () => {
    vi.useFakeTimers();
    const s = useUIStore.getState();
    s.tampilkanToast("Tersimpan.");
    s.tampilkanToast("Gagal.", "error");
    expect(useUIStore.getState().toasts.map((t) => t.tipe)).toEqual(["sukses", "error"]);
    const id = useUIStore.getState().toasts[0]?.id;
    if (id) s.hapusToast(id);
    expect(useUIStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(3800);
    expect(useUIStore.getState().toasts).toHaveLength(0);
  });
});
