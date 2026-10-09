/* ==========================================================================
   simulasi3d.ts — Simulasi alur 3D untuk tugas belajar, Three.js.
   - "darah": model jantung; tiap tahap menyorot ruang/katup/pembuluh, jantung
     berdenyut, dan setitik darah berpindah dari tahap ke tahap.
   - "napas": model paru-paru; paru mengembang/mengempis, diafragma bergerak,
     dan partikel udara mengalir lewat trakea dan bronkus.
   Dimuat dinamis (import()) hanya di klien oleh komponen Simulasi3D.
   ========================================================================== */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export type JenisSim = "darah" | "napas";

export interface MesinSim {
  setTahap: (kode: string) => void;
  setCepat: (cepat: boolean) => void;
  bersihkan: () => void;
}

const BIRU = 0x1566f4;
const MERAH = 0xe5484d;
const UNGU = 0x8e4ec6;
const AMBER = 0xf0a020;

type Aliran = "masuk" | "keluar" | "gas" | null;
type Napas = "tarik" | "hembus" | "diam";
interface Tahap {
  /* potongan nama node (huruf kecil) yang disorot */
  sorot: string[];
  warna: number;
  aliran?: Aliran;
  napas?: Napas;
  diafragma?: boolean;
  /* putaran model pada sumbu Y (radian) agar bagian yang disorot menghadap kamera */
  sudut?: number;
}

const TAHAP_DARAH: Record<string, Tahap> = {
  vena_kava: { sorot: ["vena_cava"], warna: BIRU },
  atrium_kanan: { sorot: ["right_cardiac_atrium"], warna: BIRU },
  katup_trikuspid: { sorot: ["tricuspid_valve"], warna: BIRU },
  ventrikel_kanan: { sorot: ["heart_right_ventricle"], warna: BIRU },
  arteri_pulmonalis: { sorot: ["pulmonary_trunk", "pulmonary_valve"], warna: BIRU },
  paru_paru: { sorot: ["pulmonary_trunk", "pulmonary_vein"], warna: UNGU, sudut: 2.0 },
  vena_pulmonalis: { sorot: ["pulmonary_vein"], warna: MERAH, sudut: 2.5 },
  atrium_kiri: { sorot: ["left_cardiac_atrium"], warna: MERAH, sudut: 2.6 },
  katup_mitral: { sorot: ["mitral_valve"], warna: MERAH, sudut: 1.2 },
  ventrikel_kiri: { sorot: ["heart_left_ventricle"], warna: MERAH },
  aorta: { sorot: ["aort"], warna: MERAH },
  seluruh_tubuh: { sorot: ["aort", "vena_cava"], warna: MERAH },
};

const TAHAP_NAPAS: Record<string, Tahap> = {
  diafragma: { sorot: [], warna: AMBER, napas: "tarik", diafragma: true },
  hidung: { sorot: [], warna: BIRU, napas: "tarik", aliran: "masuk" },
  faring: { sorot: [], warna: BIRU, napas: "tarik", aliran: "masuk" },
  laring: { sorot: [], warna: BIRU, napas: "tarik", aliran: "masuk" },
  trakea: { sorot: ["trachea"], warna: BIRU, napas: "tarik", aliran: "masuk" },
  bronkus: { sorot: ["bronchi", "carina", "main_bronchus"], warna: BIRU, napas: "tarik", aliran: "masuk" },
  bronkiolus: { sorot: ["tertiary_bronch", "lobar_bronch"], warna: BIRU, napas: "tarik", aliran: "masuk" },
  alveolus: { sorot: ["bronchopulmonary_segment"], warna: UNGU, napas: "tarik", aliran: "masuk" },
  kapiler: { sorot: ["bronchopulmonary_segment"], warna: UNGU, napas: "diam", aliran: "gas" },
  ekspirasi: {
    sorot: ["lungs_l", "lungs_r", "trachea"],
    warna: AMBER,
    napas: "hembus",
    aliran: "keluar",
    diafragma: true,
  },
};

