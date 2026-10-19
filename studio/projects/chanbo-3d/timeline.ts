// 10 s test of the first direction: neon office at the end of verse 1 → whip cut on the chorus downbeat → 3D pasture,
// then the "CHĂN BÒ" 3D title on the second chorus line. This folder renders look A (real); chanbo-3d-toon renders B.
import type { Project } from '../../src/core/plate';

const P = (name: 'Office' | 'Pasture' | 'Chorus' | 'TechCity') => () => import('../chanbo-lookdev/plates').then((m) => ({ default: m[name] as any }));
export const make = (look: 'real' | 'toon' | 'plus'): Project => ({
  title: `Chăn bò · 3D test (${look})`,
  song: 'song.mp3',
  timeline: (audio, lyrics) => {
    const lyric = look === 'plus' ? 'bell' : undefined; // user's pick: karaoke with a bouncing cowbell
    const cut = audio.timeOfBeat(Math.round(audio.beatAt(50.0))); // chorus 1 downbeat
    // word-timed lines from the CTC alignment when present; a line shows from just before its first word until the next line
    const L = lyrics.lines.filter((l) => l.words.length && !l.text.startsWith('('));
    const lines: [number, number, string, number[]?][] = L.length
      ? L.map((l, i) => [l.words[0]!.start - 0.2, Math.min(L[i + 1] ? L[i + 1]!.words[0]!.start - 0.2 : l.end + 1, l.end + 1.5), l.text, l.words.map((w) => w.start)])
      : [[cut, 53.7, 'Chăn bò chăn bò ơi chăn bò'], [53.7, 58.9, 'Về quê mình thôi ta đi chăn bò']];
    const l2 = audio.timeOfBeat(Math.round(audio.beatAt(53.7)));
    return [
      { id: 'office', plate: P(look === 'plus' ? 'TechCity' : 'Office'), start: 44, end: cut, params: { lines, lyric } },
      { id: 'pasture', plate: P('Pasture'), start: cut, end: l2, params: { look, lines, lyric }, transition: { type: 'whip', duration: 0.5 } },
      { id: 'title', plate: P('Chorus'), start: l2, end: 58.9, params: { look, lines, lyric, title: look !== 'plus' }, transition: { type: 'zoom', duration: 0.5 } },
    ];
  },
});
export default make('real');
