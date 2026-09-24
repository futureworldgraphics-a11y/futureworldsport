import { Gfx, rng, type Ctx, type Env, type Layer, type P } from "./core";
import { Film } from "./film";
import { clamp, lerp } from "./gallery";
import { letter, width as letterWidth } from "./drafting";
import { W, H, FPS, FLAT, ease, easeOut, back, ramp } from "./spaceStyle";

// ANDROMEDA · COLLAGE. The Andromeda narration (same 55.72 s audio and word-timed cues as
// andromedaOpus), re-directed as a whimsical torn-paper collage: flat coloured paper with white
// torn rims, masking tape, hand-lettered captions on paper strips, a little paper kid.
// One continuous shot, no cuts: every change of place is a paper move (a tilt, a morph, a sheet
// torn away, a sheet slid in, a spyglass ring, a door in the sky).
//
//  time   narration                                   visual
//  0.0    We thought we knew where we were.           night hill; paper kid; a YOU ARE HERE sign pops in
//  2.4    For thousands of years, humans looked up    camera tilts up; torn tissue strips lay a river of stars
//         at a river of stars ... night sky           across the sky; stone circle, pyramid, tower pop up on
//                                                     the horizon one after another (thousands of years)
//  7.1    and called it everything.                   AND CALLED IT; EVERYTHING in ransom-note letters; kid cheers
//  9.6    The Milky Way,                              ground drops away; the river strips wind into spiral arms
// 10.9    our galaxy,                                 the core pops on; a red star sticker: YOU ARE HERE
// 12.2    the universe itself,                        paper scissors cut a dashed line round it: that was all
// 13.9    a single island of light                    warm paper rays fan out from the galaxy
// 15.6    surrounded by eternal darkness.             black paper sheets slide in from every side
// 18.2    We were not just wrong.                     NOT JUST WRONG; the black sheets are ripped away,
//                                                     a sky full of galaxy stickers behind them
// 19.8    off by a factor of two trillion.            zoom out: our galaxy shrinks to one sticker among
//                                                     thousands; a swinging price tag counts to 2 trillion
// 23.0    In 1929, Edwin Hubble aimed a telescope     a dusk sheet slides up; calendar pages flip to 1929;
//         at a faint smudge in ... Andromeda          Hubble walks in, the dome opens, the tube swings to a
//                                                     chalk smudge; the constellation is threaded star to star
// 29.0    and discovered something ... impossible.    a spyglass ring grows out of the smudge; Hubble peeks, ?
// 32.4    not a cloud of gas.                         a paper gas cloud pops in, gets crossed out, flies off
// 34.8    not a nearby star system.                   a little sun with two planets, crossed out, flies off
// 37.3    an entire galaxy                            Andromeda blooms in torn paper; the ring opens wide
// 38.9    more than two million light-years away      it slides away; our galaxy slides in; a tape measure
//                                                     unrolls between them; a speck of light makes the trip
// 41.7    hundreds of billions of stars               push in; star confetti rains down and sticks
// 44.2    mistaken for a whisper of nothing.          it shrinks back to a faint smudge, then glints
// 47.2    And it was just the beginning.              tilt down: kid and Hubble on the hill; the smudge
//                                                     becomes the golden knob of a door cut in the sky
// 49.0    once Hubble opened that door,               Hubble reaches up, the door swings open onto light
// 51.1    did not stop revealing itself.              little flaps all over the sky open, one after another
// 53.8    It kept going and going.                    we push through the door; inside, more flaps open

const DURATION = 1671; // 55.70 s (audio 55.719 s)
const CUE = {
  years: 2.44, called: 7.13, everything: 8.05, milky: 9.62, our: 10.90, uni: 12.22, island: 13.94, dark: 15.6,
  wrong: 18.24, offby: 19.77, trillion: 21.05, y1929: 23.02, hubble: 24.56, smudge: 26.3, andro: 27.8,
  discover: 28.99, impossible: 30.3, gas: 32.41, star: 34.80, galaxy: 37.28, distance: 38.93,
  billions: 41.66, whisper: 44.18, flare: 46.11, beginning: 47.19, door: 48.99, reveal: 51.10, kept: 53.80, going: 54.5,
};
const TAU = Math.PI * 2;

// ================================================================ palette (cut paper)
const INK = "#2b2420", PAPER = "#f3ead7", RIM = "#fbf7ec", NAVY = "#1d2856", ORANGE = "#e4572e", YELLOW = "#f0b233";
const TEAL = "#6cbfa4", BLUE = "#3f6fb5", PINK = "#f2a7b8", RED = "#d33f2c", GRASS_N = "#2c5a40", GRASS_N2 = "#376b48";
const HEAD = "#f5eee0", PEACH = "#f1d8b4", CHEEK = "#f19aa6", TAPE = "#eadfb4", BLACKP = "#14151f";

// ================================================================ torn paper kit
type Shape = { k: string; p: () => P[] };
const ellP = (rx: number, ry: number, n = 96): P[] => Array.from({ length: n }, (_, i) => [Math.cos((i / n) * TAU) * rx, Math.sin((i / n) * TAU) * ry]);
const rrP = (w: number, h: number, r: number): P[] => {
  const out: P[] = [], cs: [number, number, number][] = [[w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, 0.25], [-w / 2 + r, -h / 2 + r, 0.5], [w / 2 - r, -h / 2 + r, 0.75]];
  cs.forEach(([cx, cy, a0]) => { for (let i = 0; i <= 6; i++) { const a = (a0 + (i / 6) * 0.25) * TAU; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } });
  return out;
};
const blobP = (r: number, seed: number, k = 0.1, ry = r): P[] => {
  const q = rng(seed), ph = [q() * TAU, q() * TAU, q() * TAU];
  return Array.from({ length: 96 }, (_, i) => { const a = (i / 96) * TAU, m = 1 + k * (0.6 * Math.sin(2 * a + ph[0]) + 0.35 * Math.sin(3 * a + ph[1]) + 0.2 * Math.sin(5 * a + ph[2])); return [Math.cos(a) * r * m, Math.sin(a) * ry * m]; });
};
const cloudP = (w: number, h: number, seed: number): P[] => {
  const q = rng(seed), ph = q() * TAU;
  return Array.from({ length: 120 }, (_, i) => { const a = (i / 120) * TAU, s = Math.sin(a); const y = s < 0 ? (h / 2) * s * (0.75 + 0.4 * Math.abs(Math.sin(a * 3 + ph))) : (h / 2) * 0.42 * s; return [Math.cos(a) * (w / 2) * (1 + 0.06 * Math.sin(a * 5 + ph)), y]; });
};
const starP = (r: number, pts = 4, inner = 0.38): P[] => Array.from({ length: pts * 2 }, (_, i) => { const a = (i / (pts * 2)) * TAU - Math.PI / 2, rr = i % 2 ? r * inner : r; return [Math.cos(a) * rr, Math.sin(a) * rr]; });
const SH = {
  ell: (rx: number, ry = rx): Shape => ({ k: `e${rx}|${ry}`, p: () => ellP(rx, ry) }),
  rr: (w: number, h: number, r: number): Shape => ({ k: `r${w}|${h}|${r}`, p: () => rrP(w, h, r) }),
  blob: (r: number, seed: number, k = 0.1, ry = r): Shape => ({ k: `b${r}|${seed}|${k}|${ry}`, p: () => blobP(r, seed, k, ry) }),
  cloud: (w: number, h: number, seed: number): Shape => ({ k: `c${w}|${h}|${seed}`, p: () => cloudP(w, h, seed) }),
  star: (r: number, n = 4, inner = 0.38): Shape => ({ k: `s${r}|${n}|${inner}`, p: () => starP(r, n, inner) }),
  poly: (k: string, pts: P[]): Shape => ({ k, p: () => pts }),
};
const resampleClosed = (pts: P[], step: number): P[] => {
  const out: P[] = []; let carry = 0;
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); let d = carry; while (d < L) { const f = d / L; out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]); d += step; } carry = d - L; }
  return out.length > 2 ? out : pts;
};
const signedArea = (s: P[]) => s.reduce((a, p, i) => { const q = s[(i + 1) % s.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
// a torn edge: resample the outline and push every point in or out along its normal
const tear = (pts: P[], seed: number, amp: number, step: number, grow: number): P[] => {
  const s = resampleClosed(pts, step), r = rng(seed), n = s.length, sg = signedArea(s) >= 0 ? 1 : -1;
  return s.map((p, i) => {
    const a = s[(i - 1 + n) % n], b = s[(i + 1) % n]; let nx = b[1] - a[1], ny = -(b[0] - a[0]); const L = Math.hypot(nx, ny) || 1; nx = (nx / L) * sg; ny = (ny / L) * sg;
    const d = grow + (r() - 0.5) * 2 * amp + (r() < 0.06 ? r() * amp * 2.2 : 0); return [p[0] + nx * d, p[1] + ny * d];
  });
};
const trace = (c: Ctx, pts: P[]) => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };
type CutO = { seed?: number; amp?: number; rim?: number; shadow?: number; alpha?: number; step?: number; rimColor?: string };
const GEO = new Map<string, { main: P[]; rim: P[] | null }>();
// one piece of cut paper: soft two-step drop shadow, the white torn rim, the coloured face
const cut = (c: Ctx, sh: Shape, color: string, o: CutO = {}) => {
  const { seed = 1, amp = 1.4, rim = 3, shadow = 1, alpha = 1, step = 5, rimColor = RIM } = o; if (alpha <= 0.003) return;
  const key = `${sh.k}#${seed}|${amp}|${rim}|${step}`; let g = GEO.get(key);
  if (!g) { const b = sh.p(); g = { main: tear(b, seed, amp, step, 0), rim: rim > 0 ? tear(b, seed + 71, amp * 1.5, step, rim) : null }; GEO.set(key, g); }
  const outer = g.rim ?? g.main;
  c.save();
  if (shadow > 0) { c.fillStyle = "#120c1e"; c.globalAlpha = alpha * 0.13 * shadow; c.translate(2, 3); trace(c, outer); c.fill(); c.translate(3, 4); c.globalAlpha = alpha * 0.09 * shadow; trace(c, outer); c.fill(); c.translate(-5, -7); }
  c.globalAlpha = alpha; if (g.rim) { c.fillStyle = rimColor; trace(c, g.rim); c.fill(); }
  c.fillStyle = color; trace(c, g.main); c.fill(); c.restore();
};
// a torn polygon built fresh each frame (for moving geometry): jitter tied to the point index
const jagFill = (c: Ctx, pts: P[], color: string, alpha: number, seed: number, amp = 1.6, rim = 0) => {
  if (alpha <= 0.003 || pts.length < 3) return; const r = rng(seed), n = pts.length, sg = signedArea(pts) >= 0 ? 1 : -1;
  const off = (d0: number) => { const r2 = rng(seed + d0 * 13); return pts.map((p, i) => { const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n]; let nx = b[1] - a[1], ny = -(b[0] - a[0]); const L = Math.hypot(nx, ny) || 1; nx = (nx / L) * sg; ny = (ny / L) * sg; const d = d0 + (r2() - 0.5) * 2 * amp; return [p[0] + nx * d, p[1] + ny * d] as P; }); };
  void r; c.save(); c.globalAlpha = alpha;
  if (rim > 0) { c.fillStyle = RIM; trace(c, off(rim)); c.fill(); }
  c.fillStyle = color; trace(c, off(0)); c.fill(); c.restore();
};
const stroke = (c: Ctx, pts: P[], color: string, w: number, o: { alpha?: number; progress?: number; dash?: number[]; dashOff?: number } = {}) => {
  const { alpha = 1, progress = 1, dash, dashOff = 0 } = o; if (alpha <= 0 || progress <= 0 || pts.length < 2) return;
  const seg = pts.map((p, i) => (i ? Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0)), tot = seg.reduce((a, b) => a + b, 0) * clamp(progress);
  c.save(); c.globalAlpha = alpha; c.strokeStyle = color; c.lineWidth = w; c.lineCap = "round"; c.lineJoin = "round"; if (dash) { c.setLineDash(dash); c.lineDashOffset = dashOff; }
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); let acc = 0;
  for (let i = 1; i < pts.length; i++) { if (acc + seg[i] >= tot) { const f = (tot - acc) / (seg[i] || 1); c.lineTo(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f); break; } acc += seg[i]; c.lineTo(pts[i][0], pts[i][1]); }
  c.stroke(); c.restore();
};
const dot = (c: Ctx, x: number, y: number, r: number, color: string, alpha = 1) => { if (r <= 0 || alpha <= 0) return; c.globalAlpha = alpha; c.fillStyle = color; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.globalAlpha = 1; };
// a strip of masking tape, slightly see-through, with nibbled ends
const tape = (c: Ctx, x: number, y: number, w: number, h: number, rot: number, alpha = 1) => {
  c.save(); c.translate(x, y); c.rotate(rot); c.globalAlpha = 0.8 * alpha; c.fillStyle = TAPE; c.beginPath(); c.moveTo(-w / 2, -h / 2);
  for (let i = 1; i <= 4; i++) c.lineTo(-w / 2 + (i % 2 ? 3 : -2), -h / 2 + (h * i) / 4); c.lineTo(w / 2, h / 2); for (let i = 3; i >= 0; i--) c.lineTo(w / 2 + (i % 2 ? -3 : 2), -h / 2 + (h * i) / 4); c.closePath(); c.fill(); c.restore();
};
const blink = (t: number, seed: number) => { const r = rng(seed); let s = 0.6 + r() * 1.5; while (s < 60) { if (t >= s && t < s + 0.13) return true; s += 2.1 + r() * 2.6; } return false; };

