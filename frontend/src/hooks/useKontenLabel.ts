/* ==========================================================================
   useKontenLabel — server state konten label dasar/dimmed (FR-10).
   Konten jarang berubah (hanya lewat editor admin) sehingga staleTime
   panjang (5 menit) dan gcTime 15 menit; mutasi edit menginvalidasi cache.
   ========================================================================== */
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ambilKonten, perbaruiKonten } from "@/lib/mock-api";
import type { KontenForm, KontenId } from "@/lib/schemas";
import { KUNCI } from "./kunci-query";

export function useKontenLabel() {
  const queryClient = useQueryClient();

  const daftar = useQuery({
    queryKey: KUNCI.konten,
    queryFn: ambilKonten,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });

  const perbarui = useMutation({
    mutationFn: ({ idKonten, input }: { idKonten: KontenId; input: KontenForm }) => perbaruiKonten(idKonten, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: KUNCI.konten }),
  });

  return { daftar, perbarui };
}
