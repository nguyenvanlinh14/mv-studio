// The AI → SI motif in 3D: a rounded half-body drawn in neon tubes. It traces itself in (draw 0→1) as cool blue
// "AI", can glitch (sideways slice jitter), and heats up to orange-gold "SI" with white eyes, a halo and rays.
import * as THREE from 'three';

type P2 = [number, number];
const TAU = Math.PI * 2;
const ell = (x: number, y: number, rx: number, ry: number, a0 = 0, a1 = TAU, n = 48): P2[] =>
  Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [x + Math.cos(a) * rx, y + Math.sin(a) * ry]; });
const bez = (p0: P2, p1: P2, p2: P2, p3: P2, n = 28): P2[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n, v = 1 - u;
    return [v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0], v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]];
  });

const HY = 0.95; // head centre (unit figure: chest core at 0, ~2.6 tall)
const PATHS: P2[][] = [
  ell(0, HY, 0.36, 0.43),
  ell(-0.37, HY, 0.07, 0.11, 0, TAU, 20), ell(0.37, HY, 0.07, 0.11, 0, TAU, 20),
  ell(0, HY - 0.05, 0.25, 0.17, Math.PI * 0.05, Math.PI * 0.95, 24),
  bez([-0.13, HY - 0.42], [-0.14, 0.45], [-0.18, 0.4], [-0.2, 0.36], 10),
  bez([0.13, HY - 0.42], [0.14, 0.45], [0.18, 0.4], [0.2, 0.36], 10),
  bez([-1.1, -0.95], [-1.12, -0.05], [-0.62, 0.32], [-0.2, 0.36]),
  bez([0.2, 0.36], [0.62, 0.32], [1.12, -0.05], [1.1, -0.95]),
  ell(0, -0.25, 0.16, 0.16, 0, TAU, 32),
  ell(0, -0.25, 0.32, 0.32, Math.PI * 0.15, Math.PI * 0.85, 24),
  ell(0, -0.25, 0.32, 0.32, Math.PI * 1.15, Math.PI * 1.85, 24),
  bez([-0.62, -0.55], [-0.45, -0.62], [-0.3, -0.5], [-0.22, -0.38], 12),
  bez([0.62, -0.55], [0.45, -0.62], [0.3, -0.5], [0.22, -0.38], 12),
];
const BLUE = new THREE.Color(0.35, 0.8, 1.0), ORANGE = new THREE.Color(1.0, 0.55, 0.15);

export class NeonBust {
  root = new THREE.Group();
  private tubes: { mesh: THREE.Mesh; len: number; start: number; idx: number; y: number }[] = [];
  private mat = new THREE.MeshBasicMaterial({ toneMapped: false });
  private eyeMat = new THREE.MeshBasicMaterial({ toneMapped: false });
  private eyes: THREE.Mesh[] = [];
  private halo: THREE.Group = new THREE.Group();
  private total = 0;

  constructor(o: { radius?: number } = {}) {
    const r = o.radius ?? 0.022;
    let acc = 0;
    for (const p of PATHS) {
      const pts = p.map(([x, y]) => new THREE.Vector3(x, y, 0.04 * Math.cos(x * 1.4)));
      const curve = new THREE.CatmullRomCurve3(pts);
      const segs = Math.max(8, p.length * 2);
      const g = new THREE.TubeGeometry(curve, segs, r, 8, false);
      const m = new THREE.Mesh(g, this.mat);
      const len = curve.getLength();
      this.tubes.push({ mesh: m, len, start: acc, idx: g.index!.count, y: p.reduce((a, q) => a + q[1], 0) / p.length });
      acc += len;
      this.root.add(m);
    }
    this.total = acc;
    for (const ex of [-0.13, 0.13]) {
      const e = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.09, 4, 10), this.eyeMat);
      e.rotation.z = Math.PI / 2; e.position.set(ex, HY + 0.02, 0.06);
      this.eyes.push(e); this.root.add(e);
    }
    const ringMat = this.mat;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, r * 0.9, 8, 64), ringMat);
    ring.rotation.x = Math.PI / 2; ring.position.y = HY + 0.62; this.halo.add(ring);
    for (let i = 0; i < 16; i++) {
      const ray = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.6, r * 0.6, 0.22, 6), ringMat);
      const a = (i / 16) * TAU;
      ray.position.set(Math.cos(a) * 0.72, HY + Math.sin(a) * 0.72, 0); ray.rotation.z = a - Math.PI / 2;
      this.halo.add(ray);
    }
    this.root.add(this.halo);
  }

  /** draw 0..1 traced; heat 0 blue AI → 1 orange SI; glitch 0..1; halo 0..1; frame for deterministic jitter. */
  set(o: { draw: number; heat: number; glitch?: number; halo?: number; t: number; frame: number; intensity?: number }) {
    const I = o.intensity ?? 2.6;
    this.mat.color.copy(BLUE).lerp(ORANGE, o.heat).multiplyScalar(I * (1 + 0.5 * o.heat));
    const budget = o.draw * this.total;
    for (const tb of this.tubes) {
      const f = Math.max(0, Math.min(1, (budget - tb.start) / tb.len));
      // tube indices run along the curve: reveal a prefix (multiple of 6 = one quad)
      tb.mesh.geometry.setDrawRange(0, Math.floor((tb.idx * f) / 6) * 6);
      tb.mesh.visible = f > 0;
      const g = o.glitch ?? 0;
      const h = Math.sin(o.frame * 12.9898 + tb.y * 78.233) * 43758.5453;
      tb.mesh.position.x = g > 0.02 ? ((h - Math.floor(h)) - 0.5) * 0.35 * g : 0;
    }
    const eyesOn = Math.max(0, Math.min(1, (o.draw - 0.25) / 0.1));
    this.eyeMat.color.copy(o.heat > 0.5 ? new THREE.Color(1, 1, 1) : BLUE).multiplyScalar((I + 3 * o.heat) * eyesOn);
    this.eyes.forEach((e) => (e.visible = eyesOn > 0));
    const hl = o.halo ?? 0;
    this.halo.visible = hl > 0.01;
    this.halo.scale.setScalar(0.6 + 0.4 * hl);
    this.halo.rotation.z = o.t * 0.4;
    this.halo.children.forEach((c, i) => { if (i > 0) c.scale.y = hl * (0.7 + 0.5 * Math.sin(o.t * 6 + i)); });
  }
}
