/* ==========================================================================
   penyimpanan.ts — Object storage untuk aset model 3D (FR-12; SKPL Bab V.b
   menyebut Firebase Storage atau AWS S3). Antarmuka yang sama untuk dua
   driver: lokal (pengembangan dan uji) dan s3 (Cloudflare R2 / AWS S3 / MinIO).
   ========================================================================== */
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { AwsClient } from "aws4fetch";
import type { Konfigurasi } from "../config/env";

export interface Penyimpanan {
  simpan(kunci: string, bytes: Uint8Array, tipe: string): Promise<void>;
  hapus(kunci: string): Promise<void>;
  /** URL publik untuk membaca berkas (CDN atau domain bucket) */
  url(kunci: string): string;
}

export class PenyimpananLokal implements Penyimpanan {
  private readonly akar: string;
  constructor(
    dir: string,
    private readonly urlDasar: string,
  ) {
    this.akar = resolve(dir);
  }
  private jalur(kunci: string): string {
    const penuh = resolve(this.akar, kunci);
    if (penuh !== this.akar && !penuh.startsWith(this.akar + sep)) throw new Error("kunci penyimpanan tidak valid");
    return penuh;
  }
  async simpan(kunci: string, bytes: Uint8Array): Promise<void> {
    const berkas = this.jalur(kunci);
    await mkdir(dirname(berkas), { recursive: true });
    await writeFile(berkas, bytes);
  }
  async hapus(kunci: string): Promise<void> {
    await rm(this.jalur(kunci), { force: true });
  }
  url(kunci: string): string {
    return `${this.urlDasar.replace(/\/$/, "")}/${kunci}`;
  }
  /** Lokasi berkas di disk untuk rute pelayan berkas (pengembangan). */
  lokasiBerkas(kunci: string): string {
    return this.jalur(kunci);
  }
}

export class PenyimpananS3 implements Penyimpanan {
  private readonly klien: AwsClient;
  private readonly basis: string;
  constructor(
    cfg: { endpoint: string; bucket: string; region: string; accessKeyId: string; secretAccessKey: string },
    private readonly urlDasar: string,
  ) {
    this.klien = new AwsClient({
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
      region: cfg.region,
      service: "s3",
      retries: 3,
    });
    this.basis = `${cfg.endpoint.replace(/\/$/, "")}/${cfg.bucket}`;
  }
  async simpan(kunci: string, bytes: Uint8Array, tipe: string): Promise<void> {
    const r = await this.klien.fetch(`${this.basis}/${kunci}`, {
      method: "PUT",
      body: bytes as unknown as ArrayBuffer,
      headers: { "Content-Type": tipe },
    });
    if (!r.ok) throw new Error(`Gagal mengunggah ke object storage (${r.status}).`);
  }
  async hapus(kunci: string): Promise<void> {
    const r = await this.klien.fetch(`${this.basis}/${kunci}`, { method: "DELETE" });
    if (!r.ok && r.status !== 404) throw new Error(`Gagal menghapus dari object storage (${r.status}).`);
  }
  url(kunci: string): string {
    return `${this.urlDasar.replace(/\/$/, "")}/${kunci}`;
  }
}

export function buatPenyimpanan(cfg: Konfigurasi): Penyimpanan {
  if (cfg.STORAGE_DRIVER === "s3") {
    return new PenyimpananS3(
      {
        endpoint: cfg.S3_ENDPOINT as string,
        bucket: cfg.S3_BUCKET as string,
        region: cfg.S3_REGION,
        accessKeyId: cfg.S3_ACCESS_KEY_ID as string,
        secretAccessKey: cfg.S3_SECRET_ACCESS_KEY as string,
      },
      cfg.STORAGE_PUBLIC_URL,
    );
  }
  return new PenyimpananLokal(cfg.STORAGE_DIR, cfg.STORAGE_PUBLIC_URL);
}
