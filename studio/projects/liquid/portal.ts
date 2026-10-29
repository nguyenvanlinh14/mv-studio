// Intro hook v2 (~6.5 s): the desktop app screenshot lies flat like a floor; a voxel Claude buddy pops up out of
// it, a pale-gold grid draws itself over the UI, the whole UI sags into a gravity well (Halloween night opens up
// around it), and the buddy hops in and dives — splash. Private bits of the screenshot are blurred in the asset.
import * as THREE from 'three';
import { Plate, type FrameInfo, type Shot } from '../../src/core/plate';
import { W, H } from '../../src/core/engine';
import { Pumpkin } from '../cider/world';
import { drawLyric } from '../../src/kit/lyricstyles';

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (x: number) => { const k = clamp(x); return k * k * (3 - 2 * k); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number) => { o.position.set(x, y, z); return o; };

// beats of the hook (seconds from the plate start)
// timed to the cider intro: "Step into the cold" → pop out, "let the fire rise" → grid + well, land on the 6.46 downbeat
const POP = [0.3, 1.1], GRID = [1.1, 2.12], WELL = [2.12, 3.75], DIVE = [5.38, 6.46];
const PW = 8, PH = PW * 1196 / 2048, N = 120; // VS Code screenshot (assets/vscode-ui.png) // screenshot plane size and grid resolution
const C = new THREE.Vector3(-0.06, 0, 0.05); // middle of the Claude chat panel in plane coordinates
const START = new THREE.Vector3(0.95, 0, 0.45); // where the buddy pops out (right of the well)
const GR = 1.9; // radius of the grid patch

/** floor depth: the well grows during WELL, deepens again on the dive splash, plus a ripple ring */
function sag(x: number, z: number, L: number) {
  const dx = x - C.x, dz = z - C.z, r2 = dx * dx + dz * dz, r = Math.sqrt(r2);
  const grow = smooth((L - WELL[0]!) / (WELL[1]! - WELL[0]!)), tau = L - DIVE[1]!;
  const kick = tau > 0 ? 0.6 * (1 - Math.exp(-tau * 4) * Math.cos(tau * 9)) : 0;
  const depth = 1.25 * grow + kick * 0.7;
  const ring = tau > 0 ? 0.2 * Math.sin(r * 3 - tau * 9) * Math.exp(-tau * 1.3) * Math.exp(-r * 0.3) * clamp(tau * 9 - r * 0.9) : 0;
  return -depth * (Math.exp(-r2 / 1.1) + 0.12 / (1 + r2 * 1.5)) + ring * Math.exp(-r2 / 2.5);
}

/** a little voxel buddy in Claude orange: block body, two eye pixels, side nubs, four stubby legs */
class Buddy {
  root = new THREE.Group(); body = new THREE.Group();
  constructor() {
    const orange = new THREE.MeshStandardMaterial({ color: 0xd97757, roughness: 0.45, emissive: new THREE.Color(0.06, 0.02, 0.01) });
    const dark = new THREE.MeshStandardMaterial({ color: 0x14100e, roughness: 0.3 });
    const box = (w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; this.body.add(b); return b; };
    box(0.62, 0.36, 0.36, 0, 0.32, 0, orange);
    for (const sx of [-1, 1]) {
      box(0.07, 0.1, 0.02, sx * 0.14, 0.36, 0.181, dark);
      box(0.1, 0.12, 0.16, sx * 0.36, 0.3, 0, orange);
      box(0.07, 0.14, 0.07, sx * 0.24, 0.07, 0.1, orange); box(0.07, 0.14, 0.07, sx * 0.1, 0.07, 0.1, orange);
    }
    this.root.add(this.body);
    const glow = new THREE.PointLight(0xff9a6a, 0.5, 1.5); glow.position.set(0, 0.7, 0.6); this.root.add(glow);
  }
  squash(s: number) { const sy = 1 + s, sx = 1 / Math.sqrt(sy); this.body.scale.set(sx, sy, sx); }
}

