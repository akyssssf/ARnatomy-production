/* health.ts — Pemeriksaan kesehatan untuk pemantau uptime (NFR-04): /healthz = proses hidup, /readyz = basis data siap. */
import { sql } from "drizzle-orm";
import { Hono } from "hono";
import type { Deps } from "../konteks";

export function rutHealth(deps: Deps) {
  const r = new Hono();
  r.get("/healthz", (c) => c.json({ status: "ok" }));
  r.get("/readyz", async (c) => {
    try {
      await deps.db.execute(sql`SELECT 1`);
      return c.json({ status: "siap" });
    } catch {
      return c.json({ status: "basis data belum siap" }, 503);
    }
  });
  return r;
}
