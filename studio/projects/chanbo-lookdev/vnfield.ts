// Vietnamese village at golden hour for the chorus (look B+), after the user's reference painting: an old banyan with
// hanging aerial roots and a small đình under it, a lotus pond, a dirt road winding into the village with yellow cows
// (calves, one dairy cow) walking and grazing along it, young green rice on the right, tall bamboo, red-tile and thatched
// houses, haystacks and banana trees, pink evening clouds and birds.
import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { CowModel, type CowAsset, type CowCoat } from '../../src/kit/cowmodel';
import { addClouds, bladeGeometry, mulberry } from './field';

export interface VNCow { x: number; z: number; heading: number; speed: number; clip: 'walkslow' | 'idle' | 'walk'; coat?: CowCoat; scale?: number; bell?: boolean }
export const VN_HERD: VNCow[] = [
  { x: 0.4, z: -13, heading: 0.15, speed: 0.45, clip: 'walkslow' },
  { x: 1.6, z: -15.5, heading: 0.1, speed: 0.45, clip: 'walkslow', scale: 0.62 },
  { x: -0.6, z: -18.5, heading: 0.2, speed: 0.45, clip: 'walkslow', coat: 'brown' },
  { x: 1.2, z: -24, heading: -0.3, speed: 0.4, clip: 'walkslow' },
  { x: 3.8, z: -33, heading: -0.6, speed: 0.4, clip: 'walkslow', scale: 0.9 },
  { x: 2.6, z: -5.5, heading: 2.5, speed: 0, clip: 'idle', bell: true },
  { x: 3.9, z: -4.6, heading: 2.0, speed: 0, clip: 'idle', scale: 0.6 },
  { x: 5.4, z: -9.5, heading: 1.5, speed: 0, clip: 'idle', coat: 'holstein' },
  { x: -2.2, z: -8.5, heading: -2.2, speed: 0, clip: 'idle', coat: 'brown' },
];

// the dirt road: a winding ribbon from the foreground into the village
const ROAD = new THREE.CatmullRomCurve3([
  [7, 14], [3.2, 2], [1.2, -8], [0.6, -18], [2.8, -30], [5.5, -42], [3, -58], [-2, -80], [-1, -110],
].map(([x, z]) => new THREE.Vector3(x, 0, z)));
const ROAD_PTS = ROAD.getSpacedPoints(240);
const roadDist = (x: number, z: number) => { let d = 1e9; for (const p of ROAD_PTS) { const q = (p.x - x) ** 2 + (p.z - z) ** 2; if (q < d) d = q; } return Math.sqrt(d); };
const POND = { x: -6.5, z: -3.5, rx: 5.5, rz: 3.6 };
const inPond = (x: number, z: number, m = 0) => ((x - POND.x) / (POND.rx + m)) ** 2 + ((z - POND.z) / (POND.rz + m)) ** 2 < 1;
const inRice = (x: number, z: number) => x > 7.5 + Math.max(0, -z - 30) * 0.05 && z < -3;

export class VNField {
  scene = new THREE.Scene();
  models: { m: CowModel; c: VNCow; off: number; blob: THREE.Mesh }[] = [];
  birds: { g: THREE.Group; ph: number }[] = [];
  private wind = { value: 0 };
  cows: any[] = []; // API parity with Field
  t0 = 0;

