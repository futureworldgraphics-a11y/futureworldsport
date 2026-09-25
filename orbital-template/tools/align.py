#!/usr/bin/env python3
"""ALIGN. Word-level timestamps for a narration, fully offline.

    python3 tools/align.py audio/<name>.mp3 transcript.txt [--out audio/<name>.words.txt]

Forced alignment of the KNOWN transcript against the audio (pocketsphinx; its English model ships
inside the pip wheel, so no network is needed):  pip install pocketsphinx

Output (one word per line):  <start_s> <end_s> <frame@30fps> <word>
plus a summary of the pauses (>= 0.25 s) that scene changes should prefer.
Words the dictionary does not know are dropped from the alignment and given interpolated times
(marked with *), so check those by ear if a cue depends on one.
"""
import re, subprocess, sys, tempfile, wave, os
from pocketsphinx import Decoder

args = [a for a in sys.argv[1:] if not a.startswith("--")]
if len(args) < 2: sys.exit(__doc__)
audio, script = args[0], args[1]
out = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else re.sub(r"\.[^.]+$", "", audio) + ".words.txt"

raw = open(script, encoding="utf-8").read()
words = [w for w in re.sub(r"[^a-z0-9' ]+", " ", raw.lower().replace("’", "'")).split() if w.strip("'")]

tmp = tempfile.mkdtemp()
wav = os.path.join(tmp, "a.wav")
subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", audio, "-ac", "1", "-ar", "16000", wav], check=True)
dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", audio], capture_output=True, text=True).stdout)

d = Decoder(bestpath=False)
known = [(i, w) for i, w in enumerate(words) if d.lookup_word(w)]
dropped = [w for i, w in enumerate(words) if not d.lookup_word(w)]
d.set_align_text(" ".join(w for _, w in known))
data = wave.open(wav, "rb").readframes(10**9)
d.start_utt(); d.process_raw(data, full_utt=True); d.end_utt()
segs = [(s.word.split("(")[0], s.start_frame / 100, (s.end_frame + 1) / 100) for s in d.seg() if s.word not in ("<sil>", "<s>", "</s>", "[NOISE]")]
if len(segs) != len(known): sys.exit(f"align: expected {len(known)} words, got {len(segs)} segments")

times = [None] * len(words)
for (i, w), (_, a, b) in zip(known, segs): times[i] = (a, b)
for i in range(len(words)):  # interpolate unknown words between neighbours
    if times[i] is None:
        prev = next((times[j] for j in range(i - 1, -1, -1) if times[j]), (0, 0))
        nxt = next((times[j] for j in range(i + 1, len(words)) if times[j]), (dur, dur))
        times[i] = (prev[1], max(prev[1], nxt[0]))

with open(out, "w") as f:
    for w, (a, b), known_ in zip(words, times, [d.lookup_word(w) for w in words]):
        f.write(f"{a:.2f} {b:.2f} {int(a * 30 + 0.5)} {w}{'' if known_ else ' *'}\n")
pauses = [(times[i][1], times[i + 1][0]) for i in range(len(words) - 1) if times[i + 1][0] - times[i][1] >= 0.25]
print(f"{len(words)} words, speech {times[0][0]:.2f}-{times[-1][1]:.2f} s of {dur:.3f} s -> {out}")
print(f"DURATION = {int(dur * 30)} frames")
if dropped: print("not in dictionary (interpolated, marked *):", " ".join(sorted(set(dropped))))
long_ = [f"{w} {a:.2f}-{b:.2f}" for w, (a, b) in zip(words, times) if b - a > 1.2]
if long_: print("CHECK BY EAR (word lasts > 1.2 s, often music absorbed into it; true start is usually later):", "; ".join(long_))
print("pauses >= 0.25 s:", " ".join(f"{a:.2f}-{b:.2f}" for a, b in pauses))
