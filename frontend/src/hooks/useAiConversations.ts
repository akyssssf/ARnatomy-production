/* ==========================================================================
   useAiConversations — server state percakapan Asisten AI (FR-08).
   staleTime 0: percakapan berubah setiap kali pengguna bertanya, jadi
   selalu dianggap basi dan di-refetch saat dipasang ulang / fokus jendela.
   ========================================================================== */
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ambilPercakapan, kirimPertanyaan } from "@/lib/mock-api";
import type { PertanyaanForm } from "@/lib/schemas";
import { KUNCI } from "./kunci-query";

export function useAiConversations() {
  const queryClient = useQueryClient();

  const daftar = useQuery({
    queryKey: KUNCI.percakapan,
    queryFn: ambilPercakapan,
    staleTime: 0,
    gcTime: 1000 * 60 * 5,
  });

  const kirim = useMutation({
    mutationFn: (input: PertanyaanForm & { simulasiGagal: boolean }) => kirimPertanyaan(input),
    onSuccess: () => {
      /* Invalidasi: daftar percakapan diambil ulang tanpa reload halaman */
      void queryClient.invalidateQueries({ queryKey: KUNCI.percakapan });
    },
  });

  return { daftar, kirim };
}
