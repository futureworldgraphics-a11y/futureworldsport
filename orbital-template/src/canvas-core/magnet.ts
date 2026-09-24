import { Gfx, rng, type Ctx, type Env, type P } from "./core";
import { Film } from "./film";
import { clamp, lerp } from "./gallery";
import {
  W, H, FPS, OUT, CREAM, RED_B, GREY_B, CYAN_B, EARTH_B, YEL_B,
  PRO_T, YEL, DIM, RED, GREEN, PINK, FLAT, ease, easeOut, back, ramp, span,
  space, grainOver, layer, blit, text, ball, glow, inked, motes,
} from "./spaceStyle";

// MAGNET · chunk 4, narration-timed, one continuous 48.4 s shot, nothing repeats.
//  0-4.6    a fridge; a red horseshoe magnet holds a paperclip; a calendar flips YEAR 1 -> 20
//  4.6-9.6  three "no" signs draw on: no charging, no fuel, no plug
//  9.6-14.4 a clock ticks; every tick pulses the field lines; then the hands race (days)
//  14.4-18.4 Earth rises below: gravity pulls down, the magnet pulls up — the clip holds
//  18.4-27.4 everything else runs out: a battery drains, a spring relaxes, a fuel needle hits E
//  27.4-36.1 the magnet alone: where is the energy from? a hidden tank feeds it, drips, never empties
//  36.1-44.3 dive into the magnet: iron lattice -> one spinning electron (a tiny magnet) ->
//            pull back: magnetic domains swing into alignment in a wave
//  44.3-48.4 the aligned lattice breathes; field loops; closing line
// Cues: this file's own pauses (ffmpeg silencedetect -38 dB, 0.15 s).

const DURATION = 1452; // 48.40 s (audio 48.431 s)
const CUE = {
  charge: 4.61, fuel: 5.99, plug: 7.35, second: 9.61, day: 12.0, gravity: 14.43,
  runs: 18.36, battery: 23.06, spring: 24.14, engine: 25.50,
  where: 27.43, reservoir: 30.09, empty: 32.96, quantum: 36.07, electron: 38.77, arch: 41.16, misunderstand: 44.28,
};
const FRIDGE_B = ["#5a548a", "#8f89c9", "#b9b3d9", "#e3dff3"];

// ---------------------------------------------------------------- the horseshoe magnet (local units)
// arc centre (0,0), centreline radius 80; legs down to y 90; silver tips 90..132; clip hangs below.
const ARC: P[] = (() => { const pts: P[] = [[-80, 90]]; for (let i = 0; i <= 40; i++) { const a = Math.PI + (i / 40) * Math.PI; pts.push([Math.cos(a) * 80, Math.sin(a) * 80]); } pts.push([80, 90]); return pts; })();
const CLIP: P[] = [[-12, 262], [-12, 150], [-2, 138], [10, 138], [20, 150], [20, 250], [10, 260], [2, 250], [2, 166]];
const drawMagnet = (c: Ctx, x: number, y: number, s: number, alpha: number, t: number, o: { field?: number; pulse?: number; clip?: boolean; swing?: number } = {}) => {
  if (alpha <= 0) return;
  const { field = 0, pulse = 0, clip = true, swing = 0 } = o;
  c.save(); c.globalAlpha = alpha; c.translate(x, y); c.scale(s, s);
  // field lines under the tips, around the clip
  if (field > 0) {
    c.save(); c.lineCap = "round";
    for (let k = 1; k <= 4; k++) {
      const pts: P[] = []; for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push([-(80 + k * 26) * Math.cos(u * Math.PI), 132 + Math.sin(u * Math.PI) * (40 + k * 46)]); }
      c.setLineDash([7, 9]); c.lineDashOffset = -t * 26 - k * 5; c.strokeStyle = CREAM; c.globalAlpha = alpha * field * (0.45 + 0.4 * pulse) * (1 - k * 0.12); c.lineWidth = 2.6 + 2 * pulse;
      c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke();
    }
    c.setLineDash([]); c.restore(); c.globalAlpha = alpha;
    if (pulse > 0) glow(c, 0, 150, 170, "255,209,102", 0.35 * pulse);
  }
  // body: dark ink, deep red, red, a highlight along the outer edge
  inked(c, ARC, "#8f1f2e", 50);
  c.save(); c.translate(-3, -3); c.lineCap = "round"; c.lineJoin = "round"; c.strokeStyle = "#e0344d"; c.lineWidth = 36; c.beginPath(); ARC.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke();
  c.strokeStyle = "#ff8a95"; c.lineWidth = 9; c.beginPath(); ARC.slice(3, 36).forEach((p, i) => { const r = Math.hypot(p[0], p[1]) || 1, q: P = [p[0] * (1 + 10 / r), p[1] * (1 + 10 / r)]; i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); c.stroke(); c.restore();
  // silver tips
  for (const sx of [-80, 80]) { inked(c, [[sx, 92], [sx, 132]], "#8a84b8", 50); c.save(); c.lineCap = "butt"; c.strokeStyle = "#dcd8f0"; c.lineWidth = 14; c.beginPath(); c.moveTo(sx - 10, 96); c.lineTo(sx - 10, 128); c.stroke(); c.restore(); }
  // the paperclip, swinging a hair from the right tip
  if (clip) { c.save(); c.translate(80, 132); c.rotate(swing); c.translate(-80, -132); c.translate(80 - 4, -6); inked(c, CLIP, "#dcd8f0", 6.5); c.restore(); }
  c.restore();
};

