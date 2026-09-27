import { Gfx, rng, type Ctx, type Env, type P } from "./core";
import { Film } from "./film";
import { clamp, lerp } from "./gallery";
import {
  W, H, FPS, CREAM, YEL, RED, GREEN, DIM, FLAT, ease, easeOut, ramp, span,
  cached, text, motes,
} from "./spaceStyle";

// LIGHT SPEED · one continuous 246.4 s shot, cinematic pixel-art, timed to the narration audio
// (silence-gap detection + cumulative word-fraction, snapped to real pauses -- see storyboard below).
// Everything is drawn at a small pixel-native resolution (384x216) and blown up 5x with no smoothing,
// so the whole picture reads as a hand-pixelled scene; text, bloom, grain and vignette sit on top at
// full resolution -- the "HD-2D" trick: pixel world, cinematic light over it.
//
//   0.0-18.2   three utterly different sources of light: a candle, a quasar, a collapsing star's burst
//  18.2-43.5   every one of those photons -- calm, violent, faint, savage -- lines up at ONE speed
//  43.5-65.8   a candle's photon races a photon 13 billion years old; neither ever speeds or slows; WHY?
//  65.8-92.4   (a quick aside: like, subscribe, Spotify, links below) -- then: let's begin
//  92.4-143.7  four sources, four totally different mechanisms: chemical candle, quantum atom, fusing
//              sun, gamma-ray burst tearing metal -- not variations on a theme, radically different
// 143.7-161.5  every number about them disagrees: reactants, temperatures, energies by trillions
// 161.5-201.9  and yet each one's photon is exactly, decimally, 299,792,458 m/s -- every single time
// 201.9-214.4  in vacuum there are no fast photons and no slow photons, only photons, moving
// 214.4-246.4  contrast: a thrown ball, a fired bullet, a rolling car, a kicked ball -- ALL vary with
//              their source. Kicked softly it drifts; kicked hard, it rockets. Light never does.

const DURATION = 7392; // 246.40 s (audio 246.413 s)
const C: P = [960, 540];

// ---------------------------------------------------------------- narration cues (s), snapped to real pauses
const CUE = {
  candle: 0.0, quasar: 3.35, grbStar: 9.27, grbEnergy: 12.45, allProduce: 18.17,
  everyPhoton: 19.6, calm: 21.47, violent: 22.61, faint: 23.97, energetic: 27.19,
  travels: 33.81, notApprox1: 35.77, exactly1: 39.62, raceStart: 43.5,
  nothingPushes: 54.09, nothingAccel: 56.09, neverSlow: 58.8, neverFast: 61.01,
  onlySpeed: 63.43, whyQ: 64.01, beforeGoFurther: 65.8, ifYouFind: 69.46,
  likeSub: 71.6, smallThing: 73.89, hugeDiff: 75.74, spotify: 81.39, linksDesc: 84.95,
  now: 88.04, letsBegin: 92.42, considerStrange: 94.88, everySource: 97.65,
  candleChem: 101.46, hydrogenAtom: 105.83, radioSliver: 115.61, sunFusion: 118.85,
  grbAgain: 126.19, grbViolentEvents: 128.03, grbRipHole: 132.41, notVariations: 143.74,
  radicallyDiff: 147.8, reactants: 149.93, temperatures: 152.14, energiesTrillions: 156.54,
  mechanisms: 158.23, andYet: 161.48, momentEach: 165.42, emergesExactly: 167.22,
  notApprox2: 173.65, notStat: 175.82, exactly2: 177.99, decimalPlaces: 180.11,
  numberReveal: 182.97, soGrb: 190.51, soHydrogen: 193.97, soScreen: 197.2,
  vacuum: 201.88, allMoveSame: 205.92, noFast: 207.1, noSlow: 209.71, onlyMoving: 212.06,
  appreciateStrange: 214.37, thinkNature: 216.88, baseball: 220.38, bullet: 225.31,
  car: 235.19, soccerSoft: 241.05, soccerHard: 243.12, end: 246.413,
};
type CueKey = keyof typeof CUE;
const at = (k: CueKey) => CUE[k];

// ---------------------------------------------------------------- pixel-native canvas (blown up 5x, no smoothing)
const PW = 384, PH = 216, PIX = W / PW; // 5
const pixBuf = (env: Env) => cached(env, "lsPix", () => env.canvas(Math.round(PW * env.scale), Math.round(PH * env.scale)));
const blitPixels = (ctx: Ctx, env: Env, L: { canvas: unknown }) => {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(L.canvas as CanvasImageSource, 0, 0, Math.round(PW * env.scale), Math.round(PH * env.scale), 0, 0, Math.round(W * env.scale), Math.round(H * env.scale));
  ctx.imageSmoothingEnabled = true; ctx.restore();
};

// ---------------------------------------------------------------- palette (colour-codes every photon source, kept all the way through)
const CANDLE = ["#4a1f10", "#c14b1f", "#ff8a2e", "#ffd27a"], CANDLE_HOT = "#fff2c2";
const QUASAR = ["#1a1240", "#5a2e9e", "#9c6bf0", "#d8c8ff"], QUASAR_HOT = "#f4ecff";
const GRB = ["#241033", "#6a2ea8", "#b487ff", "#f2eaff"], GRB_HOT = "#ffffff";
const HAT = ["#0c2b3a", "#125a72", "#1fa3c9", "#a8ecff"]; // hydrogen atom / radio photon (cyan)
const SUN = ["#3a1408", "#a8390f", "#ff9a2e", "#ffe19a"];
const SCREEN = ["#0a1030", "#1c3f9e", "#3a7bff", "#bfe0ff"];
const SPACE_BG0 = "#0c0a1c", SPACE_BG1 = "#1c1638", STAR = "#cfd0ff";
const GROUND = "#122018", SKY0 = "#2a3a6a", SKY1 = "#0e1330";

// ---------------------------------------------------------------- tiny deterministic helpers
const flicker = (seed: number, t: number, n = 3) => { let s = 0; for (let i = 0; i < n; i++) s += Math.sin(t * (5 + i * 3.3) + seed * i * 1.7) / n; return s; };
const px = (v: number) => Math.round(v); // snap to the pixel grid so flats don't shimmer between frames

