// Review: the four lyric styles on the B+ village shot (wooden sign · handwriting · cowbell karaoke · stamps).
import type { Project } from '../../src/core/plate';

const P = () => import('../chanbo-lookdev/plates').then((m) => ({ default: m.Pasture as any }));
const project: Project = {
  title: 'Chăn bò · lyric styles',
  song: 'song.mp3',
  timeline: () => (['wood', 'hand', 'bell', 'stamp'] as const).map((lyric, i) => {
    const start = 50 + i * 2.5, end = start + 2.5, text = ['Chăn bò chăn bò ơi chăn bò', 'Về quê mình thôi ta đi chăn bò', 'Chăn bò chăn bò ơi chăn bò', 'Mảnh đất bình yên xanh rì màu cỏ'][i]!;
    return { id: lyric, plate: P, start, end, params: { look: 'plus', lyric, lines: [[start, end, text]] } };
  }),
};
export default project;
