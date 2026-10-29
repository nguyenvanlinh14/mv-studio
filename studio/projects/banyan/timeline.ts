// "The Banyan Weeps Blood" — Vietnamese folk horror, 9:16 only (render with --size 1080x1920).
// 104 BPM, bar = 2.307 s, chorus 1 starts on the downbeat at 39.88 s. Lyrics: 'ghost' karaoke.
// Chorus shots run under a blood moon with rising ash (k merges over each shot's own knobs).
import type { Project } from '../../src/core/plate';

type K = Partial<Record<'wake' | 'bleed' | 'blight' | 'ash' | 'bloodMoon' | 'reach', number>>;
type S = { at: number; shot: string; tr?: 'whip' | 'zoom' | 'flash' | 'dissolve'; k?: K };
const CH: K = { bloodMoon: 1, ash: 1 };
export const SHOTS: S[] = [
  // intro + verse 1: the moon over the banyan, then closer and closer to what lives in it
  { at: 0, shot: 'moonwide' },                              // intro; "Old banyan roots deep within the earth" (11.8)
  { at: 14.5, shot: 'tree', tr: 'dissolve' },
  { at: 16.81, shot: 'roots', tr: 'dissolve' },             // "A forgotten spirit wakes and calls tonight"
  { at: 19.12, shot: 'hollow', tr: 'whip', k: { wake: 1 } },
  { at: 21.43, shot: 'ghost', tr: 'dissolve' },             // "Through the heavy mist where shadows turn and bend"
  { at: 26.04, shot: 'gate', tr: 'dissolve' },              // "Seeking what was lost in the endless dark"
  // pre-chorus
  { at: 28.35, shot: 'hollow', tr: 'dissolve', k: { wake: 0.6 } },  // "Step close to the hollow trunk"
  { at: 32.96, shot: 'ghost', tr: 'dissolve' },                       // "Listen to the whispered plea now"
  { at: 35.27, shot: 'reach', tr: 'whip', k: { reach: 1 } },          // "Branches reach to grasp your hand"
  { at: 37.58, shot: 'tree', tr: 'dissolve', k: { wake: 1 } },        // "In this hour of Halloween dread"
  // chorus 1
  { at: 39.88, shot: 'ash', tr: 'flash', k: CH },           // "Rise from the ash now"
  { at: 42.19, shot: 'hollow', tr: 'whip', k: CH },
  { at: 44.5, shot: 'ghost', tr: 'dissolve', k: { ...CH, reach: 1 } }, // "Heal the broken vows tonight"
  { at: 48.38, shot: 'blood', tr: 'flash', k: CH },         // "Banyan tree is weeping blood"
  { at: 51.42, shot: 'reach', tr: 'whip', k: CH },
  { at: 53.73, shot: 'tree', tr: 'dissolve', k: { ...CH, wake: 1 } },  // "Ancient spirits take their flight"
  { at: 56.03, shot: 'gate', tr: 'dissolve', k: { ...CH, blight: 1 } },
  // verse 2
  { at: 58.34, shot: 'river', tr: 'dissolve' },             // "Bury the truth in the river mud" / "…cannot wash away the past"
  { at: 68.8, shot: 'leaves', tr: 'dissolve', k: { blight: 1 } },    // "Leaves are turning black under the cold moon"
  { at: 73.2, shot: 'ghost', tr: 'dissolve', k: { blight: 1 } },      // "And the restless dead will never find peace"
  // chorus 2
  { at: 76.8, shot: 'ash', tr: 'flash', k: CH },
  { at: 79.1, shot: 'hollow', tr: 'whip', k: CH },
  { at: 81.41, shot: 'ghost', tr: 'dissolve', k: { ...CH, reach: 1 } },
  { at: 85.1, shot: 'blood', tr: 'flash', k: CH },
  { at: 88.33, shot: 'reach', tr: 'whip', k: CH },
  { at: 90.64, shot: 'tree', tr: 'dissolve', k: { ...CH, wake: 1 } },
  { at: 92.95, shot: 'gate', tr: 'dissolve', k: { ...CH, blight: 1 } },
  // instrumental: the blood moon over the village
  { at: 95.25, shot: 'moonwide', tr: 'dissolve', k: CH },
  { at: 99.87, shot: 'river', tr: 'dissolve', k: CH },
  { at: 104.48, shot: 'leaves', tr: 'dissolve', k: { ...CH, blight: 1 } },
  { at: 109.1, shot: 'ghost', tr: 'dissolve', k: { bloodMoon: 1 } },
  // bridge
  { at: 113.71, shot: 'reach', tr: 'flash', k: { reach: 1, wake: 1 } }, // "If you hear the branches creek and moan"
  { at: 118.33, shot: 'gate', tr: 'whip' },                             // "Do not look behind or try to run"
  { at: 120.63, shot: 'ghost', tr: 'dissolve', k: { reach: 1 } },       // "The banyan tree has claimed its final soul"
  { at: 125.25, shot: 'hollow', tr: 'whip', k: { wake: 1, bleed: 1 } }, // "And the ritual is finally done tonight"
  // last chorus
  { at: 127.55, shot: 'ash', tr: 'flash', k: CH },
  { at: 129.86, shot: 'hollow', tr: 'whip', k: CH },
  { at: 132.17, shot: 'ghost', tr: 'dissolve', k: { ...CH, reach: 1 } },
  { at: 135.63, shot: 'blood', tr: 'flash', k: CH },
  { at: 139.09, shot: 'reach', tr: 'whip', k: CH },
  { at: 141.4, shot: 'tree', tr: 'dissolve', k: { ...CH, wake: 1 } },  // "Ancient spirits take their flight"
  { at: 146.01, shot: 'moonwide', tr: 'dissolve' },                     // the moon is white again; end card
];

const project: Project = {
  title: 'The Banyan Weeps Blood',
  song: 'song.mp3',
  timeline: (audio, lyrics) => {
    const L = lyrics.lines;
    const lines = L.map((l, i) => [l.words[0]!.start - 0.2, Math.min(L[i + 1] ? L[i + 1]!.words[0]!.start - 0.2 : l.end + 1, l.end + 1.5), l.text, l.words.map((w) => w.start)]);
    return SHOTS.map((s, i) => ({
      id: `s${i + 1}`, plate: () => import('./plates').then((m) => ({ default: m.BanyanShot as any })),
      start: s.at, end: SHOTS[i + 1]?.at ?? audio.duration, params: { shot: s.shot, lines, lyric: 'ghost', k: s.k, pbr: true, endcard: i === SHOTS.length - 1 },
      transition: s.tr ? { type: s.tr, duration: 0.4 } : undefined,
    }));
  },
};
export default project;
