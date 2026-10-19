// Silent look-dev project for "Chăn bò": office (neon) vs pasture in two looks, 4 s each on a 96 BPM metronome.
import type { Project } from '../../src/core/plate';

const P = (name: 'Office' | 'Pasture' | 'Chorus' | 'Bell') => () => import('./plates').then((m) => ({ default: m[name] as any }));

const project: Project = {
  title: 'Look-dev · Chăn bò',
  bpm: 96,
  duration: 32,
  timeline: () => [
    { id: 'office', plate: P('Office'), start: 0, end: 4 },
    { id: 'field-real', plate: P('Pasture'), start: 4, end: 8, params: { look: 'real' } },
    { id: 'field-toon', plate: P('Pasture'), start: 8, end: 12, params: { look: 'toon' } },
    { id: 'chorus-real', plate: P('Chorus'), start: 12, end: 16, params: { look: 'real' } },
    { id: 'chorus-toon', plate: P('Chorus'), start: 16, end: 20, params: { look: 'toon' } },
    { id: 'bell-real', plate: P('Bell'), start: 20, end: 24, params: { look: 'real' } },
    { id: 'bell-toon', plate: P('Bell'), start: 24, end: 28, params: { look: 'toon' } },
  ],
};
export default project;
