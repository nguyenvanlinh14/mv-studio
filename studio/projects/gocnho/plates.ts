// "Góc Nhỏ Bình Yên" — a brush paints the song in oils: each lyric moment is a new painting laid over the last one,
// the brush following the strokes; handwritten lyrics write themselves as they are sung; at the end the canvas pulls
// back for the 20/10 wish to Thu and the little girl on her way.
import * as THREE from 'three';
import { Plate, type FrameInfo, type Shot } from '../../src/core/plate';
import { OilPainter } from '../../src/kit/paint';
import { drawLyric } from '../../src/kit/lyricstyles';
import { roseRef, bouquetRef, drawBloom, brush, writeOn } from '../rose/plates';
import { REFS } from './refs';

const W = 1920, H = 1080;

/** the last painting: the bouquet, a pale-pink rosebud tied in beside it, and two tiny footprints */
function bouquetBabyRef() {
  const cv = bouquetRef(), c = cv.getContext('2d')!;
  const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H; const t = tmp.getContext('2d')!;
  drawBloom(t, 960, 420, 1, 0);
  c.strokeStyle = '#4f7a30'; c.lineWidth = 10; c.beginPath(); c.moveTo(1190, 610); c.quadraticCurveTo(1150, 720, 1010, 830); c.stroke();
  c.save(); c.filter = 'hue-rotate(-12deg) saturate(0.55) brightness(1.75)'; c.translate(1205, 560); c.scale(0.42, 0.42); c.translate(-960, -420); c.drawImage(tmp, 0, 0); c.restore();
  const foot = (x: number, y: number, s: number, rot: number) => {
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s); c.fillStyle = '#f4a8bc';
    c.beginPath(); c.ellipse(0, 0, 26, 42, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(4, 52, 20, 18, 0, 0, 7); c.fill();
    [[-18, -48, 9], [-4, -55, 8], [10, -54, 7], [22, -48, 6], [30, -38, 5]].forEach(([tx, ty, r]) => { c.beginPath(); c.arc(tx!, ty!, r!, 0, 7); c.fill(); });
    c.restore();
  };
  foot(1330, 930, 1, -0.25); foot(1415, 880, 1, 0.15);
  return cv;
}

type Stage = { ref: () => HTMLCanvasElement; t0: number; t1: number };
export const STAGES: Stage[] = [
  { ref: REFS.room!, t0: 1.0, t1: 13.4 },        // intro + "Trong gian phòng yên bình hoa rơi nhè nhẹ"
  { ref: REFS.couple!, t0: 19.4, t1: 25.0 },     // "Ta bên nhau dịu dàng góc nhỏ bình yên"
  { ref: REFS.sunbreak!, t0: 25.6, t1: 31.4 },   // "Ánh mắt em sáng bừng xua tan muộn phiền"
  { ref: REFS.rain!, t0: 31.8, t1: 37.6 },       // "Nắm tay anh qua từng giông bão cuộc đời"
  { ref: REFS.sunrise!, t0: 37.9, t1: 43.8 },    // "Vợ ơi anh thương em nhiều lắm / Bình minh ấm áp luôn có em"
  { ref: REFS.home!, t0: 44.2, t1: 50.2 },       // "Hạnh phúc đơn sơ là thế đấy / Đi qua bão giông vẫn vẹn nguyên"
  { ref: REFS.road!, t0: 50.6, t1: 62.4 },       // "Dù cho mây mờ che lối về … trọn đời"
  { ref: REFS.tea!, t0: 63.8, t1: 69.8 },        // "Đêm buông lơi căn nhà thoảng hương trà thơm"
  { ref: REFS.sleep!, t0: 70.3, t1: 77.6 },      // "Ngắm môi em mỉm cười trong giấc ngủ say"
  { ref: REFS.stars!, t0: 78.0, t1: 87.0 },      // "Bao lo toan … hạnh phúc đong đầy"
  { ref: REFS.family!, t0: 88.8, t1: 98.0 },     // chorus 2: the two of them and the baby on the way
  { ref: REFS.nursery!, t0: 98.4, t1: 108.0 },   // the nursery waiting for our little girl
  { ref: REFS.garden!, t0: 108.5, t1: 125.0 },   // "Cảm ơn đời …" + interlude: the rose garden
  { ref: () => roseRef('dark'), t0: 127.4, t1: 136.6 }, // last chorus: one red rose
  { ref: bouquetBabyRef, t0: 137.0, t1: 151.0 }, // … the bouquet, a pink bud for her, tiny footprints
];
const OPTS = (i: number) => ({ seed: 3 + i * 7, ground: '#e8dcc4', jitter: 0.55, threshold: i === 0 ? 40 : 44 });

