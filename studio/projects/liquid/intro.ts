// Intro hook for the liquid-morph cut (~6 s): a glowing cider droplet climbs out of a computer screen on a desk,
// leaps down onto a pale-gold neon grid floor that opens into Halloween space, and the grid sags into a gravity well
// under the splash — the droplet becomes the liquid that later morphs with the song. Generic screen, no real UI/logos.
import * as THREE from 'three';
import { Plate, type FrameInfo, type Shot } from '../../src/core/plate';
import { W, H } from '../../src/core/engine';
import { Pumpkin } from '../cider/world';

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (x: number) => { const k = clamp(x); return k * k * (3 - 2 * k); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// timing (seconds from the plate start)
const EMERGE = [0.3, 2.0], JUMP = [2.2, 3.5]; // climb out of the screen, then the leap; lands at JUMP[1]
const DESK = new THREE.Vector3(-1.5, 0, -1.2), SCREEN = new THREE.Vector3(-1.5, 1.32, -1.32), LAND = new THREE.Vector3(0.4, 0, 0.6);
const N = 110, SIZE = 22;

/** the floor: Gaussian well + spring overshoot on impact + a ripple ring travelling out */
function sag(x: number, z: number, tau: number) {
  if (tau < 0) return 0;
  const r = Math.hypot(x - LAND.x, z - LAND.z);
  const depth = 1.8 * (1 - Math.exp(-tau * 3.5) * Math.cos(tau * 8));
  const ring = 0.22 * Math.sin(r * 3 - tau * 9) * Math.exp(-tau * 1.2) * Math.exp(-r * 0.25) * clamp(tau * 9 - r * 0.9);
  return -depth * Math.exp(-(r * r) / 2.4) - depth * 0.45 / (1 + r * r * 0.5) + ring;
}

function screenTex() {
  const cv = document.createElement('canvas'); cv.width = 640; cv.height = 400;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#1b1712'; c.fillRect(0, 0, 640, 400);
  c.fillStyle = '#2a241d'; c.fillRect(0, 0, 150, 400); // a sidebar
  for (let i = 0; i < 6; i++) { c.fillStyle = '#3a3229'; c.fillRect(18, 30 + i * 34, 110, 14); }
  const bubble = (x: number, y: number, w: number, h: number, col: string) => { c.fillStyle = col; c.beginPath(); c.roundRect(x, y, w, h, 14); c.fill(); };
  bubble(330, 40, 280, 46, '#4a3d30'); bubble(175, 110, 360, 90, '#2f2820'); bubble(380, 225, 230, 40, '#4a3d30');
  for (let i = 0; i < 3; i++) { c.fillStyle = '#6b5c4a'; c.fillRect(195, 128 + i * 20, 300 - i * 70, 9); }
  bubble(175, 330, 445, 46, '#2f2820'); c.strokeStyle = '#6b5c4a'; c.lineWidth = 2; c.stroke();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

class Droplet {
  root = new THREE.Group(); body: THREE.Mesh; eyes = new THREE.Group();
  constructor() {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI; const r = Math.sin(a) * (1 - 0.6 * Math.pow(Math.sin(a / 2), 8)); /* pointed at the top */ pts.push(new THREE.Vector2(r * 0.3, -Math.cos(a) * 0.34 + 0.34)); }
    this.body = new THREE.Mesh(new THREE.LatheGeometry(pts, 64), new THREE.MeshPhysicalMaterial({
      color: 0xff8a1a, emissive: new THREE.Color(0.32, 0.1, 0.01), roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.03, sheen: 0.5, sheenColor: new THREE.Color(0xffd08a),
    }));
    this.body.castShadow = true; this.root.add(this.body);
    const dark = new THREE.MeshBasicMaterial({ color: 0x140a04 }), shine = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.1, 1.1, 1.1) });
    for (const sx of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.045, 20, 14), dark); e.scale.set(0.8, 1.15, 0.5); e.position.set(sx * 0.09, 0.26, 0.27);
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.015, 10, 8), shine); s.position.set(0.012, 0.022, 0.04); e.add(s); this.eyes.add(e);
    }
    this.root.add(this.eyes);
    const glow = new THREE.PointLight(0xff8a2a, 1.2, 2.5); glow.position.set(0, 0.25, -0.35); this.root.add(glow);
    this.root.scale.setScalar(0.55);
  }
  /** squash (−) / stretch (+), volume-preserving */
  squash(s: number) { const sy = 1 + s, sx = 1 / Math.sqrt(sy); this.body.scale.set(sx, sy, sx); this.eyes.scale.set(sx, sy, sx); this.eyes.position.y = (sy - 1) * 0.15; }
}

