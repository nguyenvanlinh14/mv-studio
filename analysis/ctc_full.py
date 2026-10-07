"""Whole-song CTC forced alignment: lyrics.txt -> analysis/lyrics.json (word level).

wav2vec2 (Vietnamese, char CTC) logits are computed on overlapping 30 s chunks of the Demucs vocal stem and
stitched; one Viterbi pass aligns the full lyric text (all lines, in order) to the whole song. Line/section
tags come from lyrics.txt. Sections are written into analysis/audio.json snapped to downbeats.

Run: HF_HOME=~/fun-video/.cache/hf ~/fun-video/venv/bin/python analysis/ctc_full.py
"""
import json
import unicodedata
from pathlib import Path

import librosa
import numpy as np
import torch
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor

import os
ROOT = Path(__file__).resolve().parent
PROJ = os.environ.get("PROJECT", "chay")
WORK = ROOT / "work" if PROJ == "chay" else ROOT / "work" / PROJ
OUT = ROOT if PROJ == "chay" else ROOT / PROJ
LYRF = ROOT.parent / ("lyrics/lyrics.txt" if PROJ == "chay" else f"lyrics/{PROJ}.txt")
MODEL = os.environ.get("CTC_MODEL", "nguyenvulebinh/wav2vec2-base-vietnamese-250h")  # English: facebook/wav2vec2-base-960h
SR, CH, OV = 16000, 30.0, 4.0

# --- lyrics with section tags (instrumental sections kept for the timeline)
lines, sections_tagged, section = [], [], None
for raw in LYRF.read_text().splitlines():
    raw = raw.strip()
    if not raw:
        continue
    if raw.startswith("["):
        section = raw.strip("[]").split(" - ")[0].strip()
        sections_tagged.append({"name": section, "first_line": len(lines), "instrumental": "instrumental" in raw or "fade" in raw})
        continue
    lines.append({"text": raw, "section": section, "words": [w for w in raw.replace(",", " ").split() if any(ch.isalnum() for ch in w)]})

proc = Wav2Vec2Processor.from_pretrained(MODEL)
model = Wav2Vec2ForCTC.from_pretrained(MODEL).eval()
vocab = proc.tokenizer.get_vocab()
UPPER = "A" in vocab and "a" not in vocab  # English CTC models use an upper-case alphabet
blank, sep = proc.tokenizer.pad_token_id, vocab.get("|")

y, _ = librosa.load(WORK / "stems/htdemucs/song/vocals.wav", sr=SR, mono=True)
dur = len(y) / SR

# --- stitched logits (frame rate from the first chunk)
parts, t = [], 0.0
while t < dur:
    a, b = int(max(0, t - OV) * SR), int(min(dur, t + CH + OV) * SR)
    with torch.no_grad():
        x = proc(y[a:b], sampling_rate=SR, return_tensors="pt").input_values
        lp = torch.log_softmax(model(x).logits[0], -1).numpy()
    fps = lp.shape[0] / ((b - a) / SR)
    s0 = int(round((t - a / SR) * fps))
    s1 = s0 + int(round(min(CH, dur - t) * fps))
    parts.append(lp[s0:s1])
    t += CH
logp = np.concatenate(parts)
fdur = dur / logp.shape[0]
print(f"frames={logp.shape[0]} fdur={fdur*1000:.1f}ms")

# --- tokens
words = [(li, wi, w) for li, l in enumerate(lines) for wi, w in enumerate(l["words"])]
toks, owner = [], []
for k, (_, _, w) in enumerate(words):
    for ch in unicodedata.normalize("NFC", w.upper() if UPPER else w.lower()):
        if ch in vocab:
            toks.append(vocab[ch]); owner.append(k)
    if sep is not None and k < len(words) - 1:
        toks.append(sep); owner.append(-1)

# --- Viterbi (backpointers kept as a bool matrix: True = advanced to this token at this frame)
T, N = logp.shape[0], len(toks)
NEG = -1e9
prev = np.full(N + 1, NEG); prev[0] = 0
adv = np.zeros((T, N + 1), dtype=bool)
stay_b = logp[:, blank]
toks_a = np.array(toks)
for t in range(T):
    emit = logp[t, toks_a]
    stay = prev.copy()
    stay[1:] += np.maximum(stay_b[t], emit)
    stay[0] += stay_b[t]
    move = np.full(N + 1, NEG); move[1:] = prev[:-1] + emit
    adv[t] = move > stay
    prev = np.where(adv[t], move, stay)