// a small filled circle in low-res space (a "pixel" of light)
const dot = (c: Ctx, x: number, y: number, r: number, color: string, a = 1) => { if (a <= 0 || r <= 0) return; c.globalAlpha = a; c.fillStyle = color; c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill(); c.globalAlpha = 1; };
// a soft low-res bloom (quantises into visible bands once blown up -- exactly the pixel-art "glow" look)
const bloom = (c: Ctx, x: number, y: number, r: number, rgb: string, a: number) => { if (a <= 0 || r <= 0) return; const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(0.5, `rgba(${rgb},${a * 0.4})`); g.addColorStop(1, `rgba(${rgb},0)`); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); };
// a banded "pixel planet" -- flat colour steps, like `ball()` but tuned for the small canvas
const pball = (c: Ctx, x: number, y: number, r: number, bands: string[], a = 1) => {
  r = Math.max(0, r); if (r < 0.4 || a <= 0) return; c.save(); c.globalAlpha = a;
  c.fillStyle = bands[0]; c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill();
  [[0.72, 0.16], [0.48, 0.3], [0.24, 0.42]].forEach(([k, off], i) => { c.fillStyle = bands[Math.min(3, i + 1)]; c.beginPath(); c.arc(x - r * off, y - r * off, Math.max(0, r * k), 0, 6.283); c.fill(); });
  c.restore();
};
// a speed gauge: needle angle is the ONLY thing that ever changes speed on screen
const gauge = (c: Ctx, cx: number, cy: number, r: number, frac: number, color: string, a = 1) => {
  if (a <= 0) return; frac = clamp(frac); const a0 = Math.PI * 0.78, a1 = Math.PI * 0.22;
  c.save(); c.globalAlpha = a * 0.7; c.fillStyle = "#0a0816"; c.beginPath(); c.arc(cx, cy, r + 5, 0, 6.283); c.fill(); c.globalAlpha = a; c.lineCap = "round";
  c.strokeStyle = "#0c0a1c"; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, r, a0, a1); c.stroke();
  c.strokeStyle = "#4a4370"; c.lineWidth = 1.4; c.beginPath(); c.arc(cx, cy, r, a0, a1); c.stroke();
  for (let i = 0; i <= 8; i++) { const a2 = a0 + (a1 - a0) * (i / 8); c.strokeStyle = i / 8 <= frac ? color : "#4a4370"; c.lineWidth = 1.6; c.beginPath(); c.moveTo(cx + Math.cos(a2) * (r - 3), cy + Math.sin(a2) * (r - 3)); c.lineTo(cx + Math.cos(a2) * (r + 2), cy + Math.sin(a2) * (r + 2)); c.stroke(); }
  const na = a0 + (a1 - a0) * frac; c.strokeStyle = color; c.lineWidth = 2; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(na) * (r - 5), cy + Math.sin(na) * (r - 5)); c.stroke();
  c.fillStyle = color; c.beginPath(); c.arc(cx, cy, 2, 0, 6.283); c.fill(); c.restore();
};

// ---------------------------------------------------------------- backgrounds (kitchen / deep space / park)
const drawKitchen = (c: Ctx, t: number, a: number) => {
  if (a <= 0) return; c.save(); c.globalAlpha = a;
  c.fillStyle = "#0a0812"; c.fillRect(0, 0, PW, PH);
  c.fillStyle = "#120f1e"; c.fillRect(0, 150, PW, PH - 150); // counter
  c.fillStyle = "#1a1630"; c.fillRect(0, 146, PW, 4);
  c.fillStyle = "#181234"; c.fillRect(260, 20, 90, 110); // window
  c.fillStyle = "#241c46"; c.fillRect(266, 26, 78, 98);
  for (let i = 0; i < 10; i++) { const sx = 270 + ((i * 37 + t * 2) % 80), sy = 30 + ((i * 19) % 90); dot(c, sx, sy, 0.7, "#8f89c9", 0.5); }
  c.strokeStyle = "#120f1e"; c.lineWidth = 4; c.strokeRect(258, 18, 94, 114);
  c.restore();
};
const NEBULAE = (() => { const r = rng(6060), out: { x: number; y: number; r: number; rgb: string }[] = []; const rgbs = ["120,90,190", "60,110,150", "150,70,110"]; for (let i = 0; i < 7; i++) out.push({ x: r() * PW, y: r() * PH * 0.8, r: 40 + r() * 70, rgb: rgbs[i % rgbs.length] }); return out; })();
const drawSpace = (c: Ctx, t: number, a: number, warm = 0) => {
  if (a <= 0) return; c.save(); c.globalAlpha = a;
  const g = c.createLinearGradient(0, 0, 0, PH); g.addColorStop(0, SPACE_BG1); g.addColorStop(1, SPACE_BG0); c.fillStyle = g; c.fillRect(0, 0, PW, PH);
  NEBULAE.forEach((n) => bloom(c, n.x, n.y, n.r, n.rgb, a * 0.16));
  if (warm > 0) { c.globalAlpha = a * warm * 0.3; c.fillStyle = "#3a1f10"; c.fillRect(0, 0, PW, PH); c.globalAlpha = a; }
  const r = rng(909);
  for (let i = 0; i < 260; i++) { const x = r() * PW, y = r() * PH, s = r() * r() * 1.6 + 0.3, tw = 0.4 + 0.6 * Math.sin(t * (0.6 + r() * 2) + i); c.globalAlpha = a * clamp(tw) * 0.8; c.fillStyle = i % 9 === 0 ? "#ffd9b0" : STAR; c.fillRect(px(x), px(y), 1, 1); if (s > 1.5) c.fillRect(px(x) - 1, px(y), 3, 1); }
  c.restore();
};
const drawPark = (c: Ctx, t: number, a: number) => {
  if (a <= 0) return; c.save(); c.globalAlpha = a;
  const g = c.createLinearGradient(0, 0, 0, 150); g.addColorStop(0, SKY1); g.addColorStop(1, SKY0); c.fillStyle = g; c.fillRect(0, 0, PW, 150);
  c.fillStyle = "#fff2c2"; c.beginPath(); c.arc(320, 40, 14, 0, 6.283); c.fill(); bloom(c, 320, 40, 30, "255,230,170", 0.4);
  c.fillStyle = GROUND; c.fillRect(0, 150, PW, PH - 150); c.fillStyle = "#0c1a10"; c.fillRect(0, 150, PW, 3);
  const r = rng(313); for (let i = 0; i < 14; i++) { const x = (r() * PW + t * 3) % PW; c.fillStyle = "#0c1a10"; c.fillRect(px(x), 148, 2, 4); }
  c.restore();
};
// the ONE background pass per frame -- kitchen -> deep space -> park, crossfading by alpha so no
// later act's opaque fill can stomp an earlier act's foreground within the same frame
const drawBackground = (c: Ctx, t: number) => {
  drawKitchen(c, t, clamp(1 - ramp(t, at("quasar") - 0.6, 1.2)));
  drawSpace(c, t, clamp(span(t, at("quasar") - 0.9, at("appreciateStrange") - 0.6, 1.3)), clamp(1 - ramp(t, at("grbEnergy"), 3)));
  drawPark(c, t, clamp(ramp(t, at("appreciateStrange") - 0.9, 1.3)));
};

