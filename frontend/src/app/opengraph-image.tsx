/* Gambar Open Graph 1200x630 dirender di server (ImageResponse) untuk
   pratinjau tautan di WhatsApp/Telegram/LinkedIn. Dihasilkan saat build. */
import { ImageResponse } from "next/og";

export const alt = "ARnatomy: belajar anatomi lewat model organ 3D interaktif";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function GambarOg() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "#e6e8eb",
        color: "#171717",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            background: "#1566f4",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
            <path d="M12 20.3S3.8 15.4 3.8 9.9A4.1 4.1 0 0 1 12 8.2a4.1 4.1 0 0 1 8.2 1.7c0 5.5-8.2 10.4-8.2 10.4Z" />
          </svg>
        </div>
        <div style={{ fontSize: 30, letterSpacing: 4, textTransform: "uppercase", color: "#525252" }}>ARnatomy</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 96, fontWeight: 700, lineHeight: 1, letterSpacing: -3 }}>
          <span>Anatomi jadi nyata</span>
          <span style={{ color: "#1566f4" }}>.</span>
        </div>
        <div style={{ marginTop: 28, fontSize: 34, color: "#525252", maxWidth: 900 }}>
          Model organ 3D interaktif, label per bagian, asisten AI, dan riwayat belajar untuk siswa SMP dan SMA.
        </div>
      </div>
      <div style={{ display: "flex", gap: 14, fontSize: 24, color: "#737373" }}>
        <span>Next.js 16</span>
        <span>·</span>
        <span>React 19</span>
        <span>·</span>
        <span>Three.js</span>
        <span>·</span>
        <span>SKPL v1.0</span>
      </div>
    </div>,
    size,
  );
}
