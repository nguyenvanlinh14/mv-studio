// LOADING — pre-chorus + the voice-over break before the first drop.
// A C2 figure at a pedestal with an ENTER key, a vertical ring of keys spinning like a loader behind it,
// a 3D "Proceed?" dialog that pops on its word (figure slams the key on "yes!"); then the break: lights drop,
// "First it learned to type…" is typed, the Trump line pushes ARTIFICIAL on screen which glitches into SUPER,
// and a white flash lands the drop.
import * as THREE from 'three';
import { Plate, type FrameInfo, type Shot } from '../../../src/core/plate';
import type { Line } from '../../../src/core/lyrics';
import { KeyBank, pressAt, glowAt } from '../../../src/kit/keys';
import { makeStage } from '../../../src/kit/stage';
import { NeonBust } from '../../../src/kit/neonbust';
import { slamLine, typed, glitchWord, font } from '../../../src/kit/type';

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const prog = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const ease = (x: number) => x * x * (3 - 2 * x);
const N = 30;

export default class Loading extends Plate {
  stage = makeStage({ env: this.ctx.env, floor: 'mirror', fog: 0.045, keyLight: [4, 8, 6], shadowSize: 10 });
  keys = new KeyBank(N + 2);
  cam = new THREE.PerspectiveCamera(32, 16 / 9, 0.1, 200);
  bust = new NeonBust();
  siAt = 0;
  dialog!: THREE.Mesh;
  dctx!: CanvasRenderingContext2D;
  dtex!: THREE.CanvasTexture;
  lines: Line[] = [];
  ask = 0; yes = 0; brk = { start: 0, end: 0, trump: 0 };
  slams: number[] = [];

