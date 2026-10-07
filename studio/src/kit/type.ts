// 2D type for overlays: words that punch in on their sung start, typed lines, glitchy headline words.
import type { Line, Word } from '../core/lyrics';

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const outExpo = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
export const hash = (...xs: number[]) => { let h = 2166136261; for (const x of xs) { h ^= Math.floor(x * 1000) | 0; h = Math.imul(h, 16777619); } return ((h >>> 0) % 100000) / 100000; };

export function font(c: CanvasRenderingContext2D, px: number, weight = 900, family = 'Archivo', stretch: string = 'expanded') {
  c.font = `${weight} ${px}px "${family}"`;
  (c as any).fontStretch = family === 'Archivo' ? stretch : 'normal';
}

/** A lyric line as big type: each word appears on its start with a scale punch; `hot` words in orange. */
export function slamLine(c: CanvasRenderingContext2D, line: Line, t: number, o: { x: number; y: number; size: number; hot?: RegExp; maxW?: number; alpha?: number }) {
  const words = line.words;
  font(c, o.size);
  const sp = o.size * 0.28;
  const ws = words.map((w) => c.measureText(w.w.toUpperCase()).width);
  let total = ws.reduce((a, b) => a + b, 0) + sp * (ws.length - 1);
  let size = o.size;
  if (o.maxW && total > o.maxW) { size = o.size * o.maxW / total; font(c, size); total = o.maxW; }
  let x = o.x - total / 2;
  words.forEach((w, i) => {
    const wi = ws[i]! * size / o.size;
    if (t >= w.start - 0.02) {
      const k = outExpo(clamp((t - w.start + 0.02) / 0.16));
      const s = 1.3 - 0.3 * k;
      c.save();
      c.globalAlpha = (o.alpha ?? 1) * clamp(k * 3);
      c.translate(x + wi / 2, o.y); c.scale(s, s); c.translate(-(x + wi / 2), -o.y);
      c.fillStyle = o.hot?.test(w.w) ? '#FF6A1A' : '#F2EEE6';
      c.fillText(w.w.toUpperCase(), x, o.y + size * 0.36);
      c.restore();
    }
    x += wi + sp * size / o.size;
  });
}

/** Text typed character by character between t0 and t1, with a blinking block cursor. */
export function typed(c: CanvasRenderingContext2D, text: string, t: number, t0: number, t1: number, x: number, y: number, o: { size?: number; color?: string; align?: CanvasTextAlign } = {}) {
  if (t < t0) return;
  const n = Math.floor(clamp((t - t0) / Math.max(0.01, t1 - t0)) * text.length);
  const s = text.slice(0, n);
  font(c, o.size ?? 44, 600, 'Plex Mono');
  c.textAlign = o.align ?? 'center';
  c.fillStyle = o.color ?? '#F2EEE6';
  c.fillText(s, x, y);
  if (Math.floor(t * 4) % 2 === 0) {
    const w = c.measureText(s).width, x0 = (o.align ?? 'center') === 'center' ? x + w / 2 : x + w;
    c.fillStyle = '#FF6A1A'; c.fillRect(x0 + 6, y - (o.size ?? 44) * 0.8, (o.size ?? 44) * 0.5, (o.size ?? 44) * 0.95);
  }
  c.textAlign = 'left';
}

/** A headline word with slice-glitch: rows of the word shift sideways with RGB split while `amount` > 0. */
export function glitchWord(c: CanvasRenderingContext2D, word: string, x: number, y: number, size: number, amount: number, frame: number, color = '#F2EEE6') {
  font(c, size);
  c.textAlign = 'center';
  if (amount < 0.02) { c.fillStyle = color; c.fillText(word, x, y); c.textAlign = 'left'; return; }
  const h = size * 1.1, rows = 9;
  for (let r = 0; r < rows; r++) {
    const y0 = y - size * 0.85 + (r * h) / rows;
    const off = (hash(frame, r) - 0.5) * size * 0.9 * amount;
    c.save();
    c.beginPath(); c.rect(0, y0, 1920, h / rows + 1); c.clip();
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = 'rgba(255,60,40,0.9)'; c.fillText(word, x + off + 6 * amount, y);
    c.fillStyle = 'rgba(60,200,255,0.9)'; c.fillText(word, x + off - 6 * amount, y);
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = color; c.globalAlpha = 0.85; c.fillText(word, x + off, y);
    c.restore();
  }
  c.textAlign = 'left';
}
