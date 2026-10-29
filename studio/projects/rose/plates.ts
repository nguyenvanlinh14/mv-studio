// A red rose for a loved one, three looks from one drawing: oil painting, watercolour, and self-drawing neon.
import * as THREE from 'three';
import { Plate, type FrameInfo, type Shot } from '../../src/core/plate';
import { paint } from '../../src/kit/paint';
import { watercolor } from '../../src/kit/styles';
import { NEON, NeonStrokes, bez, type Stroke, type P2 } from '../../src/kit/neondraw';
import { makeStage } from '../../src/kit/stage';
import { Dust } from '../../src/kit/neonenv';

const W = 1920, H = 1080, CX = 960, CY = 420;
type Q = [number, number];
type Petal = { path: [Q, Q, Q, Q][]; tone: [string, string, string]; rim?: number; rimColor?: string };
const X = (dx: number, dy: number): Q => [CX + dx, CY + dy];
const MIRROR = (p: Petal): Petal => ({ ...p, path: p.path.map((sg) => sg.map(([x, y]) => [2 * CX - x, y] as Q) as [Q, Q, Q, Q]) });
const BACK: Petal = { path: [[X(-40, 60), X(-150, 20), X(-230, -90), X(-200, -150)], [X(-200, -150), X(-150, -150), X(-80, -190), X(-20, -175)], [X(-20, -175), X(-10, -80), X(-10, 0), X(-40, 60)]], tone: ['#8e0e1a', '#c42430', '#3a040a'], rim: 2, rimColor: '#f88a90' };
const BUD: Petal = { path: [[X(-95, -110), X(-110, -40), X(-80, 40), X(0, 50)], [X(0, 50), X(80, 40), X(110, -40), X(95, -110)], [X(95, -110), X(60, -140), X(-60, -140), X(-95, -110)]], tone: ['#a8141f', '#d8343e', '#4a0610'], rim: 3, rimColor: '#ff9aa0' };
const WRAP: Petal = { path: [[X(-185, -80), X(-200, 20), X(-120, 120), X(-10, 120)], [X(-10, 120), X(30, 60), X(40, -10), X(30, -60)], [X(30, -60), X(-40, -110), X(-130, -110), X(-185, -80)]], tone: ['#b01822', '#e4444c', '#4a0610'], rim: 3, rimColor: '#ff8a92' };
const FRONT: Petal = { path: [[X(-170, -10), X(-150, 110), X(-60, 160), X(0, 160)], [X(0, 160), X(60, 160), X(150, 110), X(170, -10)], [X(170, -10), X(110, 30), X(60, 0), X(0, 25)], [X(0, 25), X(-60, 0), X(-110, 30), X(-170, -10)]], tone: ['#a0141e', '#e8505a', '#3a040a'], rim: 3, rimColor: '#ffa0a6' };
const SEPAL = (s: number): Petal => ({ path: [[X(0, 150), X(60 * s, 150), X(130 * s, 175), X(170 * s, 215)], [X(170 * s, 215), X(110 * s, 200), X(50 * s, 195), X(0, 170)], [X(0, 170), X(0, 165), X(0, 155), X(0, 150)]], tone: ['#3f7a2a', '#6aa040', '#24401a'] });
const PETALS: Petal[] = [BACK, MIRROR(BACK), BUD, WRAP, MIRROR(WRAP), FRONT, SEPAL(1), SEPAL(-1)];