  dance = false;
  extras = new THREE.Group(); // shot-specific props (e.g. bubbles); hidden unless the shot shows them
  bells: { m: CowModel; g: THREE.Group }[] = [];
  constructor(renderer: THREE.WebGLRenderer, o: { tod?: 'dawn' | 'gold' | 'sunset' } = {}) {
    const tod = o.tod ?? 'gold';
    const s = this.scene, R = mulberry(41);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), V = new THREE.Vector3(), C = new THREE.Color(), E = new THREE.Euler();
    const std = (color: number, rough = 0.9, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, ...o });
    const mesh = (g: THREE.BufferGeometry, m: THREE.Material, cast = true) => { const me = new THREE.Mesh(g, m); me.castShadow = cast; me.receiveShadow = true; return me; };
    const Y = new THREE.Vector3(0, 1, 0);

    // ---- golden-hour sky, image light, warm haze
    const sunDir = (tod === 'dawn' ? new THREE.Vector3(-0.75, 0.09, -0.65) : tod === 'sunset' ? new THREE.Vector3(0.85, 0.07, -0.52) : new THREE.Vector3(0.8, 0.2, -0.56)).normalize();
    const sky = new Sky(); sky.scale.setScalar(2000);
    const u = sky.material.uniforms;
    u.turbidity!.value = tod === 'gold' ? 4.5 : 6; u.rayleigh!.value = tod === 'gold' ? 2.2 : 3; u.mieCoefficient!.value = 0.006; u.mieDirectionalG!.value = 0.86; u.sunPosition!.value.copy(sunDir);
    const envScene = new THREE.Scene(); const sky2 = new Sky(); sky2.scale.setScalar(50); sky2.material.uniforms = u; envScene.add(sky2);
    s.environment = new THREE.PMREMGenerator(renderer).fromScene(envScene, 0.02, 0.1, 200).texture; s.environmentIntensity = 0.32;
    s.add(sky);
    s.fog = tod === 'dawn' ? new THREE.FogExp2(new THREE.Color(0.86, 0.84, 0.82), 0.016) : tod === 'sunset' ? new THREE.FogExp2(new THREE.Color(0.96, 0.72, 0.52), 0.007) : new THREE.FogExp2(new THREE.Color(0.92, 0.82, 0.68), 0.0055);
    addClouds(s, new THREE.MeshStandardMaterial({ color: 0xffe6dc, roughness: 1, emissive: 0xffc6b4, emissiveIntensity: 0.5 }), 3);
    const sun = new THREE.DirectionalLight(tod === 'dawn' ? 0xffc890 : tod === 'sunset' ? 0xff9a5a : 0xffd6a0, tod === 'dawn' ? 1.8 : tod === 'sunset' ? 2.4 : 3.0);
    sun.position.set(0, 0, -18).addScaledVector(sunDir, 90); sun.target.position.set(0, 0, -18);
    sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
    Object.assign(sun.shadow.camera, { left: -50, right: 50, top: 50, bottom: -50, near: 1, far: 220 });
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.05; sun.shadow.radius = 3;
    s.add(sun, sun.target, new THREE.HemisphereLight(0xcfe0ff, 0x7a6a3a, 0.4));

    // ---- ground: grassy common with worn patches, the road, the paddy ground on the right
    const bare = (x: number, z: number) => Math.sin(x * 0.33 + 0.7) * Math.sin(z * 0.27 + 1.3) + 0.55 * Math.sin(x * 0.81 + z * 0.63) + 0.3 * Math.sin(x * 2.1 - z * 1.7) > 0.85;
    const GX0 = -70, GX1 = 70, GZ0 = 20, GZ1 = -130, TW = 1400, TH = 1500;
    const gc = document.createElement('canvas'); gc.width = TW; gc.height = TH;
    { const x2 = gc.getContext('2d')!, img = x2.createImageData(TW, TH);
      for (let py = 0; py < TH; py++) for (let px = 0; px < TW; px++) {
        const wx = GX0 + (px / TW) * (GX1 - GX0), wz = GZ0 + (py / TH) * (GZ1 - GZ0), i = (py * TW + px) * 4, n = R() * 16;
        const near = Math.abs(wx) < 40 && wz > -120;
        const rd = near ? roadDist(wx, wz) : 99;
        const c = rd < 1.6 ? [182 + n, 150 + n, 104 + n] : rd < 2.0 ? [140 + n, 132 + n, 80 + n]
          : inRice(wx, wz) ? [92 + n, 140 + n, 58 + n] : bare(wx, wz) ? [150 + n, 128 + n, 86 + n] : [84 + n, 128 + n, 50 + n];
        img.data[i] = c[0]!; img.data[i + 1] = c[1]!; img.data[i + 2] = c[2]!; img.data[i + 3] = 255;
      }
      x2.putImageData(img, 0, 0); }
    const gt = new THREE.CanvasTexture(gc); gt.colorSpace = THREE.SRGBColorSpace; gt.anisotropy = 8;
    const ground = mesh(new THREE.PlaneGeometry(GX1 - GX0, GZ0 - GZ1), std(0xffffff, 1, { map: gt }), false);
    ground.rotation.x = -Math.PI / 2; ground.position.set((GX0 + GX1) / 2, 0, (GZ0 + GZ1) / 2); s.add(ground);
    const outer = mesh(new THREE.PlaneGeometry(4000, 4000), std(0x6f9a3c, 1), false); outer.rotation.x = -Math.PI / 2; outer.position.y = -0.02; s.add(outer);

    // ---- lotus pond: a dark bank, mirror-ish water, lily pads and a few pink lotus
    const bank = mesh(new THREE.CircleGeometry(1, 64), std(0x5a4a30, 1), false); bank.rotation.x = -Math.PI / 2; bank.scale.set(POND.rx + 0.5, POND.rz + 0.5, 1); bank.position.set(POND.x, 0.015, POND.z); s.add(bank);
    const water = mesh(new THREE.CircleGeometry(1, 64), std(0x7d97a2, 0.03, { metalness: 0.95 }), false); water.rotation.x = -Math.PI / 2; water.scale.set(POND.rx, POND.rz, 1); water.position.set(POND.x, 0.03, POND.z); s.add(water);
    const pads = new THREE.InstancedMesh(new THREE.CircleGeometry(0.32, 14, 0.3, Math.PI * 2 - 0.3), std(0xffffff, 0.6, { side: THREE.DoubleSide }), 90);
    for (let i = 0; i < 90; i++) {
      let x = 0, z = 0; do { x = POND.x + (R() - 0.5) * 2 * POND.rx; z = POND.z + (R() - 0.5) * 2 * POND.rz; } while (!inPond(x, z, -0.4));
      M.compose(V.set(x, 0.05, z), Q.setFromEuler(E.set(-Math.PI / 2, 0, R() * 6.28)), S.setScalar(0.7 + R() * 0.7)); pads.setMatrixAt(i, M);
      pads.setColorAt(i, C.setHex(R() > 0.5 ? 0x4f8a34 : 0x6aa040));
    }
    s.add(pads);
    for (let i = 0; i < 9; i++) {
      let x = 0, z = 0; do { x = POND.x + (R() - 0.5) * 2 * POND.rx; z = POND.z + (R() - 0.5) * 2 * POND.rz; } while (!inPond(x, z, -0.8));
      const lotus = mesh(new THREE.ConeGeometry(0.11, 0.18, 8, 1, true), std(0xf4a6c4, 0.6, { side: THREE.DoubleSide })); lotus.rotation.x = Math.PI; lotus.position.set(x, 0.2, z); s.add(lotus);
      const stem = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 4), std(0x4f7a30)); stem.position.set(x, 0.12, z); s.add(stem);
    }

    // ---- grass (common + banks) and young rice (one wind shader)
    const gm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide });
    gm.onBeforeCompile = (sh) => {
      sh.uniforms.uWind = this.wind;
      sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 wp = instanceMatrix * vec4(0., 0., 0., 1.);
        float w = sin(uWind * 1.3 - wp.z * 0.18 + wp.x * 0.05) * 0.6 + sin(uWind * 2.9 + wp.x * 0.9) * 0.15;
        transformed.x += w * position.y * position.y * 0.22; transformed.z += w * position.y * position.y * 0.3;`);
    };
    const hide = new THREE.Matrix4().makeScale(0, 0, 0);
    const GN = 90000, grass = new THREE.InstancedMesh(bladeGeometry(new THREE.Color(0x2f5a1c), new THREE.Color(0xffffff)), gm, GN);
    grass.receiveShadow = true; grass.frustumCulled = false;
    const gTip = [0x9fd456, 0x7fc046, 0xc4d870].map((c) => new THREE.Color(c));
    for (let i = 0; i < GN; i++) {
      const x = -32 + R() * 42, z = 13 - Math.pow(R(), 0.7) * 63;
      const rd = roadDist(x, z), bankGrass = inPond(x, z, 1.3) && !inPond(x, z, 0.2);
      if (rd < 1.9 || inPond(x, z, 0.2) || inRice(x, z) || (bare(x, z) && !bankGrass) || (R() < 0.3 && !bankGrass)) { grass.setMatrixAt(i, hide); continue; }
      const tall = bankGrass || rd < 2.6 ? 1.6 : 1;
      M.compose(V.set(x, 0, z), Q.setFromEuler(E.set((R() - 0.5) * 0.4, R() * Math.PI * 2, (R() - 0.5) * 0.4)), S.set(1.3, (0.1 + R() * 0.22) * tall, 1.3));
      grass.setMatrixAt(i, M); grass.setColorAt(i, C.copy(gTip[i % 3]!).multiplyScalar(0.85 + R() * 0.3));
    }
    s.add(grass);
    const RN = 170000, rice = new THREE.InstancedMesh(bladeGeometry(new THREE.Color(0x3d6a22), new THREE.Color(0xffffff)), gm, RN);
    rice.receiveShadow = true; rice.frustumCulled = false;
    let k = 0;
    const riceTip = [0xa6dc50, 0x8fcf45, 0xb9e463].map((c) => new THREE.Color(c));
    for (let z = -3.3; z > -95 && k < RN; z -= 0.34) for (let x = 7.6; x < 48 && k < RN; x += 0.34) {
      if (!inRice(x, z) || Math.abs(((x - 7.6) % 12) - 6) > 5.7) continue; // thin dikes between plots
      for (let b = 0; b < 3 && k < RN; b++) {
        M.compose(V.set(x + (R() - 0.5) * 0.06, 0.02, z + (R() - 0.5) * 0.06), Q.setFromEuler(E.set((R() - 0.5) * 0.5, R() * Math.PI * 2, (R() - 0.5) * 0.5)), S.set(1.2, 0.5 + R() * 0.25, 1.2));
        rice.setMatrixAt(k, M); rice.setColorAt(k, C.copy(riceTip[k % 3]!).multiplyScalar(0.85 + R() * 0.3)); k++;
      }
    }
    rice.count = k; s.add(rice);

    // ---- bamboo: arching culms + drooping leaf sprays
    const arch = (t: number, out: THREE.Vector3, bend: number) => out.set(t * t * bend, 2 * (1 - t) * t * 0.62 + t * t * 0.96, 0);
    const culmGeos = [0.18, 0.28, 0.4].map((bend) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 9 }, (_, i) => arch(i / 8, new THREE.Vector3(), bend))), 16, 0.006, 5, false));
    const culmMat = std(0x9aa04e, 0.6);
    const culms = culmGeos.map((g) => { const m = new THREE.InstancedMesh(g, culmMat, 1400); m.castShadow = m.receiveShadow = true; return m; });
    const nc = [0, 0, 0];
    const leafG = new THREE.PlaneGeometry(0.13, 0.62); leafG.translate(0, -0.3, 0);
    const bLeaves = new THREE.InstancedMesh(leafG, std(0xffffff, 0.75, { side: THREE.DoubleSide }), 200000);
    bLeaves.castShadow = bLeaves.receiveShadow = true;
    let nl = 0;
    const bCols = [0x5f8a2c, 0x7aa03a, 0x4a7224, 0x9ab84a].map((c) => new THREE.Color(c));
    const P0 = new THREE.Vector3();
    const clump = (cx: number, cz: number, size = 1, n = 12) => {
      for (let i = 0; i < n; i++) {
        const ox = (R() - 0.5) * 1.6, oz = (R() - 0.5) * 1.6, yaw = Math.atan2(-oz, ox) + (R() - 0.5) * 0.9;
        const h = (9 + R() * 6) * size, v = Math.floor(R() * 3), bend = [0.18, 0.28, 0.4][v]!;
        M.compose(V.set(cx + ox, 0, cz + oz), Q.setFromAxisAngle(Y, yaw), S.set(h, h, h)); culms[v]!.setMatrixAt(nc[v]!++, M);
        for (let j = 0; j < 380 && nl < 200000; j++) {
          const t = 0.3 + Math.pow(R(), 0.6) * 0.7;
          arch(t, P0, bend).multiplyScalar(h);
          const sp = 0.35 + t * 1.0;
          P0.x += (R() - 0.5) * sp; P0.y += (R() - 0.6) * sp * 0.6; P0.z += (R() - 0.5) * sp;
          P0.applyAxisAngle(Y, yaw).add(V.set(cx + ox, 0, cz + oz));
          M.compose(P0, Q.setFromEuler(E.set((R() - 0.5) * 1.1, R() * Math.PI * 2, (R() - 0.5) * 1.1 + 0.3)), S.set(1, 0.8 + R() * 0.6, 1));
          bLeaves.setMatrixAt(nl, M); bLeaves.setColorAt(nl++, C.copy(bCols[Math.floor(R() * 4)]!).multiplyScalar(0.85 + R() * 0.3));
        }
      }
    };
    clump(11.5, -6, 1.15, 16); clump(13.5, -11, 1.05, 12);                   // right foreground, like the reference
    clump(6.5, -40, 1.1, 14); clump(9, -46, 1.0, 12); clump(4, -50, 1.1, 12); // the tall grove behind the road bend
    for (let x = -60; x <= -18; x += 3 + R() * 2) clump(x, -48 + (R() - 0.5) * 6, 0.9, 9); // behind the đình
    for (let x = 20; x <= 120; x += 12 + R() * 10) clump(x, -120 + (R() - 0.5) * 20, 1.2, 10); // far groves
    culms.forEach((m, i) => { m.count = nc[i]!; s.add(m); });
    bLeaves.count = nl; s.add(bLeaves);

    // ---- the banyan: twisted trunk strands, buttress roots, spreading limbs, hanging aerial roots, fine leaves
    const bark = std(0x7d6c58, 0.95), rootM = std(0x8f7c64, 0.95);
    const banyan = new THREE.Group(); banyan.position.set(-11.5, 0, -17);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2, st = mesh(new THREE.CylinderGeometry(0.45, 0.85, 8.5, 9), bark);
      st.position.set(Math.cos(a) * 0.7, 4.1, Math.sin(a) * 0.7); st.rotation.set(Math.sin(a) * 0.12, a, -Math.cos(a) * 0.12); banyan.add(st);
    }
    for (let i = 0; i < 11; i++) { // buttress roots spreading over the ground
      const a = (i / 11) * Math.PI * 2 + R() * 0.3, len = 2.4 + R() * 1.8;
      const dir = new THREE.Vector3(Math.cos(a), -0.35, Math.sin(a)).normalize();
      const rt = mesh(new THREE.ConeGeometry(0.5, len, 7), rootM); rt.quaternion.setFromUnitVectors(Y, dir); rt.scale.set(1, 1, 0.5);
      rt.position.set(Math.cos(a) * (0.9 + len * 0.4), 0.45, Math.sin(a) * (0.9 + len * 0.4)); banyan.add(rt);
    }
    const tips: THREE.Vector3[] = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + R() * 0.4, len = 6.5 + R() * 4, up = 0.18 + R() * 0.25;
      const dir = new THREE.Vector3(Math.cos(a), up, Math.sin(a)).normalize(), base = new THREE.Vector3(0, 5.2 + R() * 1.2, 0);
      const limb = mesh(new THREE.CylinderGeometry(0.16, 0.42, len, 7), bark);
      limb.position.copy(base).addScaledVector(dir, len / 2); limb.quaternion.setFromUnitVectors(Y, dir); banyan.add(limb);
      tips.push(base.clone().addScaledVector(dir, len));
      for (let j = 0; j < 2; j++) { // aerial roots hanging from the limb
        const p = base.clone().addScaledVector(dir, len * (0.35 + R() * 0.6));
        const ar = mesh(new THREE.CylinderGeometry(0.02 + R() * 0.02, 0.04 + R() * 0.04, p.y, 5), rootM); ar.position.set(p.x + (R() - 0.5) * 0.3, p.y / 2, p.z + (R() - 0.5) * 0.3); ar.rotation.z = (R() - 0.5) * 0.12; banyan.add(ar);
      }
    }
    const cLeaves = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.34, 0.24), std(0xffffff, 0.7, { side: THREE.DoubleSide }), 70000);
    cLeaves.castShadow = cLeaves.receiveShadow = true;
    const cCols = [0x3f6f22, 0x557f2a, 0x6f9a34, 0x8fb447, 0x2f5a1c].map((c) => new THREE.Color(c));
    let ncl = 0;
    for (const tip of [...tips, new THREE.Vector3(0, 10.5, 0), new THREE.Vector3(3, 9.5, 2), new THREE.Vector3(-3, 10, -1), new THREE.Vector3(4, 8.5, -2)]) {
      for (let j = 0; j < 5200 && ncl < 70000; j++) {
        const r = Math.cbrt(R()) * 4.2, th = R() * Math.PI * 2, ph = Math.acos(2 * R() - 1);
        const p = V.set(tip.x + r * Math.sin(ph) * Math.cos(th), tip.y + r * Math.cos(ph) * 0.55 + 0.8, tip.z + r * Math.sin(ph) * Math.sin(th));
        const lit = (p.x - tip.x) * 0.15 + (p.y - tip.y) * 0.25 + (r / 4.2) * 0.6 + (R() - 0.5) * 0.6; // sunlit upper right, darker inside
        M.compose(p.clone().add(banyan.position), Q.setFromEuler(E.set(R() * 6.28, R() * 6.28, R() * 6.28)), S.setScalar(0.8 + R() * 0.6));
        cLeaves.setMatrixAt(ncl, M);
        cLeaves.setColorAt(ncl++, cCols[lit > 0.75 ? 3 : lit > 0.45 ? 2 : lit > 0.15 ? 1 : lit > -0.2 ? 0 : 4]!);
      }
    }
    cLeaves.count = ncl; s.add(banyan, cLeaves);

    // ---- the đình under the banyan: stone plinth, wooden columns, curved tile roof with upturned eaves
    const dinh = new THREE.Group(), lime = std(0xd2c6b0, 0.95), stone = std(0xb7ad98, 0.9);
    const plinth = mesh(new THREE.BoxGeometry(10, 0.6, 6.4), stone); plinth.position.y = 0.3; dinh.add(plinth);
    const steps = mesh(new THREE.BoxGeometry(3, 0.3, 1), stone); steps.position.set(0, 0.15, 3.6); dinh.add(steps);
    const wallB = mesh(new THREE.BoxGeometry(9, 3, 0.3), lime); wallB.position.set(0, 2.1, -2.4); dinh.add(wallB);
    for (const sx of [-1, 1]) { const wl = mesh(new THREE.BoxGeometry(0.3, 3, 5), lime); wl.position.set(sx * 4.4, 2.1, -0.1); dinh.add(wl); }
    for (let i = 0; i < 6; i++) { const col = mesh(new THREE.CylinderGeometry(0.16, 0.18, 3, 10), std(0x6a3a24, 0.6)); col.position.set(-3.75 + i * 1.5, 2.1, 2.2); dinh.add(col); }
    for (let i = 0; i < 3; i++) { const door = mesh(new THREE.BoxGeometry(1.4, 2.2, 0.08), std(0x5a2e1c, 0.7)); door.position.set(-2.4 + i * 2.4, 1.7, -2.2); dinh.add(door); }
    const roofGeo = (L: number, W: number, H: number) => {
      const nu = 40, nv = 10, pos: number[] = [], idx: number[] = [];
      for (const side of [-1, 1]) {
        const b = pos.length / 3;
        for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
          const uu = i / nu, vv = j / nv, ax = Math.abs(2 * uu - 1);
          pos.push((uu - 0.5) * L * (1 + 0.06 * vv), H * (1 - vv) - 0.25 * Math.sin(vv * Math.PI) + 0.9 * Math.pow(ax, 6) * vv, side * vv * W / 2);
        }
        for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = b + j * (nu + 1) + i; idx.push(a, a + nu + 1, a + 1, a + 1, a + nu + 1, a + nu + 2); }
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
    };
    const roof = mesh(roofGeo(11.4, 8.4, 2.4), std(0x9a4a30, 0.75, { side: THREE.DoubleSide })); roof.position.y = 3.55; dinh.add(roof);
    const ridge = mesh(new THREE.BoxGeometry(10, 0.3, 0.35), std(0xb9b0a0)); ridge.position.y = 6.0; dinh.add(ridge);
    for (const sx of [-1, 1]) { const orn = mesh(new THREE.TorusGeometry(0.35, 0.08, 6, 12, Math.PI * 1.3), std(0xb9b0a0)); orn.position.set(sx * 5, 6.35, 0); orn.rotation.z = sx > 0 ? 0 : Math.PI; dinh.add(orn); }
    dinh.position.set(-5.5, 0, -29); dinh.rotation.y = 0.25; s.add(dinh);

    // ---- village: red-tile and thatched houses, haystacks, banana trees
    const wall = std(0xe2d4b4, 0.85), tile = std(0xa9442c, 0.7), thatch = std(0xa88a50, 1), door = std(0x5a3a22, 0.8);
    const house = (x: number, z: number, rot: number, thatched: boolean) => {
      const g = new THREE.Group(), w = 7 + R() * 3, d = 4.6 + R();
      const wb = mesh(new THREE.BoxGeometry(w, 2.8, d), thatched ? std(0xc8b08a, 0.95) : wall); wb.position.y = 1.4; g.add(wb);
      const rf = mesh(new THREE.CylinderGeometry(d * 0.75, d * 0.75, w + 1, 3), thatched ? thatch : tile); rf.rotation.z = Math.PI / 2; rf.rotation.x = -Math.PI / 2; rf.scale.set(1, 1, thatched ? 0.62 : 0.5); rf.position.y = 2.8 + d * 0.2; g.add(rf);
      const dr = mesh(new THREE.BoxGeometry(1.2, 2, 0.1), door); dr.position.set(0, 1, d / 2 + 0.05); g.add(dr);
      g.position.set(x, 0, z); g.rotation.y = rot; s.add(g);
    };
    house(14, -66, -0.3, false); house(24, -72, -0.2, true); house(2, -78, 0.1, false); house(32, -64, -0.5, false); house(-16, -60, 0.2, false); house(42, -80, -0.3, true);
    const stackG = new THREE.LatheGeometry([[0, 0], [1.7, 0], [1.8, 0.8], [1.5, 1.9], [0.9, 2.8], [0.25, 3.3], [0, 3.4]].map(([a, b]) => new THREE.Vector2(a, b)), 20);
    for (const [x, z, sc] of [[19, -58, 1.1], [23, -60, 0.9], [9, -64, 1], [36, -70, 1.2]] as const) { const h = mesh(stackG, std(0xd8a84a, 1)); h.position.set(x, 0, z); h.scale.setScalar(sc); s.add(h); }
    const bananaLeaf = new THREE.PlaneGeometry(0.7, 2.6, 1, 8);
    { const p = bananaLeaf.attributes.position!; for (let i = 0; i < p.count; i++) { const y = p.getY(i) + 1.3; p.setXYZ(i, p.getX(i), y, -0.18 * y * y); } bananaLeaf.computeVertexNormals(); }
    const banana = (x: number, z: number) => {
      const g = new THREE.Group(), tr = mesh(new THREE.CylinderGeometry(0.16, 0.22, 2.6, 8), std(0x7f8a4a)); tr.position.y = 1.3; g.add(tr);
      for (let i = 0; i < 8; i++) { const lf = mesh(bananaLeaf, std(i % 2 ? 0x6fae3e : 0x5c9a32, 0.7, { side: THREE.DoubleSide })); lf.position.y = 2.5; lf.rotation.set(-0.5 - R() * 0.4, (i / 8) * Math.PI * 2, 0, 'YXZ'); g.add(lf); }
      g.position.set(x, 0, z); g.scale.setScalar(1.1 + R() * 0.4); s.add(g);
    };
    banana(17, -62); banana(28, -66); banana(12, -70); banana(-10, -56);

    // ---- hazy hills, birds
    const hills = new THREE.PlaneGeometry(2400, 160, 240, 1), hp = hills.attributes.position!;
    for (let i = 0; i < hp.count; i++) { const x = hp.getX(i); if (hp.getY(i) > 0) hp.setY(i, 20 + 30 * Math.abs(Math.sin(x * 0.006) + 0.5 * Math.sin(x * 0.017 + 1)) + 14 * Math.sin(x * 0.041)); else hp.setY(i, -40); }
    hills.computeVertexNormals();
    const hm = mesh(hills, std(0x8a9a8a, 1), false); hm.position.set(0, 0, -700); s.add(hm);
    const wingG = new THREE.PlaneGeometry(0.9, 0.18); wingG.translate(0.45, 0, 0);
    const birdM = new THREE.MeshBasicMaterial({ color: 0x3a3028, side: THREE.DoubleSide, fog: false });
    for (let i = 0; i < 14; i++) {
      const g = new THREE.Group(), l = new THREE.Mesh(wingG, birdM), r2 = new THREE.Mesh(wingG, birdM); r2.rotation.y = Math.PI; g.add(l, r2);
      g.position.set(18 + R() * 40, 34 + R() * 14, -90 - R() * 40); g.rotation.x = -1.2; s.add(g); this.birds.push({ g, ph: R() * 6 });
    }
  }

  useModels(a: CowAsset, herd: VNCow[] = VN_HERD) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d')!, g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,0,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    const blobM = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false });
    herd.forEach((cw, i) => {
      const k = cw.scale ?? 1, m = new CowModel(a, cw.coat ?? 'yellow', 1.6 * k);
      const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.6 * k, 3.0 * k), blobM); blob.rotation.x = -Math.PI / 2;
      this.scene.add(m.root, blob);
      this.models.push({ m, c: cw, off: i * 1.37, blob });
      if (cw.bell) { // a brass cowbell on a leather strap, hung from the neck bone each frame
        const g = new THREE.Group(), k2 = cw.scale ?? 1;
        const prof = [[0, 0], [0.11, 0], [0.1, 0.04], [0.075, 0.17], [0.055, 0.25], [0.02, 0.27], [0, 0.27]].map(([a2, b2]) => new THREE.Vector2(a2, b2));
        const shell = new THREE.Mesh(new THREE.LatheGeometry(prof, 28), new THREE.MeshStandardMaterial({ color: 0xc9973a, metalness: 1, roughness: 0.3, side: THREE.DoubleSide }));
        shell.position.y = -0.27; shell.castShadow = true; g.add(shell);
        const strap = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 24), new THREE.MeshStandardMaterial({ color: 0x5a2d16, roughness: 0.7 })); strap.position.y = 0.12; g.add(strap);
        g.scale.setScalar(k2); this.scene.add(g); this.bells.push({ m, g });
      }
    });
  }

  update(t: number, _beat: number) {
    this.wind.value = t;
    if (!this.extras.parent) this.scene.add(this.extras);
    this.extras.visible = false;
    for (const { m, c, off, blob } of this.models) {
      const d = (t - this.t0) * c.speed, x = c.x + Math.sin(c.heading) * d, z = c.z + Math.cos(c.heading) * d;
      m.root.position.set(x, 0, z); m.root.rotation.y = c.heading;
      if (this.dance && c.speed === 0) { m.pose('jump', ((_beat / 2) % 1) * 1.71 + 0.001, 1); blob.position.set(x, 0.02, z); continue; }
      m.pose(c.clip, t + off, 1);
      if (c.speed === 0) { const lift = Math.max(0, Math.sin((t + off * 3) * 0.35) - 0.75) * 4; m.bend('z', 0.95 * (1 - lift) + 0.06 * Math.sin(t * 5 + off), 0.35 * (1 - lift) + 0.05 * Math.sin(t * 7 + off)); }
      blob.position.set(x, 0.02, z); blob.rotation.z = -c.heading;
    }
    const P = Math.pow(1 - (_beat - Math.floor(_beat)), 3);
    for (const { m, g } of this.bells) {
      m.root.updateMatrixWorld(true); const n = m.neck ?? m.head; if (!n) continue;
      n.getWorldPosition(g.position); g.position.y -= 0.32; g.rotation.y = m.root.rotation.y; g.rotation.x = 0.25 * Math.sin(t * 8) * (0.3 + P); g.rotation.z = 0.15 * Math.sin(t * 5.3);
    }
    for (const { g, ph } of this.birds) { const f = Math.sin(t * 7 + ph) * 0.5; (g.children[0] as THREE.Mesh).rotation.x = f; (g.children[1] as THREE.Mesh).rotation.x = -f; }
  }
}
