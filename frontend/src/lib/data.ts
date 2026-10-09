/* ==========================================================================
   data.ts — Data awal (seed) mengikuti kamus data SKPL Bab VI.
   Data master (users, sistem_organ, organs, layers, body_parts) bersifat
   statis dan boleh dibaca langsung oleh Server Component. Setiap array
   diparse dengan skema Zod saat modul dimuat, jadi data seed yang salah
   bentuk langsung ketahuan waktu build/dev, bukan di runtime pengguna.
   ========================================================================== */
import { z } from "zod";
import type { BodyPart, Layer, Organ } from "./schemas";
import { BodyPartSchema, LayerSchema, OrganSchema, PartContentSchema, SistemOrganSchema, UserSchema } from "./schemas";

/* Akun demo. Kolom password di sini hanya sumber untuk di-hash (PBKDF2) saat
   basis data mock pertama diakses (lib/db.ts); yang disimpan dan dibandingkan
   saat login adalah hash-nya (NFR-01). */
export const users = z.array(UserSchema).parse([
  {
    id_user: 1,
    nama: "Nehan Raki Alfawzi",
    email: "siswa@arnatomy.id",
    password: "siswa123",
    role: "siswa",
    asal_sekolah: "SMPN 1 Madiun",
  },
  {
    id_user: 2,
    nama: "Bu Ratna, S.Pd.",
    email: "guru@arnatomy.id",
    password: "guru123",
    role: "guru",
    asal_sekolah: "SMAN 2 Madiun",
  },
  {
    id_user: 3,
    nama: "Admin Konten",
    email: "admin@arnatomy.id",
    password: "admin123",
    role: "admin",
    asal_sekolah: null,
  },
]);

/* Katalog sistem organ. Status 'segera' belum punya model dan konten. */
export const sistem_organ = z.array(SistemOrganSchema).parse([
  {
    id_sistem: 1,
    nama: "Sistem Peredaran Darah",
    id_organ: 1,
    status: "tersedia",
    organ: "Jantung",
    gambar: "/img/jantung.webp",
  },
  {
    id_sistem: 2,
    nama: "Sistem Pernapasan",
    id_organ: 2,
    status: "tersedia",
    organ: "Paru-paru",
    gambar: "/img/paru.webp",
  },
  { id_sistem: 3, nama: "Sistem Saraf", id_organ: null, status: "segera", organ: "Otak", gambar: "/img/otak.webp" },
  {
    id_sistem: 4,
    nama: "Sistem Pencernaan",
    id_organ: null,
    status: "segera",
    organ: "Usus",
    gambar: "/img/usus.webp",
  },
  {
    id_sistem: 5,
    nama: "Sistem Ekskresi",
    id_organ: null,
    status: "segera",
    organ: "Ginjal",
    gambar: "/img/ginjal.webp",
  },
  {
    id_sistem: 6,
    nama: "Sistem Endokrin",
    id_organ: null,
    status: "segera",
    organ: "Pankreas",
    gambar: "/img/pankreas.webp",
  },
  { id_sistem: 7, nama: "Sistem Indra", id_organ: null, status: "segera", organ: "Mata", gambar: "/img/mata.webp" },
  {
    id_sistem: 8,
    nama: "Sistem Integumen",
    id_organ: null,
    status: "segera",
    organ: "Kulit",
    gambar: "/img/kulit.webp",
  },
]);

