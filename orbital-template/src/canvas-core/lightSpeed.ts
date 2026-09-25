import { rng, type Ctx, type Env, type P } from "./core";
import { Film } from "./film";
import { clamp, lerp } from "./gallery";
import { W, H, FPS, ease, easeOut, ramp } from "./spaceStyle";
import {
  TAU, CX, CY, WHITE, PALE, CYAN, BLUE, VIO, PINK, AMBER, GOLD, RED, GREEN, WARM, NEON, TXT, DIMT, GOLDT, PALET,
  g1, win, dot, hair, hairG, fade, beads, ellipse, flare, reticle, ripple, glow, makeCamera, makeStars, drawStars, makeTint,
  makeSphere, drawGlobe, beginFrame, endFrame, hudTables, fades, type Label, type Line, type Frame,
} from "./cinemaKit";

// THE ONE SPEED · 246.4 s, one continuous shot, finished as pixel art (endFrame pixel: 3).
// Word times: audio/lightSpeed.words.txt (forced alignment). Screenplay summary:
//   0-19    three sources: a candle in a night kitchen -> out through the window -> a quasar at the
//           observable edge -> a blue supergiant collapses into a gamma-ray burst (energy bars vs the Sun)
//   19-40   the spectrum: calm / violent / faint / energetic photon lanes, phase-locked columns,
//           a nucleus shattered, identical 299,792,458 M/S readouts, EXACTLY
//   40-64   the race: the candle's photon beside a 13-billion-year photon (redshifted), camera tracks them;
//           a push that does nothing, a speed gauge locked at c; the photons curl into a giant ?
//   64-88   the channel: the ? becomes a growing constellation; one photon in a photomultiplier becomes a
//           cascade (small thing, huge difference); a waveform; a globe of listeners; collapse and flash
//   88-142  the lab: four arched chambers; dive into each: candle chemistry (1,500 degrees), hydrogen
//           electron drop and 21 cm radio photon, solar fusion core (15 million degrees), gamma-ray burst
//           jets and one photon punching through an alloy plate
//   142-161 the comparison: reactants, temperatures, photon energies on a log scale (trillions apart)
//   161-183 and yet: four photons leave together and cross the gate in the same frame; a spread of arrival
//           times collapses into one spike; decimal places; every experiment ticks
//   183-206 299,792,458 M/S written digit by digit ON the spoken digits; a photon laps Earth 7.5 times in
//           one second; GRB, hydrogen and screens all stamp the same number
//   206-217 vacuum tube: columns of photons; no fast photons, no slow photons
//   217-246 dusk landscape, tracking right: birds and leaves, baseball soft/hard, three rifles,
//           a car climbing from rest, a soccer ball that drifts and then rockets away

const DURATION = 7392; // 246.40 s (audio 246.413 s)
export const CUE = {
  candle: 0.07, prod1: 1.69, quasar: 3.89, edge: 5.28, prod2: 7.62, gamma: 9.32, collapse: 10.72, unleash: 12.44, seconds: 14.05,
  sun: 14.92, lifetime: 16.9, prod3: 18.14, every: 19.56, calm: 21.52, violent: 22.66, faint: 24.59, measured: 26.07,
  energetic: 28.0, shatter: 29.04, travels: 31.34, exactly1: 31.95, empty: 34.09, notApprox: 35.76, exactly2: 38.28,
  photonJust: 39.75, left: 40.85, racing: 43.66, velocity: 45.28, ancient: 46.39, cosmos: 49.03, billion: 50.95,
  pushes: 53.08, accel: 54.44, slow: 56.66, fast: 57.63, onlyOne: 58.65, why: 61.89,
  further: 63.96, fascinating: 68.16, like: 69.88, subscribe: 70.43, grow: 72.76, small: 74.07, huge: 76.28, spotify: 80.09,
  links: 81.45, listen: 83.68, wherever: 84.63, now: 86.1, begin: 87.24,
  consider: 88.01, strange: 88.96, everySource: 92.39, rules: 96.53, candle2: 97.74, chemical: 99.78, temp: 101.59, deg1500: 102.92,
  hydrogen: 105.91, cold: 107.48, photonH: 110.18, dropping: 111.08, levels: 113.16, releasing: 115.54, radio: 117.27,
  star: 118.91, fusion: 121.27, core: 122.54, million: 124.87, gamma2: 126.23, violent2: 128.67, detected: 131.05,
  releases: 132.39, single: 136.04, rip: 137.37, hole: 137.65, metals: 139.49,
  variations: 142.52, radically: 145.04, reactant: 147.87, temps: 148.49, energies: 150.15, trillions: 154.99, mechanisms: 157.07,
  distinct: 159.09, andYet: 160.91, moment: 161.53, emerges: 166.13, exactly3: 167.87, notApprox2: 171.08, statistically: 173.86,
  exactly4: 175.84, decimal: 178.56, experiment: 180.66, candle3: 183.97, moving: 185.22, n2: 185.81, meters: 192.14,
  soIs: 193.98, gamma3: 195.42, hydrogen2: 198.57, screen: 202.97, vacuum: 206.02, allSame: 207.24, noFast: 210.28,
  noSlow: 212.59, onlyMoving: 214.64, appreciate: 217.01, everything: 221.49, baseball: 224.4, depends: 226.03, hard1: 226.89,
  bullet: 228.95, rifles: 229.99, muzzle: 231.24, varies: 232.28, car: 235.5, climbs: 237.59, engine: 239.21,
  soccer: 241.29, softly: 242.02, drifts: 243.34, kickHard: 244.51, rockets: 245.55, end: 246.4,
};

// ================================================================ camera, stars, wash
const speed = (t: number) => 0.012 + 0.95 * g1(t, 3.5, 0.5) + 0.7 * g1(t, 87.9, 0.45) + 0.4 * g1(t, 166.5, 0.8);
const panRate = (t: number) => 0.32 * ramp(t, 43.5, 1.2) * (1 - ramp(t, 60.5, 1.2)) + 0.05 * win(t, 19.3, 39.5, 1, 1);
const CAM = makeCamera(speed, panRate, 248), STARS = makeStars(7, 1900);
const tint = makeTint([[0, 16, 10, 8], [3.2, 16, 10, 8], [4.5, 5, 7, 18], [10, 10, 6, 22], [20, 6, 8, 20], [40, 8, 6, 18], [64, 10, 8, 20], [88, 12, 9, 16], [98, 18, 10, 8], [106, 5, 8, 22], [119, 18, 9, 6], [126, 10, 6, 22], [142, 8, 8, 18], [161, 6, 8, 20], [183, 12, 9, 10], [206, 6, 8, 18], [217, 14, 8, 16], [246.5, 10, 6, 14]]);
const starAlpha = (t: number) => ramp(t, 2.6, 1.2) * (1 - 0.5 * win(t, 88.5, 161, 1, 1)) * (1 - ramp(t, 216.2, 1.6));

// ================================================================ drawing helpers (solid paint + light)
const SO = (c: Ctx, fn: () => void) => { c.save(); c.globalCompositeOperation = "source-over"; fn(); c.restore(); };
const fillPoly = (c: Ctx, pts: P[], fill: string | CanvasGradient) => { c.fillStyle = fill; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill(); };
const circ = (c: Ctx, x: number, y: number, r: number, fill: string | CanvasGradient) => { if (r <= 0) return; c.fillStyle = fill; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };
const rgba = (rgb: string, a: number) => `rgba(${rgb},${clamp(a).toFixed(3)})`;
/** a photon: a wave packet along direction ang, head at (x,y), trailing len px */
const packet = (c: Ctx, x: number, y: number, ang: number, len: number, wl: number, amp: number, rgb: string, a: number, w = 2.4, ph = 0) => {
  if (a <= 0.01) return;
  const ca = Math.cos(ang), sa = Math.sin(ang), n = Math.max(10, Math.round(len / 3)), pts: P[] = [];
  for (let i = 0; i <= n; i++) { const s = -len + (len * i) / n, env = Math.pow(Math.sin((Math.PI * i) / n), 0.7) * (0.3 + 0.7 * (i / n)), off = amp * env * Math.sin((s / wl) * TAU + ph); pts.push([x + ca * s - sa * off, y + sa * s + ca * off]); }
  hairG(c, pts, rgb, a, w); glow(c, x, y, 14 + amp, rgb, 0.55 * a); dot(c, x, y, 2.8, "255,255,245", a);
};
const xmark = (c: Ctx, x: number, y: number, s: number, p: number, a: number) => { hairG(c, [[x - s, y - s], [x + s, y + s]], RED, a, 3.5, clamp(p * 2)); hairG(c, [[x + s, y - s], [x - s, y + s]], RED, a, 3.5, clamp(p * 2 - 1)); };
const vmark = (c: Ctx, x: number, y: number, s: number, p: number, a: number) => hairG(c, [[x - s, y], [x - s * 0.3, y + s * 0.7], [x + s * 1.1, y - s * 0.8]], GREEN, a, 3.5, p);
const arrow = (c: Ctx, a: P, b: P, rgb: string, al: number, w: number, prog = 1) => {
  hairG(c, [a, b], rgb, al, w, prog); if (prog < 1) return;
  const an = Math.atan2(b[1] - a[1], b[0] - a[0]), L = 12 + w * 3;
  hairG(c, [[b[0] - Math.cos(an - 0.5) * L, b[1] - Math.sin(an - 0.5) * L], b, [b[0] - Math.cos(an + 0.5) * L, b[1] - Math.sin(an + 0.5) * L]], rgb, al, w);
};
const lin = (x0: number, y0: number, x1: number, y1: number, stops: [number, string][], c: Ctx) => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([k, s]) => g.addColorStop(k, s)); return g; };

// ---- candle (x,y = flame base on the wick)
const candleBody = (c: Ctx, x: number, y: number, s: number, A: number, seed: number) => SO(c, () => {
  c.globalAlpha = A; const w = 22 * s, h = 130 * s, top = y + 6 * s;
  c.fillStyle = lin(x - w, 0, x + w, 0, [[0, "#9c8a66"], [0.3, "#efe0bd"], [0.55, "#e2d0a8"], [1, "#6e5c44"]], c); c.fillRect(x - w, top, 2 * w, h);
  c.fillStyle = "#fff1d0"; c.beginPath(); c.ellipse(x, top, w, 5 * s, 0, 0, TAU); c.fill();
  const r = rng(seed); c.fillStyle = "#f5e6c6";
  for (let i = 0; i < 4; i++) { const dx = (r() - 0.5) * 1.6 * w, dh = (8 + r() * 30) * s; c.fillRect(x + dx - 2.5 * s, top, 5 * s, dh); circ(c, x + dx, top + dh, 3 * s, "#f5e6c6"); }
  c.fillStyle = "#2e2636"; c.beginPath(); c.ellipse(x, top + h, w * 2.3, 9 * s, 0, 0, TAU); c.fill();
  c.fillStyle = "#6c5a72"; c.beginPath(); c.ellipse(x, top + h - 3 * s, w * 2.05, 5.5 * s, 0, 0, TAU); c.fill();
  c.fillStyle = "#1a1210"; c.fillRect(x - 1.5 * s, y - 2 * s, 3 * s, 10 * s);
});
const flameShape = (x: number, y: number, hh: number, ww: number, lean: number): P[] => {
  const side = (sg: number) => Array.from({ length: 17 }, (_, i) => { const u = sg > 0 ? i / 16 : 1 - i / 16, wv = ww * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.15)), 0.9) * (1 - u * 0.85); return [x + sg * wv + lean * u * u, y - hh * u] as P; });
  return [...side(-1), ...side(1)];
};
const flame = (c: Ctx, x: number, y: number, s: number, t: number, A: number, big = 1) => {
  if (A <= 0.01) return;
  const fl = 1 + 0.07 * Math.sin(t * 9.1) + 0.05 * Math.sin(t * 23.3 + 1) + 0.03 * Math.sin(t * 41 + 2), lean = 3 * s * Math.sin(t * 2.7) + 1.5 * s * Math.sin(t * 7.3);
  glow(c, x, y - 30 * s, 260 * s * big, WARM, 0.32 * A); glow(c, x, y - 25 * s, 70 * s, "255,180,90", 0.55 * A);
  c.save(); c.globalAlpha = A;
  fillPoly(c, flameShape(x, y, 64 * s * fl, 15 * s, lean), "rgba(255,110,35,0.55)");
  fillPoly(c, flameShape(x, y, 50 * s * fl, 11 * s, lean * 0.8), "rgba(255,190,80,0.85)");
  fillPoly(c, flameShape(x, y, 32 * s * fl, 6.5 * s, lean * 0.6), "rgba(255,248,215,0.95)");
  c.fillStyle = "rgba(80,120,255,0.65)"; c.beginPath(); c.ellipse(x, y - 3 * s, 8 * s, 5 * s, 0, 0, TAU); c.fill();
  c.restore();
};
const candle = (c: Ctx, x: number, y: number, s: number, t: number, A: number, seed = 3) => { candleBody(c, x, y, s, A, seed); flame(c, x, y, s, t, A); };

// ---- quasar: accretion disk, twin jets
const quasar = (c: Ctx, x: number, y: number, R: number, t: number, A: number, jet: number) => {
  if (A <= 0.01 || R <= 0) return;
  glow(c, x, y, R * 3.2, "150,120,255", 0.18 * A); glow(c, x, y, R * 1.2, "255,210,160", 0.4 * A);
  for (let k = 0; k < 9; k++) { const f = 0.25 + k * 0.09, rgb = k < 2 ? WHITE : k < 5 ? "255,220,150" : k < 7 ? AMBER : "220,90,70"; beads(c, ellipse(x, y, R * f, R * f * 0.26, -0.18, 80, t * (1.4 - k * 0.1), t * (1.4 - k * 0.1) + TAU), Math.max(2, R * 0.04), Math.max(1, R * 0.012), rgb, A * (0.9 - k * 0.07)); }
  SO(c, () => { c.globalAlpha = A; c.fillStyle = "#020206"; c.beginPath(); c.ellipse(x, y, R * 0.12, R * 0.08, -0.18, 0, TAU); c.fill(); });
  const L = R * 3.4 * jet, ang = -Math.PI / 2 - 0.18;
  for (const sg of [1, -1]) {
    const e: P = [x + Math.cos(ang) * L * sg, y + Math.sin(ang) * L * sg];
    fade(c, [x, y], e, "170,210,255", 0.8 * A * jet, 0, Math.max(2, R * 0.05)); fade(c, [x, y], e, "120,150,255", 0.25 * A * jet, 0, Math.max(6, R * 0.18));
    for (let k = 0; k < 6; k++) { const u = (t * 0.35 + k / 6) % 1; dot(c, lerp(x, e[0], u), lerp(y, e[1], u), Math.max(1.5, R * 0.025), WHITE, A * jet * (1 - u)); }
  }
};

