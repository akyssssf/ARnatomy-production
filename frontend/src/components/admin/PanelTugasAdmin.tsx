import { KondisiKosong } from "@/components/ui/KondisiKosong";
import { tugasAdmin } from "@/lib/sumber";
import { KelolaSoal } from "./KelolaSoal";

/* Server Component: tab Tugas Belajar di dashboard admin (kelola soal kuis; simulasi dan rakit hanya ditampilkan). */
export async function PanelTugasAdmin() {
  const daftar = await tugasAdmin().catch(() => null);
  if (!daftar) {
    return (
      <KondisiKosong
        judul="Tugas belajar membutuhkan backend"
        deskripsi="Atur BACKEND_URL agar tugas dan soal dapat dikelola."
      />
    );
  }
  return <KelolaSoal daftar={daftar} />;
}
