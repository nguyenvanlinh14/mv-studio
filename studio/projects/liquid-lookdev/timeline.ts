// Look-dev for the liquid morph: pumpkin → ghost → couple → mug → moon, 4 beats each at the cider tempo, silent.
import type { Project } from '../../src/core/plate';

const BPM = 110;
const project: Project = {
  title: 'Liquid morph · look-dev',
  bpm: BPM, duration: (20 * 60) / BPM,
  timeline: () => [{ id: 'liquid', plate: () => import('../liquid/plates').then((m) => ({ default: m.LiquidShot as any })), start: 0, end: (20 * 60) / BPM }],
};
export default project;
