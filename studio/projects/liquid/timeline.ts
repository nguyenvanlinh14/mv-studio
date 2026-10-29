// Liquid morph on "Apple Cider and Cold Bones": the liquid becomes what the lyric sings (song + analysis from cider).
import type { Project } from '../../src/core/plate';
import type { ShapeName } from './plates';

const KEYS: [number, ShapeName][] = [
  [0, 'pumpkin'], [39.3, 'mug'] /* cider */, [41.41, 'couple'] /* our bones */, [48.23, 'ghost'] /* phantoms */,
  [52.45, 'moon'] /* moon */, [55.53, 'pumpkin'] /* Hey! */, [56.95, 'ghost'] /* phantoms */, [61.16, 'moon'] /* moon */,
];
const project: Project = {
  title: 'Apple Cider · liquid morph',
  song: '../cider/song.mp3',
  data: { audio: '../cider/audio.json', lyrics: '../cider/lyrics.json' },
  timeline: (audio) => [{ id: 'liquid', plate: () => import('./plates').then((m) => ({ default: m.LiquidShot as any })), start: 0, end: audio.duration, params: { keys: KEYS, lyrics: true } }],
};
export default project;
