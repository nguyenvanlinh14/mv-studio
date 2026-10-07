"""Word-level lyric timing -> analysis/lyrics.json (mv-studio lyrics schema).

1. mlx-whisper (large-v3-turbo) on the Demucs vocal stem, word timestamps, prompted with the known lyrics.
2. Needleman-Wunsch alignment of the known lyric syllables to the Whisper words (diacritic-insensitive).
3. Unmatched words are interpolated between matched neighbours; low-confidence words are flagged.

Run: HF_HOME=~/fun-video/.cache/hf ~/fun-video/venv/bin/python analysis/align.py
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent
VOC = ROOT / "work/stems/htdemucs/song/vocals.wav"
LYR = ROOT.parent / "lyrics/lyrics.txt"
WCACHE = ROOT / "work/whisper.json"


def norm(s):
    s = unicodedata.normalize("NFD", s.lower().replace("đ", "d"))
    return re.sub(r"[^a-z0-9]", "", "".join(c for c in s if unicodedata.category(c) != "Mn"))


# --- known lyrics: lines with section tags
lines, section = [], None
for raw in LYR.read_text().splitlines():
    raw = raw.strip()
    if not raw:
        continue
    if raw.startswith("["):
        section = raw.strip("[]").split(" - ")[0].strip()
        continue
    lines.append({"text": raw, "section": section, "words": raw.replace(",", " ").split()})

# --- whisper (cached)
if WCACHE.exists() and "--rerun" not in sys.argv:
    wres = json.loads(WCACHE.read_text())
else:
    import mlx_whisper
    prompt = " ".join(dict.fromkeys(l["text"] for l in lines))
    wres = mlx_whisper.transcribe(
        str(VOC), path_or_hf_repo="mlx-community/whisper-large-v3-turbo", language="vi",
        word_timestamps=True, initial_prompt=prompt, condition_on_previous_text=False,
        no_speech_threshold=0.5, hallucination_silence_threshold=2.0,
    )
    WCACHE.write_text(json.dumps(wres, ensure_ascii=False))

hyp = []
for seg in wres["segments"]:
    for w in seg.get("words", []):
        for tok in w["word"].replace(",", " ").split():  # whisper sometimes glues syllables
            if norm(tok):
                hyp.append({"w": tok, "n": norm(tok), "start": w["start"], "end": w["end"], "p": w.get("probability", 1.0)})

ref = [(li, wi, norm(w)) for li, l in enumerate(lines) for wi, w in enumerate(l["words"])]

# --- Needleman-Wunsch
def sim(a, b):
    if a == b:
        return 2.0
    if a[:2] == b[:2] or a[-2:] == b[-2:]:
        return 0.5
    return -1.0

G = -0.6
n, m = len(ref), len(hyp)
D = [[0.0] * (m + 1) for _ in range(n + 1)]
P = [[0] * (m + 1) for _ in range(n + 1)]
for i in range(1, n + 1):
    D[i][0], P[i][0] = i * G, 1
for j in range(1, m + 1):
    D[0][j], P[0][j] = j * G * 0.3, 2  # skipping whisper words (ad-libs, hallucinations) is cheap
for i in range(1, n + 1):
    for j in range(1, m + 1):
        opts = (D[i - 1][j - 1] + sim(ref[i - 1][2], hyp[j - 1]["n"]), D[i - 1][j] + G, D[i][j - 1] + G * 0.3)
        k = max(range(3), key=lambda x: opts[x])
        D[i][j], P[i][j] = opts[k], k
match = {}
i, j = n, m
while i > 0 and j > 0:
    k = P[i][j]
    if k == 0:
        if sim(ref[i - 1][2], hyp[j - 1]["n"]) > 0:
            match[i - 1] = j - 1
        i, j = i - 1, j - 1
    elif k == 1:
        i -= 1
    else:
        j -= 1

# --- assign times, interpolate gaps
T = [None] * n
for r, h in match.items():
    hw = hyp[h]
    T[r] = [hw["start"], hw["end"], round(hw["p"] * (1.0 if hw["n"] == ref[r][2] else 0.6), 2)]
known = [k for k in range(n) if T[k]]
for k in range(n):
    if T[k]:
        continue
    a = max((x for x in known if x < k), default=None)
    b = min((x for x in known if x > k), default=None)
    if a is not None and b is not None:
        t0, t1 = T[a][1], T[b][0]
        span = (t1 - t0) / (b - a)
        T[k] = [t0 + span * (k - a - 1), t0 + span * (k - a), 0.0]
    elif a is not None:
        T[k] = [T[a][1], T[a][1] + 0.3, 0.0]
    else:
        T[k] = [T[b][0] - 0.3, T[b][0], 0.0]

out_lines = []
for li, l in enumerate(lines):
    ws = [(wi, T[k]) for k, (rli, wi, _) in enumerate(ref) if rli == li]
    words = [{"w": l["words"][wi], "start": round(t[0], 3), "end": round(t[1], 3), "conf": t[2]} for wi, t in ws]
    out_lines.append({"i": li, "section": l["section"], "text": l["text"], "start": words[0]["start"], "end": words[-1]["end"], "words": words})

# --- sections from line timings; pad with instrumental parts and snap to downbeats
audio_p = ROOT / "audio.json"
secs = []
for l in out_lines:
    if secs and secs[-1]["name"] == l["section"] and l["start"] - secs[-1]["end"] < 4:
        secs[-1]["end"] = l["end"]
    else:
        secs.append({"name": l["section"], "start": l["start"], "end": l["end"]})
if audio_p.exists():
    audio = json.loads(audio_p.read_text())
    db = audio["downbeats"]
    snap = lambda t: min(db, key=lambda d: abs(d - t))
    for s in secs:
        s["start"] = round(snap(s["start"] - 0.3), 3)  # vocal pickups start just before the bar
    audio["sections"] = secs
    audio_p.write_text(json.dumps(audio))

(ROOT / "lyrics.json").write_text(json.dumps({"lines": out_lines, "notes": "mlx-whisper large-v3-turbo on Demucs htdemucs vocals + NW alignment to lyrics.txt; conf 0 = interpolated"}, ensure_ascii=False, indent=1))

# --- report
nm = sum(1 for t in T if t[2] > 0)
print(f"whisper words={m} lyric words={n} matched={nm} ({100*nm/n:.0f}%)")
print("whisper text:", " ".join(h["w"] for h in hyp)[:2000])
for s in secs:
    print(f"SECTION {s['name']:<11} {s['start']:7.2f}")
for l in out_lines:
    flag = " ⚠" if min(w["conf"] for w in l["words"]) < 0.3 else ""
    print(f"{l['start']:7.2f}–{l['end']:6.2f}  {l['text']}{flag}")
