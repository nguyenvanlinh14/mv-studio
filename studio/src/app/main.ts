// Preview player (?project=<name>&t=<s or m:ss>) and the export API used by render/render.ts (?export=1).
import { Engine, W, H } from '../core/engine';

const q = new URLSearchParams(location.search);
const PROJECT = q.get('project') ?? 'lookdev';
const EXPORT = q.has('export');
const parseT = (v: string | null) => {
  if (!v) return null;
  const m = /^(\d+):(\d+(?:\.\d+)?)$/.exec(v.trim());
  const x = m ? +m[1]! * 60 + +m[2]! : parseFloat(v);
  return Number.isFinite(x) ? x : null;
};

const canvas = document.getElementById('view') as HTMLCanvasElement;
const errBox = document.getElementById('error')!;
const showErr = (s: string) => { errBox.textContent = s; errBox.style.display = 'block'; };
const engine = new Engine(canvas);

declare global { interface Window { studio: any } }

async function boot() {
  await engine.load(PROJECT);
  document.title = `${engine.project.title} · mv-studio`;
  if (EXPORT) return exportApi();
  player();
}

function exportApi() {
  document.body.classList.add('export');
  const gl = engine.renderer.getContext();
  const px = new Uint8Array(W * H * 4);
  let ws: WebSocket | null = null;
  window.studio = {
    duration: engine.duration,
    song: engine.songUrl(),
    cues: engine.cues.map(({ id, start, end, samples }) => ({ id, start, end, samples })),
    errors: engine.errors,
    async preload() { await engine.preload(); return engine.errors; },
    /** Render t and return a PNG data URL of the canvas. */
    still(t: number, samples = 1) { engine.render(t, { samples, fps: 60 }); return canvas.toDataURL('image/png'); },
    /** Stream frames [from, to) at fps as raw RGBA (bottom-up) over a WebSocket; waits for an ack per frame. */
    async stream(o: { from: number; to: number; fps: number; samples: number; shutter: number; url: string }) {
      ws = new WebSocket(o.url); ws.binaryType = 'arraybuffer';
      await new Promise((ok, no) => { ws!.onopen = ok; ws!.onerror = no; });
      let acked = 0;
      ws.onmessage = () => { acked++; };
      const n0 = Math.round(o.from * o.fps), n1 = Math.round(o.to * o.fps);
      for (let n = n0; n < n1; n++) {
        const t = n / o.fps;
        const cue = engine.cueAt(t);
        engine.render(t, { samples: cue?.samples ?? o.samples, shutter: o.shutter, fps: o.fps, frame: n });
        gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
        while (n - n0 - acked > 3) await new Promise((r) => setTimeout(r, 1));
        ws.send(px);
      }
      while (acked < n1 - n0) await new Promise((r) => setTimeout(r, 2));
      ws.close();
      return n1 - n0;
    },
  };
  window.studio.ready = true;
}

function player() {
  const url = engine.songUrl();
  const audio = new Audio(url ?? '');
  const seek = document.getElementById('seek') as HTMLInputElement;
  const status = document.getElementById('status')!;
  seek.max = String(engine.duration);
  let t = parseT(q.get('t')) ?? 0, playing = false, lastA = 0, lastP = 0, frames = 0, fpsT = performance.now(), fps = 0;
  const go = (x: number) => { if (!Number.isFinite(x)) return; t = Math.max(0, Math.min(engine.duration - 1e-3, x)); if (url) audio.currentTime = t; };
  go(t);
  const toggle = () => { playing = !playing; if (playing) { lastP = performance.now(); lastA = t; if (url) { audio.currentTime = t; void audio.play(); } } else audio.pause(); };
  canvas.onclick = toggle;
  seek.oninput = () => go(parseFloat(seek.value));
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === ' ') { e.preventDefault(); toggle(); }
    if (e.key === 'ArrowRight') go(t + (e.shiftKey ? 5 : 1));
    if (e.key === 'ArrowLeft') go(t - (e.shiftKey ? 5 : 1));
    if (e.key === '.') go(t + 1 / 60);
    if (e.key === ',') go(t - 1 / 60);
    if (e.key === ']') { const c = engine.cues.find((x) => x.start > t + 0.01); if (c) go(c.start); }
    if (e.key === '[') { const cs = engine.cues.filter((x) => x.start < t - 0.3); const c = cs[cs.length - 1]; if (c) go(c.start); }
  });
  const tick = () => {
    const now = performance.now();
    if (playing) {
      if (url) { if (audio.currentTime !== lastA) { lastA = audio.currentTime; lastP = now; } t = lastA + (audio.paused ? 0 : (now - lastP) / 1000); }
      else { t = lastA + (now - lastP) / 1000; if (t >= engine.duration) { t = 0; lastA = 0; lastP = now; } }
    }
    engine.render(t, { samples: 1 });
    seek.value = String(t);
    frames++;
    if (now - fpsT > 500) { fps = (frames * 1000) / (now - fpsT); frames = 0; fpsT = now; }
    const cue = engine.cueAt(t);
    status.textContent = `${t.toFixed(2)}s  beat ${engine.audio.beatAt(t).toFixed(2)}  [${cue?.id ?? '—'}]  ${fps.toFixed(0)} fps   ${PROJECT}`;
    if (engine.errors.length) showErr(engine.errors.join('\n\n'));
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

boot().catch((e) => { console.error(e); showErr(String(e?.stack ?? e)); window.studio = { error: String(e?.stack ?? e) }; });