// ---- a star as a disc of light with speckled surface
const starDisc = (c: Ctx, x: number, y: number, R: number, inner: string, outer: string, A: number, seed: number) => {
  if (A <= 0.01 || R <= 0) return;
  glow(c, x, y, R * 2.6, outer, 0.3 * A);
  const g = c.createRadialGradient(x, y, 0, x, y, R); g.addColorStop(0, rgba("255,255,250", A)); g.addColorStop(0.5, rgba(inner, A)); g.addColorStop(1, rgba(outer, A * 0.9));
  circ(c, x, y, R, g);
  const r = rng(seed); for (let i = 0; i < Math.min(260, R * 2.5); i++) { const a = r() * TAU, rr = Math.sqrt(r()) * R * 0.95; dot(c, x + Math.cos(a) * rr, y + Math.sin(a) * rr, 1.2 + r() * 1.8, r() < 0.5 ? outer : "255,255,240", A * 0.25); }
};

// ================================================================ M1 · three sources (0-21)
const WIN0: P = [1280, 440];
const SKY = (() => { const r = rng(11); return Array.from({ length: 160 }, () => ({ x: 1010 + r() * 540, y: 190 + r() * 380, m: r() })); })();
const CITY = (() => { const r = rng(12), out: { x: number; w: number; h: number; lit: number[] }[] = []; let x = 1010; while (x < 1550) { const w = 24 + r() * 50, h = 40 + r() * 110, lit: number[] = []; for (let i = 0; i < 18; i++) lit.push(r()); out.push({ x, w, h, lit }); x += w + 2; } return out; })();
const m1Kitchen = (c: Ctx, t: number) => {
  const fly = ease(ramp(t, 2.45, 1.25)), s = (1 + 0.03 * Math.min(t, 2.45)) * Math.exp(Math.log(8) * fly), A = 1 - ramp(t, 3.15, 0.55);
  if (A <= 0) return;
  c.save(); c.translate(WIN0[0], WIN0[1]); c.scale(s, s); c.translate(-WIN0[0], -WIN0[1]);
  SO(c, () => {
    c.globalAlpha = A;
    c.fillStyle = lin(0, 0, 0, 760, [[0, "#120d1c"], [1, "#1d1426"]], c); c.fillRect(-200, -200, 2400, 1000);
    c.fillStyle = "#1a1224"; for (let x = 0; x < 1920; x += 48) c.fillRect(x, 0, 6, 760);
    // window: night sky and a city
    c.fillStyle = lin(0, 190, 0, 690, [[0, "#070b26"], [0.7, "#141a44"], [1, "#2a2350"]], c); c.fillRect(1010, 190, 540, 500);
    for (const b of CITY) { c.fillStyle = "#0b0a18"; c.fillRect(b.x, 690 - b.h, b.w, b.h); c.fillStyle = "#ffcf7a"; let k = 0; for (let yy = 690 - b.h + 8; yy < 684; yy += 12) for (let xx = b.x + 5; xx < b.x + b.w - 6; xx += 10) { if (b.lit[k++ % 18] > 0.62) c.fillRect(xx, yy, 4, 5); } }
    // shelf, jars, windowsill plant
    c.fillStyle = "#2c1d18"; c.fillRect(170, 420, 470, 14); c.fillStyle = "#3a2a24"; c.fillRect(170, 420, 470, 4);
    [[220, 58, "#4a3a5a"], [300, 80, "#5a3a3a"], [400, 64, "#3a4a5a"], [500, 48, "#5a5236"]].forEach(([x, h, col]) => { c.fillStyle = col as string; c.fillRect(x as number, 420 - (h as number), 50, h as number); c.fillStyle = "#6a5a7a"; c.fillRect(x as number, 420 - (h as number) - 8, 50, 8); });
    c.fillStyle = "#2a2238"; c.fillRect(990, 170, 580, 20); c.fillRect(990, 690, 580, 26); c.fillRect(990, 170, 20, 540); c.fillRect(1550, 170, 20, 540); c.fillRect(1272, 190, 16, 500); c.fillRect(1010, 432, 540, 14);
    c.fillStyle = "#3b2f4c"; c.fillRect(990, 690, 580, 5);
    c.fillStyle = "#3a5a3a"; for (let i = 0; i < 9; i++) c.fillRect(1060 + i * 7, 640 - (i % 3) * 14, 6, 50 + (i % 3) * 14); c.fillStyle = "#6a3a2a"; c.fillRect(1050, 668, 76, 24);
    // table
    c.fillStyle = lin(0, 760, 0, 1080, [[0, "#3a2416"], [1, "#1c110a"]], c); c.fillRect(-200, 760, 2400, 500);
    c.fillStyle = "#4a2e1c"; c.fillRect(-200, 760, 2400, 6); c.fillStyle = "#2e1c12"; const r = rng(14); for (let i = 0; i < 24; i++) c.fillRect(r() * 1920, 780 + r() * 160, 80 + r() * 200, 2);
  });
  // stars in the window, candle light on the room
  c.save(); c.beginPath(); c.rect(1010, 190, 540, 500); c.clip(); for (const st of SKY) dot(c, st.x, st.y, 1 + st.m, st.m > 0.8 ? PALE : WHITE, A * (0.3 + 0.6 * st.m)); c.restore();
  candle(c, 720, 620, 1, t, A);
  glow(c, 720, 700, 520, "255,160,80", 0.12 * A); glow(c, 1400, 470, 60, "255,190,120", 0.12 * A);
  // light leaves the flame: ring + photons, one heading for the window
  const q = ramp(t, CUE.prod1, 1.6); if (q > 0 && q < 1) ripple(c, 720, 590, q, 20, 520, "255,210,140", 0.7 * A, 1, 140, 6);
  for (let k = 0; k < 11; k++) { const u = t - CUE.prod1 - k * 0.05; if (u <= 0) continue; const an = k === 0 ? Math.atan2(WIN0[1] - 590, WIN0[0] - 720) : -Math.PI + (k / 10) * Math.PI * 1.1 - 0.1, d = 40 + 420 * u; packet(c, 720 + Math.cos(an) * d, 590 + Math.sin(an) * d, an, 60, 18, 5, k === 0 ? "255,235,180" : "255,200,120", A * (k === 0 ? 1 : 0.7)); }
  c.restore();
};

const m1Quasar = (c: Ctx, t: number, f: Frame) => {
  const A = ramp(t, 3.0, 0.9) * (1 - ramp(t, 9.8, 0.8)); if (A <= 0) return;
  const pan = ease(ramp(t, 9.2, 1.6)), x = 1240 - 950 * pan, y = 500, R = lerp(14, 150, ease(ramp(t, 3.4, 4.6)));
  // the observable edge: a huge dotted horizon with the glow of the early universe beyond
  const eA = A * ramp(t, CUE.edge, 0.8);
  if (eA > 0) {
    const cx = -1320 - 950 * pan, rr = 2660;
    beads(c, ellipse(cx, 560, rr, rr, 0, 220, -0.32, 0.32), 6, 1.4, "255,170,120", 0.7 * eA, easeOut(ramp(t, CUE.edge, 1.2)));
    const r = rng(21); for (let i = 0; i < 420; i++) { const a = (r() - 0.5) * 0.62, d = rr + 10 + r() * 380; dot(c, cx + Math.cos(a) * d, 560 + Math.sin(a) * d, 1.2 + r() * 1.5, r() < 0.5 ? "255,140,100" : "255,190,140", eA * 0.25 * (1 - (d - rr) / 400)); }
    f.tag(cx + rr * Math.cos(-0.22), 560 + rr * Math.sin(-0.22), -40, -50, "OBSERVABLE EDGE", eA * (1 - ramp(t, 9.0, 0.4)), ramp(t, CUE.edge + 0.3, 0.6), "255,170,120", GOLDT);
  }
  quasar(c, x, y, R, t, A, 0.35 + 0.65 * ramp(t, CUE.prod2, 0.5));
  for (let k = 0; k < 5; k++) { const u = t - CUE.prod2 - 0.1 - k * 0.12; if (u <= 0) continue; const an = Math.PI * (0.78 + k * 0.05), d = 30 + 380 * u; packet(c, x + Math.cos(an) * d, y + Math.sin(an) * d, an, 70, 22, 6, "170,220,255", A); }
};

const m1Burst = (c: Ctx, t: number, f: Frame) => {
  const A = ramp(t, 9.3, 0.8); if (A <= 0 || t > 21.2) return;
  const inP = ease(ramp(t, 9.2, 1.6)), out = ease(ramp(t, 19.3, 1.6)), x = 1180 + 900 * (1 - inP), y = 520 - 760 * out;
  const col = ease(Math.pow(ramp(t, CUE.collapse, 0.75), 1.6)), R = 105 * (1 - col) + 5;
  if (t < CUE.unleash + 0.3) {
    starDisc(c, x, y, R, "150,190,255", "90,120,255", A * (1 - ramp(t, CUE.unleash, 0.3)), 41);
    if (col > 0) for (let k = 0; k < 3; k++) { const rr = R + 40 + k * 30 - 60 * col; if (rr > R) beads(c, ellipse(x, y, rr, rr, 0, 120), 5, 1.2, "140,170,255", A * 0.5 * col); }
  }
  const b = ramp(t, CUE.unleash, 0.2);
  if (b > 0) {
    const pk = 1 + 1.5 * g1(t, CUE.unleash + 0.25, 0.5);
    flare(c, x, y, 26 * pk, "210,180,255", A * b, 77, 0.3, 20);
    const L = 700 * easeOut(ramp(t, CUE.unleash, 1.3)), ang = -Math.PI / 2 + 0.28;
    for (const sg of [1, -1]) {
      const e: P = [x + Math.cos(ang) * L * sg, y + Math.sin(ang) * L * sg];
      fade(c, [x, y], e, "230,210,255", 0.95 * A * b, 0.1 * A * b, 5); fade(c, [x, y], e, "150,110,255", 0.35 * A * b, 0, 22);
    }
    for (let k = 0; k < 3; k++) { const q = ramp(t, CUE.unleash + 0.15 + k * 0.35, 2.2); if (q > 0 && q < 1) ripple(c, x, y, q, 20, 700, "190,160,255", 0.6 * A, 1, 160, 6); }
    // gamma photons ride the jets
    for (let k = 0; k < 14; k++) { const u = t - CUE.prod3 - k * 0.08; if (u <= 0) continue; const sg = k % 2 ? 1 : -1, d = 40 + 700 * u; packet(c, x + Math.cos(ang) * d * sg, y + Math.sin(ang) * d * sg, ang + (sg < 0 ? Math.PI : 0), 50, 6, 5, "245,240,255", A); }
  }
  // energy: seconds of burst vs the Sun's whole life
  const pA = A * win(t, CUE.seconds, 19.3, 0.4, 0.5);
  if (pA > 0) SO(c, () => {
    c.globalAlpha = pA; const bx = 140, by = 760;
    c.fillStyle = "rgba(10,8,24,0.75)"; c.fillRect(bx - 20, by - 26, 640, 170);
    const g1w = 560 * easeOut(ramp(t, CUE.seconds, 0.9)), g2w = 470 * ease(ramp(t, CUE.sun, 2.0));
    c.fillStyle = "#b48cff"; c.fillRect(bx, by + 26, g1w, 16); c.fillStyle = "#ffffff"; c.fillRect(bx + g1w - 4, by + 26, 4, 16);
    c.fillStyle = "#f5a043"; c.fillRect(bx, by + 96, g2w, 16);
  });
};

// ================================================================ M2 · the spectrum (19-40)
const LANES = [
  { y: 420, name: "CALM", rgb: "120,240,190", wl: 34, amp: 8, cue: CUE.calm, a: 0.95 },
  { y: 510, name: "VIOLENT", rgb: "215,170,255", wl: 9, amp: 11, cue: CUE.violent, a: 1 },
  { y: 600, name: "FAINT", rgb: "255,110,90", wl: 110, amp: 7, cue: CUE.faint, a: 0.4 },
  { y: 690, name: "ENERGETIC", rgb: "240,245,255", wl: 5, amp: 8, cue: CUE.energetic, a: 1 },
];
const LV = 260, LSP = 420, LX0 = 240;
const laneXs = (t: number, cue: number) => { const out: number[] = []; const base = (LV * (t - 19)) % LSP; for (let x = LX0 + base - LSP; x < W + 120; x += LSP) { const te = t - (x - LX0) / LV; if (x >= LX0 && te >= cue) out.push(x); } return out; };
const NUC = (() => { const r = rng(31); return Array.from({ length: 14 }, (_, i) => ({ x: (r() - 0.5) * 22, y: (r() - 0.5) * 22, p: i % 2 === 0, vx: (r() - 0.3) * 260, vy: (r() - 0.5) * 260 })); })();
const m2Spectrum = (c: Ctx, t: number, f: Frame) => {
  const A = ramp(t, 19.3, 1.0) * (1 - ramp(t, 39.3, 1.0)); if (A <= 0) return;
  const oy = 700 * (1 - ease(ramp(t, 19.3, 1.6))) - 0 * t, gA = A * (1 - ramp(t, CUE.empty, 1.0));
  if (gA > 0) { for (let x = 60; x < W; x += 60) hair(c, [[x, 340 + oy], [x, 860 + oy]], CYAN, 0.06 * gA, 1); for (let y = 340; y <= 860; y += 60) hair(c, [[0, y + oy], [W, y + oy]], CYAN, 0.06 * gA, 1); }
  LANES.forEach((L, i) => {
    const y = L.y + oy, lp = easeOut(ramp(t, CUE.every + i * 0.15, 0.9));
    beads(c, [[LX0 - 40, y], [W - 60, y]], 8, 1, L.rgb, 0.25 * A, lp);
    dot(c, LX0 - 40, y, 5, L.rgb, A * lp); glow(c, LX0 - 40, y, 16, L.rgb, 0.4 * A * lp);
    for (const x of laneXs(t, L.cue)) packet(c, x, y, 0, L.wl > 60 ? 150 : 90, L.wl, L.amp + (L.name === "VIOLENT" ? 3 * Math.sin(x * 0.2) : 0), L.rgb, A * L.a * (L.name === "FAINT" ? 0.75 + 0.25 * Math.sin(x * 0.05 + t * 3) : 1), L.name === "ENERGETIC" ? 3 : 2.4);
  });
  // faint lane: a detector that barely clicks
  const dA = A * win(t, CUE.faint + 0.4, 34, 0.5, 0.6);
  if (dA > 0) { const y = 600 + oy; SO(c, () => { c.globalAlpha = dA; c.fillStyle = "#1c1a30"; c.fillRect(1790, y - 34, 60, 68); c.fillStyle = "#3a3656"; c.fillRect(1790, y - 34, 60, 6); }); const hit = laneXs(t, LANES[2].cue).some((x) => x > 1760 && x < 1800); dot(c, 1820, y, 6, hit ? "255,150,120" : "90,60,70", dA); if (hit) glow(c, 1820, y, 26, "255,120,90", 0.5 * dA); }
  // energetic lane: one photon shatters a nucleus
  const nx = 1560, ny = 690 + oy, hitT = 29.55, hx = nx - LV * (hitT - t);
  if (t > CUE.energetic && t < hitT + 0.05) packet(c, hx, ny, 0, 90, 5, 9, "255,255,255", A, 3.2);
  NUC.forEach((n, i) => { const u = Math.max(0, t - hitT), x = nx + n.x + n.vx * u, y = ny + n.y + n.vy * u + 60 * u * u; circ(c, x, y, 7, rgba(n.p ? "255,90,90" : "140,160,220", A * (1 - clamp(u / 2.2)) * ramp(t, CUE.energetic + 0.3, 0.6) * (u > 0 || i >= 0 ? 1 : 0))); });
  if (t > hitT) { flare(c, nx, ny, 30 * (1 - clamp((t - hitT) / 1.2)), "255,230,200", A, 13, 0, 14); }
  // same speed: a column locked to the photons
  const cA = A * win(t, CUE.travels, CUE.notApprox, 0.4, 0.5);
  if (cA > 0) { const x = LX0 + ((LV * (t - 19)) % LSP) + LSP * 2; fade(c, [x, 360 + oy], [x, 750 + oy], WHITE, 0.2 * cA, 0.2 * cA, 18); hair(c, [[x, 360 + oy], [x, 750 + oy]], WHITE, 0.7 * cA * (1 + g1(t, CUE.exactly1 + 0.2, 0.3)), 2); LANES.forEach((L) => reticle(c, x, L.y + oy, 22, t * 2, L.rgb, cA)); }
  // identical readouts, then one bracket: EXACTLY
  const bA = A * ramp(t, CUE.exactly2, 0.4);
  if (bA > 0) { hairG(c, [[1780, 400 + oy], [1800, 400 + oy], [1800, 710 + oy], [1780, 710 + oy]], WHITE, bA, 2.5, easeOut(ramp(t, CUE.exactly2, 0.5))); glow(c, 1800, 555 + oy, 80, WHITE, 0.3 * bA * g1(t, CUE.exactly2 + 0.3, 0.4)); }
};

