// "Tinh tinh tính lương về" v2 — neon notes roll out of the depth on the beat and draw each section's picture.
// The song has a 12-beat break after "giờ là Ess-Eye" (edit.json → song-edit.wav): music ducked, the cheat
// "show me the money" is typed, sent, spoken by the SI voice and pays out.
import type { Project } from '../../src/core/plate';

const plate = () => import('./plates');

const project: Project = {
  title: 'Tinh tinh tính lương về',
  song: 'song-edit.mp3', // song-edit.wav → mp3 320k (tools/song_edit.py + ffmpeg)
  data: { audio: 'audio.edit.json', lyrics: 'lyrics.edit.json' },
  timeline: (audio, lyrics) => {
    const beat = (x: number) => audio.timeOfBeat(Math.floor(audio.beatAt(x + 0.02)));
    const cut = (q: string, nth = 0) => beat(lyrics.get(q, nth).words[0]!.start);
    const after = (q: string, nth = 0) => audio.timeOfBeat(Math.ceil(audio.beatAt(lyrics.get(q, nth).end + 0.02)));
    const w = (q: string, word: string, nth = 0) => lyrics.get(q, nth).words.find((x) => x.w.toLowerCase().startsWith(word.toLowerCase()))!.start;
    const brk = (audio as any).breaks?.[0] ?? { start: 30.091, end: 35.806 };
    const t = {
      v1: cut('Tám giờ rưỡi'), v2: cut('Mười giờ họp'), pre: cut('Gõ prompt'), si: brk.start as number, sup: cut('Thôi khỏi'),
      c1: beat(lyrics.get('Tinh, tinh, tinh! Tính lương về!', 0).start),
      drop: after('Hôm nay đại gia'), br: cut('Ess-Eye làm việc'), fc: cut('Tinh, tinh, tinh! Tính lương về!', 4),
      bal: cut('Tinh, tinh, tinh! Tính... lương đi!', 1), loop: cut('Mai lại'), out: cut('Năm giờ rưỡi'),
    };
    const ess = lyrics.get('Ess... ess').words.map((x) => x.start);
    const SUPER = w('Thôi khỏi', 'SUPER');
    const be = brk.end as number;
    return [
      { id: 'intro', plate, start: 0, end: t.v1, params: { shape: 'clock', colors: ['cyan', 'violet', 'gold'], notes: 1, draw: [0.4, 7.9], hands: 'tick', horizon: [0.26, 0.09, 0.2], fx: { traffic: { every: 2 }, skyline: { lit: [0.03, 0.75] }, dust: {} } } },
      { id: 'v1', plate, start: t.v1, end: t.v2, params: { shape: 'laptop', colors: ['cyan', 'violet', 'magenta'], fx: { monitors: {}, dust: { color: 'cyan' }, waves: { color: 'violet' } } }, transition: { type: 'zoom', duration: 0.5 } },
      { id: 'v2', plate, start: t.v2, end: t.pre, params: { shape: 'calendar', colors: ['violet', 'cyan', 'gold'], cam: { pos: [0, 3.2, 18], look: [0, 4.15, -6], orbit: 0.35 }, fx: { traffic: {}, skyline: { lit: 0.5, color: 'cyan' }, beams: { colors: ['violet', 'cyan'], mode: 'steady', level: 0.5 }, dust: {} } }, transition: { type: 'whip', duration: 0.45 } },
      { id: 'pre', plate, start: t.pre, end: t.si, params: { shape: 'ai', colors: ['cyan', 'violet', 'cyan'], draw: [t.pre + 0.2, w('A-I... à nhầm', 'giờ')], swap: { shape: 'si', at: w('A-I... à nhầm', 'Ess'), glitch: [] }, cam: { pos: [0, 3.8, 17], look: [0, 4.25, -6], push: 2.5 }, fx: { data: { color: 'cyan', level: [t.pre, t.si, 0.15, 1] }, dust: { color: 'cyan' } } }, transition: { type: 'glitch', duration: 0.4 } },
      // the break: the chip blows apart, the AI figure traces itself; the cheat is typed + spoken, SI heats up, money rains
      { id: 'si', plate, start: t.si, end: t.sup, params: {
        shape: 'si', colors: ['cyan', 'violet', 'cyan'], draw: [t.si - 1, t.si - 0.5], explode: [t.si, t.si + 0.7], quiet: [[t.si, be]],
        cheat: { text: 'show me the money', at: t.si + 0.5, step: 0.085, enter: t.si + 2.125, enabled: t.si + 3.9 },
        bust: { draw: [t.si + 0.2, t.si + 1.9], heat: [t.si + 2.3, t.si + 3.9], halo: [t.si + 3.6, t.si + 4.4], glitch: [t.si + 2.13, ...ess] },
        horizon: [0.3, 0.16, 0.04], cam: { pos: [0, 3.6, 15], look: [0, 4.6, -6], push: 3.5 },
        fx: { data: { color: 'cyan', to: 'gold', at: [t.si + 2.3, t.si + 3.9], level: 0.9 }, beams: { colors: ['gold', 'magenta'], mode: 'steady', level: 0.9 }, coins: { at: t.si + 3.9 }, dust: { color: 'gold' } },
      }, transition: { type: 'glitch', duration: 0.35 } },
      { id: 'super', plate, start: t.sup, end: t.c1, params: {
        shape: 'chart', colors: ['lime', 'violet', 'red'], draw: [t.sup, SUPER - 0.05], burst: { shape: 'rocket', at: [SUPER, t.c1 - 0.15] },
        tilt: [SUPER + 0.1, t.c1, 4.5], ticker: true, flash: [SUPER], big: /SUPER/, horizon: [0.06, 0.22, 0.08],
        cam: { pos: [0, 3.4, 18], look: [0, 4.3, -6], push: 1 },
        fx: { beams: { colors: ['lime', 'cyan'], mode: 'beat', level: 1.1, up: [SUPER, SUPER + 0.6] }, waves: { color: 'lime', every: 'beat' }, dust: { color: 'lime' } },
      }, transition: { type: 'whip', duration: 0.4 } },
      { id: 'c1', plate, start: t.c1, end: t.drop, params: { shape: 'phone', colors: ['magenta', 'cyan', 'gold'], big: /^Tinh/, fx: { traffic: { body: 'magenta' }, coins: {}, beams: { colors: ['magenta', 'cyan'], mode: 'beat' }, waves: {}, skyline: { lit: 0.6 } } }, transition: { type: 'flash', duration: 0.35 } },
      { id: 'drop', plate, start: t.drop, end: t.br, params: { shape: 'coins', colors: ['gold', 'magenta', 'lime'], notes: 2, cam: { pos: [0, 2.6, 18], look: [0, 4.35, -6], orbit: 0.22, push: 4 }, fx: { traffic: { body: 'gold', every: 1 }, tunnel: {}, coins: { level: 0.8 }, beams: { colors: ['gold', 'magenta'], mode: 'down' }, waves: { color: 'gold', every: 'beat' } } }, transition: { type: 'whip', duration: 0.45 } },
      { id: 'bridge', plate, start: t.br, end: t.fc, params: { shape: 'robot', colors: ['cyan', 'violet', 'lime'], horizon: [0.04, 0.1, 0.25], cam: { pos: [0, 4, 19], look: [0, 3.95, -6], orbit: -0.25 }, fx: { traffic: { body: 'cyan', every: 2 }, rain: {}, data: { color: 'cyan', level: 0.35 }, skyline: { lit: 0.2, color: 'cyan', win: 'cyan' } } }, transition: { type: 'dissolve', duration: 0.7 } },
      { id: 'house', plate, start: t.fc, end: t.bal, params: { shape: 'house', colors: ['magenta', 'violet', 'gold'], big: /^Tinh/, fx: { traffic: {}, skyline: { lit: 0.6 }, coins: { up: true }, waves: {} } }, transition: { type: 'flash', duration: 0.35 } },
      { id: 'balance', plate, start: t.bal, end: t.loop, params: { shape: 'balance', colors: ['red', 'violet', 'gold'], big: /^Tinh/, horizon: [0.3, 0.02, 0.05], fx: { traffic: { body: 'red', every: 2 }, beams: { colors: ['red'], mode: 'beat', level: 1.2 }, skyline: { lit: [0.6, 0.05], color: 'red', win: 'red' }, dust: { color: 'red' } } }, transition: { type: 'whip', duration: 0.45 } },
      { id: 'loop', plate, start: t.loop, end: t.out, params: { shape: 'clock', colors: ['magenta', 'violet', 'cyan'], notes: 2, draw: [t.loop + 0.2, t.loop + 4], hands: 'spin', cam: { pos: [0, 2.8, 18], look: [0, 4.35, -6], orbit: 0.3, push: 3 }, fx: { traffic: { body: 'magenta', every: 1 }, tunnel: { colors: ['magenta', 'violet', 'cyan'] }, beams: { colors: ['magenta', 'violet'], mode: 'down' }, dust: {} } }, transition: { type: 'zoom', duration: 0.5 } },
      { id: 'outro', plate, start: t.out, end: audio.duration, params: { shape: 'days29', colors: ['violet', 'cyan', 'cyan'], draw: [t.out, t.out + 5], undraw: [audio.duration - 4, audio.duration - 0.6], sign: { at: audio.duration - 4, name: 'Linh.NV', repo: 'github.com/nguyenvanlinh14/mv-studio' }, fx: { traffic: { every: 4, level: 0.7 }, skyline: { lit: [0.5, 0.0] }, rain: { level: 0.5 }, dust: {} } }, transition: { type: 'dissolve', duration: 0.8 } },
    ];
  },
};
export default project;
