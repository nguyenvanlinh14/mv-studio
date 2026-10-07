// Song analysis (audio.json from analysis/analyze.py): tempo grid, loudness envelopes, onsets.
// Everything is sampled by song time, so any frame can be rendered on its own.

export interface AudioJSON {
  duration: number;
  bpm: number;
  beats: number[];
  downbeats: number[];
  fps?: number;
  sections?: { name: string; start: number; end: number }[];
  onsets?: Record<string, [number, number][]>;
  [envelope: string]: unknown;
}

export class AudioInfo {
  readonly duration: number;
  readonly bpm: number;
  readonly beats: number[];
  readonly downbeats: number[];
  readonly sections: { name: string; start: number; end: number }[];
  private readonly envFps: number;
  private readonly envs = new Map<string, Float32Array>();
  private readonly onsets: Record<string, [number, number][]>;

  constructor(j: AudioJSON) {
    this.duration = j.duration;
    this.bpm = j.bpm;
    this.beats = j.beats;
    this.downbeats = j.downbeats;
    this.sections = j.sections ?? [];
    this.envFps = j.fps ?? 100;
    this.onsets = j.onsets ?? {};
    for (const [k, v] of Object.entries(j)) if (Array.isArray(v) && typeof v[0] === 'number' && !['beats', 'downbeats'].includes(k)) this.envs.set(k, Float32Array.from(v as number[]));
  }

  /** A metronome-only analysis for look-dev projects without a song. */
  static synthetic(bpm: number, duration: number): AudioInfo {
    const p = 60 / bpm;
    const beats = Array.from({ length: Math.ceil(duration / p) }, (_, i) => i * p);
    const kick = beats.map((b) => [b, 1] as [number, number]);
    return new AudioInfo({ duration, bpm, beats, downbeats: beats.filter((_, i) => i % 4 === 0), onsets: { kick } });
  }

  get beatPeriod() { return 60 / this.bpm; }

  /** Continuous beat index at time t (0 at the first beat), extrapolated outside the grid. */
  beatAt(t: number): number {
    const b = this.beats;
    if (b.length < 2) return t / this.beatPeriod;
    if (t <= b[0]!) return (t - b[0]!) / (b[1]! - b[0]!);
    let lo = 0, hi = b.length - 1;
    if (t >= b[hi]!) return hi + (t - b[hi]!) / (b[hi]! - b[hi - 1]!);
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (b[m]! <= t) lo = m; else hi = m; }
    return lo + (t - b[lo]!) / (b[hi]! - b[lo]!);
  }
  timeOfBeat(i: number): number {
    const b = this.beats;
    if (b.length < 2) return i * this.beatPeriod;
    const k = Math.max(0, Math.min(b.length - 2, Math.floor(i)));
    return b[k]! + (i - k) * (b[k + 1]! - b[k]!);
  }
  barAt(t: number): number {
    const d = this.downbeats;
    let i = 0;
    while (i + 1 < d.length && d[i + 1]! <= t) i++;
    const a = d[i] ?? 0, b = d[i + 1] ?? a + this.beatPeriod * 4;
    return i + (t - a) / (b - a);
  }

  /** Envelope value (0..~1) by name (rms, low, mid, high, vocal, other…), linearly interpolated. */
  env(name: string, t: number): number {
    const a = this.envs.get(name);
    if (!a || !a.length) return 0;
    const x = Math.max(0, t * this.envFps), i = Math.floor(x);
    if (i >= a.length - 1) return a[a.length - 1]!;
    return a[i]! + (a[i + 1]! - a[i]!) * (x - i);
  }

  /** Onset times of a kind inside [t0, t1). */
  hits(kind: string, t0: number, t1: number): [number, number][] {
    return (this.onsets[kind] ?? []).filter(([t]) => t >= t0 && t < t1);
  }
  /** Decaying pulse from the latest onsets of a kind (1 right at a hit). */
  pulse(kind: string, t: number, halfLife = 0.12): number {
    let v = 0;
    for (const [ot, s] of this.onsets[kind] ?? []) {
      if (ot > t) break;
      if (t - ot < halfLife * 8) v = Math.max(v, s * Math.pow(0.5, (t - ot) / halfLife));
    }
    return v;
  }
}
