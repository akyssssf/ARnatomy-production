/* Server Component: strip marquee biru; daftar diulang dua kali agar mulus */
export function Marquee({ daftar, label = "Sorotan" }: { daftar: string[]; label?: string }) {
  const isi = [...daftar.map((t) => ({ t, salinan: "a" })), ...daftar.map((t) => ({ t, salinan: "b" }))];
  return (
    <div className="marquee" role="marquee" aria-label={label}>
      <div className="marquee-jalur" aria-hidden="true">
        {isi.map(({ t, salinan }) => (
          <span key={`${salinan}-${t}`}>{t}</span>
        ))}
      </div>
    </div>
  );
}
