/* sitemap.xml (konvensi Metadata API): hanya halaman publik. */
import type { MetadataRoute } from "next";
import { envPublic } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const asal = envPublic.NEXT_PUBLIC_SITE_URL;
  const kini = new Date();
  return [
    { url: `${asal}/`, lastModified: kini, changeFrequency: "monthly", priority: 1 },
    { url: `${asal}/login`, lastModified: kini, changeFrequency: "yearly", priority: 0.5 },
    { url: `${asal}/daftar`, lastModified: kini, changeFrequency: "yearly", priority: 0.5 },
    { url: `${asal}/kebijakan-privasi`, lastModified: kini, changeFrequency: "yearly", priority: 0.3 },
    { url: `${asal}/syarat`, lastModified: kini, changeFrequency: "yearly", priority: 0.3 },
  ];
}
