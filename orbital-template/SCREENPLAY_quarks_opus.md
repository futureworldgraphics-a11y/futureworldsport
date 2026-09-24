# Screenplay: "Quarks" chunk — exact direction used for the Opus 5.5 build

This is the real cue table and shot list pulled directly from `quarks.ts`, not a
reconstruction. Give this file to another AI along with `AI_PROMPT.md` (the style rules)
and it should be able to code from the SAME direction — which isolates whether the gap is
in *directing* (planning what happens when) or in *coding* (making it actually happen
correctly, deterministically, on time).

Audio: 58.070 s. Video: 1742 frames @ 30fps = 58.067 s.

## Cue table (seconds, measured from the audio's own pauses — ffmpeg silencedetect, -38dB, 0.18s)

| Cue name | Time (s) | Frame | Narration at this moment |
|---|---|---|---|
| (start) | 0.00 | 0 | "The nucleus itself turned out..." — video begins |
| seen | 3.93 | 118 | "...particles no human has ever seen" |
| notTech | 6.50 | 195 | "Not because our technology isn't good enough" |
| notLook | 9.19 | 276 | "not because we haven't looked hard enough" |
| forbids | 11.49 | 345 | "but because the universe itself forbids it" |
| quarks | 13.57 | 407 | "Quarks" |
| blocks | 14.55 | 437 | "the building blocks of" |
| imprisoned | 18.02 | 541 | "...are permanently imprisoned" |
| pull | 19.96 | 599 | "Try to pull one out" |
| energy | 21.21 | 636 | "...any amount of energy" |
| snap | 25.31 | 759 | "...create new matter from empty space" |
| escape | 28.56 | 857 | "...let a single quark escape" |
| andYet | 30.78 | 923 | "And yet" |
| suspect | 31.55 | 947 | "physicists don't just suspect quarks exist" |
| gravity | 34.71 | 1041 | "as certain about quarks" |
| gravity2 | 36.20 | 1086 | "as they are about gravity" |
| reaction | 38.04 | 1141 | "Every nuclear reaction" |
| collision | 39.72 | 1192 | "every particle collision" |
| atoms | 41.34 | 1240 | "every atom in the universe" |
| real | 42.40 | 1272 | "confirms they're real" |
| so | 44.28 | 1328 | "So, how did scientists discover" |
| how | 45.29 | 1359 | "...discover something" |
| isolate | 47.00 | 1410 | "never isolate" |
| photo | 48.99 | 1470 | "never photograph" |
| hold | 50.57 | 1517 | "never hold up and say" |
| here | 52.40 | 1572 | "'Here it is'?" |
| answer | 53.86 | 1616 | "The answer changes..." |

## Hero proton keyframes: [time, x, y, radius, opacity], eased between each pair

```
[4.8,  960, 540, 231.7, 1]
[6.2,  720, 540, 231.7, 1]
[15.4, 720, 540, 231.7, 1]
[16.3, 470, 560, 165,   1]
[18.0, 470, 560, 165,   1]
[18.9, 720, 540, 231.7, 1]
[34.7, 720, 540, 231.7, 1]
[35.5, 470, 560, 150,   1]
[37.4, 470, 560, 150,   1]
[37.9, 470, 560, 110,   0]
[44.3, 720, 540, 190,   0]
[45.0, 720, 540, 210,   1]
[53.9, 720, 540, 210,   1]
[55.5, 960, 370, 128,   1]
[58.1, 960, 360, 114,   1]
```
(Screen is 1920×1080. Before frame 0.8s the hero doesn't exist yet — it's arrived at by a
separate zoom camera; see Shot 1.)

## Shot-by-shot direction

**Shot 1 — 0.00–3.93s.** Continuous log-scale camera zoom (scale = 1.75 × 8^(u−2), u eased
over 4.4s) falling through: a glowing human silhouette full of twinkling star-particles →
one atom with 3 dashed orbital rings and cyan electrons → a 4-nucleon nucleus → into one
proton. Body fades out as the atom fades in (crossfade, not a cut).

**Shot 2 — 3.93–6.50s.** The proton goes translucent (opacity of its solid fill ramps down
over ~0.9s): 3 fogged ball-shapes visible inside with drifting cyan haze, each with a "?"
mark fading in staggered by ~0.25s per shape.

**Shot 3 — 6.50–11.49s.** A circular lens (like a magnifying glass, cyan glass, brown ring)
slides in from off-screen toward the proton twice (once per "not because..." line), each
time crossed out with a red line. Headlines "BETTER TECHNOLOGY?" then "LOOK HARDER?" each
get a red strike-through on cue.

