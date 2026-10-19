// Look-dev plates for "Chăn bò": the neon office of the verses, then the pasture in two looks (real / toon),
// a chorus title in layered 3D type, and the cowbell close-up of the last line.
import * as THREE from 'three';
import { Plate, type FrameInfo, type Shot } from '../../src/core/plate';
import { makeStage } from '../../src/kit/stage';
import { Monitors, Dust } from '../../src/kit/neonenv';
import { NEON, NeonStrokes, arc, rrect, type Stroke } from '../../src/kit/neondraw';
import { Field, type CowSpec, type Look } from './field';
import { loadCow } from '../../src/kit/cowmodel';
import { VNField } from './vnfield';
import { drawLyric, type LyricStyle } from '../../src/kit/lyricstyles';

function label(c: CanvasRenderingContext2D, title: string, sub: string) {
  c.font = '600 22px "Plex Mono"'; c.fillStyle = '#F2EEE6'; c.fillText(title, 96, 92);
  c.font = '500 16px "Plex Mono"'; c.fillStyle = 'rgba(242,238,230,0.7)'; c.fillText(sub, 96, 120);
}
/** B+ lyrics: letters ride a wave that travels along the line, kicks harder on every beat, rise in one by one */
function waveCaption(c: CanvasRenderingContext2D, text: string, f: FrameInfo, span: [number, number], y: number) {
  const chars = [...text.normalize('NFC')];
  c.font = '900 66px "Archivo"'; c.lineJoin = 'round'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  const ws = chars.map((ch) => c.measureText(ch).width), total = ws.reduce((a, b) => a + b, 0);
  const P = Math.pow(1 - (f.beat - Math.floor(f.beat)), 3), clamp = (v: number) => Math.max(0, Math.min(1, v));
  let x = 960 - total / 2;
  chars.forEach((ch, i) => {
    const cx = x + ws[i]! / 2; x += ws[i]!;
    if (ch === ' ') return;
    const intro = clamp((f.t - span[0] - i * 0.025) / 0.35), e = 1 - Math.pow(1 - intro, 3), out = clamp((span[1] - f.t) / 0.22);
    const ph = i * 0.42 - f.beat * Math.PI, wave = Math.sin(ph);
    const dy = wave * (6 + 10 * P) - (1 - e) * 46, rot = Math.cos(ph) * 0.07, sc = (1 + 0.12 * P * Math.max(0, wave)) * (0.7 + 0.3 * e);
    c.save(); c.globalAlpha = Math.min(e, out); c.translate(cx, y + dy); c.rotate(rot); c.scale(sc, sc);
    c.lineWidth = 12; c.strokeStyle = 'rgba(30,24,18,0.85)'; c.strokeText(ch, 0, 0);
    c.fillStyle = '#FFF4D8'; c.fillText(ch, 0, 0);
    c.restore();
  });
  c.textAlign = 'left';
}

function caption(c: CanvasRenderingContext2D, text: string, look: Look | 'neon', y = 960, f?: FrameInfo, span?: [number, number], style?: LyricStyle, times?: number[]) {
  if (look === 'plus' && f && span && text && style && style !== 'wave') return drawLyric(style, c, text, f, span, y, times);
  if (look === 'plus' && f && span && text) return waveCaption(c, text, f, span, y);
  if (look === 'plus') { c.textAlign = 'center'; c.font = '900 64px "Archivo"'; c.lineJoin = 'round'; c.lineWidth = 12; c.strokeStyle = 'rgba(30,24,18,0.85)'; c.strokeText(text, 960, y); c.fillStyle = '#FFF4D8'; c.fillText(text, 960, y); c.textAlign = 'left'; return; }
  c.textAlign = 'center'; c.font = '900 64px "Archivo"'; c.lineJoin = 'round';
  if (look === 'toon') { c.lineWidth = 14; c.strokeStyle = '#1b1410'; c.strokeText(text, 960, y); c.fillStyle = '#FFE27A'; }
  else if (look === 'neon') { c.shadowColor = '#5ac8ff'; c.shadowBlur = 24; c.fillStyle = '#E8F8FF'; }
  else { c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 18; c.fillStyle = '#FFF1D6'; }
  c.fillText(text, 960, y); c.shadowBlur = 0; c.textAlign = 'left';
}
const beatInfo = (p: Plate & { ctx: any }, f: FrameInfo) => ({ t: f.t, beat: f.beat, bar: f.bar, beatAt: (t: number) => p.ctx.audio.beatAt(t) });

