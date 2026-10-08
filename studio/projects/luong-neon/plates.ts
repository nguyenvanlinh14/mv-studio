// One plate for every section: a neon picture on a plane above a mirror floor; notes roll out of the fog on the
// beat, climb onto the picture and each landing draws the next piece. Lyrics sit underneath as neon karaoke.
import * as THREE from 'three';
import { Plate, type FrameInfo, type Shot } from '../../src/core/plate';
import type { Line } from '../../src/core/lyrics';
import { makeStage } from '../../src/kit/stage';
import { NeonStrokes, NoteStream, NEON, lurch, type Hit } from '../../src/kit/neondraw';
import { font, hash } from '../../src/kit/type';
import { NeonBust } from '../../src/kit/neonbust';
import { Skyline, Monitors, Dust, Beams, Tunnel, DataRain, Rain, Coins, Waves, Traffic, type Beat } from '../../src/kit/neonenv';
import { SHAPES } from './shapes';

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const prog = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const ease = (x: number) => x * x * (3 - 2 * x);
const C = NEON as Record<string, THREE.Color>;
const NOTE_COLORS = [NEON.cyan, NEON.magenta, NEON.lime, NEON.gold];
const CSS: Record<string, string> = { cyan: '#38D9FF', magenta: '#FF3DC4', lime: '#8CFF4D', gold: '#FFB82E', violet: '#9B6BFF', white: '#FFF4EA', red: '#FF3B30' };

export interface NeonParams {
  shape: string;
  /** colours for stroke groups 0/1/2 (NEON names) */
  colors?: [string, string, string];
  /** hits: sung words (plus beats where nobody sings) or a beat subdivision */
  notes?: 'words' | number;
  draw?: [number, number];
  /** swap to another picture at a time, with glitch bursts at given times */
  swap?: { shape: string; at: number; glitch: number[] };
  hands?: 'tick' | 'spin';
  undraw?: [number, number];
  flash?: number[];
  cam?: { pos: [number, number, number]; look: [number, number, number]; orbit?: number; push?: number };
  big?: RegExp;
  /** backgrounds/effects (see kit/neonenv) */
  fx?: {
    skyline?: { lit?: number | [number, number]; color?: string; win?: string };
    monitors?: { color?: string };
    dust?: { color?: string; amount?: number };
    beams?: { colors?: string[]; mode?: 'beat' | 'down' | 'steady'; level?: number; up?: [number, number] };
    tunnel?: { colors?: string[]; level?: number };
    data?: { color?: string; level?: number | [number, number, number, number]; to?: string; at?: [number, number] };
    rain?: { level?: number };
    coins?: { up?: boolean; level?: number; at?: number };
    waves?: { color?: string; every?: 'beat' | 'bar' };
    traffic?: { every?: number; body?: string; level?: number };
  };
  /** horizon glow colour (rgb, 0..1) */
  horizon?: [number, number, number];
  /** a second picture drawn by time (not by notes), e.g. the chart's rocket line */
  burst?: { shape: string; at: [number, number] };
  /** camera looks up by dy between t0..t1 */
  tilt?: [number, number, number];
  /** chip blows apart between t0..t1 */
  explode?: [number, number];
  /** AI → SI neon figure */
  bust?: { draw: [number, number]; heat: [number, number]; halo: [number, number]; glitch?: number[] };
  /** no new notes inside these windows */
  quiet?: [number, number][];
  ticker?: boolean;
  /** StarCraft-style cheat typed into a chat bar: typing start, seconds per key, Enter time, "cheat enabled" time */
  cheat?: { text: string; at: number; step: number; enter: number; enabled: number };
  /** end signature: neon-sign flicker in at `at` */
  sign?: { at: number; name: string; repo: string };
}

