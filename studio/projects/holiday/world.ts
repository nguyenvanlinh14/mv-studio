// "Holiday the Dead Seek" — a graveyard hoedown: a moonlit boneyard (headstones, a mausoleum with a wooden stage,
// an old cedar, iron fence, lanterns, mist), a skeleton folk band (banjo, fiddle, drums, Uncle Silas on vocals),
// a skeleton bride and groom, a laughing preacher and a stomping crowd. Dawn is a sky mix (dawn 0..1).
import * as THREE from 'three';
import { bladeGeometry, mulberry } from '../chanbo-lookdev/field';
import { Pumpkin } from '../cider/world';

const std = (color: number, rough = 0.8, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, ...o });
const mesh = (g: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], cast = true) => { const me = new THREE.Mesh(g, m); me.castShadow = cast; me.receiveShadow = true; return me; };
const tex = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d')!); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; };
const put = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number, parent?: THREE.Object3D) => { o.position.set(x, y, z); parent?.add(o); return o; };

// ------------------------------------------------------------------------------------------------ skeleton
export interface BonePose {
  /** whole body: lift, forward lean, twist (yaw), side bend */
  y?: number; lean?: number; twist?: number; side?: number;
  /** head pitch / yaw / roll, jaw open 0..1 */
  head?: [number, number, number]; jaw?: number;
  /** shoulder pitch forward, roll out, elbow bend */
  armL?: [number, number, number]; armR?: [number, number, number];
  /** hip pitch forward, knee bend */
  legL?: [number, number]; legR?: [number, number];
}
export type Hat = 'top' | 'straw' | 'bowler' | 'preacher' | 'none';

export const BONE = std(0xe9dfc6, 0.6, { emissive: 0x8a7a70, emissiveIntensity: 0.22 });
const DARK = new THREE.MeshBasicMaterial({ color: 0x07050a });
const G = { knob: new THREE.SphereGeometry(1, 10, 8), rod: new THREE.CylinderGeometry(1, 1, 1, 8), box: new THREE.BoxGeometry(1, 1, 1) };
const knob = (r: number, m: THREE.Material = BONE) => { const k = mesh(G.knob, m); k.scale.setScalar(r); return k; };
const rod = (len: number, r: number, m: THREE.Material = BONE) => { const k = mesh(G.rod, m); k.scale.set(r, len, r); k.position.y = -len / 2; return k; };
const box = (w: number, h: number, d: number, m: THREE.Material = BONE) => { const k = mesh(G.box, m); k.scale.set(w, h, d); return k; };
/** a long bone hanging down from its joint: shaft + knobby ends */
const longBone = (len: number, r: number) => { const g = new THREE.Group(); g.add(rod(len, r)); g.add(knob(r * 1.5)); put(knob(r * 1.4), 0, -len, 0, g); return g; };

