# Coder rules (cinema kit)

You receive: `cinema/screenplays/<film>.md`, `audio/<film>.mp3`, and `cinema/refs/<film>/*.jpg`.
You deliver: `src/canvas-core/<film>.ts`, `src/hosts/page-<film>.ts`, `out/chunk_<film>.mp4`,
`out/contact_<film>.png`, and a passing `node tools/check.mjs <film>`.

**Your job is translation, not direction.** Every creative decision is already in the screenplay.
If something is missing or ambiguous, choose the plainest reading, write it down in your report,
and do not invent new visual ideas.

## Hard rules

1. **Follow the screenplay exactly**: every cue time, position, colour, seed, count, easing and text.
   Copy section 3 into `export const CUE` verbatim, and sections 4 and 6 into `speed`, `panRate`,
   `tint`, `LABELS` and `LINES` verbatim.
2. **Draw only with `cinemaKit`** (`src/canvas-core/cinemaKit.ts`). No new palette colours outside
   the ones the screenplay names, no custom glow, bloom, grain or lettering, no restyling. If the
   screenplay needs a move the kit lacks, build it from kit primitives (`dot`, `hair`, `hairG`,
   `fade`, `beads`, `ellipse`, `flare`, `glow`) inside the film file.
3. **Frame lifecycle is fixed**: `beginFrame` → `drawStars` → beats in screenplay order →
   `endFrame`. Everything visual goes into `f.c` (additive). Lettering only through `h.say` inside
   the `hud` callback (plus `f.tag`).
4. **Deterministic**: randomness only from `rng(seed)` with the screenplay's seed. Never
   `Math.random`, `Date`, `performance`, `ctx.filter`, or state carried between frames. Precompute
   sets at module level and draw them as pure functions of `t`.
5. **Pure time**: `t = frame / 30`. Every element's visibility is an envelope (`ramp`, `win`),
   every movement a function of `t`. No per-frame accumulation.
6. **Guard sizes**: radii and widths `Math.max(0, …)`; `back()` easing can go slightly negative.
7. **Lettering**: glyphs `A–Z 0–9 - . , : / ( ) & ?` and lowercase `e u t g d` only; inside
   x 60–1860, y 198–882. The checker enforces this.
8. **No cuts, no hard black**, nothing loops, something moves every second: the screenplay already
   satisfies these; do not break them while implementing.
9. **Length**: `DURATION` = the screenplay's `frames`.

## Workflow

```bash
# once per container
apt-get install -y ffmpeg        # if missing
cd orbital-template && npm install

node tools/new-film.mjs <film>                 # scaffold: CUE filled in, one block per beat
# implement section 4-6 constants, then each beat block, in order
npx tsc --noEmit -p .                          # after every few beats
node tools/check.mjs <film> --quick            # timing, lettering, determinism, reference scores
node tools/still.mjs <film> --frame N          # look at a single frame when something is off
node tools/finish.mjs <film>                   # full render + two-pass encode < 30 MB + contact sheet
node tools/check.mjs <film>                    # final: must print PASSED
```

`check.mjs` writes `out/check_<film>_refs.jpg`: reference on the left, your frame on the right, one
row per beat. Every row should read as the same picture. Similarity ≥ 0.7 is the same picture,
0.5–0.7 is close (look at it), below 0.5 is a real difference: fix it or explain it.

## The kit at a glance (`cinemaKit.ts`)

| group | exports |
|---|---|
| frame | `W H` (1920×1080), `CX CY` (960,540), `BAR` 138 (letterbox), `SAFE`, `TAU` |
| palette | light: `WHITE PALE CYAN BLUE VIO PINK AMBER GOLD RED GREEN WARM`, `NEON[6]` ("r,g,b" strings); lettering: `TXT DIMT GOLDT PALET REDT` |
| timing | `ramp(t,a,len)`, `win(t,a,b,fi,fo)`, `g1(t,c,s)`, `ease`, `easeOut` (from spaceStyle) |
| light | `dot`, `hair`, `hairG` (glowing), `fade` (alpha gradient line), `beads` (dotted line), `ellipse` (polyline), `glow`, `flare` (starburst), `reticle`, `ripple`, `trail` (comet), `node` |
| camera | `makeCamera(speed, panRate, seconds)`, `makeStars(seed, n)`, `drawStars(c, stars, cam, t, alpha)` |
| wash | `makeTint(keys)` |
| globe | `makeSphere(n, seed)`, `drawGlobe`, `project`, `globeArc`, `v3`, `norm`, `randLand`, `isLand`, `EARTH_BLOBS` |
| frame | `beginFrame(ctx, env, frame, tint)` → `{ c, tag }`; `endFrame(ctx, env, frame, t, f, { black, hud })`; `fades(t, seconds)` |
| pixel art | `endFrame(..., { pixel: 3 })` renders the same film as pixel art (640×360 art pixels, fixed palette, Bayer dither, 5×7 pixel font typing on with a cursor). Use it only when the screenplay header says `style | cinemaKit-pixel`. Palette and font: `pixelKit.ts` |
| lettering | `hudTables(h, LABELS, LINES)`, `h.say(text, x, y, { cap, color, progress, opacity, w, align })`, `h.fit`, `h.tags()`, `fmt(n)` |

## Film file skeleton

```ts
export const CUE = { … };                                     // section 3, verbatim
const speed = (t: number) => …, panRate = (t: number) => …;   // section 4
const CAM = makeCamera(speed, panRate, SECONDS + 1), STARS = makeStars(5, 1900);
const tint = makeTint([…]);                                    // section 4
const SETS = (() => { const r = rng(SEED); … })();             // section 5, one per asset
const LABELS: Label[] = […], LINES: Line[] = […];              // section 6

const draw = (ctx: Ctx, frame: number, env: Env) => {
  const t = frame / FPS;
  const f = beginFrame(ctx, env, frame, tint(t)), c = f.c, tag = f.tag;
  drawStars(c, STARS, CAM, t, STAR_ALPHA(t));
  // B01 … Bnn, each guarded by its time window, in screenplay order
  endFrame(ctx, env, frame, t, f, { black: fades(t, CUE.end), hud: (h) => { const a = hudTables(h, LABELS, LINES); /* special text */ return a; } });
};
export const <film>: Film = { meta: { title: "<film>", W, H, fps: FPS, bpm: 120, durationFrames: DURATION }, assets: { images: {} }, shots: [{ id: "<film>", start: 0, end: DURATION, draw }] };
```

The complete worked example is `src/canvas-core/paleDot.ts` next to
`cinema/screenplays/paleDot.md`. Read it for structure, never copy its scenes.

## Report (paste at the end of your session)

- duration and frames; render time; `check.mjs` result (PASSED/FAILED, warnings)
- per-beat similarity scores below 0.7, with the reason
- every place you had to interpret the screenplay, and what you chose
- file size of `out/chunk_<film>.mp4`