// ================================================================ M3 · the race (39-64)
const QPATH = (() => { const pts: P[] = []; for (let i = 0; i <= 26; i++) { const a = Math.PI * 1.05 + (i / 26) * Math.PI * 1.45; pts.push([960 + Math.cos(a) * 95, 450 + Math.sin(a) * 95]); } const l = pts[pts.length - 1]; pts.push([l[0] - 10, l[1] + 40], [960, 610], [960, 650]); return pts; })();
const GALS = (() => { const r = rng(41); return Array.from({ length: 16 }, () => ({ x: r() * 2400, y: 180 + r() * 700, s: 0.5 + r(), a: r() * TAU, hot: r() })); })();
const m3Race = (c: Ctx, t: number, f: Frame) => {
  const A = ramp(t, 39.3, 0.8) * (1 - ramp(t, 64.6, 1.4)); if (A <= 0) return;
  const tilt = 150 * ease(ramp(t, CUE.ancient - 0.3, 1.2)), y1 = 530 - tilt, y2 = 700 - tilt, hx = 1100;
  const track = 900 * Math.max(0, t - CUE.racing) - 450 * ramp(t, CUE.racing, 1) * 0, why = ease(ramp(t, 60.9, 1.6)), tA = A * (1 - why);
  // the candle beside you, left behind as we race
  const cx = 250 - track * ramp(t, CUE.racing, 0.01);
  if (cx > -200) candle(c, cx, 560 - tilt, 0.7, t, A * (1 - ramp(t, CUE.racing + 0.4, 0.8)));
  // ruler ticks stream past (camera moving with the light)
  if (tA > 0) for (const yy of [y1, y2]) { const off = (track * 1.0) % 80; for (let x = W + 80 - off; x > -80; x -= 80) hair(c, [[x, yy + 34], [x, yy + 44]], PALE, 0.35 * tA * ramp(t, 40.5, 0.6), 1.5); }
  // ancient galaxies slide by
  const gA = tA * win(t, CUE.ancient + 0.6, 60, 0.8, 0.6);
  if (gA > 0) for (const g of GALS) { const x = ((g.x - track * 0.35) % 2400 + 2400) % 2400 - 240; beads(c, ellipse(x, g.y, 26 * g.s, 9 * g.s, g.a, 30), 3, 1, g.hot > 0.5 ? "255,190,150" : "170,180,255", 0.5 * gA); glow(c, x, g.y, 12 * g.s, "255,220,190", 0.4 * gA); }
  // photon 1: from the candle to the lead position, then locked
  const e1 = t < CUE.racing ? lerp(cx + 10, hx, easeOut(ramp(t, CUE.left, 2.8))) : hx;
  if (t > CUE.left && why < 1) { fade(c, [Math.max(-20, e1 - 900), y1], [e1, y1], "255,210,130", 0, 0.5 * tA, 3); packet(c, e1, y1, 0, 110, 22, 9, "255,215,140", tA); }
  // photon 2: 13 billion years in flight, redshifted, trail back beyond the frame
  const a2 = tA * ramp(t, CUE.ancient - 0.3, 1.0);
  if (a2 > 0) { fade(c, [-40, y2], [hx, y2], "255,110,90", 0.05 * a2, 0.5 * a2, 3); packet(c, hx, y2, 0, 170, 64, 12, "255,120,95", a2, 2.6); }
  if (a2 > 0) f.tag(hx, y2, -60, 60, "13 BILLION YEARS", a2 * win(t, CUE.billion, 60.5, 0.3, 0.5), ramp(t, CUE.billion, 0.6), "255,140,110", "#ffb0a0");
  // a push that does nothing
  const pA = tA * win(t, CUE.pushes - 0.2, CUE.accel + 0.3, 0.3, 0.4);
  if (pA > 0) { const q = easeOut(ramp(t, CUE.pushes - 0.2, 0.7)); arrow(c, [hx - 420, y1 - 70], [lerp(hx - 420, hx - 60, q), lerp(y1 - 70, y1 - 20, q)], RED, pA, 4); if (q >= 1) xmark(c, hx - 60, y1 - 30, 18, ramp(t, CUE.pushes + 0.6, 0.4), pA); }
  // the speed gauge, locked at c
  const gg = tA * ramp(t, CUE.accel - 0.4, 0.5), gx = 960, gy = 880, gr = 120;
  if (gg > 0) {
    beads(c, ellipse(gx, gy, gr, gr, 0, 60, Math.PI, TAU), 5, 1.6, PALE, gg);
    for (let k = 0; k <= 10; k++) { const a = Math.PI + (k / 10) * Math.PI; hair(c, [[gx + Math.cos(a) * (gr - 16), gy + Math.sin(a) * (gr - 16)], [gx + Math.cos(a) * gr, gy + Math.sin(a) * gr]], PALE, 0.7 * gg, 2); }
    const sl = ramp(t, CUE.slow, 0.4), fs = ramp(t, CUE.fast, 0.4);
    if (sl > 0) { beads(c, ellipse(gx, gy, gr - 8, gr - 8, 0, 30, Math.PI, Math.PI * 1.35), 4, 2.4, RED, gg * sl); xmark(c, gx - gr * 0.72, gy - gr * 0.5, 14, ramp(t, CUE.slow + 0.2, 0.4), gg); }
    if (fs > 0) { beads(c, ellipse(gx, gy, gr - 8, gr - 8, 0, 30, Math.PI * 1.65, TAU), 4, 2.4, RED, gg * fs); xmark(c, gx + gr * 0.72, gy - gr * 0.5, 14, ramp(t, CUE.fast + 0.2, 0.4), gg); }
    const wob = 0.35 * Math.sin(t * 5) * win(t, CUE.accel, CUE.accel + 1.2, 0.2, 0.6) * 0;
    hairG(c, [[gx, gy], [gx + Math.cos(-Math.PI / 2 + wob) * (gr - 24), gy + Math.sin(-Math.PI / 2 + wob) * (gr - 24)]], WHITE, gg, 3);
    const one = ramp(t, CUE.onlyOne, 0.3); if (one > 0) { glow(c, gx, gy - gr, 40, WHITE, 0.6 * gg * one); const q = ramp(t, CUE.onlyOne, 1.4); if (q < 1) ripple(c, gx, gy - gr, q, 10, 160, WHITE, 0.8 * gg, 1, 80, 5); }
    // throttle that pushes and changes nothing
    const th = win(t, CUE.accel, CUE.slow, 0.3, 0.4) * gg; if (th > 0) { const lift = 50 * ease(ramp(t, CUE.accel, 0.6)); hairG(c, [[gx + 220, gy], [gx + 220, gy - 40 - lift]], AMBER, th, 4); circ(c, gx + 220, gy - 44 - lift, 9, rgba(AMBER, th)); }
  }
  // ...and the question: both photons curl into a ?
  if (why > 0) {
    const q = ramp(t, 60.9, 1.9);
    beads(c, QPATH, 7, 2.2, "255,215,140", A * why * 0.9, Math.min(q, 0.93)); beads(c, QPATH.map(([x, y]) => [x + 3, y + 2] as P), 9, 1.6, "255,120,95", A * why * 0.7, Math.min(q, 0.93));
    const n = QPATH.length, k = Math.min(n - 1, Math.floor(q * (n - 1))), hp = QPATH[k];
    if (q < 0.93) { glow(c, hp[0], hp[1], 24, WARM, 0.8 * A); dot(c, hp[0], hp[1], 3, WHITE, A); }
    const dq = ramp(t, CUE.why, 0.4); circ(c, 960, 700, 11 * dq, rgba("255,230,180", A * dq)); glow(c, 960, 700, 50, WARM, 0.6 * A * dq);
  }
};

// ================================================================ M4 · the channel (64-89)
const NET = (() => { const r = rng(51), nodes: { x: number; y: number; t0: number; m: number }[] = []; for (let i = 0; i < 26; i++) nodes.push({ x: 980 + (r() - 0.5) * 560, y: 560 + (r() - 0.5) * 340, t0: 66 + r() * 2.5, m: r() }); for (let i = 0; i < 40; i++) { const a = r() * TAU, d = 260 + r() * 260; nodes.push({ x: 980 + Math.cos(a) * d * 1.3, y: 560 + Math.sin(a) * d * 0.62, t0: CUE.grow - 0.3 + r() * 1.6, m: r() }); } const edges: [number, number][] = []; nodes.forEach((a, i) => { let best = -1, bd = 1e9; nodes.forEach((b, j) => { if (j < i) { const d = (a.x - b.x) ** 2 + (a.y - b.y) ** 2; if (d < bd) { bd = d; best = j; } } }); if (best >= 0) edges.push([i, best]); }); return { nodes, edges }; })();
const DYN = Array.from({ length: 8 }, (_, i) => [760 + i * 105, i % 2 ? 610 : 500] as P);
const m4Channel = (c: Ctx, t: number, f: Frame) => {
  const A = ramp(t, 63.6, 1.0) * (1 - ramp(t, 87.4, 0.5)); if (A <= 0) return;
  const coll = ease(ramp(t, CUE.now, 1.1)), sq = 1 - coll, S = (p: P): P => [lerp(960, p[0], sq), lerp(560, p[1], sq)];
  // the ? dissolves into a constellation that grows
  const nA = A * (1 - ramp(t, CUE.small - 0.2, 0.9));
  if (nA > 0) {
    const form = ease(ramp(t, 65.4, 2.4));
    NET.edges.forEach(([i, j]) => { const a = NET.nodes[i], b = NET.nodes[j], on = Math.max(a.t0, b.t0) + 0.3; hair(c, [S([a.x, a.y]), S([b.x, b.y])], PALE, 0.3 * nA * ramp(t, on, 0.5), 1.4); });
    NET.nodes.forEach((n, i) => { const qx = QPATH[i % QPATH.length], p = S([lerp(qx[0], n.x, form), lerp(qx[1], n.y, form)]), on = ramp(t, n.t0, 0.4); dot(c, p[0], p[1], 2 + 1.5 * n.m, n.m > 0.7 ? WARM : PALE, nA * Math.max(on, 1 - form) * 0.9); });
    const like = ramp(t, CUE.like, 0.3); if (like > 0) { const n = NET.nodes[3]; flare(c, n.x, n.y, 14 * like * (1 + 0.6 * g1(t, CUE.like + 0.3, 0.4)), "255,200,110", nA, 91, 0.2, 12); }
    const sub = ramp(t, CUE.subscribe, 0.3); if (sub > 0) { const n = NET.nodes[3]; reticle(c, n.x, n.y, 30 + 60 * (1 - easeOut(ramp(t, CUE.subscribe, 0.7))), t, GOLD, nA * sub); }
  }
  // one photon, a photomultiplier: a small thing becomes a huge difference
  const pA = A * ramp(t, CUE.small - 0.4, 0.8) * (1 - ramp(t, CUE.spotify - 0.3, 1.0));
  if (pA > 0) {
    SO(c, () => { c.globalAlpha = pA; c.fillStyle = "rgba(90,130,200,0.14)"; c.beginPath(); c.roundRect(620, 440, 1060, 230, 110); c.fill(); });
    hairG(c, ellipse(1150, 555, 530, 116, 0, 90), PALE, 0.55 * pA, 2);
    SO(c, () => { c.globalAlpha = pA; c.fillStyle = "#6a5a8a"; c.fillRect(650, 490, 16, 130); DYN.forEach(([x, y], i) => { c.fillStyle = i % 2 ? "#8a7aa8" : "#9a8ab8"; c.fillRect(x - 30, y - 6, 60, 12); }); c.fillStyle = "#b0a0d0"; c.fillRect(1600, 500, 20, 110); });
    const ph = ramp(t, CUE.small + 0.3, 0.8); if (ph > 0 && ph < 1) packet(c, lerp(380, 660, ph), 555, 0, 70, 16, 6, "180,230,255", pA);
    // cascade: every dynode multiplies the electrons
    const casc = t - CUE.huge;
    if (casc > -1.4) {
      const r = rng(61);
      for (let s = 0; s < 8; s++) {
        const a = s === 0 ? [666, 555] as P : DYN[s - 1], b = DYN[s], t0 = CUE.small + 1.1 + s * 0.3 + (s > 1 ? 0.25 * (s - 1) * ramp(t, CUE.huge, 0.01) : 0), u = clamp((t - t0) / 0.3), n = Math.min(90, Math.round(Math.pow(3, s)));
        if (u <= 0) continue;
        for (let k = 0; k < n; k++) { const jx = (r() - 0.5) * (8 + s * 5), jy = (r() - 0.5) * (8 + s * 5), x = lerp(a[0], b[0], u) + jx, y = lerp(a[1], b[1], u) + jy - 26 * Math.sin(Math.PI * u) * (s % 2 ? -1 : 1); dot(c, x, y, 1.6, s > 5 ? WHITE : CYAN, pA * (u < 1 ? 1 : 0.35)); }
        if (u >= 1) glow(c, b[0], b[1], 16 + s * 4, CYAN, 0.35 * pA);
      }
      // the output pulse on a scope
      const sp = ramp(t, CUE.huge + 0.6, 0.6), sx = 1300, sy = 790, pts: P[] = [];
      for (let i = 0; i <= 90; i++) { const x = sx + i * 5, u = (x - sx - 225) / 22, v = sp * 110 * Math.exp(-u * u) * (u < 0 ? 1 : Math.exp(-u * 0.6)); pts.push([x, sy - v]); }
      hairG(c, pts, "120,255,170", pA * ramp(t, CUE.huge + 0.3, 0.4), 2);
      hair(c, [[sx, sy + 4], [sx + 450, sy + 4]], PALE, 0.3 * pA, 1);
    }
  }
  // a waveform, the links below, listeners around the globe
  const wA = A * ramp(t, CUE.spotify - 0.5, 0.7);
  if (wA > 0) {
    const shr = 1 - 0.4 * ease(ramp(t, CUE.listen, 1.0));
    for (let i = 0; i < 44; i++) { const x = 560 + i * 20, env = Math.sin((i / 43) * Math.PI), h = (20 + 140 * env * (0.4 + 0.6 * Math.abs(Math.sin(i * 1.7 + t * 5.3) * Math.sin(i * 0.61 + t * 2.1)))) * ramp(t, CUE.spotify - 0.5 + i * 0.012, 0.3) * shr; const p0 = S([x, 600 - h / 2]), p1 = S([x, 600 + h / 2]); hairG(c, [p0, p1], "90,235,140", wA, 5); }
    const arA = wA * win(t, CUE.links, CUE.listen + 0.3, 0.3, 0.4); if (arA > 0) { const bob = 16 * easeOut(ramp(t, CUE.links, 0.5)); arrow(c, [960, 740], [960, 820 + bob], "90,235,140", arA, 5); }
  }
  const gA = A * ramp(t, CUE.listen, 0.6);
  if (gA > 0) {
    const g = S([1560, 470]), R = 120 * sq;
    drawGlobe(c, FIB, g[0], g[1], R, 0.6 + 0.2 * t, gA, 0);
    const r = rng(71); for (let k = 0; k < 22; k++) { const on = CUE.wherever + r() * 1.2, a = r() * TAU, d = Math.sqrt(r()) * 0.85; if (t > on) { const px = g[0] + Math.cos(a) * d * R, py = g[1] + Math.sin(a) * d * R; dot(c, px, py, 2.2, "90,235,140", gA); glow(c, px, py, 10, "90,235,140", 0.5 * gA); } }
    for (let k = 0; k < 2; k++) { const q = ramp(t, CUE.listen + 0.3 + k * 0.7, 2); if (q > 0 && q < 1) ripple(c, g[0], g[1], q, R, R + 200, "90,235,140", 0.6 * gA * sq, 1, 120, 6); }
  }
  // everything collapses to a point, then a flash opens the lab
  if (t > CUE.now) { const b = g1(t, CUE.begin + 0.35, 0.45); flare(c, 960, 560, 10 + 90 * b, WHITE, A * ramp(t, CUE.now, 0.4) + b, 99, 0, 18); }
};
const FIB = makeSphere(2400, 9);

