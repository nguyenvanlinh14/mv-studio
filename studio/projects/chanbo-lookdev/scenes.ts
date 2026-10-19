// The story scenes of "Chăn bò ngày nắng" (look B+): the year flipping back, graduation day, the desk (four moods),
// the meeting room, the AI lab, the data sky over the campus, the road from the city to the fields, notification
// bubbles popping over the village, and the closing signature. Every plate draws the karaoke-cowbell lyrics.
import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Plate, type FrameInfo, type Shot, type PlateContext } from '../../src/core/plate';
import { drawLyric, type LyricStyle } from '../../src/kit/lyricstyles';
import { CowModel, loadCow } from '../../src/kit/cowmodel';
import { City, facade } from './city';
import { mulberry } from './field';
import { sharedVillage } from './plates';

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (x: number) => { x = clamp(x); return x * x * (3 - 2 * x); };
const pulse = (beat: number, p = 3) => Math.pow(1 - (beat - Math.floor(beat)), p);
const hash = (i: number, k = 0) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const std = (color: number, rough = 0.7, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, ...o });
const mesh = (g: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], cast = true) => { const me = new THREE.Mesh(g, m); me.castShadow = cast; me.receiveShadow = true; return me; };
function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d')!);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function lyricsOverlay(ctx: PlateContext, c: CanvasRenderingContext2D, f: FrameInfo) {
  const clip = ctx.params.lines as [number, number, string, number[]?][] | undefined;
  const L = clip?.find(([a, b]) => f.t >= a && f.t < b);
  if (L) drawLyric((ctx.params.lyric ?? 'bell') as LyricStyle, c, L[2], f, [L[0], L[1]], 960, L[3]);
}
/** physical sky + matching image light; returns the sun */
function skyLight(s: THREE.Scene, r: THREE.WebGLRenderer, dir: THREE.Vector3, o: { turb?: number; ray?: number; env?: number; sun?: number; color?: number; fog?: [number, number, number, number] } = {}) {
  const sky = new Sky(); sky.scale.setScalar(2500);
  const u = sky.material.uniforms;
  u.turbidity!.value = o.turb ?? 2.5; u.rayleigh!.value = o.ray ?? 1.3; u.mieCoefficient!.value = 0.004; u.mieDirectionalG!.value = 0.8; u.sunPosition!.value.copy(dir);
  const es = new THREE.Scene(), s2 = new Sky(); s2.scale.setScalar(50); s2.material.uniforms = u; es.add(s2);
  s.environment = new THREE.PMREMGenerator(r).fromScene(es, 0.02, 0.1, 200).texture; s.environmentIntensity = o.env ?? 0.3;
  s.add(sky);
  if (o.fog) s.fog = new THREE.FogExp2(new THREE.Color(o.fog[0], o.fog[1], o.fog[2]), o.fog[3]);
  const sun = new THREE.DirectionalLight(o.color ?? 0xfff1dc, o.sun ?? 2.6);
  sun.position.copy(dir).multiplyScalar(60); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 150 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;
  s.add(sun, sun.target, new THREE.HemisphereLight(0xcfe4ff, 0x8a8070, 0.35));
  return sun;
}
const SKY_POST = { bloom: 0.3, vignette: 0.22, grain: 0.015, exposure: 0.5 };
const ROOM_POST = { bloom: 0.45, vignette: 0.3, grain: 0.02, exposure: 1.0 };

abstract class Story extends Plate {
  scene = new THREE.Scene();
  cam = new THREE.PerspectiveCamera(36, 16 / 9, 0.05, 5000);
  override overlay(c: CanvasRenderingContext2D, f: FrameInfo) { lyricsOverlay(this.ctx, c, f); }
}

// ================================================================== 1 · the year flips back 2026 → 2016
export class YearFlip extends Story {
  cards: { m: THREE.Mesh; mats: THREE.MeshStandardMaterial[] }[] = [];
  digitTex = Array.from({ length: 10 }, (_, d) => canvasTex(256, 384, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 384); g.addColorStop(0, '#fbf3e0'); g.addColorStop(1, '#e8dcc0');
    c.fillStyle = g; c.fillRect(0, 0, 256, 384); c.fillStyle = '#2a1c10'; c.font = '900 300px "Archivo"'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(d), 128, 205);
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, 190, 256, 4);
  }));
  override init() {
    const s = this.scene; s.background = new THREE.Color(0x1a1420); s.environment = this.ctx.env; s.environmentIntensity = 0.6;
    const key = new THREE.SpotLight(0xffd9a8, 60, 30, 0.6, 0.6); key.position.set(3, 5, 6); key.castShadow = true; s.add(key);
    const desk = mesh(new THREE.BoxGeometry(12, 0.2, 6), std(0x5a3a22, 0.6)); desk.position.y = -1.2; s.add(desk);
    for (let i = 0; i < 4; i++) {
      const mats = [std(0xe8dcc0), std(0xe8dcc0), std(0xe8dcc0), std(0xe8dcc0), std(0xffffff, 0.5), std(0xffffff, 0.5)];
      const m = mesh(new RoundedBoxGeometry(1.25, 1.85, 0.12, 2, 0.05), mats); m.position.set((i - 1.5) * 1.42, 0, 0); s.add(m); this.cards.push({ m, mats });
    }
    // warm bokeh lights far behind
    const bm = new THREE.MeshBasicMaterial({ color: 0xffb060 });
    for (let i = 0; i < 70; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), bm.clone()); (b.material as THREE.MeshBasicMaterial).color.setHSL(0.08 + hash(i) * 0.08, 0.8, 0.5 + hash(i, 2) * 0.4).multiplyScalar(2.5); b.position.set((hash(i, 3) - 0.5) * 40, (hash(i, 4) - 0.3) * 14, -18 - hash(i, 5) * 10); s.add(b); }
  }
  year(t: number) { const { start, end } = this.ctx; return 2026 - Math.floor(clamp((t - start - 0.6) / (end - start - 1.8)) * 10); }
  shot(f: FrameInfo): Shot {
    const y = this.year(f.t), yo = this.year(f.t - 0.32), ds = String(y).split('').map(Number), dold = String(yo).split('').map(Number);
    this.cards.forEach(({ m, mats }, i) => {
      const flipping = ds[i] !== dold[i] && f.t - this.ctx.start > 0.9;
      const p = flipping ? clamp(((f.t - this.ctx.start) % 0.32) / 0.32) : 1;
      // find progress since this digit changed
      let since = 1; for (let k = 0; k < 8; k++) { if (String(this.year(f.t - k * 0.04))[i] !== String(y)[i]) { since = k * 0.04 / 0.32; break; } }
      const q = flipping ? clamp(since) : 1;
      m.rotation.x = q >= 1 ? 0 : q < 0.5 ? -Math.PI * q : Math.PI * (1 - q);
      const show = q < 0.5 ? dold[i]! : ds[i]!;
      mats[4]!.map = this.digitTex[show]!; mats[5]!.map = this.digitTex[show]!; mats[4]!.needsUpdate = mats[5]!.needsUpdate = true;
      m.position.y = 0.06 * pulse(f.beat) * (i % 2 ? 1 : -1); void p;
    });
    this.cam.position.set(0.5 - f.local * 0.05, 0.5, 8.2 - f.local * 0.15); this.cam.lookAt(0, 0.2, 0);
    return { scene: this.scene, camera: this.cam, post: { ...ROOM_POST, focus: 8, aperture: 9 } };
  }
  override overlay(c: CanvasRenderingContext2D, f: FrameInfo) {
    const a = ease((f.t - this.ctx.end + 3) / 0.6);
    if (a > 0) { c.save(); c.globalAlpha = a; c.textAlign = 'center'; c.font = '700 84px "Marker Felt", "Archivo"'; c.fillStyle = '#ffe9b8'; c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 20; c.fillText('10 năm trước…', 960, 230); c.restore(); }
    lyricsOverlay(this.ctx, c, f);
  }
}

