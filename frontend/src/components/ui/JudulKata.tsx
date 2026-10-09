/* Server Component: judul yang naik kata demi kata. Animasi murni CSS
   (kelas .kata + animation-delay inline), jadi tidak butuh JS di klien. */
export function JudulKata({ baris, jedaAwal = 0 }: { baris: string[][]; jedaAwal?: number }) {
  let urutan = 0;
  return baris.map((kata) => {
    const barisPertama = urutan === 0;
    return (
      <span key={kata.join("-")}>
        {!barisPertama && <br />}
        {kata.map((k, j) => {
          const jeda = jedaAwal + urutan * 70;
          urutan += 1;
          return (
            <span key={`${k}-${jeda}`}>
              {j > 0 && " "}
              <span className="kata">
                <span style={{ animationDelay: `${jeda}ms` }}>{k}</span>
              </span>
            </span>
          );
        })}
      </span>
    );
  });
}
