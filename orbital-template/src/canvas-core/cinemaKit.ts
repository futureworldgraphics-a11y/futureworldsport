import { Gfx, rng, type Ctx, type Env, type P } from "./core";
import { clamp, lerp } from "./gallery";
import { W, H, FLAT, ease, ramp, cached, grain, layer, text, textWidth, glow } from "./spaceStyle";
import { pixelate, pixelText, pixelWidth } from "./pixelKit";

// CINEMA KIT · the shared look for "data space" films (reference build: paleDot.ts).
// Every film in this style draws ONLY with what is exported here, so any coder given the same
// screenplay gets the same picture. Do not restyle in a film file: if a film needs a new move,
// add it here, documented, and re-verify paleDot is pixel-identical (tools/check.mjs --hash).
//
// Frame lifecycle (the order matters, it is part of the look):
//   const f = beginFrame(ctx, env, frame, tint(t));        background wash + additive art layer
//   drawStars(f.c, STARS, cam, t, alpha);                   the 3D starfield (motion-blurred)
//   ... scenes draw into f.c (additive), tags via f.tag(...)
//   endFrame(ctx, env, frame, t, f, { tint, hud, black });  bloom+halftone, bokeh, vignette, grain,
//                                                            HUD lettering (+glow), fades, letterbox
// Coordinates are always logical 1920x1080. Image area (inside the 2.39:1 bars) is y 138..942.

// ================================================================ constants and palette
export const TAU = Math.PI * 2, CX = 960, CY = 540, BAR = 138;
/** safe box for all lettering: 60 px inside the frame and the letterbox */
export const SAFE = { x0: 60, x1: W - 60, y0: BAR + 60, y1: H - BAR - 60 };
// light colours are "r,g,b" strings (alpha is applied per draw)
export const WHITE = "235,244,255", PALE = "150,205,255", CYAN = "110,220,255", BLUE = "120,160,255", VIO = "170,130,255", PINK = "255,100,200";
export const AMBER = "255,170,80", GOLD = "255,210,130", RED = "255,70,90", GREEN = "120,240,170", WARM = "255,190,120";
export const NEON = [PINK, CYAN, AMBER, VIO, "255,140,90", BLUE];
// lettering colours (CSS)
export const TXT = "#e6f2ff", DIMT = "#8391b8", GOLDT = "#ffd58a", PALET = "#a8d6ff", REDT = "#ff9aa6";

// ================================================================ timing helpers
/** gaussian bump centred on c, width s (1/e at c +- s) */
export const g1 = (t: number, c: number, s: number) => Math.exp(-(((t - c) / s) ** 2));
/** 0 -> 1 over [a, a+fi], held, 1 -> 0 over [b-fo, b] */
export const win = (t: number, a: number, b: number, fi = 0.4, fo = 0.4) => ramp(t, a, fi) * (1 - ramp(t, b - fo, fo));

