# Voice-over sources

- `vo/money.wav`, `vo/money-2.wav` — "Show me the money." generated with Gemini TTS (`tools/tts.ts`, voices Charon / Fenrir) from `vo.json`.
- `vo/money-si.wav` (used) — `money.wav` processed into the "SI" voice: pitch −8 %, robotised FFT layer, octave-down sub layer,
  flanger, short echo, loudness-normalised.
- `vo/typing.wav` — synthesised key clicks (one per character of "show me the money") + Enter.
- Placed in a 12-beat break after "giờ là Ess-Eye" (`edit.json`, `tools/song_edit.py`): typing at +0.5 s, voice at +2.3 s,
  music bed = the instrumental stem low-passed at 700 Hz, −11 dB. The phrase nods to the StarCraft cheat code; no game audio,
  font or artwork is used.
- The earlier Trump clip was dropped here on 2026-10-08 (owner's decision).
