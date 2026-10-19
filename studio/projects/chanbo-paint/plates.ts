// 2D oil painting for "Chăn bò": the painted frame is the whole picture (an empty 3D scene underneath).
// Painted "on twos" at 12 fps like a hand-painted film; strokes keep their places between frames, so only what moves
// is repainted. The cut into the chorus is a paint wipe: broad brush swaths of the pasture sweep over the office.
import * as THREE from 'three';
import { Plate, type FrameInfo, type Shot } from '../../src/core/plate';
import { paint, mulberry } from '../../src/kit/paint';
import { officeRef, pastureRef, skyFlow, type Anim } from './refs';

const PAINT_FPS = 12;
const W = 1920, H = 1080;

abstract class Painted extends Plate {
  scene = new THREE.Scene();
  cam = new THREE.PerspectiveCamera();
  private cache = new Map<number, HTMLCanvasElement>();
  abstract frame(t: number, beat: number): HTMLCanvasElement;
  shot(): Shot { return { scene: this.scene, camera: this.cam, post: { bloom: 0, vignette: 0, grain: 0 } }; }
  override overlay(c: CanvasRenderingContext2D, f: FrameInfo) {
    const k = Math.floor(f.t * PAINT_FPS + 1e-6);
    let img = this.cache.get(k);
    if (!img) {
      const t = k / PAINT_FPS;
      img = this.frame(t, this.ctx.audio.beatAt(t));
      this.cache.clear(); this.cache.set(k, img);
    }
    c.drawImage(img, 0, 0);
  }
}

// still look-dev frames
export class Office extends Painted {
  frame() { const ref = officeRef(); return this.ctx.params.ref ? ref : paint(ref, { seed: 11, ground: '#5a3a22', jitter: 0.55, threshold: 42 }); }
}
export class Pasture extends Painted {
  frame() { const ref = pastureRef(); return this.ctx.params.ref ? ref : paint(ref, { seed: 21, ground: '#8a5a32', jitter: 0.6, flow: skyFlow(), threshold: 42 }); }
}

/** The test clip: late-night office → paint wipe on the chorus downbeat → sunny pasture. */
export class Clip extends Painted {
  cut = this.ctx.params.cut as number;
  lines = (this.ctx.params.lines ?? []) as [number, number, string][];
  flow = skyFlow();
  frame(t: number, beat: number) {
    const { start, end } = this.ctx, cut = this.cut;
    const caption = this.lines.find(([a, b]) => t >= a && t < b)?.[2];
    const wipe = Math.max(0, Math.min(1, (t - (cut - 0.55)) / 1.1)); // paint swaths over ~1.1 s around the cut
    const A = (push: number): Anim => ({ t, beat, push, caption });
    if (wipe <= 0) return paint(officeRef(A(0.09 * (t - start) / (cut - start))), { seed: 11, ground: '#5a3a22', jitter: 0.55, threshold: 42 });
    const past = pastureRef({ ...A(0.06 * Math.max(0, t - cut) / (end - cut)), t: t - cut + 3 });
    if (wipe >= 1) return paint(past, { seed: 21, ground: '#8a5a32', jitter: 0.6, flow: this.flow, threshold: 42 });
    // mix: the office with brush swaths of the pasture laid over it, diagonal, one after another
    const ref = officeRef(A(0.09)), m = document.createElement('canvas'); m.width = W; m.height = H;
    const mc = m.getContext('2d')!, r = mulberry(5);
    mc.lineCap = 'round'; mc.strokeStyle = '#fff';
    const N = 9;
    for (let i = 0; i < N; i++) {
      const p = Math.max(0, Math.min(1, wipe * (N + 3) / 3 - i / 3)); // staggered
      if (p <= 0) continue;
      const y0 = -150 + (i / (N - 1)) * (H + 300) + (r() - 0.5) * 60, x0 = -200, x1 = W + 200;
      mc.lineWidth = 230 + r() * 80;
      mc.beginPath(); mc.moveTo(x0, y0 + 120); mc.quadraticCurveTo(W / 2, y0 - 80 + r() * 160, x0 + (x1 - x0) * p, y0 - 160 * p); mc.stroke();
    }
    mc.globalCompositeOperation = 'source-in'; mc.drawImage(past, 0, 0);
    ref.getContext('2d')!.drawImage(m, 0, 0);
    return paint(ref, { seed: 21, ground: '#6a4428', jitter: 0.6, flow: (x, y) => (wipe > 0.5 ? this.flow(x, y) : null), threshold: 42 });
  }
}

/** Same compositions, other 2D looks: watercolour, pixel art, Đông Hồ woodblock. */
import { watercolor, pixelArt, dongHo } from '../../src/kit/styles';
export class Styled extends Painted {
  frame(t: number, beat: number) {
    const A: Anim = { t: 3, beat: 0, push: 0 };
    const ref = this.ctx.params.scene === 'office' ? officeRef(A) : pastureRef(A);
    const st = this.ctx.params.style as 'water' | 'pixel' | 'dongho';
    return st === 'water' ? watercolor(ref, 3) : st === 'pixel' ? pixelArt(ref, 6) : dongHo(ref, 3);
  }
}