/** 1 · the dream: a neon glass tower drawn over rows of office monitors. */
export class Office extends Plate {
  stage = makeStage({ env: this.ctx.env, floor: 'mirror', fog: 0.03, keyLight: [4, 10, 6] });
  cam = new THREE.PerspectiveCamera(34, 16 / 9, 0.1, 300);
  mon = new Monitors(NEON.cyan, 8);
  dust = new Dust();
  tower = new NeonStrokes(towerStrokes(), [NEON.cyan, NEON.white, NEON.gold], { radius: 0.055 });
  override init() {
    this.stage.scene.add(this.mon.root, this.dust.root, this.tower.root);
    this.tower.root.position.set(0, 0.3, -14);
  }
  shot(f: FrameInfo): Shot {
    const B = beatInfo(this as any, f);
    this.mon.update(B); this.dust.update(B, {});
    this.tower.set({ draw: Math.min(1, 0.55 + f.progress), intensity: 2.2 + 0.6 * Math.pow(1 - (f.beat % 1), 3), frame: Math.round(f.t * 60) });
    this.cam.position.set(0.4 * Math.sin(f.local * 0.3), 1.9, 9 - f.local * 0.5);
    this.cam.lookAt(0, 5.0, -14);
    return { scene: this.stage.scene, camera: this.cam, post: { focus: 20, aperture: 10, bloom: 0.85, tint: [0.88, 0.98, 1.15] } };
  }
  override overlay(c: CanvasRenderingContext2D, f: FrameInfo) {
    const clip = this.ctx.params.lines as [number, number, string, number[]?][] | undefined;
    const L = clip?.find(([a, b]) => f.t >= a && f.t < b), span = L ? [L[0], L[1]] as [number, number] : undefined;
    if (!clip) label(c, '1 · VĂN PHÒNG NEON (Verse 1–2)', 'giữ look neon của video trước · toà nhà mơ ước vẽ bằng neon · không logo thật');
    caption(c, clip ? (clip.find(([a, b]) => f.t >= a && f.t < b)?.[2] ?? '') : 'Mơ Apple mơ Google sáng bừng một chân trời mới', 'neon', 960, f, span, this.ctx.params.lyric, L?.[3]);
  }
}
function towerStrokes(): Stroke[] {
  const s: Stroke[] = [{ pts: rrect(-1.6, 0, 1.6, 8.5, 0.15), c: 0 }];
  for (let y = 1; y < 8.2; y += 0.75) s.push({ pts: [[-1.35, y], [1.35, y]], c: 0 });
  s.push({ pts: [[0, 8.5], [0, 9.6]], c: 1 });
  s.push({ pts: arc(0, 10.3, 0.65, 0.65), c: 2 }, { pts: [[-0.3, 10.3], [-0.05, 10.05], [0.35, 10.6]], c: 2 }); // a "hired ✓" badge
  return s;
}

const HERD: CowSpec[] = [
  { x: -3.2, z: -7, rot: 0.4, coat: 'holstein', graze: 1 },
  { x: 2.6, z: -9.5, rot: 2.6, coat: 'yellow', graze: 0.9 },
  { x: 6.5, z: -14, rot: 1.2, coat: 'brown', graze: 1 },
  { x: -7.5, z: -15, rot: -0.6, coat: 'yellow', graze: 0.2 },
  { x: 0.5, z: -19, rot: 0.1, coat: 'holstein', graze: 1 },
  { x: -1.0, z: -2.8, rot: -2.4, coat: 'holstein', graze: 0, bell: true },
  { x: 10, z: -22, rot: 2.0, coat: 'brown', graze: 1 },
];

