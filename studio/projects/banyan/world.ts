// "The Banyan Weeps Blood" — Vietnamese folk horror: the old village banyan (fused trunks, buttress roots, a curtain
// of hanging aerial roots), a little shrine with incense, red paper lanterns, will-o'-wisps (ma trơi), a muddy river
// with a sampan, the village gate and bamboo, thick mist, and the ghost in a white áo dài with hair over her face.
// Story knobs (all 0..1, set per shot): wake (eyes in the hollow), bleed (blood tears), blight (leaves turn black),
// ash (embers rising), bloodMoon, reach (the roots / the ghost reach out).
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { bladeGeometry, mulberry } from '../chanbo-lookdev/field';

const std = (color: number, rough = 0.8, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, ...o });
const mesh = (g: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], cast = true) => { const me = new THREE.Mesh(g, m); me.castShadow = cast; me.receiveShadow = true; return me; };
const tex = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d')!); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; };
const put = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number, parent?: THREE.Object3D) => { o.position.set(x, y, z); parent?.add(o); return o; };
const glowTex = (rgb: string) => tex(128, 128, (c) => { const g = c.createRadialGradient(64, 64, 2, 64, 64, 64); g.addColorStop(0, `rgba(${rgb},1)`); g.addColorStop(0.25, `rgba(${rgb},0.5)`); g.addColorStop(1, `rgba(${rgb},0)`); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });

export const TREE = { x: 0, z: 0 };
export const RIVER_X = 13;
export const GATE = { x: -5, z: 16 };
export const SHRINE = { x: 1.6, z: 3.4 };

/** the ghost: the VRoid "Sendagaya Shino" sample (long straight hair, rigged) restyled — black hair, pale skin, a white
 * áo dài (her clothes turned to white silk, plus two long flowing panels and wide trousers), glowing red irises.
 * Posed as a pure function of time: arms hang or reach out, the head tilts, every hair joint drifts as if underwater. */
export class AoDaiGhost {
  root = new THREE.Group(); ready: Promise<void>;
  private bones: Record<string, THREE.Object3D> = {}; private hair: { b: THREE.Object3D; q0: THREE.Quaternion; d: number; ph: number }[] = [];
  private panels: { g: THREE.PlaneGeometry; base: Float32Array }[] = []; private body = new THREE.Group(); private len = 1;
  static silk = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.7, emissive: 0xa8c8e0, emissiveIntensity: 0.35, side: THREE.DoubleSide });
  constructor() {
    this.root.add(this.body);
    const pl = new THREE.PointLight(0x9ad8ff, 1.6, 3, 1.5); pl.position.set(0, 0.75, 0.55); // cold light from below this.root.add(pl);
    this.ready = new GLTFLoader().loadAsync('/models/vroid/shino.glb').then((g) => this.setup(g.scene));
  }
  private setup(m: THREE.Group) {
    m.rotation.y = Math.PI; this.body.add(m); // VRM 0.x faces -z
    m.traverse((o) => {
      this.bones[o.name] = o;
      const me = o as THREE.Mesh; if (!me.isMesh) return;
      me.castShadow = true; me.frustumCulled = false;
      // VRM materials load as unlit MToon fallbacks: rebuild them as lit standard materials
      const mats = (Array.isArray(me.material) ? me.material : [me.material]).map((o) => { const b = o as THREE.MeshBasicMaterial; const mt = new THREE.MeshStandardMaterial({ map: b.map, color: b.color, transparent: b.transparent, alphaTest: b.alphaTest, side: b.side, depthWrite: b.depthWrite, roughness: 0.75 }); mt.name = b.name; return mt; });
      me.material = mats.map((mt) => {
        const n = mt.name;
        if (/HAIR/.test(n)) { mt.color.setRGB(0.05, 0.05, 0.06); mt.roughness = 0.45; }
        else if (/SKIN/.test(n)) { mt.color.setRGB(0.8, 0.85, 0.92); mt.emissive.setRGB(0.08, 0.1, 0.14); }
        else if (/Bottoms/.test(n)) mt.visible = false; // the short skirt goes; panels + trousers make the áo dài
        else if (/CLOTH/.test(n)) return AoDaiGhost.silk;
        else if (/EyeIris/.test(n)) { mt.color.setRGB(0.1, 0, 0); mt.emissive.setRGB(2.2, 0.15, 0.08); mt.emissiveMap = mt.map; }
        else if (/EyeHighlight/.test(n)) mt.visible = false;
        return mt;
      }) as any;
      if (!Array.isArray(me.material) || me.material.length === 1) me.material = (me.material as THREE.Material[])[0] ?? me.material;
    });
    const hairRoots = Object.values(this.bones).filter((b) => b.name.startsWith('HairJoint') && !b.parent?.name.startsWith('HairJoint'));
    const walk = (b: THREE.Object3D, d: number, ph: number) => { this.hair.push({ b, q0: b.quaternion.clone(), d, ph }); b.children.forEach((c) => c.name.startsWith('HairJoint') && walk(c, d + 1, ph)); };
    hairRoots.forEach((b, i) => walk(b, 0, i * 0.7));
    m.updateMatrixWorld(true);
    const hipY = this.bones.J_Bip_C_Hips!.getWorldPosition(new THREE.Vector3()).y; this.len = hipY + 0.05;
    const trousers = mesh(new THREE.CylinderGeometry(0.12, 0.22, hipY, 20, 1, true), AoDaiGhost.silk); trousers.position.y = hipY / 2; this.body.add(trousers);
    for (const sz of [1, -1]) {
      const g = new THREE.PlaneGeometry(0.27, this.len, 4, 16); g.translate(0, -this.len / 2, 0); const p = mesh(g, AoDaiGhost.silk, false);
      p.position.set(0, hipY + 0.06, sz * 0.095); if (sz < 0) p.rotation.y = Math.PI; this.body.add(p);
      this.panels.push({ g, base: Float32Array.from(g.attributes.position!.array as Float32Array) });
    }
  }
  /** float and drift; reach 0..1 lifts both arms toward the camera */
  update(t: number, reach = 0) {
    this.body.position.y = 0.06 + 0.07 * Math.sin(t * 1.3);
    const B = this.bones; if (!B.J_Bip_C_Head) return;
    const E = new THREE.Euler(), qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
    // reach: only her left hand rises, slowly — forward and down, elbow soft, wrist limp, fingers curling; the right hangs
    for (const [k, sx] of [['L', 1], ['R', -1]] as const) {
      const r = k === 'L' ? reach : reach * 0.12;
      qa.setFromEuler(E.set(0, 0, sx * 1.25)); qb.setFromEuler(E.set(0, -sx * 1.05, sx * 0.7));
      B[`J_Bip_${k}_UpperArm`]!.quaternion.copy(qa).slerp(qb, r);
      B[`J_Bip_${k}_LowerArm`]!.rotation.set(0, -sx * (0.15 + 0.25 * r + 0.04 * Math.sin(t * 1.1 + sx)), 0);
      B[`J_Bip_${k}_Hand`]!.rotation.set(0, -sx * 0.1 * r, sx * (0.2 + 0.35 * r));
      for (const f of ['Index', 'Middle', 'Ring', 'Little']) for (let j = 1; j <= 3; j++) B[`J_Bip_${k}_${f}${j}`]!.rotation.set(0, 0, sx * (0.12 + 0.28 * r + 0.06 * Math.sin(t * 0.8 + j + f.length)));
    }
    B.J_Bip_C_Head!.rotation.set(-0.3 - 0.08 * reach, 0.1 * Math.sin(t * 0.37) + 0.12 * reach, 0.22 + 0.08 * reach + 0.05 * Math.sin(t * 0.5));
    B.J_Bip_C_Spine!.rotation.set(0.05 * Math.sin(t * 0.9) - 0.1 * reach, 0.08 * reach, 0.03 * Math.sin(t * 0.7));
    for (const h of this.hair) { qa.setFromEuler(E.set(0.07 * Math.sin(t * 0.9 + h.ph + h.d * 0.5), 0, 0.06 * Math.sin(t * 0.7 + h.ph * 1.3 + h.d * 0.4))); h.b.quaternion.copy(h.q0).multiply(qa); }
    for (const p of this.panels) {
      const a = p.g.attributes.position!, b = p.base;
      for (let i = 0; i < a.count; i++) { const y = b[i * 3 + 1]!, k = -y / this.len; a.setZ(i, b[i * 3 + 2]! - k * k * (0.22 + 0.1 * Math.sin(t * 2.2 + y * 4))); a.setX(i, b[i * 3]! + k * 0.05 * Math.sin(t * 1.7 + y * 3)); }
      a.needsUpdate = true; p.g.computeVertexNormals();
    }
  }
}

