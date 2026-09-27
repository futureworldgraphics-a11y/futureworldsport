import { Gfx, rng, type Ctx, type Env } from "./core";
import { Film } from "./film";
import { clamp, lerp } from "./gallery";
import { W, H, FPS, CREAM, YEL, FLAT, ease, easeOut, back, ramp, span, cached, text } from "./spaceStyle";
import { PW, PH, INK, type Pal, rect, px, line, dashed, spans, ellipse, disc, ring, clipCircle, sphere, glow, haze, makeStars, drawStars, ptext, photon, person, type Face, type Mouth } from "./pixelKit";

// LIGHT SPEED (Opus direction) · one continuous 246.4 s shot in cinematic pixel art.
// Timing: forced alignment of the script onto the audio (speech segments from silencedetect, words
// fitted by syllable count with punctuation-aware breaks), so every beat sits on its spoken word.
// Look: a 384x216 pixel world blown up 5x with no smoothing, 2.39:1 letterbox, subtitles in the
// bottom bar, full-res bloom on the light sources. Cast: a photon with a face (colour = energy, its
// trailing wave = its wavelength), an ancient redshifted photon with a sticker-covered suitcase, a
// traffic cop with a radar gun who cannot believe his readings, and finally gets normal ones.
//
//   0.0-4.3    kitchen at night; a photon pops out of the candle, blinks, leaves through the window
//   3.5-20.1   pull back past Earth, warp to a quasar (it makes a deadpan photon too), pan to a giant
//              star: collapse, gamma-ray burst; a panel: its energy bar runs off-screen in seconds
//              while the little Sun's lifetime bar crawls; a dizzy violet photon tumbles out
//  19.3-40.1   the lineup: calm, violent (sparking), faint (a detector blips once), energetic (splits
//              a nucleus, oops); lights, GO -- they leave instantly (light never accelerates); tracking
//              shot, perfectly level; countdown posts, photo finish, EXACTLY stamp
//  39.3-63.4   candle photon vs a 13-billion-year-old one (camera tilts to reveal it was alongside all
//              along); a hand tries to push, a rocket tries to boost, turtle / rocket signs, locked
//              speedometer; everything hushes; stars gather into a question mark
//  63.4-88.2   the film pauses; only the photon notices: explorer hat, like, subscribe, a plant grows,
//              photon shrinks (small for you), plant blooms (huge for me), headphones, arrow to links
//  87.0-98.4   level-select map of four light sources, each with its own rulebook; zoom into the candle
//  97.8-142.2  candle chemistry at 1,500; a cold hydrogen atom in a scarf (tiny level gap in a lens,
//              a sleepy radio photon); the Sun (fusion in a lens, thermometer has to extend itself);
//              the burst (satellite reading off the chart, one photon holes a steel slab, engineer peeks)
// 141.4-161.5  four identical cards (the theme) flip into four different worlds; reactants, temperatures,
//              energy bars (gamma's runs off the table: whip-pan), mechanisms
// 160.8-183.0  and yet: four photons, four wavelengths, one speed; the statistician's bell curve
//              collapses to a spike; a lens zooms to finer and finer resolution: still level
// 182.4-206.0  space radar: 299,792,458 appears digit by digit as it is spoken; burst photon, sleepy
//              radio photon, same reading; the cop checks his phone -- and it emits light too
// 205.3-217.6  vacuum: the full spectrum in formation; a helmeted one strains, a sleepy one dozes:
//              same speed; pull back to a sky full of formations
// 216.5-246.4  a sunny park, trucking shot: baseball (the cop finally gets normal numbers), rifles on a
//              chronograph, a car pushed from rest, a soccer ball drifts, then rockets; the photon
//              streaks across the sky, still at its one speed, as the chunk ends

const DURATION = 7392; // 246.40 s (audio 246.413 s)
const PIX = W / PW; // 5
const T_END = 246.413;

// ================================================================ palettes (colour = photon energy, kept all the way through)
const RADIO: Pal = ["#4a0f1c", "#8a1a2a", "#c93a44", "#ff8a80"];
const REDP: Pal = ["#6a1a18", "#c8342a", "#ff6a5a", "#ffc0b0"];
const ORANGE: Pal = ["#8a2a0e", "#e0561c", "#ff9a3c", "#ffe0a0"];
const YELLOW: Pal = ["#8a5a0a", "#e0a020", "#ffd650", "#fff4c0"];
const GREENP: Pal = ["#16664a", "#23a874", "#55dca0", "#d2ffe8"];
const CYANP: Pal = ["#0f5f7a", "#1fa3c9", "#5fd6f5", "#e0faff"];
const BLUEP: Pal = ["#1a2a8a", "#2a50e0", "#6a8cff", "#d0dcff"];
const BLUEW: Pal = ["#1f3f8f", "#3a78e0", "#8ab8ff", "#e8f2ff"];
const VIOLET: Pal = ["#3a1a7a", "#7a44e0", "#c4a0ff", "#ffffff"];
const GAMMA: Pal = ["#4a3a8a", "#9a8ae0", "#e0d8ff", "#ffffff"];
const SUNP: Pal = ["#9a3a0a", "#e0701a", "#ffb030", "#fff0a0"];
const RSG: Pal = ["#5a1408", "#b8321a", "#ff6a2a", "#ffb070"];
const HOTP: Pal = ["#8a5aa0", "#e0b0ff", "#ffffff", "#ffffff"];
const EARTHP: Pal = ["#10286a", "#1f58b8", "#4f97f5", "#bfe0ff"];
const SPECTRUM: Pal[] = [RADIO, REDP, ORANGE, YELLOW, GREENP, CYANP, BLUEP, VIOLET, GAMMA];
const WAVELEN = [30, 16, 13, 11, 9.5, 8.5, 7.5, 6, 3.5];

// ================================================================ small helpers
type LightFn = (x: number, y: number, r: number, rgb: string, a: number) => void;
type Opt = { noHero?: boolean };
type Draw = (c: Ctx, t: number, L: LightFn, env: Env, o?: Opt) => void;
const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: string, b: string, k: number) => { const A = hex(a), B = hex(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * clamp(k)).toString(16).padStart(2, "0")).join(""); };
const easeIn = (x: number) => x * x * x;
const pop = (t: number, t0: number, d = 0.35) => Math.max(0, back(clamp(ramp(t, t0, d))));
const bands = (c: Ctx, y0: number, y1: number, top: string, bot: string, n = 8) => { for (let i = 0; i < n; i++) { const ya = y0 + ((y1 - y0) * i) / n, yb = y0 + ((y1 - y0) * (i + 1)) / n; rect(c, -12, ya - (i === 0 ? 12 : 0), PW + 24, yb - ya + 1 + (i === 0 ? 12 : 0) + (i === n - 1 ? 12 : 0), mix(top, bot, i / (n - 1))); } };
const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const between = (t: number, a: number, b: number) => t >= a && t < b;
// a photon launched at t0 while the camera accelerates to ride along with it: [screen x, camera travel]
const chase = (t: number, t0: number, x0: number, xs: number, v: number, lag: number, d: number): [number, number] => {
  if (t < t0) return [x0, 0];
  const dt = t - t0, sm = ease(ramp(t, t0 + lag, d)), cam = Math.max(0, v * dt - (xs - x0)) * sm;
  return [x0 + v * dt - cam, cam];
};
const flick = (t: number, s = 0) => Math.sin(t * 9.1 + s) * 0.5 + Math.sin(t * 14.3 + 1 + s) * 0.3 + Math.sin(t * 23.7 + 2 + s) * 0.2;

// ================================================================ shared scenery
const S_FAR = makeStars(101, 170), S_MID = makeStars(102, 64), S_NEAR = makeStars(103, 22);
const NEB: [number, number, number, string][] = [[60, 60, 70, "90,60,170"], [300, 150, 90, "40,90,160"], [220, 40, 60, "150,50,120"], [420, 110, 80, "60,50,150"]];
const spaceBG = (c: Ctx, t: number, ox = 0, oy = 0, o: { top?: string; bot?: string; streak?: number; dim?: number; neb?: number } = {}) => {
  bands(c, 0, PH, o.top ?? "#0f0b28", o.bot ?? "#05040f");
  const nb = o.neb ?? 1;
  if (nb > 0) for (const [x, y, r, rgb] of NEB) { const X = ((((x - ox * 0.08) % 480) + 480) % 480) - 48; haze(c, X, y - oy * 0.08, r * 1.3, rgb, 0.16 * nb); }
  const d = o.dim ?? 1, s = o.streak ?? 0;
  drawStars(c, S_FAR, t, ox * 0.12, oy * 0.12, 0.65 * d, s * 0.12);
  drawStars(c, S_MID, t, ox * 0.4, oy * 0.4, 0.85 * d, s * 0.4);
  drawStars(c, S_NEAR, t, ox, oy, d, s);
};
const flame = (c: Ctx, x: number, y: number, h: number, fl: number) => {
  ellipse(c, x, y - h * 0.45, 4.2 + fl * 0.4, h * 0.55, "#ff7a1a");
  ellipse(c, x, y - h * 0.36, 2.8, h * 0.42, "#ffc24a");
  ellipse(c, x, y - h * 0.26, 1.4, h * 0.22, "#fff4d0");
  rect(c, x - 1, y - 1, 3, 1, "#5a7aff");
};
const miniCandle = (c: Ctx, x: number, base: number, t: number) => {
  rect(c, x - 2, base - 9, 5, 9, "#f0e6cc"); rect(c, x + 1, base - 9, 2, 9, "#c8b894"); px(c, x, base - 10, "#2a1a10");
  const fl = flick(t, x);
  ellipse(c, x, base - 13, 2 + fl * 0.3, 3.5, "#ff7a1a"); ellipse(c, x, base - 12, 1, 2, "#fff0c0");
};
const pgalaxy = (c: Ctx, x: number, y: number, s: number, rot: number, col: string) => {
  if (s < 1.2) { px(c, x, y, col); return; }
  glow(c, x, y, s * 1.8, "150,140,230", 0.35);
  for (const arm of [0, Math.PI]) for (let k = 0; k < 12; k++) { const a = rot + arm + k * 0.42, rr = s * (0.25 + k * 0.07); px(c, x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.55, k < 6 ? col : "#8f89c9"); }
  ellipse(c, x, y, Math.max(1, s * 0.35), Math.max(1, s * 0.2), "#fff4e0");
};
const thermo = (c: Ctx, x: number, top: number, bottom: number, frac: number, liquid: string, bulb: string) => {
  rect(c, x - 4, top - 1, 9, bottom - top + 2, INK); rect(c, x - 3, top, 7, bottom - top, "#cfdae6"); rect(c, x - 2, top + 1, 1, bottom - top - 2, "#f4fbff");
  for (let y = bottom - 8; y > top + 3; y -= 8) rect(c, x + 2, y, 2, 1, "#7a8aa0");
  const h = (bottom - top - 3) * clamp(frac); rect(c, x - 1, bottom - h, 3, h + 2, liquid);
  disc(c, x + 0.5, bottom + 6, 8, INK); disc(c, x + 0.5, bottom + 6, 7, bulb); px(c, x - 2, bottom + 3, "#ffffff");
};
const lens = (c: Ctx, cx: number, cy: number, r: number, inside: () => void, handle = true) => {
  if (handle) { line(c, cx + r * 0.7, cy + r * 0.7, cx + r * 0.7 + 10, cy + r * 0.7 + 10, INK, 5); line(c, cx + r * 0.7, cy + r * 0.7, cx + r * 0.7 + 9, cy + r * 0.7 + 9, "#8a6a3a", 3); }
  c.save(); clipCircle(c, cx, cy, r); inside(); c.restore();
  ring(c, cx, cy, r + 3, INK, 4); ring(c, cx, cy, r + 2, "#b8b0d8", 2); ring(c, cx, cy, r + 2, "#e8e4ff", 1);
};
const lcd = (c: Ctx, x: number, y: number, w: number, h: number) => { rect(c, x - 2, y - 2, w + 4, h + 4, INK); rect(c, x - 1, y - 1, w + 2, h + 2, "#3a3a48"); rect(c, x, y, w, h, "#0b2214"); rect(c, x, y, w, 1, "#153a24"); };
const book = (c: Ctx, x: number, y: number, col: string, open: number) => {
  if (open < 0.5) { const w = Math.max(1, Math.round(10 * (1 - open * 2))); rect(c, x - 5, y - 4, w, 8, col); rect(c, x - 5 + w - 1, y - 4, 1, 8, "#f4ecdc"); rect(c, x - 5, y - 4, w, 1, mix(col, "#ffffff", 0.3)); return; }
  rect(c, x - 9, y - 4, 18, 8, col); rect(c, x - 8, y - 3, 7, 6, "#f4ecdc"); rect(c, x + 1, y - 3, 7, 6, "#f4ecdc");
  for (let k = 0; k < 3; k++) { rect(c, x - 7, y - 2 + k * 2, 5, 1, "#9a92b0"); rect(c, x + 2, y - 2 + k * 2, 5, 1, "#9a92b0"); }
};

// ================================================================ SCENE: kitchen (0 - 4.3)
const KSTAR = makeStars(301, 18, 92, 44);
const sKitchen: Draw = (c, t, L) => {
  bands(c, 0, PH, "#26142e", "#110a18", 6);
  const fl = flick(t), CX = 170, CB = 150, WX = 254, WY = 40, WW = 92, WH = 96;
  haze(c, CX, 112, 150 + fl * 4, "255,140,60", 0.3); glow(c, CX, 118, 34 + fl * 2, "255,170,80", 0.35);
  // window onto the night
  rect(c, WX - 6, WY - 6, WW + 12, WH + 12, "#3a2214"); rect(c, WX - 6, WY - 6, WW + 12, 2, "#5a3822");
  for (let i = 0; i < 6; i++) rect(c, WX, WY + i * 16, WW, 16, mix("#1c2658", "#0a1030", i / 5));
  for (const s of KSTAR) { c.globalAlpha = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph); px(c, WX + s.x, WY + s.y, s.col); } c.globalAlpha = 1;
  glow(c, WX + 68, WY + 24, 20, "240,230,200", 0.4); disc(c, WX + 68, WY + 24, 8, "#f4ecc8"); px(c, WX + 65, WY + 21, "#d8ceaa"); px(c, WX + 70, WY + 27, "#d8ceaa"); px(c, WX + 71, WY + 22, "#d8ceaa");
  rect(c, WX + WW / 2 - 1, WY, 2, WH, "#3a2214"); rect(c, WX, WY + WH / 2 - 1, WW, 2, "#3a2214");
  for (let k = 0; k < 5; k++) px(c, WX + 8 + k, WY + 44 - k, "rgba(255,255,255,0.18)");
  rect(c, WX - 12, WY + WH + 6, WW + 24, 5, "#5a3822"); rect(c, WX - 12, WY + WH + 11, WW + 24, 2, "#2a160c");
  rect(c, WX + 4, WY + WH - 2, 10, 8, "#a8502a"); rect(c, WX + 4, WY + WH - 2, 10, 2, "#c8683a");
  disc(c, WX + 9, WY + WH - 6, 4, "#2f7a3a"); disc(c, WX + 6, WY + WH - 9, 3, "#3f9a4a"); disc(c, WX + 12, WY + WH - 10, 3, "#3f9a4a");
  // shelf with jars, lit from the right by the candle
  rect(c, 18, 72, 92, 3, "#4a2c1a"); rect(c, 18, 75, 92, 1, "#1a0e08");
  [[26, 12, "#6a8a9a"], [44, 16, "#9a6a4a"], [66, 10, "#7a9a6a"], [84, 14, "#8a7aa0"]].forEach(([x, h, col]) => { rect(c, x as number, 72 - (h as number), 10, h as number, col as string); rect(c, (x as number) + 7, 72 - (h as number), 3, h as number, mix(col as string, "#ffb070", 0.35)); rect(c, (x as number) - 1, 72 - (h as number) - 2, 12, 2, "#3a2a2a"); });
  // counter, kettle, mug
  rect(c, 0, 150, PW, 40, "#2e1a10"); rect(c, 0, 150, PW, 2, "#6a4026"); rect(c, 0, 152, PW, 1, "#1a0e08");
  ellipse(c, 70, 140, 15, 10, "#1c1218"); rect(c, 56, 144, 28, 6, "#1c1218"); line(c, 84, 140, 94, 132, "#1c1218", 3); ring(c, 70, 128, 7, "#1c1218", 2);
  for (let k = 0; k < 6; k++) px(c, 82 - (k > 3 ? 1 : 0), 134 + k * 2, "#8a4a2a");
  rect(c, 214, 138, 12, 12, "#c8d0e0"); rect(c, 222, 138, 4, 12, "#98a0b8"); ring(c, 229, 144, 4, "#c8d0e0", 2);
  // the candle
  ellipse(c, CX, CB, 15, 3, "#6a4a28"); ellipse(c, CX, CB - 1, 13, 2, "#9a7a4a");
  rect(c, CX - 4, CB - 24, 8, 23, "#f0e6cc"); rect(c, CX + 2, CB - 24, 2, 23, "#c8b894"); rect(c, CX - 4, CB - 24, 8, 1, "#fff8e8"); rect(c, CX - 4, CB - 20, 1, 5, "#fff8e8");
  px(c, CX, CB - 25, "#2a1a10"); px(c, CX, CB - 26, "#2a1a10");
  flame(c, CX, CB - 26, 12 + fl * 1.4 + 2 * span(t, 0.55, 1.2, 0.2), fl);
  L(CX, CB - 34, 60, "255,160,70", 0.55 + fl * 0.05);
  // the photon: born in the flame, blinks, looks at us, leaves through the window
  if (t >= 1.72) {
    const p = pop(t, 1.72, 0.35), zip = ramp(t, 2.55, 0.45), e = easeIn(zip);
    const x0 = CX, y0 = CB - 40 - 12 * ease(ramp(t, 1.72, 0.6)), x2 = WX + 118, y2 = WY + 6, cx1 = CX + 50, cy1 = CB - 100;
    const x = (1 - e) * (1 - e) * x0 + 2 * (1 - e) * e * cx1 + e * e * x2, y = (1 - e) * (1 - e) * y0 + 2 * (1 - e) * e * cy1 + e * e * y2;
    const face: Face = t < 2.0 ? "blink" : zip > 0 ? "determined" : "open", look: [number, number] = t < 2.3 ? [0, 0] : [1, -1];
    glow(c, x, y, 16, "255,190,110", 0.5 * p);
    photon(c, x, y, 6 * p, ORANGE, { face, look, mouth: between(t, 2.08, 2.45) ? "smile" : "none", streak: Math.round(14 * zip) });
    L(x, y, 18, "255,190,110", 0.6 * p);
    if (between(t, 2.85, 3.3)) glow(c, WX + 72, WY + 18, 24, "255,220,170", 0.9 * (1 - ramp(t, 2.85, 0.45)));
  }
};
const zKitchen = (t: number): [number, number, number, number, number] => {
  const k = ease(ramp(t, 2.8, 1.3)), fx = lerp(180, 322, k), fy = lerp(112, 64, k);
  const z = 1 + 0.06 * ease(ramp(t, 0, 3)) + 9 * easeIn(ramp(t, 2.9, 1.4));
  return [z, fx, fy, lerp(fx, 192, k), lerp(fy, 108, k)];
};