export class Skeleton {
  root = new THREE.Group(); body = new THREE.Group(); hips = new THREE.Group(); chest = new THREE.Group(); head = new THREE.Group(); jaw = new THREE.Group();
  arm: Record<'L' | 'R', { sh: THREE.Group; el: THREE.Group; hand: THREE.Group }>; leg: Record<'L' | 'R', { hip: THREE.Group; knee: THREE.Group }>;
  eyes: THREE.MeshBasicMaterial; seed: number;
  constructor(seed = 1, o: { hat?: Hat; eye?: number; scale?: number; tie?: boolean; veil?: boolean; robe?: boolean } = {}) {
    this.seed = seed;
    this.root.add(this.body); put(this.hips, 0, 0.94, 0, this.body);
    // pelvis
    for (const sx of [-1, 1]) { const il = knob(0.085); il.scale.set(0.08, 0.06, 0.035); put(il, sx * 0.075, 0.03, 0, this.hips); il.rotation.z = sx * 0.5; }
    const ring = mesh(new THREE.TorusGeometry(0.07, 0.02, 6, 16), BONE); ring.rotation.x = Math.PI / 2; put(ring, 0, -0.03, 0.02, this.hips);
    // lumbar spine → chest (ribs, sternum, clavicles) → neck → skull
    const spine = put(new THREE.Group(), 0, 0.06, 0, this.hips);
    for (let i = 0; i < 4; i++) { const v = knob(1); v.scale.set(0.03, 0.02, 0.028); put(v, 0, i * 0.055, -0.01, spine); }
    put(this.chest, 0, 0.22, 0, spine);
    for (let i = 0; i < 6; i++) { const v = knob(1); v.scale.set(0.026, 0.02, 0.025); put(v, 0, i * 0.06, -0.02, this.chest); }
    for (let i = 0; i < 6; i++) {
      const r = 0.1 + 0.045 * Math.sin((Math.PI * (i + 1.5)) / 7.5), g = new THREE.TorusGeometry(r, 0.012, 5, 22, Math.PI * 2 * 0.84); g.rotateZ(Math.PI * 1.5 - Math.PI * 2 * 0.92);
      const rib = mesh(g, BONE); rib.rotation.x = Math.PI / 2 + 0.25; rib.scale.set(1, 0.72, 1); put(rib, 0, 0.04 + i * 0.05, r * 0.72 - 0.02, this.chest);
    }
    const ster = box(0.03, 0.2, 0.02); ster.rotation.x = 0.15; put(ster, 0, 0.18, 0.2, this.chest);
    for (const sx of [-1, 1]) { const cl = rod(0.15, 0.012); cl.position.set(0, 0, 0); const cg = put(new THREE.Group(), 0, 0.33, 0.1, this.chest); cg.rotation.z = sx * (Math.PI / 2 - 0.15); cg.add(cl); }
    const neck = put(new THREE.Group(), 0, 0.35, 0.02, this.chest);
    for (let i = 0; i < 3; i++) { const v = knob(1); v.scale.set(0.022, 0.016, 0.022); put(v, 0, i * 0.035, 0, neck); }
    put(this.head, 0, 0.1, 0, neck);
    const cran = knob(1); cran.scale.set(0.1, 0.105, 0.118); put(cran, 0, 0.1, 0, this.head);
    const face = knob(1); face.scale.set(0.082, 0.07, 0.08); put(face, 0, 0.045, 0.045, this.head);
    this.eyes = new THREE.MeshBasicMaterial({ color: new THREE.Color(o.eye ?? 0xff8a20).multiplyScalar(2.2) });
    for (const sx of [-1, 1]) {
      const so = knob(1, DARK); so.scale.set(0.03, 0.033, 0.02); put(so, sx * 0.038, 0.075, 0.105, this.head);
      put(knob(0.011, this.eyes), sx * 0.038, 0.073, 0.12, this.head);
      const ch = knob(1); ch.scale.set(0.02, 0.016, 0.03); put(ch, sx * 0.07, 0.035, 0.08, this.head);
    }
    const nose = mesh(new THREE.ConeGeometry(0.013, 0.03, 3), DARK); nose.rotation.x = Math.PI; put(nose, 0, 0.035, 0.122, this.head);
    for (let i = 0; i < 6; i++) put(box(0.011, 0.018, 0.012), (i - 2.5) * 0.013, 0.0, 0.112 - Math.abs(i - 2.5) * 0.004, this.head);
    put(this.jaw, 0, 0.01, 0.0, this.head);
    const mand = box(0.085, 0.022, 0.06); put(mand, 0, -0.028, 0.07, this.jaw);
    for (const sx of [-1, 1]) { const ra = box(0.016, 0.05, 0.03); put(ra, sx * 0.045, -0.008, 0.035, this.jaw); }
    for (let i = 0; i < 6; i++) put(box(0.011, 0.016, 0.012), (i - 2.5) * 0.013, -0.012, 0.106 - Math.abs(i - 2.5) * 0.004, this.jaw);
    // arms
    const mk = (sx: number) => {
      const sh = put(new THREE.Group(), sx * 0.17, 0.31, 0.07, this.chest); sh.add(longBone(0.29, 0.02));
      const el = put(new THREE.Group(), 0, -0.29, 0, sh); for (const dx of [-0.011, 0.011]) put(rod(0.26, 0.012), dx, 0, 0, el);
      const hand = put(new THREE.Group(), 0, -0.27, 0, el); put(box(0.055, 0.06, 0.018), 0, -0.03, 0, hand);
      for (let i = 0; i < 4; i++) put(box(0.008, 0.055, 0.008), (i - 1.5) * 0.013, -0.085, 0.004, hand);
      const th = box(0.009, 0.045, 0.009); th.rotation.z = -sx * 0.6; put(th, -sx * 0.035, -0.05, 0.01, hand);
      return { sh, el, hand };
    };
    this.arm = { L: mk(1), R: mk(-1) };
    const lg = (sx: number) => {
      const hip = put(new THREE.Group(), sx * 0.085, -0.02, 0, this.hips); hip.add(longBone(0.43, 0.026));
      const knee = put(new THREE.Group(), 0, -0.43, 0, hip); put(knob(0.03), 0, 0, 0.025, knee); knee.add(rod(0.42, 0.022)); put(rod(0.4, 0.01), 0.025, 0, -0.005, knee);
      const foot = put(box(0.07, 0.035, 0.2), 0, -0.45, 0.06, knee); foot.rotation.x = 0;
      return { hip, knee };
    };
    this.leg = { L: lg(1), R: lg(-1) };
    // wardrobe
    const hat = o.hat ?? 'none', black = std(0x141216, 0.7), band = std(0x7a1a1a, 0.6);
    if (hat === 'top') { put(mesh(new THREE.CylinderGeometry(0.1, 0.105, 0.22, 20), black), 0, 0.31, -0.01, this.head); put(mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.012, 24), black), 0, 0.2, -0.01, this.head); put(mesh(new THREE.CylinderGeometry(0.106, 0.106, 0.035, 20), band), 0, 0.225, -0.01, this.head); }
    if (hat === 'straw') { const s = std(0xc8a058, 0.9); put(mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.012, 28), s), 0, 0.19, -0.01, this.head); put(mesh(new THREE.CylinderGeometry(0.1, 0.115, 0.09, 20), s), 0, 0.24, -0.01, this.head); put(mesh(new THREE.CylinderGeometry(0.117, 0.117, 0.025, 20), band), 0, 0.205, -0.01, this.head); }
    if (hat === 'bowler') { const dome = mesh(new THREE.SphereGeometry(0.115, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), black); put(dome, 0, 0.19, -0.01, this.head); put(mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.012, 24), black), 0, 0.19, -0.01, this.head); }
    if (hat === 'preacher') { put(mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.012, 28), black), 0, 0.19, -0.01, this.head); put(mesh(new THREE.CylinderGeometry(0.105, 0.11, 0.07, 20), black), 0, 0.225, -0.01, this.head); }
    if (hat !== 'none') this.head.children.slice(-3).forEach((c) => (c.rotation.z = ((seed % 3) - 1) * 0.08));
    if (o.tie) for (const sx of [-1, 1]) { const b = mesh(new THREE.ConeGeometry(0.03, 0.06, 4), std(0x8a1020, 0.5)); b.rotation.z = sx * Math.PI / 2; put(b, sx * 0.03, 0.34, 0.12, this.chest); }
    if (o.veil) {
      const web = tex(256, 256, (c) => { c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 1.5; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; c.beginPath(); c.moveTo(128, 0); c.lineTo(128 + Math.cos(a) * 300, Math.sin(a) * 300 + 128); c.stroke(); } for (let r = 20; r < 380; r += 26) { c.beginPath(); for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI * 2; c.lineTo(128 + Math.cos(a) * r, r * 0.6 + Math.sin(a) * r * 0.4); } c.stroke(); } });
      const veil = mesh(new THREE.CylinderGeometry(0.1, 0.32, 0.9, 24, 1, true), new THREE.MeshStandardMaterial({ map: web, alphaMap: web, transparent: true, side: THREE.DoubleSide, depthWrite: false, color: 0xffffff, emissive: 0xc0c0d0, emissiveIntensity: 0.3, roughness: 1 }), false);
      put(veil, 0, -0.25, -0.05, this.head);
      for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; put(knob(0.025, std([0x6a1030, 0xc0a0a0, 0x4a2a4a][i % 3]!, 0.7)), Math.cos(a) * 0.1, 0.2, Math.sin(a) * 0.1 - 0.01, this.head); }
    }
    if (o.robe) {
      const prof = [[0.12, 0.42], [0.2, 0.3], [0.24, 0.0], [0.27, -0.4], [0.3, -0.62]].map(([r, y]) => new THREE.Vector2(r!, y!));
      const robe = mesh(new THREE.LatheGeometry(prof, 24), std(0x18141c, 0.85, { side: THREE.DoubleSide })); put(robe, 0, 0, 0.04, this.chest);
      const col = mesh(new THREE.TorusGeometry(0.075, 0.018, 6, 20), std(0xf0f0f0, 0.5)); col.rotation.x = Math.PI / 2; put(col, 0, 0.36, 0.03, this.chest);
    }
    this.root.scale.setScalar(o.scale ?? 1);
  }
  pose(p: BonePose) {
    this.body.position.y = p.y ?? 0;
    this.hips.rotation.set(0, p.twist ?? 0, p.side ?? 0);
    this.chest.rotation.set(p.lean ?? 0, (p.twist ?? 0) * 0.5, (p.side ?? 0) * 0.6);
    const h = p.head ?? [0, 0, 0]; this.head.rotation.set(h[0], h[1], h[2]);
    this.jaw.rotation.x = (p.jaw ?? 0) * 0.45;
    for (const [k, sx] of [['L', 1], ['R', -1]] as const) {
      const a = (k === 'L' ? p.armL : p.armR) ?? [0, 0.12, 0.15], A = this.arm[k];
      A.sh.rotation.set(-a[0], 0, sx * a[1]); A.el.rotation.set(-a[2], 0, 0);
      const l = (k === 'L' ? p.legL : p.legR) ?? [0, 0], Lg = this.leg[k];
      Lg.hip.rotation.set(-l[0], 0, sx * 0.03); Lg.knee.rotation.set(l[1], 0, 0);
    }
  }
}

