// Neon rhythm-game shot (9:16): a 4-lane note highway in perspective, glowing note bars (and hold trails) falling
// to a hit line of D F J K keys that flash when "played", over a synthwave wire terrain that heaves with the music.
import * as THREE from 'three';
import { Plate, type FrameInfo, type Shot } from '../../src/core/plate';
import { W, H } from '../../src/core/engine';

const LANES = 4, LW = 0.62, SPEED = 7, HIT_Z = 0; // lane width, world units per second, hit line z
const COLS = [0xff2fd6, 0x29e6ff, 0xffe14a, 0x3ee06a]; // green toned down: it reads brightest
const hash = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const glow = (c: number, k: number) => new THREE.Color(c).multiplyScalar(k);

type Note = { t: number; lane: number; hold: number };
/** a chart from the beat grid: one note per beat, doubles on the downbeat, eighths later, a few holds */
function chart(beatSec: number, dur: number): Note[] {
  const out: Note[] = [];
  for (let i = 0; i * beatSec < dur; i++) {
    const t = i * beatSec, lane = Math.floor(hash(i) * LANES);
    out.push({ t, lane, hold: i % 8 === 6 ? beatSec * 1.5 : 0 });
    if (i % 4 === 0) out.push({ t, lane: (lane + 2) % LANES, hold: 0 });
    if (t > dur * 0.4) out.push({ t: t + beatSec / 2, lane: (lane + 1) % LANES, hold: 0 });
  }
  return out;
}

export class RhythmShot extends Plate {
  scene = new THREE.Scene();
  cam = new THREE.PerspectiveCamera(52, W / H, 0.05, 300);
  beatSec = 60 / this.ctx.audio.bpm;
  notes = chart(this.beatSec, this.ctx.end + 4);
  /** note speed ramps up through the song (slow → insane): distance travelled D(t) = ∫ speed */
  v0 = this.ctx.params.speed?.[0] ?? SPEED; v1 = this.ctx.params.speed?.[1] ?? SPEED;
  D = (t: number) => this.v0 * t + (this.v1 - this.v0) * t * t / (2 * this.ctx.audio.duration);
  noteMesh!: THREE.InstancedMesh; trailMesh!: THREE.InstancedMesh;
  keys: THREE.Mesh[] = []; flashes: THREE.Mesh[] = [];
  terrain = new THREE.BufferGeometry(); tpos = new Float32Array(0); TN = 70;
  moon!: THREE.Mesh; halo!: THREE.Mesh; stars!: THREE.InstancedMesh; starPos: THREE.Vector3[] = [];

