// Lyric caption styles for the folk/country "Chăn bò" video. Each draws one line on the 1920×1080 overlay as a pure
// function of time: f.t / f.beat, and the line's [start, end] span. Fonts: Marker Felt, Bradley Hand and Noteworthy
// are macOS system fonts with full Vietnamese coverage (the render machine is a Mac); Archivo is the fallback.
import type { FrameInfo } from '../core/plate';

export type LyricStyle = 'wave' | 'wood' | 'hand' | 'handdark' | 'bell' | 'stamp' | 'pumpkin' | 'ghost';
type Span = [number, number];
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const outCubic = (x: number) => 1 - Math.pow(1 - x, 3);
const outBack = (x: number) => { const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const hash = (i: number) => { const x = Math.sin(i * 127.1) * 43758.5453; return x - Math.floor(x); };
const pulse = (beat: number, p = 3) => Math.pow(1 - (beat - Math.floor(beat)), p);

/** words with approximate sung times: spread evenly over the first 85 % of the line (until word alignment exists) */
function wordTimes(text: string, span: Span, times?: number[]) {
  const words = text.normalize('NFC').split(' ').filter(Boolean);
  if (times && times.length === words.length) return words.map((w, i) => ({ w, t: times[i]! })); // sung times from CTC alignment
  const d = (span[1] - span[0]) * 0.85;
  return words.map((w, i) => ({ w, t: span[0] + (i / words.length) * d }));
}

// ---------------------------------------------------------------- 1 · wooden farm sign on ropes, swinging on the beat
function wood(c: CanvasRenderingContext2D, text: string, f: FrameInfo, span: Span, y: number) {
  c.font = '700 64px "Marker Felt", "Archivo"';
  const tw = c.measureText(text).width, W = tw + 110, H = 112;
  const drop = outBack(clamp((f.t - span[0]) / 0.55)), out = clamp((span[1] - f.t) / 0.3);
  const ang = 0.045 * Math.sin(Math.PI * f.beat) * (0.6 + 0.4 * pulse(f.beat)) + (1 - clamp((f.t - span[0]) / 0.55)) * 0.12;
  const pivotY = y - 330, boardY = 330 - 40 + (1 - drop) * -420 - (1 - out) * 420;
  c.save(); c.translate(c.canvas.width / 2, pivotY); c.rotate(ang);
  // ropes
  c.strokeStyle = '#c9a66b'; c.lineWidth = 5;
  for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * (W / 2 - 40), -pivotY - 60); c.lineTo(sx * (W / 2 - 40), boardY - H / 2 + 8); c.stroke(); }
  // plank with grain
  c.translate(0, boardY);
  c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowBlur = 18; c.shadowOffsetY = 8;
  const g = c.createLinearGradient(0, -H / 2, 0, H / 2); g.addColorStop(0, '#9a6a3c'); g.addColorStop(1, '#6e4426');
  c.fillStyle = g; c.beginPath(); c.roundRect(-W / 2, -H / 2, W, H, 14); c.fill();
  c.shadowColor = 'transparent';
  c.save(); c.clip();
  c.strokeStyle = 'rgba(50,28,12,0.35)'; c.lineWidth = 2;
  for (let k = 0; k < 9; k++) { c.beginPath(); const yy = -H / 2 + 8 + k * 12.5; c.moveTo(-W / 2, yy); for (let x = -W / 2; x <= W / 2; x += 40) c.lineTo(x, yy + 3 * Math.sin(x * 0.02 + k * 1.7)); c.stroke(); }
  c.restore();
  c.strokeStyle = 'rgba(40,22,10,0.6)'; c.lineWidth = 3; c.beginPath(); c.roundRect(-W / 2, -H / 2, W, H, 14); c.stroke();
  c.fillStyle = '#3a2412'; for (const sx of [-1, 1]) { c.beginPath(); c.arc(sx * (W / 2 - 40), -H / 2 + 14, 6, 0, 7); c.fill(); }
  // painted letters
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = 'rgba(30,16,6,0.55)'; c.fillText(text, 2, 5);
  c.fillStyle = '#f7e6c0'; c.fillText(text, 0, 2);
  c.restore(); c.textAlign = 'left'; c.textBaseline = 'alphabetic';
}

