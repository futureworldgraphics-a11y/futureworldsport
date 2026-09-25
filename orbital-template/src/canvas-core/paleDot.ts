import { rng, type Ctx, type Env, type P } from "./core";
import { Film } from "./film";
import { clamp, lerp } from "./gallery";
import { W, H, FPS, ease, easeOut, ramp } from "./spaceStyle";
import {
  TAU, CX, CY, BAR, WHITE, PALE, CYAN, BLUE, VIO, PINK, AMBER, GOLD, RED, GREEN, WARM, NEON, TXT, DIMT, GOLDT,
  g1, win, col, dot, hair, hairG, fade, beads, ellipse, flare, reticle, trail, glow, makeCamera, makeStars, drawStars, makeTint,
  v3, norm, randLand, makeSphere, project, drawGlobe, globeArc, beginFrame, endFrame, hudTables, fmt, fades, type V3, type Label, type Line,
} from "./cinemaKit";

// PALE BLUE DOT · one continuous 95.1 s shot. Word times come from forced alignment of the given
// transcript (pocketsphinx), so every beat lands on its word. Look: "data space": everything is
// points and hairlines of light over near-black, one hot light per moment, bloom, halftone,
// bokeh, grain, 2.39:1 letterbox, terminal-style HUD lettering top-left.
//
//  time   narration                               visual
//  0-4    (music)                                 fade up: Voyager 1 as a dotted wireframe, HUD "VOYAGER 1 - FEB 14 1990"
//  4.1    from this distant vantage point         its sightline beads out to a far, tiny Sun
//  6.5    the Earth might not seem ...            push toward the Sun, dotted gold orbits write on, EARTH tag;
//                                                 Earth is one amber dot among many
//  11.4   but for us, it's different              every orbit dims; Earth turns pale blue; a reticle locks on
//  14.5   consider again that dot                 orbits blow past; scattered-light bands of the real photo; 0.12 PIXEL
//  17-20  that's here / home / us                 crosshair to the frame edges / one ripple / warm core; HERE HOME US
//  21.8   on it                                   dive into the dot: stars streak, it opens into a point-cloud globe
//  22.9   everyone you love / know / heard of     warm links, then a ring of cyan arcs, then a violet web across the globe
//  28.3   every human being who ever was          the globe fills from you outward; 117,000,000,000 counter
//  30.9   lived out their lives                   every light flares once and dims to an afterglow
//  32.1   the aggregate of our joy and suffering  the globe slides left and pours a river of neon dashes; joy rises gold,
//                                                 suffering sinks crimson
//  35.6   religions, ideologies, doctrines        emblems write on along the bank and beam upward; flags; market lines
//  41.9   hunter & forager ... inventor & explorer pairs of lights spun off the thinning river, one staging per pair:
//                                                 chase/gather, advance/retreat, a skyline built then crumbled,
//                                                 a pyramid that levels, a spiral into one, a child born between two,
//                                                 a branching idea and a launch off-frame
//  59     teacher ... saint and sinner            a 3D web of everyone; single nodes flare with tags: teacher's fan,
//                                                 glitching red politician, superstar starburst, leader's converging lines,
//                                                 saint's halo / sinner's jagged ring
//  68.4   the history of our species              the web spirals in ...
//  70.5   lived there, on a mote of dust          ... to the globe, which pulls back into one mote among drifting dust
//  75.5   suspended in a sunbeam                  a volumetric shaft of light rakes in; the motes glitter
//  77.4   a very small stage                      the beam narrows to a spotlight, a dotted stage writes on beneath the dot
//  81.6   in a vast cosmic arena                  pull back: the spiral galaxy, tiered dotted arena rings, YOU ARE HERE
//  84.5   (music)                                 keep pulling back into the cosmic web; PALE BLUE DOT; fade out

const DURATION = 2853; // 95.10 s (audio 95.112 s)
export const CUE = {
  from: 4.1, earth: 6.46, of: 8.34, but: 11.4, diff: 12.65, consider: 14.46, dot: 15.44, here: 16.95, home: 18.44, us: 19.59,
  onit: 21.76, love: 22.94, know: 24.55, heard: 26.5, human: 28.27, lived: 30.88, aggregate: 32.09, joy: 34.57, suffer: 35.12,
  thousands: 35.59, confident: 37.69, ideologies: 39.04, economic: 39.88, hunter: 41.89, hero: 44.2, creator: 45.74,
  destroyer: 46.76, civ: 47.42, king: 49.15, couple: 51.37, love2: 52.37, mother: 53.29, child: 54.43, inventor: 56.58,
  explorer: 57.54, teacher: 59.0, corrupt: 60.63, superstar: 62.45, star: 63.2, supreme: 64.46, saint: 66.8, sinner: 67.91,
  history: 68.44, livedThere: 70.45, mote: 71.97, suspended: 73.75, sunbeam: 75.48, earth2: 77.44, small: 78.72, stage: 80.11,
  vast: 81.56, cosmic: 82.79, arena: 83.68, title: 87.0, end: 95.1,
};

// ================================================================ camera: one z-travel for the whole film
// the camera's z speed spikes on the dive and the two pull-backs; stars streak with real motion blur
const speed = (t: number) => 0.012 + 1.15 * g1(t, 22.3, 0.6) - 0.9 * g1(t, 72.2, 0.65) - 0.85 * g1(t, 82.5, 0.75) - 0.07 * ramp(t, 84.5, 3);
const panRate = (t: number) => 0.03 * ramp(t, 32.5, 1.5) * (1 - ramp(t, 58.3, 1.5));
const CAM = makeCamera(speed, panRate, 96), STARS = makeStars(5, 1900);

// background tint keyframes (inner colour of a radial wash; edges go darker)
const TINT: [number, number, number, number][] = [[0, 5, 7, 16], [6, 13, 10, 13], [11, 12, 9, 17], [15, 18, 10, 17], [21.5, 13, 10, 19], [23, 4, 10, 23], [32, 6, 10, 24], [34.5, 20, 8, 27], [42, 14, 8, 25], [59, 17, 8, 27], [70, 7, 8, 20], [73, 17, 12, 11], [78, 19, 13, 10], [82, 6, 8, 19], [95.2, 3, 4, 10]];
const tint = makeTint(TINT);

// ================================================================ Voyager 1, dotted wireframe (local units, dish axis = +x)
const VOY = (() => {
  const lines: P[][] = [], mesh: P[] = [];
  lines.push(ellipse(0, 0, 28, 96, 0, 60));
  for (const f of [0.33, 0.62, 0.85]) lines.push(ellipse(-22 * (1 - f * f), 0, 28 * f, 96 * f, 0, 40));
  for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU; lines.push(Array.from({ length: 9 }, (_, i) => { const s = i / 8; return [-22 * (1 - s * s) + 28 * s * Math.cos(a), 96 * s * Math.sin(a)] as P; })); }
  for (const a of [Math.PI / 2, (7 * Math.PI) / 6, (11 * Math.PI) / 6]) lines.push([[28 * Math.cos(a), 96 * Math.sin(a)], [62, 0]]);
  lines.push([[-70, -26], [-26, -26], [-26, 26], [-70, 26], [-70, -26]], [[-70, -26], [-26, 26]], [[-70, 26], [-26, -26]]);
  lines.push([[-48, -26], [-190, -120]], [[-218, -140], [-182, -140], [-182, -116], [-218, -116], [-218, -140]]);
  lines.push([[-48, 26], [-200, 110]], [[-60, 0], [-330, 260]]);
  lines.push(ellipse(-228, -128, 8, 8, 0, 14));
  for (const s of [0.6, 0.75, 0.9]) { const x = -48 - 152 * s, y = 26 + 84 * s; lines.push([[x - 9, y - 9], [x + 9, y - 1], [x + 5, y + 8], [x - 13, y], [x - 9, y - 9]]); }
  const r = rng(12);
  for (let i = 0; i < 170; i++) { const s = Math.sqrt(r()), a = r() * TAU; mesh.push([-22 * (1 - s * s) + 28 * s * Math.cos(a), 96 * s * Math.sin(a)]); }
  return { lines, mesh };
})();
const drawVoyager = (c: Ctx, x: number, y: number, s: number, rot: number, A: number, prog: number) => {
  if (A <= 0.004) return;
  const cr = Math.cos(rot), sr = Math.sin(rot), T = (p: P): P => [x + (p[0] * cr - p[1] * sr) * s, y + (p[0] * sr + p[1] * cr) * s];
  const n = VOY.lines.length;
  VOY.lines.forEach((ln, i) => {
    const pp = clamp(prog * 1.6 - (i / n) * 0.6); if (pp <= 0) return;
    const sp = ln.map(T);
    hair(c, sp, i % 2 ? VIO : CYAN, A * 0.22, 1, pp);
    beads(c, sp, 5.5 * Math.max(0.6, s), 1.05, i % 3 ? CYAN : "200,180,255", A * 0.85, pp);
  });
  VOY.mesh.forEach((p, i) => { if (i / VOY.mesh.length < prog * 1.3 - 0.3) { const q = T(p); dot(c, q[0], q[1], 0.9, i % 2 ? VIO : CYAN, A * 0.5); } });
};

