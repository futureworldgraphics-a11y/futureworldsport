# Narrated space-explainer animations

Each request = one narrated script chunk + its MP3 → ONE finished MP4 (1920×1080, 30 fps, H.264 + AAC), drawn
entirely in code (Canvas 2D, TypeScript, anidoodle engine). No AI images, no stock, no image/font files.

## Hard rules
- NOTHING LOOPS OR REPEATS. One continuous shot, exactly the audio's length (±1 frame). Every section gets a new visual idea.
- Every visual beat starts ON the words it illustrates (timed from the audio, never guessed from words-per-minute).
- Something visibly moves every second. Correct science. Deterministic: `rng(seed)` only, no Math.random/clock/ctx.filter.
- On-screen text: short paraphrase (2–5 words), writes on stroke by stroke, never overlaps the subject, 60 px margin.
  Supported glyphs: A–Z 0–9 - . , : / ( ) & ? plus lowercase e u t g d. NO apostrophes, !, %, =, + (rephrase or draw shapes).

## Where things are (`orbital-template/`)
- `src/canvas-core/spaceStyle.ts` — THE shared look (palette, banded `ball`, `inked` lines, `glow`, `text`, `orbitDashes`,
  `motes`, `gluon`, `check`/`cross`, `card`, easing, `ramp`/`span`). Read it before coding; never restyle it.
- Example chunks (read ONE for structure only, never copy scenes): `andromedaOpus.ts` (best), `quarks.ts`, `magnet.ts`, `nucleus.ts`.
- Host page per chunk: `src/hosts/page-<name>.ts`. The Film export name MUST equal `<name>` (tools look it up by name).
- Outputs: `orbital-template/out/chunk_<name>.mp4` + `out/contact_<name>.png`.

## Setup (fresh container)
`apt-get install -y ffmpeg` (if missing) → `cd orbital-template && npm install`. Chromium is preinstalled.

## Workflow per chunk
1. `ffprobe` duration → `DURATION = floor(sec*30)`.
2. Timing: use word timestamps if provided; else `ffmpeg -i a.mp3 -af silencedetect=noise=-38dB:d=0.12 -f null -`,
   map speech segments to phrases (~3.5 words/s sanity check). One `CUE` table in seconds drives everything.
3. Storyboard table (time → narration → visual), written in the file header, then code.
4. `npx tsc --noEmit -p .` → ONE low-res contact sheet of stills at section changes (`node tools/still.mjs <name> --frame N`,
   tile with ffmpeg xstack at ~400 px wide). Open close-ups only if something looks wrong.
5. Fix, then `node tools/render.mjs <name> --out out/<name>-silent.mp4`, mux audio
   (`-c:v libx264 -crf 19 -c:a aac -b:a 192k -movflags +faststart`), keep < 30 MB (raise crf if not), contact sheet, commit, push, send.

## Cinematic "data space" films (screenplay → any coder)
A second, separate style lives in `orbital-template/cinema/` (start at `cinema/README.md`). It does NOT use the
spaceStyle look: draw only with `src/canvas-core/cinemaKit.ts` (never restyle it; if you change it, `paleDot` must stay
pixel-identical). Planning: `cinema/PLANNER_GUIDE.md` + `cinema/SCREENPLAY_FORMAT.md` (timing via `python3 tools/align.py`,
needs `pip install pocketsphinx`). Coding: `cinema/CODER_RULES.md`, scaffold with `node tools/new-film.mjs <name>`,
deliver with `node tools/finish.mjs <name>`, gate with `node tools/check.mjs <name>` (must print PASSED).
Worked example: `cinema/screenplays/paleDot.md` + `src/canvas-core/paleDot.ts`.
Pixel-art variant of the same style: `endFrame(..., { pixel: 3 })` (`pixelKit.ts`: palette, Bayer dither, 5×7 pixel font);
example `paleDotPixel.ts` renders the paleDot screenplay as pixel art.

## Known pitfalls
- `back()` easing can return −1e-14 at t=0 → guard every radius/size with `Math.max(0, …)` or an early return (canvas throws on negative arc radius and the render dies mid-way).
- Dark full-screen fills during transitions must fade (no black flashes). Put a soft dark band behind text over busy art.

## Cost discipline (important)
- Keep sessions short: start a NEW session every 3–4 chunks; the repo holds everything, the chat does not need to.
- Few image reads (one small contact sheet per chunk), no side discussions in build sessions, no re-rendering unless something is wrong.
- Report per chunk: duration, frames, render time, determinism result, file size, what was fixed.
