/* ==========================================================================
   useAkun — server state akun pengguna untuk dashboard admin (FR-13).
   Daftar hanya diambil bila `aktif` (tab Pengguna terbuka). Mutasi
   tambah, ubah (termasuk nonaktifkan/aktifkan), dan hapus menginvalidasi cache ['akun'].
   ========================================================================== */
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ambilAkun, hapusAkun, tambahAkun, ubahAkun } from "@/lib/mock-api";
import type { AkunBuat, AkunPatch, UserId } from "@/lib/schemas";
import { KUNCI } from "./kunci-query";

export function useAkun(opsi: { aktif?: boolean } = {}) {
  const queryClient = useQueryClient();
  const segarkan = () => void queryClient.invalidateQueries({ queryKey: KUNCI.akun });

  const daftar = useQuery({
    queryKey: KUNCI.akun,
    queryFn: ambilAkun,
    enabled: opsi.aktif ?? false,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 10,
  });

  const tambah = useMutation({
    mutationFn: (input: AkunBuat) => tambahAkun(input),
    onSuccess: segarkan,
  });

  const ubah = useMutation({
    mutationFn: ({ idUser, input }: { idUser: UserId; input: AkunPatch }) => ubahAkun(idUser, input),
    onSuccess: segarkan,
  });

  const hapus = useMutation({
    mutationFn: (idUser: UserId) => hapusAkun(idUser),
    onSuccess: segarkan,
  });

  return { daftar, tambah, ubah, hapus };
}
