"use client";

/* Client leaf: tombol keluar di halaman Profil. */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Ikon } from "@/components/ui/Ikon";
import { keluar } from "@/lib/mock-api";
import { tombol } from "@/lib/variants";

export function TombolKeluar() {
  const router = useRouter();
  const [proses, setProses] = useState(false);
  return (
    <button
      type="button"
      disabled={proses}
      onClick={async () => {
        setProses(true);
        try {
          await keluar();
        } finally {
          router.push("/login");
          router.refresh();
        }
      }}
      className={tombol({ variant: "garis", ukuran: "md" })}
    >
      <Ikon nama="keluar" /> Keluar
    </button>
  );
}
