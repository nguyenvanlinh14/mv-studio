// "Apple Cider and Cold Bones" — liquid-morph short (9:16, 0:00–1:04): the app screenshot on a tablet, the voxel
// buddy dives into the grid well, the screen goes dark and lights up, and the liquid becomes what the lyric sings.
import type { Project } from '../../src/core/plate';
import type { ShapeName } from '../liquid/plates';

const CUT = 7.1; // the screen is dark here; the liquid scene lights up after it
const KEYS: [number, ShapeName][] = [
  [0, 'drop'], [13.31, 'moon'] /* harvest moon */, [16.81, 'couple'] /* We walk */, [22.03, 'pumpkin'] /* lanterns */,
  [26.36, 'ghost'] /* shadow */, [32.64, 'couple'] /* our shoes */, [36.64, 'ghost'] /* spirits */, [39.3, 'mug'] /* cider */,
  [41.41, 'couple'] /* our bones */, [48.23, 'ghost'] /* phantoms */, [52.45, 'moon'] /* moon */, [55.53, 'pumpkin'] /* Hey! */,
  [56.95, 'ghost'] /* phantoms */, [61.16, 'moon'] /* moon */,
];
const project: Project = {
  title: 'Apple Cider · liquid short',
  song: '../cider/song.mp3',
  data: { audio: '../cider/audio.json', lyrics: '../cider/lyrics.json' },
  timeline: () => [
    { id: 'portal', plate: () => import('../liquid/portal').then((m) => ({ default: m.PortalShot as any })), start: 0, end: CUT, params: { lyrics: true } },
    { id: 'liquid', plate: () => import('../liquid/plates').then((m) => ({ default: m.LiquidShot as any })), start: CUT, end: 64.4, params: { keys: KEYS, lyrics: true, ignite: [CUT, CUT + 1.6], fadeOut: true } },
  ],
};
export default project;
