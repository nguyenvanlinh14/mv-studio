// "Apple Cider and Cold Bones" — a cozy-creepy Halloween night: harvest moon, a path through tall dry grass, dark oaks
// and pines (an owl watching), grinning jack-o'-lanterns, a cabin porch with steaming cider, a clearing with dark
// water, falling leaves, and little sheet ghosts — the "we" of the song — who walk, float and dance on the beat.
import * as THREE from 'three';
import { bladeGeometry, mulberry } from '../chanbo-lookdev/field';

const std = (color: number, rough = 0.8, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, ...o });
const mesh = (g: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], cast = true) => { const me = new THREE.Mesh(g, m); me.castShadow = cast; me.receiveShadow = true; return me; };
const tex = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d')!); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; };

// the path: a winding ribbon from the viewer toward the forest and the clearing
export const PATH = new THREE.CatmullRomCurve3([[0, 12], [1.5, 2], [-1, -8], [0.5, -18], [3, -28], [1, -40]].map(([x, z]) => new THREE.Vector3(x, 0, z)));
const PATH_PTS = PATH.getSpacedPoints(160);
const pathDist = (x: number, z: number) => { let d = 1e9; for (const p of PATH_PTS) d = Math.min(d, (p.x - x) ** 2 + (p.z - z) ** 2); return Math.sqrt(d); };
export const POND = { x: 6, z: -36, r: 7 };

/** a pumpkin: ribbed sphere, stem, and (if lit) a glowing carved face that flickers */
export class Pumpkin {
  root = new THREE.Group(); face: THREE.MeshBasicMaterial | null = null; light: THREE.PointLight | null = null; seed: number;
  static faceTex = tex(256, 256, (c) => {
    c.fillStyle = '#000'; c.fillRect(0, 0, 256, 256); c.fillStyle = '#fff';
    const tri = (x: number, y: number, s: number) => { c.beginPath(); c.moveTo(x - s, y + s * 0.7); c.lineTo(x + s, y + s * 0.7); c.lineTo(x, y - s * 0.8); c.fill(); };
    tri(82, 96, 30); tri(174, 96, 30); tri(128, 140, 14);
    c.beginPath(); c.moveTo(48, 168); for (let i = 0; i <= 8; i++) c.lineTo(48 + i * 20, 168 + (i % 2 ? 26 : 8)); c.lineTo(208, 200); c.quadraticCurveTo(128, 250, 48, 200); c.closePath(); c.fill();
  });
  constructor(scale = 1, lit = true, seed = 1) {
    this.seed = seed;
    const g = new THREE.SphereGeometry(0.5, 40, 24), p = g.attributes.position!;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 + 0.06 * Math.cos(a * 10); p.setXYZ(i, x * k * 1.12, y * 0.82, z * k * 1.12); }
    g.computeVertexNormals();
    const body = mesh(g, std(0xe0701a, 0.55)); this.root.add(body);
    const stem = mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.22, 8), std(0x4a5a22)); stem.position.y = 0.46; stem.rotation.z = 0.2; this.root.add(stem);
    if (lit) {
      this.face = new THREE.MeshBasicMaterial({ map: Pumpkin.faceTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(1.8, 1.0, 0.3) });
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.565, 32, 20, -Math.PI * 0.35, Math.PI * 0.7, Math.PI * 0.25, Math.PI * 0.5), this.face);
      f.rotation.y = Math.PI / 2; f.scale.set(1.0, 0.82, 1.0); this.root.add(f);
      this.light = new THREE.PointLight(0xffa040, 1.6, 4, 1.5); this.light.position.set(0, 0.1, 0.7); this.root.add(this.light);
    }
    this.root.scale.setScalar(scale);
  }
  update(t: number) {
    const fl = 0.8 + 0.2 * Math.sin(t * 13 + this.seed) * Math.sin(t * 7.3 + this.seed * 2);
    if (this.face) this.face.color.setRGB(1.8 * fl, 1.0 * fl, 0.3 * fl);
    if (this.light) this.light.intensity = 1.6 * fl;
  }
}

