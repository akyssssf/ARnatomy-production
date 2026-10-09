/* robots.txt (konvensi Metadata API): halaman setelah masuk dan API tidak
   perlu diindeks; sitemap ditunjuk ke asal situs. */
import type { MetadataRoute } from "next";
import { envPublic } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login", "/daftar", "/kebijakan-privasi", "/syarat"],
      disallow: ["/api/", "/beranda", "/eksplorasi", "/asisten", "/riwayat", "/umpan-balik", "/admin"],
    },
    sitemap: `${envPublic.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
