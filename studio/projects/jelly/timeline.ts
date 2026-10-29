// "Góc Nhỏ Bình Yên" as a jelly music video: the gummy couple squash & stretch on every beat (song + analysis from gocnho).
import type { Project } from '../../src/core/plate';

const BG = 'room';
const project: Project = {
  title: 'Góc Nhỏ Bình Yên · jelly',
  song: '../gocnho/song.mp3',
  data: { audio: '../gocnho/audio.json', lyrics: '../gocnho/lyrics.json' },
  timeline: (audio) => [{ id: 'jelly', plate: () => import('./plates').then((m) => ({ default: m.JellyShot as any })), start: 0, end: audio.duration, params: { bg: BG } }],
};
export default project;