// ================================================================== 2 · graduation: caps fly, the red diploma glows
export class Graduation extends Story {
  caps: { g: THREE.Group; v: THREE.Vector3; p0: THREE.Vector3; spin: THREE.Vector3; t0: number }[] = [];
  override init() {
    const s = this.scene, R = mulberry(7);
    skyLight(s, this.ctx.renderer, new THREE.Vector3(0.5, 0.55, 0.65).normalize(), { sun: 1.7, env: 0.2, fog: [0.75, 0.83, 0.93, 0.002] });
    const ground = mesh(new THREE.PlaneGeometry(400, 400), std(0x9a9284, 0.9), false); ground.rotation.x = -Math.PI / 2; s.add(ground);
    // university hall: steps, colonnade, pediment
    const stone = std(0xc9bda6, 0.8), roofM = std(0x8a4a32, 0.7);
    for (let i = 0; i < 4; i++) { const st = mesh(new THREE.BoxGeometry(34 - i * 1.2, 0.35, 4 - i * 0.6), stone); st.position.set(0, 0.17 + i * 0.35, -26 + i * 0.3); s.add(st); }
    const body = mesh(new THREE.BoxGeometry(30, 12, 8), std(0xb9a68a, 0.85)); body.position.set(0, 7.4, -31); s.add(body);
    for (let i = 0; i < 10; i++) { const col = mesh(new THREE.CylinderGeometry(0.45, 0.5, 9, 16), stone); col.position.set(-12.6 + i * 2.8, 5.9, -26.6); s.add(col); }
    const ent = mesh(new THREE.BoxGeometry(30, 1, 3), stone); ent.position.set(0, 10.9, -26.8); s.add(ent);
    const ped = new THREE.Shape(); ped.moveTo(-15.5, 0); ped.lineTo(15.5, 0); ped.lineTo(0, 4.2); ped.closePath();
    const pm = mesh(new THREE.ExtrudeGeometry(ped, { depth: 3, bevelEnabled: false }), roofM); pm.position.set(0, 11.4, -28.3); s.add(pm);
    for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) { const tr = new THREE.Group(); const tk = mesh(new THREE.CylinderGeometry(0.2, 0.3, 3, 8), std(0x5a3e2a)); tk.position.y = 1.5; tr.add(tk); for (let k = 0; k < 4; k++) { const b = mesh(new THREE.IcosahedronGeometry(1.4 + R() * 0.5, 3), std(k % 2 ? 0x5a9a3a : 0x6fb048, 0.9)); b.position.set((R() - 0.5) * 1.6, 3.6 + R(), (R() - 0.5) * 1.6); tr.add(b); } tr.position.set(sx * (19 + i * 5), 0, -18 - i * 3); s.add(tr); }
    // caps
    const board = new THREE.BoxGeometry(0.5, 0.03, 0.5), skull = new THREE.CylinderGeometry(0.17, 0.18, 0.13, 16), tass = new THREE.CylinderGeometry(0.008, 0.008, 0.22, 4);
    const black = std(0x15151a, 0.5), gold = std(0xd8a838, 0.4, { metalness: 0.6 });
    for (let i = 0; i < 46; i++) {
      const g = new THREE.Group(); const b = mesh(board, black); g.add(b); const sk = mesh(skull, black); sk.position.y = -0.08; g.add(sk);
      const t = mesh(tass, gold); t.position.set(0.22, -0.1, 0.22); g.add(t); s.add(g);
      this.caps.push({ g, p0: new THREE.Vector3((R() - 0.5) * 16, 1.6, -6 - R() * 12), v: new THREE.Vector3((R() - 0.5) * 2.5, 7 + R() * 4, (R() - 0.5) * 2), spin: new THREE.Vector3(R() * 6, R() * 8, R() * 6), t0: 0.2 + R() * 0.8 });
    }
    // the red diploma on a lectern, glowing
    const lect = mesh(new THREE.BoxGeometry(1.2, 1.1, 0.7), std(0x6a3a22, 0.6)); lect.position.set(1.6, 0.55, 2); s.add(lect);
    const top = mesh(new THREE.BoxGeometry(1.3, 0.06, 0.8), std(0x7a4428, 0.5)); top.position.set(1.6, 1.13, 2); top.rotation.x = -0.25; s.add(top);
    const coverTex = canvasTex(512, 360, (c) => { c.fillStyle = '#b1221c'; c.fillRect(0, 0, 512, 360); c.strokeStyle = '#e8c35a'; c.lineWidth = 8; c.strokeRect(22, 22, 468, 316); c.fillStyle = '#f0cc66'; c.font = '700 54px "Archivo"'; c.textAlign = 'center'; c.fillText('BẰNG TỐT NGHIỆP', 256, 150); c.beginPath(); c.arc(256, 240, 44, 0, 7); c.strokeStyle = '#f0cc66'; c.lineWidth = 6; c.stroke(); });
    const dip = new THREE.Group();
    const cover = mesh(new THREE.BoxGeometry(0.62, 0.02, 0.44), [std(0xb1221c), std(0xb1221c), new THREE.MeshStandardMaterial({ map: coverTex, roughness: 0.4, emissive: 0xffffff, emissiveMap: coverTex, emissiveIntensity: 0.25 }), std(0xb1221c), std(0xb1221c), std(0xb1221c)]);
    dip.add(cover); dip.position.set(1.6, 1.2, 2); dip.rotation.set(-0.25, -0.15, 0); dip.scale.setScalar(1.5); s.add(dip);
    const glow = new THREE.PointLight(0xffc870, 3, 3); glow.position.set(1.6, 1.6, 2.3); s.add(glow);
  }
  shot(f: FrameInfo): Shot {
    const tl = f.local, g = 9.8 * 0.32;
    for (const c of this.caps) {
      const u = Math.max(0, tl - c.t0);
      c.g.position.copy(c.p0).addScaledVector(c.v, u * 0.55); c.g.position.y -= 0.5 * g * u * u;
      if (c.g.position.y < 0.05) c.g.position.y = 0.05;
      c.g.rotation.set(c.spin.x * u * 0.4, c.spin.y * u * 0.4, c.spin.z * u * 0.4); c.g.visible = tl > c.t0 - 0.1;
    }
    this.cam.position.set(2.6 - tl * 0.1, 1.55 + tl * 0.05, 4.4); this.cam.lookAt(0.4, 2.6 + tl * 0.4, -12);
    return { scene: this.scene, camera: this.cam, post: { ...SKY_POST, exposure: 0.38, focus: 12, aperture: 2.5 } };
  }
}