/** flat reference rose: stem, two leaves, outer petals, a cupped centre with a spiral, front petals with light rims */
export function roseRef(bg: 'dark' | 'cream') {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d')!;
  const g = c.createRadialGradient(CX, CY, 100, CX, CY, 1100);
  if (bg === 'dark') { g.addColorStop(0, '#5a2a26'); g.addColorStop(0.5, '#2e1616'); g.addColorStop(1, '#140a0a'); }
  else { g.addColorStop(0, '#fbf5ea'); g.addColorStop(1, '#efe4d0'); }
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // stem + leaves
  c.strokeStyle = '#3f6a2a'; c.lineWidth = 16; c.lineCap = 'round';
  c.beginPath(); c.moveTo(CX, CY + 160); c.bezierCurveTo(CX + 30, CY + 330, CX - 60, CY + 470, CX - 20, H + 40); c.stroke();
  c.strokeStyle = '#6a8a3a'; c.lineWidth = 5; c.beginPath(); c.moveTo(CX + 4, CY + 165); c.bezierCurveTo(CX + 30, CY + 330, CX - 56, CY + 470, CX - 16, H + 40); c.stroke();
  const leaf = (x: number, y: number, ang: number, len: number) => {
    c.save(); c.translate(x, y); c.rotate(ang);
    const lg = c.createLinearGradient(0, -len * 0.3, 0, len * 0.3); lg.addColorStop(0, '#5f9a3a'); lg.addColorStop(1, '#2f5a1e');
    c.fillStyle = lg; c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(len * 0.3, -len * 0.38, len * 0.75, -len * 0.3, len, 0); c.bezierCurveTo(len * 0.75, len * 0.3, len * 0.3, len * 0.36, 0, 0); c.fill();
    c.strokeStyle = 'rgba(200,230,150,0.6)'; c.lineWidth = 3; c.beginPath(); c.moveTo(4, 0); c.quadraticCurveTo(len * 0.5, -6, len * 0.95, 0); c.stroke();
    c.restore();
  };
  leaf(CX + 8, CY + 330, -0.5, 200); leaf(CX - 30, CY + 450, Math.PI + 0.45, 180);
  // a thorn or two
  c.fillStyle = '#4a5a24'; for (const [x, y, s] of [[CX + 18, CY + 270, 1], [CX - 40, CY + 560, -1]] as const) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + 22 * s, y - 10); c.lineTo(x, y + 12); c.fill(); }
  drawBloom(c, CX, CY, 1, 0);
  return cv;
}

/** the rose head (petals, spiral, dew) at (x, y), scaled and rotated about its centre */
export function drawBloom(c: CanvasRenderingContext2D, x: number, y: number, k: number, rot: number) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(k, k); c.translate(-CX, -CY);
  // the bloom, side view, back to front: each petal is a closed cubic path with a dark-to-red fill and a light rim
  for (const pt of PETALS) {
    const ys = pt.path.flatMap((sg) => sg.map((q) => q[1])), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const pg = c.createLinearGradient(0, y0, 0, y1);
    pg.addColorStop(0, pt.tone[1]); pg.addColorStop(0.55, pt.tone[0]); pg.addColorStop(1, pt.tone[2]);
    c.fillStyle = pg; c.beginPath(); c.moveTo(...pt.path[0]![0]);
    for (const [, c1, c2, p1] of pt.path) c.bezierCurveTo(...c1, ...c2, ...p1);
    c.closePath(); c.fill();
    c.strokeStyle = 'rgba(60,0,8,0.55)'; c.lineWidth = 3; c.stroke();
    if (pt.rim) { c.strokeStyle = pt.rimColor ?? '#f47a80'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); const [p0, c1, c2, p1] = pt.path[pt.rim - 1]!; c.moveTo(...p0); c.bezierCurveTo(...c1, ...c2, ...p1); c.stroke(); }
  }
  // spiral inside the bud opening
  c.strokeStyle = '#3a040a'; c.lineWidth = 6;
  c.beginPath(); for (let a = 0; a < Math.PI * 3.2; a += 0.08) { const r = 6 + a * 7; const x = CX + 4 + Math.cos(a) * r, y = CY - 112 + Math.sin(a) * r * 0.32; a ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
  // dew drop
  c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.ellipse(CX + 95, CY + 20, 8, 11, 0.3, 0, 7); c.fill();
  c.restore();
}

function message(c: CanvasRenderingContext2D, text: string, color: string, glow?: string, y = 960) {
  c.save(); c.textAlign = 'center'; c.font = '700 96px "Bradley Hand", "Noteworthy", "Archivo"';
  if (glow) { c.shadowColor = glow; c.shadowBlur = 30; } else { c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 14; }
  c.fillStyle = color; c.fillText(text, CX, y); c.restore();
}

