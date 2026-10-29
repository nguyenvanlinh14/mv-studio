// The liquid intro hook on the cider intro: app screenshot on a tablet → voxel buddy pops out → grid well → dive.
import type { Project } from '../../src/core/plate';
const project: Project = {
  title: 'Liquid intro · cider',
  song: '../cider/song.mp3',
  data: { audio: '../cider/audio.json', lyrics: '../cider/lyrics.json' },
  timeline: () => [{ id: 'portal', plate: () => import('../liquid/portal').then((m) => ({ default: m.PortalShot as any })), start: 0, end: 8, params: { lyrics: true } }],
};
export default project;
