import { describe, expect, it } from "vitest";
import {
  bagianById,
  bagianOrgan,
  body_parts,
  koordinat2d,
  koordinat3d,
  layerOrgan,
  organById,
  organs,
  part_content_awal,
  sistem_organ,
  users,
} from "@/lib/data";

describe("integritas data seed", () => {
  it("setiap bagian tubuh punya label dasar dan merujuk organ yang ada", () => {
    for (const b of body_parts) {
      expect(organById(b.id_organ)).not.toBeNull();
      expect(part_content_awal.some((k) => k.id_bagian === b.id_bagian && k.jenis_konten === "dasar")).toBe(true);
      if (b.parent_bagian_id) expect(bagianById(b.parent_bagian_id)?.id_organ).toBe(b.id_organ);
    }
  });

  it("sistem organ yang tersedia menunjuk organ dengan model .glb", () => {
    for (const s of sistem_organ.filter((x) => x.status === "tersedia")) {
      const organ = organById(s.id_organ);
      expect(organ?.file_model_3d.endsWith(".glb")).toBe(true);
    }
    expect(sistem_organ.filter((x) => x.status === "segera").every((x) => x.id_organ === null)).toBe(true);
  });

  it("tiga akun demo dengan peran berbeda", () => {
    expect(users.map((u) => u.role).sort()).toEqual(["admin", "guru", "siswa"]);
  });

  it("selector organ/bagian/layer", () => {
    const jantung = organs[0];
    expect(jantung).toBeDefined();
    if (!jantung) return;
    expect(bagianOrgan(jantung.id_organ)).toHaveLength(6);
    expect(layerOrgan(jantung.id_organ).map((l) => l.nama_layer)).toEqual(["kulit", "otot", "tulang", "organ_dalam"]);
    expect(organById(null)).toBeNull();
    expect(bagianById(999)).toBeNull();
  });

  it("koordinat diurai dari string SKPL", () => {
    const b = bagianById(1);
    expect(b).not.toBeNull();
    if (!b) return;
    expect(koordinat3d(b)).toEqual({ x: -0.213, y: -0.023, z: 0.012 });
    expect(koordinat2d(b)).toEqual({ x: 35, y: 52 });
    expect(b.mesh_3d).toContain("VH_M_right_cardiac_atrium");
  });
});