/** a little sheet ghost: domed top, flared skirt with a hem that ripples, two eyes; optional sunglasses */
export class Ghost {
  root = new THREE.Group(); body: THREE.Mesh; geo: THREE.LatheGeometry; base: Float32Array; seed: number;
  static mat = new THREE.MeshStandardMaterial({ color: 0xf6f2ea, roughness: 0.9, emissive: 0xc8d8ff, emissiveIntensity: 0.18, side: THREE.DoubleSide });
  constructor(seed = 1, o: { shades?: boolean; lantern?: boolean; scale?: number } = {}) {
    this.seed = seed;
    const prof: THREE.Vector2[] = [];
    for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI / 2; prof.push(new THREE.Vector2(Math.sin(a) * 0.32, 1.2 + Math.cos(a) * 0.32)); }
    for (let i = 1; i <= 10; i++) { const u = i / 10; prof.push(new THREE.Vector2(0.32 + 0.16 * u * u, 1.2 - u * 1.1)); }
    this.geo = new THREE.LatheGeometry(prof, 48); this.base = Float32Array.from(this.geo.attributes.position!.array as Float32Array);
    this.body = mesh(this.geo, Ghost.mat); this.root.add(this.body);
    const eye = new THREE.MeshBasicMaterial({ color: 0x141018 });
    for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), eye); e.scale.set(1, 1.5, 0.4); e.position.set(sx * 0.11, 1.25, 0.3); this.root.add(e); }
    if (o.shades) {
      const black = std(0x0a0a0c, 0.2, { metalness: 0.6 });
      for (const sx of [-1, 1]) { const l = mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.02, 20), black); l.rotation.x = Math.PI / 2; l.position.set(sx * 0.11, 1.26, 0.31); this.root.add(l); }
      const br = mesh(new THREE.BoxGeometry(0.08, 0.015, 0.015), black); br.position.set(0, 1.28, 0.33); this.root.add(br);
    }
    if (o.lantern) {
      const lan = new THREE.Group(); const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.4, 0.5) })); lan.add(glass);
      const cap = mesh(new THREE.ConeGeometry(0.09, 0.07, 12), std(0x2a2420, 0.4, { metalness: 0.6 })); cap.position.y = 0.11; lan.add(cap);
      const pl = new THREE.PointLight(0xffb060, 2.2, 6, 1.4); lan.add(pl); lan.position.set(0.42, 0.75, 0.15); this.root.add(lan);
    }
    this.root.scale.setScalar(o.scale ?? 1);
  }
  /** float, sway, ripple the hem; dance = 0..1 adds hops and spins on the beat */
  update(t: number, beat: number, dance = 0) {
    const s = this.seed, P = Math.pow(1 - (beat - Math.floor(beat)), 3);
    const p = this.geo.attributes.position!, b = this.base;
    for (let i = 0; i < p.count; i++) {
      const y = b[i * 3 + 1]!; if (y > 0.9) continue;
      const x = b[i * 3]!, z = b[i * 3 + 2]!, a = Math.atan2(z, x), k = (0.9 - y) / 0.9;
      const w = 1 + k * (0.08 * Math.sin(a * 7 + t * 5 + s) + 0.12 * dance * P);
      p.setXYZ(i, x * w, y + k * 0.05 * Math.sin(a * 5 - t * 6 + s), z * w);
    }
    p.needsUpdate = true; this.geo.computeVertexNormals();
    this.body.position.y = 0.12 + 0.06 * Math.sin(t * 2.2 + s) + dance * 0.25 * P;
    this.body.rotation.z = 0.06 * Math.sin(t * 1.7 + s) * (1 - dance);
    this.root.children.forEach((c) => { if (c !== this.body) c.position.y = (c.userData.y0 ??= c.position.y) + this.body.position.y - 0.12; });
    // dance: sway side to side on the beat, a quarter turn every bar, little hops (body.position.y above)
    const sw = Math.sin(beat * Math.PI);
    this.body.position.x = dance * 0.16 * sw; this.body.rotation.z += dance * 0.22 * sw;
    this.root.rotation.y = (this.root.userData.ry ?? this.root.rotation.y) + dance * (0.45 * sw + (Math.floor(beat / 4) % 2 ? 0.6 : -0.6) * (s % 2 ? 1 : -1));
  }
}

