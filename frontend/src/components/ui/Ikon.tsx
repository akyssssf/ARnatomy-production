/* Server Component: ikon garis inline SVG, mewarisi warna lewat currentColor */
const JALUR = {
  profil: (
    <>
      <circle cx="12" cy="8.5" r="3.6" />
      <path d="M4.8 20c.9-3.6 3.8-5.4 7.2-5.4s6.3 1.8 7.2 5.4" />
    </>
  ),
  tugas: (
    <>
      <rect x="4.5" y="3.5" width="15" height="17" rx="2.5" />
      <path d="m8.5 9 1.6 1.6L13 7.8M8.5 15.5h7" />
    </>
  ),
  jantung: <path d="M12 20.3S3.8 15.4 3.8 9.9A4.1 4.1 0 0 1 12 8.2a4.1 4.1 0 0 1 8.2 1.7c0 5.5-8.2 10.4-8.2 10.4Z" />,
  lapisan: (
    <>
      <path d="m12 3 9 4.8-9 4.8-9-4.8L12 3Z" />
      <path d="m3 12.8 9 4.8 9-4.8" />
    </>
  ),
  riwayat: (
    <>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H14l6 6v8.5A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-13Z" />
      <path d="M14 4v6h6" />
    </>
  ),
  chat: <path d="M20.5 11.7a7.7 7.7 0 0 1-11.2 6.9L4 20l1.4-4.1a7.7 7.7 0 1 1 15.1-4.2Z" />,
  perisai: <path d="m12 3.3 7 2.9v5.6c0 4.3-2.9 7.4-7 8.8-4.1-1.4-7-4.5-7-8.8V6.2l7-2.9Z" />,
  rumah: (
    <path d="M3.5 10.4 12 4.2l8.5 6.2v8.3a1.3 1.3 0 0 1-1.3 1.3h-4.4v-5.6H9.2V20H4.8a1.3 1.3 0 0 1-1.3-1.3v-8.3Z" />
  ),
  panah: <path d="M5 12h13M12.5 6l6 6-6 6" />,
  keluar: (
    <>
      <path d="m16 16 4-4-4-4" />
      <path d="M20 12H9.5" />
      <path d="M13 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H13" />
    </>
  ),
  ulang: (
    <>
      <path d="M20.5 12a8.5 8.5 0 1 1-2.8-6.3" />
      <path d="M20.5 4.5V10H15" />
    </>
  ),
  perbesar: (
    <>
      <circle cx="11" cy="11" r="6.8" />
      <path d="m20 20-4.2-4.2M8.4 11h5.2M11 8.4v5.2" />
    </>
  ),
  perkecil: (
    <>
      <circle cx="11" cy="11" r="6.8" />
      <path d="m20 20-4.2-4.2M8.4 11h5.2" />
    </>
  ),
  putar: (
    <>
      <path d="M12 3.5a8.5 8.5 0 1 1-8.5 8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </>
  ),
  peringatan: (
    <>
      <path d="M12 4.3 2.9 19.7h18.2L12 4.3Z" />
      <path d="M12 10.2v4M12 17h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11.2V16M12 8.2h.01" />
    </>
  ),
  tambah: <path d="M12 5.5v13M5.5 12h13" />,
  silang: <path d="m6 6 12 12M18 6 6 18" />,
  kirim: (
    <>
      <path d="M20 4 3.5 10.8l6.4 2.3 2.3 6.4L20 4Z" />
      <path d="m9.9 13.1 3.6-3.6" />
    </>
  ),
  kamera: (
    <>
      <path d="M4 8.5h3l1.5-2.2h7L17 8.5h3v10H4v-10Z" />
      <circle cx="12" cy="13.3" r="3" />
    </>
  ),
  mata: (
    <>
      <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
};

export type NamaIkon = keyof typeof JALUR;

export function Ikon({ nama, kelas = "h-4 w-4" }: { nama: NamaIkon; kelas?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={kelas}
    >
      {JALUR[nama]}
    </svg>
  );
}
