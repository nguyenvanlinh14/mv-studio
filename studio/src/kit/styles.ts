// Alternative 2D looks rendered from the same flat reference image: watercolour on cold-press paper, farm-game pixel
// art, and a Đông Hồ folk woodblock print on shimmering điệp paper. All deterministic per pixel (no frame noise).
import { makeNoise, mulberry } from './paint';

const W = 1920, H = 1080;
const cv = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
function pixels(src: HTMLCanvasElement, blur = 0, w = W, h = H) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true })!;
  x.filter = blur > 0 ? `blur(${blur}px)` : 'none'; x.imageSmoothingEnabled = true; x.drawImage(src, 0, 0, w, h);
  return x.getImageData(0, 0, w, h);
}
const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);
const hex = (s: string) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)] as [number, number, number];

// ---------------------------------------------------------------- watercolour
export function watercolor(ref: HTMLCanvasElement, seed = 1) {
  const n1 = makeNoise(seed), n2 = makeNoise(seed + 1), n3 = makeNoise(seed + 2);
  const soft = pixels(ref, 3), wide = pixels(ref, 9);
  const out = cv(), o = out.getContext('2d')!, img = o.createImageData(W, H), d = img.data, s = soft.data, b = wide.data;
  const paper = [246, 240, 226];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    // hand wobble: sample a little off where the wash ran
    const wx = Math.round(x + 4 * n1(x * 0.01, y * 0.01)), wy = Math.round(y + 4 * n1(x * 0.01 + 9, y * 0.01));
    const j = (Math.min(H - 1, Math.max(0, wy)) * W + Math.min(W - 1, Math.max(0, wx))) * 4, i = (y * W + x) * 4;
    let r = s[j]!, g = s[j + 1]!, bl = s[j + 2]!;
    // transparent pigment: lighten toward the paper, more in the lights
    const l = (r + g + bl) / 3, k = 0.18 + 0.12 * (l / 255);
    r += (paper[0]! - r) * k; g += (paper[1]! - g) * k; bl += (paper[2]! - bl) * k;
    // pigment pooling at the edges of a wash (darker where this differs from its wide neighbourhood)
    const e = Math.min(1, (Math.abs(s[j]! - b[j]!) + Math.abs(s[j + 1]! - b[j + 1]!) + Math.abs(s[j + 2]! - b[j + 2]!)) / 110);
    const pool = 1 - 0.32 * e * e;
    // blotchy uneven wash + granulation, stronger in dark pigment
    const blot = 1 + 0.09 * n2(x * 0.006, y * 0.006) + 0.05 * n2(x * 0.02, y * 0.02);
    const gran = 1 + (0.06 + 0.1 * (1 - l / 255)) * n3(x * 0.45, y * 0.45);
    const m = pool * blot * gran;
    // cold-press paper relief
    const tex = 1 + 0.045 * (n3(x * 0.12 + 50, y * 0.12) + 0.6 * n3(x * 0.35, y * 0.35 + 50));
    d[i] = clamp(r * m * tex); d[i + 1] = clamp(g * m * tex); d[i + 2] = clamp(bl * m * tex); d[i + 3] = 255;
  }
  o.putImageData(img, 0, 0);
  // light pencil underdrawing from the reference edges
  const e = pixels(ref, 1).data, pen = o.getImageData(0, 0, W, H), p = pen.data, rr = mulberry(seed);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = (y * W + x) * 4, L = (q: number) => e[q]! + e[q + 1]! + e[q + 2]!;
    const g = Math.abs(L(i + 4) - L(i - 4)) + Math.abs(L(i + W * 4) - L(i - W * 4));
    if (g > 120 && rr() > 0.25) { const a = Math.min(0.45, (g - 120) / 500); p[i] = p[i]! * (1 - a) + 70 * a; p[i + 1] = p[i + 1]! * (1 - a) + 62 * a; p[i + 2] = p[i + 2]! * (1 - a) + 58 * a; }
  }
  o.putImageData(pen, 0, 0);
  return out;
}

// ---------------------------------------------------------------- pixel art
const PIX_PAL = ['#1a1c2c', '#5d275d', '#b13e53', '#ef7d57', '#ffcd75', '#a7f070', '#38b764', '#257179', '#29366f', '#3b5dc9', '#41a6f6', '#73eff7', '#f4f4f4', '#94b0c2', '#566c86', '#333c57',
  '#6b4a2b', '#a0703c', '#d9a066', '#eec39a', '#4b692f', '#8f974a', '#c9d36b', '#fff6d3'].map(hex);
