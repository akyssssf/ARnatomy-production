/* Konvensi Next.js: register() dipanggil sekali saat server mulai. Memuat
   snapshot basis data mock (bila adapter persistensi diatur) sebelum
   permintaan pertama dilayani. Hanya di runtime Node (bukan edge). */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { muatSnapshot, adapterAktif } = await import("./lib/persist");
  await import("./lib/db"); // mendaftarkan toko ke persist
  const dipulihkan = await muatSnapshot();
  const adapter = adapterAktif();
  if (adapter !== "memori") {
    console.log(`[arnatomy] persistensi ${adapter}: ${dipulihkan ? "snapshot dipulihkan" : "mulai kosong"}`);
  }
}
