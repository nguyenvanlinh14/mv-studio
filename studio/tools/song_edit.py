"""Song edit for a project: insert a beat-locked break at a cut point, fill it with a filtered music bed and voice-over
clips, and shift the analysis (audio.json / lyrics.json) so every time after the cut moves with the music.

    ~/fun-video/venv/bin/python tools/song_edit.py projects/enter-en/edit.json

edit.json:
  { "song": "song.mp3", "stems": "<path to Demucs no_vocals.wav>", "out": "song-edit.wav",
    "cut": 52.368, "gap_beats": 20,
    "bed": { "lowpass": 450, "gain_db": -15 },
    "vo": [ { "clip": "vo/learned.wav", "at": 0.3, "gain_db": 0 },
            { "clip": "vo/trump-genius.wav", "at": 5.0, "gain_db": 4, "echo": true } ],
    "duck": [ ... optional VO over the song itself: { "clip", "time" (song time, before the edit), "gain_db", "duck_db" } ] }
Writes <out>, audio.edit.json, lyrics.edit.json and a "breaks" list into audio.edit.json for the plates.
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

cfg_path = Path(sys.argv[1]).resolve()
P = cfg_path.parent
cfg = json.loads(cfg_path.read_text())
SR = 48000


def load(path, sr=SR):
    out = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "2", "-ar", str(sr), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(out, dtype=np.float32).reshape(-1, 2).copy()


def ffilter(x, af):
    p = subprocess.run(["ffmpeg", "-v", "error", "-f", "f32le", "-ac", "2", "-ar", str(SR), "-i", "-", "-af", af, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], input=x.astype(np.float32).tobytes(), capture_output=True, check=True)
    return np.frombuffer(p.stdout, dtype=np.float32).reshape(-1, 2).copy()


db = lambda g: 10 ** (g / 20)
song = load(P / cfg["song"])
audio = json.loads((P / "audio.json").read_text())
period = audio["beat_period"]
cut = cfg["cut"]
gap = cfg["gap_beats"] * period
ci, gn = int(round(cut * SR)), int(round(gap * SR))

# --- voice-over ducked over the song itself (before the edit)
for d in cfg.get("duck", []):
    v = load(P / d["clip"]) * db(d.get("gain_db", 0))
    a = int(d["time"] * SR)
    b = min(len(song), a + len(v))
    env = np.ones(len(song), dtype=np.float32)
    ramp = int(0.12 * SR)
    lo = db(d.get("duck_db", -9))
    seg = np.full(b - a, lo, dtype=np.float32)
    seg[:ramp] = np.linspace(1, lo, min(ramp, len(seg)))[: len(seg[:ramp])]
    env[a:b] = seg
    env[b:b + ramp] = np.linspace(lo, 1, len(env[b:b + ramp]))
    song *= env[:, None]
    song[a:b] += v[: b - a]

# --- the break: a filtered loop of the instrumental right before the cut, voice-over on top
stems = load(Path(cfg["stems"]).expanduser()) if cfg.get("stems") else song
bed_src = stems[max(0, ci - gn):ci]
bed = ffilter(bed_src, f"lowpass=f={cfg['bed'].get('lowpass', 450)},volume={cfg['bed'].get('gain_db', -15)}dB")[:gn]
bed = np.pad(bed, ((0, gn - len(bed)), (0, 0)))
fade = int(0.08 * SR)
bed[:fade] *= np.linspace(0, 1, fade)[:, None]
for v in cfg["vo"]:
    clip = load(P / v["clip"])
    if v.get("echo"):
        clip = ffilter(clip, "acompressor=threshold=-18dB:ratio=3:attack=5:release=80,aecho=1.0:0.95:140|260:0.34|0.2")
    clip = clip * db(v.get("gain_db", 0))
    a = int(v["at"] * SR)
    b = min(gn, a + len(clip))
    bed[a:b] += clip[: b - a]

bed = ffilter(bed, 'alimiter=limit=0.93:attack=3:release=60')[:gn]  # loud voice-over without clipping the break
out = np.concatenate([song[:ci], bed, song[ci:]])
peak = np.max(np.abs(out))
if peak > 0.98:
    out *= 0.98 / peak
sf.write(P / cfg["out"], out, SR)

# --- shift the analysis
sh = lambda t: t + gap if t >= cut - 1e-6 else t
nb = int(round(gap / period))
beats = [b for b in audio["beats"] if b < cut] + [cut + i * period for i in range(nb)] + [sh(b) for b in audio["beats"] if b >= cut]
audio2 = dict(audio)
audio2["beats"] = beats
first_db = next((i for i, d in enumerate(audio["downbeats"]) if d >= cut), len(audio["downbeats"]))
audio2["downbeats"] = sorted({*(d for d in audio["downbeats"] if d < cut), *(cut + i * 4 * period for i in range(int(nb // 4))), *(sh(d) for d in audio["downbeats"][first_db:])})
audio2["duration"] = round(audio["duration"] + gap, 3)
fps = audio.get("fps", 100)
k0, kn = int(cut * fps), int(round(gap * fps))
for k, v in audio.items():
    if isinstance(v, list) and v and isinstance(v[0], (int, float)) and k not in ("beats", "downbeats", "bar_loudness"):
        audio2[k] = v[:k0] + [round(x * 0.25, 3) for x in v[max(0, k0 - kn):k0]][:kn] + v[k0:]
audio2["onsets"] = {k: [[sh(t), s] for t, s in v] for k, v in audio.get("onsets", {}).items()}
audio2["sections"] = [{**s, "start": sh(s["start"]), "end": sh(s["end"])} for s in audio.get("sections", [])]
audio2["breaks"] = [{"start": cut, "end": round(cut + gap, 3), "vo": [{**v, "start": round(cut + v["at"], 3)} for v in cfg["vo"]]}]
(P / "audio.edit.json").write_text(json.dumps(audio2))
lyr = json.loads((P / "lyrics.json").read_text())
for l in lyr["lines"]:
    l["start"], l["end"] = sh(l["start"]), sh(l["end"])
    for w in l["words"]:
        w["start"], w["end"] = sh(w["start"]), sh(w["end"])
(P / "lyrics.edit.json").write_text(json.dumps(lyr, ensure_ascii=False, indent=1))
print(f"break {cut:.3f}+{gap:.3f}s → {cfg['out']} ({len(out)/SR:.2f}s), audio.edit.json, lyrics.edit.json")