**Shot 4 — 11.49–13.57s.** A shockwave ring bursts outward from the proton (expanding
stroked circle + glow), knocking the lens away and cracking it (jagged inked lines drawn
progressively inside the lens). "THE UNIVERSE / FORBIDS IT" writes on.

**Shot 5 — 13.57–18.02s.** Fog clears (opacity ramps to 0 over 0.7s starting at `quarks`
cue): 3 quarks revealed — red, green, blue, labelled u, u, d — linked by 3 wiggly gluon
springs in a triangle. "QUARKS" writes on in matching RGB letters. At 15.4s a second hadron
(neutron: u, d, d) slides in beside the proton, both get proton/neutron labels underneath.
At 18.02s, 7 vertical bars drop down over the proton like cage bars (progressive reveal).

**Shot 6 — 19.96–25.31s.** The blue-labelled d-quark is dragged rightward and off the
proton's edge along an eased exponential curve (approaches but never quite reaches a max
distance of 560px, using `1 - e^{-(t-pull)/1.5}` normalized). A glowing orange/yellow flux
tube (wavy inked ribbon, vibration amplitude growing with distance) connects it back to the
proton. An arrow points in the pull direction. A horizontal energy meter fills from 0 to 100%
in sync with the pull distance, turning flashing red near full. "ANY AMOUNT OF ENERGY" text.

**Shot 7 — 25.31–28.56s.** SNAP: white/yellow flash + glow burst at the midpoint of the
stretched tube, plus 12 radiating short rays fading over 0.7s. A new red quark appears back
in the proton's original slot (eases home over 0.9s). At the snap point, a new
quark+antiquark pair forms: a d quark (blue-shell colours) and its antiquark (yellow shell,
letter with a bar over it) connected by their own small gluon spring, drifting apart. Label
"QUARK AND ANTIQUARK" appears briefly beside them.

**Shot 8 — 30.78–37.90s.** Proton shrinks/moves to (470,560) r≈150 (per keyframes above).
A planet (banded blue/green, with a small moon on a dashed orbital ellipse) appears at
(1450,560). An apple falls from above the planet and lands with an equals-sign popping in
between proton and planet (two horizontal bars). Two green checkmarks draw on beneath each.
Headlines: "AS CERTAIN AS" (top centre) then "QUARKS" / "GRAVITY" under each object.

**Shot 9 — 38.04–44.30s.** Proton fades out (opacity → 0 by 37.9s) freeing the frame for 3
side-by-side panels that pop in on their own cues, left to right: (1) a burning sun/star
with 14 animated rays and a glow, labelled "NUCLEAR REACTIONS"; (2) two coloured beams
colliding at a point then bursting into ~16 curved particle tracks, labelled "PARTICLE
COLLISIONS"; (3) a 7-hex lattice of tiny proton+electron atoms with orbiting electrons,
labelled "EVERY ATOM". Each gets a green checkmark ~1s after it appears. "CONFIRMED REAL"
writes on large at top centre at 42.40s.

**Shot 10 — 45.29–52.40s.** Proton returns (fades in from 45.0s, keyframe alpha 0→1). Three
rounded cards slide in from the right, stacked vertically, each ~2.2s apart: "ISOLATE IT"
(icon: a ball + arrow), "PHOTOGRAPH IT" (icon: a camera shape), "HOLD IT UP" (icon: two
fingers pinching a small ball) — each gets a red X drawn across it ~0.8s after it appears.
At 52.40s a speech-bubble card reading "HERE IT IS?" pops in near the proton (back-ease
overshoot), tail pointing at the proton.

**Shot 11 — 53.86–58.07s.** Proton settles to final position/size (960,370→360, r 128→114).
Closing text writes on in two lines: "WHAT DOES IT MEAN TO" then, larger, "KNOW SOMETHING
EXISTS?" Nothing else changes — proton keeps its slow rotation/idle motion (never freezes)
until the last frame.

## Persistent rules across every shot
- The hero proton/neutron never stops moving: constant slow rotation (~0.42 rad/s in the
  Sonnet build's equivalent scene; the Opus build uses per-nucleon orbital motion) plus a
  small per-nucleon jitter.
- Orbit dashes (the streaming colour arcs) surround the hero object continuously from
  ~3.2s onward, splitting into a back-half (drawn before the hero) and front-half (drawn
  after), except while the pull/snap sequence dims them to ~15% for clarity.
- Every text block fades out over ~0.25–0.3s just before the next one on the same screen
  position begins, so nothing hard-cuts or overlaps.