// ================================================================ light primitives (draw into the additive art layer)
export const col = (rgb: string, a: number) => `rgba(${rgb},${clamp(a).toFixed(3)})`;
/** a point of light; r < 1.1 draws a crisp square pixel */
export const dot = (c: Ctx, x: number, y: number, r: number, rgb: string, a: number) => {
  if (a <= 0.004 || r <= 0 || x < -40 || x > W + 40 || y < -40 || y > H + 40) return;
  c.fillStyle = col(rgb, a);
  if (r < 1.1) { c.fillRect(x - r, y - r, r * 2, r * 2); return; }
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
};
/** path of a polyline cut at `prog` (0..1) of its length */
export const trace = (c: Ctx, pts: P[], prog = 1) => {
  if (prog <= 0 || pts.length < 2) return false;
  let total = 0; const seg: number[] = [];
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); total += l; }
  const target = clamp(prog) * total; let acc = 0;
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const l = seg[i - 1];
    if (acc + l >= target) { const k = l > 0 ? (target - acc) / l : 0; c.lineTo(lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)); break; }
    c.lineTo(pts[i][0], pts[i][1]); acc += l;
  }
  return true;
};
/** plain hairline */
export const hair = (c: Ctx, pts: P[], rgb: string, a: number, w = 1, prog = 1) => { if (a <= 0.004) return; c.strokeStyle = col(rgb, a); c.lineWidth = w; if (trace(c, pts, prog)) c.stroke(); };
/** glowing hairline: wide faint + mid halo + core */
export const hairG = (c: Ctx, pts: P[], rgb: string, a: number, w = 1, prog = 1) => { hair(c, pts, rgb, a * 0.12, w * 5, prog); hair(c, pts, rgb, a * 0.3, w * 2.3, prog); hair(c, pts, rgb, a, w, prog); };
/** straight line whose alpha runs a0 -> a1 (tails, rays, streaks) */
export const fade = (c: Ctx, a: P, b: P, rgb: string, a0: number, a1: number, w: number) => {
  if (Math.max(a0, a1) <= 0.004) return;
  const gr = c.createLinearGradient(a[0], a[1], b[0], b[1]); gr.addColorStop(0, col(rgb, a0)); gr.addColorStop(1, col(rgb, a1));
  c.strokeStyle = gr; c.lineWidth = w; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
};
/** points strung along a polyline every `gap` px: THE dotted-light look */
export const beads = (c: Ctx, pts: P[], gap: number, r: number, rgb: string, a: number, prog = 1) => {
  if (a <= 0.004 || prog <= 0) return;
  let carry = 0, total = 0; for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  const stop = total * clamp(prog); let run = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], l = Math.hypot(x1 - x0, y1 - y0);
    let s = carry;
    while (s <= l) { if (run + s > stop) return; const k = l > 0 ? s / l : 0; dot(c, lerp(x0, x1, k), lerp(y0, y1, k), r, rgb, a); s += gap; }
    carry = s - l; run += l;
  }
};
/** ellipse as a polyline (n segments) from angle a0 to a1, rotated by rot */
export const ellipse = (cx: number, cy: number, rx: number, ry: number, rot: number, n: number, a0 = 0, a1 = TAU): P[] => {
  const cr = Math.cos(rot), sr = Math.sin(rot);
  return Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n, x = Math.cos(a) * rx, y = Math.sin(a) * ry; return [cx + x * cr - y * sr, cy + x * sr + y * cr] as P; });
};
/** starburst: hot core, uneven rays (seeded), anamorphic horizontal streak */
export const flare = (c: Ctx, x: number, y: number, R: number, rgb: string, a: number, seed: number, rot = 0, rays = 14) => {
  if (a <= 0.004 || R <= 0) return;
  glow(c, x, y, R * 4, rgb, a * 0.35); glow(c, x, y, R * 1.6, rgb, a * 0.8); glow(c, x, y, R * 0.7, "255,250,240", a);
  const r = rng(seed); c.lineCap = "round";
  for (let k = 0; k < rays; k++) {
    const an = rot + (k / rays) * TAU + (r() - 0.5) * 0.25, len = R * (2.5 + r() * r() * 9), w = 0.8 + r() * 1.8;
    fade(c, [x, y], [x + Math.cos(an) * len, y + Math.sin(an) * len], k % 3 ? rgb : WHITE, a * (0.55 + r() * 0.4), 0, w);
  }
  c.save(); c.translate(x, y); c.scale(1, 0.035); glow(c, 0, 0, R * 9, rgb, a * 0.45); c.restore();
};
/** lock-on reticle: 3 rotating arc segments + 12 ticks (radius rr, rotation rot) */
export const reticle = (c: Ctx, x: number, y: number, rr: number, rot: number, rgb: string, a: number) => {
  if (a <= 0.004 || rr <= 0) return;
  for (let s = 0; s < 3; s++) hairG(c, ellipse(x, y, rr, rr, 0, 24, rot + (s * TAU) / 3, rot + (s * TAU) / 3 + 1.6), rgb, 0.8 * a, 1.2);
  for (let s = 0; s < 12; s++) { const an = -rot * 0.6 + (s / 12) * TAU; hair(c, [[x + Math.cos(an) * (rr + 6), y + Math.sin(an) * (rr + 6)], [x + Math.cos(an) * (rr + 12), y + Math.sin(an) * (rr + 12)]], rgb, 0.6 * a, 1); }
};
/** one dotted ring expanding from (x,y), q = 0..1 progress; flat = ry/rx */
export const ripple = (c: Ctx, x: number, y: number, q: number, r0: number, r1: number, rgb: string, a: number, flat = 1, n = 180, gap = 5) => {
  if (q <= 0 || q >= 1) return; const rr = r0 + (r1 - r0) * (1 - Math.pow(1 - q, 3));
  beads(c, ellipse(x, y, rr, rr * flat, 0, n), gap, 1.1, rgb, a * (1 - q));
};
/** a moving light with a comet trail: f(u) = position at local time u */
export const trail = (c: Ctx, f: (u: number) => P, u: number, rgb: string, A: number, n = 26, dt = 0.03) => {
  const pts: P[] = []; for (let i = n; i >= 0; i--) pts.push(f(Math.max(0, u - i * dt)));
  hairG(c, pts, rgb, 0.55 * A, 1.2); const h = pts[pts.length - 1]; glow(c, h[0], h[1], 20, rgb, 0.6 * A); dot(c, h[0], h[1], 2.6, "255,250,240", A); return h;
};
/** a node: soft glow + hot core */
export const node = (c: Ctx, x: number, y: number, r: number, rgb: string, core: string, a: number, halo = 20) => { glow(c, x, y, halo, rgb, 0.6 * a); dot(c, x, y, r, core, a); };
export { glow };

