import { describe, expect, it } from "vitest";
import { formatDurasi, formatWaktu, sapaan } from "@/lib/format";
import { cn } from "@/lib/utils";
import { alert, badge, bubble, input, kartu, tab, toggleLayer, tombol } from "@/lib/variants";

describe("format", () => {
  it("formatDurasi", () => {
    expect(formatDurasi(0)).toBe("-");
    expect(formatDurasi(45)).toBe("45 detik");
    expect(formatDurasi(125)).toBe("2 menit 5 detik");
  });
  it("formatWaktu memakai zona Asia/Jakarta", () => {
    expect(formatWaktu("2026-09-19T01:05:00.000Z")).toMatch(/19 Sep 2026/);
    expect(formatWaktu("2026-09-19T01:05:00.000Z")).toMatch(/08[.:]05/);
  });
  it("sapaan menurut jam", () => {
    expect(sapaan(6)).toBe("Selamat pagi");
    expect(sapaan(12)).toBe("Selamat siang");
    expect(sapaan(16)).toBe("Selamat sore");
    expect(sapaan(21)).toBe("Selamat malam");
  });
});

describe("varian CVA", () => {
  it("tombol memakai default dan varian yang diminta", () => {
    expect(tombol()).toContain("bg-biru");
    expect(tombol({ variant: "sekunder", ukuran: "sm", lebar: "penuh" })).toMatch(/bg-neutral-900.*px-3\.5.*w-full/);
  });
  it("badge, kartu, bubble, toggleLayer, alert, input, tab", () => {
    expect(badge({ status: "tervalidasi" })).toContain("bg-emerald-100");
    expect(kartu({ nada: "brand", padding: "lg" })).toMatch(/bg-biru.*p-6/);
    expect(bubble({ peran: "user" })).toContain("ml-auto");
    expect(toggleLayer({ aktif: true })).toContain("bg-neutral-900");
    expect(alert({ tipe: "error" })).toContain("text-rose-700");
    expect(input({ keadaan: "salah" })).toContain("ring-rose-400");
    expect(tab({ terpilih: true })).toContain("text-white");
  });
  it("cn menggabungkan dan menyelesaikan konflik Tailwind", () => {
    expect(cn("p-4", "p-6", false && "hidden", "text-sm")).toBe("p-6 text-sm");
  });
});
