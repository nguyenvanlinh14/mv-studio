// The jelly couple shot (9:16): a slow drifting camera on the pair, jelly lyrics that squash in on each sung word.
import * as THREE from 'three';
import { Plate, type FrameInfo, type Shot } from '../../src/core/plate';
import { W, H } from '../../src/core/engine';
import { World, type Backdrop } from './world';

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const COLS = ['#ff6f9c', '#4fb8ff', '#ffb43d', '#5ccf96'];

export class JellyShot extends Plate {
  cam = new THREE.PerspectiveCamera(42, W / H, 0.05, 200);
  world!: World;
  beatSec = 60 / this.ctx.audio.bpm;
  override init() { this.world = new World(this.ctx.env, (this.ctx.params.bg ?? 'room') as Backdrop); }

  shot(f: FrameInfo): Shot {
    this.world.update(f.t, f.beat, this.beatSec);
    const L = f.local, a = Math.sin(L * 0.18) * 0.22;
    this.cam.position.set(Math.sin(a) * 4.9, 1.15 + Math.sin(L * 0.3) * 0.05, Math.cos(a) * 4.9);
    this.cam.lookAt(0, 1.05, 0);
    return { scene: this.world.scene, camera: this.cam, post: { bloom: 0.3, bloomThreshold: 1.2, vignette: 0.22, grain: 0.015, exposure: 0.8, focus: 4.9, aperture: 2, tint: [1.02, 0.99, 1.0] } };
  }

  override overlay(c: CanvasRenderingContext2D, f: FrameInfo) {
    if (this.ctx.params.label) { c.font = '600 34px "Plex Mono"'; c.fillStyle = '#5a2a3a'; c.fillText(this.ctx.params.label, 40, 80); }
    const line = this.ctx.lyrics.lines.find((l) => f.t >= l.start - 0.3 && f.t < l.end + 0.5);
    if (line) jellyLyric(c, line.words.map((w) => ({ w: w.w, t: w.start })), f.t, line.start - 0.3, line.end + 0.5, H * 0.83);
  }
}

/** a lyric line whose words squash in like jelly when they are sung */
function jellyLyric(c: CanvasRenderingContext2D, ws: { w: string; t: number }[], t: number, t0: number, t1: number, y: number) {
  c.font = '800 76px "Chalkboard SE", "Marker Felt", "Archivo"'; c.lineJoin = 'round'; c.textAlign = 'center';
  const sp = c.measureText(' ').width, widths = ws.map((w) => c.measureText(w.w).width);
  const total = widths.reduce((a, b) => a + b, 0) + sp * (ws.length - 1);
  const rows = total > W * 0.86 ? 2 : 1, rowH = 96;
  const rowOf: number[] = []; let acc = 0;
  ws.forEach((_, i) => { rowOf.push(rows === 2 && acc > total / 2 ? 1 : 0); acc += widths[i]! + sp; });
  const rowW = [0, 1].map((r) => ws.reduce((a, _, i) => a + (rowOf[i] === r ? widths[i]! + sp : 0), 0) - sp);
  const cursor = [W / 2 - rowW[0]! / 2, W / 2 - rowW[1]! / 2];
  c.save(); c.globalAlpha = Math.min(clamp((t - t0) / 0.25), clamp((t1 - t) / 0.3));
  ws.forEach((w, i) => {
    const r = rowOf[i]!, wy = y - (rows - 1 - r) * rowH, cx = cursor[r]! + widths[i]! / 2;
    cursor[r]! += widths[i]! + sp;
    const tau = t - w.t, sung = tau >= 0;
    const s = sung ? -0.38 * Math.exp(-tau / 0.13) * Math.cos(tau * 26) : 0; // squash then wobble, like the bodies
    const sy = 1 + s, sx = 1 / Math.sqrt(sy);
    c.save(); c.translate(cx, wy); c.scale(sx, sy);
    c.shadowColor = 'rgba(120,40,70,0.35)'; c.shadowBlur = 18; c.shadowOffsetY = 6;
    c.lineWidth = 16; c.strokeStyle = '#ffffff'; c.strokeText(w.w, 0, 0);
    c.shadowColor = 'transparent';
    c.fillStyle = sung ? COLS[i % COLS.length]! : 'rgba(150,110,125,0.55)'; c.fillText(w.w, 0, 0);
    c.restore();
  });
  c.restore();
}