/** a bonfire: crossed logs, layered additive flames, rising sparks, a flickering light; ignite 0..1 */
export class Bonfire {
  root = new THREE.Group(); flames: THREE.Mesh[] = []; sparks: THREE.InstancedMesh; light: THREE.PointLight;
  constructor() {
    const logM = std(0x3a2618, 0.95);
    for (let i = 0; i < 5; i++) { const l = mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.6, 8), logM); l.rotation.set(Math.PI / 2 - 0.35, (i / 5) * Math.PI * 2, 0); l.position.y = 0.3; this.root.add(l); }
    const stones = std(0x4a4a50, 0.9); for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, st = mesh(new THREE.IcosahedronGeometry(0.18, 0), stones); st.position.set(Math.cos(a) * 0.95, 0.1, Math.sin(a) * 0.95); this.root.add(st); }
    [[0.8, 0.5, 1.0, 0.4], [0.6, 0.38, 1.3, 1.2], [0.42, 0.26, 0.95, 2.4], [0.26, 0.17, 0.75, 3.6]].forEach(([h, r, k, ph], i) => {
      const m = new THREE.Mesh(new THREE.ConeGeometry(r!, h! * 1.6, 16, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(k!, k! * 0.45, 0.08), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      m.position.y = 0.35 + h! * 0.8; m.userData.ph = ph; m.userData.i = i; this.root.add(m); this.flames.push(m);
    });
    this.sparks = new THREE.InstancedMesh(new THREE.SphereGeometry(0.025, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.6, 0.4) }), 120); this.sparks.frustumCulled = false; this.root.add(this.sparks);
    this.light = new THREE.PointLight(0xff8a30, 6, 14, 1.4); this.light.position.y = 1.2; this.root.add(this.light);
  }
  update(t: number, ignite: number) {
    const fl = 0.85 + 0.15 * Math.sin(t * 17) * Math.sin(t * 6.3);
    this.flames.forEach((m) => { const ph = m.userData.ph as number; m.visible = ignite > 0.02; m.scale.set(ignite * (1 + 0.12 * Math.sin(t * 9 + ph)), ignite * (0.85 + 0.3 * Math.abs(Math.sin(t * 7 + ph))), ignite * (1 + 0.12 * Math.cos(t * 8 + ph))); m.rotation.y = t * (1 + (m.userData.i as number) * 0.5); });
    this.light.intensity = 5 * ignite * fl;
    const M = new THREE.Matrix4();
    for (let i = 0; i < 120; i++) { const h = (i * 0.618) % 1, u = (t * (0.5 + h) + h * 7) % 1; M.makeTranslation(Math.sin(i * 3.1 + t) * 0.4 * u, 0.5 + u * 4 * ignite, Math.cos(i * 2.3 + t) * 0.4 * u); M.scale(new THREE.Vector3().setScalar(ignite * (1 - u))); this.sparks.setMatrixAt(i, M); }
    this.sparks.instanceMatrix.needsUpdate = true;
  }
}

