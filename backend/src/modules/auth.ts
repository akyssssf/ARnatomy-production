/* ==========================================================================
   auth.ts — FR-01 (login), FR-02 (registrasi), NFR-01 (bcrypt, JWT, RBAC).
   Login email + kata sandi, dan login Google (OpenID Connect): klien (Android,
   iOS, web) mengirim ID token, backend memverifikasinya lalu menerbitkan JWT
   miliknya sendiri. Aturan akun Google:
   - akun baru wajib melengkapi peran + sekolah (PATCH /auth/profil);
   - email yang sudah terdaftar dengan kata sandi TIDAK ditautkan otomatis
     (mencegah pengambilalihan akun); pengguna masuk dulu lalu menautkan;
   - akun admin tidak dapat dibuat atau masuk lewat Google.
   ========================================================================== */

import { getConnInfo } from "@hono/node-server/conninfo";
import { eq, sql } from "drizzle-orm";
import { type Context, Hono } from "hono";
import { sekolah, users } from "../db/schema";
import type { AppEnv, Deps, Pengguna } from "../konteks";
import { GalatApi } from "../lib/galat";
import { cekSandi, hashSandi } from "../lib/sandi";
import { bacaToken, terbitkanToken } from "../lib/token";
import { autentikasi, bacaBody } from "../middleware";
import { DaftarSchema, GantiSandiSchema, GoogleSchema, LoginSchema, ProfilSchema, RefreshSchema } from "../schemas";

type BarisUser = typeof users.$inferSelect;

function profil(u: BarisUser): Pengguna {
  return {
    id_user: u.id_user,
    nama: u.nama,
    email: u.email,
    role: u.role as Pengguna["role"],
    asal_sekolah: u.asal_sekolah,
    npsn_sekolah: u.npsn_sekolah,
    profil_lengkap: u.profil_lengkap,
  };
}

/** IP klien: dari X-Forwarded-For hanya bila TRUST_PROXY aktif (kalau tidak, header itu bisa dipalsukan untuk menghindari pembatas). */
function ipKlien(c: Context, trustProxy: boolean): string {
  if (trustProxy) return c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "tak-dikenal";
  try {
    return getConnInfo(c).remote.address ?? "tak-dikenal";
  } catch {
    return "tak-dikenal";
  }
}