// ================================================================ SCENE: cosmos (3.5 - 20.1)
type WS = { x: number; y: number; z: number; b: number; col: string };
const WARP: WS[] = (() => { const r = rng(401), a: WS[] = []; for (let i = 0; i < 220; i++) a.push({ x: (r() - 0.5) * 2.6, y: (r() - 0.5) * 1.5, z: r() * 3, b: r(), col: r() > 0.85 ? "#ffd9b0" : r() > 0.7 ? "#bfd4ff" : "#f0eeff" }); return a; })();
const WGAL = (() => { const r = rng(402), a: (WS & { rot: number })[] = []; for (let i = 0; i < 10; i++) a.push({ x: (r() - 0.5) * 2.2, y: (r() - 0.5) * 1.2, z: r() * 3, b: r(), col: r() > 0.5 ? "#c8b8ff" : "#ffd0a0", rot: r() * 6.28 }); return a; })();
const camZ = (t: number) => -1.4 * ease(ramp(t, 3.5, 1.4)) + 4.2 * ease(ramp(t, 4.9, 2.1)) + 0.03 * t;
const proj = (s: WS, Z: number, px0: number) => { const d = ((((s.z - Z) % 3) + 3) % 3) + 0.12; return { X: 192 + (s.x * 110) / d - px0, Y: 108 + (s.y * 110) / d, d }; };
const DEBRIS = (() => { const r = rng(403), a: { a: number; v: number; col: string }[] = []; for (let i = 0; i < 46; i++) a.push({ a: r() * 6.283, v: 40 + r() * 150, col: r() > 0.5 ? "#e0c8ff" : r() > 0.5 ? "#ffb070" : "#ffffff" }); return a; })();
const quasar = (c: Ctx, x: number, y: number, k: number, t: number, L: LightFn) => {
  if (k <= 0.02) return;
  haze(c, x, y, 100 * k, "110,80,210", 0.4);
  for (const dir of [-1, 1]) {
    const J = 88 * k, y0 = dir < 0 ? y - J : y;
    rect(c, x - 2, y0, 5, J, "rgba(106,140,255,0.45)"); rect(c, x - 1, y0, 2, J, "#dfe8ff");
    for (let i = 0; i < 3; i++) { const q = (t * 0.45 + i / 3 + (dir > 0 ? 0.17 : 0)) % 1; c.globalAlpha = 1 - q; disc(c, x, y + dir * (4 * k + q * (J - 6 * k)), 1.2 * k + 0.6, "#ffffff"); } c.globalAlpha = 1;
  }
  ellipse(c, x, y, 46 * k, 10 * k, "#2a1458"); ellipse(c, x, y, 34 * k, 7.5 * k, "#6a38c8"); ellipse(c, x, y, 20 * k, 4.6 * k, "#b890ff"); ellipse(c, x, y, 9 * k, 2.4 * k, "#f4ecff");
  for (let i = 0; i < 18; i++) { const a = t * 1.5 + i * 0.35; if (Math.sin(a) < 0) px(c, x + Math.cos(a) * 38 * k, y + Math.sin(a) * 8 * k, "#ffd0ff"); }
  disc(c, x, y, 3.2 * k + 0.5, "#ffffff"); glow(c, x, y, 26 * k, "230,220,255", 0.9);
  for (let i = 0; i < 18; i++) { const a = t * 1.5 + i * 0.35; if (Math.sin(a) >= 0) px(c, x + Math.cos(a) * 38 * k, y + Math.sin(a) * 8 * k, "#fff0ff"); }
  L(x, y, 60 * k, "190,170,255", 0.7);
};
const grbJets = (c: Ctx, x: number, y: number, t: number, len: number, w: number, L: LightFn, a = 1) => {
  if (len <= 0) return;
  const f = 0.5 + 0.5 * Math.sin(t * 37), ww = w + f;
  for (const dir of [-1, 1]) {
    const y0 = dir < 0 ? y - len : y;
    rect(c, x - (ww + 4) / 2, y0, ww + 4, len, `rgba(150,110,255,${0.35 * a})`); rect(c, x - ww / 2, y0, ww, len, "#e8dcff"); rect(c, x, y0, 1, len, "#ffffff");
    for (let i = 0; i < 4; i++) { const q = (t * 0.9 + i * 0.25 + (dir > 0 ? 0.11 : 0)) % 1; c.globalAlpha = (1 - q) * a; disc(c, x + 0.5, y + dir * q * len, ww * 0.7, "#ffffff"); } c.globalAlpha = 1;
  }
  disc(c, x + 0.5, y, 3.5, "#ffffff"); glow(c, x, y, 34, "220,200,255", 0.9 * a); L(x, y, 70, "210,190,255", 0.8 * a);
};
const earth = (c: Ctx, x: number, y: number, R: number) => {
  if (R < 0.8) { px(c, x, y, "#6fb0ff"); return; }
  c.globalAlpha = 0.55; ring(c, x, y, R + 2.5, "#5f9fef", 1); c.globalAlpha = 1;
  sphere(c, x, y, R, EARTHP);
  if (R > 6) { disc(c, x - R * 0.3, y - R * 0.08, R * 0.34, "#2f8a3e"); disc(c, x + R * 0.26, y + R * 0.22, R * 0.28, "#3a9a4a"); disc(c, x + R * 0.02, y - R * 0.46, R * 0.18, "#2f8a3e"); disc(c, x - R * 0.34, y - R * 0.14, R * 0.14, "#4aaa5a"); }
  const tx = Math.round(x + R * 0.18); c.fillStyle = "rgba(4,3,18,0.55)"; spans(x, y, R, R, (yy, a, b) => { const s = Math.max(a, tx); if (b > s) c.fillRect(s, yy, b - s, 1); });
  if (R > 5) px(c, x + R * 0.5, y + R * 0.12, "#ffd27a");
};
const hourglass = (c: Ctx, x: number, y: number, t: number) => {
  for (let j = 0; j < 4; j++) { rect(c, x - 3 + j, y - 4 + j, 7 - 2 * j, 1, "#e8dcc0"); rect(c, x - 3 + j, y + 3 - j, 7 - 2 * j, 1, "#e8dcc0"); }
  rect(c, x - 4, y - 5, 9, 1, "#8a6a3a"); rect(c, x - 4, y + 4, 9, 1, "#8a6a3a");
  const s = (t * 2) % 1; px(c, x, y - 1 + Math.round(s * 3), "#ffd166"); rect(c, x - 1, y + 3, 3, 1, "#ffd166");
};
const stopwatch = (c: Ctx, x: number, y: number, t: number) => { disc(c, x, y, 5, INK); disc(c, x, y, 4, "#e8e8f0"); rect(c, x - 1, y - 7, 2, 2, "#8a8a9a"); const a = t * 12; line(c, x, y, x + Math.cos(a) * 3, y + Math.sin(a) * 3, "#e0344d"); };
const sCosmos: Draw = (c, t, L) => {
  const sh = t > 12.45 ? Math.exp(-(t - 12.45) * 3.2) * 4 : 0, shx = Math.round(sh * Math.sin(t * 63)), shy = Math.round(sh * Math.cos(t * 47));
  c.save(); c.translate(shx, shy);
  bands(c, 0, PH, "#0c0a24", "#04030c");
  const pan = 330 * ease(ramp(t, 9.27, 1.1));
  drawStars(c, S_FAR, t, pan * 0.2, 0, 0.6);
  for (const [x, y, r, rgb] of NEB) haze(c, x - pan * 0.3, y, r * 1.3, rgb, 0.13);
  // the depth field: pull back from Earth, then warp to the edge of the observable universe
  const Z = camZ(t), Zp = camZ(t - 1 / FPS), speed = Math.abs(Z - Zp);
  for (const s of WARP) {
    const p = proj(s, Z, pan * 0.35), q = proj(s, Zp, pan * 0.35); if (p.X < -4 || p.X > PW + 4 || p.Y < -4 || p.Y > PH + 4) continue;
    const a = clamp(1.3 - p.d / 3) * (0.4 + 0.6 * s.b); c.globalAlpha = a;
    if (speed > 0.012 && Math.abs(q.d - p.d) < 1) line(c, q.X, q.Y, p.X, p.Y, s.col); else { px(c, p.X, p.Y, s.col); if (p.d < 0.5) px(c, p.X + 1, p.Y, s.col); }
  }
  c.globalAlpha = 1;
  const warpA = span(t, 4.7, 7.2, 0.4);
  if (warpA > 0) for (const g of WGAL) { const p = proj(g, Z, 0); if (p.X < -20 || p.X > PW + 20) continue; c.globalAlpha = warpA * clamp(1.4 - p.d / 3); pgalaxy(c, p.X, p.Y, 7 / p.d, g.rot + t * 0.2, g.col); } c.globalAlpha = 1;
  // Earth recedes; a small orange photon runs ahead of us
  const eR = lerp(64, 1, ease(ramp(t, 3.5, 1.5)));
  if (t < 5.4) { c.globalAlpha = 1 - ramp(t, 5.0, 0.4); earth(c, 192, 108, eR); c.globalAlpha = 1; }
  if (between(t, 3.5, 4.3)) { const x = 196 + 330 * (t - 3.5), y = 98 - 40 * (t - 3.5); photon(c, x, y, 4, ORANGE, { face: "determined", streak: 10 }); L(x, y, 12, "255,190,110", 0.6); }
  // the quasar
  const qk = lerp(0.12, 1, ease(ramp(t, 6.1, 1.4))), qx = 192 + pan, qy = 104;
  if (t > 6.0 && qx < PW + 80) { c.globalAlpha = ramp(t, 6.0, 0.5); quasar(c, qx, qy, qk, t, L); c.globalAlpha = 1; }
  if (between(t, 7.7, 9.35)) {
    const p = pop(t, 7.7, 0.4), m = ease(ramp(t, 7.7, 0.55)), zip = easeIn(ramp(t, 8.95, 0.4));
    const x = lerp(qx, 150, m) - 260 * zip, y = lerp(qy, 130, m);
    photon(c, x, y, 5 * p, BLUEW, { face: between(t, 8.42, 8.54) ? "blink" : zip > 0 ? "determined" : "open", look: zip > 0 ? [-1, 0] : [0, 0], mouth: zip > 0 ? "none" : "flat", streak: Math.round(12 * zip) });
    L(x, y, 12, "190,210,255", 0.6 * p);
  }
  // a giant star: wobble, collapse, burst
  const sx = -80 + 224 * ease(ramp(t, 9.27, 1.1)), sy = 108;
  if (t > 9.2) {
    const cc = easeIn(ramp(t, 11.65, 0.75)), wob = ramp(t, 11.0, 0.3) * (1 - ramp(t, 11.65, 0.05)) * 2.2 * Math.sin(t * 38);
    if (t < 12.45) {
      const R = Math.max(2.5, (44 + Math.sin(t * 2) + wob) * (1 - cc) + 2.5 * cc), pal = cc > 0.6 ? HOTP : RSG;
      glow(c, sx, sy, R * 1.9, "255,120,60", 0.5 * (1 - cc)); sphere(c, sx, sy, R, pal);
      if (R > 12) for (let i = 0; i < 9; i++) { const a = i * 0.7 + t * 0.15, rr = R * (0.25 + 0.55 * ((i * 0.37) % 1)); disc(c, sx + Math.cos(a) * rr, sy + Math.sin(a) * rr, R * 0.09, i % 2 ? RSG[1] : RSG[3]); }
      L(sx, sy, R * 2.2, "255,140,80", 0.5 + cc);
      if (t > 12.2) glow(c, sx, sy, 20, "255,255,255", ramp(t, 12.2, 0.25));
    } else {
      const dt = t - 12.45;
      if (dt < 1.4) { c.globalAlpha = 1 - dt / 1.4; ring(c, sx, sy, dt * 170, "#e8d8ff", 2); ring(c, sx, sy, dt * 110, "#ffb070", 1); c.globalAlpha = 1; }
      if (dt < 2.4) for (const d of DEBRIS) { const k = d.v * dt * (1 - dt * 0.18); c.globalAlpha = clamp(1 - dt / 2.4); px(c, sx + Math.cos(d.a) * k, sy + Math.sin(d.a) * k * 0.8, d.col); }
      c.globalAlpha = 1;
      grbJets(c, sx, sy, t, Math.min(200, dt * 620), 4, L);
    }
  }
  // "more energy in seconds than the sun will release in its entire lifetime"
  const pa = ramp(t, 13.9, 0.25) * (1 - ramp(t, 18.1, 0.4));
  if (pa > 0) {
    c.globalAlpha = pa;
    rect(c, 212, 40, 162, 84, "rgba(10,8,26,0.88)"); rect(c, 212, 40, 162, 1, "#4a4370"); rect(c, 212, 123, 162, 1, "#4a4370"); rect(c, 212, 40, 1, 84, "#4a4370");
    disc(c, 226, 64, 3, "#ffffff"); for (let k = 0; k < 4; k++) { const a = k * 1.571 + 0.78; line(c, 226, 64, 226 + Math.cos(a) * 6, 64 + Math.sin(a) * 6, "#c4a0ff"); }
    stopwatch(c, 242, 64, t);
    const b1 = 190 * easeOut(ramp(t, 14.19, 0.3)); rect(c, 254, 61, b1, 6, "#b487ff"); rect(c, 254, 61, b1, 1, "#e8dcff");
    if (t > 15.13) {
      const sp = pop(t, 15.13, 0.35), look: [number, number] = t > 17.2 ? [1, -1] : [1, 0];
      photon(c, 226, 100, 5 * sp, YELLOW, { face: t > 17.5 && !between(t, 17.85, 17.95) ? "wide" : "open", look, mouth: t > 17.5 ? "o" : "smile" });
      hourglass(c, 242, 100, t);
      const b2 = 36 * clamp((t - 15.64) / 1.5); rect(c, 254, 97, b2, 6, "#ffd650"); rect(c, 254, 97, b2, 1, "#fff4c0");
    }
    c.globalAlpha = 1;
  }
  // ...produces light: a dizzy violet photon tumbles out of the jet
  if (t > 18.17) {
    const m = easeOut(ramp(t, 18.17, 0.7)), x = lerp(sx, sx + 64, m), y = lerp(sy - 44, 120, m) + (t > 19.25 && t < 19.45 ? Math.round(Math.sin(t * 60)) : 0);
    photon(c, x, y, 6 * pop(t, 18.17, 0.3), VIOLET, { face: t < 18.85 ? "dizzy" : "open", look: [0, 0], mouth: t < 18.85 ? "o" : "flat" });
    L(x, y, 16, "200,170,255", 0.6);
  }
  // the flash itself, fading (never a hard cut)
  if (between(t, 12.45, 13.3)) rect(c, -8, -8, PW + 16, PH + 16, `rgba(255,248,255,${(0.85 * Math.exp(-(t - 12.45) * 4.5)).toFixed(3)})`);
  c.restore();
};

