/* ==========================================================================
   dokumentasi.ts — Halaman GET /docs: Swagger UI yang membaca /openapi.json.
   Aset diambil dari CDN dengan versi dikunci (tanpa dependensi tambahan di server).
   ========================================================================== */
const VERSI_SWAGGER_UI = "5.17.14";
const CDN = `https://cdn.jsdelivr.net/npm/swagger-ui-dist@${VERSI_SWAGGER_UI}`;

export const HALAMAN_DOKUMENTASI = `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dokumentasi API ARnatomy</title>
  <link rel="stylesheet" href="${CDN}/swagger-ui.css">
  <meta name="color-scheme" content="light">
  <style>body{margin:0;background:#fff}</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="${CDN}/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: "/openapi.json",
      dom_id: "#swagger-ui",
      persistAuthorization: true,
      tagsSorter: "alpha",
      docExpansion: "list",
    });
  </script>
</body>
</html>`;
