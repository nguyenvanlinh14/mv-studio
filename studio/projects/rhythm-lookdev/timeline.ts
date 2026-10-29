// Look-dev for the neon rhythm-game shot, silent at 128 BPM.
import type { Project } from '../../src/core/plate';
const project: Project = {
  title: 'Rhythm · look-dev', bpm: 128, duration: 12,
  timeline: () => [{ id: 'rhythm', plate: () => import('../rhythm/plates').then((m) => ({ default: m.RhythmShot as any })), start: 0, end: 12 }],
};
export default project;
