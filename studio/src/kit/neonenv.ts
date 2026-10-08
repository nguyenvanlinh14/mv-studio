// Backgrounds and effects for the neon-drawing plates: a far skyline with windows, office monitor rows, drifting dust,
// light beams, a ring tunnel, data rain, rain streaks, falling coins and floor shock waves. All pure functions of t.
import * as THREE from 'three';
import { NEON, lurch, NeonStrokes, arc, rrect, type Stroke } from './neondraw';

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const fract = (x: number) => x - Math.floor(x);
const rnd = (i: number, k = 0) => fract(Math.sin(i * 127.1 + k * 311.7) * 43758.5453);
const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3(), COL = new THREE.Color();
const E = new THREE.Euler();

export interface Beat { t: number; beat: number; bar: number; beatAt: (t: number) => number }
const pulse = (b: number, p = 3) => Math.pow(1 - fract(b), p);

function inst(geo: THREE.BufferGeometry, n: number, o: Partial<THREE.MeshBasicMaterialParameters> = {}) {
  const m = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, ...o }), n);
  m.frustumCulled = false; m.count = n;
  for (let i = 0; i < n; i++) m.setColorAt(i, COL.setRGB(0, 0, 0));
  return m;
}
const done = (m: THREE.InstancedMesh) => { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; };

/** Far city: building outlines + windows that light up (lit 0..1) and blink on the beat. */
export class Skyline {
  root = new THREE.Group();
  private wins: THREE.InstancedMesh;
  private lines: THREE.LineSegments;
  private n = 0;
  constructor(public color = NEON.violet, public winColor = NEON.gold, z = -75) {
    const seg: number[] = [], wp: [number, number, number, number][] = [];
    let x = -90;
    for (let i = 0; x < 90; i++) {
      const w = 4 + rnd(i) * 7, h = 5 + rnd(i, 1) * 22 * (1 - Math.abs(x) / 160), zz = z - rnd(i, 2) * 20, x0 = x, x1 = x + w;
      seg.push(x0, 0, zz, x0, h, zz, x0, h, zz, x1, h, zz, x1, h, zz, x1, 0, zz);
      if (rnd(i, 3) > 0.6) seg.push((x0 + x1) / 2, h, zz, (x0 + x1) / 2, h + 2 + rnd(i, 4) * 4, zz);
      for (let r = 1.2; r < h - 0.8; r += 1.3) for (let c = x0 + 0.8; c < x1 - 0.6; c += 1.1) wp.push([c, r, zz + 0.1, rnd(c * 3.1, r)]);
      x = x1 + 0.6 + rnd(i, 5) * 2;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
    this.lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: color.clone().multiplyScalar(0.9) }));
    this.wins = inst(new THREE.PlaneGeometry(0.5, 0.6), wp.length);
    wp.forEach(([wx, wy, wz], i) => { M.makeTranslation(wx, wy, wz); this.wins.setMatrixAt(i, M); });
    this.seeds = wp.map((w) => w[3]);
    this.n = wp.length;
    this.root.add(this.lines, this.wins);
  }
  private seeds: number[];
  update(b: Beat, o: { lit?: number; line?: number } = {}) {
    const lit = o.lit ?? 0.4, bt = Math.floor(b.beat);
    (this.lines.material as THREE.LineBasicMaterial).color.copy(this.color).multiplyScalar((o.line ?? 0.9));
    for (let i = 0; i < this.n; i++) {
      const s = this.seeds[i]!, on = s < lit ? 1 : 0, blink = rnd(i, bt) > 0.97 ? pulse(b.beat, 2) : 0;
      this.wins.setColorAt(i, COL.copy(this.winColor).multiplyScalar((on * (0.5 + 0.6 * rnd(i, 9)) + blink * 2) * 1.1));
    }
    done(this.wins);
  }
}