// ------------------------------------------------------------------------------------------------ poses (pure functions of the beat)
const sat = (x: number) => Math.max(0, Math.min(1, x));
const pulse = (beat: number, k = 3) => Math.pow(1 - (beat - Math.floor(beat)), k);
/** a knee-slapping jig: alternate kicks on the beat, arms flung, head bob, chattering jaw */
export function jig(beat: number, seed = 0): BonePose {
  const s = Math.sin(beat * Math.PI + seed), up = Math.max(0, s), dn = Math.max(0, -s), P = pulse(beat);
  return { y: 0.05 * P, lean: 0.12 + 0.08 * P, twist: 0.35 * Math.sin(beat * Math.PI * 0.5 + seed), side: 0.12 * s,
    head: [0.15 * Math.sin(beat * Math.PI * 2), 0.25 * Math.sin(beat * Math.PI * 0.5 + seed), 0.15 * s], jaw: 0.25 + 0.5 * P,
    armL: [0.6 + 1.6 * dn, 0.5 + 0.5 * dn, 1.2 - 0.6 * dn], armR: [0.6 + 1.6 * up, 0.5 + 0.5 * up, 1.2 - 0.6 * up],
    legL: [1.1 * up, 1.4 * up], legR: [1.1 * dn, 1.4 * dn] };
}
/** stomp on 1 and 3, clap on 2 and 4 */
export function stompClap(beat: number, seed = 0): BonePose {
  const b = Math.floor(beat) % 2, P = pulse(beat, 4), lift = 1 - P;
  const clap = b ? P : 0;
  return { y: -0.04 * (b ? 0 : P), lean: 0.2, twist: 0.2 * Math.sin(beat * Math.PI * 0.5 + seed), head: [0.25 * (b ? 0 : P) - 0.05, 0, 0.1 * Math.sin(beat * Math.PI * 0.5 + seed)], jaw: 0.3 + 0.6 * clap,
    armL: [1.5 + 0.9 * (1 - clap), 0.25 + 0.5 * (1 - clap), 0.6], armR: [1.5 + 0.9 * (1 - clap), 0.25 + 0.5 * (1 - clap), 0.6],
    legL: [b ? 0 : 0.7 * lift, b ? 0 : 1.0 * lift], legR: [0.05, 0.1] };
}
export function banjo(beat: number): BonePose {
  const st = Math.sin(beat * Math.PI * 4);
  return { lean: 0.08, twist: 0.08 * Math.sin(beat * Math.PI * 0.5), head: [0.2 + 0.1 * pulse(beat), -0.3, 0.12], jaw: 0.2 + 0.4 * pulse(beat * 2),
    armL: [0.55, 0.9, 1.25], armR: [0.25, -0.45 + 0.08 * st, 1.55 + 0.12 * st], legL: [0.12 * pulse(beat), 0.25 * pulse(beat)], legR: [0, 0.05] };
}
export function fiddle(beat: number): BonePose {
  const bow = Math.sin(beat * Math.PI);
  return { lean: 0.05, side: -0.08, twist: -0.1, head: [0.35, 0.45, -0.35], jaw: 0.15,
    armL: [1.3, 0.35, 0.9], armR: [0.9 + 0.15 * bow, -0.95 - 0.35 * bow, 1.2 + 0.5 * bow], legL: [0, 0], legR: [0.15 * pulse(beat), 0.3 * pulse(beat)] };
}
export function drummer(beat: number): BonePose {
  const hL = pulse(beat, 6), hR = pulse(beat + 0.5, 6);
  return { y: -0.42, lean: 0.25, head: [0.25 * pulse(beat), 0.1 * Math.sin(beat), 0], jaw: 0.3 * pulse(beat),
    armL: [0.9 - 0.5 * hL, 0.35, 1.3 - 0.6 * hL], armR: [0.9 - 0.5 * hR, 0.35, 1.3 - 0.6 * hR], legL: [1.5, 1.5 - 0.2 * pulse(beat)], legR: [1.5, 1.55] };
}
export function singer(beat: number, vocal: number): BonePose {
  const P = pulse(beat);
  return { lean: 0.1 + 0.05 * P, twist: 0.15 * Math.sin(beat * Math.PI * 0.25), side: 0.06 * Math.sin(beat * Math.PI), head: [-0.15 + 0.12 * P, 0.15 * Math.sin(beat * Math.PI * 0.25), 0.1 * Math.sin(beat * Math.PI)], jaw: sat(vocal * 1.6),
    armL: [1.2, 0.25, 1.4], armR: [0.9 + 0.8 * sat(vocal), 0.6 + 0.4 * Math.sin(beat * Math.PI * 0.5), 0.7], legL: [0.08 * P, 0.15 * P], legR: [0, 0] };
}