export const organs = z.array(OrganSchema).parse([
  {
    id_organ: 1,
    nama_organ: "Jantung",
    sistem_organ: "Sistem Peredaran Darah",
    julukan: "Pompa yang tidak pernah libur",
    file_model_3d: "/models/heart.glb",
    gambar: "/img/jantung.webp",
    deskripsi:
      "Organ berotot seukuran kepalan tangan yang memompa darah ke seluruh tubuh, " +
      "mengantar oksigen dan zat gizi ke setiap sel, lalu membawa pulang karbon dioksida untuk dibuang.",
    fakta: [
      { label: "Ukuran", nilai: "Sebesar kepalan tangan pemiliknya" },
      { label: "Berat", nilai: "250 sampai 350 gram" },
      { label: "Denyut", nilai: "Sekitar 100.000 kali per hari" },
      { label: "Letak", nilai: "Di belakang tulang dada, condong ke kiri" },
      { label: "Suplai darah", nilai: "Arteri koroner kiri dan kanan" },
      { label: "Jumlah ruang", nilai: "4 ruang, 4 katup" },
    ],
  },
  {
    id_organ: 2,
    nama_organ: "Paru-paru",
    sistem_organ: "Sistem Pernapasan",
    julukan: "Pintu masuk oksigen",
    file_model_3d: "/models/lungs.glb",
    gambar: "/img/paru.webp",
    deskripsi:
      "Sepasang organ berongga di rongga dada tempat udara yang dihirup bertukar gas dengan darah: " +
      "oksigen masuk ke pembuluh kapiler, karbon dioksida dilepas untuk dihembuskan.",
    fakta: [
      { label: "Berat", nilai: "Sekitar 1,1 kg untuk sepasang" },
      { label: "Kapasitas", nilai: "Sekitar 6 liter udara" },
      { label: "Frekuensi", nilai: "12 sampai 20 napas per menit" },
      { label: "Letak", nilai: "Rongga dada, dilindungi tulang rusuk" },
      { label: "Lobus", nilai: "3 di paru kanan, 2 di paru kiri" },
      { label: "Luas alveolus", nilai: "Sekitar 70 meter persegi" },
    ],
  },
]);

/* Urutan render layer dari luar ke dalam (SKPL: tabel layers) */
export const layers = z.array(LayerSchema).parse([
  { id_layer: 1, id_organ: 1, nama_layer: "kulit", label: "Kulit", urutan_tampil: 1 },
  { id_layer: 2, id_organ: 1, nama_layer: "otot", label: "Otot", urutan_tampil: 2 },
  { id_layer: 3, id_organ: 1, nama_layer: "tulang", label: "Tulang", urutan_tampil: 3 },
  { id_layer: 4, id_organ: 1, nama_layer: "organ_dalam", label: "Organ Dalam", urutan_tampil: 4 },
  { id_layer: 5, id_organ: 2, nama_layer: "kulit", label: "Kulit", urutan_tampil: 1 },
  { id_layer: 6, id_organ: 2, nama_layer: "otot", label: "Otot", urutan_tampil: 2 },
  { id_layer: 7, id_organ: 2, nama_layer: "tulang", label: "Tulang", urutan_tampil: 3 },
  { id_layer: 8, id_organ: 2, nama_layer: "organ_dalam", label: "Organ Dalam", urutan_tampil: 4 },
]);

/* mesh_3d = nama node pada model HRA (HuBMAP Human Reference Atlas) yang
   membentuk bagian ini. posisi_koordinat_3d "x,y,z" (pecahan kotak batas
   model) hanya cadangan bila nama node tidak ditemukan; posisi_2d dipakai
   gambar cadangan bila WebGL atau model gagal dimuat. */
