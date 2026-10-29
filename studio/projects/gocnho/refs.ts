// Flat reference pictures for "Góc Nhỏ Bình Yên" — one per lyric moment. The oil painter repaints them stroke by
// stroke, each over the previous painting, so the picture keeps turning into the next one.
import { drawBloom } from '../rose/plates';

const W = 1920, H = 1080;
type C = CanvasRenderingContext2D;
export const mk = (draw: (c: C) => void) => () => { const cv = document.createElement('canvas'); cv.width = W; cv.height = H; draw(cv.getContext('2d')!); return cv; };
export const lin = (c: C, x0: number, y0: number, x1: number, y1: number, st: [number, string][]) => { const g = c.createLinearGradient(x0, y0, x1, y1); st.forEach(([k, s]) => g.addColorStop(k, s)); return g; };
export const rad = (c: C, x: number, y: number, r: number, st: [number, string][]) => { const g = c.createRadialGradient(x, y, 0, x, y, r); st.forEach(([k, s]) => g.addColorStop(k, s)); return g; };
export const ell = (c: C, x: number, y: number, rx: number, ry: number, f: string | CanvasGradient, rot = 0) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, 7); c.fillStyle = f; c.fill(); };
export const poly = (c: C, p: number[][], f: string | CanvasGradient) => { c.beginPath(); p.forEach(([x, y], i) => (i ? c.lineTo(x!, y!) : c.moveTo(x!, y!))); c.closePath(); c.fillStyle = f; c.fill(); };
export const glow = (c: C, x: number, y: number, r: number, col: string) => { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = rad(c, x, y, r, [[0, col], [1, 'rgba(0,0,0,0)']]); c.fillRect(x - r, y - r, 2 * r, 2 * r); c.restore(); };
export const rnd = (s: number) => () => { s = (s * 16807) % 2147483647; return s / 2147483647; };