export function pixelArt(ref: HTMLCanvasElement, scale = 6) {
  const w = W / scale, h = H / scale, src = pixels(ref, 0.5, w, h), s = src.data;
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, t = (bayer[(y % 4) * 4 + (x % 4)]! / 16 - 0.5) * 22;
    const r = s[i]! + t, g = s[i + 1]! + t, b = s[i + 2]! + t;
    let best = PIX_PAL[0]!, bd = 1e9;
    for (const c of PIX_PAL) { const dr = c[0] - r, dg = c[1] - g, db = c[2] - b, dd = 0.3 * dr * dr + 0.59 * dg * dg + 0.11 * db * db; if (dd < bd) { bd = dd; best = c; } }
    s[i] = best[0]; s[i + 1] = best[1]; s[i + 2] = best[2]; s[i + 3] = 255;
  }
  // dark outline where a lighter region meets a much darker one (sprite edges)
  const L = (q: number) => s[q]! + s[q + 1]! + s[q + 2]!, copy = new Uint8ClampedArray(s);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = (y * w + x) * 4;
    if (L(i) > 300 && Math.max(L(i - 4), L(i + 4), L(i - w * 4), L(i + w * 4)) - Math.min(L(i - 4), L(i + 4), L(i - w * 4), L(i + w * 4)) > 330 && Math.min(L(i - 4), L(i + 4), L(i - w * 4), L(i + w * 4)) < 200) {
      copy[i] = 26; copy[i + 1] = 28; copy[i + 2] = 44;
    }
  }
  src.data.set(copy);
  const small = document.createElement('canvas'); small.width = w; small.height = h; small.getContext('2d')!.putImageData(src, 0, 0);
  const out = cv(), o = out.getContext('2d')!; o.imageSmoothingEnabled = false; o.drawImage(small, 0, 0, W, H);
  return out;
}

// ---------------------------------------------------------------- Đông Hồ woodblock
const DH = { paper: hex('#efe2c2'), black: hex('#1d1712'), red: hex('#b5372a'), yellow: hex('#dcae3c'), indigo: hex('#2f4d6e'), green: hex('#4f7a3c'), brown: hex('#7d4e2c'), pink: hex('#d88f86'), sky: hex('#c9d3c2') };
const DH_PAL = Object.values(DH);
export function dongHo(ref: HTMLCanvasElement, seed = 1) {
  const src = pixels(ref, 9), s = src.data, lab = new Uint8Array(W * H), n = makeNoise(seed);
  // flat colour regions: nearest traditional pigment
  for (let p = 0; p < W * H; p++) {
    const i = p * 4, r = s[i]!, g = s[i + 1]!, b = s[i + 2]!;
    let k = 0, bd = 1e9;
    DH_PAL.forEach((c, j) => { const dr = c[0] - r, dg = c[1] - g, db = c[2] - b, dd = dr * dr + dg * dg + db * db + 0.8 * ((dr - dg) * (dr - dg) + (dg - db) * (dg - db)); if (dd < bd) { bd = dd; k = j; } });
    lab[p] = k;
  }
  // clean speckles: majority filter twice
  for (let pass = 0; pass < 3; pass++) {
    const cp = lab.slice();
    for (let y = 4; y < H - 4; y += 1) for (let x = 4; x < W - 4; x++) {
      const cnt = new Uint8Array(DH_PAL.length);
      for (let dy = -4; dy <= 4; dy += 2) for (let dx = -4; dx <= 4; dx += 2) cnt[cp[(y + dy) * W + x + dx]!]!++;
      let m = 0; for (let j = 1; j < cnt.length; j++) if (cnt[j]! > cnt[m]!) m = j;
      lab[y * W + x] = m;
    }
  }
  const out = cv(), o = out.getContext('2d')!, img = o.createImageData(W, H), d = img.data, rr = mulberry(seed + 5);
  // điệp paper: warm cream, fibres and shell sparkle
  for (let p = 0; p < W * H; p++) {
    const x = p % W, y = (p / W) | 0, f = 1 + 0.04 * n(x * 0.05, y * 0.4) + 0.03 * n(x * 0.3, y * 0.3);
    const sp = rr() > 0.996 ? 26 : 0;
    d[p * 4] = clamp(DH.paper[0] * f + sp); d[p * 4 + 1] = clamp(DH.paper[1] * f + sp); d[p * 4 + 2] = clamp(DH.paper[2] * f + sp * 0.8); d[p * 4 + 3] = 255;
  }
  // colour blocks printed slightly off-register, with uneven ink
  const ox = 3, oy = 2;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const sx = Math.min(W - 1, Math.max(0, x - ox)), sy = Math.min(H - 1, Math.max(0, y - oy)), k = lab[sy * W + sx]!;
    const c = DH_PAL[k]!; if (c === DH.paper || c === DH.black) continue;
    const ink = 0.82 + 0.14 * (0.5 + 0.5 * n(x * 0.02 + k * 7, y * 0.02)) + 0.06 * n(x * 0.5, y * 0.5);
    const i = (y * W + x) * 4;
    d[i] = clamp(d[i]! * (1 - ink) + c[0] * ink); d[i + 1] = clamp(d[i + 1]! * (1 - ink) + c[1] * ink); d[i + 2] = clamp(d[i + 2]! * (1 - ink) + c[2] * ink);
  }
  // black key block: region borders (thick, carved) + the black areas themselves
  const black = DH_PAL.indexOf(DH.black);
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    const p = y * W + x, k = lab[p]!;
    let edge = k === black;
    if (!edge) for (const q of [p - 2, p + 2, p - 2 * W, p + 2 * W]) if (lab[q] !== k) { edge = true; break; }
    if (edge) {
      const a = 0.88 + 0.1 * n(x * 0.3, y * 0.3), i = p * 4;
      d[i] = clamp(d[i]! * (1 - a) + DH.black[0] * a); d[i + 1] = clamp(d[i + 1]! * (1 - a) + DH.black[1] * a); d[i + 2] = clamp(d[i + 2]! * (1 - a) + DH.black[2] * a);
    }
  }
  o.putImageData(img, 0, 0);
  return out;
}
