# Screenplay format (cinema kit)

A screenplay is the **complete** plan for one film. A coder who has never seen the audio, the
references or the planner must be able to build the intended film from it alone, and
`tools/check.mjs` must be able to verify the result. Worked example: `screenplays/paleDot.md`.

The rule of thumb: **if two coders could read a line and draw different things, the line is not
finished.** Write numbers, not adjectives.

---

## File: `cinema/screenplays/<film>.md`

Sections are numbered `## 1.` to `## 8.`. Sections 1 and 3 and the `### Bnn` beat headings are
parsed by the tools, so keep their exact shape.

### `## 1. HEADER` (parsed)

```
| key | value |
|---|---|
| film | paleDot |                       camelCase; code file src/canvas-core/<film>.ts
| audio | audio/paleDot.mp3 |
| transcript | audio/paleDot.transcript.txt |
| words | audio/paleDot.words.txt |          tools/align.py output
| fps | 30 |
| seconds | 95.112 |                        ffprobe duration
| frames | 2853 |                           floor(seconds * 30)
| style | cinemaKit |
```

### `## 2. STORY`

- **Logline**: one sentence, what the viewer should feel at the end.
- **Spine**: the single camera journey that carries the whole film (it is one continuous shot).
- **Movements**: 4–10 movements with time ranges.
- **Hero moments**: the 2–3 peaks; everything else is quieter so these read as peaks.
- **Continuity chain**: how each movement physically turns into the next (no cuts, ever).

### `## 3. CUES` (parsed)

Every moment something starts, from the aligned word times. `time_s` is the word's start from
`words.txt`; `frame = round(time_s * 30)`. The coder copies this table into `export const CUE`
verbatim; the checker compares them to the frame.

```
| cue | time_s | frame | words |
|---|---|---|---|
| here | 16.95 | 509 | That's here |
```

Cue ids: camelCase, unique, named after the word (`here`, `home`, `love2` for a second "love").

### `## 4. LOOK AND CAMERA`

- **Tint keys**: `[t, r, g, b]` rows for `makeTint` (inner colour of the background wash).
- **Camera**: `speed(t)` and `panRate(t)` as formulas (use `g1` bumps and `ramp`s), e.g.
  `speed = 0.012 + 1.15*g1(t,22.3,0.6) - 0.9*g1(t,72.2,0.65)`.
- **Star alpha**: formula for the starfield's visibility.
- **Palette per movement**: which kit colours lead (e.g. "globe: PALE/CYAN; river: NEON mix").

### `## 5. ASSETS AND SEEDS`

Everything procedural is listed with its **seed, count and generation rule**, so every coder gets
the same points. Example: `RIV · rng(33) · 1500 particles · v = clamp((r+r+r-1.5)/1.2,-1,1),
speed 70+r*90 px/s, x0 = r*2600, phase r*TAU, hue floor(r*6), spark if r<0.12, rise 40+r*120`.
Fixed geometry (probe outlines, continent blobs, skyline) is given as coordinate lists in local
units with its transform. Never write "random" without a seed.

### `## 6. LETTERING`

Two tables for `hudTables`, plus any special text:

```
LABELS  [start, end, "TEXT"]                               small DIM label at (120,204), cap 15
LINES   [start, end, "TEXT", row(0|1), write seconds]      main line at (120,238|298), cap <= 40
```

Special text (big words, counters, titles, tags) gets position, cap, colour, write-on time and
fade. Allowed glyphs: `A–Z 0–9 - . , : / ( ) & ?` and lowercase `e u t g d`. No apostrophes, `!`,
`%`, `=`, `+`. Everything inside x 60–1860, y 198–882.

### `## 7. BEATS` (headings parsed)

One beat per visual idea. Beats tile the film: B01 starts at 0, each starts where the previous
ends, the last ends at `seconds` (to the frame). Heading shape (exact):

```
### B06 · HERE crosshair · 16.95–18.44 s
```

Body: these fields, in this order. Omit a field only if it is truly empty.

| field | what to write |
|---|---|
| **WORDS** | the narration inside the beat, with the cue ids that fire |
| **CAMERA** | what the camera does (zoom anchor, scale formula, pan), or "continues" |
| **ENTERS** | one line per element: `time · element · position/size · colour · motion · easing` |
| **STAYS** | elements carried over from earlier beats, and what they keep doing |
| **EXITS** | `time range · element · how` (fade, shrink, leave frame) |
| **MOTION** | what visibly moves every second (nothing is ever still) |
| **TEXT** | lettering that belongs to this beat (refers to section 6 rows) |
| **SCIENCE** | the facts shown, so the coder does not "fix" them |
| **INTENT** | one line: why this image, what the viewer should feel |

Element line grammar:

```
<t0>[–<t1>] · <element> · <where: px coords or anchor + offset, size> · <colour const> · <motion> · <easing>
```

- Times in seconds; use cue ids where a time is a cue (`here`, `here+0.3`).
- Positions in the 1920×1080 frame; image area is y 138–942 (letterbox).
- Colours are kit constants (`PALE`, `GOLD`, `NEON[h]` …), never hex made up in the beat.
- Easing is a kit/engine name: `ease`, `easeOut`, `ramp` (linear), `g1` (bump), `pow(x,2.2)`.
- Alpha envelopes as `win(t, a, b, fadeIn, fadeOut)`.

### `## 8. REFERENCE STILLS`

List of `cinema/refs/<film>/Bnn_fNNNNN.jpg` (made with `tools/refs.mjs`, the middle frame of every
beat). They are the visual contract: the coder's build is scored against them.

---

## Planning order (how the planner writes it)

1. `python3 tools/align.py audio/<film>.mp3 audio/<film>.transcript.txt` → words + pauses.
2. Section 2 (story) first, then the cue table (section 3), then beats as rows of one line each.
3. Fill every beat's fields. Then sections 4–6 (camera, seeds, lettering) from the beats.
4. Build a draft yourself if you can and run `node tools/refs.mjs <film>` to lock reference stills.
5. Hand over: screenplay + audio + refs. The coder never needs anything else.

## Rules the screenplay must respect

- One continuous shot. No cuts, no hard black; darkness only as a fade.
- Nothing loops or repeats: every beat is a new visual idea.
- Every beat starts on its cue word (never before the word is heard).
- Something visibly moves every second.
- Correct science; state facts in **SCIENCE**.
- Deterministic: every random thing has a seed in section 5.
- One hot light per moment; the rest stays dim.

---

## Blank template

```markdown
# <FILM TITLE> · screenplay

## 1. HEADER
| key | value |
|---|---|
| film | <film> |
| audio | audio/<film>.mp3 |
| transcript | audio/<film>.transcript.txt |
| words | audio/<film>.words.txt |
| fps | 30 |
| seconds | <ffprobe seconds> |
| frames | <floor(seconds*30)> |
| style | cinemaKit |

## 2. STORY
- Logline:
- Spine:
- Movements:
- Hero moments:
- Continuity chain:

## 3. CUES
| cue | time_s | frame | words |
|---|---|---|---|

## 4. LOOK AND CAMERA
- Tint keys:
- Camera speed(t):
- Camera panRate(t):
- Star alpha:
- Palette per movement:

## 5. ASSETS AND SEEDS

## 6. LETTERING
LABELS:
LINES:
Special:

## 7. BEATS

### B01 · <title> · 0.00–<t> s
- **WORDS**:
- **CAMERA**:
- **ENTERS**:
- **STAYS**:
- **EXITS**:
- **MOTION**:
- **TEXT**:
- **SCIENCE**:
- **INTENT**:

## 8. REFERENCE STILLS
```
