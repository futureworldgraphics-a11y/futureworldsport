# Narrated space-explainer animations

Each request = one narrated script chunk + its MP3 → ONE finished MP4 (1920×1080, 30 fps, H.264 + AAC), drawn
entirely in code (Canvas 2D, TypeScript, anidoodle engine). No AI images, no stock, no image/font files.

## Hard rules
- NOTHING LOOPS OR REPEATS. One continuous shot, exactly the audio's length (±1 frame). Every section gets a new visual idea.
- Every visual beat starts ON the words it illustrates (timed from the audio, never guessed from words-per-minute).
- Something visibly moves every second. Correct science. Deterministic: `rng(seed)` only, no Math.random/clock/ctx.filter.
- FULL FRAME: the picture fills all 1920x1080. No letterbox / black bars, ever (`endFrame(..., { full: true })`).
- ALL TEXT IS PIXEL TEXT (5x7 pixel font, types on with a block cursor). Short paraphrases (2–5 words), 60 px margin,
  never over the subject. In house-style films: the top-left HUD via `h.say` (label line + main line, soft dark band behind).
  Equations are just typed text (e.g. "E = MC2").

## HOUSE STYLE (locked): cinematic pixel art = cinemaKit + pixel finish
Draw a cinematic frame with `src/canvas-core/cinemaKit.ts` (light primitives, starfield camera, globe, bloom, bokeh,
vignette), then finish it as pixel art: `endFrame(ctx, env, frame, t, f, { pixel: 3, full: true, hud })`
(`pixelFinish.ts`: 640x360 art pixels, fixed palette, 4x4 Bayer dither, pixel font). Start at `orbital-template/cinema/README.md`.
Reference films: `oneSpeed.ts` (light speed, 4:06, the look the user liked most) and `paleDotPixel.ts` (Pale Blue Dot).
Pipeline: `cinema/PLANNER_GUIDE.md`, `cinema/SCREENPLAY_FORMAT.md`, `cinema/CODER_RULES.md`; timing `python3 tools/align.py`
(needs `pip install pocketsphinx`); scaffold `node tools/new-film.mjs <name>`; deliver `node tools/finish.mjs <name>`;
gate `node tools/check.mjs <name>` (must print PASSED). Never restyle cinemaKit; `paleDot` must stay pixel-identical.
Older looks (do not use for new films unless asked): `spaceStyle.ts` flat vector; `pixelKit.ts` hand-drawn pixel world
(`lightSpeedOpus`, `lightSpeedHD`).

## Where things are (`orbital-template/`)
- House style: see above. Shared easing/`ramp`/`span` live in `spaceStyle.ts`.
- Characters (LOCKED STYLE): every person is a detailed pixel sprite from `src/canvas-core/pixelChars.ts`
  (`drawChar(ctx, env, spec, x, footY, scale, pose, flip)`, ready cast in `CAST`: doctor, child, scientist, physicist;
  new people = a new `CharSpec`, never hand-drawn stick figures). Reference sheet: `out/charsheet.png`.
  In house-style films draw them into the frame before `endFrame`, so the pixel finish palettes them with the scene.
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

## Known pitfalls
- `back()` easing can return −1e-14 at t=0 → guard every radius/size with `Math.max(0, …)` or an early return (canvas throws on negative arc radius and the render dies mid-way).
- Dark full-screen fills during transitions must fade (no black flashes). Put a soft dark band behind text over busy art.

## Cost discipline (important)
- Keep sessions short: start a NEW session every 3–4 chunks; the repo holds everything, the chat does not need to.
- Few image reads (one small contact sheet per chunk), no side discussions in build sessions, no re-rendering unless something is wrong.
- Report per chunk: duration, frames, render time, determinism result, file size, what was fixed.
