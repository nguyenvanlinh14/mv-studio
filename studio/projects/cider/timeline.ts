// "Apple Cider and Cold Bones" — Halloween music video. Shots on the real song timeline; render 16:9 for YouTube or
// --size 1080x1920 for TikTok / Shorts. Lyrics: karaoke with a hopping jack-o'-lantern.
import type { Project } from '../../src/core/plate';

type S = { at: number; shot: string; tr?: 'whip' | 'zoom' | 'flash' | 'dissolve' };
export const SHOTS: S[] = [
  { at: 0, shot: 'firerise' },                      // "Step into the cold and let the fire rise" — the hook
  { at: 4.29, shot: 'moon', tr: 'dissolve' },
  { at: 8.64, shot: 'walk', tr: 'dissolve' },
  { at: 12.3, shot: 'moon', tr: 'dissolve' },       // "The harvest moon is hanging low and yellow"
  { at: 16.6, shot: 'walk' },                       // "We walk the path…"
  { at: 21.0, shot: 'pumpkins', tr: 'whip' },       // "Our jack o lanterns grinning…"
  { at: 25.4, shot: 'shadows', tr: 'dissolve' },    // "every shadow is wearing a gray cloak"
  { at: 29.0, shot: 'leaves' },                     // "The dry leaves are rustling…"
  { at: 33.3, shot: 'pond', tr: 'dissolve' },       // "a tune that the old spirits choose"
  { at: 36.86, shot: 'porch', tr: 'dissolve' },     // "A sweet apple cider…"
  { at: 42.3, shot: 'moon', tr: 'dissolve' },       // "As the wind starts to whistle…"
  { at: 47.0, shot: 'dance', tr: 'flash' },         // chorus 1
  { at: 51.3, shot: 'shades', tr: 'whip' },
  { at: 55.4, shot: 'dance', tr: 'whip' },
  { at: 60.0, shot: 'singmoon', tr: 'dissolve' },
  { at: 64.2, shot: 'cider2', tr: 'dissolve' },     // "A sweet apple cider…" (verse 2)
  { at: 68.6, shot: 'walk' },                       // "The wind starts to whistle…"
  { at: 72.5, shot: 'forestedge', tr: 'dissolve' }, // "where the forest begins"
  { at: 77.2, shot: 'deck', tr: 'whip' },           // "the old wooden floorboard is groaning"
  { at: 81.5, shot: 'embers', tr: 'dissolve' },     // "Your eyes are like embers…"
  { at: 85.9, shot: 'rise' },                       // "Our spirits are lifting…"
  { at: 90.3, shot: 'owl', tr: 'dissolve' },        // "The owl in the pine…"
  { at: 94.4, shot: 'pond', tr: 'dissolve' },       // "…where the dark waters flow"
  { at: 99.1, shot: 'dance', tr: 'flash' },         // chorus 2
  { at: 103.5, shot: 'shades', tr: 'whip' },
  { at: 107.3, shot: 'dance', tr: 'whip' },
  { at: 112.2, shot: 'singmoon', tr: 'dissolve' },
  { at: 116.4, shot: 'firedance', tr: 'dissolve' }, // instrumental: around the fire
  { at: 124.7, shot: 'aerial', tr: 'zoom' },
  { at: 132.7, shot: 'clock', tr: 'flash' },        // "The clock strikes twelve…"
  { at: 137.3, shot: 'alone', tr: 'dissolve' },     // "No one is out and we are far from our home"
  { at: 141.7, shot: 'hold', tr: 'dissolve' },      // "Just keep your hand right inside of my own"
  { at: 145.4, shot: 'water', tr: 'dissolve' },     // "And do not look at what the water has shown"
  { at: 150.4, shot: 'dance', tr: 'flash' },        // last chorus
  { at: 154.8, shot: 'shades', tr: 'whip' },
  { at: 158.6, shot: 'dance', tr: 'whip' },
  { at: 163.5, shot: 'singmoon', tr: 'dissolve' },
  { at: 167.2, shot: 'final', tr: 'dissolve' },     // outro: crane up to the moon, end card
];

const project: Project = {
  title: 'Apple Cider and Cold Bones',
  song: 'song.mp3',
  timeline: (audio, lyrics) => {
    const L = lyrics.lines;
    const lines = L.map((l, i) => [l.words[0]!.start - 0.2, Math.min(L[i + 1] ? L[i + 1]!.words[0]!.start - 0.2 : l.end + 1, l.end + 1.5), l.text, l.words.map((w) => w.start)]);
    return SHOTS.map((s, i) => ({
      id: `s${i + 1}`, plate: () => import('./plates').then((m) => ({ default: m.CiderShot as any })),
      start: s.at, end: SHOTS[i + 1]?.at ?? audio.duration, params: { shot: s.shot, lines, lyric: 'pumpkin' },
      transition: s.tr ? { type: s.tr, duration: 0.5 } : undefined,
    }));
  },
};
export default project;
