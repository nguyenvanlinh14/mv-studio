"""Re-align only the pilot window: Whisper on a vocal clip, then trim word ends with the vocal envelope.

Overwrites the words of lines inside [T0, T1] in analysis/lyrics.json and records the window in analysis/pilot.json.
Run: HF_HOME=~/fun-video/.cache/hf ~/fun-video/venv/bin/python analysis/refine_window.py
"""
import json
import re
import unicodedata
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent
T0, T1 = 45.841, 76.13  # pilot window: downbeat before chorus 1 -> end of "âm thanh"
PAD = 1.5

audio = json.loads((ROOT / "audio.json").read_text())
lyr = json.loads((ROOT / "lyrics.json").read_text())
lines = [l for l in lyr["lines"] if T0 - 1 < l["start"] < T1]


def norm(s):
    s = unicodedata.normalize("NFD", s.lower().replace("đ", "d"))
    return re.sub(r"[^a-z0-9]", "", "".join(c for c in s if unicodedata.category(c) != "Mn"))


y, sr = sf.read(ROOT / "work/stems/htdemucs/song/vocals.wav")
y = y.mean(1) if y.ndim > 1 else y
a = int((T0 - PAD) * sr)
clip = ROOT / "work/pilot_vocals.wav"
sf.write(clip, y[a:int((T1 + PAD) * sr)], sr)

import mlx_whisper
res = mlx_whisper.transcribe(str(clip), path_or_hf_repo="mlx-community/whisper-large-v3-turbo", language="vi",
                             word_timestamps=True, initial_prompt=" ".join(l["text"] for l in lines),
                             condition_on_previous_text=False)
off = T0 - PAD
hyp = [{"n": norm(t), "w": t, "s": w["start"] + off, "e": w["end"] + off, "p": w["probability"]}
       for seg in res["segments"] for w in seg["words"] for t in w["word"].replace(",", " ").split() if norm(t)]
print("clip whisper:", " ".join(h["w"] for h in hyp))

# greedy monotonic match per word (window is short, lyrics known); keep previous timing when no match
ref = [w for l in lines for w in l["words"]]
j = 0
for w in ref:
    for k in range(j, min(j + 4, len(hyp))):
        if hyp[k]["n"] == norm(w["w"]) or (hyp[k]["n"][:1] == norm(w["w"])[:1] and abs(hyp[k]["s"] - w["start"]) < 1.0):
            w["start"], w["end"], w["conf"] = round(hyp[k]["s"], 3), round(hyp[k]["e"], 3), round(hyp[k]["p"], 2)
            j = k + 1
            break

# trim ends: vocal RMS (10 ms) — a word ends where energy falls below 25% of its own peak, or at the next start
hop = sr // 100
rms = np.sqrt(np.convolve(y ** 2, np.ones(hop) / hop, "same")[::hop])
for i, w in enumerate(ref):
    nxt = ref[i + 1]["start"] if i + 1 < len(ref) else w["end"] + 1.0
    s, e = int(w["start"] * 100), int(max(nxt, w["start"] + 0.12) * 100)
    seg = rms[s:e]
    if len(seg) > 3:
        pk = int(np.argmax(seg))
        below = np.where(seg[pk:] < 0.25 * seg[pk])[0]
        end = (s + pk + below[0]) / 100 if len(below) else nxt
        w["end"] = round(min(max(end, w["start"] + 0.12), nxt), 3)
for l in lines:
    l["start"], l["end"] = l["words"][0]["start"], l["words"][-1]["end"]

(ROOT / "lyrics.json").write_text(json.dumps(lyr, ensure_ascii=False, indent=1))
(ROOT / "pilot.json").write_text(json.dumps({"start": T0, "end": T1, "lines": [l["i"] for l in lines]}))
for l in lines:
    print(f"{l['start']:6.2f}  " + " ".join(f"{w['w']}[{w['start']:.2f}–{w['end']:.2f}]{'?' if w['conf'] < 0.3 else ''}" for w in l["words"]))
