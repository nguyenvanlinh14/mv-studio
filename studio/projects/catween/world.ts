// Cute Halloween kittens — chibi "Pixar" kittens (big head, big glossy eyes, soft shell fur) on a cosy Halloween porch
// at purple dusk: wooden planks, hay bale, jack-o'-lanterns, string lights, a candy pail. Nothing scary on purpose.
import * as THREE from 'three';
import { mulberry } from '../chanbo-lookdev/field';
import { Pumpkin } from '../cider/world';

const std = (color: number, rough = 0.8, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, ...o });
const mesh = (g: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], cast = true) => { const me = new THREE.Mesh(g, m); me.castShadow = cast; me.receiveShadow = true; return me; };
const tex = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d')!); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; };
const put = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number, parent?: THREE.Object3D) => { o.position.set(x, y, z); parent?.add(o); return o; };
const SPHERE = new THREE.SphereGeometry(1, 40, 28);

// ------------------------------------------------------------------------------------------------ shell fur
// Per-pixel random strand heights; shell i keeps only strands taller than i/N, so the fur thins toward the tips.
const STRANDS = (() => {
  const R = mulberry(9), cv = document.createElement('canvas'); cv.width = cv.height = 512;
  const c = cv.getContext('2d')!, im = c.createImageData(512, 512);
  for (let i = 0; i < 512 * 512; i++) { const v = Math.pow(R(), 0.7) * 255; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
  c.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(36, 20); return t;
})();
const SHELLS = 20, FUR_LEN = 0.05;
const shellMats = new Map<string, THREE.MeshStandardMaterial[]>();
function furMats(color: number, tip: number) {
  const key = `${color}-${tip}`;
  if (!shellMats.has(key)) {
    const a = new THREE.Color(color), b = new THREE.Color(tip);
    shellMats.set(key, Array.from({ length: SHELLS }, (_, i) => {
      const k = (i + 1) / SHELLS, col = a.clone().lerp(b, k).multiplyScalar(0.75 + 0.25 * k);
      return std(col.getHex(), 1, { alphaMap: STRANDS, alphaTest: 0.08 + 0.85 * k, sheen: 1 } as any);
    }));
  }
  return shellMats.get(key)!;
}
/** a furry ellipsoid: a solid core plus SHELLS slightly larger alpha-tested copies */
function fuzzy(r: [number, number, number], color: number, tip = color, len = FUR_LEN) {
  const g = new THREE.Group(); g.scale.set(...r);
  g.add(mesh(SPHERE, std(new THREE.Color(color).multiplyScalar(0.7).getHex(), 1)));
  const rr = Math.min(...r);
  furMats(color, tip).forEach((m, i) => { const s = mesh(SPHERE, m, false); s.scale.setScalar(1 + (len / rr) * ((i + 1) / SHELLS)); g.add(s); });
  return g;
}

// ------------------------------------------------------------------------------------------------ kitten
export type Coat = 'ginger' | 'black' | 'white' | 'calico';
export type Costume = 'witch' | 'pumpkin' | 'bat' | 'none';
const COATS: Record<Coat, { fur: number; tip: number; belly: number; eye: string; inner: number }> = {
  ginger: { fur: 0xe08a3c, tip: 0xffc27a, belly: 0xfff1de, eye: '#3fae5a', inner: 0xf2a3a8 },
  black: { fur: 0x26222a, tip: 0x5a5262, belly: 0x2e2a32, eye: '#e8b21e', inner: 0x8a5a66 },
  white: { fur: 0xf2eee8, tip: 0xffffff, belly: 0xffffff, eye: '#4a9ee0', inner: 0xf6b0b8 },
  calico: { fur: 0xf4ece0, tip: 0xffffff, belly: 0xffffff, eye: '#c88a2a', inner: 0xf2a3a8 },
};
const irisTex = new Map<string, THREE.Texture>();
const iris = (col: string) => {
  if (!irisTex.has(col)) irisTex.set(col, tex(256, 256, (c) => {
    c.fillStyle = '#05040a'; c.fillRect(0, 0, 256, 256);
    const g = c.createRadialGradient(128, 140, 40, 128, 128, 128); g.addColorStop(0, col); g.addColorStop(0.75, col); g.addColorStop(1, '#100c10');
    c.fillStyle = g; c.beginPath(); c.arc(128, 128, 124, 0, 7); c.fill();
    c.fillStyle = '#05040a'; c.beginPath(); c.ellipse(128, 128, 70, 82, 0, 0, 7); c.fill(); // big round pupils = cute
  }));
  return irisTex.get(col)!;
};
const GLOSS = new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.25 });
const SHINE = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.2, 2.2) });
const DARK = std(0x2a1418, 0.5);

