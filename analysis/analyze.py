"""Beat / downbeat / section / envelope analysis -> analysis/audio.json (mv-studio audio schema).

Run: ~/fun-video/venv/bin/python analysis/analyze.py
"""
import json
from pathlib import Path

import librosa
import numpy as np

import os
ROOT = Path(__file__).resolve().parent
PROJ = os.environ.get("PROJECT", "chay")
WORK = ROOT / "work" if PROJ == "chay" else ROOT / "work" / PROJ
OUT = ROOT if PROJ == "chay" else ROOT / PROJ
OUT.mkdir(exist_ok=True)
SONG = WORK / "song.wav"
STEMS = WORK / "stems/htdemucs/song"
FPS = 100  # envelope frame rate expected by the engine

y, sr = librosa.load(SONG, sr=22050, mono=True)
dur = len(y) / sr
hop = sr // FPS

# --- tempo + beat grid: assume constant tempo (AI-generated pop), fit a straight line to tracked beats
onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
tempo, beat_frames = librosa.beat.beat_track(onset_envelope=onset_env, sr=sr, hop_length=hop, units="frames")
bt = librosa.frames_to_time(beat_frames, sr=sr, hop_length=hop)
idx = np.arange(len(bt))
period, phase = np.polyfit(idx, bt, 1)
phase = phase % period
beats = np.arange(phase, dur, period)
bpm = 60.0 / period

# --- downbeat: pick the beat phase (0..3) whose beats carry the most low-band energy (kick on "1")
S = np.abs(librosa.stft(y, hop_length=hop, n_fft=2048))
freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)
band = lambda lo, hi: S[(freqs >= lo) & (freqs < hi)].sum(0)
low = band(20, 150)
bf = np.clip((beats * FPS).astype(int), 0, len(low) - 1)
scores = [low[bf[k::4]].mean() for k in range(4)]
off = int(np.argmax(scores))
downbeats = beats[off::4]


def env(x):
    x = np.asarray(x, float)
    x = x / (np.percentile(x, 99.5) + 1e-9)
    return np.round(np.clip(x, 0, 1.5), 3).tolist()


rms = librosa.feature.rms(y=y, hop_length=hop)[0]
out = {
    "duration": round(dur, 3),
    "bpm": round(bpm, 3),
    "beat_period": round(period, 5),
    "time_signature": 4,
    "beats": np.round(beats, 3).tolist(),
    "downbeats": np.round(downbeats, 3).tolist(),
    "fps": FPS,
    "rms": env(rms),
    "low": env(low),
    "mid": env(band(150, 2000)),
    "high": env(band(2000, 11000)),
}

# --- stem envelopes (vocals / instrumental) from Demucs two-stem output
for name, key in (("vocals", "vocal"), ("no_vocals", "other")):
    p = STEMS / f"{name}.wav"
    if p.exists():
        ys, _ = librosa.load(p, sr=sr, mono=True)
        out[key] = env(librosa.feature.rms(y=ys, hop_length=hop)[0])

# --- kick onsets: low-band onset peaks
kick_env = librosa.onset.onset_strength(S=librosa.amplitude_to_db(S[(freqs < 150)]), sr=sr, hop_length=hop)
pk = librosa.util.peak_pick(kick_env, pre_max=3, post_max=3, pre_avg=5, post_avg=5, delta=0.5, wait=10)
kv = kick_env[pk] / (kick_env.max() + 1e-9)
out["onsets"] = {"kick": [[round(t, 3), round(float(v), 3)] for t, v in zip(pk / FPS, kv)]}

# --- sections: loudness per bar, novelty on bar-level chroma+rms
bar_rms = [float(rms[int(a * FPS):int(b * FPS)].mean()) for a, b in zip(downbeats[:-1], downbeats[1:])]
out["bar_loudness"] = [round(v / max(bar_rms), 3) for v in bar_rms]
out["notes"] = f"Constant tempo fit; downbeat phase {off}. Sections are filled in by align.py from lyric line timings."

(OUT / "audio.json").write_text(json.dumps(out))
print(f"bpm={bpm:.2f} period={period:.4f}s phase={phase:.3f} downbeat_off={off} beats={len(beats)} bars={len(downbeats)} dur={dur:.1f}s")
print("bar loudness:", " ".join(f"{v:.1f}" for v in out["bar_loudness"]))
