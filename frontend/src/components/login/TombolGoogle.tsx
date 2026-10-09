"use client";

/* Client leaf: tombol "Masuk dengan Google" (Google Identity Services).
   Google mengembalikan ID token; token dikirim ke /api/google (BFF) yang
   memverifikasinya lewat backend. Akun baru diarahkan melengkapi profil. */
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { GalatApi, masukGoogle } from "@/lib/mock-api";

interface IdentitasGoogle {
  accounts: {
    id: {
      initialize: (o: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: string }) => void;
      renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
    };
  };
}

const URL_SKRIP = "https://accounts.google.com/gsi/client";

function muatSkrip(): Promise<void> {
  return new Promise((selesai, gagal) => {
    if ((window as unknown as { google?: IdentitasGoogle }).google?.accounts) return selesai();
    const ada = document.querySelector<HTMLScriptElement>(`script[src="${URL_SKRIP}"]`);
    const skrip = ada ?? document.createElement("script");
    skrip.addEventListener("load", () => selesai());
    skrip.addEventListener("error", () => gagal(new Error("skrip Google gagal dimuat")));
    if (!ada) {
      skrip.src = URL_SKRIP;
      skrip.async = true;
      document.head.appendChild(skrip);
    }
  });
}

export function TombolGoogle({
  clientId,
  tujuanAwal,
  onGalat,
  teks = "signin_with",
}: {
  clientId: string;
  tujuanAwal: string | null;
  onGalat: (pesan: string | null) => void;
  teks?: "signin_with" | "signup_with" | "continue_with";
}) {
  const router = useRouter();
  const wadah = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let batal = false;
    muatSkrip()
      .then(() => {
        const google = (window as unknown as { google: IdentitasGoogle }).google;
        if (batal || !wadah.current) return;
        google.accounts.id.initialize({
          client_id: clientId,
          callback: async ({ credential }) => {
            onGalat(null);
            try {
              const user = await masukGoogle(credential);
              if (user.profil_lengkap === false) router.push("/lengkapi-profil");
              else {
                const bawaan: Route = user.role === "admin" ? "/admin" : "/beranda";
                router.push(
                  tujuanAwal?.startsWith("/") && !tujuanAwal.startsWith("/admin") ? (tujuanAwal as Route) : bawaan,
                );
              }
              router.refresh();
            } catch (kesalahan) {
              onGalat(kesalahan instanceof GalatApi ? kesalahan.message : "Tidak dapat menghubungi server.");
            }
          },
        });
        google.accounts.id.renderButton(wadah.current, {
          theme: "outline",
          size: "large",
          text: teks,
          shape: "pill",
          width: 320,
        });
      })
      .catch(() => onGalat("Login Google tidak dapat dimuat. Periksa koneksi internet."));
    return () => {
      batal = true;
    };
  }, [clientId, tujuanAwal, router, onGalat, teks]);

  return <div ref={wadah} className="flex min-h-11 justify-center" />;
}
