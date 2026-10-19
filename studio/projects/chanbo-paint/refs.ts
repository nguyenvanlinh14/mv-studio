// Reference compositions (flat 2D blocking) that the oil painter repaints: the late-night office of the verses and
// the sunny pasture of the chorus. Shapes only need the right colour masses and edges; the brushes do the rest.
import { makeNoise, mulberry } from '../../src/kit/paint';

const W = 1920, H = 1080;
/** animation state: song time, continuous beat, slow camera push (0 = none), lyric caption */
export interface Anim { t: number; beat: number; push: number; caption?: string }
const STILL: Anim = { t: 0, beat: 0, push: 0 };
const fract = (x: number) => x - Math.floor(x);
const hsh = (a: number, b = 0) => fract(Math.sin(a * 127.1 + b * 311.7) * 43758.5453);
const pulseOf = (beat: number, p = 3) => Math.pow(1 - fract(beat), p);
function push(c: CanvasRenderingContext2D, cx: number, cy: number, z: number) { c.save(); c.translate(cx, cy); c.scale(1 + z, 1 + z); c.translate(-cx, -cy); }
function captionOn(c: CanvasRenderingContext2D, text?: string) {
  if (!text) return;
  c.textAlign = 'center'; c.font = '900 76px "Archivo"'; c.lineJoin = 'round';
  c.lineWidth = 14; c.strokeStyle = '#2a1c10'; c.strokeText(text, W / 2, 985);
  c.fillStyle = '#fff2d2'; c.fillText(text, W / 2, 985); c.textAlign = 'left';
}
type C = CanvasRenderingContext2D;
const canvas = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
const ell = (c: C, x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient, rot = 0) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); };
const poly = (c: C, pts: number[][], fill: string | CanvasGradient) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x!, y!) : c.moveTo(x!, y!))); c.closePath(); c.fillStyle = fill; c.fill(); };
const glow = (c: C, x: number, y: number, r: number, col: string, a = 1) => {
  const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.globalAlpha = a; c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r);
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
};
const lin = (c: C, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) => { const g = c.createLinearGradient(x0, y0, x1, y1); for (const [k, s] of stops) g.addColorStop(k, s); return g; };

/** painterly underpainting: soft blotches of lighter / darker / warmer / cooler colour so the strokes vary */
function texturize(c: C, seed: number, amount = 1, y0 = 0) {
  const r = mulberry(seed);
  for (let k = 0; k < 1400; k++) {
    const x = r() * W, y = y0 + r() * (H - y0), s = 10 + r() * 60;
    const t = r();
    c.fillStyle = t < 0.3 ? 'rgba(255,240,200,0.07)' : t < 0.55 ? 'rgba(20,20,60,0.08)' : t < 0.8 ? 'rgba(255,170,90,0.06)' : 'rgba(90,140,200,0.06)';
    c.globalAlpha = amount; c.beginPath(); c.ellipse(x, y, s, s * (0.4 + r() * 0.5), r() * 3, 0, Math.PI * 2); c.fill();
  }
  c.globalAlpha = 1;
}