export const body_parts = z.array(BodyPartSchema).parse([
  /* ---- Jantung ---- */
  {
    id_bagian: 1,
    id_organ: 1,
    nama_bagian_internal: "Atrium Kanan",
    parent_bagian_id: null,
    posisi_koordinat_3d: "-0.213,-0.023,0.012",
    posisi_2d: "35,52",
    mesh_3d: ["VH_M_right_cardiac_atrium"],
    fakta: [
      { label: "Tebal dinding", nilai: "Sekitar 2 mm" },
      { label: "Menerima dari", nilai: "Vena cava superior dan inferior" },
      { label: "Mengalir ke", nilai: "Ventrikel kanan" },
    ],
  },
  {
    id_bagian: 2,
    id_organ: 1,
    nama_bagian_internal: "Atrium Kiri",
    parent_bagian_id: null,
    posisi_koordinat_3d: "-0.085,0.046,-0.141",
    posisi_2d: "44,46",
    mesh_3d: ["VH_M_left_cardiac_atrium"],
    fakta: [
      { label: "Menerima dari", nilai: "Empat vena pulmonalis" },
      { label: "Mengalir ke", nilai: "Ventrikel kiri" },
      { label: "Posisi", nilai: "Ruang jantung paling belakang" },
    ],
  },
  {
    id_bagian: 3,
    id_organ: 1,
    nama_bagian_internal: "Ventrikel Kanan",
    parent_bagian_id: null,
    posisi_koordinat_3d: "-0.006,-0.074,0.148",
    posisi_2d: "50,56",
    mesh_3d: ["VH_M_heart_right_ventricle"],
    fakta: [
      { label: "Tebal dinding", nilai: "3 sampai 5 mm" },
      { label: "Memompa ke", nilai: "Paru-paru lewat arteri pulmonalis" },
      { label: "Tekanan", nilai: "Sekitar 25 mmHg" },
    ],
  },
  {
    id_bagian: 4,
    id_organ: 1,
    nama_bagian_internal: "Ventrikel Kiri",
    parent_bagian_id: null,
    posisi_koordinat_3d: "0.142,-0.121,0.054",
    posisi_2d: "60,59",
    mesh_3d: ["VH_M_heart_left_ventricle"],
    fakta: [
      { label: "Tebal dinding", nilai: "8 sampai 15 mm" },
      { label: "Memompa ke", nilai: "Seluruh tubuh lewat aorta" },
      { label: "Tekanan", nilai: "Sekitar 120 mmHg" },
    ],
  },
  {
    id_bagian: 5,
    id_organ: 1,
    nama_bagian_internal: "Aorta",
    parent_bagian_id: null,
    posisi_koordinat_3d: "-0.104,0.294,-0.088",
    posisi_2d: "44,30",
    mesh_3d: ["VH_M_ascending_aorta", "VH_M_aortic_arch"],
    fakta: [
      { label: "Diameter", nilai: "2,5 sampai 3,5 cm" },
      { label: "Jenis", nilai: "Arteri terbesar dalam tubuh" },
      { label: "Bagian", nilai: "Aorta asenden, arkus, aorta desenden" },
    ],
  },
  {
    id_bagian: 6,
    id_organ: 1,
    nama_bagian_internal: "Katup Mitral",
    parent_bagian_id: 2,
    posisi_koordinat_3d: "0.023,-0.046,-0.122",
    posisi_2d: "52,52",
    mesh_3d: ["VH_M_mitral_valve"],
    fakta: [
      { label: "Jumlah daun", nilai: "2 daun katup (bikuspidalis)" },
      { label: "Letak", nilai: "Antara atrium kiri dan ventrikel kiri" },
      { label: "Menutup saat", nilai: "Ventrikel berkontraksi (sistol)" },
    ],
  },

  /* ---- Paru-paru ---- */
  {
    id_bagian: 7,
    id_organ: 2,
    nama_bagian_internal: "Trakea",
    parent_bagian_id: null,
    posisi_koordinat_3d: "-0.030,0.271,0.066",
    posisi_2d: "48,33",
    mesh_3d: ["VH_M_trachea", "VH_M_tracheal_cartilage"],
    fakta: [
      { label: "Panjang", nilai: "10 sampai 12 cm" },
      { label: "Penguat", nilai: "16 sampai 20 cincin tulang rawan" },
      { label: "Bermula dari", nilai: "Laring (kotak suara)" },
    ],
  },
  {
    id_bagian: 8,
    id_organ: 2,
    nama_bagian_internal: "Bronkus Utama",
    parent_bagian_id: null,
    posisi_koordinat_3d: "-0.010,0.030,-0.045",
    posisi_2d: "51,49",
    mesh_3d: [
      "VH_M_left_main_bronchus",
      "VH_M_right_main_bronchus",
      "VH_M_cartilage_of_the_main_bronchus_*",
      "VH_M_carina",
    ],
    fakta: [
      { label: "Titik cabang", nilai: "Karina, di ujung bawah trakea" },
      { label: "Jumlah", nilai: "2 bronkus: kanan dan kiri" },
      { label: "Bercabang menjadi", nilai: "Bronkiolus yang makin halus" },
    ],
  },
  {
    id_bagian: 9,
    id_organ: 2,
    nama_bagian_internal: "Paru-paru Kanan",
    parent_bagian_id: null,
    posisi_koordinat_3d: "-0.250,0.000,-0.020",
    posisi_2d: "33,56",
    mesh_3d: ["VH_M_right_*_bronchopulmonary_segment", "VH_M_hilum_*R"],
    fakta: [
      { label: "Jumlah lobus", nilai: "3 (atas, tengah, bawah)" },
      { label: "Ukuran", nilai: "Lebih besar dari paru kiri" },
      { label: "Pembungkus", nilai: "Dua lapis pleura" },
    ],
  },
  {
    id_bagian: 10,
    id_organ: 2,
    nama_bagian_internal: "Paru-paru Kiri",
    parent_bagian_id: null,
    posisi_koordinat_3d: "0.250,0.000,-0.020",
    posisi_2d: "67,55",
    mesh_3d: ["VH_M_left_*_bronchopulmonary_segment", "VH_M_hilum_*L"],
    fakta: [
      { label: "Jumlah lobus", nilai: "2 (atas dan bawah)" },
      { label: "Ciri khas", nilai: "Lekukan jantung (cardiac notch)" },
      { label: "Ukuran", nilai: "Lebih kecil, memberi ruang jantung" },
    ],
  },
  {
    id_bagian: 11,
    id_organ: 2,
    nama_bagian_internal: "Lobus Bawah Paru Kanan",
    parent_bagian_id: 9,
    posisi_koordinat_3d: "-0.270,-0.170,-0.120",
    posisi_2d: "33,63",
    mesh_3d: ["VH_M_right_superior_bronchopulmonary_segment", "VH_M_right_*_basal_bronchopulmonary_segment"],
    fakta: [
      { label: "Posisi", nilai: "Bagian paling bawah paru kanan" },
      { label: "Pembatas", nilai: "Fisura oblik dari lobus tengah" },
      { label: "Menempel pada", nilai: "Diafragma" },
    ],
  },
  {
    id_bagian: 12,
    id_organ: 2,
    nama_bagian_internal: "Alveolus",
    parent_bagian_id: 10,
    posisi_koordinat_3d: "0.343,-0.179,-0.180",
    posisi_2d: "71,65",
    mesh_3d: ["VH_M_left_lateral_basal_bronchopulmonary_segment"],
    fakta: [
      { label: "Jumlah", nilai: "300 sampai 500 juta" },
      { label: "Tebal dinding", nilai: "Setebal satu sel" },
      { label: "Fungsi", nilai: "Tempat pertukaran O2 dan CO2" },
    ],
  },
]);

