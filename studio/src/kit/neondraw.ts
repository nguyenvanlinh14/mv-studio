// Neon line drawings drawn by notes: strokes (2D polylines → glowing tubes that reveal along their length), a tiny
// single-stroke font, and a stream of rolling neon notes that come out of the depth along floor lanes, lurch forward
// on every beat, climb a curve and land on the drawing — each landing draws the next piece.
import * as THREE from 'three';

export type P2 = [number, number];
export interface Stroke { pts: P2[]; c?: number }
const TAU = Math.PI * 2;

export const arc = (x: number, y: number, rx: number, ry: number, a0 = 0, a1 = TAU, n = 48): P2[] =>
  Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [x + Math.cos(a) * rx, y + Math.sin(a) * ry]; });
export const bez = (p0: P2, p1: P2, p2: P2, p3: P2, n = 24): P2[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n, v = 1 - u;
    return [v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0], v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]];
  });
/** Closed rounded rectangle, counter-clockwise from the bottom edge. */
export function rrect(x0: number, y0: number, x1: number, y1: number, r = 0): P2[] {
  if (r <= 0) return [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
  const q = Math.PI / 2;
  return [
    ...arc(x1 - r, y0 + r, r, r, -q, 0, 8), ...arc(x1 - r, y1 - r, r, r, 0, q, 8),
    ...arc(x0 + r, y1 - r, r, r, q, 2 * q, 8), ...arc(x0 + r, y0 + r, r, r, 2 * q, 3 * q, 8), [x1 - r, y0],
  ];
}

// glyphs on a 1 × 1.4 box (baseline 0)
const PI = Math.PI;
const GLYPHS: Record<string, { w: number; s: P2[][] }> = {
  '0': { w: 1, s: [arc(0.5, 0.7, 0.45, 0.7)] },
  '1': { w: 0.8, s: [[[0.15, 1.1], [0.5, 1.4], [0.5, 0]]] },
  '2': { w: 1, s: [[...arc(0.5, 1.0, 0.42, 0.4, 0.9 * PI, -0.25 * PI, 24), [0.06, 0], [0.96, 0]]] },
  '3': { w: 1, s: [[...arc(0.5, 1.06, 0.4, 0.34, 0.85 * PI, -0.5 * PI, 24), ...arc(0.5, 0.36, 0.46, 0.36, 0.5 * PI, -0.85 * PI, 24)]] },
  '4': { w: 1, s: [[[0.72, 0], [0.72, 1.4], [0.04, 0.42], [0.96, 0.42]]] },
  '5': { w: 1, s: [[[0.9, 1.4], [0.16, 1.4], [0.1, 0.78], ...arc(0.5, 0.45, 0.44, 0.45, 0.78 * PI, -0.85 * PI, 28)]] },
  '6': { w: 1, s: [[...bez([0.8, 1.38], [0.36, 1.32], [0.06, 0.95], [0.06, 0.45], 14), ...arc(0.5, 0.45, 0.44, 0.45, PI, PI + TAU, 40)]] },
  '7': { w: 1, s: [[[0.04, 1.4], [0.96, 1.4], [0.34, 0]]] },
  '8': { w: 1, s: [arc(0.5, 1.07, 0.36, 0.33), arc(0.5, 0.4, 0.45, 0.4)] },
  '9': { w: 1, s: [[...arc(0.5, 0.95, 0.44, 0.45, 0, TAU, 40), ...bez([0.94, 0.95], [0.94, 0.45], [0.66, 0.04], [0.2, 0.02], 14)]] },
  'A': { w: 1.05, s: [[[0, 0], [0.52, 1.4], [1.04, 0]], [[0.2, 0.52], [0.84, 0.52]]] },
  'I': { w: 0.7, s: [[[0.35, 0], [0.35, 1.4]], [[0.05, 1.4], [0.65, 1.4]], [[0.05, 0], [0.65, 0]]] },
  'S': { w: 1, s: [[...arc(0.5, 1.05, 0.42, 0.35, 0.12 * PI, 1.5 * PI, 26), ...arc(0.5, 0.35, 0.46, 0.35, 0.5 * PI, -0.88 * PI, 26)]] },
  '+': { w: 1, s: [[[0.5, 0.2], [0.5, 1.1]], [[0.05, 0.65], [0.95, 0.65]]] },
  '-': { w: 0.8, s: [[[0.1, 0.65], [0.7, 0.65]]] },
  '.': { w: 0.4, s: [arc(0.2, 0.08, 0.08, 0.08, 0, TAU, 12)] },
  '<': { w: 0.9, s: [[[0.85, 1.2], [0.05, 0.7], [0.85, 0.2]]] },
  '>': { w: 0.9, s: [[[0.05, 1.2], [0.85, 0.7], [0.05, 0.2]]] },
  '/': { w: 0.8, s: [[[0.05, -0.05], [0.75, 1.45]]] },
  '₫': { w: 1.1, s: [arc(0.42, 0.45, 0.36, 0.42), [[0.8, 0], [0.8, 1.4]], [[0.55, 1.12], [1.05, 1.12]], [[0.05, -0.28], [1.05, -0.28]]] },
};

/** Text as strokes, centred on (x, y) with cap height h. */
export function strokeText(s: string, x: number, y: number, h: number, c?: number, gap = 0.22): Stroke[] {
  const k = h / 1.4;
  const ws = [...s].map((ch) => (ch === ' ' ? 0.5 : GLYPHS[ch]?.w ?? 0.6));
  const total = (ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1)) * k;
  let cx = x - total / 2;
  const out: Stroke[] = [];
  [...s].forEach((ch, i) => {
    for (const p of GLYPHS[ch]?.s ?? []) out.push({ pts: p.map(([px, py]) => [cx + px * k, y - h / 2 + py * k] as P2), c });
    cx += (ws[i]! + gap) * k;
  });
  return out;
}

