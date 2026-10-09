/* ==========================================================================
   akun.ts — FR-13: admin menambah, mengubah, menonaktifkan, dan menghapus akun.
   Menonaktifkan, mengganti sandi, atau mengubah peran menaikkan token_versi
   sehingga token yang sudah beredar langsung tidak berlaku. Admin tidak bisa
   menonaktifkan/menghapus akunnya sendiri.
   ========================================================================== */
import { asc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { users } from "../db/schema";
import type { AppEnv, Deps } from "../konteks";
import { GalatApi } from "../lib/galat";
import { hashSandi } from "../lib/sandi";
import { bacaBody } from "../middleware";
import { AkunBuatSchema, AkunPatchSchema, idDariParam } from "../schemas";

const kolomAman = {
  id_user: users.id_user,
  nama: users.nama,
  email: users.email,
  role: users.role,
  asal_sekolah: users.asal_sekolah,
  aktif: users.aktif,
  profil_lengkap: users.profil_lengkap,
  punya_google: sql<boolean>`${users.google_sub} IS NOT NULL`,
  created_at: users.created_at,
};

export function rutAkunAdmin(deps: Deps) {
  const { db, cfg } = deps;
  const r = new Hono<AppEnv>();

  r.get("/akun", async (c) => c.json(await db.select(kolomAman).from(users).orderBy(asc(users.id_user))));

  r.post("/akun", async (c) => {
    const d = await bacaBody(c, AkunBuatSchema);
    const email = d.email.toLowerCase();
    const [ada] = await db.select({ id: users.id_user }).from(users).where(eq(users.email, email)).limit(1);
    if (ada) throw new GalatApi(409, "Email sudah terdaftar.", "EMAIL_TERPAKAI");
    const [baru] = await db
      .insert(users)
      .values({
        nama: d.nama,
        email,
        password_hash: await hashSandi(d.password, cfg.BCRYPT_COST),
        role: d.role,
        asal_sekolah: d.asal_sekolah,
      })
      .returning(kolomAman);
    return c.json(baru, 201);
  });

  r.patch("/akun/:id", async (c) => {
    const id = idDariParam(c.req.param("id"));
    if (!id) throw new GalatApi(400, "Id akun tidak valid.");
    const d = await bacaBody(c, AkunPatchSchema);
    const saya = c.get("pengguna").id_user;
    if (id === saya && (d.aktif === false || (d.role !== undefined && d.role !== "admin"))) {
      throw new GalatApi(409, "Admin tidak dapat menonaktifkan atau menurunkan peran akunnya sendiri.", "AKUN_SENDIRI");
    }
    const [lama] = await db.select().from(users).where(eq(users.id_user, id)).limit(1);
    if (!lama) throw new GalatApi(404, "Akun tidak ditemukan.");
    const email = d.email?.toLowerCase();
    if (email && email !== lama.email) {
      const [dipakai] = await db.select({ id: users.id_user }).from(users).where(eq(users.email, email)).limit(1);
      if (dipakai) throw new GalatApi(409, "Email sudah terdaftar.", "EMAIL_TERPAKAI");
    }
    const cabutSesi = d.aktif === false || !!d.password || (d.role !== undefined && d.role !== lama.role);
    const [u] = await db
      .update(users)
      .set({
        ...(d.nama !== undefined && { nama: d.nama }),
        ...(email && { email }),
        ...(d.role !== undefined && { role: d.role }),
        ...(d.asal_sekolah !== undefined && { asal_sekolah: d.asal_sekolah }),
        ...(d.aktif !== undefined && { aktif: d.aktif }),
        ...(d.password && { password_hash: await hashSandi(d.password, cfg.BCRYPT_COST) }),
        ...(cabutSesi && { token_versi: sql`${users.token_versi} + 1` }),
      })
      .where(eq(users.id_user, id))
      .returning(kolomAman);
    return c.json(u);
  });

  /* Hapus akun beserta data belajarnya (ON DELETE CASCADE) */
  r.delete("/akun/:id", async (c) => {
    const id = idDariParam(c.req.param("id"));
    if (!id) throw new GalatApi(400, "Id akun tidak valid.");
    if (id === c.get("pengguna").id_user)
      throw new GalatApi(409, "Admin tidak dapat menghapus akunnya sendiri.", "AKUN_SENDIRI");
    const dihapus = await db.delete(users).where(eq(users.id_user, id)).returning({ id: users.id_user });
    if (dihapus.length === 0) throw new GalatApi(404, "Akun tidak ditemukan.");
    return c.json({ ok: true });
  });

  return r;
}
