# PROMPT: Narration-Timed Space Explainer Animation (code-drawn, no AI images)

> Copy everything in this file into the AI of your choice, attach the narration audio (MP3) and paste the script chunk where it says `[PASTE SCRIPT HERE]`.
> If the AI accepts files, also attach `src/canvas-core/quarks.ts` from this repo as the worked example.

---

## 1. YOUR ROLE AND GOAL

You are a motion-graphics programmer. You turn one narrated script chunk into **one finished MP4 animation**, drawn entirely in code (HTML5 Canvas 2D, TypeScript), in a fixed flat "space explainer" style (similar in spirit to Kurzgesagt).

- **No AI image generation, no stock footage, no external images, no fonts files.** Every pixel is drawn by code.
- **One continuous shot per chunk.** The animation is exactly as long as the narration.
- **Nothing loops. Nothing repeats.** Every visual change is triggered by, and timed to, a specific phrase in the narration.
- **Something visibly moves in every second** (the subject never freezes).

### Inputs you will receive
1. The narration audio file for this chunk (MP3).
2. The exact script text for this chunk:

```
[PASTE SCRIPT HERE]
```

### Output you must deliver (in this order)
1. **Timing table**: every phrase of the script with its start/end time in seconds.
2. **Storyboard table**: time → narration → what is on screen (one row per phrase or visual beat).
3. **Complete code** for the chunk (full files, never snippets or "…rest unchanged").
4. **Exact commands** to render, add the audio, and check the result.
5. **A QA report** (section 9).

---

## 2. TECH STACK AND SETUP