// ================================================================ ACT 1 -- three sources of light (0 - 18.2s)
const candleFlame = (c: Ctx, x: number, y: number, t: number, a: number) => {
  if (a <= 0) return; const fl = flicker(3, t, 3), h = 20 + fl * 3;
  c.save(); c.globalAlpha = a;
  bloom(c, x, y - h * 0.4, 46 + fl * 4, "255,170,70", 0.55);
  c.fillStyle = "#3a2418"; c.fillRect(x - 3, y, 6, 14); // candle body
  c.fillStyle = "#e8dcc0"; c.fillRect(x - 1, y - 4, 2, 5); // wick
  c.fillStyle = CANDLE[1]; c.beginPath(); c.ellipse(x, y - h * 0.45, 7 + fl, h * 0.5, 0, 0, 6.283); c.fill();
  c.fillStyle = CANDLE[2]; c.beginPath(); c.ellipse(x, y - h * 0.4, 4.4 + fl * 0.6, h * 0.34, 0, 0, 6.283); c.fill();
  c.fillStyle = CANDLE_HOT; c.beginPath(); c.ellipse(x, y - h * 0.28, 1.8, h * 0.16, 0, 0, 6.283); c.fill();
  c.restore();
};
const drawQuasar = (c: Ctx, x: number, y: number, t: number, a: number) => {
  if (a <= 0) return; c.save(); c.globalAlpha = a;
  bloom(c, x, y, 74, "160,110,240", 0.5);
  // relativistic jets, up and down the rotation axis
  for (const d of [-1, 1]) { const g2 = c.createLinearGradient(x, y, x, y + d * 90); g2.addColorStop(0, "rgba(210,190,255,0.9)"); g2.addColorStop(1, "rgba(210,190,255,0)"); c.fillStyle = g2; c.fillRect(x - 2, y, 4, d * 90); }
  c.save(); c.translate(x, y); c.rotate(0.18); c.scale(1, 0.3);
  const disk = c.createRadialGradient(0, 0, 2, 0, 0, 46); disk.addColorStop(0, QUASAR_HOT); disk.addColorStop(0.3, QUASAR[3]); disk.addColorStop(0.65, QUASAR[2]); disk.addColorStop(1, "rgba(90,46,158,0)");
  c.fillStyle = disk; c.beginPath(); c.arc(0, 0, 46, 0, 6.283); c.fill(); c.restore();
  dot(c, x, y, 4, QUASAR_HOT, 1);
  c.restore();
};
const drawCollapsingStar = (c: Ctx, x: number, y: number, t: number, collapse: number, burst: number, a: number) => {
  if (a <= 0) return; c.save(); c.globalAlpha = a;
  const r = Math.max(0.5, 34 * (1 - 0.94 * ease(collapse)));
  if (collapse < 1) { bloom(c, x, y, r * 2.4, "255,160,80", 0.35); pball(c, x, y, r + flicker(9, t) * 1.5, SUN, 1); }
  if (burst > 0) {
    bloom(c, x, y, 130 * easeOut(burst), "230,210,255", 0.75 * (1 - burst));
    for (const d of [-1, 1]) { const len = 140 * easeOut(burst); const g2 = c.createLinearGradient(x, y, x, y + d * len); g2.addColorStop(0, GRB_HOT); g2.addColorStop(0.4, "rgba(210,180,255,0.85)"); g2.addColorStop(1, "rgba(210,180,255,0)"); c.fillStyle = g2; c.fillRect(x - (5 - 3 * burst), y, 10 - 6 * burst, d * len); }
    dot(c, x, y, Math.max(0, 5 * (1 - burst) + 2), GRB_HOT, 1);
  }
  c.restore();
};
const act1 = (c: Ctx, t: number, env: Env) => {
  const kA = clamp(1 - ramp(t, at("quasar") - 0.6, 1.2));
  if (kA > 0) { candleFlame(c, 128, 172, t, kA); if (t > 1.0) { const sp = ramp(t, 1.0, 2.0); dot(c, 128, 172 - 18 - sp * 90, Math.max(0, 1.6 * (1 - sp)), CANDLE_HOT, kA * (1 - sp)); } }
  const qA = clamp(span(t, at("quasar") - 0.2, at("grbStar") + 0.4, 1.0));
  if (qA > 0) drawQuasar(c, 300, 70, t, qA * (1 - 0.3 * clamp(ramp(t, at("grbStar"), 0.6))));
  const starA = clamp(span(t, at("grbStar") - 0.3, at("allProduce") + 0.6, 0.7));
  if (starA > 0) { const collapse = clamp(ramp(t, at("grbEnergy") - 0.4, 2.6)), burst = clamp(span(t, at("grbEnergy") + 2.0, at("allProduce") + 1.0, 0.6)); drawCollapsingStar(c, 96, 130, t, collapse, burst, starA); }
  // "produces light" -- all three line up as small icons, beams reaching the viewer
  const allA = clamp(span(t, at("allProduce") - 0.3, at("everyPhoton") + 0.4, 0.6));
  if (allA > 0) {
    [[70, CANDLE[2]], [192, QUASAR[3]], [314, GRB_HOT]].forEach(([x, col]) => { const xn = x as number; bloom(c, xn, 150, 30, "255,240,220", 0.3 * allA); dot(c, xn, 150, 5, col as string, allA); const g2 = c.createLinearGradient(xn, 150, C[0] / PIX, 205); g2.addColorStop(0, "rgba(255,241,220,0.55)"); g2.addColorStop(1, "rgba(255,241,220,0)"); c.save(); c.globalAlpha = allA; c.strokeStyle = g2 as unknown as string; c.lineWidth = 2; c.beginPath(); c.moveTo(xn, 150); c.lineTo(C[0] / PIX, 205); c.stroke(); c.restore(); });
  }
};