// ================================================================ M5-M10 · the lab of four chambers (86-162)
const CH = [330, 750, 1170, 1590], CHY = 560;
type Key = [number, number, number, number];
const LABK: Key[] = [[87.0, 0.2, 960, 560], [89.0, 1, 960, 560], [97.6, 1.05, 960, 560], [98.9, 2.3, 330, 520], [105.4, 2.3, 330, 520], [106.6, 2.3, 750, 520], [118.4, 2.3, 750, 520], [119.5, 2.3, 1170, 520], [125.8, 2.3, 1170, 520], [126.9, 2.3, 1590, 520], [135.9, 2.3, 1590, 520], [137.1, 2.0, 1790, 540], [141.4, 2.0, 1790, 540], [143.0, 1, 960, 560], [147.2, 1, 960, 560], [148.5, 0.55, 657, 907], [163, 0.55, 657, 907]];
const labCam = (t: number) => { let i = 0; while (i < LABK.length - 2 && t > LABK[i + 1][0]) i++; const a = LABK[i], b = LABK[i + 1], k = ease(clamp((t - a[0]) / (b[0] - a[0]))), z = Math.exp(lerp(Math.log(a[1]), Math.log(b[1]), k)); return { z, fx: lerp(a[2], b[2], k), fy: lerp(a[3], b[3], k) }; };
const archPath = (c: Ctx, x: number) => { c.beginPath(); c.moveTo(x - 170, 780); c.lineTo(x - 170, 380); c.arc(x, 380, 170, Math.PI, TAU); c.lineTo(x + 170, 780); c.closePath(); };
const NEB = (() => { const r = rng(81); return Array.from({ length: 900 }, () => { const a = r() * TAU, d = Math.pow(r(), 0.7) * 190; return { x: 750 + Math.cos(a) * d + Math.sin(a * 3) * 20, y: 520 + Math.sin(a) * d * 1.2, m: r() }; }); })();
const MOLS = (() => { const r = rng(83); return Array.from({ length: 16 }, (_, i) => ({ t0: 99.3 + i * 0.38, side: i % 2 ? 1 : -1, y: 520 + r() * 80, a: r() * TAU })); })();
const FUS = (() => { const r = rng(85); return Array.from({ length: 12 }, (_, i) => ({ t0: CUE.fusion - 0.2 + i * 0.36, a: -0.6 + r() * 1.3, d: r() * 30, walk: Array.from({ length: 16 }, () => r() * TAU) })); })();
const chamberInterior = (c: Ctx, i: number, t: number, A: number) => {
  const x = CH[i];
  if (i === 0) { // candle and its chemistry
    c.fillStyle = lin(0, 220, 0, 780, [[0, "#1c1210"], [1, "#2c1a12"]], c); c.fillRect(x - 170, 200, 340, 580);
    c.fillStyle = "#3a2618"; c.fillRect(x - 170, 720, 340, 60);
    c.restore(); c.save(); archPath(c, x); c.clip(); c.globalCompositeOperation = "lighter";
    candle(c, x, 590, 0.95, t, A, 5);
    const chem = A * win(t, 99.3, 105.6, 0.5, 0.5);
    if (chem > 0) for (const m of MOLS) { const u = t - m.t0; if (u < 0 || u > 2.2) continue;
      if (u < 1) { const px = x + m.side * lerp(150, 12, easeOut(u)), py = lerp(m.y, 555, u); circ(c, px - 5, py, 5, rgba("255,90,80", chem)); circ(c, px + 5, py, 5, rgba("255,90,80", chem)); circ(c, x + m.side * lerp(40, 4, u), 600 - 20 * u, 4, rgba("60,60,70", chem)); }
      else { const v = u - 1, px = x + m.side * (6 + 30 * v) + 8 * Math.sin(m.a + v * 4), py = 520 - 170 * v; circ(c, px, py, 5, rgba("90,90,100", chem * (1 - v / 1.2))); circ(c, px - 9, py, 5, rgba("255,90,80", chem * (1 - v / 1.2))); circ(c, px + 9, py, 5, rgba("255,90,80", chem * (1 - v / 1.2))); if (v < 0.5) packet(c, x + Math.cos(m.a) * (20 + 300 * v), 545 + Math.sin(m.a) * (20 + 300 * v), m.a, 40, 12, 4, "255,220,130", chem * (1 - v * 2)); }
    }
    const th = A * ramp(t, CUE.temp - 0.2, 0.5); if (th > 0) { const tx = x + 128; SO(c, () => { c.globalAlpha = th; c.fillStyle = "#2a2a3a"; c.fillRect(tx - 10, 300, 20, 380); circ(c, tx, 690, 18, "#2a2a3a"); }); const lv = ease(ramp(t, CUE.temp, 1.6)); circ(c, tx, 690, 12, rgba("255,80,60", th)); SO(c, () => { c.globalAlpha = th; c.fillStyle = "#ff5a3c"; c.fillRect(tx - 5, 690 - 360 * lv, 10, 360 * lv); }); for (let k = 0; k < 9; k++) hair(c, [[tx + 12, 320 + k * 42], [tx + 22, 320 + k * 42]], PALE, 0.6 * th, 1.5); }
  }
  if (i === 1) { // cold hydrogen cloud, two levels, one drop, one radio photon
    c.fillStyle = lin(0, 220, 0, 780, [[0, "#070a1e"], [1, "#0d1030"]], c); c.fillRect(x - 170, 200, 340, 580);
    c.restore(); c.save(); archPath(c, x); c.clip(); c.globalCompositeOperation = "lighter";
    for (const n of NEB) dot(c, n.x + 8 * Math.sin(t * 0.2 + n.m * 6), n.y, 1.2 + n.m * 1.4, n.m > 0.6 ? "130,150,255" : "90,90,200", A * 0.18);
    const ax = x, ay = 520;
    beads(c, ellipse(ax, ay, 55, 55, 0, 60), 5, 1.4, PALE, A * 0.7); beads(c, ellipse(ax, ay, 100, 100, 0, 90), 6, 1.4, PALE, A * 0.55);
    circ(c, ax, ay, 9, rgba("255,90,90", A)); glow(c, ax, ay, 26, "255,90,90", 0.5 * A);
    const drop = ease(ramp(t, CUE.dropping, 0.9)), rr = lerp(100, 55, drop), an = t * (drop < 1 ? 1.6 : 2.6) + drop * 3;
    dot(c, ax + Math.cos(an) * rr, ay + Math.sin(an) * rr, 5, CYAN, A); glow(c, ax + Math.cos(an) * rr, ay + Math.sin(an) * rr, 16, CYAN, 0.6 * A);
    const dA = A * ramp(t, CUE.levels - 0.3, 0.6); if (dA > 0) { hairG(c, [[x - 150, 310], [x - 60, 310]], PALE, dA, 2); hairG(c, [[x - 150, 380], [x - 60, 380]], PALE, dA, 2); arrow(c, [x - 105, 316], [x - 105, 372], CYAN, dA * ramp(t, CUE.levels, 0.4), 2.5); }
  }
  if (i === 2) { // the Sun, cut open
    c.fillStyle = lin(0, 220, 0, 780, [[0, "#1a0c06"], [1, "#2a1206"]], c); c.fillRect(x - 170, 200, 340, 580);
    c.restore(); c.save(); archPath(c, x); c.clip(); c.globalCompositeOperation = "lighter";
    const sx = x, sy = 520, R = 145;
    glow(c, sx, sy, R * 1.8, "255,150,60", 0.35 * A);
    const g = c.createRadialGradient(sx, sy, 0, sx, sy, R); g.addColorStop(0, rgba("255,250,210", A)); g.addColorStop(0.6, rgba("255,170,70", A)); g.addColorStop(1, rgba("220,80,30", A)); circ(c, sx, sy, R, g);
    const r = rng(87); for (let k = 0; k < 220; k++) { const a = r() * TAU, d = Math.sqrt(r()) * R * 0.97; dot(c, sx + Math.cos(a) * d, sy + Math.sin(a) * d, 2 + r() * 2, r() < 0.5 ? "140,50,20" : "255,220,150", A * 0.25); }
    // the cutaway wedge: core, radiative zone, convective zone
    const a0 = -0.25, a1 = 1.05, wedge = (rad: number, fill: string) => { c.fillStyle = fill; c.beginPath(); c.moveTo(sx, sy); c.arc(sx, sy, rad, a0, a1); c.closePath(); c.fill(); };
    SO(c, () => { c.globalAlpha = A; wedge(R, "#7a2a10"); wedge(R * 0.7, "#c05a18"); wedge(R * 0.25, "#fff2b0"); });
    for (let k = 0; k < 5; k++) { const a = lerp(a0, a1, (k + 0.5) / 5); beads(c, ellipse(sx + Math.cos(a) * R * 0.85, sy + Math.sin(a) * R * 0.85, 12, 12, 0, 16), 3, 1, "255,160,90", A * 0.6); }
    const fu = A * ramp(t, CUE.fusion - 0.3, 0.4);
    if (fu > 0) for (const e of FUS) { const u = t - e.t0; if (u < -0.5) continue; const cxp = sx + Math.cos(e.a) * e.d, cyp = sy + Math.sin(e.a) * e.d;
      if (u < 0) { const k2 = 1 + u / 0.5; circ(c, cxp - 22 * (1 - k2), cyp, 5, rgba("255,70,70", fu)); circ(c, cxp + 22 * (1 - k2), cyp, 5, rgba("255,70,70", fu)); }
      else { if (u < 0.4) flare(c, cxp, cyp, 10 * (1 - u / 0.4), WHITE, fu, 17, 0, 8); circ(c, cxp, cyp, 6, rgba("255,230,90", fu * (1 - clamp((u - 1.5) / 1)))); const pts: P[] = [[cxp, cyp]]; const steps = Math.min(16, Math.floor(u * 8)); for (let s = 0; s < steps; s++) { const l = pts[pts.length - 1]; pts.push([l[0] + Math.cos(e.walk[s]) * 12, l[1] + Math.sin(e.walk[s]) * 12]); } if (pts.length > 1) hairG(c, pts, WHITE, fu * 0.8, 1.6); }
    }
  }
  if (i === 3) { // gamma-ray burst: collapse, black hole, jets
    c.fillStyle = lin(0, 220, 0, 780, [[0, "#0a0618"], [1, "#140a26"]], c); c.fillRect(x - 170, 200, 340, 580);
    c.restore(); c.save(); archPath(c, x); c.clip(); c.globalCompositeOperation = "lighter";
    const bx = x, by = 520, col = ease(ramp(t, CUE.gamma2 + 0.3, 1.0)), over = t < 120;
    if (!over && col < 1) starDisc(c, bx, by, 110 * (1 - col) + 12, "140,180,255", "80,110,255", A * (1 - col * 0.7), 43);
    const jets = over ? 0.6 : ramp(t, CUE.gamma2 + 1.2, 0.4);
    if (jets > 0) {
      beads(c, ellipse(bx, by, 70, 18, 0.12, 60, t * 2, t * 2 + TAU), 4, 1.6, AMBER, A * jets); beads(c, ellipse(bx, by, 44, 11, 0.12, 50, t * 3, t * 3 + TAU), 4, 1.6, "255,230,160", A * jets);
      SO(c, () => { c.globalAlpha = A * jets; circ(c, bx, by, 13, "#000000"); }); hair(c, ellipse(bx, by, 15, 15, 0, 30), "255,240,200", A * jets, 2);
      for (const sg of [1, -1]) { fade(c, [bx, by], [bx + 30 * sg, by - 330 * sg], "230,210,255", 0.9 * A * jets, 0.2 * A * jets, 5); fade(c, [bx, by], [bx + 30 * sg, by - 330 * sg], "150,110,255", 0.3 * A * jets, 0, 24); }
      const rel = A * ramp(t, CUE.releases, 0.4); if (rel > 0) for (let k = 0; k < 10; k++) { const u = ((t - CUE.releases) * 1.2 + k / 10) % 1, sg = k % 2 ? 1 : -1; packet(c, bx + 30 * u * sg, by - 330 * u * sg, sg > 0 ? -Math.PI / 2 + 0.09 : Math.PI / 2 + 0.09, 40, 5, 5, "250,245,255", rel * (1 - u)); }
    }
  }
};
const drawLab = (c: Ctx, t: number, A: number, f: Frame) => {
  const { z, fx, fy } = labCam(t);
  c.save(); c.translate(CX - fx * z, CY - fy * z); c.scale(z, z);
  // interiors first, each clipped to its arch
  for (let i = 0; i < 4; i++) { c.save(); archPath(c, CH[i]); c.clip(); c.globalCompositeOperation = "source-over"; c.globalAlpha = A; chamberInterior(c, i, t, A); c.restore(); }
  // the wall with four arched openings, frames, floor
  SO(c, () => {
    c.globalAlpha = A; c.beginPath(); c.rect(-600, 140, 3100, 700); for (const x of CH) { c.moveTo(x - 170, 780); c.lineTo(x - 170, 380); c.arc(x, 380, 170, Math.PI, TAU); c.lineTo(x + 170, 780); c.closePath(); }
    c.fillStyle = lin(0, 140, 0, 840, [[0, "#0a0916"], [0.5, "#121024"], [1, "#0a0916"]], c); c.fill("evenodd");
    c.fillStyle = "#1a1830"; for (let x = -600; x < 2500; x += 210) c.fillRect(x, 140, 4, 700);
    c.fillStyle = "#23203c"; c.fillRect(-600, 176, 3100, 12); c.fillRect(-600, 196, 3100, 6);
    c.fillStyle = lin(0, 840, 0, 1100, [[0, "#0e0c1c"], [1, "#050410"]], c); c.fillRect(-600, 840, 3100, 300);
    c.fillStyle = "#1c1a32"; for (let k = 0; k < 8; k++) c.fillRect(-600, 860 + k * 26, 3100, 2);
    for (const x of CH) { c.fillStyle = "#2a2644"; c.fillRect(x - 70, 800, 140, 26); c.fillStyle = "#3a3658"; c.fillRect(x - 70, 800, 140, 4); }
  });
  for (let i = 0; i < 4; i++) { const x = CH[i], pts: P[] = [[x - 176, 784], [x - 176, 380], ...ellipse(x, 380, 176, 176, 0, 24, Math.PI, TAU).slice(1), [x + 176, 784]]; hairG(c, pts, ["255,190,120", "140,160,255", "255,160,80", "190,150,255"][i], 0.6 * A, 2.5); glow(c, x, 900, 180, ["255,170,90", "120,140,255", "255,140,60", "170,130,255"][i], 0.08 * A); }
  // leftovers of chamber 4: the detector satellite, the alloy plate, the hole
  const dA = A * win(t, CUE.violent2, 142.5, 0.5, 0.8);
  if (dA > 0) { SO(c, () => { c.globalAlpha = dA; c.fillStyle = "#8a90b0"; c.fillRect(1818, 250, 34, 26); c.fillStyle = "#3a5aa0"; c.fillRect(1780, 256, 36, 14); c.fillRect(1854, 256, 36, 14); }); const hit = ramp(t, CUE.detected, 0.2); if (hit > 0) { const q = ramp(t, CUE.detected, 1.2); if (q < 1) ripple(c, 1835, 263, q, 8, 90, WHITE, dA, 1, 60, 5); glow(c, 1835, 263, 30, WHITE, 0.6 * dA * (1 - ramp(t, CUE.detected + 0.5, 1))); } }
  const plA = A * win(t, CUE.single - 0.6, 143, 0.5, 0.8);
  if (plA > 0) {
    SO(c, () => { c.globalAlpha = plA; c.fillStyle = lin(1880, 0, 1920, 0, [[0, "#2e3244"], [0.5, "#4e5468"], [1, "#24283a"]], c); c.fillRect(1880, 380, 40, 360); c.fillStyle = "#3a3e52"; for (let y = 400; y < 740; y += 60) { c.fillRect(1886, y, 6, 6); c.fillRect(1908, y, 6, 6); } });
    for (let y = 392; y < 736; y += 10) for (let xx = 1884; xx < 1918; xx += 10) dot(c, xx, y, 1, "150,160,190", plA * 0.15);
    const ph = ramp(t, CUE.single, CUE.hole - CUE.single);
    if (ph > 0 && ph < 1) packet(c, lerp(1600, 1900, ph), lerp(500, 560, ph), Math.atan2(60, 300), 60, 5, 5, WHITE, plA, 3);
    const h = ramp(t, CUE.hole, 0.25);
    if (h > 0) { SO(c, () => { c.globalAlpha = plA; circ(c, 1900, 560, 16 * h, "#08060e"); }); hair(c, ellipse(1900, 560, 17 * h, 17 * h, 0, 30), "255,140,60", plA * (1 - ramp(t, CUE.hole + 1.5, 2)), 3); glow(c, 1900, 560, 50, "255,120,50", plA * 0.6 * (1 - ramp(t, CUE.hole + 0.5, 2))); const r = rng(93); for (let k = 0; k < 30; k++) { const u = t - CUE.hole - r() * 0.3; if (u > 0 && u < 1.2) dot(c, 1920 + (80 + r() * 260) * u, 560 + (r() - 0.5) * 220 * u + 200 * u * u, 2, r() < 0.5 ? "255,200,90" : "255,120,50", plA * (1 - u / 1.2)); } const u2 = t - CUE.hole; if (u2 > 0 && u2 < 1.5) packet(c, 1920 + 400 * u2, 560 + 80 * u2, Math.atan2(60, 300), 60, 5, 5, WHITE, plA * (1 - u2 / 1.5), 3); }
  }
  // the radio photon leaves chamber 2 through the glass
  const rA = A * win(t, CUE.releasing, 119.5, 0.3, 0.8);
  if (rA > 0) { const u = t - CUE.releasing; packet(c, 750 + 60 + 150 * u, 520, 0, 220, 70, 14, "255,110,90", rA, 3); }
  c.restore();
  const S = (p: P): P => [CX + (p[0] - fx) * z, CY + (p[1] - fy) * z];
  return S;
};

