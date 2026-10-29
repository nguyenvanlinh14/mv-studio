// Liquid morph: one glossy blob of liquid that re-shapes itself on the beat into the things a song sings about
// (pumpkin, sheet ghost, the couple holding hands, a cider mug, the crescent moon). Raymarched SDFs in one fullscreen
// shader; the morph is a blend of the two distance fields plus splash droplets and ripples that peak mid-morph.
import * as THREE from 'three';
import { Plate, type FrameInfo, type Shot } from '../../src/core/plate';
import { W, H } from '../../src/core/engine';
import { drawLyric } from '../../src/kit/lyricstyles';

export const SHAPES = ['pumpkin', 'ghost', 'couple', 'mug', 'moon', 'drop'] as const;
export type ShapeName = (typeof SHAPES)[number];
const smooth = (x: number) => { const k = Math.max(0, Math.min(1, x)); return k * k * (3 - 2 * k); };

const FRAG = /* glsl */ `
uniform float uT, uK, uPulse, uAspect, uSpin, uIgnite;
uniform int uA, uB;
uniform vec3 uColA, uColB;
varying vec2 vUv;

float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
float smax(float a, float b, float k) { return -smin(-a, -b, k); }
float sdEll(vec3 p, vec3 r) { float k0 = length(p / r), k1 = max(length(p / (r * r)), 1e-5); return k0 * (k0 - 1.0) / k1; }
float sdCap(vec3 p, vec3 a, vec3 b, float r) { vec3 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h) - r; }
float sdCyl(vec3 p, float h, float r) { vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h); return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)); }

float pumpkin(vec3 p) {
  vec3 q = p * vec3(1.0, 1.28, 1.0);
  float a = atan(q.z, q.x);
  float d = (length(q) - 0.86 + 0.06 * abs(sin(4.0 * a))) * 0.78;
  d = smin(d, sdCap(p, vec3(0.0, 0.5, 0.0), vec3(0.07, 0.86, 0.02), 0.075), 0.08);
  for (int s = -1; s <= 1; s += 2) d = smax(d, -sdEll(p - vec3(float(s) * 0.3, 0.14, 0.7), vec3(0.14, 0.12, 0.35)), 0.03);
  float m = max(sdEll(p - vec3(0.0, -0.24, 0.7), vec3(0.42, 0.17, 0.35)), -sdEll(p - vec3(0.0, -0.1, 0.72), vec3(0.47, 0.15, 0.4)));
  return smax(d, -m, 0.03);
}
float ghost(vec3 p) {
  float d = length(p - vec3(0.0, 0.35, 0.0)) - 0.5;
  float hem = -0.78 + 0.09 * sin(atan(p.z, p.x) * 5.0 + uT * 3.0);
  float body = smax(sdEll(p - vec3(0.0, -0.15, 0.0), vec3(0.64, 0.88, 0.56)), hem - p.y, 0.06);
  d = smin(d, body, 0.2);
  for (int s = -1; s <= 1; s += 2) {
    d = smin(d, sdCap(p, vec3(float(s) * 0.42, 0.0, 0.0), vec3(float(s) * 0.86, 0.22 + 0.1 * sin(uT * 4.0 + float(s)), 0.1), 0.1), 0.12);
    d = smax(d, -sdEll(p - vec3(float(s) * 0.18, 0.42, 0.44), vec3(0.08, 0.13, 0.2)), 0.02);
  }
  return smax(d, -sdEll(p - vec3(0.0, 0.14, 0.47), vec3(0.08, 0.1, 0.2)), 0.02);
}
float figure(vec3 q, float dress) {
  float d = length(q - vec3(0.0, 0.64, 0.0)) - 0.2;
  d = smin(d, sdCap(q, vec3(0.0, 0.05, 0.0), vec3(0.0, 0.36, 0.0), 0.19), 0.08);
  for (int s = -1; s <= 1; s += 2) d = smin(d, sdCap(q, vec3(float(s) * 0.09, -0.05, 0.0), vec3(float(s) * 0.11, -0.78, 0.0), 0.075), 0.06);
  if (dress > 0.5) d = smin(d, sdEll(q - vec3(0.0, -0.2, 0.0), vec3(0.3, 0.42, 0.24)), 0.06);
  return d;
}
float couple(vec3 p) {
  float b = 0.04 * uPulse;
  float d = min(figure(p - vec3(-0.4, b, 0.0), 0.0), figure(p - vec3(0.4, b * 0.6, 0.0), 1.0));
  d = smin(d, sdCap(p, vec3(-0.22, 0.3 + b, 0.0), vec3(0.0, 0.02, 0.08), 0.06), 0.05); // hand in hand
  d = smin(d, sdCap(p, vec3(0.22, 0.3 + b, 0.0), vec3(0.0, 0.02, 0.08), 0.06), 0.05);
  for (int s = -1; s <= 1; s += 2) d = smin(d, sdCap(p, vec3(float(s) * 0.58, 0.3, 0.0), vec3(float(s) * 0.66, -0.15, 0.03), 0.055), 0.05);
  return d;
}
float mug(vec3 p) {
  float d = max(sdCyl(p - vec3(0.0, -0.12, 0.0), 0.6, 0.5) - 0.03, -sdCyl(p - vec3(0.0, 0.12, 0.0), 0.62, 0.42));
  d = min(d, max(sdCyl(p - vec3(0.0, -0.12, 0.0), 0.6, 0.44), p.y - 0.32 - 0.02 * sin(p.x * 9.0 + uT * 3.0)));
  vec3 q = p - vec3(0.5, -0.1, 0.0);
  float hd = max(length(vec2(length(q.xy) - 0.27, q.z)) - 0.075, -q.x);
  return smin(d, hd, 0.06);
}
float moon(vec3 p) { // a 2D crescent, extruded and rounded so it stays a crescent from the front
  float d2 = smax(length(p.xy) - 0.92, -(length(p.xy - vec2(0.36, 0.16)) - 0.8), 0.03);
  vec2 w = vec2(d2 + 0.14, abs(p.z) - 0.1);
  return min(max(w.x, w.y), 0.0) + length(max(w, 0.0)) - 0.14;
}

float shape(int i, vec3 p) {
  if (i == 0) return pumpkin(p);
  if (i == 1) return ghost(p);
  if (i == 2) return couple(p);
  if (i == 3) return mug(p);
  if (i == 4) return moon(p);
  return length(p - vec3(0.0, -0.35, 0.0)) - 0.5; // a plain drop, as it lands
}
float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }

float map(vec3 p) {
  float c = cos(uSpin), s = sin(uSpin);
  p.xz = mat2(c, -s, s, c) * p.xz;
  float w = sin(3.14159 * uK);
  float d = mix(shape(uA, p), shape(uB, p), smoothstep(0.0, 1.0, uK));
  // liquid: wobble and ripples peak mid-morph; every kick sends a ring through the surface
  d += w * 0.07 * sin(5.0 * p.x + 3.0 * uT) * sin(4.0 * p.y + 2.3 * uT) * sin(5.0 * p.z + 1.7 * uT);
  d += 0.008 * sin(9.0 * p.y - uT * 2.0) + uPulse * 0.025 * sin(14.0 * length(p) - uT * 18.0);
  if (w > 0.02) for (int i = 0; i < 7; i++) {
    float fi = float(i), ang = fi * 2.4 + uT * (0.6 + hash(fi) * 0.8);
    vec3 c3 = vec3(cos(ang), (hash(fi + 3.0) - 0.5) * 1.6, sin(ang)) * (0.7 + 0.55 * w);
    d = smin(d, length(p - c3) - 0.13 * w * (0.5 + hash(fi + 7.0)), 0.25 * w);
  }
  return d;
}
vec3 normalAt(vec3 p) { vec2 e = vec2(0.0015, -0.0015); return normalize(e.xyy * map(p + e.xyy) + e.yyx * map(p + e.yyx) + e.yxy * map(p + e.yxy) + e.xxx * map(p + e.xxx)); }

const vec3 MOON = normalize(vec3(-0.55, 0.6, -0.6)), KEY = normalize(vec3(0.6, 0.55, 0.7));
vec3 env(vec3 d) {
  vec3 c = mix(vec3(0.012, 0.008, 0.03), vec3(0.13, 0.05, 0.22), clamp(d.y * 0.6 + 0.5, 0.0, 1.0));
  c += vec3(6.0, 5.4, 4.2) * pow(max(dot(d, MOON), 0.0), 600.0) + vec3(0.35, 0.3, 0.5) * pow(max(dot(d, MOON), 0.0), 18.0);
  c += vec3(0.9, 0.35, 0.06) * pow(max(-d.y, 0.0), 1.5) * 0.6; // warm bonfire bounce from below
  // two soft boxes (warm left strip, cool right panel) and a top light: long wet highlights on the liquid
  c += vec3(3.2, 1.9, 0.9) * smoothstep(0.12, 0.0, abs(d.x + 0.62)) * smoothstep(0.55, 0.2, abs(d.y - 0.1)) * step(0.0, d.z);
  c += vec3(1.1, 1.4, 2.2) * smoothstep(0.2, 0.0, abs(d.x - 0.7)) * smoothstep(0.4, 0.1, abs(d.y - 0.25)) * step(0.0, d.z);
  c += vec3(1.6) * smoothstep(0.92, 0.98, d.y);
  return c;
}

void main() {
  vec2 uv = vUv * 2.0 - 1.0; uv.x *= uAspect;
  vec3 ro = vec3(0.0, 0.05, 4.4), rd = normalize(vec3(uv * 0.5, -1.0));
  float t = 0.0, hit = 0.0;
  for (int i = 0; i < 110; i++) {
    float d = map(ro + rd * t);
    if (d < 0.0015) { hit = 1.0; break; }
    t += d * 0.8; if (t > 9.0) break;
  }
  vec3 col;
  // background: night sky, a faint moon halo, a dark ground with a warm pool of light and a contact shadow
  vec3 sky = mix(vec3(0.05, 0.02, 0.07), vec3(0.2, 0.08, 0.3), smoothstep(-0.1, 0.6, rd.y));
  vec2 sq = rd.xy * 160.0, sg = floor(sq); float st = step(0.994, hash(sg.x * 17.0 + sg.y * 113.0)) * smoothstep(0.18, 0.0, length(fract(sq) - 0.5)) * smoothstep(0.05, 0.4, rd.y);
  col = sky + vec3(st) * 1.5 + vec3(0.35, 0.3, 0.5) * pow(max(dot(rd, MOON), 0.0), 18.0) * 0.5;
  if (rd.y < 0.0) {
    float tp = (-1.05 - ro.y) / rd.y; vec3 g = ro + rd * tp; float r = length(g.xz);
    vec3 gr = vec3(0.025, 0.012, 0.02) + vec3(0.5, 0.18, 0.03) * exp(-r * r * 0.9) * (1.0 - 0.7 * exp(-r * r * 5.0));
    vec2 gq = abs(fract(g.xz * 2.2) - 0.5); float gl = smoothstep(0.455, 0.5, max(gq.x, gq.y));
    gr += vec3(1.5, 1.3, 0.62) * gl * exp(-r * 0.3) * 0.55 * smoothstep(-0.04, -0.16, rd.y); // fade before the horizon aliases
    col = mix(sky, gr, smoothstep(-0.0, -0.25, rd.y));
  }
  if (hit > 0.5) {
    vec3 p = ro + rd * t, n = normalAt(p), v = -rd;
    vec3 base = mix(uColA, uColB, smoothstep(0.0, 1.0, uK));
    float ndv = max(dot(n, v), 0.0), fres = 0.04 + 0.96 * pow(1.0 - ndv, 4.0);
    float ao = 0.0; for (int i = 1; i <= 5; i++) { float h = 0.04 * float(i); ao += (h - map(p + n * h)) / h; } ao = clamp(1.0 - ao * 0.18, 0.0, 1.0);
    float dif = clamp(dot(n, KEY) * 0.5 + 0.5, 0.0, 1.0);
    vec3 deep = base * base * 0.55;
    vec3 body = deep * (0.05 + 0.6 * dif * dif) * ao;
    body += base * base * 2.6 * pow(clamp(dot(v, -normalize(KEY + n * 0.6)), 0.0, 1.0), 2.0); // light through the liquid
    body += base * 1.8 * pow(1.0 - ndv, 2.5) * 0.45;                                          // thin edges glow
    fres = 0.06 + 0.94 * pow(1.0 - ndv, 3.0);
    // the carved pumpkin face glows from a candle inside
    float c0 = cos(uSpin), s0 = sin(uSpin); vec3 pp = p; pp.xz = mat2(c0, -s0, s0, c0) * pp.xz;
    float face = min(min(sdEll(pp - vec3(-0.3, 0.14, 0.7), vec3(0.14, 0.12, 0.35)), sdEll(pp - vec3(0.3, 0.14, 0.7), vec3(0.14, 0.12, 0.35))),
                     max(sdEll(pp - vec3(0.0, -0.24, 0.7), vec3(0.42, 0.17, 0.35)), -sdEll(pp - vec3(0.0, -0.1, 0.72), vec3(0.47, 0.15, 0.4))));
    float pk = (uA == 0 ? 1.0 - uK : 0.0) + (uB == 0 ? uK : 0.0);
    body += vec3(4.0, 1.8, 0.35) * smoothstep(0.03, -0.01, face) * pk * (0.85 + 0.15 * sin(uT * 13.0) * sin(uT * 7.3));
    vec3 refl = env(reflect(rd, n));
    vec3 spec = vec3(4.0, 3.4, 2.8) * pow(max(dot(reflect(-KEY, n), v), 0.0), 120.0) + vec3(2.0, 2.2, 3.0) * pow(max(dot(reflect(-MOON, n), v), 0.0), 90.0);
    body += base * 3.0 * uIgnite * (0.6 + 0.4 * pow(1.0 - ndv, 1.5));
    col = mix(body, refl, fres) + spec * ao;
  }
  if (any(isnan(col)) || any(isinf(col))) col = vec3(0.05, 0.02, 0.07); // never let one bad pixel poison the bloom
  gl_FragColor = vec4(min(col, vec3(40.0)), 1.0);
}`;

