/* ==========================================================================
   viewer3d.ts — Penampil model organ 3D (FR-03 & FR-04), Three.js.
   Dimuat dinamis (import()) hanya di klien oleh komponen PenampilOrgan /
   Hero3D. Tanggung jawab modul ini hanya scene 3D dan posisi layar tiap
   titik; markup dan atribut ARIA titik interaktif dibuat oleh React.

   Kinerja: render sesuai kebutuhan (hanya saat kamera/animasi berubah),
   berhenti saat tergulir keluar layar (IntersectionObserver), pixel ratio
   dibatasi 1,5, uji titik tersembunyi tanpa raycast per frame.
   ========================================================================== */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { type GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export interface TitikMasukan {
  id: number;
  el: HTMLElement;
  /** pecahan kotak batas model, dari posisi_koordinat_3d "x,y,z" (cadangan) */
  x: number;
  y: number;
  z: number;
  /** pola nama node .glb (boleh memakai *) yang membentuk bagian ini */
  mesh?: string[];
}

export interface OpsiPenampil {
  wadah: HTMLElement;
  urlModel: string;
  titik: TitikMasukan[];
  saatProgres?: (persen: number) => void;
  /** Mode hero: berputar pelan, tanpa titik, sudut dibatasi */
  dekoratif?: boolean;
  jarak?: number;
  kecepatanPutar?: number;
  bolehSeret?: boolean;
}

export type NamaLapisan = "kulit" | "otot" | "tulang" | "organ_dalam";

export interface Penampil {
  setLapisan: (nama: NamaLapisan, terlihat: boolean) => void;
  setAutoRotasi: (nyala: boolean) => void;
  ubahJarak: (faktor: number) => void;
  reset: () => void;
  /** Menghadap sekaligus mendekat ke titik (bagian tampak diperbesar). */
  fokusKe: (idTitik: number, faktorJarak?: number) => void;
  /** Kembalikan pusat orbit & jarak ke semula, arah pandang dipertahankan. */
  lepasFokus: () => void;
  /** Sorot area permukaan di sekitar titik; null untuk mematikan. */
  sorotTitik: (idTitik: number | null) => void;
  /** Geser tampilan (px) agar model tidak tertutup panel; 0,0 = kembali. */
  geserTampilan: (px: number, py: number) => void;
  /** FR-03: sesi WebXR immersive-ar (ARCore/ARKit lewat peramban); menolak bila tidak didukung. */
  mulaiAR: (saatSelesai?: () => void) => Promise<void>;
  hentikanAR: () => Promise<void>;
  bersihkan: () => void;
}

/** Benar bila peramban mendukung WebXR immersive-ar (Chrome Android/ARCore, Quest, dll.). */
export async function dukungWebXR(): Promise<boolean> {
  const xr = (navigator as Navigator & { xr?: { isSessionSupported: (m: string) => Promise<boolean> } }).xr;
  if (!xr) return false;
  try {
    return await xr.isSessionSupported("immersive-ar");
  } catch {
    return false;
  }
}

const POSISI_KAMERA_AWAL = new THREE.Vector3(0, 0.12, 1.85);

interface TitikInternal {
  id: number;
  el: HTMLElement;
  posisi: THREE.Vector3;
  normal: THREE.Vector3;
  tertutup: boolean;
  tersembunyi: boolean;
  /** mesh bernama yang membentuk bagian ini (kosong bila model tanpa nama node) */
  mesh: THREE.Mesh[];
}

const OPASITAS_HANTU = 0.3;

/** Mengubah pola "VH_M_right_*_segment" menjadi RegExp yang cocok utuh. */
function polaKeRegExp(pola: string): RegExp {
  return new RegExp(
    "^" +
      pola
        .split("*")
        .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join(".*") +
      "$",
  );
}

/* Menyerahkan main thread sejenak di antara tahap berat (task chunking) agar
   interaksi pengguna tetap responsif (INP <= 200 ms). scheduler.yield() bila
   tersedia, selain itu setTimeout 0. */
interface SchedulerYield {
  yield?: () => Promise<void>;
}
function serahkanKeUtama(): Promise<void> {
  const scheduler = (globalThis as { scheduler?: SchedulerYield }).scheduler;
  if (scheduler?.yield) return scheduler.yield();
  return new Promise((selesai) => setTimeout(selesai, 0));
}

function muatModel(loader: GLTFLoader, url: string, saatProgres?: (persen: number) => void): Promise<GLTF> {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      resolve,
      (peristiwa) => {
        if (saatProgres && peristiwa.total) saatProgres(Math.round((peristiwa.loaded / peristiwa.total) * 100));
      },
      () => reject(new Error("berkas model 3D gagal dimuat.")),
    );
  });
}