// ================================================================ lettering on paper strips
let G: Gfx; // set per frame; the drafting hand draws through it
const hash = (s: string) => [...s].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
const QM: P[][] = [[[0.4, 1.3], [1.1, 0.2], [2.6, 0.1], [3.5, 1.0], [3.5, 2.2], [2.6, 3.0], [1.9, 3.6], [1.9, 4.4]], [[1.9, 5.5], [1.95, 5.9]]];
const qmark = (x: number, y: number, cap: number, color: string, progress = 1, opacity = 0.95, w = cap * 0.14) => { const k = cap / 6; QM.forEach((st, j) => { const p = clamp(progress * 2 - j); if (p > 0) G.pen(st.map(([px, py]) => [x + (px + (6 - py) * 0.2) * k, y + py * k] as P), { w, color, seed: 3 + j, wobble: 0.2, boil: 0, taper: 0.35, opacity, progress: p }); }); };
// a line of the drafting hand that may end in a question mark
const say = (s: string, x: number, y: number, cap: number, o: { color: string; progress: number; opacity: number; w: number; seed: number }) => {
  const q = s.endsWith("?"), base = q ? s.slice(0, -1) : s, bw = letterWidth(base, cap), tw = bw + (q ? (1.25 + 3.8) * (cap / 6) : 0), x0 = x - tw / 2, n = base.length + (q ? 2 : 0), pb = q ? clamp((o.progress * n) / base.length) : o.progress;
  letter(G, base, x0, y, { cap, color: o.color, align: "left", progress: pb, w: o.w, seed: o.seed, opacity: o.opacity });
  if (q) qmark(x0 + bw + 1.25 * (cap / 6), y, cap, o.color, clamp((o.progress * n - base.length) / 2), o.opacity, o.w);
};
type CapO = { cap?: number; rot?: number; paper?: string; ink?: string; exitY?: number };
// a caption: the strip slaps on (overshoot), the words write on stroke by stroke, then it lifts away
const caption = (c: Ctx, s: string, x: number, y: number, t: number, t0: number, t1: number, o: CapO = {}) => {
  if (t < t0 || t > t1 + 0.4) return;
  const h0 = hash(s), { cap = 40, rot = ((h0 % 7) - 3) * 0.006, paper = PAPER, ink = INK, exitY = -30 } = o;
  const a = back(clamp((t - t0) / 0.32)), lv = ease(clamp((t - t1) / 0.35)), tw = letterWidth(s.replace("?", ""), cap) + (s.endsWith("?") ? 5 * (cap / 6) : 0), w = tw + cap * 1.5, h = cap * 2.05;
  c.save(); c.translate(x, y + lv * exitY); c.rotate(rot + (1 - clamp(a)) * 0.12 + lv * 0.05); const k = Math.max(0.01, 0.6 + 0.4 * a); c.scale(k, k);
  const al = clamp(a * 3) * (1 - lv);
  cut(c, SH.rr(Math.round(w), Math.round(h), 6), paper, { seed: h0 % 97, amp: 1.8, rim: 0, alpha: al, step: 4 });
  tape(c, -w / 2 + 16, -h / 2 + 4, 58, 20, -0.6, al); tape(c, w / 2 - 16, -h / 2 + 4, 58, 20, 0.6, al);
  const dur = clamp(0.35 + s.length * 0.03, 0.4, 1.1);
  say(s, 0, -cap / 2, cap, { color: ink, progress: ramp(t, t0 + 0.12, dur), w: cap * 0.14, seed: h0 % 50, opacity: 0.95 * al });
  c.restore();
};
// ransom-note lettering: every letter on its own scrap, popping on one after another
const RANSOM = [ORANGE, YELLOW, TEAL, BLUE, PINK, "#8e6bc9", PAPER, "#e98a3b"];
const ransom = (c: Ctx, s: string, x: number, y: number, cap: number, t: number, t0: number, t1: number) => {
  if (t < t0 || t > t1 + 0.5) return; const r = rng(hash(s)), chars = [...s], adv = cap * 0.95, x0 = x - ((chars.length - 1) * adv) / 2;
  chars.forEach((ch, i) => {
    const ti = t0 + i * 0.07, p = back(clamp((t - ti) / 0.28)), rot = (r() - 0.5) * 0.36, dy = (r() - 0.5) * cap * 0.25, col = RANSOM[Math.floor(r() * RANSOM.length)], sw = cap * (1.0 + r() * 0.2), sh = cap * (1.3 + r() * 0.25);
    const lv = ease(clamp((t - t1 - i * 0.03) / 0.3)); if (p <= 0 || lv >= 1) return;
    c.save(); c.translate(x0 + i * adv, y + dy - lv * 60); c.rotate(rot + lv * 0.6); c.scale(Math.max(0.01, p), Math.max(0.01, p));
    cut(c, SH.rr(Math.round(sw), Math.round(sh), 4), col, { seed: i + 3, amp: 2, rim: 3, alpha: 1 - lv });
    const light = col === BLUE || col === "#8e6bc9" || col === TEAL;
    letter(G, ch, 0, -cap * 0.42, { cap: cap * 0.84, color: light ? RIM : INK, align: "center", w: cap * 0.13, seed: i, opacity: 0.95 * (1 - lv), progress: ramp(t, ti + 0.05, 0.22) });
    c.restore();
  });
};

// ================================================================ characters
type KidO = { body: string; head?: string; armL?: number; armR?: number; lx?: number; ly?: number; wow?: number; sprout?: boolean; hat?: boolean; pipe?: boolean; s?: number; seed: number; alpha?: number; tiltH?: number };
// a paper kid, feet at (x, y). Arm angles are measured from hanging straight down, outward positive.
const kid = (c: Ctx, x: number, y: number, t: number, o: KidO) => {
  const { body, head = HEAD, armL = 0.25, armR = 0.25, lx = 0, ly = 0, wow = 0, s = 1, seed, alpha = 1, tiltH = 0 } = o; if (alpha <= 0) return;
  const bob = Math.sin(t * 2.3 + seed) * 1.6;
  c.save(); c.translate(x, y); c.scale(s, s); c.globalAlpha = alpha;
  // legs and feet
  stroke(c, [[-13, -60], [-14, -3], [-24, -1]], INK, 5.5, { alpha }); stroke(c, [[13, -60], [14, -3], [24, -1]], INK, 5.5, { alpha });
  // body
  c.save(); c.translate(0, -100 + bob * 0.5); cut(c, SH.blob(33, seed, 0.07, 42), body, { seed, amp: 1.5, rim: 3.5, alpha }); c.restore();
  // arms: shoulder, a soft elbow, a little hand hook
  const arm = (sx: number, a: number) => { const d = sx < 0 ? -1 : 1, sh: P = [sx, -122 + bob * 0.5], dir: P = [Math.sin(a) * d, Math.cos(a)], el: P = [sh[0] + dir[0] * 27 - dir[1] * 4 * d, sh[1] + dir[1] * 27 + dir[0] * 4 * d], hd: P = [sh[0] + dir[0] * 52, sh[1] + dir[1] * 52];
    stroke(c, [sh, el, hd], INK, 5, { alpha }); stroke(c, [hd, [hd[0] + dir[0] * 7 + d * 3, hd[1] + dir[1] * 7 - 3]], INK, 4.5, { alpha }); };
  arm(-31, armL); arm(31, armR);
  // head
  c.save(); c.translate(0, -176 + bob); c.rotate(tiltH);
  if (o.sprout) { stroke(c, [[2, -36], [4, -58], [0, -70]], "#4f8f4a", 5, { alpha }); c.save(); c.translate(14, -70); c.rotate(-0.4); cut(c, SH.blob(13, seed + 5, 0.1, 7), "#5da35a", { seed: 2, rim: 2, alpha }); c.restore(); }
  cut(c, SH.blob(39, seed + 1, 0.06), head, { seed: seed + 2, amp: 1.6, rim: 3.5, alpha });
  const ex = lx * 6, ey = ly * 5, closed = blink(t, seed);
  [-13, 13].forEach((e) => { if (closed) stroke(c, [[e + ex - 4.5, -4 + ey], [e + ex + 4.5, -4 + ey]], INK, 3, { alpha }); else { dot(c, e + ex, -4 + ey, 4.6 + wow * 2.2, INK, alpha); if (wow > 0) dot(c, e + ex + 1.6, -5.6 + ey, 1.6 * wow, RIM, alpha); } });
  [-24, 24].forEach((e) => dot(c, e + ex * 0.4, 9 + ey * 0.4, 6.5, CHEEK, 0.75 * alpha));
  if (wow > 0.5) { c.save(); c.globalAlpha = alpha; c.fillStyle = INK; c.beginPath(); c.ellipse(ex * 0.6, 14 + ey * 0.5, 5, 6.5, 0, 0, TAU); c.fill(); c.restore(); }
  else { c.save(); c.globalAlpha = alpha; c.strokeStyle = INK; c.lineWidth = 3.2; c.lineCap = "round"; c.beginPath(); c.arc(ex * 0.6, 7 + ey * 0.5, 8, 0.18 * Math.PI, 0.82 * Math.PI); c.stroke(); c.restore(); }
  if (o.hat) { c.save(); c.translate(0, -30); cut(c, SH.ell(52, 9), "#3f3d4c", { seed: 5, rim: 2.5, alpha }); c.translate(0, -18); cut(c, SH.rr(62, 38, 12), "#4b4a5a", { seed: 6, rim: 2.5, alpha }); c.fillStyle = "#b8443a"; c.globalAlpha = alpha; c.fillRect(-31, 6, 62, 7); c.restore(); }
  if (o.pipe) { stroke(c, [[ex * 0.6 + 8, 13], [28, 20]], "#5b3a26", 4, { alpha }); c.save(); c.translate(31, 16); cut(c, SH.rr(12, 14, 3), "#6e4630", { seed: 8, rim: 1.5, alpha }); c.restore();
    for (let i = 0; i < 3; i++) { const u = ((t * 0.5 + i / 3) % 1), sx2 = 33 + Math.sin(u * 7 + i) * 5, sy2 = 4 - u * 45; dot(c, sx2, sy2, 3 + u * 5, "#e8e2d8", 0.5 * (1 - u) * alpha); } }
  c.restore(); c.restore();
};