// ================================================================== 3 · the desk, in four moods
type DeskMode = 'night' | 'robot' | 'empty' | 'laptop';
export class Desk extends Story {
  mode = (this.ctx.params.mode ?? 'night') as DeskMode;
  codeCv = document.createElement('canvas'); codeTex!: THREE.CanvasTexture;
  hands: THREE.Group[] = []; keyboard = new THREE.Group(); arm: THREE.Group[] = []; rain?: THREE.InstancedMesh; lid?: THREE.Group; dust?: THREE.InstancedMesh; screenMat?: THREE.MeshStandardMaterial;
  override init() {
    const s = this.scene, m = this.mode, R = mulberry(11);
    const night = m === 'night' || m === 'empty';
    s.background = new THREE.Color(night ? 0x0b1020 : 0xbfd4e8); s.environment = this.ctx.env; s.environmentIntensity = night ? 0.12 : 0.5;
    s.add(new THREE.HemisphereLight(night ? 0x3a4a7a : 0xdfeaff, 0x3a2a1a, night ? 0.25 : 0.6));
    // room
    const floor = mesh(new THREE.PlaneGeometry(20, 20), std(0x6b4a30, 0.6), false); floor.rotation.x = -Math.PI / 2; s.add(floor);
    const wall = mesh(new THREE.PlaneGeometry(20, 8), std(night ? 0x2a3044 : 0xe8e2d6, 0.9), false); wall.position.set(0, 4, -2.2); s.add(wall);
    // window with the city behind
    const cityTex = canvasTex(1024, 512, (c) => {
      const g = c.createLinearGradient(0, 0, 0, 512); if (night) { g.addColorStop(0, '#0a1430'); g.addColorStop(1, '#283a68'); } else { g.addColorStop(0, m === 'laptop' ? '#ffe2b0' : '#8fc4ef'); g.addColorStop(1, m === 'laptop' ? '#ffd090' : '#dff0ff'); }
      c.fillStyle = g; c.fillRect(0, 0, 1024, 512);
      for (let i = 0; i < 40; i++) { const x = i * 26 + R() * 10, h = 120 + R() * 300; c.fillStyle = night ? '#0b1530' : m === 'laptop' ? 'rgba(180,140,110,0.55)' : 'rgba(120,150,180,0.6)'; c.fillRect(x, 512 - h, 24, h);
        if (night) for (let k = 0; k < 12; k++) if (R() > 0.5) { c.fillStyle = R() > 0.3 ? '#ffd27a' : '#ff9a4a'; c.fillRect(x + 3 + R() * 16, 512 - h + 8 + R() * (h - 16), 4, 5); } }
    });
    const win = mesh(new THREE.PlaneGeometry(4.6, 2.6), new THREE.MeshBasicMaterial({ map: cityTex }), false); win.position.set(-0.6, 2.6, -2.18); s.add(win);
    const frameM = std(0x2a2a2e, 0.5);
    for (const [x, y, w, h] of [[-0.6, 3.93, 4.8, 0.08], [-0.6, 1.27, 4.8, 0.08], [-2.93, 2.6, 0.08, 2.7], [1.73, 2.6, 0.08, 2.7], [-0.6, 2.6, 0.06, 2.6]] as const) { const fr = mesh(new THREE.BoxGeometry(w, h, 0.08), frameM); fr.position.set(x, y, -2.14); s.add(fr); }
    // desk
    const wood = std(0x8a5a34, 0.45);
    const top = mesh(new THREE.BoxGeometry(2.2, 0.06, 0.9), wood); top.position.set(0, 0.76, 0); s.add(top);
    for (const [x, z] of [[-1.02, -0.38], [1.02, -0.38], [-1.02, 0.38], [1.02, 0.38]] as const) { const l = mesh(new THREE.BoxGeometry(0.06, 0.74, 0.06), std(0x2a2a2e, 0.4, { metalness: 0.6 })); l.position.set(x, 0.37, z); s.add(l); }
    // chair
    if (m === 'empty') { const chair = mesh(new RoundedBoxGeometry(0.6, 0.8, 0.12, 2, 0.05), std(0x24262c, 0.7)); chair.position.set(1.3, 1.0, 0.6); chair.rotation.set(0.12, -0.7, 0); s.add(chair); }
    // monitor with code (or a laptop in 'laptop' mode)
    this.codeCv.width = 1024; this.codeCv.height = 600; this.codeTex = new THREE.CanvasTexture(this.codeCv); this.codeTex.colorSpace = THREE.SRGBColorSpace;
    this.screenMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: this.codeTex, emissiveIntensity: m === 'empty' ? 0 : 1.1, roughness: 0.2 });
    if (m !== 'laptop') {
      const mon = new THREE.Group();
      const bez = mesh(new RoundedBoxGeometry(1.1, 0.66, 0.05, 2, 0.02), std(0x111114, 0.4)); mon.add(bez);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.04, 0.6), this.screenMat); scr.position.z = 0.027; mon.add(scr);
      const st = mesh(new THREE.BoxGeometry(0.06, 0.32, 0.05), std(0x222226)); st.position.set(0, -0.45, -0.04); mon.add(st);
      const bs = mesh(new THREE.BoxGeometry(0.34, 0.02, 0.22), std(0x222226)); bs.position.set(0, -0.61, 0); mon.add(bs);
      mon.position.set(0, 1.4, -0.2); s.add(mon);
      if (m === 'night' || m === 'robot') { const glow = new THREE.RectAreaLight ? new THREE.PointLight(0x7fb8ff, night ? 1.6 : 0.6, 3) : null; if (glow) { glow.position.set(0, 1.3, 0.3); s.add(glow); } }
    } else {
      const base = mesh(new RoundedBoxGeometry(0.9, 0.035, 0.6, 2, 0.015), std(0xb8bcc4, 0.35, { metalness: 0.7 })); base.position.set(0, 0.81, 0.05); s.add(base);
      this.lid = new THREE.Group(); this.lid.position.set(0, 0.83, -0.25);
      const lidM = mesh(new RoundedBoxGeometry(0.9, 0.6, 0.02, 2, 0.01), std(0xb8bcc4, 0.35, { metalness: 0.7 })); lidM.position.y = 0.3; this.lid.add(lidM);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.52), this.screenMat); scr.position.set(0, 0.3, 0.011); this.lid.add(scr);
      s.add(this.lid);
    }
    // keyboard
    if (m !== 'empty' && m !== 'laptop') {
      const kb = mesh(new RoundedBoxGeometry(0.7, 0.03, 0.22, 2, 0.01), std(0x2b2d33, 0.5)); this.keyboard.add(kb);
      const keys = new THREE.InstancedMesh(new RoundedBoxGeometry(0.038, 0.02, 0.038, 1, 0.006), std(0xe8e4dc, 0.5), 75); let k = 0; const M = new THREE.Matrix4();
      for (let r = 0; r < 5; r++) for (let c = 0; c < 15; c++) keys.setMatrixAt(k++, M.makeTranslation(-0.315 + c * 0.045, 0.024, -0.09 + r * 0.045));
      keys.castShadow = true; this.keyboard.add(keys); this.keyboard.position.set(0, 0.805, 0.2); s.add(this.keyboard);
    }
    // mugs: a pile of coffee cups and the panda mug
    const cupG = new THREE.CylinderGeometry(0.045, 0.038, 0.11, 16, 1, true), cupM = std(0xf2ece0, 0.5, { side: THREE.DoubleSide });
    if (m === 'night' || m === 'robot') for (let i = 0; i < 9; i++) { const cup = mesh(cupG, cupM); cup.position.set(-0.85 + (i % 4) * 0.1 + R() * 0.02, 0.85 + Math.floor(i / 4) * 0.1, -0.1 + (i % 3) * 0.08); cup.rotation.z = (R() - 0.5) * 0.3; s.add(cup); }
    const panda = new THREE.Group();
    const faceTex = canvasTex(512, 160, (c) => { c.fillStyle = '#f6f3ee'; c.fillRect(0, 0, 512, 160); c.fillStyle = '#16161a'; for (const x of [200, 300]) { c.beginPath(); c.ellipse(x, 70, 30, 40, x < 256 ? 0.5 : -0.5, 0, 7); c.fill(); } c.fillStyle = '#fff'; for (const x of [205, 295]) { c.beginPath(); c.arc(x, 66, 9, 0, 7); c.fill(); } c.fillStyle = '#16161a'; c.beginPath(); c.ellipse(250, 110, 16, 10, 0, 0, 7); c.fill(); });
    faceTex.wrapS = THREE.RepeatWrapping; faceTex.offset.x = 0.25;
    const pm = mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.14, 24), new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.4 })); panda.add(pm);
    for (const sx of [-1, 1]) { const ear = mesh(new THREE.SphereGeometry(0.025, 10, 8), std(0x16161a)); ear.position.set(sx * 0.045, 0.075, 0); panda.add(ear); }
    const handle = mesh(new THREE.TorusGeometry(0.035, 0.01, 8, 16), std(0xf6f3ee)); handle.position.set(0.08, 0, 0); handle.rotation.y = Math.PI / 2; panda.add(handle);
    panda.position.set(0.7, 0.86, 0.15); panda.rotation.y = -0.4; s.add(panda);
    // desk lamp
    const lampOn = m === 'night' || m === 'robot';
    const lb = mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.03, 16), std(0x2a2a2e, 0.4, { metalness: 0.5 })); lb.position.set(-0.85, 0.8, -0.25); s.add(lb);
    const la = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.6, 8), std(0x2a2a2e)); la.position.set(-0.8, 1.1, -0.2); la.rotation.z = -0.3; s.add(la);
    const sh = mesh(new THREE.ConeGeometry(0.12, 0.16, 16, 1, true), std(0xd06a2a, 0.5, { side: THREE.DoubleSide, emissive: lampOn ? 0xffa050 : 0, emissiveIntensity: 0.4 })); sh.position.set(-0.68, 1.38, -0.12); sh.rotation.z = 0.6; s.add(sh);
    if (lampOn) { const sp = new THREE.SpotLight(0xffc888, 8, 4, 0.8, 0.6); sp.position.set(-0.66, 1.33, -0.1); sp.target.position.set(-0.2, 0.76, 0.1); sp.castShadow = true; s.add(sp, sp.target); }
    // wall clock
    const clock = new THREE.Group(); const face = mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 32), std(0xf4efe4, 0.5)); face.rotation.x = Math.PI / 2; clock.add(face);
    for (const [len, w] of [[0.16, 0.022], [0.23, 0.014]] as const) { const h = new THREE.Group(); const hm = mesh(new THREE.BoxGeometry(w, len, 0.01), std(0x1a1a1a)); hm.position.y = len / 2; h.add(hm); h.position.z = 0.03; clock.add(h); this.hands.push(h); }
    clock.position.set(2.4, 3.0, -2.15); s.add(clock);
    // sunlight for day moods, moonlight for night
    const sunM = m === 'laptop';
    const dl = new THREE.DirectionalLight(sunM ? 0xffd9a0 : night ? 0x6a86c8 : 0xfff2e0, sunM ? 2.0 : m === 'empty' ? 1.4 : night ? 0.5 : 1.8);
    dl.position.set(-2.5, 4, -6); dl.target.position.set(0.2, 0.8, 0.2); dl.castShadow = true; dl.shadow.mapSize.set(2048, 2048);
    Object.assign(dl.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 20 }); dl.shadow.radius = 4; s.add(dl, dl.target);
    if (sunM) { // dust in the beam
      const dm = new THREE.MeshBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: 0.8 });
      this.dust = new THREE.InstancedMesh(new THREE.SphereGeometry(0.006, 6, 4), dm, 260); s.add(this.dust);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.4, 6, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.03, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      beam.position.set(-1.2, 2.3, -1.4); beam.lookAt(0.2, 0.8, 0.2); beam.rotateX(Math.PI / 2); s.add(beam);
    }
    if (m === 'empty') { // cardboard box with belongings, rain outside
      const card = std(0xb98c5a, 0.9);
      const bx = new THREE.Group(); const bottom = mesh(new THREE.BoxGeometry(0.5, 0.02, 0.36), card); bx.add(bottom);
      for (const [x, z, w, d] of [[0, 0.18, 0.5, 0.02], [0, -0.18, 0.5, 0.02], [0.25, 0, 0.02, 0.36], [-0.25, 0, 0.02, 0.36]] as const) { const sd = mesh(new THREE.BoxGeometry(w, 0.3, d), card); sd.position.set(x, 0.15, z); bx.add(sd); }
      const plant = mesh(new THREE.IcosahedronGeometry(0.1, 2), std(0x4f8a34)); plant.position.set(-0.1, 0.36, 0); bx.add(plant);
      const frame = mesh(new THREE.BoxGeometry(0.16, 0.2, 0.02), std(0x2a2a2a)); frame.position.set(0.1, 0.3, -0.05); frame.rotation.x = -0.2; bx.add(frame);
      bx.position.set(-0.2, 0.8, 0.05); bx.rotation.y = 0.2; s.add(bx);
      panda.position.set(0.0, 0.94, 0.05); bx.add(panda); panda.position.set(0.12, 0.17, 0.08);
      this.rain = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.006, 0.18), new THREE.MeshBasicMaterial({ color: 0xaac4ff, transparent: true, opacity: 0.55 }), 500); s.add(this.rain);
    }
    if (m === 'robot') { // a jointed robot arm on a post at the right of the desk
      const metal = std(0xe7e9ee, 0.35, { metalness: 0.4 }), dark = std(0x2a2c32, 0.4, { metalness: 0.6 }), orange = std(0xf08a2a, 0.45);
      const base = mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.1, 24), dark); base.position.set(0.95, 0.84, -0.3); s.add(base);
      const j0 = new THREE.Group(); j0.position.set(0.95, 0.9, -0.3); s.add(j0);
      const seg = (len: number, mat: THREE.Material, parent: THREE.Object3D) => { const j = new THREE.Group(); const sm = mesh(new RoundedBoxGeometry(0.08, len, 0.08, 2, 0.03), mat); sm.position.y = len / 2; j.add(sm); const hub = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 16), dark); hub.rotation.x = Math.PI / 2; j.add(hub); parent.add(j); return j; };
      const j1 = seg(0.55, orange, j0), j2 = seg(0.5, metal, j1); j2.position.y = 0.55; const j3 = seg(0.16, dark, j2); j3.position.y = 0.5;
      for (const sx of [-1, 1]) { const finger = mesh(new THREE.BoxGeometry(0.015, 0.09, 0.05), dark); finger.position.set(sx * 0.05, 0.2, 0); j3.add(finger); }
      this.arm = [j0, j1, j2, j3];
    }
  }
  drawCode(t: number) {
    const c = this.codeCv.getContext('2d')!, m = this.mode;
    c.fillStyle = m === 'robot' ? '#0f1a14' : '#0e1424'; c.fillRect(0, 0, 1024, 600);
    c.font = '500 26px "Plex Mono"';
    const cols = ['#7fd0ff', '#ffd27f', '#9cf0a0', '#ff8f9a', '#c9a6ff'], off = Math.floor(t * (m === 'night' ? 6 : 3));
    for (let i = 0; i < 18; i++) {
      const n = i + off, ind = (hash(n) * 4) | 0, len = 6 + ((hash(n, 1) * 30) | 0);
      c.fillStyle = cols[n % 5]!; c.fillText(m === 'robot' && i > 14 ? '> AI: tôi làm thay rồi nhé ✓' : '█'.repeat(0) + ' '.repeat(ind * 2) + 'const x = ' + 'abcdefghijkl'.slice(0, (len % 12) + 1) + '();', 30, 40 + i * 32);
    }
    if (m === 'robot') { c.fillStyle = '#9cf0a0'; c.font = '700 40px "Plex Mono"'; c.fillText('AI đang gõ' + '.'.repeat(1 + (Math.floor(t * 3) % 3)), 30, 580); }
    this.codeTex.needsUpdate = true;
  }
  shot(f: FrameInfo): Shot {
    const m = this.mode, L = f.local, p = f.progress;
    this.drawCode(f.t);
    // clock: time-lapse at night, normal otherwise
    const sp = m === 'night' ? 40 : 1; this.hands[0]!.rotation.z = -f.t * sp * 0.01; this.hands[1]!.rotation.z = -f.t * sp * 0.12;
    if (m === 'robot' && this.arm.length) {
      const [j0, j1, j2, j3] = this.arm as [THREE.Group, THREE.Group, THREE.Group, THREE.Group];
      const rest = new THREE.Vector3(0.75, 1.75, -0.3), kb = new THREE.Vector3(0, 0.9, 0.2), away = new THREE.Vector3(0.8, 1.5, -0.45);
      const T = L < 1.6 ? rest.clone().lerp(kb, ease(L / 1.4)) : kb.clone().lerp(away, ease((L - 1.9) / 2.0));
      const B = j0.position, dx = T.x - B.x, dz = T.z - B.z, d = Math.hypot(dx, dz), v = T.y - B.y;
      j0.rotation.y = Math.atan2(dz, -dx);
      const L1 = 0.55, L2 = 0.7, r = Math.min(L1 + L2 - 1e-3, Math.hypot(d, v)), phi = Math.atan2(d, v);
      const al = Math.acos(clamp((L1 * L1 + r * r - L2 * L2) / (2 * L1 * r), -1, 1)), be = Math.acos(clamp((L1 * L1 + L2 * L2 - r * r) / (2 * L1 * L2), -1, 1));
      j1.rotation.z = phi - al; j2.rotation.z = Math.PI - be; j3.rotation.z = 0;
      if (L > 1.5) { j3.updateMatrixWorld(true); const gp = new THREE.Vector3(0, 0.2, 0); j3.localToWorld(gp); this.keyboard.position.copy(gp).add(new THREE.Vector3(0, -0.05, 0)); this.keyboard.rotation.set(0, j0.rotation.y, 0.3 * ease((L - 1.9) / 2)); }
      else { this.keyboard.position.set(0, 0.805, 0.2); this.keyboard.rotation.set(0, 0, 0); }
    }
    if (this.rain) { const M = new THREE.Matrix4(); for (let i = 0; i < 500; i++) { const y = 4 - ((f.t * 6 + hash(i) * 4) % 3); M.makeTranslation(-2.8 + hash(i, 1) * 4.4, y, -2.3 - hash(i, 2) * 0.5); this.rain.setMatrixAt(i, M); } this.rain.instanceMatrix.needsUpdate = true; }
    if (this.lid) { const close = ease((L - 0.6) / (this.ctx.end - this.ctx.start - 1.6)); this.lid.rotation.x = -1.9 * (1 - close) + 0; this.screenMat!.emissiveIntensity = 1.1 * (1 - close); }
    if (this.dust) { const M = new THREE.Matrix4(); for (let i = 0; i < 260; i++) { M.makeTranslation(-1.5 + hash(i) * 2.2 + 0.1 * Math.sin(f.t * 0.5 + i), 0.9 + ((hash(i, 1) * 2.4 + f.t * 0.05) % 2.4), -1.2 + hash(i, 2) * 1.6); this.dust.setMatrixAt(i, M); } this.dust.instanceMatrix.needsUpdate = true; }
    const cams: Record<DeskMode, () => void> = {
      night: () => { this.cam.position.set(0.9 - L * 0.08, 1.35, 1.9 - L * 0.12); this.cam.lookAt(-0.05, 1.05, -0.1); },
      robot: () => { this.cam.position.set(-0.6 + L * 0.05, 1.5, 2.0); this.cam.lookAt(0.3, 1.0, -0.1); },
      empty: () => { this.cam.position.set(1.2 - L * 0.06, 1.35, 1.9); this.cam.lookAt(-0.3, 1.1, -1.0); },
      laptop: () => { this.cam.position.set(0.25, 1.05 + p * 0.1, 1.3 - p * 0.15); this.cam.lookAt(0, 0.95, -0.2); },
    };
    cams[m]();
    return { scene: this.scene, camera: this.cam, post: { ...ROOM_POST, exposure: m === 'empty' ? 1.5 : m === 'laptop' ? 0.42 : 1, focus: this.cam.position.distanceTo(new THREE.Vector3(0, 1, 0)), aperture: 10, tint: m === 'empty' ? [0.85, 0.95, 1.15] : [1, 1, 1] } };
  }
}