// ================================================================ SCENE: lineup and race (19.3 - 40.1)
const LANES = [52, 76, 100, 124, 148];
const RACERS: { pal: Pal; enter: number; wl: number }[] = [
  { pal: ORANGE, enter: 19.75, wl: 13 }, { pal: VIOLET, enter: 20.0, wl: 6 }, { pal: CYANP, enter: 20.25, wl: 8.5 }, { pal: GAMMA, enter: 20.5, wl: 3.5 }, { pal: BLUEW, enter: 20.75, wl: 7.5 },
];
const NUC = [[0, 0, 1], [3, -2, 0], [-3, -2, 1], [2, 3, 0], [-2, 3, 1]];
const sLineup: Draw = (c, t, L) => {
  const [rx, cam] = chase(t, 32.3, 110, 230, 900, 0.3, 0.85), bgx = cam * 0.6, spd = t > 32.3 ? 18 : 0;
  spaceBG(c, t, bgx, 0, { streak: spd });
  for (const y of [40, 64, 88, 112, 136, 160]) rect(c, 0, y, PW, 1, "#221e44");
  // the start gate and its lights
  const gx = 122 - cam;
  if (gx > -8) {
    for (let y = 38; y < 162; y += 2) { rect(c, gx, y, 2, 2, (y / 2) % 2 ? "#e8e6ff" : INK); rect(c, gx + 2, y, 2, 2, (y / 2) % 2 ? INK : "#e8e6ff"); }
    rect(c, gx - 16, 30, 36, 8, INK);
    [[31.37, -10], [31.91, 1], [32.22, 12]].forEach(([tt, dx], i) => { const on = t >= tt, go = t >= 32.22; disc(c, gx + dx + 2, 34, 2.5, go ? "#5fe0a3" : on ? "#ff5f6d" : "#3a2a3a"); if (on && i >= 0) L(gx + dx + 2, 34, 6, go ? "95,224,163" : "255,95,109", 0.5); });
  }
  // featured-lane spotlights
  const spot = (lane: number, a: number) => { if (a <= 0) return; const ly = LANES[lane]; for (let y = 30; y < ly + 9; y++) { const h = lerp(3, 14, (y - 30) / (ly + 9 - 30)); c.globalAlpha = 0.1 * a; rect(c, rx - h, y, 2 * h, 1, "#fff0c8"); } c.globalAlpha = 1; };
  if (t < 32.3) { spot(0, span(t, 21.5, 22.6, 0.2)); spot(1, span(t, 22.6, 23.9, 0.2)); spot(2, span(t, 24.3, 27.0, 0.2)); spot(3, span(t, 27.9, 31.2, 0.2)); }
  // the faint one's detector
  const dA = span(t, 24.4, 33.0, 0.3), dx = 144 - cam;
  if (dA > 0 && dx > -30) {
    c.globalAlpha = dA; rect(c, dx - 1, 93, 16, 13, INK); rect(c, dx, 94, 14, 11, "#3a3a52"); rect(c, dx + 2, 96, 10, 6, "#0b2214");
    const blip = span(t, 26.25, 26.65, 0.05); rect(c, dx + 2, 99, 10, 1, "#3a8a5a"); if (blip > 0) rect(c, dx + 6, 96, 1, 4, "#6fff9a");
    px(c, dx + 12, 103, blip > 0 ? "#6fff9a" : "#1a3a2a"); line(c, dx - 1, 96, dx - 4, 100, "#8a8aa0"); line(c, dx - 4, 100, dx - 1, 104, "#8a8aa0"); c.globalAlpha = 1;
    if (blip > 0) L(dx + 6, 98, 8, "111,255,154", 0.8);
  }
  // the energetic one's nucleus
  const nx = 140 - cam, burst = ramp(t, 29.41, 1.2);
  if (t > 27.5 && nx > -20 && burst < 1) NUC.forEach(([ox, oy, p], i) => { const a = Math.atan2(oy || 0.5, ox || (i ? 1 : -1)), d = 55 * easeOut(burst); c.globalAlpha = (1 - burst) * ramp(t, 27.5, 0.3); sphere(c, nx + ox + Math.cos(a) * d, 124 + oy + Math.sin(a) * d, 2, p ? ["#8f1f2e", "#e0344d", "#ff6b7d", "#ffc2ca"] : ["#1f3f8f", "#3a6fe0", "#6fa0ff", "#cddcff"], { spec: false }); });
  c.globalAlpha = 1;
  // the racers
  const go = t >= 32.3;
  RACERS.forEach((R, i) => {
    if (t < R.enter) return;
    const e = pop(t, R.enter, 0.45);
    let x = rx, y = LANES[i] - 60 * (1 - ease(ramp(t, R.enter, 0.45)));
    let face: Face = go ? "determined" : "open", mouth: Mouth = "none", look: [number, number] = [1, 0], alpha = 1;
    if (!go) {
      if (i === 0) { y += Math.round(Math.sin(t * 1.6)); if (between(t, 21.72, 22.7)) { face = "calm"; mouth = "smile"; } }
      if (i === 1) { const j = between(t, 22.83, 24.0) ? 1 : 0.4; x += Math.round(Math.sin(t * 97) * j); y += Math.round(Math.cos(t * 71) * j); face = between(t, 22.83, 24.0) ? "angry" : "open";
        if (between(t, 22.83, 24.0)) { const k = Math.floor(t * 10); for (let s = 0; s < 4; s++) { const a = (k * 1.7 + s * 1.57) % 6.283; line(c, x + Math.cos(a) * 8, y + Math.sin(a) * 8, x + Math.cos(a) * 11, y + Math.sin(a) * 11, "#e0c8ff"); } } }
      if (i === 2) { alpha = 0.32; if (between(t, 24.72, 27.0)) look = [1, 0]; }
      if (i === 3) { y -= Math.round(Math.abs(Math.sin(t * 9)) * 2); x += 22 * span(t, 29.15, 29.5, 0.2); if (between(t, 28.25, 29.4)) { face = "wide"; mouth = "smile"; } if (between(t, 29.5, 30.25)) { face = "wide"; mouth = "o"; } if (between(t, 30.25, 30.35)) face = "blink"; if (between(t, 30.35, 31.4)) mouth = "smile"; }
    } else if (i === 2) alpha = 0.45;
    photon(c, x, y, 6 * e, R.pal, { face, mouth, look, alpha, wave: go ? 40 : 0, waveLen: R.wl, phase: t * 12, streak: go ? 6 : 0 });
    L(x, y, 14, "255,240,220", 0.35 * alpha * e);
  });
  // alignment laser, countdown posts, photo finish
  const lz = span(t, 33.81, 35.6, 0.2);
  if (lz > 0) { c.globalAlpha = lz * (0.6 + 0.4 * Math.sin(t * 20)); rect(c, 237, 42, 1, 116, "#7ff7ff"); c.globalAlpha = 1; L(237, 100, 30, "127,247,255", 0.4 * lz); }
  [[36.2, "3"], [36.7, "2"], [37.2, "1"]].forEach(([tt, n]) => { const x = 237 + 900 * ((tt as number) - t); if (x < -10 || x > PW + 10) return; rect(c, x, 158, 1, 14, "#8f89c9"); rect(c, x - 5, 158, 11, 9, "#e8e6ff"); ptext(c, n as string, x - 1, 160, 1, INK); });
  const fx = 237 + 900 * (37.3 - t);
  if (fx > -6 && fx < PW + 6) for (let y = 38; y < 162; y += 2) { rect(c, fx, y, 2, 2, (y / 2) % 2 ? "#ffffff" : INK); rect(c, fx + 2, y, 2, 2, (y / 2) % 2 ? INK : "#ffffff"); }
  if (t > 37.4) {
    const d = easeOut(ramp(t, 37.4, 0.35)), oy = Math.round(-130 * (1 - d)) + (between(t, 38.3, 38.55) ? Math.round(Math.sin(t * 90)) : 0);
    rect(c, 33, 43 + oy, 136, 100, INK); rect(c, 34, 44 + oy, 134, 98, "#f4ecdc"); rect(c, 40, 50 + oy, 122, 78, "#0c0a1c");
    for (let y = 50; y < 128; y += 2) { rect(c, 130, y + oy, 2, 2, (y / 2) % 2 ? "#ffffff" : "#3a3a52"); }
    RACERS.forEach((R, i) => photon(c, 124, 60 + i * 15 + oy, 5, R.pal, { face: "determined", alpha: i === 2 ? 0.5 : 1 }));
    if (t > 38.3) { const s = lerp(30, 15, easeOut(ramp(t, 38.3, 0.18))); ring(c, 150, 124 + oy, s + 1, "#e0344d", 3); line(c, 142, 124 + oy, 148, 130 + oy, "#e0344d", 3); line(c, 148, 130 + oy, 159, 116 + oy, "#e0344d", 3); }
  }
  if (between(t, 37.3, 37.7)) rect(c, 0, 0, PW, PH, `rgba(255,255,255,${(0.7 * (1 - ramp(t, 37.3, 0.35))).toFixed(3)})`);
};

const glove = (c: Ctx, x: number, y: number) => {
  const parts: [number, number, number, number][] = [[0, -8, 10, 8], [0, -13, 2, 6], [3, -14, 2, 7], [6, -13, 2, 6], [9, -7, 4, 3]];
  parts.forEach(([a, b, w, h]) => rect(c, x + a - 1, y + b - 1, w + 2, h + 2, INK)); parts.forEach(([a, b, w, h]) => rect(c, x + a, y + b, w, h, "#ffffff"));
  rect(c, x - 5, y - 8, 5, 8, INK); rect(c, x - 4, y - 7, 4, 6, "#3a6fe0"); rect(c, x + 1, y - 2, 8, 1, "#d8d8e8"); rect(c, x + 2, y - 8, 1, 3, "#d8d8e8"); rect(c, x + 5, y - 8, 1, 3, "#d8d8e8");
};
const rocket = (c: Ctx, x: number, y: number, on: boolean, t: number) => {
  c.save(); c.translate(Math.round(x), Math.round(y)); c.scale(2, 2);
  rect(c, -1, -4, 15, 8, INK); rect(c, 0, -3, 12, 6, "#e8e8f0"); rect(c, 0, 1, 12, 2, "#b8b8c8"); rect(c, 12, -2, 3, 4, "#e0344d"); px(c, 15, -1, "#e0344d"); px(c, 15, 0, "#e0344d");
  rect(c, -2, -6, 4, 3, "#e0344d"); rect(c, -2, 3, 4, 3, "#e0344d"); disc(c, 7, 0, 1.5, "#5fd6f5");
  if (on) { const f = 3 + Math.round(2 * Math.sin(t * 50)); rect(c, -1 - f, -2, f, 4, "#ffb347"); rect(c, -f, -1, f - 1, 2, "#fff2c2"); }
  c.restore();
};
// ================================================================ SCENE: the candle photon and the ancient one (39.3 - 63.44)
const QMARK = (() => { const pts: [number, number][] = []; for (let i = 0; i < 11; i++) { const a = Math.PI * 1.1 - (i / 10) * Math.PI * 1.45; pts.push([Math.cos(a) * 1.5, -1.3 + Math.sin(a) * -1.5]); } pts.push([0.05, 0.55], [0, 1.25], [0, 2.7]); return pts; })();
const QSTART = (() => { const r = rng(501); return QMARK.map(() => [r() * PW, 30 + r() * 150] as [number, number]); })();
const GALPASS: [number, number, number, string][] = [[520, 70, 9, "#c8b8ff"], [760, 120, 6, "#ffd0a0"], [980, 50, 11, "#bfd4ff"]];
const sRace: Draw = (c, t, L, _env, o = {}) => {
  const k = 0.3, [cx, cam] = chase(t, 41.95, 126, 170, 900, 0.15, 0.8);
  // the hush: after "why" the world slows (the photons never do; the camera just drifts with them)
  const slow = ease(ramp(t, 61.0, 0.7)), bgx = cam * k - slow * (cam * k - (chase(61.0, 41.95, 126, 170, 900, 0.15, 0.8)[1] * k + 40 * (t - 61.0)));
  const tilt = 56 * ease(ramp(t, 46.2, 1.0));
  spaceBG(c, t, bgx, tilt * 0.5, { streak: t > 42 ? 8 * (1 - slow) : 0 });
  if (between(t, 48.2, 51.2)) GALPASS.forEach(([x0, y, s, col]) => { const x = x0 - (bgx - 60) * 1.4; if (x > -30 && x < PW + 30) pgalaxy(c, x, y - tilt * 0.4, s, t * 0.3 + x0, col); });
  // the little candle it just left
  const kx = 110 - cam * 1.2;
  if (kx > -20) { miniCandle(c, kx, 120 - tilt + Math.round(8 * (1 + flick(t) * (between(t, 41.2, 41.9) ? 0.8 : 0.2)) - 8), t); glow(c, kx, 106 - tilt, 16, "255,160,70", 0.45); }
  const cy = 108 - tilt, ay = 200 - tilt;
  // a hand that wants to push; a rocket that wants to help; two road signs
  const hx = 404 - 260 * (t - 52.7);
  if (between(t, 52.7, 54.5)) { const push = 8 * span(t, 53.5, 53.85, 0.12); glove(c, hx + push, cy + 7); if (push > 0) for (let s = 0; s < 3; s++) rect(c, hx - 10 - s * 5, cy - 6 + s * 5, 4, 1, "#c8c8e0"); }
  const rkx = 400 - 260 * (t - 54.1) + (t > 54.9 ? 60 * (t - 54.9) * (t - 54.9) : 0);
  if (between(t, 54.1, 56.2) && ay < 190) {
    const on = between(t, 54.9, 55.45);
    rocket(c, rkx, ay, on, t); if (on) L(rkx - 10, ay, 14, "255,180,80", 0.6);
    if (t > 55.45) { const pf = ramp(t, 55.45, 0.8); c.globalAlpha = 1 - pf; disc(c, rkx - 10 - 14 * pf, ay, 4 + 6 * pf, "#8a8aa0"); c.globalAlpha = 1; }
  }
  const sign = (x: number, kind: number) => { if (x < -14 || x > PW + 14) return; const y = cy + 44; rect(c, x, y + 9, 2, 60, "#8a8aa0"); disc(c, x + 1, y, 10, INK); disc(c, x + 1, y, 9, "#e0344d"); disc(c, x + 1, y, 7, "#ffffff");
    if (kind === 0) { ellipse(c, x + 1, y + 1, 4, 3, "#3a9a4a"); px(c, x - 1, y, "#2a6a3a"); px(c, x + 2, y + 1, "#2a6a3a"); rect(c, x + 5, y, 2, 2, "#5aba6a"); px(c, x - 2, y + 3, "#5aba6a"); px(c, x + 3, y + 3, "#5aba6a"); }
    else { rect(c, x - 3, y - 1, 8, 3, "#8a8aa0"); rect(c, x + 5, y, 2, 1, "#e0344d"); rect(c, x - 5, y, 2, 1, "#ffb347"); } };
  sign(404 - 260 * (t - 56.2), 0); sign(404 - 260 * (t - 57.0), 1);
  // the photons
  const glance = between(t, 51.9, 52.65), q = between(t, 61.46, 62.3) ? "cam" : between(t, 62.3, 62.9) ? "up" : t >= 62.9 ? "each" : "";
  const shrug = between(t, 63.15, 63.3) ? -1 : 0;
  if (!o.noHero) {
    const look: [number, number] = glance ? [0, 1] : q === "cam" ? [0, 0] : q === "up" ? [1, -1] : q === "each" ? [0, 1] : [1, 0];
    photon(c, cx, cy + (t > 42 ? 0 : Math.round(Math.sin(t * 2))) + shrug, 7, ORANGE, { face: t < 40.2 ? "blink" : "open", look, mouth: between(t, 43.5, 46) ? "smile" : "none", wave: t > 42 ? 46 : 0, waveLen: 13, phase: t * 10, streak: t > 42 ? 8 : 0 });
    L(cx, cy, 20, "255,190,110", 0.6);
  }
  if (tilt > 1) {
    const ax = cx, sw = Math.round(Math.sin(t * 3) * 1), nod = between(t, 52.3, 52.45) ? 1 : 0;
    line(c, ax, ay + 8, ax + sw, ay + 11, "#8a8aa0");
    rect(c, ax - 7 + sw, ay + 11, 14, 9, INK); rect(c, ax - 6 + sw, ay + 12, 12, 7, "#8a5a2a"); rect(c, ax - 6 + sw, ay + 12, 12, 1, "#a87a3a");
    [["#ff5fa2", -5, 13], ["#5fd6f5", -1, 15], ["#ffd166", 2, 13], ["#5fe0a3", 3, 16], ["#c4a0ff", -4, 16]].forEach(([col, dx, dy]) => rect(c, ax + sw + (dx as number), ay + (dy as number), 2, 2, col as string));
    const look: [number, number] = glance ? [0, -1] : q === "cam" ? [0, 0] : q === "up" ? [1, -1] : q === "each" ? [0, -1] : [1, 0];
    photon(c, ax, ay + nod + shrug, 7, RADIO, { face: glance || q ? "open" : "sleepy", look, mouth: "smile", wave: 46, waveLen: 26, phase: t * 6, streak: 6 });
    L(ax, ay, 18, "220,80,90", 0.5);
    // 13,000,000,000 years on the odometer
    const oa = span(t, 50.8, 55.2, 0.2);
    if (oa > 0) { c.globalAlpha = oa; lcd(c, ax - 34, ay - 23, 68, 9); const target = "13,000,000,000"; let s = ""; for (let i = 0; i < target.length; i++) { const ch = target[i]; s += ch === "," || t > 51.0 + i * 0.06 ? ch : String(Math.floor((t * 23 + i * 7) % 10)); } ptext(c, s, ax, ay - 21, 1, "#6fff9a", "center"); c.globalAlpha = 1; }
  }
  // the locked speedometer
  const sa = span(t, 58.7, 61.6, 0.25);
  if (sa > 0) {
    const dx = 96, dy = cy + 50; c.globalAlpha = sa;
    c.fillStyle = "rgba(10,8,26,0.85)"; spans(dx, dy, 19, 19, (yy, a, b) => { if (yy <= dy) c.fillRect(a, yy, b - a, 1); });
    for (let i = 0; i <= 40; i++) { const a = Math.PI + (i / 40) * Math.PI; px(c, dx + Math.cos(a) * 17, dy + Math.sin(a) * 17, "#8f89c9"); }
    for (let i = 0; i <= 6; i++) { const a = Math.PI + (i / 6) * Math.PI; line(c, dx + Math.cos(a) * 13, dy + Math.sin(a) * 13, dx + Math.cos(a) * 16, dy + Math.sin(a) * 16, i === 5 ? "#ffd166" : "#5a548a"); }
    const na = Math.PI + 0.8 * Math.PI; line(c, dx, dy, dx + Math.cos(na) * 14, dy + Math.sin(na) * 14, "#ff6a5a"); disc(c, dx, dy, 2, "#e8e6ff");
    if (t > 59.74) { const lp = pop(t, 59.74, 0.3); c.globalAlpha = sa * clamp(lp); ring(c, dx, dy - 1, 3, "#ffd166", 1); rect(c, dx - 3, dy, 7, 5, "#ffd166"); px(c, dx, dy + 2, INK); }
    c.globalAlpha = 1;
  }
  // WHY: the room dims and the stars themselves gather into a question
  if (slow > 0) rect(c, 0, 0, PW, PH, `rgba(5,4,15,${(0.4 * slow).toFixed(3)})`);
  if (t > 61.46) {
    const g = ease(ramp(t, 61.46, 0.8));
    QMARK.forEach(([qx, qy], i) => { const [sx0, sy0] = QSTART[i], x = lerp(sx0, 292 + qx * 13, g), y = lerp(sy0, 70 + qy * 13, g), tw = 0.7 + 0.3 * Math.sin(t * 5 + i); glow(c, x, y, 7 * g, "255,240,210", 0.5 * tw); px(c, x, y, "#fff4e0"); if (g > 0.95) { px(c, x - 1, y, "#fff4e0"); px(c, x + 1, y, "#fff4e0"); px(c, x, y - 1, "#fff4e0"); px(c, x, y + 1, "#fff4e0"); } });
    L(292, 80, 50, "255,240,210", 0.35 * g);
  }
};