// ================================================================ camera: one z-travel (and sideways pan) for the whole film
export type Camera = { z: (t: number) => number; p: (t: number) => number; speed: (t: number) => number };
/** integrate speed(t) (depth units / s) and panRate(t) (world units / s) once at 120 Hz */
export const makeCamera = (speed: (t: number) => number, panRate: (t: number) => number, seconds: number): Camera => {
  const STEP = 1 / 120, NST = Math.ceil(seconds / STEP) + 2, z = new Float64Array(NST), p = new Float64Array(NST);
  for (let i = 1; i < NST; i++) { const t = i * STEP; z[i] = z[i - 1] + speed(t) * STEP; p[i] = p[i - 1] + panRate(t) * STEP; }
  const at = (arr: Float64Array, t: number) => { const f = clamp(t / STEP, 0, NST - 2), i = Math.floor(f); return lerp(arr[i], arr[i + 1], f - i); };
  return { z: (t) => at(z, t), p: (t) => at(p, t), speed };
};
export type Star = { x: number; y: number; z: number; m: number; h: number };
export const makeStars = (seed = 5, n = 1900): Star[] => { const r = rng(seed); return Array.from({ length: n }, () => ({ x: (r() - 0.5) * 4.4, y: (r() - 0.5) * 2.8, z: r(), m: r(), h: Math.floor(r() * 6) })); };
const starProj = (s: Star, cam: Camera, t: number) => {
  const d = (((s.z - cam.z(t)) % 1) + 1) % 1, depth = 0.03 + d * 1.2, xw = ((((s.x - cam.p(t)) % 4.4) + 6.6) % 4.4) - 2.2;
  return { x: CX + (xw * 620) / depth, y: CY + (s.y * 620) / depth, d, depth };
};
/** 3D starfield; streaks are real motion blur; turns neon when |speed| is high */
export const drawStars = (c: Ctx, stars: Star[], cam: Camera, t: number, A: number) => {
  if (A <= 0) return;
  const v = Math.abs(cam.speed(t)), neon = clamp(v / 0.5);
  c.lineCap = "round";
  for (const s of stars) {
    const p = starProj(s, cam, t); if (p.x < -60 || p.x > W + 60 || p.y < -60 || p.y > H + 60) continue;
    const a = A * (0.18 + 0.7 * s.m * s.m) * clamp(p.d / 0.06) * clamp((1 - p.d) / 0.25), r = clamp((0.45 + 1.3 * s.m) * (0.3 / p.depth), 0.4, 2.4);
    if (a <= 0.01) continue;
    const rgb = neon > 0.15 && s.h < 5 ? NEON[s.h] : s.h % 3 === 0 ? PALE : WHITE, q = starProj(s, cam, t - 0.07);
    const dx = p.x - q.x, dy = p.y - q.y, L = Math.hypot(dx, dy);
    if (L > 2 && L < 700) fade(c, [q.x, q.y], [p.x, p.y], rgb, 0, a * (0.6 + 0.4 * neon), r * 1.4);
    dot(c, p.x, p.y, r, rgb, a);
  }
};

// ================================================================ background tint: keyframes [t, r, g, b] of the inner wash colour
export type RGB3 = [number, number, number];
export const makeTint = (keys: [number, number, number, number][]) => (t: number): RGB3 => {
  let i = 0; while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
  const [t0, ...a] = keys[i], [t1, ...b] = keys[i + 1], k = ease(clamp((t - t0) / (t1 - t0)));
  return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
};

