import { badge, type PropsBadge } from "@/lib/variants";

/* Server Component: pil status memakai varian CVA `badge` */
export function Badge({ status, kelas = "", children }: PropsBadge & { kelas?: string; children: React.ReactNode }) {
  return <span className={`${badge({ status })} ${kelas}`}>{children}</span>;
}
