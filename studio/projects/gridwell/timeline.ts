// Look-dev for the gravity-well grid, silent.
import type { Project } from '../../src/core/plate';
const project: Project = {
  title: 'Gravity well · look-dev', bpm: 110, duration: 8,
  timeline: () => [{ id: 'well', plate: () => import('./plates').then((m) => ({ default: m.GridWell as any })), start: 0, end: 8 }],
};
export default project;