abstract class Still extends Plate {
  scene = new THREE.Scene(); cam = new THREE.PerspectiveCamera(); img!: HTMLCanvasElement;
  shot(): Shot { return { scene: this.scene, camera: this.cam, post: { bloom: 0, vignette: 0, grain: 0 } }; }
}
export class RoseOil extends Still {
  override init() { this.img = paint(roseRef('dark'), { seed: 5, ground: '#3a1a14', jitter: 0.55, threshold: 40 }); }
  override overlay(c: CanvasRenderingContext2D) { c.drawImage(this.img, 0, 0); message(c, String(this.ctx.params.text ?? 'Tặng em ❤'), '#ffe9c8'); }
}
export class RoseWater extends Still {
  override init() { this.img = watercolor(roseRef('cream'), 4); }
  override overlay(c: CanvasRenderingContext2D) { c.drawImage(this.img, 0, 0); message(c, String(this.ctx.params.text ?? 'Tặng em ❤'), '#b0182a'); }
}

/** neon line rose that draws itself, on a dark mirrored floor with drifting dust */
function roseStrokes(): Stroke[] {
  const w = ([x, y]: Q): P2 => [(x - CX) / 140, (CY + 160 - y) / 140 + 1.45];
  const out: Stroke[] = [];
  PETALS.forEach((pt, i) => out.push({ pts: pt.path.flatMap(([p0, c1, c2, p1]) => bez(w(p0), w(c1), w(c2), w(p1), 20)), c: i >= 6 ? 1 : 0 }));
  const spiral: P2[] = []; for (let a = 0; a < Math.PI * 3.2; a += 0.1) { const r = 6 + a * 7; spiral.push(w([CX + 4 + Math.cos(a) * r, CY - 112 + Math.sin(a) * r * 0.32])); }
  out.splice(2, 0, { pts: spiral, c: 0 });
  out.push({ pts: bez(w(X(0, 160)), w(X(30, 330)), w(X(-60, 470)), w(X(-25, 640))), c: 1 });
  out.push({ pts: [...bez(w(X(8, 330)), w(X(60, 250)), w(X(150, 230)), w(X(185, 230))), ...bez(w(X(185, 230)), w(X(150, 290)), w(X(70, 320)), w(X(8, 330)))], c: 1 });
  out.push({ pts: [...bez(w(X(-30, 450)), w(X(-80, 390)), w(X(-160, 380)), w(X(-200, 395))), ...bez(w(X(-200, 395)), w(X(-150, 450)), w(X(-80, 470)), w(X(-30, 450)))], c: 1 });
  return out;
}
export class RoseNeon extends Plate {
  stage = makeStage({ env: this.ctx.env, floor: 'mirror', fog: 0.04 });
  cam = new THREE.PerspectiveCamera(34, 16 / 9, 0.1, 200);
  rose = new NeonStrokes(roseStrokes(), [new THREE.Color(1.0, 0.12, 0.2), NEON.lime, NEON.white], { radius: 0.035 });
  dust = new Dust();
  override init() { this.rose.root.position.set(0, 0.9, 0); this.stage.scene.add(this.rose.root, this.dust.root); }
  shot(f: FrameInfo): Shot {
    const draw = this.ctx.params.draw ?? Math.min(1, f.local / 4);
    this.rose.set({ draw, intensity: 2.4, frame: Math.round(f.t * 60) });
    this.dust.update({ t: f.t, beat: f.beat, bar: f.bar, beatAt: (t: number) => this.ctx.audio.beatAt(t) }, {});
    this.cam.position.set(0, 2.6, 11); this.cam.lookAt(0, 3.1, 0);
    return { scene: this.stage.scene, camera: this.cam, post: { bloom: 1.0, vignette: 0.4, grain: 0.02, focus: 9, aperture: 6 } };
  }
  override overlay(c: CanvasRenderingContext2D) { message(c, String(this.ctx.params.text ?? 'Tặng em ❤'), '#ffd0d8', '#ff3050'); }
}

// ------------------------------------------------------------------ the painted film: a brush paints a rose, then a bouquet
import { OilPainter } from '../../src/kit/paint';

