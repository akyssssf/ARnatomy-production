/* ==========================================================================
   rakit3d.ts — Mini game "Rakit Organ", Three.js. Model organ dipecah menjadi
   bagian-bagian (mesh dikelompokkan lewat pola nama node), disebar mengelilingi
   posisi aslinya, lalu pemain menyeret tiap bagian kembali. Posisi asli tampak
   sebagai bayangan transparan; bagian yang dilepas dekat posisinya (di layar)
   menempel otomatis. Dimuat dinamis hanya di klien oleh PemainRakit.
   ========================================================================== */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/** Urutan menentukan prioritas: mesh masuk ke bagian pertama yang polanya cocok dengan nama (jalur) node-nya. */
export interface PolaBagian {
  kode: string;
  pola: string[];
}

export const POLA_JANTUNG: PolaBagian[] = [
  { kode: "katup", pola: ["valve"] },
  { kode: "septum", pola: ["interventricular_septum"] },
  { kode: "ventrikel_kanan", pola: ["right_ventricle"] },
  { kode: "ventrikel_kiri", pola: ["left_ventricle", "papillary"] },
  { kode: "atrium_kanan", pola: ["right_cardiac_atrium"] },
  { kode: "atrium_kiri", pola: ["left_cardiac_atrium"] },
  { kode: "arteri_pulmonalis", pola: ["pulmonary_trunk", "pulmonary_artery"] },
  { kode: "vena_pulmonalis", pola: ["pulmonary_vein"] },
  { kode: "vena_kava", pola: ["vena_cava"] },
  { kode: "aorta", pola: ["aort", "coronary"] },
];

export const POLA_PARU: PolaBagian[] = [
  { kode: "lobus_kiri_bawah", pola: ["lungs_l_lower_lobe"] },
  { kode: "lobus_kiri_atas", pola: ["lungs_l_upper_lobe", "vh_m_lungs_l/"] },
  { kode: "lobus_kanan_bawah", pola: ["lungs_r_lower_lobe"] },
  { kode: "lobus_kanan_tengah", pola: ["lungs_r_middle_lobe"] },
  { kode: "lobus_kanan_atas", pola: ["lungs_r_upper_lobe", "vh_m_lungs_r/"] },
  { kode: "bronkus", pola: ["bronch", "carina"] },
  { kode: "trakea", pola: ["trachea"] },
];

export interface MesinRakit {
  /** Sebar ulang bagian yang belum terpasang */
  acak: () => void;
  /** Berkedip pada posisi asli satu bagian yang belum terpasang; mengembalikan kodenya */
  petunjuk: () => string | null;
  /** Tonjolkan bayangan posisi asli sebuah bagian (mis. saat disorot di daftar) */
  tonjolkan: (kode: string | null) => void;
  /** Hanya untuk pengujian: memasang semua bagian yang tersisa seolah dipasang benar pada percobaan pertama */
  pasangSemuaUntukUji: () => void;
  bersihkan: () => void;
}

export interface OpsiRakit {
  wadah: HTMLElement;
  urlModel: string;
  /** kode bagian yang dipakai (urutan prioritas dari POLA_*) */
  pola: PolaBagian[];
  saatPilih?: (kode: string | null) => void;
  saatPasang: (kode: string, percobaan: number, terpasang: number, total: number) => void;
  saatSalah?: (kode: string, jumlahSalah: number) => void;
}

interface Potongan {
  kode: string;
  grup: THREE.Group;
  meshes: THREE.Mesh[];
  bayangan: THREE.Group;
  bahanBayangan: THREE.MeshBasicMaterial;
  pusat: THREE.Vector3; // posisi asli (pusat) di ruang panggung
  terpasang: boolean;
  salah: number;
  bahan: THREE.MeshStandardMaterial[];
}

const AMBANG_PIKSEL = 72;

function namaLengkap(o: THREE.Object3D): string {
  const bagian: string[] = [];
  for (let n: THREE.Object3D | null = o; n; n = n.parent) bagian.push(n.name.toLowerCase());
  return bagian.join("/");
}