export default class NeonScene extends Plate {
  p = this.ctx.params as NeonParams;
  stage = makeStage({ env: this.ctx.env, floor: 'mirror', fog: 0.02, envIntensity: 0.05 });
  cam = new THREE.PerspectiveCamera(34, 16 / 9, 0.1, 300);
  pal = (this.p.colors ?? ['cyan', 'magenta', 'gold']).map((n) => C[n]!);
  art = new NeonStrokes(SHAPES[this.p.shape]!(), this.pal);
  alt = this.p.swap ? new NeonStrokes(SHAPES[this.p.swap.shape]!(), this.pal) : null;
  hand = new NeonStrokes([{ pts: [[0, -0.35], [0, 2.2]], c: 1 }, { pts: [[0, 0], [-1.25, -0.72]], c: 2 }], [NEON.white, NEON.magenta, NEON.gold], { radius: 0.035 });
  notes = new NoteStream(NOTE_COLORS, { travelBeats: 8, farZ: -90, ring: 0.4, laneSpread: 1.6 });
  hits: (Hit & { draws: number })[] = [];
  lines: Line[] = [];
  ORIGIN = new THREE.Vector3(0, 4.6, 0);
  step = 1;
  burst = this.p.burst ? new NeonStrokes(SHAPES[this.p.burst.shape]!(), this.pal, { radius: 0.07 }) : null;
  bust = this.p.bust ? new NeonBust({ radius: 0.02 }) : null;
  fx: Record<string, any> = {};