export const NEON = {
  cyan: new THREE.Color(0.2, 0.85, 1.0), magenta: new THREE.Color(1.0, 0.22, 0.75), lime: new THREE.Color(0.55, 1.0, 0.3),
  gold: new THREE.Color(1.0, 0.72, 0.18), violet: new THREE.Color(0.55, 0.35, 1.0), white: new THREE.Color(1, 0.95, 0.9),
  red: new THREE.Color(1.0, 0.2, 0.18),
};

/** Glowing tubes from strokes (world units, z = 0 plane of root). draw 0..1 reveals them in order. */
export class NeonStrokes {
  root = new THREE.Group();
  total = 0;
  private tubes: { mesh: THREE.Mesh; curve: THREE.CatmullRomCurve3; len: number; start: number; idx: number; c: number; y: number }[] = [];
  private mats: THREE.MeshBasicMaterial[];
  private tip: THREE.Mesh;
  private tipMat = new THREE.MeshBasicMaterial();

  constructor(strokes: Stroke[], private palette: THREE.Color[], o: { radius?: number } = {}) {
    const r = o.radius ?? 0.05;
    this.mats = palette.map(() => new THREE.MeshBasicMaterial());
    for (const s of strokes) {
      const curve = new THREE.CatmullRomCurve3(s.pts.map(([x, y]) => new THREE.Vector3(x, y, 0)), false, 'catmullrom', 0);
      const len = curve.getLength();
      const g = new THREE.TubeGeometry(curve, Math.max(4, Math.ceil(len / 0.04)), r, 8, false);
      const c = s.c ?? 0;
      const mesh = new THREE.Mesh(g, this.mats[c % this.mats.length]);
      this.tubes.push({ mesh, curve, len, start: this.total, idx: g.index!.count, c, y: s.pts[0]![1] });
      this.total += len;
      this.root.add(mesh);
    }
    this.tip = new THREE.Mesh(new THREE.SphereGeometry(r * 2.6, 16, 12), this.tipMat);
    this.root.add(this.tip);
  }

  /** World point at arc-length fraction u of the whole drawing. */
  pointAt(u: number, out = new THREE.Vector3()) {
    const d = Math.max(0, Math.min(1, u)) * this.total;
    const tb = this.tubes.find((x) => d <= x.start + x.len + 1e-6) ?? this.tubes[this.tubes.length - 1]!;
    tb.curve.getPointAt(Math.max(0, Math.min(1, (d - tb.start) / tb.len)), out);
    this.root.updateMatrixWorld(true);
    return this.root.localToWorld(out);
  }

