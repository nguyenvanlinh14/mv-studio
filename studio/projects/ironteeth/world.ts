// "Iron Teeth in Frozen Earth" — a frozen mountain ridge at night under a huge full moon: snowy ground, cold grey
// boulders capped with snow, ancient standing stones, pines, layered far ridges in fog and wind-blown snow. The heroes
// are grey wolves (Quaternius CC0 rig, normals smoothed, skinned shell fur), posed by clip + time (pure function of t).
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mulberry } from '../chanbo-lookdev/field';

const std = (color: number, rough = 0.8, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, ...o });
const mesh = (g: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], cast = true) => { const me = new THREE.Mesh(g, m); me.castShadow = cast; me.receiveShadow = true; return me; };
const put = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number, parent?: THREE.Object3D) => { o.position.set(x, y, z); parent?.add(o); return o; };

/** cheap 2D value noise for terrain */
const hash = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const vnoise = (x: number, y: number) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const fbm = (x: number, y: number) => vnoise(x, y) * 0.5 + vnoise(x * 2.1, y * 2.1) * 0.25 + vnoise(x * 4.3, y * 4.3) * 0.125;

/** standard material that whitens surfaces facing up (snow caps); patchy > 0 breaks the snow into clumps */
function snowy(color: number, rough = 0.9, cap = 0.55, patchy = 0) {
  const m = std(color, rough);
  m.customProgramCacheKey = () => `snowy-${cap}-${patchy}`; // cap / patchy are baked into the shader text: one program per variant
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = 'varying float vUp; varying vec3 vWP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vUp = normalize(mat3(modelMatrix) * objectNormal).y; vWP = (modelMatrix * vec4(position, 1.0)).xyz;');
    sh.fragmentShader = `varying float vUp; varying vec3 vWP;
      float hn(vec3 p){ return fract(sin(dot(p, vec3(12.99, 78.23, 37.71))) * 43758.55); }
      float vn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(hn(i), hn(i + vec3(1,0,0)), f.x), mix(hn(i + vec3(0,1,0)), hn(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(hn(i + vec3(0,0,1)), hn(i + vec3(1,0,1)), f.x), mix(hn(i + vec3(0,1,1)), hn(i + vec3(1,1,1)), f.x), f.y), f.z); }\n` + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float snow = smoothstep(${cap.toFixed(2)}, ${(cap + 0.15).toFixed(2)}, vUp);
      ${patchy > 0 ? `snow *= smoothstep(${(0.5 + patchy * 0.15).toFixed(2)}, ${(0.6 + patchy * 0.15).toFixed(2)}, vn(vWP * 2.2) * 0.65 + vn(vWP * 7.0) * 0.35);` : ''}
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.9, 0.98), snow);`);
  };
  return m;
}

// ------------------------------------------------------------------------------------------------ wolf
function furMaterial(base: THREE.Color, tip: THREE.Color, k: number, offset: number) {
  const m = new THREE.MeshStandardMaterial({ color: base.clone().lerp(tip, k).multiplyScalar(0.7 + 0.35 * k), roughness: 1 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uOff = { value: offset * k }; sh.uniforms.uK = { value: k };
    sh.uniforms.uEye0 = { value: EYE_BIND[0]?.c ?? new THREE.Vector3(1e9, 0, 0) }; sh.uniforms.uEye1 = { value: EYE_BIND[1]?.c ?? new THREE.Vector3(1e9, 0, 0) }; sh.uniforms.uEyeR = { value: (EYE_BIND[0]?.r ?? 0) * 1.05 };
    sh.vertexShader = 'uniform float uOff; varying vec3 vFurP;\n' + sh.vertexShader.replace('#include <skinning_vertex>', '#include <skinning_vertex>\n vFurP = position; transformed += normalize(objectNormal) * uOff;');
    sh.fragmentShader = 'uniform float uK; uniform vec3 uEye0, uEye1; uniform float uEyeR; varying vec3 vFurP;\n' + sh.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
      vec3 P = vFurP * 30000.0, q = floor(P); float h = fract(sin(dot(q, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
      if (h < uK * 0.8 || length(fract(P) - 0.5) > 0.62 * (1.0 - uK) + 0.12) discard;
      if (min(distance(vFurP, uEye0), distance(vFurP, uEye1)) < uEyeR * (0.6 + 0.4 * uK)) discard; // fur parts around the eyes`);
  };
  return m;
}
export type WolfClip = 'Idle' | 'Idle_2' | 'Idle_2_HeadLow' | 'Walk' | 'Gallop' | 'Gallop_Jump' | 'Attack' | 'Jump_ToIdle';
export type Coat = 'snow' | 'white' | 'dark' | 'brown' | 'grey';
/** back, belly, fur tip */
const COATS: Record<Coat, [number, number, number]> = {
  snow: [0xf0f0f2, 0xffffff, 0xffffff], // the pack leader: pure white
  white: [0xd6d2ca, 0xeeeae2, 0xf6f4ee],
  dark: [0x38383c, 0x74747a, 0x5c5c62], // "đen nhạt": soft charcoal
  brown: [0x6a4a30, 0xbc9c78, 0x987454],
  grey: [0x8a8784, 0xe8e2d8, 0xd8d4cc],
};

