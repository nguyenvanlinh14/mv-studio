// 3D stickman: rounded tubes + a ball head, posed from a few joint angles. Poses are functions of time
// (typing, pressing Enter, stomping, cheering, sitting), so a crowd stays deterministic for motion blur.
import * as THREE from 'three';

export interface Pose {
  /** whole body */
  y?: number; lean?: number;
  /** shoulder (pitch forward, roll out) and elbow bend, per side */
  armL?: [number, number, number]; armR?: [number, number, number];
  /** hip pitch and knee bend, per side */
  legL?: [number, number]; legR?: [number, number];
  head?: number;
}

const U = 0.62; // upper limb length
const L = 0.6; // lower limb length

export class Stickman {
  root = new THREE.Group();
  private torso: THREE.Mesh;
  private head: THREE.Mesh;
  private parts: Record<string, THREE.Group> = {};
  mat: THREE.MeshStandardMaterial;

  constructor(o: { color?: THREE.ColorRepresentation; glow?: THREE.ColorRepresentation; thickness?: number } = {}) {
    const r = o.thickness ?? 0.075;
    this.mat = new THREE.MeshStandardMaterial({ color: o.color ?? 0xf2eee6, roughness: 0.55, metalness: 0, emissive: new THREE.Color(o.glow ?? 0xff6a1a), emissiveIntensity: 0 });
    const tube = (len: number) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 12), this.mat); m.position.y = -len / 2; m.castShadow = true; return m; };
    this.torso = new THREE.Mesh(new THREE.CapsuleGeometry(r * 1.15, 0.85, 6, 12), this.mat);
    this.torso.position.y = 1.55; this.torso.castShadow = true;
    this.head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), this.mat);
    this.head.castShadow = true;
    this.root.add(this.torso, this.head);
    const limb = (name: string, x: number, y: number) => {
      const upper = new THREE.Group(), lower = new THREE.Group();
      upper.position.set(x, y, 0); upper.add(tube(U));
      lower.position.y = -U; lower.add(tube(L)); upper.add(lower);
      this.root.add(upper);
      this.parts[name] = upper; this.parts[name + 'Low'] = lower;
    };
    limb('armL', -0.16, 1.95); limb('armR', 0.16, 1.95);
    limb('legL', -0.11, 1.12); limb('legR', 0.11, 1.12);
  }

  set(p: Pose, glow = 0) {
    this.root.position.y = p.y ?? 0;
    this.root.rotation.x = p.lean ?? 0;
    this.head.position.set(0, 2.3 + (p.head ?? 0) * 0.05, (p.head ?? 0) * 0.08);
    const arm = (n: 'armL' | 'armR', a: [number, number, number], side: number) => {
      const g = this.parts[n]!; g.rotation.set(-a[0], 0, side * a[1]);
      this.parts[n + 'Low']!.rotation.set(-a[2], 0, 0);
    };
    arm('armL', p.armL ?? [0, 0.15, 0], -1); arm('armR', p.armR ?? [0, 0.15, 0], 1);
    const leg = (n: 'legL' | 'legR', a: [number, number]) => { this.parts[n]!.rotation.set(-a[0], 0, 0); this.parts[n + 'Low']!.rotation.set(a[1], 0, 0); };
    leg('legL', p.legL ?? [0, 0]); leg('legR', p.legR ?? [0, 0]);
    this.mat.emissiveIntensity = glow * 2.5;
  }
}

// --- poses as functions of time --------------------------------------------------------------------------
const S = Math.sin;

/** Sitting at a desk, typing; `hit` is the time of an Enter press (right hand slams down). */
export function typing(t: number, seed: number, hit = -99): Pose {
  const d = t - hit;
  const slam = d >= -0.15 && d < 0.4 ? (d < 0 ? (d + 0.15) / 0.15 : Math.exp(-d / 0.12)) : 0;
  return {
    y: -0.62, lean: 0.12,
    armL: [1.1 + 0.08 * S(t * 19 + seed), 0.1, 0.9 + 0.1 * S(t * 23 + seed)],
    armR: [1.1 + 0.08 * S(t * 21 + seed * 2) + 0.9 * slam, 0.1, 0.9 - 0.6 * slam],
    legL: [1.45, 1.45], legR: [1.45, 1.45], head: 0.4 + 0.3 * S(t * 2 + seed),
  };
}

/** Stomping on something below on each hit (a jump that lands on the beat). */
export function stomp(t: number, hits: number[]): Pose {
  let ph = 1;
  for (const h of hits) { const d = h - t; if (d >= 0 && d < 0.5) ph = Math.min(ph, d / 0.5); }
  const air = Math.sin(Math.PI * (1 - ph)) * (ph < 1 ? 1 : 0);
  const land = hits.reduce((m, h) => Math.max(m, t >= h && t < h + 0.25 ? 1 - (t - h) / 0.25 : 0), 0);
  return {
    y: air * 0.9 - land * 0.25,
    armL: [-0.4 - air, 0.9 + air * 0.6, 0.3], armR: [-0.4 - air, 0.9 + air * 0.6, 0.3],
    legL: [0.3 * air + 0.6 * land, 0.6 * air + 1.0 * land], legR: [0.3 * air + 0.6 * land, 0.6 * air + 1.0 * land],
    lean: 0.1 * land,
  };
}

/** Cheering, both arms up, bouncing on the beat phase. */
export function cheer(t: number, beatPhase: number, seed = 0): Pose {
  const b = Math.abs(Math.sin(Math.PI * beatPhase));
  return { y: 0.15 * b, armL: [-0.2, 2.6 + 0.2 * S(t * 5 + seed), 0.3], armR: [-0.2, 2.6 + 0.2 * S(t * 5 + seed + 1), 0.3], legL: [0.1 * b, 0.2 * b], legR: [0.1 * b, 0.2 * b], head: -0.3 };
}
