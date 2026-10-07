// Optional voice-over generator (Gemini TTS). Local only: reads GEMINI_API_KEY from the environment or from the repo
// root .env (gitignored). Generated clips are saved to projects/<p>/vo/<id>.wav and committed, so anyone can render the
// project without a key. Without a key this tool just reports what is missing and exits 0.
//   bun tools/tts.ts --project enter-en [--force] [--model gemini-3.8-flash-tts]
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const opt = (k: string, d?: string) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const ROOT = path.resolve(import.meta.dir, '..');
const project = opt('project')!;
const model = opt('model', process.env.GEMINI_TTS_MODEL ?? 'gemini-3.8-flash-tts')!;
const force = argv.includes('--force');

function key(): string | null {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  const f = path.resolve(ROOT, '..', '.env');
  if (!existsSync(f)) return null;
  const m = /^GEMINI_API_KEY=(.+)$/m.exec(readFileSync(f, 'utf8'));
  return m ? m[1]!.trim().replace(/^["']|["']$/g, '') : null;
}

type Line = { id: string; text: string; voice?: string; style?: string };
const dir = path.join(ROOT, 'projects', project);
const lines: Line[] = JSON.parse(readFileSync(path.join(dir, 'vo.json'), 'utf8')).lines;
mkdirSync(path.join(dir, 'vo'), { recursive: true });
const todo = lines.filter((l) => force || !existsSync(path.join(dir, 'vo', `${l.id}.wav`)));
if (!todo.length) { console.log('all voice-over clips present'); process.exit(0); }
const k = key();
if (!k) { console.log(`no GEMINI_API_KEY — skipping ${todo.length} clip(s); the render will use the committed clips only`); process.exit(0); }

for (const l of todo) {
  // only the words to speak: an instruction prefix gets read aloud by the TTS model, so the tone comes from the voice
  const prompt = l.style ? `${l.style}: ${l.text}` : l.text;
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': k },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: l.voice ?? 'Charon' } } } },
    }),
  });
  const j: any = await r.json();
  if (!r.ok) { console.error(`${l.id}: HTTP ${r.status} ${j.error?.message ?? ''}`); continue; }
  const part = j.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
  if (!part) { console.error(`${l.id}: no audio in response`); continue; }
  const rate = +(/rate=(\d+)/.exec(part.inlineData.mimeType ?? '')?.[1] ?? 24000);
  const pcm = Buffer.from(part.inlineData.data, 'base64');
  const out = path.join(dir, 'vo', `${l.id}.wav`);
  const ff = Bun.spawn(['ffmpeg', '-y', '-loglevel', 'error', '-f', 's16le', '-ar', String(rate), '-ac', '1', '-i', 'pipe:0', out], { stdin: 'pipe' });
  ff.stdin.write(pcm); ff.stdin.end(); await ff.exited;
  console.log(`${l.id}: ${(pcm.length / 2 / rate).toFixed(2)} s → ${path.relative(ROOT, out)}`);
}
