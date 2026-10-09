import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { klien, type Lingkungan, siapkan } from "./helpers";

let env: Lingkungan;
let k: ReturnType<typeof klien>;
let admin: string;
let siswa: string;
beforeAll(async () => {
  env = await siapkan();
  k = klien(env);
  admin = await k.masuk("admin");
  siswa = await k.masuk("siswa");
});
afterAll(() => env.tutup());

function glb(ukuran = 64): Uint8Array {
  const b = new Uint8Array(ukuran);
  b.set([0x67, 0x6c, 0x54, 0x46]); // "glTF"
  return b;
}
function form(bytes: Uint8Array, nama = "model.glb"): FormData {
  const f = new FormData();
  f.set("berkas", new File([bytes as unknown as ArrayBuffer], nama, { type: "model/gltf-binary" }));
  return f;
}

describe("FR-12 kelola aset model 3D", () => {
  it("mengunggah model baru (201) dan model aktif organ berganti ke unggahan", async () => {
    const r = await k.panggil<{ model: { sumber: string; versi: number; url: string; ukuran_byte: number } }>(
      "POST",
      "/v1/admin/aset/1",
      { token: admin, form: form(glb(128)) },
    );
    expect(r.status).toBe(201);
    expect(r.body.model).toMatchObject({ sumber: "unggahan", versi: 1, ukuran_byte: 128 });
    expect(r.body.model.url).toMatch(/\/files\/models\/1\/v1-[0-9a-f]+\.glb$/);
    const o = await k.panggil<{ model: { sumber: string } }>("GET", "/v1/organ/1", { token: siswa });
    expect(o.body.model.sumber).toBe("unggahan");
  });
  it("berkas yang diunggah dapat dibaca lewat URL publik", async () => {
    const o = await k.panggil<{ model: { url: string } }>("GET", "/v1/organ/1", { token: siswa });
    const jalur = new URL(o.body.model.url).pathname;
    const r = await env.app.request(jalur);
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toBe("model/gltf-binary");
    expect(new Uint8Array(await r.arrayBuffer()).byteLength).toBe(128);
  });
  it("mengunggah lagi menaikkan versi (200) dan berkas lama dihapus dari penyimpanan", async () => {
    const lama = await k.panggil<{ model: { url: string } }>("GET", "/v1/organ/1", { token: siswa });
    const r = await k.panggil<{ model: { versi: number } }>("POST", "/v1/admin/aset/1", {
      token: admin,
      form: form(glb(256), "jantung-v2.glb"),
    });
    expect(r.status).toBe(200);
    expect(r.body.model.versi).toBe(2);
    expect((await env.app.request(new URL(lama.body.model.url).pathname)).status).toBe(404);
  });
  it("menolak ekstensi salah, isi bukan glTF, dan berkas terlalu besar", async () => {
    expect((await k.panggil("POST", "/v1/admin/aset/2", { token: admin, form: form(glb(), "model.obj") })).status).toBe(
      422,
    );
    const palsu = new Uint8Array(64).fill(65);
    expect((await k.panggil("POST", "/v1/admin/aset/2", { token: admin, form: form(palsu) })).status).toBe(422);
    const besar = await k.panggil<{ kode: string }>("POST", "/v1/admin/aset/2", {
      token: admin,
      form: form(glb(15 * 1024 * 1024 + 10)),
    });
    expect(besar.status).toBe(413);
  });
  it("galat: tanpa berkas, organ tidak ada, id tidak valid", async () => {
    expect((await k.panggil("POST", "/v1/admin/aset/2", { token: admin, form: new FormData() })).status).toBe(400);
    expect((await k.panggil("POST", "/v1/admin/aset/999", { token: admin, form: form(glb()) })).status).toBe(404);
    expect((await k.panggil("POST", "/v1/admin/aset/x", { token: admin, form: form(glb()) })).status).toBe(400);
    expect((await k.panggil("POST", "/v1/admin/aset/2", { token: admin, json: { a: 1 } })).status).toBe(400);
  });
  it("siswa tidak boleh mengunggah (403); daftar aset admin menampilkan semua organ", async () => {
    expect((await k.panggil("POST", "/v1/admin/aset/2", { token: siswa, form: form(glb()) })).status).toBe(403);
    const d = await k.panggil<{ id_organ: number; model: { sumber: string } }[]>("GET", "/v1/admin/aset", {
      token: admin,
    });
    expect(d.body.map((x) => [x.id_organ, x.model.sumber])).toEqual([
      [1, "unggahan"],
      [2, "bawaan"],
    ]);
  });
  it("menghapus unggahan mengembalikan model bawaan; hapus lagi memberi 404", async () => {
    expect((await k.panggil("DELETE", "/v1/admin/aset/1", { token: admin })).status).toBe(200);
    const o = await k.panggil<{ model: { sumber: string } }>("GET", "/v1/organ/1", { token: siswa });
    expect(o.body.model.sumber).toBe("bawaan");
    expect((await k.panggil("DELETE", "/v1/admin/aset/1", { token: admin })).status).toBe(404);
    expect((await k.panggil("DELETE", "/v1/admin/aset/x", { token: admin })).status).toBe(400);
  });
  it("berkas lokal: jalur keluar folder ditolak", async () => {
    expect((await env.app.request("/files/..%2F..%2Fetc%2Fpasswd")).status).toBe(404);
    expect((await env.app.request("/files/models/tidak-ada.glb")).status).toBe(404);
  });
});
