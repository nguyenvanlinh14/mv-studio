// "Enter!Enter!Enter!" (EN) — docs/STORYBOARD-enter-en.md, AI → SI neon motif (no human figures). Original song.
// (A voice-over break before the first drop was tried with tools/song_edit.py and dropped by the owner.)
import type { Project } from '../../src/core/plate';

const S = (name: string) => () => import('./plates/scenes').then((m) => ({ default: (m as any)[name] }));
const loading = () => import('./plates/loading');

const project: Project = {
  title: 'Enter!Enter!Enter!',
  song: 'song.mp3',
  timeline: (audio, lyrics) => {
    const cut = (q: string, nth = 0) => audio.timeOfBeat(Math.floor(audio.beatAt(lyrics.get(q, nth).words[0]!.start + 0.02)));
    const after = (q: string, nth = 0) => audio.timeOfBeat(Math.ceil(audio.beatAt(lyrics.get(q, nth).end + 0.02)));
    const t = {
      v1: cut('Nine a.m.'), v2: cut("Dev don't"), pre: cut('Type a line'), c1: cut('Enter, enter, enter!', 0),
      drop: after('One key and the job', 0), br: cut('But wait'), c2: cut('Enter, enter, enter!', 4), out: cut('Are you sure'),
    };
    return [
      { id: 'hero', plate: S('Hero'), start: 0, end: t.v1 },
      { id: 'office', plate: S('Office'), start: t.v1, end: t.v2, transition: { type: 'zoom', duration: 0.6 } },
      { id: 'roles', plate: S('Office'), start: t.v2, end: t.pre, params: { roles: ['Dev', 'Designer', 'Sales', 'HR', 'Accounting'] }, transition: { type: 'whip', duration: 0.5 } },
      { id: 'loading', plate: loading, start: t.pre, end: t.c1, params: { breakStart: t.c1, breakEnd: t.c1, trumpAt: Infinity }, transition: { type: 'glitch', duration: 0.4 } },
      { id: 'wall', plate: S('Wall'), start: t.c1, end: t.drop },
      { id: 'city', plate: S('City'), start: t.drop, end: t.br, transition: { type: 'whip', duration: 0.5 } },
      { id: 'bridge', plate: S('Bridge'), start: t.br, end: t.c2, transition: { type: 'dissolve', duration: 0.8 } },
      { id: 'crowd', plate: S('City'), start: t.c2, end: t.out, params: { crowd: true }, transition: { type: 'flash', duration: 0.4 } },
      { id: 'outro', plate: S('Outro'), start: t.out, end: audio.duration, transition: { type: 'glitch', duration: 0.4 } },
    ];
  },
};
export default project;