export class PaintedSong extends Plate {
  scene = new THREE.Scene(); cam = new THREE.PerspectiveCamera();
  refs: HTMLCanvasElement[] = []; finals: HTMLCanvasElement[] = []; per: number[][] = [];
  live: { i: number; p: OilPainter } | null = null; frame = document.createElement('canvas');
  WISH = 154.6;
  override init() {
    // dry run the whole chain once: stroke counts per layer and the finished picture of every stage
    let prev: HTMLCanvasElement | undefined;
    const pub = !!this.ctx.params.public; // public cut: no names, no baby details
    STAGES.forEach((st, i) => {
      const ref = pub && i === STAGES.length - 1 ? bouquetRef() : st.ref(); this.refs.push(ref);
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
    const t = Math.floor(f.t * 12) / 12; // painted on twos
    // which stage is live: the last one that has started
    let i = -1; STAGES.forEach((s, k) => { if (t >= s.t0 - 0.001) i = k; });
    let painter: OilPainter | null = null;
    if (i >= 0) {
      const st = STAGES[i]!, n = this.target(t, st, this.per[i]!);
      if (!this.live || this.live.i !== i || n < this.live.p.painted) this.live = { i, p: new OilPainter(this.refs[i]!, OPTS(i), i ? this.finals[i - 1] : undefined) };
      this.live.p.advanceTo(n); painter = this.live.p;
    }
    // canvas (blank before the first stroke), pulled back and slid left for the wish at the end
    const fc = this.frame.getContext('2d')!;
    if (painter) painter.compose(fc); else { fc.fillStyle = '#e8dcc4'; fc.fillRect(0, 0, W, H); }
    const pull = Math.min(1, Math.max(0, (f.t - this.WISH + 0.4) / 1.3)), e = pull * pull * (3 - 2 * pull), k = 1 - 0.24 * e, dx = -300 * e;
    if (e > 0) { c.fillStyle = '#1a0c0c'; c.fillRect(0, 0, W, H); }
    c.save(); c.translate(W / 2 + dx, H / 2); c.scale(k, k); c.translate(-W / 2, -H / 2); c.drawImage(this.frame, 0, 0);
    if (e > 0) { c.strokeStyle = `rgba(120,80,40,${0.6 * e})`; c.lineWidth = 10; c.strokeRect(0, 0, W, H); }
    c.restore();
    // the brush, while a stage is being painted
    if (painter && i >= 0) {
      const st = STAGES[i]!, on = Math.min(1, Math.max(0, (f.t - st.t0 + 0.5) / 0.5)) * Math.min(1, Math.max(0, (st.t1 + 0.6 - f.t) / 0.6));
      const rec = painter.recent.slice(-8);
      if (on > 0 && rec.length) {
        const bx = rec.reduce((a, r) => a + r.x, 0) / rec.length, by = rec.reduce((a, r) => a + r.y, 0) / rec.length;
        brush(c, bx + (1 - on) * 500, by - (1 - on) * 600, rec[rec.length - 1]!.col, 0.08 * Math.sin(f.t * 7) + 0.05 * Math.sin(f.t * 13), on);
      }
    }
    // lyrics write themselves as they are sung
    if (f.t < this.WISH) {
      const clip = this.ctx.params.lines as [number, number, string, number[]][] | undefined;
      const L = clip?.find(([a, b]) => f.t >= a && f.t < b);
      if (L) drawLyric('hand', c, L[2], f, [L[0], L[1]], 1000, L[3]);
    }
    // the wish
    const w = f.t - this.WISH - 1.0;
    if (this.ctx.params.public) {
      writeOn(c, 'Chúc mừng 20/10', 1590, 420, 78, w / 1.3, '#fff1d6');
      writeOn(c, 'Tặng vợ yêu', 1590, 545, 66, (w - 1.4) / 1.0, '#ffe2c8');
      writeOn(c, 'của anh ❤️', 1590, 635, 66, (w - 2.4) / 1.0, '#ffe2c8');
    } else {
      writeOn(c, 'Chúc mừng 20/10', 1590, 330, 78, w / 1.3, '#fff1d6');
      writeOn(c, 'Tặng Thu,', 1590, 450, 64, (w - 1.4) / 0.8, '#ffe2c8');
      writeOn(c, 'vợ yêu của anh ❤️', 1590, 535, 64, (w - 2.2) / 1.2, '#ffe2c8');
      writeOn(c, 'và công chúa nhỏ', 1590, 650, 64, (w - 3.7) / 1.1, '#ffd0dc');
      writeOn(c, 'sắp chào đời 🎀', 1590, 735, 64, (w - 4.8) / 1.0, '#ffd0dc');
    }
    const fade = Math.min(1, Math.max(0, (f.t - (this.ctx.end - 1.2)) / 1.2));
    if (fade > 0) { c.fillStyle = `rgba(0,0,0,${fade})`; c.fillRect(0, 0, W, H); }
  }
}
