"use client";

/* Client: percakapan Asisten AI (FR-08, TC-07).
   - useAiConversations(): useQuery riwayat + useMutation kirim (invalidasi).
   - Checkbox "simulasikan gagal" = client UI state (Zustand) yang ikut
     dikirim ke endpoint agar jalur error bisa didemokan.
   - Status async: bubble "sedang mengetik" (pending), role="alert" + tombol
     Coba lagi (error), sapaan konteks (empty). */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Ikon } from "@/components/ui/Ikon";
import { Spinner } from "@/components/ui/Spinner";
import { useAiConversations } from "@/hooks/useAiConversations";
import { formatWaktu } from "@/lib/format";
import { GalatApi } from "@/lib/mock-api";
import { type BagianId, type BodyPart, PertanyaanFormSchema } from "@/lib/schemas";
import { alert, bubble, input, kartu, tombol } from "@/lib/variants";
import { useUIStore } from "@/store/useUIStore";

const SARAN = [
  "Apa fungsi bagian ini?",
  "Di mana letaknya?",
  "Gangguan apa yang bisa terjadi?",
  "Apa bedanya dengan sisi jantung yang lain?",
];

function Bubble({ peran, isi, waktu }: { peran: "user" | "ai"; isi: string; waktu?: string }) {
  return (
    <li className="flex items-end gap-2">
      <div className={bubble({ peran })}>
        <p>{isi}</p>
        {waktu && <p className="mt-1 text-[10px] opacity-70">{formatWaktu(waktu)}</p>}
      </div>
    </li>
  );
}

