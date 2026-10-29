// "Iron Teeth in Frozen Earth" — YouTube Short, 9:16 only (render with --size 1080x1920 --to 179), just under 3 minutes.
// 120 BPM, bar = 2 s, downbeats at 0.578 + 2k. Structure: intro 0-16 · verse 1 16-32 · chorus 32-64 · break 64-72 ·
// vocal build 72-88 · instrumental 88-112 · verse 2 112-128 · chorus 128-160 · outro 160-179.6.
// Rule from review: the pack always runs side-on (never head-on); the aurora flares at the choruses.
import type { Project } from '../../src/core/plate';

type Tr = 'whip' | 'zoom' | 'flash' | 'dissolve';
type S = { at: number; shot: string; tr?: Tr; aurora?: number };
const D = 'dissolve', F = 'flash', W = 'whip';
export const SHOTS: S[] = [
  // intro: one crystal snowflake drifts from the lens to the white leader, his blue eyes, the first howl
  { at: 0, shot: 'flake' },
  { at: 4.579, shot: 'face', tr: D },
  { at: 8.579, shot: 'howl', tr: D },
  { at: 12.579, shot: 'howlside', tr: D },
  // verse 1 (16.27): the pack walks, quiet; a hint of green at the end of the verse
  { at: 16.579, shot: 'walkside', tr: D },
  { at: 20.579, shot: 'walktrack', tr: D },
  { at: 24.579, shot: 'howl', tr: D },
  { at: 28.579, shot: 'packwatch', tr: D, aurora: 0.3 },
  // chorus 1 (32.04): the aurora flares, the whole pack runs under it — first cycle
  { at: 32.578, shot: 'runsky', tr: F, aurora: 1 },
  { at: 36.578, shot: 'run', tr: W, aurora: 1 },
  { at: 38.578, shot: 'runwide', tr: F, aurora: 1 },
  { at: 42.578, shot: 'runtrack', tr: W, aurora: 1 },
  { at: 46.578, shot: 'runaerial', tr: D, aurora: 1 },
  // chorus 1 repeated (48-64): the pack howls, then runs again
  { at: 48.578, shot: 'packhowl', tr: F, aurora: 1 },
  { at: 52.578, shot: 'runtrack', tr: W, aurora: 1 },
  { at: 54.578, shot: 'runsky', tr: D, aurora: 1 },
  { at: 58.578, shot: 'runwide', tr: F, aurora: 1 },
  { at: 62.578, shot: 'run', tr: W, aurora: 1 },
  // break (64-72): the pack walks away toward the stones, then the leader's face
  { at: 64.578, shot: 'walkaway', tr: D, aurora: 0.6 },
  { at: 68.578, shot: 'face', tr: D, aurora: 0.5 },
  // vocal build (72-88)
  { at: 72.578, shot: 'packhowl2', tr: F, aurora: 1 },
  { at: 76.578, shot: 'runsky', tr: D, aurora: 1 },
  { at: 80.578, shot: 'runtrack', tr: W, aurora: 1 },
  { at: 84.578, shot: 'runwide', tr: F, aurora: 1 },
  // instrumental (88-112): wide, atmospheric, the aurora breathing
  { at: 88.578, shot: 'howl', tr: D, aurora: 0.7 },
  { at: 92.578, shot: 'runaerial', tr: D, aurora: 0.8 },
  { at: 96.578, shot: 'walkaway', tr: D, aurora: 0.8 },
  { at: 100.578, shot: 'gallop', tr: W, aurora: 0.8 },
  { at: 104.578, shot: 'packwatch', tr: D, aurora: 0.9 },
  { at: 108.578, shot: 'walktrack', tr: D, aurora: 0.6 },
  // verse 2 (112.07): "Wolves call from the dark" at 116.1 and 124.06 — the pack howls together
  { at: 112.578, shot: 'walkside', tr: D, aurora: 0.5 },
  { at: 116.578, shot: 'packhowl', tr: D, aurora: 0.7 },
  { at: 120.578, shot: 'packhowl2', tr: D, aurora: 0.7 },
  { at: 124.578, shot: 'packhowl', tr: D, aurora: 0.8 },
  // chorus 2 (128.16-160): two cycles like chorus 1
  { at: 128.578, shot: 'runsky', tr: F, aurora: 1 },
  { at: 132.578, shot: 'run', tr: W, aurora: 1 },
  { at: 134.578, shot: 'runtrack', tr: F, aurora: 1 },
  { at: 138.578, shot: 'runwide', tr: W, aurora: 1 },
  { at: 142.578, shot: 'runaerial', tr: D, aurora: 1 },
  { at: 144.578, shot: 'packhowl', tr: F, aurora: 1 },
  { at: 148.578, shot: 'runtrack', tr: W, aurora: 1 },
  { at: 150.578, shot: 'runsky', tr: D, aurora: 1 },
  { at: 154.578, shot: 'runwide', tr: F, aurora: 1 },
  { at: 158.578, shot: 'run', tr: W, aurora: 1 },
  // outro (160-179): the run slows, the pack walks off under the aurora, the leader howls last; fade to black at 179 s
  { at: 160.578, shot: 'runwide', tr: F, aurora: 0.8 },
  { at: 164.578, shot: 'walkaway', tr: D, aurora: 0.6 },
  { at: 170.578, shot: 'howl', tr: D, aurora: 0.5 },
];

const project: Project = {
  title: 'Iron Teeth in Frozen Earth',
  song: 'song.mp3',
  timeline: (audio) => SHOTS.map((s, i) => ({
    id: `s${i + 1}`, plate: () => import('./plates').then((m) => ({ default: m.WolfShot as any })),
    start: s.at, end: SHOTS[i + 1]?.at ?? audio.duration, params: { shot: s.shot, aurora: s.aurora ?? 0 },
    transition: s.tr ? { type: s.tr, duration: 0.5 } : undefined,
  })),
};
export default project;
