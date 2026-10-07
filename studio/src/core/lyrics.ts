// Word-timed lyrics (lyrics.json from analysis/ctc_full.py).

export interface Word { w: string; start: number; end: number; line: number; index: number }
export interface Line { i: number; text: string; section?: string; start: number; end: number; words: Word[] }

export class Lyrics {
  readonly lines: Line[];
  readonly words: Word[];

  constructor(j: { lines: { text: string; section?: string; start: number; end: number; words: { w: string; start: number; end: number }[] }[] }) {
    this.lines = j.lines.map((l, i) => ({
      i, text: l.text.normalize('NFC'), section: l.section, start: l.start, end: l.end,
      words: l.words.map((w, k) => ({ w: w.w.normalize('NFC'), start: w.start, end: w.end, line: i, index: k })),
    }));
    this.words = this.lines.flatMap((l) => l.words);
  }

  static empty() { return new Lyrics({ lines: [] }); }

  /** Lines whose text contains q (case-insensitive). */
  find(q: string): Line[] {
    const k = q.normalize('NFC').toLowerCase();
    return this.lines.filter((l) => l.text.toLowerCase().includes(k));
  }
  get(q: string, nth = 0): Line {
    const l = this.find(q)[nth];
    if (!l) throw new Error(`lyric line not found: "${q}" #${nth}`);
    return l;
  }
  linesIn(t0: number, t1: number): Line[] { return this.lines.filter((l) => l.start >= t0 - 0.05 && l.start < t1); }
  lastWord(t: number): Word | null {
    let best: Word | null = null;
    for (const w of this.words) if (w.start <= t) best = w;
    return best;
  }

  /** 0..1 progress through a word while it is sung. */
  static wordProgress(w: Word, t: number) { return t <= w.start ? 0 : t >= w.end ? 1 : (t - w.start) / Math.max(1e-3, w.end - w.start); }
  /** Characters of the line sung so far (for typing effects). */
  static typed(l: Line, t: number): number {
    let n = 0;
    for (const w of l.words) {
      const p = Lyrics.wordProgress(w, t);
      if (p <= 0) break;
      n = l.text.indexOf(w.w, n) + Math.ceil(w.w.length * p);
      if (p < 1) break;
    }
    return Math.min(n, l.text.length);
  }
}
