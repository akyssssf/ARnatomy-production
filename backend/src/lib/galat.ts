/* galat.ts — Galat aplikasi dengan status HTTP; diubah menjadi {pesan, kode} oleh penangan galat. */
export class GalatApi extends Error {
  constructor(
    public readonly status: 400 | 401 | 403 | 404 | 409 | 413 | 422 | 429 | 500 | 503,
    pesan: string,
    public readonly kode?: string,
  ) {
    super(pesan);
    this.name = "GalatApi";
  }
}
