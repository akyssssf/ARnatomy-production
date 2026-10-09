/* ==========================================================================
   tfidf.ts — TF-IDF setara scikit-learn TfidfVectorizer(stop_words=daftar) dengan
   pengaturan bawaan: huruf kecil, token = urutan huruf/angka/_ sepanjang ≥ 2
   (token_pattern (?u)\b\w\w+\b), idf = ln((1+n)/(1+df)) + 1, vektor dinormalisasi
   L2. Skor kemiripan = cosine (hasil kali titik dua vektor ternormalisasi).
   ========================================================================== */
const POLA_TOKEN = /[\p{L}\p{N}_]{2,}/gu;

export function tokenisasi(teks: string, stopword: ReadonlySet<string>): string[] {
  return (teks.toLowerCase().match(POLA_TOKEN) ?? []).filter((t) => !stopword.has(t));
}

type VektorJarang = Map<number, number>;

export class TfIdf {
  private readonly kosakata = new Map<string, number>();
  private readonly idf: number[] = [];
  private readonly dokumen: VektorJarang[] = [];
  private readonly stopword: Set<string>;

  constructor(korpus: readonly string[], stopword: readonly string[]) {
    this.stopword = new Set(stopword);
    const tokenDokumen = korpus.map((d) => tokenisasi(d, this.stopword));
    const df: number[] = [];
    for (const tokens of tokenDokumen) {
      for (const t of new Set(tokens)) {
        let id = this.kosakata.get(t);
        if (id === undefined) {
          id = this.kosakata.size;
          this.kosakata.set(t, id);
          df.push(0);
        }
        df[id] = (df[id] ?? 0) + 1;
      }
    }
    const n = korpus.length;
    for (const f of df) this.idf.push(Math.log((1 + n) / (1 + f)) + 1);
    for (const tokens of tokenDokumen) this.dokumen.push(this.vektor(tokens));
  }

  private vektor(tokens: string[]): VektorJarang {
    const tf = new Map<number, number>();
    for (const t of tokens) {
      const id = this.kosakata.get(t);
      if (id !== undefined) tf.set(id, (tf.get(id) ?? 0) + 1);
    }
    let norma = 0;
    for (const [id, f] of tf) {
      const w = f * (this.idf[id] as number);
      tf.set(id, w);
      norma += w * w;
    }
    norma = Math.sqrt(norma) || 1;
    for (const [id, w] of tf) tf.set(id, w / norma);
    return tf;
  }

  /** Skor cosine pertanyaan terhadap setiap dokumen (urutan sama dengan korpus). */
  skor(pertanyaan: string): Float64Array {
    const q = this.vektor(tokenisasi(pertanyaan, this.stopword));
    const hasil = new Float64Array(this.dokumen.length);
    if (q.size === 0) return hasil;
    this.dokumen.forEach((d, i) => {
      let s = 0;
      for (const [id, w] of q) s += w * (d.get(id) ?? 0);
      hasil[i] = s;
    });
    return hasil;
  }
}