export interface KittyPose { bob?: number; head?: [number, number, number]; blink?: number; tail?: number; ear?: number; pawUp?: number }

export class Kitty {
  root = new THREE.Group(); body = new THREE.Group(); head = new THREE.Group(); tail = new THREE.Group();
  ears: THREE.Group[] = []; lids: THREE.Mesh[] = []; paw = new THREE.Group(); seed: number;
  constructor(coat: Coat = 'ginger', costume: Costume = 'none', seed = 1) {
    this.seed = seed;
    const C = COATS[coat];
    this.root.add(this.body);
    // sitting body: pear + haunches + front paws
    put(fuzzy([0.3, 0.33, 0.28], C.fur, C.tip), 0, 0.33, 0, this.body);
    put(fuzzy([0.19, 0.2, 0.1], C.belly, 0xffffff, 0.05), 0, 0.33, 0.2, this.body);
    for (const sx of [-1, 1]) {
      put(fuzzy([0.15, 0.15, 0.2], C.fur, C.tip), sx * 0.2, 0.15, 0.02, this.body);
      if (sx === 1) put(fuzzy([0.08, 0.075, 0.1], C.belly, 0xffffff, 0.04), 0, 0, 0, put(this.paw, 0.1, 0.06, 0.24, this.body));
      else put(fuzzy([0.08, 0.075, 0.1], C.belly, 0xffffff, 0.04), -0.1, 0.06, 0.24, this.body);
    }
    if (coat === 'calico') {
      put(fuzzy([0.2, 0.18, 0.18], 0xd9782e, 0xf0a050), -0.15, 0.42, -0.08, this.body);
      put(fuzzy([0.16, 0.15, 0.16], 0x2e2826, 0x504440), 0.17, 0.25, -0.1, this.body);
    }
    // tail curling round the side
    put(this.tail, 0.18, 0.08, -0.2, this.body);
    const tc = new THREE.CatmullRomCurve3([[0, 0, 0], [0.18, 0.02, 0.05], [0.3, 0.06, 0.22], [0.26, 0.12, 0.38]].map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    const tm = coat === 'calico' ? 0xd9782e : C.fur;
    this.tail.add(mesh(new THREE.TubeGeometry(tc, 24, 0.055, 10), std(tm, 1, { sheen: 1, sheenColor: new THREE.Color(C.tip) } as any)));
    for (let i = 1; i <= 5; i++) this.tail.add(mesh(new THREE.TubeGeometry(tc, 24, 0.055 + i * 0.008, 10), furMats(tm, C.tip)[i * 2]!, false));
    // head: big and round, cheek fluff, ears
    put(this.head, 0, 0.78, 0.02, this.body);
    put(fuzzy([0.4, 0.35, 0.36], C.fur, C.tip), 0, 0, 0, this.head);
    for (const sx of [-1, 1]) put(fuzzy([0.12, 0.1, 0.11], C.fur, C.tip, 0.05), sx * 0.3, -0.13, 0.1, this.head);
    put(fuzzy([0.12, 0.08, 0.07], C.belly, 0xffffff, 0.03), 0, -0.13, 0.31, this.head); // muzzle
    if (coat === 'calico') put(fuzzy([0.2, 0.16, 0.2], 0xd9782e, 0xf0a050), -0.2, 0.14, 0.02, this.head);
    for (const sx of [-1, 1]) {
      const e = put(new THREE.Group(), sx * 0.22, 0.24, 0, this.head); e.rotation.z = -sx * 0.32;
      const outer = mesh(new THREE.ConeGeometry(0.13, 0.26, 4, 1), std(C.fur, 1)); outer.scale.z = 0.45; outer.rotation.y = Math.PI / 4; put(outer, 0, 0.1, 0, e);
      const inner = mesh(new THREE.ConeGeometry(0.085, 0.19, 4, 1), std(C.inner, 0.9)); inner.scale.z = 0.25; inner.rotation.y = Math.PI / 4; put(inner, 0, 0.08, 0.035, e);
      this.ears.push(e);
      // eyes: dark glossy ball + iris disc + two catchlights + a lid for blinks
      const eg = put(new THREE.Group(), sx * 0.155, 0.01, 0.37, this.head); eg.rotation.y = sx * 0.3;
      const ball = mesh(SPHERE, std(0x05040a, 0.2), false); ball.scale.set(0.105, 0.12, 0.06); eg.add(ball);
      const ir = new THREE.Mesh(new THREE.CircleGeometry(0.1, 40), new THREE.MeshStandardMaterial({ map: iris(C.eye), roughness: 0.15 })); ir.scale.y = 1.15; put(ir, 0, 0, 0.058, eg);
      const gl = mesh(SPHERE, GLOSS, false); gl.scale.set(0.108, 0.124, 0.064); eg.add(gl);
      put(new THREE.Mesh(new THREE.CircleGeometry(0.02, 20), SHINE), -0.03, 0.045, 0.066, eg);
      put(new THREE.Mesh(new THREE.CircleGeometry(0.009, 16), SHINE), 0.03, -0.035, 0.066, eg);
      const lid = mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), std(C.fur, 1), false); lid.scale.set(0.115, 0.13, 0.075); lid.rotation.x = -1.4; eg.add(lid); this.lids.push(lid);
      // blush + whiskers
      const bl = new THREE.Mesh(new THREE.CircleGeometry(0.05, 20), new THREE.MeshBasicMaterial({ color: 0xff7a90, transparent: true, opacity: coat === 'black' ? 0.25 : 0.4, depthWrite: false }));
      bl.scale.y = 0.6; bl.rotation.y = sx * 0.6; put(bl, sx * 0.25, -0.1, 0.375, this.head);
      for (let w = 0; w < 3; w++) {
        const wh = mesh(new THREE.CylinderGeometry(0.003, 0.0015, 0.28, 4), new THREE.MeshBasicMaterial({ color: coat === 'black' ? 0xcfc6d0 : 0xffffff }), false);
        wh.rotation.z = sx * (Math.PI / 2 + (w - 1) * 0.18); wh.rotation.y = -sx * 0.35; put(wh, sx * 0.2, -0.12 - w * 0.025, 0.37, this.head);
      }
    }
    // nose + "w" mouth
    const nose = mesh(SPHERE, std(C.inner, 0.35), false); nose.scale.set(0.035, 0.022, 0.02); put(nose, 0, -0.095, 0.4, this.head);
    const mc = (sx: number) => new THREE.CatmullRomCurve3([[0, -0.115, 0.395], [sx * 0.025, -0.145, 0.39], [sx * 0.055, -0.13, 0.38]].map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    for (const sx of [-1, 1]) this.head.add(mesh(new THREE.TubeGeometry(mc(sx), 12, 0.005, 5), DARK, false));
    this.dress(costume);
  }
  private dress(c: Costume) {
    if (c === 'witch') {
      const purple = std(0x4a2a7a, 0.7), g = put(new THREE.Group(), 0.03, 0.27, -0.02, this.head); g.rotation.z = -0.18;
      g.add(mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.02, 40), purple));
      const cone = new THREE.ConeGeometry(0.2, 0.5, 32, 8), p = cone.attributes.position!;
      for (let i = 0; i < p.count; i++) { const y = p.getY(i) + 0.25, k = y * y * 0.5; p.setX(i, p.getX(i) + k); } // floppy tip
      cone.computeVertexNormals(); put(mesh(cone, purple), 0, 0.25, 0, g);
      put(mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.06, 32), std(0xff8a1e, 0.5)), 0, 0.05, 0, g);
      const star = mesh(new THREE.OctahedronGeometry(0.04), std(0xffd24a, 0.3, { emissive: 0xffb020, emissiveIntensity: 0.8 })); put(star, 0, 0.06, 0.2, g);
    }
    if (c === 'pumpkin') {
      const hood = new THREE.SphereGeometry(0.46, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.42), p = hood.attributes.position!;
      for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)), k = 1 + 0.05 * Math.cos(a * 10); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); }
      hood.computeVertexNormals();
      const h = put(mesh(hood, std(0xf07a1a, 0.6)), 0, 0.02, -0.03, this.head); h.scale.set(1, 0.9, 1);
      put(mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.12, 8), std(0x4a6a22)), 0, 0.45, -0.03, this.head).rotation.z = 0.3;
      const leaf = mesh(new THREE.CircleGeometry(0.07, 12), std(0x5a8a2a, 0.7, { side: THREE.DoubleSide })); leaf.scale.x = 0.55; leaf.rotation.set(-1.1, 0, 0.8); put(leaf, 0.07, 0.44, 0.0, this.head);
      for (const e of this.ears) e.position.y += 0.06; // ears poke through
    }
    if (c === 'bat') for (const sx of [-1, 1]) {
      const w = new THREE.Shape(); w.moveTo(0, 0); w.lineTo(0.42, 0.18); w.quadraticCurveTo(0.36, 0.05, 0.4, -0.05); w.quadraticCurveTo(0.3, -0.02, 0.27, -0.12); w.quadraticCurveTo(0.18, -0.06, 0.12, -0.16); w.lineTo(0, -0.05);
      const m = mesh(new THREE.ShapeGeometry(w), std(0x2a1e36, 0.8, { side: THREE.DoubleSide })); m.scale.x = sx; m.rotation.y = -sx * 0.5; put(m, sx * 0.12, 0.5, -0.22, this.body);
    }
  }
  pose(p: KittyPose) {
    this.body.position.y = p.bob ?? 0;
    const h = p.head ?? [0, 0, 0]; this.head.rotation.set(h[0], h[1], h[2]);
    const b = p.blink ?? 0; this.lids.forEach((l) => (l.rotation.x = -1.4 + b * 1.25));
    this.tail.rotation.y = (p.tail ?? 0) * 0.4;
    this.ears.forEach((e, i) => (e.rotation.x = i === 0 ? (p.ear ?? 0) * -0.4 : 0));
    this.paw.position.y = 0.06 + (p.pawUp ?? 0) * 0.22; this.paw.rotation.x = -(p.pawUp ?? 0) * 0.8;
  }
  /** idle life: breathing bob, blinks, tail sway, ear flicks, a little head tilt on the beat */
  idle(t: number, beat = 0) {
    const s = this.seed, bt = beat % 1, blinkPh = (t * 0.31 + s * 0.37) % 1;
    this.pose({
      bob: 0.008 * Math.sin(t * 2.2 + s) + 0.012 * Math.exp(-bt * 6),
      head: [0.05 * Math.sin(t * 0.7 + s), 0.18 * Math.sin(t * 0.45 + s * 2), 0.14 * Math.sin(t * 0.9 + s) + 0.04 * Math.sin(beat * Math.PI)],
      blink: blinkPh < 0.04 ? Math.sin((blinkPh / 0.04) * Math.PI) : 0,
      tail: Math.sin(t * 1.6 + s), ear: ((t * 0.23 + s * 0.5) % 1) < 0.05 ? 1 : 0,
    });
  }
}

