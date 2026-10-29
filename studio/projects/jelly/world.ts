// Jelly couple for "Góc Nhỏ Bình Yên": two chibi gummy people that squash & stretch on the beat — squeeze on the
// landing, wobble like jelly, crouch, stretch into a hop and travel a little. Three backdrops to choose from:
// 'room' (cosy pastel corner, window light, falling petals), 'sky' (dreamy dusk, clouds, floating hearts),
// 'studio' (seamless pastel cyclorama with a big jelly heart). Everything is a pure function of song time.
import * as THREE from 'three';

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (x: number) => { const k = clamp(x); return k * k * (3 - 2 * k); };
const hash = (i: number) => { const x = Math.sin(i * 127.1 + 31.7) * 43758.5453; return x - Math.floor(x); };
const put = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number, parent?: THREE.Object3D) => { o.position.set(x, y, z); parent?.add(o); return o; };
const mesh = (g: THREE.BufferGeometry, m: THREE.Material, cast = true) => { const me = new THREE.Mesh(g, m); me.castShadow = cast; me.receiveShadow = true; return me; };
const SPHERE = new THREE.SphereGeometry(1, 48, 32);

/** glossy gummy: clear-coated, a little light passes through, soft sheen on the edges */
const gummy = (color: number) => new THREE.MeshPhysicalMaterial({
  color, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.06, sheen: 0.6, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.4,
  transmission: 0.22, thickness: 0.7, ior: 1.35, attenuationColor: new THREE.Color(color), attenuationDistance: 0.6,
});

// ------------------------------------------------------------------------------------------------ jelly motion
/** One hop every 2 beats, landing on the beat. Returns hop height, squash (−) / stretch (+), airborne 0..1, hop index. */
export function hop(beat: number, beatSec: number, big = 1) {
  const b = beat - 1, n = Math.floor(b / 2), u = (b / 2) - n; // u: 0 = landing, 0.5 = take-off
  const strong = n % 2 === 0 ? 1 : 0.6; // the hop that lands on the bar's downbeat squashes harder
  const A = (0.2 + 0.14 * strong) * big, Hh = (0.1 + 0.16 * strong) * big;
  const tau = u * 2 * beatSec; // seconds since landing
  let s = -A * Math.exp(-tau / 0.17) * Math.cos((2 * Math.PI * tau) / 0.26); // land: squeeze, then jelly wobble
  s -= 0.16 * big * Math.sin(Math.PI * clamp((u - 0.3) / 0.2)) ** 2; // crouch before take-off
  let y = 0, air = 0;
  if (u >= 0.5) {
    const v = (u - 0.5) / 0.5;
    y = Hh * 4 * v * (1 - v); air = Math.sin(Math.PI * v);
    s += 0.2 * big * Math.abs(1 - 2 * v) ** 1.5; // stretched while fast, round at the top
  }
  return { y, s, air, n, v: u >= 0.5 ? (u - 0.5) / 0.5 : 0 };
}

