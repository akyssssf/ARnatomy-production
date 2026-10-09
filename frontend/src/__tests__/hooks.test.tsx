// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAiConversations } from "@/hooks/useAiConversations";
import { useKontenLabel } from "@/hooks/useKontenLabel";
import { useLaporanKesalahan } from "@/hooks/useLaporanKesalahan";
import { useRiwayatBelajar } from "@/hooks/useRiwayatBelajar";
import { KontenIdSchema, LaporanIdSchema } from "@/lib/schemas";

/* vi.mock di-hoist, jadi mock dibuat lewat vi.hoisted agar tersedia lebih dulu */
const api = vi.hoisted(() => ({
  ambilPercakapan: vi.fn(),
  kirimPertanyaan: vi.fn(),
  ambilLaporan: vi.fn(),
  kirimLaporan: vi.fn(),
  tindakLanjutiLaporan: vi.fn(),
  ambilKonten: vi.fn(),
  perbaruiKonten: vi.fn(),
  ambilRiwayat: vi.fn(),
  catatRiwayat: vi.fn(),
  tutupRiwayat: vi.fn(),
}));
vi.mock("@/lib/mock-api", () => api);

function pembungkus() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { Wrapper, client };
}

const percakapan = {
  id_percakapan: 1,
  id_user: 1,
  id_bagian: null,
  pertanyaan: "a",
  jawaban: "b",
  waktu: "2026-09-19T01:00:00.000Z",
};

describe("hooks TanStack Query", () => {
  beforeEach(() => {
    for (const fn of Object.values(api)) fn.mockReset();
  });

  it("useAiConversations: query terisi, mutasi kirim menginvalidasi cache (refetch)", async () => {
    api.ambilPercakapan.mockResolvedValueOnce([]).mockResolvedValueOnce([percakapan]);
    api.kirimPertanyaan.mockResolvedValue(percakapan);
    const { Wrapper } = pembungkus();
    const { result } = renderHook(() => useAiConversations(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.daftar.isSuccess).toBe(true));
    expect(result.current.daftar.data).toEqual([]);
    await result.current.kirim.mutateAsync({ pertanyaan: "a", id_bagian: null, simulasiGagal: false });
    await waitFor(() => expect(result.current.daftar.data).toEqual([percakapan]));
    expect(api.ambilPercakapan).toHaveBeenCalledTimes(2);
  });

  it("useLaporanKesalahan: daftar hanya aktif untuk admin; tindak lanjut memicu refetch", async () => {
    const laporan = {
      id_laporan: 1,
      id_user: 1,
      id_konten: 8,
      deskripsi_laporan: "x".repeat(12),
      status_tindak_lanjut: "baru",
      waktu: "2026-09-19T01:00:00.000Z",
    };
    api.ambilLaporan
      .mockResolvedValueOnce([laporan])
      .mockResolvedValueOnce([{ ...laporan, status_tindak_lanjut: "ditindaklanjuti" }]);
    api.tindakLanjutiLaporan.mockResolvedValue({ ...laporan, status_tindak_lanjut: "ditindaklanjuti" });
    const { Wrapper } = pembungkus();
    const pasif = renderHook(() => useLaporanKesalahan(), { wrapper: Wrapper });
    expect(pasif.result.current.daftar.fetchStatus).toBe("idle");

    const { result } = renderHook(() => useLaporanKesalahan({ aktif: true }), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.daftar.data?.[0]?.status_tindak_lanjut).toBe("baru"));
    await result.current.tindakLanjuti.mutateAsync(LaporanIdSchema.parse(1));
    await waitFor(() => expect(result.current.daftar.data?.[0]?.status_tindak_lanjut).toBe("ditindaklanjuti"));
  });

  it("useKontenLabel: perbarui memanggil API dengan id bermerek lalu invalidasi", async () => {
    const konten = {
      id_konten: 8,
      id_bagian: 5,
      jenis_konten: "dasar",
      judul_tampil: "Aorta",
      deskripsi: "x".repeat(25),
      status_tampilan: "aktif",
      status_validasi: "draft",
    };
    api.ambilKonten.mockResolvedValue([konten]);
    api.perbaruiKonten.mockResolvedValue({ ...konten, status_validasi: "tervalidasi" });
    const { Wrapper } = pembungkus();
    const { result } = renderHook(() => useKontenLabel(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.daftar.isSuccess).toBe(true));
    await result.current.perbarui.mutateAsync({
      idKonten: KontenIdSchema.parse(8),
      input: { judul_tampil: "Aorta", deskripsi: "x".repeat(25), status_validasi: "tervalidasi" },
    });
    expect(api.perbaruiKonten).toHaveBeenCalledWith(8, expect.objectContaining({ status_validasi: "tervalidasi" }));
    await waitFor(() => expect(api.ambilKonten).toHaveBeenCalledTimes(2));
  });

  it("useRiwayatBelajar: catat lalu tutup", async () => {
    const entri = {
      id_riwayat: 1001,
      id_user: 1,
      id_bagian: 4,
      jenis_konten: "dasar",
      waktu_akses: "2026-09-19T01:00:00.000Z",
      durasi: null,
    };
    api.ambilRiwayat.mockResolvedValue([]);
    api.catatRiwayat.mockResolvedValue(entri);
    api.tutupRiwayat.mockResolvedValue({ ...entri, durasi: 9 });
    const { Wrapper } = pembungkus();
    const { result } = renderHook(() => useRiwayatBelajar({ aktif: true }), { wrapper: Wrapper });
    const dibuat = await result.current.catat.mutateAsync({
      id_bagian: entri.id_bagian as never,
      jenis_konten: "dasar",
    });
    const ditutup = await result.current.tutup.mutateAsync(dibuat.id_riwayat);
    expect(ditutup.durasi).toBe(9);
    await waitFor(() => expect(api.ambilRiwayat.mock.calls.length).toBeGreaterThanOrEqual(2));
  });
});
