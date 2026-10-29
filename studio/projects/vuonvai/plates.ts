// "Vươn Vai Đón Nắng" — a gouache-style painted music video: a brush paints each lyric moment over the previous
// picture (bright cream paper, flat broad strokes, sunny pastel palette); handwritten lyrics write themselves as sung;
// the title signs off at the end.
import * as THREE from 'three';
import { Plate, type FrameInfo, type Shot } from '../../src/core/plate';
import { OilPainter } from '../../src/kit/paint';
import { drawLyric } from '../../src/kit/lyricstyles';
import { brush, writeOn } from '../rose/plates';
import { REFS } from './refs';

const W = 1920, H = 1080;
type Stage = { ref: string; t0: number; t1: number };
export const STAGES: Stage[] = [
  { ref: 'street', t0: 0.8, t1: 11.0 },    // intro + "Sương mai vờn quanh góc phố thân quen"
  { ref: 'coffee', t0: 14.7, t1: 20.0 },   // "Hương cà phê sáng…"
  { ref: 'bicycle', t0: 20.4, t1: 24.6 },  // "Từng vòng xe quay nhanh…"
  { ref: 'walk', t0: 24.7, t1: 27.8 },     // "Bước chân em đi tìm lại chính bản thân mình"
  { ref: 'curtain', t0: 27.9, t1: 33.6 },  // "Nắng len qua rèm cửa…"
  { ref: 'song', t0: 33.8, t1: 38.6 },     // "Khúc ca hôm qua…"
  { ref: 'road', t0: 38.7, t1: 42.8 },     // "…chặng đường dài còn phía trước"
  { ref: 'smile', t0: 42.9, t1: 46.9 },    // "Em mỉm cười đón nhận ngày mới…"
  { ref: 'heart', t0: 47.0, t1: 55.8 },    // pre-chorus: "Trái tim này vẫn vẹn nguyên…"
  { ref: 'stretch', t0: 56.1, t1: 60.6 },  // "Đón ánh nắng ban mai… Em vươn vai…"
  { ref: 'dream', t0: 60.8, t1: 65.3 },    // "Tự tin… Vươn tới ước mơ xa bay mây"
  { ref: 'homeland', t0: 65.4, t1: 69.9 }, // "Lắng nghe giai điệu của quê hương…"
  { ref: 'hope', t0: 70.0, t1: 76.0 },     // "Nụ cười rạng rỡ… hy vọng"
  { ref: 'kites', t0: 76.5, t1: 91.5 },    // instrumental break (whistle)
  { ref: 'sky', t0: 92.4, t1: 96.9 },      // "Gió thổi vi vu qua những tán mây…"
  { ref: 'memories', t0: 97.0, t1: 100.5 },// "Kỷ niệm xưa…"
  { ref: 'stumble', t0: 100.6, t1: 105.8 },// "Có những vấp ngã…"
  { ref: 'simple', t0: 105.9, t1: 110.7 }, // "…những điều giản đơn bình dị"
  { ref: 'window', t0: 110.8, t1: 119.0 }, // "Khung cửa sổ mở ra… những nụ cười…"
  { ref: 'storm', t0: 119.1, t1: 123.6 },  // "Em không còn sợ hãi trước bão giông"
  { ref: 'friends', t0: 123.7, t1: 129.0 },// "…những người thương yêu đồng hành"
  { ref: 'lookback', t0: 129.1, t1: 138.0 },// bridge: "Nhìn lại chặng đường đã qua…"
  { ref: 'strong', t0: 138.2, t1: 146.3 }, // "…Mạnh mẽ và kiên cường hơn bao giờ hết"
  { ref: 'beach', t0: 146.5, t1: 153.3 },  // last chorus: "Đón ánh nắng… vươn vai…"
  { ref: 'terraces', t0: 153.4, t1: 160.0 },// "Lắng nghe giai điệu của quê hương…"
  { ref: 'final', t0: 160.1, t1: 172.0 },  // "Nụ cười rạng rỡ… hy vọng" + outro
];
const OPTS = (i: number) => ({ seed: 5 + i * 11, ground: '#f6ead6', brushes: [34, 17, 8.5, 4.2, 2.4], jitter: 0.42, threshold: 40, length: 1.6 });

