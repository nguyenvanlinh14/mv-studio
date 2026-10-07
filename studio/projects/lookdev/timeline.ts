// Silent look-dev project: four 4-second depth studies on a 120 BPM metronome.
import type { Project } from '../../src/core/plate';

const P = (name: 'Hero' | 'Wall' | 'Office' | 'City' | 'Figures') => () => import('./plates').then((m) => ({ default: m[name] }));

const project: Project = {
  title: 'Look-dev · Enter (EN)',
  bpm: 120,
  duration: 24,
  timeline: () => [
    { id: 'hero', plate: P('Hero'), start: 0, end: 4 },
    { id: 'wall', plate: P('Wall'), start: 4, end: 8, transition: { type: 'whip', duration: 0.6 } },
    { id: 'office', plate: P('Office'), start: 8, end: 12, transition: { type: 'zoom', duration: 0.7 } },
    { id: 'city', plate: P('City'), start: 12, end: 16, transition: { type: 'glitch', duration: 0.5 } },
    { id: 'figures', plate: P('Figures'), start: 16, end: 20 },
    { id: 'silhouette', plate: P('Figures'), start: 20, end: 24, params: { mode: 'silhouette' } },
  ],
};
export default project;
