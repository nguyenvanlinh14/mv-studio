// "Holiday the Dead Seek" — skeleton folk band in a graveyard, 9:16 only (render with --size 1080x1920).
// Cuts sit on downbeats (130.7 BPM, bar = 1.837 s, first downbeat 0.37 s). Lyrics: hopping jack-o'-lantern karaoke.
// 61–92 s is an instrumental break: solos, then the wedding party arrives.
import type { Project } from '../../src/core/plate';

type S = { at: number; shot: string; tr?: 'whip' | 'zoom' | 'flash' | 'dissolve'; dawn?: number | 'ramp' };
export const SHOTS: S[] = [
  // intro
  { at: 0, shot: 'rise' },                          // banjo pluck, a bony hand bursts out of Silas's grave — the hook
  { at: 4.04, shot: 'silas', tr: 'flash' },         // "Get ready for a stompin sound"
  { at: 5.88, shot: 'drums', tr: 'whip' },
  { at: 7.72, shot: 'band', tr: 'zoom' },
  { at: 9.55, shot: 'banjo', tr: 'whip' },          // "Rattle them old bones this very night"
  { at: 11.39, shot: 'fiddle', tr: 'whip' },
  { at: 13.23, shot: 'stomp', tr: 'flash' },        // "We're gonna dance till the morning light"
  // verse 1
  { at: 16.9, shot: 'graves', tr: 'dissolve' },     // "Down in the hollow where the headstones sit"
  { at: 20.57, shot: 'cedar', tr: 'dissolve' },     // "…the cedar tree sighs"
  { at: 22.41, shot: 'silas', tr: 'flash' },        // "Old Uncle Silas is openin his eyes" / moss / grin
  { at: 27.92, shot: 'banjo', tr: 'whip' },         // "The banjo is ringin…"
  { at: 29.76, shot: 'band', tr: 'dissolve' },      // "…in the light of the moon"
  // chorus 1
  { at: 33.43, shot: 'stomp', tr: 'flash' },
  { at: 37.1, shot: 'crowd', tr: 'whip' },
  { at: 40.78, shot: 'band', tr: 'zoom' },
  { at: 44.45, shot: 'stomp', tr: 'whip' },         // "Stomp on the marble…"
  { at: 48.12, shot: 'aerial', tr: 'dissolve' },
  { at: 51.8, shot: 'crowd', tr: 'whip' },
  { at: 55.47, shot: 'sing', tr: 'flash' },         // "This is the holiday all the dead seek"
  { at: 59.15, shot: 'band', tr: 'dissolve' },
  // instrumental break
  { at: 60.98, shot: 'banjo', tr: 'whip' },
  { at: 64.66, shot: 'fiddle', tr: 'whip' },
  { at: 68.33, shot: 'drums', tr: 'whip' },
  { at: 72.01, shot: 'crowd', tr: 'flash' },
  { at: 75.68, shot: 'aerial', tr: 'dissolve' },
  { at: 79.35, shot: 'cedar', tr: 'dissolve' },
  { at: 83.03, shot: 'graves', tr: 'dissolve' },
  { at: 86.7, shot: 'wedding', tr: 'dissolve' },
  { at: 90.37, shot: 'preacher', tr: 'whip' },
  // verse 2
  { at: 92.21, shot: 'wedding', tr: 'flash' },      // "A dandy young skeleton takes a fine bride"
  { at: 95.89, shot: 'bride', tr: 'whip' },         // "Her veil is of cobwebs…"
  { at: 99.56, shot: 'wedding', tr: 'whip' },         // "His buttons are shiny…"
  { at: 101.4, shot: 'wedding', tr: 'whip' },       // "They're swingin and twirlin…"
  { at: 103.23, shot: 'stomp', tr: 'whip' },        // "…rhythm of rattlin bones"
  { at: 105.07, shot: 'preacher', tr: 'whip' },     // "The preacher is laughin…"
  { at: 106.9, shot: 'crowd', tr: 'dissolve' },
  // chorus 2
  { at: 108.74, shot: 'stomp', tr: 'flash' },
  { at: 112.41, shot: 'crowd', tr: 'whip' },
  { at: 116.08, shot: 'band', tr: 'zoom' },
  { at: 119.76, shot: 'stomp', tr: 'whip' },
  { at: 123.43, shot: 'aerial', tr: 'dissolve' },
  { at: 127.1, shot: 'crowd', tr: 'whip' },
  { at: 130.78, shot: 'sing', tr: 'flash' },
  { at: 134.45, shot: 'band', tr: 'dissolve' },
  // bridge
  { at: 138.13, shot: 'graves', tr: 'dissolve' },   // "The air is thick with a graveyard mist"
  { at: 139.97, shot: 'moon', tr: 'dissolve' },
  { at: 141.8, shot: 'cedar', tr: 'dissolve' },     // "The owls are screechin…"
  { at: 143.64, shot: 'crowd', tr: 'whip' },        // "…no room for any more fear"
  { at: 145.48, shot: 'moon', tr: 'flash' },        // "The clock strikes three…"
  { at: 147.31, shot: 'reach', tr: 'zoom' },        // "We're reachin on up and we're touchin the sky"
  { at: 149.15, shot: 'stomp', tr: 'whip' },
  { at: 150.99, shot: 'aerial', tr: 'dissolve' },
  { at: 152.82, shot: 'band', tr: 'dissolve' },
  // outro: sunrise, everyone slips back into their graves
  { at: 154.66, shot: 'band', tr: 'dissolve', dawn: 'ramp' }, // "The sun is a-comin to spoil all the fun"
  { at: 158.33, shot: 'crowd', tr: 'dissolve', dawn: 1 },     // "…all our dancing is done"
  { at: 160.17, shot: 'dawn', tr: 'dissolve' },               // "So slip back in silent and cover your head"
  { at: 163.84, shot: 'graves', tr: 'dissolve', dawn: 1 },
  { at: 167.51, shot: 'dawn', tr: 'dissolve' },               // "Yeah slip back in silent…"
  { at: 171.18, shot: 'final', tr: 'dissolve', dawn: 1 },     // crane up over the graveyard, end card
];

const project: Project = {
  title: 'Holiday the Dead Seek',
  song: 'song.mp3',
  timeline: (audio, lyrics) => {
    const L = lyrics.lines;
    const lines = L.map((l, i) => [l.words[0]!.start - 0.2, Math.min(L[i + 1] ? L[i + 1]!.words[0]!.start - 0.2 : l.end + 1, l.end + 1.5), l.text, l.words.map((w) => w.start)]);
    return SHOTS.map((s, i) => ({
      id: `s${i + 1}`, plate: () => import('./plates').then((m) => ({ default: m.HolidayShot as any })),
      start: s.at, end: SHOTS[i + 1]?.at ?? audio.duration, params: { shot: s.shot, lines, lyric: 'pumpkin', dawn: s.dawn },
      transition: s.tr ? { type: s.tr, duration: 0.4 } : undefined,
    }));
  },
};
export default project;
