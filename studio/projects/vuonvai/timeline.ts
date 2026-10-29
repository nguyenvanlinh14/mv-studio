// "Vươn Vai Đón Nắng" — gouache painted music video (16:9).
import type { Project } from '../../src/core/plate';

const project: Project = {
  title: 'Vươn Vai Đón Nắng',
  song: 'song.mp3',
  timeline: (audio, lyrics) => {
    const L = lyrics.lines.filter((l) => l.words.length);
    const lines = L.map((l, i) => [l.words[0]!.start - 0.25, Math.min(L[i + 1] ? L[i + 1]!.words[0]!.start - 0.25 : l.end + 1.2, l.end + 1.6), l.text, l.words.map((w) => w.start)]);
    return [{ id: 'song', plate: () => import('./plates').then((m) => ({ default: m.GouacheSong as any })), start: 0, end: audio.duration, samples: 1, params: { lines } }];
  },
};
export default project;
