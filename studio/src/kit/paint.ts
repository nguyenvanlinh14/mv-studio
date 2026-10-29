// Oil painting from a 2D reference image: layered brush strokes (coarse → fine, Hertzmann-style), each stroke a
// curved path along the form (or along a custom flow field) made of individual bristles with their own tint, a lit
// impasto ridge, a toned ground showing through the gaps, and canvas weave on top. Deterministic for a seed.
const W = 1920, H = 1080;
let weaveCanvas: HTMLCanvasElement | null = null;

export const mulberry = (a: number) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/** smooth 2D value noise in [-1, 1] */
export function makeNoise(seed: number) {
  const r = mulberry(seed), P = new Float32Array(256 * 256).map(() => r() * 2 - 1);
  const at = (i: number, j: number) => P[((j & 255) << 8) | (i & 255)]!;
  return (x: number, y: number) => {
    const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    return (at(i, j) * (1 - u) + at(i + 1, j) * u) * (1 - v) + (at(i, j + 1) * (1 - u) + at(i + 1, j + 1) * u) * v;
  };
}

export interface PaintOpts {
  seed?: number;
  /** brush radii, coarse to fine (px at 1080p) */
  brushes?: number[];
  /** toned ground colour that shows between strokes */
  ground?: string;
  /** optional flow angle override (radians) for a pixel, e.g. swirling sky; return null to follow the form */
  flow?: (x: number, y: number) => number | null;
  /** fine layers only repaint where the canvas is this far (0..765) from the reference */
  threshold?: number;
  /** colour jitter per bristle, 0..1 */
  jitter?: number;
  /** stroke length multiplier */
  length?: number;
}

function blurred(ref: HTMLCanvasElement, r: number) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true })!;
  x.filter = r > 0.5 ? `blur(${r}px)` : 'none'; x.drawImage(ref, 0, 0);
  return x.getImageData(0, 0, W, H).data;
}

/** a painter's palette: cool violet-blue shadows, warm lights, a little more chroma */
function art([r, g, b]: readonly [number, number, number]): [number, number, number] {
  const l = 0.3 * r + 0.59 * g + 0.11 * b;
  let R = l + (r - l) * 1.18, G = l + (g - l) * 1.18, B = l + (b - l) * 1.18;
  const sh = Math.max(0, 1 - l / 95) * 0.28, hi = Math.max(0, (l - 165) / 90) * 0.22;
  R += (55 - R) * sh + (255 - R) * hi; G += (48 - G) * sh + (226 - G) * hi; B += (120 - B) * sh + (160 - B) * hi;
  return [Math.max(0, Math.min(255, R)), Math.max(0, Math.min(255, G)), Math.max(0, Math.min(255, B))];
}