/** where the mouth cavity sits, in Head-bone space (filled in by prepareWolf) */
const MOUTH = { pos: new THREE.Vector3(), scale: new THREE.Vector3(1, 1, 1) };
/**
 * One-off prep of the source rig: smooth the flat-shaded parts and give them a "jawOpen" morph target. The rig has
 * no jaw bone, so the lower muzzle (Head-weighted vertices below the mouth line, front of the skull) is rotated down
 * about a hinge under the eyes. Axes are found from the data: forward = longest axis toward the head, up = toward the ears.
 */
export function prepareWolf(src: THREE.Object3D) {
  const parts: THREE.SkinnedMesh[] = []; src.traverse((o) => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) parts.push(o as THREE.SkinnedMesh); });
  for (const sm of parts) { const g = sm.geometry.clone(); g.deleteAttribute('normal'); const sg = mergeVertices(g, 1e-6); sg.computeVertexNormals(); sm.geometry = sg; }
  const bones = parts[0]!.skeleton.bones, bi = (n: string) => bones.findIndex((b) => b.name === n), HEAD = bi('Head');
  const ears = new Set(bones.map((b, i) => (b.name.startsWith('Ear') ? i : -1)).filter((i) => i >= 0));
  const dom = (g: THREE.BufferGeometry, i: number) => { const J = g.attributes.skinIndex!, W = g.attributes.skinWeight!; let b = -1, w = 0; for (let k = 0; k < 4; k++) if (W.getComponent(i, k) > w) { w = W.getComponent(i, k); b = J.getComponent(i, k); } return b; };
  const all = new THREE.Box3(), head = new THREE.Box3(), hc = new THREE.Vector3(), ec = new THREE.Vector3(), v = new THREE.Vector3(); let hn = 0, en = 0;
  for (const sm of parts) { const P = sm.geometry.attributes.position!; for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); all.expandByPoint(v); const d = dom(sm.geometry, i); if (d === HEAD) { head.expandByPoint(v); hc.add(v); hn++; } if (ears.has(d)) { ec.add(v); en++; } } }
  hc.divideScalar(hn); ec.divideScalar(en);
  const size = all.getSize(new THREE.Vector3()), ctr = all.getCenter(new THREE.Vector3());
  const F = size.x > size.y ? (size.x > size.z ? 0 : 2) : size.y > size.z ? 1 : 2, fs = Math.sign(hc.getComponent(F) - ctr.getComponent(F));
  const up = ec.clone().sub(hc); up.setComponent(F, 0); const U = [0, 1, 2].filter((a) => a !== F).sort((a, b) => Math.abs(up.getComponent(b)) - Math.abs(up.getComponent(a)))[0]!, us = Math.sign(up.getComponent(U));
  const f = (p: THREE.Vector3) => p.getComponent(F) * fs, u = (p: THREE.Vector3) => p.getComponent(U) * us;
  const tip = fs > 0 ? head.max.getComponent(F) * fs : head.min.getComponent(F) * fs, len = head.max.getComponent(F) - head.min.getComponent(F);
  const fh = tip - 0.6 * len; // hinge, under the eyes
  // the mouth line: 42% up the muzzle (front part of the head)
  let lo = Infinity, hi = -Infinity;
  for (const sm of parts) { const P = sm.geometry.attributes.position!; for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); if (dom(sm.geometry, i) === HEAD && f(v) > tip - 0.35 * len) { lo = Math.min(lo, u(v)); hi = Math.max(hi, u(v)); } } }
  const um = lo + 0.42 * (hi - lo), TH = 0.8;
  for (const sm of parts) {
    const g = sm.geometry, P = g.attributes.position!, D = new Float32Array(P.count * 3);
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i); if (dom(g, i) !== HEAD || f(v) < fh || u(v) > um) continue;
      const df = f(v) - fh, du = u(v) - um, nf = df * Math.cos(TH) + du * Math.sin(TH), nu = -df * Math.sin(TH) + du * Math.cos(TH);
      D[i * 3 + F] = (nf - df) * fs; D[i * 3 + U] = (nu - du) * us;
    }
    g.morphAttributes.position = [new THREE.Float32BufferAttribute(D, 3)]; g.morphTargetsRelative = true; sm.updateMorphTargets();
  }
  // mouth cavity: centred in the muzzle at the mouth line, in Head-bone space
  const sm = parts[0]!, toBone = sm.skeleton.boneInverses[HEAD]!.clone().multiply(sm.bindMatrix);
  const at = (df: number, du: number, side = 0) => { const p = ctr.clone(); p.setComponent(F, (fh + df) * fs); p.setComponent(U, (um + du) * us); const S = 3 - F - U; p.setComponent(S, hc.getComponent(S) + side); return p.applyMatrix4(toBone); };
  const c = at(0.3 * len, -0.04 * len); MOUTH.pos.copy(c);
  const ax = [at(0.6 * len, -0.04 * len), at(0.3 * len, 0.1 * len), at(0.3 * len, -0.04 * len, 0.12 * len)].map((p) => p.distanceTo(c));
  MOUTH.scale.set(ax[2]! * 0.8, ax[1]! * 0.8, ax[0]! * 0.8); // stay inside the closed muzzle
  // eyes: the rig's eyes are two flat black blobs; record each blob's centre, outward normal and size in Head space
  const eyeMesh = parts.find((p) => (p.material as THREE.Material).name === 'Eyes_Black'), S = 3 - F - U;
  if (eyeMesh) {
    const P = eyeMesh.geometry.attributes.position!, N = eyeMesh.geometry.attributes.normal!, nm = new THREE.Matrix3().getNormalMatrix(toBone);
    for (const sd of [-1, 1]) {
      const c = new THREE.Vector3(), n = new THREE.Vector3(), pts: THREE.Vector3[] = [];
      for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); if (Math.sign(v.getComponent(S) - hc.getComponent(S)) !== sd) continue; pts.push(v.clone()); c.add(v); n.add(new THREE.Vector3().fromBufferAttribute(N, i)); }
      c.divideScalar(pts.length); const r = Math.max(...pts.map((p) => p.distanceTo(c)));
      const cb = c.clone().applyMatrix4(toBone), rb = c.clone().add(new THREE.Vector3(r, 0, 0)).applyMatrix4(toBone).distanceTo(cb);
      const dir = (ax: number, sg: number) => { const d = new THREE.Vector3(); d.setComponent(ax, sg); return d.transformDirection(toBone); };
      EYES.push({ pos: cb, normal: n.applyMatrix3(nm).normalize(), r: rb, up: dir(U, us), out: dir(S, sd) }); EYE_BIND.push({ c, r });
    }
  }
}
const EYES: { pos: THREE.Vector3; normal: THREE.Vector3; r: number; up: THREE.Vector3; out: THREE.Vector3 }[] = [];
/** the same eye centres in mesh (bind) space, so the fur shells can leave the eyes bare */
const EYE_BIND: { c: THREE.Vector3; r: number }[] = [];
/** ice-blue wolf iris: dark limbal ring, pale -> steel-blue fibres around a round black pupil; the corners stay dark like a wolf's */
const IRIS = (() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 512; const c = cv.getContext('2d')!, R = mulberry(3); c.scale(2, 2);
  c.fillStyle = '#1a0e06'; c.fillRect(0, 0, 256, 256);
  const g = c.createRadialGradient(128, 128, 30, 128, 128, 122); g.addColorStop(0, '#d8eef8'); g.addColorStop(0.35, '#9cd0ec'); g.addColorStop(0.8, '#4a86b8'); g.addColorStop(1, '#14263a');
  c.fillStyle = g; c.beginPath(); c.arc(128, 128, 122, 0, 7); c.fill();
  for (let i = 0; i < 260; i++) { const a = R() * Math.PI * 2, r0 = 36 + R() * 20, r1 = 70 + R() * 50; c.strokeStyle = R() < 0.5 ? `rgba(235,250,255,${0.15 + R() * 0.3})` : `rgba(20,50,90,${0.15 + R() * 0.3})`; c.lineWidth = 0.6 + R() * 1.4; c.beginPath(); c.moveTo(128 + Math.cos(a) * r0, 128 + Math.sin(a) * r0); c.lineTo(128 + Math.cos(a + (R() - 0.5) * 0.15) * r1, 128 + Math.sin(a + (R() - 0.5) * 0.15) * r1); c.stroke(); }
  c.fillStyle = '#030202'; c.beginPath(); c.arc(128, 128, 38, 0, 7); c.fill();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
})();
const IRIS_MAT = new THREE.MeshStandardMaterial({ map: IRIS, roughness: 0.4, emissive: 0xffffff, emissiveMap: IRIS, emissiveIntensity: 0.12 });
const CORNEA = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.12 });
const LID = new THREE.MeshStandardMaterial({ color: 0x0c0806, roughness: 0.6 });
const CATCH = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.7, 1.9) });
/** almond outline: pointed inner corner (-x), rounder outer corner (+x), in units of r */
const almond = (r: number, k = 1) => {
  const sh = new THREE.Shape(), a = 1.45 * r * k, b = 0.62 * r * k;
  sh.moveTo(-a, -0.05 * b); sh.bezierCurveTo(-0.45 * a, 1.25 * b, 0.55 * a, 1.2 * b, a, 0.18 * b); sh.bezierCurveTo(0.6 * a, -1.0 * b, -0.4 * a, -1.05 * b, -a, -0.05 * b);
  return sh;
};
function wolfEye(r: number) {
  const g = new THREE.Group();
  const ig = new THREE.ShapeGeometry(almond(r), 24), uv = ig.attributes.uv!; // shape uvs = shape coords: map the iris disc (radius r) onto them
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / (2 * r) + 0.5, uv.getY(i) / (2 * r) + 0.5);
  g.add(new THREE.Mesh(ig, IRIS_MAT));
  const co = new THREE.Mesh(new THREE.ShapeGeometry(almond(r, 1.02), 24), CORNEA); co.position.z = r * 0.06; g.add(co);
  const rim = almond(r, 1.22); rim.holes.push(new THREE.Path(almond(r, 1.0).getPoints(48).reverse()));
  const lid = new THREE.Mesh(new THREE.ShapeGeometry(rim, 24), LID); lid.position.z = r * 0.03; g.add(lid); // dark lid line all round
  const cl = new THREE.Mesh(new THREE.CircleGeometry(r * 0.08, 12), CATCH); cl.position.set(-r * 0.25, r * 0.28, r * 0.08); g.add(cl);
  return g;
}