/** Late night in the office: a city window, rows of empty desks with glowing screens, one programmer asleep on the desk. */
export function officeRef(A: Anim = STILL) {
  const cv = canvas(), c = cv.getContext('2d')!, r = mulberry(5), P = pulseOf(A.beat);
  push(c, 1300, 720, A.push);
  // wall + ceiling + floor (vanishing point at 1180, 470)
  c.fillStyle = lin(c, 0, 0, 0, H, [[0, '#0d1824'], [0.45, '#18283a'], [1, '#0e141b']]); c.fillRect(0, 0, W, H);
  poly(c, [[0, 0], [W, 0], [1180, 380], [0, 330]], lin(c, 0, 0, 0, 380, [[0, '#0a121b'], [1, '#1b2b3b']]));
  poly(c, [[0, H], [W, H], [W, 620], [1180, 470], [0, 560]], lin(c, 0, 470, 0, H, [[0, '#1c2530'], [1, '#2b2a2c']]));
  // the big night window on the left wall
  poly(c, [[40, 110], [1000, 290], [1000, 520], [40, 600]], lin(c, 0, 110, 0, 600, [[0, '#0f2347'], [0.6, '#24406e'], [1, '#3b4f78']]));
  for (let i = 0; i < 26; i++) { // skyline
    const x = 40 + i * 37 + r() * 10, top = 330 + r() * 170 - (i < 10 ? 60 : 0) * r();
    const bottom = 600 - (x - 40) * 0.083;
    poly(c, [[x, top], [x + 34, top + 6], [x + 34, bottom], [x, bottom]], i % 2 ? '#0b1730' : '#101d3a');
    for (let k = 0; k < 10; k++) if (r() > 0.45) { const col = r() > 0.4 ? '#ffcf73' : '#ff9a4a', wx = x + 4 + r() * 24, wy = top + 14 + r() * (bottom - top - 24); c.fillStyle = hsh(i * 13 + k, Math.floor(A.t * 1.5)) > 0.15 ? col : '#18233c'; c.fillRect(wx, wy, 5, 7); }
  }
  for (const k of [0, 1, 2]) { const x = 40 + k * 320; c.fillStyle = '#0a0f16'; c.fillRect(x, 110 + k * 60, 14, 490 - k * 85); }
  ell(c, 820, 205, 26, 26, '#f4ecd0'); glow(c, 820, 205, 120, 'rgba(240,230,190,0.45)');
  // fluorescent ceiling lights in perspective
  for (let k = 0; k < 5; k++) {
    const t = k / 5, y = 40 + t * 260, w = 380 * (1 - t * 0.8), x = 1180 - (1180 - 640) * (1 - t) * 0.6;
    poly(c, [[x - w / 2, y], [x + w / 2, y], [x + w / 2 - 10 * (1 - t), y + 18 * (1 - t) + 4], [x - w / 2 + 10 * (1 - t), y + 18 * (1 - t) + 4]], '#bfe6ee');
    glow(c, x, y + 10, 260 * (1 - t * 0.7), 'rgba(140,200,220,0.25)');
  }
  // rows of empty desks receding, screens glowing
  for (let k = 7; k >= 0; k--) {
    const t = Math.pow(k / 8, 0.8), s = 1 - t * 0.85;
    for (const side of [-1, 1]) {
      const cx = 1180 + side * 520 * s - 260 * s, cy = 470 + 520 * s, w = 300 * s, h = 26 * s;
      if (side > 0 && k < 2) continue; // foreground right is the hero desk
      poly(c, [[cx - w, cy], [cx + w, cy], [cx + w * 0.9, cy + h], [cx - w * 0.9, cy + h]], lin(c, cx - w, 0, cx + w, 0, [[0, '#3a2c22'], [0.45, '#5a7a96'], [1, '#3a2c22']]));
      c.fillStyle = '#20180f'; c.fillRect(cx - w * 0.85, cy + h, 10 * s, 160 * s); c.fillRect(cx + w * 0.8, cy + h, 10 * s, 160 * s);
      const mx = cx - 40 * s, my = cy - 120 * s;
      c.fillStyle = '#0b0f14'; c.fillRect(mx - 95 * s, my - 6 * s, 190 * s, 120 * s);
      c.fillStyle = (k + side + Math.floor(A.beat)) % 4 === 0 && P > 0.25 ? '#b8ecff' : k % 3 ? '#4fa8e8' : '#69d1ff'; c.fillRect(mx - 88 * s, my, 176 * s, 106 * s);
      glow(c, mx, my + 50 * s, 220 * s, 'rgba(80,170,255,0.35)');
      c.fillStyle = '#121418'; c.fillRect(mx - 12 * s, my + 112 * s, 24 * s, 30 * s); // stand
      ell(c, cx + 120 * s, cy + 40 * s, 55 * s, 70 * s, '#151a22'); // empty chair back
    }
  }
  // wall clock: 2:10 a.m.
  ell(c, 1540, 230, 62, 62, '#e9e2cf'); ell(c, 1540, 230, 54, 54, '#f7f2e4');
  c.strokeStyle = '#222'; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); const ma = 0.35 + A.t * 0.09; c.moveTo(1540, 230); c.lineTo(1540 + 26, 230 - 15); c.moveTo(1540, 230); c.lineTo(1540 + 44 * Math.cos(ma), 230 + 44 * Math.sin(ma)); c.stroke();
  // hero desk, lamp, the sleeper
  poly(c, [[860, 760], [1920, 700], [1920, 860], [820, 900]], lin(c, 0, 700, 0, 900, [[0, '#7a4c2c'], [1, '#3a2416']]));
  c.fillStyle = '#2a1a10'; c.fillRect(900, 890, 40, 190); c.fillRect(1800, 860, 40, 220);
  glow(c, 1080, 640, 520, `rgba(255,170,80,${0.5 + 0.06 * Math.sin(A.t * 9) * Math.sin(A.t * 3.7)})`); // lamp pool
  poly(c, [[1010, 480], [1080, 470], [1120, 560], [990, 575]], '#d7742c'); // lamp shade
  c.strokeStyle = '#3b2a1c'; c.lineWidth = 12; c.beginPath(); c.moveTo(1060, 560); c.lineTo(1100, 700); c.lineTo(1040, 760); c.stroke();
  ell(c, 1055, 575, 60, 14, '#ffe2a0'); glow(c, 1055, 600, 160, 'rgba(255,220,150,0.8)');
  // monitor with code
  c.fillStyle = '#0a0d12'; c.fillRect(1360, 420, 430, 270); c.fillStyle = '#1a2a3a'; c.fillRect(1375, 435, 400, 240);
  for (let k = 0; k < 13; k++) { c.fillStyle = ['#7fd0ff', '#ffd27f', '#9cf0a0', '#ff8f9a'][k % 4]!; r(); const ln = k + Math.floor(A.t * 3); c.fillStyle = ['#7fd0ff', '#ffd27f', '#9cf0a0', '#ff8f9a'][ln % 4]!; c.fillRect(1395 + (ln % 3) * 22, 452 + k * 17, 80 + hsh(ln) * 230, 7); }
  glow(c, 1575, 560, 380, 'rgba(90,170,255,0.4)');
  c.fillStyle = '#ffe26a'; c.fillRect(1350, 410, 54, 50); c.fillStyle = '#ff9fb0'; c.fillRect(1745, 640, 50, 46); c.fillStyle = '#9fe0ff'; c.fillRect(1790, 430, 46, 46); // sticky notes
  c.fillStyle = '#121418'; c.fillRect(1550, 690, 50, 40);
  // papers + cups
  poly(c, [[1640, 760], [1830, 748], [1850, 790], [1655, 802]], '#e8e0cc'); poly(c, [[1650, 748], [1820, 738], [1838, 772], [1662, 784]], '#f3eedf');
  for (const [x, y] of [[1260, 760], [1310, 782], [1215, 790]] as const) { poly(c, [[x - 22, y - 50], [x + 22, y - 50], [x + 17, y], [x - 17, y]], '#efe6d4'); ell(c, x, y - 50, 22, 6, '#5a3820'); }
  // the programmer asleep on folded arms, warm rim light from the lamp, cool fill from the screen
  ell(c, 1430, 830 - 4 * Math.sin(A.t * 1.6), 230, 120 * (1 + 0.035 * Math.sin(A.t * 1.6)), lin(c, 1200, 760, 1650, 900, [[0, '#d0874a'], [0.25, '#4a3f5e'], [1, '#232a40']]), -0.1); // back (hoodie)
  ell(c, 1290, 760, 150, 46, lin(c, 1150, 730, 1430, 790, [[0, '#e0a060'], [0.4, '#4c4766'], [1, '#2a3048']]), 0.05); // arms
  ell(c, 1300, 715, 78, 68, lin(c, 1230, 660, 1380, 770, [[0, '#2a1d16'], [1, '#120c09']])); // head (hair)
  ell(c, 1250, 700, 30, 50, 'rgba(230,150,80,0.6)', 0.3); // rim on the hair
  ell(c, 1470, 955, 300, 90, '#1d2133'); // chair
  ell(c, 1215, 740, 70, 26, 'rgba(255,170,90,0.55)', -0.2); // lamp light on the sleeve
  ell(c, 1250, 690, 40, 22, 'rgba(255,190,120,0.5)', 0.3);
  glow(c, 1300, 760, 240, 'rgba(255,150,70,0.25)');
  c.restore();
  texturize(c, 51, 1);
  captionOn(c, A.caption);
  return cv;
}