type V3 = [number, number, number];
/** camera presets for the village (B+): (seconds into shot, 0..1 progress) → position, target, fov */
const VILLAGE_SHOTS: Record<string, (L: number, p: number) => [V3, V3, number]> = {
  dawn: (L) => [[6 - L * 0.15, 2.4, 14 - L * 0.3], [-4, 4, -30], 34],
  banyan: (L) => [[-2 + L * 0.12, 1.6, 2 - L * 0.25], [-11.5, 6, -17], 40],
  low: (L) => [[-1.1, 0.42, -2.6 + L * 0.05], [0.9, 0.9, -16], 38],
  close: (L) => [[4.9 + L * 0.03, 1.0, -8.6], [3.2, 0.7, -6.3], 30],
  aerial: (_L, p) => [[16 - p * 6, 11 + p * 7, 12 - p * 8], [1, 0, -30], 42],
  lotus: (L) => [[-3.6 + L * 0.1, 0.55, 1.6], [-7, 0.0, -4.5], 34],
  kites: (L) => [[6 + L * 0.1, 1.2, -12], [32, 20, -82], 30],
  road: (L) => [[3.4, 1.4, 1 - L * 0.5], [1, 1, -30], 34],
  wide: (L) => [[4.6 - L * 0.2, 1.85 + L * 0.04, 9 - L * 0.4], [-2.5, 3.0, -30], 32],
  pullback: (_L, p) => [[-9 + p * 4, 2 + p * 6, -9 + p * 22], [-11, 5, -19], 36],
};

/** one village per time of day, shared by every cue (plates are never disposed, a VNField is heavy) */
const villages = new Map<string, Promise<VNField>>();
export function sharedVillage(r: THREE.WebGLRenderer, tod: 'dawn' | 'gold' | 'sunset') {
  if (!villages.has(tod)) villages.set(tod, loadCow().then((a) => { const v = new VNField(r, { tod }); v.useModels(a); return v; }));
  return villages.get(tod)!;
}

abstract class FieldPlate extends Plate {
  look = (this.ctx.params.look ?? 'real') as Look;
  field!: any; // Field, or VNField for the B+ look
  cam = new THREE.PerspectiveCamera(32, 16 / 9, 0.1, 4000);
  override async init() {
    if (this.look === 'plus') { this.field = await sharedVillage(this.ctx.renderer, this.ctx.params.tod ?? 'gold'); return; }
    this.field = new Field(this.look, this.ctx.renderer, { herd: HERD });
  }
  get post() {
    if (this.look === 'plus') return { bloom: 0.3, vignette: 0.22, grain: 0.015, exposure: 0.5, tint: [1.0, 1.0, 1.02] as [number, number, number] };
    return this.look === 'toon'
      ? { bloom: 0.25, vignette: 0.18, grain: 0.012, exposure: 1.0, tint: [1, 1, 1] as [number, number, number] }
      : { bloom: 0.45, vignette: 0.32, grain: 0.03, exposure: 0.8, tint: [1.05, 0.98, 0.9] as [number, number, number] };
  }
}

/** 2/3 · the meadow, wide: slow dolly over the grass toward the herd. */
/** the song title over the first village shot: rises in, holds, fades */
function drawTitle(c: CanvasRenderingContext2D, f: FrameInfo, start: number, end: number) {
  const a = Math.min(1, Math.max(0, (f.t - start - 0.15) / 0.5)) * Math.min(1, Math.max(0, (end - 0.4 - f.t) / 0.6));
  if (a <= 0) return;
  const rise = (1 - Math.min(1, (f.t - start) / 0.6)) * 30;
  c.save(); c.globalAlpha = a; c.textAlign = 'center'; c.shadowColor = 'rgba(40,20,0,0.65)'; c.shadowBlur = 26;
  c.font = '700 150px "Marker Felt", "Archivo"'; c.fillStyle = '#fff1cc'; c.fillText('Chăn bò ngày nắng', 960, 470 + rise);
  c.font = '500 40px "Plex Mono"'; c.fillStyle = '#ffe2a0'; c.fillText('một bài hát tự trào cho dân công nghệ', 960, 545 + rise);
  c.restore();
}

