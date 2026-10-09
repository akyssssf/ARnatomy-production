/* ==========================================================================
   useLaporanKesalahan — server state laporan kesalahan konten (FR-09, FR-11).
   Daftar hanya diambil bila `aktif` (halaman admin); pengguna biasa cuma
   memakai mutasi kirim. staleTime 30 detik: laporan masuk sesekali.
   ========================================================================== */
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ambilLaporan, kirimLaporan, tindakLanjutiLaporan } from "@/lib/mock-api";
import type { LaporanForm, LaporanId } from "@/lib/schemas";
import { KUNCI } from "./kunci-query";

export function useLaporanKesalahan(opsi: { aktif?: boolean } = {}) {
  const queryClient = useQueryClient();

  const daftar = useQuery({
    queryKey: KUNCI.laporan,
    queryFn: ambilLaporan,
    enabled: opsi.aktif ?? false,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 10,
  });

  const kirim = useMutation({
    mutationFn: (input: LaporanForm & { simulasiGagal: boolean }) => kirimLaporan(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: KUNCI.laporan }),
  });

  const tindakLanjuti = useMutation({
    mutationFn: (idLaporan: LaporanId) => tindakLanjutiLaporan(idLaporan),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: KUNCI.laporan }),
  });

  return { daftar, kirim, tindakLanjuti };
}
