// Neon pictures for "Tinh tinh tính lương về" — world units, centred on the drawing's origin (≈ ±4.4 × ±2.7).
// Colour index c: 0 = scene main, 1 = accent, 2 = third (see palettes in plates.ts).
import { arc, bez, rrect, strokeText, type P2, type Stroke } from '../../src/kit/neondraw';

const TAU = Math.PI * 2;
const S = (pts: P2[], c = 0): Stroke => ({ pts, c });

/** Wall clock at 8:30 (hands drawn last). */
export function clock(): Stroke[] {
  const out: Stroke[] = [S(arc(0, 0, 2.6, 2.6, Math.PI / 2, Math.PI / 2 - TAU, 96))];
  for (let i = 0; i < 12; i++) {
    const a = Math.PI / 2 - (i / 12) * TAU, r0 = i % 3 === 0 ? 1.95 : 2.15;
    out.push(S([[Math.cos(a) * r0, Math.sin(a) * r0], [Math.cos(a) * 2.35, Math.sin(a) * 2.35]], 1));
  }
  const hour = Math.PI / 2 - (8.5 / 12) * TAU, min = Math.PI / 2 - 0.5 * TAU;
  out.push(S([[0, 0], [Math.cos(hour) * 1.3, Math.sin(hour) * 1.3]], 2));
  out.push(S([[0, 0], [Math.cos(min) * 1.9, Math.sin(min) * 1.9]], 2));
  out.push(S(arc(0, 0, 0.12, 0.12, 0, TAU, 12), 2));
  return out;
}

/** Laptop with a prompt on screen and a big ENTER key on the deck. */
export function laptop(): Stroke[] {
  return [
    S(rrect(-3.0, -0.6, 3.0, 2.8, 0.18)),
    S(rrect(-2.7, -0.3, 2.7, 2.5, 0.08), 1),
    S([[-3.0, -0.75], [3.0, -0.75], [3.9, -2.4], [-3.9, -2.4], [-3.0, -0.75]]),
    S(strokeText('>', -2.05, 1.7, 0.55, 2)[0]!.pts, 2),
    S([[-1.55, 1.42], [-0.35, 1.42]], 2),
    S([[-2.3, 0.9], [1.6, 0.9]], 1), S([[-2.3, 0.4], [0.8, 0.4]], 1),
    // ENTER key (L shape) on the right of the deck
    S([[1.7, -1.0], [2.9, -1.0], [3.25, -2.15], [1.75, -2.15], [1.6, -1.6], [1.25, -1.6], [1.38, -1.0], [1.7, -1.0]], 2),
    S([[-2.9, -1.4], [0.9, -1.4]], 1), S([[-3.15, -1.85], [0.7, -1.85]], 1),
  ];
}

/** Calendar page with pay-day circled, and a paper plane (the soul) flying to it. */
export function calendar(): Stroke[] {
  const out: Stroke[] = [S(rrect(-1.6, -2.4, 3.6, 2.2, 0.2)), S([[-1.6, 1.3], [3.6, 1.3]])];
  for (const x of [-0.6, 2.6]) out.push(S([[x, 1.9], [x, 2.6]], 1));
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) {
    if (r === 3 && c === 4) continue;
    const x = -1.05 + c * 0.88, y = 0.75 - r * 0.8;
    out.push(S(arc(x, y, 0.08, 0.08, 0, TAU, 10), 1));
  }
  out.push(...strokeText('25', -1.05 + 4 * 0.88, 0.75 - 3 * 0.8, 0.5, 2));
  out.push(S(arc(-1.05 + 4 * 0.88, 0.75 - 3 * 0.8, 0.62, 0.48, 0.2, 0.2 + TAU * 1.08, 40), 2));
  // paper plane + its dashed flight path
  out.push(S([[-4.4, -0.2], [-2.6, 0.55], [-3.55, -0.75], [-4.4, -0.2]], 1), S([[-3.55, -0.75], [-3.4, -0.1], [-2.6, 0.55]], 1));
  const path = bez([-2.4, 0.7], [-1.4, 1.6], [0.3, -2.8], [1.75, -1.75], 30);
  for (let i = 0; i + 2 < path.length; i += 4) out.push(S([path[i]!, path[i + 2]!], 2));
  return out;
}

