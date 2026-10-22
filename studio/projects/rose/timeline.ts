// A red rose for a loved one — three previews (oil, watercolour, neon), 4 s each, silent.
import type { Project } from '../../src/core/plate';

const P = (name: 'RoseOil' | 'RoseWater' | 'RoseNeon' | 'RoseFilm') => () => import('./plates').then((m) => ({ default: m[name] as any }));
const project: Project = {
  title: 'Hoa hồng tặng vợ',
  bpm: 80,
  duration: 38,
  timeline: () => [
    { id: 'oil', plate: P('RoseOil'), start: 0, end: 4, samples: 1 },
    { id: 'water', plate: P('RoseWater'), start: 4, end: 8, samples: 1 },
    { id: 'neon', plate: P('RoseNeon'), start: 8, end: 12, params: { draw: 1 } },
    { id: 'film', plate: P('RoseFilm'), start: 12, end: 38, samples: 1 },
  ],
};
export default project;