// ================================================================ SCENE: the aside (63.44 - 88.2)
const frozenRace = (env: Env) => cached(env, "lsoFrozen", () => {
  const Lr = env.canvas(Math.round(PW * env.scale), Math.round(PH * env.scale)), c = Lr.ctx; c.setTransform(env.scale, 0, 0, env.scale, 0, 0); c.imageSmoothingEnabled = false;
  sRace(c, 63.44, () => undefined, env, { noHero: true }); return Lr;
});
const sAside: Draw = (c, t, L, env) => {
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(frozenRace(env).canvas as CanvasImageSource, 0, 0); c.restore();
  rect(c, 0, 0, PW, PH, `rgba(10,7,22,${(0.25 + 0.55 * ease(ramp(t, 64.3, 1.4))).toFixed(3)})`);
  // the pause icon, later play
  const ic = pop(t, 63.44, 0.3), pulse = 0.75 + 0.25 * Math.sin(t * 4);
  c.globalAlpha = pulse * clamp(ic);
  if (t < 86.13) { rect(c, 343, 37, 5, 13, INK); rect(c, 351, 37, 5, 13, INK); rect(c, 344, 38, 3, 11, "#ffffff"); rect(c, 352, 38, 3, 11, "#ffffff"); }
  else for (let j = 0; j < 11; j++) rect(c, 345, 38 + j, 1 + Math.min(j, 10 - j), 1, "#ffffff");
  c.globalAlpha = 1;
  // the photon: the only thing still moving
  const m = ease(ramp(t, 64.5, 1.3));
  const small = ease(ramp(t, 74.2, 0.3)) * (1 - ramp(t, 76.66, 0.01)), big = t > 76.66 ? pop(t, 76.66, 0.35) : 0;
  const hopL = span(t, 70.1, 70.6, 0.2), hopR = ease(ramp(t, 70.6, 0.35)) * (1 - ease(ramp(t, 71.25, 0.35)));
  let x = lerp(170, 192, m) - 42 * hopL + 70 * hopR - 20 * ease(ramp(t, 71.25, 0.35)) * (1 - ramp(t, 78.6, 0.6)), y = lerp(52, 100, m) - 12 * Math.sin(Math.PI * hopL) - 12 * hopR + 2 * hopR;
  const beat = t > 79.5 && t < 86.2 ? Math.round(Math.sin(t * Math.PI * 4)) : 0;
  y += beat;
  const r = t > 76.66 ? lerp(4, 9, clamp(big)) : lerp(lerp(7, 9, m), 4, small);
  let face: Face = "open", look: [number, number] = [0, 0], mouth: Mouth = "none";
  if (t < 64.5) { face = between(t, 63.55, 63.66) ? "blink" : t > 64.25 ? "wide" : "open"; look = t < 63.8 ? [1, 0] : t < 64.0 ? [-1, 0] : t < 64.25 ? [1, 0] : [0, 0]; }
  if (between(t, 67.3, 69.4) || between(t, 74.2, 78.6)) { face = "happy"; mouth = "smile"; }
  if (between(t, 79.4, 86.2)) { face = "calm"; mouth = "smile"; }
  if (t > 86.2) { face = "determined"; mouth = "smile"; }
  // like
  const lk = span(t, 69.9, 79.1, 0.3);
  if (lk > 0) {
    const lx = 132, ly = 100, liked = t > 70.35; c.globalAlpha = lk * clamp(pop(t, 69.9));
    if (liked) disc(c, lx + 1, ly - 1, 13, "#3a6fe0");
    rect(c, lx - 6, ly - 3, 12, 10, INK); rect(c, lx - 5, ly - 2, 10, 8, "#f0c09a"); rect(c, lx - 5, ly + 5, 10, 1, "#c89a7a"); rect(c, lx - 4, ly - 10, 5, 8, INK); rect(c, lx - 3, ly - 9, 3, 7, "#f0c09a"); rect(c, lx - 9, ly - 3, 4, 11, INK); rect(c, lx - 8, ly - 2, 2, 9, liked ? "#ffffff" : "#8f89c9");
    if (between(t, 70.35, 70.8)) { const sp = ramp(t, 70.35, 0.45); for (let s = 0; s < 6; s++) { const a = s * 1.047; px(c, lx + Math.cos(a) * (14 + 6 * sp), ly + Math.sin(a) * (14 + 6 * sp), "#ffd166"); } }
    c.globalAlpha = 1;
  }
  // subscribe, bell, the plant that grows from it
  const sb = span(t, 70.5, 79.1, 0.3);
  if (sb > 0) {
    const bx = 262, by = 100, down = t > 71.0 ? 2 : 0; c.globalAlpha = sb * clamp(pop(t, 70.5));
    rect(c, bx - 19, by - 7 + down, 38, 15, INK); rect(c, bx - 18, by - 6 + down, 36, 13, t > 71.0 ? "#5a5a6a" : "#e0302a"); rect(c, bx - 18, by - 6 + down, 36, 1, t > 71.0 ? "#7a7a8a" : "#ff6a5a");
    for (let j = 0; j < 7; j++) rect(c, bx - 12, by - 3 + down + j, 1 + Math.min(j, 6 - j), 1, "#ffffff");
    for (let k = 0; k < 3; k++) rect(c, bx - 3, by - 3 + down + k * 3, 16 - k * 3, 1, "#ffffff");
    if (t > 71.0) { const sw = Math.round(3 * Math.sin((t - 71) * 18) * Math.exp(-(t - 71) * 2.5)); rect(c, 282 + sw, 72, 7, 7, "#ffd166"); rect(c, 281 + sw, 78, 9, 2, "#ffd166"); px(c, 285 + sw, 80, "#8a6a12"); rect(c, 283 + sw, 71, 5, 1, "#ffd166"); }
    const g1 = ease(ramp(t, 71.7, 1.1)), g2 = t > 76.66 ? pop(t, 76.66, 0.6) : 0, h = 16 * g1 + 34 * clamp(g2);
    if (g1 > 0) {
      rect(c, bx - 1, by - 7 - h, 2, h, "#3a9a4a");
      const leaf = (yy: number, side: number, a: number) => { if (a <= 0) return; ellipse(c, bx + side * 4, yy, 3.5 * a, 1.5 * a, "#5fd07a"); px(c, bx + side * 2, yy, "#3a9a4a"); };
      leaf(by - 12, -1, clamp(ramp(t, 72.2, 0.3))); leaf(by - 16, 1, clamp(ramp(t, 72.4, 0.3))); leaf(by - 7 - h + 2, -1, clamp(ramp(t, 72.86, 0.3)));
      if (g2 > 0) { leaf(by - 26, 1, clamp(g2)); leaf(by - 34, -1, clamp(g2)); leaf(by - 42, 1, clamp(g2)); const fy = by - 7 - h; disc(c, bx, fy, 5 * clamp(g2), "#ff5fa2"); disc(c, bx, fy, 2 * clamp(g2), "#ffd166"); for (let s = 0; s < 5; s++) { const a = s * 1.256 + 0.3; disc(c, bx + Math.cos(a) * 5 * clamp(g2), fy + Math.sin(a) * 5 * clamp(g2), 2 * clamp(g2), "#ff8ac0"); } L(bx, fy, 16, "255,140,190", 0.4 * clamp(g2)); }
    }
    c.globalAlpha = 1;
  }
  // equaliser (live on Spotify), the arrow to the links, listen-anywhere icons
  const eq = span(t, 79.43, 86.3, 0.3);
  if (eq > 0) { c.globalAlpha = eq; for (let i = 0; i < 5; i++) { const hh = 3 + Math.round(9 * (0.5 + 0.5 * Math.sin(t * 7 + i * 1.3))); rect(c, 222 + i * 5, 110 - hh, 3, hh, "#1ed760"); } c.globalAlpha = 1; }
  const ar = span(t, 81.5, 84.9, 0.25);
  if (ar > 0) { const ay = 128 + Math.round(3 * Math.abs(Math.sin(t * 6))); c.globalAlpha = ar; rect(c, 191, ay, 3, 16, CREAM); for (let j = 0; j < 5; j++) rect(c, 188 + j, ay + 12 + j, 9 - 2 * j, 1, CREAM); c.globalAlpha = 1; }
  const ic2 = span(t, 84.9, 86.4, 0.3);
  if (ic2 > 0) {
    c.globalAlpha = ic2;
    [0, 1, 2].forEach((k) => { const a = t * 0.9 + k * 2.094, ix = 192 + Math.cos(a) * 30, iy = 100 + Math.sin(a) * 12;
      if (k === 0) { rect(c, ix - 3, iy - 1, 7, 5, "#e8e6ff"); for (let j = 0; j < 4; j++) rect(c, ix - j, iy - 2 - (3 - j), 1 + 2 * j, 1, "#e0344d"); px(c, ix, iy + 2, "#3a3a52"); }
      if (k === 1) { rect(c, ix - 4, iy - 1, 9, 3, "#5fd6f5"); rect(c, ix - 2, iy - 3, 5, 2, "#5fd6f5"); px(c, ix - 3, iy + 2, INK); px(c, ix + 3, iy + 2, INK); }
      if (k === 2) for (let j = 0; j < 5; j++) rect(c, ix - j, iy - 3 + j, 1 + 2 * j, 1, j < 2 ? "#ffffff" : "#8f89c9"); });
    c.globalAlpha = 1;
  }
  photon(c, x, y, r, ORANGE, { face, look, mouth, blush: between(t, 76.7, 78.6) });
  L(x, y, 22, "255,190,110", 0.55);
  // hats and headphones sit on the photon
  const hat = t > 66.9 && t < 79.1;
  if (hat) { const drop = t < 67.2 ? -30 * (1 - ease(ramp(t, 66.9, 0.3))) : 0, fly = ramp(t, 78.7, 0.4), hy = y - r - 1 + drop - 30 * fly, hx = x - 14 * fly; c.globalAlpha = 1 - fly; ellipse(c, hx, hy, r * 0.95, r * 0.55, "#d8c088"); rect(c, hx - r * 1.4, hy + 1, r * 2.8, 2, "#b89a60"); rect(c, hx - r * 0.9, hy - 1, r * 1.8, 1, "#6a4a28"); c.globalAlpha = 1; }
  if (t > 79.1 && t < 86.7) { const d = t < 79.4 ? -24 * (1 - ease(ramp(t, 79.1, 0.3))) : 0, lift = ramp(t, 86.2, 0.45), hy = y + d - 30 * lift; c.globalAlpha = 1 - lift;
    for (let i = 0; i <= 16; i++) { const a = Math.PI + (i / 16) * Math.PI; rect(c, x + Math.cos(a) * (r + 2), hy + Math.sin(a) * (r + 2), 2, 2, "#2a2a3a"); }
    rect(c, x - r - 3, hy - 2, 3, 6, "#2a2a3a"); rect(c, x + r, hy - 2, 3, 6, "#2a2a3a"); px(c, x - r - 2, hy, "#1ed760"); px(c, x + r + 1, hy, "#1ed760"); c.globalAlpha = 1; }
};

// ================================================================ SCENE: the map (86.98 - 98.4)
const NODES: [number, number][] = [[62, 128], [146, 84], [236, 128], [322, 84]];
const BOOKC = ["#e0561c", "#1fa3c9", "#e0a020", "#7a44e0"];
const nodeIcon = (c: Ctx, i: number, x: number, y: number, t: number) => {
  if (i === 0) { rect(c, x - 2, y - 2, 5, 10, "#f0e6cc"); rect(c, x + 1, y - 2, 2, 10, "#c8b894"); flame(c, x, y - 3, 7, flick(t)); }
  if (i === 1) { disc(c, x - 5, y + 2, 5, "#6a8aa8"); disc(c, x + 3, y, 6, "#8fb0d0"); disc(c, x + 8, y + 3, 4, "#6a8aa8"); disc(c, x + 1, y + 1, 1.5, "#e0344d"); for (const [dx, dy] of [[-6, -3], [7, -5], [-1, 6]]) px(c, x + dx, y + dy, "#ffffff"); }
  if (i === 2) { for (let k = 0; k < 8; k++) { const a = k * 0.785 + t * 0.3; line(c, x + Math.cos(a) * 9, y + Math.sin(a) * 9, x + Math.cos(a) * 12, y + Math.sin(a) * 12, "#ffd166"); } sphere(c, x, y, 7, SUNP); }
  if (i === 3) { rect(c, x, y - 12, 1, 24, "#e8dcff"); ring(c, x, y, 6, "#9a6aff", 1); disc(c, x + 0.5, y, 3, "#ffffff"); }
};
const sMap: Draw = (c, t, L) => {
  spaceBG(c, t, 0, 0, { top: "#0c0a22", bot: "#05040f", neb: 0.7 });
  for (let x = 0; x < PW; x += 16) rect(c, x, 0, 1, PH, "rgba(60,50,120,0.18)");
  for (let y = 0; y < PH; y += 16) rect(c, 0, y, PW, 1, "rgba(60,50,120,0.18)");
  // the marching dotted path
  for (let s = 0; s < NODES.length - 1; s++) { const [x0, y0] = NODES[s], [x1, y1] = NODES[s + 1], n = Math.hypot(x1 - x0, y1 - y0); for (let d = 0; d < n; d += 1) { if (((d - t * 12) % 5 + 5) % 5 > 1.5) continue; const k = d / n, bow = Math.sin(k * Math.PI) * 10 * (s % 2 ? 1 : -1); px(c, lerp(x0, x1, k), lerp(y0, y1, k) + bow, "#8f89c9"); } }
  NODES.forEach(([x, y], i) => {
    const p = pop(t, [88.8, 89.39, 89.98, 90.69][i], 0.4); if (p <= 0) return;
    const oy = Math.round(-8 * (1 - clamp(p)));
    ellipse(c, x, y + 11 + oy, 17 * clamp(p), 5, "#5a548a"); ellipse(c, x, y + 10 + oy, 15 * clamp(p), 4, "#2a2552");
    const pulse = span(t, 92.9 + i * 0.3, 93.6 + i * 0.3, 0.2);
    glow(c, x, y + oy, 22, ["255,160,70", "120,180,255", "255,200,80", "200,160,255"][i], 0.35 + 0.6 * pulse);
    c.globalAlpha = clamp(p); nodeIcon(c, i, x, y + oy, t); c.globalAlpha = 1;
    L(x, y, 20, ["255,160,70", "120,180,255", "255,200,80", "200,160,255"][i], 0.3 + 0.5 * pulse);
    const bk = pop(t, 95.0 + i * 0.25, 0.35); if (bk > 0) book(c, x, y - 26 - Math.round(4 * (1 - clamp(bk))), BOOKC[i], ease(ramp(t, 96.07 + i * 0.08, 0.3)));
  });
  // the guide
  const tilt = span(t, 89.3, 91.0, 0.3);
  photon(c, 34, 102 + Math.round(Math.sin(t * 2)), 6 * pop(t, 87.3, 0.4), ORANGE, { face: "open", look: tilt > 0 ? [-1, -1] : t > 92.4 ? [1, 0] : [0, 0], mouth: t > 94.9 ? "smile" : "none" });
  L(34, 102, 14, "255,190,110", 0.5);
};
const zMap = (t: number): [number, number, number, number, number] => { const k = easeIn(ramp(t, 97.3, 1.1)), g = ease(ramp(t, 97.3, 1.1)); return [1 + 6 * k, 62, 124, lerp(62, 150, g), lerp(124, 118, g)]; };

// ================================================================ SCENE: candle chemistry (97.8 - 106.3)
const sCandle: Draw = (c, t, L) => {
  bands(c, 0, PH, "#1c0c12", "#0a0508", 6);
  const fl = flick(t), CX = 110;
  haze(c, CX, 96, 150 + fl * 5, "255,140,60", 0.35); glow(c, CX, 92, 40 + fl * 2, "255,170,80", 0.4);
  rect(c, CX - 11, 118, 22, 80, "#f0e6cc"); rect(c, CX + 6, 118, 5, 80, "#c8b894"); rect(c, CX - 11, 118, 22, 2, "#fff8e8"); rect(c, CX - 11, 120, 2, 12, "#fff8e8"); rect(c, CX - 12, 118, 1, 80, INK); rect(c, CX + 11, 118, 1, 80, INK);
  rect(c, CX - 1, 111, 2, 8, "#2a1a10");
  const h = 38 + fl * 3;
  ellipse(c, CX, 112 - h * 0.45, 11 + fl, h * 0.55, "#ff7a1a"); ellipse(c, CX, 112 - h * 0.36, 7, h * 0.42, "#ffc24a"); ellipse(c, CX, 112 - h * 0.26, 3.4, h * 0.22, "#fff4d0"); ellipse(c, CX, 112, 6, 2.5, "#4a6aff");
  L(CX, 90, 60, "255,160,70", 0.6);
  // the chemistry: wax (carbon + hydrogen) meets oxygen, becomes CO2 + H2O, and lets go of a photon
  const C_ = "#5a5a66", Hh = "#ffffff", O_ = "#e0344d";
  [100.25, 102.05, 103.75].forEach((tk, k) => {
    const u = ramp(t, tk, 0.62), done = ramp(t, tk + 0.65, 1.1); if (u <= 0 || done >= 1) return;
    const e = ease(u), wx = CX + 2, wy = lerp(118, 98 - k * 3, e), ox = lerp(190, CX + 12, e), oy = 80 + k * 9 + (98 - k * 3 - 80 - k * 9) * e;
    if (done <= 0) {
      for (let a = 0; a < 3; a++) { disc(c, wx - 3 + a * 3, wy + (a % 2 ? 1 : -1), 1.5, C_); px(c, wx - 3 + a * 3, wy + (a % 2 ? 3 : -3), Hh); }
      disc(c, ox - 1.5, oy, 1.5, O_); disc(c, ox + 1.5, oy, 1.5, O_);
    } else {
      const d = easeOut(done); glow(c, CX + 6, 98 - k * 3, 12 * (1 - d), "255,255,230", 1 - d); c.globalAlpha = 1 - done;
      const x1 = CX - 4 - 26 * d, y1 = 94 - 34 * d, x2 = CX + 14 + 24 * d, y2 = 94 - 38 * d;
      disc(c, x1, y1, 1.5, C_); disc(c, x1 - 3, y1, 1.5, O_); disc(c, x1 + 3, y1, 1.5, O_);
      disc(c, x2, y2, 1.5, O_); px(c, x2 - 2, y2 + 2, Hh); px(c, x2 + 2, y2 + 2, Hh);
      c.globalAlpha = 1;
      const phx = CX + 14 + 320 * (t - tk - 0.65); if (phx < PW + 6) { photon(c, phx, 96 - k * 3, 2.2, ORANGE, { streak: 8 }); L(phx, 96, 8, "255,190,110", 0.5); }
    }
  });
  // 1,500 degrees
  const tf = ease(ramp(t, 102.45, 1.6)), ta = ramp(t, 101.9, 0.4);
  if (ta > 0) { c.globalAlpha = ta; thermo(c, 318, 48, 150, 0.62 * tf, "#e0344d", "#e0344d"); ptext(c, fmt(Math.round((1500 * tf) / 10) * 10), 300, 52, 2, "#ffd166", "right", INK); c.globalAlpha = 1; }
  // the guide watches
  photon(c, 44, 64 + Math.round(Math.sin(t * 2)), 6, ORANGE, { face: between(t, 104.0, 104.12) ? "blink" : "open", look: t > 102.4 ? [1, -1] : [1, 1], mouth: between(t, 101.5, 103) ? "o" : "none" });
  L(44, 64, 14, "255,190,110", 0.45);
};

