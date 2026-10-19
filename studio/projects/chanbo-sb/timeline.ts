// Storyboard for the whole "Chăn bò ngày nắng" video (look B+): one cue per shot on the real song timeline.
// Built scenes render for real (village variants, tech campus); scenes still to build show as idea cards.
import type { Project } from '../../src/core/plate';

const P = (name: 'Pasture' | 'TechCity' | 'Card') => () => import('../chanbo-lookdev/plates').then((m) => ({ default: m[name] as any }));
type S = { at: number; v?: [string, string?, boolean?]; card?: string; tr?: 'whip' | 'zoom' | 'flash' | 'dissolve' };
// v = [camera preset, time of day, dancing cows]
export const SHOTS: S[] = [
  { at: 0, v: ['dawn', 'dawn'] },
  { at: 10, v: ['banyan', 'dawn'], tr: 'dissolve' },
  { at: 20, card: '“10 năm trước…” — làng quê tua ngược, chữ năm đếm lùi, chuyển về thành phố' },
  { at: 28.8, card: 'Lễ tốt nghiệp: mũ cử nhân tung lên trời, tấm bằng đỏ phát sáng trên bục' },
  { at: 34.2, tr: 'whip' },                                                   // tech campus
  { at: 39.5, card: 'Bàn code ban đêm: code chạy trên màn hình, núi cốc cà phê, cốc gấu trúc, đồng hồ quay nhanh' },
  { at: 44.9, card: 'Phòng họp: bảng biểu, lịch rơi lả tả, con dấu DEADLINE đỏ đập xuống theo beat' },
  { at: 50.2, v: ['wide'], tr: 'whip' },
  { at: 55.5, v: ['low'] },
  { at: 60.8, v: ['close'] },
  { at: 66.2, v: ['aerial'], tr: 'zoom' },
  { at: 74.2, card: 'Phòng lab AI: tủ server phát sáng, mạng nơ-ron 3D lơ lửng', tr: 'flash' },
  { at: 79.6, card: 'Bầu trời dữ liệu: máy ngửa lên, mây làm từ chữ và code, bầu trời thênh thang' },
  { at: 84.9, card: 'Tay robot giật phăng bàn phím khỏi bàn, màn hình AI tự gõ' },
  { at: 90.2, card: 'Bàn làm việc trống, mưa trên cửa kính đêm, thùng đồ cá nhân' },
  { at: 95.5, v: ['lotus'], tr: 'whip' },
  { at: 100.9, v: ['kites'] },
  { at: 106.2, v: ['road', 'sunset'] },
  { at: 111.6, v: ['aerial', 'sunset'], tr: 'dissolve' },
  { at: 122.2, card: 'Gập laptop chậm rãi, bụi bay lấp lánh trong nắng', tr: 'dissolve' },
  { at: 127.5, card: 'Con đường từ phố ra đồng: cao ốc lùi dần, ruộng lúa hiện ra' },
  { at: 132.9, card: 'Thông báo email, họp, deadline vỡ như bong bóng xà phòng trên cánh đồng' },
  { at: 138.2, v: ['road'] },
  { at: 143.6, v: ['wide', 'gold', true], tr: 'flash' },
  { at: 154.2, v: ['low', 'gold', true] },
  { at: 164.9, v: ['pullback', 'sunset'], tr: 'dissolve' },
  { at: 170.2, v: ['close', 'sunset'] },
  { at: 176, card: 'Kết: chuông bò ngân, chữ ký neon Linh.NV + github.com/nguyenvanlinh14/mv-studio', tr: 'dissolve' },
];

const project: Project = {
  title: 'Chăn bò · storyboard',
  song: 'song.mp3',
  timeline: (audio, lyrics) => {
    const L = lyrics.lines.filter((l) => l.words.length && !l.text.startsWith('('));
    const lines: [number, number, string, number[]][] = L.map((l, i) => [l.words[0]!.start - 0.2, Math.min(L[i + 1] ? L[i + 1]!.words[0]!.start - 0.2 : l.end + 1, l.end + 1.5), l.text, l.words.map((w) => w.start)]);
    return SHOTS.map((s, i) => {
      const end = SHOTS[i + 1]?.at ?? audio.duration;
      const base = { id: `s${i + 1}`, start: s.at, end, params: { lines, lyric: 'bell' } as Record<string, any>, transition: s.tr ? { type: s.tr, duration: 0.5 } : undefined };
      if (s.card) return { ...base, plate: P('Card'), params: { ...base.params, idea: s.card } };
      if (!s.v) return { ...base, plate: P('TechCity') };
      return { ...base, plate: P('Pasture'), params: { ...base.params, look: 'plus', shot: s.v[0], tod: s.v[1], dance: s.v[2] } };
    });
  },
};
export default project;