export class Wolf {
  root = new THREE.Group(); mixer: THREE.AnimationMixer; clips: Map<string, THREE.AnimationClip>; bones: Record<string, THREE.Bone> = {};
  private morphed: THREE.Mesh[] = []; private mouth: THREE.Mesh;
  constructor(src: THREE.Object3D, anims: THREE.AnimationClip[], public seed = 1, coat: Coat = 'grey', shells = 16) {
    const m = cloneSkinned(src); this.root.add(m);
    this.mixer = new THREE.AnimationMixer(m);
    this.clips = new Map(anims.filter((a) => !a.name.includes('|')).map((a) => [a.name, a]));
    m.traverse((o) => { if ((o as THREE.Bone).isBone || o.name.endsWith('_end')) this.bones[o.name] = o as THREE.Bone; });
    for (const b of Object.values(this.bones)) this.rest.set(b, [b.position.clone(), b.quaternion.clone(), b.scale.clone()]);
    const pal = COATS[coat];
    const parts: THREE.SkinnedMesh[] = []; m.traverse((o) => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) parts.push(o as THREE.SkinnedMesh); });
    for (const sm of parts) { // four parts, one material each: Main (back), Main_Light (belly), Eyes_Black, Nose
      sm.castShadow = true; sm.receiveShadow = true; sm.frustumCulled = false; this.morphed.push(sm);
      const name = (sm.material as THREE.Material).name, furry = name === 'Main' || name === 'Main_Light', col = name === 'Main_Light' ? pal[1] : pal[0];
      sm.material = name === 'Nose' ? std(0x0c0c0e, 0.3) : std(col, 0.85);
      if (name === 'Eyes_Black') { sm.visible = false; continue; } // replaced by real eyes on the Head bone
      if (!furry) continue;
      for (let i = 1; i <= shells; i++) {
        const sh = new THREE.SkinnedMesh(sm.geometry, furMaterial(new THREE.Color(col), new THREE.Color(pal[2]), i / shells, 0.0007));
        sh.bind(sm.skeleton, sm.bindMatrix); sh.frustumCulled = false; sh.receiveShadow = true;
        sm.parent!.add(sh); this.morphed.push(sh);
      }
    }
    this.mouth = mesh(SPHERE_LO, std(0x2a0a0c, 0.6), false); this.mouth.position.copy(MOUTH.pos); this.mouth.scale.copy(MOUTH.scale); this.bones.Head?.add(this.mouth);
    for (const e of EYES) { // almond eyes: x toward the outer corner, tilted up 0.3 rad (the slanted wolf look)
      const eye = wolfEye(e.r * 0.75), z = e.normal.clone(), x = e.out.clone().addScaledVector(z, -e.out.dot(z)).normalize();
      const mirror = z.clone().cross(x).dot(e.up) < 0; if (mirror) x.negate(); // keep y up; then the outer corner is -x
      eye.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, z.clone().cross(x), z));
      eye.rotateZ(mirror ? -0.3 : 0.3); if (mirror) eye.scale.x = -1;
      eye.position.copy(e.pos).addScaledVector(e.normal, e.r * 0.15); this.bones.Head?.add(eye);
    }
  }
  private rest = new Map<THREE.Object3D, [THREE.Vector3, THREE.Quaternion, THREE.Vector3]>();
  /** pose = clip at time t (looped), optional howl (0..1: head and neck tip up to the moon, mouth opens) */
  pose(clip: WolfClip, t: number, o: { speed?: number; howl?: number; jaw?: number; mix?: { clip: WolfClip; t: number; w: number } } = {}) {
    this.mixer.stopAllAction();
    for (const [b, [p, q, s]] of this.rest) { b.position.copy(p); b.quaternion.copy(q); b.scale.copy(s); } // clips don't key every bone: never accumulate
    const c = this.clips.get(clip); if (!c) return;
    const wrap = (x: number, d: number) => ((x % d) + d) % d, a = this.mixer.clipAction(c);
    if (o.mix) { // cross-fade to a second clip (e.g. idle -> walk), each at its own time
      const c2 = this.clips.get(o.mix.clip)!, b = this.mixer.clipAction(c2);
      a.reset().play(); b.reset().play(); a.time = wrap(t * (o.speed ?? 1), c.duration); b.time = wrap(o.mix.t, c2.duration);
      a.setEffectiveWeight(1 - o.mix.w); b.setEffectiveWeight(o.mix.w); this.mixer.update(0);
    } else { a.play(); this.mixer.setTime(wrap(t * (o.speed ?? 1), c.duration)); }
    const h = o.howl ?? 0, jaw = o.jaw ?? h * (0.85 + 0.15 * Math.sin(t * 5));
    for (const me of this.morphed) if (me.morphTargetInfluences) me.morphTargetInfluences[0] = jaw;
    this.mouth.visible = jaw > 0.05; // it pokes through the closed muzzle
    if (h > 0) {
      // tip the chest, neck and head about the wolf's own side axis (-angle about x lifts the muzzle)
      const side = new THREE.Vector3(1, 0, 0).applyQuaternion(this.root.getWorldQuaternion(new THREE.Quaternion())), pq = new THREE.Quaternion(), rq = new THREE.Quaternion();
      for (const [b, ang] of [['Torso3', 0.15], ['Neck1', 0.35], ['Neck2', 0.3], ['Neck3', 0.25], ['Head', 0.2]] as const) {
        const bone = this.bones[b]; if (!bone) continue;
        this.root.updateMatrixWorld(true); bone.parent!.getWorldQuaternion(pq);
        rq.setFromAxisAngle(side, -ang * h); bone.quaternion.premultiply(pq.clone().invert().multiply(rq).multiply(pq));
      }
    }
  }
}
const SPHERE_LO = new THREE.SphereGeometry(1, 16, 12);

