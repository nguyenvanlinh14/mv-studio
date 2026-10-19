// Pasture for "Chăn bò" look-dev: rolling hills, wind-blown instanced grass, a procedural herd, fence, trees and a
// barn, in two looks — 'real' (physical sky, golden-hour backlight, PBR, haze) and 'toon' (cel shading + ink outlines).
import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { SimplexNoise } from 'three/examples/jsm/math/SimplexNoise.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { CowModel, type CowAsset } from '../../src/kit/cowmodel';

export type Look = 'real' | 'toon' | 'plus';

export const mulberry = (a: number) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const noise = new SimplexNoise({ random: mulberry(7) } as any);
const smooth = (a: number, b: number, x: number) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };

/** Ground height: a gentle meadow around the herd, rising into hills with distance. */
export function height(x: number, z: number) {
  const d = Math.hypot(x * 0.8, z + 15);
  let h = 0.35 * noise.noise(x * 0.04, z * 0.04) + 0.1 * noise.noise(x * 0.15, z * 0.15);
  h += smooth(28, 120, d) * (13 + 10 * noise.noise(x * 0.012 + 3, z * 0.012));
  return h;
}

// ---------- materials ----------
let gradient: THREE.DataTexture | null = null;
function toonGradient() {
  if (!gradient) {
    gradient = new THREE.DataTexture(new Uint8Array([70, 150, 215, 255]), 4, 1, THREE.RedFormat);
    gradient.minFilter = gradient.magFilter = THREE.NearestFilter; gradient.needsUpdate = true;
  }
  return gradient;
}
const inkMat = (w: number) => {
  const m = new THREE.MeshBasicMaterial({ color: 0x1b1410, side: THREE.BackSide });
  m.onBeforeCompile = (s) => { s.vertexShader = s.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\ntransformed += normal * ${w.toFixed(4)};`); };
  return m;
};
export class Mats {
  ink = inkMat(0.022);
  constructor(public look: Look) {}
  make(color: number, o: { rough?: number; metal?: number; map?: THREE.Texture; vertexColors?: boolean; side?: THREE.Side; emissive?: number } = {}): THREE.Material {
    if (this.look === 'toon') return new THREE.MeshToonMaterial({ color, gradientMap: toonGradient(), map: o.map, vertexColors: o.vertexColors, side: o.side });
    return new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.8, metalness: o.metal ?? 0, map: o.map, vertexColors: o.vertexColors, side: o.side, emissive: o.emissive ?? 0 });
  }
  /** a mesh, plus an ink hull in the toon look */
  mesh(g: THREE.BufferGeometry, m: THREE.Material, ink = true) {
    const me = new THREE.Mesh(g, m); me.castShadow = true; me.receiveShadow = true;
    if (ink && this.look === 'toon') me.add(new THREE.Mesh(g, this.ink));
    return me;
  }
}

// ---------- cows ----------
export type Coat = 'holstein' | 'yellow' | 'brown';
function coatTexture(seed: number) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d')!, img = x.createImageData(256, 256), n = new SimplexNoise({ random: mulberry(seed) } as any);
  for (let j = 0; j < 256; j++) for (let i = 0; i < 256; i++) {
    const v = n.noise(i / 70, j / 70) + 0.35 * n.noise(i / 22, j / 22);
    const k = (j * 256 + i) * 4, black = v > 0.25;
    img.data[k] = img.data[k + 1] = img.data[k + 2] = black ? 30 : 245; img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class Cow {
  root = new THREE.Group();
  head = new THREE.Group();
  tail = new THREE.Group();
  bell = new THREE.Group();
  constructor(mk: Mats, coat: Coat, o: { bell?: boolean; seed?: number } = {}) {
    const hide = coat === 'holstein' ? mk.make(0xffffff, { map: coatTexture(o.seed ?? 1), rough: 0.7 }) : mk.make(coat === 'yellow' ? 0xc98a3c : 0x6b3f22, { rough: 0.75 });
    const dark = mk.make(0x2a2018, { rough: 0.6 }), pink = mk.make(0xe8a4a0, { rough: 0.5 }), ivory = mk.make(0xeee3c8, { rough: 0.4 });
    const body = mk.mesh(new RoundedBoxGeometry(2.0, 0.95, 0.85, 4, 0.3), hide); body.position.set(0, 1.3, 0);
    this.root.add(body);
    const leg = new THREE.CylinderGeometry(0.1, 0.085, 0.95, 10), hoof = new THREE.CylinderGeometry(0.1, 0.11, 0.12, 10);
    for (const [lx, lz] of [[0.72, 0.26], [0.72, -0.26], [-0.7, 0.26], [-0.7, -0.26]] as const) {
      const l = mk.mesh(leg, hide); l.position.set(lx, 0.55, lz); this.root.add(l);
      const h = mk.mesh(hoof, dark); h.position.set(lx, 0.06, lz); this.root.add(h);
    }
    if (coat === 'holstein') { const u = mk.mesh(new THREE.SphereGeometry(0.2, 16, 12), pink); u.scale.set(1.2, 0.8, 1); u.position.set(-0.45, 0.82, 0); this.root.add(u); }
    // head on a neck pivot
    this.head.position.set(0.95, 1.5, 0); this.root.add(this.head);
    const neck = mk.mesh(new THREE.CylinderGeometry(0.26, 0.32, 0.5, 14), hide); neck.rotation.z = -1.1; neck.position.set(0.12, 0.05, 0); this.head.add(neck);
    const skull = mk.mesh(new RoundedBoxGeometry(0.62, 0.48, 0.44, 3, 0.14), coat === 'holstein' ? mk.make(0xf4f1ea, { rough: 0.7 }) : hide);
    skull.position.set(0.42, 0.06, 0); skull.rotation.z = -0.35; this.head.add(skull);
    const muzzle = mk.mesh(new RoundedBoxGeometry(0.26, 0.3, 0.4, 3, 0.1), pink); muzzle.position.set(0.7, -0.06, 0); muzzle.rotation.z = -0.35; this.head.add(muzzle);
    for (const s of [-1, 1]) {
      const horn = mk.mesh(new THREE.ConeGeometry(0.045, 0.24, 10), ivory); horn.position.set(0.3, 0.33, s * 0.17); horn.rotation.x = s * 0.6; this.head.add(horn);
      const ear = mk.mesh(new THREE.SphereGeometry(0.1, 12, 8), hide); ear.scale.set(0.5, 0.35, 1.3); ear.position.set(0.28, 0.2, s * 0.3); this.head.add(ear);
      const eye = mk.mesh(new THREE.SphereGeometry(0.04, 10, 8), dark, false); eye.position.set(0.5, 0.15, s * 0.21); this.head.add(eye);
    }
    // tail
    this.tail.position.set(-1.0, 1.65, 0); this.root.add(this.tail);
    const tl = mk.mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.8, 6), hide); tl.position.y = -0.4; this.tail.add(tl);
    const tuft = mk.mesh(new THREE.SphereGeometry(0.07, 10, 8), dark); tuft.scale.y = 1.8; tuft.position.y = -0.82; this.tail.add(tuft);
    if (o.bell) {
      const collar = mk.mesh(new THREE.TorusGeometry(0.3, 0.035, 8, 32), mk.make(0x5a2d16, { rough: 0.6 })); collar.rotation.y = Math.PI / 2; collar.rotation.x = 0.5; collar.position.set(0.12, 0.0, 0); this.head.add(collar);
      this.bell.position.set(0.0, -0.3, 0); this.bell.scale.setScalar(1.6); this.head.add(this.bell);
      const prof = [[0, 0], [0.13, 0.0], [0.12, 0.05], [0.09, 0.2], [0.07, 0.3], [0.03, 0.33], [0, 0.33]].map(([x, y]) => new THREE.Vector2(x, y));
      const shell = mk.mesh(new THREE.LatheGeometry(prof, 32), mk.make(0xc9973a, { rough: 0.3, metal: 1, side: THREE.DoubleSide }));
      shell.position.y = -0.33; this.bell.add(shell);
      const clap = mk.mesh(new THREE.SphereGeometry(0.035, 10, 8), dark, false); clap.position.y = -0.33; this.bell.add(clap);
    }
  }
  /** graze 0..1 lowers the head; swing for the bell */
  set(t: number, phase: number, graze: number, bellHit = 0) {
    this.head.rotation.z = -0.15 - graze * (0.75 + 0.06 * Math.sin(t * 2.3 + phase)) + (1 - graze) * 0.08 * Math.sin(t * 1.1 + phase);
    this.head.rotation.y = (1 - graze) * 0.25 * Math.sin(t * 0.7 + phase);
    this.tail.rotation.x = 0.35 * Math.sin(t * 2.4 + phase); this.tail.rotation.z = -0.15 + 0.1 * Math.sin(t * 1.3 + phase);
    this.bell.rotation.x = 0.35 * bellHit * Math.sin(t * 9) + 0.05 * Math.sin(t * 2 + phase);
  }
}

// ---------- grass ----------
export function bladeGeometry(base: THREE.Color, tip: THREE.Color) {
  const segs = 4, pos: number[] = [], col: number[] = [], nor: number[] = [], idx: number[] = [];
  for (let i = 0; i < segs; i++) {
    const y = i / segs, w = 0.05 * Math.pow(1 - y, 0.7), c = base.clone().lerp(tip, Math.pow(y, 0.8));
    pos.push(-w, y, 0, w, y, 0); col.push(c.r, c.g, c.b, c.r, c.g, c.b); nor.push(0, 1, 0.3, 0, 1, 0.3);
  }
  pos.push(0, 1, 0); col.push(tip.r, tip.g, tip.b); nor.push(0, 1, 0.3);
  for (let i = 0; i < segs - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
  idx.push((segs - 1) * 2, (segs - 1) * 2 + 1, segs * 2);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx); return g;
}

export function addClouds(s: THREE.Scene, m: THREE.MeshStandardMaterial | THREE.MeshToonMaterial, detail: number) {
  m.fog = false;
  const r = mulberry(3);
  for (let i = 0; i < 9; i++) {
    const cl = new THREE.Group(), a = -1.4 + i * 0.35 + r() * 0.2, d = 700 + r() * 300;
    for (let k = 0; k < 5; k++) { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(30 + r() * 25, detail), m); p.position.set((k - 2) * 38 + r() * 10, r() * 15, r() * 20); p.scale.y = 0.6; cl.add(p); }
    cl.position.set(Math.sin(a) * d, 120 + r() * 120, -Math.cos(a) * d); cl.lookAt(0, cl.position.y, 0); s.add(cl);
  }
}

// ---------- the field ----------
export interface CowSpec { x: number; z: number; rot: number; coat: Coat; graze: number; bell?: boolean; scale?: number }

export class Field {
  scene = new THREE.Scene();
  sun = new THREE.DirectionalLight();
  sunDir: THREE.Vector3;
  cows: { cow: Cow; spec: CowSpec }[] = [];
  mk: Mats;
  private wind = { value: 0 };

  constructor(public look: Look, renderer: THREE.WebGLRenderer, o: { herd: CowSpec[]; focus?: [number, number]; grass?: number }) {
    const mk = (this.mk = new Mats(look)), s = this.scene, toon = look === 'toon', plus = look === 'plus', bright = look !== 'real';
    this.sunDir = toon ? new THREE.Vector3(-0.55, 0.55, 0.6).normalize() : plus ? new THREE.Vector3(-0.8, 0.42, -0.42).normalize() : new THREE.Vector3(-0.42, 0.1, -1).normalize();
    // sky
    if (!toon) {
      const sky = new Sky(); sky.scale.setScalar(2000);
      const u = sky.material.uniforms;
      u.turbidity!.value = plus ? 2.2 : 3.5; u.rayleigh!.value = plus ? 1.1 : 1.6; u.mieCoefficient!.value = plus ? 0.004 : 0.006; u.mieDirectionalG!.value = plus ? 0.8 : 0.86;
      u.sunPosition!.value.copy(this.sunDir);
      const envScene = new THREE.Scene(); const sky2 = new Sky(); sky2.scale.setScalar(50); sky2.material.uniforms = u; envScene.add(sky2);
      s.environment = new THREE.PMREMGenerator(renderer).fromScene(envScene, 0.02, 0.1, 200).texture;
      s.environmentIntensity = plus ? 0.28 : 0.55;
      s.add(sky);
      s.fog = plus ? new THREE.FogExp2(new THREE.Color(0.72, 0.82, 0.92), 0.0035) : new THREE.FogExp2(new THREE.Color(0.85, 0.62, 0.42), 0.0048);
      if (plus) addClouds(s, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0xdfe8f5, emissiveIntensity: 0.35 }), 3);
    } else {
      const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, fog: false,
        vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
        fragmentShader: `varying vec3 vp; void main(){ float y = vp.y;
          vec3 hor = vec3(1.0,0.80,0.58), mid = vec3(0.55,0.80,0.95), top = vec3(0.24,0.52,0.86);
          vec3 c = y < 0.12 ? mix(hor, mid, smoothstep(-0.02,0.12,y)) : mix(mid, top, smoothstep(0.12,0.6,y));
          gl_FragColor = vec4(c,1.); }`,
      }));
      s.add(sky);
      addClouds(s, new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: toonGradient() }), 1);
      s.fog = new THREE.FogExp2(new THREE.Color(0.95, 0.82, 0.66), 0.005);
    }
    // light
    this.sun.color.set(toon ? 0xfff0d8 : plus ? 0xfff0da : 0xffb070); this.sun.intensity = toon ? 2.4 : plus ? 2.6 : 3.0;
    const [fx, fz] = o.focus ?? [0, -10];
    this.sun.position.set(fx, 0, fz).addScaledVector(this.sunDir, 60); this.sun.target.position.set(fx, 0, fz);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 160 });
    this.sun.shadow.bias = -0.0005; this.sun.shadow.normalBias = 0.03; this.sun.shadow.radius = 4;
    s.add(this.sun, this.sun.target);
    s.add(new THREE.HemisphereLight(bright ? 0xbfe2ff : 0x8fb0e0, bright ? 0x6a8a3a : 0x4a3a20, toon ? 1.1 : plus ? 0.35 : 0.5));

    // terrain (grid concentrated around the meadow)
    const N = 220, tg = new THREE.PlaneGeometry(2, 2, N, N); tg.rotateX(-Math.PI / 2);
    const P = tg.attributes.position!, cols: number[] = [];
    const meadow = new THREE.Color(bright ? 0x5aa83c : 0x4f6a26), hill = new THREE.Color(bright ? 0x86c24a : 0x9a8a3e), dry = new THREE.Color(bright ? 0xb8d45a : 0xb59a52);
    for (let i = 0; i < P.count; i++) {
      const u = P.getX(i), v = P.getZ(i);
      const x = 600 * u * Math.abs(u), z = -15 + 600 * v * Math.abs(v), y = height(x, z);
      P.setXYZ(i, x, y, z);
      const c = meadow.clone().lerp(hill, smooth(0, 14, y)).lerp(dry, 0.5 + 0.5 * noise.noise(x * 0.05, z * 0.05) > 0.7 ? 0.35 : 0);
      cols.push(c.r, c.g, c.b);
    }
    tg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); tg.computeVertexNormals();
    const ground = new THREE.Mesh(tg, mk.make(0xffffff, { vertexColors: true, rough: 1 })); ground.receiveShadow = true; s.add(ground);

    // grass
    const n = o.grass ?? (plus ? 200000 : 140000);
    const gm = mk.make(0xffffff, { vertexColors: true, rough: 0.9, side: THREE.DoubleSide }) as THREE.MeshStandardMaterial;
    gm.onBeforeCompile = (sh) => {
      sh.uniforms.uWind = this.wind;
      sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 wp = instanceMatrix * vec4(0., 0., 0., 1.);
        float w = sin(uWind * 1.6 + wp.x * 0.3 + wp.z * 0.22) * 0.55 + sin(uWind * 3.3 + wp.x * 1.4 + wp.z) * 0.18;
        transformed.x += w * position.y * position.y * 0.32; transformed.z += w * position.y * position.y * 0.18;`);
    };
    const base = new THREE.Color(bright ? 0x3f8a2e : 0x24381a), tip = new THREE.Color(bright ? 0xb6e85a : 0xc9b860);
    const grass = new THREE.InstancedMesh(bladeGeometry(base, tip), gm, n); grass.receiveShadow = true; grass.frustumCulled = false;
    const r = mulberry(11), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), V = new THREE.Vector3(), C = new THREE.Color(), E = new THREE.Euler();
    for (let i = 0; i < n; i++) {
      const x = (r() * 2 - 1) * 26, zz = Math.pow(r(), 0.8), z = 12 - zz * 44;
      const hgt = (bright ? 0.35 : 0.3) + r() * (bright ? 0.25 : 0.42);
      M.compose(V.set(x, height(x, z) - 0.02, z), Q.setFromEuler(E.set((r() - 0.5) * 0.3, r() * Math.PI * 2, (r() - 0.5) * 0.3)), S.set(bright ? 1.6 : 1, hgt, 1));
      grass.setMatrixAt(i, M);
      grass.setColorAt(i, C.setHSL(0, 0, 0).setRGB(1, 1, 1).lerp(new THREE.Color(1.15, 1.0, 0.7), r() * 0.6).multiplyScalar(0.8 + r() * 0.35));
    }
    s.add(grass);

    // fence
    const wood = mk.make(0x7a5434, { rough: 0.85 }), post = new RoundedBoxGeometry(0.14, 1.2, 0.14, 2, 0.03);
    const fence = (pts: [number, number][]) => {
      for (let i = 0; i < pts.length; i++) {
        const [x, z] = pts[i]!, y = height(x, z);
        const p = mk.mesh(post, wood); p.position.set(x, y + 0.55, z); p.rotation.z = (mulberry(i)() - 0.5) * 0.08; s.add(p);
        if (i) {
          const [x0, z0] = pts[i - 1]!, y0 = height(x0, z0), len = Math.hypot(x - x0, z - z0);
          for (const h of [0.45, 0.9]) {
            const rail = mk.mesh(new THREE.BoxGeometry(len + 0.1, 0.08, 0.06), wood);
            rail.position.set((x + x0) / 2, (y + y0) / 2 + h, (z + z0) / 2); rail.rotation.y = -Math.atan2(z - z0, x - x0); s.add(rail);
          }
        }
      }
    };
    fence(Array.from({ length: 12 }, (_, i) => [-17 + i * 2.4, -2.5 - 0.06 * i * i] as [number, number]));

    // trees on the hills
    const trunkM = mk.make(0x5a3a22), leafM = [mk.make(bright ? 0x3f9a3a : 0x3a5a22), mk.make(bright ? 0x6cbf45 : 0x55702c)];
    const rt = mulberry(21);
    for (let i = 0; i < 40; i++) {
      const a = (rt() - 0.5) * 2.4, d = 45 + rt() * 110, x = Math.sin(a) * d, z = -15 - Math.cos(a) * d, y = height(x, z);
      const tr = new THREE.Group(), k = 1.2 + rt() * 1.6;
      const trunk = mk.mesh(new THREE.CylinderGeometry(0.25, 0.35, 3, 8), trunkM); trunk.position.y = 1.5; tr.add(trunk);
      for (let j = 0; j < (plus ? 8 : 4); j++) { const b = mk.mesh(new THREE.IcosahedronGeometry(1.5 + rt(), toon ? 1 : plus ? 3 : 2), leafM[j % 2]!); b.position.set((rt() - 0.5) * 2, 3.6 + rt() * 1.6, (rt() - 0.5) * 2); tr.add(b); }
      tr.position.set(x, y - 0.2, z); tr.scale.setScalar(k); s.add(tr);
    }
    // barn
    const barn = new THREE.Group(), red = mk.make(0xa8352a, { rough: 0.8 }), white = mk.make(0xf2ead8, { rough: 0.6 });
    const bw = mk.mesh(new THREE.BoxGeometry(9, 5, 7), red); bw.position.y = 2.5; barn.add(bw);
    const roof = mk.mesh(new THREE.CylinderGeometry(4.6, 4.6, 9.4, 3), mk.make(0x4a3328)); roof.rotation.z = Math.PI / 2; roof.rotation.x = Math.PI / 2; roof.scale.set(1, 1, 0.55); roof.position.y = 5.9; barn.add(roof);
    const door = mk.mesh(new THREE.BoxGeometry(0.2, 3.2, 3), white); door.position.set(4.55, 1.6, 0); barn.add(door);
    barn.position.set(-30, height(-30, -52), -52); barn.rotation.y = 0.5; s.add(barn);

    // herd
    if (plus) return; // model cows are added by useModels()
    for (const [i, spec] of o.herd.entries()) {
      const cow = new Cow(mk, spec.coat, { bell: spec.bell, seed: i + 1 });
      cow.root.position.set(spec.x, height(spec.x, spec.z), spec.z); cow.root.rotation.y = spec.rot; cow.root.scale.setScalar(spec.scale ?? 1);
      s.add(cow.root); this.cows.push({ cow, spec });
    }
  }

  models: { m: CowModel; spec: CowSpec; off: number }[] = [];
  /** the 'plus' look: CC0 animated model cows with a soft contact shadow each */
  useModels(a: CowAsset, herd: CowSpec[]) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d')!, g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    const blob = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false });
    herd.forEach((spec, i) => {
      const m = new CowModel(a, spec.coat, 1.6 * (spec.scale ?? 1));
      const y = height(spec.x, spec.z);
      m.root.position.set(spec.x, y, spec.z); m.root.rotation.y = spec.rot + Math.PI / 2;
      const b = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.8), blob); b.rotation.x = -Math.PI / 2; b.rotation.z = spec.rot;
      b.position.set(spec.x, y + 0.03, spec.z); this.scene.add(m.root, b);
      this.models.push({ m, spec, off: i * 1.37 });
    });
  }

  update(t: number, beat: number) {
    this.wind.value = t;
    for (const { m, spec, off } of this.models) m.pose(spec.graze > 0.5 ? 'idle' : 'walkslow', t + off, 1);
    const pulse = Math.pow(1 - (beat - Math.floor(beat)), 3);
    this.cows.forEach(({ cow, spec }, i) => cow.set(t, i * 1.7, spec.graze, spec.bell ? 0.4 + pulse : 0));
  }
}