- Engine: **anidoodle** (https://github.com/alexgreensh/anidoodle), a deterministic procedural animation engine (Canvas 2D in headless Chromium via Playwright, encoded with ffmpeg).
- Requirements: Node.js 20+, ffmpeg + ffprobe, Chromium (via Playwright).
- Resolution **1920×1080**, **30 fps**, H.264 (yuv420p) + AAC 192k, `+faststart`.

Setup (once):
```bash
git clone https://github.com/alexgreensh/anidoodle
node anidoodle/engine/tools/scaffold.mjs ./project --film placeholder
cd project && npm install && npx playwright-core install chromium
```
Then add `src/canvas-core/spaceStyle.ts` (full code in **Appendix A** below) — this is the shared look. Do not change it unless told to.

Each chunk is two files:
- `src/canvas-core/<chunkName>.ts` exports a `Film`
- `src/hosts/page-<chunkName>.ts`:
```ts
import { chunkName } from "../canvas-core/chunkName";
import { mountFilm } from "./page";
mountFilm(chunkName);
```

### The engine contract (MUST follow)
- `draw(ctx, frame, env)` must be a **pure function of the frame number**. Same frame in → same pixels out, in any order.
- Randomness **only** via `rng(seed)` from `./core` (seeded). **Never** `Math.random()`, `Date`, `performance.now()` in art code.
- **Never** use `ctx.filter` (no CSS blur). Soft light = radial gradients (`glow()`).
- No external assets. Offscreen canvases only via `env.canvas(w, h)`; cache static things in `env.cache`.
- The `Film` object:
```ts
export const chunkName: Film = {
  meta: { title: "chunkName", W: 1920, H: 1080, fps: 30, bpm: 120, durationFrames: DURATION },
  assets: { images: {} },
  shots: [{ id: "chunk", start: 0, end: DURATION, draw }],
};
```
- `DURATION = round(audioSeconds × 30)` (floor if needed so video ≤ audio + 1 frame).

---

## 3. TIMING: MAP THE SCRIPT TO THE AUDIO

1. Exact duration:
```bash
ffprobe -v error -show_entries format=duration -of csv=p=0 narration.mp3
```
2. Best: **word-level timestamps** (from the TTS tool, or Whisper run locally). Use them if available.
3. Otherwise detect the pauses between phrases:
```bash
ffmpeg -hide_banner -i narration.mp3 -af silencedetect=noise=-38dB:d=0.18 -f null - 2>&1 | grep -oE "silence_(start|end): [0-9.]+"
```
   Speech segments are the gaps between silences. Map them to the script's phrases in order (commas and full stops usually create the pauses; lists like "hydrogen, helium, carbon" create one pause per item). Sanity-check with speaking rate (~2.4 words/second).
4. Put every cue in ONE table at the top of the chunk file, in seconds:
```ts
const CUE = { quarks: 13.57, blocks: 14.55, imprisoned: 18.02, pull: 19.96, snap: 25.31 /* … */ };
```
   All animation reads times from `CUE`. Nothing is hard-coded elsewhere. Visual beats start **on** the cue (0–0.3 s after the word begins), never before it.

---

## 4. THE VISUAL STYLE (exact spec)

### 4.1 Background — "streaked space"
- Radial gradient, centre `#2e2958` → edge `#15122b`.
- ~2,600 fine slanted streaks (angle −0.42 rad, length 6–22 px, width 1–1.8 px, colour `#b9b3ff` at 3–10 % opacity), seeded, drawn once and cached.
- ~70 drifting "motes" (tiny dots, radius 1.2–3.8 px, orange/yellow/lavender, slow drift, soft twinkle) so the frame is never dead.

### 4.2 Objects — flat colour in hard bands
Every round object (particle, planet, sun, electron) is a **banded ball**:
1. Dark outline disc `#120f24`, thickness ≈ 12 % of radius (min 2.5 px).
2. Base colour = darkest band.
3. Three lighter discs stacked toward the light (upper-left): radius ×0.90 offset 0.14R, ×0.68 offset 0.30R, ×0.40 offset 0.46R. **Hard edges, no gradients.**
4. A short white specular arc (upper-left, radius 0.74R, from 1.08π to 1.38π).
5. Fine grain over all art (speckle tile, source-atop).

### 4.3 Palette (4 bands each: shadow → lit)
| Use | Bands |
|---|---|
| Proton | `#b8322f #f0553a #ff8a4c #ffc27a` |
| Neutron | `#3c2f8f #6246c9 #8f6cf0 #c3aaff` |
| Quark red | `#8f1f2e #e0344d #ff6b7d #ffc2ca` |
| Quark green | `#16664a #23a874 #55dca0 #c2f6dd` |
| Quark blue | `#1f3f8f #3a6fe0 #6fa0ff #cddcff` |
| Antiquark / yellow | `#8a6a12 #e0b12f #ffd166 #fff2c2` |
| Electron / cyan | `#0f5f7a #1fa3c9 #5fd6f5 #d0f6ff` |
| Neutral / grey | `#3a355f #5a548a #8a84b8 #c9c4ea` |
| Sun / star | `#b8322f #f0553a #ffb347 #fff0b0` |
| Earth / planet | `#173a73 #2862c4 #4f97f5 #bfe0ff` |

Accents: outline ink `#120f24`, cream text `#fff1dc`, highlight yellow `#ffd166`, proton text `#ff8a4c`, neutron text `#b69cff`, muted `#8f89c9`, success green `#5fe0a3`, cross/strike red `#ff5f6d`, pink `#ff5fa2`.
Orbit-dash colours: `#ff5fa2 #ff8a4c #ffd166 #fff1dc #ff6f61`.

### 4.4 Signature decorations
- **Orbit dashes**: ~56 short coloured arc-dashes streaming around the hero object on a tilted ellipse (rx = 1.25×R, ry = 0.34×rx, tilt −0.22 rad), split into back half (drawn before the object) and front half (after) for depth. Plus two thin dashed cream guide ellipses (15–30 % opacity, marching dashes).
- **Glow**: one warm radial glow behind the hero (orange `255,138,76` at ~0.3–0.4), never a hard-edged disc.
- **Inked strokes**: every line (arrows, gluons, checks, crosses, bars) is drawn twice — a thick dark `#120f24` stroke, then the colour on top, round caps.
- **Gluons / springs**: sine wiggle between two points, amplitude fades at both ends, animated phase.
- **Cards**: rounded rectangles `#2a2552` with dark outline and a faint inner border.
- **Checks** (green) and **crosses** (red) draw themselves on (progressive stroke).

### 4.5 Lettering (on-screen text)
- **Hand-drawn outlined capitals** from anidoodle's drafting hand (`letter()`), slanted, drawn as pen strokes: a fat dark `#120f24` pass, then the colour pass on top.
- Text **writes itself on, stroke by stroke** (progress 0→1 over 0.5–1.2 s) starting on its cue. It never just fades in.
- Leaves by fading out over ~0.3 s right before the next text on the same spot.
- Sizes (cap height): big headline 90–120, headline 56–76, line 40–50, caption 22–34.
- Available characters: `A–Z 0–9 - . , : / ( ) &` plus custom lowercase `e u t g d` and `?` (all in `spaceStyle.ts`). **No apostrophes, !, %, =, +** — rephrase ("NO QUARK ESCAPES ALONE", not "don't"). Draw symbols like = as shapes.
- On-screen words are a **short paraphrase** of the narration (2–5 words), never the full sentence.
- Keep every line inside x 60–1860 (use `textWidth()` to check).

### 4.6 Layout
- Hero subject on the **left-centre** (x ≈ 720, y ≈ 540, radius ≈ 230) when there is text; centred (960, 540) for pure-visual moments.
- Headlines/titles in the **right column** (centre x ≈ 1450) or **top centre** (y ≈ 110–160).
- Captions and labels **under** their object; a subtitle line at the bottom (y ≈ 930) for opening/closing moments.
- Nothing important within 60 px of the edges. Text never overlaps the hero.

### 4.7 Motion language
- Easing: cubic in-out for moves; **back-overshoot "pop"** for things appearing; ease-out for bursts.
- Camera: continuous zooms in **log scale** (scale = 8^u) for "powers of ten" dives; slow pans between layouts (0.8–1.5 s).
- Transitions: objects morph/move/fly in and out; cross-fades ≤ 0.4 s. No hard cuts.
- Idle life: slow rotation (~0.25 rad/s), small jitter (2–3 % of R), marching dashes, twinkling motes.
- Events: flash = white/yellow radial glow + 12 rays expanding and fading over 0.6 s; shockwave = expanding inked ring.
- Colour meaning is consistent across the whole film (proton = orange, neutron = violet, quarks = red/green/blue, antiquark = yellow with a bar over its letter, electron = cyan).

---

## 5. HOW TO DESIGN A CHUNK
1. Read the script. Split it into phrases (one per pause).
2. For **each** phrase, invent one clear visual that *shows* what is said (a metaphor or a literal diagram). One idea per phrase; one focal point at a time.
3. Chain them into one continuous shot: the same hero object carries through, changing layout/size as needed.
4. Physics must be correct (e.g. proton = u u d, neutron = u d d; pulling a quark stretches a gluon flux tube until it snaps into a new quark–antiquark pair; confinement).
5. Every section gets its own look — never reuse the previous section's animation.

Reference storyboard (chunk "quarks", 58 s) for the level of detail expected:
| Time | Narration | Visual |
|---|---|---|
| 0–4 s | "inside every atom in your body" | Log-zoom: glowing human silhouette full of twinkling atoms → one atom (dashed orbits, cyan electrons) → 4-nucleon nucleus → fall into one proton |
| 4–6 s | "particles no human has ever seen" | Proton turns translucent: three shapes in fog with "?" marks |
| 6.5–11 s | "not technology… not looking harder" | A magnifying glass moves in; "BETTER TECHNOLOGY?" and "LOOK HARDER?" each struck through in red |
| 11.5 s | "the universe forbids it" | Shockwave ring from the proton knocks the lens back and cracks it; "THE UNIVERSE / FORBIDS IT" |
| 13.6 s | "Quarks" | Fog clears: red/green/blue quarks labelled u u d, gluon springs; "QUARKS" in RGB letters |
| 15.4 s | "protons and neutrons" | Neutron (u d d) slides in beside the proton, both labelled |
| 18 s | "permanently imprisoned" | Cage bars drop over the proton |
| 20–25 s | "pull one out… any amount of energy" | d-quark dragged right, glowing flux tube stretches and shakes, energy meter fills to red |
| 25.3 s | "new matter from empty space" | SNAP flash; new quark + antiquark appear; one flies home, the pair drifts off |
| 31–37 s | "as certain as gravity" | Proton = planet (orbiting moon, falling apple), two green checks |
| 38–44 s | "every reaction, collision, atom" | Three panels pop in on their words: burning star, collision with tracks, field of atoms; "CONFIRMED REAL" |
| 45–53 s | "never isolate, photograph, hold up… 'Here it is'?" | Three cards each crossed out; "HERE IT IS?" speech bubble |
| 54–58 s | "what it means to know something exists" | Pull back to the lone proton; closing question writes on |

---

## 6. CODE STRUCTURE (per chunk file)
- Import helpers from `./spaceStyle` (Appendix A) and `Gfx, rng` from `./core`.
- Top of file: header comment with the storyboard, then `DURATION`, `CUE`, key-frame tables (e.g. hero position `[t, x, y, R, alpha]` interpolated with `ease`).
- `draw()` order: background (`space`) → `motes` → art into `layer(env,"art")` (back orbit dashes → hero → effects → front orbit dashes → overlays) → `grainOver` → `blit` → all lettering in one `g.group("plain", …)` (collect with a `say()` helper) → post-text strokes (e.g. strike-throughs).
- Use `ramp(t, start, len)` / `span(t, a, b, len)` for every appearance/disappearance.

---

## 7. RENDER, ADD AUDIO, DELIVER
```bash
# a still for review (frame = seconds × 30)
node tools/still.mjs chunkName --frame 390 --out out/check.png
# full silent render (also prints frame cost + determinism check)
node tools/render.mjs chunkName --out out/chunk-silent.mp4
# add the narration (no re-encode of video)
ffmpeg -y -i out/chunk-silent.mp4 -i narration.mp3 -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -movflags +faststart out/chunk.mp4
# contact sheet: one frame every 2 s
ffmpeg -y -i out/chunk.mp4 -vf "fps=1/2,scale=320:-1,tile=6x5" -frames:v 1 out/contact.png
# if the file must be smaller (e.g. < 30 MB)
ffmpeg -y -i out/chunk.mp4 -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -c:a copy -movflags +faststart out/chunk_small.mp4
```
Later, join chunks in order:
```bash
printf "file '%s'\n" out/chunk_*.mp4 > list.txt && ffmpeg -f concat -safe 0 -i list.txt -c copy full_video.mp4
```

---

## 8. HARD RULES (checklist)
- [ ] Video length = audio length (±1 frame). 1920×1080, 30 fps.
- [ ] No loops, no repeated animation, no reused section.
- [ ] Every visual beat starts on its narration cue (from the CUE table).
- [ ] Something moves every second.
- [ ] Style exactly as section 4 (palette, bands, outlines, grain, orbit dashes, lettering).
- [ ] Text: paraphrased, outlined, written on stroke by stroke, only supported characters, never overlapping the hero or running off-screen.
- [ ] Deterministic: seeded `rng` only, no `Math.random`, no clock, no `ctx.filter`, no external assets.
- [ ] Draw cost ≤ 150 ms per frame (render tool reports it).
- [ ] Physics/science stated on screen is correct.

## 9. QA BEFORE DELIVERING
Render stills at every section change and a contact sheet. Check and report:
1. Any text cut off, overlapping, or colliding with objects.
2. Any leftover object from a previous section drifting into the next.
3. Any second with no motion.
4. Sync: list each cue and what appears on it.
5. Render stats: frames, duration, draw ms median/p95, determinism result, file size.
Fix everything found, then re-render once.

---

## APPENDIX A — `src/canvas-core/spaceStyle.ts` (the shared style; use as-is)

```ts
import { Gfx, rng, type Ctx, type Env, type Medium, type P } from "./core";
import { letter, width } from "./drafting";
import { clamp } from "./gallery";

// SPACE STYLE · the shared look for every chunk of the explainer (plumbing only; each chunk's
// scenes are bespoke). Indigo streaked space; flat colour in hard bands; fine grain; thick dark
// outlines; orbit dashes; dashed guides; one warm glow. Palette and primitives live here so the
// whole film reads as one hand.

export const W = 1920, H = 1080, FPS = 30;
export const BG_IN = "#2e2958", BG_OUT = "#15122b", STREAK = "#b9b3ff", OUT = "#120f24", CREAM = "#fff1dc";
export const PRO_B = ["#b8322f", "#f0553a", "#ff8a4c", "#ffc27a"], NEU_B = ["#3c2f8f", "#6246c9", "#8f6cf0", "#c3aaff"];
export const RED_B = ["#8f1f2e", "#e0344d", "#ff6b7d", "#ffc2ca"], GRN_B = ["#16664a", "#23a874", "#55dca0", "#c2f6dd"], BLU_B = ["#1f3f8f", "#3a6fe0", "#6fa0ff", "#cddcff"];
export const YEL_B = ["#8a6a12", "#e0b12f", "#ffd166", "#fff2c2"], CYAN_B = ["#0f5f7a", "#1fa3c9", "#5fd6f5", "#d0f6ff"], GREY_B = ["#3a355f", "#5a548a", "#8a84b8", "#c9c4ea"];
export const SUN_B = ["#b8322f", "#f0553a", "#ffb347", "#fff0b0"], EARTH_B = ["#173a73", "#2862c4", "#4f97f5", "#bfe0ff"];
export const PRO_T = "#ff8a4c", NEU_T = "#b69cff", YEL = "#ffd166", DIM = "#8f89c9", RED = "#ff5f6d", GREEN = "#5fe0a3", PINK = "#ff5fa2";
export const DASHES = ["#ff5fa2", "#ff8a4c", "#ffd166", "#fff1dc", "#ff6f61"];
export const FLAT: Medium = { nib: 1, taper: 0, pressure: 0, retrace: false, wobble: 0, rough: 0 };

export const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const back = (t: number) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }; // overshoot pop
export const ramp = (t: number, a: number, len: number) => clamp((t - a) / len);
export const span = (t: number, a: number, b: number, len = 0.3) => ramp(t, a, len) * clamp((b - t) / len);

// ---- cached surfaces
export const cached = <T>(env: Env, k: string, make: () => T): T => { const id = `${k}:${env.scale}`; let v = env.cache.get(id) as T | undefined; if (!v) { v = make(); env.cache.set(id, v); } return v; };
export const grain = (env: Env) => cached(env, "grain", () => {
  const S = 256, L = env.canvas(S, S), c = L.ctx, r = rng(77);
  for (let i = 0; i < 5200; i++) { const v = r(); c.fillStyle = v > 0.5 ? `rgba(255,255,255,${(0.05 + r() * 0.1).toFixed(3)})` : `rgba(0,0,0,${(0.06 + r() * 0.12).toFixed(3)})`; c.fillRect(Math.floor(r() * S), Math.floor(r() * S), 1 + (r() > 0.8 ? 1 : 0), 1); }
  return L;
});
export const space = (env: Env) => cached(env, "space", () => {
  const L = env.canvas(W * env.scale, H * env.scale), c = L.ctx, r = rng(41);
  c.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  const g = c.createRadialGradient(W * 0.45, H * 0.48, 60, W * 0.5, H * 0.5, W * 0.75); g.addColorStop(0, BG_IN); g.addColorStop(1, BG_OUT);
  c.fillStyle = g; c.fillRect(0, 0, W, H); c.lineCap = "round";
  for (let i = 0; i < 2600; i++) { const x = r() * W, y = r() * H, l = 6 + r() * 16; c.strokeStyle = STREAK; c.globalAlpha = 0.03 + r() * 0.07; c.lineWidth = 1 + r() * 0.8; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(-0.42) * l, y + Math.sin(-0.42) * l); c.stroke(); }
  c.globalAlpha = 1; return L;
});
// grain over whatever is already on a layer (source-atop keeps it on the art only)
export const grainOver = (env: Env, c: Ctx) => { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = "source-atop"; c.fillStyle = c.createPattern(grain(env).canvas as CanvasImageSource, "repeat")!; c.fillRect(0, 0, W * env.scale, H * env.scale); c.restore(); };
export const layer = (env: Env, name: string) => { const L = cached(env, `layer:${name}`, () => env.canvas(W * env.scale, H * env.scale)); const c = L.ctx; c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = "source-over"; c.globalAlpha = 1; c.clearRect(0, 0, W * env.scale, H * env.scale); c.setTransform(env.scale, 0, 0, env.scale, 0, 0); return L; };
export const blit = (ctx: Ctx, env: Env, L: { canvas: unknown }, alpha = 1) => { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = alpha; ctx.drawImage(L.canvas as CanvasImageSource, 0, 0); ctx.restore(); };

// ---- lettering: the drafting hand, outlined, plus the glyphs it lacks (lowercase e u t g d, ?)
const CUSTOM: Record<string, { w: number; s: P[][] }> = {
  e: { w: 3.6, s: [[[0.4, 4.1], [3.2, 4.1], [3.1, 3.1], [2.3, 2.3], [1.2, 2.3], [0.3, 3.2], [0.3, 5.0], [1.2, 5.9], [2.5, 5.9], [3.3, 5.3]]] },
  u: { w: 3.6, s: [[[0.3, 2.3], [0.3, 5.0], [1.1, 5.9], [2.3, 5.9], [3.2, 5.0]], [[3.2, 2.3], [3.2, 5.9]]] },
  t: { w: 3.4, s: [[[1.3, 0.8], [1.3, 5.1], [2.0, 5.9], [3.0, 5.7]], [[0.2, 2.4], [2.8, 2.4]]] },
  g: { w: 3.6, s: [[[3.2, 2.3], [3.2, 6.6], [2.4, 7.5], [0.9, 7.5], [0.3, 7.0]], [[3.2, 3.2], [2.4, 2.3], [1.2, 2.3], [0.3, 3.2], [0.3, 4.8], [1.2, 5.6], [2.4, 5.6], [3.2, 4.8]]] },
  d: { w: 3.6, s: [[[3.2, 0.0], [3.2, 5.9]], [[3.2, 3.2], [2.4, 2.3], [1.2, 2.3], [0.3, 3.2], [0.3, 5.0], [1.2, 5.9], [2.4, 5.9], [3.2, 5.0]]] },
  "?": { w: 3.8, s: [[[0.4, 1.3], [1.1, 0.2], [2.6, 0.1], [3.5, 1.0], [3.5, 2.2], [2.6, 3.0], [1.9, 3.6], [1.9, 4.4]], [[1.9, 5.5], [1.95, 5.9]]] },
};
const TRACK = 1.25;
const adv = (ch: string, cap: number) => (CUSTOM[ch] ? CUSTOM[ch].w * (cap / 6) : width(ch, cap)) + TRACK * (cap / 6);
export const textWidth = (s: string, cap: number) => [...s].reduce((a, ch) => a + adv(ch, cap), 0) - TRACK * (cap / 6);
export type TOpt = { cap: number; color?: string; colors?: string[]; seed?: number; w?: number; progress?: number; align?: "left" | "center" | "right"; opacity?: number };
// outlined lettering written on stroke by stroke; `colors` cycles a colour per visible character
export const text = (g: Gfx, s: string, x: number, y: number, o: TOpt) => {
  const { cap, color = CREAM, colors, seed = 1, progress = 1, align = "left", opacity = 1 } = o, w = o.w ?? Math.max(2.2, cap * 0.11);
  if (progress <= 0 || opacity <= 0) return;
  const chars = [...s], total = textWidth(s, cap), sc = cap / 6, n = chars.filter((c) => c !== " ").length;
  const x0 = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
  for (const pass of [0, 1]) {
    let cx = x0, vi = 0;
    chars.forEach((ch, i) => {
      if (ch === " ") { cx += adv(ch, cap); return; }
      const p = clamp(progress * n - vi), col = pass === 0 ? OUT : colors ? colors[vi % colors.length] : color, ww = pass === 0 ? w + Math.max(5, w * 0.9) : w;
      vi++;
      if (p > 0) {
        const cu = CUSTOM[ch];
        if (cu) cu.s.forEach((st, j) => { const pp = clamp(p * cu.s.length - j); if (pp > 0) g.pen(st.map(([px, py]) => [cx + (px + (6 - py) * 0.2) * sc, y + py * sc] as P), { w: ww, color: col, seed: seed + i * 13 + j, wobble: 0, boil: 0, taper: 0, opacity, progress: pp }); });
        else letter(g, ch, cx, y, { cap, color: col, seed: seed + i * 13, w: ww, opacity, progress: p });
      }
      cx += adv(ch, cap);
    });
  }
};

// ---- a banded ball: outline, hard bands stepping toward the light (upper left), a spec arc
export const ball = (c: Ctx, x: number, y: number, r: number, bands: string[], o: { shade?: number; alpha?: number; outline?: number } = {}) => {
  if (r <= 0.3) return;
  const { shade = 0, alpha = 1, outline = Math.max(2.5, r * 0.12) } = o;
  c.save(); c.globalAlpha = alpha;
  c.fillStyle = OUT; c.beginPath(); c.arc(x, y, r + outline, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.clip();
  c.fillStyle = bands[0]; c.fillRect(x - r, y - r, r * 2, r * 2);
  [[0.9, 0.14], [0.68, 0.3], [0.4, 0.46]].forEach(([k, off], i) => { c.fillStyle = bands[i + 1]; c.beginPath(); c.arc(x - r * off, y - r * off, r * k, 0, Math.PI * 2); c.fill(); });
  if (shade > 0) { c.fillStyle = BG_OUT; c.globalAlpha = alpha * shade; c.fillRect(x - r, y - r, r * 2, r * 2); }
  c.restore();
  c.save(); c.globalAlpha = alpha * 0.85; c.strokeStyle = "#fff8ec"; c.lineWidth = Math.max(1.5, r * 0.1); c.lineCap = "round";
  c.beginPath(); c.arc(x, y, r * 0.74, Math.PI * 1.08, Math.PI * 1.38); c.stroke(); c.restore();
};
export const glow = (c: Ctx, x: number, y: number, r: number, rgb: string, a: number) => {
  if (a <= 0 || r <= 0) return;
  const gr = c.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(0.45, `rgba(${rgb},${a * 0.35})`); gr.addColorStop(1, `rgba(${rgb},0)`);
  c.fillStyle = gr; c.fillRect(x - r, y - r, r * 2, r * 2);
};
// a stroke with the dark outline under it
export const inked = (c: Ctx, pts: P[], color: string, w: number, o: { alpha?: number; progress?: number; close?: boolean } = {}) => {
  const { alpha = 1, progress = 1, close = false } = o; if (progress <= 0 || alpha <= 0 || pts.length < 2) return;
  const seg = pts.map((p, i) => (i ? Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0)), tot = seg.reduce((a, b) => a + b, 0) * clamp(progress);
  const path = () => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); let acc = 0; for (let i = 1; i < pts.length; i++) { if (acc + seg[i] >= tot) { const f = (tot - acc) / seg[i]; c.lineTo(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f); return; } acc += seg[i]; c.lineTo(pts[i][0], pts[i][1]); } if (close && progress >= 1) c.closePath(); };
  c.save(); c.globalAlpha = alpha; c.lineCap = "round"; c.lineJoin = "round";
  c.strokeStyle = OUT; c.lineWidth = w + Math.max(6, w * 0.8); path(); c.stroke();
  c.strokeStyle = color; c.lineWidth = w; path(); c.stroke(); c.restore();
};
// a gluon: a springy wiggle between two points
export const gluon = (c: Ctx, a: P, b: P, o: { amp?: number; phase?: number; w?: number; alpha?: number; color?: string } = {}) => {
  const { amp = 9, phase = 0, w = 5, alpha = 1, color = YEL } = o;
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); if (L < 2) return;
  const nx = -dy / L, ny = dx / L, waves = Math.max(2, Math.round(L / 26)), N = waves * 10, pts: P[] = [];
  for (let i = 0; i <= N; i++) { const t = i / N, env = Math.sin(t * Math.PI) ** 0.5, s = Math.sin(t * waves * Math.PI * 2 + phase) * amp * env; pts.push([a[0] + dx * t + nx * s, a[1] + dy * t + ny * s]); }
  inked(c, pts, color, w, { alpha });
};
export const check = (c: Ctx, x: number, y: number, s: number, p: number, alpha = 1) => inked(c, [[x - s, y], [x - s * 0.3, y + s * 0.7], [x + s * 1.1, y - s * 0.75]], GREEN, s * 0.28, { progress: p, alpha });
export const cross = (c: Ctx, x: number, y: number, s: number, p: number, alpha = 1) => { inked(c, [[x - s, y - s], [x + s, y + s]], RED, s * 0.26, { progress: clamp(p * 2), alpha }); inked(c, [[x + s, y - s], [x - s, y + s]], RED, s * 0.26, { progress: clamp(p * 2 - 1), alpha }); };
export const card = (c: Ctx, x: number, y: number, w: number, h: number, alpha = 1, fill = "#2a2552") => {
  c.save(); c.globalAlpha = alpha;
  c.fillStyle = OUT; c.beginPath(); c.roundRect(x - w / 2 - 6, y - h / 2 - 6, w + 12, h + 12, 30); c.fill();
  c.fillStyle = fill; c.beginPath(); c.roundRect(x - w / 2, y - h / 2, w, h, 24); c.fill();
  c.strokeStyle = "rgba(255,241,220,0.16)"; c.lineWidth = 3; c.beginPath(); c.roundRect(x - w / 2 + 8, y - h / 2 + 8, w - 16, h - 16, 18); c.stroke();
  c.restore();
};
// streaming orbit dashes round a centre (the look from the nucleus chunk); `front` draws only the near half
export const orbitDashes = (c: Ctx, cx: number, cy: number, rx: number, t: number, front: boolean, o: { alpha?: number; tilt?: number; seed?: number; count?: number } = {}) => {
  const { alpha = 1, tilt = -0.22, seed = 9, count = 56 } = o; if (alpha <= 0) return;
  const ry = rx * 0.34, R = rng(seed);
  const ell = (a: number, k: number): P => { const ex = Math.cos(a) * rx * k, ey = Math.sin(a) * ry * k; return [cx + ex * Math.cos(tilt) - ey * Math.sin(tilt), cy + ex * Math.sin(tilt) + ey * Math.cos(tilt)]; };
  c.save(); c.lineCap = "round";
  if (!front) for (const [kk, al] of [[1.15, 0.3], [1.5, 0.18]] as [number, number][]) {
    c.setLineDash([7, 11]); c.lineDashOffset = -t * 14; c.strokeStyle = CREAM; c.globalAlpha = al * alpha; c.lineWidth = 1.4;
    c.beginPath(); for (let i = 0; i <= 120; i++) { const p = ell((i / 120) * Math.PI * 2, kk); i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); } c.stroke();
  }
  c.setLineDash([]);
  for (let s = 0; s < count; s++) {
    const k = 0.8 + R() * 0.75, a0 = R() * Math.PI * 2, len = 0.1 + R() * 0.4, w = 2.5 + R() * 5, col = DASHES[Math.floor(R() * DASHES.length)], n = 0.5 + R() * 0.6;
    const a = a0 + t * n * 1.4, steps = 12;
    for (let i = 0; i < steps; i++) {
      const a1 = a + (i / steps) * len, a2 = a + ((i + 1) / steps) * len;
      if ((Math.sin((a1 + a2) / 2) > 0) !== front) continue;
      const p1 = ell(a1, k), p2 = ell(a2, k);
      c.globalAlpha = alpha * 0.9 * Math.sin(((i + 0.5) / steps) * Math.PI) ** 0.4; c.strokeStyle = col; c.lineWidth = w;
      c.beginPath(); c.moveTo(p1[0], p1[1]); c.lineTo(p2[0], p2[1]); c.stroke();
    }
  }
  c.restore();
};
// drifting motes: always something moving in the room, never a loop (pure function of t)
export const motes = (c: Ctx, t: number, alpha = 1) => {
  const r = rng(505); c.save();
  for (let i = 0; i < 70; i++) {
    const x0 = r() * W, y0 = r() * H, vx = (r() - 0.5) * 14, vy = -4 - r() * 10, s = 1.2 + r() * 2.6, ph = r() * 6.28, col = r() > 0.6 ? "#ffd166" : r() > 0.5 ? "#ff8a4c" : "#c3aaff";
    const x = ((x0 + vx * t) % W + W) % W, y = ((y0 + vy * t) % H + H) % H;
    c.globalAlpha = alpha * (0.25 + 0.3 * (0.5 + 0.5 * Math.sin(t * 1.3 + ph))); c.fillStyle = col; c.beginPath(); c.arc(x, y, s, 0, Math.PI * 2); c.fill();
  }
  c.restore();
};
// write a small lowercase quark label (u / d) centred on a ball
export const qlabel = (g: Gfx, ch: string, x: number, y: number, r: number, alpha = 1, bar = false) => {
  const cap = r * 1.25, sc = cap / 6;
  text(g, ch, x - 1.8 * sc - 0.38 * sc, y - 4.1 * sc, { cap, color: CREAM, w: Math.max(2, cap * 0.13), opacity: alpha, seed: 7 });
  if (bar) g.touch(x - 3 * sc - 12, y - 6 * sc, x + 3 * sc + 12, y - 3 * sc);
  if (bar) inked(g.cur, [[x - 1.6 * sc, y - 4.6 * sc], [x + 1.9 * sc, y - 4.6 * sc]], CREAM, Math.max(2, cap * 0.1), { alpha });
};
```

---

## APPENDIX B — Worked example: `src/canvas-core/quarks.ts` (a complete 58 s chunk in this style)

Study it for structure and quality. Do NOT copy its scenes into other chunks: every chunk gets its own visuals.

```ts
import { Gfx, rng, type Ctx, type Env, type P } from "./core";
import { Film } from "./film";
import { clamp, lerp } from "./gallery";
import {
  W, H, FPS, OUT, CREAM, PRO_B, NEU_B, RED_B, GRN_B, BLU_B, YEL_B, CYAN_B, GREY_B, SUN_B, EARTH_B,
  PRO_T, NEU_T, YEL, DIM, RED, FLAT, ease, easeOut, back, ramp, span, space, grainOver, layer, blit,
  text, ball, glow, inked, gluon, check, cross, card, orbitDashes, motes, qlabel,
} from "./spaceStyle";

// QUARKS · chunk 2, narration-timed, one continuous shot, nothing repeats.
//  0-5.7   zoom: a body -> one atom -> its nucleus -> one proton, with shapes hidden in fog
//  6.5-13  a lens tries to look inside; crossed out twice; the proton's shockwave cracks it
//  13.6-20 fog clears: three quarks, gluon springs; proton (uud) beside neutron (udd); cage bars
//  20-30   one quark is dragged out, the gluon tube stretches, energy meter fills, SNAP: a new
//          quark/antiquark pair from nothing; one flies home, the pair drifts off
//  30.8-37 not a suspicion: quarks = gravity (planet, falling apple), two checks
//  38-44   the evidence: a burning star, a collision with tracks, a field of atoms; CONFIRMED REAL
//  44-58   never isolate / photograph / hold up (three crossed cards), "HERE IT IS?", pull out
// Cues are seconds in the TTS file, from its pauses (ffmpeg silencedetect -38 dB, 0.18 s).

const DURATION = 1742;                          // 58.07 s
const CUE = {
  seen: 3.93, notTech: 6.5, notLook: 9.19, forbids: 11.49, quarks: 13.57, blocks: 14.55, imprisoned: 18.02,
  pull: 19.96, energy: 21.21, snap: 25.31, escape: 28.56, andYet: 30.78, suspect: 31.55, gravity: 34.71, gravity2: 36.2,
  reaction: 38.04, collision: 39.72, atoms: 41.34, real: 42.4, so: 44.28, how: 45.29, isolate: 47.0, photo: 48.99, hold: 50.57, here: 52.4, answer: 53.86,
};
const C0: P = [960, 540];

// ---- the zoom: body -> atom -> nucleus -> proton, as one log-scale camera
const zoomU = (t: number) => 3.08 * ease(clamp(t / 4.4));
const atomScale = (u: number) => 1.75 * Math.pow(8, u - 2);
const HERO_OFF: P = [-9, -7];                  // the proton we fall into, in atom units
const NUC: { o: P; p: boolean }[] = [{ o: [10, -6], p: false }, { o: [8, 9], p: true }, { o: [-8, 10], p: false }];
const P0: P = [960, 600];                      // the glowing point in the chest

// ---- where the hero proton sits after the zoom (t, x, y, R, alpha)
const HK: [number, number, number, number, number][] = [
  [4.8, 960, 540, 231.7, 1], [6.2, 720, 540, 231.7, 1], [15.4, 720, 540, 231.7, 1], [16.3, 470, 560, 165, 1], [18.0, 470, 560, 165, 1],
  [18.9, 720, 540, 231.7, 1], [34.7, 720, 540, 231.7, 1], [35.5, 470, 560, 150, 1], [37.4, 470, 560, 150, 1], [37.9, 470, 560, 110, 0],
  [44.3, 720, 540, 190, 0], [45.0, 720, 540, 210, 1], [53.9, 720, 540, 210, 1], [55.5, 960, 370, 128, 1], [58.1, 960, 360, 114, 1],
];
const keyed = (K: number[][], t: number) => {
  if (t <= K[0][0]) return K[0].slice(1);
  for (let i = 0; i < K.length - 1; i++) if (t < K[i + 1][0]) { const f = ease((t - K[i][0]) / (K[i + 1][0] - K[i][0])); return K[i].slice(1).map((v, j) => lerp(v, K[i + 1][j + 1], f)); }
  return K[K.length - 1].slice(1);
};

// quark slots: rotation freezes while one is being pulled so it points straight at the pull
const QB = [RED_B, GRN_B, BLU_B];
const rotAt = (t: number) => 3.502 + 0.25 * (t < 19.5 ? t : t < 30.4 ? 19.5 : t - 10.9);
const slots = (x: number, y: number, R: number, t: number, seed = 0): P[] =>
  [0, 1, 2].map((i) => { const a = rotAt(t) + (i * Math.PI * 2) / 3; return [x + Math.cos(a) * R * 0.46 + Math.sin(t * 2.7 + i * 2 + seed) * R * 0.025, y + Math.sin(a) * R * 0.46 + Math.cos(t * 2.3 + i * 3 + seed) * R * 0.025]; });

type Q = { p: P; r: number; bands: string[]; ch: string; bar?: boolean };
// a proton/neutron seen from inside: translucent banded shell, the quarks and their gluons, fog, rim
const hadron = (c: Ctx, x: number, y: number, R: number, t: number, o: { opaque: number; fog: number; alpha: number; shell: string[]; qs: Q[]; links: [number, number][]; glowRGB?: string }) => {
  const { opaque, fog, alpha, shell, qs, links } = o; if (alpha <= 0 || R < 0.5) return;
  c.save(); c.globalAlpha = alpha;
  glow(c, x, y, R * 2.1, o.glowRGB ?? "255,138,76", 0.32);
  c.save(); c.beginPath(); c.arc(x, y, R, 0, Math.PI * 2); c.clip();
  const sa = lerp(0.26, 1, opaque);
  c.globalAlpha = alpha * sa; c.fillStyle = shell[0]; c.fillRect(x - R, y - R, R * 2, R * 2);
  [[0.9, 0.14], [0.68, 0.3], [0.4, 0.46]].forEach(([k, off], i) => { c.fillStyle = shell[i + 1]; c.beginPath(); c.arc(x - R * off, y - R * off, R * k, 0, Math.PI * 2); c.fill(); });
  const qa = (1 - opaque) * (1 - 0.6 * fog);
  if (qa > 0) {
    c.globalAlpha = alpha;
    links.forEach(([i, j], k) => gluon(c, qs[i].p, qs[j].p, { amp: R * 0.04, phase: t * 7 + k, w: Math.max(2, R * 0.022), alpha: qa }));
    qs.forEach((q) => ball(c, q.p[0], q.p[1], q.r, q.bands, { alpha: qa }));
  }
  if (fog > 0) { const fr = rng(31); for (let i = 0; i < 26; i++) { const a = fr() * 6.28 + t * (0.15 + fr() * 0.2), d = fr() * R * 0.8, s = R * (0.25 + fr() * 0.3); glow(c, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.9, s, "205,196,255", 0.28 * fog * (1 - opaque * 0.7)); } }
  c.restore();
  c.globalAlpha = alpha; c.lineCap = "round";
  c.strokeStyle = OUT; c.lineWidth = Math.max(4, R * 0.06); c.beginPath(); c.arc(x, y, R, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = shell[2]; c.lineWidth = Math.max(2, R * 0.028); c.beginPath(); c.arc(x, y, R - R * 0.02, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = "#fff8ec"; c.globalAlpha = alpha * 0.8; c.lineWidth = Math.max(1.5, R * 0.03); c.beginPath(); c.arc(x, y, R * 0.84, Math.PI * 1.1, Math.PI * 1.36); c.stroke();
  c.restore();
};

// the lens that tries to look inside
const lens = (c: Ctx, x: number, y: number, rad: number, rot: number, crack: number, alpha: number) => {
  if (alpha <= 0) return; c.save(); c.globalAlpha = alpha; c.translate(x, y); c.rotate(rot);
  inked(c, [[rad * 0.72, rad * 0.72], [rad * 1.75, rad * 1.75]], "#8a5a3c", rad * 0.22);
  inked(c, [[rad * 0.9, rad * 0.9], [rad * 1.7, rad * 1.7]], "#b97a52", rad * 0.08);
  c.fillStyle = "rgba(190,210,255,0.16)"; c.beginPath(); c.arc(0, 0, rad, 0, Math.PI * 2); c.fill();
  c.strokeStyle = OUT; c.lineWidth = rad * 0.2; c.beginPath(); c.arc(0, 0, rad, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = "#c9c4ea"; c.lineWidth = rad * 0.1; c.beginPath(); c.arc(0, 0, rad, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = "rgba(255,255,255,0.7)"; c.lineWidth = rad * 0.06; c.lineCap = "round"; c.beginPath(); c.arc(0, 0, rad * 0.72, Math.PI * 1.1, Math.PI * 1.45); c.stroke();
  if (crack > 0) { const r = rng(12); for (let k = 0; k < 6; k++) { const a = r() * 6.28; const pts: P[] = [[rad * 0.1, -rad * 0.1]]; let px = rad * 0.1, py = -rad * 0.1; for (let s = 0; s < 4; s++) { const aa = a + (r() - 0.5) * 0.8, l = rad * 0.26; px += Math.cos(aa) * l; py += Math.sin(aa) * l; pts.push([px, py]); } c.save(); c.beginPath(); c.arc(0, 0, rad * 0.95, 0, 6.28); c.clip(); inked(c, pts, "#f4f8ff", rad * 0.03, { progress: crack }); c.restore(); } }
  c.restore();
};

// the human silhouette the film opens on, and the atoms twinkling inside it
const BODY: P[] = [[700, 1140], [712, 660], [742, 560], [812, 492], [890, 462], [925, 455], [925, 395], [995, 395], [995, 455], [1030, 462], [1108, 492], [1178, 560], [1208, 660], [1220, 1140]];
const inPoly = (pts: P[], x: number, y: number) => { let k = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) k = !k; } return k; };
const SPARKS: P[] = (() => { const r = rng(88), out: P[] = []; while (out.length < 110) { const x = 700 + r() * 520, y = 200 + r() * 900; if (inPoly(BODY, x, y) || Math.hypot(x - 960, y - 300) < 88) out.push([x, y]); } return out; })();

const draw = (ctx: Ctx, frame: number, env: Env) => {
  const t = frame / FPS, g = new Gfx(ctx, env, frame, FLAT), sc = env.scale;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(space(env).canvas as CanvasImageSource, 0, 0); ctx.setTransform(sc, 0, 0, sc, 0, 0);
  motes(ctx, t, 0.9);
  const AL = layer(env, "art"), c = AL.ctx;
  const words: (() => void)[] = [], after: (() => void)[] = [];            // lettering, written after the art (on top, no grain)
  const say = (s: string, x: number, y: number, o: Parameters<typeof text>[4]) => words.push(() => text(g, s, x, y, o));

  // ================================================================ 0-5: the fall inward
  const u = zoomU(t), a = atomScale(u);
  const piv: P = [lerp(P0[0], C0[0], ease(clamp(u))), lerp(P0[1], C0[1], ease(clamp(u)))];
  if (t < 3) { // body
    const b = Math.pow(8, u), ba = 1 - ramp(u, 0.75, 0.4), M = (p: P): P => [piv[0] + (p[0] - P0[0]) * b, piv[1] + (p[1] - P0[1]) * b];
    if (ba > 0) {
      c.save(); c.globalAlpha = ba;
      const path = () => { c.beginPath(); BODY.forEach((p, i) => { const q = M(p); i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); c.closePath(); const h = M([960, 300]); c.moveTo(h[0] + 90 * b, h[1]); c.arc(h[0], h[1], 90 * b, 0, Math.PI * 2); };
      glow(c, piv[0], piv[1] - 60 * b, 700 * b, "120,100,255", 0.25);
      c.strokeStyle = OUT; c.lineWidth = 14; c.lineJoin = "round"; path(); c.stroke();
      c.fillStyle = "#2b255c"; path(); c.fill();
      c.save(); path(); c.clip(); c.translate(-7, -7); c.strokeStyle = "#7c6ff2"; c.lineWidth = 7; path(); c.stroke(); c.restore();
      SPARKS.forEach((p, i) => { const q = M(p), tw = 0.5 + 0.5 * Math.sin(t * 5 + i * 1.7); glow(c, q[0], q[1], Math.min(40, 9 * b), i % 3 ? "95,214,245" : "255,138,76", 0.35 + 0.35 * tw); c.fillStyle = CREAM; c.beginPath(); c.arc(q[0], q[1], Math.min(6, 1.6 * b), 0, 6.28); c.fill(); });
      glow(c, piv[0], piv[1], 60 * b * (1 + 0.1 * Math.sin(t * 8)), "255,209,102", 0.9);
      c.restore();
    }
  }
  const atomA = ramp(u, 0.7, 0.35), nbA = 1 - ramp(t, 3.6, 1.0);
  const pw: P = [lerp(0, HERO_OFF[0], ease(ramp(u, 1.6, 1.0))), lerp(0, HERO_OFF[1], ease(ramp(u, 1.6, 1.0)))];
  const MA = (p: P): P => [piv[0] + (p[0] - pw[0]) * a, piv[1] + (p[1] - pw[1]) * a];
  if (t < 5 && atomA > 0) { // atom: orbits, electrons, a four-nucleon nucleus
    const oa = atomA * (1 - ramp(u, 2.2, 0.5));
    if (oa > 0) {
      const ctr = MA([0, 0]);
      glow(c, ctr[0], ctr[1], 60 * a, "255,138,76", 0.5 * oa);
      [0, 1, 2].forEach((k) => {
        const rot = (k * Math.PI) / 3 + 0.3, ell = (th: number): P => { const ex = Math.cos(th) * 380 * a, ey = Math.sin(th) * 110 * a; return [ctr[0] + ex * Math.cos(rot) - ey * Math.sin(rot), ctr[1] + ex * Math.sin(rot) + ey * Math.cos(rot)]; };
        c.save(); c.globalAlpha = oa * 0.55; c.setLineDash([8, 10]); c.lineDashOffset = -t * 20; c.strokeStyle = CREAM; c.lineWidth = 2; c.beginPath();
        for (let i = 0; i <= 90; i++) { const q = ell((i / 90) * 6.28); i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); } c.stroke(); c.restore();
        const e = ell(t * 2.4 + k * 2.1); ball(c, e[0], e[1], Math.min(26, 12 * a), CYAN_B, { alpha: oa });
      });
    }
    NUC.forEach((n) => { const q = MA(n.o); ball(c, q[0], q[1], 14 * a, n.p ? PRO_B : NEU_B, { alpha: atomA * nbA }); });
  }

  // ================================================================ the hero proton, all film long
  let hx: number, hy: number, R: number, ha: number;
  if (t < 4.8) { const q = MA(HERO_OFF); hx = q[0]; hy = q[1]; R = 14 * a; ha = atomA; } else [hx, hy, R, ha] = keyed(HK, t);
  const opaque = 1 - ramp(t, 3.95, 1.0), fog = t < CUE.quarks ? 1 : 1 - ramp(t, CUE.quarks, 0.7);
  const orbitA = ha * clamp(ramp(t, 4.2, 1) * (1 - 0.85 * span(t, CUE.pull - 0.3, CUE.andYet + 0.5, 0.5)));
  orbitDashes(c, hx, hy, R * 1.25, t, false, { alpha: orbitA * 0.8 });

  // --- quark positions, including the pull
  const sl = slots(hx, hy, R, t), qr = R * 0.25;
  const qs: Q[] = [{ p: sl[0], r: qr, bands: QB[0], ch: "u" }, { p: sl[1], r: qr, bands: QB[1], ch: "u" }, { p: sl[2], r: qr, bands: QB[2], ch: "d" }];
  let links: [number, number][] = [[0, 1], [1, 2], [2, 0]];
  const pulling = t >= CUE.pull && t < CUE.escape + 2.5;
  const Dmax = 560, D = (tt: number) => (Dmax * (1 - Math.exp(-(tt - CUE.pull) / 1.5))) / (1 - Math.exp(-(CUE.snap - CUE.pull) / 1.5));
  let tube: { a: P; b: P; k: number } | null = null, pair: { q: P; aq: P } | null = null, B: P = [0, 0];
  if (pulling) {
    const S2 = sl[2];
    if (t < CUE.snap) {
      const d = D(t), k = d / Dmax, shake = 7 * k * k;
      const pq: P = [S2[0] + d, S2[1] + Math.sin(t * 43) * shake];
      tube = { a: S2, b: pq, k };
      qs[2] = { ...qs[2], p: pq };
      links = [[0, 1]];
    } else {
      const d0 = D(CUE.snap), ts = t - CUE.snap, pq0: P = [S2[0] + d0, S2[1]];
      B = [(S2[0] + pq0[0]) / 2, S2[1]];
      const home = ease(clamp(ts / 0.9));
      qs[2] = { ...qs[2], p: [lerp(B[0], S2[0], home), lerp(B[1], S2[1], home)] }; // the new quark flies home
      const mx = pq0[0] + 40 * ts + 120 * ts * ts, my = pq0[1] - 30 * ts * ts;
      const join = ease(clamp(ts / 0.5)), aqT: P = [mx - qr * 2.4, my];
      pair = { q: [mx, my], aq: [lerp(B[0], aqT[0], join), lerp(B[1], aqT[1], join)] };
    }
  }

  // --- S3: the neutron beside it (u d d)
  const [nx, ny, nR, na] = keyed([[15.4, 1320, 560, 165, 0], [16.3, 930, 560, 165, 1], [18.0, 930, 560, 165, 1], [18.55, 1150, 560, 120, 0]], t);
  if (t > 15.3 && t < 19) {
    const ns = slots(nx, ny, nR, t, 5);
    hadron(c, nx, ny, nR, t, { opaque: 0, fog: 0, alpha: na, shell: NEU_B, glowRGB: "143,108,240", links: [[0, 1], [1, 2], [2, 0]], qs: [0, 1, 2].map((i) => ({ p: ns[i], r: nR * 0.25, bands: QB[i], ch: "udd"[i] })) });
    if (na > 0.3) [0, 1, 2].forEach((i) => words.push(() => qlabel(g, "udd"[i], ns[i][0], ns[i][1], nR * 0.25, na)));
  }

  hadron(c, hx, hy, R, t, { opaque, fog, alpha: ha, shell: PRO_B, qs, links });

  // --- the pull: flux tube, meter, snap, the new pair
  if (tube) {
    const { a: ta, b: tb, k } = tube, wob = (s: number) => Math.sin(s * 0.09 - t * 18) * (3 + 10 * k);
    const pts: P[] = []; for (let i = 0; i <= 40; i++) { const f = i / 40; pts.push([lerp(ta[0], tb[0], f), lerp(ta[1], tb[1], f) + wob(i * 14) * Math.sin(f * Math.PI)]); }
    glow(c, (ta[0] + tb[0]) / 2, ta[1], 120 + 260 * k, "255,209,102", 0.25 + 0.4 * k);
    inked(c, pts, "#ff8a4c", qr * (0.55 + 0.35 * k));
    inked(c, pts, YEL, qr * (0.22 + 0.2 * k));
    for (let i = 0; i < 9; i++) { const f = ((i / 9 + t * 0.9) % 1), q = pts[Math.floor(f * 40)]; c.fillStyle = "#fff8e0"; c.globalAlpha = 0.8; c.beginPath(); c.arc(q[0], q[1], 3 + 4 * k, 0, 6.28); c.fill(); c.globalAlpha = 1; }
    gluon(c, qs[0].p, ta, { amp: R * 0.035, phase: t * 7, w: R * 0.02 }); gluon(c, qs[1].p, ta, { amp: R * 0.035, phase: t * 7 + 1, w: R * 0.02 });
    ball(c, qs[2].p[0], qs[2].p[1], qr, QB[2]);
    const ar = ramp(t, CUE.pull, 0.4) * (1 - ramp(t, CUE.snap - 0.3, 0.3)); // the pull arrow
    if (ar > 0) { const x0 = qs[2].p[0] + qr + 24, y0 = qs[2].p[1]; inked(c, [[x0, y0], [x0 + 110, y0]], CREAM, 14, { alpha: ar, progress: ar }); inked(c, [[x0 + 80, y0 - 28], [x0 + 112, y0], [x0 + 80, y0 + 28]], CREAM, 14, { alpha: ar }); }
  }
  if (t >= CUE.snap && pulling) {
    const ts = t - CUE.snap, fl = 1 - clamp(ts / 0.7);
    if (fl > 0) { glow(c, B[0], B[1], 260 + 200 * ts, "255,241,220", 0.95 * fl); glow(c, B[0], B[1], 420, "255,209,102", 0.5 * fl); for (let k = 0; k < 12; k++) { const an = (k / 12) * 6.28 + 0.2, r0 = 40 + 300 * easeOut(clamp(ts / 0.6)), r1 = r0 + 60 * fl; inked(c, [[B[0] + Math.cos(an) * r0, B[1] + Math.sin(an) * r0], [B[0] + Math.cos(an) * r1, B[1] + Math.sin(an) * r1]], YEL, 6, { alpha: fl }); } }
    if (pair) {
      if (ts < 0.9) gluon(c, qs[2].p, qs[0].p, { amp: R * 0.035, phase: t * 7, w: R * 0.02 }), gluon(c, qs[2].p, qs[1].p, { amp: R * 0.035, phase: t * 7 + 2, w: R * 0.02 });
      gluon(c, pair.aq, pair.q, { amp: qr * 0.18, phase: t * 9, w: qr * 0.1 });
      if (ts < 1.0) ball(c, qs[2].p[0], qs[2].p[1], qr, QB[2]);
      ball(c, pair.aq[0], pair.aq[1], qr, YEL_B, { alpha: ramp(ts, 0, 0.15) }); ball(c, pair.q[0], pair.q[1], qr, QB[2]);
      words.push(() => { qlabel(g, "d", pair!.aq[0], pair!.aq[1], qr, ramp(ts, 0.1, 0.2), true); qlabel(g, "d", pair!.q[0], pair!.q[1], qr); });
      if (ts > 0.6 && ts < 3.4) say("QUARK AND ANTIQUARK", (pair.q[0] + pair.aq[0]) / 2, pair.q[1] + qr + 36, { cap: 22, color: YEL, progress: ramp(ts, 0.6, 0.5), align: "center", opacity: 1 - ramp(ts, 3.0, 0.4) });
    }
  }
  orbitDashes(c, hx, hy, R * 1.25, t, true, { alpha: orbitA * 0.8 });
  // quark labels, and question marks while they are still hidden
  if (ha > 0.2) {
    if (fog < 0.5) qs.forEach((q) => words.push(() => qlabel(g, q.ch, q.p[0], q.p[1], q.r, ha * (1 - opaque) * clamp(1 - fog * 2))));
    else if (opaque < 0.6) qs.forEach((q, i) => say("?", q.p[0] - q.r * 0.3, q.p[1] - q.r * 0.55, { cap: q.r * 1.0, color: CREAM, opacity: fog * (1 - opaque) * 0.85, progress: ramp(t, 4.3 + i * 0.25, 0.4), seed: 60 + i }));
  }
  // energy meter
  const em = span(t, CUE.pull + 0.4, CUE.snap + 0.9, 0.4);
  if (em > 0) {
    const f = t < CUE.snap ? D(t) / Dmax : 1 - ramp(t, CUE.snap, 0.5), x0 = 700, y0 = 985, bw = 700;
    c.save(); c.globalAlpha = em;
    c.fillStyle = OUT; c.beginPath(); c.roundRect(x0 - 6, y0 - 23, bw + 12, 46, 23); c.fill();
    c.fillStyle = "#2a2552"; c.beginPath(); c.roundRect(x0, y0 - 17, bw, 34, 17); c.fill();
    if (f > 0.01) { const hot = f > 0.8 ? 0.5 + 0.5 * Math.sin(t * 30) : 0; c.fillStyle = f > 0.8 ? (hot > 0.5 ? "#ff5f6d" : "#f0553a") : "#f0553a"; c.beginPath(); c.roundRect(x0, y0 - 17, bw * f, 34, 17); c.fill(); c.fillStyle = "#ffb347"; c.beginPath(); c.roundRect(x0 + 6, y0 - 13, Math.max(0, bw * f - 12), 12, 6); c.fill(); }
    c.restore();
    say("ENERGY", x0 - 30, y0 - 13, { cap: 26, color: PRO_T, align: "right", opacity: em });
  }

  // ================================================================ S2: the lens that cannot see
  const [lx, ly, lr, la] = keyed([[6.4, 1640, 1040, 110, 1], [7.6, 1030, 700, 110, 1], [9.2, 1030, 700, 110, 1], [10.4, 975, 655, 150, 1], [11.55, 975, 655, 150, 1], [12.0, 1380, 900, 150, 1], [12.9, 1380, 900, 150, 1], [13.4, 1420, 940, 150, 0]], t);
  if (t > 6.4 && t < 13.4) lens(c, lx, ly, lr, -0.15 + (t > CUE.forbids ? Math.sin((t - CUE.forbids) * 20) * 0.25 * (1 - ramp(t, CUE.forbids + 0.1, 1)) : 0), ramp(t, CUE.forbids + 0.15, 0.3), la);
  if (t > CUE.forbids && t < CUE.forbids + 1) { const f = ramp(t, CUE.forbids, 0.8); inked(c, Array.from({ length: 73 }, (_, i) => [hx + Math.cos(i / 72 * 6.28) * (R + 20 + 300 * easeOut(f)), hy + Math.sin(i / 72 * 6.28) * (R + 20 + 300 * easeOut(f))] as P), YEL, 10 * (1 - f) + 2, { alpha: 1 - f }); glow(c, hx, hy, R * 2.2, "255,209,102", 0.5 * (1 - f)); }

  // ================================================================ S3: cage
  const cage = span(t, CUE.imprisoned + 0.1, CUE.pull - 0.05, 0.35);
  if (cage > 0) {
    const drop = ease(ramp(t, CUE.imprisoned + 0.1, 0.5));
    c.save(); c.beginPath(); c.arc(hx, hy, R * 1.02, 0, 6.28); c.clip();
    for (let k = -3; k <= 3; k++) { const x = hx + k * R * 0.27; inked(c, [[x, hy - R * 1.1], [x, lerp(hy - R * 1.1, hy + R * 1.1, drop)]], "#9d97cf", R * 0.055, { alpha: cage }); }
    c.restore();
    inked(c, Array.from({ length: 73 }, (_, i) => [hx + Math.cos(i / 72 * 6.28) * R * 1.03, hy + Math.sin(i / 72 * 6.28) * R * 1.03] as P), "#9d97cf", R * 0.05, { alpha: cage * drop });
  }

  // ================================================================ S5: as certain as gravity
  const gv = span(t, CUE.gravity, 37.7, 0.4);
  if (gv > 0) {
    const pop = back(clamp(ramp(t, CUE.gravity, 0.55))), px = 1450, py = 560, pr = 150 * pop;
    c.save(); c.globalAlpha = gv;
    glow(c, px, py, 330, "79,151,245", 0.35);
    const moonA = t * 1.3, mo: P = [px + Math.cos(moonA) * 240, py + Math.sin(moonA) * 70 - Math.cos(moonA) * 20];
    c.setLineDash([7, 10]); c.strokeStyle = CREAM; c.globalAlpha = gv * 0.4; c.lineWidth = 2; c.beginPath(); c.ellipse(px, py, 240 * pop, 72 * pop, -0.08, 0, 6.28); c.stroke(); c.setLineDash([]); c.globalAlpha = gv;
    if (Math.sin(moonA) < 0) ball(c, mo[0], mo[1], 26 * pop, GREY_B);
    ball(c, px, py, pr, EARTH_B);
    c.save(); c.beginPath(); c.arc(px, py, pr, 0, 6.28); c.clip(); c.fillStyle = "#2fb37a"; [[-50, -40, 55, 30], [40, 30, 70, 38], [-20, 80, 40, 20]].forEach(([dx, dy, rx, ry]) => { c.beginPath(); c.ellipse(px + dx * pop, py + dy * pop, rx * pop, ry * pop, 0.4, 0, 6.28); c.fill(); }); c.restore();
    if (Math.sin(moonA) >= 0) ball(c, mo[0], mo[1], 26 * pop, GREY_B);
    const fall = clamp((t - 35.0) / 0.9), ay = fall < 1 ? lerp(170, py - pr - 18, fall * fall) : py - pr - 18 - Math.abs(Math.sin((t - 35.9) * 9)) * 22 * Math.exp(-(t - 35.9) * 4);
    if (t > 34.95) { ball(c, px, ay, 18, RED_B); inked(c, [[px, ay - 18], [px + 4, ay - 30]], "#6b4a2b", 4); inked(c, [[px + 4, ay - 26], [px + 20, ay - 34]], "#2fb37a", 6); }
    const eq = back(clamp(ramp(t, 35.2, 0.45)));
    if (eq > 0) { inked(c, [[960 - 60 * eq, 535], [960 + 60 * eq, 535]], CREAM, 18); inked(c, [[960 - 60 * eq, 585], [960 + 60 * eq, 585]], CREAM, 18); }
    check(c, 470, 880, 40, ramp(t, CUE.gravity2 + 0.2, 0.35), gv); check(c, 1450, 880, 40, ramp(t, CUE.gravity2 + 0.5, 0.35), gv);
    c.restore();
    say("AS CERTAIN AS", 960, 120, { cap: 50, color: CREAM, align: "center", progress: ramp(t, CUE.gravity, 0.6), opacity: gv });
    say("QUARKS", 470, 760, { cap: 40, colors: [RED_B[2], GRN_B[2], BLU_B[2]], align: "center", progress: ramp(t, CUE.gravity2 - 0.3, 0.5), opacity: gv });
    say("GRAVITY", 1450, 760, { cap: 40, color: EARTH_B[3], align: "center", progress: ramp(t, CUE.gravity2, 0.5), opacity: gv });
  }

  // ================================================================ S6: the evidence
  const ev = span(t, CUE.reaction, 44.3, 0.4);
  if (ev > 0) {
    c.save(); c.globalAlpha = ev;
    // a star burning: nuclear reactions
    const s1 = back(clamp(ramp(t, CUE.reaction, 0.5)));
    if (s1 > 0) {
      const sx = 400, sy = 500; glow(c, sx, sy, 300 * s1, "255,179,71", 0.55);
      for (let k = 0; k < 14; k++) { const an = (k / 14) * 6.28 + t * 0.4, r0 = 118 * s1, r1 = (160 + 26 * Math.sin(t * 5 + k * 1.9)) * s1; const pts: P[] = [[sx + Math.cos(an - 0.13) * r0, sy + Math.sin(an - 0.13) * r0], [sx + Math.cos(an) * r1, sy + Math.sin(an) * r1], [sx + Math.cos(an + 0.13) * r0, sy + Math.sin(an + 0.13) * r0]]; c.fillStyle = OUT; c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.lineWidth = 8; c.strokeStyle = OUT; c.stroke(); c.fillStyle = k % 2 ? YEL : "#ff8a4c"; c.fill(); }
      ball(c, sx, sy, 120 * s1, SUN_B);
      for (let k = 0; k < 5; k++) { const an = t * 1.7 + k * 1.26, d = 60 * s1; glow(c, sx + Math.cos(an) * d, sy + Math.sin(an) * d * 0.8, 38 * s1, "255,255,230", 0.5 + 0.4 * Math.sin(t * 9 + k)); }
      check(c, 400, 870, 34, ramp(t, CUE.reaction + 0.9, 0.3), ev);
    }
    // a collision: two beams meet once, tracks fly out and stay
    const s2 = back(clamp(ramp(t, CUE.collision, 0.5)));
    if (s2 > 0) {
      const cx2 = 960, cy2 = 500, hit = CUE.collision + 0.65;
      c.save(); c.setLineDash([9, 10]); c.lineDashOffset = -t * 30; c.strokeStyle = CREAM; c.globalAlpha = ev * 0.45; c.lineWidth = 3; c.beginPath(); c.arc(cx2, cy2, 160 * s2, 0, 6.28); c.stroke(); c.restore();
      if (t < hit) { const f = ease(ramp(t, CUE.collision, hit - CUE.collision)); inked(c, [[cx2 - 160, cy2], [cx2 - 160 + 160 * f, cy2]], "#5fd6f5", 4, { alpha: 0.6 }); inked(c, [[cx2 + 160, cy2], [cx2 + 160 - 160 * f, cy2]], "#ff5fa2", 4, { alpha: 0.6 }); ball(c, cx2 - 160 + 160 * f - 12, cy2, 13, CYAN_B); ball(c, cx2 + 160 - 160 * f + 12, cy2, 13, ["#8f1f5c", "#e0347e", "#ff5fa2", "#ffc2dd"]); }
      else {
        const tr = rng(71), gr = easeOut(clamp((t - hit) / 0.9));
        glow(c, cx2, cy2, 200, "255,241,220", 0.9 * (1 - clamp((t - hit) / 0.6)));
        for (let k = 0; k < 16; k++) { let hd = tr() * 6.28; const kap = (tr() - 0.5) * 0.02, L = (60 + tr() * 120) * gr, col = ["#ff5fa2", "#ff8a4c", "#ffd166", "#fff1dc", "#5fd6f5"][k % 5], pts: P[] = [[cx2, cy2]]; let x = cx2, y = cy2; for (let s = 0; s < L; s += 6) { hd += kap * 6; x += Math.cos(hd) * 6; y += Math.sin(hd) * 6; pts.push([x, y]); } inked(c, pts, col, 3.5); }
      }
      check(c, 960, 870, 34, ramp(t, CUE.collision + 1.3, 0.3), ev);
    }
    // a field of atoms
    const s3 = ramp(t, CUE.atoms, 0.01);
    if (s3 > 0) {
      const HEX: P[] = [[0, 0], [100, 0], [-100, 0], [50, 86], [-50, 86], [50, -86], [-50, -86]];
      HEX.forEach(([dx, dy], i) => {
        const p = back(clamp(ramp(t, CUE.atoms + i * 0.13, 0.4))); if (p <= 0) return;
        const x = 1520 + dx, y = 500 + dy, rot = i * 0.9 + 0.4, ea = t * (2 + i * 0.3) + i;
        c.save(); c.translate(x, y); c.rotate(rot); c.strokeStyle = CREAM; c.globalAlpha = ev * 0.55; c.lineWidth = 2; c.beginPath(); c.ellipse(0, 0, 44 * p, 15 * p, 0, 0, 6.28); c.stroke(); c.restore();
        glow(c, x, y, 40 * p, "255,138,76", 0.4); ball(c, x, y, 12 * p, PRO_B);
        const e: P = [x + Math.cos(ea) * 44 * p * Math.cos(rot) - Math.sin(ea) * 15 * p * Math.sin(rot), y + Math.cos(ea) * 44 * p * Math.sin(rot) + Math.sin(ea) * 15 * p * Math.cos(rot)];
        ball(c, e[0], e[1], 6 * p, CYAN_B);
      });
      check(c, 1520, 870, 34, ramp(t, CUE.atoms + 1.2, 0.3), ev);
    }
    c.restore();
    say("NUCLEAR REACTIONS", 400, 745, { cap: 30, color: YEL, align: "center", progress: ramp(t, CUE.reaction + 0.1, 0.5), opacity: ev });
    say("PARTICLE COLLISIONS", 960, 745, { cap: 30, color: "#5fd6f5", align: "center", progress: ramp(t, CUE.collision + 0.1, 0.5), opacity: ev });
    say("EVERY ATOM", 1520, 745, { cap: 30, color: PRO_T, align: "center", progress: ramp(t, CUE.atoms + 0.1, 0.5), opacity: ev });
    say("CONFIRMED REAL", 960, 120, { cap: 76, color: YEL, align: "center", progress: ramp(t, CUE.real, 0.7), opacity: ev, w: 8 });
  }

  // ================================================================ S7: never isolate, photograph, hold
  const cd = span(t, CUE.isolate, CUE.answer + 0.3, 0.4);
  if (cd > 0) {
    const rows: [number, string, number, (x: number, y: number, a: number) => void][] = [
      [CUE.isolate, "ISOLATE IT", 420, (x, y, al) => { ball(c, x - 12, y, 18, GREY_B, { alpha: al }); inked(c, [[x + 12, y], [x + 50, y]], CREAM, 7, { alpha: al }); inked(c, [[x + 38, y - 12], [x + 52, y], [x + 38, y + 12]], CREAM, 7, { alpha: al }); }],
      [CUE.photo, "PHOTOGRAPH IT", 560, (x, y, al) => { c.save(); c.globalAlpha = al; c.fillStyle = OUT; c.beginPath(); c.roundRect(x - 38, y - 26, 76, 52, 10); c.fill(); c.fillStyle = "#5a548a"; c.beginPath(); c.roundRect(x - 33, y - 21, 66, 42, 8); c.fill(); c.fillStyle = OUT; c.fillRect(x - 12, y - 34, 24, 10); c.restore(); ball(c, x, y, 13, CYAN_B, { alpha: al }); }],
      [CUE.hold, "HOLD IT UP", 700, (x, y, al) => { inked(c, [[x - 34, y - 30], [x + 2, y - 6]], CREAM, 7, { alpha: al }); inked(c, [[x - 34, y + 30], [x + 2, y + 6]], CREAM, 7, { alpha: al }); ball(c, x + 18, y, 10, GREY_B, { alpha: al }); }],
    ];
    rows.forEach(([t0, label, y, icon]) => {
      const p = back(clamp(ramp(t, t0, 0.45))); if (p <= 0) return;
      const x = 1450 + (1 - clamp(ramp(t, t0, 0.35))) * 200;
      card(c, x, y, 600 * Math.min(1, p), 112, cd); icon(x - 230, y, cd);
      cross(c, x + 238, y, 26, ramp(t, t0 + 0.8, 0.35), cd);
      say(label, x - 170, y - 16, { cap: 32, color: CREAM, progress: ramp(t, t0 + 0.1, 0.5), opacity: cd });
    });
  }
  const hb = span(t, CUE.here, CUE.answer + 0.2, 0.3);
  if (hb > 0) {
    const p = back(clamp(ramp(t, CUE.here, 0.4))), bx = 420, by = 200;
    c.save(); c.globalAlpha = hb;
    const tail: P[] = [[bx + 60, by + 40], [bx + 150, by + 150], [bx + 120, by + 40]];
    c.fillStyle = OUT; c.beginPath(); tail.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.closePath(); c.lineWidth = 12; c.strokeStyle = OUT; c.stroke(); c.restore();
    card(c, bx, by, 380 * p, 120 * p, hb, "#fff1dc");
    c.save(); c.globalAlpha = hb; c.fillStyle = "#fff1dc"; c.beginPath(); tail.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.closePath(); c.fill(); c.restore();
    say("HERE IT IS?", bx, by - 18, { cap: 38, color: "#2a2552", align: "center", progress: ramp(t, CUE.here + 0.1, 0.4), opacity: hb, w: 4.5 });
  }

  grainOver(env, c);
  blit(ctx, env, AL);

  // ================================================================ lettering
  // S1
  say("INSIDE EVERY ATOM IN YOUR BODY", 960, 930, { cap: 40, color: CREAM, align: "center", progress: ramp(t, 0.35, 1.2), opacity: 1 - ramp(t, CUE.seen - 0.3, 0.3) });
  say("PARTICLES NO HUMAN HAS EVER SEEN", 960, 930, { cap: 40, color: YEL, align: "center", progress: ramp(t, CUE.seen, 1.1), opacity: 1 - ramp(t, CUE.notTech - 0.4, 0.3) });
  // S2
  const s2o = 1 - ramp(t, CUE.forbids - 0.25, 0.25);
  if (t > CUE.notTech && s2o > 0) {
    say("BETTER TECHNOLOGY?", 1450, 190, { cap: 46, color: CREAM, align: "center", progress: ramp(t, CUE.notTech, 0.9), opacity: s2o });
    say("LOOK HARDER?", 1450, 300, { cap: 46, color: CREAM, align: "center", progress: ramp(t, CUE.notLook, 0.7), opacity: s2o });
    after.push(() => { const m = g.main; m.save(); m.setTransform(sc, 0, 0, sc, 0, 0); inked(m, [[1090, 214], [1810, 214]], RED, 9, { progress: ramp(t, 8.35, 0.35), alpha: s2o }); inked(m, [[1215, 324], [1685, 324]], RED, 9, { progress: ramp(t, 10.45, 0.35), alpha: s2o }); m.restore(); });
  }
  if (t > CUE.forbids && t < CUE.quarks + 0.3) {
    const o = 1 - ramp(t, CUE.quarks - 0.2, 0.3);
    say("THE UNIVERSE", 1450, 200, { cap: 66, color: CREAM, align: "center", progress: ramp(t, CUE.forbids + 0.1, 0.6), opacity: o });
    say("FORBIDS IT", 1450, 320, { cap: 92, color: YEL, align: "center", progress: ramp(t, CUE.forbids + 0.6, 0.7), opacity: o, w: 9 });
  }
  // S3
  if (t > CUE.quarks && t < CUE.imprisoned) {
    const o = 1 - ramp(t, CUE.imprisoned - 0.3, 0.3);
    say("QUARKS", 1470, 160, { cap: 120, colors: [RED_B[2], GRN_B[2], BLU_B[2]], align: "center", progress: ramp(t, CUE.quarks, 0.6), opacity: o, w: 11 });
    say("THE BUILDING BLOCKS OF", 1470, 350, { cap: 32, color: CREAM, align: "center", progress: ramp(t, CUE.blocks, 0.8), opacity: o });
    say("PROTONS AND NEUTRONS", 1470, 410, { cap: 32, color: CREAM, align: "center", progress: ramp(t, 15.5, 0.8), opacity: o });
  }
  const lab = span(t, 16.3, 18.1, 0.3);
  if (lab > 0) {
    say("PROTON", 470, 770, { cap: 40, color: PRO_T, align: "center", opacity: lab, progress: ramp(t, 16.3, 0.4) });
    say("UP UP DOWN", 470, 830, { cap: 22, color: CREAM, align: "center", opacity: lab, progress: ramp(t, 16.6, 0.4) });
    say("NEUTRON", 930, 770, { cap: 40, color: NEU_T, align: "center", opacity: lab, progress: ramp(t, 16.5, 0.4) });
    say("UP DOWN DOWN", 930, 830, { cap: 22, color: CREAM, align: "center", opacity: lab, progress: ramp(t, 16.8, 0.4) });
  }
  if (t > CUE.imprisoned && t < CUE.pull + 0.2) {
    const o = 1 - ramp(t, CUE.pull - 0.25, 0.3);
    say("PERMANENTLY", 1450, 220, { cap: 64, color: CREAM, align: "center", progress: ramp(t, CUE.imprisoned, 0.6), opacity: o });
    say("IMPRISONED", 1450, 330, { cap: 88, color: PRO_T, align: "center", progress: ramp(t, CUE.imprisoned + 0.5, 0.6), opacity: o, w: 9 });
  }
  // S4
  const s4: [number, number, string, string][] = [[CUE.pull, CUE.energy, "TRY TO PULL ONE OUT", CREAM], [CUE.energy, CUE.snap, "ANY AMOUNT OF ENERGY", PRO_T], [CUE.snap, CUE.escape, "NEW MATTER FROM EMPTY SPACE", YEL], [CUE.escape, CUE.andYet, "NO QUARK ESCAPES ALONE", CREAM]];
  s4.forEach(([a0, a1, s, col]) => { if (t > a0 && t < a1) say(s, 1250, 110, { cap: 48, color: col, align: "center", progress: ramp(t, a0, 0.7), opacity: 1 - ramp(t, a1 - 0.25, 0.25) }); });
  // S5
  if (t > CUE.suspect && t < CUE.gravity) {
    const o = 1 - ramp(t, CUE.gravity - 0.3, 0.3);
    say("NOT JUST", 1450, 230, { cap: 60, color: CREAM, align: "center", progress: ramp(t, CUE.suspect, 0.5), opacity: o });
    say("A SUSPICION", 1450, 330, { cap: 66, color: YEL, align: "center", progress: ramp(t, CUE.suspect + 0.5, 0.6), opacity: o });
  }
  // S7
  if (t > CUE.how && t < CUE.answer + 0.3) {
    const o = 1 - ramp(t, CUE.answer, 0.3);
    say("HOW DID WE", 1450, 150, { cap: 58, color: CREAM, align: "center", progress: ramp(t, CUE.how, 0.6), opacity: o });
    say("FIND THEM?", 1450, 240, { cap: 58, color: YEL, align: "center", progress: ramp(t, CUE.how + 0.5, 0.6), opacity: o });
  }
  if (t > CUE.answer + 0.2) {
    say("WHAT DOES IT MEAN TO", 960, 700, { cap: 46, color: CREAM, align: "center", progress: ramp(t, CUE.answer + 0.4, 1.0) });
    say("KNOW SOMETHING EXISTS?", 960, 790, { cap: 64, color: YEL, align: "center", progress: ramp(t, CUE.answer + 1.5, 1.2), w: 7 });
  }

  g.group("plain", () => words.forEach((f) => f()));
  after.forEach((f) => f());
};

export const quarks: Film = {
  meta: { title: "quarks", W, H, fps: FPS, bpm: 120, durationFrames: DURATION },
  assets: { images: {} },
  shots: [{ id: "chunk2", start: 0, end: DURATION, draw }],
};
```

---

## APPENDIX C — Host page for a chunk

```ts
import { quarks } from "../canvas-core/quarks";
import { mountFilm } from "./page";
mountFilm(quarks);
```