// ---- the comparison chart (screen space, under the top row of chambers)
const COLX = [780, 1011, 1242, 1473], LOGE = [0.77, 6.3, 12, 17];
const drawChart = (c: Ctx, t: number, A: number) => {
  if (A <= 0) return;
  const r1 = A * ramp(t, CUE.reactant, 0.4), r3 = A * ramp(t, CUE.energies, 0.4);
  if (r1 > 0) COLX.forEach((x, i) => { const y = 545; if (i === 0) { for (let k = 0; k < 4; k++) circ(c, x - 30 + k * 14, y, 5, rgba(k % 2 ? "220,220,230" : "70,70,80", r1)); circ(c, x + 34, y - 4, 5, rgba("255,90,80", r1)); circ(c, x + 44, y - 4, 5, rgba("255,90,80", r1)); } if (i === 1) { circ(c, x, y, 7, rgba("255,90,90", r1)); beads(c, ellipse(x, y, 20, 20, 0, 30), 4, 1.2, PALE, r1); } if (i === 2) { circ(c, x - 10, y, 7, rgba("255,70,70", r1)); circ(c, x + 10, y, 7, rgba("255,70,70", r1)); } if (i === 3) { circ(c, x, y, 14, rgba("150,150,170", r1)); glow(c, x, y, 24, "180,180,200", 0.4 * r1); } });
  if (r3 > 0) {
    const base = 860;
    hair(c, [[COLX[0] - 70, base], [COLX[3] + 70, base]], PALE, 0.5 * r3, 2);
    COLX.forEach((x, i) => { const h = (LOGE[i] / 17) * 180 * ease(ramp(t, CUE.energies + i * 0.25, 1.2)); SO(c, () => { c.globalAlpha = r3; c.fillStyle = ["#ffb070", "#ff6e5a", "#fff0a0", "#c8a8ff"][i]; c.fillRect(x - 30, base - h, 60, h); c.fillStyle = "#ffffff"; c.fillRect(x - 30, base - h, 60, 3); }); });
    const tr = A * ramp(t, CUE.trillions, 0.4); if (tr > 0) hairG(c, [[COLX[3] + 50, base - 5], [COLX[3] + 64, base - 5], [COLX[3] + 64, base - 185], [COLX[3] + 50, base - 185]], GOLD, tr, 2.5, easeOut(ramp(t, CUE.trillions, 0.5)));
  }
  const dv = A * ramp(t, CUE.distinct, 0.4); if (dv > 0) for (let k = 0; k < 3; k++) { const x = (COLX[k] + COLX[k + 1]) / 2; hairG(c, [[x, 280], [x, 870]], WHITE, 0.4 * dv, 1.5, easeOut(ramp(t, CUE.distinct + k * 0.1, 0.6))); }
};

// ================================================================ M11 · and yet: one speed (161-183)
const ICON = (c: Ctx, i: number, x: number, y: number, t: number, A: number) => {
  if (i === 0) candle(c, x, y - 10, 0.35, t, A, 7);
  if (i === 1) { circ(c, x, y, 6, rgba("255,90,90", A)); beads(c, ellipse(x, y, 20, 20, 0, 30), 4, 1.2, PALE, A); dot(c, x + Math.cos(t * 2) * 20, y + Math.sin(t * 2) * 20, 3, CYAN, A); }
  if (i === 2) starDisc(c, x, y, 20, "255,200,90", "255,130,50", A, 51);
  if (i === 3) { flare(c, x, y, 8, "200,170,255", A, 53, 0.3, 10); fade(c, [x, y], [x + 10, y - 40], "230,210,255", A, 0, 3); fade(c, [x, y], [x - 10, y + 40], "230,210,255", A, 0, 3); }
};
const HIST = [1, 3, 7, 13, 20, 25, 20, 13, 7, 3, 1];
const m11OneSpeed = (c: Ctx, t: number) => {
  const A = ramp(t, 161.2, 0.8) * (1 - ramp(t, 183.2, 0.8)); if (A <= 0) return;
  const ys = [560, 640, 720, 800], cols = ["255,210,130", "255,110,90", "255,240,160", "215,180,255"], wl = [22, 70, 8, 5], sx = 300, gx = 1640;
  const race = ramp(t, 161.2, 0.6) * (1 - ramp(t, 171, 0.8)), start = CUE.emerges, v = (gx - sx) / (170.2 - start);
  if (race > 0) {
    ys.forEach((y, i) => { ICON(c, i, 200, y, t, A * race); beads(c, [[sx - 40, y], [gx + 200, y]], 9, 1, cols[i], 0.2 * A * race); });
    hairG(c, [[sx, ys[0] - 40], [sx, ys[3] + 40]], PALE, 0.4 * A * race, 2);
    SO(c, () => { c.globalAlpha = A * race; c.fillStyle = "#3a3656"; c.fillRect(gx - 8, ys[0] - 60, 16, 20); c.fillRect(gx - 8, ys[3] + 40, 16, 20); });
    hair(c, [[gx, ys[0] - 40], [gx, ys[3] + 40]], "255,80,80", 0.5 * A * race, 2);
    const hx = sx + v * Math.max(0, t - start);
    if (t > CUE.moment + 1.6) ys.forEach((y, i) => { const px = t < start ? sx + 30 * Math.sin((t - CUE.moment) * 3 + i) * 0 : hx; packet(c, px, y, 0, wl[i] > 60 ? 150 : 90, wl[i], i === 1 ? 12 : 8, cols[i], A * race * ramp(t, CUE.moment + 1.6 + i * 0.12, 0.3)); });
    const cross = g1(t, 170.2, 0.25); if (cross > 0.02) { glow(c, gx, 680, 160, WHITE, 0.5 * A * cross); ys.forEach((y) => flare(c, gx, y, 14 * cross, WHITE, A * cross, 61, 0, 8)); }
    const al = A * race * win(t, CUE.exactly3, 170.8, 0.3, 0.4); if (al > 0) hair(c, [[hx, ys[0] - 30], [hx, ys[3] + 30]], WHITE, 0.6 * al, 2);
  }
  // not approximately / not statistically similar -> one spike
  const hA = A * ramp(t, CUE.notApprox2 - 0.1, 0.6) * (1 - ramp(t, 178.3, 0.6));
  if (hA > 0) {
    const col = ease(ramp(t, CUE.exactly4, 0.8)), bx = 960, by = 800;
    HIST.forEach((h, k) => { const gr = ease(ramp(t, CUE.statistically + k * 0.05, 0.6)), x = lerp(bx + (k - 5) * 44, bx, col), hh = lerp(h * 12 * gr, k === 5 ? 380 : 0, col); SO(c, () => { c.globalAlpha = hA; c.fillStyle = k === 5 && col > 0.5 ? "#ffffff" : "#8fc1f7"; c.fillRect(x - 16 * (1 - col) - 3, by - hh, 32 * (1 - col) + 6, hh); }); });
    hair(c, [[bx - 300, by + 4], [bx + 300, by + 4]], PALE, 0.5 * hA, 2);
    const ap = A * win(t, CUE.notApprox2, CUE.statistically, 0.3, 0.3); if (ap > 0) { const w1: P[] = [], w2: P[] = []; for (let k = 0; k <= 20; k++) { const x = 1300 + k * 8; w1.push([x, 500 + 8 * Math.sin(k * 0.6)]); w2.push([x, 530 + 8 * Math.sin(k * 0.6)]); } hairG(c, w1, PALE, ap, 4); hairG(c, w2, PALE, ap, 4); xmark(c, 1380, 515, 44, ramp(t, CUE.notApprox2 + 0.5, 0.5), ap); }
    if (col > 0.5) glow(c, bx, by - 200, 90, WHITE, 0.4 * hA * g1(t, CUE.exactly4 + 0.8, 0.5));
  }
  // every experiment agrees
  const eA = A * ramp(t, CUE.experiment - 0.2, 0.5);
  if (eA > 0) {
    const ex = [640, 880, 1120, 1360], ey = 400;
    beads(c, ellipse(ex[0], ey, 34, 34, 0, 40), 4, 2, PALE, eA); for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU + t; dot(c, ex[0] + Math.cos(a) * 42, ey + Math.sin(a) * 42, 3, PALE, eA); }
    SO(c, () => { c.globalAlpha = eA; c.fillStyle = "#7a80a8"; c.fillRect(ex[1] - 50, ey - 30, 12, 60); c.fillRect(ex[1] + 38, ey - 30, 12, 60); }); hairG(c, [[ex[1] - 38, ey], [ex[1] + 38, ey]], RED, eA, 2);
    beads(c, ellipse(ex[2], ey, 34, 34, 0, 40), 4, 2, PALE, eA); hairG(c, [[ex[2], ey], [ex[2] + Math.cos(t * 3) * 24, ey + Math.sin(t * 3) * 24]], WHITE, eA, 2.5); hairG(c, [[ex[2], ey], [ex[2], ey - 16]], WHITE, eA, 2.5);
    beads(c, ellipse(ex[3], ey + 10, 38, 16, 0, 40, Math.PI, TAU), 4, 2, PALE, eA); hairG(c, [[ex[3], ey + 10], [ex[3] + 18, ey - 30]], PALE, eA, 2);
    ex.forEach((x, k) => vmark(c, x + 46, ey - 44, 12, ramp(t, CUE.experiment + 0.2 + k * 0.3, 0.4), eA));
  }
};