// ================================================================ ACT 2 -- every one of these photons (18.2 - 43.5s)
type Beam = { x0: number; y: number; color: string; hot: string; spike?: boolean; dim?: boolean; crack?: boolean };
const BEAMS: Beam[] = [
  { x0: 40, y: 70, color: CANDLE[2], hot: CANDLE_HOT }, // calm
  { x0: 40, y: 104, color: GRB[2], hot: GRB_HOT, spike: true }, // violent
  { x0: 40, y: 138, color: HAT[2], hot: HAT[3], dim: true }, // faint
  { x0: 40, y: 172, color: "#e9e9ff", hot: "#ffffff", crack: true }, // energetic
];
const act2 = (c: Ctx, t: number, env: Env) => {
  const a = clamp(span(t, at("everyPhoton") - 0.4, at("raceStart") + 1.0, 0.8)); if (a <= 0) return;
  const grid = clamp(span(t, at("travels") - 0.3, at("exactly1") + 2.0, 0.6));
  if (grid > 0) { c.save(); c.globalAlpha = a * grid * 0.35; c.strokeStyle = "#3a355f"; c.lineWidth = 1; for (let x = 20; x < PW; x += 24) { c.beginPath(); c.moveTo(x, 55); c.lineTo(x, 190); c.stroke(); } c.restore(); }
  const moving = t >= at("travels");
  const vx = 46; // px/s in low-res space -- identical for every single one, forever
  BEAMS.forEach((b, i) => {
    const showT = [at("calm"), at("violent"), at("faint"), at("energetic")][i];
    const bA = clamp(ramp(t, showT, 0.5)) * a; if (bA <= 0) return;
    const x = moving ? b.x0 + vx * (t - at("travels")) : b.x0;
    if (x > PW + 10) return;
    const alpha = b.dim ? bA * (0.35 + 0.15 * Math.sin(t * 6)) : bA;
    if (moving) for (let k = 1; k <= 3; k++) { const gx = x - k * 20; if (gx > 20) dot(c, gx, b.y, 1.3, b.color, alpha * (0.22 - k * 0.05)); } // strobe trail = equal spacing = equal speed
    if (b.spike) { c.save(); c.globalAlpha = alpha; c.strokeStyle = b.color; c.lineWidth = 1; for (let s = 0; s < 6; s++) { const ang = s * 1.047 + t * 3; c.beginPath(); c.moveTo(x, b.y); c.lineTo(x + Math.cos(ang) * 6, b.y + Math.sin(ang) * 6); c.stroke(); } c.restore(); }
    bloom(c, x, b.y, b.crack ? 12 : 8, "255,240,220", alpha * 0.4);
    dot(c, x, b.y, b.crack ? 3 : 2.2, b.hot, alpha);
    if (b.crack && t > at("energetic") && t < at("energetic") + 1.4) { const p = ramp(t, at("energetic") + 0.2, 0.5); dot(c, x - 6 - p * 5, b.y - 4 - p * 4, 1.6, RED, alpha * (1 - p)); dot(c, x + 6 + p * 5, b.y + 4 + p * 4, 1.6, "#8f6cf0", alpha * (1 - p)); }
  });
  // precision caliper on "not approximately" / "exactly"
  const cal = clamp(span(t, at("notApprox1") - 0.2, at("raceStart") - 0.3, 0.5));
  if (cal > 0) { const x1 = BEAMS[0].x0 + vx * (t - at("travels")), x2 = BEAMS[3].x0 + vx * (t - at("travels")); c.save(); c.globalAlpha = a * cal * 0.8; c.strokeStyle = YEL; c.lineWidth = 1; [x1, x2].forEach((x) => { c.beginPath(); c.moveTo(x, 46); c.lineTo(x, 56); c.stroke(); }); c.beginPath(); c.moveTo(x1, 51); c.lineTo(x2, 51); c.stroke(); c.restore(); }
  const snap = clamp(1 - ramp(t, at("exactly1"), 0.5));
  if (t > at("exactly1") - 0.15 && snap > 0) bloom(c, PW / 2, 130, 160 * snap, "255,246,225", 0.5 * snap);
};

// ================================================================ ACT 3 -- the race, and WHY? (43.5 - 65.8s)
const act3 = (c: Ctx, t: number, env: Env) => {
  const a = clamp(span(t, at("raceStart") - 0.3, at("beforeGoFurther") + 0.5, 0.9)); if (a <= 0) return;
  const dim = 1 - 0.55 * clamp(ramp(t, at("whyQ") - 0.3, 1.2));
  // starfield tunnel streaks selling motion through space
  const r = rng(1212); c.save(); c.globalAlpha = a * dim * 0.5;
  for (let i = 0; i < 40; i++ ) { const y = 30 + r() * 156, sp = 30 + r() * 70, x = ((r() * PW * 2 + t * sp) % (PW + 60)) - 40; c.strokeStyle = "#8f89c9"; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 10, y); c.stroke(); }
  c.restore();
  const tr = clamp(t - at("raceStart")), vx = 46;
  const cx = clamp(20 + vx * tr, 20, PW - 30), ax = clamp(300 - vx * tr * 0.15, 40, 300); // candle photon runs forward; ancient one is already mid-flight, barely moving in-frame at this zoom
  bloom(c, cx, 92, 10, "255,220,170", a * dim * 0.5); dot(c, cx, 92, 2.6, CANDLE_HOT, a * dim);
  bloom(c, ax, 150, 12, "220,200,255", a * dim * 0.55); dot(c, ax, 150, 2.8, GRB_HOT, a * dim);
  // no engine, no push: a crossed-out thrust icon
  const noPush = clamp(span(t, at("nothingPushes") - 0.2, at("onlySpeed") + 1.0, 0.5));
  if (noPush > 0) { c.save(); c.globalAlpha = a * dim * noPush * 0.8; c.strokeStyle = DIM; c.lineWidth = 1.4; c.beginPath(); c.moveTo(cx - 10, 92); c.lineTo(cx - 4, 88); c.lineTo(cx - 4, 96); c.closePath(); c.stroke(); c.beginPath(); c.moveTo(cx - 14, 84); c.lineTo(cx, 100); c.stroke(); c.restore(); }
  // the gauge: pinned, forever, on both lanes
  const gA = clamp(ramp(t, at("nothingPushes") - 0.3, 0.6)) * a * dim;
  gauge(c, 340, 30, 20, 0.92, CANDLE[2], gA); gauge(c, 340, 190, 20, 0.92, GRB[3], gA);
  // WHY -- everything else settles, the question mark pulses
  const whyA = clamp(ramp(t, at("whyQ") - 0.2, 0.6)) * (1 - clamp(ramp(t, at("beforeGoFurther") - 0.1, 0.5)));
  if (whyA > 0) { const pulse = 0.5 + 0.5 * Math.sin(t * 4); bloom(c, PW / 2, PH / 2, 60 + pulse * 10, "255,246,225", whyA * 0.35); }
};