// ------------------------------------------------------------------------------------------------ instruments
const wood = std(0x7a4a26, 0.55), dwood = std(0x3a2214, 0.6), metal = std(0xb8b0a0, 0.3, { metalness: 0.8 });
export function makeBanjo() {
  const g = new THREE.Group();
  const head = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.012, 32), std(0xf0e6d0, 0.7)); head.rotation.x = Math.PI / 2; put(head, 0, 0, 0.03, g);
  const rim = mesh(new THREE.TorusGeometry(0.165, 0.018, 8, 32), metal); put(rim, 0, 0, 0.03, g);
  const pot = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 32, 1, true), wood); pot.rotation.x = Math.PI / 2; g.add(pot);
  const neck = box(0.045, 0.62, 0.025, dwood); put(neck, 0, 0.47, 0.03, g); const peg = box(0.065, 0.12, 0.03, dwood); put(peg, 0, 0.82, 0.03, g);
  for (let i = 0; i < 5; i++) { const s = box(0.0025, 0.92, 0.002, metal); put(s, (i - 2) * 0.008, 0.36, 0.045, g); }
  g.rotation.z = -1.0; return g;
}
export function makeFiddle() {
  const g = new THREE.Group(), body = knob(1, std(0x8a3a14, 0.35)); body.scale.set(0.1, 0.18, 0.04); g.add(body);
  const waist = knob(1, std(0x8a3a14, 0.35)); waist.scale.set(0.075, 0.08, 0.041); put(waist, 0, 0.12, 0, g);
  put(box(0.03, 0.22, 0.02, dwood), 0, 0.3, 0.02, g); const scroll = knob(0.022, dwood); put(scroll, 0, 0.43, 0.02, g);
  for (let i = 0; i < 4; i++) put(box(0.002, 0.5, 0.002, metal), (i - 1.5) * 0.007, 0.15, 0.045, g);
  return g;
}
export function makeBow() { const g = new THREE.Group(); put(box(0.008, 0.62, 0.008, dwood), 0, -0.3, 0, g); put(box(0.002, 0.6, 0.002, std(0xf0ece0, 0.9)), 0.015, -0.3, 0, g); return g; }
export function makeStick() { const g = new THREE.Group(); const s = box(0.012, 0.36, 0.012, std(0xd8c090, 0.6)); s.rotation.x = Math.PI / 2 - 0.3; put(s, 0, -0.08, 0.15, g); return g; }
export function makeDrums() {
  const g = new THREE.Group();
  const logo = tex(512, 512, (c) => { c.fillStyle = '#e8dcc0'; c.fillRect(0, 0, 512, 512); c.fillStyle = '#1a1214'; c.textAlign = 'center'; c.font = 'bold 74px Georgia'; c.fillText('THE', 256, 150); c.font = 'bold 96px Georgia'; c.fillText('BONEYARD', 256, 250); c.font = 'italic 64px Georgia'; c.fillText('ramblers', 256, 340);
   
    c.beginPath(); c.arc(256, 420, 40, 0, 7); c.fill(); c.fillStyle = '#e8dcc0'; for (const x of [240, 272]) { c.beginPath(); c.arc(x, 415, 10, 0, 7); c.fill(); } });
  logo.center.set(0.5, 0.5); logo.rotation = Math.PI / 2;
  const bd = mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.3, 32), [std(0x6a1418, 0.5), std(0xe8dcc0, 0.7, { map: logo }), std(0xe8dcc0, 0.7)]); bd.rotation.x = Math.PI / 2; put(bd, 0, 0.32, 0.45, g);
  const sn = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.12, 24), [std(0xc0c0c8, 0.3, { metalness: 0.7 }), std(0xf0ece0, 0.7), std(0xf0ece0, 0.7)]); put(sn, -0.28, 0.62, 0.32, g); sn.rotation.x = 0.2;
  put(rod(0.55, 0.012, metal), -0.28, 0.56, 0.32, g);
  const cy = mesh(new THREE.CylinderGeometry(0.22, 0.01, 0.03, 24), std(0xc8a040, 0.25, { metalness: 0.9 })); put(cy, 0.36, 1.05, 0.3, g); cy.rotation.z = 0.15; put(rod(1.0, 0.01, metal), 0.36, 1.03, 0.3, g);
  const seat = box(0.5, 0.42, 0.9, dwood); put(seat, 0, 0.21, -0.12, g); // the drummer sits on a coffin
  return g;
}
export function makeMic() {
  const g = new THREE.Group(); put(rod(1.5, 0.012, metal), 0, 1.5, 0, g); put(mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 20), metal), 0, 0.01, 0, g);
  const cap = mesh(new THREE.CapsuleGeometry(0.04, 0.07, 4, 12), std(0x9a9a9a, 0.35, { metalness: 0.8 })); put(cap, 0, 1.55, 0, g); put(mesh(new THREE.TorusGeometry(0.06, 0.008, 6, 20), metal), 0, 1.55, 0, g);
  return g;
}

// ------------------------------------------------------------------------------------------------ the boneyard
export const STAGE = { z: -8.6, y: 0.42 }; // top of the wooden stage in front of the mausoleum
export const GRAVE = { x: 3.4, z: -1.6 }; // Uncle Silas's grave (open)

