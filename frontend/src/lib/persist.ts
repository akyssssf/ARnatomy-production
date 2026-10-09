/* ==========================================================================
   persist.ts — Persistensi opsional untuk basis data mock (NFR-04/05).
   Snapshot seluruh toko ditulis (debounce) setelah setiap mutasi dan dimuat
   sekali saat server mulai (src/instrumentation.ts). Adapter dipilih dari env:
     - KV_REST_API_URL + KV_REST_API_TOKEN : Upstash/Vercel KV lewat REST
       (serverless; byte model 3D tidak ikut karena batas ukuran nilai)
     - DATA_DIR                            : berkas JSON di disk (self-host/VPS,
       termasuk byte model 3D sebagai base64)
     - tidak ada                           : memori proses saja
   Modul ini tidak mengimpor db.ts (hindari siklus); db.ts menyerahkan
   fungsi serialisasi/pemulihan lewat daftarkanToko().
   ========================================================================== */
import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { envServer } from "./env";

export const KUNCI_KV = "arnatomy:db";
const NAMA_BERKAS = "arnatomy-db.json";
const JEDA_SIMPAN_MS = 400;

export type Adapter = "kv" | "berkas" | "memori";
export function adapterAktif(): Adapter {
  const env = envServer();
  if (env.KV_REST_API_URL && env.KV_REST_API_TOKEN) return "kv";
  if (env.DATA_DIR) return "berkas";
  return "memori";
}

interface Sumber {
  /** Snapshot siap-JSON; `denganBytes` false untuk adapter berkapasitas kecil (KV). */
  serialisasi: (denganBytes: boolean) => unknown;
  pulihkan: (snapshot: unknown) => void;
}
let sumber: Sumber | null = null;
export function daftarkanToko(s: Sumber): void {
  sumber = s;
}

async function tulis(teks: string): Promise<void> {
  const env = envServer();
  const adapter = adapterAktif();
  if (adapter === "kv" && env.KV_REST_API_URL && env.KV_REST_API_TOKEN) {
    await fetch(env.KV_REST_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.KV_REST_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(["SET", KUNCI_KV, teks]),
    });
  } else if (adapter === "berkas" && env.DATA_DIR) {
    await mkdir(env.DATA_DIR, { recursive: true });
    await writeFile(join(env.DATA_DIR, NAMA_BERKAS), teks, "utf8");
  }
}

async function baca(): Promise<string | null> {
  const env = envServer();
  const adapter = adapterAktif();
  try {
    if (adapter === "kv" && env.KV_REST_API_URL && env.KV_REST_API_TOKEN) {
      const r = await fetch(`${env.KV_REST_API_URL}/get/${KUNCI_KV}`, {
        headers: { Authorization: `Bearer ${env.KV_REST_API_TOKEN}` },
      });
      if (!r.ok) return null;
      const data = (await r.json()) as { result?: string | null };
      return typeof data.result === "string" ? data.result : null;
    }
    if (adapter === "berkas" && env.DATA_DIR) return await readFile(join(env.DATA_DIR, NAMA_BERKAS), "utf8");
  } catch {
    return null;
  }
  return null;
}

let penunda: ReturnType<typeof setTimeout> | null = null;
let sedangMenulis: Promise<void> = Promise.resolve();
/** Dipanggil db.ts setelah mutasi: menjadwalkan satu penulisan (debounce). */
export function jadwalkanSimpan(): void {
  if (adapterAktif() === "memori" || !sumber) return;
  if (penunda) clearTimeout(penunda);
  penunda = setTimeout(() => {
    penunda = null;
    void simpanSekarang();
  }, JEDA_SIMPAN_MS);
}
/** Menulis snapshot segera (dipakai uji dan saat proses akan berhenti).
    Untuk KV, snapshot remote digabung dulu agar instance lain tidak tertimpa. */
export function simpanSekarang(): Promise<void> {
  if (adapterAktif() === "memori" || !sumber) return Promise.resolve();
  const s = sumber;
  sedangMenulis = sedangMenulis
    .then(async () => {
      if (adapterAktif() === "kv") {
        const remote = await baca();
        if (remote) {
          try {
            s.pulihkan(JSON.parse(remote));
          } catch {
            /* snapshot remote rusak: abaikan, tulis milik sendiri */
          }
        }
      }
      await tulis(JSON.stringify(s.serialisasi(adapterAktif() === "berkas")));
    })
    .catch(() => undefined);
  return sedangMenulis;
}
/** Memuat snapshot ke toko; benar bila ada yang dipulihkan. */
export async function muatSnapshot(): Promise<boolean> {
  if (adapterAktif() === "memori" || !sumber) return false;
  const teks = await baca();
  if (!teks) return false;
  try {
    sumber.pulihkan(JSON.parse(teks));
    return true;
  } catch {
    return false;
  }
}
