/* Mengunduh daftar sekolah (SMP, SMA, SMK) sekali saja ke data/sekolah/sekolah.csv.
   Sumber: api-sekolah-indonesia.vercel.app (API komunitas yang bersumber dari data Kemdikbud/Dapodik).
   Hasil dikomit ke repo supaya aplikasi tidak bergantung pada layanan pihak ketiga saat berjalan.
   Jalankan: npx tsx scripts/unduh-sekolah.ts */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const DASAR = "https://api-sekolah-indonesia.vercel.app/sekolah";
const BENTUK = ["SMP", "SMA", "SMK"];
const KELUARAN = join(import.meta.dirname, "..", "data", "sekolah", "sekolah.csv");

interface Baris {
  npsn: string;
  sekolah: string;
  bentuk: string;
  status: string;
  kabupaten_kota: string;
  propinsi: string;
  kecamatan: string;
}

const csv = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const bersih = (v: string | undefined) => (v ?? "").replace(/\s+/g, " ").trim();
const tanpaAwalan = (v: string, awalan: RegExp) => bersih(v).replace(awalan, "");

const semua: string[] = ["npsn,nama,bentuk,status,kabupaten_kota,provinsi,kecamatan"];
const sudah = new Set<string>();
for (const bentuk of BENTUK) {
  for (let halaman = 1; ; halaman++) {
    const r = await fetch(`${DASAR}/${bentuk}?page=${halaman}&perPage=5000`, { signal: AbortSignal.timeout(120_000) });
    if (!r.ok) throw new Error(`${bentuk} halaman ${halaman}: HTTP ${r.status}`);
    const d = (await r.json()) as { dataSekolah?: Baris[]; total_data?: number };
    const data = d.dataSekolah ?? [];
    for (const s of data) {
      const npsn = bersih(s.npsn);
      if (!npsn || sudah.has(npsn)) continue;
      sudah.add(npsn);
      semua.push(
        [
          npsn,
          bersih(s.sekolah),
          bersih(s.bentuk),
          bersih(s.status),
          bersih(s.kabupaten_kota),
          tanpaAwalan(s.propinsi, /^Prov\.\s*/i),
          tanpaAwalan(s.kecamatan, /^Kec\.\s*/i),
        ]
          .map(csv)
          .join(","),
      );
    }
    console.log(`${bentuk} halaman ${halaman}: ${data.length} baris (total ${d.total_data})`);
    if (data.length < 5000) break;
  }
}
mkdirSync(dirname(KELUARAN), { recursive: true });
writeFileSync(KELUARAN, `${semua.join("\n")}\n`);
console.log(`Selesai: ${semua.length - 1} sekolah -> ${KELUARAN}`);