// ================================================================ M12-M13 · 299,792,458 (183-206)
const DIGT = [185.81, 186.6, 186.98, 187.31, 187.85, 188.75, 189.19, 189.49, 190.48, 191.34, 191.9, 192.14, 192.59, 192.76];
const numProgress = (t: number) => DIGT.filter((d) => t >= d).length / DIGT.length;
const m12Number = (c: Ctx, t: number, f: Frame) => {
  const A = ramp(t, 182.9, 0.8) * (1 - ramp(t, 205.8, 1.0)); if (A <= 0) return;
  // the ruler and the candle photon crossing it
  const rA = A * (1 - ramp(t, 193.9, 0.8));
  if (rA > 0) {
    const ry = 440;
    hair(c, [[140, ry], [1780, ry]], PALE, 0.6 * rA, 2); for (let x = 140, k = 0; x <= 1780; x += 41, k++) hair(c, [[x, ry], [x, ry + (k % 5 ? 10 : 22)]], PALE, 0.6 * rA, 2);
    candle(c, 150, 400, 0.45, t, rA, 9);
    const u = ramp(t, CUE.moving, 1.1); if (u > 0 && u < 1) { const x = lerp(170, 1900, u); fade(c, [Math.max(160, x - 600), ry - 20], [x, ry - 20], "255,215,140", 0, 0.7 * rA, 3); packet(c, x, ry - 20, 0, 90, 22, 8, "255,215,140", rA); }
  }
  // Earth, lapped 7.5 times in one second
  const eA = A * win(t, CUE.meters - 0.3, 195.2, 0.4, 0.8);
  if (eA > 0) {
    const ex = 1550, ey = 720, R = 70;
    drawGlobe(c, FIB, ex, ey, R, 1.2 + t * 0.2, eA, 0);
    const laps = 7.5 * clamp((t - 192.6) / 1.0), a = -Math.PI / 2 + laps * TAU, orb = R + 24;
    if (laps > 0) { const pts: P[] = []; for (let k = 0; k <= 30; k++) { const aa = a - k * 0.07; pts.push([ex + Math.cos(aa) * orb, ey + Math.sin(aa) * orb * 0.9]); } hairG(c, pts, "255,215,140", eA, 3); glow(c, pts[0][0], pts[0][1], 16, WARM, 0.8 * eA); }
    if (laps >= 7.5) beads(c, ellipse(ex, ey, orb, orb * 0.9, 0, 80), 4, 1.4, "255,215,140", 0.7 * eA);
    f.tag(ex, ey - R, -40, -50, "7.5 LAPS IN 1 SECOND", eA * ramp(t, 193.3, 0.3), ramp(t, 193.3, 0.6), "255,215,140", GOLDT);
  }
  // so is every other photon: sources send their light into the number
  const src: { cue: number; x: number; y: number; k: number }[] = [{ cue: CUE.gamma3, x: 1560, y: 330, k: 0 }, { cue: CUE.hydrogen2, x: 330, y: 700, k: 1 }, { cue: CUE.screen, x: 1450, y: 780, k: 2 }];
  for (const s of src) {
    const sA = A * ramp(t, s.cue - 0.3, 0.5); if (sA <= 0) continue;
    if (s.k === 0) { flare(c, s.x, s.y, 16, "210,180,255", sA, 71, 0.2, 14); fade(c, [s.x, s.y], [s.x + 60, s.y - 170], "230,210,255", sA, 0, 4); fade(c, [s.x, s.y], [s.x - 60, s.y + 170], "230,210,255", sA, 0, 4); }
    if (s.k === 1) { for (const n of NEB.slice(0, 260)) dot(c, s.x + (n.x - 750) * 0.5, s.y + (n.y - 520) * 0.35, 1.3, "110,120,230", sA * 0.3); circ(c, s.x, s.y, 7, rgba("255,90,90", sA)); beads(c, ellipse(s.x, s.y, 26, 26, 0, 30), 4, 1.3, PALE, sA); }
    if (s.k === 2) { const scr = [[0, 0, 150, 96], [180, 18, 60, 100], [270, -20, 210, 124]] as const; scr.forEach(([dx, dy, w, h], j) => { const on = ramp(t, CUE.screen + 0.4 + j * 0.45, 0.3); if (on <= 0) return; SO(c, () => { c.globalAlpha = sA * on; c.fillStyle = "#202038"; c.fillRect(s.x + dx - 8, s.y + dy - 8, w + 16, h + 16); }); for (let yy = 0; yy < h; yy += 6) for (let xx = 0; xx < w; xx += 9) { dot(c, s.x + dx + xx + 1.5, s.y + dy + yy + 3, 1.3, "255,70,70", sA * on * 0.6); dot(c, s.x + dx + xx + 4.5, s.y + dy + yy + 3, 1.3, "70,255,110", sA * on * 0.6); dot(c, s.x + dx + xx + 7.5, s.y + dy + yy + 3, 1.3, "80,120,255", sA * on * 0.6); } }); }
    const u = ramp(t, s.cue + 0.4, 1.2); if (u > 0 && u < 1) { const tx = 960, ty = 560, px = lerp(s.x, tx, easeOut(u)), py = lerp(s.y, ty, easeOut(u)); packet(c, px, py, Math.atan2(ty - s.y, tx - s.x), 80, [6, 60, 18][s.k], 8, ["230,210,255", "255,110,90", "200,255,200"][s.k], sA); }
    if (u >= 1) glow(c, 960, 560, 200, WHITE, 0.3 * sA * g1(t, s.cue + 1.7, 0.4));
  }
};

// ================================================================ M14 · the vacuum (206-217)
const m14Vacuum = (c: Ctx, t: number) => {
  const A = ramp(t, 205.7, 0.8) * (1 - ramp(t, 216.4, 1.2)); if (A <= 0) return;
  const up = 700 * ease(ramp(t, 216.3, 1.6)), x0 = 220, x1 = 1700, yc = 610 - up, rr = 95, draw = easeOut(ramp(t, 205.8, 1.2));
  SO(c, () => { c.globalAlpha = A; c.fillStyle = "rgba(60,80,140,0.18)"; c.fillRect(x0, yc - rr, (x1 - x0) * draw, rr * 2); c.fillStyle = "#3a3a5a"; c.fillRect(x0 - 30, yc - rr - 14, 30, rr * 2 + 28); c.fillRect(x1, yc - rr - 14, 30 * draw, rr * 2 + 28); c.fillStyle = "#26263e"; c.fillRect(x0 + 120, yc + rr, 26, 90); c.fillRect(x0 + 90, yc + rr + 90, 86, 30); });
  hairG(c, [[x0, yc - rr], [lerp(x0, x1, draw), yc - rr]], PALE, 0.6 * A, 2); hairG(c, [[x0, yc + rr], [lerp(x0, x1, draw), yc + rr]], PALE, 0.6 * A, 2);
  hair(c, [[x0 + 20, yc - rr + 14], [lerp(x0, x1, draw) - 20, yc - rr + 14]], WHITE, 0.35 * A, 3);
  const rows = [-62, -31, 0, 31, 62], cols = ["255,110,90", "255,200,120", "120,240,190", "120,170,255", "215,170,255"], v = 380, spc = 230;
  const base = (v * (t - 205)) % spc, glowAll = 1 + 0.6 * ramp(t, CUE.onlyMoving, 0.5);
  for (let x = x0 + base; x < x1 - 20; x += spc) rows.forEach((dy, k) => { if (x > x0 + 20) packet(c, x, yc + dy, 0, 70, [70, 22, 30, 14, 6][k], 6, cols[k], A * ramp(t, CUE.vacuum + k * 0.1, 0.4) * Math.min(1, glowAll)); });
  if (glowAll > 1) glow(c, (x0 + x1) / 2, yc, 700, "150,170,255", 0.12 * A * (glowAll - 1));
  // a ghost that would be faster, one that would be slower: neither exists
  const g1a = A * win(t, CUE.noFast - 0.2, CUE.noSlow - 0.3, 0.3, 0.5); if (g1a > 0) { const gx = 1000 + 260 * ease(ramp(t, CUE.noFast - 0.2, 1.2)); beads(c, ellipse(gx, yc - 150, 26, 26, 0, 30), 4, 1.5, AMBER, g1a); for (let k = 0; k < 3; k++) hair(c, [[gx - 40 - k * 16, yc - 160 + k * 10], [gx - 70 - k * 16, yc - 160 + k * 10]], AMBER, 0.7 * g1a, 2); xmark(c, gx, yc - 150, 22, ramp(t, CUE.noFast + 0.5, 0.4), g1a); }
  const g2a = A * win(t, CUE.noSlow - 0.2, CUE.onlyMoving - 0.2, 0.3, 0.5); if (g2a > 0) { const gx = 700 + 60 * ease(ramp(t, CUE.noSlow - 0.2, 1.6)); beads(c, ellipse(gx, yc + 160, 26, 26, 0, 30), 4, 1.5, BLUE, g2a); xmark(c, gx, yc + 160, 22, ramp(t, CUE.noSlow + 0.5, 0.4), g2a); }
};