// ------------------------------------------------------------------------------------------------ gummy person
export class JellyBean {
  root = new THREE.Group(); squash = new THREE.Group(); head = new THREE.Group();
  arms: THREE.Group[] = [];
  constructor(color: number, public who: 'him' | 'her') {
    const m = gummy(color), dark = new THREE.MeshPhysicalMaterial({ color: 0x1a1016, roughness: 0.08, clearcoat: 1 });
    this.root.add(this.squash);
    for (const sx of [-1, 1]) { const l = mesh(new THREE.CapsuleGeometry(0.085, 0.12, 8, 16), m); put(l, sx * 0.11, 0.13, 0, this.squash); }
    put(mesh(new THREE.CapsuleGeometry(0.27, 0.26, 12, 32), m), 0, 0.5, 0, this.squash);
    for (const sx of [-1, 1]) {
      const sh = put(new THREE.Group(), sx * 0.25, 0.66, 0, this.squash);
      const a = mesh(new THREE.CapsuleGeometry(0.07, 0.2, 8, 16), m); a.position.y = -0.16; sh.add(a);
      this.arms.push(sh);
    }
    put(this.head, 0, 1.08, 0, this.squash);
    const hd = mesh(SPHERE, m); hd.scale.set(0.31, 0.29, 0.29); this.head.add(hd);
    // face on the head surface
    const onHead = (o: THREE.Object3D, ax: number, ay: number) => {
      const d = new THREE.Vector3(Math.sin(ax) * Math.cos(ay), Math.sin(ay), Math.cos(ax) * Math.cos(ay));
      o.position.set(d.x * 0.31, d.y * 0.29, d.z * 0.29); o.lookAt(d.clone().multiplyScalar(2)); this.head.add(o); return o;
    };
    for (const sx of [-1, 1]) {
      const eye = mesh(SPHERE, dark, false); eye.scale.set(0.042, 0.052, 0.03); onHead(eye, sx * 0.33, 0.08);
      const shine = new THREE.Mesh(SPHERE, new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 2, 2) }));
      shine.position.set(0.35, 0.4, 0.75); shine.scale.set(0.3, 0.25, 0.4); eye.add(shine);
      const blush = new THREE.Mesh(new THREE.CircleGeometry(0.05, 24), new THREE.MeshBasicMaterial({ color: 0xff5f8a, transparent: true, opacity: 0.45, depthWrite: false }));
      onHead(blush, sx * 0.62, -0.12).translateZ(0.004);
    }
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.011, 8, 24, Math.PI), dark); smile.rotation.z = Math.PI;
    const sm = onHead(new THREE.Group(), 0, -0.14); sm.add(smile);
    if (who === 'her') { // a ribbon bow
      const red = new THREE.MeshPhysicalMaterial({ color: 0xff3d6e, roughness: 0.3, clearcoat: 1 });
      const bow = onHead(new THREE.Group(), 0.55, 0.62);
      for (const sx of [-1, 1]) { const w = mesh(new THREE.ConeGeometry(0.06, 0.12, 16), red); w.rotation.z = sx * Math.PI / 2; w.position.x = sx * 0.06; bow.add(w); }
      bow.add(mesh(new THREE.SphereGeometry(0.03, 16, 12), red));
    } else { // a little hair tuft
      const tuft = mesh(new THREE.ConeGeometry(0.05, 0.14, 16), m); tuft.rotation.z = -0.4; tuft.position.set(0.02, 0.33, 0); this.head.add(tuft);
    }
  }

  /** pose from the beat: hop + volume-preserving squash, a lagging head and floppy arms */
  update(beat: number, beatSec: number, o: { lag?: number; big?: number; face?: number; travel?: number } = {}) {
    const lag = o.lag ?? 0, h = hop(beat - lag, beatSec, o.big ?? 1), h2 = hop(beat - lag - 0.12, beatSec, o.big ?? 1);
    const sy = 1 + h.s, sxz = 1 / Math.sqrt(sy);
    this.squash.scale.set(sxz, sy, sxz);
    this.root.position.y = h.y;
    // the head jiggles a beat-fraction later than the body, a bit more than the body
    const hs = 1 + 0.6 * h2.s; this.head.scale.set(1 / Math.sqrt(hs), hs, 1 / Math.sqrt(hs));
    this.head.rotation.z = 0.12 * h2.s * (this.who === 'her' ? 1 : -1);
    // travel a little left/right on each hop
    const X = (n: number) => (o.travel ?? 0.12) * Math.sin(n * Math.PI / 2);
    this.root.position.x = (this.root.userData.baseX ?? 0) + X(h.n) + (X(h.n + 1) - X(h.n)) * smooth(h.v);
    // every 4th hop spins once in the air
    this.root.rotation.y = (o.face ?? 0) + (h.n % 4 === 3 ? Math.PI * 2 * smooth(h.v) : 0);
    this.arms.forEach((a, i) => {
      const side = i === 0 ? -1 : 1;
      a.rotation.z = side * (0.35 + 1.9 * h.air + 1.6 * Math.max(0, -h2.s));
      a.rotation.x = -0.25 * h.air;
    });
  }
}

// ------------------------------------------------------------------------------------------------ backdrops
export type Backdrop = 'room' | 'sky' | 'studio';

const heartShape = () => {
  const s = new THREE.Shape();
  s.moveTo(0, -0.5); s.bezierCurveTo(-0.15, -0.3, -0.6, -0.05, -0.55, 0.25); s.bezierCurveTo(-0.5, 0.55, -0.1, 0.6, 0, 0.3);
  s.bezierCurveTo(0.1, 0.6, 0.5, 0.55, 0.55, 0.25); s.bezierCurveTo(0.6, -0.05, 0.15, -0.3, 0, -0.5);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 8, curveSegments: 24 });
  g.center(); return g;
};