/** the bouquet: kraft-paper cone, seven roses around the first one (same place), leaves, baby's breath, a satin bow */
export function bouquetRef() {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d')!;
  const g = c.createRadialGradient(CX, CY, 100, CX, CY, 1100); g.addColorStop(0, '#5a2a26'); g.addColorStop(0.5, '#2e1616'); g.addColorStop(1, '#140a0a');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // back flaps of the wrapping (blush pink paper)
  const pink = c.createLinearGradient(560, 300, 1360, 900); pink.addColorStop(0, '#f2c6c0'); pink.addColorStop(1, '#c98a86');
  c.fillStyle = pink; c.beginPath(); c.moveTo(520, 280); c.lineTo(820, 560); c.lineTo(960, 1000); c.lineTo(1100, 560); c.lineTo(1400, 280); c.lineTo(1250, 700); c.lineTo(960, 1080); c.lineTo(670, 700); c.closePath(); c.fill();
  // leaves fanning out behind the roses
  const leaf = (x: number, y: number, ang: number, len: number) => {
    c.save(); c.translate(x, y); c.rotate(ang);
    const lg = c.createLinearGradient(0, -len * 0.3, 0, len * 0.3); lg.addColorStop(0, '#6aa040'); lg.addColorStop(1, '#2a5a1c');
    c.fillStyle = lg; c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(len * 0.3, -len * 0.38, len * 0.75, -len * 0.3, len, 0); c.bezierCurveTo(len * 0.75, len * 0.3, len * 0.3, len * 0.36, 0, 0); c.fill();
    c.strokeStyle = 'rgba(200,230,150,0.55)'; c.lineWidth = 3; c.beginPath(); c.moveTo(4, 0); c.quadraticCurveTo(len * 0.5, -6, len * 0.95, 0); c.stroke(); c.restore();
  };
  for (const [x, y, a, l] of [[820, 560, -2.5, 230], [1100, 560, -0.6, 230], [760, 650, 3.0, 200], [1160, 650, 0.1, 200], [900, 420, -2.0, 180], [1030, 420, -1.1, 180]] as const) leaf(x, y, a, l);
  // roses: back row, sides, then the first rose in front (same spot as the single-rose painting)
  for (const [x, y, k, r] of [[960, 215, 0.6, 0], [800, 280, 0.64, -0.12], [1120, 280, 0.64, 0.12], [690, 440, 0.68, -0.22], [1230, 440, 0.68, 0.22], [770, 590, 0.62, -0.3], [1150, 590, 0.62, 0.3]] as const) drawBloom(c, x, y, k, r);
  // baby's breath
  for (let i = 0; i < 70; i++) { const ang = -Math.PI + (i / 70) * Math.PI * 1.1 - 0.05, rr = 300 + 40 * Math.sin(i * 2.3), x = CX + Math.cos(ang) * rr * 1.25, y = 470 + Math.sin(ang) * rr * 0.95; c.fillStyle = i % 3 ? '#fbf6ee' : '#f2e8d8'; c.beginPath(); c.arc(x + 20 * Math.sin(i), y + 15 * Math.cos(i * 1.7), 6 + (i % 4), 0, 7); c.fill(); }
  drawBloom(c, CX, CY, 1, 0);
  // front of the wrapping: kraft cone with folds
  const kraft = c.createLinearGradient(700, 640, 1220, 1080); kraft.addColorStop(0, '#d8b48a'); kraft.addColorStop(1, '#9a7448');
  c.fillStyle = kraft; c.beginPath(); c.moveTo(640, 640); c.quadraticCurveTo(960, 700, 1280, 640); c.lineTo(1040, 1080); c.lineTo(880, 1080); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(90,60,30,0.5)'; c.lineWidth = 4; for (const x of [800, 960, 1120]) { c.beginPath(); c.moveTo(x, 680); c.lineTo(960 + (x - 960) * 0.15, 1080); c.stroke(); }
  // satin ribbon bow
  c.fillStyle = '#c0182a';
  c.beginPath(); c.ellipse(900, 820, 80, 40, -0.4, 0, 7); c.fill(); c.beginPath(); c.ellipse(1020, 820, 80, 40, 0.4, 0, 7); c.fill();
  c.beginPath(); c.moveTo(950, 830); c.lineTo(900, 980); c.lineTo(935, 975); c.lineTo(965, 840); c.fill(); c.beginPath(); c.moveTo(970, 830); c.lineTo(1030, 975); c.lineTo(1000, 985); c.lineTo(955, 840); c.fill();
  c.fillStyle = '#e8404c'; c.beginPath(); c.ellipse(960, 822, 30, 26, 0, 0, 7); c.fill();
  c.fillStyle = 'rgba(255,200,200,0.5)'; c.beginPath(); c.ellipse(890, 808, 40, 10, -0.4, 0, 7); c.fill();
  return cv;
}