export function paint(ref: HTMLCanvasElement, o: PaintOpts = {}): HTMLCanvasElement {
  const rnd = mulberry(o.seed ?? 1), noise = makeNoise((o.seed ?? 1) + 7);
  const brushes = o.brushes ?? [40, 20, 10, 5, 2.6];
  const jit = o.jitter ?? 0.5, lenK = o.length ?? 1.4;
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  const c = out.getContext('2d', { willReadFrequently: true })!;
  c.fillStyle = o.ground ?? '#7a4e2e'; c.fillRect(0, 0, W, H);

  // orientation field from the luminance gradient of a softened quarter-res reference
  const q = 4, gw = W / q, gh = H / q;
  const small = document.createElement('canvas'); small.width = gw; small.height = gh;
  const sx = small.getContext('2d', { willReadFrequently: true })!; sx.filter = 'blur(2px)'; sx.drawImage(ref, 0, 0, gw, gh);
  const sd = sx.getImageData(0, 0, gw, gh).data, L = new Float32Array(gw * gh);
  for (let i = 0; i < gw * gh; i++) L[i] = 0.3 * sd[i * 4]! + 0.59 * sd[i * 4 + 1]! + 0.11 * sd[i * 4 + 2]!;
  const ang = new Float32Array(gw * gh), mag = new Float32Array(gw * gh);
  for (let y = 1; y < gh - 1; y++) for (let x = 1; x < gw - 1; x++) {
    const l = (dx: number, dy: number) => L[(y + dy) * gw + x + dx]!;
    const gx = l(1, -1) + 2 * l(1, 0) + l(1, 1) - l(-1, -1) - 2 * l(-1, 0) - l(-1, 1);
    const gy = l(-1, 1) + 2 * l(0, 1) + l(1, 1) - l(-1, -1) - 2 * l(0, -1) - l(1, -1);
    ang[y * gw + x] = Math.atan2(gy, gx) + Math.PI / 2; mag[y * gw + x] = Math.hypot(gx, gy);
  }
  const dirAt = (x: number, y: number) => {
    const f = o.flow?.(x, y);
    if (f !== null && f !== undefined) return f;
    const i = Math.min(gh - 1, Math.max(0, (y / q) | 0)) * gw + Math.min(gw - 1, Math.max(0, (x / q) | 0));
    const free = noise(x * 0.004, y * 0.004) * 2.2 + 0.4; // calm, slightly diagonal hand where the form is flat
    const k = Math.min(1, mag[i]! / 60);
    // blend angles via vectors (directions are 180°-symmetric → double angle)
    const ax = Math.cos(2 * ang[i]!) * k + Math.cos(2 * free) * (1 - k), ay = Math.sin(2 * ang[i]!) * k + Math.sin(2 * free) * (1 - k);
    return Math.atan2(ay, ax) / 2;
  };

  const th = o.threshold ?? 60;
  brushes.forEach((r, layer) => {
    const R = blurred(ref, r * 0.5);
    const cur = layer ? c.getImageData(0, 0, W, H).data : null;
    const px = (d: Uint8ClampedArray, x: number, y: number) => { const i = ((Math.min(H - 1, Math.max(0, y | 0)) * W) + Math.min(W - 1, Math.max(0, x | 0))) * 4; return [d[i]!, d[i + 1]!, d[i + 2]!] as const; };
    const sp = r * 0.85, pts: [number, number][] = [];
    for (let y = -sp; y < H + sp; y += sp) for (let x = -sp; x < W + sp; x += sp) pts.push([x + (rnd() - 0.5) * sp, y + (rnd() - 0.5) * sp]);
    for (let i = pts.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [pts[i], pts[j]] = [pts[j]!, pts[i]!]; }
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (let idx = 0; idx < pts.length; idx++) {
      const [x0, y0] = pts[idx]!, sr = mulberry((o.seed ?? 1) * 7919 + layer * 1000003 + idx * 97);
      const col = art(px(R, x0, y0));
      if (cur) {
        let e = 0; for (const [dx, dy] of [[0, 0], [-r / 2, 0], [r / 2, 0], [0, -r / 2], [0, r / 2]] as const) { const a = px(cur, x0 + dx, y0 + dy), b = px(R, x0 + dx, y0 + dy); e += Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]); }
        if (e / 5 < th * (0.6 + 0.8 * sr())) continue;
      }
      // trace the stroke along the field, stop at a colour edge
      const path: [number, number][] = [[x0, y0]];
      let x = x0, y = y0, pa = dirAt(x0, y0) + (sr() < 0.5 ? 0 : Math.PI);
      const maxN = Math.round((2 + sr() * 4) * lenK * (r > 10 ? 1 : 1.3));
      for (let s = 0; s < maxN; s++) {
        let a = dirAt(x, y);
        if (Math.cos(a - pa) < 0) a += Math.PI;
        x += Math.cos(a) * r * 0.7; y += Math.sin(a) * r * 0.7; pa = a;
        const k = px(R, x, y);
        if (s > 0 && Math.abs(k[0] - col[0]) + Math.abs(k[1] - col[1]) + Math.abs(k[2] - col[2]) > 64) break;
        path.push([x, y]);
      }
      if (path.length < 2) { const a = pa; path.push([x0 + Math.cos(a) * r * 0.6, y0 + Math.sin(a) * r * 0.6]); }
      // bristles
      const n = Math.max(3, Math.min(12, Math.round(r / 1.6))), bw = (r * 1.7) / n;
      const lum = (col[0] + col[1] + col[2]) / 3;
      const tone = (sr() - 0.5) * 26 * jit, warm = (sr() - 0.5) * 18 * jit;
      for (let b = 0; b < n; b++) {
        const off = (b / (n - 1) - 0.5) * r * 1.5 * (0.85 + 0.3 * sr());
        const bt = tone + (sr() - 0.5) * 22 * jit;
        const rr = col[0] + bt + warm, gg = col[1] + bt, bb = col[2] + bt - warm;
        c.strokeStyle = `rgba(${rr | 0},${gg | 0},${bb | 0},${0.72 + 0.28 * sr()})`;
        c.lineWidth = bw * (0.9 + 0.9 * sr());
        const cut = Math.max(2, path.length - (sr() < 0.35 ? 1 : 0));
        c.beginPath();
        for (let k = 0; k < cut; k++) {
          const [ax, ay] = path[k]!, [bx2, by2] = path[Math.min(path.length - 1, k + 1)]!, [cx, cy] = path[Math.max(0, k - 1)]!;
          const tx = bx2 - cx, ty = by2 - cy, tl = Math.hypot(tx, ty) || 1;
          const taper = k === 0 || k === cut - 1 ? 0.75 : 1;
          const X = ax - (ty / tl) * off * taper, Y = ay + (tx / tl) * off * taper;
          k ? c.lineTo(X, Y) : c.moveTo(X, Y);
        }
        c.stroke();
      }
      // impasto: a lit ridge on the upper-left side, a shadow on the lower-right
      if (r > 2) {
        const ridge = (side: number, style: string, w: number) => {
          c.strokeStyle = style; c.lineWidth = w; c.beginPath();
          path.forEach(([ax, ay], k) => {
            const [bx2, by2] = path[Math.min(path.length - 1, k + 1)]!, [cx, cy] = path[Math.max(0, k - 1)]!;
            const tx = bx2 - cx, ty = by2 - cy, tl = Math.hypot(tx, ty) || 1;
            let nx = -ty / tl, ny = tx / tl; if (nx + ny > 0) { nx = -nx; ny = -ny; } // normal toward the light (upper-left)
            const X = ax + nx * r * 0.62 * side, Y = ay + ny * r * 0.62 * side;
            k ? c.lineTo(X, Y) : c.moveTo(X, Y);
          });
          c.stroke();
        };
        const hi = Math.min(255, lum + 70);
        ridge(1, `rgba(${hi},${hi},${Math.max(0, hi - 12)},${0.16 + 0.1 * sr()})`, Math.max(1, r * 0.16));
        ridge(-1, `rgba(20,12,6,${0.14 + 0.08 * sr()})`, Math.max(1, r * 0.2));
      }
    }
  });

  // canvas weave + a light varnish
  if (!weaveCanvas) {
  const weave = c.createImageData(W, H), wd = weave.data, wr = mulberry(99);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const v = 128 + 26 * Math.sin(x * 1.9) * Math.sin(y * 0.35) + 26 * Math.sin(y * 1.9) * Math.sin(x * 0.35) + (wr() - 0.5) * 30;
    wd[i] = wd[i + 1] = wd[i + 2] = v; wd[i + 3] = 255;
  }
  weaveCanvas = document.createElement('canvas'); weaveCanvas.width = W; weaveCanvas.height = H; weaveCanvas.getContext('2d')!.putImageData(weave, 0, 0);
  }
  const wc = weaveCanvas;
  c.globalCompositeOperation = 'overlay'; c.globalAlpha = 0.16; c.drawImage(wc, 0, 0);
  c.globalCompositeOperation = 'soft-light'; c.globalAlpha = 0.25; c.fillStyle = '#c89a5a'; c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  const vg = c.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(25,14,6,0.45)');
  c.fillStyle = vg; c.fillRect(0, 0, W, H);
  return out;
}