/* Lapisan anatomi buatan di sekeliling organ (FR-05): model hanya berisi
   organ, jadi kulit, otot, dan tulang dibentuk dari geometri sederhana. */
function buatLapisan(): Record<Exclude<NamaLapisan, "organ_dalam">, THREE.Object3D> {
  function selubung(radius: number, panjang: number, warna: number, opasitas: number) {
    const bahan = new THREE.MeshStandardMaterial({
      color: warna,
      transparent: true,
      opacity: opasitas,
      roughness: 0.85,
      metalness: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    return new THREE.Mesh(new THREE.CapsuleGeometry(radius, panjang, 6, 32), bahan);
  }
  const kulit = selubung(0.66, 0.52, 0xf0c4a2, 0.13);
  const otot = selubung(0.58, 0.46, 0xb2495a, 0.15);

  const tulang = new THREE.Group();
  const bahanTulang = new THREE.MeshStandardMaterial({
    color: 0xdde5f0,
    transparent: true,
    opacity: 0.6,
    roughness: 0.6,
    metalness: 0,
  });
  for (let i = 0; i < 5; i += 1) {
    const y = 0.42 - i * 0.2;
    const radius = 0.44 + Math.sin(((i + 1) / 6) * Math.PI) * 0.1;
    for (const arah of [1, -1]) {
      const rusuk = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.016, 8, 40, Math.PI * 0.72), bahanTulang);
      rusuk.rotation.x = Math.PI / 2;
      rusuk.rotation.z = arah > 0 ? Math.PI * 0.14 : Math.PI * 0.86;
      rusuk.position.y = y;
      tulang.add(rusuk);
    }
  }
  const tulangDada = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.85, 0.05), bahanTulang);
  tulangDada.position.set(0, 0.05, 0.5);
  tulang.add(tulangDada);

  return { kulit, otot, tulang };
}

