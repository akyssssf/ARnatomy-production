/* Server Component: reveal murni CSS untuk konten lipatan atas / kandidat LCP.
   Kelas .muncul-segera (animasi transform saja) + animation-delay; tidak ada
   JavaScript sama sekali sehingga teks tampil tanpa menunggu hidrasi.
   Untuk konten di bawah lipatan pakai <Muncul> (klien, IntersectionObserver). */
export function MunculSegera({
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
  return (
    <Tag className={`muncul-segera ${kelas}`} style={{ animationDelay: `${jeda}ms` }}>
      {children}
    </Tag>
  );
}