/** a simple painterly person: head, hair, body/dress; facing -1/1; pregnant adds a round belly */
export function person(c: C, x: number, y: number, h: number, o: { dress: string; hair: string; skin?: string; long?: boolean; pregnant?: boolean; face?: -1 | 1; sit?: boolean }) {
  const s = h / 300, skin = o.skin ?? '#e8b08a';
  // legs
  if (!o.sit) { c.fillStyle = o.long ? o.dress : '#3a3a48'; c.fillRect(x - 28 * s, y - 120 * s, 22 * s, 120 * s); c.fillRect(x + 6 * s, y - 120 * s, 22 * s, 120 * s); }
  // body
  if (o.long) poly(c, [[x - 40 * s, y - 230 * s], [x + 40 * s, y - 230 * s], [x + 70 * s, y - (o.sit ? 60 : 30) * s], [x - 70 * s, y - (o.sit ? 60 : 30) * s]], o.dress);
  else poly(c, [[x - 46 * s, y - 235 * s], [x + 46 * s, y - 235 * s], [x + 40 * s, y - 115 * s], [x - 40 * s, y - 115 * s]], o.dress);
  if (o.pregnant) ell(c, x + (o.face ?? 1) * 30 * s, y - 150 * s, 42 * s, 50 * s, o.dress);
  // head + hair
  ell(c, x, y - 262 * s, 30 * s, 34 * s, skin);
  c.fillStyle = o.hair; c.beginPath(); c.ellipse(x - (o.face ?? 1) * 6 * s, y - 275 * s, 33 * s, 28 * s, 0, Math.PI, 0); c.fill();
  if (o.long) c.fillRect(x - (o.face ?? 1) * 32 * s - 4 * s, y - 275 * s, 18 * s, 80 * s);
}
export function cloud(c: C, x: number, y: number, s: number, col = '#f6efe6', shade = 'rgba(150,140,160,0.6)') {
  for (let i = 0; i < 7; i++) ell(c, x + (i - 3) * 50 * s, y + 25 * s, 60 * s, 30 * s, shade);
  for (let i = 0; i < 7; i++) ell(c, x + (i - 3) * 46 * s, y - Math.abs(3 - i) * -6 * s, 52 * s + (i % 2) * 14 * s, 44 * s, col);
}
export function hills(c: C, base: number, amp: number, col: string | CanvasGradient, ph = 0) {
  c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W; x += 20) c.lineTo(x, base - amp * Math.sin(x * 0.003 + ph) - amp * 0.4 * Math.sin(x * 0.009 + ph * 2)); c.lineTo(W, H); c.closePath(); c.fillStyle = col; c.fill();
}
export function petals(c: C, n: number, seed: number, col = '#f2a0b0') { const r = rnd(seed); for (let i = 0; i < n; i++) ell(c, r() * W, r() * H * 0.9, 9 + r() * 6, 5 + r() * 3, col, r() * 3); }
export function windowFrame(c: C, x: number, y: number, w: number, h: number, sky: CanvasGradient | string, frame = '#f2ead8') {
  c.fillStyle = sky; c.fillRect(x, y, w, h);
  c.fillStyle = frame; c.fillRect(x - 14, y - 14, w + 28, 16); c.fillRect(x - 14, y + h - 2, w + 28, 18); c.fillRect(x - 14, y, 16, h); c.fillRect(x + w - 2, y, 16, h); c.fillRect(x + w / 2 - 6, y, 12, h); c.fillRect(x, y + h / 2 - 6, w, 12);
}
export function vase(c: C, x: number, y: number, s: number, flower = '#d8304a') {
  poly(c, [[x - 40 * s, y], [x + 40 * s, y], [x + 30 * s, y - 120 * s], [x + 16 * s, y - 150 * s], [x - 16 * s, y - 150 * s], [x - 30 * s, y - 120 * s]], '#6a8ab0');
  c.strokeStyle = '#3f6a2a'; c.lineWidth = 5 * s; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(x, y - 140 * s); c.lineTo(x + i * 40 * s, y - 260 * s - Math.abs(i) * -20 * s); c.stroke(); }
  for (let i = -2; i <= 2; i++) { ell(c, x + i * 40 * s, y - 265 * s + Math.abs(i) * 20 * s, 26 * s, 22 * s, i % 2 ? '#f2a0b0' : flower); ell(c, x + i * 40 * s, y - 270 * s + Math.abs(i) * 20 * s, 12 * s, 10 * s, 'rgba(255,230,200,0.6)'); }
}

