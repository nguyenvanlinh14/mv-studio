// Shots of the wolves on the frozen ridge (9:16). One shared world; each shot places the pack and a camera.
import * as THREE from 'three';
import { Plate, type FrameInfo, type Shot } from '../../src/core/plate';
import { W, H } from '../../src/core/engine';
import { mulberry } from '../chanbo-lookdev/field';
import { FrozenRidge, HOWL, RING, type Wolf, type WolfClip } from './world';

type V3 = [number, number, number];
let world: FrozenRidge | null = null, loading: Promise<void> | null = null;
const shared = () => (world ??= new FrozenRidge());

/** paw prints laid along a straight path: from point (x, z) heading yaw, at distances from..to (m) every step, alternating +-gap sideways */
type Trail = { x: number; z: number; yaw: number; from: number; to: number; step: number; gap: number };
type Place = { /** absolute clip time for the main clip (gait phase tied to distance) */ gait?: number; /** cross-fade to a second clip */ mix?: { clip: WolfClip; t: number; w: number }; x: number; z: number; yaw: number; clip: WolfClip; speed?: number; howl?: number; jaw?: number; trail?: Trail; y?: number; /** hold the clip near this time (head-up moment) */ at?: number; phase?: number };
type ShotDef = { /** extra degrees of field of view gained per second (a slow pull-back) */ zoomOut?: number; /** show the hero rock (only the shots where a wolf stands on it); hidden elsewhere so it never looms behind the pack */ rock?: boolean; /** hero snowflake: flies from just in front of the lens into the scene */ flake?: boolean; /** pull focus this far toward the camera from the target (eyes sit in front of the head centre) */ focusAhead?: number; pack: (w: FrozenRidge, L: number, t: number) => Place[]; cam: (w: FrozenRidge, L: number, lead: THREE.Vector3) => [V3, V3]; fov: number; ap?: number; wind?: number };
const head = new THREE.Vector3();
/** the running pack: the leader in front, 12 more in a loose arrowhead behind it (offsets back / sideways, gait phase) */
const FORM = (() => { const R = mulberry(23); return Array.from({ length: 13 }, (_, i) => i === 0 ? [0, 0, 0] : [1.6 + Math.floor((i - 1) / 3) * 1.5 + R() * 0.6, (((i - 1) % 3) - 1) * (1.1 + Math.floor((i - 1) / 3) * 0.35) + (R() - 0.5) * 0.5, R()]); })();
const RUN_V = 6; // m/s
const WALK_V = 0.42; // m/s: a slow, stately walk (the Walk clip advances by distance / 1.4 m, so the feet never slide)
const WALK_T0 = 2.0, WALK_RAMP = 0.7; // the intro wolf stands until 2 s, then eases into its walk
/** metres walked after `L` seconds of the intro shot (0 until WALK_T0, then a smooth start-up) */
const walked = (L: number, t0 = 0, ramp = WALK_RAMP) => { const u = Math.max(0, L - t0); return u < ramp ? WALK_V * u * u / (2 * ramp) : WALK_V * (u - ramp / 2); };
const smooth = (a: number, b: number, x: number) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
// cinematic close-up: the white leader walks toward a low static camera set diagonally ahead of its path (about 34 degrees off)
const FACE = { x: -1.0, z: -2.5, yaw: 0.5 };
const faceAt = (L: number): [number, number] => [FACE.x + Math.sin(FACE.yaw) * WALK_V * L, FACE.z + Math.cos(FACE.yaw) * WALK_V * L];
const runPack = (x0: number, z0: number, yaw: number, L: number, w: FrozenRidge): Place[] => {
  const fx = Math.sin(yaw), fz = Math.cos(yaw), sx = Math.cos(yaw), sz = -Math.sin(yaw);
  return FORM.map(([back, side, ph]) => { const d = L * RUN_V - back!; const x = x0 + fx * d + sx * side!, z = z0 + fz * d + sz * side!; return { x, z, y: w.height(x, z), yaw, clip: 'Gallop' as WolfClip, speed: 1.25, phase: ph!, trail: { x: x0 + sx * side!, z: z0 + sz * side!, yaw, from: -14, to: d - 1.1, step: 0.8, gap: 0.14 } }; });
};
/** the whole pack howls together: leader front-centre, rows stacked into depth so the narrow 9:16 frame holds all 13 */
const HOWL_PACK: [number, number][] = [
  [2.0, 1.2],
  [-0.4, 0.2], [4.4, 0.2],
  [-0.8, -1.4], [0.9, -1.4], [3.1, -1.4], [4.8, -1.4],
  [-1.2, -3.2], [0.5, -3.2], [2.0, -3.2], [3.6, -3.2], [5.2, -3.2],
  [2.0, -5.0],
];
const packHowl = (w: FrozenRidge, t: number): Place[] => HOWL_PACK.map(([x, z], i) => ({
  x, z, y: w.height(x, z), yaw: Math.PI / 2 - 0.5 + Math.sin(i * 2.3) * 0.35, clip: 'Idle' as WolfClip,
  at: 1 + 0.12 * Math.sin(t * 0.7 + i * 1.7), howl: i ? 0.8 + 0.2 * Math.sin(t * 0.9 + i * 2.1) : 1,
  jaw: 0.72 + 0.28 * Math.sin(t * 3.1 + i * 1.3), // each throat opens on its own rhythm
}));
const WALK_PACK_V = 0.55; // m/s: the whole pack walks a little quicker than the lone intro wolf
/** the pack walking in the same arrowhead as runPack; gait phase follows distance so the paws never slide */
const walkPack = (x0: number, z0: number, yaw: number, L: number, w: FrozenRidge): Place[] => {
  const fx = Math.sin(yaw), fz = Math.cos(yaw), sx = Math.cos(yaw), sz = -Math.sin(yaw);
  return FORM.map(([back, side, ph]) => {
    const d = L * WALK_PACK_V - back!, x = x0 + fx * d + sx * side!, z = z0 + fz * d + sz * side!;
    return { x, z, y: w.height(x, z), yaw, clip: 'Walk' as WolfClip, gait: (L * WALK_PACK_V) / 1.4 + ph! * 1.6, trail: { x: x0 + sx * side!, z: z0 + sz * side!, yaw, from: -14, to: d - 0.7, step: 0.34, gap: 0.09 } };
  });
};
/** a camera that rides alongside the leader, ahead of it and to its left (about 35 degrees off its heading), at a fixed height */
const track = (yaw: number, ahead: number, side: number, up: number) => (w: FrozenRidge, _L: number, h: THREE.Vector3): [V3, V3] => {
  const fx = Math.sin(yaw), fz = Math.cos(yaw), cx = h.x + fx * ahead - Math.cos(yaw) * side, cz = h.z + fz * ahead + Math.sin(yaw) * side;
  return [[cx, w.height(cx, cz) + up, cz], [h.x, w.height(h.x, h.z) + 0.85, h.z]];
};
/** the pack standing quietly, heads half raised, watching the sky */
const packStand = (w: FrozenRidge, t: number): Place[] => packHowl(w, t).map((p, i) => ({ ...p, howl: 0.3 + 0.08 * Math.sin(t * 0.5 + i), jaw: 0 }));