enter = [0] * N
j = N
for t in range(T - 1, -1, -1):
    if j == 0:
        break
    if adv[t, j]:
        enter[j - 1] = t
        j -= 1

out_lines = []
for li, l in enumerate(lines):
    ws = []
    for k, (wli, wi, w) in enumerate(words):
        if wli != li:
            continue
        idx = [n for n in range(N) if owner[n] == k]
        s = enter[idx[0]]
        nxt = next((enter[n] for n in range(idx[-1] + 1, N) if owner[n] >= 0), T)
        e = enter[idx[-1]] + 1
        while e < nxt and np.argmax(logp[e]) == toks[idx[-1]]:
            e += 1
        conf = float(np.exp(np.mean([logp[enter[n], toks[n]] for n in idx])))
        ws.append({"w": w, "start": round(s * fdur, 3), "end": round(max(e, s + 3) * fdur, 3), "conf": round(conf, 2)})
    out_lines.append({"i": li, "section": l["section"], "text": l["text"], "start": ws[0]["start"], "end": ws[-1]["end"], "words": ws})

# --- clamp word ends with the vocal envelope (CTC lets a final syllable swallow a long instrumental gap)
audio = json.loads((OUT / "audio.json").read_text())
venv = np.array(audio["vocal"]); efps = audio["fps"]
def vocal_end(s, e):
    i0, i1 = int((s + 0.15) * efps), int(e * efps)
    quiet = 0
    for i in range(i0, min(i1, len(venv))):
        quiet = quiet + 1 if venv[i] < 0.12 else 0
        if quiet >= 25:  # 250 ms of silence
            return min(e, (i - 24) / efps + 0.08, s + 4.0)
    return min(e, s + 4.0)
for l in out_lines:
    for w in l["words"]:
        w["end"] = round(vocal_end(w["start"], w["end"]), 3)
    l["end"] = l["words"][-1]["end"]

# ad-lib the lyric sheet does not have (heard by Whisper, sung over the outro)
ADLIB = [("Là", 157.3), ("âm", 158.6), ("thanh", 159.2)] if PROJ == "chay" else []
ws = []
for k, (w, s) in enumerate(ADLIB):
    e = ADLIB[k + 1][1] if k + 1 < len(ADLIB) else s + 2.5
    ws.append({"w": w, "start": s, "end": round(vocal_end(s, e), 3), "conf": 0.5})
if ws: out_lines.append({"i": len(out_lines), "section": "Outro", "text": "Là âm thanh", "start": ws[0]["start"], "end": ws[-1]["end"], "words": ws, "adlib": True})

(OUT / "lyrics.json").write_text(json.dumps({"lines": out_lines, "notes": "whole-song CTC forced alignment (wav2vec2-base-vietnamese-250h) on Demucs vocals"}, ensure_ascii=False, indent=1))

# --- sections (snapped to downbeats); instrumental ones sit between their neighbours
db = audio["downbeats"]
snap = lambda t: min(db, key=lambda d: abs(d - t))
secs = []
for i, s in enumerate(sections_tagged):
    nxt_line = sections_tagged[i + 1]["first_line"] if i + 1 < len(sections_tagged) else len(lines)
    if not s["instrumental"] and s["first_line"] < nxt_line:
        start = snap(out_lines[s["first_line"]]["start"] - 0.3)
    elif s["first_line"] == 0:
        start = 0.0
    else:
        start = snap(out_lines[s["first_line"] - 1]["end"] + 0.5)
    secs.append({"name": s["name"], "start": round(start, 3)})
secs[0]["start"] = 0.0
for i, s in enumerate(secs):
    s["end"] = secs[i + 1]["start"] if i + 1 < len(secs) else round(dur, 3)
audio["sections"] = secs
(OUT / "audio.json").write_text(json.dumps(audio))

beats = np.array(audio["beats"]); half = audio["beat_period"] / 2
for s in secs:
    print(f"SECTION {s['name']:<11} {s['start']:7.2f}–{s['end']:7.2f}")
for l in out_lines:
    offs = [abs(((w["start"] - beats[0]) / half) - round((w["start"] - beats[0]) / half)) * half for w in l["words"]]
    print(f"{l['start']:7.2f}–{l['end']:6.2f} grid±{np.mean(offs)*1000:4.0f}ms conf{np.mean([w['conf'] for w in l['words']]):.2f}  {l['text']}")