// ------------------------------------------------------------------------------------------------ the porch
export class CandyPail {
  root = new THREE.Group();
  constructor() {
    const face = tex(512, 256, (c) => {
      c.fillStyle = '#f07a1a'; c.fillRect(0, 0, 512, 256); c.fillStyle = '#2a1408';
      for (const x of [196, 316]) { c.beginPath(); c.moveTo(x - 24, 110); c.lineTo(x + 24, 110); c.lineTo(x, 70); c.fill(); }
      c.beginPath(); c.moveTo(186, 150); c.quadraticCurveTo(256, 215, 326, 150); c.quadraticCurveTo(256, 180, 186, 150); c.fill();
    });
    const body = mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.3, 32, 1, true), std(0xffffff, 0.45, { map: face, side: THREE.DoubleSide })); body.rotation.y = -Math.PI / 2; put(body, 0, 0.15, 0, this.root);
    put(mesh(new THREE.CircleGeometry(0.17, 32), std(0xd0601a)), 0, 0.005, 0, this.root).rotation.x = -Math.PI / 2;
    const handle = mesh(new THREE.TorusGeometry(0.19, 0.008, 6, 32, Math.PI), std(0x222222, 0.4)); put(handle, 0, 0.3, 0, this.root);
    const R = mulberry(4), cols = [0xff4a7a, 0x4ad0ff, 0xffd24a, 0x9a5aff, 0x5aff8a];
    for (let i = 0; i < 14; i++) {
      const a = R() * 6.28, r = R() * 0.15, cd = mesh(new THREE.CapsuleGeometry(0.025, 0.04, 4, 8), std(cols[i % 5]!, 0.3, { emissive: cols[i % 5]!, emissiveIntensity: 0.1 }));
      cd.rotation.set(R() * 3, R() * 3, R() * 3); put(cd, Math.cos(a) * r, 0.28 + R() * 0.06, Math.sin(a) * r, this.root);
    }
  }
}