// ================================================================ ACT 4 -- sponsor aside (65.8 - 92.4s)
const act4 = (c: Ctx, t: number, env: Env) => {
  const a = clamp(span(t, at("beforeGoFurther") - 0.3, at("letsBegin") + 0.9, 0.8)); if (a <= 0) return;
  const bob = Math.sin(t * 2) * 3;
  // like: a simple pixel thumbs-up
  const likeA = clamp(span(t, at("ifYouFind") - 0.2, at("smallThing") + 1.4, 0.6));
  if (likeA > 0) { const x = 110, y = 100 + bob; c.save(); c.globalAlpha = a * likeA; c.fillStyle = YEL; c.fillRect(x - 6, y - 2, 12, 16); c.fillRect(x - 12, y - 10, 8, 10); c.fillRect(x - 9, y - 16, 5, 8); c.strokeStyle = "#8a6a12"; c.lineWidth = 1; c.strokeRect(x - 6, y - 2, 12, 16); c.restore(); }
  // subscribe: a small ringing bell
  const bellA = clamp(span(t, at("likeSub") - 0.2, at("hugeDiff") + 1.2, 0.6));
  if (bellA > 0) { const x = 192, y = 100 + bob, wig = Math.sin(t * 10) * 4; c.save(); c.globalAlpha = a * bellA; c.translate(x, y); c.rotate(wig * 0.02); c.fillStyle = "#ffd166"; c.beginPath(); c.moveTo(-8, 6); c.quadraticCurveTo(-8, -10, 0, -10); c.quadraticCurveTo(8, -10, 8, 6); c.closePath(); c.fill(); c.fillRect(-2, 6, 4, 4); c.restore(); }
  // Spotify-ish: bouncing equaliser bars
  const eqA = clamp(span(t, at("spotify") - 0.2, at("linksDesc") + 1.0, 0.6));
  if (eqA > 0) { const x = 274, y = 108; c.save(); c.globalAlpha = a * eqA; c.fillStyle = GREEN; for (let i = 0; i < 4; i++) { const h = 6 + 8 * (0.5 + 0.5 * Math.sin(t * 6 + i * 1.4)); c.fillRect(x + i * 6 - 12, y - h / 2, 4, h); } c.restore(); }
  // links: an arrow pointing down
  const arrA = clamp(span(t, at("linksDesc") - 0.2, at("now") + 0.6, 0.6));
  if (arrA > 0) { const x = 192, y = 150 + Math.sin(t * 3) * 3; c.save(); c.globalAlpha = a * arrA; c.strokeStyle = CREAM; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y - 12); c.lineTo(x, y + 6); c.moveTo(x - 5, y); c.lineTo(x, y + 6); c.lineTo(x + 5, y); c.stroke(); c.restore(); }
  // let's begin: an iris opens toward the next act (drawn as a growing dark ring closing OUT, revealing space beneath, which is already the bg -- reads as a lens iris)
  const iris = clamp(ramp(t, at("letsBegin") - 0.3, 1.1));
  if (iris > 0 && iris < 1) { c.save(); c.globalAlpha = a; c.fillStyle = "#05040a"; c.beginPath(); c.rect(0, 0, PW, PH); c.arc(PW / 2, PH / 2, 260 * iris, 0, 6.283, true); c.fill("evenodd" as CanvasFillRule); c.restore(); }
};

// ================================================================ ACT 5 -- four sources, four mechanisms (92.4 - 143.7s)
const bohrAtom = (c: Ctx, x: number, y: number, t: number, dropped: number, a: number) => {
  if (a <= 0) return; c.save(); c.globalAlpha = a;
  c.strokeStyle = HAT[2]; c.lineWidth = 1; c.globalAlpha = a * 0.6; c.beginPath(); c.ellipse(x, y, 30, 12, 0.2, 0, 6.283); c.stroke(); c.beginPath(); c.ellipse(x, y, 16, 7, 0.2, 0, 6.283); c.stroke(); c.globalAlpha = a;
  dot(c, x, y, 4, RED, a); dot(c, x, y, 2.4, "#ff8a2e", a);
  const orbit = dropped < 1 ? 30 : lerp(30, 16, ease(dropped));
  const ang = t * 2.6; const ex = x + Math.cos(ang) * orbit * 0.94, ey = y + Math.sin(ang) * orbit * 0.94 * 0.42;
  dot(c, ex, ey, 1.8, HAT[3], a); bloom(c, ex, ey, 6, "31,163,201", a * 0.5);
  if (dropped > 0 && dropped < 1) { const wl = 5; const g2 = c.createLinearGradient(x + 34, y, x + 90, y); g2.addColorStop(0, "rgba(168,236,255,0.9)"); g2.addColorStop(1, "rgba(168,236,255,0)"); c.strokeStyle = g2 as unknown as string; c.lineWidth = 1.4; c.beginPath(); for (let i = 0; i <= 40; i++) { const xx = x + 34 + i * 1.4; c.lineTo(xx, y + Math.sin(i / wl + t * 4) * 5 * (1 - dropped)); } c.stroke(); }
  c.restore();
};
const sunFusionCore = (c: Ctx, x: number, y: number, t: number, a: number) => {
  if (a <= 0) return; c.save(); c.globalAlpha = a; const p = 0.5 + 0.5 * Math.sin(t * 5);
  bloom(c, x, y, 40 + p * 6, "255,150,50", 0.55); pball(c, x, y, 26 + p * 2, SUN, 1);
  for (let i = 0; i < 3; i++) { const ang = t * 3 + i * 2.1, d = 8 + p * 3; dot(c, x + Math.cos(ang) * d, y + Math.sin(ang) * d * 0.6, 1.6, "#ffe19a", 1); }
  c.restore();
};
const grbPierce = (c: Ctx, x: number, y: number, t: number, punch: number, a: number) => {
  if (a <= 0) return; c.save(); c.globalAlpha = a;
  c.fillStyle = "#5a5a66"; c.fillRect(x + 30, y - 26, 8, 52); c.fillStyle = "#3a3a44"; c.fillRect(x + 30, y - 26, 3, 52);
  bloom(c, x, y, 20, "230,210,255", 0.5); dot(c, x, y, 5, GRB_HOT, 1);
  const beamLen = 30 + punch * 40; const g2 = c.createLinearGradient(x, y, x + beamLen, y); g2.addColorStop(0, GRB_HOT); g2.addColorStop(1, "rgba(230,210,255,0)"); c.fillStyle = g2 as unknown as string; c.fillRect(x, y - (2 - punch), beamLen, 4 - punch * 2);
  if (punch > 0.3) { const r = rng(55); for (let i = 0; i < 8; i++) { const sp = (punch - 0.3) * 40; dot(c, x + 34 + sp * (0.5 + r() * 0.8), y + (r() - 0.5) * 20 * punch, 1, "#ffe19a", (1 - punch) * 1.2); } }
  c.restore();
};
const act5 = (c: Ctx, t: number, env: Env) => {
  const a = clamp(span(t, at("considerStrange") - 0.3, at("notVariations") + 0.6, 0.7)); if (a <= 0) return;
  const slots: [number, number][] = [[70, 70], [174, 70], [70, 160], [174, 160]];
  const focus = t < at("candleChem") ? -1 : t < at("hydrogenAtom") ? 0 : t < at("sunFusion") ? 1 : t < at("grbAgain") ? 2 : 3;
  slots.forEach(([sx, sy], i) => {
    const isFocus = focus === i, fz = isFocus ? 1 : 0.62, fx = isFocus ? PW * 0.62 : sx, fy = isFocus ? PH * 0.5 : sy;
    c.save(); c.translate(fx, fy); c.scale(fz, fz);
    if (i === 0) candleFlame(c, 0, 14, t, a);
    if (i === 1) bohrAtom(c, 0, 0, t, clamp(ramp(t, at("radioSliver"), 1.4)), a);
    if (i === 2) sunFusionCore(c, 0, 0, t, a);
    if (i === 3) grbPierce(c, -30, 0, t, clamp(ramp(t, at("grbRipHole"), 1.6)), a);
    c.restore();
    if (!isFocus) { c.save(); c.globalAlpha = a * 0.5; c.strokeStyle = "#3a355f"; c.lineWidth = 1; c.strokeRect(sx - 34, sy - 34, 68, 68); c.restore(); }
  });
};