// ---------------------------------------------------------------- 2 · handwriting that writes itself out
function hand(c: CanvasRenderingContext2D, text: string, f: FrameInfo, span: Span, y: number, _t?: number[], dark = false) {
  c.font = '700 78px "Bradley Hand", "Noteworthy", "Archivo"';
  const tw = c.measureText(text).width, x0 = c.canvas.width / 2 - tw / 2;
  const write = clamp((f.t - span[0]) / Math.min(1.6, (span[1] - span[0]) * 0.6)), out = clamp((span[1] - f.t) / 0.3);
  const edge = x0 + tw * outCubic(write);
  c.save(); c.globalAlpha = out;
  c.beginPath(); c.rect(0, 0, edge + 4, 1080); c.clip();
  c.shadowColor = dark ? 'rgba(255,250,235,0.95)' : 'rgba(20,12,4,0.65)'; c.shadowBlur = dark ? 18 : 14; c.shadowOffsetY = dark ? 0 : 3;
  if (dark) { c.lineWidth = 8; c.lineJoin = 'round'; c.strokeStyle = 'rgba(255,248,232,0.9)'; c.strokeText(text, x0, y + 4 * Math.sin(f.beat * Math.PI) * pulse(f.beat, 2)); }
  c.fillStyle = dark ? '#4a2a18' : '#fff6e0'; c.fillText(text, x0, y + 4 * Math.sin(f.beat * Math.PI) * pulse(f.beat, 2));
  c.restore();
  // underline swash after the line is written, breathing on the beat
  const sw = clamp((f.t - span[0] - 1.0) / 0.6);
  if (sw > 0) {
    c.save(); c.globalAlpha = out; c.strokeStyle = '#f2c14e'; c.lineWidth = 5 + 2 * pulse(f.beat); c.lineCap = 'round';
    c.beginPath(); const L = tw * sw;
    for (let x = 0; x <= L; x += 8) { const yy = y + 26 + 6 * Math.sin(x * 0.012) - (x / tw) * 10; x ? c.lineTo(x0 + x, yy) : c.moveTo(x0, yy); }
    c.stroke(); c.restore();
  }
  // the pen nib while writing
  if (write > 0 && write < 1) { c.fillStyle = '#f2c14e'; c.beginPath(); c.arc(edge + 6, y - 20 + 10 * Math.sin(f.t * 30), 7, 0, 7); c.fill(); }
}