export class Boneyard {
  scene = new THREE.Scene();
  band: { banjo: Skeleton; fiddle: Skeleton; drums: Skeleton; silas: Skeleton } ; bride: Skeleton; groom: Skeleton; preacher: Skeleton; crowd: Skeleton[] = [];
  pumpkins: Pumpkin[] = []; lamps: THREE.MeshBasicMaterial[] = []; wisps!: THREE.InstancedMesh; mist: THREE.Sprite[] = []; owlEyes!: THREE.MeshBasicMaterial;
  sky: THREE.ShaderMaterial; moonL: THREE.DirectionalLight; sunL: THREE.DirectionalLight; hemi: THREE.HemisphereLight; moonGroup = new THREE.Group(); sun!: THREE.Mesh; stars!: THREE.InstancedMesh;
  moonDir = new THREE.Vector3(0.28, 0.34, -1).normalize(); sunDir = new THREE.Vector3(-0.9, 0.06, -0.45).normalize();
  private fogNight = new THREE.Color(0.1, 0.12, 0.2); private fogDawn = new THREE.Color(0.62, 0.45, 0.42);
  constructor() {
    const s = this.scene, R = mulberry(77);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), V = new THREE.Vector3(), C = new THREE.Color(), E = new THREE.Euler();
    // sky: indigo night with a green-teal horizon glow; dawn mixes to peach / rose with a low sun
    this.sky = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { md: { value: this.moonDir }, sd: { value: this.sunDir }, dawn: { value: 0 } },
      vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `varying vec3 vp; uniform vec3 md, sd; uniform float dawn; void main(){ float y = vp.y;
        vec3 hor = mix(vec3(0.16,0.28,0.3), vec3(1.0,0.62,0.42), dawn), mid = mix(vec3(0.06,0.07,0.18), vec3(0.62,0.5,0.62), dawn), top = mix(vec3(0.015,0.015,0.06), vec3(0.3,0.38,0.62), dawn);
        vec3 c = y < 0.15 ? mix(hor, mid, smoothstep(-0.02, 0.15, y)) : mix(mid, top, smoothstep(0.15, 0.75, y));
        float g = max(0.0, dot(vp, md)); c += (1.0 - dawn) * (vec3(0.6,0.9,0.8) * pow(g, 80.0) * 0.5 + vec3(0.3,0.4,0.45) * pow(g, 6.0) * 0.25);
        float h = max(0.0, dot(vp, sd)); c += dawn * (vec3(1.0,0.7,0.35) * pow(h, 12.0) * 1.2 + vec3(1.0,0.5,0.3) * pow(h, 3.0) * 0.3); gl_FragColor = vec4(c, 1.0); }` });
    s.add(new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), this.sky));
    this.stars = new THREE.InstancedMesh(new THREE.SphereGeometry(0.9, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, transparent: true }), 700);
    for (let i = 0; i < 700; i++) { const a = R() * Math.PI * 2, e = 0.12 + Math.pow(R(), 0.7) * 1.3; V.set(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)).multiplyScalar(850); M.compose(V, Q.identity(), S.setScalar(0.5 + R() * 1.6)); this.stars.setMatrixAt(i, M); this.stars.setColorAt(i, C.setRGB(0.9, 1, 0.95).multiplyScalar(0.6 + R() * 1.2)); }
    s.add(this.stars);
    // a pale-green full moon, a bit eerie, and its halo
    const moon = new THREE.Mesh(new THREE.CircleGeometry(55, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 2.1, 1.7), fog: false, map: tex(256, 256, (c) => { c.fillStyle = '#fff'; c.fillRect(0, 0, 256, 256); c.fillStyle = 'rgba(120,150,140,0.35)'; for (const [x, y, r] of [[90, 100, 30], [160, 150, 22], [120, 180, 14], [170, 80, 12], [70, 170, 10]]) { c.beginPath(); c.arc(x!, y!, r!, 0, 7); c.fill(); } }) }));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(256, 256, (c) => { const g = c.createRadialGradient(128, 128, 20, 128, 128, 128); g.addColorStop(0, 'rgba(170,230,210,0.8)'); g.addColorStop(1, 'rgba(120,200,190,0)'); c.fillStyle = g; c.fillRect(0, 0, 256, 256); }), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
    halo.scale.setScalar(300); this.moonGroup.add(moon, halo); this.moonGroup.position.copy(this.moonDir).multiplyScalar(700); moon.lookAt(0, 0, 0); s.add(this.moonGroup);
    this.sun = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2, 1.1), fog: false, transparent: true }));
    this.sun.position.copy(this.sunDir).multiplyScalar(700); this.sun.lookAt(0, 0, 0); s.add(this.sun);
    s.fog = new THREE.FogExp2(this.fogNight.clone(), 0.035);
    this.moonL = new THREE.DirectionalLight(0xb0d8ff, 1.15); this.moonL.position.copy(this.moonDir).multiplyScalar(60); this.moonL.castShadow = true; this.moonL.shadow.mapSize.set(2048, 2048);
    Object.assign(this.moonL.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 150 }); this.moonL.shadow.bias = -0.0005; this.moonL.shadow.radius = 4; s.add(this.moonL, this.moonL.target);
    this.sunL = new THREE.DirectionalLight(0xffb070, 0); this.sunL.position.copy(this.sunDir).multiplyScalar(60); s.add(this.sunL, this.sunL.target);
    this.hemi = new THREE.HemisphereLight(0x4a6a9a, 0x1a1418, 0.6); s.add(this.hemi);
    // ground: mottled dark grass and soil + dead grass tufts
    const groundTex = tex(1024, 1024, (c) => { c.fillStyle = '#2a2c1e'; c.fillRect(0, 0, 1024, 1024); const r = mulberry(5); for (let i = 0; i < 2500; i++) { c.fillStyle = `rgba(${[60, 48, 30][i % 3]},${[58, 44, 40][i % 3]},${[34, 28, 26][i % 3]},${0.25 + r() * 0.3})`; c.beginPath(); c.arc(r() * 1024, r() * 1024, 4 + r() * 30, 0, 7); c.fill(); } });
    groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping; groundTex.repeat.set(30, 30);
    const ground = mesh(new THREE.PlaneGeometry(400, 400), std(0xffffff, 1, { map: groundTex }), false); ground.rotation.x = -Math.PI / 2; s.add(ground);
    const gm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide });
    const N = 30000, grass = new THREE.InstancedMesh(bladeGeometry(new THREE.Color(0x1e2016), new THREE.Color(0xffffff)), gm, N); grass.frustumCulled = false; grass.receiveShadow = true;
    const tips = [0x8a8a5a, 0x6a7048, 0x9a8a60].map((c) => new THREE.Color(c)); const hide = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < N; i++) {
      const x = (R() - 0.5) * 36, z = 8 - R() * 30;
      if ((Math.abs(x) < 4.2 && z < -6.6 && z > -13) || Math.hypot(x - GRAVE.x, z - GRAVE.z) < 1.6 || (Math.abs(x) < 1 && z > -7)) { grass.setMatrixAt(i, hide); continue; }
      M.compose(V.set(x, 0, z), Q.setFromEuler(E.set((R() - 0.5) * 0.5, R() * 6.28, (R() - 0.5) * 0.5)), S.set(1.2, 0.2 + R() * 0.45, 1.2));
      grass.setMatrixAt(i, M); grass.setColorAt(i, C.copy(tips[i % 3]!).multiplyScalar(0.6 + R() * 0.4));
    }
    s.add(grass);
    // headstones in loose crooked rows (an aisle down the middle to the stage)
    const stoneTex = tex(256, 256, (c) => { c.fillStyle = '#8a8c88'; c.fillRect(0, 0, 256, 256); const r = mulberry(9); for (let i = 0; i < 600; i++) { c.fillStyle = r() < 0.3 ? `rgba(70,96,50,${0.2 + r() * 0.4})` : `rgba(${r() < 0.5 ? 40 : 160},${r() < 0.5 ? 40 : 160},${r() < 0.5 ? 40 : 150},0.12)`; c.beginPath(); c.arc(r() * 256, r() * 256, 2 + r() * 14, 0, 7); c.fill(); } });
    const stoneM = std(0xffffff, 0.95, { map: stoneTex }), stoneDark = std(0x9a9a98, 0.95, { map: stoneTex });
    const names = ['R.I.P.', 'HERE LIES', 'REST', 'ELMER', 'MABEL', 'OTIS', 'CLEM', 'HATTIE', '1887', 'GONE FISHIN'];
    const headstone = (x: number, z: number, kind: number, k: number, label?: string) => {
      const g = new THREE.Group(), m = kind % 2 ? stoneM : stoneDark;
      if (kind === 0 || kind === 3) { put(box(0.6, 0.7, 0.14, m), 0, 0.35, 0, g); const tg = new THREE.CylinderGeometry(0.3, 0.3, 0.14, 24, 1, false, Math.PI / 2, Math.PI); tg.rotateX(Math.PI / 2); put(mesh(tg, m), 0, 0.7, 0, g); }
      if (kind === 1) { put(box(0.12, 1.0, 0.12, m), 0, 0.5, 0, g); put(box(0.5, 0.12, 0.12, m), 0, 0.72, 0, g); }
      if (kind === 2) { put(box(0.34, 0.12, 0.34, m), 0, 0.06, 0, g); const ob = mesh(new THREE.CylinderGeometry(0.08, 0.14, 1.3, 4), m); ob.rotation.y = Math.PI / 4; put(ob, 0, 0.77, 0, g); put(mesh(new THREE.ConeGeometry(0.11, 0.18, 4), m), 0, 1.5, 0, g); }
      if (kind === 4) { put(box(0.8, 0.45, 0.16, m), 0, 0.22, 0, g); }
      if (label && kind !== 1 && kind !== 2) {
        const lt = tex(256, 256, (c) => { c.fillStyle = 'rgba(20,20,22,0.85)'; c.textAlign = 'center'; c.font = 'bold 52px Georgia'; c.fillText(label, 128, 110); c.font = '28px Georgia'; c.fillText('~ rest easy ~', 128, 160); });
        const p = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.56), new THREE.MeshStandardMaterial({ map: lt, transparent: true, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 })); put(p, 0, kind === 4 ? 0.2 : 0.48, 0.072, g);
      }
      g.position.set(x, 0, z); g.rotation.set((R() - 0.5) * 0.12, (R() - 0.5) * 0.3, (R() - 0.5) * 0.16); g.scale.setScalar(k); s.add(g); return g;
    };
    let ni = 0;
    for (let row = 0; row < 6; row++) for (let col = 0; col < 9; col++) {
      const z = 5 - row * 2.4 + (R() - 0.5) * 0.5, x = -11 + col * 2.75 + (R() - 0.5) * 0.8;
      if (Math.abs(x) < 1.4 || Math.hypot(x - GRAVE.x, z - GRAVE.z) < 1.8 || R() < 0.12) continue;
      headstone(x, z, Math.floor(R() * 5), 0.85 + R() * 0.4, R() < 0.5 ? names[ni++ % names.length] : undefined);
    }
    // Silas's grave: a dark hole, the dug-up soil, his headstone
    const hole = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.9), new THREE.MeshBasicMaterial({ color: 0x050405 })); hole.rotation.x = -Math.PI / 2; put(hole, GRAVE.x, 0.012, GRAVE.z, s);
    const mound = mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), std(0x3a2a1c, 1)); mound.scale.set(0.5, 0.35, 1.0); put(mound, GRAVE.x + 1.0, 0, GRAVE.z, s);
    headstone(GRAVE.x, GRAVE.z - 1.25, 0, 1.15, 'SILAS');
    // the mausoleum and its wooden stage
    const marble = std(0xb0b0aa, 0.7, { map: stoneTex }), maus = new THREE.Group();
    put(box(6, 3.6, 4, marble), 0, 1.8, 0, maus); put(box(6.6, 0.3, 4.6, marble), 0, 3.75, 0, maus);
    const pedG = new THREE.CylinderGeometry(1, 1, 4.6, 3); pedG.rotateX(Math.PI / 2); pedG.rotateZ(Math.PI); // triangular pediment, apex up const pedM = mesh(pedG, marble); pedM.scale.set(3.3, 0.9, 1); put(pedM, 0, 4.35, 0, maus);
    for (const x of [-2.4, -1.2, 1.2, 2.4]) put(mesh(new THREE.CylinderGeometry(0.18, 0.2, 3.4, 16), marble), x, 1.7, 2.25, maus);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.45, 0.9, 0.5) })); put(door, 0, 1.2, 2.01, maus);
    const sign = tex(1024, 160, (c) => { c.fillStyle = '#20201e'; c.textAlign = 'center'; c.font = 'bold 110px Georgia'; c.fillText('REST  IN  PEACE', 512, 120); });
    const sp = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 0.7), new THREE.MeshStandardMaterial({ map: sign, transparent: true, polygonOffset: true, polygonOffsetFactor: -2 })); put(sp, 0, 3.75, 2.31, maus);
    const doorL = new THREE.PointLight(0x80ff9a, 2.5, 9, 1.6); put(doorL, 0, 1.5, 3.0, maus);
    maus.position.set(0, 0, -12.2); s.add(maus);
    const stage = mesh(new THREE.BoxGeometry(8, STAGE.y, 3.6), std(0x5a3a22, 0.85)); put(stage, 0, STAGE.y / 2, STAGE.z, s);
    for (let i = 0; i < 16; i++) put(box(0.02, 0.005, 3.6, std(0x2a1a10)), -4 + i * 0.5, STAGE.y + 0.003, STAGE.z, s);
    // the old cedar (crooked, bare-ish) with an owl, and an iron fence at the back
    const bark = std(0x2a201a, 0.95), cedar = new THREE.Group();
    const trunk = mesh(new THREE.CylinderGeometry(0.3, 0.55, 5.5, 9), bark); trunk.rotation.z = 0.12; put(trunk, 0, 2.7, 0, cedar);
    for (let i = 0; i < 7; i++) { const a = i * 2.3, br = mesh(new THREE.CylinderGeometry(0.05, 0.16, 2.6 + R(), 6), bark); br.position.set(Math.cos(a) * 0.9, 4.2 + i * 0.35, Math.sin(a) * 0.9); br.rotation.set(Math.sin(a) * 1.0, 0, -Math.cos(a) * 1.0); cedar.add(br); }
    const needles = [std(0x1a2a22, 0.9), std(0x22301e, 0.9)];
    for (let i = 0; i < 6; i++) { const b = mesh(new THREE.IcosahedronGeometry(0.9 + R() * 0.6, 1), needles[i % 2]!); b.scale.y = 0.45; b.position.set((R() - 0.5) * 3.4, 5 + R() * 2.2, (R() - 0.5) * 3); cedar.add(b); }
    const owl = new THREE.Group(), owlM = std(0x5a4a3a, 0.9);
    put(knob(1, owlM), 0, 0, 0, owl).scale.set(0.24, 0.32, 0.22); put(knob(0.19, owlM), 0, 0.33, 0, owl);
    this.owlEyes = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.8, 0.3) });
    for (const sx of [-1, 1]) { put(knob(0.05, this.owlEyes), sx * 0.08, 0.36, 0.15, owl); put(mesh(new THREE.ConeGeometry(0.05, 0.13, 6), owlM), sx * 0.11, 0.5, 0, owl); }
    const obr = mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.0, 6), bark); obr.rotation.z = Math.PI / 2; put(obr, 1.0, 3.9, 0.3, cedar); put(owl, 1.4, 4.25, 0.3, cedar); owl.rotation.y = 0.5;
    cedar.position.set(-6.2, 0, -8.5); s.add(cedar);
    const iron = std(0x18161a, 0.5, { metalness: 0.6 }), barG = new THREE.CylinderGeometry(0.02, 0.02, 1.6, 6), tipG = new THREE.ConeGeometry(0.045, 0.14, 6);
    const bars = new THREE.InstancedMesh(barG, iron, 260), tipsM = new THREE.InstancedMesh(tipG, iron, 260);
    for (let i = 0; i < 260; i++) { const x = -26 + i * 0.2; M.compose(V.set(x, 0.8, -16 + Math.sin(x * 0.3) * 0.2), Q.setFromEuler(E.set((R() - 0.5) * 0.08, 0, (R() - 0.5) * 0.08)), S.set(1, 1, 1)); bars.setMatrixAt(i, M); M.compose(V.set(x, 1.66, -16 + Math.sin(x * 0.3) * 0.2), Q.identity(), S.set(1, 1, 1)); tipsM.setMatrixAt(i, M); }
    bars.castShadow = true; s.add(bars, tipsM); for (const y of [0.25, 1.35]) put(box(52, 0.04, 0.04, iron), 0, y, -16, s);
    // distant pines (silhouettes in the fog)
    const pineM = std(0x141e1c, 0.9);
    for (let i = 0; i < 40; i++) { const g = new THREE.Group(), k = 1 + R() * 0.8; for (let j = 0; j < 4; j++) put(mesh(new THREE.ConeGeometry(2.2 - j * 0.45, 2.4, 9), pineM), 0, 1.8 + j * 1.4, 0, g); g.position.set(-34 + i * 1.8 + (R() - 0.5), 0, -22 - R() * 10); g.scale.setScalar(k); s.add(g); }
    // lantern posts with strings of bulbs over the stage and the aisle
    const post = (x: number, z: number) => { put(rod(3.2, 0.05, dwood), x, 3.2, z, s); const L = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.26, 0.18), this.lamp(new THREE.Color(2.6, 1.5, 0.5))); put(L, x, 3.05, z + 0.12, s); return new THREE.Vector3(x, 3.1, z); };
    const posts = [post(-4.4, -6.9), post(4.4, -6.9), post(-1.8, 1.5), post(1.8, 1.5), post(-1.8, 6), post(1.8, 6)];
    for (const [a, b] of [[0, 1], [0, 2], [1, 3], [2, 3], [2, 4], [3, 5], [4, 5]] as const) {
      const A = posts[a]!, B = posts[b]!, n = Math.round(A.distanceTo(B) / 0.45);
      for (let i = 1; i < n; i++) { const u = i / n, p = A.clone().lerp(B, u); p.y -= Math.sin(u * Math.PI) * 0.45; const bulb = new THREE.Mesh(G.knob, this.lamp(new THREE.Color(...([[2.8, 1.4, 0.4], [1.2, 2.6, 0.8], [2.6, 0.6, 1.6]][i % 3] as [number, number, number])))); bulb.scale.setScalar(0.05); bulb.position.copy(p); s.add(bulb); }
    }
    for (const [x, z] of [[-3.2, -5], [3.2, -5], [0, 1.2]] as const) { const pl = new THREE.PointLight(0xffa860, 2.5, 9, 1.6); put(pl, x, 2.6, z, s); }
    const stageSpot = new THREE.SpotLight(0xffe0b0, 30, 18, 0.6, 0.6, 1.4); stageSpot.position.set(0, 6, -3); stageSpot.target.position.set(0, 1, STAGE.z); s.add(stageSpot, stageSpot.target);
    // jack-o'-lanterns on the stage edge and among the graves
    [[-3.6, STAGE.y, -6.95, 0.7], [3.6, STAGE.y, -6.95, 0.7], [-2.4, 0, -4.5, 0.8], [2.2, 0, 2.6, 0.75], [-5.5, 0, 0.5, 0.9], [GRAVE.x - 1.5, 0, GRAVE.z - 1.6, 0.6]].forEach(([x, y, z, k], i) => {
      const p = new Pumpkin(k!, true, i + 3); p.root.position.set(x!, y! + 0.32 * k!, z!); p.root.rotation.y = (R() - 0.5) * 0.6; s.add(p.root); this.pumpkins.push(p);
    });
    // will-o'-wisps and low mist
    this.wisps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 3, 1.6) }), 40); this.wisps.frustumCulled = false; s.add(this.wisps);
    const mistTex = tex(256, 256, (c) => { const g = c.createRadialGradient(128, 128, 10, 128, 128, 128); g.addColorStop(0, 'rgba(200,220,230,0.5)'); g.addColorStop(1, 'rgba(200,220,230,0)'); c.fillStyle = g; c.fillRect(0, 0, 256, 256); });
    for (let i = 0; i < 46; i++) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, transparent: true, depthWrite: false, opacity: 0.22, color: 0xb8c8d8 })); m.scale.set(7, 2.2, 1); m.position.set((R() - 0.5) * 30, 0.35 + R() * 0.4, 7 - R() * 24); m.userData.x0 = m.position.x; this.mist.push(m); s.add(m); }
    // the cast
    const silas = new Skeleton(1, { hat: 'top', scale: 1.04 }), bj = new Skeleton(2, { hat: 'straw' }), fd = new Skeleton(3, { hat: 'bowler', eye: 0x60ff90 }), dr = new Skeleton(4, { hat: 'none', eye: 0xff4060 });
    this.band = { banjo: bj, fiddle: fd, drums: dr, silas };
    const banjoI = makeBanjo(); put(banjoI, -0.02, 0.0, 0.22, bj.chest); banjoI.rotation.x = -0.1;
    const fid = makeFiddle(); put(fid, 0.1, 0.36, 0.2, fd.chest); fid.rotation.set(Math.PI / 2 - 0.25, Math.PI, 0.5); const bow = makeBow(); bow.rotation.set(1.4, 0, 0.3); put(bow, 0, -0.06, 0, fd.arm.R.hand);
    for (const k of ['L', 'R'] as const) dr.arm[k].hand.add(makeStick());
    const kit = makeDrums(); put(kit, -1.0, STAGE.y, -9.5, s); kit.rotation.y = 0.25;
    const mic = makeMic(); put(mic, 0.55, STAGE.y, -7.45, s);
    this.groom = new Skeleton(5, { hat: 'top', tie: true }); this.bride = new Skeleton(6, { veil: true, eye: 0xff70c0, scale: 0.94 }); this.preacher = new Skeleton(7, { hat: 'preacher', robe: true });
    const book = box(0.18, 0.24, 0.05, std(0x2a1010, 0.7)); book.rotation.x = -0.6; put(book, 0, -0.06, 0.06, this.preacher.arm.L.hand);
    const hats: Hat[] = ['none', 'bowler', 'straw', 'none', 'top', 'none', 'straw', 'none', 'bowler', 'none'], eyes = [0xff8a20, 0x60ff90, 0xff4060, 0x80c0ff];
    for (let i = 0; i < 10; i++) this.crowd.push(new Skeleton(10 + i, { hat: hats[i]!, eye: eyes[i % 4], scale: 0.9 + R() * 0.2 }));
    [silas, bj, fd, dr, this.groom, this.bride, this.preacher, ...this.crowd].forEach((k) => s.add(k.root));
  }
  private lamp(c: THREE.Color) { const m = new THREE.MeshBasicMaterial({ color: c }); m.userData.c = c.clone(); this.lamps.push(m); return m; }
  /** place the cast for a shot; t = song time (or shot-local time for the rising / sinking moves) */
  layout(mode: 'band' | 'rise' | 'silas' | 'dance' | 'wedding' | 'dawn' | 'empty' | 'reach', t: number, beat: number, vocal: number) {
    const { banjo: bj, fiddle: fd, drums: dr, silas } = this.band, all = [silas, bj, fd, dr, this.groom, this.bride, this.preacher, ...this.crowd];
    all.forEach((k) => { k.root.visible = true; k.root.position.y = 0; k.root.rotation.set(0, 0, 0); });
    // the band always plays on the stage (Silas comes on stage once he is up)
    bj.root.position.set(-2.3, STAGE.y, -8.2); bj.root.rotation.y = 0.35; bj.pose(banjo(beat));
    fd.root.position.set(2.3, STAGE.y, -8.3); fd.root.rotation.y = -0.4; fd.pose(fiddle(beat));
    dr.root.position.set(-1.0, STAGE.y, -9.75); dr.root.rotation.y = 0.25; dr.pose(drummer(beat));
    silas.root.position.set(0.55, STAGE.y, -7.95); silas.pose(singer(beat, vocal));
    // the wedding party and the crowd among the graves
    const crowdOn = mode === 'dance' || mode === 'band' || mode === 'wedding' || mode === 'reach';
    this.crowd.forEach((k, i) => {
      k.root.visible = crowdOn;
      const row = Math.floor(i / 5), col = i % 5, x = (col - 2) * 2.0 + (row ? 1.0 : 0) + Math.sin(i * 7.1) * 0.3, z = -4.6 + row * 2.6 + Math.cos(i * 3.3) * 0.4;
      k.root.position.set(x, 0, z); k.root.rotation.y = Math.atan2(-x * 0.3, 1) + Math.sin(beat * Math.PI * 0.25 + i) * 0.3;
      k.pose(mode === 'reach' ? { ...jig(beat, i), lean: -0.15, head: [-0.5, 0.2 * Math.sin(i), 0.1 * Math.sin(beat * Math.PI)], armL: [2.9, 0.35 + 0.1 * Math.sin(beat * Math.PI + i), 0.15], armR: [2.9, 0.35 + 0.1 * Math.cos(beat * Math.PI + i), 0.15] } : i % 3 === 1 ? stompClap(beat, i) : jig(beat, i));
    });
    const wed = mode === 'wedding' || mode === 'band' || mode === 'dance' || mode === 'reach';
    this.groom.root.visible = this.bride.root.visible = this.preacher.root.visible = wed;
    // bride and groom swing around each other, holding hands
    const a = beat * Math.PI * 0.25, cx = -0.1, cz = -0.6;
    this.groom.root.position.set(cx + Math.cos(a) * 0.42, 0, cz + Math.sin(a) * 0.42); this.bride.root.position.set(cx - Math.cos(a) * 0.42, 0, cz - Math.sin(a) * 0.42);
    this.groom.root.rotation.y = -a - Math.PI / 2; this.bride.root.rotation.y = -a + Math.PI / 2;
    const sw = (seed: number): BonePose => { const P = pulse(beat); return { y: 0.04 * P, lean: -0.05, side: 0.1 * Math.sin(beat * Math.PI + seed), head: [-0.1, 0.4, 0.15 * Math.sin(beat * Math.PI)], jaw: 0.3 + 0.3 * P, armL: [1.4, 0.15, 0.2], armR: [1.4, 0.15, 0.2], legL: [0.6 * Math.max(0, Math.sin(beat * Math.PI + seed)), 0.8 * Math.max(0, Math.sin(beat * Math.PI + seed))], legR: [0.6 * Math.max(0, -Math.sin(beat * Math.PI + seed)), 0.8 * Math.max(0, -Math.sin(beat * Math.PI + seed))] }; };
    this.groom.pose(sw(0)); this.bride.pose(sw(1.2));
    this.preacher.root.position.set(-1.9, 0, -2.3); this.preacher.root.rotation.y = 0.7;
    const laugh = pulse(beat * 2, 2); this.preacher.pose({ lean: -0.25 + 0.3 * laugh, head: [-0.45 + 0.2 * laugh, 0.3, 0], jaw: 0.6 + 0.4 * laugh, armL: [0.9, 0.2, 1.3], armR: [0.25, 0.25, 1.9], legL: [0, 0], legR: [0, 0] });
    if (mode === 'rise' || mode === 'silas' || mode === 'dawn') {
      // Silas at his grave instead of on stage
      silas.root.position.set(GRAVE.x, 0, GRAVE.z + 0.2);
      if (mode === 'rise') { const u = sat((t + 0.6) / 3.2), y = -1.75 + 1.25 * (1 - Math.pow(1 - u, 2)); silas.root.position.y = y; silas.pose({ lean: 0.2, head: [-0.5 + 0.4 * u, 0.2 * Math.sin(t * 3), 0], jaw: 0.2 + 0.6 * pulse(beat), armR: [3.0, 0.15, 0.2 + 0.4 * Math.sin(t * 6) ** 2], armL: [2.4 * u, 0.6, 0.8], legL: [0, 0], legR: [0, 0] }); }
      if (mode === 'silas') { const brush = Math.sin(t * 5); silas.pose({ lean: 0.05, twist: 0.1, head: [-0.08, -0.15 + 0.15 * Math.sin(t * 0.8), 0.1], jaw: 0.15 + 0.5 * sat(vocal * 1.5), armR: [1.6, 0.0, 2.2 + 0.2 * brush], armL: [0.3, 0.2, 0.4], legL: [0, 0], legR: [0, 0] }); }
      if (mode === 'dawn') { const u = sat(t / 4), y = -1.3 * u * u; silas.root.position.y = y; silas.root.rotation.y = -0.4; silas.pose({ lean: 0.05, head: [0.1, 0.2, 0.15 * Math.sin(t * 4)], jaw: 0.4, armL: [0.1, 0.15, 0.2], armR: [2.6, 0.35 + 0.35 * Math.sin(t * 7), 0.5], legL: [0, 0], legR: [0, 0] }); } // waves goodbye as he sinks
      if (mode === 'dawn') { bj.root.visible = fd.root.visible = dr.root.visible = false; }
    }
  }
  dawn = 0;
  update(t: number) {
    const d = this.dawn;
    this.sky.uniforms.dawn!.value = d;
    (this.scene.fog as THREE.FogExp2).color.copy(this.fogNight).lerp(this.fogDawn, d); (this.scene.fog as THREE.FogExp2).density = 0.035 - 0.012 * d;
    this.moonL.intensity = 1.15 * (1 - d); this.sunL.intensity = 2.2 * d; this.hemi.intensity = 0.6 + 0.6 * d; this.hemi.color.setRGB(0.29 + 0.6 * d, 0.42 + 0.3 * d, 0.6);
    this.moonGroup.visible = d < 0.6; (this.sun.material as THREE.MeshBasicMaterial).opacity = d; (this.stars.material as THREE.MeshBasicMaterial).opacity = 1 - d;
    this.pumpkins.forEach((p) => p.update(t));
    this.lamps.forEach((m, i) => m.color.copy(m.userData.c).multiplyScalar((0.85 + 0.15 * Math.sin(t * 9 + i * 1.7)) * (1 - 0.6 * d)));
    const M = new THREE.Matrix4(), V = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3();
    for (let i = 0; i < 40; i++) { V.set(Math.sin(i * 12.9 + t * 0.3) * 9 + Math.sin(t * 1.3 + i) * 0.4, 0.6 + 0.8 * ((i * 0.37) % 1) + 0.25 * Math.sin(t * 1.7 + i * 2), 4 - ((i * 5.31) % 18) + Math.cos(t * 0.4 + i) * 0.8); M.compose(V, Q, S.setScalar((1 - d) * (0.7 + 0.5 * Math.sin(t * 4 + i)))); this.wisps.setMatrixAt(i, M); }
    this.wisps.instanceMatrix.needsUpdate = true;
    this.mist.forEach((m, i) => { m.position.x = m.userData.x0 + Math.sin(t * 0.15 + i) * 1.5; m.material.opacity = 0.2 + 0.06 * Math.sin(t * 0.5 + i); });
    this.owlEyes.color.setRGB(2.4, 1.8, 0.3).multiplyScalar(Math.sin(t * 0.9) > 0.97 ? 0.1 : 1);
  }
}
