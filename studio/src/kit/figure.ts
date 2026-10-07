// Human figures with real proportions (pelvis, chest, ball joints, hands, feet) in three looks:
//   'mannequin' — artist's wooden mannequin, 'neon' — thin glowing line figure, 'silhouette' — matte black, rim-lit.
// Posed with the same joint angles as the stickman kit (Pose), so poses are interchangeable.
import * as THREE from 'three';
import type { Pose } from './stickman';

export type FigureStyle = 'mannequin' | 'neon' | 'silhouette';

const DIM = { thigh: 0.46, shin: 0.44, upper: 0.32, fore: 0.29, hipW: 0.1, shoulderW: 0.2, hipY: 0.95, shoulderY: 1.45 };

export class Figure {
  root = new THREE.Group();
  private j: Record<string, THREE.Group> = {};
  private mats: THREE.Material[] = [];
  private glowable: THREE.MeshStandardMaterial | null = null;

  constructor(public style: FigureStyle, o: { color?: THREE.ColorRepresentation; rim?: number } = {}) {
    let mat: THREE.Material, joint: THREE.Material;
    if (style === 'neon') {
      const c = new THREE.Color(o.color ?? 0x6fd6ff).multiplyScalar(3.2);
      mat = joint = new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
    } else if (style === 'silhouette') {
      const m = new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.35, metalness: 0.2, envMapIntensity: 1.4 });
      const rim = o.rim ?? 1;
      // built-in two-tone Fresnel rim: the silhouette edge always reads (warm on the left, cool on the right)
      if (rim > 0) m.onBeforeCompile = (sh) => {
        sh.uniforms.rimK = { value: rim };
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform float rimK;')
          .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
            float fres = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.6);
            vec3 rimCol = mix(vec3(1.0, 0.42, 0.1), vec3(0.35, 0.78, 1.0), smoothstep(-0.4, 0.4, normal.x));
            totalEmissiveRadiance += rimCol * fres * rimK * 2.2;`);
      };
      mat = joint = m;
    } else {
      const m = new THREE.MeshStandardMaterial({ color: o.color ?? 0xc89a68, roughness: 0.62, metalness: 0, emissive: new THREE.Color(0xff6a1a), emissiveIntensity: 0 });
      mat = m; this.glowable = m;
      joint = new THREE.MeshStandardMaterial({ color: 0xa8784c, roughness: 0.55 });
    }
    this.mats.push(mat, joint);
    const neon = style === 'neon';
    const T = neon ? 0.018 : 1; // neon: everything is a thin tube
    const seg = (r0: number, r1: number, len: number) => {
      const g = new THREE.Group();
      const m = new THREE.Mesh(new THREE.CylinderGeometry(neon ? T : r0, neon ? T : r1, len, 16), mat);
      m.position.y = -len / 2; m.castShadow = !neon; g.add(m);
      return g;
    };
    const ball = (r: number) => { const m = new THREE.Mesh(neon ? new THREE.SphereGeometry(T * 1.4, 8, 6) : new THREE.SphereGeometry(r, 20, 14), joint); m.castShadow = !neon; return m; };
    const ell = (rx: number, ry: number, rz: number) => {
      if (neon) { const m = new THREE.Mesh(new THREE.TorusGeometry((rx + rz) / 2, T, 8, 40), mat); m.rotation.x = Math.PI / 2; m.scale.set(1, rz / rx, 1); return m; }
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), mat); m.scale.set(rx, ry, rz); m.castShadow = true; return m;
    };

    // body: pelvis → spine → chest → neck → head
    const pelvis = new THREE.Group(); pelvis.position.y = DIM.hipY; this.root.add(pelvis); this.j.pelvis = pelvis;
    pelvis.add(ell(0.13, 0.09, 0.085));
    const spine = new THREE.Group(); spine.position.y = 0.08; pelvis.add(spine); this.j.spine = spine;
    if (neon) { const s = seg(T, T, 0.42); s.rotation.x = Math.PI; spine.add(s); }
    const chest = ell(0.155, 0.23, 0.095); chest.position.y = 0.33; spine.add(chest);
    const neck = new THREE.Group(); neck.position.y = 0.55; spine.add(neck); this.j.neck = neck;
    const nk = seg(0.045, 0.05, 0.1); nk.rotation.x = Math.PI; neck.add(nk);
    const head = neon ? new THREE.Mesh(new THREE.TorusGeometry(0.11, T, 8, 48), mat) : ell(0.095, 0.125, 0.11);
    head.position.y = 0.21; neck.add(head);
    // arms
    for (const [n, side] of [['L', -1], ['R', 1]] as const) {
      const sh = new THREE.Group(); sh.position.set(side * DIM.shoulderW, 0.5, 0); spine.add(sh); sh.add(ball(0.055)); this.j['arm' + n] = sh;
      const up = seg(0.045, 0.038, DIM.upper); sh.add(up);
      const el = new THREE.Group(); el.position.y = -DIM.upper; up.add(el); el.add(ball(0.04)); this.j['fore' + n] = el;
      const fo = seg(0.036, 0.03, DIM.fore); el.add(fo);
      const hand = ell(0.035, 0.06, 0.025); hand.position.y = -DIM.fore - 0.05; el.add(hand);
    }
    // legs
    for (const [n, side] of [['L', -1], ['R', 1]] as const) {
      const hp = new THREE.Group(); hp.position.set(side * DIM.hipW, 0, 0); pelvis.add(hp); hp.add(ball(0.065)); this.j['leg' + n] = hp;
      const th = seg(0.07, 0.052, DIM.thigh); hp.add(th);
      const kn = new THREE.Group(); kn.position.y = -DIM.thigh; th.add(kn); kn.add(ball(0.05)); this.j['shin' + n] = kn;
      const sh = seg(0.05, 0.038, DIM.shin); kn.add(sh);
      const foot = ell(0.045, 0.03, 0.1); foot.position.set(0, -DIM.shin - 0.02, 0.05); kn.add(foot);
    }
  }

  set(p: Pose, glow = 0) {
    this.root.position.y = (p.y ?? 0) * 0.55;
    this.j.spine!.rotation.x = p.lean ?? 0;
    this.j.neck!.rotation.x = (p.head ?? 0) * 0.4;
    const arm = (n: 'L' | 'R', a: [number, number, number], side: number) => {
      this.j['arm' + n]!.rotation.set(-a[0], 0, side * a[1]);
      this.j['fore' + n]!.rotation.set(-a[2], 0, 0);
    };
    arm('L', p.armL ?? [0, 0.12, 0.1], -1); arm('R', p.armR ?? [0, 0.12, 0.1], 1);
    const leg = (n: 'L' | 'R', a: [number, number]) => { this.j['leg' + n]!.rotation.set(-a[0], 0, 0); this.j['shin' + n]!.rotation.set(a[1], 0, 0); };
    leg('L', p.legL ?? [0, 0]); leg('R', p.legR ?? [0, 0]);
    if (this.glowable) this.glowable.emissiveIntensity = glow * 1.5;
  }
}

/** Standing at a key and slamming it with the right hand at `hit`. */
export function slam(t: number, hit: number, seed = 0): Pose {
  const d = t - hit;
  const down = d >= -0.25 && d < 0.45 ? (d < 0 ? 1 - (-d / 0.25) : Math.exp(-d / 0.15)) : 0;
  const wind = d >= -0.6 && d < -0.05 ? Math.sin(((d + 0.6) / 0.55) * Math.PI) : 0;
  return {
    lean: 0.18 + 0.25 * down,
    armR: [0.6 + 1.6 * wind - 0.3 * down, 0.15, 0.5 + 0.8 * wind - 0.4 * down],
    armL: [0.25 + 0.05 * Math.sin(t * 2 + seed), 0.25, 0.4],
    legL: [0.12, 0.2], legR: [-0.1, 0.05], head: 0.3 + 0.4 * down,
  };
}