/** A sunny afternoon pasture: big sky, rolling hills, a tree with a cowherd resting in its shade, cows grazing. */
export function pastureRef(A: Anim = STILL) {
  const cv = canvas(), c = cv.getContext('2d')!, r = mulberry(9), n = makeNoise(4), P = pulseOf(A.beat), T = A.t;
  push(c, 1100, 700, A.push);
  c.fillStyle = lin(c, 0, 0, 0, 640, [[0, '#2f6fc0'], [0.55, '#8cc6ec'], [1, '#fff0c8']]); c.fillRect(0, 0, W, H);
  glow(c, 1520, 170, 520 * (1 + 0.05 * P), 'rgba(255,235,170,0.9)'); ell(c, 1520, 170, 60, 60, '#fffbe8');
  // cumulus clouds
  const cloud = (x: number, y: number, s: number) => {
    for (let k = 0; k < 9; k++) { const dx = (k - 4) * 48 * s + r() * 20 * s, dy = -Math.abs(4 - k) * -8 * s - r() * 40 * s; ell(c, x + dx, y + dy + 30 * s, 70 * s, 34 * s, '#b9c8dc'); }
    for (let k = 0; k < 9; k++) { const dx = (k - 4) * 46 * s + r() * 20 * s, dy = -Math.abs(4 - k) * -9 * s - r() * 50 * s; ell(c, x + dx, y + dy, 62 * s + r() * 20 * s, 52 * s, '#fbf8f0'); }
  };
  cloud(420 + T * 9, 190, 1.3); cloud(980 + T * 6, 120, 0.9); cloud(1240 + T * 4, 330, 0.7); cloud(160 + T * 3, 400, 0.6);
  // hills, far to near
  const hill = (base: number, amp: number, fq: number, seed: number, fill: string | CanvasGradient) => {
    c.beginPath(); c.moveTo(0, H);
    for (let x = 0; x <= W; x += 20) c.lineTo(x, base - amp * (0.5 + 0.5 * n(x * fq + seed, seed)));
    c.lineTo(W, H); c.closePath(); c.fillStyle = fill; c.fill();
  };
  hill(560, 120, 0.0025, 3, '#8fb0b4');
  hill(600, 110, 0.003, 11, lin(c, 0, 480, 0, 640, [[0, '#7aa463'], [1, '#6b9a4c']]));
  // farm house far right
  c.fillStyle = '#efe6d2'; c.fillRect(1600, 520, 90, 52); poly(c, [[1588, 524], [1645, 482], [1702, 524]], '#b2412e');
  c.fillStyle = '#4a3a2a'; c.fillRect(1632, 540, 18, 32);
  hill(660, 90, 0.002, 21, lin(c, 0, 560, 0, 720, [[0, '#a5c552'], [1, '#86b13e']]));
  hill(760, 60, 0.0016, 33, lin(c, 0, 690, 0, H, [[0, '#8fbd44'], [0.5, '#6f9e33'], [1, '#4f7d26']]));
  // dirt path
  c.beginPath(); c.moveTo(860, H); c.bezierCurveTo(900, 930, 1000, 800, 1060, 700); c.lineTo(1085, 702); c.bezierCurveTo(1060, 800, 1060, 930, 1110, H); c.closePath();
  c.fillStyle = lin(c, 0, 700, 0, H, [[0, '#d8c08a'], [1, '#b98e58']]); c.fill();
  // fence
  for (let k = 0; k < 14; k++) { const x = 700 + k * 64, y = 690 - k * 6; c.fillStyle = '#6b4a30'; c.fillRect(x, y - 52, 9, 58); }
  c.strokeStyle = '#7b583a'; c.lineWidth = 6; c.beginPath(); c.moveTo(700, 660); c.lineTo(1540, 582); c.moveTo(700, 680); c.lineTo(1540, 602); c.stroke();
  // big tree with shade
  ell(c, 380, 840, 330, 60, 'rgba(40,70,20,0.55)');
  c.fillStyle = lin(c, 330, 0, 430, 0, [[0, '#3a2618'], [0.6, '#6a4a30'], [1, '#3a2618']]);
  poly(c, [[340, 860], [420, 860], [405, 560], [440, 470], [400, 470], [380, 540], [330, 470], [300, 480], [355, 580]], c.fillStyle as string);
  const leaves: [number, number, number, string][] = [];
  for (let k = 0; k < 46; k++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()); leaves.push([380 + Math.cos(a) * 300 * d, 330 + Math.sin(a) * 190 * d, 70 + r() * 60, '']); }
  leaves.sort((a, b) => a[1] - b[1]);
  for (const [x0, y, s] of leaves) { const x = x0 + 5 * Math.sin(T * 1.3 + y * 0.02) * (1 - (y - 140) / 400); const lit = (x - 380) * 0.4 - (y - 330) * 0.9 + 60; ell(c, x, y, s, s * 0.8, lit > 90 ? '#9cc84e' : lit > 20 ? '#5f9a36' : '#2f6326'); }
  // the cowherd resting against the trunk: straw hat, white shirt, blue trousers, a bamboo stick
  ell(c, 455, 800, 60, 34, '#3e5f96', 0.15); ell(c, 515, 815, 55, 22, '#36548a', 0.05);
  ell(c, 432, 730, 42, 62, '#f1ece0'); ell(c, 428, 668, 24, 26, '#c98a5a');
  const nod = 4 * P; ell(c, 430, 650 + nod, 62, 16, '#e8c66c'); ell(c, 430, 640 + nod, 28, 18, '#f2d27c');
  c.strokeStyle = '#c9b071'; c.lineWidth = 6; c.beginPath(); c.moveTo(470, 760); c.lineTo(640, 600); c.stroke();
  // a laptop abandoned in the grass
  poly(c, [[560, 850], [640, 842], [652, 858], [570, 866]], '#9aa0a8'); poly(c, [[560, 850], [572, 806], [648, 798], [640, 842]], '#7c838d');
  // cows
  const cow = (x: number, y: number, s: number, coat: 'yellow' | 'holstein' | 'brown', dir: 1 | -1, graze: boolean, ph = 0) => {
    const body = coat === 'yellow' ? '#c98d3e' : coat === 'brown' ? '#7a4a28' : '#f4f1e8', shade = coat === 'holstein' ? '#b9b4aa' : coat === 'yellow' ? '#8f5f26' : '#4a2c18';
    ell(c, x, y + 95 * s, 120 * s, 16 * s, 'rgba(30,50,15,0.45)');
    for (const lx of [-70, -45, 45, 70]) { c.fillStyle = shade; c.fillRect(x + lx * s * dir - 9 * s, y + 10 * s, 18 * s, 85 * s); c.fillStyle = '#2a2018'; c.fillRect(x + lx * s * dir - 9 * s, y + 88 * s, 18 * s, 8 * s); }
    ell(c, x, y + 4 * s, 116 * s, 62 * s, shade);
    ell(c, x, y, 110 * s, 56 * s, lin(c, 0, y - 56 * s, 0, y + 56 * s, [[0, body], [0.55, body], [1, shade]]));
    ell(c, x + 10 * s, y - 34 * s, 80 * s, 14 * s, 'rgba(255,240,200,0.45)');
    if (coat === 'holstein') for (let k = 0; k < 5; k++) ell(c, x + (r() - 0.5) * 150 * s, y + (r() - 0.6) * 60 * s, (18 + r() * 22) * s, (12 + r() * 16) * s, '#1e1a18', r());
    const hx = x + 115 * s * dir, hy = y + (graze ? 50 + 7 * Math.sin(T * 2.2 + ph) : -25 + 9 * P) * s;
    ell(c, x + 90 * s * dir, y + (graze ? 15 : -10) * s, 40 * s, 34 * s, body);
    ell(c, hx, hy, 34 * s, 40 * s, coat === 'holstein' ? '#f4f1e8' : body, graze ? 0.5 * dir : 0.2 * dir);
    ell(c, hx + 16 * s * dir, hy + 26 * s, 22 * s, 16 * s, '#e3a29a');
    ell(c, hx - 22 * s * dir, hy - 28 * s, 18 * s, 8 * s, shade, -0.4 * dir);
    poly(c, [[hx - 8 * s, hy - 34 * s], [hx - 2 * s, hy - 58 * s], [hx + 6 * s, hy - 34 * s]], '#efe4c6');
    c.strokeStyle = shade; c.lineWidth = 6 * s; c.beginPath(); c.moveTo(x - 105 * s * dir, y - 20 * s); c.quadraticCurveTo(x - 128 * s * dir, y + 30 * s, x - (118 + 26 * Math.sin(T * 2.6 + ph)) * s * dir, y + 70 * s); c.stroke();
  };
  cow(1150, 640, 0.42, 'yellow', -1, true, 1); cow(1380, 610, 0.34, 'brown', 1, true, 2); cow(900, 690, 0.5, 'holstein', 1, true, 3);
  cow(1400, 840, 1.25, 'yellow', -1, false, 4); cow(760, 900, 0.85, 'holstein', 1, true, 5);
  // a brass bell on the near cow
  const bx = 1272 + 9 * Math.sin(T * 7) * (0.3 + P), by = 890 + 11 * P; ell(c, bx, by, 20, 25, '#d9a63c'); ell(c, bx - 6, by - 10, 7, 10, '#fff0b0');
  texturize(c, 77, 1.2, 480);
  // sunlight across the near grass
  c.fillStyle = 'rgba(255,240,170,0.12)'; c.beginPath(); c.ellipse(1300, 760, 700, 120, -0.08, 0, Math.PI * 2); c.fill();
  // wildflowers
  for (let k = 0; k < 260; k++) { const x = r() * W, y = 720 + Math.pow(r(), 0.7) * 360; if ((x > 1150 && x < 1650 && y > 760) || (x > 840 && x < 1120 && y > 700)) continue; ell(c, x + 3 * Math.sin(T * 2 + k), y, 4 + (y - 700) / 60, 3 + (y - 700) / 80, ['#ffd84a', '#ffffff', '#e8483a', '#f2a3d0'][k % 4]!); }
  c.restore();
  captionOn(c, A.caption);
  return cv;
}

/** Van Gogh-ish swirling flow for the sky of the pasture. */
export function skyFlow(seed = 3) {
  const n = makeNoise(seed);
  return (x: number, y: number) => {
    if (y > 520 + 60 * n(x * 0.003, 9)) return null;
    // curl-like swirl: angle from two noise octaves, biased horizontal
    return n(x * 0.0022, y * 0.0026) * 2.6 + 0.6 * n(x * 0.006 + 5, y * 0.006);
  };
}
