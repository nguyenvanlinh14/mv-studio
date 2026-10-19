// Optional AI restyle of a rendered clip with Seedance 2.5 on fal.ai ("editing" task: keep the motion, camera and
// layout of the input video, change the look). Local only: reads FAL_KEY from the environment or the repo-root .env
// (gitignored). Costs money per call on the user's fal account; without a key the tool just explains and exits.
//   bun tools/seedance.ts --in out/chanbo-3d-karaoke-10s.mp4 --out out/chanbo-seedance-10s.mp4 [--res 720p] [--prompt "..."]
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const opt = (k: string, d?: string) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const ROOT = path.resolve(import.meta.dir, '..');
const ENDPOINT = 'bytedance/seedance-2.5/reference-to-video';

function key(): string | null {
  if (process.env.FAL_KEY) return process.env.FAL_KEY;
  const f = path.resolve(ROOT, '..', '.env');
  if (!existsSync(f)) return null;
  const m = /^FAL_KEY=(.+)$/m.exec(readFileSync(f, 'utf8'));
  return m ? m[1]!.trim() : null;
}

const input = path.resolve(ROOT, opt('in', 'out/chanbo-3d-karaoke-10s.mp4')!);
const output = path.resolve(ROOT, opt('out', 'out/chanbo-seedance-10s.mp4')!);
const prompt = opt('prompt',
  'Edit @Video1 into photorealistic live-action footage, keep every camera move, cut, timing and object position exactly. ' +
  'Golden-hour countryside of northern Vietnam: an old banyan tree with hanging aerial roots, a small communal house with ' +
  'a curved clay-tile roof, a lotus pond, a dirt road, tall bamboo, young green rice paddies, red-tile village houses and ' +
  'haystacks; real Vietnamese yellow cattle with calves and one black-and-white dairy cow grazing; the opening shot is a ' +
  'modern glass skyscraper campus with a tree-lined plaza. Natural film look, soft warm sunlight, gentle haze. ' +
  'Remove all on-screen text and subtitles.')!;

const k = key();
if (!k) {
  console.log('no FAL_KEY — add FAL_KEY=... to the repo-root .env (or the environment) to run Seedance; nothing was sent.');
  process.exit(0);
}
const auth = { Authorization: `Key ${k}`, 'Content-Type': 'application/json' };
const video = `data:video/mp4;base64,${readFileSync(input).toString('base64')}`;
const body = { prompt, task: 'editing', video_urls: [video], resolution: opt('res', '720p'), generate_audio: false };

const sub = await fetch(`https://queue.fal.run/${ENDPOINT}`, { method: 'POST', headers: auth, body: JSON.stringify(body) });
if (!sub.ok) { console.error('submit failed', sub.status, await sub.text()); process.exit(1); }
const { request_id, status_url, response_url } = (await sub.json()) as any;
console.log('submitted', request_id);
for (;;) {
  await Bun.sleep(5000);
  const st = (await (await fetch(status_url, { headers: auth })).json()) as any;
  process.stdout.write(`\r${st.status}            `);
  if (st.status === 'COMPLETED') break;
  if (st.status === 'FAILED' || st.error) { console.error('\nfailed', JSON.stringify(st)); process.exit(1); }
}
const res = (await (await fetch(response_url, { headers: auth })).json()) as any;
const url = res?.video?.url;
if (!url) { console.error('\nno video in response', JSON.stringify(res)); process.exit(1); }
await Bun.write(output, await (await fetch(url)).arrayBuffer());
console.log(`\nwrote ${output} (seed ${res.seed}) — mux the song back in with ffmpeg if you want audio`);