export class BanyanNight {
  scene = new THREE.Scene(); ghost = new AoDaiGhost(); moonReady!: Promise<void>;
  wake = 0; bleed = 0; blight = 0; ash = 0; bloodMoon = 0; reach = 0;
  private sky: THREE.ShaderMaterial; private moonMat: THREE.MeshBasicMaterial; private fog: THREE.FogExp2;
  private leafMats: THREE.MeshStandardMaterial[] = []; private leafCols: THREE.Color[] = []; private roots: { m: THREE.InstancedMesh; base: { p: THREE.Vector3; len: number; ph: number }[] };
  private eyes: THREE.MeshBasicMaterial; private hollowGlow: THREE.MeshBasicMaterial; private hollowL: THREE.PointLight; private tears: THREE.Mesh[] = [];
  private lanterns: { g: THREE.Group; ph: number }[] = []; private wisps: THREE.InstancedMesh; private halos: THREE.Sprite[] = []; private embers: THREE.InstancedMesh; private falling: THREE.InstancedMesh; private smoke: THREE.Mesh[] = []; private mist: THREE.Sprite[] = [];
  private moonL: THREE.DirectionalLight; private moonHalo!: THREE.Sprite; private shafts: THREE.Mesh[] = [];
  private mats: Record<'ground' | 'bark' | 'plaster' | 'tile' | 'stone', THREE.MeshStandardMaterial> = {} as any;
  constructor() {
    const s = this.scene, R = mulberry(108);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), V = new THREE.Vector3(), C = new THREE.Color(), E = new THREE.Euler();
    // sky + cold moon (turns red with bloodMoon)
    const moonDir = new THREE.Vector3(-0.3, 0.6, -1).normalize();
    this.sky = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { md: { value: moonDir }, red: { value: 0 } },
      vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `varying vec3 vp; uniform vec3 md; uniform float red; void main(){ float y = vp.y;
        vec3 hor = mix(vec3(0.12,0.17,0.18), vec3(0.28,0.06,0.06), red), mid = mix(vec3(0.04,0.06,0.09), vec3(0.12,0.02,0.03), red), top = vec3(0.01,0.012,0.025);
        vec3 c = y < 0.12 ? mix(hor, mid, smoothstep(-0.02, 0.12, y)) : mix(mid, top, smoothstep(0.12, 0.7, y));
        float g = max(0.0, dot(vp, md)); c += mix(vec3(0.55,0.7,0.8), vec3(0.9,0.15,0.08), red) * (pow(g, 400.0) * 0.25 + pow(g, 12.0) * 0.07); gl_FragColor = vec4(c, 1.0); }` });
    s.add(new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), this.sky));
    const stars = new THREE.InstancedMesh(new THREE.SphereGeometry(0.9, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }), 500);
    for (let i = 0; i < 500; i++) { const a = R() * Math.PI * 2, e = 0.2 + Math.pow(R(), 0.7) * 1.2; V.set(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)).multiplyScalar(850); M.compose(V, Q.identity(), S.setScalar(0.4 + R() * 1.2)); stars.setMatrixAt(i, M); stars.setColorAt(i, C.setRGB(0.8, 0.9, 1).multiplyScalar(0.4 + R())); }
    s.add(stars);
    // the moon: NASA LRO colour map (public domain) on a sphere, near side towards the village; kept below the bloom threshold so its maria stay crisp
    this.moonMat = new THREE.MeshBasicMaterial({ fog: false });
    this.moonReady = new THREE.TextureLoader().loadAsync('/tex/moon_lroc_color_1k.jpg').then((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; this.moonMat.map = t; this.moonMat.needsUpdate = true; });
    const moon = new THREE.Mesh(new THREE.SphereGeometry(40, 64, 32), this.moonMat); moon.position.copy(moonDir).multiplyScalar(700); moon.lookAt(0, 0, 0); moon.rotateY(-Math.PI / 2); s.add(moon);
    this.moonHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('170,200,230'), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, opacity: 0.12 }));
    this.moonHalo.position.copy(moon.position); this.moonHalo.scale.setScalar(200); s.add(this.moonHalo);
    // shafts of moonlight slanting down through gaps in the canopy (additive cones aligned with the light)
    const shaftTex = tex(64, 256, (c) => { const g = c.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.6, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 256); });
    const up = new THREE.Vector3(0, 1, 0), qs = new THREE.Quaternion().setFromUnitVectors(up, moonDir);
    [[-3.5, 3], [2.5, 4.5], [-1, 6.5], [5, 1], [-6, -1], [1.5, -3], [-4.5, 7.5]].forEach(([x, z], i) => {
      const m = new THREE.MeshBasicMaterial({ map: shaftTex, color: new THREE.Color(0.55, 0.7, 0.85), transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
      const L = 16, sh = new THREE.Mesh(new THREE.CylinderGeometry(0.5 + (i % 3) * 0.3, 1.0 + (i % 2) * 0.6, L, 16, 1, true), m);
      sh.quaternion.copy(qs); sh.position.set(x!, 0, z!).addScaledVector(moonDir, L / 2); s.add(sh); this.shafts.push(sh);
    });
    this.fog = new THREE.FogExp2(new THREE.Color(0.07, 0.1, 0.11), 0.022); s.fog = this.fog;
    this.moonL = new THREE.DirectionalLight(0x9ab8d8, 2.0); this.moonL.position.copy(moonDir).multiplyScalar(60); this.moonL.castShadow = true; this.moonL.shadow.mapSize.set(2048, 2048);
    Object.assign(this.moonL.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, near: 1, far: 150 }); this.moonL.shadow.bias = -0.0005; this.moonL.shadow.radius = 4; s.add(this.moonL, this.moonL.target);
    s.add(new THREE.HemisphereLight(0x5a7890, 0x1e1612, 1.1));
    // a soft cool spill on the trunk and the shrine from the front, so the bark reads
    const spill = new THREE.SpotLight(0x8ab0d0, 40, 30, 0.55, 0.8, 1.2); spill.position.set(4, 8, 13); spill.target.position.set(0, 2.5, 1); s.add(spill, spill.target);
    // wet earth, a dirt path from the gate to the tree, sparse grass
    const earth = tex(1024, 1024, (c) => { c.fillStyle = '#1e1c16'; c.fillRect(0, 0, 1024, 1024); const r = mulberry(4); for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(${[48, 30, 40][i % 3]},${[44, 34, 30][i % 3]},${[30, 26, 22][i % 3]},${0.3 + r() * 0.3})`; c.beginPath(); c.arc(r() * 1024, r() * 1024, 3 + r() * 26, 0, 7); c.fill(); } });
    earth.wrapS = earth.wrapT = THREE.RepeatWrapping; earth.repeat.set(30, 30);
    const ground = mesh(new THREE.PlaneGeometry(400, 400), this.mats.ground = std(0xffffff, 0.85, { map: earth }), false); ground.rotation.x = -Math.PI / 2; s.add(ground);
    const path = new THREE.CatmullRomCurve3([[GATE.x, GATE.z + 6], [GATE.x, GATE.z], [-2.5, 9], [0.6, 4.5]].map(([x, z]) => new THREE.Vector3(x, 0.015, z)));
    const pp = path.getSpacedPoints(80), pos: number[] = [], idx: number[] = [];
    pp.forEach((p, i) => { const q = pp[Math.min(pp.length - 1, i + 1)]!, d = q.clone().sub(p).normalize(), n = new THREE.Vector3(-d.z, 0, d.x).multiplyScalar(0.9); pos.push(p.x + n.x, 0.015, p.z + n.z, p.x - n.x, 0.015, p.z - n.z); if (i < pp.length - 1) idx.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3); });
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); pg.setIndex(idx); pg.computeVertexNormals(); s.add(mesh(pg, std(0x4a3a2a, 0.9, { side: THREE.DoubleSide }), false));
    const gm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide });
    const N = 26000, grass = new THREE.InstancedMesh(bladeGeometry(new THREE.Color(0x141a12), new THREE.Color(0xffffff)), gm, N); grass.frustumCulled = false; grass.receiveShadow = true;
    const hide = new THREE.Matrix4().makeScale(0, 0, 0), tips = [0x4a5a3a, 0x3a4a30, 0x5a5a3a].map((c) => new THREE.Color(c));
    for (let i = 0; i < N; i++) { const x = (R() - 0.5) * 40, z = 22 - R() * 40; if (Math.hypot(x, z) < 5 || x > RIVER_X - 2.5) { grass.setMatrixAt(i, hide); continue; } M.compose(V.set(x, 0, z), Q.setFromEuler(E.set((R() - 0.5) * 0.4, R() * 6.28, (R() - 0.5) * 0.4)), S.set(1.2, 0.25 + R() * 0.5, 1.2)); grass.setMatrixAt(i, M); grass.setColorAt(i, C.copy(tips[i % 3]!).multiplyScalar(0.6 + R() * 0.4)); }
    s.add(grass);
    // the banyan: fused trunks, buttress roots, big limbs, a wide dark canopy, curtains of aerial roots
    const bark = std(0x3a3028, 0.95, { map: tex(256, 256, (c) => { c.fillStyle = '#8a7a6a'; c.fillRect(0, 0, 256, 256); const r = mulberry(12); for (let i = 0; i < 160; i++) { c.strokeStyle = `rgba(30,24,20,${0.3 + r() * 0.4})`; c.lineWidth = 1 + r() * 4; c.beginPath(); const x = r() * 256; c.moveTo(x, 0); c.bezierCurveTo(x + (r() - 0.5) * 40, 80, x + (r() - 0.5) * 40, 170, x + (r() - 0.5) * 30, 256); c.stroke(); } }) });
    this.mats.bark = bark;
    const tree = new THREE.Group(); tree.position.set(TREE.x, 0, TREE.z); s.add(tree);
    for (let i = 0; i < 11; i++) { const a = (i / 11) * Math.PI * 2 + R() * 0.3, r = 0.7 + R() * 0.5, h = 6.5 + R() * 1.5; const tr = mesh(new THREE.CylinderGeometry(0.35 + R() * 0.2, 0.6 + R() * 0.3, h, 10), bark); tr.position.set(Math.cos(a) * r * 0.8, h / 2, Math.sin(a) * r * 0.8); tr.rotation.set(Math.sin(a) * 0.08, R(), -Math.cos(a) * 0.08); tree.add(tr); }
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + R() * 0.2, L = 2.5 + R() * 2; const g = new THREE.CylinderGeometry(0.06, 0.45, L, 8); g.translate(0, L / 2, 0); g.rotateZ(-(Math.PI / 2 + 0.14)); const br = mesh(g, bark); br.position.set(Math.cos(a) * 0.9, 0.6, Math.sin(a) * 0.9); br.rotation.y = -a; tree.add(br); } // buttress roots sloping into the ground
    const limbs: THREE.Vector3[] = [];
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + R() * 0.4, L = 6 + R() * 3; const g = new THREE.CylinderGeometry(0.14, 0.42, L, 8); g.translate(0, L / 2, 0); const lb = mesh(g, bark); lb.position.set(Math.cos(a) * 0.6, 5.5 + R() * 1.5, Math.sin(a) * 0.6); lb.rotation.order = 'YXZ'; lb.rotation.set(0, -a + Math.PI / 2, 0); lb.rotateX(Math.PI / 2 - 0.45 - R() * 0.2); tree.add(lb); lb.updateMatrix(); limbs.push(new THREE.Vector3(0, L, 0).applyMatrix4(lb.matrix)); }
    const leafTex = tex(256, 256, (c) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, 256, 256); const r = mulberry(3); for (let i = 0; i < 500; i++) { c.fillStyle = `rgba(0,0,0,${0.1 + r() * 0.3})`; c.beginPath(); c.ellipse(r() * 256, r() * 256, 4 + r() * 8, 2 + r() * 4, r() * 3, 0, 7); c.fill(); } });
    for (const col of [0x1a2a1c, 0x223222, 0x2a3424]) { const m = std(col, 0.9, { map: leafTex }); this.leafMats.push(m); this.leafCols.push(new THREE.Color(col)); }
    for (let i = 0; i < 46; i++) { const a = R() * Math.PI * 2, r = 1.5 + Math.sqrt(R()) * 8.5; const b = mesh(new THREE.IcosahedronGeometry(1.8 + R() * 1.8, 2), this.leafMats[i % 3]!); b.position.set(Math.cos(a) * r, 8.5 + R() * 3 - r * 0.15, Math.sin(a) * r); b.scale.set(1, 0.45 + R() * 0.2, 1); tree.add(b); }
    const rootData: { p: THREE.Vector3; len: number; ph: number }[] = [];
    for (let i = 0; i < 900 && rootData.length < 260; i++) { const a = R() * Math.PI * 2, r = 3 + Math.sqrt(R()) * 6.5, top = 7.6 - r * 0.12 + R() * 0.6, reachGround = R() < 0.08; if (Math.sin(a) * r > 1 && Math.abs(Math.cos(a) * r) < 6) continue; rootData.push({ p: new THREE.Vector3(Math.cos(a) * r, top, Math.sin(a) * r), len: reachGround ? top : 1.2 + R() * 2.8, ph: R() * 6.28 }); }
    const rootGeo = new THREE.CylinderGeometry(0.006, 0.016, 1, 5); rootGeo.translate(0, -0.5, 0);
    this.roots = { m: new THREE.InstancedMesh(rootGeo, std(0x4a3c30, 0.95), rootData.length), base: rootData }; this.roots.m.frustumCulled = false; this.roots.m.castShadow = true; tree.add(this.roots.m);
    for (const d of rootData.filter((d) => d.len === d.p.y)) { const pr = mesh(new THREE.CylinderGeometry(0.05, 0.09, d.len, 6), bark); pr.position.set(d.p.x, d.len / 2, d.p.z); tree.add(pr); }
    const front = mesh(new THREE.CylinderGeometry(0.62, 0.8, 6.5, 14), bark); front.position.set(0.2, 3.25, 1.2); tree.add(front);
    // the hollow: a dark mouth in the trunk, a red glow inside, two eyes when the spirit wakes
    const hollow = mesh(new THREE.CircleGeometry(0.55, 24), new THREE.MeshBasicMaterial({ color: 0x020101 }), false); hollow.scale.set(0.55, 1.0, 1); hollow.position.set(0.2, 1.6, 1.98); tree.add(hollow);
    this.hollowGlow = new THREE.MeshBasicMaterial({ map: glowTex('255,40,20'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(0, 0, 0) });
    const hg = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.0), this.hollowGlow); hg.position.set(0.2, 1.6, 1.99); tree.add(hg);
    this.eyes = new THREE.MeshBasicMaterial({ color: new THREE.Color(0, 0, 0) });
    for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), this.eyes); e.scale.set(0.6, 0.3, 0.3); e.position.set(0.2 + sx * 0.07, 1.78, 2.0); tree.add(e); }
    this.hollowL = new THREE.PointLight(0xff2a10, 0, 6, 1.5); this.hollowL.position.set(0.2, 1.6, 2.6); tree.add(this.hollowL);
    // blood tears running down the trunk under the hollow and from knots higher up
    const tearTex = tex(32, 256, (c) => { const g = c.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, 'rgba(255,255,255,0.0)'); g.addColorStop(0.1, 'rgba(255,255,255,1)'); g.addColorStop(0.92, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(12, 0); c.lineTo(20, 0); c.lineTo(22, 236); c.arc(16, 240, 8, 0, Math.PI); c.lineTo(10, 236); c.fill(); });
    const tearM = new THREE.MeshStandardMaterial({ map: tearTex, transparent: true, color: 0x5a0000, roughness: 0.15, metalness: 0.3, emissive: 0x6a0000, emissiveIntensity: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    [[0.1, 1.15, 1.2], [0.32, 1.12, 1.0], [-0.25, 3.0, 1.6], [0.6, 3.5, 1.4], [0.0, 2.4, 1.1], [0.72, 2.2, 1.3]].forEach(([dx, y, L]) => { const r = 0.71 + (3.25 - y!) / 6.5 * 0.18 + 0.02, ang = Math.asin(Math.max(-0.95, Math.min(0.95, dx! / r))); const g = new THREE.PlaneGeometry(0.05, L!); g.translate(0, -L! / 2, 0); const m = new THREE.Mesh(g, tearM); m.position.set(0.2 + Math.sin(ang) * r, y!, 1.2 + Math.cos(ang) * r); m.rotation.y = ang; m.userData.L = L; tree.add(m); this.tears.push(m); });
    // the shrine (miếu) at the foot of the tree: plinth, altar, tiled roof with upturned corners, incense and smoke
    const shrine = new THREE.Group(), plaster = std(0xa89a80, 0.9), tile = std(0x5a2a1a, 0.7); Object.assign(this.mats, { plaster, tile });
    put(mesh(new THREE.BoxGeometry(1.0, 0.5, 0.8), plaster), 0, 0.25, 0, shrine); put(mesh(new THREE.BoxGeometry(0.8, 0.6, 0.6), plaster), 0, 0.8, -0.05, shrine);
    const niche = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.6, 0.2) })); put(niche, 0, 0.82, 0.255, shrine);
    const roof = mesh(new THREE.ConeGeometry(0.75, 0.38, 4), tile); roof.rotation.y = Math.PI / 4; roof.scale.set(1.25, 1, 1); put(roof, 0, 1.28, -0.05, shrine);
    for (const [x, z] of [[-0.62, 0.38], [0.62, 0.38], [-0.62, -0.48], [0.62, -0.48]] as const) { const tip = mesh(new THREE.ConeGeometry(0.05, 0.2, 6), tile); tip.rotation.z = -Math.sign(x) * 0.9; put(tip, x, 1.15, z, shrine); }
    const bowl = mesh(new THREE.CylinderGeometry(0.1, 0.07, 0.1, 16), std(0x8a6a3a, 0.4, { metalness: 0.6 })); put(bowl, 0, 0.55, 0.3, shrine);
    const tipM = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.8, 0.2) });
    for (let i = 0; i < 5; i++) { const st = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.3, 4), std(0xb03020)); const x = (i - 2) * 0.025; st.rotation.z = (i - 2) * 0.08; put(st, x, 0.72, 0.3, shrine); put(new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 4), tipM), x - (i - 2) * 0.012, 0.87, 0.3, shrine); }
    const smokeTex = tex(64, 256, (c) => { const g = c.createLinearGradient(0, 256, 0, 0); g.addColorStop(0, 'rgba(220,220,230,0.5)'); g.addColorStop(1, 'rgba(220,220,230,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(30, 256); c.bezierCurveTo(0, 170, 64, 90, 26, 0); c.lineTo(38, 0); c.bezierCurveTo(70, 90, 10, 170, 36, 256); c.fill(); });
    for (let i = 0; i < 3; i++) { const sm = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.9), new THREE.MeshBasicMaterial({ map: smokeTex, transparent: true, depthWrite: false })); put(sm, (i - 1) * 0.05, 1.3, 0.3, shrine); this.smoke.push(sm); }
    const sl = new THREE.PointLight(0xff9040, 1.5, 4, 1.6); put(sl, 0, 0.9, 0.6, shrine);
    shrine.position.set(SHRINE.x, 0, SHRINE.z); shrine.rotation.y = -0.25; s.add(shrine);
    // red paper lanterns hanging from the limbs
    const paper = new THREE.MeshStandardMaterial({ color: 0xc81e14, emissive: 0xff3a10, emissiveIntensity: 1.6, roughness: 0.8 }), capM = std(0x2a1a10, 0.6);
    limbs.slice(0, 7).forEach((p, i) => {
      const g = new THREE.Group(); const body = mesh(new THREE.SphereGeometry(0.22, 16, 12), paper, false); body.scale.y = 1.25; g.add(body);
      for (const y of [0.27, -0.27]) put(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 12), capM), 0, y, 0, g);
      const tass = mesh(new THREE.CylinderGeometry(0.015, 0.03, 0.25, 6), std(0xd8a030)); put(tass, 0, -0.42, 0, g);
      const cord = mesh(new THREE.CylinderGeometry(0.006, 0.006, 1.6, 4), capM); put(cord, 0, 1.08, 0, g);
      if (i % 2 === 0) put(new THREE.PointLight(0xff4020, 2.2, 7, 1.6), 0, 0, 0.3, g);
      const q = p.clone().multiplyScalar(0.82); g.position.set(q.x, q.y - 1.9, q.z); tree.add(g); this.lanterns.push({ g, ph: i * 1.7 });
    });
    // the muddy river with a moored sampan
    const water = mesh(new THREE.PlaneGeometry(14, 80), std(0x0c1210, 0.08, { metalness: 0.9 }), false); water.rotation.x = -Math.PI / 2; water.position.set(RIVER_X + 6, 0.02, 0); s.add(water);
    const bank = mesh(new THREE.PlaneGeometry(2.5, 80), std(0x2a2218, 1), false); bank.rotation.x = -Math.PI / 2; bank.position.set(RIVER_X - 0.6, 0.018, 0); s.add(bank);
    const boat = new THREE.Group(), hullM = std(0x3a2a1c, 0.8);
    put(mesh(new THREE.BoxGeometry(1.0, 0.36, 3.4), hullM), 0, 0.1, 0, boat); // hull with pointed, raised ends
    for (const z of [1, -1]) { const tip = mesh(new THREE.ConeGeometry(0.5, 1.0, 4), hullM); tip.rotation.set(z * Math.PI / 2 - z * 0.25, Math.PI / 4, 0); tip.scale.set(1, 1, 0.5); put(tip, 0, 0.18, z * 2.1, boat); }
    put(mesh(new THREE.BoxGeometry(0.9, 0.04, 3.3), std(0x5a4430, 0.9)), 0, 0.29, 0, boat);
    const mui = mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.6, 16, 1, true, -Math.PI / 2, Math.PI), std(0x6a5a3a, 0.9, { side: THREE.DoubleSide })); mui.rotation.x = Math.PI / 2; put(mui, 0, 0.1, -0.2, boat);
    const bl = new THREE.Group(); put(mesh(new THREE.SphereGeometry(0.13, 12, 10), paper, false), 0, 0, 0, bl); bl.children[0]!.scale.y = 1.25; put(new THREE.PointLight(0xff5020, 2.0, 6, 1.6), 0, 0, 0.2, bl); put(bl, 0, 0.75, 1.7, boat);
    put(mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.9, 4), capM), 0, 0.4, 1.7, boat);
    boat.position.set(RIVER_X + 1.8, 0.05, 3.5); boat.rotation.y = 0.2; s.add(boat); boat.userData.boat = true;
    // bamboo groves and the village gate (cổng làng)
    const bambooM = std(0x3a4a2a, 0.7), bLeaf = std(0x1e2a18, 0.9);
    const grove = (x: number, z: number, n: number) => { for (let i = 0; i < n; i++) { const h = 7 + R() * 4, cx = x + (R() - 0.5) * 2.5, cz = z + (R() - 0.5) * 2.5; const st = mesh(new THREE.CylinderGeometry(0.05, 0.07, h, 6), bambooM); st.position.set(cx, h / 2, cz); st.rotation.set((R() - 0.5) * 0.2, 0, (R() - 0.5) * 0.25); s.add(st); const lf = mesh(new THREE.IcosahedronGeometry(0.9 + R() * 0.6, 1), bLeaf); lf.position.set(cx + st.rotation.z * -h * 0.5, h, cz + st.rotation.x * h * 0.5); lf.scale.y = 1.6; s.add(lf); } };
    grove(-11, 4, 16); grove(-9, -6, 14); grove(-14, 13, 14); grove(4, -12, 12); grove(-2, 24, 10); grove(8, 20, 10);
    const gate = new THREE.Group(), stone = std(0x7a7466, 0.95); this.mats.stone = stone;
    for (const x of [-1.5, 1.5]) { put(mesh(new THREE.BoxGeometry(0.6, 3.6, 0.6), stone), x, 1.8, 0, gate); put(mesh(new THREE.BoxGeometry(0.8, 0.25, 0.8), stone), x, 3.7, 0, gate); }
    put(mesh(new THREE.BoxGeometry(3.6, 0.5, 0.5), stone), 0, 3.3, 0, gate);
    const groof = mesh(new THREE.CylinderGeometry(0.01, 1.0, 0.7, 4, 1), tile); groof.rotation.y = Math.PI / 4; groof.scale.set(2.8, 1, 0.9); put(groof, 0, 3.95, 0, gate);
    for (const x of [-2.3, 2.3]) { const tip = mesh(new THREE.ConeGeometry(0.08, 0.4, 6), tile); tip.rotation.z = -Math.sign(x) * 1.0; put(tip, x, 3.8, 0, gate); }
    const sign = tex(512, 128, (c) => { c.fillStyle = '#3a2a1a'; c.fillRect(0, 0, 512, 128); c.fillStyle = '#d8b060'; c.textAlign = 'center'; c.font = 'bold 64px Georgia'; c.fillText('CỔNG LÀNG', 256, 88); });
    put(new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.45), new THREE.MeshStandardMaterial({ map: sign, roughness: 0.8 })), 0, 3.3, 0.26, gate);
    gate.position.set(GATE.x, 0, GATE.z); gate.rotation.y = 0.1; s.add(gate);
    // distant thatched houses with dim windows
    const thatch = std(0x4a3e2a, 1), wall = std(0x6a5a46, 1);
    for (const [x, z, r] of [[-16, -14, 0.4], [-19, 6, -0.3], [9, -18, 0.2], [-8, -20, 0.1]] as const) { const h = new THREE.Group(); put(mesh(new THREE.BoxGeometry(4, 2, 3), wall), 0, 1, 0, h); const rf = mesh(new THREE.ConeGeometry(3.2, 2.2, 4), thatch); rf.rotation.y = Math.PI / 4; rf.scale.set(1.2, 1, 0.9); put(rf, 0, 3.1, 0, h); put(new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.5, 0.2) })), 0.8, 1.2, 1.51, h); h.position.set(x, 0, z); h.rotation.y = r; s.add(h); }
    // ma trơi (blue-green wisps with halos), falling black leaves, rising ash, ground mist
    this.wisps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 2.4, 2.2) }), 30); this.wisps.frustumCulled = false; s.add(this.wisps);
    const halo = glowTex('120,255,230');
    for (let i = 0; i < 30; i++) { const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 })); h.scale.setScalar(0.7); this.halos.push(h); s.add(h); }
    this.falling = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.14, 0.09), new THREE.MeshStandardMaterial({ color: 0x0a0a08, side: THREE.DoubleSide, roughness: 0.9 }), 300); this.falling.frustumCulled = false; s.add(this.falling);
    this.embers = new THREE.InstancedMesh(new THREE.SphereGeometry(0.02, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 0.9, 0.3) }), 260); this.embers.frustumCulled = false; s.add(this.embers);
    const mistTex = glowTex('190,210,215');
    for (let i = 0; i < 50; i++) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, transparent: true, depthWrite: false, opacity: 0.16, color: 0xa8b8c0 })); m.scale.set(8, 2.4, 1); m.position.set((R() - 0.5) * 36, 0.4 + R() * 0.6, 20 - R() * 36); m.userData.x0 = m.position.x; this.mist.push(m); s.add(m); }
    // the ghost stands on the path under the tree
    this.ghost.root.position.set(-1.2, 0.05, 4.2); this.ghost.root.rotation.y = 0.15; s.add(this.ghost.root);
  }
  /** swap the painted surfaces for photo-scanned PBR sets (Poly Haven, CC0) in public/tex */
  async applyPBR() {
    const L = new THREE.TextureLoader();
    const pbr = async (m: THREE.MeshStandardMaterial, id: string, rep: number, tint: number, rough = 1) => {
      const [d, n, r] = await Promise.all(['diff', 'nor_gl', 'rough'].map((k) => L.loadAsync(`/tex/${id}_${k}_1k.jpg`)));
      d!.colorSpace = THREE.SRGBColorSpace; for (const t of [d!, n!, r!]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = 8; }
      Object.assign(m, { map: d, normalMap: n, roughnessMap: r, roughness: rough }); m.color.set(tint); m.needsUpdate = true;
    };
    await Promise.all([
      pbr(this.mats.ground, 'mud_forest', 110, 0x8a8a8a, 0.75), pbr(this.mats.bark, 'bark_willow', 2, 0x9a948c),
      pbr(this.mats.plaster, 'worn_mossy_plasterwall', 1, 0xc8c0b0), pbr(this.mats.tile, 'clay_roof_tiles_02', 1.5, 0xb08070), pbr(this.mats.stone, 'mossy_rock', 1, 0xa8a8a0),
    ]);
  }
  update(t: number) {
    const red = this.bloodMoon;
    this.sky.uniforms.red!.value = red; this.moonMat.color.setRGB(0.95 + 0.05 * red, 0.97 - 0.62 * red, 1.0 - 0.72 * red);
    this.fog.color.setRGB(0.07 + 0.08 * red, 0.1 - 0.05 * red, 0.11 - 0.06 * red); this.moonL.color.setRGB(0.6 + 0.4 * red, 0.72 - 0.4 * red, 0.85 - 0.5 * red);
    this.shafts.forEach((m, i) => { const mt = m.material as THREE.MeshBasicMaterial; mt.opacity = (0.09 + 0.04 * Math.sin(t * 0.6 + i * 1.9)) * (1 - 0.7 * red); mt.color.setRGB(0.55 + 0.4 * red, 0.7 - 0.5 * red, 0.85 - 0.6 * red); });
    (this.moonHalo.material as THREE.SpriteMaterial).color.setRGB(1, 1 - 0.7 * red, 1 - 0.8 * red);
    this.leafMats.forEach((m, i) => m.color.copy(this.leafCols[i]!).multiplyScalar(1 - 0.85 * this.blight));
    const w = this.wake, fl = 0.8 + 0.2 * Math.sin(t * 11) * Math.sin(t * 5.3);
    this.eyes.color.setRGB(3 * w * fl, 0.25 * w, 0.1 * w); this.hollowGlow.color.setRGB(0.35 * w * fl, 0.35 * w * fl, 0.35 * w * fl); this.hollowL.intensity = 1.5 * w * fl;
    this.tears.forEach((m, i) => { const k = Math.max(0, Math.min(1, this.bleed * 1.4 - i * 0.07)); m.scale.y = Math.max(0.001, k); m.visible = k > 0.01; });
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3();
    this.roots.base.forEach((d, i) => { const sw = 0.05 * Math.sin(t * 0.8 + d.ph) + this.reach * 0.35 * Math.max(0, d.p.z) / 9; M.compose(d.p, Q.setFromEuler(E.set(sw, 0, 0.04 * Math.sin(t * 0.6 + d.ph * 2))), S.set(1, d.len, 1)); this.roots.m.setMatrixAt(i, M); });
    this.roots.m.instanceMatrix.needsUpdate = true;
    this.lanterns.forEach(({ g, ph }) => { g.rotation.z = 0.08 * Math.sin(t * 1.1 + ph); g.rotation.x = 0.06 * Math.sin(t * 0.9 + ph * 2); });
    this.smoke.forEach((m, i) => { m.rotation.y = Math.sin(t * 0.6 + i) * 0.6; m.position.y = 1.3 + 0.04 * Math.sin(t * 1.3 + i); });
    for (let i = 0; i < 30; i++) { V.set(Math.sin(i * 7.7 + t * 0.25) * 6 + Math.sin(t * 1.1 + i) * 0.5, 0.5 + 1.4 * ((i * 0.37) % 1) + 0.3 * Math.sin(t * 1.5 + i) + this.ash * ((t * 0.6 + i * 0.3) % 6), 6 - ((i * 4.31) % 14) + Math.cos(t * 0.3 + i) * 0.8); const k = 0.7 + 0.4 * Math.sin(t * 3 + i * 2); M.compose(V, Q.identity(), S.setScalar(k)); this.wisps.setMatrixAt(i, M); this.halos[i]!.position.copy(V); this.halos[i]!.scale.setScalar(0.8 * k); }
    this.wisps.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < 300; i++) { const h = (i * 0.618) % 1, fall = (t * (0.35 + h * 0.4) + h * 30) % 10, on = this.blight > h * 0.8 ? 1 : 0; V.set(((i * 7.31) % 18) - 9 + Math.sin(t * 0.7 + i) * 1.2, 10 - fall, ((i * 3.77) % 18) - 7); Q.setFromEuler(E.set(t * 1.5 + i, t + i * 2, t * 0.7 + i)); M.compose(V, Q, S.setScalar(on)); this.falling.setMatrixAt(i, M); }
    this.falling.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < 260; i++) { const h = (i * 0.618) % 1, u = (t * (0.15 + h * 0.2) + h * 9) % 1; V.set(Math.sin(i * 4.1) * 4 * (0.4 + h) + Math.sin(t + i) * 0.3, u * 9, Math.cos(i * 2.7) * 4 * (0.4 + h) + 3); M.compose(V, Q.identity(), S.setScalar(this.ash * (1 - u) * (0.6 + h))); this.embers.setMatrixAt(i, M); }
    this.embers.instanceMatrix.needsUpdate = true;
    this.mist.forEach((m, i) => { m.position.x = m.userData.x0 + Math.sin(t * 0.12 + i) * 1.6; });
    this.ghost.update(t, this.reach);
  }
}
