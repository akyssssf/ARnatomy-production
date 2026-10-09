/* ==========================================================================
   useUmpanBalik — mutasi kirim kuesioner SUS (FR-15). Daftar kiriman dibaca
   Server Component langsung dari basis data (halaman umpan balik & tab admin),
   jadi hook ini hanya menyimpan mutasi; onSuccess membersihkan cache
   ['umpan-balik'] bila suatu saat ada query klien yang memakainya.
   ========================================================================== */
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { kirimUmpanBalik } from "@/lib/mock-api";
import type { UmpanBalikForm } from "@/lib/schemas";
import { KUNCI } from "./kunci-query";

export function useUmpanBalik() {
  const queryClient = useQueryClient();

  const kirim = useMutation({
    mutationFn: (input: UmpanBalikForm) => kirimUmpanBalik(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: KUNCI.umpanBalik }),
  });

  return { kirim };
}