// ================================================================ solar system (screen space driven by one zoom)
const ORB = [{ r: 60, w: 0.2, a: 1.1 }, { r: 95, w: 0.12, a: 4.0 }, { r: 135, w: 0.004, a: 2.5 }, { r: 185, w: 0.05, a: 5.4 }, { r: 300, w: 0.02, a: 0.4 }, { r: 420, w: 0.01, a: 3.3 }];
const OFLAT = 0.34, OROT = -0.12, DOT: P = [1240, 540];
const orbPos = (i: number, t: number, k: number): P => { const o = ORB[i], a = o.a + o.w * t, x = Math.cos(a) * o.r, y = Math.sin(a) * o.r * OFLAT; return [(x * Math.cos(OROT) - y * Math.sin(OROT)) * k, (x * Math.sin(OROT) + y * Math.cos(OROT)) * k]; };
const sysK = (t: number) => lerp(0.16, 1, ease(ramp(t, 4.6, 5.8))) * (1 + 0.6 * ease(ramp(t, 10.5, 4))) * Math.exp(Math.log(12) * ease(ramp(t, CUE.consider, 3.2)));
const sunAt = (t: number): P => {
  const k = sysK(t), e = orbPos(2, t, k), q = ease(ramp(t, 4.6, 5.8)), free: P = [lerp(1400, 1010, q), lerp(468, 560, q)], lock = ease(ramp(t, 11.2, 2.4));
  return [lerp(free[0], DOT[0] - e[0], lock), lerp(free[1], DOT[1] - e[1], lock)];
};
const earthAt = (t: number): P => { const s = sunAt(t), e = orbPos(2, t, sysK(t)); return [s[0] + e[0], s[1] + e[1]]; };

// ================================================================ globe: the kit's point-cloud Earth, plus everyone on it
const FIB = makeSphere(2600, 9);
const lonAt = (t: number) => 0.9 + 0.07 * t;
const P0: V3 = v3(0.45, -lonAt(26) - 0.35);
const near = (r: () => number, base: V3, spread: number): V3 => norm([base[0] + (r() - 0.5) * 2 * spread, base[1] + (r() - 0.5) * 2 * spread, base[2] + (r() - 0.5) * 2 * spread]);
const PEOPLE = (() => {
  const r = rng(21);
  const love = Array.from({ length: 7 }, () => near(r, P0, 0.08)), know = Array.from({ length: 60 }, () => near(r, P0, 0.42));
  const all = Array.from({ length: 1500 }, () => randLand(r, 0.9)), dust = Array.from({ length: 3200 }, () => randLand(r, 0.8));
  const heardArcs: [V3, V3][] = []; for (let i = 0; i < 170; i++) heardArcs.push([i < 50 ? P0 : all[Math.floor(r() * 300)], all[Math.floor(r() * 300)]]);
  const ang = (v: V3) => Math.acos(clamp(v[0] * P0[0] + v[1] * P0[1] + v[2] * P0[2], -1, 1));
  const life = [...all, ...dust].map((v) => ({ v, d: ang(v), l: r(), s: 0.6 + r() * 0.8 }));
  return { love, know, heardArcs, life };
})();
// ================================================================ river of history
const RIV = (() => { const r = rng(33); return Array.from({ length: 1500 }, () => { const u = r() + r() + r() - 1.5; return { v: clamp(u / 1.2, -1, 1), s: 70 + r() * 90, x0: r() * 2600, ph: r() * TAU, h: Math.floor(r() * 6), spark: r() < 0.12, sr: 40 + r() * 120 }; }); })();
const EMB = (() => { const r = rng(44); return Array.from({ length: 150 }, () => ({ xw: 760 + r() * 1700, type: Math.floor(r() * 5), h: 26 + r() * r() * 110, d: r(), bl: 60 + r() * 150 })); })();
const FAR = (() => { const r = rng(45); return Array.from({ length: 520 }, () => ({ xw: 700 + r() * 1900, y: r(), h: 4 + r() * 12, d: r() })); })();
const FLAGS = (() => { const r = rng(46); return Array.from({ length: 34 }, () => ({ xw: 800 + r() * 1600, h: 80 + r() * 90, w: 30 + r() * 26, d: r(), c: r() < 0.5 ? CYAN : VIO })); })();
const CHARTS = (() => { const r = rng(47); return [PINK, CYAN, AMBER, VIO].map((rgb, k) => { let y = 0; const pts: number[] = []; for (let i = 0; i < 56; i++) { y += (r() - 0.48) * 22 - (k === 3 && i > 40 ? 9 : 0); pts.push(y); } return { rgb, y0: 280 + k * 38, pts }; }); })();
const scroll = (t: number) => 60 * Math.max(0, t - 35) + 30 * Math.max(0, t - 41.5);
const rivCY = (x: number, t: number) => lerp(600, 735, ease(ramp(t, 41.2, 1.6))) + 34 * Math.sin(x * 0.0045 - t * 0.25) + 16 * Math.sin(x * 0.011 + 1.7);

// ================================================================ web of everyone (3D)
const WEB = (() => {
  const r = rng(61), n = 760, pts = Array.from({ length: n }, () => ({ x: (r() - 0.5) * 3.4, y: (r() - 0.5) * 1.9, z: 0.7 + r() * 2.6, h: Math.floor(r() * 6), m: r() }));
  const edges: [number, number][] = [];
  for (let i = 0; i < n; i++) { const d = pts.map((q, j) => ({ j, d: j === i ? 1e9 : (q.x - pts[i].x) ** 2 + (q.y - pts[i].y) ** 2 + (q.z - pts[i].z) ** 2 })).sort((a, b) => a.d - b.d); edges.push([i, d[0].j], [i, d[1].j]); }
  return { pts, edges };
})();

// ================================================================ dust motes, galaxy, cosmic web
const MOTES = (() => { const r = rng(71); return Array.from({ length: 300 }, (_, i) => ({ x: r() * W, y: BAR + r() * (H - 2 * BAR), layer: i < 22 ? 0 : i < 150 ? 1 : 2, r: r(), ph: r() * TAU, sp: 0.05 + r() * 0.12 })); })();
const GAL = (() => {
  const r = rng(81), out: { x: number; y: number; rgb: string; m: number }[] = [];
  for (let i = 0; i < 3400; i++) {
    const bulge = r() < 0.22;
    if (bulge) { const rr = Math.pow(r(), 1.8) * 0.22, a = r() * TAU; out.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr, rgb: r() < 0.7 ? GOLD : WARM, m: r() }); continue; }
    const s = Math.pow(r(), 0.8), arm = i % 2, a = arm * Math.PI + s * 3.8 + (r() - 0.5) * (0.5 + 0.5 * (1 - s)), rr = 0.12 + 0.88 * s;
    out.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr, rgb: r() < 0.08 ? PINK : r() < 0.6 ? "160,195,255" : WHITE, m: r() });
  }
  return out;
})();
const GSUN = (() => { const a = 0 * Math.PI + 0.55 * 3.8 + 0.1, rr = 0.12 + 0.88 * 0.55; return { x: Math.cos(a) * rr, y: Math.sin(a) * rr }; })();
const COSMOS = (() => {
  const r = rng(91), nodes = Array.from({ length: 360 }, () => ({ x: (r() - 0.5) * 2.6, y: (r() - 0.5) * 1.5, m: r() })), edges: [number, number][] = [];
  nodes.forEach((a, i) => nodes.map((b, j) => ({ j, d: (a.x - b.x) ** 2 + (a.y - b.y) ** 2 })).filter((q) => q.j !== i).sort((p, q) => p.d - q.d).slice(0, 3).forEach((q) => { if (q.d < 0.03) edges.push([i, q.j]); }));
  return { nodes, edges };
})();
const galRot = (x: number, y: number, t: number): P => { const a = 0.02 * t, xr = x * Math.cos(a) - y * Math.sin(a), yr = x * Math.sin(a) + y * Math.cos(a), ti = -0.15, yy = yr * 0.42; return [xr * Math.cos(ti) - yy * Math.sin(ti), xr * Math.sin(ti) + yy * Math.cos(ti)]; };

