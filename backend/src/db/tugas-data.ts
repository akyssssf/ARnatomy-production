/* ==========================================================================
   tugas-data.ts — Isi tugas belajar awal: kuis dan simulasi alur untuk
   jantung (peredaran darah) dan paru-paru (pernapasan). Materi mengikuti
   buku acuan RAG; admin dapat mengubah soal lewat API. Kunci `kode` pada
   langkah simulasi dipakai klien untuk menempatkan animasi di diagram.
   ========================================================================== */

export interface SoalAwal {
  pertanyaan: string;
  pilihan: string[];
  jawaban_benar: number;
  penjelasan: string;
}
export interface LangkahAwal {
  kode: string;
  judul: string;
  deskripsi: string;
  id_bagian: number | null;
}
export interface TugasAwal {
  jenis: "kuis" | "simulasi" | "rakit";
  id_organ: number;
  judul: string;
  deskripsi: string;
  soal?: SoalAwal[];
  langkah?: LangkahAwal[];
}

export const TUGAS_AWAL: TugasAwal[] = [
  {
    jenis: "kuis",
    id_organ: 1,
    judul: "Kuis Jantung",
    deskripsi: "Delapan soal tentang ruang, katup, dan pembuluh jantung. Lulus bila skor minimal 70.",
    soal: [
      {
        pertanyaan: "Berapa jumlah ruang jantung manusia?",
        pilihan: ["Dua", "Tiga", "Empat", "Lima"],
        jawaban_benar: 2,
        penjelasan: "Jantung punya empat ruang: dua serambi (atrium) di atas dan dua bilik (ventrikel) di bawah.",
      },
      {
        pertanyaan: "Ruang jantung manakah yang menerima darah miskin oksigen dari seluruh tubuh?",
        pilihan: ["Atrium kanan", "Atrium kiri", "Ventrikel kanan", "Ventrikel kiri"],
        jawaban_benar: 0,
        penjelasan: "Darah dari seluruh tubuh kembali lewat vena kava ke atrium kanan.",
      },
      {
        pertanyaan: "Pembuluh yang membawa darah kaya oksigen dari jantung ke seluruh tubuh adalah …",
        pilihan: ["Vena kava", "Arteri pulmonalis", "Aorta", "Vena pulmonalis"],
        jawaban_benar: 2,
        penjelasan:
          "Aorta adalah arteri terbesar; ia keluar dari ventrikel kiri dan mengalirkan darah beroksigen ke tubuh.",
      },
      {
        pertanyaan: "Katup yang terletak di antara atrium kiri dan ventrikel kiri adalah …",
        pilihan: ["Katup trikuspid", "Katup mitral (bikuspid)", "Katup pulmonal", "Katup aorta"],
        jawaban_benar: 1,
        penjelasan: "Katup mitral mencegah darah mengalir balik dari ventrikel kiri ke atrium kiri.",
      },
      {
        pertanyaan: "Ruang jantung dengan dinding otot paling tebal adalah …",
        pilihan: ["Atrium kanan", "Atrium kiri", "Ventrikel kanan", "Ventrikel kiri"],
        jawaban_benar: 3,
        penjelasan: "Ventrikel kiri memompa darah ke seluruh tubuh sehingga membutuhkan dinding paling tebal.",
      },
      {
        pertanyaan: "Darah dari jantung menuju paru-paru melalui …",
        pilihan: ["Aorta", "Vena kava", "Arteri pulmonalis", "Vena pulmonalis"],
        jawaban_benar: 2,
        penjelasan: "Arteri pulmonalis keluar dari ventrikel kanan dan membawa darah miskin oksigen ke paru-paru.",
      },
      {
        pertanyaan: "Peredaran darah kecil (pulmonal) adalah jalur darah dari …",
        pilihan: [
          "Ventrikel kiri ke seluruh tubuh lalu ke atrium kanan",
          "Ventrikel kanan ke paru-paru lalu ke atrium kiri",
          "Atrium kanan langsung ke atrium kiri",
          "Ventrikel kiri ke paru-paru lalu ke atrium kanan",
        ],
        jawaban_benar: 1,
        penjelasan: "Darah dipompa ventrikel kanan ke paru-paru untuk mengambil oksigen, lalu kembali ke atrium kiri.",
      },
      {
        pertanyaan: "Apa kekhasan vena pulmonalis?",
        pilihan: [
          "Membawa darah miskin oksigen ke paru-paru",
          "Membawa darah kaya oksigen dari paru-paru ke atrium kiri",
          "Membawa darah dari tubuh ke atrium kanan",
          "Keluar dari ventrikel kiri",
        ],
        jawaban_benar: 1,
        penjelasan:
          "Vena umumnya membawa darah miskin oksigen, tetapi vena pulmonalis membawa darah kaya oksigen dari paru-paru.",
      },
    ],
  },
  {
    jenis: "kuis",
    id_organ: 2,
    judul: "Kuis Paru-paru dan Pernapasan",
    deskripsi: "Delapan soal tentang jalur udara, pertukaran gas, dan mekanisme bernapas. Lulus bila skor minimal 70.",
    soal: [
      {
        pertanyaan: "Di bagian manakah pertukaran oksigen dan karbon dioksida terjadi?",
        pilihan: ["Trakea", "Bronkus", "Alveolus", "Laring"],
        jawaban_benar: 2,
        penjelasan: "Alveolus adalah kantong udara kecil berdinding tipis yang dikelilingi kapiler darah.",
      },
      {
        pertanyaan: "Otot utama yang berkontraksi saat menarik napas adalah …",
        pilihan: ["Diafragma", "Otot jantung", "Otot dahi", "Otot lengan"],
        jawaban_benar: 0,
        penjelasan: "Diafragma berkontraksi dan turun sehingga rongga dada membesar dan udara masuk.",
      },
      {
        pertanyaan: "Urutan jalur udara yang benar saat menarik napas adalah …",
        pilihan: [
          "Hidung, trakea, faring, bronkus",
          "Hidung, faring, laring, trakea",
          "Hidung, laring, faring, trakea",
          "Hidung, bronkus, trakea, alveolus",
        ],
        jawaban_benar: 1,
        penjelasan: "Udara melewati hidung, faring, laring, trakea, bronkus, bronkiolus, lalu alveolus.",
      },
      {
        pertanyaan: "Mengapa trakea ditopang cincin tulang rawan berbentuk huruf C?",
        pilihan: [
          "Agar saluran tetap terbuka dan tidak menguncup",
          "Agar menghasilkan suara",
          "Agar menghasilkan lendir",
          "Agar menyaring debu",
        ],
        jawaban_benar: 0,
        penjelasan: "Cincin tulang rawan menjaga trakea tetap terbuka sehingga udara selalu dapat lewat.",
      },
      {
        pertanyaan: "Berapa lobus (bagian) yang dimiliki paru-paru kanan?",
        pilihan: ["Dua", "Tiga", "Empat", "Lima"],
        jawaban_benar: 1,
        penjelasan:
          "Paru-paru kanan memiliki tiga lobus, sedangkan paru-paru kiri dua lobus karena berbagi ruang dengan jantung.",
      },
      {
        pertanyaan: "Gas apa yang berpindah dari alveolus ke darah?",
        pilihan: ["Karbon dioksida", "Nitrogen", "Oksigen", "Uap air"],
        jawaban_benar: 2,
        penjelasan:
          "Oksigen berdifusi dari alveolus ke kapiler, sedangkan karbon dioksida berpindah ke arah sebaliknya.",
      },
      {
        pertanyaan: "Saat menghembuskan napas secara biasa, diafragma …",
        pilihan: ["berkontraksi dan turun", "berelaksasi dan naik", "berhenti bergerak", "menjadi tebal dan datar"],
        jawaban_benar: 1,
        penjelasan: "Diafragma berelaksasi dan naik sehingga rongga dada mengecil dan udara terdorong keluar.",
      },
      {
        pertanyaan: "Mengapa dinding alveolus sangat tipis dan dikelilingi kapiler?",
        pilihan: [
          "Agar mudah pecah",
          "Agar difusi gas berlangsung cepat",
          "Agar dapat menyimpan banyak udara",
          "Agar menghasilkan lendir",
        ],
        jawaban_benar: 1,
        penjelasan: "Jarak yang sangat dekat antara udara dan darah memungkinkan gas berpindah dengan cepat.",
      },
    ],
  },
  {
    jenis: "simulasi",
    id_organ: 1,
    judul: "Simulasi Peredaran Darah",
    deskripsi:
      "Ikuti satu sel darah dari vena kava, melewati jantung dan paru-paru, sampai kembali ke seluruh tubuh. Lalu urutkan sendiri alurnya.",
    langkah: [
      {
        kode: "vena_kava",
        judul: "Vena kava",
        deskripsi: "Darah miskin oksigen dari seluruh tubuh dikumpulkan vena kava dan mengalir ke jantung.",
        id_bagian: null,
      },
      {
        kode: "atrium_kanan",
        judul: "Atrium kanan",
        deskripsi: "Atrium kanan menerima darah miskin oksigen dari vena kava.",
        id_bagian: 1,
      },
      {
        kode: "katup_trikuspid",
        judul: "Katup trikuspid",
        deskripsi:
          "Katup trikuspid terbuka dan mengalirkan darah ke ventrikel kanan, lalu menutup agar darah tidak kembali.",
        id_bagian: null,
      },
      {
        kode: "ventrikel_kanan",
        judul: "Ventrikel kanan",
        deskripsi: "Ventrikel kanan berkontraksi dan memompa darah menuju paru-paru.",
        id_bagian: 3,
      },
      {
        kode: "arteri_pulmonalis",
        judul: "Arteri pulmonalis",
        deskripsi: "Darah miskin oksigen mengalir lewat katup pulmonal dan arteri pulmonalis menuju paru-paru.",
        id_bagian: null,
      },
      {
        kode: "paru_paru",
        judul: "Paru-paru",
        deskripsi: "Di kapiler paru-paru, darah melepas karbon dioksida dan mengambil oksigen.",
        id_bagian: null,
      },
      {
        kode: "vena_pulmonalis",
        judul: "Vena pulmonalis",
        deskripsi: "Darah kaya oksigen kembali ke jantung lewat vena pulmonalis.",
        id_bagian: null,
      },
      {
        kode: "atrium_kiri",
        judul: "Atrium kiri",
        deskripsi: "Atrium kiri menerima darah kaya oksigen dari paru-paru.",
        id_bagian: 2,
      },
      {
        kode: "katup_mitral",
        judul: "Katup mitral",
        deskripsi: "Katup mitral terbuka sehingga darah mengalir ke ventrikel kiri, lalu menutup.",
        id_bagian: 6,
      },
      {
        kode: "ventrikel_kiri",
        judul: "Ventrikel kiri",
        deskripsi: "Ventrikel kiri yang berdinding paling tebal memompa darah dengan tekanan tinggi.",
        id_bagian: 4,
      },
      {
        kode: "aorta",
        judul: "Aorta",
        deskripsi: "Darah kaya oksigen keluar lewat katup aorta ke aorta, arteri terbesar tubuh.",
        id_bagian: 5,
      },
      {
        kode: "seluruh_tubuh",
        judul: "Seluruh tubuh",
        deskripsi: "Darah menyalurkan oksigen ke jaringan, lalu kembali miskin oksigen ke vena kava. Siklus berulang.",
        id_bagian: null,
      },
    ],
  },
  {
    jenis: "simulasi",
    id_organ: 2,
    judul: "Simulasi Pernapasan",
    deskripsi:
      "Ikuti perjalanan udara dari hidung sampai alveolus, pertukaran gasnya, dan cara paru-paru mengeluarkan karbon dioksida. Lalu urutkan sendiri alurnya.",
    langkah: [
      {
        kode: "diafragma",
        judul: "Diafragma berkontraksi",
        deskripsi: "Saat menarik napas, diafragma berkontraksi dan turun sehingga rongga dada membesar.",
        id_bagian: null,
      },
      {
        kode: "hidung",
        judul: "Hidung",
        deskripsi: "Udara masuk lewat hidung; rambut dan lendir menyaring debu serta menghangatkan udara.",
        id_bagian: null,
      },
      {
        kode: "faring",
        judul: "Faring",
        deskripsi: "Udara melewati faring (tekak), persimpangan jalur napas dan jalur makanan.",
        id_bagian: null,
      },
      {
        kode: "laring",
        judul: "Laring",
        deskripsi: "Laring (pangkal tenggorok) menjaga agar makanan tidak masuk ke saluran napas.",
        id_bagian: null,
      },
      {
        kode: "trakea",
        judul: "Trakea",
        deskripsi: "Trakea (batang tenggorok) ditopang cincin tulang rawan berbentuk C sehingga tetap terbuka.",
        id_bagian: 7,
      },
      {
        kode: "bronkus",
        judul: "Bronkus",
        deskripsi: "Trakea bercabang menjadi dua bronkus, masing-masing menuju paru-paru kanan dan kiri.",
        id_bagian: 8,
      },
      {
        kode: "bronkiolus",
        judul: "Bronkiolus",
        deskripsi: "Bronkus bercabang menjadi saluran-saluran kecil bernama bronkiolus.",
        id_bagian: null,
      },
      {
        kode: "alveolus",
        judul: "Alveolus",
        deskripsi: "Bronkiolus berujung pada alveolus, kantong udara kecil berdinding sangat tipis.",
        id_bagian: 12,
      },
      {
        kode: "kapiler",
        judul: "Pertukaran gas",
        deskripsi: "Oksigen berdifusi dari alveolus ke kapiler darah, karbon dioksida berdifusi sebaliknya.",
        id_bagian: null,
      },
      {
        kode: "ekspirasi",
        judul: "Menghembuskan napas",
        deskripsi: "Diafragma berelaksasi dan naik; udara kaya karbon dioksida terdorong keluar lewat jalur yang sama.",
        id_bagian: null,
      },
    ],
  },
  {
    jenis: "rakit",
    id_organ: 1,
    judul: "Rakit Jantung",
    deskripsi:
      "Jantung terurai menjadi 10 bagian. Seret tiap bagian ke posisinya di model 3D hingga jantung utuh kembali. Lulus bila skor minimal 70.",
    langkah: [
      {
        kode: "atrium_kanan",
        judul: "Atrium kanan",
        deskripsi: "Serambi kanan: menerima darah miskin oksigen dari vena kava.",
        id_bagian: 1,
      },
      {
        kode: "atrium_kiri",
        judul: "Atrium kiri",
        deskripsi: "Serambi kiri: menerima darah kaya oksigen dari paru-paru lewat vena pulmonalis.",
        id_bagian: 2,
      },
      {
        kode: "ventrikel_kanan",
        judul: "Ventrikel kanan",
        deskripsi: "Bilik kanan: memompa darah ke paru-paru lewat arteri pulmonalis.",
        id_bagian: 3,
      },
      {
        kode: "ventrikel_kiri",
        judul: "Ventrikel kiri",
        deskripsi: "Bilik kiri berdinding paling tebal: memompa darah ke seluruh tubuh lewat aorta.",
        id_bagian: 4,
      },
      {
        kode: "septum",
        judul: "Septum (sekat bilik)",
        deskripsi: "Sekat otot antara bilik kanan dan kiri; mencegah darah miskin dan kaya oksigen bercampur.",
        id_bagian: null,
      },
      {
        kode: "aorta",
        judul: "Aorta dan pembuluh koroner",
        deskripsi:
          "Arteri terbesar yang membawa darah kaya oksigen; arteri koroner di permukaan jantung memberi makan otot jantung.",
        id_bagian: 5,
      },
      {
        kode: "arteri_pulmonalis",
        judul: "Arteri pulmonalis",
        deskripsi: "Membawa darah miskin oksigen dari ventrikel kanan ke paru-paru.",
        id_bagian: null,
      },
      {
        kode: "vena_pulmonalis",
        judul: "Vena pulmonalis",
        deskripsi: "Empat pembuluh yang membawa darah kaya oksigen dari paru-paru ke atrium kiri.",
        id_bagian: null,
      },
      {
        kode: "vena_kava",
        judul: "Vena kava",
        deskripsi: "Vena besar (atas dan bawah) yang membawa darah miskin oksigen dari tubuh ke atrium kanan.",
        id_bagian: null,
      },
      {
        kode: "katup",
        judul: "Empat katup jantung",
        deskripsi: "Trikuspid, mitral, pulmonal, dan aorta: memastikan darah mengalir satu arah.",
        id_bagian: 6,
      },
    ],
  },
  {
    jenis: "rakit",
    id_organ: 2,
    judul: "Rakit Paru-paru",
    deskripsi:
      "Paru-paru dan saluran napas terurai menjadi 7 bagian. Seret tiap bagian ke posisinya hingga sistem pernapasan utuh kembali. Lulus bila skor minimal 70.",
    langkah: [
      {
        kode: "lobus_kiri_atas",
        judul: "Lobus atas paru kiri",
        deskripsi: "Paru kiri hanya punya dua lobus karena berbagi ruang dengan jantung.",
        id_bagian: 10,
      },
      {
        kode: "lobus_kiri_bawah",
        judul: "Lobus bawah paru kiri",
        deskripsi: "Lobus bawah paru kiri, tempat banyak alveolus untuk pertukaran gas.",
        id_bagian: 10,
      },
      {
        kode: "lobus_kanan_atas",
        judul: "Lobus atas paru kanan",
        deskripsi: "Paru kanan memiliki tiga lobus; ini yang paling atas.",
        id_bagian: 9,
      },
      {
        kode: "lobus_kanan_tengah",
        judul: "Lobus tengah paru kanan",
        deskripsi: "Lobus yang hanya dimiliki paru kanan.",
        id_bagian: 9,
      },
      {
        kode: "lobus_kanan_bawah",
        judul: "Lobus bawah paru kanan",
        deskripsi: "Lobus bawah paru kanan, termasuk lobus yang terbesar.",
        id_bagian: 11,
      },
      {
        kode: "bronkus",
        judul: "Bronkus dan percabangannya",
        deskripsi: "Trakea bercabang menjadi dua bronkus utama, lalu bronkus yang makin kecil hingga bronkiolus.",
        id_bagian: 8,
      },
      {
        kode: "trakea",
        judul: "Trakea",
        deskripsi: "Batang tenggorok dengan cincin tulang rawan berbentuk C agar tetap terbuka.",
        id_bagian: 7,
      },
    ],
  },
];
