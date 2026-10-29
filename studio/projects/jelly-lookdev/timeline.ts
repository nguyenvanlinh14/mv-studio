// Look-dev for the jelly couple: the three backdrops, 16 beats each (so every backdrop sees the same hop phase), silent.
import type { Project } from '../../src/core/plate';

const BPM = 150.286, LEN = (16 * 60) / BPM;
const bgs = ['room', 'sky', 'studio'];
const project: Project = {
  title: 'Jelly · look-dev',
  bpm: BPM, duration: LEN * bgs.length,
  timeline: () => bgs.map((bg, i) => ({ id: bg, plate: () => import('../jelly/plates').then((m) => ({ default: m.JellyShot as any })), start: i * LEN, end: (i + 1) * LEN, params: { bg, label: `${i + 1} · ${bg}` } })),
};
export default project;