// ================================================================== 4 · meeting room: charts, flying calendar pages, the DEADLINE stamp
export class Meeting extends Story {
  pages: { m: THREE.Mesh; t0: number; v: THREE.Vector3; r: THREE.Vector3 }[] = [];
  stamp = new THREE.Group(); decal!: THREE.Mesh;
  override init() {
    const s = this.scene, R = mulberry(5);
    s.background = new THREE.Color(0x9aa4ae); s.environment = this.ctx.env; s.environmentIntensity = 0.35;
    s.add(new THREE.HemisphereLight(0xffffff, 0x8a8478, 0.35));
    const dl = new THREE.DirectionalLight(0xfff4e6, 2); dl.position.set(4, 6, 3); dl.castShadow = true; dl.shadow.mapSize.set(2048, 2048); Object.assign(dl.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 }); s.add(dl);
    const floor = mesh(new THREE.PlaneGeometry(30, 30), std(0x8f8a84, 0.8), false); floor.rotation.x = -Math.PI / 2; s.add(floor);
    const wall = mesh(new THREE.PlaneGeometry(30, 8), std(0xbfc6cc, 0.9), false); wall.position.set(0, 4, -4); s.add(wall);
    const board = canvasTex(1024, 512, (c) => {
      c.fillStyle = '#fbfbf8'; c.fillRect(0, 0, 1024, 512); c.strokeStyle = '#2a4a8a'; c.lineWidth = 6;
      c.beginPath(); c.moveTo(60, 440); c.lineTo(60, 60); c.moveTo(60, 440); c.lineTo(560, 440); c.stroke();
      [180, 260, 120, 330, 290].forEach((h, i) => { c.fillStyle = ['#e0483a', '#3a7ae0', '#f2a23a', '#3aaa5a', '#8a5ae0'][i]!; c.fillRect(100 + i * 90, 440 - h, 60, h); });
      c.strokeStyle = '#e0483a'; c.lineWidth = 8; c.beginPath(); c.moveTo(620, 400); c.lineTo(720, 300); c.lineTo(800, 340); c.lineTo(960, 120); c.stroke();
      c.fillStyle = '#1a1a1a'; c.font = '700 54px "Marker Felt", "Archivo"'; c.fillText('KPI Q4 !!!', 640, 470); c.fillText('OKR?', 820, 220);
      for (let i = 0; i < 6; i++) { c.fillStyle = ['#ffe26a', '#ff9fb0', '#9fe0ff'][i % 3]!; c.fillRect(600 + (i % 3) * 120, 20 + Math.floor(i / 3) * 80, 100, 70); }
    });
    const wb = mesh(new THREE.PlaneGeometry(4.2, 2.1), new THREE.MeshStandardMaterial({ map: board, roughness: 0.4 }), false); wb.position.set(-0.6, 2.4, -3.95); s.add(wb);
    const table = mesh(new RoundedBoxGeometry(5, 0.08, 1.6, 2, 0.03), std(0x6a4a34, 0.35)); table.position.set(0, 0.76, -0.6); s.add(table);
    const leg = mesh(new THREE.BoxGeometry(4, 0.7, 0.3), std(0x2a2a2e, 0.4)); leg.position.set(0, 0.37, -0.6); s.add(leg);
    for (let i = 0; i < 8; i++) { const ch = mesh(new RoundedBoxGeometry(0.55, 0.75, 0.1, 2, 0.04), std(0x30343c, 0.6)); const sx = (i % 4) * 1.2 - 1.8, sz = i < 4 ? -1.7 : 0.55; ch.position.set(sx, 1.05, sz); ch.rotation.y = i < 4 ? 0 : Math.PI; ch.rotation.x = 0.1; s.add(ch); }
    // calendar pages
    const pageTex = (d: number) => canvasTex(256, 300, (c) => { c.fillStyle = '#fff'; c.fillRect(0, 0, 256, 300); c.fillStyle = '#d0342a'; c.fillRect(0, 0, 256, 70); c.fillStyle = '#fff'; c.font = '700 40px "Archivo"'; c.textAlign = 'center'; c.fillText('THỨ ' + (2 + (d % 6)), 128, 50); c.fillStyle = '#222'; c.font = '900 150px "Archivo"'; c.fillText(String(d), 128, 230); });
    for (let i = 0; i < 16; i++) {
      const pm = mesh(new THREE.PlaneGeometry(0.42, 0.5), new THREE.MeshStandardMaterial({ map: pageTex(10 + i), side: THREE.DoubleSide, roughness: 0.6 }), true);
      s.add(pm); this.pages.push({ m: pm, t0: i * 0.3, v: new THREE.Vector3((R() - 0.5) * 2, 0.4 + R() * 0.8, 1.6 + R()), r: new THREE.Vector3(R() * 5, R() * 5, R() * 5) });
    }
    // paper + stamp
    const paper = mesh(new THREE.PlaneGeometry(0.6, 0.8), std(0xfbf8f0, 0.7), false); paper.rotation.x = -Math.PI / 2; paper.rotation.z = 0.1; paper.position.set(0.4, 0.805, 0); s.add(paper);
    const dtex = canvasTex(512, 256, (c) => { c.strokeStyle = '#c8241c'; c.lineWidth = 16; c.strokeRect(20, 30, 472, 196); c.fillStyle = '#c8241c'; c.font = '900 110px "Archivo"'; c.textAlign = 'center'; c.fillText('DEADLINE', 256, 170); });
    this.decal = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshBasicMaterial({ map: dtex, transparent: true })); this.decal.rotation.x = -Math.PI / 2; this.decal.rotation.z = 0.1 + 0.06; this.decal.position.set(0.4, 0.808, 0); s.add(this.decal);
    const handle = mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.3, 16), std(0x5a2a1a, 0.4)); handle.position.y = 0.3; this.stamp.add(handle);
    const knob = mesh(new THREE.SphereGeometry(0.08, 16, 12), std(0x5a2a1a, 0.4)); knob.position.y = 0.48; this.stamp.add(knob);
    const sb = mesh(new THREE.BoxGeometry(0.52, 0.12, 0.28), std(0x2a2a2a, 0.5)); sb.position.y = 0.08; this.stamp.add(sb);
    const rubber = mesh(new THREE.BoxGeometry(0.5, 0.02, 0.26), std(0xc8241c, 0.6)); rubber.position.y = 0.01; this.stamp.add(rubber);
    this.stamp.rotation.y = -0.06; s.add(this.stamp);
  }
  shot(f: FrameInfo): Shot {
    const L = f.local;
    this.pages.forEach(({ m, t0, v, r }) => { const u = L - t0; m.visible = u > 0; if (u <= 0) return; m.position.set(1.8 + v.x * u, 2.6 + v.y * u - 0.3 * u * u, -3.8 + v.z * u); m.rotation.set(r.x * u, r.y * u, r.z * u); });
    // the stamp hits on every second beat, starting with the first beat of the shot
    const b0 = Math.ceil(this.ctx.audio.beatAt(this.ctx.start + 0.4) / 2) * 2, b = f.beat;
    const k = Math.floor((b - b0) / 2), ph = (b - b0) / 2 - k, firstHit = this.ctx.audio.timeOfBeat(b0);
    const down = b < b0 ? clamp((b - (b0 - 1)) ) : ph < 0.08 ? 0 : ph < 0.5 ? (ph - 0.08) / 0.42 : 1 - (ph - 0.5) * 2 * 0;
    const h = b < b0 ? 0.55 - 0.55 * Math.pow(clamp(b - (b0 - 0.5)) , 3) : ph < 0.12 ? 0 : Math.min(0.55, (ph - 0.12) * 2.4);
    this.stamp.position.set(0.4, 0.81 + h, 0); void down;
    this.decal.visible = f.t >= firstHit;
    const shake = f.t >= firstHit && ph < 0.1 ? 10 * (1 - ph / 0.1) : 0;
    this.cam.position.set(2.0 - L * 0.05, 1.85, 2.1 - L * 0.05); this.cam.lookAt(-0.2, 1.05, -1.4);
    return { scene: this.scene, camera: this.cam, post: { ...ROOM_POST, exposure: 0.7, focus: 2.6, aperture: 4, shake: [shake * Math.sin(f.t * 90), shake * Math.cos(f.t * 70)] } };
  }
}