export class Pasture extends FieldPlate {
  shot(f: FrameInfo): Shot {
    if (this.look === 'plus') { this.field.t0 = this.ctx.start; this.field.dance = !!this.ctx.params.dance; }
    this.field.update(f.t, f.beat);
    const shotName = this.ctx.params.shot as string | undefined, L = f.local, p = f.progress;
    if (this.look === 'plus' && shotName && VILLAGE_SHOTS[shotName]) { const [pos, at, fov] = VILLAGE_SHOTS[shotName]!(L, p); this.cam.fov = fov; this.cam.updateProjectionMatrix(); this.cam.position.set(...pos); this.cam.lookAt(...at); }
    else if (this.look === 'plus') { this.cam.position.set(4.6 - L * 0.2, 1.85 + L * 0.04, 9 - L * 0.4); this.cam.lookAt(-2.5, 3.0, -30); }
    else { this.cam.position.set(1.5 - f.local * 0.25, 1.35, 6.5 - f.local * 0.4); this.cam.lookAt(-1.5, 2.2, -20); }
    return { scene: this.field.scene, camera: this.cam, post: { ...this.post, focus: 12, aperture: this.look === 'toon' ? 0 : this.look === 'plus' ? 4 : 7 } };
  }
  override overlay(c: CanvasRenderingContext2D, f: FrameInfo) {
    if (this.ctx.params.title) drawTitle(c, f, this.ctx.start, this.ctx.end);
    const clip = this.ctx.params.lines as [number, number, string, number[]?][] | undefined;
    const L = clip?.find(([a, b]) => f.t >= a && f.t < b), span = L ? [L[0], L[1]] as [number, number] : undefined;
    if (clip) {} else if (this.look === 'toon') label(c, '3 · ĐỒNG CỎ — B · HOẠT HÌNH CEL-SHADING', 'toon 4 bậc sáng · viền mực · trời gradient + mây · cỏ lay theo gió');
    else label(c, '2 · ĐỒNG CỎ — A · CHÂN THỰC NẮNG VÀNG', 'three.js Sky · ngược sáng hoàng hôn · sương · 140k ngọn cỏ lay gió · DOF');
    caption(c, clip ? (clip.find(([a, b]) => f.t >= a && f.t < b)?.[2] ?? '') : 'Mảnh đất bình yên xanh rì màu cỏ', this.look, 960, f, span, this.ctx.params.lyric, L?.[3]);
  }
}