export class HalloweenNight {
  scene = new THREE.Scene();
  pumpkins: Pumpkin[] = []; ghosts: Ghost[] = []; fire = new Bonfire(); clockHands: THREE.Group[] = []; clockFlash!: THREE.PointLight; waterFace!: THREE.MeshBasicMaterial;
  static gray = new THREE.MeshStandardMaterial({ color: 0x9a9aa8, roughness: 0.95, transparent: true, opacity: 0.85, side: THREE.DoubleSide, emissive: 0x6a6a88, emissiveIntensity: 0.45 }); leaves!: THREE.InstancedMesh; owlEyes!: THREE.MeshBasicMaterial; steam: THREE.Mesh[] = [];
  moonDir = new THREE.Vector3(0.3, 0.28, -1).normalize();
  private wind = { value: 0 };
  constructor() {
    const s = this.scene, R = mulberry(31);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), V = new THREE.Vector3(), C = new THREE.Color(), E = new THREE.Euler();
    // night sky dome: deep indigo to teal haze at the horizon, stars, the big low harvest moon
    const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `varying vec3 vp; uniform vec3 md; void main(){ float y = vp.y; vec3 hor = vec3(0.28,0.22,0.36), mid = vec3(0.07,0.07,0.2), top = vec3(0.02,0.02,0.08);
        vec3 c = y < 0.15 ? mix(hor, mid, smoothstep(-0.02, 0.15, y)) : mix(mid, top, smoothstep(0.15, 0.7, y));
        float g = max(0.0, dot(normalize(vp), md)); c += vec3(1.0,0.62,0.25) * pow(g, 60.0) * 0.6 + vec3(0.5,0.35,0.3) * pow(g, 6.0) * 0.25; gl_FragColor = vec4(c, 1.0); }`,
      uniforms: { md: { value: this.moonDir } } }));
    s.add(sky);
    const starM = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }), stars = new THREE.InstancedMesh(new THREE.SphereGeometry(0.9, 6, 4), starM, 700);
    for (let i = 0; i < 700; i++) { const a = R() * Math.PI * 2, e = 0.12 + Math.pow(R(), 0.7) * 1.3; V.set(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)).multiplyScalar(850); M.compose(V, Q.identity(), S.setScalar(0.5 + R() * 1.6)); stars.setMatrixAt(i, M); stars.setColorAt(i, C.setRGB(1, 0.95, 0.85).multiplyScalar(0.6 + R() * 1.2)); }
    s.add(stars);
    const moonP = this.moonDir.clone().multiplyScalar(700);
    const moon = new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.6, 0.7), fog: false, map: tex(256, 256, (c) => { c.fillStyle = '#fff'; c.fillRect(0, 0, 256, 256); c.fillStyle = 'rgba(180,140,100,0.35)'; for (const [x, y, r] of [[90, 100, 30], [160, 150, 22], [120, 180, 14], [170, 80, 12]]) { c.beginPath(); c.arc(x!, y!, r!, 0, 7); c.fill(); } }) }));
    moon.position.copy(moonP); moon.lookAt(0, 0, 0); s.add(moon);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(256, 256, (c) => { const g = c.createRadialGradient(128, 128, 20, 128, 128, 128); g.addColorStop(0, 'rgba(255,190,110,0.9)'); g.addColorStop(1, 'rgba(255,150,80,0)'); c.fillStyle = g; c.fillRect(0, 0, 256, 256); }), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
    halo.position.copy(moonP); halo.scale.setScalar(320); s.add(halo);
    s.fog = new THREE.FogExp2(new THREE.Color(0.16, 0.13, 0.24), 0.028);
    // moonlight + cool fill
    const ml = new THREE.DirectionalLight(0xb8c4ff, 1.0); ml.position.copy(this.moonDir).multiplyScalar(60); ml.castShadow = true; ml.shadow.mapSize.set(2048, 2048);
    Object.assign(ml.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 150 }); ml.shadow.bias = -0.0005; ml.shadow.radius = 4; s.add(ml, ml.target);
    s.add(new THREE.HemisphereLight(0x4a5a9a, 0x1a1420, 0.55));
    // ground, path, tall dry grass
    const ground = mesh(new THREE.PlaneGeometry(400, 400), std(0x2a2a1e, 1), false); ground.rotation.x = -Math.PI / 2; s.add(ground);
    const pathPts: number[] = [];
    PATH_PTS.forEach((p, i) => { const q = PATH_PTS[Math.min(PATH_PTS.length - 1, i + 1)]!, d = q.clone().sub(p).normalize(), n = new THREE.Vector3(-d.z, 0, d.x).multiplyScalar(1.1); pathPts.push(p.x + n.x, 0.02, p.z + n.z, p.x - n.x, 0.02, p.z - n.z); });
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pathPts, 3));
    const idx: number[] = []; for (let i = 0; i < PATH_PTS.length - 1; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } pg.setIndex(idx); pg.computeVertexNormals();
    s.add(mesh(pg, std(0x5a4a38, 0.95, { side: THREE.DoubleSide }), false));
    const gm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide });
    gm.onBeforeCompile = (sh) => { sh.uniforms.uWind = this.wind; sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 wp = instanceMatrix * vec4(0.,0.,0.,1.); float w = sin(uWind*1.1 + wp.x*0.2 + wp.z*0.15)*0.7 + sin(uWind*2.7 + wp.x)*0.2; transformed.x += w*position.y*position.y*0.35; transformed.z += w*position.y*position.y*0.15;`); };
    const N = 110000, grass = new THREE.InstancedMesh(bladeGeometry(new THREE.Color(0x2a2418), new THREE.Color(0xffffff)), gm, N); grass.frustumCulled = false; grass.receiveShadow = true;
    const tips = [0xb8a070, 0x9a8a5a, 0x7a7a4a, 0xc8b080].map((c) => new THREE.Color(c)); const hide = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < N; i++) {
      const x = (R() - 0.5) * 50, z = 14 - Math.pow(R(), 0.8) * 60;
      if (pathDist(x, z) < 1.5 || Math.hypot(x - POND.x, z - POND.z) < POND.r + 0.8 || Math.hypot(x - (POND.x - 3), z - (POND.z + 9)) < 5.5 || Math.hypot(x - (POND.x + 5.6), z - (POND.z + 5.5)) < 3.2 || (x > 5 && x < 15 && z > -14 && z < -4)) { grass.setMatrixAt(i, hide); continue; }
      M.compose(V.set(x, 0, z), Q.setFromEuler(E.set((R() - 0.5) * 0.4, R() * 6.28, (R() - 0.5) * 0.4)), S.set(1.4, 0.45 + R() * 0.75, 1.4));
      grass.setMatrixAt(i, M); grass.setColorAt(i, C.copy(tips[i % 4]!).multiplyScalar(0.7 + R() * 0.4));
    }
    s.add(grass);
    // dark oaks and pines along the forest edge
    const bark = std(0x2a201a, 0.95), oakLeaf = [std(0x2a3020, 0.9), std(0x3a3a22, 0.9), std(0x5a3a1a, 0.9)], pineM = std(0x1a2a22, 0.9);
    const oak = (x: number, z: number, k: number) => {
      const g = new THREE.Group(); const tr = mesh(new THREE.CylinderGeometry(0.35, 0.6, 5, 9), bark); tr.position.y = 2.5; tr.rotation.z = (R() - 0.5) * 0.2; g.add(tr);
      for (let i = 0; i < 5; i++) { const a = R() * 6.28, br = mesh(new THREE.CylinderGeometry(0.08, 0.18, 3, 6), bark); br.position.set(Math.cos(a) * 1, 5 + R(), Math.sin(a) * 1); br.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9); g.add(br); }
      for (let i = 0; i < 7; i++) { const b = mesh(new THREE.IcosahedronGeometry(1.4 + R(), 2), oakLeaf[i % 3]!); b.position.set((R() - 0.5) * 4, 5.5 + R() * 2.5, (R() - 0.5) * 4); b.scale.y = 0.7; g.add(b); }
      g.position.set(x, 0, z); g.scale.setScalar(k); s.add(g); return g;
    };
    const pine = (x: number, z: number, k: number) => {
      const g = new THREE.Group(); const tr = mesh(new THREE.CylinderGeometry(0.15, 0.3, 2, 7), bark); tr.position.y = 1; g.add(tr);
      for (let i = 0; i < 5; i++) { const c = mesh(new THREE.ConeGeometry(2.4 - i * 0.4, 2.4, 10), pineM); c.position.y = 2.4 + i * 1.4; g.add(c); }
      g.position.set(x, 0, z); g.scale.setScalar(k); s.add(g); return g;
    };
    oak(-6, -6, 1.1); oak(-9, -16, 1.3); oak(-4, -26, 1.2); oak(10, -24, 1.1);
    for (let i = 0; i < 26; i++) pine(-26 + i * 2.2 + (R() - 0.5), -44 - R() * 8, 1 + R() * 0.6);
    for (let i = 0; i < 10; i++) pine(-22 - R() * 6, -10 - i * 3.5, 1 + R() * 0.5);
    const owlPine = pine(-3.5, -14, 1.2);
    // the owl on a branch of that pine: body, wings, big yellow eyes
    const owl = new THREE.Group(), owlM = std(0x6a5440, 0.9);
    const ob = mesh(new THREE.SphereGeometry(0.28, 16, 12), owlM); ob.scale.set(1, 1.3, 0.9); owl.add(ob);
    const oh = mesh(new THREE.SphereGeometry(0.22, 16, 12), owlM); oh.position.y = 0.38; owl.add(oh);
    for (const sx of [-1, 1]) { const ear = mesh(new THREE.ConeGeometry(0.06, 0.14, 6), owlM); ear.position.set(sx * 0.13, 0.58, 0); owl.add(ear); }
    this.owlEyes = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.8, 0.3) });
    for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), this.owlEyes); e.position.set(sx * 0.09, 0.4, 0.18); owl.add(e); const p = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), new THREE.MeshBasicMaterial({ color: 0 })); p.position.set(sx * 0.09, 0.4, 0.235); owl.add(p); }
    const branch = mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.2, 6), bark); branch.rotation.z = Math.PI / 2; branch.position.set(1, 4.4, 0.6); owlPine.add(branch);
    owl.position.set(1.4, 4.75, 0.6); owl.rotation.y = 0.4; owlPine.add(owl);
    // the cabin: logs, porch, warm windows; a table with two steaming cider mugs, a candle, pumpkins on the steps
    const cabin = new THREE.Group(), log = std(0x5a3a24, 0.9), roofM = std(0x2a2226, 0.8);
    const walls = mesh(new THREE.BoxGeometry(6, 3.2, 5), log); walls.position.y = 1.6; cabin.add(walls);
    const roof = mesh(new THREE.CylinderGeometry(4, 4, 6.6, 3), roofM); roof.rotation.z = Math.PI / 2; roof.rotation.x = -Math.PI / 2; roof.scale.set(1, 1, 0.55); roof.position.y = 4.1; cabin.add(roof);
    for (const x of [-1.6, 1.6]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 0.75, 0.32) })); w.position.set(x, 1.8, 2.51); cabin.add(w); }
    const deck = mesh(new THREE.BoxGeometry(7, 0.25, 2.4), std(0x6a4a30, 0.85)); deck.position.set(0, 0.12, 3.6); cabin.add(deck);
    const wl = new THREE.PointLight(0xffa860, 3, 10, 1.6); wl.position.set(0, 1.8, 3.4); cabin.add(wl);
    const table = mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 24), std(0x7a5232, 0.6)); table.position.set(1.8, 0.95, 3.8); cabin.add(table);
    const tleg = mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.7, 8), std(0x4a3020)); tleg.position.set(1.8, 0.6, 3.8); cabin.add(tleg);
    for (const [dx, dz] of [[-0.18, 0.05], [0.2, -0.08]] as const) {
      const mug = mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.16, 20), std(0xd8c8b0, 0.4)); mug.position.set(1.8 + dx, 1.06, 3.8 + dz); cabin.add(mug);
      const cid = mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.01, 20), std(0x9a4a1a, 0.2)); cid.position.set(1.8 + dx, 1.13, 3.8 + dz); cabin.add(cid);
      const steam = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.5), new THREE.MeshBasicMaterial({ map: tex(64, 256, (c) => { const g = c.createLinearGradient(0, 256, 0, 0); g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(32, 256); c.bezierCurveTo(0, 180, 64, 90, 28, 0); c.lineTo(40, 0); c.bezierCurveTo(70, 90, 10, 180, 40, 256); c.fill(); }), transparent: true, depthWrite: false }));
      steam.position.set(1.8 + dx, 1.4, 3.8 + dz); cabin.add(steam); this.steam.push(steam);
    }
    const candle = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2, 0.8) })); candle.position.set(1.62, 1.12, 3.62); cabin.add(candle);
    const cl = new THREE.PointLight(0xffb070, 1.2, 3, 1.5); cl.position.set(1.62, 1.2, 3.62); cabin.add(cl);
    // an old clock under the porch roof
    const clock = new THREE.Group(); const face = mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.06, 40), std(0xe8dcc0, 0.5)); face.rotation.x = Math.PI / 2; clock.add(face);
    const rim = mesh(new THREE.TorusGeometry(0.47, 0.05, 8, 40), std(0x8a6a3a, 0.4, { metalness: 0.6 })); clock.add(rim);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, tk = mesh(new THREE.BoxGeometry(0.03, 0.08, 0.01), std(0x1a1410)); tk.position.set(Math.sin(a) * 0.38, Math.cos(a) * 0.38, 0.04); tk.rotation.z = -a; clock.add(tk); }
    for (const [len, w] of [[0.22, 0.035], [0.34, 0.022]] as const) { const h = new THREE.Group(); const hm = mesh(new THREE.BoxGeometry(w, len, 0.01), std(0x1a1410)); hm.position.y = len / 2; h.add(hm); h.position.z = 0.05; clock.add(h); this.clockHands.push(h); }
    clock.position.set(0, 2.55, 2.53); cabin.add(clock);
    this.clockFlash = new THREE.PointLight(0xfff0d0, 0, 6, 1.5); this.clockFlash.position.set(0, 2.5, 3); cabin.add(this.clockFlash);
    cabin.position.set(10, 0, -9); cabin.rotation.y = -0.6; s.add(cabin);
    // the pond in the clearing
    const water = mesh(new THREE.CircleGeometry(POND.r, 64), std(0x0a1020, 0.05, { metalness: 0.9 }), false); water.rotation.x = -Math.PI / 2; water.position.set(POND.x, 0.03, POND.z); s.add(water);
    const shore = mesh(new THREE.RingGeometry(POND.r, POND.r + 0.8, 64), std(0x2a2620, 1), false); shore.rotation.x = -Math.PI / 2; shore.position.set(POND.x, 0.025, POND.z); s.add(shore);
    const moonRef = new THREE.Mesh(new THREE.CircleGeometry(1.4, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 0.95, 0.45), transparent: true, opacity: 0.7 })); moonRef.rotation.x = -Math.PI / 2; moonRef.scale.y = 0.4; moonRef.position.set(POND.x - 1.5, 0.04, POND.z + 2); s.add(moonRef);
    // a face under the water (the bridge): two pale eyes and a mouth, only shown when asked
    this.waterFace = new THREE.MeshBasicMaterial({ map: tex(256, 256, (c) => { c.fillStyle = '#000'; c.fillRect(0, 0, 256, 256); const g = c.createRadialGradient(128, 128, 10, 128, 128, 120); g.addColorStop(0, 'rgba(120,255,200,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, 256, 256); c.fillStyle = '#c8fff0'; for (const x of [90, 166]) { c.beginPath(); c.ellipse(x, 110, 16, 24, 0, 0, 7); c.fill(); } c.beginPath(); c.ellipse(128, 180, 26, 12, 0, 0, 7); c.fill(); }), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const wf = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 4.5), this.waterFace); wf.rotation.x = -Math.PI / 2; wf.position.set(POND.x + 0.5, 0.045, POND.z + 1.5); s.add(wf);
    // the bonfire in the dance clearing
    this.fire.root.position.set(POND.x - 3, 0, POND.z + 9); s.add(this.fire.root);
    // jack-o'-lanterns along the path and on the porch steps
    const spots: [number, number, number][] = [[2.8, 4, 0.9], [-1.6, 1, 0.8], [2.6, -4, 0.7], [-2.2, -10, 0.9], [2.1, -16, 0.75], [7.2, -6.2, 0.7], [8.4, -5.6, 0.55], [-0.6, -22, 0.8], [4.5, -31, 0.9]];
    spots.forEach(([x, z, k], i) => { const p = new Pumpkin(k, i < 8, i + 1); p.root.position.set(x, 0.32 * k, z); p.root.rotation.y = (R() - 0.5) * 0.5; s.add(p.root); this.pumpkins.push(p); });
    // falling leaves
    this.leaves = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.12, 0.08), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8 }), 400); this.leaves.frustumCulled = false;
    for (let i = 0; i < 400; i++) this.leaves.setColorAt(i, C.setHex([0xc0601a, 0x8a3a12, 0xd89a30, 0x6a2a10][i % 4]!));
    s.add(this.leaves);
    // the ghosts: the two of "us" (one with a lantern, one in sunglasses) and the phantom crowd for the chorus
    const g1 = new Ghost(1, { lantern: true }), g2 = new Ghost(2, { shades: true, scale: 0.92 });
    this.ghosts.push(g1, g2);
    for (let i = 0; i < 8; i++) this.ghosts.push(new Ghost(3 + i, { shades: i % 3 === 0, scale: 0.8 + R() * 0.3 }));
    this.ghosts.forEach((g) => s.add(g.root));
  }
  /** place the duo / the crowd for a shot */
  layout(mode: 'path' | 'porch' | 'dance' | 'pond' | 'fire' | 'shadows' | 'rise' | 'hold' | 'alone' | 'deck', t: number) {
    const [g1, g2, ...crowd] = this.ghosts as [Ghost, Ghost, ...Ghost[]];
    crowd.forEach((g) => { g.root.visible = mode === 'dance' || mode === 'fire' || mode === 'shadows' || mode === 'rise'; g.body.material = mode === 'shadows' ? HalloweenNight.gray : Ghost.mat; g.root.position.y = 0; });
    g1.root.visible = g2.root.visible = mode !== 'shadows'; g1.root.position.y = g2.root.position.y = 0;
    const F = this.fire.root.position;
    if (mode === 'fire' || mode === 'rise') {
      g1.root.position.set(F.x - 2.2, 0, F.z + 2.6); g2.root.position.set(F.x - 1.2, 0, F.z + 3.1); g1.root.rotation.y = g2.root.rotation.y = Math.PI * 0.8;
      crowd.forEach((g, i) => { const a = (i / crowd.length) * Math.PI * 2 + t * 0.5; g.root.position.set(F.x + Math.cos(a) * 3.2, 0, F.z + Math.sin(a) * 3.2); g.root.rotation.y = -a; });
      if (mode === 'rise') this.ghosts.forEach((g, i) => (g.root.position.y = Math.max(0, t - 0.3 - (i % 5) * 0.15) * (1.4 + (i % 3) * 0.4)));
    }
    if (mode === 'shadows') crowd.forEach((g, i) => { g.root.position.set(-5 - (i % 4) * 1.8 + (i % 2) * 0.6, 0, -7 - Math.floor(i / 4) * 4.5 - (i % 3)); g.root.rotation.y = 0.6 + i; });
    if (mode === 'hold') { g1.root.position.set(1.0, 0, -12); g2.root.position.set(1.62, 0, -12.1); g1.root.rotation.y = g2.root.rotation.y = Math.PI; g1.body.rotation.z = -0.12; g2.body.rotation.z = 0.12; }
    if (mode === 'alone') { const p = PATH.getPointAt(0.45); g1.root.position.set(p.x - 0.3, 0, p.z); g2.root.position.set(p.x + 0.3, 0, p.z); g1.root.rotation.y = g2.root.rotation.y = Math.PI; }
    if (mode === 'deck') { g1.root.position.set(9.0 + Math.min(1, t * 0.25) * 0.8, 0.25, -5.6); g2.root.position.set(8.2, 0.25, -6.3); g1.root.rotation.y = g2.root.rotation.y = 2.5; }
    if (mode === 'path') { const u = 0.2 + Math.min(0.5, t * 0.012), p = PATH.getPointAt(u), q = PATH.getPointAt(Math.min(1, u + 0.01)); g1.root.position.set(p.x - 0.35, 0, p.z); g2.root.position.set(p.x + 0.4, 0, p.z + 0.2); for (const g of [g1, g2]) g.root.rotation.y = Math.atan2(q.x - p.x, q.z - p.z); }
    if (mode === 'porch') { g1.root.position.set(7.6, 0.25, -6.0); g2.root.position.set(10.6, 0.25, -4.6); g1.root.rotation.y = g2.root.rotation.y = -0.6 + Math.PI; }
    if (mode === 'pond') { g1.root.position.set(POND.x + 5, 0, POND.z + 4.5); g2.root.position.set(POND.x + 6.1, 0, POND.z + 4.9); g1.root.rotation.y = g2.root.rotation.y = 0.5; }
    if (mode === 'pond' || mode === 'dance') {
      if (mode === 'dance') { g1.root.position.set(POND.x - 4, 0, POND.z + 6.5); g2.root.position.set(POND.x - 2.8, 0, POND.z + 7); g1.root.rotation.y = g2.root.rotation.y = 0.3; }
      crowd.forEach((g, i) => { const a = (i / crowd.length) * Math.PI * 2 + t * 0.4; g.root.position.set(POND.x + Math.cos(a) * 4.2 - 3, 0, POND.z + 9 + Math.sin(a) * 2.2); g.root.rotation.y = a + Math.PI; });
    }
  }
  ignite = 1; water = 0; clockT = -1;
  update(t: number, beat: number, dance = 0) {
    this.wind.value = t;
    this.fire.update(t, this.ignite);
    this.waterFace.opacity = this.water * (0.6 + 0.4 * Math.sin(t * 2));
    const ct = this.clockT; if (ct >= 0) { this.clockHands[0]!.rotation.z = -Math.min(1, ct / 1.2) * 0.05; this.clockHands[1]!.rotation.z = (1 - Math.min(1, ct / 1.2)) * 0.5; this.clockFlash.intensity = 4 * Math.pow(1 - (beat - Math.floor(beat)), 6); } else { this.clockHands[0]!.rotation.z = -2.6; this.clockHands[1]!.rotation.z = -0.9; this.clockFlash.intensity = 0; }
    this.ghosts.forEach((g) => (g.root.userData.ry = g.root.rotation.y));
    this.pumpkins.forEach((p) => p.update(t));
    this.ghosts.forEach((g, i) => g.update(t, beat, i < 2 ? dance * 0.6 : dance));
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < 400; i++) {
      const h = (i * 0.618) % 1, fall = (t * (0.4 + h * 0.5) + h * 20) % 8;
      V.set(((i * 7.31) % 30) - 15 + Math.sin(t * 0.8 + i) * 1.5 + fall * 0.8, 8 - fall, 6 - ((i * 3.77) % 40));
      Q.setFromEuler(E.set(t * 2 + i, t * 1.3 + i * 2, t + i)); M.compose(V, Q, S); this.leaves.setMatrixAt(i, M);
    }
    this.leaves.instanceMatrix.needsUpdate = true;
    this.owlEyes.color.setRGB(2.4, 1.8, 0.3).multiplyScalar(Math.sin(t * 0.9) > 0.97 ? 0.1 : 1); // a blink now and then
    this.steam.forEach((m, i) => { m.position.y = 1.4 + 0.05 * Math.sin(t * 1.5 + i); m.rotation.y = Math.sin(t * 0.7 + i) * 0.5; (m.material as THREE.MeshBasicMaterial).opacity = 0.6 + 0.3 * Math.sin(t * 2 + i); });
  }
}