// ---------------------------------------------------------------- small props
const battery = (c: Ctx, x: number, y: number, w: number, h: number, level: number, alpha: number, blink = 0) => {
  if (alpha <= 0) return; c.save(); c.globalAlpha = alpha;
  c.fillStyle = OUT; c.beginPath(); c.roundRect(x - w * 0.2 - 5, y - h / 2 - h * 0.08 - 5, w * 0.4 + 10, h * 0.1 + 10, 6); c.fill();
  c.fillStyle = "#8a84b8"; c.beginPath(); c.roundRect(x - w * 0.2, y - h / 2 - h * 0.08, w * 0.4, h * 0.1, 4); c.fill();
  c.fillStyle = OUT; c.beginPath(); c.roundRect(x - w / 2 - 7, y - h / 2 - 7, w + 14, h + 14, 18); c.fill();
  c.fillStyle = "#2a2552"; c.beginPath(); c.roundRect(x - w / 2, y - h / 2, w, h, 13); c.fill();
  const col = level > 0.5 ? GREEN : level > 0.2 ? YEL : RED, fh = (h - 16) * clamp(level);
  if (fh > 0.5) { c.fillStyle = col; c.beginPath(); c.roundRect(x - w / 2 + 8, y + h / 2 - 8 - fh, w - 16, fh, 8); c.fill(); c.fillStyle = "rgba(255,255,255,0.28)"; c.beginPath(); c.roundRect(x - w / 2 + 14, y + h / 2 - 8 - fh + 4, (w - 16) * 0.25, Math.max(0, fh - 8), 5); c.fill(); }
  if (blink > 0) { c.strokeStyle = RED; c.globalAlpha = alpha * blink; c.lineWidth = 6; c.beginPath(); c.roundRect(x - w / 2 - 3, y - h / 2 - 3, w + 6, h + 6, 15); c.stroke(); }
  c.restore();
};
const drop = (c: Ctx, x: number, y: number, s: number, col: string, alpha: number) => {
  if (alpha <= 0) return; c.save(); c.globalAlpha = alpha;
  const path = (k: number) => { c.beginPath(); c.moveTo(x, y - 34 * s * k); c.bezierCurveTo(x + 26 * s * k, y - 4 * s * k, x + 26 * s * k, y + 26 * s * k, x, y + 26 * s * k); c.bezierCurveTo(x - 26 * s * k, y + 26 * s * k, x - 26 * s * k, y - 4 * s * k, x, y - 34 * s * k); };
  c.fillStyle = OUT; path(1.22); c.fill(); c.fillStyle = col; path(1); c.fill();
  c.fillStyle = "rgba(255,255,255,0.45)"; c.beginPath(); c.ellipse(x - 8 * s, y + 4 * s, 5 * s, 9 * s, 0.3, 0, 6.28); c.fill();
  c.restore();
};
const plug = (c: Ctx, x: number, y: number, s: number, alpha: number) => {
  if (alpha <= 0) return; c.save(); c.globalAlpha = alpha;
  inked(c, [[x, y + 22 * s], [x, y + 40 * s], [x + 18 * s, y + 52 * s]], "#8a84b8", 7 * s);
  inked(c, [[x - 11 * s, y - 34 * s], [x - 11 * s, y - 18 * s]], "#dcd8f0", 6 * s); inked(c, [[x + 11 * s, y - 34 * s], [x + 11 * s, y - 18 * s]], "#dcd8f0", 6 * s);
  c.fillStyle = OUT; c.beginPath(); c.roundRect(x - 26 * s, y - 22 * s, 52 * s, 46 * s, 10 * s); c.fill();
  c.fillStyle = "#5a548a"; c.beginPath(); c.roundRect(x - 21 * s, y - 17 * s, 42 * s, 36 * s, 7 * s); c.fill();
  c.restore();
};
const noSign = (c: Ctx, x: number, y: number, r: number, p: number, alpha: number) => {
  if (alpha <= 0 || p <= 0) return;
  const ring: P[] = []; for (let i = 0; i <= 60; i++) { const a = -Math.PI / 2 + (i / 60) * Math.PI * 2; ring.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
  inked(c, ring, RED, r * 0.16, { progress: clamp(p * 1.6), alpha });
  inked(c, [[x - r * 0.7, y - r * 0.7], [x + r * 0.7, y + r * 0.7]], RED, r * 0.16, { progress: clamp(p * 2.4 - 1.4), alpha });
};
const coil = (y0: number, y1: number, x: number, turns: number, amp: number): P[] => { const pts: P[] = []; const N = turns * 16; for (let i = 0; i <= N; i++) { const u = i / N; pts.push([x + Math.sin(u * turns * Math.PI * 2) * amp, lerp(y0, y1, u)]); } return pts; };

// ---------------------------------------------------------------- the iron lattice
const LAT = (() => { const out: { i: number; j: number; dom: number; ph: number }[] = []; const r = rng(71); for (let i = -12; i <= 12; i++) for (let j = -7; j <= 7; j++) { const dom = ((Math.floor((i + 12 + (j % 2)) / 6) + Math.floor((j + 7) / 5) * 2) % 4 + 4) % 4; out.push({ i, j, dom, ph: r() * 6.28 }); } return out; })();
const DOM_A = [-Math.PI / 2, 0.15, -Math.PI * 0.9, 2.2];
const DOM_C = ["#5fd6f5", PINK, CREAM, PRO_T];

const draw = (ctx: Ctx, frame: number, env: Env) => {
  const t = frame / FPS, g = new Gfx(ctx, env, frame, FLAT), sc = env.scale;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(space(env).canvas as CanvasImageSource, 0, 0); ctx.setTransform(sc, 0, 0, sc, 0, 0);
  motes(ctx, t, 0.8);
  const AL = layer(env, "magArt"), c = AL.ctx;
  const words: (() => void)[] = [];
  const say = (s: string, x: number, y: number, o: Parameters<typeof text>[4]) => { words.push(() => text(g, s, x, y, o)); };

  // ================================================================ S1-S4: the fridge
  const fOut = ease(ramp(t, 17.9, 0.8)), fa = 1 - fOut, fx = -760 * fOut;
  const MX = 520 + fx, MY = 330; // magnet anchor on the fridge
  const tick = t >= CUE.second && t < CUE.gravity ? Math.exp(-((t - CUE.second) % 1) * 7) : 0;
  const tugA = span(t, CUE.gravity, 18.2, 0.4);
  if (fa > 0) {
    // Earth rises below for "the downward tug of Earth's gravity"
    const eUp = ease(ramp(t, CUE.gravity, 1.1)) * (1 - ease(ramp(t, 17.6, 0.8)));
    if (eUp > 0) { const ecy = H + 1280 - 360 * eUp; glow(c, 960, ecy - 1000, 700, "79,151,245", 0.3 * eUp); ball(c, 960, ecy, 1100, EARTH_B, { outline: 8 }); c.save(); c.beginPath(); c.arc(960, ecy, 1100, 0, 6.28); c.clip(); c.fillStyle = "#2fb37a"; [[-300, -1020, 260, 60], [260, -1040, 320, 70], [700, -980, 200, 50]].forEach(([dx, dy, rx, ry]) => { c.beginPath(); c.ellipse(960 + dx, ecy + dy, rx, ry, 0.1, 0, 6.28); c.fill(); }); c.restore(); }
    // the fridge door
    c.save(); c.globalAlpha = fa;
    c.fillStyle = OUT; c.beginPath(); c.roundRect(292 + fx, 92, 476, 900, 34); c.fill();
    c.fillStyle = FRIDGE_B[1]; c.beginPath(); c.roundRect(300 + fx, 100, 460, 884, 28); c.fill();
    c.fillStyle = FRIDGE_B[2]; c.beginPath(); c.roundRect(314 + fx, 110, 420, 860, 24); c.fill();
    c.fillStyle = FRIDGE_B[3]; c.globalAlpha = fa * 0.7; c.beginPath(); c.roundRect(330 + fx, 124, 46, 830, 20); c.fill(); c.globalAlpha = fa;
    c.fillStyle = OUT; c.fillRect(300 + fx, 352, 460, 9);
    for (const [y0, y1] of [[170, 312], [420, 660]]) { inked(c, [[716 + fx, y0], [716 + fx, y1]], "#8a84b8", 20); c.strokeStyle = "#dcd8f0"; c.lineWidth = 6; c.lineCap = "round"; c.beginPath(); c.moveTo(711 + fx, y0 + 8); c.lineTo(711 + fx, y1 - 8); c.stroke(); }
    c.restore();
    const swing = Math.sin(t * 1.7) * 0.035 + (tugA > 0 ? Math.sin(t * 9) * 0.02 * tugA : 0);
    drawMagnet(c, MX, MY, 1.15, fa, t, { field: ramp(t, 0.8, 1.2), pulse: tick + 0.6 * tugA * (0.5 + 0.5 * Math.sin(t * 5)), swing });
    // the tug of war: magnet up, gravity down
    if (tugA > 0) {
      const cx = MX + 92 * 1.15, top = MY + 140 * 1.15, bot = MY + 300 * 1.15, k = 1 + 0.08 * Math.sin(t * 6);
      inked(c, [[cx + 70, bot - 20], [cx + 70, top + 10]], PRO_T, 14, { alpha: tugA * fa, progress: ease(ramp(t, CUE.gravity + 0.2, 0.5)) });
      inked(c, [[cx + 48, top + 40], [cx + 70, top + 8], [cx + 92, top + 40]], PRO_T, 14, { alpha: tugA * fa * ramp(t, CUE.gravity + 0.6, 0.2) });
      inked(c, [[cx + 70, bot], [cx + 70, bot + 150 * k]], "#5fd6f5", 14, { alpha: tugA * fa, progress: ease(ramp(t, CUE.gravity + 0.8, 0.5)) });
      inked(c, [[cx + 48, bot + 150 * k - 32], [cx + 70, bot + 150 * k], [cx + 92, bot + 150 * k - 32]], "#5fd6f5", 14, { alpha: tugA * fa * ramp(t, CUE.gravity + 1.2, 0.2) });
      say("MAGNET", cx + 110, top + 60, { cap: 26, color: PRO_T, progress: ramp(t, CUE.gravity + 0.5, 0.4), opacity: tugA * fa });
      say("GRAVITY", cx + 110, bot + 60, { cap: 26, color: "#5fd6f5", progress: ramp(t, CUE.gravity + 1.1, 0.4), opacity: tugA * fa });
    }
  }

  // S1: the calendar flipping YEAR 1 -> 20
  const calA = span(t, 0.5, CUE.charge - 0.1, 0.35);
  if (calA > 0) {
    const yv = lerp(1, 20, easeOut(ramp(t, 0.7, 2.9))), n = Math.floor(yv), f = yv - n, cx = 1400, cy = 470, pop = back(clamp(ramp(t, 0.5, 0.45)));
    c.save(); c.globalAlpha = calA; c.translate(cx, cy); c.scale(pop, pop);
    const page = (dy: number, a: number) => { c.save(); c.globalAlpha = calA * a; c.translate(0, dy); c.fillStyle = OUT; c.beginPath(); c.roundRect(-146, -126, 292, 252, 26); c.fill(); c.fillStyle = "#fff1dc"; c.beginPath(); c.roundRect(-140, -120, 280, 240, 22); c.fill(); c.fillStyle = "#e0344d"; c.beginPath(); c.roundRect(-140, -120, 280, 62, [22, 22, 0, 0]); c.fill(); c.restore(); };
    page(0, 1);
    if (n < 20 && f < 0.35) page(-f / 0.35 * 120, 1 - f / 0.35);
    for (const rx of [-80, 80]) inked(c, [[rx, -140], [rx, -104]], "#8a84b8", 10);
    c.restore();
    say("YEAR", cx, cy - 116 * pop, { cap: 30, color: CREAM, align: "center", opacity: calA });
    say(String(n), cx, cy - 24 * pop, { cap: 96 * pop, color: "#2a2552", align: "center", opacity: calA, w: 9 });
  }

  // S2: three "no" signs
  const noA = span(t, CUE.charge - 0.1, CUE.second - 0.1, 0.35);
  if (noA > 0) {
    const items: [number, number, string, (x: number, y: number, a: number) => void][] = [
      [CUE.charge, 1170, "NO CHARGING", (x, y, a) => battery(c, x, y + 4, 44, 76, 0.7 + 0.3 * Math.sin(t * 3), a)],
      [CUE.fuel, 1440, "NO FUEL", (x, y, a) => drop(c, x, y + 4, 1.25, "#ffb347", a)],
      [CUE.plug, 1710, "NO PLUG", (x, y, a) => plug(c, x, y, 1.15, a)],
    ];
    items.forEach(([t0, x, label, icon]) => {
      const p = back(clamp(ramp(t, t0, 0.4))); if (p <= 0) return;
      const y = 420 + Math.sin(t * 2 + x) * 6;
      c.save(); c.translate(x, y); c.scale(p, p); c.translate(-x, -y); glow(c, x, y, 120, "255,95,109", 0.18 * noA); icon(x, y, noA); c.restore();
      noSign(c, x, y, 78 * p, ramp(t, t0 + 0.3, 0.45), noA);
      say(label, x, 540, { cap: 26, color: CREAM, align: "center", progress: ramp(t, t0 + 0.15, 0.5), opacity: noA });
    });
  }

  // S3: the clock — every tick pulses the field; then days race by
  const clkA = span(t, CUE.second - 0.1, CUE.gravity + 0.1, 0.35);
  if (clkA > 0) {
    const cx = 1400, cy = 520, R = 170, pop = back(clamp(ramp(t, CUE.second - 0.1, 0.45)));
    c.save(); c.globalAlpha = clkA; c.translate(cx, cy); c.scale(pop, pop);
    glow(c, 0, 0, R * 1.8, "255,209,102", 0.14 + 0.25 * tick);
    ball(c, 0, 0, R, ["#b9b3d9", "#dcd8f0", "#efedf8", "#ffffff"]);
    for (let k = 0; k < 60; k++) { const a = (k / 60) * Math.PI * 2, r0 = k % 5 ? R * 0.86 : R * 0.78; c.strokeStyle = "#2a2552"; c.lineWidth = k % 5 ? 3 : 7; c.lineCap = "round"; c.beginPath(); c.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); c.lineTo(Math.cos(a) * R * 0.92, Math.sin(a) * R * 0.92); c.stroke(); }
    const secs = t - CUE.second, whole = Math.floor(secs), frac = secs - whole;
    const race = ease(ramp(t, CUE.day, 1.2)), hourA = -Math.PI / 2 + race * (t - CUE.day) * 9, minA = -Math.PI / 2 + 0.6 + race * (t - CUE.day) * 40;
    const secA = -Math.PI / 2 + ((whole + easeOut(clamp(frac * 5))) / 60) * Math.PI * 2 + race * (t - CUE.day) * 3;
    const hand = (a: number, len: number, w: number, col: string) => inked(c, [[0, 0], [Math.cos(a) * len, Math.sin(a) * len]], col, w);
    hand(hourA, R * 0.48, 12, "#2a2552"); hand(minA, R * 0.7, 8, "#2a2552"); hand(secA, R * 0.8, 4, RED);
    ball(c, 0, 0, 12, RED_B);
    c.restore();
  }

  // ================================================================ S5: everything else runs out
  const runA = span(t, CUE.runs + 0.3, CUE.where - 0.1, 0.45);
  if (runA > 0) {
    // battery
    const p1 = back(clamp(ramp(t, CUE.runs + 0.4, 0.45)));
    if (p1 > 0) {
      const lv = 1 - easeOut(ramp(t, CUE.battery, 0.9)), bl = t > CUE.battery + 0.9 ? 0.5 + 0.5 * Math.sin((t - CUE.battery) * 14) : 0;
      c.save(); c.translate(420, 540); c.scale(p1, p1); c.translate(-420, -540);
      if (lv > 0.05) glow(c, 420, 540, 200, "95,224,163", 0.25 * lv * runA);
      battery(c, 420, 540, 150, 270, lv, runA, bl * runA); c.restore();
    }
    // spring: compressed and humming, then relaxes to rest with a dying bounce
    const p2 = back(clamp(ramp(t, CUE.runs + 0.8, 0.45)));
    if (p2 > 0) {
      const rel = ramp(t, CUE.spring, 0.01), ts = t - CUE.spring;
      const blockY = rel > 0 ? 690 - Math.cos(ts * 9) * 150 * Math.exp(-ts * 3.2) : 540 + Math.sin(t * 38) * 2.5;
      const top = 330;
      c.save(); c.globalAlpha = runA; c.translate(960, 540); c.scale(p2, p2); c.translate(-960, -540);
      inked(c, [[850, top], [1070, top]], "#8a84b8", 18);
      inked(c, coil(top + 8, blockY - 45, 960, 11, 58), "#dcd8f0", 7);
      c.fillStyle = OUT; c.beginPath(); c.roundRect(880 - 6, blockY - 45 - 6, 160 + 12, 90 + 12, 18); c.fill();
      c.fillStyle = "#5a548a"; c.beginPath(); c.roundRect(880, blockY - 45, 160, 90, 14); c.fill(); c.fillStyle = "#8f89c9"; c.beginPath(); c.roundRect(888, blockY - 39, 144, 34, 10); c.fill();
      c.restore();
      if (rel <= 0) for (let k = 0; k < 3; k++) inked(c, [[1080 + k * 10, 480 + k * 30], [1100 + k * 10, 486 + k * 30]], YEL, 4, { alpha: runA * (0.5 + 0.5 * Math.sin(t * 20 + k)) });
    }
    // fuel gauge: needle falls from F to E
    const p3 = back(clamp(ramp(t, CUE.runs + 1.2, 0.45)));
    if (p3 > 0) {
      const gx = 1500, gy = 610, R = 160, fall = ramp(t, CUE.engine, 1.1), na = lerp(-0.12 * Math.PI, -0.88 * Math.PI, fall * fall) + (fall < 1 ? Math.sin(t * 17) * 0.02 : 0);
      c.save(); c.globalAlpha = runA; c.translate(gx, gy); c.scale(p3, p3); c.translate(-gx, -gy);
      const arc: P[] = []; for (let i = 0; i <= 50; i++) { const a = -Math.PI + (i / 50) * Math.PI; arc.push([gx + Math.cos(a) * R, gy + Math.sin(a) * R]); }
      c.fillStyle = OUT; c.beginPath(); c.arc(gx, gy, R + 28, Math.PI, 0); c.closePath(); c.fill();
      c.fillStyle = "#2a2552"; c.beginPath(); c.arc(gx, gy, R + 20, Math.PI, 0); c.closePath(); c.fill();
      inked(c, arc.slice(0, 12), RED, 16); inked(c, arc.slice(11), "#dcd8f0", 16);
      for (let k = 0; k <= 8; k++) { const a = -Math.PI + (k / 8) * Math.PI; inked(c, [[gx + Math.cos(a) * (R - 40), gy + Math.sin(a) * (R - 40)], [gx + Math.cos(a) * (R - 22), gy + Math.sin(a) * (R - 22)]], CREAM, 4); }
      if (fall >= 1) glow(c, gx - R + 20, gy - 20, 90, "255,95,109", 0.5 + 0.3 * Math.sin(t * 10));
      inked(c, [[gx, gy], [gx + Math.cos(na) * (R - 30), gy + Math.sin(na) * (R - 30)]], PRO_T, 9);
      ball(c, gx, gy, 18, GREY_B);
      c.restore();
      say("E", gx - R + 8, gy - 64, { cap: 34, color: fall >= 1 ? RED : CREAM, opacity: runA * p3 });
      say("F", gx + R - 34, gy - 64, { cap: 34, color: CREAM, opacity: runA * p3 });
    }
    say("EVERYTHING ELSE RUNS OUT", 960, 130, { cap: 52, color: CREAM, align: "center", progress: ramp(t, CUE.runs, 0.9), opacity: runA, w: 6 });
    say("BATTERIES DIE", 420, 760, { cap: 30, color: t > CUE.battery ? RED : DIM, align: "center", progress: ramp(t, CUE.battery, 0.5), opacity: runA });
    say("SPRINGS RELAX", 960, 800, { cap: 30, color: t > CUE.spring ? YEL : DIM, align: "center", progress: ramp(t, CUE.spring, 0.5), opacity: runA });
    say("ENGINES NEED FUEL", 1500, 760, { cap: 30, color: t > CUE.engine ? PRO_T : DIM, align: "center", progress: ramp(t, CUE.engine, 0.5), opacity: runA });
  }

  // ================================================================ S6: where does the energy come from?
  const qA = span(t, CUE.where - 0.1, CUE.quantum + 0.6, 0.4);
  const HX = 700, HY = 380, HS = 1.35; // hero magnet
  const zoomU = ease(ramp(t, CUE.quantum, 1.3)) * 1.45, F: P = [HX - 80 * HS, HY + 45 * HS];
  if (qA > 0) {
    const pop = back(clamp(ramp(t, CUE.where - 0.1, 0.5)));
    // the hidden reservoir and its pipe
    const tankA = span(t, CUE.reservoir, CUE.quantum + 0.2, 0.45) * (1 - ramp(t, CUE.quantum, 0.35));
    if (tankA > 0) {
      const tx = 1440, ty = 560, tw = 260, th = 470, pt = back(clamp(ramp(t, CUE.reservoir, 0.5)));
      c.save(); c.globalAlpha = tankA; c.translate(tx, ty); c.scale(pt, pt); c.translate(-tx, -ty);
      const lvl = 0.84 + 0.012 * Math.sin(t * 2.4);
      c.save(); c.beginPath(); c.roundRect(tx - tw / 2, ty - th / 2, tw, th, 60); c.clip();
      const top = ty + th / 2 - th * lvl;
      c.fillStyle = "rgba(95,214,245,0.28)"; c.beginPath(); c.moveTo(tx - tw / 2, ty + th / 2); for (let i = 0; i <= 30; i++) { const x = tx - tw / 2 + (i / 30) * tw; c.lineTo(x, top + Math.sin(i * 0.6 + t * 3) * 6); } c.lineTo(tx + tw / 2, ty + th / 2); c.closePath(); c.fill();
      for (let k = 0; k < 9; k++) { const bx = tx - tw * 0.35 + ((k * 53) % (tw * 0.7)), by = ty + th / 2 - ((t * 60 + k * 70) % (th * lvl)); c.fillStyle = "rgba(208,246,255,0.5)"; c.beginPath(); c.arc(bx, by, 4 + (k % 3) * 2, 0, 6.28); c.fill(); }
      c.restore();
      c.setLineDash([12, 12]); c.lineDashOffset = -t * 18; c.strokeStyle = CREAM; c.lineWidth = 4; c.globalAlpha = tankA * 0.75; c.beginPath(); c.roundRect(tx - tw / 2, ty - th / 2, tw, th, 60); c.stroke(); c.setLineDash([]); c.globalAlpha = tankA;
      // the tap at the bottom: drops fall forever, the level never moves
      const tapA = ramp(t, CUE.empty, 0.4);
      if (tapA > 0) { inked(c, [[tx + tw / 2 - 10, ty + th / 2 - 40], [tx + tw / 2 + 50, ty + th / 2 - 40], [tx + tw / 2 + 50, ty + th / 2 - 10]], "#8a84b8", 16, { alpha: tankA * tapA }); for (let k = 0; k < 4; k++) { const f = ((t - CUE.empty) * 1.3 + k / 4) % 1; if (t - CUE.empty < k / 4 / 1.3) continue; drop(c, tx + tw / 2 + 50, ty + th / 2 + 10 + f * 220, 0.45, "#5fd6f5", tankA * tapA * (1 - f)); } }
      c.restore();
      say("?", tx - 34, ty - 70, { cap: 110, color: CREAM, opacity: tankA * 0.9, progress: ramp(t, CUE.reservoir + 0.3, 0.5), w: 10 });
      if (tapA > 0) say("LEVEL: FULL", tx, ty + th / 2 + 40, { cap: 24, color: "#5fd6f5", align: "center", opacity: tankA, progress: ramp(t, CUE.empty + 0.8, 0.5) });
      // the pipe: energy seems to flow from the tank into the magnet
      const pipeA = tankA * ramp(t, CUE.reservoir + 0.6, 0.4);
      if (pipeA > 0) { const a: P = [tx - tw / 2, ty], b: P = [HX + 120, HY + 60], m: P = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 90]; const pts: P[] = []; for (let i = 0; i <= 30; i++) { const u = i / 30; pts.push([(1 - u) * (1 - u) * a[0] + 2 * u * (1 - u) * m[0] + u * u * b[0], (1 - u) * (1 - u) * a[1] + 2 * u * (1 - u) * m[1] + u * u * b[1]]); } c.save(); c.globalAlpha = pipeA * 0.6; c.setLineDash([6, 14]); c.lineDashOffset = t * 40; c.strokeStyle = "#5fd6f5"; c.lineWidth = 5; c.lineCap = "round"; c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke(); c.restore(); }
    }
    // the magnet, zooming into its left arm at "deep into the quantum world"
    const z = Math.pow(8, zoomU), ma = qA * (1 - ramp(t, CUE.quantum + 0.55, 0.5));
    c.save(); c.translate(F[0], F[1]); c.scale(z, z); c.translate(-F[0], -F[1]);
    drawMagnet(c, HX, HY, HS * pop, ma, t, { field: 1 - ramp(t, CUE.quantum, 0.3), pulse: 0.3 + 0.3 * Math.sin(t * 3), swing: Math.sin(t * 1.5) * 0.04 });
    c.restore();
    const qs: [number, number, string][] = [[CUE.where, CUE.reservoir, "WHERE DOES ITS ENERGY COME FROM?"], [CUE.reservoir, CUE.empty, "AN INVISIBLE RESERVOIR?"], [CUE.empty, CUE.quantum, "THAT NEVER EMPTIES?"]];
    qs.forEach(([a0, a1, s]) => { if (t > a0 - 0.05 && t < a1 + 0.05) say(s, 960, 110, { cap: 46, color: a0 === CUE.where ? CREAM : YEL, align: "center", progress: ramp(t, a0, 0.8), opacity: 1 - ramp(t, a1 - 0.25, 0.25), w: 5.5 }); });
  }

  // ================================================================ S7-S8: into the lattice
  const e1 = ease(ramp(t, CUE.quantum + 0.25, 1.7)), e2 = ease(ramp(t, CUE.electron, 0.85)), e3 = ease(ramp(t, CUE.arch, 1.05));
  const Ls = 0.08 * Math.pow(12.5, e1) * Math.pow(10, e2) * Math.pow(0.1, e3);
  const LC: P = [lerp(F[0], 960, ease(ramp(t, CUE.quantum + 0.3, 1.6))), lerp(F[1], 540, ease(ramp(t, CUE.quantum + 0.3, 1.6)))];
  const latA = ramp(t, CUE.quantum + 0.35, 0.4) * (1 - span(t, 39.35, CUE.arch + 0.15, 0.3)) * (1 - 0.45 * ramp(t, CUE.misunderstand - 0.2, 0.6));
  if (latA > 0) {
    const sp = 150 * Ls, rr = 24 * Ls;
    for (const a of LAT) {
      const x = LC[0] + a.i * sp, y = LC[1] + a.j * sp; if (x < -80 || x > W + 80 || y < -80 || y > H + 80) continue;
      const phase2 = t >= CUE.arch;
      const al = phase2 ? ease(ramp(t, 41.9 + ((a.i + 12) / 24) * 1.3, 0.45)) : 1;
      const ang = phase2 ? lerp(DOM_A[a.dom], -Math.PI / 2, al) : -Math.PI / 2 + Math.sin(t * 2 + a.ph) * 0.08;
      const wob = Math.sin(t * 3 + a.ph) * 0.05 * (phase2 ? 1 - al : 0) + (phase2 ? Math.sin(t * 2.4 - a.i * 0.55 + a.j * 0.35) * 0.08 * al : 0);
      const col = phase2 && al < 0.95 ? DOM_C[a.dom] : YEL, L = 40 * Ls;
      const ex = Math.cos(ang + wob) * L, ey = Math.sin(ang + wob) * L;
      c.save(); c.globalAlpha = latA;
      if (rr > 1.5) ball(c, x, y, rr, GREY_B, { outline: Math.max(1.5, rr * 0.14) });
      if (Ls > 0.25) { inked(c, [[x - ex, y - ey], [x + ex, y + ey]], col, Math.max(2, 6 * Ls)); const hx = x + ex, hy = y + ey, ha = ang + wob; inked(c, [[hx - Math.cos(ha - 0.5) * 16 * Ls, hy - Math.sin(ha - 0.5) * 16 * Ls], [hx, hy], [hx - Math.cos(ha + 0.5) * 16 * Ls, hy - Math.sin(ha + 0.5) * 16 * Ls]], col, Math.max(2, 6 * Ls)); }
      c.restore();
    }
    // once aligned, the whole block becomes a magnet: field loops wrap it
    const fl = ramp(t, 43.4, 0.8) * latA;
    if (fl > 0) { c.save(); c.lineCap = "round"; for (const side of [-1, 1]) for (let k = 0; k < 3; k++) { c.setLineDash([9, 12]); c.lineDashOffset = -t * 30 * side; c.strokeStyle = CREAM; c.globalAlpha = fl * (0.45 - k * 0.1); c.lineWidth = 3; c.beginPath(); c.ellipse(960 + side * (560 + k * 90), 540, 380 + k * 90, 470 + k * 50, 0, 0, 6.28); c.stroke(); } c.setLineDash([]); c.restore(); }
  }
  // the electron close-up: a spinning ball that is itself a tiny magnet
  const elA = span(t, 39.3, CUE.arch + 0.35, 0.3);
  if (elA > 0) {
    const s = (0.35 + 0.65 * ease(ramp(t, 39.2, 0.5))) * (1 - 0.85 * ease(ramp(t, CUE.arch, 0.45))), ex = 960, ey = 560, R = 150 * s;
    c.save(); c.globalAlpha = elA;
    glow(c, ex, ey, R * 2.6, "95,214,245", 0.4);
    for (const side of [-1, 1]) for (let k = 0; k < 3; k++) { c.setLineDash([8, 10]); c.lineDashOffset = -t * 24; c.strokeStyle = CREAM; c.globalAlpha = elA * (0.5 - k * 0.12); c.lineWidth = 3; c.beginPath(); c.ellipse(ex + side * (R * 1.05 + k * 70 * s), ey, R * 0.95 + k * 70 * s, R * 1.6 + k * 60 * s, 0, 0, 6.28); c.stroke(); }
    c.setLineDash([]); c.globalAlpha = elA;
    const ring = (front: boolean) => { const pts: P[] = []; for (let i = 0; i <= 60; i++) { const a = (i / 60) * Math.PI * (front ? 1 : -1); pts.push([ex + Math.cos(a) * R * 1.55, ey + Math.sin(a) * R * 0.42]); } inked(c, pts, "#5fd6f5", 5 * s, { alpha: elA * (front ? 1 : 0.5) }); };
    ring(false);
    ball(c, ex, ey, R, CYAN_B);
    ring(true);
    // spin marker riding the ring
    const sa = t * 4.5; if (Math.sin(sa) > -0.2) ball(c, ex + Math.cos(sa) * R * 1.55, ey + Math.sin(sa) * R * 0.42, 12 * s, YEL_B);
    inked(c, [[ex, ey + R * 1.75], [ex, ey - R * 1.75]], YEL, 14 * s, { progress: ease(ramp(t, 39.6, 0.5)) });
    inked(c, [[ex - 34 * s, ey - R * 1.75 + 44 * s], [ex, ey - R * 1.75], [ex + 34 * s, ey - R * 1.75 + 44 * s]], YEL, 14 * s, { alpha: elA * ramp(t, 40.05, 0.2) });
    c.restore();
    say("SPIN", ex + 40 * s, ey - R * 1.75 - 10, { cap: 34 * Math.max(0.6, s), color: YEL, progress: ramp(t, 40.0, 0.4), opacity: elA });
    say("EVERY ELECTRON IS A TINY MAGNET", 960, 930, { cap: 38, color: CREAM, align: "center", progress: ramp(t, 39.9, 0.9), opacity: elA });
  }

  const band = (y0: number, y1: number, a: number) => { if (a <= 0) return; const gr = c.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, "rgba(21,18,43,0)"); gr.addColorStop(0.3, `rgba(21,18,43,${0.82 * a})`); gr.addColorStop(0.7, `rgba(21,18,43,${0.82 * a})`); gr.addColorStop(1, "rgba(21,18,43,0)"); c.fillStyle = gr; c.fillRect(0, y0, W, y1 - y0); };
  band(20, 220, ramp(t, CUE.quantum + 0.4, 0.5) * (1 - span(t, 39.3, CUE.arch + 0.2, 0.3)));
  band(930, 1080, span(t, CUE.arch + 0.9, CUE.misunderstand, 0.4));
  band(740, 1040, ramp(t, CUE.misunderstand - 0.2, 0.5));
  grainOver(env, c);
  blit(ctx, env, AL);

  // ================================================================ lettering
  say("20 YEARS STRAIGHT", 1400, 170, { cap: 48, color: CREAM, align: "center", progress: ramp(t, 2.4, 0.9), opacity: 1 - ramp(t, CUE.charge - 0.35, 0.3), w: 5.5 });
  if (t > CUE.second - 0.1 && t < CUE.gravity + 0.2) { const o = 1 - ramp(t, CUE.gravity - 0.2, 0.3); say("EVERY SINGLE SECOND", 1400, 190, { cap: 46, color: CREAM, align: "center", progress: ramp(t, CUE.second, 0.8), opacity: o }); say("OF EVERY SINGLE DAY", 1400, 800, { cap: 34, color: YEL, align: "center", progress: ramp(t, CUE.day, 0.8), opacity: o }); }
  if (t > CUE.gravity - 0.1 && t < 18.2) { const o = 1 - ramp(t, 17.8, 0.3); say("HOLDING ON", 1420, 220, { cap: 56, color: CREAM, align: "center", progress: ramp(t, CUE.gravity + 0.2, 0.6), opacity: o }); say("AGAINST GRAVITY", 1420, 310, { cap: 56, color: "#5fd6f5", align: "center", progress: ramp(t, CUE.gravity + 0.9, 0.6), opacity: o }); }
  if (t > CUE.quantum - 0.1 && t < CUE.electron + 0.2) say("DEEP INTO THE QUANTUM WORLD", 960, 110, { cap: 50, color: CREAM, align: "center", progress: ramp(t, CUE.quantum + 0.2, 0.8), opacity: 1 - ramp(t, CUE.electron - 0.3, 0.3), w: 5.5 });
  if (t > CUE.electron - 0.1 && t < CUE.arch + 0.2) say("THE SPINNING HEART OF AN ELECTRON", 960, 110, { cap: 44, color: "#5fd6f5", align: "center", progress: ramp(t, CUE.electron, 0.8), opacity: 1 - ramp(t, CUE.arch - 0.25, 0.3), w: 5 });
  if (t > CUE.arch - 0.1 && t < CUE.misunderstand + 0.2) say("THE HIDDEN ARCHITECTURE OF MATTER", 960, 110, { cap: 46, color: CREAM, align: "center", progress: ramp(t, CUE.arch, 0.9), opacity: 1 - ramp(t, CUE.misunderstand - 0.2, 0.3), w: 5.5 });
  if (t > CUE.arch + 0.9 && t < CUE.misunderstand) say("ALL POINTING THE SAME WAY", 960, 1000, { cap: 32, color: YEL, align: "center", progress: ramp(t, 42.6, 0.8), opacity: 1 - ramp(t, CUE.misunderstand - 0.3, 0.3) });
  if (t > CUE.misunderstand - 0.1) { say("SOMETHING ABOUT ENERGY", 960, 820, { cap: 50, color: CREAM, align: "center", progress: ramp(t, CUE.misunderstand, 0.9), w: 5.5 }); say("MOST PEOPLE MISUNDERSTAND", 960, 910, { cap: 60, color: YEL, align: "center", progress: ramp(t, CUE.misunderstand + 1.4, 1.1), w: 6.5 }); }

  g.group("plain", () => words.forEach((f) => f()));
};

export const magnet: Film = {
  meta: { title: "magnet", W, H, fps: FPS, bpm: 120, durationFrames: DURATION },
  assets: { images: {} },
  shots: [{ id: "chunk4", start: 0, end: DURATION, draw }],
};
