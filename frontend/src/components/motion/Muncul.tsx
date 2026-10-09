"use client";

/* Pembungkus reveal tipis untuk konten di bawah lipatan: baru dimunculkan
   saat masuk viewport lewat IntersectionObserver; setelah selesai, kelas dan
   jeda dilepas agar efek hover tidak tertunda. Anak yang dioper sebagai
   children tetap Server Component. Konten lipatan atas memakai
   <MunculSegera> (RSC, murni CSS). */
import { useEffect, useRef } from "react";

export function Muncul({
  children,
  jeda = 0,
  kelas = "",
  sebagai: Tag = "div",
}: {
  children: React.ReactNode;
  jeda?: number;
  kelas?: string;
  sebagai?: "div" | "article" | "section" | "li";
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      el.classList.remove("muncul");
      return;
    }
    const pengamat = new IntersectionObserver(
      (entri) => {
        const e = entri[0];
        if (!e?.isIntersecting) return;
        el.classList.add("tampak");
        pengamat.disconnect();
        setTimeout(() => {
          el.classList.remove("muncul", "tampak");
          el.style.transitionDelay = "";
        }, jeda + 650);
      },
      { threshold: 0.1, rootMargin: "0px 0px -6% 0px" },
    );
    pengamat.observe(el);
    return () => pengamat.disconnect();
  }, [jeda]);

  return (
    // @ts-expect-error ref generik HTMLElement untuk tag dinamis
    <Tag ref={ref} className={`muncul ${kelas}`} style={{ transitionDelay: `${jeda}ms` }}>
      {children}
    </Tag>
  );
}