export const REFS: Record<string, () => HTMLCanvasElement> = {
  /** a peaceful room, light through the window, flowers on the table, petals drifting */
  room: mk((c) => {
    c.fillStyle = lin(c, 0, 0, 0, H, [[0, '#e8d2b4'], [1, '#c8a47e']]); c.fillRect(0, 0, W, H);
    windowFrame(c, 620, 140, 680, 520, lin(c, 0, 140, 0, 660, [[0, '#bfe0f2'], [1, '#f6efd8']]));
    hills(c, 600, 30, '#9cc070'); c.fillStyle = lin(c, 0, 0, 0, H, [[0, '#e8d2b4'], [1, '#c8a47e']]); c.fillRect(0, 0, 606, H); c.fillRect(1314, 0, W, H); c.fillRect(606, 0, 708, 126); c.fillRect(606, 674, 708, H);
    windowFrame(c, 620, 140, 680, 520, 'rgba(0,0,0,0)');
    glow(c, 960, 400, 700, 'rgba(255,240,210,0.35)');
    poly(c, [[600, 1080], [1320, 1080], [1700, 760], [220, 760]], 'rgba(255,240,200,0.25)');
    c.fillStyle = '#8a5a3a'; c.fillRect(760, 700, 400, 26); c.fillRect(790, 726, 16, 200); c.fillRect(1114, 726, 16, 200);
    vase(c, 960, 700, 1);
    c.fillStyle = '#7a3a2a'; c.fillRect(0, 900, W, 180);
    petals(c, 40, 7);
  }),
  /** the two of them on the sofa by the window, heads together */
  couple: mk((c) => {
    c.fillStyle = lin(c, 0, 0, 0, H, [[0, '#e6cfae'], [1, '#c09a74']]); c.fillRect(0, 0, W, H);
    windowFrame(c, 1180, 120, 520, 480, lin(c, 0, 120, 0, 600, [[0, '#ffd9a8'], [1, '#ffeccc']]));
    glow(c, 1440, 360, 650, 'rgba(255,220,170,0.45)');
    poly(c, [[300, 640], [1250, 640], [1290, 900], [260, 900]], '#9a6a5a'); poly(c, [[280, 520], [1270, 520], [1290, 680], [260, 680]], '#b07a66');
    ell(c, 290, 700, 60, 120, '#a06e5c'); ell(c, 1260, 700, 60, 120, '#a06e5c');
    person(c, 690, 860, 520, { dress: '#5a6a9a', hair: '#2a1a12', sit: true, face: 1 });
    person(c, 860, 870, 480, { dress: '#e8a0a8', hair: '#3a2214', long: true, sit: true, face: -1 });
    c.fillStyle = '#6a3a2a'; c.fillRect(0, 900, W, 180); petals(c, 24, 11);
  }),
  /** her eyes light up: sun breaking through dark clouds over the sea */
  sunbreak: mk((c) => {
    c.fillStyle = lin(c, 0, 0, 0, 700, [[0, '#3a4a6a'], [0.6, '#8a7a8a'], [1, '#f2c088']]); c.fillRect(0, 0, W, H);
    glow(c, 960, 520, 900, 'rgba(255,220,140,0.8)'); ell(c, 960, 520, 90, 90, '#fff4d0');
    c.save(); c.globalAlpha = 0.35; c.fillStyle = '#fff0c0'; for (let i = -6; i <= 6; i++) poly(c, [[960, 520], [960 + i * 260 - 60, 0], [960 + i * 260 + 60, 0]], '#fff0c0'); c.restore();
    cloud(c, 420, 300, 2.4, '#4a5068', 'rgba(30,30,50,0.6)'); cloud(c, 1500, 260, 2.2, '#4a5068', 'rgba(30,30,50,0.6)'); cloud(c, 980, 140, 1.6, '#5a5a78');
    c.fillStyle = lin(c, 0, 600, 0, H, [[0, '#f2b878'], [1, '#2a3a5a']]); c.fillRect(0, 640, W, 440);
    poly(c, [[860, 640], [1060, 640], [1300, 1080], [620, 1080]], 'rgba(255,230,170,0.6)');
  }),
  /** hand in hand under one umbrella through the storm */
  rain: mk((c) => {
    c.fillStyle = lin(c, 0, 0, 0, H, [[0, '#3a4658'], [1, '#6a7a8a']]); c.fillRect(0, 0, W, H);
    for (let i = 0; i < 9; i++) { c.fillStyle = i % 2 ? '#2a3442' : '#323e4e'; c.fillRect(i * 230 - 40, 200 + (i % 3) * 60, 200, 600); for (let k = 0; k < 8; k++) if ((i + k) % 3) { c.fillStyle = '#e8c070'; c.fillRect(i * 230 - 10 + (k % 2) * 90, 260 + Math.floor(k / 2) * 110 + (i % 3) * 60, 40, 50); } }
    c.fillStyle = lin(c, 0, 760, 0, H, [[0, '#5a6878'], [1, '#2a3440']]); c.fillRect(0, 760, W, 320);
    for (let i = 0; i < 9; i++) { c.fillStyle = 'rgba(232,192,112,0.35)'; c.fillRect(i * 230, 800 + (i % 2) * 20, 60, 200); }
    person(c, 900, 900, 380, { dress: '#2a3a5a', hair: '#1a1210', face: 1 }); person(c, 1010, 900, 350, { dress: '#c8485a', hair: '#2a1810', long: true, face: -1 });
    c.fillStyle = '#e8b08a'; ell(c, 958, 740, 16, 12, '#e8b08a');
    c.fillStyle = '#d83a4a'; c.beginPath(); c.moveTo(740, 560); c.quadraticCurveTo(955, 380, 1170, 560); c.closePath(); c.fill();
    c.strokeStyle = '#3a2a2a'; c.lineWidth = 7; c.beginPath(); c.moveTo(955, 500); c.lineTo(955, 760); c.stroke();
    c.strokeStyle = 'rgba(220,230,240,0.55)'; c.lineWidth = 3; const r = rnd(5); for (let i = 0; i < 260; i++) { const x = r() * W, y = r() * H; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 12, y + 46); c.stroke(); }
  }),
  /** dawn on the hill, two of them watching the sun come up */
  sunrise: mk((c) => {
    c.fillStyle = lin(c, 0, 0, 0, 760, [[0, '#6a7ab8'], [0.45, '#f2a0a0'], [0.8, '#ffd08a'], [1, '#fff0c8']]); c.fillRect(0, 0, W, H);
    glow(c, 1160, 640, 700, 'rgba(255,220,150,0.8)'); ell(c, 1160, 640, 110, 110, '#fff2c8');
    cloud(c, 400, 220, 1.5, '#f6c8c0', 'rgba(180,120,140,0.5)'); cloud(c, 1550, 300, 1.2, '#f8d0c0', 'rgba(180,120,140,0.5)');
    hills(c, 700, 50, '#b8a0a8', 1); hills(c, 790, 40, '#8a9a6a', 2.4);
    hills(c, 900, 70, lin(c, 0, 820, 0, H, [[0, '#5a7a3a'], [1, '#2a3a1a']]), 4);
    person(c, 780, 860, 300, { dress: '#3a3a4a', hair: '#1a1210', face: 1 }); person(c, 860, 860, 280, { dress: '#c86a7a', hair: '#2a1810', long: true, face: 1 });
  }),
  /** the little house, warm windows, flowers all around — simple happiness */
  home: mk((c) => {
    c.fillStyle = lin(c, 0, 0, 0, 700, [[0, '#8ac0e8'], [1, '#f6efd8']]); c.fillRect(0, 0, W, H);
    cloud(c, 500, 200, 1.3); cloud(c, 1450, 150, 1);
    hills(c, 720, 40, '#8ab060', 0.5);
    poly(c, [[640, 760], [1280, 760], [1280, 470], [640, 470]], '#f2e6cc'); poly(c, [[600, 480], [960, 250], [1320, 480]], '#b0483a');
    c.fillStyle = '#6a4a32'; c.fillRect(920, 600, 90, 160);
    for (const x of [700, 1120]) { c.fillStyle = '#ffd88a'; c.fillRect(x, 540, 110, 90); c.strokeStyle = '#6a4a32'; c.lineWidth = 8; c.strokeRect(x, 540, 110, 90); }
    c.fillStyle = lin(c, 0, 760, 0, H, [[0, '#7aa04a'], [1, '#3a5a2a']]); c.fillRect(0, 760, W, 320);
    const r = rnd(3); for (let i = 0; i < 160; i++) ell(c, r() * W, 790 + r() * 280, 10 + r() * 8, 8 + r() * 6, ['#f2a0b0', '#ffe070', '#ffffff', '#e8485a'][i % 4]!);
    poly(c, [[930, 760], [1000, 760], [1200, 1080], [760, 1080]], '#c8a878');
  }),
  /** the long road to the horizon, clouds overhead, hand in hand all the way */
  road: mk((c) => {
    c.fillStyle = lin(c, 0, 0, 0, 640, [[0, '#7aa0c8'], [0.7, '#f2c8a0'], [1, '#ffe0b0']]); c.fillRect(0, 0, W, H);
    glow(c, 960, 600, 500, 'rgba(255,220,160,0.6)');
    cloud(c, 400, 260, 1.8, '#d8d0d8', 'rgba(120,110,140,0.5)'); cloud(c, 1400, 200, 2, '#d8d0d8', 'rgba(120,110,140,0.5)'); cloud(c, 980, 380, 1, '#f0e0d8');
    c.fillStyle = lin(c, 0, 620, 0, H, [[0, '#a0b070'], [1, '#4a6a2a']]); c.fillRect(0, 620, W, 460);
    poly(c, [[940, 620], [980, 620], [1360, 1080], [560, 1080]], lin(c, 0, 620, 0, H, [[0, '#e8d0a0'], [1, '#b08a5a']]));
    for (const sx of [-1, 1]) for (let i = 0; i < 9; i++) { const t = i / 9, x = 960 + sx * (60 + 520 * Math.pow(t, 1.6)), y = 620 + 460 * Math.pow(t, 1.4), s = 0.2 + t; c.fillStyle = '#5a3a24'; c.fillRect(x - 6 * s, y - 120 * s, 12 * s, 120 * s); ell(c, x, y - 150 * s, 60 * s, 70 * s, i % 2 ? '#5a8a3a' : '#7aa04a'); }
    person(c, 930, 900, 230, { dress: '#3a4a6a', hair: '#1a1210', face: -1 }); person(c, 990, 900, 215, { dress: '#e0a0a8', hair: '#2a1810', long: true, face: -1 });
  }),
  /** night: the house smells of tea — teapot, two cups steaming, moon in the window */
  tea: mk((c) => {
    c.fillStyle = lin(c, 0, 0, 0, H, [[0, '#2a2a40'], [1, '#4a3a3a']]); c.fillRect(0, 0, W, H);
    windowFrame(c, 1100, 120, 560, 500, lin(c, 0, 120, 0, 620, [[0, '#14203a'], [1, '#2a3a5a']]), '#6a5a4a');
    ell(c, 1480, 260, 50, 50, '#f6efd0'); glow(c, 1480, 260, 260, 'rgba(240,230,190,0.5)');
    const r = rnd(9); for (let i = 0; i < 40; i++) ell(c, 1110 + r() * 540, 130 + r() * 480, 3, 3, '#fff6d8');
    glow(c, 700, 700, 600, 'rgba(255,190,120,0.45)');
    c.fillStyle = '#6a4228'; c.fillRect(300, 760, 1100, 40); c.fillStyle = '#4a2a18'; c.fillRect(300, 800, 1100, 280);
    ell(c, 720, 690, 130, 90, '#c8d8d0'); c.fillStyle = '#c8d8d0'; c.fillRect(600, 690, 240, 70); ell(c, 720, 600, 40, 18, '#b0c4bc'); poly(c, [[840, 680], [960, 620], [970, 640], [850, 710]], '#c8d8d0');
    for (const x of [1030, 1200]) { poly(c, [[x - 50, 700], [x + 50, 700], [x + 40, 760], [x - 40, 760]], '#f2ece0'); ell(c, x, 700, 50, 12, '#a0622a'); }
    c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 8; for (const x of [1030, 1200]) { c.beginPath(); c.moveTo(x, 690); c.bezierCurveTo(x - 30, 620, x + 30, 580, x, 500); c.stroke(); }
  }),
  /** she smiles in her sleep, moonlight across the bed */
  sleep: mk((c) => {
    c.fillStyle = lin(c, 0, 0, 0, H, [[0, '#1e2a48'], [1, '#2a3050']]); c.fillRect(0, 0, W, H);
    windowFrame(c, 300, 140, 460, 520, lin(c, 0, 140, 0, 660, [[0, '#0e1a34'], [1, '#2a3a60']]), '#4a5070');
    ell(c, 560, 280, 46, 46, '#f6f0d6'); glow(c, 560, 280, 300, 'rgba(220,220,255,0.45)');
    poly(c, [[300, 660], [760, 660], [1500, 1080], [500, 1080]], 'rgba(170,190,240,0.18)');
    poly(c, [[700, 640], [1700, 640], [1760, 900], [640, 900]], '#d8d8ea'); c.fillStyle = '#5a4a6a'; c.fillRect(640, 560, 60, 360);
    ell(c, 860, 630, 140, 60, '#f2f2fa'); ell(c, 870, 600, 56, 50, '#e8b08a'); c.fillStyle = '#2a1810'; c.beginPath(); c.ellipse(840, 590, 70, 56, 0.2, Math.PI * 0.9, Math.PI * 2.1); c.fill();
    poly(c, [[920, 620], [1700, 620], [1720, 860], [900, 860]], '#9aa0d0'); ell(c, 1300, 660, 360, 60, '#aab0dc');
  }),
  /** worries melt away: a sky full of stars over the roof, one warm lantern */
  stars: mk((c) => {
    c.fillStyle = lin(c, 0, 0, 0, H, [[0, '#0a1230'], [0.7, '#2a3a6a'], [1, '#4a4a6a']]); c.fillRect(0, 0, W, H);
    const r = rnd(21); for (let i = 0; i < 260; i++) { const x = r() * W, y = r() * 700, s = 1 + r() * 4; ell(c, x, y, s, s, r() > 0.8 ? '#ffe8b0' : '#f0f4ff'); }
    c.save(); c.globalAlpha = 0.35; c.fillStyle = lin(c, 0, 300, W, 600, [[0, 'rgba(160,140,255,0)'], [0.5, '#c0b0ff'], [1, 'rgba(160,140,255,0)']]); c.beginPath(); c.ellipse(960, 400, 1100, 140, -0.25, 0, 7); c.fill(); c.restore();
    hills(c, 860, 40, '#1a2240', 1); poly(c, [[600, 880], [960, 640], [1320, 880]], '#2a2030'); c.fillStyle = '#3a2e3a'; c.fillRect(680, 880, 560, 200);
    c.fillStyle = '#ffd080'; c.fillRect(900, 920, 120, 100); glow(c, 960, 960, 360, 'rgba(255,200,110,0.6)');
  }),
  /** sunset meadow: he holds her, his hand on the round belly */
  family: mk((c) => {
    c.fillStyle = lin(c, 0, 0, 0, 760, [[0, '#7a6ab0'], [0.5, '#f29a8a'], [1, '#ffd890']]); c.fillRect(0, 0, W, H);
    glow(c, 1300, 640, 700, 'rgba(255,210,140,0.7)'); ell(c, 1300, 660, 120, 120, '#fff0c0');
    hills(c, 760, 30, '#b07a8a', 3); c.fillStyle = lin(c, 0, 760, 0, H, [[0, '#c8a060'], [1, '#5a5a2a']]); c.fillRect(0, 770, W, 310);
    const r = rnd(13); for (let i = 0; i < 120; i++) ell(c, r() * W, 800 + r() * 280, 6, 10, ['#ffe070', '#ffffff', '#f2a0b0'][i % 3]!);
    person(c, 880, 980, 560, { dress: '#e8b0b8', hair: '#2a1810', long: true, pregnant: true, face: 1 });
    person(c, 760, 990, 600, { dress: '#4a5a7a', hair: '#1a1210', face: 1 });
    c.strokeStyle = '#e8b08a'; c.lineWidth = 22; c.lineCap = 'round'; c.beginPath(); c.moveTo(800, 620); c.quadraticCurveTo(880, 700, 930, 700); c.stroke();
  }),
  /** the nursery waiting for our little girl: crib, pink blanket, star mobile, teddy, morning light */
  nursery: mk((c) => {
    c.fillStyle = lin(c, 0, 0, 0, H, [[0, '#f0c4cc'], [1, '#d8a0aa']]); c.fillRect(0, 0, W, H);
    windowFrame(c, 1250, 120, 460, 460, lin(c, 0, 120, 0, 580, [[0, '#cfe8f8'], [1, '#fff6e0']]));
    poly(c, [[1250, 580], [1710, 580], [1300, 1080], [600, 1080]], 'rgba(255,245,215,0.45)');
    c.fillStyle = '#f2ece4'; c.fillRect(0, 900, W, 180);
    c.fillStyle = '#b07a4a'; c.fillRect(540, 560, 680, 30); c.fillRect(540, 820, 680, 30); for (let i = 0; i <= 12; i++) c.fillRect(550 + i * 55, 560, 16, 290); c.fillRect(530, 520, 34, 420); c.fillRect(1200, 520, 34, 420);
    poly(c, [[580, 700], [1180, 700], [1180, 820], [580, 820]], '#e8607e'); ell(c, 700, 700, 90, 34, '#ffffff'); for (let i = 0; i < 9; i++) ell(c, 640 + i * 62, 760, 10, 10, '#ffffff');
    c.strokeStyle = '#c8a888'; c.lineWidth = 4; c.beginPath(); c.moveTo(880, 0); c.lineTo(880, 300); c.moveTo(760, 300); c.lineTo(1000, 300); c.stroke();
    for (const [x, col] of [[760, '#ffd870'], [840, '#f4a8bc'], [920, '#a8d0f0'], [1000, '#ffd870']] as const) { c.beginPath(); c.moveTo(x, 300); c.lineTo(x, 360); c.stroke(); const s = 22; c.fillStyle = col; c.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? s * 0.45 : s; k ? c.lineTo(x + Math.cos(a) * rr, 380 + Math.sin(a) * rr) : c.moveTo(x + Math.cos(a) * rr, 380 + Math.sin(a) * rr); } c.fill(); }
    ell(c, 1400, 880, 80, 90, '#c8905a'); ell(c, 1400, 770, 60, 56, '#c8905a'); ell(c, 1356, 725, 22, 22, '#c8905a'); ell(c, 1444, 725, 22, 22, '#c8905a'); ell(c, 1400, 785, 22, 16, '#e8c8a0');
    c.fillStyle = '#f4a8bc'; c.beginPath(); c.moveTo(1400, 830); c.lineTo(1370, 815); c.lineTo(1370, 845); c.closePath(); c.fill(); c.beginPath(); c.moveTo(1400, 830); c.lineTo(1430, 815); c.lineTo(1430, 845); c.closePath(); c.fill();
  }),
  /** interlude: the rose garden in full bloom */
  garden: mk((c) => {
    c.fillStyle = lin(c, 0, 0, 0, 600, [[0, '#9cc8e8'], [1, '#f6f0dc']]); c.fillRect(0, 0, W, H);
    cloud(c, 500, 180, 1.2); cloud(c, 1500, 140, 1.4);
    c.fillStyle = lin(c, 0, 520, 0, H, [[0, '#6a9a4a'], [1, '#2a4a1e']]); c.fillRect(0, 520, W, 560);
    const r = rnd(31); for (let i = 0; i < 70; i++) { const y = 560 + Math.pow(r(), 0.7) * 520, k = 0.18 + (y - 520) / 900, x = r() * W; ell(c, x, y + 30 * k, 90 * k, 60 * k, '#3f6a2a'); drawBloom(c, x, y, k, (r() - 0.5) * 0.6); }
    c.strokeStyle = '#f2ece0'; c.lineWidth = 14; c.beginPath(); c.arc(960, 560, 260, Math.PI, 0); c.stroke();
  }),
};