// ================================================================ globe: fibonacci point cloud with blob continents
export type V3 = [number, number, number];
export const v3 = (lat: number, lon: number): V3 => [Math.cos(lat) * Math.sin(lon), -Math.sin(lat), Math.cos(lat) * Math.cos(lon)];
export const norm = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
/** Earth's continents as [lat, lon, radius] blobs, in degrees */
export const EARTH_BLOBS: [number, number, number][] = [
  [60, -110, 18], [48, -100, 16], [40, -95, 14], [35, -112, 10], [31, -88, 8], [24, -102, 8], [18, -97, 6], [64, -152, 10], [70, -82, 11], [58, -72, 9], [48, -66, 6], [44, -78, 8], [12, -86, 4],
  [0, -60, 14], [-10, -55, 15], [-20, -50, 12], [-30, -62, 10], [-40, -68, 7], [-50, -71, 5], [5, -70, 9], [-8, -76, 7], [72, -40, 12],
  [50, 10, 10], [45, 4, 8], [55, 26, 12], [61, 15, 8], [40, -4, 6], [42, 13, 4], [65, 27, 8],
  [10, 20, 18], [6, 0, 10], [16, 0, 12], [0, 25, 15], [-10, 26, 14], [-20, 25, 12], [-29, 24, 8], [25, 15, 14], [27, 30, 8], [8, 40, 8], [-19, 47, 4],
  [60, 60, 18], [60, 90, 18], [62, 120, 16], [65, 150, 10], [50, 80, 15], [45, 100, 15], [35, 105, 14], [30, 80, 10], [22, 78, 9], [15, 77, 6], [25, 45, 10], [33, 53, 8], [40, 65, 9], [15, 102, 7], [36, 138, 5], [3, 112, 6], [0, 116, 5], [-4, 121, 5], [-5, 141, 6],
  [-25, 133, 14], [-20, 124, 8], [-30, 145, 8], [-42, 172, 4], [-80, 0, 15], [-80, 90, 15], [-80, 180, 15], [-80, -90, 15], [-72, -62, 6],
];
const EARTH_V = EARTH_BLOBS.map(([la, lo, r]) => ({ v: v3((la * Math.PI) / 180, (lo * Math.PI) / 180), c: Math.cos((r * Math.PI) / 180) }));
export const isLand = (v: V3) => EARTH_V.some((b) => b.v[0] * v[0] + b.v[1] * v[1] + b.v[2] * v[2] > b.c);
export type SpherePt = { v: V3; land: boolean; city: boolean };
/** evenly spread sphere points; land from EARTH_BLOBS; ~35% of land carries night lights */
export const makeSphere = (n = 2600, seed = 9): SpherePt[] => { const r = rng(seed), out: SpherePt[] = []; for (let i = 0; i < n; i++) { const y = 1 - (2 * (i + 0.5)) / n, rad = Math.sqrt(1 - y * y), th = i * 2.399963; const v: V3 = [Math.cos(th) * rad, y, Math.sin(th) * rad], land = isLand(v); out.push({ v, land, city: land && r() < 0.35 }); } return out; };
/** random point on the sphere; with probability landBias it must be land */
export const randLand = (r: () => number, landBias: number): V3 => { for (;;) { const z = 2 * r() - 1, a = r() * TAU, s = Math.sqrt(1 - z * z), v: V3 = [s * Math.cos(a), z, s * Math.sin(a)]; if (r() > landBias || isLand(v)) return v; } };
export const TILT = 0.41, LIGHT = norm([-0.75, -0.3, 0.6]);
export type Proj = { x: number; y: number; z: number };
export type GlobeView = { cx: number; cy: number; R: number; lon: number };
/** sphere point -> screen (orthographic), spun by lon about the axis, axis tilted 23.4 deg */
export const project = (v: V3, cx: number, cy: number, R: number, lon: number): Proj => {
  const cl = Math.cos(lon), sl = Math.sin(lon), x1 = v[0] * cl + v[2] * sl, z1 = -v[0] * sl + v[2] * cl, ct = Math.cos(TILT), st = Math.sin(TILT);
  const y2 = v[1] * ct - z1 * st, z2 = v[1] * st + z1 * ct;
  return { x: cx + x1 * R, y: cy + y2 * R, z: z2 };
};
const shadeOf = (p: Proj, cx: number, cy: number, R: number) => { const nx = (p.x - cx) / R, ny = (p.y - cy) / R; return nx * LIGHT[0] + ny * LIGHT[1] + p.z * LIGHT[2]; };
/** the point-cloud Earth: day/night shading, city lights, rim, optional dotted holo rings (0..1 drawn) */
export const drawGlobe = (c: Ctx, sphere: SpherePt[], cx: number, cy: number, R: number, lon: number, A: number, rings: number) => {
  if (A <= 0.004) return;
  if (R < 7) { glow(c, cx, cy, 10 + R * 3, PALE, 0.5 * A); dot(c, cx, cy, Math.max(1.6, R), "215,235,255", A); return; }
  glow(c, cx, cy, R * 1.35, "80,140,255", 0.16 * A);
  const pr = clamp(R / 300, 0.35, 1.6) * 1.5;
  for (const f of sphere) {
    const p = project(f.v, cx, cy, R, lon);
    if (p.z < 0) { if (f.land) dot(c, p.x, p.y, pr * 0.6, BLUE, 0.07 * A); continue; }
    const sh = shadeOf(p, cx, cy, R), day = clamp(0.2 + 0.8 * sh * 1.3);
    if (f.land) dot(c, p.x, p.y, pr, sh > -0.05 ? "130,235,205" : BLUE, A * (0.25 + 0.7 * day));
    else dot(c, p.x, p.y, pr * 0.8, "80,140,255", A * (0.08 + 0.3 * day));
    if (f.city && sh < 0.05) dot(c, p.x, p.y, pr * 0.9, WARM, A * 0.8 * clamp(-sh * 4 + 0.3));
  }
  c.lineWidth = 2; c.strokeStyle = col(PALE, 0.45 * A); c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.stroke();
  c.lineWidth = 7; c.strokeStyle = col("100,170,255", 0.12 * A); c.beginPath(); c.arc(cx, cy, R * 1.02, 0, TAU); c.stroke();
  if (rings > 0) for (const [k, rot, ph] of [[1.34, 0.32, 0], [1.55, -0.22, 2]] as const) beads(c, ellipse(cx, cy, R * k, R * k * 0.26, rot, 90, ph + 0.05 * lon, ph + 0.05 * lon + TAU * rings), 4.2, 0.9, GOLD, 0.55 * A);
};
const arcV = (a: V3, b: V3, lift: number, n = 18): V3[] => {
  const d = clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1), om = Math.acos(d), so = Math.sin(om) || 1;
  return Array.from({ length: n + 1 }, (_, i) => { const s = i / n, ka = Math.sin((1 - s) * om) / so, kb = Math.sin(s * om) / so, h = 1 + lift * Math.sin(Math.PI * s); return [(a[0] * ka + b[0] * kb) * h, (a[1] * ka + b[1] * kb) * h, (a[2] * ka + b[2] * kb) * h] as V3; });
};
/** great-circle arc lifted off the surface; hidden where it passes behind the globe */
export const globeArc = (c: Ctx, a: V3, b: V3, lift: number, g: GlobeView, rgb: string, A: number, prog: number, w = 1) => {
  if (A <= 0.004 || prog <= 0) return;
  const pts = arcV(a, b, lift).map((v) => project(v, g.cx, g.cy, g.R, g.lon)), n = Math.max(1, Math.round(prog * (pts.length - 1)));
  let run: P[] = [];
  const flush = () => { if (run.length > 1) hairG(c, run, rgb, A, w); run = []; };
  for (let i = 0; i <= n; i++) { const p = pts[i], r2 = (p.x - g.cx) ** 2 + (p.y - g.cy) ** 2; if (p.z > -0.02 || r2 > g.R * g.R * 1.03) run.push([p.x, p.y]); else flush(); }
  flush();
};