export const SHOTS: Record<string, ShotDef> = {
  // silhouette on the outcrop against the moon, head rising into a howl
  howl: {
    rock: true,
    fov: 24, ap: 1.5,
    pack: (w, L) => [{ x: HOWL.x, z: HOWL.z, y: w.howlTop, yaw: Math.PI / 2, clip: 'Idle', at: 1, howl: Math.min(1, L * 0.6) }],
    // camera on the line from the moon through the raised head, so the head sits inside the disc
    cam: (w, L, h) => { const d = 7.5 - L * 0.15, m = w.camDir; return [[h.x - m.x * d, h.y - m.y * d, h.z - m.z * d], [h.x, h.y + 1.2, h.z]]; },
  },
  // opening: wide on the leader standing in the moon; a single crisp snowflake drifts from the lens into the scene
  flake: {
    rock: true,
    fov: 26, ap: 2.2, flake: true, wind: 0.5,
    pack: (w, L, t) => {
      const D = walked(L, WALK_T0), x0 = HOWL.x - walked(4.58, WALK_T0), x = x0 + D, ww = smooth(WALK_T0 - 0.35, WALK_T0 + 0.5, L);
      return [{ x, z: HOWL.z, y: w.rockY(x, HOWL.z), yaw: Math.PI / 2, clip: 'Idle', at: 0, gait: 1 + 0.15 * Math.sin(t * 0.8), mix: { clip: 'Walk', t: D / 1.4, w: ww }, trail: { x: x0, z: HOWL.z, yaw: Math.PI / 2, from: 0, to: D - 0.7, step: 0.34, gap: 0.09 } }];
    }, // stands (idle, breathing) until 2 s, then eases into a slow walk
    cam: (w, L, h) => { const d = 13 - L * 0.4, m = w.camDir; return [[h.x - m.x * d, h.y - m.y * d, h.z - m.z * d], [h.x, h.y + 1.6, h.z]]; },
  },
  // the pack howls: low wide camera from the front, moon high at the top right, slow push-in
  packhowl: {
    fov: 46, ap: 1.5, wind: 0.6,
    pack: (w, L, t) => packHowl(w, t),
    cam: (w, L) => [[2.6, w.height(2.6, 8.2) + 0.4, 8.2 - L * 0.12], [1.8, 2.9, -3]],
  },
  // the pack howls: closer, diagonal from the left, drifting past the leader
  packhowl2: {
    fov: 40, ap: 2.5, wind: 0.6,
    pack: (w, L, t) => packHowl(w, t),
    cam: (w, L) => [[-5.2 + L * 0.2, w.height(-5.2, 7.6) + 0.5, 7.6 - L * 0.05], [2.2, 2.7, -1.6]],
  },
  // side-on medium of the howl, moon behind the raised head
  howlside: {
    rock: true,
    fov: 30, ap: 4,
    pack: (w) => [{ x: HOWL.x, z: HOWL.z, y: w.howlTop, yaw: Math.PI / 2, clip: 'Idle', at: 1, howl: 1 }],
    cam: (w, L) => [[HOWL.x + 0.6 - L * 0.05, w.howlTop + 0.45, HOWL.z + 4.6], [HOWL.x + 0.2, w.howlTop + 1.0, HOWL.z]],
  },
  // close on the face, three-quarter, snow streaming past
  face: {
    fov: 32, ap: 3, wind: 1.4, focusAhead: 0.1,
    pack: (w, L) => { const [x, z] = faceAt(L); return [{ x, z, yaw: FACE.yaw, clip: 'Walk', gait: WALK_V * L / 1.4, trail: { x: FACE.x, z: FACE.z, yaw: FACE.yaw, from: -5, to: WALK_V * L - 0.7, step: 0.34, gap: 0.09 } }]; },
    cam: (w, L, h) => {
      const [x, z] = faceAt(2), fx = Math.sin(FACE.yaw), fz = Math.cos(FACE.yaw), cx = x + fx * 3.6 + fz * -2.0, cz = z + fz * 3.6 - fx * -2.0;
      return [[cx - L * 0.04, w.height(cx, cz) + 0.62 + L * 0.03, cz + L * 0.02], [h.x - Math.sin(FACE.yaw) * 1.0, h.y - 0.35, h.z - Math.cos(FACE.yaw) * 1.0]]; // aim a little behind the head so the trail of prints stays in frame
    },
  },
  // tracking gallop along the ridge
  gallop: {
    fov: 40, ap: 4, wind: 1.6,
    pack: (_w, L) => [{ x: -6 + L * 7.5, z: -2, yaw: Math.PI / 2, clip: 'Gallop', speed: 1.2, trail: { x: -6, z: -2, yaw: Math.PI / 2, from: -12, to: L * 7.5 - 1.0, step: 0.8, gap: 0.14 } }],
    cam: (_w, _L, h) => [[h.x - 1.6, h.y - 0.3, h.z + 4.0], [h.x - 0.5, h.y - 0.2, h.z]],
  },
  // chorus hero: low camera behind the runners looking up, so the aurora curtains hang over the streaming pack
  runsky: {
    fov: 52, ap: 2.5, wind: 1.8,
    pack: (w, L) => runPack(-11, 0.5, Math.PI / 2, L, w),
    cam: (w, L, h) => [[h.x - 4.5, w.height(h.x - 4.5, h.z + 7.5) + 0.4, h.z + 7.5], [h.x + 1.0, h.y + 3.2, h.z - 3]],
  },
  // chorus: the whole pack running — side tracking on the leader
  run: {
    fov: 50, ap: 3, wind: 1.8,
    pack: (w, L) => runPack(-11, 0.5, Math.PI / 2, L, w),
    cam: (_w, L, h) => [[h.x - 2.2, h.y - 0.1, h.z + 7.5], [h.x - 1.4, h.y + 2.1, h.z - 1]],
  },
  // chorus: still side-on, but the camera pulls back and rises on the beat so the whole pack runs under the aurora
  // (the pack carries on from the "run" shot: its leader is already 2 s down the track)
  runwide: {
    fov: 50, ap: 2, wind: 1.9, zoomOut: 5,
    pack: (w, L) => runPack(-11, 0.5, Math.PI / 2, L + 2, w),
    cam: (_w, L, h) => [[h.x - 2.2 - L * 0.9, h.y - 0.1 + L * 0.4, h.z + 7.5 + L * 2.0], [h.x - 1.4 + L * 0.3, h.y + 2.1 + L * 0.25, h.z - 1]],
  },
  // chorus: head-on, the pack pours toward a low camera that backs away
  runfront: {
    fov: 54, ap: 2.5, wind: 1.8,
    pack: (w, L) => runPack(-9.5, -16, 0, L, w),
    cam: (_w, L, h) => [[h.x + 0.4, h.y - 0.45, h.z + 4.5], [h.x, h.y + 1.2, h.z - 3]],
  },
  // chorus: high crane over the pack streaming across the snow
  runaerial: {
    fov: 50, ap: 1, wind: 1.8,
    pack: (w, L) => runPack(-11, 0.5, Math.PI / 2, L, w),
    cam: (_w, L, h) => [[h.x - 4 + L * 0.3, h.y + 7.5, h.z + 6], [h.x - 3, h.y - 0.5, h.z]],
  },
  // verse: the pack walks past in formation, side-on, camera drifting with the leader
  walkside: {
    fov: 42, ap: 2.5, wind: 1.0,
    pack: (w, L) => walkPack(-8, 0.5, Math.PI / 2, L, w),
    cam: (_w, L, h) => [[h.x - 1.0 - L * 0.1, h.y + 0.1, h.z + 6.8], [h.x - 1.2, h.y + 1.2, h.z - 1]],
  },
  // diagonal close tracking shots of the leader (walking / running), never head-on
  walktrack: {
    fov: 36, ap: 2.2, wind: 1.0, focusAhead: 0.1,
    pack: (w, L) => walkPack(-6, 0.5, Math.PI / 2, L, w),
    cam: (w, L, h) => track(Math.PI / 2, 3.3, 2.6, 0.55)(w, L, h),
  },
  runtrack: {
    fov: 40, ap: 2.2, wind: 1.9, focusAhead: 0.1,
    pack: (w, L) => runPack(-11, 0.5, Math.PI / 2, L, w),
    cam: (w, L, h) => track(Math.PI / 2, 3.6, 2.7, 0.55)(w, L, h),
  },
  // the pack walks away from a low camera toward the standing stones, aurora overhead
  walkaway: {
    fov: 50, ap: 2, wind: 0.8,
    pack: (w, L) => walkPack(1.0, 5.5, Math.PI, L, w),
    cam: (w, L) => [[1.0, w.height(1.0, 16.5) + 0.5, 16.5 - L * 0.05], [1.0, 2.4, -8]],
  },
  // the pack stands watching the sky
  packwatch: {
    fov: 44, ap: 1.5, wind: 0.6,
    pack: (w, L, t) => packStand(w, t),
    cam: (w, L) => [[2.6, w.height(2.6, 8.2) + 0.4, 8.2 - L * 0.1], [1.8, 2.9, -3]],
  },
  // the pack walks out of the stone ring toward the camera
  pack: {
    fov: 42, ap: 3,
    pack: (_w, L) => [[0, 0], [-1.3, -1.6], [1.4, -1.9], [0.2, -3.4]].map(([dx, dz], i) => ({ x: RING.x + dx!, z: RING.z + 2 + dz! + L * 1.0, yaw: 0, clip: 'Walk' as WolfClip, speed: 0.9 + i * 0.05 })),
    cam: (w, L) => [[RING.x - 0.6, w.height(RING.x - 0.6, RING.z + 8) + 0.5, RING.z + 8 - L * 0.2], [RING.x, w.height(RING.x, RING.z) + 0.9, RING.z]],
  },
};