/** a long paintbrush whose tip sits at (x, y), loaded with the current colour */
export function brush(c: CanvasRenderingContext2D, x: number, y: number, col: [number, number, number], wob: number, alpha = 1) {
  c.save(); c.globalAlpha = alpha; c.translate(x, y); c.rotate(-0.85 + wob);
  c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 24; c.shadowOffsetX = 18; c.shadowOffsetY = 22;
  const hg = c.createLinearGradient(0, -12, 0, 12); hg.addColorStop(0, '#d89a5a'); hg.addColorStop(0.5, '#8a4a22'); hg.addColorStop(1, '#5a2a10');
  c.fillStyle = hg; c.beginPath(); c.moveTo(150, -11); c.lineTo(560, -7); c.quadraticCurveTo(580, 0, 560, 7); c.lineTo(150, 11); c.closePath(); c.fill();
  c.shadowColor = 'transparent';
  const fg = c.createLinearGradient(0, -14, 0, 14); fg.addColorStop(0, '#f2f2f4'); fg.addColorStop(0.5, '#a8acb4'); fg.addColorStop(1, '#6a6e76');
  c.fillStyle = fg; c.beginPath(); c.moveTo(70, -13); c.lineTo(155, -12); c.lineTo(155, 12); c.lineTo(70, 13); c.closePath(); c.fill();
  c.fillStyle = '#e8dcc4'; c.beginPath(); c.moveTo(72, -13); c.quadraticCurveTo(20, -12, 0, 0); c.quadraticCurveTo(20, 12, 72, 13); c.closePath(); c.fill();
  c.fillStyle = `rgb(${col[0] | 0},${col[1] | 0},${col[2] | 0})`; c.beginPath(); c.moveTo(34, -10); c.quadraticCurveTo(12, -8, 0, 0); c.quadraticCurveTo(12, 8, 34, 10); c.closePath(); c.fill();
  c.restore();
}

/** handwritten line that writes itself left to right */
export function writeOn(c: CanvasRenderingContext2D, text: string, cx: number, y: number, size: number, p: number, color: string) {
  if (p <= 0) return;
  c.save(); c.font = `700 ${size}px "Bradley Hand", "Apple Color Emoji", "Noteworthy", "Archivo"`; c.textAlign = 'center';
  const w = c.measureText(text).width, x0 = cx - w / 2;
  c.beginPath(); c.rect(0, 0, x0 + w * Math.min(1, p) + 6, H); c.clip();
  c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 18; c.fillStyle = color; c.fillText(text, cx, y);
  c.restore();
}