export class GouacheSong extends Plate {
  scene = new THREE.Scene(); cam = new THREE.PerspectiveCamera();
  refs: HTMLCanvasElement[] = []; finals: HTMLCanvasElement[] = []; per: number[][] = [];
  live: { i: number; p: OilPainter } | null = null; frame = document.createElement('canvas');
  END = 172.5;
  override init() {
    let prev: HTMLCanvasElement | undefined;
    STAGES.forEach((st, i) => {
      const ref = REFS[st.ref]!(); this.refs.push(ref);
      const p = new OilPainter(ref, OPTS(i), prev); p.advanceTo(Infinity);
      this.per.push(p.layerPainted.map((x) => x ?? 0));
      const fin = document.createElement('canvas'); fin.width = W; fin.height = H; fin.getContext('2d')!.drawImage(p.canvas, 0, 0);
      this.finals.push(fin); prev = fin;
    });
    this.frame.width = W; this.frame.height = H;
  }
  shot(): Shot { return { scene: this.scene, camera: this.cam, post: { bloom: 0, vignette: 0, grain: 0 } }; }
  target(t: number, st: Stage, per: number[]) {
    const u = Math.max(0, Math.min(1, (t - st.t0) / (st.t1 - st.t0))) * per.length, li = Math.min(per.length - 1, Math.floor(u));
    return per.slice(0, li).reduce((a, b) => a + b, 0) + Math.round(per[li]! * Math.min(1, u - li));
  }
  override overlay(c: CanvasRenderingContext2D, f: FrameInfo) {
    const t = Math.floor(f.t * 12) / 12;
    let i = -1; STAGES.forEach((s, k) => { if (t >= s.t0 - 0.001) i = k; });
    let painter: OilPainter | null = null;
    if (i >= 0) {
      const st = STAGES[i]!, n = this.target(t, st, this.per[i]!);
      if (!this.live || this.live.i !== i || n < this.live.p.painted) this.live = { i, p: new OilPainter(this.refs[i]!, OPTS(i), i ? this.finals[i - 1] : undefined) };
      this.live.p.advanceTo(n); painter = this.live.p;
    }
    if (painter) painter.compose(c); else { c.fillStyle = '#f6ead6'; c.fillRect(0, 0, W, H); }
    if (painter && i >= 0) {
      const st = STAGES[i]!, on = Math.min(1, Math.max(0, (f.t - st.t0 + 0.5) / 0.5)) * Math.min(1, Math.max(0, (st.t1 + 0.6 - f.t) / 0.6));
      const rec = painter.recent.slice(-8);
      if (on > 0 && rec.length) {
        const bx = rec.reduce((a, r) => a + r.x, 0) / rec.length, by = rec.reduce((a, r) => a + r.y, 0) / rec.length;
        brush(c, bx + (1 - on) * 500, by - (1 - on) * 600, rec[rec.length - 1]!.col, 0.08 * Math.sin(f.t * 7) + 0.05 * Math.sin(f.t * 13), on);
      }
    }
    const clip = this.ctx.params.lines as [number, number, string, number[]][] | undefined;
    const L = clip?.find(([a, b]) => f.t >= a && f.t < b);
    if (L && f.t < this.END) drawLyric('handdark', c, L[2], f, [L[0], L[1]], 1000, L[3]);
    // title at the end
    const w = f.t - this.END;
    c.save(); c.shadowColor = 'rgba(255,250,235,1)'; c.shadowBlur = 24;
    writeOn(c, 'Vươn Vai Đón Nắng', 960, 200, 104, w / 1.6, '#7a3a1a');
    writeOn(c, 'Linh.NV', 960, 290, 48, (w - 1.6) / 0.8, '#5a3a24'); c.restore();
    const fade = Math.min(1, Math.max(0, (f.t - (this.ctx.end - 1.5)) / 1.5));
    if (fade > 0) { c.fillStyle = `rgba(0,0,0,${fade})`; c.fillRect(0, 0, W, H); }
  }
}