  set(o: { draw: number; intensity: number; glitch?: number; frame?: number; tip?: number; flicker?: number }) {
    this.palette.forEach((p, i) => this.mats[i]!.color.copy(p).multiplyScalar(o.intensity));
    const budget = o.draw * this.total, g = o.glitch ?? 0;
    for (const tb of this.tubes) {
      const f = Math.max(0, Math.min(1, (budget - tb.start) / tb.len));
      tb.mesh.geometry.setDrawRange(0, Math.floor((tb.idx * f) / 48) * 48);
      tb.mesh.visible = f > 0;
      const h = Math.sin((o.frame ?? 0) * 12.9898 + tb.y * 78.233) * 43758.5453;
      tb.mesh.position.x = g > 0.02 ? (h - Math.floor(h) - 0.5) * 0.9 * g : 0;
    }
    const tipOn = (o.tip ?? 1) * (o.draw > 0.001 && o.draw < 0.999 ? 1 : 0);
    this.tip.visible = tipOn > 0;
    if (tipOn > 0) {
      const p = this.pointAt(o.draw);
      this.tip.position.copy(this.root.worldToLocal(p));
      const tb = this.tubes.find((x) => budget <= x.start + x.len) ?? this.tubes[0]!;
      this.tipMat.color.copy(this.palette[tb.c % this.palette.length]!).lerp(NEON.white, 0.6).multiplyScalar(o.intensity * 2.2 * tipOn);
    }
  }
}

export interface Hit { t: number; to: THREE.Vector3; c: number }

const outCubic = (x: number) => 1 - Math.pow(1 - x, 3);
/** Beat clock that surges at each beat and coasts after it: notes "step" forward in time with the music. */
export const lurch = (b: number, k = 0.6) => (1 - k) * b + k * (Math.floor(b) + outCubic(b - Math.floor(b)));