/** 4/5 · chorus title: "CHĂN BÒ" as layered 3D type standing in the field, pops on the beat. */
export class Chorus extends FieldPlate {
  text = new THREE.Group();
  override async init() {
    await super.init();
    const toon = this.look === 'toon', styl = this.look !== 'real';
    const tex = (stroke: number) => {
      const cv = document.createElement('canvas'); cv.width = 2048; cv.height = 640;
      const x = cv.getContext('2d')!; x.font = '900 300px "Archivo"'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff';
      if (stroke) { x.lineWidth = stroke; x.lineJoin = 'round'; x.strokeStyle = '#fff'; x.strokeText('CHĂN BÒ', 1024, 340); }
      x.fillText('CHĂN BÒ', 1024, 340);
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
    };
    const face = tex(0), fat = tex(40), W = 9, H = (W * 640) / 2048, L = 26;
    for (let i = 0; i < L; i++) {
      const front = i === L - 1;
      const col = new THREE.Color(front ? (styl ? 0xffd84a : 0xfff0d2) : styl ? 0xe0482f : 0xb8432a).multiplyScalar((front ? 1 : 0.65 + 0.35 * (i / L)) * (this.look === 'plus' ? 0.85 : 1));
      const m = toon ? new THREE.MeshToonMaterial({ color: col, map: face, alphaTest: 0.5, side: THREE.DoubleSide })
        : new THREE.MeshStandardMaterial({ color: col, map: face, alphaTest: 0.5, roughness: 0.45, side: THREE.DoubleSide, emissive: col, emissiveIntensity: this.look === 'plus' ? (front ? 0.3 : 0.08) : front ? 0.35 : 0.12, emissiveMap: face });
      const p = new THREE.Mesh(new THREE.PlaneGeometry(W, H), m); p.position.z = i * 0.018; p.castShadow = true; this.text.add(p);
    }
    if (toon) for (const z of [-0.02, (L - 1) * 0.018 - 0.004]) {
      const ink = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ color: 0x1b1410, map: fat, alphaTest: 0.5, side: THREE.DoubleSide }));
      ink.position.z = z; this.text.add(ink);
    }
    this.text.position.set(styl ? 0 : 2.2, styl ? 3.4 : 2.6, styl ? -9 : -6.5); this.text.rotation.y = styl ? 0.12 : -0.15;
    if (this.ctx.params.title !== false) this.field.scene.add(this.text); // title: false → same shot, no 3D lettering
  }
  shot(f: FrameInfo): Shot {
    this.field.update(f.t, f.beat);
    const ph = f.beat % 1, pop = 1 + 0.06 * Math.pow(1 - ph, 4);
    this.text.scale.setScalar(pop); this.text.rotation.z = 0.03 * Math.sin(f.t * 1.4);
    if (this.look === 'plus') this.cam.position.set(-1.2 + f.local * 0.3, 1.7, 6); else this.cam.position.set(-3.2 + f.local * 0.3, 1.1, 5.5);
    if (this.look !== 'real') this.cam.lookAt(0, 2.8, -9); else this.cam.lookAt(2.4, 2.2, -6.5);
    return { scene: this.field.scene, camera: this.cam, post: { ...this.post, focus: this.look === 'real' ? 12 : 14, aperture: this.look === 'toon' ? 0 : this.look === 'plus' ? 3 : 5 } };
  }
  override overlay(c: CanvasRenderingContext2D, f: FrameInfo) {
    const clip = this.ctx.params.lines as [number, number, string, number[]?][] | undefined;
    const L = clip?.find(([a, b]) => f.t >= a && f.t < b), span = L ? [L[0], L[1]] as [number, number] : undefined;
    if (!clip) label(c, `${this.look === 'toon' ? '5' : '4'} · ĐIỆP KHÚC — CHỮ 3D NỔI (${this.look === 'toon' ? 'B · hoạt hình' : 'A · chân thực'})`, 'chữ tiếng Việt đủ dấu · đập theo beat · đứng giữa đồng cỏ');
    if (clip) caption(c, L?.[2] ?? '', this.look, 960, f, span, this.ctx.params.lyric, L?.[3]);
  }
}