/** Chip with "AI" (or "SI") on it. */
export function chip(word: 'AI' | 'SI'): Stroke[] {
  const out: Stroke[] = [S(rrect(-2.3, -2.3, 2.3, 2.3, 0.3))];
  for (let i = 0; i < 5; i++) {
    const k = -1.6 + i * 0.8;
    out.push(S([[k, 2.3], [k, 2.9]], 1), S([[k, -2.3], [k, -2.9]], 1), S([[2.3, k], [2.9, k]], 1), S([[-2.3, k], [-2.9, k]], 1));
  }
  out.push(S(rrect(-1.7, -1.7, 1.7, 1.7, 0.12), 1));
  out.push(...strokeText(word, 0, 0, 1.9, 2, 0.35));
  return out;
}

/** Phone with a notification bubble popping out, a bell, and +₫ on the screen. */
export function phone(): Stroke[] {
  return [
    S(rrect(-1.5, -2.8, 1.5, 2.8, 0.35)),
    S([[-0.35, 2.45], [0.35, 2.45]], 1),
    S(rrect(-3.6, 0.95, 2.9, 2.05, 0.3), 1),
    // bell
    S([...bez([-3.25, 1.18], [-3.05, 1.3], [-3.15, 1.85], [-2.85, 1.86], 12), ...bez([-2.85, 1.86], [-2.55, 1.85], [-2.65, 1.3], [-2.45, 1.18], 12), [-3.25, 1.18]], 2),
    S(arc(-2.85, 1.1, 0.08, 0.08, 0, TAU, 10), 2),
    S([[-2.1, 1.7], [2.3, 1.7]], 1), S([[-2.1, 1.3], [1.0, 1.3]], 1),
    ...strokeText('+₫', 0, -0.6, 1.5, 2),
    S([[-0.5, -2.45], [0.5, -2.45]], 1),
  ];
}

/** Coin stack + big ₫ coin with rays. */
export function coins(): Stroke[] {
  const out: Stroke[] = [];
  for (let i = 0; i < 4; i++) out.push(S(arc(-2.6, -2.1 + i * 0.42, 1.25, 0.32, 0, TAU, 40), 1));
  out.push(S(arc(1.2, 0, 2.3, 2.3, Math.PI / 2, Math.PI / 2 + TAU, 80)), S(arc(1.2, 0, 1.9, 1.9, 0, TAU, 64), 1));
  out.push(...strokeText('₫', 1.2, 0.05, 1.9, 2));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU + 0.15;
    out.push(S([[1.2 + Math.cos(a) * 2.6, Math.sin(a) * 2.6], [1.2 + Math.cos(a) * 3.1, Math.sin(a) * 3.1]], 2));
  }
  return out;
}

/** SI robot head next to a magnifier reading lines of code — "who reads every line?". */
export function robot(): Stroke[] {
  return [
    S(rrect(-4.3, -1.8, -0.9, 1.4, 0.35)),
    S([[-2.6, 1.4], [-2.6, 2.1]], 1), S(arc(-2.6, 2.3, 0.2, 0.2, 0, TAU, 14), 2),
    S(arc(-3.4, 0.25, 0.38, 0.38, 0, TAU, 24), 2), S(arc(-1.8, 0.25, 0.38, 0.38, 0, TAU, 24), 2),
    S([[-3.5, -1.05], [-1.7, -1.05]], 1), ...[-3.05, -2.6, -2.15].map((x) => S([[x, -0.85], [x, -1.25]], 1)),
    S([[-4.3, -0.1], [-4.6, -0.1], [-4.6, 0.6], [-4.3, 0.6]], 1), S([[-0.9, -0.1], [-0.6, -0.1], [-0.6, 0.6], [-0.9, 0.6]], 1),
    ...strokeText('</>', 2.3, 1.85, 0.7, 2),
    ...[1.1, 0.5, -0.1, -0.7, -1.3].map((y, i) => S([[0.4, y], [0.4 + [3.6, 2.6, 3.9, 2.0, 3.1][i]!, y]], 1)),
    S(arc(2.6, -0.1, 1.05, 1.05, Math.PI * 1.75, Math.PI * 1.75 + TAU, 48)),
    S([[2.6 + 0.742, -0.1 - 0.742], [4.3, -2.55]]),
  ];
}