// ================================================================ SCENE: a cold hydrogen atom (105.5 - 119.0)
const FROST = makeStars(601, 40);
const sCloud: Draw = (c, t, L) => {
  bands(c, 0, PH, "#0b1634", "#040816", 7);
  [[70, 70, 70], [300, 150, 90], [220, 60, 60], [120, 170, 70]].forEach(([x, y, r], i) => haze(c, x + Math.sin(t * 0.3 + i) * 6, y, r * 1.3, i % 2 ? "60,110,190" : "40,140,170", 0.2));
  for (const s of FROST) { c.globalAlpha = Math.max(0, Math.sin(t * s.sp * 2 + s.ph)) * 0.8; px(c, s.x, s.y, "#e8f6ff"); } c.globalAlpha = 1;
  const cold = ramp(t, 107.96, 0.3), shv = cold > 0 && Math.floor(t * 30) % 4 < 2 ? 1 : 0, AX = 104 + shv, AY = 104;
  // electron orbit + proton in a scarf
  const dropped = ease(ramp(t, 111.14, 0.3));
  for (let i = 0; i < 48; i++) { if (i % 2) continue; const a = (i / 48) * 6.283; px(c, AX + Math.cos(a) * 22, AY + Math.sin(a) * 9, "rgba(95,214,245,0.55)"); }
  const ea = t * 3, er = lerp(22, 15, dropped), eb = lerp(9, 6, dropped);
  const ex = AX + Math.cos(ea) * er, ey = AY + Math.sin(ea) * eb, front = Math.sin(ea) > 0;
  if (!front) { glow(c, ex, ey, 6, "95,214,245", 0.6); disc(c, ex, ey, 1.5, "#bff4ff"); }
  sphere(c, AX, AY, 5, ["#8f1f2e", "#e0344d", "#ff6b7d", "#ffc2ca"]);
  for (let k = 0; k < 6; k++) rect(c, AX - 6 + k * 2, AY + 2, 2, 2, k % 2 ? "#ffffff" : "#e0302a");
  const sw = Math.round(Math.sin(t * 2.5)); for (let k = 0; k < 3; k++) rect(c, AX + 3 + (k > 1 ? sw : 0), AY + 4 + k * 2, 2, 2, k % 2 ? "#ffffff" : "#e0302a");
  if (front) { glow(c, ex, ey, 6, "95,214,245", 0.6); disc(c, ex, ey, 1.5, "#bff4ff"); }
  L(AX, AY, 20, "95,214,245", 0.35);
  // it is cold out here
  const ta = cold;
  if (ta > 0) { c.globalAlpha = ta; thermo(c, 352, 60, 150, 0.04, "#5fa8ff", "#5fa8ff"); for (let k = 0; k < 5; k++) px(c, 346 + (k * 3) % 13, 62 + k * 17, "#ffffff"); c.globalAlpha = 1; }
  // two quantum levels, so close you need a lens; the electron drops; a tiny sliver of radio
  const la = ramp(t, 109.9, 0.35);
  if (la > 0) {
    c.globalAlpha = la;
    dashed(c, AX + 26, AY - 2, 214, 100, "#5a7aa0", 2, 2);
    rect(c, 214, 99, 40, 1, "#bfe0ff"); rect(c, 214, 101, 40, 1, "#bfe0ff");
    lens(c, 280, 100, 27, () => {
      rect(c, 250, 70, 62, 62, "#0d2144");
      const pul = span(t, 112.77, 114.8, 0.3) * (0.5 + 0.5 * Math.sin(t * 8));
      rect(c, 252, 88, 58, 2, mix("#bfe0ff", "#ffffff", pul)); rect(c, 252, 112, 58, 2, mix("#bfe0ff", "#ffffff", pul));
      const eY = lerp(86, 110, dropped); glow(c, 280, eY + 1, 7, "95,214,245", 0.8); disc(c, 280, eY + 1, 2.5, "#bff4ff");
      if (dropped > 0 && dropped < 1) line(c, 280, 90, 280, eY - 3, "#5fd6f5");
    });
    c.globalAlpha = 1;
  }
  if (t > 115.61) {
    const k = ramp(t, 115.61, 0.9), px0 = AX + 26, wx = lerp(px0, 206, ease(k));
    for (let x = px0; x < wx; x++) px(c, x, 150 + Math.sin((x - t * 30) / 36 * 6.283) * 3, "#c93a44");
    if (t > 116.37) {
      const rp = pop(t, 116.37, 0.4), x = 206 + 14 * (t - 116.37);
      const yawn = between(t, 116.95, 117.55);
      photon(c, x, 150, 5 * rp, RADIO, { face: yawn ? "blink" : t > 117.55 ? "sleepy" : "open", mouth: yawn ? "yawn" : "none", look: [0, 0], wave: 60, waveLen: 30, phase: t * 4 });
      L(x, 150, 14, "220,80,90", 0.5 * rp);
    }
  }
};

// ================================================================ SCENE: the Sun (118.3 - 126.8)
const GRAN = (() => { const r = rng(701), a: [number, number, number][] = []; for (let i = 0; i < 34; i++) a.push([r() * 6.283, Math.sqrt(r()) * 0.86, r()]); return a; })();
const sSun: Draw = (c, t, L) => {
  bands(c, 0, PH, "#160a14", "#06030a", 6); drawStars(c, S_FAR, t, 40, 0, 0.5);
  const SX = 100, SY = 108, R = 54;
  haze(c, SX, SY, R * 2.4, "255,150,50", 0.4);
  [[-2.3, 1], [-0.9, -1], [2.2, 1]].forEach(([a, s], i) => { const bx = SX + Math.cos(a) * R, by = SY + Math.sin(a) * R, n = 9 + Math.round(2 * Math.sin(t * 1.3 + i)); for (let k = 0; k <= 14; k++) { const u = (k / 14) * Math.PI, rr = n; px(c, bx + Math.cos(a) * Math.sin(u) * rr + Math.cos(a + 1.571) * Math.cos(u) * rr * 0.8 * s, by + Math.sin(a) * Math.sin(u) * rr + Math.sin(a + 1.571) * Math.cos(u) * rr * 0.8 * s, k % 3 ? "#ff6a2a" : "#ffb347"); } });
  sphere(c, SX, SY, R, SUNP, { spec: false });
  GRAN.forEach(([a, d, s], i) => { const aa = a + t * 0.05 * (s - 0.5), x = SX + Math.cos(aa) * d * R, y = SY + Math.sin(aa) * d * R; disc(c, x, y, 1.5 + s, i % 3 ? "#ffd070" : "#e07a1a"); });
  L(SX, SY, 90, "255,180,80", 0.7);
  // fusion, seen through the lens
  const la = ramp(t, 120.6, 0.4);
  if (la > 0) {
    c.globalAlpha = la; dashed(c, SX + 14, SY - 6, 236, 84, "#c8905a", 2, 2);
    lens(c, 262, 76, 29, () => {
      rect(c, 230, 44, 64, 64, "#3a0c0a"); glow(c, 262, 76, 30, "255,120,40", 0.6);
      const m = easeIn(ramp(t, 121.26, 0.62)), fused = t > 121.9;
      if (!fused) { sphere(c, 262 - 20 + 17 * m, 76, 4, ["#8f1f2e", "#e0344d", "#ff6b7d", "#ffc2ca"]); sphere(c, 262 + 20 - 17 * m, 76, 4, ["#8f1f2e", "#e0344d", "#ff6b7d", "#ffc2ca"]); }
      else {
        const f = ramp(t, 121.9, 0.5); glow(c, 262, 76, 22 * (1 - f) + 4, "255,255,220", 1 - f * 0.7);
        sphere(c, 259, 74, 3, ["#8f1f2e", "#e0344d", "#ff6b7d", "#ffc2ca"]); sphere(c, 265, 78, 3, ["#8f1f2e", "#e0344d", "#ff6b7d", "#ffc2ca"]); sphere(c, 265, 73, 3, ["#1f3f8f", "#3a6fe0", "#6fa0ff", "#cddcff"]); sphere(c, 259, 79, 3, ["#1f3f8f", "#3a6fe0", "#6fa0ff", "#cddcff"]);
        const ph = 262 + 60 * (t - 121.95); if (ph < 300) photon(c, ph, 60, 3, YELLOW, { streak: 6 });
      }
    });
    c.globalAlpha = 1;
  }
  // the thermometer has to grow to fit 15 million degrees
  const ta = ramp(t, 122.3, 0.3);
  if (ta > 0) {
    const ext = back(clamp(ramp(t, 123.3, 0.45))), top = lerp(98, 46, Math.max(0, ext)), fill = t < 123.3 ? 0.97 * ease(ramp(t, 122.65, 0.6)) : lerp(0.97 * (172 - 98) / (172 - top), 0.97, ease(ramp(t, 123.6, 0.8)));
    c.globalAlpha = ta; thermo(c, 352, top, 172, fill, "#e0344d", "#e0344d");
    if (ext > 0.05) { rect(c, 347, 97, 11, 2, "#8a8aa0"); rect(c, 347, 97, 11, 1, "#c8c8d8"); }
    const v = 15e6 * ease(ramp(t, 123.0, 1.95));
    ptext(c, fmt(v), 262, 116, 2, "#ffd166", "center", INK);
    c.globalAlpha = 1;
  }
};

// ================================================================ SCENE: the burst (126.0 - 142.2)
const RINGS = [126.2, 127.3, 128.96, 130.1, 131.4, 133.0, 134.6, 136.3, 138.1, 139.9];
const SPRAY = (() => { const r = rng(801), a: [number, number, number][] = []; for (let i = 0; i < 60; i++) a.push([r() * 6.283, 60 + r() * 140, r() * 3]); return a; })();
const SPARKS = (() => { const r = rng(802), a: [number, number][] = []; for (let i = 0; i < 12; i++) a.push([(r() - 0.5) * 2.2, 30 + r() * 60]); return a; })();
const sBurst: Draw = (c, t, L) => {
  const sh = span(t, 128.96, 129.5, 0.05) * 3, shx = Math.round(sh * Math.sin(t * 71)), shy = Math.round(sh * Math.cos(t * 53));
  c.save(); c.translate(shx, shy);
  spaceBG(c, t, 10 * t, 0, { top: "#140a28", bot: "#05030e", neb: 0.8 });
  const GX = 96, GY = 108;
  RINGS.forEach((rt, i) => { const d = t - rt; if (d < 0 || d > 1.4) return; c.globalAlpha = 1 - d / 1.4; ring(c, GX, GY, d * (i === 2 ? 120 : 70), i === 2 ? "#ffffff" : "#b487ff", i === 2 ? 2 : 1); }); c.globalAlpha = 1;
  grbJets(c, GX, GY, t, 130, 4 + 2 * span(t, 128.96, 129.6, 0.1), L);
  if (between(t, 132.41, 136.5)) SPRAY.forEach(([a, v, ph]) => { const d = ((t - 132.41) * 0.8 + ph / 3) % 1, rr = 10 + d * v; c.globalAlpha = (1 - d) * span(t, 132.41, 136.5, 0.3); px(c, GX + Math.cos(a) * rr, GY + Math.sin(a) * rr, "#d8c8ff"); }); c.globalAlpha = 1;
  // the satellite that noticed
  const s0 = 318, sy = 52;
  rect(c, s0 - 17, sy - 3, 10, 6, "#2a50e0"); rect(c, s0 + 8, sy - 3, 10, 6, "#2a50e0"); for (let k = 0; k < 3; k++) { rect(c, s0 - 15 + k * 3, sy - 3, 1, 6, "#1a2a6a"); rect(c, s0 + 10 + k * 3, sy - 3, 1, 6, "#1a2a6a"); }
  rect(c, s0 - 7, sy - 2, 15, 1, "#8a8aa0"); rect(c, s0 - 4, sy - 5, 9, 10, INK); rect(c, s0 - 3, sy - 4, 7, 8, "#d8a83a"); ellipse(c, s0 - 6, sy + 6, 3, 2, "#e8e8f0");
  const det = t > 130.4; px(c, s0 + 2, sy - 3, det && Math.floor(t * 6) % 2 ? "#ff3a3a" : "#5a2a2a");
  lcd(c, s0 - 14, sy + 12, 30, 12); rect(c, s0 - 14, sy + 20, det ? 16 : 30, 1, "#6fff9a");
  if (det) { const up = ease(ramp(t, 130.4, 0.3)); line(c, s0 + 2, sy + 20, s0 + 4, sy + 20 - 22 * up, "#6fff9a"); if (up > 0.99) L(s0 + 4, sy - 2, 10, "255,80,80", 0.5); }
  // the steel slab, the single photon, the hole
  const HX = 246, HY = 142, hit = 137.4;
  rect(c, HX - 1, 63, 18, 111, INK); rect(c, HX, 64, 16, 109, "#6a7080"); rect(c, HX, 64, 3, 109, "#a8b0c0"); rect(c, HX + 13, 64, 3, 109, "#40444f"); rect(c, HX, 64, 16, 2, "#c8d0dc");
  for (let y = 70; y < 170; y += 16) { px(c, HX + 5, y, "#c8d0dc"); px(c, HX + 10, y, "#c8d0dc"); }
  if (t > hit) { const cool = ramp(t, hit, 2.2); disc(c, HX + 8, HY, 2.6, mix("#ffb347", "#8a4a2a", cool)); disc(c, HX + 8, HY, 1.6, "#0a0816"); if (cool < 0.7) L(HX + 8, HY, 10, "255,160,60", 0.8 * (1 - cool)); }
  if (between(t, hit, hit + 0.6)) SPARKS.forEach(([a, v]) => { const d = t - hit, side = a > 0 ? 1 : -1; c.globalAlpha = 1 - d / 0.6; px(c, HX + 8 + side * (8 + v * d), HY + a * v * d * 0.6 + 40 * d * d, "#ffd166"); }); c.globalAlpha = 1;
  if (between(t, 135.91, 139.2)) {
    const p = pop(t, 135.91, 0.35), x = t < hit ? lerp(GX + 14, HX + 8, (t - 135.91) / (hit - 135.91)) : HX + 8 + 120 * (t - hit), y = t < 136.6 ? lerp(GY, HY, ease(ramp(t, 135.91, 0.7))) : HY;
    if (!(x > HX - 4 && x < HX + 20)) { photon(c, x, y, 6 * p, GAMMA, { face: "determined", look: [1, 0], wave: 30, waveLen: 3.5, phase: t * 20, streak: 5 }); L(x, y, 16, "230,220,255", 0.6 * p); }
  }
  // the engineer comes to look
  if (t > 138.4) {
    const wx = lerp(410, 282, ease(ramp(t, 138.61, 0.8))), walking = between(t, 138.61, 139.4), lean = between(t, 139.4, 140.2) ? -2 : 0;
    person(c, wx, 174, 2, { hat: "hard", shirt: "#e07a1a", pants: "#2a3a5a", face: t > 140.21 && t < 140.64 ? 1 : -1, legs: walking ? Math.round(1 + Math.sin(t * 20)) : 1, lean, eyes: between(t, 140.64, 140.76) ? "closed" : "open", armR: 1.2, armL: 0.1 });
    rect(c, wx - 12, 150, 5, 7, "#e8e4d0");
  }
  c.restore();
};