// ================================================================ galaxies in torn paper
type Pal = { halo: string; disc: string; arm: string[]; core: string; core2: string; dust: string };
const PAL_MW: Pal = { halo: "#b7a3dd", disc: "#8fa9dc", arm: ["#f1e4c8", "#f4c3cf", "#a9c7ee"], core: "#fff4d8", core2: "#f3c96b", dust: "#3a3060" };
const PAL_M31: Pal = { halo: "#d9b3c9", disc: "#96afe0", arm: ["#f6ead3", "#c9b8ea", "#f2c7a5"], core: "#fff6e0", core2: "#f0b85a", dust: "#43305a" };
const PALS: Pal[] = [
  PAL_MW, PAL_M31,
  { halo: "#9fd3c7", disc: "#6cbfa4", arm: ["#f3ead7", "#bfe6d8", "#f0b233"], core: "#fff6e0", core2: "#f0b233", dust: "#24504a" },
  { halo: "#f2a7b8", disc: "#e98a9b", arm: ["#fbe3e6", "#f7c9a4", "#c9b8ea"], core: "#fff6e0", core2: "#e98a3b", dust: "#6a2e44" },
  { halo: "#f7cf8a", disc: "#eeb05a", arm: ["#fff0cf", "#f6d9a8", "#f3ead7"], core: "#fff9ea", core2: "#f0b233", dust: "#7a4a22" },
  { halo: "#a9c7ee", disc: "#6f93c4", arm: ["#e3eefc", "#c9b8ea", "#f3ead7"], core: "#fff6e0", core2: "#f3c96b", dust: "#253a6a" },
];
const armShape = (k: number, j: number, wind: number): Shape => ({
  k: `arm${k}|${j}|${wind}`, p: () => {
    const L: P[] = [], R: P[] = [], w0 = [44, 24, 9][j], off = [0, 0.1, -0.2][j], n = 70;
    for (let i = 0; i <= n; i++) {
      const u = i / n, s = 0.06 + 0.94 * u, a = k * Math.PI + s * wind * TAU + off, rad = 300 * (0.1 + 0.9 * s), cx = Math.cos(a) * rad, cy = Math.sin(a) * rad;
      const a2 = a + 0.01, rad2 = rad + (300 * 0.9 * 0.01) / (wind * TAU), dx = Math.cos(a2) * rad2 - cx, dy = Math.sin(a2) * rad2 - cy, l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l;
      const w = w0 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.08)), 0.55) + 2.5; L.push([cx + nx * w, cy + ny * w]); R.push([cx - nx * w, cy - ny * w]);
    }
    return [...L, ...R.reverse()];
  },
});
type GStar = { x: number; y: number; s: number; ph: number; c: string };
const GSTARS = new Map<number, GStar[]>();
const galStars = (seed: number, wind: number): GStar[] => {
  let v = GSTARS.get(seed); if (v) return v; const r = rng(seed * 17 + 3); v = [];
  for (let i = 0; i < 90; i++) { const onArm = r() < 0.7, s = 0.1 + 0.9 * r(), a = onArm ? (i % 2) * Math.PI + s * wind * TAU + (r() - 0.5) * 0.5 : r() * TAU, rad = onArm ? 300 * (0.1 + 0.9 * s) : Math.sqrt(r()) * 260; v.push({ x: Math.cos(a) * rad, y: Math.sin(a) * rad, s: 2 + r() * r() * 6, ph: r() * TAU, c: r() < 0.2 ? "#fff0b0" : r() < 0.4 ? "#dfe9ff" : RIM }); }
  GSTARS.set(seed, v); return v;
};
type GalO = { rx: number; incl: number; tilt: number; rot: number; pal: Pal; seed: number; t: number; alpha?: number; halo?: number; arms?: number; core?: number; stars?: number; wind?: number; elliptical?: boolean; shadow?: number };
const galaxy = (c: Ctx, x: number, y: number, o: GalO) => {
  const { rx, incl, tilt, rot, pal, seed, t, alpha = 1, halo = 1, arms = 1, core = 1, stars = 1, wind = 1.15, elliptical = false, shadow = 1 } = o; if (alpha <= 0 || rx < 0.5) return;
  c.save(); c.translate(x, y); c.rotate(tilt); c.scale(rx / 300, (rx / 300) * incl); c.rotate(rot);
  if (halo > 0) { cut(c, SH.blob(elliptical ? 250 : 330, seed, 0.08), pal.halo, { seed, amp: 3, rim: 6, alpha: alpha * halo * 0.55, shadow: 0 }); cut(c, SH.blob(elliptical ? 190 : 250, seed + 1, 0.1), pal.disc, { seed: seed + 1, amp: 3, rim: 5, alpha: alpha * halo * 0.8, shadow: shadow * 0.6 }); }
  if (arms > 0 && !elliptical) {
    for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) cut(c, armShape(k, j, wind), pal.arm[j], { seed: seed + k * 5 + j, amp: 2.6, rim: 4, alpha: alpha * arms, shadow: 0.7 * shadow });
    for (let k = 0; k < 2; k++) cut(c, armShape(k, 2, wind), pal.dust, { seed: seed + 20 + k, amp: 1.6, rim: 0, alpha: alpha * arms * 0.75, shadow: 0 });
    cut(c, SH.blob(120, seed + 2, 0.12), pal.arm[2], { seed: seed + 2, amp: 2.5, rim: 4, alpha: alpha * arms, shadow: 0.5 * shadow });
  }
  if (elliptical && arms > 0) cut(c, SH.blob(130, seed + 2, 0.08), pal.arm[1], { seed: seed + 2, amp: 2.5, rim: 4, alpha: alpha * arms });
  if (core > 0) { const k = Math.max(0.01, core); c.save(); c.scale(k, k); cut(c, SH.blob(78, seed + 3, 0.12), pal.core2, { seed: seed + 3, amp: 2.2, rim: 4, alpha }); cut(c, SH.blob(42, seed + 4, 0.14), pal.core, { seed: seed + 4, amp: 2, rim: 3, alpha }); c.restore(); }
  if (stars > 0) for (const s of galStars(seed, wind)) { const tw = 0.55 + 0.45 * Math.sin(t * 2.4 + s.ph); dot(c, s.x, s.y, s.s * (0.8 + 0.25 * tw), s.c, alpha * stars * (0.5 + 0.5 * tw)); }
  c.restore();
};
// where a point in a galaxy's own frame lands on screen
const galPt = (x: number, y: number, o: { rx: number; incl: number; tilt: number; rot: number }, lx: number, ly: number): P => {
  const k = o.rx / 300, a = lx * Math.cos(o.rot) - ly * Math.sin(o.rot), b = (lx * Math.sin(o.rot) + ly * Math.cos(o.rot)) * o.incl;
  return [x + (a * Math.cos(o.tilt) - b * Math.sin(o.tilt)) * k, y + (a * Math.sin(o.tilt) + b * Math.cos(o.tilt)) * k];
};
// galaxy stickers, pre-cut once per kind onto their own little sheets
const SPR = 220;
const SPRITE_O: Omit<GalO, "t" | "rx">[] = [
  { incl: 0.45, tilt: 0.4, rot: 0, pal: PALS[0], seed: 101 }, { incl: 0.85, tilt: -0.3, rot: 1, pal: PALS[5], seed: 102 }, { incl: 0.32, tilt: 1.0, rot: 2, pal: PALS[3], seed: 103 },
  { incl: 0.7, tilt: 0.3, rot: 0, pal: PALS[4], seed: 104, elliptical: true }, { incl: 0.5, tilt: -0.7, rot: 0, pal: PALS[1], seed: 105, elliptical: true },
  { incl: 0.62, tilt: -0.1, rot: 0.5, pal: PALS[2], seed: 106, wind: 0.85 }, { incl: 1, tilt: 0, rot: 2.5, pal: PALS[1], seed: 107 }, { incl: 0.55, tilt: 2.2, rot: 1.2, pal: PALS[3], seed: 108, wind: 0.9 },
];
const sprite = (env: Env, k: number): Layer => {
  const id = `spr${k}:${env.scale}`; let L = env.cache.get(id) as Layer | undefined; if (L) return L;
  L = env.canvas(SPR, SPR); L.ctx.setTransform(1, 0, 0, 1, 0, 0); galaxy(L.ctx, SPR / 2, SPR / 2, { ...SPRITE_O[k], rx: 88, t: 0, stars: 0.8 }); env.cache.set(id, L); return L;
};
const sticker = (c: Ctx, env: Env, k: number, x: number, y: number, size: number, rot: number, alpha: number) => {
  if (alpha <= 0 || size < 1) return;
  if (size < 7) { dot(c, x, y, Math.max(1, size * 0.3), k % 2 ? "#f6e7c8" : "#d9ccf2", alpha * 0.9); return; }
  c.save(); c.globalAlpha = alpha; c.translate(x, y); c.rotate(rot); c.drawImage(sprite(env, k).canvas as CanvasImageSource, -size / 2, -size / 2, size, size); c.restore();
};

// ================================================================ backdrops
const cachedLayer = (env: Env, k: string, make: (c: Ctx) => void): Layer => {
  const id = `${k}:${env.scale}`; let L = env.cache.get(id) as Layer | undefined; if (L) return L;
  L = env.canvas(W * env.scale, H * env.scale); L.ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); make(L.ctx); env.cache.set(id, L); return L;
};
const nightBg = (env: Env) => cachedLayer(env, "night", (c) => { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#17214a"); g.addColorStop(1, "#2a3a72"); c.fillStyle = g; c.fillRect(0, 0, W, H); });
// the paper itself, over everything: fibres, flecks, a soft vignette
const paperTex = (env: Env) => cachedLayer(env, "paperTex", (c) => {
  const r = rng(909);
  for (let i = 0; i < 70000; i++) { const v = r(); c.fillStyle = v > 0.5 ? `rgba(255,250,235,${(0.03 + r() * 0.06).toFixed(3)})` : `rgba(40,25,15,${(0.03 + r() * 0.07).toFixed(3)})`; c.fillRect(r() * W, r() * H, 1 + (r() > 0.7 ? 1 : 0), 1 + (r() > 0.85 ? 1 : 0)); }
  c.lineCap = "round"; for (let i = 0; i < 1600; i++) { const x = r() * W, y = r() * H, a = r() * TAU, l = 4 + r() * 14; c.strokeStyle = r() > 0.5 ? "rgba(255,248,230,0.07)" : "rgba(50,30,20,0.06)"; c.lineWidth = 0.8; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a + 0.5) * l * 0.5, y + Math.sin(a + 0.5) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
  const g = c.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.65); g.addColorStop(0, "rgba(20,12,30,0)"); g.addColorStop(1, "rgba(20,12,30,0.32)"); c.fillStyle = g; c.fillRect(0, 0, W, H);
});
type Star = { x: number; y: number; s: number; ph: number; sp: number; big: boolean };
const STARS: Star[] = (() => { const r = rng(5); return Array.from({ length: 170 }, () => ({ x: r() * W, y: r() * H, s: 1.6 + r() * r() * 3.6, ph: r() * TAU, sp: 0.7 + r() * 1.6, big: r() < 0.07 })); })();
const starField = (c: Ctx, t: number, alpha: number, dy = 0, maxY = H) => {
  if (alpha <= 0) return;
  for (const s of STARS) {
    const y = ((s.y + dy) % (H + 40) + H + 40) % (H + 40) - 20; if (y > maxY) continue; const tw = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph);
    if (s.big) { c.save(); c.translate(s.x, y); c.rotate(Math.sin(t * 0.5 + s.ph) * 0.2); const k = 0.8 + 0.3 * tw; c.scale(k, k); cut(c, SH.star(11), "#fff3c4", { seed: 3, rim: 0, alpha: alpha * (0.7 + 0.3 * tw), shadow: 0.5 }); c.restore(); }
    else dot(c, s.x, y, s.s, RIM, alpha * (0.35 + 0.55 * tw));
  }
};