// ================================================================ HUD copy: [start, end, text, row, write seconds]
const LINES: Line[] = [
  [CUE.from, 8.2, "A DISTANT VANTAGE POINT", 0, 1.5], [CUE.of, 11.2, "OF NO PARTICULAR INTEREST", 0, 1.3],
  [CUE.but, 14.3, "BUT FOR US", 0, 0.6], [CUE.diff, 14.3, "IT IS DIFFERENT", 1, 0.8],
  [CUE.consider, 16.8, "CONSIDER AGAIN", 0, 0.8], [CUE.dot, 16.8, "THAT DOT", 1, 0.5],
  [CUE.love, 24.45, "EVERYONE YOU LOVE", 0, 0.7], [CUE.know, 26.4, "EVERYONE YOU KNOW", 0, 0.7], [CUE.heard, 28.15, "EVERYONE YOU EVER HEARD OF", 0, 1.3],
  [CUE.human, 30.8, "EVERY HUMAN WHO EVER WAS", 0, 1.5], [CUE.lived, 32.0, "LIVED OUT THEIR LIVES", 0, 1.0],
  [CUE.aggregate, 34.45, "THE AGGREGATE", 0, 0.8], [CUE.joy, 35.5, "JOY AND SUFFERING", 0, 0.9],
  [CUE.thousands, 38.95, "THOUSANDS OF CONFIDENT RELIGIONS", 0, 2.6], [CUE.ideologies, 39.8, "IDEOLOGIES", 0, 0.6], [CUE.economic, 41.7, "ECONOMIC DOCTRINES", 0, 0.9],
  [CUE.hunter, 44.1, "HUNTER & FORAGER", 0, 1.0], [CUE.hero, 45.65, "HERO & COWARD", 0, 1.0], [CUE.creator, 49.0, "CREATOR & DESTROYER", 0, 1.2], [CUE.civ, 49.0, "OF CIVILIZATION", 1, 0.8],
  [CUE.king, 51.25, "KING & PEASANT", 0, 1.0], [CUE.couple, 53.2, "A YOUNG COUPLE IN LOVE", 0, 1.1], [CUE.mother, 56.45, "MOTHER & FATHER", 0, 0.9], [CUE.child, 56.45, "HOPEFUL CHILD", 1, 1.1],
  [CUE.inventor, 58.9, "INVENTOR & EXPLORER", 0, 1.3],
  [CUE.history, 70.3, "THE HISTORY OF OUR SPECIES", 0, 1.1], [CUE.livedThere, 71.9, "LIVED THERE", 0, 0.5], [CUE.mote - 0.05, 73.65, "ON A MOTE OF DUST", 0, 0.8],
  [CUE.suspended, 77.3, "SUSPENDED IN A SUNBEAM", 0, 2.1], [CUE.earth2, 81.4, "A VERY SMALL STAGE", 0, 2.8], [CUE.vast, 84.6, "IN A VAST COSMIC ARENA", 0, 2.4],
];
const LABELS: Label[] = [[0.6, 14.3, "VOYAGER 1 - FEB 14 1990"], [CUE.consider, 21.6, "NARROW ANGLE CAMERA"], [22.3, 32.0, "HOME PLANET"], [CUE.aggregate, 41.7, "HUMAN HISTORY"], [CUE.hunter, 70.3, "THE CAST"], [CUE.livedThere, 84.6, "EARTH - FROM 6 BILLION KM"]];