export async function buatPenampil(opsi: OpsiPenampil): Promise<Penampil> {
  const { wadah } = opsi;
  const dekoratif = Boolean(opsi.dekoratif);
  const posisiAwal = POSISI_KAMERA_AWAL.clone();
  if (opsi.jarak) posisiAwal.setLength(opsi.jarak);
  /* Wadah tegak (HP) lebih sempit dari modelnya: kamera dimundurkan sebanding rasio */
  const aspekWadah = (wadah.clientWidth || 1) / (wadah.clientHeight || 1);
  if (aspekWadah < 1) posisiAwal.setLength((posisiAwal.length() / Math.max(aspekWadah, 0.55)) * 0.95);
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
  renderer.toneMappingExposure = 0.92;
  renderer.domElement.style.display = "block";
  renderer.domElement.style.touchAction = "none";
  wadah.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  /* Model HRA berwarna rata tanpa tekstur; pencahayaan dibuat lebih lembut
     supaya warnanya tidak pudar dan sorotan spekular tidak "meledak". */
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(42, lebar / tinggi, 0.01, 100);
  camera.position.copy(posisiAwal);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.rotateSpeed = 0.85;
  controls.zoomSpeed = 0.8;
  /* Roda mouse dibiarkan menggulir halaman; zoom lewat Ctrl/Cmd + gulir atau tombol */
  controls.enableZoom = false;
  controls.minDistance = 1.1;
  controls.maxDistance = 4;
  controls.autoRotateSpeed = 1.4;
  if (dekoratif) {
    controls.autoRotate = true;
    controls.autoRotateSpeed = opsi.kecepatanPutar ?? 0.9;
    controls.enableRotate = opsi.bolehSeret !== false;
    controls.minPolarAngle = Math.PI * 0.35;
    controls.maxPolarAngle = Math.PI * 0.65;
  }

  scene.add(new THREE.HemisphereLight(0xffffff, 0x93a8cc, 0.35));
  const cahayaUtama = new THREE.DirectionalLight(0xffffff, 1.1);
  cahayaUtama.position.set(2.5, 3, 4);
  scene.add(cahayaUtama);
  const cahayaIsi = new THREE.DirectionalLight(0xd9e5ff, 0.45);
  cahayaIsi.position.set(-3, 0.5, -2.5);
  scene.add(cahayaIsi);

  const panggung = new THREE.Group();
  scene.add(panggung);

  /* --- Memuat organ, menormalkan ukuran dan pusatnya --- */
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  let gltf: GLTF;
  try {
    gltf = await muatModel(loader, opsi.urlModel, opsi.saatProgres);
  } catch (kesalahan) {
    renderer.dispose();
    renderer.domElement.remove();
    throw kesalahan;
  }
  const organ = gltf.scene;
  await serahkanKeUtama(); // pemuatan & dekode model selesai: beri jalan ke input pengguna

  /* Sorotan area: bagian terpilih ditandai di shader dengan mewarnai fragmen
     di sekitar titik terpilih (tint biru + cincin tipis). Uniform dibagi ke
     semua material sehingga cukup diperbarui sekali. */
  const uniformSorot = {
    uSorot: { value: new THREE.Vector3() },
    uRadius: { value: 0.16 },
    uKuat: { value: 0 },
    uWarna: { value: new THREE.Color(0x1a6dff) },
  };
  /* Mode dekoratif (hero) tidak butuh sorotan: lewati penyuntikan shader agar
     program GPU bawaan dipakai apa adanya (kompilasi lebih cepat). */
  if (!dekoratif)
    organ.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const daftarBahan: THREE.Material[] = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const bahan of daftarBahan) {
        bahan.onBeforeCompile = (shader) => {
          Object.assign(shader.uniforms, uniformSorot);
          shader.vertexShader = shader.vertexShader
            .replace("#include <common>", "#include <common>\nvarying vec3 vPosSorot;")
            .replace(
              "#include <project_vertex>",
              "#include <project_vertex>\nvPosSorot = (modelMatrix * vec4(transformed, 1.0)).xyz;",
            );
          shader.fragmentShader = shader.fragmentShader
            .replace(
              "#include <common>",
              "#include <common>\nvarying vec3 vPosSorot;\nuniform vec3 uSorot;\nuniform float uRadius;\nuniform float uKuat;\nuniform vec3 uWarna;",
            )
            .replace(
              "#include <dithering_fragment>",
              "#include <dithering_fragment>\n{\n" +
                "  float jarakSorot = distance(vPosSorot, uSorot);\n" +
                "  float isi = 1.0 - smoothstep(uRadius * 0.35, uRadius, jarakSorot);\n" +
                "  float cincin = smoothstep(uRadius * 0.88, uRadius * 0.96, jarakSorot) * (1.0 - smoothstep(uRadius * 0.98, uRadius * 1.05, jarakSorot));\n" +
                "  gl_FragColor.rgb = mix(gl_FragColor.rgb, uWarna, isi * uKuat * 0.38);\n" +
                "  gl_FragColor.rgb += uWarna * cincin * uKuat * 0.55;\n}",
            );
        };
        bahan.needsUpdate = true;
      }
    });
  let kuatTujuan = 0;

  /* Sorotan per-mesh: mesh terpilih tetap berwarna asli, mesh lain kehilangan
     saturasi (abu-abu) dan menjadi tembus pandang agar bagian di dalam organ
     (mis. katup) ikut terlihat. Peralihannya dianimasikan lewat transisiSorot 0..1. */
  let meshTerpilih: THREE.Mesh[] = [];
  let transisiSorot = 0;
  let transisiTujuan = 0;
  const bahanSorot = new Map<THREE.Mesh, THREE.MeshStandardMaterial[]>();

  const kotak = new THREE.Box3().setFromObject(organ);
  const ukuran = kotak.getSize(new THREE.Vector3());
  const pusat = kotak.getCenter(new THREE.Vector3());
  const skala = 1 / Math.max(ukuran.x, ukuran.y, ukuran.z);
  organ.position.sub(pusat);
  const pembungkus = new THREE.Group();
  pembungkus.add(organ);
  pembungkus.scale.setScalar(skala);
  panggung.add(pembungkus);
  const ukuranNormal = ukuran.clone().multiplyScalar(skala);

  /* Daftar mesh bernama (model HRA memberi nama anatomi tiap node) dan
     material aslinya, untuk sorotan per-mesh dan pemulihan. */
  const semuaMesh: THREE.Mesh[] = [];
  organ.traverse((obj) => {
    if (obj instanceof THREE.Mesh) semuaMesh.push(obj);
  });
  const bahanAsli = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  for (const m of semuaMesh) bahanAsli.set(m, m.material);
  function cariMesh(pola: string[] | undefined): THREE.Mesh[] {
    if (!pola?.length) return [];
    const daftarRe = pola.map(polaKeRegExp);
    return semuaMesh.filter((m) => {
      /* nama biasanya ada di node induk; mesh anak sering tanpa nama */
      const nama = m.name || m.parent?.name || "";
      return daftarRe.some((re) => re.test(nama));
    });
  }

  const lapisan = buatLapisan();
  for (const objek of Object.values(lapisan)) {
    objek.visible = false;
    panggung.add(objek);
  }

  /* Matriks dunia harus diperbarui dulu; tanpa ini raycast mengenai posisi
     objek sebelum diskalakan dan tidak mengenai apa pun. */
  panggung.updateMatrixWorld(true);
  await serahkanKeUtama(); // sebelum raycast penempatan titik (tugas berat berikutnya)
  const raycaster = new THREE.Raycaster();

  /* posisi_koordinat_3d dipakai sebagai titik bidik: sinar dari posisi kamera
     awal ke titik itu, penanda diletakkan pada permukaan pertama yang kena. */
  function tempelkanKePermukaan(sasaran: THREE.Vector3, hanyaPada?: THREE.Object3D[]): THREE.Vector3 {
    const arah = sasaran.clone().sub(posisiAwal).normalize();
    raycaster.set(posisiAwal, arah);
    /* Bagian bernama ditempelkan ke permukaan mesh-nya sendiri, bukan ke
       permukaan organ yang kebetulan di depannya, supaya bagian belakang
       (mis. atrium kiri) tetap ditandai di tempat yang benar dan diredupkan
       sampai pengguna memutar model. */
    const kena = hanyaPada?.length
      ? raycaster.intersectObjects(hanyaPada, true)
      : raycaster.intersectObject(pembungkus, true);
    const pertama = kena[0] ?? raycaster.intersectObject(pembungkus, true)[0];
    if (!pertama) return sasaran;
    return pertama.point.clone().addScaledVector(arah, -0.035);
  }

  const kotakSementara = new THREE.Box3();
  const titik: TitikInternal[] = opsi.titik.map((t) => {
    const mesh = cariMesh(t.mesh);
    let sasaran: THREE.Vector3;
    if (mesh.length) {
      /* Titik bidik = pusat gabungan kotak batas mesh bernama (koordinat dunia) */
      kotakSementara.makeEmpty();
      for (const m of mesh) kotakSementara.expandByObject(m);
      sasaran = kotakSementara.getCenter(new THREE.Vector3());
    } else {
      sasaran = new THREE.Vector3(t.x * ukuranNormal.x, t.y * ukuranNormal.y, t.z * ukuranNormal.z);
    }
    const posisi = tempelkanKePermukaan(sasaran, mesh);
    return {
      id: t.id,
      el: t.el,
      posisi,
      normal: posisi.clone().normalize(),
      tertutup: false,
      tersembunyi: false,
      mesh,
    };
  });

  /** Material turunan per mesh (klon dari aslinya) agar bisa diubah tanpa menyentuh material bersama. */
  function bahanTurunan(m: THREE.Mesh): THREE.MeshStandardMaterial[] {
    let daftar = bahanSorot.get(m);
    if (daftar) return daftar;
    const asli = bahanAsli.get(m);
    const sumber = Array.isArray(asli) ? asli : asli ? [asli] : [];
    daftar = sumber.map((b) => {
      const klon = (
        b instanceof THREE.MeshStandardMaterial ? b.clone() : new THREE.MeshStandardMaterial()
      ) as THREE.MeshStandardMaterial;
      klon.transparent = true;
      klon.vertexColors = false; // warna per-vertex diabaikan agar bisa di-abu-abukan
      klon.onBeforeCompile = () => {};
      klon.needsUpdate = true;
      /* Simpan warna asli dan versi abu-abunya (luminans) untuk dicampur saat transisi */
      const asliWarna = klon.color.clone();
      const abu = 0.299 * asliWarna.r + 0.587 * asliWarna.g + 0.114 * asliWarna.b;
      klon.userData = { asliWarna, abuWarna: new THREE.Color(abu, abu, abu) };
      return klon;
    });
    bahanSorot.set(m, daftar);
    return daftar;
  }

  /** Menerapkan derajat transisi (0 = tampilan asli, 1 = sorotan penuh). */
  function terapkanSorotMesh(t: number) {
    if (t <= 0) {
      for (const m of semuaMesh) {
        const asli = bahanAsli.get(m);
        if (asli) m.material = asli;
      }
      return;
    }
    const terpilih = new Set(meshTerpilih);
    for (const m of semuaMesh) {
      if (terpilih.has(m)) {
        /* Bagian terpilih dibiarkan persis seperti aslinya */
        const asli = bahanAsli.get(m);
        if (asli) m.material = asli;
        m.renderOrder = 1;
        continue;
      }
      const daftar = bahanTurunan(m);
      for (const b of daftar) {
        const { asliWarna, abuWarna } = b.userData as { asliWarna: THREE.Color; abuWarna: THREE.Color };
        b.color.copy(asliWarna).lerp(abuWarna, t);
        b.opacity = 1 - (1 - OPASITAS_HANTU) * t;
        /* depthWrite dimatikan sejak awal transisi; membaliknya di tengah animasi
           membuat kilatan kedua saat mesh dalam tiba-tiba tembus terlihat */
        b.depthWrite = false;
      }
      m.material = daftar.length === 1 ? daftar[0]! : daftar;
      m.renderOrder = 0;
    }
  }

  const layar = new THREE.Vector3();
  const arahPandang = new THREE.Vector3();
  let targetKamera: THREE.Vector3 | null = null;
  let targetOrbit: THREE.Vector3 | null = null;
  const geserSekarang = { x: 0, y: 0 };
  const geserTujuan = { x: 0, y: 0 };
  let perluGambar = true;

  /* Geseran lewat view offset kamera: model tampak bergeser tanpa mengubah
     orbit, dan proyeksi titik ikut bergeser otomatis. */
  function terapkanGeser() {
    if (Math.abs(geserSekarang.x) < 0.5 && Math.abs(geserSekarang.y) < 0.5) {
      geserSekarang.x = 0;
      geserSekarang.y = 0;
      camera.clearViewOffset();
    } else {
      camera.setViewOffset(lebar, tinggi, geserSekarang.x, geserSekarang.y, lebar, tinggi);
    }
  }

  const mintaGambar = () => {
    perluGambar = true;
  };
  controls.addEventListener("change", mintaGambar);

  function perbaruiTitik() {
    camera.getWorldDirection(arahPandang);
    for (const t of titik) {
      layar.copy(t.posisi).project(camera);
      const tersembunyi = layar.z > 1;
      const x = (layar.x * 0.5 + 0.5) * lebar;
      const y = (-layar.y * 0.5 + 0.5) * tinggi;
      t.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      if (t.tersembunyi !== tersembunyi) {
        t.el.hidden = tersembunyi;
        t.tersembunyi = tersembunyi;
      }
      if (tersembunyi) continue;
      /* Titik di sisi belakang organ diredupkan: bandingkan arah keluar
         permukaan dengan arah pandang, jauh lebih murah daripada raycast. */
      const tertutup = t.normal.dot(arahPandang) > -0.12;
      if (t.tertutup !== tertutup) {
        t.el.classList.toggle("titik-tertutup", tertutup);
        t.tertutup = tertutup;
      }
    }
  }

  /* Render hanya saat ada perubahan; saat diam, halaman tidak dibebani. */
  function gambar() {
    if (targetKamera) {
      camera.position.lerp(targetKamera, 0.09);
      if (camera.position.distanceTo(targetKamera) < 0.005) targetKamera = null;
      perluGambar = true;
    }
    if (targetOrbit) {
      controls.target.lerp(targetOrbit, 0.09);
      if (controls.target.distanceTo(targetOrbit) < 0.004) targetOrbit = null;
      perluGambar = true;
    }
    if (Math.abs(transisiSorot - transisiTujuan) > 0.005) {
      transisiSorot += (transisiTujuan - transisiSorot) * 0.12;
      terapkanSorotMesh(transisiSorot);
      perluGambar = true;
    } else if (transisiSorot !== transisiTujuan) {
      transisiSorot = transisiTujuan;
      terapkanSorotMesh(transisiSorot);
      perluGambar = true;
    }
    if (Math.abs(uniformSorot.uKuat.value - kuatTujuan) > 0.005) {
      uniformSorot.uKuat.value += (kuatTujuan - uniformSorot.uKuat.value) * 0.1;
      perluGambar = true;
    } else if (uniformSorot.uKuat.value !== kuatTujuan) {
      uniformSorot.uKuat.value = kuatTujuan;
      perluGambar = true;
    }
    if (geserSekarang.x !== geserTujuan.x || geserSekarang.y !== geserTujuan.y) {
      geserSekarang.x += (geserTujuan.x - geserSekarang.x) * 0.12;
      geserSekarang.y += (geserTujuan.y - geserSekarang.y) * 0.12;
      if (Math.abs(geserTujuan.x - geserSekarang.x) < 0.5) geserSekarang.x = geserTujuan.x;
      if (Math.abs(geserTujuan.y - geserSekarang.y) < 0.5) geserSekarang.y = geserTujuan.y;
      terapkanGeser();
      perluGambar = true;
    }
    if (renderer.xr.isPresenting) {
      /* Dalam sesi XR kamera dikelola perangkat: gambar setiap frame, titik HTML tidak diposisikan */
      renderer.render(scene, camera);
      return;
    }
    const kameraBergerak = controls.update();
    if (!perluGambar && !kameraBergerak && !controls.autoRotate) return;
    perluGambar = false;
    renderer.render(scene, camera);
    perbaruiTitik();
  }
  renderer.setAnimationLoop(gambar);

  /* ---------- FR-03: WebXR immersive-ar ----------
     Model ditempatkan ~1,2 m di depan pengguna pada ruang referensi "local";
     kendali orbit dimatikan selama sesi dan transformasi panggung dipulihkan
     saat sesi berakhir (tombol keluar atau gestur sistem). */
  let sesiXR: XRSession | null = null;
  const transformAwal = { posisi: panggung.position.clone(), skala: panggung.scale.clone() };
  function pulihkanSetelahXR() {
    sesiXR = null;
    renderer.xr.enabled = false;
    panggung.position.copy(transformAwal.posisi);
    panggung.scale.copy(transformAwal.skala);
    controls.enabled = true;
    renderer.setSize(lebar, tinggi);
    camera.aspect = lebar / tinggi;
    camera.updateProjectionMatrix();
    mintaGambar();
  }
  async function mulaiAR(saatSelesai?: () => void) {
    const xr = (navigator as Navigator & { xr?: XRSystem }).xr;
    if (!xr || !(await dukungWebXR())) throw new Error("WebXR immersive-ar tidak didukung peramban ini.");
    const sesi = await xr.requestSession("immersive-ar", {
      optionalFeatures: ["dom-overlay", "local-floor"],
      domOverlay: { root: wadah },
    });
    sesiXR = sesi;
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType("local");
    await renderer.xr.setSession(sesi);
    controls.enabled = false;
    controls.autoRotate = false;
    panggung.position.set(0, -0.05, -1.2);
    panggung.scale.setScalar(0.35);
    sesi.addEventListener(
      "end",
      () => {
        pulihkanSetelahXR();
        saatSelesai?.();
      },
      { once: true },
    );
  }
  async function hentikanAR() {
    if (!sesiXR) return;
    await sesiXR.end().catch(() => undefined);
  }

  const pengamat = new ResizeObserver(() => {
    lebar = wadah.clientWidth || 1;
    tinggi = wadah.clientHeight || 1;
    camera.aspect = lebar / tinggi;
    camera.updateProjectionMatrix();
    renderer.setSize(lebar, tinggi);
    terapkanGeser();
    mintaGambar();
  });
  pengamat.observe(wadah);

  /* Penampil dihentikan total ketika tergulir keluar layar */
  const pengamatTampak = new IntersectionObserver(
    (entri) => {
      const tampak = Boolean(entri[0]?.isIntersecting);
      renderer.setAnimationLoop(tampak ? gambar : null);
      if (tampak) mintaGambar();
    },
    { threshold: 0 },
  );
  pengamatTampak.observe(wadah);

  function ubahJarak(faktor: number) {
    const arah = camera.position.clone().sub(controls.target);
    const jarak = THREE.MathUtils.clamp(arah.length() * faktor, controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target).add(arah.setLength(jarak));
    mintaGambar();
  }

  /* Zoom roda hanya bila Ctrl/Cmd ditahan (atau cubit trackpad) */
  function saatRoda(e: WheelEvent) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    ubahJarak(e.deltaY > 0 ? 1.08 : 0.93);
  }
  renderer.domElement.addEventListener("wheel", saatRoda, { passive: false });

  const arahkanKamera = (posisi: THREE.Vector3) => {
    targetKamera = posisi;
    perluGambar = true;
  };
  const arahkanOrbit = (titikPusat: THREE.Vector3) => {
    targetOrbit = titikPusat;
    perluGambar = true;
  };

  /* Selubung lebih besar dari organ: kamera mundur otomatis agar semua masuk bingkai */
  function sesuaikanJarak() {
    const adaSelubung = Object.values(lapisan).some((o) => o.visible);
    const jarakSekarang = camera.position.distanceTo(controls.target);
    const jarakTujuan = adaSelubung ? posisiAwal.length() * 1.38 : posisiAwal.length();
    if (Math.abs(jarakSekarang - jarakTujuan) < 0.05) return;
    if (adaSelubung && jarakSekarang > jarakTujuan) return;
    const arah = camera.position.clone().sub(controls.target).setLength(jarakTujuan);
    arahkanKamera(controls.target.clone().add(arah));
  }

  let sudahDibersihkan = false;

  return {
    setLapisan(nama, terlihat) {
      if (nama === "organ_dalam") {
        pembungkus.visible = terlihat;
      } else {
        lapisan[nama].visible = terlihat;
        sesuaikanJarak();
      }
      mintaGambar();
    },
    setAutoRotasi(nyala) {
      controls.autoRotate = nyala;
      mintaGambar();
    },
    ubahJarak,
    reset() {
      controls.autoRotate = false;
      arahkanOrbit(new THREE.Vector3(0, 0, 0));
      arahkanKamera(posisiAwal.clone());
    },
    fokusKe(idTitik, faktorJarak = 0.66) {
      const t = titik.find((x) => x.id === idTitik);
      if (!t) return;
      const arah = t.posisi.clone().normalize();
      if (arah.lengthSq() === 0) return;
      const pusatBaru = t.posisi.clone().multiplyScalar(0.45);
      const jarak = Math.max(controls.minDistance, posisiAwal.length() * faktorJarak);
      /* Sedikit dari atas, tetapi dibatasi agar bagian di puncak organ (mis. aorta)
         tidak membuat kamera menghadap lurus ke bawah */
      arah.y = Math.min(Math.max(arah.y, -0.2) + 0.18, 0.5);
      arah.normalize();
      controls.autoRotate = false;
      arahkanOrbit(pusatBaru);
      arahkanKamera(pusatBaru.clone().addScaledVector(arah, jarak));
    },
    lepasFokus() {
      const arah = camera.position.clone().sub(controls.target).normalize();
      arahkanOrbit(new THREE.Vector3(0, 0, 0));
      arahkanKamera(arah.multiplyScalar(posisiAwal.length()));
    },
    sorotTitik(idTitik) {
      const t = idTitik === null ? undefined : titik.find((x) => x.id === idTitik);
      if (t?.mesh.length) {
        /* Model bernama: sorot mesh-nya, redupkan sisanya; cincin shader dimatikan.
           Diterapkan langsung juga, sebab bila transisi sudah penuh (pindah dari
           bagian lain) gelung render tidak memanggil terapkanSorotMesh lagi. */
        meshTerpilih = t.mesh;
        transisiTujuan = 1;
        kuatTujuan = 0;
        if (transisiSorot > 0) terapkanSorotMesh(transisiSorot);
      } else {
        transisiTujuan = 0;
        if (t) {
          uniformSorot.uSorot.value.copy(t.posisi);
          uniformSorot.uRadius.value = 0.16;
        }
        kuatTujuan = t ? 1 : 0;
      }
      perluGambar = true;
    },
    geserTampilan(px, py) {
      geserTujuan.x = px;
      geserTujuan.y = py;
      perluGambar = true;
    },
    mulaiAR,
    hentikanAR,
    bersihkan() {
      if (sudahDibersihkan) return;
      sudahDibersihkan = true;
      void hentikanAR();
      renderer.setAnimationLoop(null);
      pengamat.disconnect();
      pengamatTampak.disconnect();
      renderer.domElement.removeEventListener("wheel", saatRoda);
      controls.dispose();
      scene.traverse((objek) => {
        if (!(objek instanceof THREE.Mesh)) return;
        objek.geometry.dispose();
        const bahan: THREE.Material[] = Array.isArray(objek.material) ? objek.material : [objek.material];
        for (const m of bahan) {
          for (const nilai of Object.values(m)) {
            if (nilai instanceof THREE.Texture) nilai.dispose();
          }
          m.dispose();
        }
      });
      for (const daftar of bahanSorot.values()) for (const b of daftar) b.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
