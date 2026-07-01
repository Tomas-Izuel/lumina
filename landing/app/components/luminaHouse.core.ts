/* Lumina — cinematic 3D property hero. Port fiel de lumina3d.js (Claude Design).
   Una casa, tres capítulos (estimación → tour → gemelo digital), en loop.
   Recibe THREE por inyección (no window.THREE) y notifica el capítulo por callback. */
import type * as THREE_NS from "three";
import { buildInterior, type BoxOpts } from "./luminaHouse.geometry";

type THREE = typeof THREE_NS;

const T = 15.5; // duración del loop en segundos

const smooth = (x: number) => {
  x = Math.max(0, Math.min(1, x));
  return x * x * x * (x * (x * 6 - 15) + 10);
};
const ramp = (t: number, a: number, b: number) => smooth((t - a) / (b - a));

// keyframes de cámara a lo largo del loop (world space)
const KF = [
  { t: 0.0, p: [0.3, 10.6, 20.6], l: [0, 1.2, 0] }, // cap 0 — estimación, 3/4 alto
  { t: 4.6, p: [2.4, 8.0, 16.2], l: [0.6, 1.2, 0] }, // acercamiento
  { t: 5.4, p: [-3.6, 2.3, 9.6], l: [-2.6, 1.1, 0.6] }, // cap 1 — al living
  { t: 8.0, p: [1.2, 2.0, 8.8], l: [1.3, 1.0, -1.2] }, // recorrido
  { t: 9.8, p: [4.4, 2.6, 9.2], l: [3.0, 1.0, -2.2] }, // dormitorio
  { t: 10.8, p: [0.3, 9.6, 18.8], l: [0, 1.2, 0] }, // cap 2 — pull up (gemelo)
  { t: 15.5, p: [0.3, 10.6, 20.6], l: [0, 1.2, 0] }, // vuelta al inicio
];

type Cam = { p: number[]; l: number[] };

function sampleCam(lt: number, out: Cam) {
  let i = 0;
  for (; i < KF.length - 1; i++) {
    if (lt >= KF[i].t && lt < KF[i + 1].t) break;
  }
  const a = KF[i];
  const b = KF[Math.min(i + 1, KF.length - 1)];
  const u = smooth((lt - a.t) / Math.max(0.0001, b.t - a.t));
  for (let k = 0; k < 3; k++) {
    out.p[k] = a.p[k] + (b.p[k] - a.p[k]) * u;
    out.l[k] = a.l[k] + (b.l[k] - a.l[k]) * u;
  }
}

export type LuminaHouseHandle = { destroy: () => void };

