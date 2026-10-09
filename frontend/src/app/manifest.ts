/* manifest.webmanifest (konvensi Metadata API): nama, warna, dan ikon
   agar aplikasi bisa "Tambahkan ke layar utama" di ponsel. */
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ARnatomy",
    short_name: "ARnatomy",
    description: "Belajar anatomi lewat model organ 3D interaktif.",
    lang: "id",
    start_url: "/beranda",
    display: "standalone",
    background_color: "#e6e8eb",
    theme_color: "#e6e8eb",
    icons: [
      { src: "/ikon/ikon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/ikon/ikon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