  override init() {
    const s = this.stage.scene, { audio, lyrics, start, end } = this.ctx;
    this.lines = lyrics.linesIn(start - 1.2, end);
    for (const g of [this.art, this.alt, this.burst, this.p.hands ? this.hand : null]) if (g) { g.root.position.copy(this.ORIGIN); s.add(g.root); }
    if (this.bust) { this.bust.root.position.set(0, 3.2, 0.5); this.bust.root.scale.setScalar(2.1); s.add(this.bust.root); }
    const fx = this.p.fx ?? {}, col = (n: string | undefined, d: THREE.Color) => (n ? C[n]! : d);
    if (fx.skyline) this.fx.skyline = new Skyline(col(fx.skyline.color, NEON.violet), col(fx.skyline.win, NEON.gold));
    if (fx.monitors) this.fx.monitors = new Monitors(col(fx.monitors.color, NEON.cyan));
    if (fx.dust) this.fx.dust = new Dust(col(fx.dust.color, NEON.violet));
    if (fx.beams) this.fx.beams = new Beams((fx.beams.colors ?? ['magenta', 'cyan']).map((n) => C[n]!));
    if (fx.tunnel) this.fx.tunnel = new Tunnel((fx.tunnel.colors ?? ['magenta', 'cyan', 'violet']).map((n) => C[n]!));
    if (fx.data) this.fx.data = new DataRain(col(fx.data.color, NEON.lime));
    if (fx.rain) this.fx.rain = new Rain();
    if (fx.coins) this.fx.coins = new Coins();
    if (fx.waves) this.fx.waves = new Waves(col(fx.waves.color, NEON.magenta));
    if (fx.traffic) this.fx.traffic = new Traffic({ every: fx.traffic.every, body: col(fx.traffic.body, NEON.violet) });
    for (const o of Object.values(this.fx)) s.add(o.root);
    s.add(this.notes.root);
    this.stage.key.intensity = 0.25; this.stage.rim.intensity = 0;
    // a faint violet glow on the horizon, behind the fog
    const g = new THREE.PlaneGeometry(600, 40, 1, 8);
    const pos = g.attributes.position!, cols: number[] = [];
    for (let i = 0; i < pos.count; i++) { const k = Math.pow(clamp(1 - (pos.getY(i) + 20) / 40), 4), hz = this.p.horizon ?? [0.16, 0.03, 0.24]; cols.push(hz[0] * k, hz[1] * k, hz[2] * k); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const glow = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }));
    glow.position.set(0, 18, -120); s.add(glow);

    // landing times
    const [d0, d1] = this.p.draw ?? [start + 0.3, start + (end - start) * 0.72];
    const times: number[] = [];
    const beats = audio.beats.filter((b) => b >= start - 0.01 && b < end);
    if (this.p.notes === 'words' || this.p.notes === undefined) {
      const ws = lyrics.words.filter((w) => w.start >= start && w.start < end).map((w) => w.start);
      times.push(...ws, ...beats.filter((b) => !ws.some((w) => Math.abs(w - b) < audio.beatPeriod * 0.75)));
    } else {
      const n = this.p.notes;
      for (let i = Math.ceil(audio.beatAt(start) * n); i / n < audio.beatAt(end); i++) times.push(audio.timeOfBeat(i / n));
    }
    times.sort((a, b) => a - b);
    for (const [q0, q1] of this.p.quiet ?? []) for (let i = times.length - 1; i >= 0; i--) if (times[i]! > q0 && times[i]! < q1 && Math.round(audio.beatAt(times[i]!)) % 2) times.splice(i, 1);
    const drawing = times.filter((x) => x >= d0 && x <= d1), N = Math.max(1, drawing.length);
    this.step = 1 / N;
    times.forEach((t, i) => {
      const k = drawing.indexOf(t);
      const target = this.alt && t >= this.p.swap!.at ? this.alt : this.art;
      const u = k >= 0 ? k / N : hash(i, 7);
      this.hits.push({ t, to: target.pointAt(u), c: i % NOTE_COLORS.length, draws: k >= 0 ? (k + 1) / N : -1 });
    });
  }

  drawAt(t: number) {
    let d = this.p.draw && this.p.draw[1] < this.ctx.start ? 1 : 0;
    for (const h of this.hits) if (h.draws > 0 && t >= h.t) d = Math.max(d, h.draws - this.step * (1 - ease(prog(t, h.t, h.t + 0.16))));
    if (this.p.undraw) d *= 1 - ease(prog(t, ...this.p.undraw));
    return d;
  }

  shot(f: FrameInfo): Shot {
    const { audio } = this.ctx, t = f.t, frame = Math.round(t * 60);
    const beatPulse = Math.pow(1 - (f.beat - Math.floor(f.beat)), 3);
    const landed = this.hits.filter((h) => h.t <= t).pop();
    const land = landed ? Math.exp(-(t - landed.t) / 0.12) : 0;
    const I = 1.5 + 0.6 * beatPulse + 0.9 * land;
    const sw = this.p.swap;
    const glitch = sw ? Math.max(...sw.glitch.map((g) => clamp(1 - Math.abs(t - g) / 0.18)), clamp(1 - Math.abs(t - sw.at) / 0.25)) : 0;
    const draw = this.drawAt(t);
    if (this.alt && sw) {
      const on = t >= sw.at;
      this.art.root.visible = !on || (glitch > 0.3 && frame % 3 === 0);
      this.alt.root.visible = on;
      this.alt.set({ draw: 1, intensity: I, glitch, frame, tip: 0 });
    }
    this.art.set({ draw, intensity: I, glitch, frame });
    if (this.p.explode) {
      const e = ease(prog(t, ...this.p.explode));
      this.art.root.scale.setScalar(1 + 2.2 * e);
      this.art.root.position.z = this.ORIGIN.z + 6 * e;
      this.art.set({ draw, intensity: I * (1 - e), glitch: Math.max(glitch, e), frame, tip: 0 });
      this.art.root.visible = e < 0.99 && (!this.alt || t < this.p.swap!.at);
      if (this.alt) { this.alt.root.scale.setScalar(1 + 2.2 * e); this.alt.root.position.z = this.ORIGIN.z + 6 * e; this.alt.set({ draw: 1, intensity: I * (1 - e), glitch: Math.max(glitch, e), frame, tip: 0 }); this.alt.root.visible = t >= this.p.swap!.at && e < 0.99; }
    }
    if (this.bust && this.p.bust) {
      const bp = this.p.bust;
      const gl = Math.max(0, ...(bp.glitch ?? []).map((g) => clamp(1 - Math.abs(t - g) / 0.16)));
      this.bust.set({ draw: ease(prog(t, ...bp.draw)), heat: ease(prog(t, ...bp.heat)), halo: ease(prog(t, ...bp.halo)), glitch: gl, t, frame, intensity: 2.2 + 0.8 * beatPulse + 1.5 * gl });
      this.bust.root.position.y = 3.2 + 0.08 * Math.sin(t * 1.3);
    }
    if (this.burst && this.p.burst) this.burst.set({ draw: ease(prog(t, ...this.p.burst.at)), intensity: I * 1.4, frame });
    const B: Beat = { t, beat: f.beat, bar: f.bar, beatAt: (x) => audio.beatAt(x) };
    const fx = this.p.fx ?? {}, lerp2 = (v: number | [number, number] | undefined, d: number) => (Array.isArray(v) ? v[0] + (v[1] - v[0]) * f.progress : v ?? d);
    this.fx.skyline?.update(B, { lit: lerp2(fx.skyline?.lit, 0.4) });
    this.fx.monitors?.update(B);
    this.fx.dust?.update(B, { amount: fx.dust?.amount });
    this.fx.beams?.update(B, { mode: fx.beams?.mode, level: fx.beams?.level, up: fx.beams?.up ? ease(prog(t, ...fx.beams.up)) : 0 });
    this.fx.tunnel?.update(B, { level: fx.tunnel?.level, centre: this.ORIGIN });
    if (this.fx.data) {
      const d = fx.data!, lv = Array.isArray(d.level) ? d.level[2] + (d.level[3] - d.level[2]) * ease(prog(t, d.level[0], d.level[1])) : d.level ?? 1;
      const dc = d.to && d.at ? C[d.color ?? 'lime']!.clone().lerp(C[d.to]!, ease(prog(t, ...d.at))) : undefined;
      this.fx.data.update(B, { level: lv, color: dc });
    }
    this.fx.rain?.update(B, { level: fx.rain?.level });
    this.fx.coins?.update(B, { up: fx.coins?.up, level: (fx.coins?.level ?? 1) * (fx.coins?.at !== undefined ? ease(prog(t, fx.coins.at, fx.coins.at + 0.5)) : 1) });
    this.fx.waves?.update(B, { every: fx.waves?.every });
    this.fx.traffic?.update(B, { level: fx.traffic?.level });
    if (this.p.hands) {
      const b = f.beat, step = Math.floor(b) + ease(clamp((b - Math.floor(b)) / 0.25));
      const spin = this.p.hands === 'spin' ? 1 : 0;
      this.hand.root.rotation.z = -(spin ? b * 0.9 : step * (Math.PI / 6));
      this.hand.set({ draw: clamp(draw * 1.2 - 0.2), intensity: I * 1.1, tip: 0 });
    }
    this.notes.update(t, this.hits, (x) => audio.beatAt(x), { intensity: 3.2, lanePulse: beatPulse * (audio.env('low', t) > 0.3 ? 1 : 0.4) });

    const c = this.p.cam ?? { pos: [0, 3.6, 18], look: [0, 4.1, -6] };
    const a = (c.orbit ?? 0.05) * Math.sin(f.local * 0.25) + (c.orbit ?? 0) * (f.progress - 0.5);
    const push = (c.push ?? 1.5) * ease(f.progress);
    const [px, py, pz] = c.pos;
    this.cam.position.set(px + Math.sin(a) * pz, py, Math.cos(a) * (pz - push));
    const tl = this.p.tilt ? ease(prog(t, this.p.tilt[0], this.p.tilt[1])) * this.p.tilt[2] : 0;
    this.cam.position.y += tl * 0.35;
    this.cam.lookAt(c.look[0], c.look[1] + tl, c.look[2]);
    const flash = Math.max(0, ...(this.p.flash ?? []).map((x) => (t >= x ? Math.exp(-(t - x) / 0.15) : 0)));
    return {
      scene: this.stage.scene, camera: this.cam,
      post: { focus: this.cam.position.distanceTo(this.ORIGIN), aperture: 9, bloom: 0.9, bloomThreshold: 0.8, vignette: 0.5, grain: 0.04, tint: [0.95, 0.9, 1.12], flash: flash * 0.8, fade: this.ctx.start < 0.1 ? 1 - prog(t, 0, 0.8) : 0 },
    };
  }

  override overlay(c: CanvasRenderingContext2D, f: FrameInfo) {
    const t = f.t;
    if (this.p.ticker) this.drawTicker(c, f);
    if (this.p.cheat) this.drawCheat(c, t);
    if (this.p.sign) this.drawSign(c, t);
    const cur = this.lines.filter((l) => l.start - 0.45 <= t).pop();
    if (!cur || t > cur.end + 0.5) return;
    const big = this.p.big?.test(cur.text) ?? false;
    const size = big ? 104 : 66;
    font(c, size, 800, 'Archivo', 'semi-expanded');
    const ws = cur.words.map((w) => c.measureText(w.w).width), sp = size * 0.3;
    let total = ws.reduce((a, b) => a + b, 0) + sp * (ws.length - 1), k = 1;
    if (total > 1700) { k = 1700 / total; total = 1700; }
    let x = 960 - total / 2;
    const y = 985, col = CSS[(this.p.colors ?? ['cyan'])[0]] ?? '#38D9FF';
    const fadeOut = 1 - prog(t, cur.end + 0.2, cur.end + 0.5);
    c.save();
    c.translate(960, y); c.scale(k, k); c.translate(-960, -y);
    x = 960 - total / k / 2;
    cur.words.forEach((w, i) => {
      const sung = t >= w.start - 0.02;
      c.globalAlpha = fadeOut;
      if (sung) {
        const hit = Math.exp(-(t - w.start) / 0.1);
        c.shadowColor = col; c.shadowBlur = 28 + 30 * hit;
        c.fillStyle = '#FFF6FB';
        c.fillText(w.w, x, y - 10 * hit);
        c.shadowBlur = 0;
      } else {
        c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,0.42)';
        c.strokeText(w.w, x, y);
      }
      x += ws[i]! + sp;
    });
    c.restore();
  }

  /** Stock ticker tape along the top and a climbing % counter for the SUPER LƯƠNG chart. */
  drawTicker(c: CanvasRenderingContext2D, f: FrameInfo) {
    const t = f.t, items = ['LƯƠNG ▲ +999%', 'SI ▲ +300%', 'CÀ PHÊ ▼ −2,1%', 'DEADLINE ▲ +45%', 'TRẢ GÓP ▼ −12%', 'ENTER ▲ +88%', 'VNĐ ▲ +7,5%'];
    font(c, 30, 500, 'Plex Mono');
    c.fillStyle = 'rgba(8,6,14,0.72)'; c.fillRect(0, 34, 1920, 52);
    const txt = items.join('     ') + '     ';
    const w = c.measureText(txt).width;
    let x = -((t * 160) % w);
    c.save(); c.beginPath(); c.rect(0, 34, 1920, 52); c.clip();
    for (; x < 1920; x += w) {
      let xx = x;
      for (const it of items) {
        c.fillStyle = it.includes('▲') ? '#8CFF4D' : '#FF3B30';
        c.shadowColor = c.fillStyle; c.shadowBlur = 12;
        c.fillText(it, xx, 72); xx += c.measureText(it + '     ').width;
      }
    }
    c.restore();
    const rk = this.p.burst ? prog(t, ...this.p.burst.at) : 0;
    const pct = Math.round(3 + 40 * prog(t, this.ctx.start, this.p.burst?.at[0] ?? this.ctx.end) + 956 * Math.pow(rk, 2));
    font(c, 64, 800, 'Archivo', 'semi-expanded');
    c.textAlign = 'right'; c.fillStyle = '#EFFFE6'; c.shadowColor = '#8CFF4D'; c.shadowBlur = 26;
    c.fillText(`▲ +${pct}%`, 1860, 170); c.shadowBlur = 0; c.textAlign = 'left';
  }

  /** Chat bar: the cheat is typed key by key, sent with Enter, then the game-style confirmation and a money counter. */
  drawCheat(c: CanvasRenderingContext2D, t: number) {
    const ch = this.p.cheat!;
    if (t < ch.at - 0.3) return;
    const sent = t >= ch.enter;
    const n = Math.min(ch.text.length, Math.max(0, Math.floor((t - ch.at) / ch.step) + 1));
    const x0 = 90, y0 = 940, w = 760, h = 74;
    c.save();
    if (t > ch.enabled + 2) return;
    c.globalAlpha = clamp((t - ch.at + 0.3) / 0.3) * (1 - prog(t, ch.enabled + 1.4, ch.enabled + 1.9)); // gone as the music swells back
    // chat panel behind the messages so they read over the scene
    if (sent) { c.fillStyle = `rgba(4,6,14,${0.62 * ease(prog(t, ch.enter, ch.enter + 0.2))})`; c.fillRect(x0, y0 - (t >= ch.enabled ? 190 : 110), w, (t >= ch.enabled ? 190 : 110)); }
    // sent message line (rises above the bar)
    if (sent) {
      const k = ease(prog(t, ch.enter, ch.enter + 0.25));
      font(c, 38, 500, 'Plex Mono');
      c.fillStyle = '#EAF6FF'; c.shadowColor = '#38D9FF'; c.shadowBlur = 16;
      c.fillText(`Bạn: ${ch.text}`, x0 + 28, y0 - 30 - 40 * k);
      c.shadowBlur = 0;
    }
    if (t >= ch.enabled) {
      const k = Math.exp(-(t - ch.enabled) / 0.12);
      font(c, 42, 500, 'Plex Mono');
      c.fillStyle = '#B6FF8A'; c.shadowColor = '#8CFF4D'; c.shadowBlur = 22 + 30 * k;
      c.fillText('Cheat enabled.', x0 + 28, y0 - 130);
      const amt = Math.round(10_000_000 * ease(prog(t, ch.enabled, ch.enabled + 0.9)));
      font(c, 130 + 30 * k, 800, 'Archivo', 'semi-expanded');
      c.textAlign = 'center'; c.fillStyle = '#FFF4DA'; c.shadowColor = '#FFB82E'; c.shadowBlur = 40;
      c.fillText(`+${amt.toLocaleString('vi-VN')} ₫`, 960, 250);
      c.textAlign = 'left'; c.shadowBlur = 0;
    }
    // the input bar
    const bar = sent ? 1 - ease(prog(t, ch.enter, ch.enter + 0.2)) * 0.6 : 1;
    c.globalAlpha *= bar;
    c.fillStyle = 'rgba(6,10,20,0.78)'; c.fillRect(x0, y0, w, h);
    c.strokeStyle = '#38D9FF'; c.lineWidth = 3; c.shadowColor = '#38D9FF'; c.shadowBlur = 18; c.strokeRect(x0, y0, w, h); c.shadowBlur = 0;
    font(c, 42, 500, 'Plex Mono');
    const typed = sent ? '' : ch.text.slice(0, t < ch.at ? 0 : n);
    c.fillStyle = '#8DEBFF'; c.fillText('>', x0 + 26, y0 + 54);
    c.fillStyle = '#F4FBFF'; c.fillText(typed, x0 + 70, y0 + 54);
    if (Math.floor(t * 5) % 2 === 0 || (!sent && t >= ch.at && t < ch.enter)) {
      const cx = x0 + 74 + c.measureText(typed).width;
      c.fillStyle = '#38D9FF'; c.fillRect(cx, y0 + 18, 22, 44);
    }
    c.restore();
  }

  /** Signature at the very end: name + repo, switched on like a neon sign (a few flickers, then steady). */
  drawSign(c: CanvasRenderingContext2D, t: number) {
    const sg = this.p.sign!, a = t - sg.at;
    if (a < 0) return;
    const flick = (x: number) => (x > 0.55 ? 1 : [0.06, 0.14, 0.22, 0.3, 0.42].some((k) => x >= k && x < k + 0.05) ? 1 : x > 0.47 ? 0.6 : 0);
    const on1 = flick(a), on2 = flick(a - 0.35);
    c.save();
    c.textAlign = 'center';
    if (on1 > 0) {
      font(c, 120, 800, 'Archivo', 'semi-expanded');
      c.globalAlpha = on1;
      c.shadowColor = '#FF3DC4'; c.shadowBlur = 46; c.fillStyle = '#FFF2FB';
      c.fillText(sg.name, 960, 800);
      c.shadowBlur = 14; c.fillText(sg.name, 960, 800);
    }
    if (on2 > 0) {
      font(c, 42, 500, 'Plex Mono');
      c.globalAlpha = on2;
      c.shadowColor = '#38D9FF'; c.shadowBlur = 26; c.fillStyle = '#E6FAFF';
      c.fillText(sg.repo, 960, 880);
    }
    c.restore();
  }
}