// ================================================================ frame lifecycle
export type Frame = { c: Ctx; AL: { canvas: unknown; ctx: Ctx }; tint: RGB3; tags: Tag[]; tag: (x: number, y: number, dx: number, dy: number, s: string, a: number, p: number, rgb?: string, tc?: string) => void };
type Tag = { fx: number; left: boolean; y: number; s: string; a: number; p: number; col?: string };
/** paints the background wash and returns the cleared additive art layer + the tag helper */
export const beginFrame = (ctx: Ctx, env: Env, frame: number, tint: RGB3): Frame => {
  const sc = env.scale, [tr, tg, tb] = tint;
  ctx.setTransform(sc, 0, 0, sc, 0, 0); ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  const bg = ctx.createRadialGradient(CX, CY, 40, CX, CY, W * 0.62); bg.addColorStop(0, `rgb(${tr * 1.7 | 0},${tg * 1.7 | 0},${tb * 1.7 | 0})`); bg.addColorStop(1, `rgb(${tr * 0.35 | 0},${tg * 0.35 | 0},${tb * 0.35 | 0})`);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const AL = layer(env, "art"), c = AL.ctx; c.globalCompositeOperation = "lighter"; c.lineCap = "round"; c.lineJoin = "round";
  const tags: Tag[] = [];
  /** HUD tag: leader line from a point (drawn into art) + small label (lettering pass) */
  const tag = (x: number, y: number, dx: number, dy: number, s: string, a: number, p: number, rgb = PALE, tc = PALET) => {
    if (a <= 0.01) return; const e: P = [x + dx, y + dy], f: P = [e[0] + (dx >= 0 ? 26 : -26), e[1]];
    hair(c, [[x + Math.sign(dx) * 6, y + Math.sign(dy) * 6], e, f], rgb, 0.6 * a, 1, clamp(p * 2));
    tags.push({ fx: f[0], left: dx < 0, y: f[1] - 7, s, a, p: clamp(p * 1.4 - 0.3), col: tc });
  };
  return { c, AL, tint, tags, tag };
};