export class WolfShot extends Plate {
  cam = new THREE.PerspectiveCamera(40, W / H, 0.05, 1500);
  def = SHOTS[this.ctx.params.shot ?? 'howl']!;
  override async init() { const w = shared(); (w.flake.material as THREE.MeshPhysicalMaterial).envMap = this.ctx.env; await (loading ??= Promise.all([w.ready, w.loadWolves(13)]).then(() => {})); }
  shot(f: FrameInfo): Shot {
    const w = shared(), d = this.def, places = d.pack(w, f.local, f.t);
    w.wolves.forEach((wolf: Wolf, i) => {
      const p = places[i]; wolf.root.visible = !!p; if (!p) return;
      wolf.root.position.set(p.x, p.y ?? w.height(p.x, p.z), p.z); wolf.root.rotation.y = p.yaw;
      wolf.pose(p.clip, p.gait ?? (p.at !== undefined ? p.at + f.local * 0.04 : f.t + (p.phase ?? wolf.seed * 0.37)), { speed: p.speed, howl: p.howl, jaw: p.jaw, mix: p.mix });
      wolf.root.updateMatrixWorld(true);
    });
    const b0 = w.wolves[0]!.bones; b0.Head?.getWorldPosition(head); if (b0.Head_end) head.lerp(b0.Head_end.getWorldPosition(new THREE.Vector3()), 0.5);
    const [pos, at] = d.cam(w, f.local, head);
    pos[1] = Math.max(pos[1], w.height(pos[0], pos[2]) + 0.3);
    this.cam.position.set(...pos); this.cam.lookAt(...at); this.cam.fov = d.fov + (d.zoomOut ?? 0) * f.local * 0.12; this.cam.updateProjectionMatrix();
    w.rock.visible = !!d.rock;
    w.setAurora(this.ctx.params.aurora ?? 0, f.t);
    w.prints.reset();
    for (const p of places) if (p.trail) {
      const T = p.trail, fx = Math.sin(T.yaw), fz = Math.cos(T.yaw);
      for (let k = Math.ceil(T.from / T.step), s0 = k * T.step; s0 <= T.to; s0 += T.step, k++) {
        const side = (k & 1 ? 1 : -1) * T.gap, x = T.x + fx * s0 + fz * side, z = T.z + fz * s0 - fx * side;
        w.prints.add(x, w.groundY(x, z), z, T.yaw);
      }
    }
    w.prints.flush();
    w.update(f.t, d.wind ?? 1, new THREE.Vector3(...at));
    let bloom = 0.6, focus = this.cam.position.distanceTo(new THREE.Vector3(...at)) - (d.focusAhead ?? 0);
    w.flake.visible = !!d.flake;
    if (d.flake) {
      // camera space: starts 16 cm in front of the lens, eases out to ~7 m, drifting up-left and tumbling slowly
      const p = Math.pow(f.progress, 2.6), off = new THREE.Vector3(0.004 - 0.22 * p + 0.003 * Math.sin(f.local * 1.3), -0.006 + 0.38 * p + 0.004 * Math.sin(f.local * 1.7), -(0.16 + 7 * p)); // 9:16 is narrow: stay near the centre line
      w.flake.position.copy(this.cam.position).add(off.applyQuaternion(this.cam.quaternion));
      w.flake.scale.setScalar(0.011 * (1 + 20 * p)); // grows as it recedes, so it stays a readable hero crystal for the whole opening
      w.flake.quaternion.copy(this.cam.quaternion); w.flake.rotateX(-0.5 + 0.25 * Math.sin(f.local * 0.9)); w.flake.rotateY(0.3 * Math.sin(f.local * 0.6)); w.flake.rotateZ(f.local * 0.5);
      // focus rides the flake, then racks to the wolf in the last 25 %
      const df = this.cam.position.distanceTo(w.flake.position), rack = Math.min(1, Math.max(0, (f.progress - 0.75) / 0.25));
      focus = df + (focus - df) * rack * rack * (3 - 2 * rack);
      bloom = 0.08 + 0.52 * Math.min(1, df / 2); // a big bright flake near the lens would bloom into a white blob
    }
    const fade = Math.min(1, Math.max(0, (f.t - 177.8) / 1.2)); // the Short ends at 179 s, just under 3 minutes
    return { scene: w.scene, camera: this.cam, post: { fade, bloom, bloomThreshold: 0.95, vignette: 0.45, grain: 0.03, exposure: 1.25, focus, aperture: d.ap ?? 3, tint: [0.9, 1.0, 1.12] } };
  }
  override overlay(c: CanvasRenderingContext2D) {
    if (this.ctx.params.label) { c.font = '600 30px "Plex Mono"'; c.fillStyle = '#fff'; c.fillText(this.ctx.params.label, 40, 70); }
  }
}