/* part_content: jenis_konten 'dasar' (FR-06) & 'dimmed' (FR-07).
   Salinan yang bisa diedit admin hidup di lib/db.ts. */
export const part_content_awal = z.array(PartContentSchema).parse([
  /* ---- Jantung ---- */
  {
    id_konten: 1,
    id_bagian: 1,
    jenis_konten: "dasar",
    judul_tampil: "Atrium Kanan",
    deskripsi:
      "Ruang jantung kanan atas yang menerima darah miskin oksigen dari seluruh tubuh melalui vena cava superior dan vena cava inferior, lalu mengalirkannya ke ventrikel kanan.",
    status_tampilan: "aktif",
    status_validasi: "tervalidasi",
  },
  {
    id_konten: 2,
    id_bagian: 1,
    jenis_konten: "dimmed",
    judul_tampil: "Nodus SA & dinding atrium",
    deskripsi:
      "Dinding atrium kanan hanya setebal ± 2 mm karena cukup mendorong darah sejauh satu ruang. Di dindingnya terdapat nodus sinoatrial (SA node), pemacu alami jantung yang memicu 60–100 denyut per menit tanpa perintah dari otak.",
    status_tampilan: "dimmed",
    status_validasi: "tervalidasi",
  },
  {
    id_konten: 3,
    id_bagian: 2,
    jenis_konten: "dasar",
    judul_tampil: "Atrium Kiri",
    deskripsi:
      "Ruang jantung kiri atas yang menerima darah kaya oksigen dari paru-paru melalui empat vena pulmonalis, kemudian meneruskannya ke ventrikel kiri lewat katup mitral.",
    status_tampilan: "aktif",
    status_validasi: "tervalidasi",
  },
  {
    id_konten: 4,
    id_bagian: 2,
    jenis_konten: "dimmed",
    judul_tampil: "Posisi paling belakang",
    deskripsi:
      "Atrium kiri adalah ruang jantung yang letaknya paling belakang, tepat di depan kerongkongan (esofagus). Karena itu pembesaran atrium kiri kadang terlihat menekan esofagus pada pemeriksaan pencitraan.",
    status_tampilan: "dimmed",
    status_validasi: "draft",
  },
  {
    id_konten: 5,
    id_bagian: 3,
    jenis_konten: "dasar",
    judul_tampil: "Ventrikel Kanan",
    deskripsi:
      "Ruang pompa kanan bawah yang mendorong darah miskin oksigen menuju paru-paru melalui arteri pulmonalis untuk mengambil oksigen (peredaran darah kecil).",
    status_tampilan: "aktif",
    status_validasi: "tervalidasi",
  },
  {
    id_konten: 6,
    id_bagian: 4,
    jenis_konten: "dasar",
    judul_tampil: "Ventrikel Kiri",
    deskripsi:
      "Ruang pompa kiri bawah yang memompa darah kaya oksigen ke seluruh tubuh melalui aorta. Dindingnya paling tebal di antara empat ruang jantung (peredaran darah besar).",
    status_tampilan: "aktif",
    status_validasi: "tervalidasi",
  },
  {
    id_konten: 7,
    id_bagian: 4,
    jenis_konten: "dimmed",
    judul_tampil: "Mengapa dindingnya paling tebal?",
    deskripsi:
      "Tebal dinding ventrikel kiri 8–15 mm, kira-kira tiga kali ventrikel kanan. Sebabnya, ia harus melawan tekanan sistemik sekitar 120 mmHg untuk mengedarkan darah sampai ujung jari kaki, sementara ventrikel kanan hanya melawan ± 25 mmHg menuju paru-paru.",
    status_tampilan: "dimmed",
    status_validasi: "tervalidasi",
  },
  {
    id_konten: 8,
    id_bagian: 5,
    jenis_konten: "dasar",
    judul_tampil: "Aorta",
    deskripsi:
      "Pembuluh arteri terbesar dalam tubuh. Aorta membawa darah kaya oksigen keluar dari ventrikel kiri, melengkung membentuk arkus aorta, lalu bercabang ke kepala, lengan, dan seluruh tubuh bagian bawah.",
    status_tampilan: "aktif",
    status_validasi: "tervalidasi",
  },
  {
    id_konten: 9,
    id_bagian: 5,
    jenis_konten: "dimmed",
    judul_tampil: "Dinding elastis (efek Windkessel)",
    deskripsi:
      "Diameter aorta orang dewasa sekitar 2,5–3,5 cm. Dindingnya kaya serat elastin sehingga meregang saat jantung memompa (sistol) dan memantul balik saat jantung mengisi (diastol). Pantulan inilah yang membuat aliran darah tetap mengalir walau jantung sedang tidak berkontraksi.",
    status_tampilan: "dimmed",
    status_validasi: "tervalidasi",
  },
  {
    id_konten: 10,
    id_bagian: 6,
    jenis_konten: "dasar",
    judul_tampil: "Katup Mitral",
    deskripsi:
      'Katup berdaun dua (bikuspidalis) di antara atrium kiri dan ventrikel kiri. Katup ini menutup saat ventrikel berkontraksi sehingga darah tidak kembali ke atrium — bunyi penutupannya menjadi bagian dari suara "lub" jantung.',
    status_tampilan: "aktif",
    status_validasi: "draft",
  },

  /* ---- Paru-paru ---- */
  {
    id_konten: 11,
    id_bagian: 7,
    jenis_konten: "dasar",
    judul_tampil: "Trakea",
    deskripsi:
      "Saluran udara utama berbentuk tabung sepanjang 10–12 cm dari laring ke rongga dada. Dindingnya diperkuat cincin tulang rawan agar tidak kempis saat kita menarik napas.",
    status_tampilan: "aktif",
    status_validasi: "tervalidasi",
  },
  {
    id_konten: 12,
    id_bagian: 7,
    jenis_konten: "dimmed",
    judul_tampil: "Cincin berbentuk C dan sapu silia",
    deskripsi:
      "Cincin tulang rawan trakea berbentuk huruf C dengan sisi belakang terbuka yang berhadapan dengan kerongkongan, sehingga kerongkongan leluasa melebar saat menelan. Lapisan dalam trakea dipenuhi sel bersilia yang terus menyapu lendir beserta debu ke atas menuju tenggorokan untuk ditelan atau dibatukkan.",
    status_tampilan: "dimmed",
    status_validasi: "tervalidasi",
  },
  {
    id_konten: 13,
    id_bagian: 8,
    jenis_konten: "dasar",
    judul_tampil: "Bronkus Utama",
    deskripsi:
      "Percabangan trakea menjadi bronkus kanan dan bronkus kiri pada titik yang disebut karina. Masing-masing masuk ke paru-paru dan bercabang lagi berkali-kali menjadi bronkiolus yang semakin halus.",
    status_tampilan: "aktif",
    status_validasi: "tervalidasi",
  },
  {
    id_konten: 14,
    id_bagian: 8,
    jenis_konten: "dimmed",
    judul_tampil: "Mengapa benda asing sering nyangkut di kanan?",
    deskripsi:
      "Bronkus kanan lebih lebar, lebih pendek, dan posisinya lebih tegak daripada bronkus kiri. Karena itu benda asing yang tidak sengaja terhirup lebih sering masuk ke paru-paru kanan. Fakta ini penting bagi dokter saat mencari benda yang tersedak.",
    status_tampilan: "dimmed",
    status_validasi: "draft",
  },
  {
    id_konten: 15,
    id_bagian: 9,
    jenis_konten: "dasar",
    judul_tampil: "Paru-paru Kanan",
    deskripsi:
      "Paru-paru kanan terdiri dari tiga lobus: atas, tengah, dan bawah. Ukurannya sedikit lebih besar dan lebih pendek daripada paru-paru kiri karena hati mendesak diafragma di sisi kanan.",
    status_tampilan: "aktif",
    status_validasi: "tervalidasi",
  },
  {
    id_konten: 16,
    id_bagian: 9,
    jenis_konten: "dimmed",
    judul_tampil: "Pleura, selaput licin pembungkus paru",
    deskripsi:
      "Setiap paru dibungkus dua lapis selaput pleura dengan lapisan cairan sangat tipis di antaranya. Cairan ini membuat paru bisa mengembang dan mengempis ribuan kali sehari tanpa bergesekan dengan dinding dada. Bila ruang ini terisi udara, paru bisa mengempis (pneumotoraks).",
    status_tampilan: "dimmed",
    status_validasi: "tervalidasi",
  },
  {
    id_konten: 17,
    id_bagian: 10,
    jenis_konten: "dasar",
    judul_tampil: "Paru-paru Kiri",
    deskripsi:
      "Paru-paru kiri hanya memiliki dua lobus, atas dan bawah. Di sisi dalamnya terdapat lekukan (cardiac notch) yang memberi ruang bagi jantung, sehingga paru kiri lebih kecil daripada paru kanan.",
    status_tampilan: "aktif",
    status_validasi: "tervalidasi",
  },
  {
    id_konten: 18,
    id_bagian: 11,
    jenis_konten: "dasar",
    judul_tampil: "Lobus Bawah Paru Kanan",
    deskripsi:
      "Lobus terbesar pada paru-paru kanan, dipisahkan dari lobus tengah oleh fisura oblik. Bagian bawahnya duduk di atas diafragma, otot lebar yang bergerak turun saat kita menarik napas.",
    status_tampilan: "aktif",
    status_validasi: "tervalidasi",
  },
  {
    id_konten: 19,
    id_bagian: 12,
    jenis_konten: "dasar",
    judul_tampil: "Alveolus",
    deskripsi:
      "Kantong udara mikroskopis berbentuk seperti buah anggur di ujung bronkiolus. Di dindingnya yang sangat tipis, oksigen berpindah ke darah kapiler dan karbon dioksida keluar untuk dihembuskan.",
    status_tampilan: "aktif",
    status_validasi: "tervalidasi",
  },
  {
    id_konten: 20,
    id_bagian: 12,
    jenis_konten: "dimmed",
    judul_tampil: "Seluas lapangan tenis",
    deskripsi:
      "Jumlah alveolus orang dewasa sekitar 300–500 juta, dengan luas permukaan total ± 70 meter persegi, hampir seluas lapangan tenis. Luas yang besar itulah yang memungkinkan pertukaran gas berlangsung cepat dalam sekali tarikan napas.",
    status_tampilan: "dimmed",
    status_validasi: "tervalidasi",
  },
]);