export class IntroShot extends Plate {
  scene = new THREE.Scene();
  cam = new THREE.PerspectiveCamera(48, W / H, 0.05, 200);
  pos = new Float32Array(N * N * 3); grid = new THREE.BufferGeometry();
  drop = new Droplet(); pumpkins: Pumpkin[] = [];
  splash = new THREE.Group();

  override init() {
    const s = this.scene;
    s.background = new THREE.Color(0x0a0612); s.fog = new THREE.FogExp2(0x120a1c, 0.05);
    s.environment = this.ctx.env; s.environmentIntensity = 0.25;
    s.add(new THREE.AmbientLight(0x5a4080, 0.5));
    const moonLight = new THREE.DirectionalLight(0xdcd0ff, 1.2); moonLight.position.set(-6, 8, -10); s.add(moonLight);
    // pale-gold neon grid
    const idx: number[] = [];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i; this.pos[k * 3] = (i / (N - 1) - 0.5) * SIZE; this.pos[k * 3 + 2] = (j / (N - 1) - 0.5) * SIZE - 3;
      if (i < N - 1) idx.push(k, k + 1); if (j < N - 1) idx.push(k, k + N);
    }
    this.grid.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); this.grid.setIndex(idx);
    s.add(new THREE.LineSegments(this.grid, new THREE.LineBasicMaterial({ color: new THREE.Color(1.5, 1.3, 0.62) })));
    // desk + monitor (generic)
    const wood = new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: 0.6 }), black = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.4, metalness: 0.3 });
    const desk = new THREE.Group(); desk.position.copy(DESK); s.add(desk);
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.06, 0.8), wood); top.position.y = 0.76; desk.add(top);
    for (const [x, z] of [[-0.78, -0.33], [0.78, -0.33], [-0.78, 0.33], [0.78, 0.33]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.76, 0.05), wood); l.position.set(x!, 0.38, z!); desk.add(l); }
    const mon = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.64, 0.04), black); mon.position.set(0, 1.32, -0.12); desk.add(mon);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.575), new THREE.MeshBasicMaterial({ map: screenTex(), color: new THREE.Color(1.5, 1.5, 1.5) })); scr.position.set(0, 1.32, -0.098); desk.add(scr);
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.04), black); neck.position.set(0, 0.92, -0.16); desk.add(neck);
    const screenGlow = new THREE.PointLight(0xffd9a0, 1.0, 2.5); screenGlow.position.set(0.6, 1.6, 0.6); desk.add(screenGlow);
    // Halloween space: moon, far pumpkins
    const moon = new THREE.Mesh(new THREE.CircleGeometry(2.2, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.0, 1.4), fog: false })); moon.position.set(3.5, 7, -24); s.add(moon);
    const pk: [number, number, number][] = [[-4, -9, 1.4], [3.2, -7, 1.2], [5.5, -12, 1.6], [-6.5, -14, 1.8], [1.6, -15, 1.5]];
    for (const [x, z, sc] of pk) { const p = new Pumpkin(sc, true, x * 7 + z); p.root.position.set(x, 0, z); s.add(p.root); this.pumpkins.push(p); }
    s.add(this.drop.root);
    // splash crown + droplets, shown after impact
    const sm = new THREE.MeshPhysicalMaterial({ color: 0xff9a2a, emissive: new THREE.Color(0.8, 0.28, 0.02), roughness: 0.08, clearcoat: 1 });
    for (let i = 0; i < 14; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.05 + (i % 3) * 0.02, 16, 12), sm); d.userData.a = (i / 14) * Math.PI * 2 + (i % 2) * 0.2; d.userData.v = 1.2 + (i % 4) * 0.35; this.splash.add(d); }
    s.add(this.splash);
  }

  shot(f: FrameInfo): Shot {
    const L = f.local, tau = L - JUMP[1]!;
    for (let k = 0; k < N * N; k++) this.pos[k * 3 + 1] = sag(this.pos[k * 3]!, this.pos[k * 3 + 2]!, tau);
    this.grid.attributes.position!.needsUpdate = true;
    for (const p of this.pumpkins) { p.update(f.t); p.root.position.y = sag(p.root.position.x, p.root.position.z, tau); }

    // droplet path: inside the screen → out onto the desk edge → leap → land in the well
    const d = this.drop, e = smooth((L - EMERGE[0]!) / (EMERGE[1]! - EMERGE[0]!)), j = clamp((L - JUMP[0]!) / (JUMP[1]! - JUMP[0]!));
    const out = new THREE.Vector3(SCREEN.x, SCREEN.y - 0.32 + 0.0 * e, SCREEN.z + lerp(-0.25, 0.32, e));
    const edge = new THREE.Vector3(DESK.x + 0.3, 0.79, DESK.z + 0.28);
    let p: THREE.Vector3;
    if (L < EMERGE[1]!) { p = out; out.y = lerp(SCREEN.y - 0.3, SCREEN.y - 0.33, e); d.squash(0.15 * Math.sin(e * Math.PI * 3) * (1 - e)); }
    else if (L < JUMP[0]!) { const k = smooth((L - EMERGE[1]!) / (JUMP[0]! - EMERGE[1]!)); p = out.clone().lerp(edge, k); p.y = lerp(out.y, edge.y, k) + 0.15 * Math.sin(k * Math.PI); d.squash(-0.25 * k); }
    else if (tau < 0) { p = edge.clone().lerp(LAND, j); p.y = lerp(edge.y, sag(LAND.x, LAND.z, 0), j) + 1.4 * 4 * j * (1 - j) * 0.6; d.squash(0.35 * Math.sin(j * Math.PI) - 0.1); }
    else { p = LAND.clone(); p.y = sag(LAND.x, LAND.z, tau); d.squash(-0.55 * Math.exp(-tau * 3) * Math.cos(tau * 11)); }
    d.root.position.copy(p); d.root.rotation.y = tau < 0 ? lerp(0, 0.6, j) : 0.6;
    d.root.visible = !(tau > 0.08 && tau < 0.5); // swallowed by the splash for a moment
    this.splash.visible = tau > 0 && tau < 1.6;
    const ground = sag(LAND.x, LAND.z, tau);
    this.splash.children.forEach((s) => {
      const a = s.userData.a as number, v = s.userData.v as number, tt = Math.max(0, tau);
      s.position.set(LAND.x + Math.cos(a) * v * 0.55 * tt, ground + v * 2.2 * tt - 4.9 * tt * tt, LAND.z + Math.sin(a) * v * 0.55 * tt);
      s.visible = s.position.y > ground - 0.2;
    });

    // camera: on the screen → follows the leap down → looks into the well
    const k1 = smooth((L - 1.8) / 2.0), k2 = smooth((L - 3.3) / 2.2);
    const c0 = new THREE.Vector3(SCREEN.x + 0.15, SCREEN.y + 0.05, SCREEN.z + 2.6), c1 = new THREE.Vector3(1.9, 2.4, 5.2), c2 = new THREE.Vector3(1.2, 4.4, 5.6);
    const a0 = new THREE.Vector3(SCREEN.x, SCREEN.y - 0.1, SCREEN.z), a1 = new THREE.Vector3(-0.4, 0.3, -0.2), a2 = new THREE.Vector3(LAND.x, -1.2, LAND.z - 0.5);
    this.cam.position.copy(c0.lerp(c1, k1).lerp(c2, k2)); this.cam.lookAt(a0.lerp(a1, k1).lerp(a2, k2));
    return { scene: this.scene, camera: this.cam, post: { bloom: 0.8, bloomThreshold: 0.8, vignette: 0.35, grain: 0.02, exposure: 1.0, aperture: 0, flash: tau > 0 ? 0.25 * Math.exp(-tau * 10) : 0 } };
  }
}
