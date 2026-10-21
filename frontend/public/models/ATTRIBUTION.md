# Atribusi model 3D

Semua model organ di folder ini dan render statis di `public/img/` berasal dari
**HuBMAP Human Reference Atlas (HRA)**, 3D Reference Organ Set (adult male), lisensi
**CC BY 4.0** — https://creativecommons.org/licenses/by/4.0/

Sumber: https://humanatlas.io/3d-reference-library · Data: https://lod.humanatlas.io/ref-organ
Sitasi: Börner K. et al. (2025) *Human BioMolecular Atlas Program (HuBMAP): 3D Human Reference Atlas construction and usage*, Nature Methods. https://doi.org/10.1038/s41592-024-02563-5

| Berkas | Objek digital HRA | Adaptasi |
|---|---|---|
| `heart.glb` | `ref-organ/heart-male/v1.3` (3d-vh-m-heart.glb) + potongan `ref-organ/blood-vasculature-male/v1.3` (aorta asendens, arkus aorta, trunkus pulmonalis, vena cava superior/inferior, vena pulmonalis, arteri koroner) | digabung jadi satu berkas, warna pembuluh dilembutkan (merah = kaya O₂, biru = miskin O₂), dikompresi Meshopt |
| `lungs.glb` | `ref-organ/lung-male/v1.4` + `ref-organ/trachea-male/v1.1` + `ref-organ/main-bronchus-male/v1.1` | digabung jadi satu berkas, dikompresi Meshopt |
| `../img/jantung.webp`, `paru.webp` | render dari dua berkas di atas | — |
| `../img/otak.webp` | `ref-organ/brain-male/v1.4` (3d-allen-m-brain.glb) | render statis saja |
| `../img/usus.webp` | `ref-organ/large-intestine-male/v1.3` | render statis saja |
| `../img/ginjal.webp` | `ref-organ/kidney-male-left/v1.3` | render statis saja |
| `../img/pankreas.webp` | `ref-organ/pancreas-male/v1.3` | render statis saja |
| `../img/mata.webp` | `ref-organ/eye-male-left/v1.3` | render statis saja |
| `../img/kulit.webp` | `ref-organ/skin-male/v1.4` | render statis, warna diubah ke warna kulit |

Nama node pada berkas (mis. `VH_M_left_cardiac_atrium`, `VH_M_right_*_bronchopulmonary_segment`)
dipertahankan apa adanya dan dirujuk oleh kolom `mesh_3d` pada `src/lib/data.ts`.