// ================================================================ scene A: the hill, the sky river
const hillPts = (y0: number): P[] => { const pts: P[] = [[-60, H + 400]]; for (let x = -60; x <= W + 60; x += 40) pts.push([x, y0 + 26 * Math.sin(x * 0.004 + 0.8) - 40 * Math.exp(-(((x - 1180) / 380) ** 2))]); pts.push([W + 60, H + 400]); return pts; };
const HILL_BACK = SH.poly("hillB", hillPts(-30).map(([x, y]) => [x, y] as P)), HILL = SH.poly("hillF", hillPts(0));
const hillTop = (x: number) => 26 * Math.sin(x * 0.004 + 0.8) - 40 * Math.exp(-(((x - 1180) / 380) ** 2));
type Strip = { col: string; w: number; lat: number; arm: number; alat: number };
const STRIPS: Strip[] = (() => { const r = rng(808), cols = ["#c7b6ea", "#9fbfe6", "#f1e4c8", "#f4c3cf", "#a8dccb", "#b3a3e0"]; return cols.map((col, k) => ({ col, w: 22 + r() * 16, lat: (k - 2.5) * 30 + (r() - 0.5) * 10, arm: k % 2, alat: (Math.floor(k / 2) - 1) * 26 })); })();
const SM = 110, GC: P = [960, 560], GR = 380, GINCL = 0.6, GTILT = -0.2;
const riverC = (s: number, dy: number): P => [-140 + s * 2200, 700 - s * 560 + 60 * Math.sin(s * 5.2 + 0.6) + dy];
const spiralC = (st: Strip, s: number, rot: number): P => { const a = st.arm * Math.PI + (0.12 + s * 0.88) * 1.05 * TAU + rot, rad = GR * (0.12 + 0.88 * s) + st.alat * (0.4 + 0.6 * s), lx = Math.cos(a) * rad, ly = Math.sin(a) * rad * GINCL; return [GC[0] + lx * Math.cos(GTILT) - ly * Math.sin(GTILT), GC[1] + lx * Math.sin(GTILT) + ly * Math.cos(GTILT)]; };
// a point of strip k at s (plus a sideways offset), mid-morph from river to spiral arm
const stripPt = (st: Strip, s: number, lat: number, m: number, dy: number, rot: number): P => {
  const e = 0.004, r0 = riverC(s, dy), r1 = riverC(Math.min(1, s + e), dy), rl = Math.hypot(r1[0] - r0[0], r1[1] - r0[1]) || 1, rn: P = [-(r1[1] - r0[1]) / rl, (r1[0] - r0[0]) / rl];
  const riv: P = [r0[0] + rn[0] * (st.lat + lat), r0[1] + rn[1] * (st.lat + lat)];
  if (m <= 0) return riv; const sp = spiralC(st, s, rot), sp1 = spiralC(st, Math.min(1, s + e), rot), sl = Math.hypot(sp1[0] - sp[0], sp1[1] - sp[1]) || 1, sn: P = [-(sp1[1] - sp[1]) / sl, (sp1[0] - sp[0]) / sl];
  const spi: P = [sp[0] + sn[0] * lat * 0.6, sp[1] + sn[1] * lat * 0.6 * GINCL]; return [lerp(riv[0], spi[0], m), lerp(riv[1], spi[1], m)];
};
const morphAt = (tm: number, s: number) => ease(clamp(tm * 1.35 - s * 0.35));
type RDot = { k: number; s: number; lat: number; r: number; ph: number; c: string };
const RDOTS: RDot[] = (() => { const r = rng(4321); return Array.from({ length: 240 }, () => ({ k: Math.floor(r() * 6), s: r(), lat: (r() - 0.5) * 2 * (20 + r() * 70), r: 1.8 + r() * r() * 4.5, ph: r() * TAU, c: r() < 0.25 ? "#fff0b0" : r() < 0.45 ? "#dfe9ff" : RIM })); })();
const drawStrips = (c: Ctx, t: number, reveal: (k: number) => number, tm: number, dy: number, rot: number, alpha: number) => {
  if (alpha <= 0) return;
  STRIPS.forEach((st, k) => {
    const rv = reveal(k); if (rv <= 0) return; const n = Math.max(1, Math.floor(rv * SM)), L: P[] = [], R: P[] = [];
    for (let i = 0; i <= n + 1; i++) {
      const s = i <= n ? i / SM : rv, m = morphAt(tm, s), hw = (st.w / 2) * lerp(1, 0.75, m) * (0.45 + 0.55 * Math.min(1, s * 9, (1 - s) * 7 + 0.15)) + 1.5;
      const p = stripPt(st, s, 0, m, dy, rot), q = stripPt(st, Math.min(1, s + 0.004), 0, m, dy, rot), l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1, nx = -(q[1] - p[1]) / l, ny = (q[0] - p[0]) / l;
      L.push([p[0] + nx * hw, p[1] + ny * hw]); R.push([p[0] - nx * hw, p[1] - ny * hw]); if (i > n) break;
    }
    jagFill(c, [...L, ...R.reverse()], st.col, alpha * 0.9, 50 + k, 1.8, 3);
  });
  for (const d of RDOTS) { if (d.s > reveal(d.k)) continue; const m = morphAt(tm, d.s), p = stripPt(STRIPS[d.k], d.s, d.lat, m, dy, rot), tw = 0.5 + 0.5 * Math.sin(t * 2.2 + d.ph); dot(c, p[0], p[1], d.r * (0.85 + 0.25 * tw), d.c, alpha * (0.55 + 0.45 * tw)); }
};
// horizon cut-outs: thousands of years of people looking up
const stones = (c: Ctx) => { [[-60, 0, 26, 86], [60, 0, 26, 86], [0, -96, 150, 22], [-150, 0, 22, 62], [150, 4, 24, 58]].forEach(([x, y, w, h], i) => { c.save(); c.translate(x, y - h / 2); cut(c, SH.rr(w, h, 4), i === 2 ? "#8f93a6" : "#a3a7b8", { seed: 30 + i, rim: 3 }); c.restore(); }); };
const pyramid = (c: Ctx) => { cut(c, SH.poly("pyr", [[-120, 0], [0, -150], [120, 0]]), "#e2b35c", { seed: 40, rim: 3.5 }); cut(c, SH.poly("pyrS", [[0, -150], [120, 0], [30, 0]]), "#c9913f", { seed: 41, rim: 0, shadow: 0 }); };
const tower = (c: Ctx) => { cut(c, SH.rr(70, 120, 6), "#d9cdb8", { seed: 50, rim: 3 }); c.save(); c.translate(0, -60); cut(c, SH.poly("twd", ellP(48, 44, 40).filter((p) => p[1] <= 0)), "#eee7da", { seed: 51, rim: 3 }); c.restore(); c.fillStyle = "#3b3f5c"; c.fillRect(-6, -100, 12, 40); stroke(c, [[20, -80], [70, -130]], "#3b3f5c", 12); };
const sign = (c: Ctx, t: number, p: number) => {
  if (p <= 0) return; c.save(); c.scale(Math.max(0.01, p), Math.max(0.01, p)); c.rotate(Math.sin(t * 1.7) * 0.03);
  cut(c, SH.rr(14, 150, 4), "#8a5a3c", { seed: 60, rim: 2 }); c.translate(0, -130);
  cut(c, SH.poly("arrow", [[-150, -34], [120, -34], [160, 0], [120, 34], [-150, 34]]), YELLOW, { seed: 61, rim: 3.5 });
  letter(G, "YOU ARE HERE", -12, -12, { cap: 24, color: INK, align: "center", w: 3.6, seed: 4, progress: ramp(p, 0.99, 0.01) });
  c.restore();
};

// ================================================================ scene D: 1929
const DSKY = ["#1a2554", "#24397a", "#3b5a93", "#6f86b3", "#d59a86", "#efc38c"];
const skyBand = (i: number): Shape => ({ k: `dsk${i}`, p: () => { const y0 = -40 + i * 150, pts: P[] = [[-60, y0 + 400 + (i === 5 ? 600 : 0)]]; for (let x = -60; x <= W + 60; x += 30) pts.push([x, y0 + 28 * Math.sin(x * 0.005 + i * 1.7) + 10 * Math.sin(x * 0.019 + i)]); pts.push([W + 60, y0 + 400 + (i === 5 ? 600 : 0)]); return pts; } });
const CONST: [string, number, number][] = [["alpha", 1130, 520], ["delta", 1250, 560], ["beta", 1385, 600], ["gamma", 1570, 610], ["mu", 1400, 500], ["nu", 1425, 415]];
const SMUDGE: P = [1455, 330];
const chalk = (c: Ctx, x: number, y: number, s: number, t: number, alpha: number) => {
  if (alpha <= 0) return; const r = rng(77); c.save();
  for (let i = 0; i < 150; i++) { const a = r() * TAU, d = Math.sqrt(-2 * Math.log(1 - r() * 0.98)) * 0.42, px = x + Math.cos(a) * d * s * 1.5 + Math.sin(t * 0.7 + i) * 1.2, py = y + Math.sin(a) * d * s * 0.6, col = r() < 0.4 ? "#f6e7c8" : r() < 0.7 ? "#d9ccf2" : "#f4c3cf"; c.save(); c.translate(px, py); c.rotate(-0.5); dot(c, 0, 0, Math.max(0.5, (1.5 + r() * 3.5) * (s / 60)), col, alpha * (0.12 + r() * 0.2)); c.restore(); }
  dot(c, x, y, Math.max(0.5, s * 0.1), "#fff6e0", alpha * 0.7); c.restore();
};
const dome = (c: Ctx, t: number, slit: number, tubeA: number, tubeOut: number) => {
  // telescope first, so the dome sits over its base
  if (tubeOut > 0) { c.save(); c.translate(0, -150); c.rotate(tubeA); c.translate(tubeOut * 60, 0); cut(c, SH.rr(170, 40, 8), "#33406b", { seed: 70, rim: 3 }); c.fillStyle = YELLOW; c.fillRect(70, -20, 12, 40); c.restore(); }
  c.save(); c.translate(0, -55); cut(c, SH.rr(210, 110, 6), "#d6cfc1", { seed: 71, rim: 3.5 }); c.restore();
  c.save(); c.translate(0, -110); cut(c, SH.poly("dome", ellP(115, 100, 64).filter((p) => p[1] <= 1)), "#efebe2", { seed: 72, rim: 3.5 });
  const sw = 10 + 22 * slit; c.fillStyle = "#1f2a50"; c.beginPath(); c.moveTo(-sw / 2, -98); c.lineTo(sw / 2, -98); c.lineTo(sw / 2 + 8, 0); c.lineTo(-sw / 2 - 8, 0); c.closePath(); c.fill(); c.restore();
  c.save(); c.translate(-50, -35); cut(c, SH.rr(34, 60, 12), "#8a5a3c", { seed: 73, rim: 2 }); c.restore();
  void t;
};
const calendar = (c: Ctx, t: number, x: number, y: number, a: number) => {
  if (a <= 0) return; const flips = ease(ramp(t, CUE.y1929, 0.9)), yr = Math.min(1929, 1919 + Math.floor(flips * 10.999)), frac = flips * 10.999 - Math.floor(flips * 10.999);
  c.save(); c.translate(x, y); c.rotate(-0.04); c.globalAlpha = a;
  cut(c, SH.rr(250, 250, 8), PAPER, { seed: 80, rim: 0, alpha: a });
  letter(G, String(yr), 0, -30, { cap: 76, color: INK, align: "center", w: 10, seed: yr, opacity: a });
  letter(G, "JAN", 0, 72, { cap: 26, color: RED, align: "center", w: 4, seed: 3, opacity: a });
  if (yr > 1919 && flips < 1) { c.save(); c.translate(0, -125); c.rotate(-frac * 1.1); c.translate(frac * 120, 125 + frac * 260); const pa = a * (1 - frac); cut(c, SH.rr(250, 250, 8), "#fbf3e2", { seed: 81 + yr, rim: 0, alpha: pa }); letter(G, String(yr - 1), 0, -30, { cap: 76, color: INK, align: "center", w: 10, seed: yr - 1, opacity: pa }); c.restore(); }
  c.save(); c.translate(0, -112); cut(c, SH.rr(262, 56, 8), RED, { seed: 82, rim: 0, alpha: a, shadow: 0.4 }); c.restore(); [-70, 0, 70].forEach((rx) => { dot(c, rx, -120, 9, INK, a); stroke(c, [[rx, -120], [rx, -150]], "#9aa0b2", 6, { alpha: a }); });
  c.restore();
};
// ================================================================ scene E/F props
const redX = (c: Ctx, x: number, y: number, s: number, p: number, alpha = 1) => {
  const r = rng(12), line2 = (a: P, b: P, pp: number, seed: number) => { const q = rng(seed); for (let k = 0; k < 3; k++) stroke(c, [[a[0] + (q() - 0.5) * 8, a[1] + (q() - 0.5) * 8], [(a[0] + b[0]) / 2 + (q() - 0.5) * 10, (a[1] + b[1]) / 2 + (q() - 0.5) * 10], [b[0] + (q() - 0.5) * 8, b[1] + (q() - 0.5) * 8]], RED, 8 - k * 2, { alpha: alpha * (0.85 - k * 0.15), progress: pp }); };
  void r; line2([x - s, y - s], [x + s, y + s], clamp(p * 2), 1); line2([x + s, y - s], [x - s, y + s], clamp(p * 2 - 1), 2);
};
const gasCloud = (c: Ctx, t: number) => { cut(c, SH.cloud(300, 180, 5), "#a9a7c4", { seed: 5, rim: 4, amp: 2.2 }); c.save(); c.translate(-40, 20); cut(c, SH.cloud(180, 100, 6), "#c7c3dc", { seed: 6, rim: 3, amp: 2 }); c.restore(); for (let i = 0; i < 5; i++) dot(c, -110 + i * 55, 60 + Math.sin(t * 3 + i) * 6, 5, "#e2def0", 0.7); };
const starSystem = (c: Ctx, t: number) => {
  stroke(c, ellP(150, 60, 60).concat([ellP(150, 60, 60)[0]]), RIM, 2.5, { alpha: 0.6, dash: [10, 10] }); stroke(c, ellP(230, 95, 80).concat([ellP(230, 95, 80)[0]]), RIM, 2.5, { alpha: 0.6, dash: [10, 10] });
  const back1 = Math.sin(t * 1.3) < 0; const p1: P = [Math.cos(t * 1.3) * 150, Math.sin(t * 1.3) * 60], p2: P = [Math.cos(t * 0.8 + 2) * 230, Math.sin(t * 0.8 + 2) * 95];
  const planet = (p: P, r: number, col: string, sd: number) => { c.save(); c.translate(p[0], p[1]); cut(c, SH.blob(r, sd, 0.05), col, { seed: sd, rim: 3 }); c.restore(); };
  if (back1) planet(p1, 18, TEAL, 11); if (Math.sin(t * 0.8 + 2) < 0) planet(p2, 26, ORANGE, 12);
  c.save(); c.rotate(t * 0.3); cut(c, SH.star(78, 10, 0.72), YELLOW, { seed: 13, rim: 4 }); c.restore(); cut(c, SH.blob(52, 14, 0.05), "#f7d56a", { seed: 14, rim: 0, shadow: 0 });
  if (!back1) planet(p1, 18, TEAL, 11); if (Math.sin(t * 0.8 + 2) >= 0) planet(p2, 26, ORANGE, 12);
};
// a door (or flap) in the sky, hinged on its left edge; `open` 0..1 swings it through ~115 degrees
const flap = (c: Ctx, env: Env, t: number, x: number, y: number, w: number, h: number, open: number, lines: number, inside: (c: Ctx) => void, seed: number, face = NAVY) => {
  if (lines <= 0) return; const x0 = x - w / 2, y0 = y - h / 2;
  if (open > 0) {
    c.save(); c.beginPath(); c.rect(x0, y0, w, h); c.clip();
    const lg = c.createRadialGradient(x, y, 0, x, y, Math.max(w, h) * 0.75); lg.addColorStop(0, "#fff8e2"); lg.addColorStop(0.55, "#f8dc9a"); lg.addColorStop(1, "#eeb35e"); c.fillStyle = lg; c.fillRect(x0, y0, w, h);
    inside(c); c.restore();
    c.save(); c.globalAlpha = 0.25 * open; c.fillStyle = "#1a1020"; c.fillRect(x0 + w - 8, y0, 8, h); c.fillRect(x0, y0, w, 8); c.restore();
  }
  // the dashed cut line
  stroke(c, [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h], [x0, y0]], RIM, 3, { alpha: 0.75 * (1 - open), progress: lines, dash: [12, 9] });
  if (open > 0) {
    const th = open * 2.0, cw = Math.cos(th) * w, sk = Math.sin(th) * h * 0.1, back2 = cw < 0;
    c.save(); c.shadowColor = "transparent";
    const quad = (): void => { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + cw, y0 - sk); c.lineTo(x0 + cw, y0 + h + sk); c.lineTo(x0, y0 + h); c.closePath(); };
    c.globalAlpha = 0.2; c.fillStyle = "#120c1e"; c.translate(4, 6); quad(); c.fill(); c.translate(-4, -6); c.globalAlpha = 1;
    c.fillStyle = RIM; quad(); c.fill(); c.fillStyle = back2 ? "#efe6d2" : face; c.save(); c.translate(back2 ? -2 : 2, 0); c.beginPath(); c.moveTo(x0 + (back2 ? -3 : 3), y0 + 3); c.lineTo(x0 + cw * 0.97, y0 - sk * 0.97 + 3); c.lineTo(x0 + cw * 0.97, y0 + h + sk * 0.97 - 3); c.lineTo(x0 + (back2 ? -3 : 3), y0 + h - 3); c.closePath(); c.fill(); c.restore();
    c.restore();
  }
  void env; void t; void seed;
};

