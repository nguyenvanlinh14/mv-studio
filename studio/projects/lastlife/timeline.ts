// "The Last Life" — neon rhythm-game video (9:16): notes charted from the song's own onsets, falling faster and denser
// from start to finish, D F J K keys flashing on the hit line, synthwave terrain + real moon.
import type { Project } from '../../src/core/plate';
const project: Project = {
  title: 'The Last Life · rhythm',
  song: 'song.mp3',
  timeline: (audio) => [{ id: 'rhythm', plate: () => import('../rhythm/plates').then((m) => ({ default: m.RhythmShot as any })), start: 0, end: audio.duration, params: { chart: '/projects/lastlife/chart.json', speed: [5, 13] } }],
};
export default project;
