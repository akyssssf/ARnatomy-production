"use client";

/* Error boundary paling luar: menggantikan root layout bila layout itu
   sendiri gagal dirender, sehingga wajib memuat <html> dan <body> sendiri.
   Tanpa fon/stylesheet global (bisa jadi itulah yang gagal), jadi gaya inline. */
export default function GalatGlobal({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#e6e8eb",
          color: "#171717",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <main role="alert" style={{ maxWidth: 480, padding: 24, background: "#fff", borderRadius: 16 }}>
          <p style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6b7280" }}>
            Kesalahan aplikasi
          </p>
          <h1 style={{ fontSize: 24, margin: "8px 0 0" }}>ARnatomy tidak dapat dimuat</h1>
          <p style={{ fontSize: 14, color: "#6b7280" }}>{error.message || "Galat tidak dikenal."}</p>
          {error.digest && <p style={{ fontSize: 11, color: "#9ca3af" }}>Kode: {error.digest}</p>}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 16,
              padding: "10px 20px",
              borderRadius: 999,
              border: 0,
              background: "#1566f4",
              color: "#fff",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Muat ulang
          </button>
        </main>
      </body>
    </html>
  );
}