/** Monta la casa 3D dentro de `host`. Devuelve un handle para desmontar. */
export function createLuminaHouse(
  host: HTMLElement,
  THREE: THREE,
  onChapter?: (chapter: number) => void
): LuminaHouseHandle {
  const mouse = { x: 0, y: 0 };
  const t0 = performance.now();
  let ch = -1;
  let raf = 0;
  const camS: Cam = { p: [0, 0, 0], l: [0, 0, 0] };

  const w0 = host.clientWidth || 560;
  const h0 = host.clientHeight || 520;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w0, h0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.domElement.style.cssText = "display:block;width:100%;height:100%";
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(31, w0 / h0, 0.1, 100);

  const hemi = new THREE.HemisphereLight(0xffffff, 0xcfc2e6, 0.55);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff4ee, 1.05);
  key.position.set(7, 12, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 44;
  key.shadow.camera.left = -11;
  key.shadow.camera.right = 11;
  key.shadow.camera.top = 11;
  key.shadow.camera.bottom = -11;
  key.shadow.bias = -0.0004;
  key.shadow.radius = 4;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xc9b6f0, 0.32);
  fill.position.set(-8, 5, 4);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xbcd0f5, 0.28);
  rim.position.set(-3, 6, -9);
  scene.add(rim);

  const house = new THREE.Group();
  scene.add(house);

  const shadowMat = new THREE.ShadowMaterial({ opacity: 0.16 });
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), shadowMat);
  catcher.rotation.x = -Math.PI / 2;
  catcher.position.y = -0.42;
  catcher.receiveShadow = true;
  house.add(catcher);
  house.scale.set(0.8, 0.8, 0.8);
  house.rotation.y = -0.52;

  const mat = (color: string, rough?: number, metal?: number) =>
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: rough == null ? 0.85 : rough,
      metalness: metal == null ? 0.0 : metal,
      transparent: true,
    });

  const box = (parent: THREE_NS.Object3D, w: number, h: number, d: number, color: string, opts: BoxOpts = {}) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts.rough, opts.metal));
    m.position.set(opts.x || 0, opts.y || 0, opts.z || 0);
    if (opts.ry) m.rotation.y = opts.ry;
    m.castShadow = opts.cast !== false;
    m.receiveShadow = opts.receive !== false;
    parent.add(m);
    return m;
  };
  const cyl = (parent: THREE_NS.Object3D, rt: number, rb: number, h: number, color: string, opts: BoxOpts = {}) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, opts.seg || 18), mat(color, opts.rough, opts.metal));
    m.position.set(opts.x || 0, opts.y || 0, opts.z || 0);
    m.castShadow = opts.cast !== false;
    m.receiveShadow = opts.receive !== false;
    parent.add(m);
    return m;
  };
  const mkPlant = (parent: THREE_NS.Object3D, x: number, z: number, scale = 1) => {
    cyl(parent, 0.22 * scale, 0.28 * scale, 0.5 * scale, "#d6b6c6", { x, y: 0.25 * scale, z, rough: 0.9 });
    const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5 * scale, 1), mat("#84a684", 0.95));
    f.position.set(x, 0.85 * scale, z);
    f.castShadow = true;
    f.receiveShadow = true;
    parent.add(f);
    const f2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34 * scale, 1), mat("#74996f", 0.95));
    f2.position.set(x + 0.22 * scale, 1.15 * scale, z - 0.1 * scale);
    f2.castShadow = true;
    parent.add(f2);
  };

  buildInterior(house, { box, cyl, mkPlant });
  const { solids, lineMat, scan } = buildWire();
  const pin = buildPin();

  function buildWire() {
    const meshes: THREE_NS.Mesh[] = [];
    house.traverse((o) => {
      const m = o as THREE_NS.Mesh;
      if (m.isMesh && m.material && (m.material as THREE_NS.Material).type !== "ShadowMaterial") meshes.push(m);
    });
    const lineMat = new THREE.LineBasicMaterial({ color: 0x8f74c6, transparent: true, opacity: 0 });
    const solids: THREE_NS.Material[] = [];
    meshes.forEach((o) => {
      const material = o.material as THREE_NS.Material;
      material.transparent = true;
      solids.push(material);
      const eg = new THREE.EdgesGeometry(o.geometry, 20);
      const ls = new THREE.LineSegments(eg, lineMat);
      ls.position.copy(o.position);
      ls.rotation.copy(o.rotation);
      ls.scale.copy(o.scale);
      ls.renderOrder = 2;
      house.add(ls);
    });
    const scan = new THREE.Mesh(
      new THREE.PlaneGeometry(12.5, 9.4),
      new THREE.MeshBasicMaterial({
        color: 0xc3aef0, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      })
    );
    scan.rotation.x = -Math.PI / 2;
    scan.position.y = -0.4;
    house.add(scan);
    return { solids, lineMat, scan };
  }

  function buildPin() {
    const group = new THREE.Group();
    const pmat = () =>
      new THREE.MeshStandardMaterial({
        color: 0x9a83bf, emissive: new THREE.Color("#6b57a0"), emissiveIntensity: 0.35,
        roughness: 0.4, transparent: true,
      });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 24), pmat());
    head.castShadow = true;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.6, 24), pmat());
    tip.position.y = -0.5;
    tip.rotation.x = Math.PI;
    tip.castShadow = true;
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.16, 18, 18), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }));
    dot.position.y = 0.05;
    group.add(head);
    group.add(tip);
    group.add(dot);
    group.position.set(0.9, 4.1, 0.5);
    house.add(group);
    return group;
  }

  function resize() {
    const w = host.clientWidth || 560;
    const h = host.clientHeight || 520;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const onMove = (e: PointerEvent) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener("pointermove", onMove);
  const ro = new ResizeObserver(() => resize());
  ro.observe(host);

  function animate() {
    raf = requestAnimationFrame(animate);
    const t = (performance.now() - t0) / 1000;
    const lt = t % T;

    const nextCh = lt < 5 ? 0 : lt < 10.4 ? 1 : 2;
    if (nextCh !== ch) {
      ch = nextCh;
      onChapter?.(ch);
    }

    sampleCam(lt, camS);
    const s = camS;
    camera.position.set(s.p[0] + mouse.x * 0.5, s.p[1] - mouse.y * 0.35, s.p[2]);
    camera.lookAt(s.l[0], s.l[1], s.l[2]);

    let wf = 0;
    if (lt >= 10.4) wf = ramp(lt, 10.8, 11.7) * (1 - ramp(lt, 13.9, 14.8));
    const so = 1 - 0.85 * wf;
    for (let i = 0; i < solids.length; i++) solids[i].opacity = so;
    lineMat.opacity = wf;
    const scanMat = scan.material as THREE_NS.MeshBasicMaterial;
    if (wf > 0.01) {
      const sweep = ((lt - 10.8) % 1.7) / 1.7;
      scan.position.y = -0.4 + sweep * 3.4;
      scanMat.opacity = 0.32 * wf * (0.6 + 0.4 * Math.sin(lt * 8));
    } else {
      scanMat.opacity = 0;
    }

    const drop = ramp(lt, 0.2, 1.2);
    pin.visible = lt < 10.2;
    pin.position.y = 6.4 - 2.3 * drop + Math.sin(t * 1.6) * 0.14;
    pin.rotation.y = t * 0.6;
    const po = Math.min(drop, 1) * (1 - ramp(lt, 9.6, 10.2));
    pin.traverse((o) => {
      const m = o as THREE_NS.Mesh;
      if (m.material) {
        const material = m.material as THREE_NS.Material;
        material.transparent = true;
        material.opacity = po;
      }
    });

    renderer.render(scene, camera);
  }
  animate();

  return {
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