// ================================================================== 5 · AI lab: server aisles and a glowing neural net
export class AILab extends Story {
  leds!: THREE.InstancedMesh; net = new THREE.Group(); pulses!: THREE.InstancedMesh; edges: [THREE.Vector3, THREE.Vector3][] = [];
  ledZ: number[] = []; nodeMeshes: THREE.Mesh[] = []; nodeMat!: THREE.MeshBasicMaterial; lineMat!: THREE.LineBasicMaterial; glow!: THREE.PointLight;
  hook = this.ctx.params.mode === 'hook';
  override init() {
    const s = this.scene; s.background = new THREE.Color(0x03060c); s.environment = this.ctx.env; s.environmentIntensity = 0.08; s.fog = new THREE.FogExp2(0x050a14, 0.05);
    const floor = mesh(new THREE.PlaneGeometry(60, 60), std(0x0b0f16, 0.25, { metalness: 0.6 }), false); floor.rotation.x = -Math.PI / 2; s.add(floor);
    s.add(new THREE.HemisphereLight(0x2a4a7a, 0x05070a, 0.4));
    const rack = new RoundedBoxGeometry(0.7, 2.2, 1.1, 2, 0.03), rm = std(0x14171e, 0.4, { metalness: 0.5 });
    const N = 2 * 14 * 60; this.leds = new THREE.InstancedMesh(new THREE.BoxGeometry(0.04, 0.02, 0.01), new THREE.MeshBasicMaterial({ color: 0xffffff }), N);
    const M = new THREE.Matrix4(); let k = 0;
    for (const sx of [-1, 1]) for (let i = 0; i < 14; i++) {
      const x = sx * 2.2, z = -i * 1.2; const r = mesh(rack, rm); r.position.set(x, 1.1, z); s.add(r);
      for (let j = 0; j < 60; j++) { const lz = z - 0.4 + Math.floor(j / 20) * 0.35; M.makeTranslation(x - sx * 0.36, 0.3 + (j % 20) * 0.09, lz); this.ledZ[k] = lz; this.leds.setMatrixAt(k++, M); }
    }
    s.add(this.leds);
    // neural net: 4 layers of nodes, edges between neighbours, pulses running along edges
    const layers = [5, 8, 8, 5], nodes: THREE.Vector3[][] = [], nm = (this.nodeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 0.9, 1.6) }));
    layers.forEach((n, li) => { nodes.push([]); for (let i = 0; i < n; i++) { const p = new THREE.Vector3((li - 1.5) * 0.9, (i - (n - 1) / 2) * 0.32, Math.sin(i * 1.7 + li) * 0.3); nodes[li]!.push(p); const sp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), nm); sp.position.copy(p); this.net.add(sp); this.nodeMeshes.push(sp); } });
    const seg: number[] = [];
    for (let li = 0; li < 3; li++) for (const a of nodes[li]!) for (const b of nodes[li + 1]!) { seg.push(a.x, a.y, a.z, b.x, b.y, b.z); this.edges.push([a, b]); }
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
    this.lineMat = new THREE.LineBasicMaterial({ color: new THREE.Color(0.2, 0.5, 0.9), transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending });
    this.net.add(new THREE.LineSegments(lg, this.lineMat));
    this.pulses = new THREE.InstancedMesh(new THREE.SphereGeometry(0.025, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.3, 0.6) }), 60); this.net.add(this.pulses);
    const ped = mesh(new THREE.CylinderGeometry(0.8, 1, 0.3, 32), std(0x1a2230, 0.3, { metalness: 0.7 })); ped.position.set(0, 0.15, -9); s.add(ped);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.02, 8, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 0.9, 1.6) })); ring.rotation.x = Math.PI / 2; ring.position.set(0, 0.31, -9); s.add(ring);
    this.net.position.set(0, 1.9, -9); s.add(this.net);
    const glow = (this.glow = new THREE.PointLight(0x5ac8ff, 6, 8)); glow.position.set(0, 2, -8.5); s.add(glow);
  }
  shot(f: FrameInfo): Shot {
    if (this.hook) return this.hookShot(f);
    const C = new THREE.Color();
    for (let i = 0; i < this.leds.count; i++) { const on = hash(i, Math.floor(f.t * 6 + hash(i) * 6)) > 0.45; this.leds.setColorAt(i, on ? C.setHSL(hash(i, 9) > 0.7 ? 0.33 : 0.55, 1, 0.6).multiplyScalar(1.8) : C.setRGB(0.02, 0.03, 0.05)); }
    this.leds.instanceColor!.needsUpdate = true;
    this.net.rotation.y = f.t * 0.35; this.net.scale.setScalar(1 + 0.05 * pulse(f.beat));
    const M = new THREE.Matrix4(), P = new THREE.Vector3();
    for (let i = 0; i < 60; i++) { const [a, b] = this.edges[(i * 7) % this.edges.length]!; const u = (f.t * 0.8 + hash(i)) % 1; P.copy(a).lerp(b, u); M.makeTranslation(P.x, P.y, P.z); this.pulses.setMatrixAt(i, M); }
    this.pulses.instanceMatrix.needsUpdate = true;
    this.cam.position.set(0.3, 1.6, 3 - f.local * 1.1); this.cam.lookAt(0, 1.8, -9);
    return { scene: this.scene, camera: this.cam, post: { bloom: 0.9, vignette: 0.35, grain: 0.02, exposure: 1, focus: 9 + f.local, aperture: 6, tint: [0.9, 1, 1.15] } };
  }
  /** cold-open hook: everything moves with the music — the net boots up, swells on each beat, LED waves race down
   *  the aisles, and every bar gets its own camera move, ending in a white flash on the cut to the village */
  hookShot(f: FrameInfo): Shot {
    const a = this.ctx.audio, t = f.t, P = pulse(f.beat), kick = a.pulse('kick', t, 0.1), low = a.env('low', t);
    const bar = a.barAt(t), bi = Math.floor(bar), bp = bar - bi, end = this.ctx.end;
    // the net boots up node by node over the first two seconds, then pumps
    const n = this.nodeMeshes.length, shown = Math.floor(clamp(t / 2.4) * n);
    this.nodeMeshes.forEach((m, i) => { m.visible = i < shown || t > 2.4; m.scale.setScalar(1 + 0.9 * P * (i % 3 === Math.floor(f.beat) % 3 ? 1 : 0.4)); });
    const down = Math.pow(1 - bp, 6);
    this.nodeMat.color.setRGB(0.4 + 1.4 * down, 0.9 + 0.5 * down, 1.6 - 0.8 * down);
    this.lineMat.opacity = clamp(t / 2.4) * (0.35 + 0.65 * P);
    this.net.rotation.y = t * (0.5 + 0.25 * t) ; this.net.rotation.x = 0.15 * Math.sin(t * 1.3);
    this.net.scale.setScalar(1 + 0.22 * P + 0.4 * kick + 0.3 * clamp((t - 7.8) / 2.4));
    this.glow.intensity = 6 + 18 * P;
    // LED wave racing down both aisles on every beat
    const C = new THREE.Color(), wave = -(f.beat % 1) * 18 + 1;
    for (let i = 0; i < this.leds.count; i++) {
      const w = Math.exp(-((this.ledZ[i]! - wave) ** 2) / 0.8), tw = hash(i, Math.floor(t * 8)) > 0.6 ? 0.35 : 0.05;
      this.leds.setColorAt(i, C.setHSL(hash(i, 9) > 0.75 ? 0.08 : 0.55, 1, 0.55).multiplyScalar((tw + 2.4 * w) * clamp(t / 1.5)));
    }
    this.leds.instanceColor!.needsUpdate = true;
    const M = new THREE.Matrix4(), Pv = new THREE.Vector3();
    for (let i = 0; i < 60; i++) { const [p0, p1] = this.edges[(i * 7) % this.edges.length]!; const u = (t * (1.2 + low) + hash(i)) % 1; Pv.copy(p0).lerp(p1, u); M.makeTranslation(Pv.x, Pv.y, Pv.z); this.pulses.setMatrixAt(i, M); }
    this.pulses.instanceMatrix.needsUpdate = true;
    // a camera move per bar
    const c = this.cam, e = ease(bp), B = new THREE.Vector3(0, 1.9, -9);
    if (bi <= 0) { c.position.set(0.2, 1.2 + e * 0.3, 7 - e * 3); c.lookAt(B); }
    else if (bi === 1) { const ang = -0.9 + e * 1.8; c.position.set(B.x + Math.sin(ang) * 3.4, 1.6 + 0.4 * Math.sin(e * 3), B.z + Math.cos(ang) * 3.4); c.lookAt(B); }
    else if (bi === 2) { c.position.set(-1.2 + e * 1.2, 0.5 + e * 1.0, 4 - e * 9.5); c.lookAt(B.x, B.y - 0.3 * (1 - e), B.z); }
    else { const ang = 0.8 + e * 2.4, r = 2.6 - e * 1.6; c.position.set(B.x + Math.sin(ang) * r, 1.9 + 0.3 * Math.sin(e * 6), B.z + Math.cos(ang) * r); c.lookAt(B); }
    c.fov = 40 - 8 * kick; c.updateProjectionMatrix();
    const sh = 14 * Math.pow(1 - bp, 8) * (bi >= 1 ? 1 : 0) + 6 * kick;
    const flash = Math.max(0.55 * Math.pow(1 - bp, 10) * (bi >= 1 ? 1 : 0), clamp((t - (end - 0.25)) / 0.25));
    return { scene: this.scene, camera: c, post: { bloom: 1.0 + 0.8 * P, vignette: 0.35, grain: 0.02, exposure: clamp(t / 0.6) * (1 + 0.3 * P), focus: c.position.distanceTo(B), aperture: 7, flash, shake: [sh * Math.sin(t * 97), sh * Math.cos(t * 83)], tint: [0.9, 1, 1.15] } };
  }

  override overlay(c: CanvasRenderingContext2D, f: FrameInfo) {
    if (!this.hook) return lyricsOverlay(this.ctx, c, f);
    // punch lines slammed in on the bar downbeats (and the last two beats)
    const a = this.ctx.audio, d = a.downbeats.filter((x) => x < this.ctx.end + 0.01);
    const cues: [number, string, string][] = [
      [d[0] ?? 2.56, 'MƠ VÀO BIG TECH?', '#ffffff'],
      [d[1] ?? 5.17, 'AI LÀM HẾT RỒI…', '#7fe0ff'],
      [d[2] ?? 7.78, 'THÔI THÌ…', '#ffffff'],
      [a.timeOfBeat(a.beatAt(d[2] ?? 7.78) + 2), 'VỀ QUÊ', '#ffd24a'],
      [a.timeOfBeat(a.beatAt(d[2] ?? 7.78) + 3), 'CHĂN BÒ!', '#ffd24a'],
    ];
    const cur = cues.filter(([t0]) => f.t >= t0).pop(); if (!cur) return;
    const u = f.t - cur[0], sc = 1 + 1.4 * Math.pow(1 - clamp(u / 0.14), 3), rot = (hash(cur[0]) - 0.5) * 0.08;
    c.save(); c.translate(960, 560); c.rotate(rot); c.scale(sc, sc);
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '700 150px "Marker Felt", "Archivo"'; c.lineJoin = 'round';
    c.lineWidth = 22; c.strokeStyle = 'rgba(10,8,20,0.9)'; c.strokeText(cur[1], 0, 0);
    c.fillStyle = cur[2]; c.fillText(cur[1], 0, 0);
    if (cur[1] === 'CHĂN BÒ!') { c.font = '120px "Apple Color Emoji"'; c.fillText('🐄🔔', 0, 150); }
    c.restore();
  }
}