// ================================================================ the frame
const draw = (ctx: Ctx, frame: number, env: Env) => {
  const t = frame / FPS;
  const f = beginFrame(ctx, env, frame, tint(t)), c = f.c, tag = f.tag;

  const starA = 1 - 0.45 * win(t, 22.6, 33, 1, 1) - 0.4 * win(t, 32, 59, 1, 1) - 0.5 * win(t, 58.6, 70.5, 1, 1);
  drawStars(c, STARS, CAM, t, starA * ramp(t, 0, 2));

  // ---------------------------------------------------------------- 0-17: Voyager, Sun, orbits, lock-on
  if (t < 17.5) {
    const k = sysK(t), sun = sunAt(t), sysA = 1 - ramp(t, 14.8, 1.8), orbA = 1 - ramp(t, CUE.consider, 1.3);
    // Voyager: drifts, then we pass it as the camera pushes toward the Sun
    const pq = ease(ramp(t, 6.0, 4.0)), vx = 520 - 10 * t - 1100 * pq, vy = 640 + 150 * pq, vs = 1.05 * (1 + 2.3 * pq);
    const vrot = Math.atan2(sun[1] - vy, sun[0] - vx) + 0.04 * Math.sin(t * 0.3);
    const vA = ramp(t, 0.3, 1.8) * (1 - ramp(t, 8.4, 1.4));
    drawVoyager(c, vx, vy, vs, vrot, vA, ramp(t, 0.3, 2.6));
    const foc: P = [vx + Math.cos(vrot) * 62 * vs, vy + Math.sin(vrot) * 62 * vs];
    if (vA > 0) {
      const lA = vA * win(t, CUE.from, 9, 0.3, 1.2), pr = easeOut(ramp(t, CUE.from, 1.3));
      hairG(c, [foc, sun], VIO, 0.45 * lA, 1, pr);
      for (let b = 0; b < 7; b++) { const u = (t - CUE.from - b * 0.32) * 0.42; if (u > 0 && u < 1 && u < pr) { const x = lerp(foc[0], sun[0], u), y = lerp(foc[1], sun[1], u); glow(c, x, y, 9, AMBER, 0.5 * lA); dot(c, x, y, 1.8, WARM, lA); } }
    }
    // the Sun: brightest thing in the sky, even from 40 AU
    flare(c, sun[0], sun[1], 6 + 11 * Math.min(k, 1.6), "255,190,110", sysA * ramp(t, 0.2, 2) * clamp(1.4 - (sun[0] - 1500) / 600), 3, 0.2 + 0.01 * t, 16);
    // orbits: dotted gold ellipses write on around the Sun
    ORB.forEach((o, i) => {
      const pr = ramp(t, 5.2 + i * 0.3, 1.8); if (pr <= 0 || orbA <= 0) return;
      const rx = o.r * k, dim = t > CUE.but ? 1 - 0.75 * ramp(t, CUE.but, 0.8) : 1, a0 = o.a + o.w * t;
      const pts = ellipse(sun[0], sun[1], rx, rx * OFLAT, OROT, Math.max(24, Math.min(360, Math.round(rx * 0.9))), a0 - TAU * pr, a0);
      beads(c, pts, 4.5, 1.0, GOLD, 0.6 * orbA * dim);
      const p = orbPos(i, t, k), px = sun[0] + p[0], py = sun[1] + p[1];
      if (i === 2) return;
      glow(c, px, py, 9, AMBER, 0.4 * orbA * dim * pr); dot(c, px, py, i >= 4 ? 2.6 : 1.8, WARM, orbA * dim * pr);
      if (i === 5) beads(c, ellipse(px, py, 8, 2.4, OROT, 20), 2.5, 0.6, GOLD, 0.6 * orbA * dim * pr);
    });
    const e = earthAt(t), blue = ramp(t, CUE.but, 0.8), eA = ramp(t, 5.8, 1.2);
    tag(e[0], e[1], -30, -44, "EARTH", eA * (1 - ramp(t, 10.9, 0.4)), ramp(t, CUE.earth, 0.6), GOLD, GOLDT);
    // the reticle locks on
    if (t > CUE.but) {
      const q = ease(ramp(t, CUE.but, 1.1)), rr = 26 + 160 * (1 - q), ra = ramp(t, CUE.but, 0.3) * (1 - ramp(t, 16.6, 0.5)), rot = 0.35 * t;
      reticle(c, e[0], e[1], rr, rot, PALE, ra);
    }
    if (t < CUE.onit) { const warm = win(t, CUE.us, 21.9, 0.4, 0.3); glow(c, e[0], e[1], 12 + 16 * blue + 16 * warm, blue > 0 ? PALE : AMBER, (0.45 + 0.3 * warm) * eA); dot(c, e[0], e[1], 2 + 0.4 * blue, blue > 0.5 ? (warm > 0.5 ? "255,236,210" : "215,235,255") : WARM, eA); }
  }

  // ---------------------------------------------------------------- 14.5-22: the photograph's scattered-light bands; HERE / HOME / US
  if (t > CUE.consider - 0.1 && t < 22.8) {
    const bA = win(t, CUE.consider, 22.7, 1.4, 0.9), z = 1 + 0.018 * (t - CUE.consider), r = rng(101);
    const bands: [number, number, string, number][] = [[560, 110, CYAN, 0.05], [780, 170, "255,140,70", 0.09], [1010, 90, "120,170,255", 0.07], [1240, 210, "255,165,95", 0.13], [1450, 120, "190,120,255", 0.08], [1640, 250, "255,120,150", 0.06]];
    c.save(); c.translate(DOT[0], DOT[1]); c.rotate(-0.1); c.scale(z, 1);
    for (const [x, w, rgb, a] of bands) {
      const bx = x - DOT[0], gr = c.createLinearGradient(bx - w, 0, bx + w, 0);
      gr.addColorStop(0, col(rgb, 0)); gr.addColorStop(0.5, col(rgb, a * bA)); gr.addColorStop(1, col(rgb, 0));
      c.fillStyle = gr; c.fillRect(bx - w, -900, w * 2, 1800);
      for (let i = 0; i < 70; i++) dot(c, bx + (r() - 0.5) * w * 1.4, (r() - 0.5) * 900, 0.7 + r(), rgb, bA * (0.15 + r() * 0.35));
      for (let i = 0; i < 4; i++) { const lx = bx + (r() - 0.5) * w; fade(c, [lx, -700], [lx, 700], rgb, 0, a * bA * 0.9, 0.8); }
    }
    c.restore();
    const e = DOT;
    tag(e[0], e[1], 50, 60, "0.12 PIXEL", win(t, CUE.dot, 21.7, 0.3, 0.4), ramp(t, CUE.dot + 0.2, 0.6));
    // HERE: a crosshair runs to the frame edges
    const hA = win(t, CUE.here, 22.0, 0.2, 0.5), hp = easeOut(ramp(t, CUE.here, 0.7));
    if (hA > 0) for (const [dx, dy, L] of [[1, 0, W - 60 - e[0]], [-1, 0, e[0] - 60], [0, 1, H - BAR - 30 - e[1]], [0, -1, e[1] - BAR - 30]] as const) {
      const a0: P = [e[0] + dx * 14, e[1] + dy * 14], a1: P = [e[0] + dx * (14 + (L - 14) * hp), e[1] + dy * (14 + (L - 14) * hp)];
      fade(c, a0, a1, PALE, 0.55 * hA, 0.08 * hA, 1);
      for (let s = 40; s < (L - 14) * hp; s += 40) { const x = e[0] + dx * (14 + s), y = e[1] + dy * (14 + s); hair(c, [[x - dy * 4, y - dx * 4], [x + dy * 4, y + dx * 4]], PALE, 0.35 * hA * (1 - s / L), 1); }
    }
    // HOME: one ripple
    for (const d of [0, 0.3]) { const q = ramp(t, CUE.home + d, 2.4); if (q > 0 && q < 1) { const rr = 10 + 560 * easeOut(q); beads(c, ellipse(e[0], e[1], rr, rr, 0, 180), 5, 1.1, PALE, 0.75 * (1 - q) * bA); } }
  }

  // ---------------------------------------------------------------- 21.8-38: dive into the dot; the globe of everyone
  const G = (() => {
    const q = ease(ramp(t, CUE.onit, 1.5)), q2 = ease(ramp(t, CUE.aggregate, 1.8)), q3 = ease(ramp(t, 35.6, 3.2));
    const R0 = 2.2 * Math.exp(Math.log(300 / 2.2) * q), R = lerp(R0, 150, q2);
    const cx = lerp(lerp(DOT[0], 1180, q), 300, q2) - 520 * q3, cy = lerp(lerp(DOT[1], 555, q), 600, q2);
    return { cx, cy, R, lon: lonAt(t) };
  })();
  if (t > CUE.onit && t < 39.5) {
    drawGlobe(c, FIB, G.cx, G.cy, G.R, G.lon, 1, ramp(t, 23, 1.5));
    const aA = 1 - ramp(t, CUE.lived, 0.8);
    const p0 = project(P0, G.cx, G.cy, G.R, G.lon);
    if (t > CUE.love - 0.1 && aA > 0) {
      const la = ramp(t, CUE.love, 0.3);
      glow(c, p0.x, p0.y, 26, PINK, 0.6 * la * aA); dot(c, p0.x, p0.y, 3, "255,220,240", la * aA);
      PEOPLE.love.forEach((v, i) => { globeArc(c, P0, v, 0.04, G, PINK, 0.9 * aA, easeOut(ramp(t, CUE.love + i * 0.07, 0.5)), 1.3); const p = project(v, G.cx, G.cy, G.R, G.lon); if (p.z > 0) dot(c, p.x, p.y, 2.2, "255,190,225", aA * ramp(t, CUE.love + 0.2 + i * 0.07, 0.3)); });
      if (t > CUE.know - 0.1) PEOPLE.know.forEach((v, i) => { globeArc(c, P0, v, 0.08, G, CYAN, 0.6 * aA, easeOut(ramp(t, CUE.know + i * 0.018, 0.6))); const p = project(v, G.cx, G.cy, G.R, G.lon); if (p.z > 0) dot(c, p.x, p.y, 1.7, CYAN, aA * ramp(t, CUE.know + 0.3 + i * 0.018, 0.3)); });
      if (t > CUE.heard - 0.1) PEOPLE.heardArcs.forEach(([a, b], i) => { const d = Math.acos(clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1)); globeArc(c, a, b, 0.04 + d * 0.07, G, i % 3 ? VIO : PINK, 0.4 * aA, easeOut(ramp(t, CUE.heard + i * 0.009, 0.8)), 0.9); });
    }
    // every human who ever was: lights spread out from you; then each life flares once and dims
    if (t > CUE.human) {
      const gA = 1 - ramp(t, CUE.aggregate + 0.6, 1.4), pr = clamp(G.R / 300, 0.35, 1.6);
      for (const L of PEOPLE.life) {
        const on = CUE.human + (L.d / Math.PI) * 1.7; if (t < on) continue;
        const p = project(L.v, G.cx, G.cy, G.R, G.lon); if (p.z < 0) continue;
        const tl = CUE.lived + L.l * 1.1, life = t < tl ? 0.75 : 0.25 + 0.9 * Math.exp(-(t - tl) / 0.25) * ramp(t, tl, 0.05);
        dot(c, p.x, p.y, (0.8 + 0.5 * L.s) * pr, t > tl && t < tl + 0.4 ? "255,236,200" : WARM, gA * clamp(life) * ramp(t, on, 0.25) * (0.4 + 0.6 * p.z));
      }
    }
  }

  // ---------------------------------------------------------------- 32-59: the river of history
  if (t > CUE.aggregate && t < 59.4) {
    const src = t < 38.5 ? G.cx + G.R * 0.9 : -40, head = src + 2600 * ease(ramp(t, CUE.aggregate, 2.4)), rA = 1 - ramp(t, 58.2, 1.1);
    const thin = ease(ramp(t, 41.2, 1.6)), joy = ramp(t, CUE.joy, 0.9), suf = ramp(t, CUE.suffer, 0.9);
    c.lineCap = "round";
    for (const p of RIV) {
      const x = src + ((p.x0 + p.s * (t - CUE.aggregate)) % 2600); if (x > head || x > W + 40) continue;
      const hw = (8 + 100 * clamp((x - src) / 600)) * lerp(1, 0.32, thin);
      let y = rivCY(x, t) + p.v * hw + 4 * Math.sin(t * 1.3 + p.ph), rgb = NEON[p.h], a = (0.35 + 0.5 * (1 - Math.abs(p.v))) * rA * lerp(1, 0.55, thin);
      if (p.v < -0.12) { rgb = joy > 0.5 ? (p.h % 2 ? GOLD : "255,235,170") : rgb; y -= joy * (18 + (p.spark ? p.sr * (1 - thin) * clamp((t - CUE.joy) / 2.5) : 0)); if (p.spark) a *= 1 - 0.6 * joy * clamp((t - CUE.joy) / 3); }
      if (p.v > 0.12) { rgb = suf > 0.5 ? (p.h % 2 ? RED : "150,70,200") : rgb; y += suf * 22; }
      const L = p.s * 0.12 * (p.v > 0.12 ? lerp(1, 0.7, suf) : 1);
      fade(c, [x - L, y], [x, y], rgb, 0, a, 1.8); dot(c, x, y, 1.1, rgb, a);
    }
    // thousands of confident religions
    const eA = 1 - ramp(t, 41.2, 1.0), sx = scroll(t);
    if (t > CUE.thousands && eA > 0) {
      for (const f of FAR) { const x = f.xw - sx; if (x < 60 || x > W) continue; const on = CUE.thousands + ((f.xw - 700) / 1900) * 2.3 + f.d * 0.3; const pa = ramp(t, on, 0.4); if (pa <= 0) continue; const yb = rivCY(x, t) - 110 - f.y * 70; hair(c, [[x, yb], [x, yb - f.h]], GOLD, 0.3 * pa * eA, 0.8); dot(c, x, yb - f.h, 0.9, GOLD, 0.6 * pa * eA); }
      for (const m of EMB) {
        const x = m.xw - sx; if (x < 700 || x > W + 60) continue;
        const on = CUE.thousands + ((m.xw - 760) / 1700) * 2.2 + m.d * 0.3, pa = ramp(t, on, 0.7); if (pa <= 0) continue;
        const yb = rivCY(x, t) - 110 * lerp(1, 0.32, thin) - 8, h = m.h, sh: P[][] = [];
        if (m.type === 0) sh.push([[x - h * 0.18, yb], [x, yb - h * 0.8], [x + h * 0.18, yb], [x - h * 0.18, yb]], [[x, yb - h * 0.8], [x, yb - h]]);
        if (m.type === 1) sh.push([[x - h * 0.3, yb], [x - h * 0.3, yb - h * 0.4], [x + h * 0.3, yb - h * 0.4], [x + h * 0.3, yb]], ellipse(x, yb - h * 0.4, h * 0.3, h * 0.3, 0, 12, Math.PI, TAU), [[x, yb - h * 0.7], [x, yb - h]]);
        if (m.type === 2) sh.push([[x - h * 0.22, yb], [x - h * 0.22, yb - h * 0.62]], ellipse(x, yb - h * 0.62, h * 0.22, h * 0.3, 0, 12, Math.PI, TAU), [[x + h * 0.22, yb - h * 0.62], [x + h * 0.22, yb]]);
        if (m.type === 3) sh.push([[x, yb], [x, yb - h * 0.55]], ellipse(x, yb - h * 0.8, h * 0.22, h * 0.22, 0, 16));
        if (m.type === 4) { sh.push([[x, yb], [x, yb - h * 0.5]]); sh.push(Array.from({ length: 11 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = (i % 2 ? 0.1 : 0.24) * h; return [x + Math.cos(a) * rr, yb - h * 0.76 + Math.sin(a) * rr] as P; })); }
        sh.forEach((s) => { hair(c, s, GOLD, 0.25 * eA, 0.8, pa); beads(c, s, 3.6, 0.9, GOLD, 0.8 * eA, pa); });
        // confident: each one sends a beam up
        const bq = ramp(t, CUE.confident + m.d * 0.6, 0.6); if (bq > 0 && x > 820) { const top = Math.max(330, yb - h - m.bl * easeOut(bq)); fade(c, [x, yb - h], [x, top], GOLD, 0.5 * eA, 0, 1.4); dot(c, x, yb - h, 1.8, "255,240,200", 0.9 * eA * bq); }
      }
      // ideologies: flags
      for (const f of FLAGS) {
        const x = f.xw - sx; if (x < 720 || x > W + 60) continue; const pa = ramp(t, CUE.ideologies + f.d * 0.7, 0.5); if (pa <= 0) continue;
        const yb = rivCY(x, t) - 110 * lerp(1, 0.32, thin) - 4, top = yb - f.h * easeOut(pa);
        hair(c, [[x, yb], [x, top]], f.c, 0.7 * eA, 1);
        const flag = Array.from({ length: 9 }, (_, i) => [x + (f.w * i) / 8, top + 4 * Math.sin(i * 0.8 - t * 4 + f.d * 6) * (i / 8)] as P);
        const bot = flag.map(([px, py]) => [px, py + 22] as P).reverse();
        hairG(c, [...flag, ...bot, flag[0]], f.c, 0.7 * eA * pa, 1);
      }
      // economic doctrines: market lines race across the right of frame
      CHARTS.forEach((ch, k) => {
        const pr = ease(ramp(t, CUE.economic + k * 0.15, 1.5)); if (pr <= 0) return;
        const pts = ch.pts.map((v, i) => [900 + i * 17.5, ch.y0 + v] as P);
        hairG(c, pts, ch.rgb, 0.8 * eA, 1.2, pr);
        const n = Math.floor(pr * (pts.length - 1)); dot(c, pts[n][0], pts[n][1], 2.4, ch.rgb, eA);
      });
    }
  }

  // ---------------------------------------------------------------- 41.9-59: the cast, in pairs
  const pairA = (a: number, b: number) => win(t, a, b, 0.35, 0.6);
  const PC: P = [1150, 520];
  if (t > CUE.hunter - 0.1 && t < 44.8) {
    const A = pairA(CUE.hunter, 44.8), u = t - CUE.hunter, dx = -50 * u;
    trail(c, (w) => [PC[0] - 170 + dx + 150 * Math.sin(w * 2.6) + 60 * Math.sin(w * 7.1), PC[1] - 40 + 60 * Math.sin(w * 3.3 + 1)], u, AMBER, A, 30, 0.025);
    const fp: P = [PC[0] + 170 + dx + 30 * Math.sin(u * 0.9), PC[1] + 30 + 20 * Math.sin(u * 1.3 + 0.5)];
    glow(c, fp[0], fp[1], 20, GREEN, 0.5 * A); dot(c, fp[0], fp[1], 2.6, "220,255,230", A);
    const r = rng(301); for (let i = 0; i < 34; i++) { const ox = (r() - 0.5) * 260, oy = (r() - 0.5) * 170, m = 0.25 + r() * 1.9, q = ease(ramp(u, m, 0.5)); if (q >= 1) continue; dot(c, lerp(fp[0] + ox, fp[0], q), lerp(fp[1] + oy, fp[1], q), 1.3, GREEN, A * 0.7 * (1 - q * 0.6)); }
  }
  if (t > CUE.hero - 0.1 && t < 46.3) {
    const A = pairA(CUE.hero, 46.3), u = t - CUE.hero, adv = ease(ramp(u, 0.1, 1.2));
    const hx = PC[0] - 130 - 40 * u, hy = PC[1] + 10 - 30 * adv;
    flare(c, hx, hy, 6 + 12 * adv, GOLD, A, 12, 0.3 * u, 12);
    const cx0 = PC[0] + 140 + 90 * adv, cy0 = PC[1] + 10 - 20 * adv;
    glow(c, cx0, cy0, 14 * (1 - 0.5 * adv), VIO, 0.5 * A * (1 - 0.5 * adv)); dot(c, cx0, cy0, 2.4 * (1 - 0.4 * adv), "210,190,255", A * (1 - 0.55 * adv));
    hairG(c, [[PC[0] + 140, PC[1] + 10], [cx0, cy0]], VIO, 0.3 * A * adv, 1);
  }
  if (t > CUE.creator - 0.1 && t < 49.8) {
    const A = pairA(CUE.creator, 49.8), u = t - CUE.creator, r = rng(311), gy = 735, x0 = 700 - 30 * u;
    let lastTop: P = [x0, gy];
    for (let k = 0; k < 22; k++) {
      const w = 18 + r() * 28, h = 60 + r() * r() * 230, x = x0 + k * 38 + r() * 8, bq = ease(ramp(t, CUE.creator + 0.25 + k * 0.045, 0.7)), fall = t - (CUE.destroyer + 0.15 + r() * 0.9), hh = h * bq;
      if (bq <= 0) continue;
      const pts: P[] = []; for (let yy = 0; yy <= hh; yy += 7) { pts.push([x, gy - yy], [x + w, gy - yy]); } for (let xx = 7; xx < w; xx += 7) pts.push([x + xx, gy - hh]);
      for (let yy = 14; yy < hh - 6; yy += 14) for (let xx = 7; xx < w - 3; xx += 9) if (r() < 0.55) pts.push([x + xx, gy - yy]);
      if (fall < 0) { pts.forEach(([px, py]) => dot(c, px, py, 1.1, CYAN, 0.75 * A)); hair(c, [[x, gy], [x, gy - hh], [x + w, gy - hh], [x + w, gy]], CYAN, 0.25 * A, 1); lastTop = [x + w / 2, gy - hh]; }
      else { const rr = rng(700 + k); pts.forEach(([px, py]) => { const d = rr() * 0.4, f = Math.max(0, fall - d), yy = Math.min(gy + 6, py + 0.5 * 700 * f * f), xx = px + (rr() - 0.5) * 80 * f; dot(c, xx, yy, 1.1, f > 0 ? (rr() < 0.5 ? RED : AMBER) : CYAN, 0.75 * A * (1 - clamp(f / 1.6) * 0.7)); }); if (fall < 0.4) glow(c, x + w / 2, gy - hh / 2, 60, RED, 0.25 * A * (1 - fall / 0.4)); }
    }
    if (t < CUE.destroyer) { glow(c, lastTop[0], lastTop[1] - 8, 18, CYAN, 0.7 * A); dot(c, lastTop[0], lastTop[1] - 8, 2.6, "220,250,255", A); }
    else { const dq = ease(ramp(t, CUE.destroyer, 1.6)), dxp = lerp(x0 + 22 * 38, x0 - 20, dq); flare(c, dxp, gy - 280 + 60 * dq, 9, RED, A * (1 - ramp(t, 48.7, 0.5)), 31, 0.5 * u, 10); }
  }
  if (t > CUE.king - 0.1 && t < 51.9) {
    const A = pairA(CUE.king, 51.9), u = t - CUE.king, lv = ease(ramp(t, 50.3, 0.9)), r = rng(321);
    const apex: P = [PC[0] - 40 * u, PC[1] - 170], rows = 6, nodes: P[] = [];
    for (let i = 1; i < rows; i++) for (let j = 0; j <= i * 2; j++) nodes.push([apex[0] + (j - i) * 34, apex[1] + i * 52]);
    const par = (k: number) => { const i = Math.floor(Math.sqrt(k)) + 1; return i; };
    nodes.forEach((n, k) => { const dropA = 1 - lv, fy = n[1] + 160 * lv * (0.5 + r()); const pk = par(k); const ab: P = pk === 1 ? apex : nodes[Math.max(0, k - pk * 2)]; hair(c, [[n[0], fy], ab], GOLD, 0.25 * A * dropA * ramp(u, 0.1 + k * 0.01, 0.4), 0.8); dot(c, n[0], fy, 1.5, "200,170,120", A * dropA * ramp(u, 0.1 + k * 0.01, 0.3)); });
    const king: P = [lerp(apex[0], PC[0] - 60 - 40 * u, lv), lerp(apex[1], PC[1] + 40, lv)], peas: P = [lerp(apex[0] - 5 * 34, PC[0] + 60 - 40 * u, lv), lerp(apex[1] + 5 * 52, PC[1] + 40, lv)];
    glow(c, king[0], king[1], lerp(26, 14, lv), GOLD, 0.7 * A); dot(c, king[0], king[1], lerp(3.4, 2.4, lv), "255,240,200", A);
    for (let s = 0; s < 5; s++) { const a = -Math.PI / 2 + (s - 2) * 0.35; fade(c, [king[0] + Math.cos(a) * 7, king[1] + Math.sin(a) * 7], [king[0] + Math.cos(a) * 18, king[1] + Math.sin(a) * 18], GOLD, 0.8 * A * (1 - lv), 0, 1.2); }
    glow(c, peas[0], peas[1], 14, lv > 0.5 ? GOLD : "150,120,90", 0.4 * A + 0.3 * A * lv); dot(c, peas[0], peas[1], lerp(1.8, 2.4, lv), lv > 0.5 ? "255,240,200" : "190,160,120", A);
  }
  if (t > CUE.couple - 0.1 && t < 53.9) {
    const A = pairA(CUE.couple, 53.9), u = t - CUE.couple, ctr: P = [PC[0] - 30 * u, PC[1]];
    const at = (s: number, sgn: number) => (w: number): P => { const rr = 230 * (1 - ease(clamp(w / 1.7))) + 10, ph = w * 3.3 + (sgn > 0 ? 0 : Math.PI); return [ctr[0] + Math.cos(ph) * rr, ctr[1] + Math.sin(ph) * rr * 0.55]; };
    trail(c, at(0, 1), u, PINK, A, 34, 0.035); trail(c, at(0, -1), u, AMBER, A, 34, 0.035);
    const m = ramp(t, CUE.love2, 0.4); glow(c, ctr[0], ctr[1], 70, "255,120,170", 0.5 * A * m);
    const q = ramp(t, CUE.love2, 1.6); if (q > 0 && q < 1) beads(c, ellipse(ctr[0], ctr[1], 20 + 300 * easeOut(q), (20 + 300 * easeOut(q)) * 0.55, 0, 150), 5, 1.1, PINK, 0.7 * (1 - q) * A);
  }
  if (t > CUE.mother - 0.1 && t < 57.1) {
    const A = pairA(CUE.mother, 57.1), u = t - CUE.mother, dx = -35 * u, cl = ease(ramp(u, 0, 1.1));
    const m: P = [PC[0] - lerp(170, 70, cl) + dx, PC[1] + 30], f: P = [PC[0] + lerp(170, 70, cl) + dx, PC[1] + 30];
    glow(c, m[0], m[1], 18, CYAN, 0.6 * A); dot(c, m[0], m[1], 2.6, "220,250,255", A); glow(c, f[0], f[1], 18, AMBER, 0.6 * A); dot(c, f[0], f[1], 2.6, "255,240,210", A);
    hairG(c, [m, f], "200,210,255", 0.35 * A * cl, 1);
    const b = ramp(t, CUE.child, 0.5), rise = ease(ramp(t, CUE.child + 0.2, 1.8));
    if (b > 0) { const ch: P = [PC[0] + dx, PC[1] + 30 - 110 * rise]; hairG(c, [m, ch], CYAN, 0.35 * A * b, 1); hairG(c, [f, ch], AMBER, 0.35 * A * b, 1); flare(c, ch[0], ch[1], 3 + 7 * rise, "190,235,255", A * b, 41, 0.2 * u, 10); }
  }
  if (t > CUE.inventor - 0.1 && t < 59.4) {
    const A = pairA(CUE.inventor, 59.4), u = t - CUE.inventor, inv: P = [PC[0] - 190 - 20 * u, PC[1] + 70], r = rng(351);
    const branch = (p: P, ang: number, len: number, d: number, t0: number) => {
      if (d > 5) return; const q = ease(ramp(t, t0, 0.22)); if (q <= 0) return;
      const e: P = [p[0] + Math.cos(ang) * len * q, p[1] + Math.sin(ang) * len * q]; hairG(c, [p, e], CYAN, 0.7 * A, 1);
      if (q >= 1) { if (d === 5) dot(c, e[0], e[1], 1.8, "220,250,255", A); const n = 2 + (r() < 0.3 ? 1 : 0); for (let i = 0; i < n; i++) branch(e, ang + (r() - 0.5) * 1.3, len * (0.62 + r() * 0.2), d + 1, t0 + 0.2); }
    };
    for (let i = 0; i < 3; i++) branch(inv, -Math.PI / 2 + (i - 1) * 0.8, 70, 1, CUE.inventor + 0.1 + i * 0.06);
    glow(c, inv[0], inv[1], 22, CYAN, 0.7 * A); dot(c, inv[0], inv[1], 2.8, "230,250,255", A);
    const ex0: P = [PC[0] + 90 - 20 * u, PC[1] + 70], lq = Math.pow(ramp(t, CUE.explorer, 1.5), 2.2), ex: P = [ex0[0] + 1500 * lq * 0.86, ex0[1] - 1500 * lq * 0.5];
    hairG(c, [ex0, ex], "200,170,255", 0.6 * A, 1); for (let b = 1; b < 7; b++) { const k = b / 7, bx = lerp(ex0[0], ex[0], k), by = lerp(ex0[1], ex[1], k); dot(c, bx, by, 2, b % 2 ? AMBER : VIO, 0.8 * A * clamp(lq * 6)); }
    glow(c, ex[0], ex[1], 26, AMBER, 0.8 * A); dot(c, ex[0], ex[1], 3, "255,245,225", A);
    beads(c, ellipse(ex[0], ex[1], 16, 16, 0, 36, -0.4 + 2 * u, 4.2 + 2 * u), 3, 1, AMBER, 0.8 * A);
  }

  // ---------------------------------------------------------------- 58.6-71: the web of everyone, and its standouts
  if (t > 58.4 && t < 71.4) {
    const cz = 0.13 * (t - 58.4), wA = 1 - ramp(t, 70.3, 0.9), sw = ease(ramp(t, CUE.history, 2.0)), shrink = ease(ramp(t, 68.8, 1.8));
    const sp = WEB.pts.map((p) => {
      const d = p.z - cz; if (d < 0.2) return null;
      let x = (p.x * 760) / d, y = (p.y * 760) / d; const rr = Math.hypot(x, y), an = Math.atan2(y, x) + sw * (2.6 + 900 / (rr + 200)), r2 = rr * (1 - 0.8 * shrink);
      x = CX + Math.cos(an) * r2; y = CY + Math.sin(an) * r2;
      const appear = ramp(t, 58.4 + (1 - clamp(x / W)) * 1.0, 0.5);
      return { x, y, a: wA * appear * clamp((3.2 - d) / 1.2) * clamp((d - 0.2) / 0.4), p };
    });
    for (const [i, j] of WEB.edges) { const a = sp[i], b = sp[j]; if (!a || !b || Math.abs(a.x - b.x) > 400) continue; hair(c, [[a.x, a.y], [b.x, b.y]], NEON[a.p.h], 0.12 * Math.min(a.a, b.a), 0.8); }
    for (const s of sp) if (s) dot(c, s.x, s.y, 0.8 + 1.2 * s.p.m, NEON[s.p.h], s.a * (0.35 + 0.5 * s.p.m));
    const rA = (a: number, b: number) => win(t, a, b, 0.25, 0.6) * (1 - ramp(t, 68.5, 0.6));
    const drift = (p: P): P => { const k = 1 + 0.03 * (t - 59); return [CX + (p[0] - CX) * k, CY + (p[1] - CY) * k]; };
    // teacher of morals: a fan of lines to students
    { const A = rA(CUE.teacher, 63), n = drift([1380, 400]); if (A > 0) { const r = rng(401); for (let k = 0; k < 20; k++) { const an = 0.2 + (k / 19) * 2.6, rr = 130 + r() * 70, e: P = [n[0] + Math.cos(an) * rr, n[1] + Math.sin(an) * rr * 0.8]; hairG(c, [n, e], CYAN, 0.45 * A, 0.9, easeOut(ramp(t, 59.43 + k * 0.03, 0.4))); dot(c, e[0], e[1], 1.8, CYAN, A * ramp(t, 59.7 + k * 0.03, 0.3)); } glow(c, n[0], n[1], 26, CYAN, 0.7 * A); dot(c, n[0], n[1], 3, "230,250,255", A); tag(n[0], n[1], 30, -50, "TEACHER OF MORALS", A, ramp(t, 59.43, 0.8)); } }
    // corrupt politician: red links that glitch
    { const A = rA(CUE.corrupt, 64.2), n = drift([730, 640]); if (A > 0) { const r = rng(411), gr = rng(frame * 7 + 3); for (let k = 0; k < 14; k++) { const an = r() * TAU, rr = 110 + r() * 90, e: P = [n[0] + Math.cos(an) * rr, n[1] + Math.sin(an) * rr * 0.7], jx = gr() < 0.25 ? (gr() - 0.5) * 18 : 0; hairG(c, [[n[0] + jx, n[1]], [e[0] + jx, e[1]]], k % 3 ? RED : PINK, 0.5 * A, 0.9, easeOut(ramp(t, 60.8 + k * 0.03, 0.4))); dot(c, e[0] + jx, e[1], 1.8, RED, A); } const g2 = (gr() - 0.5) * 6; dot(c, n[0] - 3 + g2, n[1], 3, "255,60,80", 0.8 * A); dot(c, n[0] + 3 - g2, n[1], 3, "80,220,255", 0.6 * A); glow(c, n[0], n[1], 26, RED, 0.6 * A); tag(n[0], n[1], -30, 56, "CORRUPT POLITICIAN", A, ramp(t, 60.8, 0.8), RED, "#ff9aa6"); } }
    // superstar: the brightest flare in the film, with neon streaks flying out
    { const A = rA(CUE.superstar, 65.6), n = drift([1130, 560]); if (A > 0) { const q = ease(ramp(t, CUE.superstar, 0.8)), pk = 1 + 0.8 * g1(t, CUE.star + 0.2, 0.5); flare(c, n[0], n[1], (10 + 26 * q) * pk, "255,175,90", A, 51, 0.1 + 0.02 * t, 22); const r = rng(421); for (let k = 0; k < 70; k++) { const an = r() * TAU, v = 250 + r() * 700, d0 = (t - CUE.star - r() * 0.8) * v; if (d0 < 20) continue; const L = 20 + r() * 60, e: P = [n[0] + Math.cos(an) * d0, n[1] + Math.sin(an) * d0 * 0.9]; fade(c, [e[0] - Math.cos(an) * L, e[1] - Math.sin(an) * L * 0.9], e, NEON[k % 6], 0, 0.8 * A, 1.8); } tag(n[0], n[1], 44, 70, "SUPERSTAR", A, ramp(t, CUE.star, 0.6), AMBER, GOLDT); } }
    // supreme leader: everything is drawn in toward one point
    { const A = rA(CUE.supreme, 67.2), n = drift([1450, 330]); if (A > 0) { const r = rng(431); for (let k = 0; k < 60; k++) { const an = r() * TAU, rr = 140 + r() * 260, s: P = [n[0] + Math.cos(an) * rr, n[1] + Math.sin(an) * rr * 0.55]; const q = easeOut(ramp(t, 64.6 + r() * 0.8, 0.6)); hair(c, [s, [lerp(s[0], n[0], q), lerp(s[1], n[1], q)]], k % 2 ? RED : AMBER, 0.35 * A, 0.8); dot(c, s[0], s[1], 1.4, AMBER, 0.7 * A); } const q = ramp(t, 65.17, 1.6); if (q < 1) beads(c, ellipse(n[0], n[1], 20 + 360 * easeOut(q), (20 + 360 * easeOut(q)) * 0.55, 0, 160), 5, 1.1, RED, 0.6 * (1 - q) * A); flare(c, n[0], n[1], 9, "255,110,80", A, 61, 0, 10); tag(n[0], n[1], -40, 70, "SUPREME LEADER", A, ramp(t, 65.17, 0.8), RED, "#ff9aa6"); } }
    // saint and sinner
    { const A = rA(CUE.saint, 68.9), s = drift([840, 470]), n = drift([1060, 560]); if (A > 0) { glow(c, s[0], s[1], 40, "255,240,200", 0.7 * A); dot(c, s[0], s[1], 3, "255,255,245", A); beads(c, ellipse(s[0], s[1] - 18, 16, 5, 0, 30), 2.5, 1, GOLD, A * ramp(t, 67.21, 0.4)); tag(s[0], s[1], -40, -60, "SAINT", A, ramp(t, 67.21, 0.5), GOLD, GOLDT); const sq = ramp(t, CUE.sinner, 0.4); glow(c, n[0], n[1], 30, "200,20,60", 0.8 * A * sq); dot(c, n[0], n[1], 2.6, "255,90,110", A * sq); const r = rng(441); hair(c, Array.from({ length: 17 }, (_, i) => { const a = (i / 16) * TAU, rr = 16 + (i % 2 ? 7 : 0) * r(); return [n[0] + Math.cos(a) * rr, n[1] + Math.sin(a) * rr] as P; }), RED, 0.7 * A * sq, 1); tag(n[0], n[1], 40, 60, "SINNER", A, ramp(t, CUE.sinner, 0.5), RED, "#ff9aa6"); } }
  }

  // ---------------------------------------------------------------- 70-84: lived there, a mote, a sunbeam, a small stage
  const D2: P = [1160, 520];
  if (t > 69.8 && t < 84.5) {
    const q = ease(ramp(t, 71.2, 2.0)), R = 220 * Math.exp(Math.log(2.4 / 220) * q), gx = lerp(CX, D2[0], q), gy = lerp(CY, D2[1], q);
    const st = ease(ramp(t, 79.6, 1.8)), vq = Math.pow(ramp(t, CUE.vast, 1.9), 1.6), zoom = lerp(1, 0.6, st) * (1 - 0.985 * vq), sA = 1 - ramp(t, 82.6, 0.9);
    const Z = (p: P): P => [D2[0] + (p[0] - D2[0]) * zoom, D2[1] + (p[1] - D2[1]) * zoom];
    // the beam: a raking shaft that narrows into a spotlight
    const bA = ramp(t, 75.0, 1.8) * sA, nar = ease(ramp(t, CUE.small, 1.6)), ang = lerp(0.58, 0.12, nar), bw = lerp(260, 70, nar) * zoom;
    if (bA > 0) {
      c.save(); c.translate(D2[0], D2[1]); c.rotate(-ang);
      const gr = c.createLinearGradient(-bw, 0, bw, 0); gr.addColorStop(0, col(WARM, 0)); gr.addColorStop(0.5, col(WARM, 0.2 * bA)); gr.addColorStop(1, col(WARM, 0));
      c.fillStyle = gr; const end = lerp(1400, 60 * zoom, nar);
      for (let y = -1400; y < end; y += 30) { c.globalAlpha = clamp((end - y) / 160) * clamp((y + 1400) / 400); c.fillRect(-bw, y, bw * 2, 30); }
      c.globalAlpha = 1;
      const r = rng(501); for (let i = 0; i < 12; i++) { const lx = (r() - 0.5) * bw * 1.4; fade(c, [lx, -1300], [lx, lerp(900, 40 * zoom, nar)], "255,220,170", 0, 0.12 * bA, 1 + r() * 2); }
      c.restore();
    }
    const beamAt = (x: number, y: number) => { if (bA <= 0) return 0; const dx = x - D2[0], dy = y - D2[1], ax = Math.sin(ang), ay = -Math.cos(ang), along = dx * ax + dy * ay, perp = Math.abs(dx * ay - dy * ax); return along < -60 ? 0 : bA * Math.exp(-((perp / bw) ** 2) * 2.2); };
    // motes: they converge in as the camera pulls back, then hang
    const mA = ramp(t, CUE.mote - 0.3, 1.0) * sA, conv = lerp(2.6, 1, ease(ramp(t, 71.4, 2.4)));
    if (mA > 0) for (const m of MOTES) {
      const hang = 1 - 0.7 * ramp(t, CUE.suspended, 1.2), dx = 26 * Math.sin(t * m.sp * hang + m.ph), dy = 18 * Math.sin(t * m.sp * 0.8 * hang + m.ph * 1.3) - 6 * (t - 71);
      const base: P = [D2[0] + (m.x - D2[0]) * conv * (m.layer === 0 ? 1.4 : 1) + dx, D2[1] + (m.y - D2[1]) * conv + dy], p = Z(base), lit = beamAt(p[0], p[1]);
      if (m.layer === 0) { const rr = (30 + 60 * m.r) * Math.max(zoom, 0.05); const gg = c.createRadialGradient(p[0], p[1], 0, p[0], p[1], rr); gg.addColorStop(0, col(WARM, 0.05 * mA * (0.4 + lit))); gg.addColorStop(0.8, col(WARM, 0.04 * mA * (0.4 + lit))); gg.addColorStop(1, col(WARM, 0)); c.fillStyle = gg; c.fillRect(p[0] - rr, p[1] - rr, rr * 2, rr * 2); }
      else { const rr = (m.layer === 1 ? 1.1 + m.r * 1.6 : 0.6 + m.r * 0.6) * Math.max(0.5, zoom); dot(c, p[0], p[1], rr, lit > 0.15 ? "255,225,180" : "200,190,200", mA * (0.12 + 0.2 * m.r + 1.1 * lit)); }
    }
    // the stage
    const sgA = ramp(t, CUE.stage, 0.4) * sA;
    if (sgA > 0) { const sc0 = Z([D2[0], D2[1] + 44]), rx = 110 * zoom, ry = 18 * zoom; beads(c, ellipse(sc0[0], sc0[1], rx, ry, 0, 90), Math.max(1.5, 4 * zoom), 1.1, GOLD, 0.85 * sgA, easeOut(ramp(t, CUE.stage, 0.9))); beads(c, ellipse(sc0[0], sc0[1] + 10 * zoom, rx, ry, 0, 90, 0, Math.PI), Math.max(1.5, 5 * zoom), 0.9, GOLD, 0.4 * sgA, easeOut(ramp(t, CUE.stage + 0.3, 0.9))); glow(c, sc0[0], sc0[1], rx * 1.1, WARM, 0.12 * sgA); for (let i = 0; i < 9; i++) { const a = Math.PI * (0.15 + (0.7 * i) / 8), fp: P = [sc0[0] + Math.cos(a) * rx, sc0[1] + Math.sin(a) * ry]; dot(c, fp[0], fp[1], 1.6, "255,230,190", sgA * ramp(t, CUE.stage + 0.5 + i * 0.05, 0.2)); } }
    // the globe, then the mote that is Earth
    const gA = ramp(t, 69.9, 0.6) * (1 - ramp(t, 83.4, 0.8));
    drawGlobe(c, FIB, gx, gy, R * Math.max(zoom, 0.3), lonAt(t), gA, 0);
    if (R < 7) { const e = Z([gx, gy]); glow(c, e[0], e[1], 16 + 20 * bA, PALE, 0.4 * gA); }
  }

  // ---------------------------------------------------------------- 81.6-95: the vast cosmic arena, then the cosmic web
  if (t > CUE.vast) {
    const q = ease(ramp(t, CUE.vast, 2.2)), sg = Math.exp(Math.log(40) * (1 - q)) * Math.exp(Math.log(0.12) * ease(ramp(t, 84.8, 7.5))), Rg = 520 * sg;
    const sunP = galRot(GSUN.x, GSUN.y, t), anchor: P = [lerp(D2[0], CX + sunP[0] * 520 * sg, q), lerp(D2[1], 560 + sunP[1] * 520 * sg, q)];
    const S = (x: number, y: number): P => { const p = galRot(x, y, t); return [anchor[0] + (p[0] - sunP[0]) * Rg, anchor[1] + (p[1] - sunP[1]) * Rg]; };
    const gA = ramp(t, 81.8, 1.2), ctr = S(0, 0);
    glow(c, ctr[0], ctr[1], Rg * 0.45, "255,200,140", 0.35 * gA); glow(c, ctr[0], ctr[1], Rg * 1.2, "140,160,255", 0.1 * gA);
    for (const s of GAL) { const p = S(s.x, s.y); dot(c, p[0], p[1], clamp(0.5 + s.m * 1.2 * Math.sqrt(sg), 0.5, 2.6), s.rgb, gA * (0.25 + 0.55 * s.m)); }
    // arena tiers: concentric dotted bowls
    const tA = gA * (1 - ramp(t, 86.8, 1.2));
    for (let i = 0; i < 5; i++) { const rx = Rg * (1.18 + i * 0.2), up = Rg * 0.06 * i; beads(c, ellipse(ctr[0], ctr[1] - up, rx, rx * (0.42 + i * 0.03), -0.15, 200, 0.02 * t * (i % 2 ? 1 : -1), 0.02 * t * (i % 2 ? 1 : -1) + TAU), 4.6, 1.0, GOLD, (0.35 + 0.35 * ramp(t, CUE.arena, 0.6)) * tA, easeOut(ramp(t, CUE.cosmic + i * 0.16, 0.9))); }
    for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU, p1 = [ctr[0] + Math.cos(a) * Rg * 1.18, ctr[1] + Math.sin(a) * Rg * 1.18 * 0.42] as P, p2 = [ctr[0] + Math.cos(a) * Rg * 1.98, ctr[1] - Rg * 0.24 + Math.sin(a) * Rg * 1.98 * 0.54] as P; beads(c, [p1, p2], 6, 0.8, GOLD, 0.3 * tA * ramp(t, CUE.arena, 0.6)); }
    const sp = S(GSUN.x, GSUN.y), hA = ramp(t, 83.9, 0.4) * (1 - ramp(t, 88.5, 1));
    glow(c, sp[0], sp[1], 12, PALE, 0.8 * hA); beads(c, ellipse(sp[0], sp[1], 9, 9, 0, 24), 2.5, 0.8, PALE, hA);
    tag(sp[0], sp[1], 40, 64, "YOU ARE HERE", hA, ramp(t, 83.9, 0.7));
    // the cosmic web closes in around it
    const wA = ramp(t, 85.5, 2.5), wz = lerp(4, 1, ease(ramp(t, 84.8, 8.5)));
    if (wA > 0) {
      const P2 = COSMOS.nodes.map((n) => [CX + n.x * 900 * wz, 560 + n.y * 900 * wz] as P);
      for (const [i, j] of COSMOS.edges) hair(c, [P2[i], P2[j]], j % 2 ? VIO : "120,170,255", 0.22 * wA, 0.9);
      COSMOS.nodes.forEach((n, i) => { const p = P2[i]; glow(c, p[0], p[1], 6 + 8 * n.m, n.m > 0.7 ? WARM : "160,180,255", 0.35 * wA); dot(c, p[0], p[1], 0.9 + n.m, WHITE, 0.6 * wA); });
    }
  }

  endFrame(ctx, env, frame, t, f, {
    black: fades(t, CUE.end),
    hud: (h) => {
      const { say } = h, hudA = hudTables(h, LABELS, LINES);
      if (t > CUE.human + 0.1 && t < 32.3) { const o = 1 - ramp(t, 32.0, 0.3), n = 117e9 * ease(ramp(t, CUE.human + 0.2, 1.8)); say("HUMANS EVER BORN (EST.)", 120, 312, { cap: 14, color: DIMT, progress: ramp(t, CUE.human + 0.2, 0.6), opacity: o, w: 1.5 }); say(fmt(n), 120, 338, { cap: 34, color: GOLDT, opacity: o * ramp(t, CUE.human + 0.2, 0.2), w: 3 }); }
      // HERE / HOME / US
      ([[CUE.here, "HERE", 400, TXT], [CUE.home, "HOME", 500, TXT], [CUE.us, "US", 600, GOLDT]] as const).forEach(([a, s, y, cl]) => { if (t > a - 0.05 && t < 22.3) say(s, 160, y, { cap: 70, color: cl, progress: ramp(t, a, 0.45), opacity: 1 - ramp(t, 21.8, 0.4), w: 4.5 }); });
      h.tags();
      if (t > CUE.title - 0.05) { const o = 1 - ramp(t, 93.2, 1.4); say("PALE BLUE DOT", CX, 780, { cap: 52, color: TXT, align: "center", progress: ramp(t, CUE.title, 1.6), opacity: o, w: 3.4 }); say("CARL SAGAN", CX, 860, { cap: 17, color: DIMT, align: "center", progress: ramp(t, 89.0, 0.9), opacity: o, w: 1.7 }); }
      return hudA;
    },
  });
};

export const paleDot: Film = {
  meta: { title: "paleDot", W, H, fps: FPS, bpm: 120, durationFrames: DURATION },
  assets: { images: {} },
  shots: [{ id: "paleDot", start: 0, end: DURATION, draw }],
};