  /** a far star field; now and then a random star flares with a 4-point sparkle */
  makeStars() {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d')!;
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, '#fff'); g.addColorStop(0.12, 'rgba(255,255,255,0.8)'); g.addColorStop(0.3, 'rgba(200,180,255,0.15)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, 128, 128);
    c.globalCompositeOperation = 'lighter'; for (const [w, h] of [[128, 5], [5, 128]] as const) { const l = c.createRadialGradient(64, 64, 0, 64, 64, 64); l.addColorStop(0, 'rgba(255,255,255,0.9)'); l.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = l; c.fillRect(64 - w / 2, 64 - h / 2, w, h); }
    const N = 260;
    this.stars = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }), N);
    for (let i = 0; i < N; i++) this.starPos.push(new THREE.Vector3((hash(i * 3) - 0.5) * 150, 4 + Math.pow(hash(i * 3 + 1), 0.7) * 55, -75 - hash(i * 3 + 2) * 10));
    this.scene.add(this.stars);
  }

  override async init() {
    if (this.ctx.params.chart) this.notes = (await (await fetch(this.ctx.params.chart)).json()).notes;
    const s = this.scene; s.background = new THREE.Color(0x05010c); s.fog = new THREE.Fog(0x05010c, 18, 70);
    // synthwave terrain (wireframe) on both sides and behind the highway
    const N = this.TN, SZ = 80; this.tpos = new Float32Array(N * N * 3); const idx: number[] = [];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i; this.tpos[k * 3] = (i / (N - 1) - 0.5) * SZ; this.tpos[k * 3 + 2] = -(j / (N - 1)) * SZ + 6;
      if (i < N - 1) idx.push(k, k + 1); if (j < N - 1) idx.push(k, k + N);
    }
    this.terrain.setAttribute('position', new THREE.BufferAttribute(this.tpos, 3)); this.terrain.setIndex(idx);
    s.add(new THREE.LineSegments(this.terrain, new THREE.LineBasicMaterial({ color: glow(0x9b3cff, 1.6) })));
    // a real full moon over the horizon (NASA LROC colour map, as in Iron Teeth) with a soft halo
    const moonMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.15, 1.15, 1.25), fog: false });
    const tex = await new THREE.TextureLoader().loadAsync('/tex/moon_lroc_color_1k.jpg'); tex.colorSpace = THREE.SRGBColorSpace; moonMat.map = tex;
    const moon = new THREE.Mesh(new THREE.SphereGeometry(6.5, 64, 40), moonMat); moon.position.set(0, 9, -68); moon.rotation.y = -Math.PI / 2; s.add(moon); this.moon = moon;
    const haloTex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const c = cv.getContext('2d')!; const g = c.createRadialGradient(128, 128, 40, 128, 128, 128);
      g.addColorStop(0, 'rgba(190,200,255,0.55)'); g.addColorStop(0.45, 'rgba(150,110,255,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(cv); })();
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    halo.position.set(0, 9, -70); s.add(halo); this.halo = halo;
    this.makeStars();
    // the highway: dark glossy strip, lane separators, glowing hit line
    const hw = new THREE.Mesh(new THREE.PlaneGeometry(LANES * LW + 0.2, 60), new THREE.MeshBasicMaterial({ color: 0x0a0418, transparent: true, opacity: 0.88 }));
    hw.rotation.x = -Math.PI / 2; hw.position.set(0, 0.01, -28); s.add(hw);
    for (let i = 0; i <= LANES; i++) {
      const l = new THREE.Mesh(new THREE.PlaneGeometry(0.025, 60), new THREE.MeshBasicMaterial({ color: glow(i === 0 || i === LANES ? 0x29e6ff : 0x6a4cff, i === 0 || i === LANES ? 2.5 : 1.2) }));
      l.rotation.x = -Math.PI / 2; l.position.set((i - LANES / 2) * LW, 0.02, -28); s.add(l);
    }
    const hit = new THREE.Mesh(new THREE.PlaneGeometry(LANES * LW + 0.3, 0.035), new THREE.MeshBasicMaterial({ color: glow(0xffffff, 1.3) }));
    hit.rotation.x = -Math.PI / 2; hit.position.set(0, 0.03, HIT_Z); s.add(hit);
    // keys under the hit line + their flash bursts
    const labelTex = (ch: string, col: string) => {
      const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d')!;
      c.fillStyle = '#000'; c.fillRect(0, 0, 128, 128); c.font = '800 80px "Archivo", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.shadowColor = col; c.shadowBlur = 18; c.fillStyle = col; c.fillText(ch, 64, 70);
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
    };
    const fade = (() => { const cv = document.createElement('canvas'); cv.width = 4; cv.height = 128; const c = cv.getContext('2d')!; const g = c.createLinearGradient(0, 128, 0, 0);
      g.addColorStop(0, '#fff'); g.addColorStop(0.35, '#555'); g.addColorStop(1, '#000'); c.fillStyle = g; c.fillRect(0, 0, 4, 128); return new THREE.CanvasTexture(cv); })();
    'DFJK'.split('').forEach((ch, i) => {
      const x = (i - LANES / 2 + 0.5) * LW, col = '#' + new THREE.Color(COLS[i]).getHexString();
      const key = new THREE.Mesh(new THREE.BoxGeometry(LW * 0.86, 0.12, 0.5), [0, 1, 2, 3, 4, 5].map((f) => f === 2
        ? new THREE.MeshBasicMaterial({ map: labelTex(ch, col), color: new THREE.Color(1, 1, 1) })
        : new THREE.MeshBasicMaterial({ color: glow(COLS[i]!, 0.35) })));
      key.position.set(x, 0.06, HIT_Z + 0.42); s.add(key); this.keys.push(key);
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(LW * 0.9, 1.3), new THREE.MeshBasicMaterial({ color: glow(COLS[i]!, 1.2), alphaMap: fade, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      fl.position.set(x, 0.65, HIT_Z); s.add(fl); this.flashes.push(fl);
    });
    // notes and hold trails (instanced, coloured per lane)
    const nm = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.noteMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(LW * 0.82, 0.08, 0.22), nm, 400);
    this.trailMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(LW * 0.3, 0.03, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }), 100);
    s.add(this.noteMesh, this.trailMesh);
  }

  shot(f: FrameInfo): Shot {
    const t = f.t, pulse = Math.pow(1 - (f.beat - Math.floor(f.beat)), 3);
    // terrain heaves: rolling hills + a beat swell, flat valley where the highway runs
    const A = this.ctx.audio, rows = this.TN;
    const amp: number[] = []; // per terrain row: the music's loudness a little earlier (the wave travels toward us)
    for (let j = 0; j < rows; j++) { const z = this.tpos[(j * rows) * 3 + 2]!, tt = t - (-z + 6) / 22; amp.push(0.4 + 2.6 * A.env('rms', tt) + 2.2 * A.env('low', tt)); }
    for (let k = 0; k < this.tpos.length / 3; k++) {
      const x = this.tpos[k * 3]!, z = this.tpos[k * 3 + 2]!, side = Math.min(1, Math.max(0, (Math.abs(x) - 2.2) / 6)), a = amp[Math.floor(k / rows)]!;
      this.tpos[k * 3 + 1] = side * (a * (0.6 + 0.4 * Math.sin(x * 0.35 + t * 0.8)) * (0.55 + 0.45 * Math.sin(z * 0.22 - t * 2.4)) + 1.2 * pulse * Math.exp(-Math.abs(z + 20) * 0.04) + Math.abs(x) * 0.1) - 0.05;
    }
    // the journey to the moon: it grows from a far disc to a huge one by the end of the song
    const prog = Math.min(1, Math.max(0, t / A.duration)), ms = 1 + 1.0 * prog; // steady approach: about twice as big by the end
    this.moon.scale.setScalar(ms); this.moon.position.y = 6 + 3 * ms; this.halo.scale.setScalar(ms); this.halo.position.y = this.moon.position.y; (this.halo.material as THREE.MeshBasicMaterial).opacity = 1 - 0.45 * prog;
    this.moon.rotation.x = 0.05 * t * 0.1;
    // stars: dim twinkle, and in each half-second slot a few random ones flare (behind the moon they are hidden by depth)
    const sm = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), col = new THREE.Color(), slot = Math.floor(t * 2);
    this.starPos.forEach((p, i) => {
      const tw = 0.25 + 0.2 * Math.sin(t * (1.5 + hash(i) * 3) + i), fl = hash(i * 7.3 + slot * 13.1) > 0.985 ? Math.sin(Math.PI * (t * 2 - slot)) : 0;
      const size = 0.5 + 0.4 * hash(i + 5) + 4.5 * fl; sc.set(size, size, 1); q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), fl * 0.6);
      sm.compose(p, q, sc); this.stars.setMatrixAt(i, sm); this.stars.setColorAt(i, col.setScalar(tw + 2.5 * fl));
    });
    this.stars.instanceMatrix.needsUpdate = true; if (this.stars.instanceColor) this.stars.instanceColor.needsUpdate = true;
    this.terrain.attributes.position!.needsUpdate = true;
    // notes fall toward the hit line; hit ones vanish into a flash
    const m = new THREE.Matrix4(), c = new THREE.Color(); let n = 0, tr = 0;
    const lit = [0, 0, 0, 0];
    for (const note of this.notes) {
      const dt = note.t - t, z = HIT_Z - (this.D(note.t) - this.D(t)), x = (note.lane - LANES / 2 + 0.5) * LW;
      if (dt < -0.25 - note.hold || z < -60) continue;
      if (dt <= 0) lit[note.lane] = Math.max(lit[note.lane]!, Math.exp(dt * 10) + (note.hold > 0 && -dt < note.hold ? 0.2 : 0));
      if (note.hold > 0) { // trail from the head to the tail
        const z0 = Math.min(HIT_Z, z), z1 = HIT_Z - (this.D(note.t + note.hold) - this.D(t));
        if (z0 > z1) { m.makeScale(1, 1, z0 - z1).setPosition(x, 0.05, (z0 + z1) / 2); this.trailMesh.setMatrixAt(tr, m); this.trailMesh.setColorAt(tr++, c.set(COLS[note.lane]!).multiplyScalar(0.8)); }
      }
      if (dt > 0) { m.makeTranslation(x, 0.08, z); this.noteMesh.setMatrixAt(n, m); this.noteMesh.setColorAt(n++, c.set(COLS[note.lane]!).multiplyScalar(1.8)); }
      if (n >= 400) break;
    }
    this.noteMesh.count = n; this.trailMesh.count = tr;
    this.noteMesh.instanceMatrix.needsUpdate = true; if (this.noteMesh.instanceColor) this.noteMesh.instanceColor.needsUpdate = true;
    this.trailMesh.instanceMatrix.needsUpdate = true; if (this.trailMesh.instanceColor) this.trailMesh.instanceColor.needsUpdate = true;
    this.keys.forEach((k, i) => { k.position.y = 0.06 - 0.05 * lit[i]!; ((k.material as THREE.MeshBasicMaterial[])[0]!).color.set(COLS[i]!).multiplyScalar(0.35 + 1.4 * lit[i]!); });
    this.flashes.forEach((fl, i) => { (fl.material as THREE.MeshBasicMaterial).opacity = Math.min(1, lit[i]!) * 0.3; fl.scale.y = 0.6 + 0.6 * lit[i]!; });
    this.cam.position.set(0, 3.3, 5.4); this.cam.lookAt(0, 0.2, -7);
    return { scene: this.scene, camera: this.cam, post: { bloom: 0.75, bloomThreshold: 0.95, vignette: 0.35, grain: 0.025, exposure: 1.0, aperture: 0, zoom: 1 + 0.012 * pulse } };
  }

  override overlay(c: CanvasRenderingContext2D, f: FrameInfo) {
    const hit = this.notes.filter((n) => n.t <= f.t), combo = hit.length;
    // judgement of the latest hit: mostly PERFECT, some GREAT / GOOD (deterministic per note), pops then fades
    const last = hit[hit.length - 1];
    if (last && f.t - last.t < 0.45) {
      const r = hash(Math.round(last.t * 1000) + last.lane), J = r < 0.68 ? ['PERFECT', '#ffe14a', '#ff2fd6'] : r < 0.9 ? ['GREAT', '#29e6ff', '#6a4cff'] : ['GOOD', '#5cff7a', '#1a9a5a'];
      const u = (f.t - last.t) / 0.45, sc = 1.25 - 0.25 * Math.min(1, u * 4);
      c.save(); c.globalAlpha = 1 - Math.max(0, (u - 0.6) / 0.4); c.translate(W / 2, H * 0.62 - 30 * u); c.scale(sc, sc);
      c.textAlign = 'center'; c.font = '900 84px "Archivo", sans-serif'; c.fillStyle = J[1]!; c.shadowColor = J[2]!; c.shadowBlur = 30; c.fillText(J[0]!, 0, 0);
      c.restore();
    }
    c.save(); c.textAlign = 'center'; c.shadowColor = '#29e6ff'; c.shadowBlur = 20; c.fillStyle = '#29e6ff';
    c.font = '700 30px "Archivo", sans-serif'; c.fillText('COMBO', W / 2, H * 0.53);
    c.font = '900 64px "Archivo", sans-serif'; c.fillText(String(combo), W / 2, H * 0.53 + 62); c.restore();
    c.save(); c.textAlign = 'left'; c.font = '700 34px "Plex Mono", monospace'; c.fillStyle = '#ff2fd6'; c.shadowColor = '#ff2fd6'; c.shadowBlur = 10;
    c.fillText(`SCORE ${String(combo * 1000 + combo * combo * 7).padStart(7, '0')}`, 40, 90); c.restore();
    // signature, bottom-right corner
    c.save(); c.textAlign = 'right'; c.font = 'italic 600 30px "Bradley Hand", "Marker Felt", cursive'; c.fillStyle = 'rgba(255,255,255,0.75)';
    c.shadowColor = '#ff2fd6'; c.shadowBlur = 12; c.fillText('Linh.NV', W - 36, H - 40); c.restore();
  }
}