// ---------------------------------------------------------------- 3 · karaoke with a bouncing cowbell
function cowbell(c: CanvasRenderingContext2D, x: number, y: number, s: number, swing: number) {
  c.save(); c.translate(x, y); c.rotate(swing); c.scale(s, s);
  c.strokeStyle = '#6b3a1e'; c.lineWidth = 6; c.beginPath(); c.arc(0, -34, 12, Math.PI, 0); c.stroke(); // strap loop
  const g = c.createLinearGradient(-26, 0, 26, 0); g.addColorStop(0, '#9a6b1e'); g.addColorStop(0.35, '#f2cf6a'); g.addColorStop(1, '#8a5a14');
  c.fillStyle = g; c.strokeStyle = '#4a2c0c'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(-14, -30); c.lineTo(14, -30); c.lineTo(26, 18); c.quadraticCurveTo(0, 26, -26, 18); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#3a2410'; c.beginPath(); c.arc(0, 24, 7, 0, 7); c.fill(); // clapper
  c.restore();
}
/** a little jack-o'-lantern, the Halloween stand-in for the cowbell */
function pumpkinIcon(c: CanvasRenderingContext2D, x: number, y: number, s: number, swing: number) {
  c.save(); c.translate(x, y); c.rotate(swing); c.scale(s, s);
  c.fillStyle = '#4a6a22'; c.fillRect(-4, -40, 8, 14);
  const g = c.createRadialGradient(-8, -10, 4, 0, 0, 36); g.addColorStop(0, '#ffb04a'); g.addColorStop(1, '#c8500e');
  c.fillStyle = g; for (const dx of [-14, 0, 14]) { c.beginPath(); c.ellipse(dx, 0, 20, 27, 0, 0, 7); c.fill(); }
  c.fillStyle = '#ffe27a'; c.shadowColor = '#ffb030'; c.shadowBlur = 10;
  c.beginPath(); c.moveTo(-14, -6); c.lineTo(-6, -6); c.lineTo(-10, -14); c.fill(); c.beginPath(); c.moveTo(6, -6); c.lineTo(14, -6); c.lineTo(10, -14); c.fill();
  c.beginPath(); c.moveTo(-16, 6); for (let i = 0; i <= 4; i++) c.lineTo(-16 + i * 8, 6 + (i % 2 ? 6 : 0)); c.quadraticCurveTo(0, 22, -16, 6); c.fill();
  c.restore();
}
/** karaoke: words light up as sung, a cowbell (or pumpkin) hops word to word; long lines wrap into two rows */
function bell(c: CanvasRenderingContext2D, text: string, f: FrameInfo, span: Span, y: number, times?: number[], icon: 'cowbell' | 'pumpkin' = 'cowbell') {
  c.font = '700 66px "Chalkboard SE", "Marker Felt", "Archivo"'; c.lineJoin = 'round';
  const ws = wordTimes(text, span, times), sp = c.measureText(' ').width;
  const widths = ws.map((w) => c.measureText(w.w).width), total = widths.reduce((a, b) => a + b, 0) + sp * (ws.length - 1);
  const rows = total > c.canvas.width * 0.88 ? 2 : 1, rowH = 84;
  // split into rows of roughly equal width
  const rowOf: number[] = []; let acc = 0;
  ws.forEach((_, i) => { rowOf.push(rows === 2 && acc > total / 2 ? 1 : 0); acc += widths[i]! + sp; });
  const rowW = [0, 1].map((r) => ws.reduce((a, _, i) => a + (rowOf[i] === r ? widths[i]! + sp : 0), 0) - sp);
  const intro = outCubic(clamp((f.t - span[0] + 0.25) / 0.3)), out = clamp((span[1] - f.t) / 0.25);
  const xs: number[] = [], ys: number[] = [], cursor = [c.canvas.width / 2 - rowW[0]! / 2, c.canvas.width / 2 - rowW[1]! / 2];
  c.save(); c.globalAlpha = Math.min(intro, out);
  ws.forEach((w, i) => {
    const r = rowOf[i]!, wy = y - (rows - 1 - r) * rowH, cx = cursor[r]! + widths[i]! / 2;
    xs.push(cx); ys.push(wy); cursor[r]! += widths[i]! + sp;
    const sung = f.t >= w.t, hit = clamp((f.t - w.t) / 0.18), pop = sung ? 1 + 0.18 * Math.sin(Math.PI * hit) : 1;
    c.save(); c.translate(cx, wy); c.scale(pop, pop);
    c.textAlign = 'center'; c.lineWidth = 12; c.strokeStyle = 'rgba(40,22,8,0.85)'; c.strokeText(w.w, 0, 0);
    c.fillStyle = sung ? '#ffd24a' : '#fff6e0'; c.fillText(w.w, 0, 0);
    c.restore();
  });
  const k = Math.max(0, ws.findLastIndex((w) => f.t >= w.t));
  const t0 = ws[k]!.t, t1 = ws[k + 1]?.t ?? span[1], u = clamp((f.t - t0) / Math.max(0.05, t1 - t0)), kb = Math.min(k + 1, xs.length - 1);
  const bx = xs[k]! + (xs[kb]! - xs[k]!) * u, base = ys[k]! + (ys[kb]! - ys[k]!) * u, by = base - 92 - 70 * 4 * u * (1 - u);
  (icon === 'pumpkin' ? pumpkinIcon : cowbell)(c, bx, by, 0.9, 0.35 * Math.sin(f.t * 14) * (1 - u) * 0.6);
  c.restore();
}