// ================================================================ ACT 6 -- not variations on a theme (143.7 - 161.5s)
const act6 = (c: Ctx, t: number, env: Env) => {
  const a = clamp(span(t, at("notVariations") - 0.3, at("andYet") + 0.5, 0.6)); if (a <= 0) return;
  const cols: [number, string][] = [[70, CANDLE[2]], [154, HAT[3]], [238, SUN[2]], [322, GRB_HOT]];
  cols.forEach(([x, col]) => { c.save(); c.globalAlpha = a; c.fillStyle = col; c.beginPath(); c.arc(x, 46, 4, 0, 6.283); c.fill(); c.strokeStyle = "#3a355f"; c.lineWidth = 1; c.beginPath(); c.moveTo(x, 52); c.lineTo(x, 176); c.stroke(); c.restore(); });
  // a jagged "no two alike" readout bar per column, heights genuinely different, never equal
  const rows = clamp(ramp(t, at("reactants") - 0.3, 3.2)) * 4;
  cols.forEach(([x], ci) => { const n = Math.min(4, Math.floor(rows)); for (let k = 0; k < n; k++) { const bh = 4 + ((ci * 37 + k * 53) % 10); c.save(); c.globalAlpha = a * clamp(rows - k); c.fillStyle = "#8f89c9"; c.fillRect(x - 10, 176 - (k + 1) * 14 - bh, 20, bh); c.restore(); } });
};

// ================================================================ ACT 7 -- exactly the same speed, the constant (161.5 - 201.9s)
const act7 = (c: Ctx, t: number, env: Env) => {
  const a = clamp(span(t, at("andYet") - 0.3, at("vacuum") + 0.6, 0.7)); if (a <= 0) return;
  const sources: [number, number, string][] = [[70, 60, CANDLE_HOT], [154, 60, HAT[3]], [238, 60, "#ffe19a"], [322, 60, GRB_HOT]];
  const fireAt = at("momentEach");
  const conv = clamp(ramp(t, fireAt, 1.6));
  sources.forEach(([sx, sy, col], i) => { pball(c, sx, sy, 10, i === 0 ? CANDLE : i === 1 ? HAT : i === 2 ? SUN : GRB, a); const x = lerp(sx, PW / 2, conv), y = lerp(sy, PH / 2 + 20, conv); dot(c, x, y, 2.4, col, a); if (conv < 1) for (let k = 1; k <= 2; k++) dot(c, lerp(sx, x, 1 - k * 0.18), lerp(sy, y, 1 - k * 0.18), 1.2, col, a * (0.3 - k * 0.1)); });
  if (conv >= 0.98) bloom(c, PW / 2, PH / 2 + 20, 26 + 6 * Math.sin(t * 6), "255,246,225", a * 0.6);
  // precision instrument zoom
  const prec = clamp(span(t, at("notApprox2") - 0.2, at("numberReveal") - 0.2, 0.5));
  if (prec > 0) { c.save(); c.globalAlpha = a * prec * 0.7; c.strokeStyle = YEL; c.lineWidth = 1; for (let i = 0; i < 12; i++) { const x = PW / 2 - 55 + i * 10; c.beginPath(); c.moveTo(x, PH / 2 - 10); c.lineTo(x, PH / 2 - (i % 4 === 0 ? 16 : 5)); c.stroke(); } c.restore(); }
  // the hero readout panel
  const heroA = clamp(span(t, at("numberReveal") - 0.3, at("vacuum") + 0.3, 0.5));
  if (heroA > 0) { c.save(); c.globalAlpha = a * heroA; c.fillStyle = "#050409"; c.fillRect(PW / 2 - 92, PH / 2 - 22, 184, 40); c.strokeStyle = "#8f6cf0"; c.lineWidth = 1.6; c.strokeRect(PW / 2 - 92, PH / 2 - 22, 184, 40); c.restore(); bloom(c, PW / 2, PH / 2, 90, "180,140,255", a * heroA * 0.3); }
  // re-shown at each named source
  [[at("soGrb"), 322, GRB_HOT], [at("soHydrogen"), 154, HAT[3]]].forEach(([tt, x, col]) => { const bb = clamp(span(t, (tt as number) - 0.2, (tt as number) + 1.6, 0.4)); if (bb > 0) { c.save(); c.globalAlpha = a * bb; dot(c, x as number, 168, 3, col as string, 1); c.restore(); } });
  // a screen -- a NEW example, first appearance
  const scrA = clamp(ramp(t, at("soScreen") - 0.3, 0.6));
  if (scrA > 0) { c.save(); c.globalAlpha = a * scrA; c.fillStyle = "#0a1030"; c.fillRect(96, 150, 40, 26); c.fillStyle = SCREEN[2]; c.fillRect(99, 153, 34, 20); c.fillStyle = SCREEN[3]; c.fillRect(101, 155, 14, 6); c.restore(); bloom(c, 116, 163, 20, "58,123,255", a * scrA * 0.4); }
};

// ================================================================ ACT 8 -- in vacuum, only photons moving (201.9 - 214.4s)
const RAIN = (() => { const r = rng(88), out: { y: number; sp: number; col: string; ph: number }[] = []; const cols = [CANDLE_HOT, QUASAR[3], GRB_HOT, HAT[3], SUN[2], SCREEN[2]]; for (let i = 0; i < 130; i++) out.push({ y: r() * PH, sp: 60, col: cols[i % cols.length], ph: r() * PW }); return out; })();
const act8 = (c: Ctx, t: number, env: Env) => {
  const a = clamp(span(t, at("vacuum") - 0.3, at("appreciateStrange") + 0.6, 0.8)); if (a <= 0) return;
  const reveal = clamp(ramp(t, at("vacuum"), 1.0));
  RAIN.forEach((d) => { const x = (d.ph + d.sp * (t - at("vacuum"))) % (PW + 30) - 15; if (x < 0) return; const al = a * reveal; bloom(c, x, d.y, 4, "255,246,225", al * 0.25); dot(c, x, d.y, 1.1, d.col, al); dot(c, x - 4, d.y, 0.7, d.col, al * 0.4); });
  const onlyA = clamp(ramp(t, at("onlyMoving") - 0.2, 0.6));
  if (onlyA > 0) bloom(c, PW / 2, PH / 2, 90, "255,246,225", a * onlyA * 0.2);
};

