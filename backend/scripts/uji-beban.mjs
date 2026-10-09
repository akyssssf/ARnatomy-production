// Uji beban sederhana NFR-05: N pengguna serentak login, membaca katalog, mencari sekolah, membuka daftar tugas, dan mengirim kuis. Pakai: node scripts/uji-beban.mjs [url] [jumlah]
const url = process.argv[2] ?? "http://localhost:4000";
const n = Number(process.argv[3] ?? 40);
/* Akun uji: bawaan akun demo (hanya ada bila SEED_DEMO); untuk server produksi isi EMAIL dan PASSWORD dengan akun yang sudah didaftarkan. */
const EMAIL = process.env.EMAIL ?? "siswa@arnatomy.id";
const PASSWORD = process.env.PASSWORD ?? "siswa123";
const persen = (a, p) => a[Math.min(a.length - 1, Math.floor((p / 100) * a.length))];
async function ukur(fn) {
  const t = performance.now();
  const r = await fn();
  return { ms: performance.now() - t, ok: r.ok };
}
const login = (i) =>
  fetch(`${url}/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `10.0.${Math.floor(i / 250)}.${i % 250}` },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
const t0 = performance.now();
const hasilLogin = await Promise.all(Array.from({ length: n }, (_, i) => ukur(() => login(i))));
const token = (await (await login(9999)).json()).access_token;
const hasilBaca = await Promise.all(Array.from({ length: n }, () => ukur(() => fetch(`${url}/v1/organ/1`, { headers: { authorization: `Bearer ${token}` } }))));
const ringkas = (nama, h) => {
  const w = h.map((x) => x.ms).sort((a, b) => a - b);
  console.log(`${nama}: ${h.filter((x) => x.ok).length}/${h.length} sukses | median ${persen(w, 50).toFixed(0)} ms | p95 ${persen(w, 95).toFixed(0)} ms | maks ${w.at(-1).toFixed(0)} ms`);
};
const auth = { authorization: `Bearer ${token}`, "content-type": "application/json" };
const hasilSekolah = await Promise.all(Array.from({ length: n }, (_, i) => ukur(() => fetch(`${url}/v1/sekolah?q=${["smpn 1 madiun", "sma surabaya", "negeri jakarta", "smk bandung"][i % 4]}`, { headers: auth }))));
const hasilTugas = await Promise.all(Array.from({ length: n }, () => ukur(() => fetch(`${url}/v1/tugas`, { headers: auth }))));
const hasilKuis = await Promise.all(Array.from({ length: n }, () => ukur(() => fetch(`${url}/v1/tugas/1/percobaan`, { method: "POST", headers: auth, body: JSON.stringify({ jawaban: [2, 0, 2, 1, 3, 2, 1, 1] }) }))));
ringkas(`Login ${n} serentak`, hasilLogin);
ringkas(`Baca katalog ${n} serentak`, hasilBaca);
ringkas(`Cari sekolah ${n} serentak`, hasilSekolah);
ringkas(`Daftar tugas ${n} serentak`, hasilTugas);
ringkas(`Kirim kuis ${n} serentak`, hasilKuis);
console.log(`Total ${((performance.now() - t0) / 1000).toFixed(1)} detik`);