export type Say = (s: string, x: number, y: number, o: Parameters<typeof text>[4]) => void;
/** h.tags() queues the frame's tag labels at that point of the lettering order (else they go last) */
export type Hud = { say: Say; t: number; fit: (s: string, cap: number, max: number) => number; tags: () => void };
/** HUD copy tables: label rows [start, end, text]; line rows [start, end, text, row 0|1, write seconds] */
export type Label = [number, number, string];
export type Line = [number, number, string, number, number];
/** the standard top-left HUD: small DIM label + one or two main lines; returns their visibility */
export const hudTables = (h: Hud, labels: Label[], lines: Line[]) => {
  const { t, say, fit } = h; let hudA = 0;
  for (const [a, b, s] of labels) if (t > a - 0.05 && t < b + 0.3) { const o = 1 - ramp(t, b, 0.3); hudA = Math.max(hudA, o); say(s, 120, 204, { cap: 15, color: DIMT, progress: ramp(t, a, 0.7), opacity: o, w: 1.6 }); }
  for (const [a, b, s, row, dur] of lines) if (t > a - 0.05 && t < b + 0.3) { const o = 1 - ramp(t, b, 0.3); hudA = Math.max(hudA, o); say(s, 120, row ? 298 : 238, { cap: fit(s, 40, 740), color: TXT, progress: ramp(t, a, dur), opacity: o, w: 2.6 }); }
  return hudA;
};
export const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** every lettering call is recorded here when tools/check.mjs asks for it (no effect on pixels) */
const audit = (s: string, x: number, y: number, o: Parameters<typeof text>[4]) => {
  const A = (globalThis as { __AUDIT__?: unknown[] }).__AUDIT__; if (!Array.isArray(A) || (o.opacity ?? 1) <= 0.01 || (o.progress ?? 1) <= 0) return;
  const w = textWidth(s, o.cap), x0 = o.align === "center" ? x - w / 2 : o.align === "right" ? x - w : x; A.push({ s, x0, y0: y, x1: x0 + w, y1: y + o.cap });
};

/** pixel: P > 1 renders the frame as pixel art (P screen px per art pixel, see pixelKit.ts) */
export type EndOpts = { hud?: (h: Hud) => number; black?: number; bokehSeed?: number; pixel?: number; palette?: string[] };
/** post chain + lettering + fades + letterbox. hud() queues lettering via h.say and returns
 *  the visibility (0..1) of the top-left HUD, which darkens a soft band behind it */