// ================================================================ the frame
const draw = (ctx: Ctx, frame: number, env: Env) => {
  const t = frame / FPS, sc = env.scale; G = new Gfx(ctx, env, frame, FLAT);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(nightBg(env).canvas as CanvasImageSource, 0, 0); ctx.setTransform(sc, 0, 0, sc, 0, 0);
  const c = ctx;

  // ---------------------------------------------------------------- A + B + C: the night sky, one sheet
  if (t < 23.6) {
    const tilt = ease(ramp(t, CUE.years, 1.8)), drop = ease(ramp(t, 9.25, 1.1));
    const gy = 790 - 200 + 230 * tilt + 700 * drop; // ground line on screen
    const tm = ramp(t, 9.45, 2.0), rot = Math.max(0, t - 9.45) * 0.035;
    // the zoom out to two trillion
    const Z = Math.exp(Math.log(0.035) * ease(ramp(t, CUE.offby, 2.5)));
    const tearT = ease(ramp(t, 18.35, 0.9));
    starField(c, t, 1 - ramp(t, 18.3, 0.5) * 0.4, -120 * (1 - tilt) + 60 * drop);
    // behind the black sheets: a sky full of galaxy stickers
    const fieldA = ramp(t, 18.3, 0.5);
    if (fieldA > 0) {
      const r = rng(2024);
      for (let i = 0; i < 950; i++) {
        const d = 640 * Math.exp(Math.log(50) * r()), a = r() * TAU, k = Math.floor(r() * 8), ws = 0.07 * d + 50, rot2 = r() * TAU;
        const x = GC[0] + Math.cos(a) * d * Z, y = GC[1] + Math.sin(a) * d * 0.62 * Z, size = ws * Z; if (x < -80 || x > W + 80 || y < -80 || y > H + 80) continue;
        sticker(c, env, k, x, y, size, rot2 + t * 0.02, fieldA * clamp(size / 10));
      }
    }
    // the island of light: warm paper rays
    const rayA = ramp(t, CUE.island, 0.8) * (1 - ramp(t, 18.3, 0.4));
    if (rayA > 0) { c.save(); c.translate(GC[0], GC[1]); c.rotate(t * 0.06); for (let i = 0; i < 12; i++) { c.rotate(TAU / 12); const L = 560 + 60 * Math.sin(t * 1.4 + i), wd = 0.09; jagFill(c, [[0, 0], [Math.cos(-wd) * L, Math.sin(-wd) * L * GINCL], [Math.cos(wd) * L, Math.sin(wd) * L * GINCL]], i % 2 ? "#f7d774" : "#fbe7a8", rayA * 0.28, 900 + i, 2.5); } c.restore(); }
    // the galaxy (or the river that becomes it), scaled by the zoom
    c.save(); c.translate(GC[0], GC[1]); c.scale(Z, Z); c.translate(-GC[0], -GC[1]);
    const galA = ramp(t, 9.5, 1.2), coreP = back(clamp((t - CUE.our) / 0.45));
    galaxy(c, GC[0], GC[1], { rx: GR * 1.05, incl: GINCL, tilt: GTILT, rot: rot, pal: PAL_MW, seed: 11, t, alpha: galA, arms: 0, core: 0, stars: 0 });
    drawStrips(c, t, (k) => ease(ramp(t, 2.6 + k * 0.32, 2.6)), tm, (gy - 1020) * 0.35, rot, 1);
    if (coreP > 0) galaxy(c, GC[0], GC[1], { rx: GR * 1.05, incl: GINCL, tilt: GTILT, rot: rot, pal: PAL_MW, seed: 11, t, halo: 0, arms: 0, core: coreP, stars: 0 });
    c.restore();
    // YOU ARE HERE sticker on an arm, kept at a readable size through the zoom
    const pinP = back(clamp((t - (CUE.our + 0.4)) / 0.4)), pinA = 1 - ramp(t, 22.4, 0.4);
    if (pinP > 0 && pinA > 0) {
      const p0 = stripPt(STRIPS[2], 0.62, 0, 1, 0, rot), px = GC[0] + (p0[0] - GC[0]) * Z, py = GC[1] + (p0[1] - GC[1]) * Z, big = 1 + 0.6 * ramp(t, CUE.offby, 1.5);
      c.save(); c.translate(px, py); c.scale(Math.max(0.01, pinP * big), Math.max(0.01, pinP * big)); c.rotate(Math.sin(t * 2) * 0.1); cut(c, SH.star(20, 5, 0.45), RED, { seed: 90, rim: 3, alpha: pinA }); c.restore();
      if (t < CUE.uni + 0.2 || t > CUE.offby) { c.save(); c.translate(px + 26 * big, py - 30 * big); c.rotate(-0.05); c.globalAlpha = pinA; const lw = letterWidth("YOU ARE HERE", 18) + 26; cut(c, SH.rr(Math.round(lw), 36, 4), PAPER, { seed: 91, rim: 0, alpha: pinA * pinP }); letter(G, "YOU ARE HERE", 0, -9, { cap: 18, color: INK, align: "center", w: 2.8, seed: 5, opacity: pinA * clamp(pinP), progress: ramp(t, CUE.our + 0.6, 0.5) }); c.restore(); }
    }
    // the dashed cut line and the scissors: everything inside it was "the universe"
    const cutP = ease(ramp(t, CUE.uni + 0.1, 1.5)), cutA = 1 - ramp(t, 18.3, 0.3);
    if (cutP > 0 && cutA > 0) {
      const ep = (u: number): P => { const a = -Math.PI / 2 + u * TAU, lx = Math.cos(a) * 560, ly = Math.sin(a) * 350; return [GC[0] + lx * Math.cos(GTILT * 0.5) - ly * Math.sin(GTILT * 0.5), GC[1] + lx * Math.sin(GTILT * 0.5) + ly * Math.cos(GTILT * 0.5)]; };
      const pts: P[] = Array.from({ length: 121 }, (_, i) => ep(i / 120)); stroke(c, pts, RIM, 4, { alpha: cutA * 0.9, progress: cutP, dash: [18, 12] });
      if (cutP < 1) { const p = ep(cutP), q = ep(Math.min(1, cutP + 0.01)), ang = Math.atan2(q[1] - p[1], q[0] - p[0]), snip = 0.25 + 0.2 * Math.sin(t * 22);
        c.save(); c.translate(p[0], p[1]); c.rotate(ang + Math.PI);
        [-1, 1].forEach((sgn) => { c.save(); c.rotate(sgn * snip); c.translate(-8, 0); cut(c, SH.poly("blade", [[0, -5], [-70, -2], [-74, 0], [-70, 2], [0, 5]]), "#c9cfdc", { seed: 92, rim: 0, amp: 0.4 }); c.translate(22, sgn * 14); cut(c, SH.ell(17, 12), ORANGE, { seed: 93, rim: 2.5 }); dot(c, 0, 0, 7, NAVY); c.restore(); });
        dot(c, 0, 0, 4, INK); c.restore(); }
    }
    // eternal darkness: black sheets slide in from every side, then are ripped away
    const sheets: [number, number, number, number, number, number][] = [[0, -H / 2 - 200, W + 400, H, 0, -1], [0, H + 200, W + 400, H, 0, 1], [-W / 2 - 200, 0, W, H + 400, -1, 0], [W * 1.5 + 200, 0, W, H + 400, 1, 0]];
    const dstop: P[] = [[W / 2, 190 - H / 2], [W / 2, 930 + H / 2], [340 - W / 2, H / 2], [1580 + W / 2, H / 2]];
    sheets.forEach(([sx, sy, sw, sh2, dx, dyy], i) => {
      const inP = ease(ramp(t, CUE.dark + i * 0.18, 0.9)); if (inP <= 0 || tearT >= 1) return;
      const x = lerp(sx === 0 ? W / 2 : sx, dstop[i][0], inP) + dx * tearT * 1500, y = lerp(sy, dstop[i][1], inP) + dyy * tearT * 1100;
      c.save(); c.translate(x, y); c.rotate(tearT * (i % 2 ? 0.5 : -0.4)); cut(c, SH.rr(sw, sh2, 2), i % 2 ? BLACKP : "#191b28", { seed: 95 + i, amp: 6, rim: 5, step: 7, alpha: 1 - ramp(t, 18.9, 0.3), rimColor: "#e9e2d2" }); c.restore();
    });
    // the price tag: off by a factor of two trillion
    const tagA = ramp(t, CUE.offby + 0.1, 0.3) * (1 - ramp(t, 22.5, 0.3));
    if (tagA > 0) {
      const n = Math.exp(Math.log(2e12) * ease(ramp(t, CUE.offby + 0.2, 1.2))), s = Math.round(n).toLocaleString("en-US"), sw = Math.sin((t - CUE.offby) * 3.1) * 0.08 * Math.exp(-(t - CUE.offby) * 0.6);
      c.save(); c.translate(960, 790); c.rotate(sw); stroke(c, [[0, -60], [0, 0]], INK, 3, { alpha: tagA }); c.translate(0, 80 - (1 - back(clamp((t - CUE.offby - 0.1) / 0.4))) * 60);
      cut(c, SH.poly("tag", [[-300, -58], [270, -58], [310, 0], [270, 58], [-300, 58]]), "#e9c98f", { seed: 97, rim: 3, alpha: tagA }); dot(c, 272, 0, 10, NAVY, tagA);
      letter(G, "X " + s, -15, -22, { cap: 44, color: INK, align: "center", w: 6, seed: 9, opacity: tagA }); c.restore();
    }
    // the ground, the kid, the monuments, the sign
    if (drop < 1) {
      c.save(); c.translate(0, gy);
      cut(c, HILL_BACK, GRASS_N2, { seed: 20, rim: 4, amp: 2.5 });
      const mons: [number, number, (c: Ctx) => void, number][] = [[3.1, 300, stones, 0.75], [4.5, 640, pyramid, 0.8], [5.9, 1660, tower, 0.8]];
      mons.forEach(([t0, x, f, s]) => { const p = back(clamp((t - t0) / 0.5)); if (p <= 0) return; c.save(); c.translate(x, hillTop(x) - 30 + 10); c.scale(s * Math.max(0.01, p), s * Math.max(0.01, p)); f(c); c.restore(); });
      cut(c, HILL, GRASS_N, { seed: 21, rim: 4, amp: 2.5 });
      const kx = 1180, ky = hillTop(kx) + 6, cheer = ease(ramp(t, CUE.everything, 0.4)) * (1 - ease(ramp(t, 9.0, 0.4)));
      kid(c, kx, ky, t, { body: ORANGE, seed: 3, s: 1.15, ly: -0.7 * ease(ramp(t, 2.2, 0.8)), lx: 0.3, armL: lerp(0.25, 2.5, cheer), armR: lerp(0.25, 2.5, cheer), wow: cheer });
      c.save(); c.translate(kx - 230, hillTop(kx - 230) + 10); sign(c, t, back(clamp((t - 0.7) / 0.45))); c.restore();
      c.restore();
    }
  }

  // ---------------------------------------------------------------- D: 1929, a dusk sheet slides up
  const dIn = ease(ramp(t, 22.7, 0.75));
  const eRing = ease(ramp(t, CUE.discover, 0.9)), ringOpen = ease(ramp(t, CUE.galaxy, 0.9));
  if (dIn > 0 && ringOpen < 1) {
    const off = (1 - dIn) * (H + 80), rotS = (1 - dIn) * 0.06;
    c.save(); c.translate(W / 2, H / 2 + off); c.rotate(rotS); c.translate(-W / 2, -H / 2);
    const sheetOutline = SH.poly("dsheet", [[-80, -20], [W + 80, -20], [W + 80, H + 300], [-80, H + 300]]);
    if (dIn < 1) cut(c, sheetOutline, DSKY[0], { seed: 100, amp: 5, rim: 5, step: 8 });
    c.save(); c.beginPath(); c.rect(-80, -20, W + 160, H + 320); c.clip();
    DSKY.forEach((col, i) => cut(c, skyBand(i), col, { seed: 110 + i, amp: 2.5, rim: 3, step: 6, shadow: 0.6 }));
    starField(c, t, 0.8, 0, 380);
    // the constellation, threaded star to star, and the smudge
    const cA = ramp(t, CUE.andro, 0.4);
    CONST.forEach(([, x, y], i) => { const p = back(clamp((t - CUE.andro - i * 0.12) / 0.35)); if (p <= 0) return; c.save(); c.translate(x, y); c.scale(Math.max(0.01, p), Math.max(0.01, p)); c.rotate(i); cut(c, SH.star(16, 5, 0.45), "#fff1c4", { seed: 120 + i, rim: 2.5 }); c.restore(); });
    const th = ease(ramp(t, CUE.andro + 0.3, 1.0)); if (cA > 0) { const idx = [0, 1, 2, 3], br = [2, 4, 5]; stroke(c, idx.map((i) => [CONST[i][1], CONST[i][2]] as P), RIM, 2.5, { alpha: 0.7 * cA, progress: th, dash: [3, 7] }); stroke(c, br.map((i) => [CONST[i][1], CONST[i][2]] as P), RIM, 2.5, { alpha: 0.7 * cA, progress: th, dash: [3, 7] }); }
    const smA = ramp(t, CUE.smudge, 0.6); chalk(c, SMUDGE[0], SMUDGE[1], 60 + 6 * Math.sin(t * 2), t, smA);
    // the hill and the dome
    cut(c, SH.poly("dhillB", hillPts(0).map(([x, y]) => [x, y + 800 - 40 * Math.sin(x * 0.003)] as P)), "#2f5a3f", { seed: 130, rim: 4, amp: 2.5 });
    const slit = ease(ramp(t, CUE.hubble + 0.3, 0.8)), aim = Math.atan2(SMUDGE[1] - 620, SMUDGE[0] - 1000), tubeA = lerp(-Math.PI / 2, aim, ease(ramp(t, 25.4, 1.1))), tubeOut = ease(ramp(t, 24.9, 0.6));
    c.save(); c.translate(1000, 770); dome(c, t, slit, tubeA, tubeOut); c.restore();
    cut(c, SH.poly("dhillF", hillPts(0).map(([x, y]) => [x, y + 830 + 30 * Math.sin(x * 0.004 + 2)] as P)), "#3f7248", { seed: 131, rim: 4, amp: 2.5 });
    const sl = ease(ramp(t, CUE.smudge - 0.1, 0.7)); if (sl > 0) { const tip: P = [1000 + Math.cos(tubeA) * 145, 620 + Math.sin(tubeA) * 145], dd = Math.hypot(SMUDGE[0] - tip[0], SMUDGE[1] - tip[1]), ux = (SMUDGE[0] - tip[0]) / dd, uy = (SMUDGE[1] - tip[1]) / dd; stroke(c, [tip, [tip[0] + ux * (dd - 40), tip[1] + uy * (dd - 40)]], "#fff1c4", 3, { alpha: 0.8, progress: sl, dash: [14, 10], dashOff: -t * 30 }); }
    // Edwin Hubble walks in
    const walk = ease(ramp(t, CUE.hubble - 0.2, 1.3)), hx = lerp(-120, 730, walk), step2 = walk < 1 ? Math.sin(t * 12) : 0;
    kid(c, hx, 866 + 30 * Math.sin(hx * 0.004 + 2) - Math.abs(step2) * 6, t, { body: "#8a5a3c", head: PEACH, hat: true, pipe: true, seed: 7, s: 1.05, lx: 0.8, ly: lerp(0, -0.8, ease(ramp(t, 25.4, 0.6))), armR: lerp(0.3, 1.9, ease(ramp(t, 25.2, 0.5))), armL: 0.25 + step2 * 0.2 });
    calendar(c, t, 250, 250, ramp(t, CUE.y1929 - 0.25, 0.3));
    c.restore();
    caption(c, "EDWIN HUBBLE", 730, 530, t, CUE.hubble + 0.6, 26.1, { cap: 30 });
    caption(c, "A FAINT SMUDGE", SMUDGE[0], SMUDGE[1] - 110, t, CUE.smudge + 0.2, CUE.andro - 0.1, { cap: 28 });
    caption(c, "ANDROMEDA", 1690, 690, t, CUE.andro + 0.2, CUE.discover + 0.1, { cap: 30 });
    c.restore();
  }

  // ---------------------------------------------------------------- E: the spyglass ring
  if (eRing > 0 && t < 38.6) {
    const rc: P = [lerp(SMUDGE[0], 960, eRing), lerp(SMUDGE[1], 540, eRing)], R = Math.max(1, lerp(24, 360, eRing) + 1300 * ringOpen * ringOpen), dark = ramp(t, CUE.discover + 0.1, 0.6) * (1 - ringOpen);
    if (dark > 0) { c.save(); c.globalAlpha = dark * 0.94; c.fillStyle = "#0f1226"; c.beginPath(); c.rect(0, 0, W, H); c.arc(rc[0], rc[1], R + 20, 0, TAU, true); c.fill("evenodd"); c.restore(); }
    c.save(); c.beginPath(); c.arc(rc[0], rc[1], R, 0, TAU); c.clip();
    c.drawImage(nightBg(env).canvas as CanvasImageSource, 0, 0, W, H); starField(c, t, 0.9);
    const k = R / 360; c.translate(rc[0], rc[1]); c.scale(Math.min(k, 1.4), Math.min(k, 1.4));
    const smA = 1 - ramp(t, CUE.gas - 0.2, 0.4) + ramp(t, 36.6, 0.5) * (1 - ramp(t, CUE.galaxy, 0.2));
    chalk(c, 0, 0, 150, t, clamp(smA));
    // candidate 1: a cloud of gas
    const g1 = back(clamp((t - CUE.gas) / 0.45)), g1out = ease(ramp(t, 34.15, 0.55));
    if (g1 > 0 && g1out < 1) { c.save(); c.translate(-g1out * 600, g1out * 80); c.rotate(-g1out * 0.9); c.scale(Math.max(0.01, g1), Math.max(0.01, g1)); gasCloud(c, t); redX(c, 0, 0, 130, ease(ramp(t, 33.35, 0.5))); c.restore(); }
    // candidate 2: a nearby star system
    const g2 = back(clamp((t - CUE.star) / 0.45)), g2out = ease(ramp(t, 36.55, 0.55));
    if (g2 > 0 && g2out < 1) { c.save(); c.translate(g2out * 600, g2out * 80); c.rotate(g2out * 0.9); c.scale(Math.max(0.01, g2 * 0.95), Math.max(0.01, g2 * 0.95)); starSystem(c, t); redX(c, 0, 0, 150, ease(ramp(t, 35.85, 0.5))); c.restore(); }
    c.restore();
    // the ring itself: a thick card tube-end
    const rA = 1 - ramp(t, CUE.galaxy + 0.5, 0.4);
    if (rA > 0) { c.save(); c.globalAlpha = rA; c.lineWidth = 34 * Math.min(1, eRing * 2); c.strokeStyle = RIM; c.beginPath(); c.arc(rc[0], rc[1], R + 17, 0, TAU); c.stroke(); c.lineWidth = 28 * Math.min(1, eRing * 2); c.strokeStyle = "#3a3346"; c.stroke(); c.lineWidth = 3; c.strokeStyle = YELLOW; c.beginPath(); c.arc(rc[0], rc[1], R + 6, 0, TAU); c.stroke(); c.restore(); }
    // Hubble peeks in, puzzled
    const pk = ease(ramp(t, CUE.impossible - 0.2, 0.6)) * (1 - ease(ramp(t, CUE.galaxy, 0.5)));
    if (pk > 0) {
      kid(c, 250, 1080 + 330 - pk * 280, t, { body: "#8a5a3c", head: PEACH, hat: true, seed: 7, s: 1.5, lx: 0.9, ly: -0.5, wow: ramp(t, CUE.impossible, 0.3), armR: 2.4, tiltH: 0.12 });
      const q = back(clamp((t - CUE.impossible - 0.15) / 0.35)) * (1 - ramp(t, 32.3, 0.3)); if (q > 0) { c.save(); c.translate(420, 760); c.scale(Math.max(0.01, q), Math.max(0.01, q)); c.rotate(0.08); cut(c, SH.blob(60, 33, 0.08, 52), RIM, { seed: 4, rim: 0 }); cut(c, SH.poly("tail", [[-40, 30], [-75, 70], [-10, 40]]), RIM, { seed: 4, rim: 0, shadow: 0 }); qmark(-14, -34, 60, INK, ramp(t, CUE.impossible + 0.2, 0.4), 0.95, 9); c.restore(); }
    }
    caption(c, "SHOULD HAVE BEEN IMPOSSIBLE", 960, 92, t, CUE.impossible - 0.1, CUE.gas - 0.2, { cap: 40 });
    caption(c, "A CLOUD OF GAS?", 960, 985, t, CUE.gas + 0.1, 34.4, { cap: 34 });
    caption(c, "A NEARBY STAR SYSTEM?", 960, 985, t, CUE.star + 0.1, 36.8, { cap: 34 });
  }

  // ---------------------------------------------------------------- F: Andromeda, the distance, the stars, the whisper
  const bloom = back(clamp((t - CUE.galaxy) / 0.9)), fOut = ease(ramp(t, 49.3, 0.6));
  if (bloom > 0 && t >= CUE.galaxy) {
    if (ringOpen >= 1) starField(c, t, 1);
    const d1 = ease(ramp(t, CUE.distance, 1.1)), d2 = ease(ramp(t, CUE.billions, 1.1)), d3 = ease(ramp(t, CUE.whisper, 1.6));
    let x = 960, y = 560, rx = 540 * Math.max(0.01, bloom);
    x = lerp(x, 1450, d1); y = lerp(y, 440, d1); rx = lerp(rx, 250, d1);
    x = lerp(x, 960, d2); y = lerp(y, 590, d2); rx = lerp(rx, 600, d2);
    x = lerp(x, 1058, d3); y = lerp(y, 380, d3); rx = lerp(rx, 9, d3);
    const wA = lerp(1, 0.45, d3) + 0.55 * span2(t, CUE.flare, 47.0);
    const go = { rx, incl: 0.34, tilt: -0.5, rot: t * 0.02 };
    if (fOut < 1) {
      if (rx > 20) {
        // companions M32 and M110
        const m32 = galPt(x, y, go, 60, 200), m110 = galPt(x, y, go, -120, -330);
        galaxy(c, x, y, { ...go, pal: PAL_M31, seed: 31, t, alpha: wA * clamp(bloom), wind: 1.3, stars: 1 + ramp(t, CUE.billions + 0.3, 1) });
        c.save(); c.translate(m32[0], m32[1]); c.scale(rx / 540, rx / 540); cut(c, SH.blob(26, 32, 0.05), "#f6e3c0", { seed: 32, rim: 3, alpha: wA }); cut(c, SH.blob(12, 33, 0.05), "#fff6e0", { seed: 33, rim: 0, alpha: wA, shadow: 0 }); c.restore();
        c.save(); c.translate(m110[0], m110[1]); c.rotate(0.9); c.scale(rx / 540, rx / 540); cut(c, SH.blob(44, 34, 0.05, 26), "#ecd7b8", { seed: 34, rim: 3, alpha: wA }); c.restore();
      } else chalk(c, x, y, Math.max(20, rx * 5), t, wA);
      // star confetti rains down and sticks
      if (t > CUE.billions) { const r = rng(515); for (let i = 0; i < 220; i++) { const lx = (r() - 0.5) * 560, ly = (r() - 0.5) * 560, ti = CUE.billions + 0.2 + r() * 1.8, sz = 2.5 + r() * 4, col = r() < 0.3 ? "#fff0b0" : RIM, sx = r() * W, ph = r() * TAU; if (lx * lx + ly * ly > 300 * 300) continue; const u = easeOut(clamp((t - ti) / 0.7)); if (u <= 0) continue; const p = galPt(x, y, go, lx, ly), px = lerp(sx, p[0], u), py = lerp(-40, p[1], u), tw = 0.6 + 0.4 * Math.sin(t * 3 + ph); dot(c, px, py, sz * tw * lerp(1, 0.4, d3), col, (1 - d3) * (0.6 + 0.4 * tw)); if (u > 0.98 && tw > 0.93) { c.save(); c.translate(px, py); cut(c, SH.star(9), "#fff6d0", { seed: 1, rim: 0, shadow: 0, alpha: (1 - d3) }); c.restore(); } } }
      // flare: the whisper glints back
      const fl = span2(t, CUE.flare, 47.4); if (fl > 0) { c.save(); c.translate(x, y); c.rotate(t * 0.8); c.scale(0.4 + fl, 0.4 + fl); cut(c, SH.star(34, 4, 0.22), "#fff6d0", { seed: 2, rim: 0, shadow: 0, alpha: fl }); c.restore(); }
    }
    // our galaxy and the tape measure
    const mw = ease(ramp(t, CUE.distance + 0.2, 0.9)) * (1 - ease(ramp(t, CUE.billions, 0.8)));
    if (mw > 0) {
      const mx = lerp(-300, 390, mw), my = 610; galaxy(c, mx, my, { rx: 175, incl: 0.55, tilt: 0.25, rot: t * 0.03, pal: PAL_MW, seed: 11, t });
      const tp = ease(ramp(t, CUE.distance + 0.8, 1.0)), a: P = [mx + 150, my - 20], b: P = [1215, 470], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      if (tp > 0) {
        c.save(); c.translate(a[0], a[1]); c.rotate(ang); const len = L * tp;
        jagFill(c, [[0, -17], [len, -17], [len, 17], [0, 17]], YELLOW, mw, 140, 1.2, 3);
        for (let q = 30; q < len; q += 30) stroke(c, [[q, -17], [q, (q / 30) % 5 === 0 ? 4 : -6]], INK, 2.5, { alpha: mw });
        cut(c, SH.ell(42), ORANGE, { seed: 141, rim: 3.5, alpha: mw }); dot(c, 0, 0, 12, "#b8401f", mw);
        // a speck of light on its way to us
        const ph = ramp(t, CUE.distance + 1.5, 2.2); if (ph > 0 && ph < 1) { const px = L * (1 - ph); for (let q = 1; q < 6; q++) dot(c, px + q * 14, 0, 6 - q, "#fff6d0", 0.5 * mw); c.save(); c.translate(px, -2); c.rotate(t * 3); cut(c, SH.star(14), "#fff6d0", { seed: 3, rim: 0, shadow: 0, alpha: mw }); c.restore(); }
        c.restore();
      }
    }
    caption(c, "AN ENTIRE GALAXY", 960, 92, t, CUE.galaxy + 0.05, CUE.distance - 0.15, { cap: 48 });
    caption(c, "OVER 2 MILLION LIGHT-YEARS", 820, 800, t, CUE.distance + 1.0, CUE.billions - 0.25, { cap: 34 });
    caption(c, "HUNDREDS OF BILLIONS OF STARS", 960, 92, t, CUE.billions + 0.05, CUE.whisper - 0.2, { cap: 42 });
    caption(c, "A WHISPER OF NOTHING", 960, 640, t, CUE.whisper + 0.9, CUE.beginning - 0.3, { cap: 36 });
  }

  // ---------------------------------------------------------------- G: the hill again, the door in the sky
  if (t > 46.8) {
    const up = ease(ramp(t, 46.9, 1.3)), gy = 900 + (1 - up) * 420 + 420 * ease(ramp(t, CUE.kept - 0.35, 0.6)); // the hill falls away as we fly up into the door
    const zE = ease(ramp(t, CUE.kept, 1.9)), Zm = Math.exp(Math.log(3.2) * zE), DC: P = [960, 380];
    c.save(); c.translate(DC[0], DC[1]); c.scale(Zm, Zm); c.translate(-DC[0], -DC[1]);
    const inside = (seed: number, n: number, w: number, h: number, cx: number, cy: number) => (cc: Ctx) => { const r = rng(seed); for (let i = 0; i < n; i++) sticker(cc, env, Math.floor(r() * 8), cx + (r() - 0.5) * w * 0.9, cy + (r() - 0.5) * h * 0.9, (0.25 + r() * 0.35) * Math.min(w, h), r() * TAU + t * 0.05 * (r() - 0.5), 1); };
    const FL: [number, number, number, number][] = [[330, 290, 200, 250], [1590, 280, 210, 250], [560, 520, 160, 180], [1370, 540, 170, 190], [140, 600, 150, 180], [1780, 590, 150, 180]];
    const lines = ease(ramp(t, 47.4, 0.9));
    FL.forEach(([fx, fy, fw, fh], i) => { const op = ease(ramp(t, CUE.reveal + i * 0.42, 0.7)); flap(c, env, t, fx, fy, fw, fh, op, ramp(t, 50.3 + i * 0.1, 0.6), inside(600 + i, 5 + (i % 3) * 3, fw, fh, fx, fy), i); });
    // the main door, and the rooms beyond it
    const dOpen = ease(ramp(t, CUE.door + 0.3, 1.0)), dw = 250, dh = 340;
    flap(c, env, t, DC[0], DC[1], dw, dh, dOpen, lines, (cc) => {
      inside(700, 9, dw, dh, DC[0], DC[1])(cc);
      const NF: [number, number, number, number][] = [[-62, -90, 70, 90], [60, -70, 64, 80], [-50, 30, 60, 70], [58, 40, 66, 76]];
      NF.forEach(([nx, ny, nw, nh], i) => flap(cc, env, t, DC[0] + nx, DC[1] + ny, nw, nh, ease(ramp(t, 54.0 + i * 0.35, 0.6)), ramp(t, 53.3, 0.5), inside(800 + i, 4, nw, nh, DC[0] + nx, DC[1] + ny), i));
    }, 9);
    // the golden knob: the smudge that was Andromeda
    const knobA = ramp(t, 47.2, 0.5) * (1 - dOpen * 0.0);
    if (knobA > 0) { const kx = DC[0] + dw / 2 - 26 + (dOpen > 0 ? (Math.cos(dOpen * 2) - 1) * (dw - 26) : 0) + 0, ky = DC[1] + 8; c.save(); c.translate(kx, ky); cut(c, SH.ell(13), YELLOW, { seed: 150, rim: 2.5, alpha: knobA * (Math.cos(dOpen * 2) > 0 ? 1 : 0) }); c.restore(); }
    // light spills onto the hill
    if (dOpen > 0) { c.save(); c.globalAlpha = 0.22 * dOpen; c.fillStyle = "#fbe3a0"; c.beginPath(); c.moveTo(DC[0] - dw / 2, DC[1] + dh / 2); c.lineTo(DC[0] + dw / 2, DC[1] + dh / 2); c.lineTo(DC[0] + 420, gy + 80); c.lineTo(DC[0] - 420, gy + 80); c.closePath(); c.fill(); c.restore(); }
    c.save(); c.translate(0, gy - 900);
    cut(c, SH.poly("gHillB", hillPts(0).map(([x, y]) => [x, y + 880 - 20 * Math.sin(x * 0.003)] as P)), GRASS_N2, { seed: 160, rim: 4, amp: 2.5 });
    cut(c, SH.poly("gHillF", hillPts(0).map(([x, y]) => [x, y + 905 + 18 * Math.sin(x * 0.005 + 1)] as P)), GRASS_N, { seed: 161, rim: 4, amp: 2.5 });
    const cheer = ease(ramp(t, CUE.reveal - 1.2, 0.5));
    kid(c, 790, 925, t, { body: ORANGE, seed: 3, ly: -0.9, lx: 0.5, armL: lerp(0.25, 2.6, cheer), armR: lerp(0.25, 2.6, cheer), wow: ease(ramp(t, CUE.door + 0.6, 0.4)) });
    kid(c, 1130, 925, t, { body: "#8a5a3c", head: PEACH, hat: true, pipe: true, seed: 7, s: 1.05, ly: -0.9, lx: -0.5, armL: lerp(0.3, 2.9, ease(ramp(t, CUE.door - 0.2, 0.5))) });
    c.restore();
    c.restore();
    caption(c, "JUST THE BEGINNING", 960, 92, t, CUE.beginning + 0.05, CUE.door - 0.15, { cap: 44 });
    caption(c, "HUBBLE OPENED THE DOOR", 960, 92, t, CUE.door + 0.05, CUE.reveal - 0.2, { cap: 44 });
    caption(c, "THE UNIVERSE KEPT REVEALING ITSELF", 960, 92, t, CUE.reveal + 0.05, CUE.kept - 0.2, { cap: 38 });
    caption(c, "IT KEPT GOING", 960, 880, t, CUE.kept + 0.05, 99, { cap: 50 });
    caption(c, "AND GOING", 960, 985, t, CUE.going + 0.05, 99, { cap: 50, paper: "#f7d774" });
  }

  // ---------------------------------------------------------------- captions over the night sheet
  if (t < 23.6) {
    caption(c, "WE THOUGHT WE KNEW", 470, 110, t, 0.15, CUE.years - 0.1, { cap: 44 });
    caption(c, "FOR THOUSANDS OF YEARS", 520, 110, t, CUE.years + 0.1, CUE.called - 0.25, { cap: 40 });
    caption(c, "AND CALLED IT", 420, 150, t, CUE.called, 9.3, { cap: 36 });
    ransom(c, "EVERYTHING", 470, 290, 62, t, CUE.everything, 9.3);
    caption(c, "THE MILKY WAY", 960, 92, t, CUE.milky + 0.05, CUE.our - 0.15, { cap: 46 });
    caption(c, "OUR GALAXY", 960, 92, t, CUE.our + 0.05, CUE.uni - 0.15, { cap: 46 });
    caption(c, "THE UNIVERSE ITSELF", 960, 92, t, CUE.uni + 0.05, CUE.island - 0.15, { cap: 46 });
    caption(c, "A SINGLE ISLAND OF LIGHT", 960, 92, t, CUE.island + 0.05, CUE.dark - 0.15, { cap: 44 });
    caption(c, "ETERNAL DARKNESS", 960, 1000, t, CUE.dark + 0.3, CUE.wrong - 0.1, { cap: 36, paper: "#2a2c3c", ink: RIM, exitY: 40 });
    caption(c, "NOT JUST WRONG", 960, 92, t, CUE.wrong + 0.02, CUE.offby - 0.15, { cap: 50, paper: RED, ink: RIM });
    caption(c, "OFF BY A FACTOR OF", 960, 92, t, CUE.offby + 0.05, CUE.trillion - 0.15, { cap: 44 });
    caption(c, "TWO TRILLION", 960, 92, t, CUE.trillion + 0.05, 22.5, { cap: 56, paper: YELLOW });
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.drawImage(paperTex(env).canvas as CanvasImageSource, 0, 0);
};
// a bump up and back down between a and b
function span2(t: number, a: number, b: number) { const m = (a + b) / 2; return t < a || t > b ? 0 : t < m ? ease((t - a) / (m - a)) : 1 - ease((t - m) / (b - m)); }

// ================================================================ the score: soft pads, music-box notes, paper sounds
const audio = (sr: number): [Float32Array, Float32Array] => {
  const N = Math.round((DURATION / FPS) * sr), L = new Float32Array(N), R = new Float32Array(N), mtof = (m: number) => 440 * 2 ** ((m - 69) / 12), r = rng(31337);
  const add = (i: number, v: number, pan: number) => { if (i < 0 || i >= N) return; L[i] += v * (1 - pan) * 0.5 * 1.4; R[i] += v * (1 + pan) * 0.5 * 1.4; };
  // pads: one chord per section, overlapping crossfades
  const PAD: [number, number, number[], number][] = [
    [0, 9.9, [48, 55, 64, 71], 1], [9.3, 15.9, [53, 60, 64, 69], 1], [15.4, 18.5, [50, 57, 62, 65], 0.7], [18.2, 23.3, [43, 55, 62, 69, 74], 1],
    [22.9, 29.3, [45, 57, 60, 64], 0.9], [28.9, 37.5, [50, 57, 60, 65], 0.85], [37.1, 47.3, [48, 55, 64, 67, 74], 1.1], [47.0, 51.3, [53, 60, 65, 69, 72], 1], [51.0, 54.0, [55, 62, 67, 71, 74], 1.05], [53.7, 55.72, [48, 60, 64, 67, 72, 76], 1.1],
  ];
  for (const [a, b, notes, g] of PAD) {
    const i0 = Math.floor(a * sr), i1 = Math.min(N, Math.floor((b + 1.2) * sr));
    notes.forEach((m, vi) => { const f = mtof(m), amp = (0.02 * g) / Math.sqrt(notes.length / 4) * (m < 50 ? 1.2 : 1), pan = (vi / (notes.length - 1) - 0.5) * 0.6, ph = r() * TAU;
      for (let i = i0; i < i1; i++) { const tt = i / sr, e = clamp((tt - a) / 1.2) * clamp((b + 1.2 - tt) / 1.2), w = 2 * Math.PI * f * tt + ph, v = Math.sin(w) + 0.22 * Math.sin(2 * w) + 0.5 * Math.sin(w * 1.003 + 1.1) + 0.08 * Math.sin(3 * w); add(i, v * e * e * amp * (0.85 + 0.15 * Math.sin(tt * 0.9 + vi)), pan); } });
  }
  // music box
  const bell = (t0: number, m: number, amp: number, pan: number, dec = 1.2) => { const f = mtof(m), i0 = Math.floor(t0 * sr), n = Math.floor(dec * 3.5 * sr); for (let k = 0; k < n; k++) { const tt = k / sr, w = 2 * Math.PI * f * tt, e = Math.min(1, tt / 0.004) * Math.exp(-tt / dec); add(i0 + k, amp * e * (Math.sin(w) + 0.35 * Math.sin(2 * w) * Math.exp(-tt / (dec * 0.4)) + 0.12 * Math.sin(3.01 * w) * Math.exp(-tt / (dec * 0.25)) + 0.05 * Math.sin(5.4 * w) * Math.exp(-tt / (dec * 0.12))), pan); } };
  for (const [a, b, notes, g] of PAD) { let tt = a + 0.4 + r() * 0.3; const pool = notes.flatMap((m) => [m + 12, m + 24]).filter((m) => m >= 64 && m <= 91); while (tt < b - 0.2) { bell(tt, pool[Math.floor(r() * pool.length)], 0.028 * g, (r() - 0.5) * 0.8); tt += 0.45 + r() * 0.55; } }
  const arp = (t0: number, ms: number[], step = 0.07, amp = 0.05) => ms.forEach((m, i) => bell(t0 + i * step, m, amp, (i / ms.length - 0.5) * 0.8, 1.6));
  arp(CUE.everything, [72, 76, 79, 84, 88, 91]); arp(CUE.our, [77, 81, 84, 89], 0.08, 0.035); arp(CUE.galaxy, [72, 76, 79, 83, 86, 88, 91], 0.08, 0.055);
  arp(CUE.door + 0.3, [77, 81, 84, 88, 89], 0.09, 0.05); for (let i = 0; i < 6; i++) bell(CUE.reveal + i * 0.42 + 0.1, [79, 83, 86, 91, 88, 95][i], 0.04, (i / 5 - 0.5) * 1.2, 1.4);
  arp(CUE.kept, [72, 79, 84, 88, 91, 96], 0.1, 0.05); arp(CUE.going, [76, 79, 84, 88], 0.12, 0.035);
  for (let tt = CUE.billions + 0.2; tt < CUE.billions + 2.1; tt += 0.06 + r() * 0.06) bell(tt, [84, 86, 88, 91, 93, 96][Math.floor(r() * 6)], 0.012, (r() - 0.5) * 1.4, 0.6);
  // paper: short filtered noise, a rip, scissor snips, crayon scratches, whooshes
  const noise = (t0: number, dur: number, amp: number, lp: number, hp: number, shape: (u: number) => number, pan = 0) => { const i0 = Math.floor(t0 * sr), n = Math.floor(dur * sr), q = rng(Math.floor(t0 * 1000)); let a1 = 0, a2 = 0; for (let k = 0; k < n; k++) { const x = q() * 2 - 1; a1 += lp * (x - a1); a2 += hp * (a1 - a2); add(i0 + k, (a1 - a2) * amp * shape(k / n), pan); } };
  const rustle = (t0: number, amp = 0.16, pan = 0) => noise(t0, 0.12, amp, 0.5, 0.08, (u) => Math.min(1, u * 12) * Math.pow(1 - u, 2) * (0.6 + 0.4 * Math.sin(u * 60)), pan);
  [0.15, 0.7, 3.1, 4.5, 5.9, CUE.years + 0.1, CUE.called, CUE.milky, CUE.our, CUE.our + 0.4, CUE.uni, CUE.island, CUE.wrong, CUE.offby, CUE.trillion, CUE.y1929 - 0.2, CUE.hubble + 0.6, CUE.smudge + 0.2, CUE.andro + 0.2, CUE.impossible, CUE.gas, CUE.star, CUE.galaxy, CUE.distance + 0.2, CUE.distance + 1.0, CUE.billions, CUE.whisper + 0.9, CUE.beginning, CUE.door, CUE.reveal, CUE.kept, CUE.going]
    .forEach((tt, i) => rustle(tt, 0.14, ((i % 5) - 2) * 0.2));
  for (let i = 0; i < 10; i++) rustle(CUE.everything + i * 0.07, 0.07, (i / 9 - 0.5) * 0.8);
  for (let i = 0; i < 4; i++) noise(CUE.dark + i * 0.18, 0.9, 0.09, 0.2, 0.02, (u) => Math.sin(u * Math.PI) ** 2, [0, 0, -0.6, 0.6][i]);
  noise(18.3, 0.85, 0.3, 0.6, 0.05, (u) => Math.min(1, u * 30) * (1 - u) * (0.4 + 0.6 * ((Math.floor(u * 90) * 7919) % 13 > 5 ? 1 : 0.25)));
  for (let tt = CUE.uni + 0.2; tt < CUE.uni + 1.55; tt += 0.19) noise(tt, 0.03, 0.12, 0.8, 0.3, (u) => 1 - u);
  for (let i = 0; i < 10; i++) noise(CUE.y1929 + i * 0.09, 0.07, 0.07, 0.5, 0.1, (u) => Math.sin(u * Math.PI));
  [33.35, 35.85].forEach((tt) => { noise(tt, 0.25, 0.1, 0.35, 0.1, (u) => Math.sin(u * Math.PI) * (0.5 + 0.5 * Math.sin(u * 40))); noise(tt + 0.25, 0.25, 0.1, 0.35, 0.1, (u) => Math.sin(u * Math.PI) * (0.5 + 0.5 * Math.sin(u * 40))); });
  [22.7, 28.99, CUE.galaxy, CUE.kept].forEach((tt) => noise(tt, 1.0, 0.1, 0.06, 0.01, (u) => Math.sin(u * Math.PI) ** 2));
  for (let i = 0; i < N; i++) { L[i] = Math.tanh(L[i] * 1.2) * 0.85; R[i] = Math.tanh(R[i] * 1.2) * 0.85; }
  return [L, R];
};

export const andromedaCollage: Film = {
  meta: { title: "andromedaCollage", W, H, fps: FPS, bpm: 120, durationFrames: DURATION },
  assets: { images: {} },
  shots: [{ id: "collage", start: 0, end: DURATION, draw }],
  audio,
};
