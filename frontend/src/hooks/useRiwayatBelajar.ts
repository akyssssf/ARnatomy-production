/* ==========================================================================
   useRiwayatBelajar — mutasi pencatatan riwayat belajar (FR-14).
   Riwayat tercatat otomatis dari halaman Eksplorasi (label dibuka) dan
   ditutup dengan durasi saat panel ditutup. Daftarnya dibaca halaman
   Riwayat & Beranda sebagai Server Component, jadi di klien cukup mutasi
   plus invalidasi kunci ['riwayat'] untuk pemakai query lain.
   ========================================================================== */
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ambilRiwayat, catatRiwayat, tutupRiwayat } from "@/lib/mock-api";
import type { CatatRiwayatInput, RiwayatId } from "@/lib/schemas";
import { KUNCI } from "./kunci-query";

export function useRiwayatBelajar(opsi: { aktif?: boolean } = {}) {
  const queryClient = useQueryClient();

  const daftar = useQuery({
    queryKey: KUNCI.riwayat,
    queryFn: ambilRiwayat,
    enabled: opsi.aktif ?? false,
    staleTime: 1000 * 10,
    gcTime: 1000 * 60 * 5,
  });

  const catat = useMutation({
    mutationFn: (input: CatatRiwayatInput) => catatRiwayat(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: KUNCI.riwayat }),
  });

  const tutup = useMutation({
    mutationFn: (idRiwayat: RiwayatId) => tutupRiwayat(idRiwayat),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: KUNCI.riwayat }),
  });

  return { daftar, catat, tutup };
}