// ================================================================ M15-M19 · everyday motion at dusk (216-246)
const carWX = (t: number) => { const tau = Math.max(0, t - 236.3); return 3500 + 0.5 * 70 * tau * tau; };
type PK = [number, number];
const PANK: PK[] = [[216, 0], [223.6, 0], [224.3, 140], [228.3, 150], [229.0, 1720], [234.6, 1760], [235.2, 2740], [240.8, carWX(240.8) - 760], [241.25, 4820], [246.4, 4900]];
const panX = (t: number) => { if (t > 235.9 && t < 240.8) return lerp(carWX(t) - 760, 3240, 1 - ease(ramp(t, 235.2, 0.7))) ; let i = 0; while (i < PANK.length - 2 && t > PANK[i + 1][0]) i++; const a = PANK[i], b = PANK[i + 1]; return lerp(a[1], b[1], ease(clamp((t - a[0]) / (b[0] - a[0])))); };
const MTN = (() => { const r = rng(101), pts: P[] = []; for (let x = -200; x <= 4000; x += 60) pts.push([x, 560 - 60 * r() - 50 * Math.sin(x * 0.004)]); return pts; })();
const SKYLINE = (() => { const r = rng(103), out: { x: number; w: number; h: number; seed: number }[] = []; let x = -300; while (x < 5000) { const w = 40 + r() * 80, h = 50 + r() * r() * 190; out.push({ x, w, h, seed: Math.floor(r() * 1e6) }); x += w + 6 + r() * 30; } return out; })();
const TREES = (() => { const r = rng(105); return Array.from({ length: 34 }, () => ({ x: r() * 6400 - 200, s: 0.7 + r() * 0.6, h: r() })); })();
const TUFT = (() => { const r = rng(107); return Array.from({ length: 90 }, () => ({ x: r() * 8000, h: 10 + r() * 22, y: r() })); })();
const person = (c: Ctx, x: number, y: number, arm: number, A: number, rim: string) => SO(c, () => {
  c.globalAlpha = A; c.fillStyle = "#120c16";
  c.fillRect(x - 14, y - 70, 10, 70); c.fillRect(x + 4, y - 70, 10, 70); c.fillRect(x - 18, y - 150, 36, 84); circ(c, x, y - 170, 16, "#120c16");
  c.save(); c.translate(x + 10, y - 140); c.rotate(arm); c.fillRect(0, -5, 64, 10); c.restore();
  c.fillStyle = rim; c.fillRect(x + 14, y - 148, 3, 80); c.fillRect(x + 10, y - 180, 3, 16);
});
const car = (c: Ctx, x: number, y: number, A: number, spin: number) => {
  SO(c, () => {
    c.globalAlpha = A; c.fillStyle = "#b8483a"; c.beginPath(); c.moveTo(x - 110, y - 20); c.lineTo(x - 104, y - 48); c.lineTo(x - 50, y - 54); c.lineTo(x - 26, y - 86); c.lineTo(x + 50, y - 86); c.lineTo(x + 80, y - 54); c.lineTo(x + 116, y - 46); c.lineTo(x + 118, y - 20); c.closePath(); c.fill();
    c.fillStyle = "#e0705a"; c.fillRect(x - 104, y - 50, 216, 4); c.fillStyle = "#1e2440"; c.beginPath(); c.moveTo(x - 20, y - 80); c.lineTo(x + 10, y - 80); c.lineTo(x + 10, y - 56); c.lineTo(x - 42, y - 56); c.closePath(); c.fill(); c.beginPath(); c.moveTo(x + 18, y - 80); c.lineTo(x + 46, y - 80); c.lineTo(x + 68, y - 56); c.lineTo(x + 18, y - 56); c.closePath(); c.fill();
    for (const wx of [x - 64, x + 70]) { circ(c, wx, y - 16, 22, "#0c0a10"); circ(c, wx, y - 16, 10, "#6a6a80"); c.fillStyle = "#2a2a3a"; c.save(); c.translate(wx, y - 16); c.rotate(spin); c.fillRect(-9, -2, 18, 4); c.fillRect(-2, -9, 4, 18); c.restore(); }
  });
  glow(c, x + 118, y - 40, 40, "255,240,190", 0.6 * A); glow(c, x - 110, y - 38, 18, "255,60,60", 0.6 * A);
};
const landscape = (c: Ctx, t: number, f: Frame) => {
  const A = ramp(t, 216.2, 0.9); if (A <= 0) return;
  const X = panX(t), dy = 700 * (1 - ease(ramp(t, 216.3, 1.6))), sx = (wx: number, par = 1) => wx - X * par, G = 660 + dy;
  SO(c, () => {
    c.globalAlpha = A;
    c.fillStyle = lin(0, 138 + dy, 0, G, [[0, "#140e30"], [0.45, "#43204e"], [0.8, "#b0543e"], [1, "#f09a52"]], c); c.fillRect(0, 138 + dy, W, G - 138 - dy + 2);
  });
  glow(c, 1480 - X * 0.02, 640 + dy, 380, "255,150,80", 0.45 * A); circ(c, 1480 - X * 0.02, 646 + dy, 70, rgba("255,210,140", A));
  SO(c, () => {
    c.globalAlpha = A;
    const r = rng(109); for (let k = 0; k < 9; k++) { const cx = ((r() * 2600 - X * 0.05 + t * 6) % 2600) - 300, cy = 230 + r() * 220 + dy, w = 160 + r() * 260; c.fillStyle = r() < 0.5 ? "rgba(120,60,110,0.55)" : "rgba(200,110,110,0.45)"; c.fillRect(cx, cy, w, 10); c.fillRect(cx + 30, cy - 8, w * 0.6, 8); }
    c.fillStyle = "#3a1c3e"; c.beginPath(); c.moveTo(0, G); MTN.forEach(([x, y]) => c.lineTo(x - X * 0.12, y + dy)); c.lineTo(W, G); c.closePath(); c.fill();
    for (const b of SKYLINE) { const x = sx(b.x, 0.3); if (x < -150 || x > W + 50) continue; c.fillStyle = "#1e1026"; c.fillRect(x, G - b.h, b.w, b.h); const rr = rng(b.seed); c.fillStyle = "#ffc878"; for (let yy = G - b.h + 8; yy < G - 8; yy += 12) for (let xx = x + 6; xx < x + b.w - 6; xx += 11) if (rr() > 0.72) c.fillRect(xx, yy, 4, 5); }
    c.fillStyle = lin(0, G, 0, H, [[0, "#1a2c1e"], [0.4, "#122016"], [1, "#080e0a"]], c); c.fillRect(0, G, W, H - G);
    for (const tr of TREES) { const x = sx(tr.x, 0.6); if (x < -120 || x > W + 120) continue; c.fillStyle = "#2a1a16"; c.fillRect(x - 5 * tr.s, G - 60 * tr.s, 10 * tr.s, 64 * tr.s); c.fillStyle = tr.h > 0.5 ? "#12241a" : "#18301e"; circ(c, x, G - 90 * tr.s, 46 * tr.s, c.fillStyle as string); circ(c, x - 30 * tr.s, G - 64 * tr.s, 34 * tr.s, c.fillStyle as string); circ(c, x + 30 * tr.s, G - 66 * tr.s, 36 * tr.s, c.fillStyle as string); c.fillStyle = "rgba(255,160,90,0.25)"; c.fillRect(x + 24 * tr.s, G - 118 * tr.s, 18 * tr.s, 30 * tr.s); }
    // set pieces on the ground
    let x = sx(560); c.fillStyle = "#3a261c"; c.beginPath(); c.ellipse(x + 480, 760 + dy, 560, 60, 0, 0, TAU); c.fill();
    x = sx(2150); c.fillStyle = "#2c2226"; c.fillRect(x, 700 + dy, 260, 20); c.fillRect(x + 20, 720 + dy, 12, 80); c.fillRect(x + 228, 720 + dy, 12, 80);
    x = sx(3000); c.fillStyle = "#23222c"; c.fillRect(x, 760 + dy, 2100, 90); c.fillStyle = "#d8c070"; for (let k = 0; k < 40; k++) c.fillRect(x + k * 60, 803 + dy, 30, 4);
    x = sx(4700); c.fillStyle = "#1c3420"; c.fillRect(x, 690 + dy, 2000, 250); c.fillStyle = "#cfe0c8"; c.fillRect(x, 700 + dy, 2000, 3); c.fillRect(x + 1100, 690 + dy, 3, 250);
    c.fillStyle = "#e8eef0"; const gx = sx(5980); c.fillRect(gx, 600 + dy, 6, 150); c.fillRect(gx, 600 + dy, 120, 6); c.fillRect(gx + 114, 600 + dy, 6, 150);
    c.fillStyle = "#0c160e"; for (const tf of TUFT) { const xx = sx(tf.x, 1.3); if (xx < -20 || xx > W + 20) continue; c.fillRect(xx, 900 + tf.y * 40 + dy - tf.h, 3, tf.h); c.fillRect(xx + 4, 904 + tf.y * 40 + dy - tf.h * 0.7, 3, tf.h * 0.7); }
  });
  if (dy > 400) return;
  // everything else in nature: birds and leaves, each with its own speed
  const bA = A * win(t, 218.2, 224.4, 0.6, 0.6);
  if (bA > 0) { const lead: P = [300 + 150 * (t - 218), 300 + 10 * Math.sin(t)]; for (let k = 0; k < 7; k++) { const off = k === 0 ? 0 : Math.ceil(k / 2) * (k % 2 ? 1 : -1), bx = lead[0] - Math.abs(off) * 36, by = lead[1] + off * 22, fl = Math.sin(t * 9 + k) * 8; hairG(c, [[bx - 14, by - fl], [bx, by], [bx + 14, by - fl]], "40,20,40", bA, 3); } f.tag(lead[0], lead[1], 40, -50, "BIRD 15 M/S", bA * ramp(t, CUE.everything, 0.3), ramp(t, CUE.everything, 0.5), PALE); }
  const lA = A * win(t, 218.5, 224.4, 0.6, 0.6);
  if (lA > 0) { const r = rng(111); for (let k = 0; k < 12; k++) { const t0 = 218.4 + r() * 3, u = t - t0; if (u < 0) continue; const lx = sx(260, 0.6) + 40 * u + 30 * Math.sin(u * 2 + k) + (r() - 0.5) * 80, ly = G - 120 + 45 * u; circ(c, lx, ly, 4, rgba(r() < 0.5 ? "230,140,60" : "200,90,50", lA)); if (k === 3) f.tag(lx, ly, 40, 40, "LEAF 1 M/S", lA * ramp(t, CUE.everything + 0.4, 0.3), ramp(t, CUE.everything + 0.4, 0.5), "255,170,90", GOLDT); } }
  // the pitch: soft, then hard
  const pA = A * win(t, 223.8, 228.9, 0.4, 0.5);
  if (pA > 0) {
    const px = sx(760), py = 760 + dy, mx = sx(1460), my = 715 + dy;
    const sw1 = ease(ramp(t, 225.0, 0.35)), sw2 = ease(ramp(t, CUE.hard1 - 0.25, 0.18)), arm = t < CUE.hard1 - 0.3 ? lerp(-2.6, 0.4, sw1) : lerp(-2.8, 0.6, sw2);
    person(c, px, py, arm, pA, "#ff9a60"); SO(c, () => { c.globalAlpha = pA; circ(c, mx, my, 18, "#5a3420"); circ(c, mx, my, 12, "#7a4a2c"); });
    const u1 = ramp(t, 225.35, 1.3); if (u1 > 0 && u1 < 1) { const bx = lerp(px + 60, mx, u1), by = lerp(py - 150, my, u1) - 200 * Math.sin(Math.PI * u1); circ(c, bx, by, 7, rgba("245,240,230", pA)); f.tag(bx, by, 30, -40, "15 M/S", pA, ramp(t, 225.5, 0.4), PALE); }
    const u2 = ramp(t, CUE.hard1 - 0.05, 0.36); if (u2 > 0 && u2 < 1) { const bx = lerp(px + 60, mx, u2), by = lerp(py - 150, my, u2) - 20 * Math.sin(Math.PI * u2); fade(c, [bx - 160, by], [bx, by], WHITE, 0, 0.8 * pA, 5); circ(c, bx, by, 7, rgba("255,255,255", pA)); }
    if (t > CUE.hard1 + 0.31) { const q = ramp(t, CUE.hard1 + 0.31, 0.6); if (q < 1) ripple(c, mx, my, q, 10, 60, WHITE, pA, 1, 40, 4); f.tag(mx, my, -40, -60, "40 M/S", pA * (1 - ramp(t, 228.3, 0.4)), ramp(t, CUE.hard1 + 0.31, 0.4), WHITE); }
  }
  // three rifles, three muzzle velocities (flight slowed 2000x)
  const rA = A * win(t, 228.4, 235.1, 0.3, 0.5);
  if (rA > 0) {
    const rx = sx(2200), ys = [630, 700, 770].map((y) => y + dy), tx = sx(3000), fire = [CUE.bullet, CUE.rifles, CUE.rifles + 0.7], vel = [750, 850, 1000];
    SO(c, () => { c.globalAlpha = rA; ys.forEach((y) => { c.fillStyle = "#2a2430"; c.fillRect(rx, y - 6, 160, 12); c.fillRect(rx - 60, y - 10, 70, 22); c.fillRect(rx + 40, y + 6, 14, 18); c.fillStyle = "#4a4458"; c.fillRect(rx + 160, y - 3, 60, 6); }); ys.forEach((y) => { c.fillStyle = "#e8e2d8"; circ(c, tx, y, 26, "#e8e2d8"); circ(c, tx, y, 18, "#c83a3a"); circ(c, tx, y, 10, "#e8e2d8"); circ(c, tx, y, 4, "#c83a3a"); }); });
    ys.forEach((y, k) => { const u = t - fire[k]; if (u < 0) return; if (u < 0.25) flare(c, rx + 225, y, 16 * (1 - u / 0.25), "255,200,110", rA, 120 + k, 0, 10); const bx = rx + 225 + (vel[k] / 2) * u; if (bx < tx) { fade(c, [bx - 120, y], [bx, y], "255,220,160", 0, 0.8 * rA, 3); dot(c, bx, y, 3, "255,240,210", rA); f.tag(bx, y, 20, -34 - k * 4, `${vel[k] === 1000 ? "1,000" : vel[k]} M/S`, rA * (k === 0 ? 1 : 1), ramp(t, fire[k] + 0.1, 0.3), "255,220,160", GOLDT); } else { const q = ramp(t, fire[k] + (tx - rx - 225) / (vel[k] / 2), 0.6); if (q < 1) ripple(c, tx, y, q, 6, 50, "255,220,160", rA, 1, 30, 4); } });
    const vA = rA * ramp(t, CUE.varies, 0.3); if (vA > 0) hairG(c, [[tx + 50, ys[0]], [tx + 64, ys[0]], [tx + 64, ys[2]], [tx + 50, ys[2]]], GOLD, vA, 2, easeOut(ramp(t, CUE.varies, 0.5)));
  }
  // a car from rest: speed climbs gradually
  const cA = A * win(t, 234.8, 241.4, 0.3, 0.4);
  if (cA > 0) {
    const tau = Math.max(0, t - 236.3), wx = 3500 + 0.5 * 70 * tau * tau, x = sx(wx), y = 800 + dy;
    for (let k = 0; k < 10; k++) { const u = tau - k * 0.35; if (u <= 0) continue; const px = sx(3500 + 0.5 * 70 * (tau - u) ** 2) - 118 - 30 * u, py = y - 22 - 30 * u; circ(c, px, py, 6 + 10 * u, rgba("150,140,160", cA * 0.35 * Math.max(0, 1 - u / 1.5))); }
    car(c, x, y, cA, tau * tau * 2);
    const eg = cA * ramp(t, CUE.engine, 0.4); if (eg > 0) glow(c, x + 80, y - 50, 60, "255,120,50", 0.6 * eg);
    const gx = 1640, gy = 850, gr = 80, v = clamp((70 * tau) / 420);
    beads(c, ellipse(gx, gy, gr, gr, 0, 50, Math.PI, TAU), 4, 1.6, PALE, cA); for (let k = 0; k <= 10; k++) { const a = Math.PI + (k / 10) * Math.PI; hair(c, [[gx + Math.cos(a) * (gr - 12), gy + Math.sin(a) * (gr - 12)], [gx + Math.cos(a) * gr, gy + Math.sin(a) * gr]], PALE, 0.7 * cA, 2); }
    const na = Math.PI + v * Math.PI; hairG(c, [[gx, gy], [gx + Math.cos(na) * (gr - 18), gy + Math.sin(na) * (gr - 18)]], "255,150,90", cA, 3);
  }
  // a soccer ball: soft kick drifts, hard kick rockets
  const sA = A * ramp(t, 240.9, 0.4);
  if (sA > 0) {
    const s1 = Math.max(0, t - 242.1), d1 = s1 < 2.2 ? 150 * s1 - 34 * s1 * s1 : 150 * 2.2 - 34 * 4.84, s2 = Math.max(0, t - CUE.kickHard - 0.05);
    const bx0 = sx(5250) + d1, by0 = 790 + dy, bx = bx0 + 1500 * s2, by = by0 - 900 * s2 + 500 * s2 * s2;
    const kick = (t0: number, dur: number) => { const u = clamp((t - t0) / dur); return Math.sin(Math.PI * u); };
    const leg = Math.max(kick(241.8, 0.5) * 0.7, kick(CUE.kickHard - 0.25, 0.35) * 1.3), hipx = sx(5250) - 70 + (t > 243 ? d1 : 0), hipy = 640 + dy;
    SO(c, () => { c.globalAlpha = sA; c.save(); c.translate(hipx, hipy); c.rotate(-0.5 + leg); c.fillStyle = "#1a1422"; c.fillRect(-10, 0, 20, 150); c.fillStyle = "#e0e0ea"; c.fillRect(-12, 140, 46, 18); c.restore(); });
    if (s2 > 0) { fade(c, [bx - 220, by + 60], [bx, by], WHITE, 0, 0.7 * sA, 6); for (let k = 0; k < 3; k++) hair(c, [[bx - 60 - k * 30, by - 20 + k * 20], [bx - 120 - k * 30, by - 10 + k * 20]], WHITE, 0.5 * sA, 2); }
    SO(c, () => { c.globalAlpha = sA; circ(c, bx, by - 14, 15, "#f2f2f4"); c.save(); c.translate(bx, by - 14); c.rotate((d1 + 1500 * s2) / 15); c.fillStyle = "#1a1a24"; c.fillRect(-4, -4, 8, 8); c.fillRect(8, -2, 5, 5); c.fillRect(-13, -2, 5, 5); c.fillRect(-2, 8, 5, 5); c.fillRect(-2, -13, 5, 5); c.restore(); });
    f.tag(bx0, by0 - 30, 30, -44, "2 M/S", sA * win(t, 242.3, CUE.kickHard, 0.3, 0.3), ramp(t, 242.4, 0.4), PALE);
    if (s2 > 0 && bx < W - 100) f.tag(bx, by - 30, 30, -44, "30 M/S", sA, ramp(t, CUE.kickHard + 0.1, 0.3), WHITE);
  }
};