// ================================================================ SCENE: four cards (141.4 - 161.5)
const CARDX = [66, 150, 234, 318], ROWY = [116, 132, 150, 168], CARDC = ["#e0561c", "#1fa3c9", "#e0a020", "#9a6aff"], CARDBG = ["#3a1a10", "#0a2040", "#3a2a08", "#1a0a30"];
const cardFace = (c: Ctx, i: number, x: number, y: number, t: number) => {
  if (i === 0) { miniCandle(c, x, y + 12, t); glow(c, x, y - 2, 14, "255,160,70", 0.5); }
  if (i === 1) { for (let k = 0; k < 20; k += 2) { const a = (k / 20) * 6.283; px(c, x + Math.cos(a) * 12, y + Math.sin(a) * 5, "#5fd6f5"); } sphere(c, x, y, 4, ["#8f1f2e", "#e0344d", "#ff6b7d", "#ffc2ca"]); for (let k = 0; k < 4; k++) rect(c, x - 4 + k * 2, y + 2, 2, 1, k % 2 ? "#ffffff" : "#e0302a"); }
  if (i === 2) { for (let k = 0; k < 8; k++) { const a = k * 0.785 + t * 0.3; line(c, x + Math.cos(a) * 14, y + Math.sin(a) * 14, x + Math.cos(a) * 17, y + Math.sin(a) * 17, "#ffd166"); } sphere(c, x, y, 11, SUNP); }
  if (i === 3) { rect(c, x - 1, y - 22, 3, 44, "rgba(200,170,255,0.5)"); rect(c, x, y - 22, 1, 44, "#ffffff"); ring(c, x, y, 8, "#9a6aff", 1); disc(c, x + 0.5, y, 3, "#ffffff"); glow(c, x, y, 16, "210,190,255", 0.6); }
};
const sCards: Draw = (c, t, L) => {
  const whip = -250 * ease(ramp(t, 155.1, 0.4)) * (1 - ease(ramp(t, 156.0, 0.4)));
  bands(c, 0, PH, "#15102a", "#08061a", 6);
  c.save(); c.translate(Math.round(whip), 0);
  for (let x = -260; x < PW + 260; x += 12) for (let y = 34; y < 186; y += 12) px(c, x, y, "#1f1a3c");
  const spread = ease(ramp(t, 159.13, 0.6)) * 0.07, X = (x: number) => 192 + (x - 192) * (1 + spread);
  CARDX.forEach((cx0, i) => {
    const cx = X(cx0), inT = 141.92 + i * 0.15, d = Math.max(0, back(clamp(ramp(t, inT, 0.45)))); if (t < inT) return;
    const sway = between(t, 143.3, 144.6) ? Math.round(Math.sin((t - 143.3) * 6) * 1.5) : 0, top = 36 + Math.round(150 * (1 - d)) + sway;
    const fp = ramp(t, 144.62 + i * 0.22, 0.3), wf = Math.max(0.04, Math.abs(Math.cos(Math.PI * fp))), w = Math.round(60 * wf), face = fp >= 0.5;
    rect(c, cx - w / 2 - 1, top - 1, w + 2, 66, INK);
    if (!face) { rect(c, cx - w / 2, top, w, 64, "#2a2a6a"); rect(c, cx - w / 2 + 2, top + 2, Math.max(0, w - 4), 60, "#3a3a8a"); for (let yy = top + 4; yy < top + 60; yy += 4) for (let xx = cx - w / 2 + 4; xx < cx + w / 2 - 4; xx += 4) px(c, xx + ((yy / 4) % 2) * 2, yy, "#4a4aa0");
      if (w > 20) { rect(c, cx + 1, top + 22, 1, 14, "#ffd166"); disc(c, cx - 1, top + 36, 2.5, "#ffd166"); rect(c, cx + 2, top + 22, 3, 1, "#ffd166"); rect(c, cx + 4, top + 23, 1, 3, "#ffd166"); } }
    else { rect(c, cx - w / 2, top, w, 64, CARDBG[i]); rect(c, cx - w / 2, top, w, 2, CARDC[i]); rect(c, cx - w / 2, top + 62, w, 2, CARDC[i]); if (w > 30) { c.save(); c.beginPath(); c.rect(cx - w / 2, top, w, 64); c.clip(); cardFace(c, i, cx, top + 32, t); c.restore(); L(cx, top + 32, 26, ["255,160,70", "95,214,245", "255,200,80", "200,170,255"][i], 0.35); } }
  });
  // reactants
  CARDX.forEach((cx0, i) => { const p = pop(t, 148.03 + i * 0.15, 0.3); if (p <= 0) return; const x = X(cx0), y = ROWY[0]; c.globalAlpha = clamp(p);
    if (i === 0) { for (let a = 0; a < 3; a++) { disc(c, x - 10 + a * 3, y + (a % 2 ? 1 : -1), 1.5, "#6a6a78"); px(c, x - 10 + a * 3, y + (a % 2 ? 3 : -3), "#ffffff"); } disc(c, x + 6, y, 1.5, "#e0344d"); disc(c, x + 9, y, 1.5, "#e0344d"); }
    if (i === 1) { disc(c, x, y, 2, "#e0344d"); for (let k = 0; k < 12; k += 2) { const a = (k / 12) * 6.283; px(c, x + Math.cos(a) * 6, y + Math.sin(a) * 3, "#5fd6f5"); } }
    if (i === 2) { sphere(c, x - 4, y, 2.5, ["#8f1f2e", "#e0344d", "#ff6b7d", "#ffc2ca"], { spec: false }); sphere(c, x + 4, y, 2.5, ["#8f1f2e", "#e0344d", "#ff6b7d", "#ffc2ca"], { spec: false }); }
    if (i === 3) { sphere(c, x, y, 4, ["#3a3a44", "#6a6a78", "#9a9aa8", "#d0d0dc"], { spec: false }); for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) line(c, x + dx * 11, y + dy * 6, x + dx * 7, y + dy * 4, "#c4a0ff"); }
    c.globalAlpha = 1; });
  // temperatures
  const tf = ease(ramp(t, 150.1, 0.9));
  if (t > 149.93) CARDX.forEach((cx0, i) => { const x = X(cx0), y = ROWY[1], fill = [0.4, 0.04, 0.9, 1][i] * tf, cold = i === 1; c.globalAlpha = ramp(t, 149.93, 0.3);
    rect(c, x - 20, y - 3, 38, 6, INK); rect(c, x - 19, y - 2, 36, 4, "#cfdae6"); rect(c, x - 18, y - 1, 34 * fill, 2, cold ? "#5fa8ff" : "#e0344d"); disc(c, x - 21, y, 4, INK); disc(c, x - 21, y, 3, cold ? "#5fa8ff" : "#e0344d");
    if (cold) { px(c, x - 8, y - 4, "#ffffff"); px(c, x + 4, y + 3, "#ffffff"); }
    if (i === 3 && t > 151.03) { const b = ramp(t, 151.03, 0.8); for (let k = 0; k < 5; k++) { c.globalAlpha = 1 - b; px(c, x + 18 + b * (10 + k * 5), y - 2 + k - b * 10 + b * b * 16, k % 2 ? "#cfdae6" : "#e0344d"); } } c.globalAlpha = 1; });
  // energy per photon: linear bars; gamma's runs right off the table
  if (t > 152.41) CARDX.forEach((cx0, i) => { const x = X(cx0) - 20, y = ROWY[2], len = i === 3 ? 20 + 1100 * easeIn(ramp(t, 153.8, 1.6)) : [3, 1, 3.5][i]; c.globalAlpha = ramp(t, 152.41 + i * 0.1, 0.25); rect(c, x, y - 2, len, 4, CARDC[i]); rect(c, x, y - 2, len, 1, mix(CARDC[i], "#ffffff", 0.5)); c.globalAlpha = 1; });
  if (t > 154.3) for (let k = 0; k < 12; k++) px(c, 400 + k * 40, ROWY[2] + 5, "#5a548a");
  // mechanisms
  CARDX.forEach((cx0, i) => { const p = pop(t, 157.35 + i * 0.15, 0.3); if (p <= 0) return; const x = X(cx0), y = ROWY[3]; c.globalAlpha = clamp(p);
    if (i === 0) { disc(c, x - 6, y, 2, "#6a6a78"); disc(c, x + 6, y, 2, "#e0344d"); dashed(c, x - 3, y, x + 3, y, "#ffd166", 1, 1); px(c, x, y - 3, "#ffd166"); px(c, x - 1, y - 4, "#fff2c2"); }
    if (i === 1) { rect(c, x - 8, y - 4, 16, 1, "#bfe0ff"); rect(c, x - 8, y + 4, 16, 1, "#bfe0ff"); line(c, x, y - 3, x, y + 2, "#5fd6f5"); px(c, x - 1, y + 1, "#5fd6f5"); px(c, x + 1, y + 1, "#5fd6f5"); }
    if (i === 2) { disc(c, x - 9, y, 2, "#e0344d"); disc(c, x - 4, y, 2, "#e0344d"); line(c, x - 1, y, x + 3, y, "#ffd166"); disc(c, x + 7, y, 3, "#ffd166"); }
    if (i === 3) { for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { line(c, x + dx * 10, y + dy * 6, x + dx * 4, y + dy * 2, "#c4a0ff"); } disc(c, x, y, 1.5, "#ffffff"); }
    c.globalAlpha = 1; });
  c.restore();
};

// ================================================================ SCENE: and yet (160.8 - 183.0)
const YLANES = [58, 90, 122, 154];
const YPH: { pal: Pal; wl: number; face: Face }[] = [{ pal: ORANGE, wl: 13, face: "open" }, { pal: RADIO, wl: 30, face: "sleepy" }, { pal: YELLOW, wl: 11, face: "open" }, { pal: GAMMA, wl: 3.5, face: "determined" }];
const sourceIcon = (c: Ctx, i: number, x: number, y: number, t: number) => {
  if (i === 0) miniCandle(c, x, y + 7, t);
  if (i === 1) { sphere(c, x, y, 3, ["#8f1f2e", "#e0344d", "#ff6b7d", "#ffc2ca"], { spec: false }); for (let k = 0; k < 16; k += 2) { const a = (k / 16) * 6.283; px(c, x + Math.cos(a) * 8, y + Math.sin(a) * 3, "#5fd6f5"); } }
  if (i === 2) { sphere(c, x, y, 7, SUNP); }
  if (i === 3) { rect(c, x, y - 9, 1, 18, "#e8dcff"); disc(c, x + 0.5, y, 2.5, "#ffffff"); }
};
const sYet: Draw = (c, t, L) => {
  const [rx, cam] = chase(t, 167.22, 64, 196, 900, 0.2, 0.8);
  spaceBG(c, t, cam * 0.5, 0, { streak: t > 167.3 ? 14 : 0 });
  const hush = span(t, 160.91, 161.8, 0.3);
  YLANES.forEach((y, i) => { const sx = 34 - cam; if (sx < -20) return; glow(c, sx, y, 16, ["255,160,70", "95,214,245", "255,200,80", "200,170,255"][i], t > 161.66 ? 0.7 : 0.3); sourceIcon(c, i, sx, y, t); L(sx, y, 16, ["255,160,70", "95,214,245", "255,200,80", "200,170,255"][i], t > 161.66 ? 0.5 : 0.15); });
  if (hush > 0) rect(c, 0, 0, PW, PH, `rgba(5,4,15,${(0.45 * hush).toFixed(3)})`);
  const go = t >= 167.22;
  YPH.forEach((P, i) => {
    const te = 163.48 + i * 0.18; if (t < te) return;
    const p = pop(t, te, 0.4), x = go ? rx : lerp(34, 64, ease(ramp(t, te, 0.4))), y = YLANES[i];
    photon(c, x, y, 6 * p, P.pal, { face: go ? P.face : t < 165.42 ? "open" : P.face, look: t < 165.42 ? [0, 0] : [1, 0], wave: go ? 70 : 0, waveLen: P.wl, phase: t * 10, streak: go ? 6 : 0 });
    if (i === 1) { for (let k = 0; k < 5; k++) rect(c, x - 5 + k * 2, y + 3, 2, 1, k % 2 ? "#ffffff" : "#e0302a"); rect(c, x - 6 - (go ? 4 : 0), y + 4, 2, 3, "#e0302a"); }
    L(x, y, 16, "255,240,220", 0.45 * p);
  });
  const lz = span(t, 168.26, 171.0, 0.2);
  if (lz > 0) { c.globalAlpha = lz * (0.6 + 0.4 * Math.sin(t * 20)); rect(c, rx + 7, 48, 1, 116, "#7ff7ff"); c.globalAlpha = 1; }
  // the statistician's bell curve collapses to a single spike
  const sa = span(t, 173.6, 176.0, 0.3);
  if (sa > 0) {
    c.globalAlpha = sa; rect(c, 248, 30, 124, 68, "#6a4a28"); rect(c, 250, 32, 120, 64, "#1a3a2a");
    const col = ease(ramp(t, 174.74, 0.5)), sig = lerp(14, 0.35, col), hgt = Math.min(58, (20 * 14) / (sig * 14 / 14 + (14 - 14 * col) * 0) / 1);
    rect(c, 254, 90, 112, 1, "#9ac8a8");
    let prevY = 90; for (let x = 256; x < 364; x++) { const u = (x - 310) / sig, yy = 90 - Math.min(56, hgt * Math.exp(-u * u / 2) * (col > 0 ? 1 + 1.8 * col : 1)); line(c, x - 1, prevY, x, yy, "#f4fbff"); prevY = yy; }
    person(c, 322, 176, 2, { coat: "#e8ecf0", shirt: "#3a6fe0", pants: "#3a3a52", glasses: true, face: -1, armR: between(t, 174.95, 175.4) ? 2.7 : 0.2, armL: 0.1 });
    c.globalAlpha = 1;
  }
  // a lens that zooms finer and finer: the noses never separate
  const za = span(t, 177.8, 182.5, 0.3);
  if (za > 0) {
    const steps = [178.44, 178.82, 179.36, 180.42, 180.8, 181.51], kc = steps.reduce((a, s) => a + ease(ramp(t, s, 0.25)), 0), kd = steps.filter((s) => t >= s).length;
    c.globalAlpha = za; dashed(c, rx + 8, 106, 244, 106, "#7ff7ff", 2, 2);
    lens(c, 286, 106, 36, () => {
      rect(c, 246, 66, 82, 82, "#080618");
      const R = 10 * Math.pow(1.9, kc);
      YPH.forEach((P, i) => { const yy = 106 + (i - 1.5) * 16; c.save(); c.beginPath(); c.rect(240, yy - 7, 90, 14); c.clip(); sphere(c, 286 - R, yy, R, P.pal, { spec: false }); c.restore(); });
      rect(c, 286, 66, 1, 82, "#7ff7ff");
      for (let x = 250; x < 324; x += 4) rect(c, x, 138, 1, (x - 250) % 16 === 0 ? 4 : 2, "#5a548a");
    });
    ptext(c, "0." + "0".repeat(kd) + "1", 286, 152, 1, "#6fff9a", "center");
    c.globalAlpha = 1;
  }
};

// ================================================================ SCENE: the space radar (182.4 - 206.0)
const RSEQ: [number, string][] = [[185.85, "2"], [186.25, "9"], [186.6, "9"], [186.9, ","], [187.3, "7"], [187.7, "9"], [188.05, "2"], [188.35, ","], [188.7, "4"], [189.2, "5"], [189.65, "8"]];
const passer = (t: number, t0: number) => -12 + 440 * (t - t0);
const tv = (c: Ctx, x: number, y: number, t: number, kind: number) => {
  const fl = 0.8 + 0.2 * Math.sin(t * 13 + kind);
  if (kind === 0) { rect(c, x - 12, y - 9, 24, 18, INK); rect(c, x - 11, y - 8, 22, 16, "#8a5a2a"); rect(c, x - 9, y - 6, 15, 12, mix("#3a7bff", "#bfe0ff", fl * 0.5)); px(c, x + 8, y - 3, "#ffd166"); px(c, x + 8, y, "#ffd166"); }
  if (kind === 1) { rect(c, x - 11, y - 8, 22, 13, INK); rect(c, x - 10, y - 7, 20, 11, mix("#5fd6f5", "#e0faff", fl * 0.4)); rect(c, x - 13, y + 5, 26, 3, "#8a8aa0"); }
  if (kind === 2) { rect(c, x - 6, y - 9, 12, 18, INK); rect(c, x - 5, y - 8, 10, 16, mix("#6a8cff", "#d0dcff", fl * 0.5)); }
};
const sRadar: Draw = (c, t, L) => {
  spaceBG(c, t, 4 * t, 0, { neb: 0.8 });
  dashed(c, 0, 94, PW, 94, "#2a2656", 6, 6); dashed(c, 0, 120, PW, 120, "#2a2656", 6, 6);
  // the asteroid and its patrolman
  ellipse(c, 70, 186, 74, 20, "#3a3444"); ellipse(c, 70, 172, 66, 7, "#5a5468"); ellipse(c, 70, 171, 58, 4, "#6a6478"); px(c, 40, 176, "#2a2434"); px(c, 41, 176, "#2a2434"); px(c, 96, 180, "#2a2434");
  const raised = ease(ramp(t, 182.97, 0.4)) * (1 - ease(ramp(t, 201.9, 0.3))), phone = t > 202.0;
  const shake = between(t, 199.8, 200.6) ? Math.round(Math.sin(t * 60)) : 0, dbl = between(t, 196.0, 196.5), jaw = between(t, 189.3, 190.6);
  person(c, 80, 170, 2, { hat: "police", shirt: "#2a3a7a", pants: "#1a1a2a", face: 1, armR: lerp(0.2, 1.6, raised), armL: phone ? 2.4 : between(t, 200.0, 200.5) ? 1.2 : 0.2, lean: dbl ? 1 : jaw ? -1 : 0, mouth: jaw ? "open" : "none", eyes: dbl && t < 196.2 ? "closed" : "open" });
  if (raised > 0.05) { const gx = lerp(88, 95, raised) + shake, gy = lerp(155, 144, raised); rect(c, gx - 1, gy - 3, 13, 7, INK); rect(c, gx, gy - 2, 11, 5, "#8a8a9a"); rect(c, gx + 11, gy - 1, 2, 3, "#5a5a6a"); rect(c, gx + 2, gy + 3, 3, 4, "#6a6a7a"); px(c, gx + 3, gy - 2, t > 185.04 ? "#ff3a3a" : "#5a2a2a"); }
  if (phone) { const k = ramp(t, 202.0, 0.3); rect(c, 69, 140, 4, 6, INK); rect(c, 70, 141, 2, 4, "#bfe0ff"); L(71, 138, 10, "150,200,255", 0.6 * k); }
  // who goes past: candle photon, gamma, sleepy radio, a phone's blue photon, then every screen
  const pass = (t0: number, pal: Pal, face: Face, wl: number, y = 107) => { const x = passer(t, t0); if (x < -20 || x > PW + 20) return; photon(c, x, y, 6, pal, { face, wave: 40, waveLen: wl, phase: t * 10, streak: 8 }); L(x, y, 16, "255,240,220", 0.5); if (raised > 0.5 && x > 110) dashed(c, 108 + shake, 144, x - 6, y + 2, "#ff5f6d", 2, 3, -t * 60); };
  pass(184.3, ORANGE, "determined", 13); pass(194.6, GAMMA, "determined", 3.5); pass(198.3, RADIO, "sleepy", 30);
  if (t > 202.56) { const x = 76 + 440 * (t - 202.56), y = lerp(138, 107, clamp((t - 202.56) * 4)); if (x < PW + 10) { photon(c, x, y, 3, BLUEP, { face: "open", streak: 6 }); L(x, y, 10, "120,160,255", 0.6); } }
  const sa = ramp(t, 203.55, 0.5);
  if (sa > 0) { const d = ease(sa); [[240, 156, 0], [300, 146, 1], [352, 128, 2]].forEach(([x, y, k], i) => { const yy = y + Math.round((1 - d) * 60) + Math.round(Math.sin(t * 1.5 + i)); c.globalAlpha = d; tv(c, x, yy, t, k); L(x, yy, 18, "150,190,255", 0.4 * d); for (let j = 0; j < 3; j++) { const q = ((t * 1.3 + j / 3 + i * 0.2) % 1); px(c, x + 12 + q * 60, yy - 2 - q * 40, "#bfe0ff"); } }); c.globalAlpha = 1; }
  // the readout
  const pa = ramp(t, 183.3, 0.35);
  if (pa > 0) {
    c.globalAlpha = pa; lcd(c, 196, 36, 164, 40); px(c, 199, 39, Math.floor(t * 3) % 2 ? "#ff3a3a" : "#5a2a2a");
    let s = "";
    if (t < 185.04) s = ""; else if (t < 185.85) s = "---,---,---";
    else if (t < 194.9) { for (const [tt, ch] of RSEQ) s += t >= tt ? ch : ch === "," ? "," : String(Math.floor((t * 29 + s.length * 7) % 10)); }
    else if (t < 195.6) s = "---,---,---";
    else if (t < 198.9) s = t < 195.9 ? scrambleTo("299,792,458", t, 195.6, 0.3) : "299,792,458";
    else if (t < 199.3) s = "---,---,---";
    else s = t < 199.6 ? scrambleTo("299,792,458", t, 199.3, 0.3) : "299,792,458";
    ptext(c, s, 278, 42, 3, "#6fff9a", "center");
    if ((t > 190.53 && t < 194.9) || t > 195.9) ptext(c, "M/S", 354, 62, 2, "#6fff9a", "right");
    c.globalAlpha = 1; L(278, 52, 50, "111,255,154", 0.25 * pa);
  }
};
const scrambleTo = (target: string, t: number, t0: number, d: number) => { const k = ramp(t, t0, d), n = Math.floor(k * target.length); let s = ""; for (let i = 0; i < target.length; i++) s += i < n || target[i] === "," ? target[i] : String(Math.floor((t * 31 + i * 5) % 10)); return s; };
const zRadar = (t: number): [number, number, number, number, number] => { const z = 1 + 0.1 * ease(ramp(t, 186.0, 4.0)) * (1 - ease(ramp(t, 193.4, 0.9))); return [z, 278, 56, 278, 56]; };

