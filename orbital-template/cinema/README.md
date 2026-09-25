# Cinema pipeline: plan once, any coder builds the same film

Cinematic "data space" narrated films (points and hairlines of light, bloom with halftone, bokeh,
grain, 2.39:1 letterbox, terminal HUD lettering), drawn entirely in code. The pipeline splits the
work so that **the planner decides everything** and **any coder reproduces it**, verified by tools.

```
audio + transcript
      │  python3 tools/align.py                word times, pauses, DURATION
      ▼
PLANNER ── cinema/PLANNER_GUIDE.md ──►  cinema/screenplays/<film>.md   (every beat, every number)
      │  node tools/refs.mjs (optional)         cinema/refs/<film>/Bnn_fNNNNN.jpg (visual contract)
      ▼
CODER ─── cinema/CODER_RULES.md ────►  src/canvas-core/<film>.ts  (only cinemaKit, no taste calls)
      │  node tools/new-film.mjs               scaffold from the screenplay
      │  node tools/finish.mjs                 render, encode < 30 MB, contact sheet
      ▼
CHECK ─── node tools/check.mjs <film> ─►  PASSED / FAILED + out/check_<film>_refs.jpg
```

## What makes the results match

| lock | where | what it removes |
|---|---|---|
| exact word timing | `tools/align.py`, screenplay §3, `export const CUE` | beats drifting off the words |
| one shared look | `src/canvas-core/cinemaKit.ts` | each coder inventing glow, colour, grain, text |
| numbers, not adjectives | screenplay §4–§7 | two readings of the same line |
| seeds for every random set | screenplay §5 | different particle layouts |
| reference stills | `cinema/refs/<film>/` | "close but not the picture I meant" |
| automatic checks | `tools/check.mjs` | timing, text, determinism and size errors slipping through |

Proof: `paleDot.ts` was refactored onto `cinemaKit.ts` and renders **pixel-identical** to the
delivered film (19 of 19 test frames hash-identical). `check.mjs paleDot` scores it against its own
references.

## Files

| file | for |
|---|---|
| `cinema/README.md` | this overview |
| `cinema/PLANNER_GUIDE.md` | how to write a screenplay (incl. 10-minute films in chunks) |
| `cinema/SCREENPLAY_FORMAT.md` | the exact format + blank template |
| `cinema/CODER_RULES.md` | rules, workflow, kit reference, file skeleton, report |
| `cinema/screenplays/paleDot.md` | complete worked screenplay (40 beats, 55 cues) |
| `cinema/refs/paleDot/` | its 40 reference stills |
| `src/canvas-core/cinemaKit.ts` | the shared look |
| `src/canvas-core/paleDot.ts` | reference build |
| `src/canvas-core/pixelKit.ts`, `paleDotPixel.ts` | pixel-art finish of the same film (`endFrame({ pixel: 3 })`): same screenplay, different look |
| `tools/align.py` | offline forced alignment (`pip install pocketsphinx`) |
| `tools/screenplay.mjs` | screenplay parser (shared by the tools) |
| `tools/new-film.mjs` | scaffold a film from its screenplay |
| `tools/refs.mjs` | render reference stills per beat |
| `tools/finish.mjs` | render + two-pass encode to < 30 MB + contact sheet |
| `tools/check.mjs` | the gate |

## Handing a film to another coder (AI or human)

Give them this repository and one message:

> Build `<film>` from `cinema/screenplays/<film>.md`. Read `cinema/CODER_RULES.md` first and follow
> it exactly. Audio is `audio/<film>.mp3`; reference stills are in `cinema/refs/<film>/`. Deliver
> when `node tools/check.mjs <film>` prints PASSED, and include the report from CODER_RULES.

## Realistic expectations

With screenplay + kit + seeds + reference stills, a careful coder gets the same film: same timing
to the frame, same look, same composition; small differences remain in hand-built shapes and fine
motion. Without reference stills expect the same story and timing with more variation in detail.
