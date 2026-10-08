# mv-studio

**Code-rendered 3D music videos.** Lyrics synced word by word to the vocals, cuts locked to the beat, real depth
(PBR materials, mirror floors, fog, depth of field), bloom, film grain and motion blur — every frame is a pure function
of song time, so the live preview and the final 1080p60 export are identical.

First video: **"Enter! Enter! Enter!"** — an office where everyone, from the intern to the CEO, only presses Enter,
while a neon AI turns into SI. (`studio/projects/enter-en`)

Second video: **"Tinh tinh tính lương về"** (Vietnamese) — neon notes roll out of the depth on the beat and climb up to
draw one picture per section (clock, laptop, AI → SI chip, a stock chart that goes vertical on "SUPER LƯƠNG", coins…),
with neon traffic, skyline, beams and data rain behind, and a "show me the money" cheat break where the music ducks under
the SI voice. (`studio/projects/luong-neon`, kits `studio/src/kit/neondraw.ts` + `neonenv.ts`)

## What's inside

| Part | What it does |
|---|---|
| `studio/src/core` | Engine: project loader, plate timeline with cut transitions (whip · zoom · glitch · flash · dissolve), sub-frame motion blur with sub-pixel jitter, post chain (depth-of-field bokeh, bloom, ACES-style grade, vignette, grain), 2D overlay |
| `studio/src/kit` | Building blocks: instanced PBR keycaps with glowing ENTER legends, lit stage (soft shadows, rim light, mirror floor, fog), neon AI → SI hologram, human figures, overlay type (word slams, typing, glitch words) |
| `studio/render` | Headless Chrome renderer: stills, contact sheets, video (raw frames → ffmpeg x264 + AAC) |
| `studio/tools` | Optional Gemini TTS voice-over generator, song edit tool (beat-locked breaks with voice-over) |
| `studio/projects/<name>` | One video per folder: `timeline.ts`, `plates/`, `song.mp3`, `audio.json`, `lyrics.json` |
| `analysis/` | Song analysis in Python: tempo + beat grid (librosa), vocal stem (Demucs), word timings by CTC forced alignment (wav2vec2, Vietnamese or English) |
| `lyrics/` | Lyrics with section tags and style prompts for AI music generators |

## Requirements

- [bun](https://bun.sh), Google Chrome, ffmpeg with libx264
- Python 3.12+ for `analysis/` (librosa, demucs, torch, transformers, mlx-whisper on Apple Silicon)
- Tested on an Apple M2 (16 GB): 1080p60, one render worker

## Quick start

```sh
cd studio
bun install
bunx vite --port 5180                 # preview: http://localhost:5180/?project=enter-en&t=0:52
```

Preview keys: `space` play/pause · `←/→` ±1 s (shift ±5 s) · `,`/`.` ±1 frame · `[`/`]` previous/next plate. `?t=` takes seconds or `m:ss`.

### Render

```sh
cd studio
bun render/render.ts sheet --project enter-en --t 3,20,41,55,86,101 --cols 3 --samples 12 --out out/sheet.jpg
bun render/render.ts video --project enter-en --fps 60 --samples 12 --shutter 0.4 --crf 20 --out out/enter-en.mp4
```

Drafts: `--fps 30 --samples 4 --preset veryfast`. The full "Enter! Enter! Enter!" (2:26, 1080p60, 12 sub-frames)
renders in about 36 minutes on an M2.

## Make your own video

1. **Song + lyrics.** Put the song in `music/` and the lyrics with section tags (`[Verse 1]`, `[Chorus]`…) in `lyrics/<name>.txt`.
2. **Analyse** (writes `analysis/<name>/audio.json` + `lyrics.json`):
   ```sh
   ffmpeg -i music/song.mp3 -ar 44100 analysis/work/<name>/song.wav
   (cd analysis/work/<name> && python -m demucs -n htdemucs --two-stems vocals -o stems song.wav)
   PROJECT=<name> python analysis/analyze.py
   PROJECT=<name> CTC_MODEL=facebook/wav2vec2-base-960h python analysis/ctc_full.py   # English; default model is Vietnamese
   ```
3. **Project.** Create `studio/projects/<name>/` with `song.mp3`, the two JSON files and a `timeline.ts` that returns
   cues (`{ id, plate, start, end, params, transition }`). Cut points come from the lyrics and the beat grid, e.g.
   `audio.timeOfBeat(Math.floor(audio.beatAt(lyrics.get('Nine a.m.').words[0].start)))`.
4. **Plates.** A plate is a class with `shot(frame)` returning `{ scene, camera, post }` and an optional `overlay(ctx2d, frame)`.
   Everything must depend on `frame.t` only (sub-frames are rendered in any order). See `projects/enter-en/plates/` and
   `projects/lookdev/plates.ts`.

## Optional voice-over (Gemini TTS)

`bun tools/tts.ts --project <name>` reads `projects/<name>/vo.json` and writes `vo/<id>.wav`. The API key is read from
`GEMINI_API_KEY` or a repo-root `.env` (gitignored, see `.env.example`). Generated clips are committed, so anyone can
render a project without a key; without a key the tool just skips.

## Credits & license

- Code: MIT (`LICENSE`).
- Fonts: [Archivo](https://fonts.google.com/specimen/Archivo) and [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono), SIL Open Font License (`studio/public/fonts/OFL-*.txt`).
- Libraries: three.js, Vite, playwright-core, librosa, Demucs, Hugging Face transformers (wav2vec2), mlx-whisper.
- Songs in `music/` and `studio/projects/*/song.mp3` were AI-generated from the author's own lyrics.