// ------------------------------------------------------------------------------------------------ the ridge
/** faint paw prints pressed into the snow: an instanced decal pool refilled every frame (so it stays a pure function of t) */
export class Prints {
  mesh: THREE.InstancedMesh; n = 0; static MAX = 2400; private d = new THREE.Object3D();
  constructor() {
    const tex = (() => {
      const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d')!; c.filter = 'blur(2px)'; c.fillStyle = '#fff';
      const e = (x: number, y: number, rx: number, ry: number, a = 0) => { c.beginPath(); c.ellipse(x, y, rx, ry, a, 0, 7); c.fill(); };
      e(64, 86, 24, 20); // pad
      e(32, 54, 8.5, 12, -0.3); e(52, 38, 8.5, 13, -0.1); e(76, 38, 8.5, 13, 0.1); e(96, 54, 8.5, 12, 0.3); // toes
      const t = new THREE.CanvasTexture(cv); t.anisotropy = 8; return t;
    })();
    const g = new THREE.PlaneGeometry(0.2, 0.26); g.rotateX(-Math.PI / 2);
    const m = new THREE.MeshBasicMaterial({ map: tex, color: 0x2c3d66, transparent: true, opacity: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    this.mesh = new THREE.InstancedMesh(g, m, Prints.MAX); this.mesh.frustumCulled = false; this.mesh.count = 0; this.mesh.renderOrder = 1;
  }
  reset() { this.n = 0; }
  /** a print at (x, z) on surface height y, toes pointing along heading yaw */
  add(x: number, y: number, z: number, yaw: number) {
    if (this.n >= Prints.MAX) return;
    this.d.position.set(x, y + 0.035, z); this.d.rotation.set(0, yaw + Math.PI, 0); this.d.updateMatrix();
    this.mesh.setMatrixAt(this.n++, this.d.matrix);
  }
  flush() { this.mesh.count = this.n; this.mesh.instanceMatrix.needsUpdate = true; }
}

export class FrozenRidge {
  scene = new THREE.Scene(); wolves: Wolf[] = []; howlTop = 0; rock!: THREE.Mesh; private ray = new THREE.Raycaster(); flake = snowflake(); prints = new Prints(); sky!: THREE.ShaderMaterial; aurLight!: THREE.DirectionalLight; hemi!: THREE.HemisphereLight; ready: Promise<void>; moonDir = new THREE.Vector3(0.12, 0.55, -1).normalize(); /** the old, lower moon line: cameras use it to frame the wolf against the sky */ camDir = new THREE.Vector3(0.15, 0.32, -1).normalize();
  private snow: THREE.InstancedMesh; private snowSeed: Float32Array; private moonMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
  private dummy = new THREE.Object3D();
  constructor() {
    const s = this.scene, R = mulberry(17);
    // sky: deep blue night, a pale glow around the moon, stars
    this.sky = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { md: { value: this.moonDir }, aur: { value: 0 }, tm: { value: 0 } },
      vertexShader: 'varying vec3 vd; void main(){ vd = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `uniform vec3 md; uniform float aur, tm; varying vec3 vd;
        float h(vec3 p){ return fract(sin(dot(p, vec3(12.99,78.23,37.71)))*43758.5); }
        float h1(float x){ return fract(sin(x * 127.1) * 43758.5); }
        float n1(float x){ float i = floor(x), f = fract(x); f = f * f * (3. - 2. * f); return mix(h1(i), h1(i + 1.), f); }
        float fb(float x){ return n1(x) * 0.55 + n1(x * 2.3 + 7.) * 0.3 + n1(x * 5.1 + 3.) * 0.15; }
        void main(){ float y = vd.y; vec3 c = mix(vec3(0.09,0.13,0.23), vec3(0.01,0.02,0.06), smoothstep(0.0, 0.55, y));
          float g = max(dot(vd, md), 0.); c += (vec3(0.35,0.42,0.55) * pow(g, 40.) + vec3(0.07,0.1,0.17) * pow(g, 6.)) * (1. - 0.55 * aur);
          vec3 q = floor(vd * 300.); float st = step(0.9975, h(q)) * smoothstep(0.05, 0.3, y); c += vec3(st) * 0.9;
          if (aur > 0.) { // curtains: a wavy base line per azimuth, vertical rays above it, green at the base to violet at the top
            float a = atan(vd.x, -vd.z), wv = fb(a * 1.6 + tm * 0.05);
            float cov = 0.45 + 0.55 * smoothstep(0.1, 0.5, fb(a * 0.9 + 4. - tm * 0.025)); // where the curtains hang
            float base = 0.14 + 0.14 * wv + 0.025 * sin(a * 9. + tm * 0.7);
            float up = y - base;
            float ray = 0.55 + 0.45 * n1(a * 55. + tm * 0.35 + 3. * n1(a * 7.));
            float prof = smoothstep(-0.015, 0.02, up) * exp(-max(up, 0.) * (3.2 + 2. * wv)) * (0.35 + 0.65 * ray);
            vec3 col = mix(vec3(0.15, 1.0, 0.45), vec3(0.55, 0.25, 1.0), smoothstep(0.04, 0.42, up));
            col = mix(col, vec3(1.0, 0.25, 0.5), smoothstep(0.35, 0.7, up) * 0.5);
            c += col * prof * cov * aur * 1.45 * smoothstep(0.03, 0.12, y);
          }
          gl_FragColor = vec4(c, 1.); }` });
    s.add(new THREE.Mesh(new THREE.SphereGeometry(400, 48, 24), this.sky));
    const moon = new THREE.Mesh(new THREE.SphereGeometry(15, 48, 32), this.moonMat); put(moon, ...this.moonDir.clone().multiplyScalar(330).toArray(), s);
    moon.lookAt(0, 0, 0); moon.rotateY(-Math.PI / 2);
    this.ready = new THREE.TextureLoader().loadAsync('/tex/moon_lroc_color_1k.jpg').then((t) => { t.colorSpace = THREE.SRGBColorSpace; this.moonMat.map = t; this.moonMat.color.setRGB(1.05, 1.08, 1.15); this.moonMat.needsUpdate = true; });
    s.fog = new THREE.FogExp2(new THREE.Color(0.1, 0.13, 0.2), 0.012);
    const moonL = new THREE.DirectionalLight(0xe0ecff, 3.4); moonL.position.copy(this.moonDir).multiplyScalar(80); moonL.castShadow = true;
    moonL.shadow.mapSize.set(2048, 2048); Object.assign(moonL.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, far: 200 }); moonL.shadow.bias = -0.0005; s.add(moonL, moonL.target);
    const front = new THREE.DirectionalLight(0xb0b8d0, 1.1); front.position.set(2, 3, 8); s.add(front);
    this.hemi = new THREE.HemisphereLight(0x5a6c90, 0x20242e, 0.9); s.add(this.hemi);
    this.aurLight = new THREE.DirectionalLight(0x40ffa8, 0); this.aurLight.position.set(-2, 30, -40); s.add(this.aurLight); // green wash on the snow from the curtains
    // snowy ground: a ridge that rises toward the back-left and falls off to a gorge on the right
    const gg = new THREE.PlaneGeometry(120, 120, 360, 360); gg.rotateX(-Math.PI / 2);
    const p = gg.attributes.position!;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, this.height(x, z)); }
    gg.computeVertexNormals();
    put(mesh(gg, snowy(0x9aa4b4, 0.95, 0.12)), 0, 0, 0, s);
    // far ridges: layered silhouettes fading into the fog
    // far ranges: ridged noise (sharp crests, slender peaks) on a real 3D strip so the moon lights one flank
    const ridged = (x: number, z: number) => { let a = 0, amp = 1, f = 1, wgt = 1; for (let o = 0; o < 5; o++) { let n = 1 - Math.abs(2 * vnoise(x * f, z * f) - 1); n *= n * wgt; wgt = Math.min(1, n * 1.6); a += n * amp; amp *= 0.5; f *= 2.03; } return a; };
    for (let l = 0; l < 3; l++) {
      const W2 = 560, D = 70, g = new THREE.PlaneGeometry(W2, D, 340, 46); g.rotateX(-Math.PI / 2);
      const q = g.attributes.position!, H0 = [34, 52, 70][l]!;
      for (let i = 0; i < q.count; i++) {
        const x = q.getX(i), z = q.getZ(i), edge = Math.sin(Math.PI * (z / D + 0.5)) ** 1.5; // rises from front and back edges
        const env = 0.55 + 0.45 * vnoise(x * 0.006 + l * 7, l);
        q.setY(i, -6 + H0 * env * edge * Math.pow(ridged(x * 0.012 + l * 11, z * 0.02 + l * 3) / 1.6, 1.6));
      }
      g.computeVertexNormals();
      const c = new THREE.Color(0.22, 0.26, 0.36).multiplyScalar(1 - l * 0.1);
      put(mesh(g, snowy(c.getHex(), 0.95, 0.45), false), 0, 0, -95 - l * 70, s);
    }
    // boulders: displaced dodecahedra with snow caps
    const rockMat = snowy(0x4e525a, 0.9, 0.5);
    const rock = (r: number, seed: number) => {
      const g = new THREE.IcosahedronGeometry(r, 6), q = g.attributes.position!;
      for (let i = 0; i < q.count; i++) { const v = new THREE.Vector3(q.getX(i), q.getY(i), q.getZ(i)), n = 0.78 + 0.42 * fbm(v.x * 1.3 / r + seed, v.y * 1.3 / r + v.z / r) + 0.05 * vnoise(v.x * 9 / r, v.z * 9 / r + v.y * 3 / r); v.multiplyScalar(n); v.y *= 0.72; q.setXYZ(i, v.x, v.y, v.z); }
      g.deleteAttribute('normal'); g.deleteAttribute('uv'); const w = mergeVertices(g, 1e-5); w.computeVertexNormals(); return mesh(w, rockMat); // welded: smooth, not faceted
    };
    // the howling rock (hero outcrop) — wolves stand on top at HOWL
    const out = rock(2.2, 3); out.scale.set(1.3, 1.2, 1.1); put(out, HOWL.x, this.height(HOWL.x, HOWL.z) + 0.6, HOWL.z, s);
    out.updateMatrixWorld(true); this.howlTop = new THREE.Box3().setFromObject(out).max.y - 0.12; this.rock = out;
    for (let i = 0; i < 40; i++) { const x = (R() - 0.5) * 50, z = -R() * 45 + 6; if (Math.abs(x) < 12 && z > -18) continue; const r = 0.3 + R() * 1.4; put(rock(r, i), x, this.height(x, z) + r * 0.2, z, s).rotation.y = R() * 6; }
    // ancient standing stones in a broken ring ("cold gray stone")
    const stoneMat = snowy(0x5e626a, 0.85, 0.75);
    for (let i = 0; i < 9; i++) {
      if (i === 3 || i === 7) continue; const a = (i / 9) * Math.PI * 2, x = RING.x + Math.cos(a) * 4.5, z = RING.z + Math.sin(a) * 4.5;
      const g = new THREE.BoxGeometry(0.7, 2.6 + R() * 1.4, 0.45, 2, 6, 2), q = g.attributes.position!;
      for (let j = 0; j < q.count; j++) { const y = q.getY(j); q.setX(j, q.getX(j) * (1 - 0.15 * (y / 3)) + (R() - 0.5) * 0.06); q.setZ(j, q.getZ(j) + (R() - 0.5) * 0.06); }
      g.computeVertexNormals(); const st = put(mesh(g, stoneMat), x, this.height(x, z) + 1.2, z, s); st.rotation.set((R() - 0.5) * 0.15, -a, (R() - 0.5) * 0.12);
    }
    // pines on the slopes
    // slender spruces: 6 drooping tiers with ragged branch tips (a few unit-size tier variants, scaled per tree)
    const trunk = std(0x2a201a, 1), needles = snowy(0x0e3320, 0.85, 0.72, 1.6); // dark spruce green, snow only in clumps
    const tiers = Array.from({ length: 6 }, (_, v) => {
      const g = new THREE.ConeGeometry(1, 1, 24, 4), q = g.attributes.position!, RR = mulberry(40 + v);
      const jag = Array.from({ length: 12 }, () => 0.75 + RR() * 0.45);
      for (let i = 0; i < q.count; i++) {
        const x = q.getX(i), y = q.getY(i), z = q.getZ(i), r = Math.hypot(x, z); if (r < 1e-4) continue;
        const a = (Math.atan2(z, x) / (Math.PI * 2) + 1) * 12, k = jag[Math.floor(a) % 12]! + (jag[(Math.floor(a) + 1) % 12]! - jag[Math.floor(a) % 12]!) * (a % 1) ** 3;
        const low = 0.5 - y; // 0 at the tip, 1 at the skirt
        q.setXYZ(i, x * (1 + (k - 1) * low), y - 0.18 * low * low * k, z * (1 + (k - 1) * low)); // ragged, drooping branch tips
      }
      g.computeVertexNormals(); return g;
    });
    for (let i = 0; i < 140; i++) {
      const x = (R() - 0.5) * 90, z = -19 - R() * 45; if (Math.abs(x - HOWL.x) < 4 && z > -16) continue;
      const tr = put(new THREE.Group(), x, this.height(x, z), z, s), h = 5 + R() * 6;
      put(mesh(new THREE.CylinderGeometry(0.05, 0.12, h * 0.35, 10), trunk), 0, h * 0.17, 0, tr);
      for (let k = 0; k < 6; k++) {
        const t = mesh(tiers[(i + k) % 6]!, needles), r = h * (0.21 - k * 0.028), th = h * (0.3 - k * 0.025);
        t.scale.set(r, th, r); t.rotation.y = R() * 6; put(t, 0, h * (0.28 + k * 0.125), 0, tr);
      }
    }
    // wind-blown snow: instanced flakes driven purely by t
    this.snowSeed = new Float32Array(3000 * 4); for (let i = 0; i < this.snowSeed.length; i++) this.snowSeed[i] = R();
    this.snow = new THREE.InstancedMesh(new THREE.SphereGeometry(0.02, 5, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.35, 1.45) }), 3000);
    this.snow.frustumCulled = false; s.add(this.snow);
    s.add(this.prints.mesh);
    this.flake.visible = false; this.flake.scale.setScalar(0.011); s.add(this.flake);
  }
  height(x: number, z: number) {
    const ss = (a: number, b: number, v: number) => { const k = Math.min(1, Math.max(0, (v - a) / (b - a))); return k * k * (3 - 2 * k); };
    const ridge = 2.2 * Math.exp(-((x + 4) ** 2) / 200) * ss(0, -25, z) + 7 * ss(-22, -58, z); // soft swell up to the far slope
    const gorge = -3.5 * Math.exp(-((x - 9) ** 2) / 12) * Math.min(1, Math.max(0, (-z - 4) / 10));
    const amp = 0.25 + 0.95 * Math.min(1, Math.max(0, (Math.hypot(x, z + 6) - 10) / 10)); // calm where the wolves run
    return ridge + gorge + (fbm(x * 0.15, z * 0.15) - 0.45) * amp;
  }
  /** aurora strength 0..1 (sky curtains + a green wash on snow and fur), animated by song time */
  setAurora(v: number, t: number) {
    this.sky.uniforms.aur!.value = v; this.sky.uniforms.tm!.value = t;
    this.aurLight.intensity = 0.55 * v; this.hemi.color.setRGB(0.35 - 0.08 * v, 0.42 + 0.12 * v, 0.56);
  }
  /** surface height under (x, z): the hero rock if it is there, else the snow */
  groundY(x: number, z: number) {
    this.ray.set(new THREE.Vector3(x, 30, z), new THREE.Vector3(0, -1, 0));
    const hit = this.rock.visible ? this.ray.intersectObject(this.rock, false)[0] : undefined; return hit ? hit.point.y : this.height(x, z);
  }
  /** height of the hero rock under (x, z): a wolf can walk across its top */
  rockY(x: number, z: number) {
    this.ray.set(new THREE.Vector3(x, 30, z), new THREE.Vector3(0, -1, 0));
    const hit = this.ray.intersectObject(this.rock, false)[0]; return hit ? hit.point.y - 0.08 : this.howlTop;
  }
  /** load the wolf rig once and spawn the pack: wolves[0] is the snow-white leader, then charcoal / brown / white */
  async loadWolves(n: number) {
    const g = await new GLTFLoader().loadAsync('/models/wolf/wolf.glb');
    // normalise to a real grey wolf: ~1.6 m nose to tail base, facing +z
    const box = new THREE.Box3().setFromObject(g.scene), size = box.getSize(new THREE.Vector3()), s = 1.6 / Math.max(size.x, size.z);
    g.scene.scale.multiplyScalar(s); g.scene.updateMatrixWorld(true);
    prepareWolf(g.scene);
    const coats: Coat[] = ['dark', 'brown', 'white'], R = mulberry(5);
    for (let i = 0; i < n; i++) {
      const w = new Wolf(g.scene, g.animations, i + 1, i === 0 ? 'snow' : coats[i % 3]!, i === 0 ? 16 : 10);
      if (i) w.root.children[0]!.scale.multiplyScalar(0.88 + R() * 0.12); // the leader is the biggest
      this.wolves.push(w); this.scene.add(w.root);
    }
  }
  /** snow streaming sideways in the wind around a centre (usually the camera target) */
  update(t: number, wind = 1, centre = new THREE.Vector3()) {
    const S = this.snowSeed, d = this.dummy;
    for (let i = 0; i < 3000; i++) {
      const a = S[i * 4]!, b = S[i * 4 + 1]!, c = S[i * 4 + 2]!, e = S[i * 4 + 3]!;
      const span = 24, x = ((a * span + t * (3 + 4 * e) * wind) % span) - span / 2, y = ((b * 10 - t * (0.6 + e)) % 10 + 10) % 10 - 1, z = (c - 0.5) * 24;
      d.position.set(centre.x + x + Math.sin(t * 2 + i) * 0.2, centre.y + y, centre.z + z); d.scale.setScalar(0.4 + e);
      d.updateMatrix(); this.snow.setMatrixAt(i, d.matrix);
    }
    this.snow.instanceMatrix.needsUpdate = true;
  }
}
export const HOWL = new THREE.Vector3(-3, 0, -6);
export const RING = new THREE.Vector3(3, 0, -14);

/** a six-armed dendrite crystal (radius 1): arms with side branches, a hexagonal centre plate; iridescent ice */
export function snowflake() {
  const parts: THREE.BufferGeometry[] = [];
  const bar = (len: number, w: number, x: number, y: number, a: number) => { const g = new THREE.BoxGeometry(len, w, 0.035); g.translate(len / 2, 0, 0); g.rotateZ(a); g.translate(x, y, 0); parts.push(g); };
  const hex = new THREE.CylinderGeometry(0.2, 0.2, 0.04, 6); hex.rotateX(Math.PI / 2); parts.push(hex);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2, cx = Math.cos(a), cy = Math.sin(a);
    bar(1, 0.075, 0, 0, a);
    for (const [t, L] of [[0.32, 0.3], [0.55, 0.26], [0.75, 0.18], [0.9, 0.1]] as const) for (const sd of [-1, 1]) bar(L, 0.05, cx * t, cy * t, a + sd * Math.PI / 3);
    const tip = new THREE.CylinderGeometry(0.07, 0.07, 0.04, 6); tip.rotateX(Math.PI / 2); tip.translate(cx * 1.0, cy * 1.0, 0); parts.push(tip);
  }
  const g = mergeGeometries(parts.map((p) => p.toNonIndexed()));
  const m = new THREE.MeshPhysicalMaterial({ color: 0x9cbcd6, roughness: 0.08, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03,
    iridescence: 1, iridescenceIOR: 1.4, iridescenceThicknessRange: [200, 700], emissive: 0x3a6a9a, emissiveIntensity: 0.06, envMapIntensity: 0.9, side: THREE.DoubleSide });
  return new THREE.Mesh(g, m);
}
