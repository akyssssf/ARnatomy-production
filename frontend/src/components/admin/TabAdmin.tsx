"use client";

/* Client: tab dashboard admin di atas komponen Tabs (Radix) — pola WAI-ARIA
   Tabs (tablist/tab/tabpanel, roving tabindex, panah/Home/End) datang dari
   primitifnya. Tab aktif = client UI state di Zustand; jumlah laporan baru
   dari server state (TanStack Query). */
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLaporanKesalahan } from "@/hooks/useLaporanKesalahan";
import type { UserId } from "@/lib/schemas";
import { type TabAdmin as JenisTab, useUIStore } from "@/store/useUIStore";
import { PanelAkun } from "./PanelAkun";
import { PanelKonten } from "./PanelKonten";
import { PanelLaporan } from "./PanelLaporan";

const TAB: { id: JenisTab; label: string }[] = [
  { id: "konten", label: "Konten Label" },
  { id: "laporan", label: "Laporan Kesalahan" },
  { id: "akun", label: "Pengguna" },
  { id: "aset", label: "Aset 3D" },
  { id: "umpan-balik", label: "Umpan Balik" },
  { id: "tugas", label: "Tugas Belajar" },
];

function adalahTab(nilai: string): nilai is JenisTab {
  return TAB.some((t) => t.id === nilai);
}

/* panelAset & panelUmpanBalik: Server Component (DaftarAset, RingkasanSusAdmin) yang dioper sebagai node */
export function TabAdmin({
  idAdmin,
  panelAset,
  panelUmpanBalik,
  panelTugas,
}: {
  idAdmin: UserId;
  panelAset: React.ReactNode;
  panelUmpanBalik: React.ReactNode;
  panelTugas: React.ReactNode;
}) {
  const tabAktif = useUIStore((s) => s.tabAdminAktif);
  const setTabAdmin = useUIStore((s) => s.setTabAdmin);
  const { daftar: laporan } = useLaporanKesalahan({ aktif: true });
  const jumlahBaru = laporan.data?.filter((l) => l.status_tindak_lanjut === "baru").length ?? 0;

  return (
    <Tabs
      value={tabAktif}
      onValueChange={(nilai) => {
        if (adalahTab(nilai)) setTabAdmin(nilai);
      }}
    >
      <TabsList aria-label="Bagian dashboard">
        {TAB.map((t) => (
          <TabsTrigger key={t.id} value={t.id} id={`tab-${t.id}`}>
            {t.label}
            {t.id === "laporan" && jumlahBaru ? ` (${jumlahBaru})` : ""}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="konten" id="panel-konten">
        <PanelKonten />
      </TabsContent>
      <TabsContent value="laporan" id="panel-laporan">
        <PanelLaporan />
      </TabsContent>
      <TabsContent value="akun" id="panel-akun">
        <PanelAkun idAdmin={idAdmin} />
      </TabsContent>
      <TabsContent value="aset" id="panel-aset">
        {panelAset}
      </TabsContent>
      <TabsContent value="umpan-balik" id="panel-umpan-balik">
        {panelUmpanBalik}
      </TabsContent>
      <TabsContent value="tugas" id="panel-tugas">
        {panelTugas}
      </TabsContent>
    </Tabs>
  );
}