export const endFrame = (ctx: Ctx, env: Env, frame: number, t: number, f: Frame, o: EndOpts = {}) => {
  const sc = env.scale, [tr, tg, tb] = f.tint, AL = f.AL;
  // bloom: four 2x box-halvings, three blended back up, masked by a halftone dot screen
  const DW = Math.round(W * sc), DH = Math.round(H * sc);
  const halves = [1, 2, 3, 4].map((k) => cached(env, `half${k}`, () => env.canvas(Math.max(1, DW >> k), Math.max(1, DH >> k))));
  let src: CanvasImageSource = AL.canvas as CanvasImageSource;
  for (const L of halves) { const lc = L.ctx; lc.setTransform(1, 0, 0, 1, 0, 0); lc.globalCompositeOperation = "copy"; lc.imageSmoothingEnabled = true; lc.drawImage(src, 0, 0, L.canvas.width, L.canvas.height); src = L.canvas as CanvasImageSource; }
  const GL = layer(env, "glowhalf"), gc = GL.ctx; gc.setTransform(1, 0, 0, 1, 0, 0); gc.globalCompositeOperation = "lighter"; gc.imageSmoothingEnabled = true;
  [[1, 0.5], [2, 0.6], [3, 0.7]].forEach(([k, a]) => { gc.globalAlpha = a; gc.drawImage(halves[k].canvas as CanvasImageSource, 0, 0, DW, DH); });
  if (!o.pixel) { gc.globalAlpha = 1; gc.globalCompositeOperation = "destination-in"; gc.fillStyle = gc.createPattern(cached(env, "halftone", () => { const L = env.canvas(Math.round(5 * sc), Math.round(5 * sc)), h = L.ctx; h.fillStyle = "rgba(255,255,255,0.55)"; h.fillRect(0, 0, 5 * sc, 5 * sc); h.fillStyle = "#fff"; h.beginPath(); h.arc(2.5 * sc, 2.5 * sc, 1.25 * sc, 0, TAU); h.fill(); return L; }).canvas as CanvasImageSource, "repeat")!; gc.fillRect(0, 0, DW, DH); }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = "lighter"; ctx.drawImage(AL.canvas as CanvasImageSource, 0, 0); ctx.drawImage(GL.canvas as CanvasImageSource, 0, 0); ctx.restore();

  // foreground bokeh: out-of-focus discs drifting between us and the scene, tinted by the wash
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  { const r = rng(o.bokehSeed ?? 801); for (let i = 0; i < 16; i++) { const bx = r() * W + 70 * Math.sin(t * (0.03 + r() * 0.04) + r() * 6), by = BAR + r() * (H - 2 * BAR) + 40 * Math.sin(t * (0.025 + r() * 0.03) + r() * 6), rr = 26 + r() * 80, a = (0.025 + r() * 0.04) * ramp(t, 1, 2); const tc = `${Math.min(255, tr * 9 + 60) | 0},${Math.min(255, tg * 9 + 60) | 0},${Math.min(255, tb * 7 + 70) | 0}`; const gg = ctx.createRadialGradient(bx, by, 0, bx, by, rr); gg.addColorStop(0, col(tc, a * 0.7)); gg.addColorStop(0.82, col(tc, a)); gg.addColorStop(0.92, col(tc, a * 1.4)); gg.addColorStop(1, col(tc, 0)); ctx.fillStyle = gg; ctx.fillRect(bx - rr, by - rr, rr * 2, rr * 2); } }
  ctx.restore();
  // vignette + moving grain
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(cached(env, "vignette", () => { const L = env.canvas(DW, DH), v = L.ctx; v.setTransform(sc, 0, 0, sc, 0, 0); const gr = v.createRadialGradient(CX, CY, H * 0.35, CX, CY, W * 0.62); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,0.72)"); v.fillStyle = gr; v.fillRect(0, 0, W, H); return L; }).canvas as CanvasImageSource, 0, 0);
  if (!o.pixel) { const gr = rng(frame * 13 + 1), pat = ctx.createPattern(grain(env).canvas as CanvasImageSource, "repeat")!; ctx.translate(Math.floor(gr() * 256), Math.floor(gr() * 256)); ctx.globalAlpha = 0.55; ctx.fillStyle = pat; ctx.fillRect(-256, -256, DW + 512, DH + 512); }
  ctx.restore();

  if (o.pixel) {
    // pixel art: HUD band first (so it is dithered with the art), then pixelate, then pixel-font lettering on top
    const jobs: (() => void)[] = [];
    const say: Say = (s, x, y, op) => { const w = pixelWidth(s, op.cap), x0 = op.align === "center" ? x - w / 2 : op.align === "right" ? x - w : x; const A = (globalThis as { __AUDIT__?: unknown[] }).__AUDIT__; if (Array.isArray(A) && (op.opacity ?? 1) > 0.01 && (op.progress ?? 1) > 0) A.push({ s, x0, y0: y, x1: x0 + w, y1: y + 7 * Math.max(3, Math.round(op.cap / 9.5)) }); jobs.push(() => pixelText(ctx, env, s, x, y, { cap: op.cap, color: op.color, progress: op.progress, opacity: op.opacity, align: op.align })); };
    const fit = (s: string, cap: number, max: number) => { let c = cap; while (c > 12 && pixelWidth(s, c) > max) c -= 1; return c; };
    let tagged = false;
    const tags = () => { if (tagged) return; tagged = true; for (const tg2 of f.tags) say(tg2.s, tg2.left ? tg2.fx - 8 - pixelWidth(tg2.s, 15) : tg2.fx + 8, tg2.y, { cap: 15, color: tg2.col, progress: tg2.p, opacity: tg2.a }); };
    const hudA = o.hud ? o.hud({ say, t, fit, tags }) : 0;
    tags();
    if (hudA > 0) { ctx.save(); ctx.setTransform(sc, 0, 0, sc, 0, 0); const gr = ctx.createLinearGradient(0, 0, 980, 0); gr.addColorStop(0, `rgba(4,5,12,${0.55 * hudA})`); gr.addColorStop(1, "rgba(4,5,12,0)"); ctx.fillStyle = gr; ctx.fillRect(0, BAR, 980, 260); ctx.restore(); }
    pixelate(ctx, env, o.pixel, o.palette);
    jobs.forEach((fn) => fn());
  } else {
    // lettering: own layer, then a soft glow of itself
    const TL = layer(env, "txt"), g = new Gfx(TL.ctx, env, frame, FLAT), words: (() => void)[] = [];
    const say: Say = (s, x, y, op) => { audit(s, x, y, op); words.push(() => text(g, s, x, y, op)); };
    const fit = (s: string, cap: number, max: number) => Math.min(cap, (cap * max) / Math.max(1, textWidth(s, cap)));
    let tagged = false;
    const tags = () => { if (tagged) return; tagged = true; for (const tg2 of f.tags) say(tg2.s, tg2.left ? tg2.fx - 8 - textWidth(tg2.s, 15) : tg2.fx + 8, tg2.y, { cap: 15, color: tg2.col, progress: tg2.p, opacity: tg2.a, w: 1.6 }); };
    const hudA = o.hud ? o.hud({ say, t, fit, tags }) : 0;
    tags();
    if (hudA > 0) { const gr = ctx.createLinearGradient(0, 0, 980, 0); gr.addColorStop(0, `rgba(4,5,12,${0.55 * hudA})`); gr.addColorStop(1, "rgba(4,5,12,0)"); ctx.fillStyle = gr; ctx.fillRect(0, BAR, 980, 260); }
    g.group("plain", () => words.forEach((fn) => fn()));
    const T2 = cached(env, "txt2", () => env.canvas(Math.max(1, DW >> 2), Math.max(1, DH >> 2)));
    { const lc = T2.ctx; lc.setTransform(1, 0, 0, 1, 0, 0); lc.globalCompositeOperation = "copy"; lc.imageSmoothingEnabled = true; lc.drawImage(TL.canvas as CanvasImageSource, 0, 0, T2.canvas.width, T2.canvas.height); }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(TL.canvas as CanvasImageSource, 0, 0); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.5; ctx.drawImage(T2.canvas as CanvasImageSource, 0, 0, DW, DH); ctx.restore();
  }

  // fades (never a hard black cut) and the 2.39:1 letterbox
  ctx.save(); ctx.setTransform(sc, 0, 0, sc, 0, 0); ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  const black = o.black ?? 0;
  if (black > 0) { ctx.fillStyle = `rgba(0,0,0,${black.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, BAR); ctx.fillRect(0, H - BAR, W, BAR);
  ctx.restore();
};
/** standard film fades: up from black over the first `fin` s, down to black over the last `fout` s */
export const fades = (t: number, dur: number, fin = 2.2, fout = 1.75, tail = 0.05) => Math.max(1 - ease(ramp(t, 0, fin)), ease(ramp(t, dur - tail - fout, fout)));