/** 6 · last line: macro on the bell of the lead cow, the herd and the low sun behind turn to bokeh. */
export class Bell extends FieldPlate {
  shot(f: FrameInfo): Shot {
    this.field.update(f.t, f.beat);
    const lead = this.field.cows.find((c: { spec: CowSpec }) => c.spec.bell)!.cow;
    lead.root.updateMatrixWorld(true);
    const b = lead.bell.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, -0.22, 0));
    this.cam.position.copy(lead.root.localToWorld(new THREE.Vector3(3.0 + f.local * 0.03, 1.05, 2.2)));
    this.cam.lookAt(b.clone().add(new THREE.Vector3(0, 0.12, 0)));
    this.cam.fov = 28; this.cam.updateProjectionMatrix();
    return { scene: this.field.scene, camera: this.cam, post: { ...this.post, focus: this.cam.position.distanceTo(b), aperture: this.look === 'toon' ? 2 : 30 } };
  }
  override overlay(c: CanvasRenderingContext2D, f: FrameInfo) {
    const clip = this.ctx.params.lines as [number, number, string, number[]?][] | undefined;
    const L = clip?.find(([a, b]) => f.t >= a && f.t < b), span = L ? [L[0], L[1]] as [number, number] : undefined;
    if (!clip) label(c, `6 · OUTRO — CHUÔNG BÒ (${this.look === 'toon' ? 'B' : 'A'})`, 'cận chuông đồng lắc theo nhịp · đàn bò + mặt trời thành bokeh');
    caption(c, clip ? (clip.find(([a, b]) => f.t >= a && f.t < b)?.[2] ?? '') : 'Bình yên là đây chẳng đâu xa vời', this.look, 960, f, span, this.ctx.params.lyric, L?.[3]);
  }
}

/** The dream-job campus: low camera on the plaza, dollying in and tilting up at the glass towers. */
import { City } from './city';
export class TechCity extends Plate {
  city!: City;
  cam = new THREE.PerspectiveCamera(38, 16 / 9, 0.5, 6000);
  override init() { this.city = new City(this.ctx.renderer); }
  shot(f: FrameInfo): Shot {
    const e = f.progress * f.progress * (3 - 2 * f.progress);
    this.cam.position.set(4 - 3 * e, 1.6 + 1.2 * e, 42 - 16 * e);
    this.cam.lookAt(-2, 18 + 52 * e, -250);
    return { scene: this.city.scene, camera: this.cam, post: { bloom: 0.3, vignette: 0.22, grain: 0.015, exposure: 0.5, focus: 200, aperture: 1.5 } };
  }
  override overlay(c: CanvasRenderingContext2D, f: FrameInfo) {
    const clip = this.ctx.params.lines as [number, number, string, number[]?][] | undefined;
    const L = clip?.find(([a, b]) => f.t >= a && f.t < b), span = L ? [L[0], L[1]] as [number, number] : undefined;
    if (L) caption(c, L[2], 'plus', 960, f, span, this.ctx.params.lyric, L?.[3]);
  }
}

/** Storyboard placeholder for a scene not built yet: warm card with the shot idea. */
export class Card extends Plate {
  scene = new THREE.Scene(); cam = new THREE.PerspectiveCamera();
  shot(): Shot { return { scene: this.scene, camera: this.cam, post: { bloom: 0, vignette: 0, grain: 0 } }; }
  override overlay(c: CanvasRenderingContext2D, f: FrameInfo) {
    const g = c.createLinearGradient(0, 0, 0, 1080); g.addColorStop(0, '#2b2a3a'); g.addColorStop(1, '#4a3a2a');
    c.fillStyle = g; c.fillRect(0, 0, 1920, 1080);
    c.textAlign = 'center'; c.fillStyle = '#f2c14e'; c.font = '700 44px "Plex Mono"'; c.fillText('CẢNH MỚI · SẼ DỰNG 3D', 960, 300);
    c.fillStyle = '#fff4d8'; c.font = '900 72px "Archivo"';
    const words = String(this.ctx.params.idea ?? '').split(' '); let line = '', y = 470;
    for (const w of words) { const t = line ? line + ' ' + w : w; if (c.measureText(t).width > 1600) { c.fillText(line, 960, y); y += 92; line = w; } else line = t; }
    if (line) c.fillText(line, 960, y);
    c.textAlign = 'left';
    const clip = this.ctx.params.lines as [number, number, string, number[]?][] | undefined;
    const L = clip?.find(([a, b]) => f.t >= a && f.t < b);
    if (L) drawLyric('bell', c, L[2], f, [L[0], L[1]], 960, L[3]);
  }
}