// ================================================================== 6 · the data sky over the campus
export class DataSky extends Story {
  city!: City; glyphs: { s: THREE.Sprite; base: THREE.Vector3; ph: number }[] = [];
  override init() {
    this.city = new City(this.ctx.renderer);
    const toks = ['AI', '</>', '{ }', '01', 'GPU', '∞', 'LLM', '✦', '#', 'λ', 'API', '[]', '=>', '⌘'];
    const mats = toks.map((tk) => new THREE.SpriteMaterial({ map: canvasTex(256, 128, (c) => { c.font = '700 90px "Plex Mono"'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = '#3aa0ff'; c.shadowBlur = 10; c.fillStyle = '#d8f0ff'; c.fillText(tk, 128, 66); }), transparent: true, depthWrite: false, fog: false }));
    const R = mulberry(3);
    for (let cl = 0; cl < 12; cl++) {
      const cx = (R() - 0.5) * 420, cy = 110 + R() * 120, cz = -220 - R() * 300;
      for (let i = 0; i < 16; i++) {
        const sp = new THREE.Sprite(mats[Math.floor(R() * mats.length)]!); const sc = 11 + R() * 9; sp.scale.set(sc * 2, sc, 1);
        const base = new THREE.Vector3(cx + (R() - 0.5) * 120, cy + (R() - 0.5) * 30, cz + (R() - 0.5) * 60); sp.position.copy(base);
        if (!this.ctx.params.noGlyphs) this.city.scene.add(sp); this.glyphs.push({ s: sp, base, ph: R() * 6 });
      }
    }
  }
  shot(f: FrameInfo): Shot {
    for (const g of this.glyphs) { g.s.position.set(g.base.x + f.t * 3 + 4 * Math.sin(f.t * 0.6 + g.ph), g.base.y + 3 * Math.sin(f.t * 0.8 + g.ph), g.base.z); (g.s.material as THREE.SpriteMaterial).opacity = 0.55 + 0.35 * pulse(f.beat + g.ph); }
    const e = ease(f.progress);
    this.cam.position.set(2, 1.8, 30 - f.local * 0.6); this.cam.lookAt(-2, 30 + 170 * e, -250);
    this.cam.fov = 50; this.cam.updateProjectionMatrix();
    return { scene: this.city.scene, camera: this.cam, post: { ...SKY_POST, bloom: 0.25 } };
  }
}