/* Basis pengetahuan simulasi jawaban Asisten AI (FR-08), bahasa untuk SMP-SMA. */
export const PengetahuanSchema = z.object({
  fungsi: z.string(),
  letak: z.string(),
  gangguan: z.string(),
  ringkas: z.string(),
});
export const pengetahuan_ai = z.record(z.string(), PengetahuanSchema).parse({
  1: {
    fungsi:
      "Atrium kanan bertugas menampung darah kotor yang pulang dari seluruh tubuh, lalu meneruskannya ke ventrikel kanan.",
    letak: "Letaknya di bagian kanan atas jantung, persis di ujung masuknya vena cava superior dan inferior.",
    gangguan:
      "Gangguan yang sering dibahas adalah aritmia, karena nodus SA (pemacu jantung) berada di dinding atrium kanan.",
    ringkas: 'Anggap atrium kanan sebagai "ruang tunggu" darah kotor sebelum dipompa ke paru-paru.',
  },
  2: {
    fungsi: "Atrium kiri menerima darah bersih dari paru-paru dan meneruskannya ke ventrikel kiri.",
    letak: "Berada di kiri atas jantung dan merupakan ruang jantung yang posisinya paling belakang.",
    gangguan: "Pada penyakit katup mitral, atrium kiri bisa membesar karena darah tertahan di dalamnya.",
    ringkas: 'Atrium kiri adalah pintu masuk darah kaya oksigen yang baru selesai "diisi ulang" di paru-paru.',
  },
  3: {
    fungsi: "Ventrikel kanan memompa darah miskin oksigen ke paru-paru melalui arteri pulmonalis.",
    letak: "Menempati bagian depan-bawah jantung, tepat di belakang tulang dada.",
    gangguan: "Kalau tekanan di paru-paru tinggi, ventrikel kanan bisa menebal dan melemah.",
    ringkas: "Ventrikel kanan adalah pompa jarak dekat: tujuannya hanya sampai paru-paru.",
  },
  4: {
    fungsi: "Ventrikel kiri memompa darah kaya oksigen ke seluruh tubuh lewat aorta.",
    letak: "Berada di kiri bawah jantung dan membentuk ujung runcing jantung (apeks).",
    gangguan: "Tekanan darah tinggi yang lama membuat dinding ventrikel kiri menebal (hipertrofi).",
    ringkas: "Ventrikel kiri adalah pompa terkuat: satu tekanannya harus sampai ke ujung jari kaki.",
  },
  5: {
    fungsi: "Aorta menyalurkan darah kaya oksigen dari ventrikel kiri ke seluruh cabang tubuh.",
    letak: "Keluar dari ventrikel kiri, melengkung di atas jantung, lalu turun di depan tulang belakang.",
    gangguan: "Pelebaran dinding aorta (aneurisma) termasuk gangguan yang berbahaya.",
    ringkas: "Aorta ibarat jalan tol utama peredaran darah sebelum bercabang ke jalan-jalan kecil.",
  },
  6: {
    fungsi: "Katup mitral mencegah darah kembali ke atrium kiri ketika ventrikel kiri berkontraksi.",
    letak: "Terletak di antara atrium kiri dan ventrikel kiri.",
    gangguan: "Jika katup bocor (regurgitasi), sebagian darah berbalik arah dan jantung bekerja lebih berat.",
    ringkas: "Katup mitral bekerja seperti pintu satu arah di dalam jantung.",
  },
  7: {
    fungsi: "Trakea mengalirkan udara dari tenggorokan ke bronkus sambil menyaring debu dengan lendir dan silia.",
    letak: "Di depan kerongkongan, memanjang dari bawah laring sampai bercabang di rongga dada.",
    gangguan: "Radang trakea (trakeitis) membuat batuk kering dan suara serak.",
    ringkas: "Trakea adalah pipa udara utama yang diperkuat cincin tulang rawan supaya tidak kempis.",
  },
  8: {
    fungsi: "Bronkus membagi udara dari trakea ke paru kanan dan kiri, lalu bercabang terus menjadi bronkiolus.",
    letak: "Percabangannya (karina) berada di rongga dada, kira-kira sejajar tulang dada bagian atas.",
    gangguan: "Bronkitis adalah radang bronkus yang membuat lendir berlebih dan napas berbunyi.",
    ringkas: "Bronkus seperti dua cabang besar pohon terbalik yang memasok udara ke seluruh paru.",
  },
  9: {
    fungsi: "Paru-paru kanan menampung udara dan menukar oksigen dengan karbon dioksida di tiga lobusnya.",
    letak: "Sisi kanan rongga dada, sedikit lebih tinggi karena hati mendorong diafragma dari bawah.",
    gangguan: "Pneumonia sering menyerang lobus bawah karena cairan mudah mengumpul di sana.",
    ringkas: "Paru kanan sedikit lebih besar dan punya tiga lobus, paru kiri hanya dua.",
  },
  10: {
    fungsi: "Paru-paru kiri menukar gas seperti paru kanan, dengan dua lobus yang berbagi ruang dengan jantung.",
    letak: "Sisi kiri rongga dada, dengan lekukan di sisi dalam tempat jantung bersandar.",
    gangguan: "Efusi pleura, penumpukan cairan di selaput paru, bisa membuat napas terasa pendek.",
    ringkas: "Paru kiri lebih kecil karena harus berbagi tempat dengan jantung.",
  },
  11: {
    fungsi: "Lobus bawah paru kanan menyumbang porsi terbesar pertukaran gas saat bernapas dalam.",
    letak: "Bagian paling bawah paru kanan, duduk di atas diafragma.",
    gangguan: "Bagian ini paling sering terkena pneumonia karena letaknya di dasar paru.",
    ringkas: "Lobus bawah paling banyak mengembang saat kita menarik napas dalam-dalam.",
  },
  12: {
    fungsi: "Alveolus adalah tempat sebenarnya oksigen masuk ke darah dan karbon dioksida keluar.",
    letak: "Di ujung bronkiolus, tersebar di seluruh jaringan paru seperti tandan anggur.",
    gangguan: "Pada emfisema, dinding alveolus rusak sehingga luas pertukaran gas berkurang.",
    ringkas: "Alveolus jumlahnya ratusan juta, dengan luas total hampir seluas lapangan tenis.",
  },
});

/* ---------------- Selector data master ---------------- */
export function organById(id: number | null | undefined): Organ | null {
  return organs.find((o) => o.id_organ === id) ?? null;
}
export function bagianById(id: number | null | undefined): BodyPart | null {
  return body_parts.find((b) => b.id_bagian === id) ?? null;
}
export function bagianOrgan(idOrgan: number): BodyPart[] {
  return body_parts.filter((b) => b.id_organ === idOrgan);
}
export function layerOrgan(idOrgan: number): Layer[] {
  return layers.filter((l) => l.id_organ === idOrgan).sort((a, b) => a.urutan_tampil - b.urutan_tampil);
}
/** Koordinat persen untuk gambar cadangan dua dimensi. */
export function koordinat2d(bagian: BodyPart): { x: number; y: number } {
  const [x, y] = bagian.posisi_2d.split(",").map(Number);
  return { x: x ?? 50, y: y ?? 50 };
}
/** Koordinat "x,y,z" model 3D sebagai pecahan kotak batas. */
export function koordinat3d(bagian: BodyPart): { x: number; y: number; z: number } {
  const [x, y, z] = bagian.posisi_koordinat_3d.split(",").map(Number);
  return { x: x ?? 0, y: y ?? 0, z: z ?? 0 };
}
