/* Uji integrasi object storage S3-compatible (MinIO/R2/S3). Hanya berjalan bila TEST_S3_ENDPOINT diisi:
   TEST_S3_ENDPOINT=http://localhost:59000 TEST_S3_ACCESS_KEY_ID=... TEST_S3_SECRET_ACCESS_KEY=... npx vitest run test/integrasi-s3.test.ts */
import { randomBytes } from "node:crypto";
import { AwsClient } from "aws4fetch";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PenyimpananS3 } from "../src/storage/penyimpanan";
import { klien, type Lingkungan, siapkan } from "./helpers";

const endpoint = process.env.TEST_S3_ENDPOINT;
const kunciAkses = process.env.TEST_S3_ACCESS_KEY_ID ?? "";
const rahasia = process.env.TEST_S3_SECRET_ACCESS_KEY ?? "";
const bucket = `uji-${randomBytes(4).toString("hex")}`;

describe.skipIf(!endpoint)("object storage S3 sungguhan", () => {
  const aws = new AwsClient({ accessKeyId: kunciAkses, secretAccessKey: rahasia, region: "us-east-1", service: "s3" });
  const s3 = new PenyimpananS3(
    { endpoint: endpoint ?? "", bucket, region: "us-east-1", accessKeyId: kunciAkses, secretAccessKey: rahasia },
    `${endpoint}/${bucket}`,
  );
  let env: Lingkungan;
  beforeAll(async () => {
    const r = await aws.fetch(`${endpoint}/${bucket}`, { method: "PUT" });
    expect(r.ok).toBe(true);
    env = await siapkan({}, s3);
  });
  afterAll(async () => {
    await env.tutup();
  });

  it("adaptor: simpan lalu baca kembali byte yang sama, hapus membuat berkas hilang", async () => {
    const isi = new Uint8Array([71, 76, 84, 70, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    await s3.simpan("uji/a.glb", isi, "model/gltf-binary");
    const baca = await aws.fetch(`${endpoint}/${bucket}/uji/a.glb`);
    expect(baca.status).toBe(200);
    expect(new Uint8Array(await baca.arrayBuffer())).toEqual(isi);
    await s3.hapus("uji/a.glb");
    expect((await aws.fetch(`${endpoint}/${bucket}/uji/a.glb`)).status).toBe(404);
    await expect(s3.hapus("uji/tidak-ada.glb")).resolves.toBeUndefined();
  });

  it("alur FR-12 lewat API: unggah → berkas ada di bucket → ganti versi menghapus yang lama → hapus", async () => {
    const k = klien(env);
    const admin = await k.masuk("admin");
    const glb = (n: number) => {
      const b = new Uint8Array(n);
      b.set([0x67, 0x6c, 0x54, 0x46]);
      return b;
    };
    const form = (b: Uint8Array) => {
      const f = new FormData();
      f.set("berkas", new File([b as unknown as ArrayBuffer], "jantung.glb"));
      return f;
    };
    const a = await k.panggil<{ model: { url: string } }>("POST", "/v1/admin/aset/1", {
      token: admin,
      form: form(glb(100)),
    });
    expect(a.status).toBe(201);
    const kunciA = new URL(a.body.model.url).pathname.replace(`/${bucket}/`, "");
    expect((await aws.fetch(`${endpoint}/${bucket}/${kunciA}`)).status).toBe(200);
    const b = await k.panggil<{ model: { url: string; versi: number } }>("POST", "/v1/admin/aset/1", {
      token: admin,
      form: form(glb(200)),
    });
    expect(b.body.model.versi).toBe(2);
    expect((await aws.fetch(`${endpoint}/${bucket}/${kunciA}`)).status).toBe(404);
    const kunciB = new URL(b.body.model.url).pathname.replace(`/${bucket}/`, "");
    expect((await k.panggil("DELETE", "/v1/admin/aset/1", { token: admin })).status).toBe(200);
    expect((await aws.fetch(`${endpoint}/${bucket}/${kunciB}`)).status).toBe(404);
  });
});