// ================================================================== 7 · the road out: towers fall behind, the fields open up
export class RoadOut extends Story {
  cows: CowModel[] = [];
  override async init() {
    const s = this.scene, R = mulberry(23);
    skyLight(s, this.ctx.renderer, new THREE.Vector3(0.7, 0.28, -0.65).normalize(), { turb: 4, ray: 2, color: 0xffd9a8, sun: 2.8, fog: [0.92, 0.84, 0.72, 0.004] });
    const road = mesh(new THREE.PlaneGeometry(9, 900), std(0x5a5a5e, 0.7), false); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.01, -400); s.add(road);
    for (let z = 0; z > -850; z -= 6) { const d = mesh(new THREE.PlaneGeometry(0.18, 2.6), std(0xf2eee4, 0.6), false); d.rotation.x = -Math.PI / 2; d.position.set(0, 0.02, z); s.add(d); }
    const city = mesh(new THREE.PlaneGeometry(400, 260), std(0xb9b4a8, 0.9), false); city.rotation.x = -Math.PI / 2; city.position.set(0, 0, -120); s.add(city);
    const field = mesh(new THREE.PlaneGeometry(800, 640), std(0x7fb046, 1), false); field.rotation.x = -Math.PI / 2; field.position.set(0, -0.005, -570); s.add(field);
    const glass = ['#2c4c6e', '#3a5d7a', '#4a6a86'].map((t, i) => new THREE.MeshPhysicalMaterial({ map: facade(i + 3, t), metalness: 0.55, roughness: 0.08, clearcoat: 1, envMapIntensity: 1.6 }));
    for (let z = -10; z > -240; z -= 16) for (const sx of [-1, 1]) {
      const h = 30 + R() * 90 * (1 - Math.max(0, (-z - 150) / 90)), w = 12 + R() * 10, x = sx * (14 + R() * 10);
      const m = glass[Math.floor(R() * 3)]!.clone(); m.map = m.map!.clone(); m.map.repeat.set(w / 14, h / 14);
      const tw = mesh(new RoundedBoxGeometry(w, h, 12, 2, 1), m); tw.position.set(x, h / 2, z); s.add(tw);
    }
    // countryside: rice stripes, bamboo clumps, haystacks, a few trees
    const rice = std(0x9ccf4f, 1);
    for (let z = -270; z > -850; z -= 22) for (const sx of [-1, 1]) { const p = mesh(new THREE.BoxGeometry(160, 0.1, 20), R() > 0.4 ? rice : std(0xd9b24a, 1), false); p.position.set(sx * 86, 0.04, z); s.add(p); }
    const leaf = [std(0x5f8a2c), std(0x7aa03a)];
    for (let i = 0; i < 70; i++) { const g = new THREE.Group(), sx = R() > 0.5 ? 1 : -1; for (let k = 0; k < 7; k++) { const b = mesh(new THREE.IcosahedronGeometry(1.2 + R(), 2), leaf[k % 2]!); b.scale.y = 1.8; b.position.set((R() - 0.5) * 3, 3 + R() * 5, (R() - 0.5) * 3); g.add(b); } g.position.set(sx * (12 + R() * 60), 0, -280 - R() * 500); s.add(g); }
    const stack = new THREE.LatheGeometry([[0, 0], [1.7, 0], [1.8, 0.8], [1.5, 1.9], [0.9, 2.8], [0.25, 3.3], [0, 3.4]].map(([a, b]) => new THREE.Vector2(a, b)), 16);
    for (let i = 0; i < 14; i++) { const h = mesh(stack, std(0xd8a84a, 1)); h.position.set((R() > 0.5 ? 1 : -1) * (9 + R() * 30), 0, -300 - R() * 300); s.add(h); }
    const a = await loadCow();
    for (let i = 0; i < 4; i++) { const c = new CowModel(a, i % 3 ? 'yellow' : 'brown', 1.6); c.root.position.set(7 + i * 2.2, 0, -330 - i * 3); c.root.rotation.y = 2.4 + i * 0.4; s.add(c.root); this.cows.push(c); }
  }
  shot(f: FrameInfo): Shot {
    const p = f.progress;
    this.cows.forEach((c, i) => { c.pose('idle', f.t + i); c.bend('z', 0.9, 0.3); });
    if (this.ctx.params.dir === 'in') {
      // years ago: leaving the village for the city — from the fields toward the towers
      const z = -360 + 250 * ease(p);
      this.cam.position.set(-1.6 + 0.2 * Math.sin(f.t * 1.1), 1.6 + 0.03 * Math.sin(f.t * 8), z); this.cam.lookAt(-1.2, 1.6 + 6 * ease(p), z + 60);
    } else {
      const z = -340 * (1 - Math.pow(1 - p, 1.6));
      this.cam.position.set(1.6 + 0.2 * Math.sin(f.t * 1.3), 1.5 + 0.03 * Math.sin(f.t * 9), 10 + z); this.cam.lookAt(1.2, 1.6, z - 60);
    }
    this.cam.fov = 44; this.cam.updateProjectionMatrix();
    return { scene: this.scene, camera: this.cam, post: { ...SKY_POST } };
  }
}

