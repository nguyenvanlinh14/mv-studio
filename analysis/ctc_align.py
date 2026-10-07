"""CTC forced alignment of the pilot window (known lyrics -> exact word boundaries).

Model: nguyenvulebinh/wav2vec2-base-vietnamese-250h (char-level CTC, Vietnamese with diacritics).
Input: Demucs vocal stem, clip [T0, T1]. Lines: those whose first-pass start lies in the window.
Overwrites those lines' word timings in analysis/lyrics.json; writes analysis/pilot.json.

Run: HF_HOME=~/fun-video/.cache/hf ~/fun-video/venv/bin/python analysis/ctc_align.py
"""
import json
import unicodedata
from pathlib import Path

import librosa
import numpy as np
import torch
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor

ROOT = Path(__file__).resolve().parent
T0, T1 = 46.2, 77.6  # clip: after "bay lên" ends -> end of chorus 1 tail
PILOT = (45.841, 76.13)  # video window (downbeat before chorus 1 -> after "âm thanh")
MODEL = "nguyenvulebinh/wav2vec2-base-vietnamese-250h"

lyr = json.loads((ROOT / "lyrics.json").read_text())
lines = [l for l in lyr["lines"] if l["section"] == "Chorus"][:4]  # chorus 1

proc = Wav2Vec2Processor.from_pretrained(MODEL)
model = Wav2Vec2ForCTC.from_pretrained(MODEL).eval()
vocab = proc.tokenizer.get_vocab()
blank = proc.tokenizer.pad_token_id
sep = vocab.get("|")

y, _ = librosa.load(ROOT / "work/stems/htdemucs/song/vocals.wav", sr=16000, mono=True, offset=T0, duration=T1 - T0)
with torch.no_grad():
    x = proc(y, sampling_rate=16000, return_tensors="pt").input_values
    logp = torch.log_softmax(model(x).logits[0], -1).numpy()  # (frames, vocab)
fdur = (T1 - T0) / logp.shape[0]

# token sequence: chars of each word, '|' between words; remember which tokens belong to which word
words = [w for l in lines for w in l["words"]]
toks, owner = [], []
for wi, w in enumerate(words):
    for ch in unicodedata.normalize("NFC", w["w"].lower()):
        if ch in vocab:
            toks.append(vocab[ch]); owner.append(wi)
    if sep is not None and wi < len(words) - 1:
        toks.append(sep); owner.append(-1)

# Viterbi over the CTC trellis (blank-free path through tokens, blanks/repeats absorbed)
T, N = logp.shape[0], len(toks)
NEG = -1e9
tr = np.full((T + 1, N + 1), NEG)
tr[0, 0] = 0
stay = logp[:, blank]
for t in range(T):
    tr[t + 1, 0] = tr[t, 0] + stay[t]
    emit = logp[t, toks]
    tr[t + 1, 1:] = np.maximum(tr[t, 1:] + np.maximum(stay[t], emit), tr[t, :-1] + emit)
# backtrack: for each token, the frame where it was entered
t, j = T, N
enter = [0] * N
while j > 0 and t > 0:
    emit = logp[t - 1, toks[j - 1]]
    if tr[t - 1, j - 1] + emit >= tr[t - 1, j] + max(stay[t - 1], emit):
        enter[j - 1] = t - 1
        j -= 1
    t -= 1

score = {}
for wi in range(len(words)):
    idx = [k for k in range(N) if owner[k] == wi]
    if not idx:
        continue
    s = enter[idx[0]]
    nxt = next((enter[k] for k in range(idx[-1] + 1, N) if owner[k] >= 0), None)
    e = enter[idx[-1]] + 1
    # extend the word end while its last char is still the most likely token (sustained vowel), up to the next word
    lim = nxt if nxt is not None else T
    while e < lim and np.argmax(logp[e]) == toks[idx[-1]]:
        e += 1
    words[wi]["start"] = round(T0 + s * fdur, 3)
    words[wi]["end"] = round(T0 + max(e, s + 3) * fdur, 3)
    words[wi]["conf"] = round(float(np.exp(np.mean([logp[enter[k], toks[k]] for k in idx]))), 2)

for l in lines:
    l["start"], l["end"] = l["words"][0]["start"], l["words"][-1]["end"]

lyr["notes"] += "; pilot chorus re-aligned with CTC (wav2vec2-base-vietnamese-250h)"
(ROOT / "lyrics.json").write_text(json.dumps(lyr, ensure_ascii=False, indent=1))
(ROOT / "pilot.json").write_text(json.dumps({"start": PILOT[0], "end": PILOT[1], "lines": [l["i"] for l in lines]}))
for l in lines:
    print(f"{l['start']:6.2f}–{l['end']:6.2f}  " + "  ".join(f"{w['w']} {w['start']:.2f}{'?' if w['conf'] < 0.3 else ''}" for w in l["words"]))