const COLORS: Record<ShapeName, [number, number, number]> = {
  pumpkin: [1.0, 0.42, 0.05], drop: [1.0, 0.5, 0.1], ghost: [0.8, 0.95, 0.92], couple: [1.0, 0.5, 0.12], mug: [0.95, 0.45, 0.08], moon: [1.0, 0.85, 0.5],
};

export class LiquidShot extends Plate {
  cam = new THREE.PerspectiveCamera(40, W / H, 0.1, 10);
  scene = new THREE.Scene();
  mat = new THREE.ShaderMaterial({
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: FRAG, depthWrite: false, depthTest: false,
    uniforms: { uT: { value: 0 }, uK: { value: 0 }, uPulse: { value: 0 }, uAspect: { value: W / H }, uSpin: { value: 0 }, uIgnite: { value: 0 }, uA: { value: 0 }, uB: { value: 1 }, uColA: { value: new THREE.Vector3() }, uColB: { value: new THREE.Vector3() } },
  });
  seq: ShapeName[] = this.ctx.params.seq ?? [...SHAPES];
  hold: number = this.ctx.params.beats ?? 4; // beats per shape
  morph: number = this.ctx.params.morph ?? 1.5; // beats of liquid transition at the end of each shape
  override init() { const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat); q.frustumCulled = false; this.scene.add(q); }

  shot(f: FrameInfo): Shot {
    let a: ShapeName, nb: ShapeName, k: number;
    const keys: [number, ShapeName][] | undefined = this.ctx.params.keys;
    if (keys) { // lyric-driven: each key is [word time, shape]; the liquid finishes re-shaping on the word
      const md = this.morph * 60 / this.ctx.audio.bpm, i = keys.findIndex(([kt]) => kt > f.t);
      const prev = keys[Math.max(0, (i < 0 ? keys.length : i) - 1)]!;
      a = prev[1]; nb = a; k = 0;
      if (i > 0 && f.t > keys[i]![0] - md) { nb = keys[i]![1]; k = smooth((f.t - (keys[i]![0] - md)) / md); }
    } else {
      const b = Math.max(0, f.beat - (this.ctx.params.beat0 ?? 0)), seg = Math.floor(b / this.hold), u = b / this.hold - seg;
      a = this.seq[seg % this.seq.length]!; nb = this.seq[(seg + 1) % this.seq.length]!;
      k = smooth((u - (1 - this.morph / this.hold)) / (this.morph / this.hold));
    }
    const U = this.mat.uniforms;
    U.uT!.value = f.t; U.uK!.value = k; U.uA!.value = SHAPES.indexOf(a); U.uB!.value = SHAPES.indexOf(nb);
    U.uColA!.value.set(...COLORS[a]); U.uColB!.value.set(...COLORS[nb]);
    U.uPulse!.value = Math.pow(1 - (f.beat - Math.floor(f.beat)), 5);
    U.uSpin!.value = 0.35 * Math.sin(f.t * 0.7);
    // dark screen that lights up: fade in from black with a candle flicker, the liquid flares as it catches
    const ig: [number, number] | undefined = this.ctx.params.ignite;
    let fade = 0;
    if (ig) {
      const u = (f.t - ig[0]) / (ig[1] - ig[0]), flick = 0.12 * Math.sin(f.t * 41) * Math.sin(f.t * 17) * (1 - smooth(u));
      fade = Math.max(0, 1 - smooth(u) + flick);
      U.uIgnite!.value = Math.exp(-Math.pow((u - 0.8) / 0.45, 2));
    }
    if (this.ctx.params.fadeOut) fade = Math.max(fade, smooth((f.t - (this.ctx.end - 1.2)) / 1.2));
    return { scene: this.scene, camera: this.cam, post: { bloom: 0.55, bloomThreshold: 0.9, vignette: 0.35, grain: 0.02, exposure: 1.0, aperture: 0, fade } };
  }

  override overlay(c: CanvasRenderingContext2D, f: FrameInfo) {
    if (this.ctx.params.label) { c.font = '600 34px "Plex Mono"'; c.fillStyle = '#fff'; c.fillText(this.ctx.params.label, 40, 80); }
    if (!this.ctx.params.lyrics) return;
    const line = this.ctx.lyrics.lines.find((l) => f.t >= l.start - 0.25 && f.t < l.end + 0.5);
    if (line) drawLyric('pumpkin', c, line.text, f, [line.start - 0.25, line.end + 0.5], H - (W >= H ? 120 : 380), line.words.map((w) => w.start));
  }
}
