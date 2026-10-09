/* csv.ts — Pembaca CSV minimal (RFC 4180): kolom bertanda kutip, koma, baris baru, dan "" di dalam kolom. */
export function bacaCsv(isi: string): Record<string, string>[] {
  const baris: string[][] = [];
  let kolom = "";
  let rekaman: string[] = [];
  let dalamKutip = false;
  for (let i = 0; i < isi.length; i++) {
    const c = isi[i] as string;
    if (dalamKutip) {
      if (c === '"') {
        if (isi[i + 1] === '"') {
          kolom += '"';
          i++;
        } else dalamKutip = false;
      } else kolom += c;
    } else if (c === '"') dalamKutip = true;
    else if (c === ",") {
      rekaman.push(kolom);
      kolom = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && isi[i + 1] === "\n") i++;
      rekaman.push(kolom);
      kolom = "";
      if (rekaman.some((x) => x !== "")) baris.push(rekaman);
      rekaman = [];
    } else kolom += c;
  }
  if (kolom !== "" || rekaman.length) {
    rekaman.push(kolom);
    baris.push(rekaman);
  }
  const [kepala, ...data] = baris;
  if (!kepala) return [];
  return data.map((r) => Object.fromEntries(kepala.map((k, i) => [k, r[i] ?? ""])));
}
