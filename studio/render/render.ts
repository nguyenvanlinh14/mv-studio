// mv-studio renderer: drives the page in headless Chrome.
//   bun render/render.ts stills  --project lookdev --t 1,5,9 [--samples 16] [--out out/stills]
//   bun render/render.ts sheet   --project lookdev --t 1,5,9,13 [--cols 2] [--samples 16] [--out out/sheet.jpg]
//   bun render/render.ts video   --project enter-en [--from 0] [--to dur] [--fps 60] [--samples 16] [--shutter 0.4] [--crf 20] [--out out/x.mp4]
// Uses an already running dev server (--url, default http://localhost:5180) or starts a private one without HMR.
import { chromium } from 'playwright-core';
import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const mode = argv[0] ?? 'stills';
const opt = (k: string, d?: string) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const ROOT = path.resolve(import.meta.dir, '..');
const project = opt('project', 'lookdev')!;
const W = 1920, H = 1080;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function server(): Promise<{ url: string; stop: () => void }> {
  const url = opt('url', 'http://localhost:5180')!;
  try { if ((await fetch(url, { signal: AbortSignal.timeout(1500) })).ok) return { url, stop: () => {} }; } catch {}
  const port = 5199;
  const p = Bun.spawn(['bunx', 'vite', '--port', String(port), '--strictPort'], { cwd: ROOT, env: { ...process.env, STUDIO_NO_HMR: '1' }, stdout: 'ignore', stderr: 'ignore' });
  const u = `http://localhost:${port}`;
  for (let i = 0; i < 100; i++) { try { if ((await fetch(u)).ok) break; } catch {} await Bun.sleep(150); }
  return { url: u, stop: () => p.kill() };
}

async function page(base: string) {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader=false'] });
  const pg = await browser.newPage({ viewport: { width: W, height: H } });
  pg.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()); });
  await pg.goto(`${base}/?project=${project}&export=1`);
  await pg.waitForFunction(() => (window as any).studio?.ready || (window as any).studio?.error, null, { timeout: 120000 });
  const err = await pg.evaluate(() => (window as any).studio.error);
  if (err) throw new Error(err);
  const errs: string[] = await pg.evaluate(() => (window as any).studio.preload());
  if (errs.length) console.error('PLATE ERRORS\n' + errs.join('\n'));
  return { browser, pg };
}

async function stills(pg: any, times: number[], samples: number, dir: string) {
  mkdirSync(dir, { recursive: true });
  const files: string[] = [];
  for (const t of times) {
    const url: string = await pg.evaluate(([t, s]: [number, number]) => (window as any).studio.still(t, s), [t, samples]);
    const f = path.join(dir, `f_${t.toFixed(2).padStart(7, '0')}.png`);
    await Bun.write(f, Buffer.from(url.split(',')[1]!, 'base64'));
    files.push(f);
  }
  return files;
}

async function video(pg: any, from: number, to: number, fps: number, out: string) {
  mkdirSync(path.dirname(out), { recursive: true });
  const song = await pg.evaluate(() => (window as any).studio.song ?? null);
  const args = ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(fps), '-i', 'pipe:0'];
  const songPath = opt('song') ?? (song ? path.join(ROOT, song) : null);
  if (songPath) args.push('-ss', String(from), '-t', String(to - from), '-i', songPath);
  args.push('-vf', 'vflip,scale=out_color_matrix=bt709,setparams=color_primaries=bt709:color_trc=bt709', '-c:v', 'libx264', '-preset', opt('preset', 'medium')!, '-crf', opt('crf', '20')!, '-pix_fmt', 'yuv420p');
  if (songPath) args.push('-c:a', 'aac', '-b:a', '320k', '-shortest');
  args.push('-movflags', '+faststart', out);
  const ff = Bun.spawn(args, { stdin: 'pipe', stdout: 'inherit', stderr: 'inherit' });
  let got = 0;
  const total = Math.round(to * fps) - Math.round(from * fps);
  const t0 = performance.now();
  const ws = Bun.serve({
    port: 0,
    fetch(req, srv) { return srv.upgrade(req) ? undefined : new Response('ws only', { status: 400 }); },
    websocket: {
      async message(sock, msg) {
        ff.stdin.write(msg as Uint8Array); await ff.stdin.flush();
        got++; sock.send('1');
        if (got % 30 === 0 || got === total) {
          const el = (performance.now() - t0) / 1000, rate = got / el;
          process.stdout.write(`\r${got}/${total} frames  ${rate.toFixed(1)} fps  eta ${Math.round((total - got) / rate)}s   `);
        }
      },
    },
  });
  await pg.evaluate((o: any) => (window as any).studio.stream(o), { from, to, fps, samples: +opt('samples', '16')!, shutter: +opt('shutter', '0.4')!, url: `ws://localhost:${ws.port}` });
  ff.stdin.end();
  await ff.exited;
  ws.stop();
  console.log(`\nwrote ${out} (${got} frames in ${((performance.now() - t0) / 1000).toFixed(1)}s)`);
}

const srv = await server();
const { browser, pg } = await page(srv.url);
try {
  const times = (opt('t') ?? '0').split(',').map(Number);
  const samples = +opt('samples', '16')!;
  if (mode === 'stills') console.log((await stills(pg, times, samples, path.resolve(opt('out', path.join(ROOT, 'out/stills'))!))).join('\n'));
  else if (mode === 'sheet') {
    const tmp = path.join(ROOT, 'out/.sheet');
    rmSync(tmp, { recursive: true, force: true });
    const files = await stills(pg, times, samples, tmp);
    const cols = +opt('cols', '2')!, rows = Math.ceil(files.length / cols);
    const out = path.resolve(opt('out', path.join(ROOT, 'out/sheet.jpg'))!);
    const inputs = files.flatMap((f) => ['-i', f]);
    const layout = files.map((_, i) => `${(i % cols) * W}_${Math.floor(i / cols) * H}`).join('|');
    const scale = opt('width', '1800');
    const p = Bun.spawn(['ffmpeg', '-y', '-loglevel', 'error', ...inputs, '-filter_complex', `xstack=inputs=${files.length}:layout=${layout}:fill=black,scale=${scale}:-1`, '-frames:v', '1', '-q:v', '3', out]);
    await p.exited;
    console.log(out, `${cols}x${rows}`);
  } else if (mode === 'video') {
    const dur: number = await pg.evaluate(() => (window as any).studio.duration);
    await video(pg, +opt('from', '0')!, +opt('to', String(dur))!, +opt('fps', '60')!, path.resolve(opt('out', path.join(ROOT, `out/${project}.mp4`))!));
  }
} finally {
  await browser.close();
  srv.stop();
}