export function rutAuth(deps: Deps) {
  const { db, cfg } = deps;
  const r = new Hono<AppEnv>();
  let hashTiruan: Promise<string> | null = null;
  const dapatkanHashTiruan = () => {
    hashTiruan ??= hashSandi("kata-sandi-tiruan-untuk-menyamakan-waktu", cfg.BCRYPT_COST);
    return hashTiruan;
  };

  const sesi = async (u: BarisUser, status: 200 | 201 = 200) => ({
    status,
    body: { user: profil(u), ...(await terbitkanToken(cfg, u)), token_type: "Bearer" as const },
  });

  /* FR-02 */
  r.post("/register", async (c) => {
    const d = await bacaBody(c, DaftarSchema);
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
      .returning();
    if (!baru) throw new GalatApi(500, "Gagal membuat akun.");
    const h = await sesi(baru, 201);
    return c.json(h.body, h.status);
  });

  /* FR-01 */
  r.post("/login", async (c) => {
    const d = await bacaBody(c, LoginSchema);
    const email = d.email.toLowerCase();
    const kunci = `${email}|${ipKlien(c, cfg.trustProxy)}`;
    const tunggu = Math.max(deps.pembatasLogin.sisaBlokir(kunci), deps.pembatasLoginEmail.sisaBlokir(email));
    if (tunggu > 0) {
      c.header("Retry-After", String(tunggu));
      throw new GalatApi(
        429,
        `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(tunggu / 60)} menit.`,
        "TERLALU_BANYAK_PERCOBAAN",
      );
    }
    const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    /* Selalu membandingkan hash agar waktu respons tidak membocorkan keberadaan akun */
    const cocok = await cekSandi(d.password, u?.password_hash ?? (await dapatkanHashTiruan()));
    if (!u?.password_hash || !cocok) {
      deps.pembatasLogin.catat(kunci);
      deps.pembatasLoginEmail.catat(email);
      throw new GalatApi(401, "Email atau kata sandi salah.", "KREDENSIAL_SALAH");
    }
    if (!u.aktif) throw new GalatApi(403, "Akun ini dinonaktifkan. Hubungi administrator.", "AKUN_NONAKTIF");
    deps.pembatasLogin.hapus(kunci);
    const h = await sesi(u);
    return c.json(h.body, h.status);
  });

  /* Rotasi: refresh token dipertukarkan dengan sepasang token baru */
  r.post("/refresh", async (c) => {
    const { refresh_token } = await bacaBody(c, RefreshSchema);
    const isi = await bacaToken(cfg, refresh_token, "refresh");
    if (!isi) throw new GalatApi(401, "Refresh token tidak sah atau sudah berakhir.", "SESI_TIDAK_SAH");
    const [u] = await db.select().from(users).where(eq(users.id_user, isi.sub)).limit(1);
    if (!u?.aktif || u.token_versi !== isi.tv)
      throw new GalatApi(401, "Sesi sudah dicabut, silakan masuk kembali.", "SESI_DICABUT");
    const h = await sesi(u);
    return c.json(h.body, h.status);
  });

  /* Login Google (OIDC) */
  r.post("/google", async (c) => {
    if (cfg.googleClientIds.length === 0)
      throw new GalatApi(503, "Login Google belum dikonfigurasi.", "GOOGLE_NONAKTIF");
    const { id_token, nonce } = await bacaBody(c, GoogleSchema);
    const g = await deps.google(id_token);
    if (!g || (nonce !== undefined && g.nonce !== nonce))
      throw new GalatApi(401, "ID token Google tidak sah.", "GOOGLE_TIDAK_SAH");
    if (!g.email_verified)
      throw new GalatApi(401, "Email Google belum terverifikasi.", "GOOGLE_EMAIL_BELUM_VERIFIKASI");
    const email = g.email.toLowerCase();
    const [sudah] = await db.select().from(users).where(eq(users.google_sub, g.sub)).limit(1);
    let u = sudah;
    if (!u) {
      const [pakaiEmail] = await db.select({ id: users.id_user }).from(users).where(eq(users.email, email)).limit(1);
      if (pakaiEmail) {
        throw new GalatApi(
          409,
          "Email ini sudah terdaftar. Masuk dengan kata sandi, lalu tautkan akun Google.",
          "AKUN_SUDAH_ADA",
        );
      }
      const [baru] = await db
        .insert(users)
        .values({
          nama: (g.name ?? email.split("@")[0] ?? "Pengguna").slice(0, 100),
          email,
          google_sub: g.sub,
          password_hash: null,
          role: "siswa",
          profil_lengkap: false,
        })
        .returning();
      u = baru;
    }
    if (!u) throw new GalatApi(500, "Gagal membuat akun.");
    if (u.role === "admin")
      throw new GalatApi(403, "Akun administrator tidak dapat masuk lewat Google.", "ADMIN_TANPA_GOOGLE");
    if (!u.aktif) throw new GalatApi(403, "Akun ini dinonaktifkan. Hubungi administrator.", "AKUN_NONAKTIF");
    const h = await sesi(u);
    return c.json(h.body, h.status);
  });

  /* Rute di bawah ini memakai access token */
  const aman = new Hono<AppEnv>();
  aman.use(autentikasi(deps));

  aman.get("/me", (c) => c.json({ user: c.get("pengguna") }));

  /* FR-02 untuk akun Google: lengkapi peran dan sekolah */
  aman.patch("/profil", async (c) => {
    const p = c.get("pengguna");
    if (p.role === "admin") throw new GalatApi(403, "Profil administrator diubah lewat pengelolaan akun.", "DILARANG");
    const d = await bacaBody(c, ProfilSchema);
    let namaSekolah = d.asal_sekolah ?? "";
    let npsn: string | null = null;
    if (d.npsn) {
      const [s] = await db.select().from(sekolah).where(eq(sekolah.npsn, d.npsn)).limit(1);
      if (!s) throw new GalatApi(404, "Sekolah dengan NPSN itu tidak ditemukan di daftar.", "SEKOLAH_TIDAK_ADA");
      namaSekolah = `${s.nama}, ${s.kabupaten_kota}`.slice(0, 150);
      npsn = s.npsn;
    }
    const [u] = await db
      .update(users)
      .set({ role: d.role, asal_sekolah: namaSekolah, npsn_sekolah: npsn, profil_lengkap: true })
      .where(eq(users.id_user, p.id_user))
      .returning();
    if (!u) throw new GalatApi(404, "Akun tidak ditemukan.");
    return c.json({ user: profil(u) });
  });

  aman.post("/tautkan/google", async (c) => {
    const p = c.get("pengguna");
    if (cfg.googleClientIds.length === 0)
      throw new GalatApi(503, "Login Google belum dikonfigurasi.", "GOOGLE_NONAKTIF");
    if (p.role === "admin")
      throw new GalatApi(403, "Akun administrator tidak dapat memakai Google.", "ADMIN_TANPA_GOOGLE");
    const { id_token, nonce } = await bacaBody(c, GoogleSchema);
    const g = await deps.google(id_token);
    if (!g?.email_verified || (nonce !== undefined && g.nonce !== nonce))
      throw new GalatApi(401, "ID token Google tidak sah.", "GOOGLE_TIDAK_SAH");
    const [dipakai] = await db.select({ id: users.id_user }).from(users).where(eq(users.google_sub, g.sub)).limit(1);
    if (dipakai && dipakai.id !== p.id_user)
      throw new GalatApi(409, "Akun Google ini sudah tertaut ke pengguna lain.", "GOOGLE_TERPAKAI");
    await db.update(users).set({ google_sub: g.sub }).where(eq(users.id_user, p.id_user));
    return c.json({ ok: true });
  });

  aman.delete("/tautkan/google", async (c) => {
    const p = c.get("pengguna");
    const [u] = await db.select().from(users).where(eq(users.id_user, p.id_user)).limit(1);
    if (!u?.password_hash) throw new GalatApi(409, "Atur kata sandi dulu sebelum melepas Google.", "SATU_METODE_MASUK");
    await db.update(users).set({ google_sub: null }).where(eq(users.id_user, p.id_user));
    return c.json({ ok: true });
  });

  aman.post("/ganti-sandi", async (c) => {
    const p = c.get("pengguna");
    const d = await bacaBody(c, GantiSandiSchema);
    const [u] = await db.select().from(users).where(eq(users.id_user, p.id_user)).limit(1);
    if (!u) throw new GalatApi(404, "Akun tidak ditemukan.");
    if (u.password_hash && !(await cekSandi(d.sandi_lama, u.password_hash))) {
      throw new GalatApi(400, "Kata sandi lama salah.", "SANDI_LAMA_SALAH");
    }
    const [baru] = await db
      .update(users)
      .set({
        password_hash: await hashSandi(d.sandi_baru, cfg.BCRYPT_COST),
        token_versi: sql`${users.token_versi} + 1`,
      })
      .where(eq(users.id_user, p.id_user))
      .returning();
    if (!baru) throw new GalatApi(500, "Gagal mengubah kata sandi.");
    const h = await sesi(baru);
    return c.json(h.body, h.status);
  });

  /* Keluar: token dibuang klien. Logout-semua mencabut seluruh token yang beredar. */
  aman.post("/logout", (c) => c.json({ ok: true }));
  aman.post("/logout-semua", async (c) => {
    await db
      .update(users)
      .set({ token_versi: sql`${users.token_versi} + 1` })
      .where(eq(users.id_user, c.get("pengguna").id_user));
    return c.json({ ok: true });
  });

  r.route("/", aman);
  return r;
}