export class PortalShot extends Plate {
  scene = new THREE.Scene();
  cam = new THREE.PerspectiveCamera(46, W / H, 0.05, 200);
  ui = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH, N, Math.round(N * PH / PW)));
  uiMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  gridPos = new Float32Array(0); grid = new THREE.BufferGeometry(); gridMat = new THREE.LineBasicMaterial({ color: new THREE.Color(1.5, 1.3, 0.62), transparent: true, opacity: 0 });
  buddy = new Buddy(); pumpkins: Pumpkin[] = []; moon!: THREE.Mesh; splash = new THREE.Group();
  sky = new THREE.Color();

  override async init() {
    const s = this.scene;
    s.background = this.sky; s.fog = new THREE.FogExp2(0x0e0818, 0.0); s.add(new THREE.HemisphereLight(0x8070b0, 0x3a2418, 0.5));
    s.environment = this.ctx.env; s.environmentIntensity = 0.3;
    s.add(new THREE.AmbientLight(0x6a5090, 0.7));
    const key = new THREE.DirectionalLight(0xfff0e0, 1.4); key.position.set(3, 6, 4); s.add(key);
    // the screenshot, lying flat; its vertices follow the well too
    const tex = await new THREE.TextureLoader().loadAsync('/projects/liquid/assets/vscode-ui.png');
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; this.uiMat.map = tex;
    this.ui.material = this.uiMat; this.ui.geometry.rotateX(-Math.PI / 2); s.add(this.ui);
    // pale-gold grid over (and beyond) the UI
    const G = 48, SIZE = GR * 2; this.gridPos = new Float32Array(G * G * 3); const col = new Float32Array(G * G * 3), idx: number[] = [];
    for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
      const k = j * G + i, x = (i / (G - 1) - 0.5) * SIZE, z = (j / (G - 1) - 0.5) * SIZE;
      this.gridPos[k * 3] = C.x + x; this.gridPos[k * 3 + 2] = C.z + z;
      const fall = Math.pow(1 - smooth(Math.hypot(x, z) / GR), 1.5); col[k * 3] = col[k * 3 + 1] = col[k * 3 + 2] = fall;
      if (i < G - 1) idx.push(k, k + 1); if (j < G - 1) idx.push(k, k + G);
    }
    this.grid.setAttribute('position', new THREE.BufferAttribute(this.gridPos, 3)); this.grid.setAttribute('color', new THREE.BufferAttribute(col, 3)); this.grid.setIndex(idx);
    this.gridMat.vertexColors = true; this.gridMat.blending = THREE.AdditiveBlending; this.gridMat.depthWrite = false;
    s.add(new THREE.LineSegments(this.grid, this.gridMat));
    // a tablet on a wooden desk at Halloween night: bezel + desk with a hole where the screen is, props, a window
    const BW = PW + 0.36, BH = PH + 0.36, rr = (w: number, h: number, r: number) => {
      const sh = new THREE.Shape(); sh.moveTo(-w / 2 + r, -h / 2); sh.lineTo(w / 2 - r, -h / 2); sh.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
      sh.lineTo(w / 2, h / 2 - r); sh.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); sh.lineTo(-w / 2 + r, h / 2); sh.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
      sh.lineTo(-w / 2, -h / 2 + r); sh.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2); return sh;
    };
    const hole = (w: number, h: number) => { const p = new THREE.Path(); p.moveTo(-w / 2, -h / 2); p.lineTo(-w / 2, h / 2); p.lineTo(w / 2, h / 2); p.lineTo(w / 2, -h / 2); p.closePath(); return p; };
    const bezelShape = rr(BW, BH, 0.22); bezelShape.holes.push(hole(PW, PH));
    const bezel = new THREE.Mesh(new THREE.ExtrudeGeometry(bezelShape, { depth: 0.1, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 3 }), new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.3, metalness: 0.4 }));
    bezel.rotation.x = -Math.PI / 2; bezel.position.y = -0.1; s.add(bezel);
    const woodTex = (() => {
      const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 1024; const c = cv.getContext('2d')!;
      c.fillStyle = '#5a3a22'; c.fillRect(0, 0, 1024, 1024);
      for (let y = 0; y < 1024; y += 2) { const v = Math.sin(y * 0.05) * 0.5 + Math.sin(y * 0.013 + 2) * 0.5; c.fillStyle = `rgba(${v > 0 ? '30,16,8' : '120,80,48'},${Math.abs(v) * 0.25})`; c.fillRect(0, y, 1024, 2); }
      for (let i = 0; i < 9; i++) { c.fillStyle = 'rgba(20,10,4,0.5)'; c.fillRect(0, i * 114, 1024, 3); } // plank seams
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); return t;
    })();
    const deskShape = rr(40, 40, 0.1); deskShape.holes.push(hole(BW - 0.05, BH - 0.05));
    const desk = new THREE.Mesh(new THREE.ShapeGeometry(deskShape), new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.55 }));
    desk.rotation.x = -Math.PI / 2; desk.position.y = -0.1; desk.receiveShadow = true; s.add(desk);
    // back wall with a window onto the harvest moon
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 16), new THREE.MeshStandardMaterial({ color: 0x241826, roughness: 0.9 })); wall.position.set(0, 7.9, -9); s.add(wall);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(5, 4.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.06, 0.07, 0.16) })); win.position.set(-1.5, 4.4, -8.98); s.add(win);
    this.moon = new THREE.Mesh(new THREE.CircleGeometry(0.9, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.9, 1.1), transparent: true, opacity: 0 }));
    this.moon.position.set(-0.6, 5.2, -8.95); s.add(this.moon);
    const frameM = new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.7 });
    for (const [w, h, x, y] of [[5.3, 0.18, 0, 2.1], [5.3, 0.18, 0, -2.1], [0.18, 4.4, 2.55, 0], [0.18, 4.4, -2.55, 0], [0.1, 4.2, 0, 0], [5, 0.1, 0, 0]] as const) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), frameM); b.position.set(-1.5 + x, 4.4 + y, -8.92); s.add(b);
    }
    // props on the desk: jack-o'-lanterns, a cider mug, candles, autumn leaves
    for (const [x, z, sc] of [[-5.6, -1.6, 1.3], [5.4, -2.2, 1.1], [-4.8, 3.4, 0.9], [6.2, 2.6, 1.0]] as const) {
      const p = new Pumpkin(sc, true, x * 7 + z); p.root.position.set(x, -0.1, z); s.add(p.root); this.pumpkins.push(p);
    }
    const mug = new THREE.Group(); mug.position.set(4.4, -0.1, -0.2); s.add(mug);
    mug.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, 0.85, 32), new THREE.MeshStandardMaterial({ color: 0xe8dccb, roughness: 0.35 })), 0, 0.42, 0));
    const cider = new THREE.Mesh(new THREE.CircleGeometry(0.37, 32), new THREE.MeshStandardMaterial({ color: 0x8a3d0a, roughness: 0.1, emissive: new THREE.Color(0.15, 0.05, 0) })); cider.rotation.x = -Math.PI / 2; cider.position.y = 0.8; mug.add(cider);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.06, 12, 24), (mug.children[0] as THREE.Mesh).material as THREE.Material); handle.position.set(0.45, 0.45, 0); mug.add(handle);
    for (const [x, z] of [[-4.6, 0.2], [-5.2, 0.9], [5.6, 4.2]] as const) {
      const c = new THREE.Group(); c.position.set(x, -0.1, z); s.add(c);
      c.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 20), new THREE.MeshStandardMaterial({ color: 0xf2e6cc, roughness: 0.6 })), 0, 0.25, 0));
      c.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.2, 0.6) })), 0, 0.56, 0));
      const l = new THREE.PointLight(0xffa040, 2.5, 4); l.position.set(0, 0.7, 0); c.add(l);
    }
    const leafCols = [0xc2501c, 0xd98a1e, 0x8f2a12, 0xb86b16];
    for (let i = 0; i < 26; i++) {
      const h = (n: number) => { const v = Math.sin((i * 13 + n) * 91.7) * 43758.5; return v - Math.floor(v); };
      let x = (h(1) - 0.5) * 16, z = (h(2) - 0.5) * 12; if (Math.abs(x) < BW / 2 + 0.3 && Math.abs(z) < BH / 2 + 0.3) x += Math.sign(x || 1) * (BW / 2 + 0.6);
      const lf = new THREE.Mesh(new THREE.CircleGeometry(0.16, 6), new THREE.MeshStandardMaterial({ color: leafCols[i % 4], roughness: 0.8, side: THREE.DoubleSide }));
      lf.scale.set(1, 0.55, 1); lf.rotation.set(-Math.PI / 2, 0, h(3) * 6.28); lf.position.set(x, -0.095 + h(4) * 0.004, z); s.add(lf);
    }
    this.buddy.root.scale.setScalar(1.3); s.add(this.buddy.root);
    const sm = new THREE.MeshStandardMaterial({ color: 0xff8a2a, emissive: new THREE.Color(1.2, 0.45, 0.05), roughness: 0.1 });
    for (let i = 0; i < 16; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.05 + (i % 3) * 0.025, 14, 10), sm); d.userData.a = (i / 16) * Math.PI * 2; d.userData.v = 1.1 + (i % 4) * 0.35; this.splash.add(d); }
    s.add(this.splash);
  }

  shot(f: FrameInfo): Shot {
    const L = f.local;
    const night = smooth((L - GRID[0]!) / (WELL[1]! - GRID[0]!));
    this.sky.setRGB(lerp(0.02, 0.05, night), lerp(0.02, 0.025, night), lerp(0.025, 0.09, night));
    (this.scene.fog as THREE.FogExp2).color.copy(this.sky); (this.scene.fog as THREE.FogExp2).density = 0.025 * night;
    this.uiMat.color.setScalar(lerp(1.0, 0.6, night));
    (this.moon.material as THREE.MeshBasicMaterial).opacity = night;
    for (const p of this.pumpkins) p.update(f.t);

    // bend the UI and the grid into the well
    const up = this.ui.geometry.attributes.position!;
    for (let i = 0; i < up.count; i++) up.setY(i, sag(up.getX(i), up.getZ(i), L));
    up.needsUpdate = true; this.ui.geometry.computeBoundingSphere();
    for (let k = 0; k < this.gridPos.length / 3; k++) this.gridPos[k * 3 + 1] = sag(this.gridPos[k * 3]!, this.gridPos[k * 3 + 2]!, L) + 0.01;
    this.grid.attributes.position!.needsUpdate = true;
    this.gridMat.opacity = smooth((L - GRID[0]!) / (GRID[1]! - GRID[0]!));

    // the buddy: pops up out of the UI, wobbles on the slope, hops and dives into the well
    const b = this.buddy, pop = clamp((L - POP[0]!) / (POP[1]! - POP[0]!)), dv = clamp((L - DIVE[0]!) / (DIVE[1]! - DIVE[0]!));
    const ground = sag(START.x, START.z, L);
    let p = START.clone();
    if (L < DIVE[0]!) {
      p.y = ground - 0.7 * (1 - pop) + 0.35 * Math.sin(pop * Math.PI); // rises through the screenshot
      b.squash(L < POP[1]! ? 0.3 * Math.sin(pop * Math.PI) : -0.18 * Math.exp(-(L - POP[1]!) * 4) * Math.cos((L - POP[1]!) * 14) + 0.06 * Math.sin(L * 9) * smooth((L - WELL[0]!) / 0.6));
      b.root.rotation.set(-0.35, 0.15 * Math.sin(L * 3), 0.2 * smooth((L - WELL[0]!) / 1.2)); // leans toward the hole
    } else {
      p = START.clone().lerp(C, smooth(dv));
      p.y = lerp(ground, sag(C.x, C.z, L), dv) + 1.1 * 4 * dv * (1 - dv);
      b.squash(0.3 * Math.sin(dv * Math.PI)); b.root.rotation.set(-0.35 + dv * 2.4, 0, 0); // flips forward into the dive
    }
    b.root.position.copy(p); b.root.visible = L < DIVE[1]! + 0.05;
    const tau = L - DIVE[1]!;
    this.splash.visible = tau > 0 && tau < 1.6;
    const g0 = sag(C.x, C.z, L);
    this.splash.children.forEach((s) => {
      const a = s.userData.a as number, v = s.userData.v as number, tt = Math.max(0, tau);
      s.position.set(C.x + Math.cos(a) * v * 0.6 * tt, g0 + v * 2.3 * tt - 4.9 * tt * tt, C.z + Math.sin(a) * v * 0.6 * tt); s.visible = s.position.y > g0 - 0.2;
    });

    // camera: looking down at the app → tilts into an oblique view of the well as night falls
    const k = smooth((L - 1.2) / 3.0);
    this.cam.position.set(lerp(0.4, 0.5, k), lerp(6.8, 3.6, k), lerp(1.4, 5.4, k));
    this.cam.lookAt(lerp(0.4, C.x, k), lerp(0, -0.8, k), lerp(0.2, C.z - 0.2, k));
    return { scene: this.scene, camera: this.cam, post: { bloom: 0.7, bloomThreshold: 0.85, vignette: 0.3, grain: 0.02, exposure: 1.0, aperture: 0, flash: tau > 0 ? 0.3 * Math.exp(-tau * 10) : 0, fade: smooth((tau - 0.25) / 0.4) } }; // splash, then the screen goes dark
  }

  override overlay(c: CanvasRenderingContext2D, f: FrameInfo) {
    if (!this.ctx.params.lyrics) return;
    const line = this.ctx.lyrics.lines.find((l) => f.t >= l.start - 0.25 && f.t < l.end + 0.5);
    if (line) drawLyric('pumpkin', c, line.text, f, [line.start - 0.25, line.end + 0.5], H - 380, line.words.map((w) => w.start));
  }
}