// ---------------------------------------------------------------- 4 · wood-block stamps in red ink, one word per hit
function stamp(c: CanvasRenderingContext2D, text: string, f: FrameInfo, span: Span, y: number, times?: number[]) {
  c.font = '700 70px "Marker Felt", "Archivo"';
  const ws = wordTimes(text, span, times), sp = c.measureText(' ').width * 1.1;
  const widths = ws.map((w) => c.measureText(w.w).width), total = widths.reduce((a, b) => a + b, 0) + sp * (ws.length - 1);
  const out = clamp((span[1] - f.t) / 0.25);
  let x = c.canvas.width / 2 - total / 2;
  ws.forEach((w, i) => {
    const p = clamp((f.t - w.t) / 0.12);
    if (p <= 0) { x += widths[i]! + sp; return; }
    const sc = 1 + 0.9 * (1 - outCubic(p)), rot = (hash(i + w.w.length) - 0.5) * 0.12;
    c.save(); c.globalAlpha = out * (0.4 + 0.6 * p); c.translate(x + widths[i]! / 2, y); c.rotate(rot); c.scale(sc, sc);
    c.textAlign = 'center';
    // paper label behind the word
    c.fillStyle = 'rgba(244,232,206,0.92)'; c.beginPath(); c.roundRect(-widths[i]! / 2 - 14, -62, widths[i]! + 28, 82, 6); c.fill();
    c.fillStyle = '#b3352a'; c.fillText(w.w, 0, 0);
    // worn ink: knock small specks out of the letters
    c.globalCompositeOperation = 'destination-out';
    for (let k = 0; k < 26; k++) { c.beginPath(); c.arc((hash(i * 31 + k) - 0.5) * widths[i]!, -50 + hash(i * 17 + k * 3) * 60, 1 + hash(k * 7 + i) * 2.2, 0, 7); c.fill(); }
    c.restore();
    x += widths[i]! + sp;
  });
}

/** folk-horror karaoke: pale serif words fade up as they are sung, the current word glows blood red and trembles */
function ghost(c: CanvasRenderingContext2D, text: string, f: FrameInfo, span: Span, y: number, times?: number[]) {
  const words = text.split(/\s+/), W = c.canvas.width, maxW = W - 140;
  c.save(); c.font = 'italic 600 64px Georgia, "Times New Roman", serif'; c.textBaseline = 'alphabetic';
  const sp = c.measureText(' ').width, ws = words.map((w) => c.measureText(w).width), rows: number[][] = [[]]; let rw = 0;
  ws.forEach((w, i) => { if (rw + w > maxW && rows[rows.length - 1]!.length) { rows.push([]); rw = 0; } rows[rows.length - 1]!.push(i); rw += w + sp; });
  const fadeOut = Math.min(1, Math.max(0, (span[1] - f.t) / 0.35));
  rows.forEach((row, r) => {
    const tw = row.reduce((s, i) => s + ws[i]!, 0) + sp * (row.length - 1); let x = (W - tw) / 2; const yy = y - (rows.length - 1 - r) * 84;
    for (const i of row) {
      const t0 = times?.[i] ?? span[0] + (i / words.length) * (span[1] - span[0]), t1 = times?.[i + 1] ?? t0 + 0.4, u = Math.min(1, Math.max(0, (f.t - t0 + 0.15) / 0.3));
      const hot = f.t >= t0 && f.t < t1 + 0.15 ? 1 : 0, jx = hot * Math.sin(f.t * 47 + i) * 1.5, jy = hot * Math.cos(f.t * 39 + i) * 1.5;
      c.globalAlpha = (0.18 + 0.82 * u) * fadeOut;
      c.shadowColor = hot ? 'rgba(255,30,20,0.95)' : 'rgba(0,0,0,0.9)'; c.shadowBlur = hot ? 28 : 12;
      c.fillStyle = hot ? '#ffd8d0' : '#e8ece8'; c.fillText(words[i]!, x + jx, yy + jy + (1 - u) * 10);
      x += ws[i]! + sp;
    }
  });
  c.restore();
}

export function drawLyric(style: LyricStyle, c: CanvasRenderingContext2D, text: string, f: FrameInfo, span: Span, y = c.canvas.height - 120, times?: number[]) {
  if (!text) return;
  if (style === 'pumpkin') return bell(c, text, f, span, y, times, 'pumpkin');
  if (style === 'handdark') return hand(c, text, f, span, y, times, true);
  if (style === 'ghost') return ghost(c, text, f, span, y, times);
  ({ wood, hand, bell, stamp } as Record<string, typeof bell>)[style]?.(c, text, f, span, y, times);
}