/** 0–1.2 s blank canvas · 1.2–10 the rose · 10–11.5 hold · 11.5–19.5 the bouquet · then the wish is written */
export class RoseFilm extends Plate {
  scene = new THREE.Scene(); cam = new THREE.PerspectiveCamera();
  refA = roseRef('dark'); refB = bouquetRef();
  optsA = { seed: 5, ground: '#3a1a14', jitter: 0.55, threshold: 40 };
  optsB = { seed: 9, jitter: 0.55, threshold: 46 };
  countA: number[] = []; countB: number[] = []; finalA!: HTMLCanvasElement;
  pA!: OilPainter; pB: OilPainter | null = null; frame = document.createElement('canvas');
  T = { a0: 1.2, a1: 10, b0: 11.5, b1: 19.5, w0: 20.8 };
  override init() {
    // dry runs: how many strokes each picture takes, and the finished rose to paint the bouquet onto
    const a = new OilPainter(this.refA, this.optsA); a.advanceTo(Infinity); this.countA = a.layerPainted.map((x) => x ?? 0);
    this.finalA = document.createElement('canvas'); this.finalA.width = W; this.finalA.height = H; this.finalA.getContext('2d')!.drawImage(a.canvas, 0, 0);
    const b = new OilPainter(this.refB, this.optsB, this.finalA); b.advanceTo(Infinity); this.countB = b.layerPainted.map((x) => x ?? 0);
    this.pA = new OilPainter(this.refA, this.optsA);
  }
  shot(): Shot { return { scene: this.scene, camera: this.cam, post: { bloom: 0, vignette: 0, grain: 0 } }; }
  /** strokes laid by time t: quick wash first, slower details (ease-in on the count) */
  /** strokes laid by time t: every brush layer (wash → blocks → details → finest) gets an equal share of the time */
  target(t: number, t0: number, t1: number, per: number[]) {
    const u = Math.max(0, Math.min(1, (t - t0) / (t1 - t0))) * per.length, li = Math.min(per.length - 1, Math.floor(u));
    return per.slice(0, li).reduce((a, b) => a + b, 0) + Math.round(per[li]! * Math.min(1, u - li));
  }
  override overlay(c: CanvasRenderingContext2D, f: FrameInfo) {
    const T = this.T, t = f.t - this.ctx.start;
    const tq = Math.floor(t * 12) / 12; // painted on twos at 12 fps
    let painter: OilPainter;
    if (tq < T.b0) {
      const n = this.target(tq, T.a0, T.a1, this.countA);
      if (n < this.pA.painted) this.pA = new OilPainter(this.refA, this.optsA);
      this.pA.advanceTo(n); painter = this.pA;
    } else {
      const n = this.target(tq, T.b0, T.b1, this.countB);
      if (!this.pB || n < this.pB.painted) this.pB = new OilPainter(this.refB, this.optsB, this.finalA);
      this.pB.advanceTo(n); painter = this.pB;
    }
    // after the bouquet: pull back and slide left, leaving room for the wish on the right
    const pull = Math.min(1, Math.max(0, (t - T.b1 - 0.1) / 1.2)), e = pull * pull * (3 - 2 * pull), k = 1 - 0.24 * e, dx = -300 * e;
    if (!this.frame.width || this.frame.width !== W) { this.frame.width = W; this.frame.height = H; }
    const fc = this.frame.getContext('2d')!; painter.compose(fc);
    if (e > 0) { c.fillStyle = '#1a0c0c'; c.fillRect(0, 0, W, H); }
    c.save(); c.translate(W / 2 + dx, H / 2); c.scale(k, k); c.translate(-W / 2, -H / 2); c.drawImage(this.frame, 0, 0);
    if (e > 0) { c.strokeStyle = `rgba(120,80,40,${0.6 * e})`; c.lineWidth = 10; c.strokeRect(0, 0, W, H); }
    c.restore();
    // the brush: average of the latest stroke ends, wobbling like a hand
    const painting = (t > T.a0 - 0.6 && t < T.a1 + 0.3) || (t > T.b0 - 0.4 && t < T.b1 + 0.3);
    const rec = painter.recent.slice(-8);
    let bx = 1500, by = 300, col: [number, number, number] = [200, 40, 50];
    if (rec.length) { bx = rec.reduce((a, r) => a + r.x, 0) / rec.length; by = rec.reduce((a, r) => a + r.y, 0) / rec.length; col = rec[rec.length - 1]!.col; }
    const inA = Math.min(1, Math.max(0, (t - (T.a0 - 0.8)) / 0.6)), out = Math.min(1, Math.max(0, (T.w0 + 0.3 - t) / 0.6));
    const away = painting ? 0 : 1 - Math.min(1, Math.abs(t - (T.a1 + T.b0) / 2) / 1.2);
    const fly = t < T.a0 ? (1 - inA) * 700 : t > T.b1 ? (1 - out) * 900 : away * 220;
    if (out > 0 && t > T.a0 - 0.9) brush(c, bx + fly * 0.8, by - fly, col, 0.08 * Math.sin(t * 7) + 0.05 * Math.sin(t * 13), Math.min(inA, out));
    // the wish
    writeOn(c, 'Chúc mừng 20/10', 1560, 470, 80, (t - T.w0) / 1.3, '#fff1d6');
    writeOn(c, 'Tặng Thu,', 1560, 585, 74, (t - T.w0 - 1.2) / 0.9, '#ffe2c8');
    writeOn(c, 'vợ yêu của anh ❤️', 1560, 680, 74, (t - T.w0 - 2.0) / 1.3, '#ffe2c8');
  }
}