// ================================================================ SCENE: vacuum (205.3 - 217.6)
const FORM = (() => { const r = rng(901), a: { x: number; y: number; k: number; s: number }[] = []; for (let i = 0; i < 34; i++) a.push({ x: r() * PW, y: 36 + r() * 144, k: Math.floor(r() * 9), s: 0.3 + r() * 0.5 }); return a; })();
const sVacuum: Draw = (c, t, L) => {
  const [fx, cam] = chase(t, 207.1, -20, 200, 520, 0.45, 0.6);
  bands(c, 0, PH, "#07061a", "#020108", 6);
  drawStars(c, S_FAR, t, cam * 0.3, 0, 0.35, t > 207.4 ? 8 : 0);
  const gA = 1 - ramp(t, 207.1, 0.4);
  if (gA > 0) { c.globalAlpha = 0.5 * gA * ramp(t, 205.93, 0.6); for (let x = 0; x < PW; x += 24) rect(c, x, 28, 1, 160, "#16143a"); for (let y = 28; y < 190; y += 24) rect(c, 0, y, PW, 1, "#16143a"); c.globalAlpha = 1; }
  // the pull back: a whole sky of formations, all frozen relative to one another -- everything moves at c
  const back_ = ease(ramp(t, 214.4, 1.5));
  if (back_ > 0) FORM.forEach((f) => { c.globalAlpha = back_ * 0.8; for (let j = 0; j < 9; j++) { const y = f.y + (j - 4) * 5 * f.s; px(c, f.x, y, SPECTRUM[j][2]); for (let q = 1; q < 4; q++) px(c, f.x - q, y, SPECTRUM[j][1]); } }); c.globalAlpha = 1;
  const sc = lerp(1, 0.42, back_);
  if (t > 207.0) SPECTRUM.forEach((P, i) => {
    const y = 108 + (i - 4) * 16 * sc, fast = i === 6 && t > 210.4, sleep = i === 0 && t > 212.5;
    const strain = fast && t < 213.5 ? Math.round(Math.sin(t * 40)) : 0, x = fx;
    photon(c, x, y + strain, Math.max(2, 5 * sc), P, { face: sleep ? "blink" : fast ? "determined" : "open", mouth: fast ? "flat" : "none", wave: Math.round(46 * sc), waveLen: WAVELEN[i] * sc, phase: t * 10, streak: 5 });
    if (fast && sc > 0.7) { for (let k = 0; k <= 10; k++) { const a = Math.PI + (k / 10) * Math.PI; rect(c, x + Math.cos(a) * 6, y + strain + Math.sin(a) * 6, 1, 1, "#e0302a"); } rect(c, x - 5, y + strain - 5, 10, 2, "#e0302a"); rect(c, x - 4, y + strain - 1, 8, 1, "#2a2a3a"); }
    if (sleep && sc > 0.7) for (let k = 0; k < 3; k++) { const q = ((t - 212.5) * 0.6 + k / 3) % 1, zx = x + 6 + q * 10, zy = y - 6 - q * 16; c.globalAlpha = 1 - q; rect(c, zx, zy, 3, 1, "#e8e6ff"); px(c, zx + 1, zy + 1, "#e8e6ff"); rect(c, zx, zy + 2, 3, 1, "#e8e6ff"); c.globalAlpha = 1; }
    L(x, y, 12 * sc, "255,240,220", 0.35);
  });
  [211.0, 213.2].forEach((tt) => { const a = span(t, tt, tt + 0.7, 0.15); if (a > 0) { c.globalAlpha = a; rect(c, fx + 6, 40, 1, 136, "#7ff7ff"); c.globalAlpha = 1; } });
};

// ================================================================ SCENE: the park (216.5 - 246.4)
const CLOUDS = (() => { const r = rng(1001), a: [number, number, number][] = []; for (let i = 0; i < 7; i++) a.push([r() * 700, 40 + r() * 50, 0.7 + r() * 0.7]); return a; })();
const TREES = (() => { const r = rng(1002), a: [number, number][] = []; for (let x = -40; x < 1700; x += 60 + Math.floor(r() * 60)) a.push([x, 0.8 + r() * 0.5]); return a; })();
const BLDG = (() => { const r = rng(1003), a: [number, number, number][] = []; for (let x = 0; x < 1200; x += 8 + Math.floor(r() * 14)) a.push([x, 10 + Math.floor(r() * 26), 6 + Math.floor(r() * 8)]); return a; })();
const cloud = (c: Ctx, x: number, y: number, s: number) => { disc(c, x, y, 8 * s, "#e8f2ff"); disc(c, x + 9 * s, y + 2 * s, 7 * s, "#ffffff"); disc(c, x - 9 * s, y + 3 * s, 6 * s, "#f0f6ff"); rect(c, x - 14 * s, y + 5 * s, 30 * s, 3 * s, "#c8daf2"); };
const car = (c: Ctx, x: number, y: number, t: number, run: boolean) => {
  rect(c, x - 1, y - 9, 34, 10, INK); rect(c, x, y - 8, 32, 8, "#d8342a"); rect(c, x, y - 8, 32, 1, "#ff6a5a"); rect(c, x + 7, y - 15, 17, 7, INK); rect(c, x + 8, y - 14, 15, 6, "#d8342a"); rect(c, x + 10, y - 13, 5, 4, "#bfe0ff"); rect(c, x + 17, y - 13, 5, 4, "#bfe0ff"); px(c, x + 31, y - 6, "#ffd166"); px(c, x, y - 6, "#ff3a3a");
  const sp = run ? t * 20 : 0; [x + 7, x + 25].forEach((wx) => { disc(c, wx, y + 1, 3.5, INK); disc(c, wx, y + 1, 2, "#8a8aa0"); px(c, wx + Math.round(Math.cos(sp)), y + 1 + Math.round(Math.sin(sp)), INK); });
};
const ballPx = (c: Ctx, x: number, y: number, rot: number) => { disc(c, x, y, 3.5, INK); disc(c, x, y, 2.6, "#ffffff"); px(c, x + Math.round(Math.cos(rot) * 1.2), y + Math.round(Math.sin(rot) * 1.2), INK); };
const rifle = (c: Ctx, x: number, y: number, kind: number) => {
  const stock = kind ? "#2a2a30" : "#8a5a2a", L_ = kind ? 42 : 34;
  rect(c, x - 1, y - 3, 14, 6, INK); rect(c, x, y - 2, 12, 4, stock); rect(c, x + 12, y - 1, L_ - 12, 2, "#3a3a44"); rect(c, x + 12, y - 1, L_ - 12, 1, "#6a6a78"); rect(c, x + 14, y - 5, kind ? 14 : 9, 3, INK); px(c, x + 15, y - 4, "#5fd6f5");
};
const sPark: Draw = (c, t, L) => {
  // camera: tilt down from the sky, then truck right through four little experiments
  const camY = -110 * (1 - ease(ramp(t, 217.0, 2.3)));
  const carX = 800 + (t > 235.19 ? 3 * Math.pow(Math.min(t, 236.98) - 235.19, 2) : 0) + (t > 236.98 ? 8 * Math.pow(t - 236.98, 2) : 0);
  const camX = t < 228.1 ? 0 : t < 234.6 ? 400 * ease(ramp(t, 228.1, 0.8)) : t < 240.3 ? lerp(400, 740, ease(ramp(t, 234.6, 0.75))) + Math.max(0, carX - 830) * 0.85 : lerp(740 + Math.max(0, 800 + 3 * 1.79 * 1.79 + 8 * 3.32 * 3.32 - 830) * 0.85, 1120, ease(ramp(t, 240.3, 0.75))) + 30 * ease(ramp(t, 245.1, 1.2));
  const G = 150 - camY;
  bands(c, 0, PH, "#3a6ac8", "#c8e6ff", 8);
  haze(c, 330, 46 - camY * 0.3, 60, "255,250,220", 0.5); disc(c, 330, 46 - camY * 0.3, 10, "#fff8d8");
  CLOUDS.forEach(([x, y, s]) => { const X = ((x + t * 3 - camX * 0.15) % 760 + 760) % 760 - 100; cloud(c, X, y - camY * 0.4, s); });
  // sunlight arriving: the light we followed, streaming down
  const sl = span(t, 216.5, 219.5, 0.6);
  if (sl > 0) for (let i = 0; i < 26; i++) { const q = ((t - 216.5) * 0.5 + i / 26) % 1, x = 30 + ((i * 53) % 330) + q * 40, y = -10 + q * 200 - camY * 0.2; c.globalAlpha = sl * (1 - q); px(c, x, y, SPECTRUM[i % 9][2]); } c.globalAlpha = 1;
  // hills, a hazy city, trees
  for (let x = 0; x < PW; x++) { const w = x + camX * 0.3, h = 20 + 8 * Math.sin(w * 0.013) + 5 * Math.sin(w * 0.031 + 1); rect(c, x, G - h, 1, h, "#8fb8d8"); }
  BLDG.forEach(([x, h, w]) => { const X = x - camX * 0.45; if (X > -20 && X < PW + 20) rect(c, X, G - h, w, h, "#a8c0da"); });
  TREES.forEach(([x, s]) => { const X = x - camX * 0.75; if (X < -20 || X > PW + 20) return; rect(c, X - 1, G - 10 * s, 3, 10 * s, "#6a4a2a"); disc(c, X, G - 16 * s, 8 * s, "#2f7a3a"); disc(c, X - 3 * s, G - 18 * s, 5 * s, "#3f9a4a"); disc(c, X + 3 * s, G - 14 * s, 4 * s, "#3a8a44"); });
  rect(c, 0, G, PW, PH - G, "#4f9a3f");
  for (let x = -((camX % 64) + 64) % 64 - 64; x < PW; x += 64) rect(c, x, G, 32, PH - G, "#57a846");
  rect(c, 0, G, PW, 1, "#3a7a30");
  // nature, behaving: a bird that flaps and glides, so its speed keeps changing
  if (between(t, 219.2, 226.0)) { const u = t - 219.2, bx = 20 + 55 * u + 22 * Math.sin(u * 2.2), by = 72 + 6 * Math.sin(t * 1.7) - camY * 0.5, flap = Math.cos(u * 2.2) > 0 && Math.floor(t * 10) % 2 === 0; line(c, bx - 4, by + (flap ? -3 : 0), bx, by, "#2a2a3a"); line(c, bx, by, bx + 4, by + (flap ? -3 : 0), "#2a2a3a"); }
  const X = (w: number) => w - camX;
  // baseball: the patrolman, finally getting ordinary numbers
  if (camX < 420) {
    for (let k = 0; k < 8; k++) for (let j = 0; j < 6; j++) px(c, X(352) + k * 3, G - 2 - j * 5, "#8a8aa0");
    rect(c, X(351), G - 30, 1, 30, "#6a6a7a"); rect(c, X(375), G - 30, 1, 30, "#6a6a7a");
    const soft = between(t, 224.6, 226.85), windA = t < 224.85 ? -2.4 * span(t, 224.6, 224.85, 0.1) : t < 226.85 ? 0.9 : t < 227.1 ? -2.9 * ramp(t, 226.85, 0.15) : 1.2;
    person(c, X(100), G + 14, 2, { shirt: "#f4f4f4", pants: "#3a3a52", hat: "cap", face: 1, armR: t > 224.5 ? windA : 0.2, armL: 0.3, legs: between(t, 226.95, 227.3) ? 3 : 1 });
    person(c, X(318), G + 14, 2, { hat: "police", shirt: "#2a3a7a", pants: "#1a1a2a", face: -1, armR: 1.5, armL: between(t, 227.6, 228.4) ? 2.8 : 0.2, lean: between(t, 227.6, 227.8) ? 1 : 0 });
    rect(c, X(318) - 22, G - 12, 10, 5, "#8a8aa0"); px(c, X(318) - 21, G - 11, t > 224.6 ? "#ff3a3a" : "#5a2a2a");
    let bx = 0, by = 0, show = false;
    if (between(t, 224.85, 226.6)) { const u = clamp((t - 224.85) / 1.6); bx = lerp(112, 356, u); by = lerp(G - 18, G - 10, u) - 60 * Math.sin(u * Math.PI); show = true; }
    if (between(t, 227.1, 227.9)) { const u = clamp((t - 227.1) / 0.35); bx = lerp(112, 356, u); by = lerp(G - 18, G - 14, u); show = true; }
    if (show) { disc(c, X(bx), by, 2.5, INK); disc(c, X(bx), by, 1.8, "#ffffff"); px(c, X(bx), by, "#e0344d"); if (!soft) for (let k = 1; k < 5; k++) px(c, X(bx) - k * 3, by, "rgba(255,255,255,0.5)"); }
  }
  // the range: two rifles, one chronograph, two different muzzle velocities
  if (camX > 200 && camX < 800) {
    rect(c, X(462), G - 6, 70, 3, "#8a5a2a"); rect(c, X(466), G - 3, 2, 3 + 14, "#5a3a1a"); rect(c, X(526), G - 3, 2, 17, "#5a3a1a");
    person(c, X(446), G + 14, 2, { shirt: "#5a7a3a", pants: "#3a3a44", glasses: true, face: 1, armR: 1.4, armL: 1.2 }); rect(c, X(446) - 6, G - 32, 3, 5, "#2a2a3a"); rect(c, X(446) + 2, G - 32, 3, 5, "#2a2a3a");
    const swapOut = ease(ramp(t, 229.9, 0.3)), swapIn = ease(ramp(t, 230.2, 0.25));
    if (t < 230.2) rifle(c, X(470), G - 10 - 40 * swapOut, 0); else rifle(c, X(470), G - 10 - 40 * (1 - swapIn), 1);
    [540, 556].forEach((gx) => { line(c, X(gx) - 3, G - 22, X(gx), G - 14, "#c8c8d8"); line(c, X(gx) + 3, G - 22, X(gx), G - 14, "#c8c8d8"); rect(c, X(gx), G - 14, 1, 14, "#6a6a7a"); });
    rect(c, X(640) - 1, G - 26, 16, 16, INK); rect(c, X(640), G - 25, 14, 14, "#f4f0e0"); ring(c, X(647), G - 18, 5, "#e0344d", 1); ring(c, X(647), G - 18, 3, INK, 1); rect(c, X(646), G - 10, 2, 10, "#6a4a2a");
    [229.1, 230.6].forEach((ft, k) => { if (t < ft) return; const d = t - ft, mx = X(470) + (k ? 42 : 34), my = G - 11; if (d < 0.12) { glow(c, mx + 3, my, 10, "255,220,140", 1 - d / 0.12); for (let s = 0; s < 4; s++) { const a = s * 1.571; px(c, mx + 3 + Math.cos(a) * 4, my + Math.sin(a) * 4, "#fff2c2"); } L(mx, my, 12, "255,210,120", 0.9); } if (d < 0.2) { c.globalAlpha = 1 - d / 0.2; rect(c, mx, my, X(640) - mx, 1, "#ffe8a0"); c.globalAlpha = 1; } px(c, X(645) + k * 3, G - 19 + k, INK); });
  }
  // the road: a push, then an engine
  if (camX > 520 && camX < 1100) {
    rect(c, X(700), G + 2, 420, 16, "#3a3a44"); for (let x = 704; x < 1116; x += 20) rect(c, X(x), G + 9, 10, 1, "#e8e6d0");
    const run = t > 236.98;
    if (t < 241.5) car(c, X(carX), G + 12, t, run);
    if (run) for (let k = 0; k < 4; k++) { const q = ((t - 236.98) * 1.6 + k / 4) % 1; c.globalAlpha = (1 - q) * 0.7; disc(c, X(carX) - 3 - q * 16, G + 8 - q * 8, 1 + q * 3, "#c8c8d8"); } c.globalAlpha = 1;
    const pushX = t < 236.98 ? carX - 7 : 784 + 3 * Math.pow(1.79, 2) - 7;
    person(c, X(pushX), G + 16, 2, { shirt: "#e0a020", pants: "#3a3a52", face: 1, lean: t < 236.98 ? 2 : 0, armR: t < 236.98 ? 1.5 : between(t, 237.2, 239.5) ? 2.6 + 0.3 * Math.sin(t * 12) : 0.2, armL: t < 236.98 ? 1.5 : 0.2, legs: t > 235.19 && t < 236.98 ? Math.round(1 + Math.sin(t * 14)) : 1 });
  }
  // soccer: a soft tap, then a real kick
  if (camX > 900) {
    rect(c, X(1150), G + 18, 400, 1, "#e8f4e0");
    const gx = X(1440), nb = t > 245.75 ? Math.exp(-(t - 245.75) * 4) * 6 : 0;
    for (let j = 0; j < 9; j++) for (let k = 0; k < 9; k++) { const yy = G - 30 + j * 4, dy = yy - (G - 12); px(c, gx + 4 + k * 4 + nb * Math.exp(-(dy * dy) / 60), yy, "#c8d0dc"); }
    rect(c, gx, G - 34, 2, 34, "#ffffff"); rect(c, gx + 36, G - 34, 2, 34, "#e8e8e8"); rect(c, gx, G - 34, 38, 2, "#ffffff");
    const runUp = ease(ramp(t, 244.54, 0.5)), px0 = lerp(1200, 1236, runUp), kickSoft = between(t, 242.27, 242.55), kickHard = between(t, 245.11, 245.45);
    person(c, X(px0), G + 16, 2, { shirt: "#e0302a", pants: "#f4f4f4", face: 1, legs: kickSoft ? 2 : kickHard ? 4 : between(t, 244.54, 245.05) ? Math.round(1 + Math.sin(t * 22)) : 1, armL: between(t, 243.8, 244.3) ? 1.8 : 0.3, armR: between(t, 243.8, 244.3) ? 1.8 : kickHard ? 1.4 : -0.3 });
    let bx = 1212, by = G + 12, rot = 0;
    if (t > 242.35) { const d = Math.min(t - 242.35, 1.82); bx = 1212 + 40 * d - 11 * d * d; rot = bx * 0.6; }
    if (t > 245.11) { const d = t - 245.11; const hitT = 0.64; if (d < hitT) { bx = 1248 + 300 * d; by = G + 12 - 40 * d + 30 * d * d; } else { const e = d - hitT; bx = 1440 + 22 * (1 - Math.exp(-e * 6)); by = G + 12 - 40 * hitT + 30 * hitT * hitT + Math.min(10, 40 * e * e); } rot = bx * 0.5; if (d < hitT) for (let k = 1; k < 6; k++) px(c, X(bx) - k * 3, by, "rgba(255,255,255,0.6)"); }
    ballPx(c, X(bx), by, rot);
  }
  // the one thing that never changes speed, crossing the sky as the chunk ends
  if (t > 245.55) { const x = -12 + 480 * (t - 245.55), y = 88; photon(c, x, y, 5, ORANGE, { face: "open", look: [1, 1], wave: 34, waveLen: 13, phase: t * 10, streak: 8 }); L(x, y, 14, "255,190,110", 0.6); }
  // the readout, now reporting ordinary speeds
  const ha = ramp(t, 224.3, 0.4);
  if (ha > 0) {
    c.globalAlpha = ha; lcd(c, 264, 36, 108, 30);
    const rows: [string, boolean][] = [];
    if (t < 228.3) rows.push([t > 227.5 ? "40 M/S" : t > 226.3 ? "12 M/S" : "-- M/S", t > 226.3]);
    else if (t < 234.9) { if (t > 229.2) rows.push(["850 M/S", !between(t, 233.57, 234.1)]); if (t > 230.7) rows.push(["940 M/S", !between(t, 232.86, 233.3)]); }
    else if (t < 240.9) { const v = t > 236.98 ? 0.4 * 16 * (t - 236.98) : t > 235.19 ? 0.4 * 6 * (Math.min(t, 236.98) - 235.19) : 0; rows.push([Math.floor(v) + " M/S", true]); const a = Math.PI + clamp(v / 25) * Math.PI; for (let i = 0; i <= 20; i++) { const aa = Math.PI + (i / 20) * Math.PI; px(c, 280 + Math.cos(aa) * 9, 62 + Math.sin(aa) * 9, "#3a8a5a"); } line(c, 280, 62, 280 + Math.cos(a) * 8, 62 + Math.sin(a) * 8, "#6fff9a"); }
    else rows.push([t > 245.3 ? "30 M/S" : t > 242.5 ? "3 M/S" : "-- M/S", t > 242.5]);
    rows.forEach(([s, on], i) => ptext(c, s, 366, 40 + i * 12, 2, on ? "#6fff9a" : "#2f6a44", "right"));
    c.globalAlpha = 1;
  }
};

