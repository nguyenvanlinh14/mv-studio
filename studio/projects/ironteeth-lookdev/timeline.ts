// Look-dev for "Iron Teeth in Frozen Earth": 7 wolf shots × 4 s, silent.
import type { Project } from '../../src/core/plate';

const names = ['howl', 'howlside', 'face', 'run', 'runfront', 'runaerial', 'pack'];
const project: Project = {
  title: 'Iron Teeth · look-dev',
  bpm: 90, duration: 28,
  timeline: () => names.map((shot, i) => ({ id: shot, plate: () => import('../ironteeth/plates').then((m) => ({ default: m.WolfShot as any })), start: i * 4, end: i * 4 + 4, params: { shot, label: `${i + 1} · ${shot}` } })),
};
export default project;