export async function mulaiRakit(opsi: OpsiRakit): Promise<MesinRakit> {
  const { wadah } = opsi;
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
  const JARAK_DASAR = 4.6;
  camera.position.set(0.2, 0.5, JARAK_DASAR);
  /* Wadah sempit (HP): kamera mundur supaya semua bagian yang tersebar tetap terlihat */
  const sesuaikanJarak = () => camera.position.setLength(JARAK_DASAR * Math.max(1, 1.33 / (lebar / tinggi)));
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
    model = await new Promise<THREE.Group>((selesai, gagal) =>
      loader.load(
        opsi.urlModel,
        (g) => selesai(g.scene),
        undefined,
        () => gagal(new Error("berkas model 3D gagal dimuat.")),
      ),
    );
  } catch (e) {
    renderer.dispose();
    renderer.domElement.remove();
    throw e;
  }

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

  /* Kelompokkan mesh ke bagian menurut prioritas pola */
  const peta = new Map<string, THREE.Mesh[]>(opsi.pola.map((p) => [p.kode, []]));
  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const nama = namaLengkap(m);
    for (const p of opsi.pola) {
      if (p.pola.some((x) => nama.includes(x))) {
        peta.get(p.kode)?.push(m);
        return;
      }
    }
  });

  const potongan: Potongan[] = [];
  const bayanganInduk = new THREE.Group();
  panggung.add(bayanganInduk);
  for (const p of opsi.pola) {
    const meshes = peta.get(p.kode) ?? [];
    if (meshes.length === 0) continue;
    const grup = new THREE.Group();
    panggung.add(grup);
    const bahanBayangan = new THREE.MeshBasicMaterial({
      color: 0x8a94a8,
      transparent: true,
      opacity: 0.07,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const bayangan = new THREE.Group();
    bayanganInduk.add(bayangan);
    const bahan: THREE.MeshStandardMaterial[] = [];
    const kotak = new THREE.Box3();
    for (const m of meshes) {
      const b = new THREE.Mesh(m.geometry, bahanBayangan);
      m.matrixWorld.decompose(b.position, b.quaternion, b.scale);
      bayangan.add(b);
      kotak.expandByObject(m);
      const asli = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.MeshStandardMaterial;
      const klon = asli.clone();
      m.material = klon;
      bahan.push(klon);
      grup.attach(m);
    }
    potongan.push({
      kode: p.kode,
      grup,
      meshes,
      bayangan,
      bahanBayangan,
      pusat: kotak.getCenter(new THREE.Vector3()),
      terpasang: false,
      salah: 0,
      bahan,
    });
  }

  /* Sebar bagian mengelilingi organ (bergantian kiri-kanan, berbeda tinggi) */
  function sebar(hanyaBelumPasang: boolean) {
    const sisa = potongan.filter((p) => !hanyaBelumPasang || !p.terpasang);
    const n = sisa.length;
    const acak = Math.random() * Math.PI * 2;
    sisa.forEach((p, i) => {
      const sudut = acak + (i / Math.max(n, 1)) * Math.PI * 2;
      const jari = 1.35 + (i % 3) * 0.18;
      p.grup.position.set(
        Math.cos(sudut) * jari - p.pusat.x * 0.3,
        Math.sin(i * 2.1 + acak) * 0.55 - p.pusat.y * 0.3,
        Math.sin(sudut) * jari * 0.5,
      );
    });
  }
  sebar(false);

  /* ----- interaksi seret ----- */
  const rayc = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const bidang = new THREE.Plane();
  const titikSentuh = new THREE.Vector3();
  const selisih = new THREE.Vector3();
  let seret: { p: Potongan; mulaiPos: THREE.Vector3; awalLayar: THREE.Vector2 } | null = null;
  let disorot: Potongan | null = null;
  let tonjolan: string | null = null;
  let kedipHingga = 0;
  let kedipKode: string | null = null;

  function hitungNdc(e: PointerEvent) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }
  function cariPotongan(): { p: Potongan; titik: THREE.Vector3 } | null {
    rayc.setFromCamera(ndc, camera);
    const objek = potongan.filter((p) => !p.terpasang).flatMap((p) => p.meshes);
    const kena = rayc.intersectObjects(objek, false)[0];
    if (!kena) return null;
    const p = potongan.find((x) => x.meshes.includes(kena.object as THREE.Mesh));
    return p ? { p, titik: kena.point.clone() } : null;
  }
  function ke2D(v: THREE.Vector3, keluar: THREE.Vector2) {
    const w = v.clone().applyMatrix4(panggung.matrixWorld).project(camera);
    const r = renderer.domElement.getBoundingClientRect();
    return keluar.set(((w.x + 1) / 2) * r.width, ((1 - w.y) / 2) * r.height);
  }
  function sorotPotongan(p: Potongan | null, kuat: number) {
    if (!p) return;
    for (const b of p.bahan) b.emissive.set(kuat > 0 ? 0x1566f4 : 0x000000).multiplyScalar(kuat);
  }

  function saatTekan(e: PointerEvent) {
    hitungNdc(e);
    const hasil = cariPotongan();
    if (!hasil) return;
    const { p, titik } = hasil;
    kontrol.enabled = false;
    renderer.domElement.setPointerCapture(e.pointerId);
    camera.getWorldDirection(selisih);
    bidang.setFromNormalAndCoplanarPoint(selisih, titik);
    seret = {
      p,
      mulaiPos: p.grup.position.clone().sub(panggung.worldToLocal(titik.clone())),
      awalLayar: new THREE.Vector2(e.clientX, e.clientY),
    };
    disorot = p;
    sorotPotongan(p, 0.5);
    p.bahanBayangan.opacity = 0.32;
    p.bahanBayangan.color.set(0x1566f4);
    opsi.saatPilih?.(p.kode);
    renderer.domElement.style.cursor = "grabbing";
  }
  function saatGerak(e: PointerEvent) {
    hitungNdc(e);
    if (!seret) {
      renderer.domElement.style.cursor = cariPotongan() ? "grab" : "default";
      return;
    }
    rayc.setFromCamera(ndc, camera);
    if (rayc.ray.intersectPlane(bidang, titikSentuh)) {
      seret.p.grup.position.copy(panggung.worldToLocal(titikSentuh.clone()).add(seret.mulaiPos));
    }
  }
  function saatLepas(e: PointerEvent) {
    if (!seret) return;
    const { p, awalLayar } = seret;
    seret = null;
    kontrol.enabled = true;
    try {
      renderer.domElement.releasePointerCapture(e.pointerId);
    } catch {
      /* sudah dilepas */
    }
    renderer.domElement.style.cursor = "default";
    sorotPotongan(p, 0);
    const geser = Math.hypot(e.clientX - awalLayar.x, e.clientY - awalLayar.y);
    /* Jarak di layar antara posisi sekarang dan posisi asli bagian ini */
    const sekarang = ke2D(p.pusat.clone().add(p.grup.position), new THREE.Vector2());
    const asli = ke2D(p.pusat, new THREE.Vector2());
    if (sekarang.distanceTo(asli) <= AMBANG_PIKSEL) {
      pasang(p);
    } else if (geser > 8) {
      p.salah += 1;
      opsi.saatSalah?.(p.kode, p.salah);
      p.bahanBayangan.opacity = tonjolan === p.kode ? 0.3 : 0.07;
      p.bahanBayangan.color.set(0x8a94a8);
      opsi.saatPilih?.(null);
    } else {
      p.bahanBayangan.opacity = 0.07;
      p.bahanBayangan.color.set(0x8a94a8);
      opsi.saatPilih?.(null);
    }
    disorot = null;
  }

  /* Animasi menempel */
  const menempel: { p: Potongan; dari: THREE.Vector3; mulai: number }[] = [];
  function pasang(p: Potongan) {
    p.terpasang = true;
    menempel.push({ p, dari: p.grup.position.clone(), mulai: performance.now() });
    p.bahanBayangan.opacity = 0;
    for (const b of p.bahan) b.emissive.set(0x1f9d55).multiplyScalar(0.6);
    const sudah = potongan.filter((x) => x.terpasang).length;
    opsi.saatPasang(p.kode, p.salah + 1, sudah, potongan.length);
  }

  renderer.domElement.addEventListener("pointerdown", saatTekan);
  renderer.domElement.addEventListener("pointermove", saatGerak);
  renderer.domElement.addEventListener("pointerup", saatLepas);
  renderer.domElement.addEventListener("pointercancel", saatLepas);

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

  let rafId = 0;
  function gelung(sekarang: number) {
    rafId = requestAnimationFrame(gelung);
    if (!tampil) return;
    for (let i = menempel.length - 1; i >= 0; i--) {
      const m = menempel[i] as (typeof menempel)[number];
      const u = Math.min((sekarang - m.mulai) / 260, 1);
      const h = 1 - (1 - u) ** 3;
      m.p.grup.position.lerpVectors(m.dari, new THREE.Vector3(), h);
      if (u >= 1) {
        for (const b of m.p.bahan) b.emissive.set(0x000000);
        menempel.splice(i, 1);
      } else {
        for (const b of m.p.bahan) b.emissive.set(0x1f9d55).multiplyScalar(0.6 * (1 - u));
      }
    }
    /* Bayangan posisi asli bagian yang ditonjolkan / berkedip */
    for (const p of potongan) {
      if (p.terpasang || p === disorot) continue;
      let opas = 0.07;
      let warna = 0x8a94a8;
      if (tonjolan === p.kode) {
        opas = 0.3;
        warna = 0x1566f4;
      }
      if (kedipKode === p.kode && sekarang < kedipHingga) {
        opas = 0.2 + 0.3 * Math.abs(Math.sin(sekarang / 140));
        warna = 0xf0a020;
      }
      p.bahanBayangan.opacity += (opas - p.bahanBayangan.opacity) * 0.25;
      p.bahanBayangan.color.set(warna);
    }
    kontrol.update();
    renderer.render(scene, camera);
  }
  rafId = requestAnimationFrame(gelung);

  return {
    acak: () => sebar(true),
    petunjuk: () => {
      const sisa = potongan.filter((p) => !p.terpasang);
      if (sisa.length === 0) return null;
      const p = sisa[Math.floor(Math.random() * sisa.length)] as Potongan;
      kedipKode = p.kode;
      kedipHingga = performance.now() + 2600;
      return p.kode;
    },
    tonjolkan: (kode) => {
      tonjolan = kode;
    },
    pasangSemuaUntukUji: () => {
      for (const p of potongan) if (!p.terpasang) pasang(p);
    },
    bersihkan: () => {
      cancelAnimationFrame(rafId);
      pengamatUkuran.disconnect();
      pengamatTampil.disconnect();
      renderer.domElement.removeEventListener("pointerdown", saatTekan);
      renderer.domElement.removeEventListener("pointermove", saatGerak);
      renderer.domElement.removeEventListener("pointerup", saatLepas);
      renderer.domElement.removeEventListener("pointercancel", saatLepas);
      kontrol.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          for (const b of Array.isArray(m.material) ? m.material : [m.material]) b.dispose();
        }
      });
      for (const p of potongan) p.bahanBayangan.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
