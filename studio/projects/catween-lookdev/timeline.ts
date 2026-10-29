// Look-dev for the cute Halloween kittens: 4 shots × 4 s, silent.
import type { Project } from '../../src/core/plate';

const names = ['portrait', 'witch', 'bat', 'gang'];
const project: Project = {
  title: 'Catween · look-dev',
  bpm: 120, duration: 16,
  timeline: () => names.map((shot, i) => ({ id: shot, plate: () => import('../catween/plates').then((m) => ({ default: m.KittyShot as any })), start: i * 4, end: i * 4 + 4, params: { shot, label: `${i + 1} · ${shot}` } })),
};
export default project;