// ================================================================ the timeline: scenes, transitions, compositing
type Tr = { kind: "fade" | "slide" | "slideUp" | "iris"; d: number; cx?: number; cy?: number };
type Scene = { a: number; b: number; draw: Draw; enter?: Tr; exit?: Tr; zoom?: (t: number) => [number, number, number, number, number] };
const SCENES: Scene[] = [
  { a: 0, b: 4.2, draw: sKitchen, zoom: zKitchen },
  { a: 3.5, b: 20.1, draw: sCosmos, enter: { kind: "fade", d: 0.65 } },
  { a: 19.3, b: 40.1, draw: sLineup, enter: { kind: "fade", d: 0.8 } },
  { a: 39.3, b: 63.44, draw: sRace, enter: { kind: "fade", d: 0.8 } },
  { a: 63.44, b: 88.2, draw: sAside },
  { a: 86.98, b: 98.4, draw: sMap, enter: { kind: "iris", d: 1.1, cx: 192, cy: 100 }, zoom: zMap },
  { a: 97.8, b: 106.3, draw: sCandle, enter: { kind: "fade", d: 0.55 }, exit: { kind: "slide", d: 0.8 } },
  { a: 105.5, b: 119.0, draw: sCloud, enter: { kind: "slide", d: 0.8 }, exit: { kind: "slide", d: 0.7 } },
  { a: 118.3, b: 126.8, draw: sSun, enter: { kind: "slide", d: 0.7 }, exit: { kind: "slide", d: 0.8 } },
  { a: 126.0, b: 142.2, draw: sBurst, enter: { kind: "slide", d: 0.8 } },
  { a: 141.4, b: 161.5, draw: sCards, enter: { kind: "fade", d: 0.8 } },
  { a: 160.8, b: 183.0, draw: sYet, enter: { kind: "fade", d: 0.7 } },
  { a: 182.4, b: 206.0, draw: sRadar, enter: { kind: "fade", d: 0.6 }, zoom: zRadar },
  { a: 205.3, b: 217.6, draw: sVacuum, enter: { kind: "fade", d: 0.7 }, exit: { kind: "slideUp", d: 1.1 } },
  { a: 216.5, b: T_END + 1, draw: sPark, enter: { kind: "slideUp", d: 1.1 } },
];
type Light = { x: number; y: number; r: number; rgb: string; a: number };
const pixBuf = (env: Env) => cached(env, "lsoPix", () => env.canvas(Math.round(PW * env.scale), Math.round(PH * env.scale)));
const sceneLayer = (env: Env, i: number) => cached(env, `lsoL${i}`, () => env.canvas(Math.round(PW * env.scale), Math.round(PH * env.scale)));

// ================================================================ subtitles (bottom letterbox bar; 2-5 word paraphrases)
const CAPS: [number, string, string?][] = [
  [0.23, "A CANDLE FLAME"], [3.55, "A DISTANT QUASAR"], [9.54, "A GAMMA-RAY BURST"], [13.07, "MORE ENERGY IN SECONDS"], [15.13, "THAN THE SUN EVER MAKES"],
  [18.17, "ALL OF THEM MAKE LIGHT"], [19.61, "EVERY ONE OF THEM"], [21.72, "THE CALM ONES"], [22.83, "THE VIOLENT ONES"], [24.72, "THE FAINT ONES"], [28.25, "THE ENERGETIC ONES"],
  [31.37, "THE SAME SPEED"], [35.78, "NOT APPROXIMATELY"], [38.3, "EXACTLY", YEL],
  [39.88, "FROM YOUR CANDLE"], [46.42, "AND AN ANCIENT ONE"], [50.91, "13 BILLION YEARS"], [52.68, "NOTHING PUSHES THEM"], [54.09, "NOTHING SPEEDS THEM UP"],
  [56.59, "NEVER SLOW"], [57.37, "NEVER FAST"], [58.84, "ONE SPEED ONLY"], [61.46, "THE QUESTION IS WHY?", YEL],
  [63.44, "ONE QUICK THING"], [66.19, "LOVE DEEP EXPLORATION?"], [70.06, "LIKE & SUBSCRIBE"], [71.6, "IT HELPS US GROW"], [73.89, "SMALL FOR YOU"], [76.66, "HUGE FOR ME", YEL],
  [78.69, "NOW ON SPOTIFY"], [81.39, "LINKS BELOW"], [86.13, "NOW"], [86.98, "LET US BEGIN"],
  [88.08, "HOW STRANGE IS THIS?"], [92.42, "EVERY SOURCE OF LIGHT"], [94.88, "ENTIRELY DIFFERENT RULES"], [97.65, "A CANDLE: CHEMISTRY"], [102.45, "ABOUT 1,500 DEGREES"],
  [105.85, "A COLD HYDROGEN ATOM"], [111.14, "AN ELECTRON DROPS"], [113.48, "TWO QUANTUM LEVELS"], [115.61, "A SLIVER OF RADIO"],
  [118.85, "THE SUN: FUSION"], [122.4, "CORE TEMPERATURE"], [124.41, "15 MILLION DEGREES"],
  [126.19, "A GAMMA-RAY BURST"], [128.73, "MOST VIOLENT EVER DETECTED"], [132.41, "SO MUCH ENERGY"], [135.91, "ONE SINGLE PHOTON"], [137.27, "COULD RIP A HOLE"], [138.61, "THROUGH THE STRONGEST METAL"],
  [141.92, "NOT VARIATIONS ON A THEME"], [144.62, "RADICALLY DIFFERENT"], [147.8, "DIFFERENT REACTANTS"], [149.93, "DIFFERENT TEMPERATURES"], [152.41, "ENERGY PER PHOTON"], [154.29, "DIFFERS BY TRILLIONS"], [156.54, "DISTINCT MECHANISMS"],
  [160.91, "AND YET"], [161.66, "EACH MAKES A PHOTON"], [167.22, "EXACTLY THE SAME SPEED"], [171.09, "NOT APPROXIMATELY"], [173.65, "NOT STATISTICALLY"], [175.82, "EXACTLY", YEL], [177.99, "TO EVERY DECIMAL PLACE"],
  [182.97, "YOUR CANDLE PHOTON"], [185.85, "299,792,458 M/S", YEL], [193.98, "SO IS THE GAMMA RAY"], [197.21, "SO IS THE RADIO PHOTON"], [201.88, "AND EVERY SCREEN"],
  [205.93, "IN VACUUM"], [207.34, "ALL THE SAME SPEED"], [209.71, "NO FAST PHOTONS"], [212.06, "NO SLOW PHOTONS"], [214.37, "ONLY PHOTONS, MOVING"],
  [216.88, "HOW STRANGE IS THAT?"], [220.87, "EVERYTHING ELSE IN NATURE"], [224.12, "THROW A BASEBALL"], [226.62, "HARDER MEANS FASTER"], [228.54, "FIRE DIFFERENT RIFLES"], [231.6, "MUZZLE SPEEDS VARY"],
  [235.19, "PUSH A CAR"], [236.98, "SPEED CLIMBS GRADUALLY"], [241.05, "KICK IT SOFTLY"], [243.12, "IT DRIFTS"], [244.54, "KICK IT HARD"], [246.09, "IT ROCKETS", YEL],
];
// the constant writes itself on in step with the narrator: 299, / 792, / 458 / M/S
const NUMBER_PROGRESS = (t: number) => { const n = 15; const k = t < 186.9 ? 4 * ramp(t, 185.85, 1.05) : t < 188.35 ? 4 + 4 * ramp(t, 187.2, 1.15) : t < 190.53 ? 8 + 3 * ramp(t, 188.6, 1.25) : 11 + 4 * ramp(t, 190.53, 0.8); return k / n; };

// ================================================================ draw
const draw = (ctx: Ctx, frame: number, env: Env) => {
  const t = frame / FPS, sc = env.scale, g = new Gfx(ctx, env, frame, FLAT);
  const P = pixBuf(env), pc = P.ctx; pc.setTransform(sc, 0, 0, sc, 0, 0); pc.imageSmoothingEnabled = false; pc.globalAlpha = 1; pc.globalCompositeOperation = "source-over"; pc.fillStyle = "#05040a"; pc.fillRect(0, 0, PW, PH);
  const lights: Light[] = [];
  SCENES.forEach((S, i) => {
    if (t < S.a || t >= S.b) return;
    let alpha = 1, dx = 0, dy = 0, iris = -1;
    if (S.enter) { const e = ramp(t, S.a, S.enter.d); if (S.enter.kind === "fade") alpha = e; if (S.enter.kind === "slide") dx = PW * (1 - ease(e)); if (S.enter.kind === "slideUp") dy = PH * (1 - ease(e)); if (S.enter.kind === "iris" && e < 1) iris = ease(e) * 300; }
    if (S.exit) { const e = ramp(t, S.b - S.exit.d, S.exit.d); if (S.exit.kind === "slide") dx -= PW * ease(e); if (S.exit.kind === "slideUp") dy -= PH * ease(e); }
    dx = Math.round(dx); dy = Math.round(dy);
    const [z, fx, fy, gx, gy] = S.zoom ? S.zoom(t) : [1, 0, 0, 0, 0];
    let x0 = fx - gx / z, y0 = fy - gy / z; const sw = PW / z, sh = PH / z; x0 = clamp(x0, 0, PW - sw); y0 = clamp(y0, 0, PH - sh);
    const Lf: LightFn = (x, y, r, rgb, a) => { if (a <= 0) return; const X = (x - x0) * z + dx, Y = (y - y0) * z + dy; if (iris >= 0 && Math.hypot(X - (S.enter?.cx ?? 0), Y - (S.enter?.cy ?? 0)) > iris) return; lights.push({ x: X, y: Y, r: r * z, rgb, a: a * alpha }); };
    const Ly = sceneLayer(env, i), lc = Ly.ctx;
    lc.setTransform(1, 0, 0, 1, 0, 0); lc.globalAlpha = 1; lc.globalCompositeOperation = "source-over"; lc.clearRect(0, 0, Math.round(PW * sc), Math.round(PH * sc));
    lc.setTransform(sc, 0, 0, sc, 0, 0); lc.imageSmoothingEnabled = false;
    S.draw(lc, t, Lf, env);
    pc.save(); pc.globalAlpha = alpha;
    if (iris >= 0) clipCircle(pc, S.enter!.cx!, S.enter!.cy!, Math.max(0.5, iris));
    pc.drawImage(Ly.canvas as CanvasImageSource, x0 * sc, y0 * sc, sw * sc, sh * sc, dx, dy, PW, PH);
    pc.restore();
  });
  // blow the pixel world up to 1080p, crisp
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(P.canvas as CanvasImageSource, 0, 0, Math.round(PW * sc), Math.round(PH * sc), 0, 0, Math.round(W * sc), Math.round(H * sc)); ctx.restore();
  ctx.setTransform(sc, 0, 0, sc, 0, 0); ctx.imageSmoothingEnabled = true;
  // full-resolution bloom on every light source (pixel world, cinematic light)
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  for (const l of lights) { if (l.a <= 0.01 || l.r <= 0) continue; const X = l.x * PIX, Y = l.y * PIX, R = l.r * PIX, gr = ctx.createRadialGradient(X, Y, 0, X, Y, R); gr.addColorStop(0, `rgba(${l.rgb},${(0.42 * Math.min(1, l.a)).toFixed(3)})`); gr.addColorStop(0.35, `rgba(${l.rgb},${(0.14 * Math.min(1, l.a)).toFixed(3)})`); gr.addColorStop(1, `rgba(${l.rgb},0)`); ctx.fillStyle = gr; ctx.fillRect(X - R, Y - R, 2 * R, 2 * R); }
  ctx.restore();
  // vignette, then the 2.39:1 letterbox
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, W * 0.62); vg.addColorStop(0, "rgba(4,3,10,0)"); vg.addColorStop(1, "rgba(4,3,10,0.5)"); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#05040a"; ctx.fillRect(0, 0, W, 140); ctx.fillRect(0, 940, W, 140);
  // subtitles, written on stroke by stroke in the bottom bar
  const words: (() => void)[] = [];
  CAPS.forEach(([t0, s, col], i) => {
    const tn = CAPS[i + 1]?.[0] ?? T_END + 5; if (t < t0 - 0.02 || t > tn) return;
    const prog = s.startsWith("299") ? NUMBER_PROGRESS(t) : ramp(t, t0, Math.min(0.5, 0.05 + s.length * 0.022)), op = 1 - ramp(t, tn - 0.24, 0.2);
    if (op <= 0) return;
    words.push(() => text(g, s, W / 2, 974, { cap: 34, color: col ?? CREAM, align: "center", progress: prog, opacity: op, w: 3.6 }));
  });
  g.group("plain", () => words.forEach((f) => f()));
};

export const lightSpeedOpus: Film = {
  meta: { title: "lightSpeedOpus", W, H, fps: FPS, bpm: 120, durationFrames: DURATION },
  assets: { images: {} },
  shots: [{ id: "lightSpeedOpus", start: 0, end: DURATION, draw }],
};