export function ChatAsisten({
  bagian,
  opsiKonteks,
  idBagianAwal,
}: {
  bagian: BodyPart[];
  /* <option>/<optgroup> dirender di server (OpsiKonteks) */
  opsiKonteks: React.ReactNode;
  idBagianAwal: BagianId | null;
}) {
  const { daftar, kirim } = useAiConversations();
  const simulasiGagal = useUIStore((s) => s.simulasiGagal);
  const setSimulasiGagal = useUIStore((s) => s.setSimulasiGagal);
  const [idKonteks, setIdKonteks] = useState<BagianId | null>(idBagianAwal);
  const [teks, setTeks] = useState("");
  const [galatForm, setGalatForm] = useState<string | null>(null);
  const [pertanyaanGagal, setPertanyaanGagal] = useState<string | null>(null);
  const daftarRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const konteks = bagian.find((b) => b.id_bagian === idKonteks) ?? null;
  const jumlahPesan = daftar.data?.length ?? 0;

  /* Gulir ke pesan terbaru setiap daftar berubah atau mutasi berjalan */
  // biome-ignore lint/correctness/useExhaustiveDependencies: efek sengaja dijalankan ulang saat jumlah pesan / status kirim berubah
  useEffect(() => {
    const el = daftarRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [jumlahPesan, kirim.isPending]);

  useEffect(() => {
    if (idBagianAwal) inputRef.current?.focus();
  }, [idBagianAwal]);

  async function kirimPertanyaan(pertanyaan: string) {
    setGalatForm(null);
    setPertanyaanGagal(null);
    try {
      await kirim.mutateAsync({ pertanyaan, id_bagian: idKonteks, simulasiGagal });
      setTeks("");
    } catch (kesalahan) {
      setPertanyaanGagal(pertanyaan);
      setGalatForm(kesalahan instanceof GalatApi ? kesalahan.message : "galat tidak dikenal.");
    } finally {
      inputRef.current?.focus();
    }
  }

  function saatSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const hasil = PertanyaanFormSchema.safeParse({ pertanyaan: teks, id_bagian: idKonteks });
    if (!hasil.success) {
      setGalatForm(hasil.error.issues[0]?.message ?? "Pertanyaan tidak valid.");
      inputRef.current?.focus();
      return;
    }
    void kirimPertanyaan(hasil.data.pertanyaan);
  }

  return (
    <>
      <div className={`${kartu({ padding: "md" })} mb-3`}>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[12rem] flex-1">
            <label htmlFor="pilih-konteks" className="mikro mb-2 block">
              Konteks bagian tubuh
            </label>
            <select
              id="pilih-konteks"
              value={idKonteks ?? ""}
              onChange={(e) =>
                setIdKonteks(bagian.find((b) => b.id_bagian === Number(e.target.value))?.id_bagian ?? null)
              }
              className={input()}
            >
              {opsiKonteks}
            </select>
          </div>
          <Link
            href={konteks ? { pathname: "/eksplorasi", query: { organ: konteks.id_organ } } : "/eksplorasi"}
            className={tombol({ variant: "sekunder", ukuran: "sm" })}
          >
            <Ikon nama="jantung" />
            Kembali ke model
          </Link>
        </div>
        <label
          htmlFor="simulasi-gagal"
          className="mt-3 flex items-center gap-2 rounded-xl bg-abu px-3 py-2 text-xs text-neutral-500"
        >
          <Checkbox
            id="simulasi-gagal"
            checked={simulasiGagal}
            onCheckedChange={(nilai) => setSimulasiGagal(nilai === true)}
          />
          Simulasikan koneksi gagal untuk menguji penanganan error (berlaku juga untuk laporan kesalahan)
        </label>
      </div>

      <div className={`${kartu({ padding: "md" })} mt-4 flex h-[26rem] flex-col sm:h-[30rem]`}>
        <ul
          ref={daftarRef}
          aria-live="polite"
          aria-atomic="false"
          aria-label="Riwayat percakapan dengan asisten AI"
          className="flex-1 space-y-2 overflow-y-auto pr-1"
        >
          <Bubble
            peran="ai"
            isi={
              konteks
                ? `Konteks saat ini: ${konteks.nama_bagian_internal}. Silakan ajukan pertanyaan.`
                : "Pilih dulu bagian tubuh di atas supaya jawabannya nyambung."
            }
          />
          {daftar.isPending && (
            <li className="flex items-end gap-2">
              <div className={bubble({ peran: "sistem" })}>
                <Spinner kelas="h-3 w-3" /> Memuat riwayat percakapan
              </div>
            </li>
          )}
          {daftar.isError && (
            <li className="flex items-end gap-2">
              <div className={bubble({ peran: "sistem" })}>Riwayat gagal dimuat: {daftar.error.message}</div>
            </li>
          )}
          {daftar.data?.map((p) => (
            <span key={p.id_percakapan} className="contents">
              <Bubble peran="user" isi={p.pertanyaan} waktu={p.waktu} />
              <Bubble peran="ai" isi={p.jawaban} waktu={p.waktu} />
            </span>
          ))}
          {kirim.isPending && kirim.variables && (
            <>
              <Bubble peran="user" isi={kirim.variables.pertanyaan} />
              <li className="flex items-end gap-2">
                <div className={bubble({ peran: "ai" })}>
                  <span className="text-xs text-neutral-400">Asisten sedang mengetik...</span>
                </div>
              </li>
            </>
          )}
        </ul>

        {galatForm && (
          <div
            role="alert"
            aria-live="assertive"
            className={`${alert({ tipe: pertanyaanGagal ? "error" : "info" })} mt-3 items-center justify-between`}
          >
            <span>{pertanyaanGagal ? `Gagal memuat jawaban: ${galatForm}` : galatForm}</span>
            {pertanyaanGagal && (
              <button
                type="button"
                onClick={() => kirimPertanyaan(pertanyaanGagal)}
                className={tombol({ variant: "sekunder", ukuran: "sm" })}
              >
                Coba lagi
              </button>
            )}
          </div>
        )}

        <ul className="mt-3 flex flex-wrap gap-2">
          {SARAN.map((s) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => {
                  setTeks(s);
                  inputRef.current?.focus();
                }}
                className="rounded-full bg-abu px-3 py-1.5 text-xs font-medium text-neutral-500 transition hover:bg-neutral-900 hover:text-white"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>

        <form onSubmit={saatSubmit} className="mt-3 flex items-end gap-2 border-t border-black/5 pt-3">
          <div className="flex-1">
            <label htmlFor="input-pertanyaan" className="sr-only">
              Tulis pertanyaan untuk asisten AI
            </label>
            <textarea
              id="input-pertanyaan"
              ref={inputRef}
              rows={2}
              value={teks}
              onChange={(e) => setTeks(e.target.value)}
              disabled={kirim.isPending}
              placeholder="Tulis pertanyaan, tekan Enter untuk mengirim"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              className={`${input()} resize-none`}
            />
          </div>
          <button type="submit" disabled={kirim.isPending} className={tombol({ ukuran: "md" })}>
            {kirim.isPending ? <Spinner /> : <Ikon nama="kirim" />}Kirim
          </button>
        </form>
      </div>
    </>
  );
}
