import { DaftarFakta } from "@/components/ui/DaftarFakta";

/* Server Component: kartu penjelasan di samping formulir registrasi */
export function PanduanDaftar() {
  return (
    <>
      <div>
        <p className="mikro">Registrasi</p>
        <h1 id="judul-daftar" className="titik-biru mt-3 text-4xl font-semibold leading-[0.95] sm:text-5xl">
          Buat akun baru
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-neutral-500">
          Akun siswa untuk belajar dan mencatat progres; akun guru untuk memantau materi yang sama. Akun administrator
          dibuat oleh pengelola sistem.
        </p>
      </div>
      <div className="mt-6">
        <DaftarFakta
          fakta={[
            { label: "Masuk", nilai: "Satu klik dengan akun Google, tanpa kata sandi baru" },
            { label: "Profil", nilai: "Pilih siswa/guru lalu sekolahmu dari daftar sekolah resmi" },
            { label: "Sesi", nilai: "Cookie httpOnly; data belajar tersimpan di server" },
          ]}
        />
      </div>
    </>
  );
}