/** Rolling neon notes (a ring rolling like a wheel + hot core + short trail) and landing bursts. */
export class NoteStream {
  root = new THREE.Group();
  private rings: THREE.InstancedMesh;
  private cores: THREE.InstancedMesh;
  private bursts: THREE.InstancedMesh;
  private lanes: THREE.InstancedMesh;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private col = new THREE.Color();
  constructor(private palette: THREE.Color[], public o: { farZ?: number; floorY?: number; travelBeats?: number; laneSpread?: number; ring?: number } = {}) {
    const R = o.ring ?? 0.3;
    const basic = () => new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.rings = new THREE.InstancedMesh(new THREE.TorusGeometry(R, R * 0.16, 10, 40), basic(), 512);
    this.cores = new THREE.InstancedMesh(new THREE.SphereGeometry(R * 0.28, 14, 10), basic(), 2048);
    this.bursts = new THREE.InstancedMesh(new THREE.TorusGeometry(1, 0.025, 6, 48), basic(), 256);
    this.lanes = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), basic(), 128);
    for (const im of [this.rings, this.cores, this.bursts, this.lanes]) { im.frustumCulled = false; im.count = 0; this.root.add(im); }
  }
  private get farZ() { return this.o.farZ ?? -90; }
  private get fy() { return (this.o.floorY ?? 0) + (this.o.ring ?? 0.3) * 1.2; }

  /** Path of one note: straight along its floor lane, then a quarter-pipe curve up onto its target. */
  pathAt(h: Hit, s: number, out: THREE.Vector3) {
    const lx = h.to.x * (this.o.laneSpread ?? 1.25), zr = h.to.z - 5, fy = this.fy;
    const Lf = zr - this.farZ, Lb = 5 + (h.to.y - fy) * 0.9, L = Lf + Lb;
    const d = s * L;
    if (d < Lf) return { p: out.set(lx, fy, this.farZ + d), dist: d };
    const u = (d - Lf) / Lb, v = 1 - u;
    const P0 = [lx, fy, zr], P1 = [lx, fy, zr + 3.8], P2 = [h.to.x, fy + (h.to.y - fy) * 0.35, h.to.z], P3 = [h.to.x, h.to.y, h.to.z];
    const b = (i: number) => v * v * v * P0[i]! + 3 * v * v * u * P1[i]! + 3 * v * u * u * P2[i]! + u * u * u * P3[i]!;
    return { p: out.set(b(0), b(1), b(2)), dist: d };
  }

  update(t: number, hits: Hit[], beatAt: (t: number) => number, o: { intensity?: number; lanePulse?: number } = {}) {
    const I = o.intensity ?? 3, TB = this.o.travelBeats ?? 6, R = this.o.ring ?? 0.3;
    const bt = lurch(beatAt(t));
    let nr = 0, nc = 0, nb = 0;
    const p = new THREE.Vector3(), roll = new THREE.Quaternion(), face = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
    for (const h of hits) {
      const b1 = lurch(beatAt(h.t)), b0 = b1 - TB;
      if (bt < b0 || t > h.t + 0.5) continue;
      const color = this.palette[h.c % this.palette.length]!;
      if (t < h.t) {
        const s = (bt - b0) / (b1 - b0);
        const { dist } = this.pathAt(h, s, p);
        const fadeIn = Math.min(1, s * 6);
        roll.setFromAxisAngle(new THREE.Vector3(1, 0, 0), dist / R).multiply(face);
        this.m.compose(p, roll, new THREE.Vector3(1, 1, 1));
        this.rings.setMatrixAt(nr, this.m); this.rings.setColorAt(nr++, this.col.copy(color).multiplyScalar(I * fadeIn));
        for (let k = 0; k < 5; k++) {
          const sk = s - k * 0.012;
          if (sk < 0) break;
          this.pathAt(h, sk, p);
          const sc = 1 - k * 0.17;
          this.m.compose(p, this.q.identity(), new THREE.Vector3(sc, sc, sc));
          this.cores.setMatrixAt(nc, this.m);
          this.cores.setColorAt(nc++, this.col.copy(color).lerp(NEON.white, k === 0 ? 0.7 : 0.2).multiplyScalar(I * fadeIn * (k === 0 ? 2 : 0.9 * Math.pow(0.62, k))));
        }
      } else {
        const a = (t - h.t) / 0.5, sc = 0.1 + 0.6 * outCubic(a);
        this.m.compose(h.to, this.q.identity(), new THREE.Vector3(sc, sc, sc));
        this.bursts.setMatrixAt(nb, this.m); this.bursts.setColorAt(nb++, this.col.copy(color).lerp(NEON.white, 0.3).multiplyScalar(I * 1.4 * (1 - a) * (1 - a)));
      }
    }
    // floor lanes + bars that travel with the beat
    let nl = 0;
    const lp = o.lanePulse ?? 0, span = this.farZ;
    for (let i = -9; i <= 9; i++) {
      this.m.compose(new THREE.Vector3(i * 1.6, (this.o.floorY ?? 0) + 0.01, span / 2 - 2), this.q.identity(), new THREE.Vector3(0.035, 0.01, -span));
      this.lanes.setMatrixAt(nl, this.m); this.lanes.setColorAt(nl++, this.col.copy(NEON.violet).multiplyScalar(0.35 + 0.5 * lp));
    }
    const v = (-span - 5) / TB; // z per lurch-beat on the floor part
    for (let k = Math.floor(bt); k > bt - TB - 1; k--) {
      const zb = this.farZ + (bt - k) * v; // a bar leaves the horizon on each beat
      if (zb > -4 || zb < this.farZ) continue;
      const down = ((k % 4) + 4) % 4 === 0;
      this.m.compose(new THREE.Vector3(0, (this.o.floorY ?? 0) + 0.012, zb), this.q.identity(), new THREE.Vector3(29, 0.01, down ? 0.08 : 0.04));
      this.lanes.setMatrixAt(nl, this.m); this.lanes.setColorAt(nl++, this.col.copy(down ? NEON.magenta : NEON.violet).multiplyScalar((down ? 0.9 : 0.4) * (1 + lp)));
    }
    for (const [im, n] of [[this.rings, nr], [this.cores, nc], [this.bursts, nb], [this.lanes, nl]] as const) {
      im.count = n; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    }
  }
}
