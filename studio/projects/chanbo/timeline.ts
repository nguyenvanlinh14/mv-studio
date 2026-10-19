// "Chăn bò ngày nắng" — the full video (look B+). One cue per shot on the real song timeline: the tech dream in the
// verses (graduation, campus, the desk, meetings, the AI lab), the Vietnamese village in every chorus, the way out in
// the bridge, dancing cows in the last chorus, and the signature at the end. Lyrics: karaoke with a bouncing cowbell.
import type { Project } from '../../src/core/plate';

type Name = 'Pasture' | 'TechCity' | 'YearFlip' | 'Graduation' | 'Desk' | 'Meeting' | 'AILab' | 'DataSky' | 'RoadOut' | 'Bubbles' | 'Ending';
const P = (name: Name) => () => (['Pasture', 'TechCity'].includes(name) ? import('../chanbo-lookdev/plates') : import('../chanbo-lookdev/scenes')).then((m: any) => ({ default: m[name] }));
type S = { at: number; plate?: Name; v?: [string, ('dawn' | 'gold' | 'sunset')?, boolean?]; mode?: string; title?: boolean; tr?: 'whip' | 'zoom' | 'flash' | 'dissolve' };

export const SHOTS: S[] = [
  // Intro — dawn over the village, then back ten years
  { at: 0, plate: 'AILab', mode: 'hook' },                 // cold open: the AI lab dancing to the music + punch lines
  { at: 10.387, v: ['dawn', 'dawn'], title: true, tr: 'flash' }, // …cut to the village on the downbeat, song title
  { at: 15.607, v: ['banyan', 'dawn'], tr: 'dissolve' },
  { at: 20, plate: 'RoadOut', mode: 'in', tr: 'dissolve' },           // years ago: the road from the village to the city
  // Verse 1 — the dream
  { at: 28.8, plate: 'Graduation', tr: 'flash' },
  { at: 34.2, plate: 'TechCity', tr: 'whip' },
  { at: 39.5, plate: 'Desk', mode: 'night', tr: 'whip' },
  { at: 44.9, plate: 'Meeting', tr: 'whip' },
  // Chorus 1
  { at: 50.2, v: ['wide'], tr: 'flash' },
  { at: 55.5, v: ['low'] },
  { at: 60.8, v: ['close'] },
  { at: 66.2, v: ['aerial'], tr: 'zoom' },
  // Verse 2 — the AI years
  { at: 74.2, plate: 'AILab', tr: 'flash' },
  { at: 79.6, plate: 'DataSky', tr: 'whip' },
  { at: 84.9, plate: 'Desk', mode: 'robot', tr: 'whip' },
  { at: 90.2, plate: 'Desk', mode: 'empty', tr: 'dissolve' },
  // Chorus 2
  { at: 95.5, v: ['lotus'], tr: 'flash' },
  { at: 100.9, v: ['kites'] },
  { at: 106.2, v: ['road', 'sunset'] },
  { at: 111.6, v: ['aerial', 'sunset'], tr: 'dissolve' },
  // Bridge — the way out
  { at: 122.2, plate: 'Desk', mode: 'laptop', tr: 'dissolve' },
  { at: 127.5, plate: 'RoadOut', tr: 'whip' },
  { at: 132.9, plate: 'Bubbles', tr: 'zoom' },
  { at: 138.2, v: ['road'], tr: 'dissolve' },
  // Chorus 3 — faster cuts, the herd dances
  { at: 143.6, v: ['wide', 'gold', true], tr: 'flash' },
  { at: 146.2, v: ['close', 'gold', false] },
  { at: 148.9, v: ['low', 'gold', true] },
  { at: 151.5, v: ['kites'] },
  { at: 154.2, v: ['aerial', 'gold', true], tr: 'zoom' },
  { at: 156.8, v: ['lotus'] },
  { at: 159.5, v: ['wide', 'gold', true] },
  { at: 162.2, v: ['road', 'sunset'] },
  // Outro — sunset, the bell, the signature
  { at: 164.9, v: ['pullback', 'sunset'], tr: 'dissolve' },
  { at: 170.2, v: ['close', 'sunset'] },
  { at: 175.6, plate: 'Ending', tr: 'dissolve' },
];

const project: Project = {
  title: 'Chăn bò ngày nắng',
  song: 'song.mp3',
  timeline: (audio, lyrics) => {
    const L = lyrics.lines.filter((l) => l.words.length && !l.text.startsWith('('));
    const lines: [number, number, string, number[]][] = L.map((l, i) => [l.words[0]!.start - 0.2, Math.min(L[i + 1] ? L[i + 1]!.words[0]!.start - 0.2 : l.end + 1, l.end + 1.5), l.text, l.words.map((w) => w.start)]);
    return SHOTS.map((s, i) => {
      const end = SHOTS[i + 1]?.at ?? audio.duration;
      const params: Record<string, any> = { lines, lyric: 'bell' };
      if (s.v) Object.assign(params, { look: 'plus', shot: s.v[0], tod: s.v[1], dance: s.v[2] });
      if (s.mode) params.mode = s.mode;
      if (s.plate === 'RoadOut') params.dir = s.mode === 'in' ? 'in' : 'out';
      if (s.title) params.title = true;
      return { id: `s${String(i + 1).padStart(2, '0')}`, plate: P(s.plate ?? 'Pasture'), start: s.at, end, params, transition: s.tr ? { type: s.tr, duration: 0.5 } : undefined };
    });
  },
};
export default project;
