// "Góc Nhỏ Bình Yên" — oil-painted music video for Thu (20/10), one continuous painting the brush keeps changing.
import type { Project } from '../../src/core/plate';

export const make = (pub: boolean): Project => ({
  title: 'Góc Nhỏ Bình Yên',
  song: 'song.mp3',
  timeline: (audio, lyrics) => {
    const L = lyrics.lines.filter((l) => l.words.length);
    const lines = L.map((l, i) => [l.words[0]!.start - 0.25, Math.min(L[i + 1] ? L[i + 1]!.words[0]!.start - 0.3 : l.end + 1.2, l.end + 1.6), l.text, l.words.map((w) => w.start)]);
    return [{ id: 'song', plate: () => import('./plates').then((m) => ({ default: m.PaintedSong as any })), start: 0, end: audio.duration, samples: 1, params: { lines, public: pub } }];
  },
});
export default make(false);