// ================================================================ HUD
const LABELS: Label[] = [[0.3, 19.3, "THREE SOURCES OF LIGHT"], [19.5, 39.4, "THE SPECTRUM"], [39.7, 63.7, "THE RACE"], [63.96, 87.5, "BEFORE WE BEGIN"], [88.0, 141.6, "FOUR SOURCES, FOUR RULES"], [142.3, 160.6, "COMPARISON"], [160.91, 182.8, "ONE CONSTANT"], [183.0, 205.7, "THE SPEED OF LIGHT"], [205.9, 216.4, "VACUUM"], [217.0, 246.2, "EVERYDAY MOTION"]];
const LINES: Line[] = [
  [0.07, 3.2, "A CANDLE IN YOUR KITCHEN", 0, 1.2], [3.41, 9.1, "A DISTANT QUASAR", 0, 0.8], [5.28, 9.1, "AT THE COSMIC EDGE", 1, 0.9],
  [9.32, 12.3, "A GAMMA-RAY BURST", 0, 0.8], [10.72, 12.3, "A COLLAPSING STAR", 1, 0.7], [12.44, 18.0, "MORE ENERGY IN SECONDS", 0, 1.3], [14.92, 18.0, "THAN THE SUN EVER WILL", 1, 1.6],
  [18.14, 19.4, "ALL PRODUCE LIGHT", 0, 0.6], [19.56, 21.4, "EVERY ONE OF THESE PHOTONS", 0, 1.0], [21.52, 22.5, "THE CALM ONES", 0, 0.5], [22.66, 23.8, "THE VIOLENT ONES", 0, 0.5],
  [24.59, 27.0, "THE FAINT ONES", 0, 0.6], [28.0, 31.2, "THE ENERGETIC ONES", 0, 0.8], [31.34, 35.6, "EXACTLY THE SAME SPEED", 0, 1.8], [35.76, 38.1, "NOT APPROXIMATELY", 0, 1.1], [38.28, 39.5, "EXACTLY", 0, 0.5],
  [39.75, 43.5, "THE CANDLE PHOTON", 0, 1.1], [43.66, 46.2, "RACING FORWARD", 0, 0.6], [46.39, 50.8, "BESIDE AN ANCIENT PHOTON", 0, 1.5], [50.95, 52.4, "13 BILLION YEARS IN FLIGHT", 1, 0.6],
  [52.63, 54.0, "NOTHING PUSHES THEM", 0, 0.7], [54.08, 56.1, "NOTHING ACCELERATES THEM", 0, 1.0], [56.3, 58.5, "NEVER SLOW", 0, 0.4], [57.32, 58.5, "NEVER FAST", 1, 0.4], [58.65, 60.8, "ONLY ONE SPEED", 0, 1.0], [61.11, 63.8, "WHY?", 0, 0.8],
  [65.76, 69.3, "IF YOU FIND THIS FASCINATING", 0, 2.2], [69.88, 73.7, "LIKE & SUBSCRIBE", 0, 0.8], [72.24, 73.7, "HELP THE CHANNEL GROW", 1, 0.6], [74.07, 76.1, "A SMALL THING", 0, 0.5], [76.28, 78.4, "A HUGE DIFFERENCE", 1, 0.6],
  [79.14, 81.3, "NOW LIVE ON SPOTIFY", 0, 1.0], [81.45, 83.5, "LINKS IN THE DESCRIPTION", 0, 1.0], [83.68, 85.9, "LISTEN WHEREVER YOU ARE", 0, 1.2], [86.1, 88.6, "LET US BEGIN", 0, 1.2],
  [88.01, 92.2, "HOW STRANGE THIS IS", 0, 1.3], [92.39, 97.4, "EVERY SOURCE", 0, 0.6], [95.47, 97.4, "DIFFERENT RULES", 1, 0.9],
  [97.74, 105.6, "CANDLE: CHEMISTRY", 0, 1.0], [101.59, 105.6, "ABOUT 1,500 DEGREES", 1, 1.4], [105.91, 110.9, "HYDROGEN IN A COLD CLOUD", 0, 1.6], [111.08, 115.3, "AN ELECTRON DROPS", 0, 0.6], [113.16, 115.3, "BETWEEN TWO LEVELS", 1, 1.3],
  [115.54, 118.6, "A SLIVER OF RADIO", 0, 1.7], [118.91, 121.1, "A STAR LIKE OUR SUN", 0, 0.8], [121.27, 125.9, "NUCLEAR FUSION", 0, 0.5], [124.25, 125.9, "15 MILLION DEGREES", 1, 1.0],
  [126.23, 128.5, "A GAMMA-RAY BURST", 0, 0.6], [128.67, 132.2, "THE MOST VIOLENT EVENTS", 0, 1.2], [132.39, 135.9, "PHOTONS OF HUGE ENERGY", 0, 1.8], [136.04, 137.3, "ONE PHOTON", 0, 0.5], [137.37, 141.8, "RIPS THROUGH METAL", 0, 0.8],
  [142.3, 144.5, "NOT VARIATIONS", 0, 1.0], [144.69, 147.6, "RADICALLY DIFFERENT", 0, 1.0], [147.87, 148.4, "DIFFERENT REACTANTS", 0, 0.4], [148.49, 150.0, "DIFFERENT TEMPERATURES", 0, 0.5],
  [150.15, 156.4, "PHOTON ENERGIES", 0, 0.8], [154.99, 156.4, "TRILLIONS APART", 1, 0.7], [157.07, 160.8, "DISTINCT MECHANISMS", 0, 1.4],
  [160.91, 166.0, "AND YET", 0, 0.5], [166.13, 167.7, "EVERY PHOTON EMERGES", 0, 0.8], [167.87, 170.9, "AT EXACTLY ONE SPEED", 0, 1.2], [171.08, 173.7, "NOT APPROXIMATELY", 0, 1.0],
  [173.86, 175.7, "NOT STATISTICALLY SIMILAR", 0, 1.0], [175.84, 178.4, "EXACTLY", 0, 0.5], [178.56, 180.5, "EVERY DECIMAL PLACE", 0, 1.3], [180.66, 182.8, "EVERY EXPERIMENT", 0, 1.0],
  [183.03, 185.1, "YOUR CANDLE PHOTON", 0, 0.9], [193.98, 195.3, "SO IS", 0, 0.3], [195.42, 198.4, "THE GAMMA-RAY BURST", 0, 0.6], [198.57, 202.2, "THE HYDROGEN ATOM", 0, 0.9], [202.33, 205.7, "EVERY SCREEN YOU SEE", 0, 1.5],
  [206.02, 207.1, "IN A VACUUM", 0, 0.5], [207.24, 210.1, "ALL THE SAME SPEED", 0, 1.2], [210.28, 212.4, "NO FAST PHOTONS", 0, 0.6], [212.59, 214.5, "NO SLOW PHOTONS", 0, 0.5], [214.64, 216.7, "ONLY PHOTONS MOVING", 0, 1.1],
  [217.01, 221.3, "HOW STRANGE IS THAT?", 0, 1.3], [221.49, 223.9, "EVERYTHING ELSE", 0, 0.7], [224.4, 226.0, "THROW A BASEBALL", 0, 0.8], [226.03, 228.3, "DEPENDS HOW HARD", 1, 0.9],
  [228.95, 231.1, "FIRE A BULLET", 0, 0.5], [229.99, 231.1, "DIFFERENT RIFLES", 1, 0.6], [231.24, 235.0, "MUZZLE VELOCITY VARIES", 0, 1.2], [235.5, 237.5, "PUSH A CAR FROM REST", 0, 0.8], [237.59, 240.9, "SPEED CLIMBS GRADUALLY", 0, 1.0],
  [241.29, 244.4, "KICK SOFTLY: IT DRIFTS", 0, 1.8], [244.51, 246.3, "KICK HARD: IT ROCKETS", 0, 1.0],
];
const NAMES = ["CANDLE", "HYDROGEN", "SUN", "GAMMA BURST"], RULES = ["CHEMISTRY", "QUANTUM", "FUSION", "COLLAPSE"], TEMPS = ["1,500", "-220", "15 MILLION", "100 BILLION"], ENERGY = ["0.000006 EV", "2 EV", "1 MILLION EV", "100 BILLION EV"];

// darker ramps the base pixel palette lacks: grass, earth, dusk, steel
const EXTRA = ["#0c1610", "#142418", "#1e3624", "#2c4c30", "#241810", "#3a2618", "#5a3a24", "#4e2440", "#7a3448", "#b85a46", "#e08a54", "#242430", "#3e3e50", "#6e7088", "#b4b6c8"];

// ================================================================ the frame
const draw = (ctx: Ctx, frame: number, env: Env) => {
  const t = frame / FPS;
  const f = beginFrame(ctx, env, frame, tint(t)), c = f.c;
  drawStars(c, STARS, CAM, t, starAlpha(t));
  if (t < 3.8) m1Kitchen(c, t);
  m1Quasar(c, t, f); m1Burst(c, t, f); m2Spectrum(c, t, f); m3Race(c, t, f); m4Channel(c, t, f);
  let S: ((p: P) => P) | null = null;
  const labA = ramp(t, 86.9, 0.8) * (1 - ramp(t, 162.0, 1.2));
  if (labA > 0) S = drawLab(c, t, labA, f);
  drawChart(c, t, win(t, 147.4, 161.4, 0.6, 0.8));
  m11OneSpeed(c, t); m12Number(c, t, f); m14Vacuum(c, t); landscape(c, t, f);

  endFrame(ctx, env, frame, t, f, {
    pixel: 3,
    palette: EXTRA,
    black: Math.max(1 - ease(ramp(t, 0, 0.6)), ease(ramp(t, 245.5, 0.85))),
    hud: (h) => {
      const { say } = h, hudA = hudTables(h, LABELS, LINES), sm = { cap: 15, w: 1.6 };
      // energy panel (burst vs Sun)
      const pA = win(t, CUE.seconds, 19.3, 0.4, 0.5); if (pA > 0) { say("BURST: SECONDS", 140, 758, { ...sm, color: "#c7b4ff", opacity: pA, progress: ramp(t, CUE.seconds, 0.6) }); say("SUN: 10 BILLION YEARS", 140, 828, { ...sm, color: GOLDT, opacity: pA, progress: ramp(t, CUE.sun, 1.2) }); }
      // lane names and identical readouts
      const oy = 700 * (1 - ease(ramp(t, 19.3, 1.6))), lA = win(t, 19.6, 39.3, 0.4, 0.6);
      if (lA > 0) LANES.forEach((L, i) => { say(L.name, 200, L.y + oy - 44, { ...sm, color: `rgb(${L.rgb})`, opacity: lA * ramp(t, L.cue, 0.3), progress: ramp(t, L.cue, 0.4) }); say("299,792,458 M/S", 1500, L.y + oy - 44, { ...sm, color: t > CUE.exactly2 ? "#ffffff" : PALET, opacity: lA * ramp(t, CUE.notApprox + i * 0.3, 0.2), progress: ramp(t, CUE.notApprox + i * 0.3, 0.6) }); });
      // the channel: photomultiplier gain
      const gA = win(t, CUE.huge + 0.8, CUE.spotify - 0.3, 0.3, 0.5); if (gA > 0) say("GAIN 1,000,000", 1300, 820, { ...sm, color: "#a9f7d0", opacity: gA, progress: ramp(t, CUE.huge + 0.8, 0.6) });
      // lab plaques, rules, chart labels
      if (S) {
        const over = win(t, 88.9, 97.5, 0.5, 0.4) + win(t, 143.2, 161.6, 0.5, 0.6);
        if (over > 0) CH.forEach((x, i) => { const p = S!([x, 806]); say(NAMES[i], p[0], p[1], { ...sm, color: TXT, align: "center", opacity: over, progress: ramp(t, 89.2 + i * 0.25, 0.5) }); });
        const rl = win(t, 94.83, 97.5, 0.3, 0.4); if (rl > 0) CH.forEach((x, i) => { const p = S!([x, 846]); say(RULES[i], p[0], p[1], { ...sm, color: GOLDT, align: "center", opacity: rl, progress: ramp(t, 94.83 + i * 0.4, 0.5) }); });
      }
      const chA = win(t, 147.4, 161.4, 0.6, 0.8);
      if (chA > 0) {
        say("REACTANTS", 140, 536, { ...sm, color: DIMT, opacity: chA * ramp(t, CUE.reactant, 0.3), progress: ramp(t, CUE.reactant, 0.4) });
        say("TEMPERATURE (DEG)", 140, 590, { ...sm, color: DIMT, opacity: chA * ramp(t, CUE.temps, 0.3), progress: ramp(t, CUE.temps, 0.5) });
        say("PHOTON ENERGY", 140, 780, { ...sm, color: DIMT, opacity: chA * ramp(t, CUE.energies, 0.3), progress: ramp(t, CUE.energies, 0.5) });
        COLX.forEach((x, i) => { say(TEMPS[i], x, 590, { ...sm, color: ["#ffd07e", "#8fc1f7", "#fff0c4", "#c7b4ff"][i], align: "center", opacity: chA * ramp(t, CUE.temps + i * 0.2, 0.3), progress: ramp(t, CUE.temps + i * 0.2, 0.4) }); const hgt = (LOGE[i] / 17) * 180; say(ENERGY[i], x, 860 - hgt - 30, { ...sm, color: TXT, align: "center", opacity: chA * ramp(t, CUE.energies + i * 0.25 + 1, 0.3), progress: ramp(t, CUE.energies + i * 0.25 + 1, 0.5) }); });
        const tr = chA * ramp(t, CUE.trillions, 0.4); if (tr > 0) say("TRILLIONS", COLX[3] + 80, 740, { ...sm, color: GOLDT, opacity: tr, progress: ramp(t, CUE.trillions, 0.5) });
      }
      // decimal places, the number, the stamps
      const dA = win(t, CUE.decimal, 183.0, 0.3, 0.6); if (dA > 0) say("299,792,458.000000000", 960, 860, { cap: 30, color: TXT, align: "center", opacity: dA, progress: 0.52 + 0.48 * ramp(t, CUE.decimal, 2.2) });
      const nA = win(t, CUE.n2 - 0.1, 205.9, 0.2, 0.8); if (nA > 0) say("299,792,458 M/S", 960, 540, { cap: 80, color: "#fff0c4", align: "center", opacity: nA, progress: numProgress(t) });
      [[CUE.gamma3, 1560, 400], [CUE.hydrogen2, 330, 780], [CUE.screen, 1560, 700]].forEach(([cu, x, y]) => { const a = win(t, cu + 1.6, 205.8, 0.3, 0.8); if (a > 0) say("299,792,458 M/S", x, y, { ...sm, color: PALET, align: "center", opacity: a, progress: ramp(t, cu + 1.6, 0.6) }); });
      const vA = win(t, CUE.vacuum, 216.4, 0.3, 0.6); if (vA > 0) say("VACUUM", 380, 790, { ...sm, color: DIMT, opacity: vA, progress: ramp(t, CUE.vacuum, 0.4) });
      const kA = win(t, 236.0, 241.3, 0.3, 0.4); if (kA > 0) say("KM/H", 1640, 862, { ...sm, color: DIMT, align: "center", opacity: kA, progress: 1 });
      h.tags();
      return hudA;
    },
  });
};

export const lightSpeed: Film = {
  meta: { title: "lightSpeed", W, H, fps: FPS, bpm: 120, durationFrames: DURATION },
  assets: { images: {} },
  shots: [{ id: "lightSpeed", start: 0, end: DURATION, draw }],
};