const gradTex = (stops: [number, string][]) => {
  const cv = document.createElement('canvas'); cv.width = 4; cv.height = 512;
  const c = cv.getContext('2d')!, g = c.createLinearGradient(0, 0, 0, 512);
  for (const [k, col] of stops) g.addColorStop(k, col);
  c.fillStyle = g; c.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
};

export class World {
  scene = new THREE.Scene();
  him = new JellyBean(0x3f9ff0, 'him');
  her = new JellyBean(0xff5f96, 'her');
  private movers: ((t: number, beat: number) => void)[] = [];

  constructor(env: THREE.Texture, public bg: Backdrop) {
    const s = this.scene;
    s.environment = env; s.environmentIntensity = 0.3;
    const key = new THREE.DirectionalLight(0xfff0e0, 1.8); key.position.set(3, 6, 4); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 20 });
    key.shadow.radius = 8; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
    s.add(key, key.target, new THREE.HemisphereLight(0xfff4fa, 0xc89aa8, 0.4));
    const rim = new THREE.DirectionalLight(0xc8e4ff, 1.4); rim.position.set(-4, 3, -5); s.add(rim);
    this.him.root.userData.baseX = -0.42; this.her.root.userData.baseX = 0.42;
    s.add(this.him.root, this.her.root);
    ({ room: () => this.room(), sky: () => this.sky(), studio: () => this.studio() })[bg]();
  }

  update(t: number, beat: number, beatSec: number) {
    this.him.update(beat, beatSec, { face: 0.25 });
    this.her.update(beat, beatSec, { face: -0.25, lag: 0.08 });
    for (const m of this.movers) m(t, beat);
  }

  private floor(color: number, rough = 0.6) {
    const f = mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color, roughness: rough }), false);
    f.rotation.x = -Math.PI / 2; this.scene.add(f); return f;
  }

  /** cosy pastel corner of a room: warm window light, a rug, a plant, petals drifting down */
  private room() {
    const s = this.scene, wall = new THREE.MeshStandardMaterial({ color: 0xe9b9a6, roughness: 0.9 });
    s.background = new THREE.Color(0xd99f8c); s.fog = new THREE.Fog(0xd99f8c, 9, 22);
    this.floor(0xb9805a, 0.5);
    put(mesh(new THREE.PlaneGeometry(12, 6), wall, false), 0, 3, -2.2, s);
    const side = put(mesh(new THREE.PlaneGeometry(8, 6), wall, false), -2.6, 3, 0, s); side.rotation.y = Math.PI / 2;
    const rug = mesh(new THREE.CircleGeometry(1.25, 64), new THREE.MeshStandardMaterial({ color: 0xf59ab4, roughness: 1 }), false);
    rug.rotation.x = -Math.PI / 2; rug.position.y = 0.004; s.add(rug);
    // window on the back wall, glowing warm, with a soft beam
    const win = put(new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.35, 1.05) })), 0.9, 2.3, -2.19, s);
    const frame = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    for (const [w, h, x, y] of [[1.42, 0.07, 0, 0.8], [1.42, 0.07, 0, -0.8], [0.07, 1.66, 0.68, 0], [0.07, 1.66, -0.68, 0], [0.05, 1.6, 0, 0], [1.3, 0.05, 0, 0]] as const)
      put(mesh(new THREE.BoxGeometry(w, h, 0.05), frame, false), x, y, 0.02, win);
    const sun = new THREE.SpotLight(0xffd9a8, 30, 12, 0.5, 0.8); sun.position.set(1.4, 3.6, -1.6); sun.target.position.set(-0.2, 0, 0.4); s.add(sun, sun.target);
    // potted plant at the left
    const pot = put(mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.32, 24), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.4 })), -1.45, 0.16, -1.2, s);
    const leaf = new THREE.MeshStandardMaterial({ color: 0x7cc79a, roughness: 0.5 });
    for (let i = 0; i < 9; i++) { const l = mesh(SPHERE, leaf); l.scale.set(0.12, 0.2, 0.05); l.position.set((hash(i) - 0.5) * 0.35, 0.35 + hash(i + 9) * 0.4, (hash(i + 3) - 0.5) * 0.2); l.rotation.z = (hash(i + 5) - 0.5) * 1.6; pot.add(l); }
    this.petals(0xffb3c8, 70);
  }

  /** dreamy dusk sky: a round grass island, puffy clouds and floating gummy hearts */
  private sky() {
    const s = this.scene;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16), new THREE.MeshBasicMaterial({ map: gradTex([[0, '#7f6fe0'], [0.45, '#f39cc0'], [0.75, '#ffc89e'], [1, '#ffd9b8']]), side: THREE.BackSide, fog: false }));
    s.add(dome); s.fog = new THREE.Fog(0xf0b8cc, 14, 40);
    const isle = mesh(new THREE.CylinderGeometry(2.2, 1.6, 0.5, 64), new THREE.MeshStandardMaterial({ color: 0x6cc277, roughness: 0.8 }));
    isle.position.y = -0.25; s.add(isle);
    const cloudM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0xffe8f0, emissiveIntensity: 0.25 });
    for (let k = 0; k < 7; k++) {
      const c = new THREE.Group();
      for (let i = 0; i < 6; i++) { const p = mesh(SPHERE, cloudM, false); p.scale.setScalar(0.35 + hash(k * 9 + i) * 0.35); p.position.set((i - 2.5) * 0.38, hash(k * 7 + i) * 0.25, hash(k + i) * 0.2); c.add(p); }
      const x0 = (hash(k * 3) - 0.5) * 12, y0 = 1.2 + hash(k * 5) * 4, z0 = -4 - hash(k * 11) * 8;
      s.add(c); this.movers.push((t) => c.position.set(x0 + Math.sin(t * 0.05 + k) * 0.6, y0, z0));
    }
    this.hearts(12);
  }

  /** seamless pastel cyclorama with one big jelly heart that beats with them */
  private studio() {
    const s = this.scene, col = 0xf6aac4;
    s.background = new THREE.Color(col); s.fog = new THREE.Fog(col, 10, 24);
    this.floor(col, 0.7);
    const cyc = mesh(new THREE.CylinderGeometry(4, 4, 8, 64, 1, true, Math.PI * 0.5, Math.PI), new THREE.MeshStandardMaterial({ color: col, roughness: 0.9, side: THREE.BackSide }), false);
    cyc.position.set(0, 4, 0.6); s.add(cyc);
    const big = mesh(heartShape(), gummy(0xff4f86)); big.position.set(0, 2.1, -1.8); big.scale.setScalar(1.5); s.add(big);
    this.movers.push((t, beat) => { const p = Math.pow(1 - (beat - Math.floor(beat)), 4); const k = 1 + 0.08 * p; big.scale.set(1.5 / Math.sqrt(k), 1.5 * k, 1.5); big.rotation.y = Math.sin(t * 0.6) * 0.25; });
    this.hearts(6, 0.6);
  }

  private petals(color: number, n: number) {
    const geo = new THREE.CircleGeometry(0.035, 10); geo.scale(1, 0.6, 1);
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.7, side: THREE.DoubleSide });
    const inst = new THREE.InstancedMesh(geo, m, n); this.scene.add(inst);
    const o = new THREE.Object3D();
    this.movers.push((t) => {
      for (let i = 0; i < n; i++) {
        const speed = 0.22 + hash(i) * 0.15, y = 3.4 - ((t * speed + hash(i + 50) * 4) % 4);
        o.position.set((hash(i + 7) - 0.5) * 4 + Math.sin(t * 1.3 + i) * 0.15, y, -1.8 + hash(i + 13) * 3);
        o.rotation.set(t * (1 + hash(i)) + i, t * 0.7 + i, 0); o.updateMatrix(); inst.setMatrixAt(i, o.matrix);
      }
      inst.instanceMatrix.needsUpdate = true;
    });
  }

  private hearts(n: number, size = 0.35) {
    const geo = heartShape(), m = gummy(0xff6f9c);
    for (let i = 0; i < n; i++) {
      const h = mesh(geo, m, false), sc = size * (0.4 + hash(i * 3) * 0.6);
      const x0 = (hash(i) - 0.5) * 5, z0 = -1.5 - hash(i + 4) * 3, y0 = 1.3 + hash(i + 8) * 2.6;
      this.scene.add(h);
      this.movers.push((t, beat) => {
        const p = Math.pow(1 - (beat - Math.floor(beat)), 4), k = 1 + 0.12 * p;
        h.scale.set(sc / Math.sqrt(k), sc * k, sc); h.position.set(x0, y0 + Math.sin(t * 0.8 + i) * 0.15, z0); h.rotation.y = Math.sin(t * 0.7 + i) * 0.6;
      });
    }
  }
}