// ================================================================== 8 · notifications float up over the village and pop on the beat
export class Bubbles extends Story {
  village: any; bubbles: { g: THREE.Group; base: THREE.Vector3; pop: number }[] = [];
  override async init() {
    this.village = await sharedVillage(this.ctx.renderer, 'gold');
    const icons = ['✉ 23 email chưa đọc', 'Họp 9:00', 'DEADLINE hôm nay', 'Sếp: gọi lại gấp', 'Ticket #4521', 'Sprint review', 'OKR Q4', 'Slack (99+)'];
    const shell = new THREE.MeshPhysicalMaterial({ color: 0xdff0ff, roughness: 0.05, metalness: 0, iridescence: 1, iridescenceIOR: 1.3, transparent: true, opacity: 0.28, envMapIntensity: 3, depthWrite: false });
    const R = mulberry(9);
    icons.forEach((txt, i) => {
      const g = new THREE.Group();
      const sph = new THREE.Mesh(new THREE.SphereGeometry(1.1, 40, 28), shell); g.add(sph);
      const tex = canvasTex(512, 256, (c) => { c.fillStyle = 'rgba(255,255,255,0.92)'; c.beginPath(); c.roundRect(16, 70, 480, 116, 40); c.fill(); c.fillStyle = '#d0342a'; c.beginPath(); c.arc(70, 128, 26, 0, 7); c.fill(); c.fillStyle = '#1a1a1a'; c.font = '700 40px "Archivo"'; c.fillText(txt, 112, 142); });
      const card = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); card.scale.set(1.8, 0.9, 1); g.add(card);
      this.bubbles.push({ g, base: new THREE.Vector3(-5 + i * 1.6 + (R() - 0.5), 1.6 + R() * 2.2, -5 - R() * 5), pop: 2 + i });
    });
  }
  shot(f: FrameInfo): Shot {
    const v = this.village; v.t0 = this.ctx.start; v.dance = false; v.update(f.t, f.beat);
    if (!this.bubbles[0]!.g.parent) for (const b of this.bubbles) v.extras.add(b.g);
    v.extras.visible = true;
    const b0 = Math.ceil(this.ctx.audio.beatAt(this.ctx.start));
    for (const b of this.bubbles) {
      const popT = this.ctx.audio.timeOfBeat(b0 + b.pop), u = f.t - popT;
      b.g.visible = u < 0.12; const grow = u > 0 ? 1 + u * 3 : 1;
      b.g.position.set(b.base.x + 0.3 * Math.sin(f.t + b.pop), b.base.y + f.local * 0.35 + 0.1 * Math.sin(f.t * 2 + b.pop), b.base.z); b.g.scale.setScalar(grow);
    }
    this.cam.position.set(3.6 - f.local * 0.1, 1.8, 7); this.cam.lookAt(-1, 2.6, -14);
    return { scene: v.scene, camera: this.cam, post: { ...SKY_POST, focus: 15, aperture: 3 } };
  }
  override overlay(c: CanvasRenderingContext2D, f: FrameInfo) {
    // a white pop ring where each bubble bursts
    const b0 = Math.ceil(this.ctx.audio.beatAt(this.ctx.start));
    for (const b of this.bubbles) {
      const u = f.t - this.ctx.audio.timeOfBeat(b0 + b.pop); if (u < 0 || u > 0.3) continue;
      const p = b.g.position.clone().project(this.cam), x = (p.x * 0.5 + 0.5) * 1920, y = (-p.y * 0.5 + 0.5) * 1080;
      c.strokeStyle = `rgba(255,255,255,${1 - u / 0.3})`; c.lineWidth = 6; c.beginPath(); c.arc(x, y, 40 + u * 400, 0, 7); c.stroke();
    }
    lyricsOverlay(this.ctx, c, f);
  }
}

// ================================================================== 9 · ending: village at sunset + signature
export class Ending extends Story {
  village: any;
  override async init() { this.village = await sharedVillage(this.ctx.renderer, 'sunset'); }
  shot(f: FrameInfo): Shot {
    const v = this.village; v.t0 = this.ctx.start; v.dance = false; v.update(f.t, f.beat);
    const p = f.progress; this.cam.position.set(-6 + p * 6, 2.5 + p * 5, -4 + p * 18); this.cam.lookAt(-8, 4, -22);
    return { scene: v.scene, camera: this.cam, post: { ...SKY_POST, fade: clamp((f.t - this.ctx.end + 0.8) / 0.8) } };
  }
  override overlay(c: CanvasRenderingContext2D, f: FrameInfo) {
    const a = ease((f.local - 0.3) / 0.8) * (1 - clamp((f.t - this.ctx.end + 0.8) / 0.8));
    if (a <= 0) return;
    c.save(); c.globalAlpha = a; c.textAlign = 'center';
    c.shadowColor = 'rgba(40,20,0,0.7)'; c.shadowBlur = 24;
    c.font = '700 150px "Marker Felt", "Archivo"'; c.fillStyle = '#ffe9b8'; c.fillText('Linh.NV', 960, 500);
    c.font = '500 40px "Plex Mono"'; c.fillStyle = '#fff6e0'; c.fillText('github.com/nguyenvanlinh14/mv-studio', 960, 585);
    c.restore();
  }
}