// ================================================================ ACT 9 -- back on earth: things that DO change speed (214.4 - 246.4s)
const figureKick = (c: Ctx, x: number, y: number, wind: number, alpha: number) => {
  c.save(); c.globalAlpha = alpha; c.fillStyle = "#1a1a24"; c.strokeStyle = "#1a1a24"; c.lineWidth = 3; c.lineCap = "round";
  c.beginPath(); c.moveTo(x, y - 26); c.lineTo(x, y - 8); c.lineTo(x - 6, y); c.moveTo(x, y - 8); c.lineTo(x + 8 + wind * 6, y - 2); c.stroke();
  c.beginPath(); c.arc(x, y - 30, 4, 0, 6.283); c.fill(); c.restore();
};
const act9 = (c: Ctx, t: number, env: Env) => {
  const a = clamp(ramp(t, at("appreciateStrange") - 0.3, 1.2)); if (a <= 0) return;
  // background handled globally by drawBackground()
  // baseball: soft lob, then a hard pitch -- speed genuinely differs with the throw
  const bbA = clamp(span(t, at("baseball") - 0.2, at("bullet") - 0.2, 0.6));
  if (bbA > 0) {
    const cyc = (t - at("baseball")) % 4.6, hard = cyc > 2.3, u = clamp((cyc % 2.3) / 1.4);
    const speed = hard ? 130 : 46, bx = 40 + speed * u, by = 100 - Math.sin(u * Math.PI) * (hard ? 10 : 26);
    figureKick(c, 40, 118, 0, bbA); dot(c, clamp(bx, 40, 340), by, 3, "#e8dcc0", bbA); if (u < 0.95) for (let k = 1; k < 4; k++) dot(c, clamp(bx - k * (speed * 0.03), 40, 340), by + k * 0.4, 1.4, "#e8dcc0", bbA * (0.3 - k * 0.06));
    gauge(c, 350, 30, 20, hard ? 0.95 : 0.35, "#e8dcc0", bbA);
  }
  // bullet: two rifles, two different muzzle velocities
  const buA = clamp(span(t, at("bullet") - 0.2, at("car") - 0.2, 0.6));
  if (buA > 0) {
    const cyc = (t - at("bullet")) % 3.6, second = cyc > 1.8, u = clamp((cyc % 1.8) / 0.7), speed = second ? 210 : 140;
    c.save(); c.globalAlpha = buA; c.fillStyle = "#2a2a34"; c.fillRect(20, 108, 30, 6); c.restore();
    if (u < 0.98) { const bx = 50 + speed * u; if (u < 0.12) bloom(c, 50, 111, 14, "255,220,150", buA * (1 - u * 6)); dot(c, clamp(bx, 50, 360), 111, 1.6, "#ffd27a", buA); for (let k = 1; k < 3; k++) dot(c, clamp(bx - k * (speed * 0.02), 50, 360), 111, 1, "#ffd27a", buA * (0.3 - k * 0.08)); }
    gauge(c, 350, 30, 20, second ? 0.98 : 0.6, "#ffd27a", buA);
  }
  // car: builds from rest, gradually -- unlike light
  const carA = clamp(span(t, at("car") - 0.2, at("soccerSoft") - 0.2, 0.6));
  if (carA > 0) { const u = clamp((t - at("car")) / 5.5), cx = 30 + u * 260 * u; c.save(); c.globalAlpha = carA; c.fillStyle = "#3a6fe0"; c.fillRect(cx, 138, 34, 12); c.fillRect(cx + 6, 130, 18, 10); c.fillStyle = "#0c0a1c"; c.beginPath(); c.arc(cx + 6, 152, 4, 0, 6.283); c.fill(); c.beginPath(); c.arc(cx + 26, 152, 4, 0, 6.283); c.fill(); c.restore(); for (let k = 1; k < 4; k++) { c.save(); c.globalAlpha = carA * u * (0.4 - k * 0.08); c.strokeStyle = "#cddcff"; c.lineWidth = 1; c.beginPath(); c.moveTo(cx - k * 8, 141); c.lineTo(cx - k * 8 - 6, 141); c.stroke(); c.restore(); } gauge(c, 350, 30, 20, u * 0.85, "#3a6fe0", carA); }
  // soccer: soft drift, then a hard rocket -- the very last beat of the whole piece, still moving on the final frame
  const scA = clamp(ramp(t, at("soccerSoft") - 0.2, 0.5));
  if (scA > 0) {
    const hard = t >= at("soccerHard"), t0 = hard ? at("soccerHard") : at("soccerSoft"), u = clamp((t - t0) / (hard ? 3.0 : 1.6)), speed = hard ? 150 : 22;
    const bx = 40 + speed * u, by = 148 - (hard ? Math.min(14, u * 18) : 0);
    figureKick(c, 40, 168, hard ? 1 : 0.3, scA);
    dot(c, clamp(bx, 40, 380), by, 3.4, "#e8e8e8", scA);
    for (let k = 1; k < 5; k++) dot(c, clamp(bx - k * (speed * 0.02), 40, 380), by, 1.6, "#cfcfcf", scA * (0.32 - k * 0.06));
    if (hard) { const r = rng(9001); for (let i = 0; i < 6; i++) dot(c, clamp(40 + r() * speed * u, 40, 380), 168 + r() * 4, 0.8, "#9a8a6a", scA * (1 - u) * 0.8); }
    gauge(c, 350, 30, 20, hard ? Math.min(1, 0.4 + u * 0.6) : 0.18, "#e8e8e8", scA);
  }
};

