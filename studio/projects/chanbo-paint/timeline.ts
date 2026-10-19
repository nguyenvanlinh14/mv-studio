// Oil-paint look-dev for "Chăn bò": stills of both scenes, and a ~26 s test clip from the end of verse 1 into chorus 1.
import type { Project } from '../../src/core/plate';

const P = (name: 'Office' | 'Pasture' | 'Clip' | 'Styled') => () => import('./plates').then((m) => ({ default: m[name] as any }));

const project: Project = {
  title: 'Look-dev · Chăn bò · sơn dầu',
  song: 'song.mp3',
  timeline: (audio) => {
    const cut = audio.timeOfBeat(Math.round(audio.beatAt(50.0))); // chorus 1 downbeat
    return [
      { id: 'office', plate: P('Office'), start: 0, end: 4 },
      { id: 'pasture', plate: P('Pasture'), start: 4, end: 8 },
      { id: 'office-ref', plate: P('Office'), start: 8, end: 12, params: { ref: true } },
      { id: 'pasture-ref', plate: P('Pasture'), start: 12, end: 16, params: { ref: true } },
      {
        id: 'clip', plate: P('Clip'), start: 38, end: 64.4, samples: 1,
        params: { cut, lines: [[cut, 53.7, 'Chăn bò chăn bò ơi chăn bò'], [53.7, 58.9, 'Về quê mình thôi ta đi chăn bò'], [58.9, 64.4, 'Chăn bò chăn bò ơi chăn bò']] },
      },
      ...(['water', 'pixel', 'dongho'] as const).flatMap((style, i) => (['office', 'pasture'] as const).map((scene, j) => (
        { id: `${style}-${scene}`, plate: P('Styled'), start: 70 + (i * 2 + j) * 4, end: 74 + (i * 2 + j) * 4, samples: 1, params: { style, scene } }))),
    ];
  },
};
export default project;