export class Porch {
  scene = new THREE.Scene(); kitties: Kitty[] = []; pumpkins: Pumpkin[] = []; bulbs: THREE.MeshBasicMaterial[] = []; pail = new CandyPail();
  constructor() {
    const s = this.scene, R = mulberry(31);
    // dusk sky: violet → peach at the horizon, a soft big moon
    const sky = new THREE.Mesh(new THREE.SphereGeometry(80, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vp; void main(){ vp = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: 'varying vec3 vp; void main(){ float h = normalize(vp).y; vec3 c = mix(vec3(1.0,0.55,0.45), vec3(0.42,0.26,0.62), smoothstep(-0.05,0.25,h)); c = mix(c, vec3(0.12,0.08,0.28), smoothstep(0.25,0.8,h)); gl_FragColor = vec4(c*0.9,1.); }' }));
    s.add(sky);
    const moon = new THREE.Mesh(new THREE.CircleGeometry(5, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.5, 1.2), fog: false })); put(moon, 9, 14, -55, s); moon.lookAt(0, 1, 0);
    s.fog = new THREE.FogExp2(new THREE.Color(0.45, 0.3, 0.55), 0.035);
    const key = new THREE.DirectionalLight(0xffd6b0, 2.2); key.position.set(3, 5, 4); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 6;
    Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4 }); s.add(key, key.target);
    const rim = new THREE.DirectionalLight(0xb08aff, 2.4); rim.position.set(-3, 3, -5); s.add(rim);
    s.add(new THREE.HemisphereLight(0x9a80d0, 0x5a3a2a, 1.1));
    // porch planks + back wall with a window
    const wood = std(0x8a5a3a, 0.75);
    for (let i = 0; i < 14; i++) put(mesh(new THREE.BoxGeometry(8, 0.08, 0.36), std(new THREE.Color(0x8a5a3a).multiplyScalar(0.85 + R() * 0.3).getHex(), 0.75)), 0, -0.04, 2.4 - i * 0.37, s);
    put(mesh(new THREE.BoxGeometry(8, 4, 0.2), std(0x5a4a6a, 0.9)), 0, 2, -2.9, s);
    for (let i = 0; i < 16; i++) put(mesh(new THREE.BoxGeometry(0.02, 4, 0.02), std(0x4a3a5a)), -4 + i * 0.5, 2, -2.79, s);
    put(mesh(new THREE.PlaneGeometry(1.2, 1.0), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.0, 0.45) })), 1.5, 1.9, -2.78, s);
    for (const [w, h, x, y] of [[1.36, 0.08, 1.5, 2.44], [1.36, 0.08, 1.5, 1.36], [0.08, 1.1, 0.86, 1.9], [0.08, 1.1, 2.14, 1.9], [0.05, 1.0, 1.5, 1.9], [1.2, 0.05, 1.5, 1.9]] as const) put(mesh(new THREE.BoxGeometry(w, h, 0.06), wood), x, y, -2.75, s);
    // hay bale + pumpkins
    put(mesh(new THREE.BoxGeometry(1.4, 0.6, 0.7), std(0xd8b060, 1)), -1.6, 0.3, -1.9, s);
    for (const [x, z, sc, lit] of [[-1.9, -1.9, 0.0, 0], [-1.3, -1.7, 0.75, 1], [-2.0, -1.6, 0.5, 0], [1.7, -1.4, 0.9, 1], [2.4, -1.0, 0.55, 0], [-2.6, -0.6, 0.6, 1], [2.2, 0.2, 0.4, 0]] as const) {
      if (!sc) continue; const p = new Pumpkin(sc, !!lit, x * 7); put(p.root, x, x < -1.5 && z < -1.8 ? 0.6 + sc * 0.4 : sc * 0.41, z, s); p.root.rotation.y = -x * 0.15; this.pumpkins.push(p);
    }
    // string lights draped across the wall (bokeh in DOF)
    for (let i = 0; i < 40; i++) {
      const x = -4 + i * 0.2, y = 3.3 - 0.35 * Math.sin((i / 39) * Math.PI * 2.0) ** 2;
      const m = new THREE.MeshBasicMaterial({ color: new THREE.Color([0xffb040, 0xff7ad0, 0x9a7aff, 0x7affc0][i % 4]!).multiplyScalar(3) }); this.bulbs.push(m);
      put(new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), m), x, y, -2.7, s);
    }
    // falling leaves on the planks
    for (let i = 0; i < 40; i++) {
      const l = mesh(new THREE.CircleGeometry(0.05, 6), std([0xd0602a, 0xe8a030, 0xa83a20][i % 3]!, 0.8, { side: THREE.DoubleSide }), false); l.scale.x = 0.6;
      l.rotation.set(-Math.PI / 2, 0, R() * 6); put(l, (R() - 0.5) * 6, 0.005, 2 - R() * 4, s);
    }
    this.pail.root.position.set(0.55, 0, 0.35); s.add(this.pail.root);
  }
  add(k: Kitty, x: number, z: number, yaw = 0, scale = 1) { put(k.root, x, 0, z, this.scene); k.root.rotation.y = yaw; k.root.scale.setScalar(scale); this.kitties.push(k); return k; }
  update(t: number) {
    this.pumpkins.forEach((p) => p.update(t));
    this.bulbs.forEach((b, i) => b.color.multiplyScalar(1)); // static for now; twinkle later if wanted
  }
}