/** House with a roof, door, window and a chain of instalment boxes. */
export function house(): Stroke[] {
  return [
    S([[-2.6, -2.4], [-2.6, 0.6], [0, 2.7], [2.6, 0.6], [2.6, -2.4], [-2.6, -2.4]]),
    S([[1.4, 1.6], [1.4, 2.4], [1.9, 2.4], [1.9, 1.2]], 1),
    S(rrect(-0.6, -2.4, 0.6, -0.6, 0), 1), S(arc(0.35, -1.5, 0.06, 0.06, 0, TAU, 8), 2),
    S(rrect(-2.1, -0.9, -1.0, 0.2, 0), 2), S([[-1.55, -0.9], [-1.55, 0.2]], 2), S([[-2.1, -0.35], [-1.0, -0.35]], 2),
    ...strokeText('₫', 3.7, 1.6, 0.6, 2), ...strokeText('₫', 3.9, 0.4, 0.6, 2), ...strokeText('₫', 3.6, -0.8, 0.6, 2),
  ];
}

/** Account balance 100.000₫ with a falling arrow. */
export function balance(): Stroke[] {
  return [
    S(rrect(-4.4, -1.5, 4.4, 1.5, 0.35)),
    ...strokeText('100.000₫', 0, 0, 1.5, 2, 0.24),
    S([[3.8, 2.6], [3.8, 1.8]], 1), S([[3.45, 2.15], [3.8, 1.8], [4.15, 2.15]], 1),
    S([[-4.0, -2.2], [-1.0, -2.2]], 1), S([[-4.0, -2.65], [-2.2, -2.65]], 1),
  ];
}

/** "29" days left on a torn calendar page. */
export function days29(): Stroke[] {
  return [
    S(rrect(-2.2, -2.5, 2.2, 2.2, 0.2)), S([[-2.2, 1.3], [2.2, 1.3]]),
    S([[-1.1, 1.9], [-1.1, 2.6]], 1), S([[1.1, 1.9], [1.1, 2.6]], 1),
    ...strokeText('29', 0, -0.55, 2.6, 2, 0.3),
  ];
}


/** Stock chart: axes, grid, candles and the closing line — notes draw it word by word. */
const CLOSES = [-1.9, -1.55, -1.95, -1.3, -1.5, -0.9, -1.15, -0.45, -0.1];
export function chart(): Stroke[] {
  const out: Stroke[] = [S([[-4.4, 2.7], [-4.4, -2.6], [4.4, -2.6]], 1)];
  for (const y of [-1.5, -0.4, 0.7, 1.8]) for (let x = -4.2; x < 4.2; x += 1.2) out.push(S([[x, y], [x + 0.15, y]], 1));
  let prev = -2.2;
  CLOSES.forEach((cl, i) => {
    const x = -3.8 + i * 0.85, up = cl > prev, lo = Math.min(prev, cl), hi = Math.max(prev, cl);
    out.push(S([[x, lo - 0.3], [x, hi + 0.3]], up ? 0 : 2));
    out.push(S(rrect(x - 0.2, lo, x + 0.2, hi, 0), up ? 0 : 2));
    if (i > 0) out.push(S([[x - 0.85, CLOSES[i - 1]!], [x, cl]], 0));
    prev = cl;
  });
  return out;
}

/** The SUPER LƯƠNG move: from the last close straight up out of frame, with an arrow head. */
export function rocket(): Stroke[] {
  const x0 = -3.8 + 8 * 0.85, y0 = CLOSES[8]!;
  return [
    S([...bez([x0, y0], [x0 + 0.5, y0 + 0.2], [x0 + 0.75, y0 + 1.6], [x0 + 0.8, 4], 16), [x0 + 0.8, 9.5]], 0),
    S([[x0 + 0.2, 8.8], [x0 + 0.8, 9.6], [x0 + 1.4, 8.8]], 0),
  ];
}

export const SHAPES: Record<string, () => Stroke[]> = {
  clock, laptop, calendar, ai: () => chip('AI'), si: () => chip('SI'), phone, coins, robot, house, balance, days29, chart, rocket,
};