  override init() {
    const s = this.stage.scene;
    this.keys.addTo(s);
    s.add(this.bust.root);
    this.bust.root.position.set(0.1, 1.72, -0.35); this.bust.root.scale.setScalar(0.52);
    const ped = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.86, 0.6), new THREE.MeshPhysicalMaterial({ color: 0x15161a, roughness: 0.4, clearcoat: 0.6 }));
    ped.position.set(0.05, 0.43, 0.55); ped.castShadow = ped.receiveShadow = true; s.add(ped);
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 512;
    this.dctx = cv.getContext('2d')!;
    this.dtex = new THREE.CanvasTexture(cv); this.dtex.colorSpace = THREE.SRGBColorSpace;
    this.dialog = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), new THREE.MeshBasicMaterial({ map: this.dtex, transparent: true, toneMapped: false }));
    this.dialog.position.set(1.55, 1.25, 0.1); this.dialog.rotation.y = -0.35;
    s.add(this.dialog);
    const { lyrics, params } = this.ctx;
    this.lines = lyrics.linesIn(this.ctx.start, params.breakStart);
    const words = this.lines.flatMap((l) => l.words);
    this.ask = words.find((w) => /proceed/i.test(w.w))?.start ?? 0;
    this.yes = words.find((w) => /^yes/i.test(w.w))?.start ?? 0;
    this.brk = { start: params.breakStart, end: params.breakEnd, trump: params.breakStart + params.trumpAt };
    this.slams = [this.yes, ...words.filter((w) => /^(hand|one|thing|now)/i.test(w.w)).map((w) => w.start)];
    this.siAt = this.lines[this.lines.length - 1]?.start ?? this.yes + 1;
  }

  shot(f: FrameInfo): Shot {
    const t = f.t, b = this.brk;
    const inBreak = t >= b.start && t < b.end;
    const dark = ease(prog(t, b.start - 0.2, b.start + 0.6)) * (1 - prog(t, b.end - 0.05, b.end + 0.1));
    this.stage.scene.environmentIntensity = 0.35 * (1 - 0.8 * dark);
    this.stage.key.intensity = 2.4 * (1 - 0.85 * dark);
    // spinner ring: speeds up through the pre-chorus, freezes in the break
    const spin = (Math.min(t, b.start) - this.ctx.start) * (1.5 + 0.12 * (Math.min(t, b.start) - this.ctx.start)) ;
    const k = this.keys; k.begin();
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const head = ((spin - a) / (Math.PI * 2)) % 1, hh = head < 0 ? head + 1 : head;
      const lit = inBreak ? 0.02 + 0.5 * glowAt(t, b.trump + 3.0, 0.4) : Math.pow(1 - hh, 5);
      k.add({ pos: { x: 0.1 + Math.cos(a) * 1.55, y: 1.65 + Math.sin(a) * 1.55, z: -1.6 }, rot: [Math.PI / 2, 0, -a], scale: 0.32, glow: lit, legend: false });
    }
    let lastSlam = -99; for (const s of this.slams) if (s <= t) lastSlam = s;
    k.add({ pos: { x: 0.05, y: 0.86 + 0.11, z: 0.55 }, scale: 0.45, press: pressAt(t, lastSlam), glow: 0.12 + 0.8 * glowAt(t, lastSlam, 0.5) + 0.8 * glowAt(t, b.end, 0.4) });
    k.end();
    // AI → SI: traced in blue through the pre-chorus, glitches on "yes!", turns orange-gold SI on the last line
    const fi = Math.round(t * 60);
    const draw = ease(prog(t, this.ctx.start + 0.3, this.yes - 0.3));
    const flick = t >= this.yes && t < this.siAt ? (fi % 6 < 3 ? 0.85 : 0) : 0;
    const heat = Math.max(ease(prog(t, this.siAt - 0.05, this.siAt + 0.4)), flick);
    const glitch = Math.max(Math.pow(Math.max(0, 1 - Math.abs(t - this.yes) / 0.35), 2), 0.6 * Math.pow(Math.max(0, 1 - Math.abs(t - this.siAt) / 0.25), 2));
    const halo = ease(prog(t, this.siAt, this.siAt + 0.6));
    this.bust.set({ draw, heat, glitch, halo, t, frame: fi, intensity: 2.4 + 1.5 * glowAt(t, lastSlam, 0.3) });
    this.bust.root.position.y = 1.72 + 0.03 * Math.sin(t * 1.7) + 0.06 * halo;
    // dialog
    const pop = ease(prog(t, this.ask - 0.05, this.ask + 0.18)) * (1 - prog(t, this.yes + 0.6, this.yes + 0.9));
    this.dialog.visible = pop > 0.01;
    this.dialog.scale.setScalar(Math.max(0.001, pop));
    if (this.dialog.visible) this.drawDialog(t >= this.yes);
    // camera: slow push, then rises to frame the words during the break
    const p = prog(t, this.ctx.start, b.start);
    this.cam.position.set(1.6 - 0.7 * p, 1.65, 6.4 - 1.2 * p);
    this.cam.lookAt(0.15, 1.55, 0);
    const flash = Math.pow(clamp(1 - Math.abs(t - b.end) / 0.12), 2);
    return { scene: this.stage.scene, camera: this.cam, post: { focus: this.cam.position.distanceTo(new THREE.Vector3(0, 1.0, 0.4)), aperture: 10 + 8 * dark, bloom: 0.7, flash, vignette: 0.35 + 0.3 * dark, tint: [0.92, 1.0, 1.1] } };
  }

  private drawDialog(yes: boolean) {
    const c = this.dctx;
    c.clearRect(0, 0, 1024, 512);
    c.fillStyle = 'rgba(14,20,30,0.92)'; c.beginPath(); c.roundRect(8, 8, 1008, 496, 36); c.fill();
    c.strokeStyle = '#5AC8FF'; c.lineWidth = 4; c.stroke();
    font(c, 30, 500, 'Plex Mono'); c.fillStyle = '#5AC8FF'; c.fillText('agent · confirm action', 56, 84);
    font(c, 120); c.fillStyle = '#F2EEE6'; c.fillText('Proceed?', 56, 250);
    c.fillStyle = yes ? '#FF6A1A' : '#22314a'; c.beginPath(); c.roundRect(56, 330, 380, 120, 24); c.fill();
    font(c, 64, 600, 'Plex Mono'); c.fillStyle = yes ? '#07070A' : '#F2EEE6'; c.fillText('yes', 186, 412);
    c.fillStyle = '#1a1e26'; c.beginPath(); c.roundRect(470, 330, 300, 120, 24); c.fill();
    c.fillStyle = '#3A4250'; c.fillText('no', 580, 412);
    this.dtex.needsUpdate = true;
  }

  override overlay(c: CanvasRenderingContext2D, f: FrameInfo) {
    const t = f.t, b = this.brk;
    // sung lines
    const cur = this.lines.filter((l) => l.start - 0.05 <= t).pop();
    if (cur && t < Math.min(cur.end + 0.6, b.start)) slamLine(c, cur, t, { x: 960, y: 940, size: 96, maxW: 1600, hot: /^(loading|proceed|yes|enter|one)/i });
    if (t < b.start) return;
    // break: the Trump line, ARTIFICIAL → SUPER
    if (t >= b.trump - 0.05) {
      // Trump clip word times (trump-genius.wav): "artificial" ~0.3–0.9 s, "pure genius" ~2.6–3.7 s
      const tt = t - b.trump;
      const toSuper = tt > 2.75;
      const g = toSuper ? clamp(1 - (tt - 2.75) / 0.6) : clamp((tt - 1.0) / 1.2) * 0.35 + 0.25 * Math.max(0, Math.sin(tt * 30)) * clamp((tt - 1.0) / 1.0);
      const word = toSuper ? 'SUPER' : 'ARTIFICIAL';
      c.save();
      c.globalAlpha = clamp((tt + 0.05) / 0.15);
      glitchWord(c, word, 960, 560, toSuper ? 260 : 200, g, Math.round(t * 60), toSuper ? '#FF6A1A' : '#F2EEE6');
      if (!toSuper && tt > 1.0) { c.strokeStyle = '#FF6A1A'; c.lineWidth = 14; c.beginPath(); c.moveTo(960 - 560 * clamp((tt - 1.0) / 0.4), 505); c.lineTo(960 + 560 * clamp((tt - 1.0) / 0.4), 505); c.stroke(); }
      if (tt > 1.4 && !toSuper) { font(c, 64, 600, 'Plex Mono'); c.textAlign = 'center'; c.fillStyle = '#5AC8FF'; c.fillText('…IT\'S PURE GENIUS', 960, 690); c.textAlign = 'left'; }
      c.restore();
    }
  }
}
