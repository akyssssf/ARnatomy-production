/* ==========================================================================
   useAsetModel — mutasi aset model 3D per organ (FR-12, admin): unggah
   (multipart) dan hapus. Daftar aset dibaca Server Component langsung dari
   basis data (DaftarAset), sehingga pemanggil memanggil router.refresh()
   setelah mutasi; onSuccess juga membersihkan cache ['aset'] bila ada.
   ========================================================================== */
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { hapusAsetModel, unggahAset } from "@/lib/mock-api";
import type { OrganId } from "@/lib/schemas";
import { KUNCI } from "./kunci-query";

export function useAsetModel() {
  const queryClient = useQueryClient();
  const segarkan = () => void queryClient.invalidateQueries({ queryKey: KUNCI.aset });

  const unggah = useMutation({
    mutationFn: ({ idOrgan, berkas }: { idOrgan: OrganId; berkas: File }) => unggahAset(idOrgan, berkas),
    onSuccess: segarkan,
  });

  const hapus = useMutation({
    mutationFn: (idOrgan: OrganId) => hapusAsetModel(idOrgan),
    onSuccess: segarkan,
  });

  return { unggah, hapus };
}