interface Bagian {
  mesh: THREE.Mesh;
  bahan: THREE.MeshStandardMaterial;
  nama: string;
  warnaAsli: THREE.Color;
  opasitas: number;
  sasaranOpasitas: number;
  kuat: number;
  sasaranKuat: number;
  sorotWarna: THREE.Color;
}

function muatModel(loader: GLTFLoader, url: string): Promise<THREE.Group> {
  return new Promise((selesai, gagal) => {
    loader.load(
      url,
      (g) => selesai(g.scene),
      undefined,
      () => gagal(new Error("berkas model 3D gagal dimuat.")),
    );
  });
}

function namaLengkap(o: THREE.Object3D): string {
  const bagian: string[] = [];
  for (let n: THREE.Object3D | null = o; n; n = n.parent) bagian.push(n.name.toLowerCase());
  return bagian.join("/");
}

export async function mulaiSimulasi3D(opsi: {
  wadah: HTMLElement;
  jenis: JenisSim;
  urlModel: string;
}): Promise<MesinSim> {
  const { wadah, jenis } = opsi;
  const tahapPeta = jenis === "darah" ? TAHAP_DARAH : TAHAP_NAPAS;
  let lebar = wadah.clientWidth || 1;
  let tinggi = wadah.clientHeight || 1;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    throw new Error("peramban ini tidak mendukung WebGL.");
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(lebar, tinggi);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.domElement.style.display = "block";
  renderer.domElement.style.touchAction = "none";
  wadah.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x93a8cc, 0.4));
  const cahaya = new THREE.DirectionalLight(0xffffff, 1.0);
  cahaya.position.set(2.5, 3, 4);
  scene.add(cahaya);

  const camera = new THREE.PerspectiveCamera(40, lebar / tinggi, 0.01, 50);
  const JARAK_DASAR = 3.0;
  camera.position.set(0.3, 0.15, JARAK_DASAR);
  const sesuaikanJarak = () => camera.position.setLength(JARAK_DASAR * Math.max(1, 1.2 / (lebar / tinggi)));
  sesuaikanJarak();
  const kontrol = new OrbitControls(camera, renderer.domElement);
  kontrol.enableDamping = true;
  kontrol.dampingFactor = 0.08;
  kontrol.enablePan = false;
  kontrol.enableZoom = false;
  kontrol.minPolarAngle = Math.PI * 0.2;
  kontrol.maxPolarAngle = Math.PI * 0.8;

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  let model: THREE.Group;
  try {
    model = await muatModel(loader, opsi.urlModel);
  } catch (e) {
    renderer.dispose();
    renderer.domElement.remove();
    throw e;
  }

  /* Normalisasi ukuran dan pusat model */
  const panggung = new THREE.Group();
  scene.add(panggung);
  const pembungkus = new THREE.Group();
  pembungkus.add(model);
  panggung.add(pembungkus);
  {
    const kotak = new THREE.Box3().setFromObject(model);
    const pusat = kotak.getCenter(new THREE.Vector3());
    const ukuran = kotak.getSize(new THREE.Vector3());
    model.position.sub(pusat);
    pembungkus.scale.setScalar(1.5 / Math.max(ukuran.x, ukuran.y, ukuran.z));
  }
  panggung.updateMatrixWorld(true);

  /* Setiap mesh diberi bahan sendiri agar bisa disorot tanpa memengaruhi yang lain */
  const bagian: Bagian[] = [];
  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const asli = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.MeshStandardMaterial;
    const bahan = asli.clone();
    bahan.transparent = true;
    bahan.side = THREE.DoubleSide;
    m.material = bahan;
    bagian.push({
      mesh: m,
      bahan,
      nama: namaLengkap(m),
      warnaAsli: bahan.color.clone(),
      opasitas: 1,
      sasaranOpasitas: 1,
      kuat: 0,
      sasaranKuat: 0,
      sorotWarna: new THREE.Color(BIRU),
    });
  });

  const kotakDari = (cocok: (b: Bagian) => boolean): THREE.Box3 | null => {
    const k = new THREE.Box3();
    let ada = false;
    for (const b of bagian) {
      if (!cocok(b)) continue;
      k.expandByObject(b.mesh);
      ada = true;
    }
    return ada ? k : null;
  };

  /* ----- elemen khusus napas: paru, diafragma, jalur udara ----- */
  const noda = (nama: string) => model.getObjectByName(nama);
  const paru = jenis === "napas" ? noda("VH_M_lungs") : null;
  const pusatParu = new THREE.Vector3();
  if (paru) new THREE.Box3().setFromObject(paru).getCenter(pusatParu);
  const pusatParuLokal = paru ? paru.worldToLocal(pusatParu.clone()) : new THREE.Vector3();
  const posisiParuAsli = paru ? paru.position.clone() : new THREE.Vector3();

  let kubah: THREE.Mesh | null = null;
  let kubahY0 = 0;
  let kubahTinggi = 0;
  const jalur: { kiri: THREE.Vector3[]; kanan: THREE.Vector3[]; panjangKiri: number; panjangKanan: number } = {
    kiri: [],
    kanan: [],
    panjangKiri: 0,
    panjangKanan: 0,
  };
  const partikel: { mesh: THREE.Mesh; sisi: "kiri" | "kanan"; t: number; acak: THREE.Vector3 }[] = [];
  const bahanPartikel = new THREE.MeshBasicMaterial({
    color: BIRU,
    transparent: true,
    opacity: 0.95,
    depthTest: false,
  });

  if (jenis === "napas") {
    const kotakParu = new THREE.Box3().setFromObject(paru ?? model);
    const ukuranParu = kotakParu.getSize(new THREE.Vector3());
    const pusatKotak = kotakParu.getCenter(new THREE.Vector3());
    /* Diafragma: kubah di bawah paru */
    const geo = new THREE.SphereGeometry(1, 40, 18, 0, Math.PI * 2, 0, Math.PI / 2);
    kubah = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({
        color: AMBER,
        transparent: true,
        opacity: 0.55,
        roughness: 0.6,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    kubahTinggi = ukuranParu.y * 0.3;
    kubah.scale.set(ukuranParu.x * 0.56, kubahTinggi, ukuranParu.z * 0.62);
    kubahY0 = kotakParu.min.y - ukuranParu.y * 0.02;
    kubah.position.set(pusatKotak.x, kubahY0, pusatKotak.z);
    scene.add(kubah);

    /* Jalur udara dari atas trakea -> karina -> bronkus utama -> pusat paru kiri/kanan */
    const trakea = kotakDari((b) => b.nama.includes("vh_m_trachea/") || b.nama.endsWith("vh_m_trachea"));
    const karina = kotakDari((b) => b.nama.includes("carina"));
    const kiriBr = kotakDari((b) => b.nama.includes("left_main_bronchus"));
    const kananBr = kotakDari((b) => b.nama.includes("right_main_bronchus"));
    const pK = noda("VH_M_lungs_L");
    const pR = noda("VH_M_lungs_R");
    const pusatKiri = pK ? new THREE.Box3().setFromObject(pK).getCenter(new THREE.Vector3()) : pusatKotak.clone();
    const pusatKanan = pR ? new THREE.Box3().setFromObject(pR).getCenter(new THREE.Vector3()) : pusatKotak.clone();
    const tengah = trakea ? trakea.getCenter(new THREE.Vector3()) : pusatKotak.clone();
    const atas = new THREE.Vector3(tengah.x, (trakea?.max.y ?? kotakParu.max.y) + ukuranParu.y * 0.28, tengah.z);
    const cari = karina
      ? karina.getCenter(new THREE.Vector3())
      : new THREE.Vector3(tengah.x, tengah.y - ukuranParu.y * 0.2, tengah.z);
    const awal = new THREE.Vector3(tengah.x, (trakea?.max.y ?? kotakParu.max.y) + ukuranParu.y * 0.02, tengah.z);
    jalur.kiri = [atas, awal, cari, kiriBr ? kiriBr.getCenter(new THREE.Vector3()) : pusatKiri, pusatKiri];
    jalur.kanan = [atas, awal, cari, kananBr ? kananBr.getCenter(new THREE.Vector3()) : pusatKanan, pusatKanan];
    const panjang = (p: THREE.Vector3[]) => p.slice(1).reduce((s, v, i) => s + v.distanceTo(p[i] as THREE.Vector3), 0);
    jalur.panjangKiri = panjang(jalur.kiri);
    jalur.panjangKanan = panjang(jalur.kanan);
    const radius = ukuranParu.y * 0.016;
    const bola = new THREE.SphereGeometry(radius, 12, 8);
    for (let i = 0; i < 40; i++) {
      const m = new THREE.Mesh(bola, bahanPartikel);
      m.visible = false;
      scene.add(m);
      partikel.push({
        mesh: m,
        sisi: i % 2 === 0 ? "kiri" : "kanan",
        t: Math.random(),
        acak: new THREE.Vector3(
          (Math.random() - 0.5) * radius * 3,
          (Math.random() - 0.5) * radius * 3,
          (Math.random() - 0.5) * radius * 3,
        ),
      });
    }
  }

  /* ----- elemen khusus darah: titik darah ----- */
  const titikDarah = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 20, 14),
    new THREE.MeshBasicMaterial({ color: BIRU, transparent: true, opacity: 0.95, depthTest: false }),
  );
  titikDarah.renderOrder = 10;
  titikDarah.visible = false;
  panggung.add(titikDarah);
  const jejak: THREE.Mesh[] = [];
  if (jenis === "darah") {
    for (let i = 0; i < 6; i++) {
      const j = new THREE.Mesh(
        new THREE.SphereGeometry(0.03 - i * 0.003, 12, 8),
        new THREE.MeshBasicMaterial({ color: BIRU, transparent: true, opacity: 0.5 - i * 0.07, depthTest: false }),
      );
      j.renderOrder = 9;
      j.visible = false;
      panggung.add(j);
      jejak.push(j);
    }
  }

  /* ----- keadaan tahap ----- */
  let tahap: Tahap = Object.values(tahapPeta)[0] as Tahap;
  let kodeTahap = "";
  let cepat = false;
  const sasaranKamera = new THREE.Vector3();
  const titikAsal = new THREE.Vector3();
  const titikTujuan = new THREE.Vector3();
  const posisiTitik = new THREE.Vector3();
  const riwayatPosisi: THREE.Vector3[] = Array.from({ length: 6 }, () => new THREE.Vector3());
  let mulaiGerak = 0;
  let skalaParuSasaran = 1;
  let skalaParu = 1;
  let aliranSekarang: Aliran = null;
  let sudutSekarang = 0;
  let sudutSasaran = 0;

  function setTahap(kode: string) {
    const t = tahapPeta[kode];
    if (!t || kode === kodeTahap) return;
    kodeTahap = kode;
    tahap = t;
    const warna = new THREE.Color(t.warna);
    const sorotKecil = t.sorot.map((s) => s.toLowerCase());
    const adaSorotan = sorotKecil.length > 0;
    for (const b of bagian) {
      const kena = adaSorotan && sorotKecil.some((s) => b.nama.includes(s));
      b.sorotWarna.copy(warna);
      b.sasaranOpasitas = !adaSorotan ? (jenis === "napas" ? 0.55 : 0.4) : kena ? 1 : jenis === "napas" ? 0.16 : 0.22;
      b.sasaranKuat = kena ? 1 : 0;
    }
    if (jenis === "darah") {
      const k = kotakDari((b) => b.sasaranKuat > 0);
      if (k) {
        titikAsal.copy(posisiTitik);
        k.getCenter(titikTujuan);
        panggung.worldToLocal(titikTujuan);
        mulaiGerak = performance.now();
        sasaranKamera.set(0, 0, 0);
        sudutSasaran = t.sudut ?? 0.3;
        titikDarah.visible = true;
        (titikDarah.material as THREE.MeshBasicMaterial).color.copy(warna);
        for (const j of jejak) (j.material as THREE.MeshBasicMaterial).color.copy(warna);
        if (posisiTitik.lengthSq() === 0) {
          posisiTitik.copy(titikTujuan);
          titikAsal.copy(titikTujuan);
        }
      }
    } else {
      sasaranKamera.set(0, 0, 0);
      skalaParuSasaran = t.napas === "tarik" ? 1.09 : t.napas === "hembus" ? 0.93 : 1;
      aliranSekarang = t.aliran ?? null;
      bahanPartikel.color.set(t.aliran === "keluar" ? AMBER : t.aliran === "gas" ? UNGU : BIRU);
    }
  }

  /* ----- ukuran dan gelung render ----- */
  const pengamatUkuran = new ResizeObserver(() => {
    lebar = wadah.clientWidth || 1;
    tinggi = wadah.clientHeight || 1;
    renderer.setSize(lebar, tinggi);
    camera.aspect = lebar / tinggi;
    camera.updateProjectionMatrix();
    sesuaikanJarak();
  });
  pengamatUkuran.observe(wadah);

  let tampil = true;
  const pengamatTampil = new IntersectionObserver((e) => {
    tampil = e[0]?.isIntersecting ?? true;
  });
  pengamatTampil.observe(wadah);
  const kurangGerak = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let rafId = 0;
  let waktuLalu = performance.now();
  let fase = 0;

  function titikPadaJalur(p: THREE.Vector3[], panjangTotal: number, u: number, keluar: THREE.Vector3) {
    let sisa = u * panjangTotal;
    for (let i = 1; i < p.length; i++) {
      const a = p[i - 1] as THREE.Vector3;
      const b = p[i] as THREE.Vector3;
      const seg = a.distanceTo(b);
      if (sisa <= seg || i === p.length - 1) return keluar.lerpVectors(a, b, seg === 0 ? 0 : Math.min(sisa / seg, 1));
      sisa -= seg;
    }
    return keluar;
  }

  const sementara = new THREE.Vector3();
  function gelung(sekarang: number) {
    rafId = requestAnimationFrame(gelung);
    if (!tampil) {
      waktuLalu = sekarang;
      return;
    }
    const dt = Math.min((sekarang - waktuLalu) / 1000, 0.05);
    waktuLalu = sekarang;
    const laju = cepat ? 1.9 : 1;
    fase += dt * laju;
    const lerp = 1 - Math.exp(-dt * 6);

    for (const b of bagian) {
      b.opasitas += (b.sasaranOpasitas - b.opasitas) * lerp;
      b.kuat += (b.sasaranKuat - b.kuat) * lerp;
      b.bahan.opacity = b.opasitas;
      b.bahan.depthWrite = b.opasitas > 0.95;
      b.bahan.color.copy(b.warnaAsli).lerp(b.sorotWarna, b.kuat * 0.85);
      b.bahan.emissive.copy(b.sorotWarna).multiplyScalar(b.kuat * 0.28);
    }

    if (jenis === "darah") {
      /* Jantung berdenyut ~66x/menit; ventrikel lebih terasa saat disorot */
      const denyut = kurangGerak ? 0 : Math.max(0, Math.sin(fase * Math.PI * 2 * 1.1)) ** 3;
      panggung.scale.setScalar(1 + denyut * 0.03);
      sudutSekarang += (sudutSasaran - sudutSekarang) * (1 - Math.exp(-dt * 2.4));
      panggung.rotation.y = sudutSekarang;
      /* Titik darah bergerak dari tahap sebelumnya ke tahap sekarang */
      const u = Math.min((sekarang - mulaiGerak) / (900 / laju), 1);
      const halus = u * u * (3 - 2 * u);
      posisiTitik.lerpVectors(titikAsal, titikTujuan, halus);
      titikDarah.position.copy(posisiTitik);
      const denyutTitik = 1 + (kurangGerak ? 0 : Math.sin(fase * 9) * 0.12);
      titikDarah.scale.setScalar(denyutTitik);
      riwayatPosisi.unshift(posisiTitik.clone());
      riwayatPosisi.length = jejak.length;
      jejak.forEach((j, i) => {
        j.visible = true;
        j.position.copy(riwayatPosisi[Math.min(i * 3 + 2, riwayatPosisi.length - 1)] ?? posisiTitik);
      });
    } else {
      /* Paru mengembang/mengempis pada pusatnya sendiri */
      skalaParu += (skalaParuSasaran - skalaParu) * (1 - Math.exp(-dt * 2.2));
      const napasHidup = kurangGerak ? 0 : Math.sin(fase * 2.2) * 0.008;
      const s = skalaParu + napasHidup;
      if (paru) {
        paru.scale.setScalar(s);
        paru.position.copy(posisiParuAsli).add(pusatParuLokal.clone().multiplyScalar(1 - s));
      }
      if (kubah) {
        const turun = (skalaParu - 1) / 0.09; // -1 (hembus) .. +1 (tarik)
        kubah.position.y = kubahY0 - turun * kubahTinggi * 0.35;
        kubah.scale.y = kubahTinggi * (1 - turun * 0.35);
        const bahanKubah = kubah.material as THREE.MeshStandardMaterial;
        bahanKubah.opacity = tahap.diafragma ? 0.8 : 0.4;
        bahanKubah.emissive.set(AMBER).multiplyScalar(tahap.diafragma ? 0.35 : 0);
      }
      /* Partikel udara */
      for (const p of partikel) {
        if (!aliranSekarang) {
          p.mesh.visible = false;
          continue;
        }
        p.mesh.visible = true;
        const daftar = p.sisi === "kiri" ? jalur.kiri : jalur.kanan;
        const panjang = p.sisi === "kiri" ? jalur.panjangKiri : jalur.panjangKanan;
        if (aliranSekarang === "gas") {
          /* pertukaran gas: partikel bergetar di dalam paru */
          const pusat = daftar[daftar.length - 1] as THREE.Vector3;
          const sudut = fase * 2 + p.t * 20;
          p.mesh.position.set(
            pusat.x + Math.cos(sudut) * 0.09 + p.acak.x * 8,
            pusat.y + Math.sin(sudut * 1.3) * 0.12 + p.acak.y * 8,
            pusat.z + Math.sin(sudut) * 0.07 + p.acak.z * 8,
          );
          continue;
        }
        const arah = aliranSekarang === "masuk" ? 1 : -1;
        p.t = (p.t + arah * dt * 0.26 * laju + 1) % 1;
        titikPadaJalur(daftar, panjang, p.t, sementara);
        p.mesh.position.copy(sementara).add(p.acak);
      }
    }

    kontrol.target.lerp(sasaranKamera, lerp * 0.6);
    kontrol.update();
    renderer.render(scene, camera);
  }
  rafId = requestAnimationFrame(gelung);

  setTahap(Object.keys(tahapPeta)[0] as string);

  return {
    setTahap,
    setCepat: (c) => {
      cepat = c;
    },
    bersihkan: () => {
      cancelAnimationFrame(rafId);
      pengamatUkuran.disconnect();
      pengamatTampil.disconnect();
      kontrol.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry.dispose();
          for (const b of Array.isArray(m.material) ? m.material : [m.material]) b.dispose();
        }
      });
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