/** Office aisle: rows of wireframe monitors on both sides, screens flicker with the beat. */
export class Monitors {
  root = new THREE.Group();
  private screens: THREE.InstancedMesh;
  private lineMat: THREE.LineBasicMaterial;
  constructor(public color = NEON.cyan, rows = 10) {
    const seg: number[] = [];
    const n = rows * 2 * 2;
    this.screens = inst(new THREE.PlaneGeometry(1.6, 0.95), n);
    let k = 0;
    for (let r = 0; r < rows; r++) for (const side of [-1, 1]) for (const off of [0, 2.2]) {
      const x = side * (9 + off), z = -6 - r * 6, y = 1.5;
      const yaw = side * 0.5;
      const pts = [[-0.9, -0.55], [0.9, -0.55], [0.9, 0.55], [-0.9, 0.55]];
      const P = (px: number, py: number) => [x + Math.cos(yaw) * px, y + py, z - Math.sin(yaw) * px];
      for (let i = 0; i < 4; i++) seg.push(...P(pts[i]![0]!, pts[i]![1]!), ...P(pts[(i + 1) % 4]![0]!, pts[(i + 1) % 4]![1]!));
      seg.push(...P(0, -0.55), ...P(0, -1.0), ...P(-0.4, -1.0), ...P(0.4, -1.0));
      seg.push(...P(-1.5, -1.05), ...P(1.5, -1.05)); // desk edge
      M.compose(new THREE.Vector3(x, y, z + 0.01), Q.setFromEuler(E.set(0, yaw, 0)), S.set(1, 1, 1));
      this.screens.setMatrixAt(k++, M);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
    this.lineMat = new THREE.LineBasicMaterial({ color: color.clone() });
    this.root.add(new THREE.LineSegments(g, this.lineMat), this.screens);
  }
  update(b: Beat) {
    this.lineMat.color.copy(this.color).multiplyScalar(1.1 + 0.6 * pulse(b.beat));
    const bt = Math.floor(b.beat);
    for (let i = 0; i < this.screens.count; i++) {
      const on = rnd(i, Math.floor(bt / 2)) > 0.35 ? 1 : 0.15;
      this.screens.setColorAt(i, COL.copy(this.color).multiplyScalar(0.12 * on + (rnd(i, bt) > 0.85 ? 0.5 * pulse(b.beat, 2) : 0)));
    }
    done(this.screens);
  }
}

/** Floating dust / bokeh specks through the whole depth. */
export class Dust {
  root = new THREE.Group();
  private m: THREE.InstancedMesh;
  constructor(public color = NEON.violet, private n = 360) {
    this.m = inst(new THREE.SphereGeometry(0.05, 6, 4), n);
    this.root.add(this.m);
  }
  update(b: Beat, o: { amount?: number; speed?: number } = {}) {
    const a = o.amount ?? 1, sp = o.speed ?? 1;
    for (let i = 0; i < this.n; i++) {
      const x = (rnd(i) - 0.5) * 50 + Math.sin(b.t * 0.2 * sp + i) * 0.6;
      const y = fract(rnd(i, 1) + b.t * 0.012 * sp * (0.5 + rnd(i, 4))) * 16;
      const z = -70 + rnd(i, 2) * 82;
      M.compose(V.set(x, y, z), Q.identity(), S.setScalar(0.6 + rnd(i, 3) * 1.6));
      this.m.setMatrixAt(i, M);
      this.m.setColorAt(i, COL.copy(this.color).lerp(NEON.white, rnd(i, 5) * 0.5).multiplyScalar(a * (0.6 + 1.2 * pulse(b.beat + rnd(i, 6) * 0.2, 4))));
    }
    done(this.m);
  }
}

const BEAM_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const BEAM_FS = `uniform vec3 c; uniform float a; varying vec2 vUv; void main(){ float k = pow(1.0 - vUv.y, 1.8) * smoothstep(0.0, 0.03, vUv.y); gl_FragColor = vec4(c * a * k, 1.0); }`;

/** Light beams fanning up from behind the drawing; sweep, and flash on beats or downbeats. */
export class Beams {
  root = new THREE.Group();
  private beams: { mesh: THREE.Mesh; mat: THREE.ShaderMaterial; i: number }[] = [];
  constructor(public colors: THREE.Color[] = [NEON.magenta, NEON.cyan], n = 8, z = -45) {
    const g = new THREE.CylinderGeometry(1.5, 0.1, 52, 24, 1, true); g.translate(0, 26, 0);
    for (let i = 0; i < n; i++) {
      const mat = new THREE.ShaderMaterial({ uniforms: { c: { value: new THREE.Color() }, a: { value: 0 } }, vertexShader: BEAM_VS, fragmentShader: BEAM_FS, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(g, mat);
      mesh.position.set((i - (n - 1) / 2) * 7, 0, z);
      this.root.add(mesh); this.beams.push({ mesh, mat, i });
    }
  }
  update(b: Beat, o: { mode?: 'beat' | 'down' | 'steady'; sweep?: number; level?: number; up?: number } = {}) {
    const lv = o.level ?? 1, sw = o.sweep ?? 0.35;
    for (const { mesh, mat, i } of this.beams) {
      const side = i % 2 ? 1 : -1;
      mesh.rotation.z = side * (0.15 + sw * (0.5 + 0.5 * Math.sin(b.t * 0.9 + i * 0.7))) * (1 - (o.up ?? 0));
      const p = o.mode === 'down' ? pulse(b.bar, 2) : o.mode === 'steady' ? 0.5 : pulse(b.beat, 2) * (Math.floor(b.beat) % this.beams.length === i ? 1.6 : 0.6);
      mat.uniforms.c!.value.copy(this.colors[i % this.colors.length]!);
      mat.uniforms.a!.value = lv * (0.04 + 0.26 * p);
    }
  }
}

/** Rounded-square neon frames rushing toward the camera, one per beat. */
export class Tunnel {
  root = new THREE.Group();
  private m: THREE.InstancedMesh;
  constructor(public colors: THREE.Color[] = [NEON.magenta, NEON.cyan, NEON.violet], private n = 18) {
    this.m = inst(new THREE.TorusGeometry(1, 0.012, 4, 4), n);
    this.root.add(this.m);
  }
  update(b: Beat, o: { centre?: THREE.Vector3; level?: number; spin?: number } = {}) {
    const c = o.centre ?? new THREE.Vector3(0, 4.6, 0), bt = lurch(b.beat, 0.7), lv = o.level ?? 1;
    for (let i = 0; i < this.n; i++) {
      const k = Math.floor(bt) - i, age = bt - k; // a frame leaves the far end each beat
      const z = -85 + age * 4.6;
      const sc = 7.5;
      M.compose(V.set(c.x, c.y, z), Q.setFromEuler(E.set(0, 0, Math.PI / 4 + (o.spin ?? 0.12) * k)), S.set(sc * 1.4, sc, 1));
      this.m.setMatrixAt(i, M);
      const fade = clamp((z + 85) / 15) * clamp((-6 - z) / 8);
      this.m.setColorAt(i, COL.copy(this.colors[((k % 3) + 3) % 3]!).multiplyScalar(lv * fade * (1.2 + (k % 4 === 0 ? 1.2 : 0))));
    }
    done(this.m);
  }
}

/** Columns of glyph cells falling on a wall behind the drawing. */
export class DataRain {
  root = new THREE.Group();
  private m: THREE.InstancedMesh;
  private cols = 70; private rows = 26;
  constructor(public color = NEON.lime, z = -32) {
    this.m = inst(new THREE.PlaneGeometry(0.32, 0.42), this.cols * this.rows);
    let k = 0;
    for (let c = 0; c < this.cols; c++) for (let r = 0; r < this.rows; r++) { M.makeTranslation((c - this.cols / 2) * 0.75, r * 0.62 + 0.3, z - rnd(c, 7) * 6); this.m.setMatrixAt(k++, M); }
    done(this.m);
    this.root.add(this.m);
  }
  update(b: Beat, o: { level?: number; speed?: number; color?: THREE.Color } = {}) {
    const lv = o.level ?? 1, col = o.color ?? this.color;
    let k = 0;
    for (let c = 0; c < this.cols; c++) {
      const head = this.rows - fract(rnd(c) + b.t * (0.25 + rnd(c, 1) * 0.5) * (o.speed ?? 1)) * (this.rows + 14);
      for (let r = 0; r < this.rows; r++) {
        const d = r - head;
        const on = d >= 0 && d < 12 ? Math.pow(1 - d / 12, 2) * (rnd(c * 31 + r, Math.floor(b.t * 8)) > 0.25 ? 1 : 0.3) : 0;
        this.m.setColorAt(k++, COL.copy(col).lerp(NEON.white, d < 1 && d >= 0 ? 0.7 : 0).multiplyScalar(lv * on * 0.9));
      }
    }
    done(this.m);
  }
}

/** Rain streaks + splash rings on the mirror floor. */
export class Rain {
  root = new THREE.Group();
  private drops: THREE.InstancedMesh;
  private rings: THREE.InstancedMesh;
  constructor(public color = new THREE.Color(0.5, 0.65, 1), private n = 700) {
    this.drops = inst(new THREE.BoxGeometry(0.012, 0.9, 0.012), n);
    this.rings = inst(new THREE.TorusGeometry(1, 0.01, 4, 32), 80);
    this.root.add(this.drops, this.rings);
  }
  update(b: Beat, o: { level?: number } = {}) {
    const lv = o.level ?? 1;
    for (let i = 0; i < this.n; i++) {
      const y = 16 - fract(rnd(i, 1) + b.t * (1.1 + rnd(i, 2) * 0.5)) * 17;
      M.compose(V.set((rnd(i) - 0.5) * 40 + y * 0.08, y, -40 + rnd(i, 3) * 52), Q.setFromEuler(E.set(0, 0, 0.08)), S.set(1, 1, 1));
      this.drops.setMatrixAt(i, M); this.drops.setColorAt(i, COL.copy(this.color).multiplyScalar(lv * (0.4 + 0.5 * rnd(i, 4))));
    }
    for (let i = 0; i < 80; i++) {
      const life = 0.7, ph = fract(rnd(i, 5) + b.t / life), cyc = Math.floor(rnd(i, 5) + b.t / life);
      M.compose(V.set((rnd(i, cyc) - 0.5) * 30, 0.02, -30 + rnd(i, cyc + 1) * 40), Q.setFromEuler(E.set(Math.PI / 2, 0, 0)), S.setScalar(0.05 + ph * 0.6));
      this.rings.setMatrixAt(i, M); this.rings.setColorAt(i, COL.copy(this.color).multiplyScalar(lv * (1 - ph) * 0.8));
    }
    done(this.drops); done(this.rings);
  }
}

/** Gold coins falling (or flying up and away) and spinning. */
export class Coins {
  root = new THREE.Group();
  private m: THREE.InstancedMesh;
  constructor(public color = NEON.gold, private n = 70) {
    this.m = inst(new THREE.TorusGeometry(0.26, 0.04, 6, 24), n);
    this.root.add(this.m);
  }
  update(b: Beat, o: { level?: number; up?: boolean } = {}) {
    const lv = o.level ?? 1;
    for (let i = 0; i < this.n; i++) {
      let y = 15 - fract(rnd(i, 1) + b.t * (0.18 + rnd(i, 2) * 0.12)) * 16;
      if (o.up) y = 15 - y;
      M.compose(V.set((rnd(i) - 0.5) * 36, y, -34 + rnd(i, 3) * 26), Q.setFromEuler(E.set(b.t * (1 + rnd(i, 4) * 3) + i, i, 0)), S.setScalar(0.8 + rnd(i, 5) * 0.8));
      this.m.setMatrixAt(i, M);
      this.m.setColorAt(i, COL.copy(this.color).multiplyScalar(lv * (0.7 + 1.0 * pulse(b.beat + rnd(i, 6), 3))));
    }
    done(this.m);
  }
}

/** Shock waves on the floor: a flat ring from under the drawing at each downbeat (or beat). */
export class Waves {
  root = new THREE.Group();
  private m: THREE.InstancedMesh;
  constructor(public color = NEON.magenta) {
    this.m = inst(new THREE.TorusGeometry(1, 0.03, 4, 96), 6);
    this.root.add(this.m);
  }
  update(b: Beat, o: { every?: 'beat' | 'bar'; level?: number } = {}) {
    const x = o.every === 'beat' ? b.beat : b.bar, lv = o.level ?? 1;
    for (let i = 0; i < 6; i++) {
      const age = fract(x) + i, r = 0.5 + age * (o.every === 'beat' ? 9 : 14);
      M.compose(V.set(0, 0.03, -12), Q.setFromEuler(E.set(Math.PI / 2, 0, 0)), S.set(r, r, 1));
      this.m.setMatrixAt(i, M); this.m.setColorAt(i, COL.copy(this.color).multiplyScalar(lv * 1.1 * Math.pow(clamp(1 - age / 3), 2)));
    }
    done(this.m);
  }
}

// ---- traffic: neon line-art cars and motorbikes on both sides of the lanes (front view coming in, rear view going away)

type P = [number, number];
const ST = (pts: P[], c = 0): Stroke => ({ pts, c });
// c: 0 body, 1 lights, 2 rider / detail
const VEHICLES: Record<string, () => Stroke[]> = {
  carFront: () => [
    ST([[-1.1, 0.25], [-1.1, 0.75], [-0.75, 1.35], [0.75, 1.35], [1.1, 0.75], [1.1, 0.25], [-1.1, 0.25]]),
    ST([[-0.68, 0.85], [-0.48, 1.25], [0.48, 1.25], [0.68, 0.85], [-0.68, 0.85]], 2),
    ST(arc(-0.78, 0.55, 0.16, 0.11, 0, Math.PI * 2, 14), 1), ST(arc(0.78, 0.55, 0.16, 0.11, 0, Math.PI * 2, 14), 1),
    ST([[-0.35, 0.5], [0.35, 0.5]], 2), ST([[-0.35, 0.38], [0.35, 0.38]], 2),
    ST(rrect(-1.05, 0, -0.75, 0.25, 0.05)), ST(rrect(0.75, 0, 1.05, 0.25, 0.05)),
  ],
  carRear: () => [
    ST([[-1.1, 0.25], [-1.1, 0.8], [-0.7, 1.35], [0.7, 1.35], [1.1, 0.8], [1.1, 0.25], [-1.1, 0.25]]),
    ST([[-0.65, 0.88], [-0.45, 1.25], [0.45, 1.25], [0.65, 0.88], [-0.65, 0.88]], 2),
    ST(rrect(-1.02, 0.5, -0.62, 0.7, 0.04), 1), ST(rrect(0.62, 0.5, 1.02, 0.7, 0.04), 1),
    ST(rrect(-0.25, 0.32, 0.25, 0.48, 0), 2),
    ST(rrect(-1.05, 0, -0.75, 0.25, 0.05)), ST(rrect(0.75, 0, 1.05, 0.25, 0.05)),
  ],
  bikeFront: () => [
    ST(arc(0, 0.32, 0.09, 0.32, 0, Math.PI * 2, 20)),
    ST([[-0.42, 0.95], [-0.18, 0.88], [0.18, 0.88], [0.42, 0.95]]),
    ST(arc(0, 0.72, 0.12, 0.1, 0, Math.PI * 2, 14), 1),
    ST([[-0.3, 0.95], [-0.32, 1.35], [-0.15, 1.5], [0.15, 1.5], [0.32, 1.35], [0.3, 0.95]], 2),
    ST(arc(0, 1.72, 0.16, 0.18, 0, Math.PI * 2, 16), 2),
  ],
  bikeRear: () => [
    ST(arc(0, 0.32, 0.09, 0.32, 0, Math.PI * 2, 20)),
    ST(rrect(-0.2, 0.6, 0.2, 0.82, 0.06)),
    ST(rrect(-0.1, 0.66, 0.1, 0.76, 0), 1),
    ST([[-0.32, 0.85], [-0.36, 1.35], [-0.16, 1.52], [0.16, 1.52], [0.36, 1.35], [0.32, 0.85]], 2),
    ST(arc(0, 1.74, 0.17, 0.19, 0, Math.PI * 2, 16), 2),
    ST([[-0.4, 0.98], [0.4, 0.98]], 0),
  ],
};

/** Neon traffic beside the lanes: vehicles enter from the screen edge (by the camera), are drawn in fast, drive away
 *  into the depth and vanish. One per side every `every` beats. */
export class Traffic {
  root = new THREE.Group();
  private pool: { kind: string; g: NeonStrokes }[] = [];
  constructor(private o: { every?: number; body?: THREE.Color; front?: THREE.Color; rear?: THREE.Color; rider?: THREE.Color } = {}) {
    const body = o.body ?? NEON.violet, rider = o.rider ?? NEON.cyan;
    for (let i = 0; i < 16; i++) for (const kind of ['carRear', 'bikeRear']) {
      const lights = kind.endsWith('Front') ? (o.front ?? new THREE.Color(0.9, 0.97, 1)) : (o.rear ?? NEON.red);
      const g = new NeonStrokes(VEHICLES[kind]!(), [body, lights, rider], { radius: 0.035 });
      g.root.visible = false;
      this.pool.push({ kind, g }); this.root.add(g.root);
    }
  }
  update(b: Beat, o: { level?: number } = {}) {
    const ev = this.o.every ?? 1, bt = lurch(b.beat, 0.6), lv = o.level ?? 1;
    for (const p of this.pool) p.g.root.visible = false;
    const used: Record<string, number> = {};
    const take = (kind: string) => { const n = used[kind] ?? 0; used[kind] = n + 1; return this.pool.filter((p) => p.kind === kind)[n]; };
    const TB = 11; // beats on screen
    for (let k = Math.floor(bt / ev) * ev; k > bt - TB; k -= ev) {
      const age = bt - k;
      for (const side of [-1, 1]) {
        const h = rnd(k, side + 3), bike = h < 0.6;
        const kind = bike ? 'bikeRear' : 'carRear';
        const slot = take(kind);
        if (!slot) continue;
        const lane = side * (5.6 + rnd(k, side + 7) * 2.4);
        const z = 11 - Math.pow(age, 1.15) * 10; // starts beside the camera, shrinks into the fog
        const fade = clamp((z + 92) / 14) * (0.45 + 0.55 * clamp((5 - z) / 8)); // softer while still big by the camera
        const draw = clamp(age / 0.5);
        slot.g.root.visible = true;
        slot.g.root.position.set(lane, 0.02, z);
        slot.g.root.scale.setScalar(bike ? 1.5 : 1.35);
        slot.g.set({ draw, intensity: lv * 1.6 * fade * (1 + 0.5 * pulse(b.beat, 3)), tip: 1 });
      }
    }
  }
}
