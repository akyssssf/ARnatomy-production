import { describe, expect, it } from "vitest";
import { susunJawaban } from "@/lib/asisten";
import { bagianById } from "@/lib/data";

describe("susunJawaban", () => {
  it("tanpa konteks memberi arahan memilih bagian", () => {
    expect(susunJawaban("apa fungsinya?", null)).toMatch(/Pilih salah satu bagiannya/);
  });

  it("menjawab fungsi, letak, dan gangguan sesuai kata kunci", () => {
    const aorta = bagianById(5);
    expect(aorta).not.toBeNull();
    if (!aorta) return;
    const jawab = susunJawaban("Apa fungsi dan di mana letaknya? Gangguan apa?", aorta);
    expect(jawab).toMatch(/^Tentang Aorta:/);
    expect(jawab).toMatch(/menyalurkan darah/);
    expect(jawab).toMatch(/Keluar dari ventrikel kiri/);
    expect(jawab).toMatch(/aneurisma/);
    expect(jawab).toMatch(/label redup "Dinding elastis/);
  });

  it("pertanyaan tanpa kata kunci memakai fungsi + ringkasan; perbandingan tergantung organ", () => {
    const ventrikelKanan = bagianById(3);
    const paruKanan = bagianById(9);
    if (!ventrikelKanan || !paruKanan) throw new Error("data uji tidak ada");
    expect(susunJawaban("ceritakan dong", ventrikelKanan)).toMatch(/pompa jarak dekat/);
    expect(susunJawaban("apa bedanya?", ventrikelKanan)).toMatch(/sisi kanan jantung/);
    expect(susunJawaban("apa bedanya?", paruKanan)).toMatch(/tiga lobus/);
  });

  it("bagian tanpa label dimmed diberi saran membuka bagian lain", () => {
    const ventrikelKanan = bagianById(3);
    if (!ventrikelKanan) throw new Error("data uji tidak ada");
    expect(susunJawaban("fungsi", ventrikelKanan)).toMatch(/Bagian lain pada model/);
  });
});