/**
 * The same painter, stroke by stroke, for animation: candidates are visited in a snake sweep (row by row, like a
 * painter's hand) coarse layer to fine; `advanceTo(n)` paints until n strokes have actually been laid down, keeping
 * the canvas between calls. Pass `onto` to keep painting over an existing picture (every layer then only repaints
 * where the canvas differs from the new reference). `compose()` adds canvas weave, varnish and vignette.
 */
export class OilPainter {
  canvas = document.createElement('canvas');
  c: CanvasRenderingContext2D;
  painted = 0;
  /** strokes laid per layer (coarse → fine) */
  layerPainted: number[] = [];
  /** recent stroke ends (for a brush cursor): x, y, colour */
  recent: { x: number; y: number; col: [number, number, number]; r: number }[] = [];
  private layers: { r: number; R: Uint8ClampedArray; pts: [number, number][] }[] = [];
  private li = 0; private idx = 0; private cur: Uint8ClampedArray | null = null;
  private dirAt: (x: number, y: number) => number;
  private o: PaintOpts & { refine?: boolean };
  constructor(ref: HTMLCanvasElement, o: PaintOpts = {}, onto?: HTMLCanvasElement) {
    this.o = { ...o, refine: !!onto };
    this.canvas.width = W; this.canvas.height = H;
    this.c = this.canvas.getContext('2d', { willReadFrequently: true })!;
    if (onto) this.c.drawImage(onto, 0, 0); else { this.c.fillStyle = o.ground ?? '#7a4e2e'; this.c.fillRect(0, 0, W, H); }
    const rnd = mulberry(o.seed ?? 1), noise = makeNoise((o.seed ?? 1) + 7);
    // orientation field (as in paint())
    const q = 4, gw = W / q, gh = H / q;
    const small = document.createElement('canvas'); small.width = gw; small.height = gh;
    const sx = small.getContext('2d', { willReadFrequently: true })!; sx.filter = 'blur(2px)'; sx.drawImage(ref, 0, 0, gw, gh);
    const sd = sx.getImageData(0, 0, gw, gh).data, L = new Float32Array(gw * gh);
    for (let i = 0; i < gw * gh; i++) L[i] = 0.3 * sd[i * 4]! + 0.59 * sd[i * 4 + 1]! + 0.11 * sd[i * 4 + 2]!;
    const ang = new Float32Array(gw * gh), mag = new Float32Array(gw * gh);
    for (let y = 1; y < gh - 1; y++) for (let x = 1; x < gw - 1; x++) {
      const l = (dx: number, dy: number) => L[(y + dy) * gw + x + dx]!;
      const gx = l(1, -1) + 2 * l(1, 0) + l(1, 1) - l(-1, -1) - 2 * l(-1, 0) - l(-1, 1);
      const gy = l(-1, 1) + 2 * l(0, 1) + l(1, 1) - l(-1, -1) - 2 * l(0, -1) - l(1, -1);
      ang[y * gw + x] = Math.atan2(gy, gx) + Math.PI / 2; mag[y * gw + x] = Math.hypot(gx, gy);
    }
    this.dirAt = (x, y) => {
      const f = o.flow?.(x, y); if (f !== null && f !== undefined) return f;
      const i = Math.min(gh - 1, Math.max(0, (y / q) | 0)) * gw + Math.min(gw - 1, Math.max(0, (x / q) | 0));
      const free = noise(x * 0.004, y * 0.004) * 2.2 + 0.4, k = Math.min(1, mag[i]! / 60);
      const ax = Math.cos(2 * ang[i]!) * k + Math.cos(2 * free) * (1 - k), ay = Math.sin(2 * ang[i]!) * k + Math.sin(2 * free) * (1 - k);
      return Math.atan2(ay, ax) / 2;
    };
    for (const r of o.brushes ?? [40, 20, 10, 5, 2.6]) {
      const sp = r * 0.85, rows: [number, number][][] = [];
      for (let y = -sp, row = 0; y < H + sp; y += sp, row++) { const line: [number, number][] = []; for (let x = -sp; x < W + sp; x += sp) line.push([x + (rnd() - 0.5) * sp, y + (rnd() - 0.5) * sp]); if (row % 2) line.reverse(); rows.push(line); }
      this.layers.push({ r, R: blurred(ref, r * 0.5), pts: rows.flat() });
    }
  }
  get finished() { return this.li >= this.layers.length; }
  /** paint until `n` strokes have been laid down (or the picture is finished) */
  advanceTo(n: number) {
    const c = this.c, o = this.o, th = o.threshold ?? 60, jit = o.jitter ?? 0.5, lenK = o.length ?? 1.4;
    const px = (d: Uint8ClampedArray, x: number, y: number) => { const i = ((Math.min(H - 1, Math.max(0, y | 0)) * W) + Math.min(W - 1, Math.max(0, x | 0))) * 4; return [d[i]!, d[i + 1]!, d[i + 2]!] as const; };
    c.lineCap = 'round'; c.lineJoin = 'round';
    while (this.painted < n && !this.finished) {
      const layer = this.layers[this.li]!, { r, R } = layer;
      if (this.idx === 0) this.cur = this.li || o.refine ? c.getImageData(0, 0, W, H).data : null;
      if (this.idx >= layer.pts.length) { this.li++; this.idx = 0; continue; }
      const idx = this.idx++, [x0, y0] = layer.pts[idx]!, sr = mulberry((o.seed ?? 1) * 7919 + this.li * 1000003 + idx * 97);
      const col = art(px(R, x0, y0));
      if (this.cur) {
        let e = 0; for (const [dx, dy] of [[0, 0], [-r / 2, 0], [r / 2, 0], [0, -r / 2], [0, r / 2]] as const) { const a = px(this.cur, x0 + dx, y0 + dy), b = px(R, x0 + dx, y0 + dy); e += Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]); }
        if (e / 5 < th * (0.6 + 0.8 * sr())) continue;
      }
      const path: [number, number][] = [[x0, y0]];
      let x = x0, y = y0, pa = this.dirAt(x0, y0) + (sr() < 0.5 ? 0 : Math.PI);
      const maxN = Math.round((2 + sr() * 4) * lenK * (r > 10 ? 1 : 1.3));
      for (let s = 0; s < maxN; s++) {
        let a = this.dirAt(x, y); if (Math.cos(a - pa) < 0) a += Math.PI;
        x += Math.cos(a) * r * 0.7; y += Math.sin(a) * r * 0.7; pa = a;
        const k = px(R, x, y); if (s > 0 && Math.abs(k[0] - col[0]) + Math.abs(k[1] - col[1]) + Math.abs(k[2] - col[2]) > 64) break;
        path.push([x, y]);
      }
      if (path.length < 2) path.push([x0 + Math.cos(pa) * r * 0.6, y0 + Math.sin(pa) * r * 0.6]);
      const nb = Math.max(3, Math.min(12, Math.round(r / 1.6))), bw = (r * 1.7) / nb, lum = (col[0] + col[1] + col[2]) / 3;
      const tone = (sr() - 0.5) * 26 * jit, warm = (sr() - 0.5) * 18 * jit;
      for (let b = 0; b < nb; b++) {
        const off = (b / (nb - 1) - 0.5) * r * 1.5 * (0.85 + 0.3 * sr()), bt = tone + (sr() - 0.5) * 22 * jit;
        c.strokeStyle = `rgba(${(col[0] + bt + warm) | 0},${(col[1] + bt) | 0},${(col[2] + bt - warm) | 0},${0.72 + 0.28 * sr()})`;
        c.lineWidth = bw * (0.9 + 0.9 * sr());
        const cut = Math.max(2, path.length - (sr() < 0.35 ? 1 : 0));
        c.beginPath();
        for (let k = 0; k < cut; k++) {
          const [ax, ay] = path[k]!, [bx2, by2] = path[Math.min(path.length - 1, k + 1)]!, [cx, cy] = path[Math.max(0, k - 1)]!;
          const tx = bx2 - cx, ty = by2 - cy, tl = Math.hypot(tx, ty) || 1, taper = k === 0 || k === cut - 1 ? 0.75 : 1;
          const X = ax - (ty / tl) * off * taper, Y = ay + (tx / tl) * off * taper; k ? c.lineTo(X, Y) : c.moveTo(X, Y);
        }
        c.stroke();
      }
      if (r > 2) {
        const ridge = (side: number, style: string, w: number) => {
          c.strokeStyle = style; c.lineWidth = w; c.beginPath();
          path.forEach(([ax, ay], k) => {
            const [bx2, by2] = path[Math.min(path.length - 1, k + 1)]!, [cx, cy] = path[Math.max(0, k - 1)]!;
            const tx = bx2 - cx, ty = by2 - cy, tl = Math.hypot(tx, ty) || 1; let nx = -ty / tl, ny = tx / tl; if (nx + ny > 0) { nx = -nx; ny = -ny; }
            const X = ax + nx * r * 0.62 * side, Y = ay + ny * r * 0.62 * side; k ? c.lineTo(X, Y) : c.moveTo(X, Y);
          });
          c.stroke();
        };
        const hi = Math.min(255, lum + 70);
        ridge(1, `rgba(${hi},${hi},${Math.max(0, hi - 12)},${0.16 + 0.1 * sr()})`, Math.max(1, r * 0.16));
        ridge(-1, `rgba(20,12,6,${0.14 + 0.08 * sr()})`, Math.max(1, r * 0.2));
      }
      this.layerPainted[this.li] = (this.layerPainted[this.li] ?? 0) + 1;
      const end = path[path.length - 1]!;
      this.recent.push({ x: end[0], y: end[1], col, r }); if (this.recent.length > 24) this.recent.shift();
      this.painted++;
    }
  }
  /** the painting with canvas weave, varnish and vignette, drawn onto c */
  compose(dst: CanvasRenderingContext2D) {
    if (!weaveCanvas) {
      const weave = this.c.createImageData(W, H), wd = weave.data, wr = mulberry(99);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4, v = 128 + 26 * Math.sin(x * 1.9) * Math.sin(y * 0.35) + 26 * Math.sin(y * 1.9) * Math.sin(x * 0.35) + (wr() - 0.5) * 30; wd[i] = wd[i + 1] = wd[i + 2] = v; wd[i + 3] = 255; }
      weaveCanvas = document.createElement('canvas'); weaveCanvas.width = W; weaveCanvas.height = H; weaveCanvas.getContext('2d')!.putImageData(weave, 0, 0);
    }
    dst.drawImage(this.canvas, 0, 0);
    dst.globalCompositeOperation = 'overlay'; dst.globalAlpha = 0.16; dst.drawImage(weaveCanvas, 0, 0);
    dst.globalCompositeOperation = 'soft-light'; dst.globalAlpha = 0.25; dst.fillStyle = '#c89a5a'; dst.fillRect(0, 0, W, H);
    dst.globalCompositeOperation = 'source-over'; dst.globalAlpha = 1;
    const vg = dst.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(25,14,6,0.45)');
    dst.fillStyle = vg; dst.fillRect(0, 0, W, H);
  }
}