// ================================================================ captions (2-5 word paraphrases; allowed glyphs only)
type Cap = { t: number; s: string; y?: number };
const CAPS: Cap[] = [
  { t: at("candle"), s: "A CANDLE FLAME" }, { t: at("quasar"), s: "A DISTANT QUASAR" },
  { t: at("grbStar"), s: "A COLLAPSING STAR" }, { t: at("grbEnergy"), s: "MORE ENERGY THAN THE SUN" },
  { t: at("allProduce"), s: "ALL PRODUCE LIGHT" }, { t: at("everyPhoton"), s: "EVERY ONE OF THESE PHOTONS" },
  { t: at("calm"), s: "THE CALM ONES" }, { t: at("violent"), s: "THE VIOLENT ONES" },
  { t: at("faint"), s: "TOO FAINT TO MEASURE" }, { t: at("energetic"), s: "COULD SHATTER A NUCLEUS" },
  { t: at("travels"), s: "EXACTLY THE SAME SPEED" }, { t: at("notApprox1"), s: "NOT APPROXIMATELY" },
  { t: at("exactly1"), s: "EXACTLY" }, { t: at("raceStart"), s: "13 BILLION YEARS OLD" },
  { t: at("nothingPushes"), s: "NOTHING PUSHES THEM" }, { t: at("nothingAccel"), s: "NOTHING ACCELERATES THEM" },
  { t: at("neverSlow"), s: "NEVER SLOW" }, { t: at("neverFast"), s: "NEVER FAST" },
  { t: at("onlySpeed"), s: "ONLY ONE SPEED" }, { t: at("whyQ"), s: "WHY?" },
  { t: at("beforeGoFurther"), s: "A QUICK NOTE", y: 970 }, { t: at("ifYouFind"), s: "IF YOU ARE ENJOYING THIS", y: 970 },
  { t: at("likeSub"), s: "LIKE AND SUBSCRIBE", y: 970 }, { t: at("smallThing"), s: "SMALL FOR YOU", y: 970 },
  { t: at("hugeDiff"), s: "HUGE FOR THIS CHANNEL", y: 970 }, { t: at("spotify"), s: "NOW ON SPOTIFY", y: 970 },
  { t: at("linksDesc"), s: "LINKS IN THE DESCRIPTION", y: 970 }, { t: at("now"), s: "NOW" },
  { t: at("letsBegin"), s: "LET US BEGIN" }, { t: at("considerStrange"), s: "HOW STRANGE IS THIS" },
  { t: at("everySource"), s: "DIFFERENT RULES, EVERY TIME" }, { t: at("candleChem"), s: "CHEMICAL FIRE, 1,500 DEGREES" },
  { t: at("hydrogenAtom"), s: "AN ATOM DROPS ENERGY" }, { t: at("radioSliver"), s: "A SLIVER OF RADIO" },
  { t: at("sunFusion"), s: "FUSION, 15,000,000 DEGREES" }, { t: at("grbAgain"), s: "THE MOST VIOLENT EVENT" },
  { t: at("grbViolentEvents"), s: "EVER DETECTED" }, { t: at("grbRipHole"), s: "COULD PUNCH THROUGH METAL" },
  { t: at("notVariations"), s: "NOT VARIATIONS ON A THEME" }, { t: at("radicallyDiff"), s: "RADICALLY DIFFERENT PROCESSES" },
  { t: at("reactants"), s: "DIFFERENT REACTANTS" }, { t: at("temperatures"), s: "DIFFERENT TEMPERATURES" },
  { t: at("energiesTrillions"), s: "ENERGY DIFFERS BY TRILLIONS" }, { t: at("mechanisms"), s: "NOTHING ALIKE" },
  { t: at("andYet"), s: "AND YET" }, { t: at("momentEach"), s: "EACH MAKES A PHOTON" },
  { t: at("emergesExactly"), s: "EXACTLY THE SAME SPEED" }, { t: at("notApprox2"), s: "NOT APPROXIMATELY" },
  { t: at("notStat"), s: "NOT STATISTICALLY" }, { t: at("exactly2"), s: "EXACTLY" },
  { t: at("decimalPlaces"), s: "TO EVERY DECIMAL PLACE" }, { t: at("numberReveal"), s: "299,792,458 M/S" },
  { t: at("soGrb"), s: "SO IS THE GAMMA RAY" }, { t: at("soHydrogen"), s: "SO IS THE RADIO WAVE" },
  { t: at("soScreen"), s: "SO IS YOUR SCREEN" }, { t: at("vacuum"), s: "IN VACUUM" },
  { t: at("allMoveSame"), s: "ALL THE SAME SPEED" }, { t: at("noFast"), s: "NO FAST PHOTONS" },
  { t: at("noSlow"), s: "NO SLOW PHOTONS" }, { t: at("onlyMoving"), s: "ONLY PHOTONS MOVING" },
  { t: at("appreciateStrange"), s: "HOW STRANGE THIS IS", y: 970 }, { t: at("thinkNature"), s: "EVERYTHING ELSE IN NATURE", y: 970 },
  { t: at("baseball"), s: "THROW IT HARDER, FASTER", y: 970 }, { t: at("bullet"), s: "DIFFERENT RIFLES, DIFFERENT SPEEDS", y: 970 },
  { t: at("car"), s: "SPEED BUILDS FROM REST", y: 970 }, { t: at("soccerSoft"), s: "A SOFT KICK DRIFTS", y: 970 },
  { t: at("soccerHard"), s: "A HARD KICK ROCKETS", y: 970 },
];

// ================================================================ draw
const draw = (ctx: Ctx, frame: number, env: Env) => {
  const t = frame / FPS, g = new Gfx(ctx, env, frame, FLAT), sc = env.scale;
  const PL = pixBuf(env), c = PL.ctx; c.setTransform(sc, 0, 0, sc, 0, 0); c.clearRect(0, 0, PW, PH);

  drawBackground(c, t);
  act1(c, t, env); act2(c, t, env); act3(c, t, env); act4(c, t, env);
  act5(c, t, env); act6(c, t, env); act7(c, t, env); act8(c, t, env); act9(c, t, env);

  blitPixels(ctx, env, PL);
  ctx.setTransform(sc, 0, 0, sc, 0, 0);
  motes(ctx, t, 0.35);

  // cinematic vignette -- darkened corners, the one thing that never comes from the pixel layer
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const vg = ctx.createRadialGradient(W * env.scale * 0.5, H * env.scale * 0.46, H * env.scale * 0.25, W * env.scale * 0.5, H * env.scale * 0.46, W * env.scale * 0.62);
  vg.addColorStop(0, "rgba(4,3,10,0)"); vg.addColorStop(1, "rgba(4,3,10,0.55)");
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W * env.scale, H * env.scale); ctx.restore();

  // cinematic letterbox bars, always present, double as the text-safe zone
  const bar = (y0: number, y1: number, top: boolean) => { const gr = ctx.createLinearGradient(0, top ? y1 : y0, 0, top ? y0 : y1); gr.addColorStop(0, "rgba(6,5,12,0.62)"); gr.addColorStop(1, "rgba(6,5,12,0)"); ctx.fillStyle = gr; ctx.fillRect(0, y0, W, y1 - y0); };
  bar(0, 150, true); bar(930, H, false);

  // hero number, laid over the readout panel from act7 (full-res crisp digits over the pixel panel)
  const heroA = clamp(span(t, at("numberReveal") - 0.15, at("vacuum") + 0.2, 0.4));
  if (heroA > 0) { const words: (() => void)[] = []; const px0 = PW / 2 * PIX, py0 = PH / 2 * PIX; words.push(() => text(g, "299,792,458 M/S", px0, py0 - 12, { cap: 30, color: "#f2eaff", align: "center", opacity: heroA, w: 3.4 })); g.group("plain", () => words.forEach((f) => f())); }

  // captions
  const words: (() => void)[] = [];
  const say = (s: string, x: number, y: number, o: Parameters<typeof text>[4]) => { words.push(() => text(g, s, x, y, o)); };
  CAPS.forEach((cap, i) => {
    const t1 = CAPS[i + 1]?.t ?? at("end");
    if (t < cap.t - 0.05 || t > t1 + 0.35) return;
    const prog = ramp(t, cap.t, 0.45), fadeOut = 1 - ramp(t, Math.max(cap.t + 0.05, t1 - 0.25), 0.3);
    const y = cap.y ?? 90;
    say(cap.s, W / 2, y, { cap: 40, color: CREAM, align: "center", progress: prog, opacity: clamp(fadeOut), w: 4.2 });
  });
  g.group("plain", () => words.forEach((f) => f()));
};

export const lightSpeed: Film = {
  meta: { title: "lightSpeed", W, H, fps: FPS, bpm: 120, durationFrames: DURATION },
  assets: { images: {} },
  shots: [{ id: "lightSpeed", start: 0, end: DURATION, draw }],
};
