import { Gfx, rng, heart, type Ctx, type Env, type P } from "./core";
import { Film } from "./film";
import { clamp, lerp } from "./gallery";
import {
  W, H, FPS, OUT, CREAM, YEL, DIM, PINK, RED, GREEN, FLAT, BG_OUT,
  RED_B, GRN_B, BLU_B, YEL_B, CYAN_B, GREY_B, NEU_B, PRO_B, EARTH_B, SUN_B,
  ease, easeOut, back, ramp, span, space, grainOver, layer, blit, text, glow, inked, ball, motes, check,
} from "./spaceStyle";

// PALE BLUE DOT · one continuous 95.1 s shot. One camera: it starts behind Voyager 1, falls into
// the dot, lands on the horizon, walks the whole of human history along it, then pulls all the
// way back out until the dot is a speck on a tiny stage inside a vast arena.
// Timing: no transcript timestamps, so speech was mapped from a syllable-flux envelope of the MP3
// (speech 4.0-84.1 s, music tail to 95.1 s); every beat below starts on its phrase.
//
//  time   narration                               visual
//  0-4    (music)                                 Voyager 1 drifts past in the dark, scan platform turning back
//  4.0    From this distant vantage point          camera slides past the craft; scattered sunlight rays; 6 BILLION KM
//  6.3    the Earth might not seem...              viewfinder draws on; a 0.12-pixel dot in a ray; NOTHING SPECIAL?
//  10.75  But for us, it's different               the rays dim, the dot warms; a dashed ring closes in
//  14.3   Consider again that dot                  the camera starts falling into the dot
//  16.6   That's here / home / us                  pin drops; the dot becomes a globe; HERE. HOME. US.
//  20.65  On it                                     the globe fills the frame; we land on the night-side horizon
//  21.6   everyone you love                         a grandmother, a friend, a kid, a dog; warm threads, a heart
//  22.5   everyone you know                         a dozen more people join; a web of threads
//  24.05  everyone you ever heard of                camera eases up; the crowd runs off both edges
//  26.3   every human being who ever was            people become lights across the planet; 117 BILLION
//  29.4   lived out their lives                     lights are born, glow, go out, others replace them
//  33.3   our joy and suffering                     a warm and a cold ribbon braid up out of the planet
//  35.9   thousands of confident religions          domes, spires, pagodas, arches rise along the limb
//  38.4   ideologies / economic doctrines           flags go up; a market line zig-zags across the sky
//  41.75  every hunter and forager ... saint        a tracking shot along the horizon: twelve tableaux, each
//         and sinner                                arriving on its words (hunter, hero, creator, king, couple,
//                                                   family, inventor, teacher, politician, star, leader, saint)
//  68.4   in the history of our species            the camera lifts off: the whole parade shrinks into the globe
//  70.2   lived there                               ... into the dot
//  71.8   on a mote of dust                         dust drifts around it
//  73.3   suspended in a sunbeam                    a beam sweeps in; the dust lights up
//  77.2   The Earth is a very small stage           a tiny proscenium; curtains open on the dot; a spotlight
//  80.9   in a vast cosmic arena                    pull back: tier after tier of stars and galaxies around it
//  84-95  (music)                                   the arena keeps widening; PALE BLUE DOT; slow settle

const DURATION = 2853; // 95.10 s (audio 95.112 s)
const CUE = {
  voyager: 1.0, vantage: 4.0, earth: 6.34, interest: 8.0, but: 10.75, different: 12.41, consider: 14.29,
  here: 16.6, home: 17.94, us: 18.92, onit: 20.65, love: 21.59, know: 22.47, heard: 24.05, human: 26.29, lived: 29.44,
  joy: 33.32, suffering: 34.6, thousands: 35.89, ideologies: 38.4, doctrines: 39.7,
  hunter: 41.75, hero: 44.1, creator: 45.51, king: 48.63, couple: 51.21, mother: 53.26, child: 55.0, inventor: 56.64,
  teacher: 58.91, politician: 62.45, superstar: 65.01, leader: 66.65, saint: 67.54, history: 68.6,
  there: 70.23, mote: 71.79, sunbeam: 73.34, stage0: 77.24, stage: 78.33, arena: 80.91, title: 86.0, sagan: 87.4,
};
const D0: P = [1250, 590]; // where the dot sits in Voyager's frame

// ================================================================ camera: one zoom, keyframed
// Each key moves the planet (centre x, y, radius) during [t0, t1]. Between two states the move is a
// true zoom about the one fixed point that maps the first onto the second, so nothing slides.
type Cam = { x: number; y: number; r: number };
const KEYS: [number, number, number, number, number][] = [
  [CUE.consider, 20.55, 1150, 560, 330],
  [CUE.onit, 21.95, 960, 790 + 4200, 4200],
  [21.95, CUE.heard, 960, 800 + 4400, 4400],
  [CUE.heard, 25.6, 960, 760 + 2600, 2600],
  [25.7, 29.4, 960, 650 + 1150, 1150],
  [29.4, CUE.joy, 960, 630 + 1060, 1060],
  [CUE.joy, 41.25, 960, 690 + 1350, 1350],
  [41.3, 42.35, 960, 800 + 5200, 5200],
  [68.35, 72.1, 960, 520, 3],
  [72.1, 80.9, 1000, 500, 3.3],
  [80.9, 86.0, 960, 450, 2.6],
];
const zoomTo = (a: Cam, b: Cam, e: number): Cam => {
  const k = b.r / a.r;
  if (Math.abs(k - 1) < 1e-4) return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), r: lerp(a.r, b.r, e) };
  const zx = (b.x - a.x * k) / (1 - k), zy = (b.y - a.y * k) / (1 - k), ke = Math.pow(k, e);
  return { x: zx + (a.x - zx) * ke, y: zy + (a.y - zy) * ke, r: a.r * ke };
};
const cam = (t: number): Cam => {
  let s: Cam = { x: D0[0], y: D0[1], r: 2.2 };
  for (const [t0, t1, x, y, r] of KEYS) { if (t <= t0) break; s = zoomTo(s, { x, y, r }, ease(clamp((t - t0) / (t1 - t0)))); }
  return s;
};

// ---- the tracking shot along the horizon: planet rotation θ. Tableaux sit where the camera settles.
const PAIRS = [CUE.hunter, CUE.hero, CUE.creator, CUE.king, CUE.couple, CUE.mother, CUE.inventor, CUE.teacher, CUE.politician, CUE.superstar, CUE.leader, CUE.saint];
const DPH = 560 / 5200;
const theta = (t: number) => {
  let th = 0.004 * (t - 20);
  if (t > 41.3) th = 0.004 * 21.3 + 0.0012 * (t - 41.3) + 0.03 * ease(ramp(t, 41.3, 1.0));
  for (let i = 1; i < PAIRS.length; i++) th += DPH * ease(ramp(t, PAIRS[i] - 0.42, 0.85));
  return th;
};
const PHI = PAIRS.map((c) => theta(c + 0.5));
// planet-attached point: angle φ on the limb, rr = fraction of the radius from the centre
const onPlanet = (k: Cam, th: number, phi: number, rr = 1): P => [k.x + Math.sin(phi - th) * k.r * rr, k.y - Math.cos(phi - th) * k.r * rr];

// ================================================================ the planet
const CONT: [number, number, number][] = [ // lon, lat, angular radius (rad): rough continents in blobs
  [-1.75, 0.7, 0.32], [-1.6, 0.35, 0.22], [-1.3, 0.95, 0.25], [-1.0, -0.2, 0.2], [-1.05, -0.5, 0.18], [-1.2, -0.05, 0.12],
  [0.35, 0.18, 0.28], [0.4, -0.25, 0.24], [0.25, 0.8, 0.2], [0.05, 0.6, 0.12], [0.8, 0.45, 0.16],
  [1.4, 0.8, 0.36], [1.8, 0.55, 0.3], [1.35, 0.4, 0.16], [2.3, 0.62, 0.18], [1.85, 0.05, 0.14],
  [2.35, -0.45, 0.2], [0.0, -1.35, 0.4], [-2.0, 1.25, 0.25],
];
const CLOUD: [number, number, number][] = Array.from({ length: 14 }, (_, i) => { const r = rng(900 + i); return [r() * 6.28, (r() - 0.5) * 2.2, 0.08 + r() * 0.12]; });
const projBlob = (x: number, y: number, R: number, lon0: number, lat0: number, rad: number, spin: number, seed: number): P[] | null => {
  const tilt = 0.32, ct = Math.cos(tilt), st = Math.sin(tilt), rr = rng(seed), pts: P[] = [];
  const pr = (lon: number, lat: number): [number, number, number] => { const L = lon + spin, px = Math.cos(lat) * Math.sin(L), py = -Math.sin(lat), pz = Math.cos(lat) * Math.cos(L); return [px * ct - py * st, px * st + py * ct, pz]; };
  if (pr(lon0, lat0)[2] < -0.1) return null;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * 6.283, k = rad * (0.75 + rr() * 0.45);
    let [px, py, pz] = pr(lon0 + (Math.cos(a) * k) / Math.max(0.25, Math.cos(lat0)), clamp(lat0 + Math.sin(a) * k, -1.55, 1.55));
    if (pz < 0) { const l = Math.hypot(px, py) || 1; px /= l; py /= l; }
    pts.push([x + px * R, y + py * R]);
  }
  return pts;
};
const fillPts = (c: Ctx, pts: P[], col: string, a: number) => { c.globalAlpha = a; c.fillStyle = col; c.beginPath(); pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py))); c.closePath(); c.fill(); };
const planet = (c: Ctx, k: Cam, t: number, a: number) => {
  const { x, y, r: R } = k; if (a <= 0) return;
  if (R < 5) { glow(c, x, y, 26, "150,200,255", 0.55 * a); c.save(); c.globalAlpha = a; c.fillStyle = "#d6ebff"; c.beginPath(); c.arc(x, y, Math.max(1.2, R), 0, 6.283); c.fill(); c.restore(); return; }
  const night = clamp(Math.log(R / 420) / Math.log(1500 / 420)), atm = Math.min(R * 0.1, 70);
  // atmosphere: a thin blue halo outside the limb (only the on-screen part is filled)
  c.save(); c.globalAlpha = a;
  const ag = c.createRadialGradient(x, y, R * 0.985, x, y, R + atm); ag.addColorStop(0, `rgba(111,190,255,${0.55 - 0.2 * night})`); ag.addColorStop(0.35, "rgba(95,160,255,0.2)"); ag.addColorStop(1, "rgba(95,160,255,0)");
  c.fillStyle = ag; c.beginPath(); c.rect(Math.max(-10, x - R - atm), Math.max(-10, y - R - atm), Math.min(W + 20, 2 * (R + atm)), Math.min(H + 20, 2 * (R + atm))); c.fill();
  c.restore();
  if (night < 1) {
    const dA = a;
    ball(c, x, y, R, EARTH_B, { alpha: dA, outline: Math.min(10, Math.max(2.5, R * 0.12)) });
    c.save(); c.beginPath(); c.arc(x, y, R, 0, 6.283); c.clip();
    const spin = t * 0.09 - 0.6;
    CONT.forEach(([lo, la, rd], i) => { const p = projBlob(x, y, R, lo, la, rd, spin, 40 + i); if (p) fillPts(c, p, GRN_B[1], dA); const q = projBlob(x - R * 0.02, y - R * 0.02, R, lo, la, rd * 0.6, spin, 70 + i); if (q) fillPts(c, q, GRN_B[2], dA * 0.8); });
    CLOUD.forEach(([lo, la, rd], i) => { const p = projBlob(x, y, R, lo, la, rd, spin * 1.25 + 0.4, 140 + i); if (p) fillPts(c, p, CREAM, dA * 0.55); });
    const tg = c.createLinearGradient(x - R * 0.1, y, x + R, y); tg.addColorStop(0, "rgba(21,18,43,0)"); tg.addColorStop(1, "rgba(21,18,43,0.6)");
    c.globalAlpha = dA; c.fillStyle = tg; c.fillRect(x - R, y - R, 2 * R, 2 * R);
    c.restore();
    c.save(); c.globalAlpha = dA * 0.85; c.strokeStyle = "#fff8ec"; c.lineWidth = Math.max(1.5, R * 0.05); c.lineCap = "round"; c.beginPath(); c.arc(x, y, R * 0.8, Math.PI * 1.1, Math.PI * 1.36); c.stroke(); c.restore();
  }
  if (night > 0) {
    c.save(); c.globalAlpha = a * night;
    c.fillStyle = OUT; c.beginPath(); c.arc(x, y, R + 6, 0, 6.283); c.fill();
    const ng = c.createRadialGradient(x, y - R, 0, x, y - R, Math.min(R, 900)); ng.addColorStop(0, "#1c2d63"); ng.addColorStop(1, "#0f1636");
    c.fillStyle = ng; c.beginPath(); c.arc(x, y, R, 0, 6.283); c.fill();
    c.strokeStyle = EARTH_B[2]; c.lineWidth = Math.min(12, R * 0.012); c.beginPath(); c.arc(x, y, R - c.lineWidth / 2, 0, 6.283); c.stroke();
    c.strokeStyle = EARTH_B[3]; c.globalAlpha = a * night * 0.7; c.lineWidth = 2.5; c.beginPath(); c.arc(x, y, R - 1, 0, 6.283); c.stroke();
    c.restore();
  }
};

// ---- the lights of every human who ever lived (planet-attached, each with its own life)
type Lt = { phi: number; rr: number; born: number; life: number; s: number; warm: boolean };
const LIGHTS: Lt[] = (() => { const r = rng(4040), o: Lt[] = []; for (let i = 0; i < 1700; i++) { const u = r(); o.push({ phi: -0.95 + r() * 3.0, rr: 1 - 0.72 * u * u - 0.004, born: CUE.human + Math.pow(r(), 0.7) * 3.2, life: r() < 0.35 ? 2.5 + r() * 3 : 99, s: 1 + r() * 2.2, warm: r() > 0.25 }); } return o; })();
const lights = (c: Ctx, k: Cam, th: number, t: number, a: number) => {
  if (a <= 0 || k.r < 60) return;
  c.save();
  for (const L of LIGHTS) {
    let al = ramp(t, L.born, 0.35);
    if (L.life < 99) { const die = L.born + L.life; al *= 1 - ramp(t, die, 0.6); if (t > die + 0.6 && t > CUE.lived) { const re = die + 1.1 + (L.s * 3) % 2; al = ramp(t, re, 0.4); } }
    if (al <= 0) continue;
    const [x, y] = onPlanet(k, th, L.phi, L.rr); if (x < -10 || x > W + 10 || y < -10 || y > H + 10) continue;
    const sz = L.s * clamp(k.r / 1100, 0.5, 1.6), tw = 0.7 + 0.3 * Math.sin(t * 2.1 + L.phi * 90);
    c.globalAlpha = a * al * 0.35 * tw; c.fillStyle = L.warm ? "#ffb347" : "#9fd0ff"; c.beginPath(); c.arc(x, y, sz * 3, 0, 6.283); c.fill();
    c.globalAlpha = a * al * tw; c.fillStyle = L.warm ? "#ffe9b8" : "#e3f2ff"; c.beginPath(); c.arc(x, y, sz, 0, 6.283); c.fill();
  }
  c.restore();
};

// ================================================================ people (local units: a person is 100 tall, feet at 0)
const SKINS = [["#6b3f26", "#9a6240", "#c68a5e", "#e8b893"], ["#8a5a3c", "#c68a5e", "#e0ad84", "#f6d6b8"], ["#40251a", "#6e4330", "#9a6446", "#c99270"], ["#7a4e2c", "#b07a4a", "#d8a26c", "#f0caa0"]];
const SHIRTS = [PRO_B, NEU_B, GRN_B, BLU_B, YEL_B, CYAN_B, RED_B, GREY_B];
type Pose = { skin: number; shirt: string[]; aL: [number, number]; aR: [number, number]; lean?: number; spread?: number; crouch?: number; dress?: boolean; hair?: string; pants?: string };
type Body = { hL: P; hR: P; head: P };
const person = (c: Ctx, x: number, p: Pose, a: number): Body => {
  const cr = p.crouch ?? 0, lean = p.lean ?? 0, sp = p.spread ?? 9, pants = p.pants ?? "#3a355f";
  const hipY = -46 + cr * 16, hip: P = [x + lean * 0.3, hipY], neck: P = [x + lean, -80 + cr * 22], head: P = [neck[0] + lean * 0.2, neck[1] - 13], sh: P = [neck[0], neck[1] + 6];
  const arm = (a1: number, a2: number): P[] => { const e: P = [sh[0] + Math.sin(a1) * 20, sh[1] + Math.cos(a1) * 20]; return [sh, e, [e[0] + Math.sin(a1 + a2) * 19, e[1] + Math.cos(a1 + a2) * 19]]; };
  const L = arm(p.aL[0], p.aL[1]), R = arm(p.aR[0], p.aR[1]);
  inked(c, L, p.shirt[0], 6.5, { alpha: a });
  for (const s of [-1, 1]) inked(c, [hip, [x + s * sp * 0.55 + cr * 10, hipY * 0.5 - cr * 6], [x + s * sp, 0]], pants, 7.5, { alpha: a });
  c.save(); c.globalAlpha = a; c.lineJoin = "round";
  const body = () => { c.beginPath(); if (p.dress) { c.moveTo(neck[0] - 8, neck[1] + 2); c.lineTo(neck[0] + 8, neck[1] + 2); c.lineTo(hip[0] + 17, -22 + cr * 10); c.lineTo(hip[0] - 17, -22 + cr * 10); } else { c.moveTo(neck[0] - 9, neck[1] + 2); c.lineTo(neck[0] + 9, neck[1] + 2); c.lineTo(hip[0] + 8, hipY + 2); c.lineTo(hip[0] - 8, hipY + 2); } c.closePath(); };
  body(); c.strokeStyle = OUT; c.lineWidth = 6; c.stroke(); c.fillStyle = p.shirt[1]; c.fill();
  c.save(); body(); c.clip(); c.fillStyle = p.shirt[2]; c.fillRect(neck[0] - 20, neck[1], 9 + lean * 0.3, 70); c.restore();
  c.restore();
  ball(c, head[0], head[1], 10, SKINS[p.skin], { alpha: a, outline: 2.8 });
  if (p.hair) { c.save(); c.globalAlpha = a; c.fillStyle = p.hair; c.beginPath(); c.arc(head[0], head[1] - 1.5, 10.2, Math.PI * 1.05, Math.PI * 1.95); c.closePath(); c.fill(); c.restore(); }
  inked(c, R, p.shirt[1], 6.5, { alpha: a });
  c.save(); c.globalAlpha = a; c.fillStyle = SKINS[p.skin][2]; for (const h of [L[2], R[2]]) { c.beginPath(); c.arc(h[0], h[1], 3.6, 0, 6.283); c.fill(); } c.restore();
  return { hL: L[2], hR: R[2], head };
};
const randPose = (seed: number): Pose => { const r = rng(seed); const hair = ["#221a14", "#3b2416", "#6b4a2a", "#c9c4ea", "#120f24"][Math.floor(r() * 5)]; return { skin: Math.floor(r() * 4), shirt: SHIRTS[Math.floor(r() * SHIRTS.length)], aL: [-0.15 - r() * 0.3, -0.1], aR: [0.15 + r() * 0.4, 0.1 + r() * 0.3], lean: (r() - 0.5) * 6, spread: 7 + r() * 5, dress: r() > 0.65, hair }; };
// grow out of the ground (scale about the feet); `flip` mirrors to face left
const pop = (c: Ctx, x: number, s: number, fn: () => void, flip = false) => { if (s <= 0.001) return; c.save(); c.translate(x, 0); c.scale(flip ? -s : s, s); fn(); c.restore(); };
const star5 = (c: Ctx, x: number, y: number, r: number, col: string, a: number, rot = 0) => { if (r <= 0.2 || a <= 0) return; c.save(); c.globalAlpha = a; c.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r, an = rot - Math.PI / 2 + (i * Math.PI) / 5; c.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); } c.closePath(); c.lineJoin = "round"; c.strokeStyle = OUT; c.lineWidth = Math.max(2, r * 0.3); c.stroke(); c.fillStyle = col; c.fill(); c.restore(); };
const sparkle = (c: Ctx, x: number, y: number, s: number, a: number) => { if (a <= 0 || s <= 0) return; c.save(); c.globalAlpha = a; c.strokeStyle = "#fffaf0"; c.lineWidth = Math.max(1, s * 0.18); c.lineCap = "round"; c.beginPath(); c.moveTo(x - s, y); c.lineTo(x + s, y); c.moveTo(x, y - s); c.lineTo(x, y + s); c.stroke(); c.restore(); };
const blockR = (c: Ctx, x: number, y: number, w: number, h: number, col: string[], a: number) => { c.save(); c.globalAlpha = a; c.fillStyle = OUT; c.fillRect(x - w / 2 - 2.5, y - h - 2.5, w + 5, h + 5); c.fillStyle = col[1]; c.fillRect(x - w / 2, y - h, w, h); c.fillStyle = col[2]; c.fillRect(x - w / 2, y - h, w * 0.3, h); c.restore(); };
const dog = (c: Ctx, x: number, t: number, a: number) => {
  c.save(); c.globalAlpha = a; c.translate(x, 0);
  inked(c, [[-14, -18], [-15, 0]], "#6b4a2a", 4.5); inked(c, [[10, -18], [11, 0]], "#6b4a2a", 4.5);
  const wag = Math.sin(t * 11) * 0.5; inked(c, [[-18, -24], [-18 - 12 * Math.cos(0.9 + wag), -24 - 12 * Math.sin(0.9 + wag)]], "#b07a4a", 4);
  c.fillStyle = OUT; c.beginPath(); c.ellipse(-2, -22, 21, 10, 0, 0, 6.283); c.fill(); c.fillStyle = "#b07a4a"; c.beginPath(); c.ellipse(-2, -22, 18, 7.5, 0, 0, 6.283); c.fill();
  ball(c, 19, -33, 8.5, ["#6b4a2a", "#b07a4a", "#d8a26c", "#f0caa0"], { outline: 2.5 });
  c.fillStyle = "#6b4a2a"; c.beginPath(); c.ellipse(15, -34, 3.5, 7, 0.4, 0, 6.283); c.fill(); c.fillStyle = OUT; c.beginPath(); c.arc(27, -32, 2, 0, 6.283); c.fill();
  c.restore();
};

// ---- the twelve tableaux of the parade. Each gets its own local clock `lt` (0 at its words).
type Tab = { label: string; draw: (c: Ctx, lt: number, t: number) => void };
const S = (lt: number, d = 0) => back(clamp((lt - d) / 0.5));
const TABS: Tab[] = [
  { label: "HUNTER & FORAGER", draw: (c, lt, t) => {
    // the hunter faces left, cocks the spear and throws it off into the dark
    const cock = ease(ramp(lt, 0.3, 0.9)), thr = ramp(lt, 1.35, 0.25);
    pop(c, -70, S(lt), () => {
      const b = person(c, 0, { skin: 2, shirt: YEL_B, aL: [1.2, 0.2], aR: [2.4 + 0.5 * cock - 1.4 * thr, 0.3], lean: 5 - 3 * cock + 6 * thr, spread: 15, hair: "#221a14" }, 1);
      if (thr < 1) { const d: P = [Math.cos(-0.75), Math.sin(-0.75)]; inked(c, [[b.hR[0] - d[0] * 40, b.hR[1] - d[1] * 40], [b.hR[0] + d[0] * 55, b.hR[1] + d[1] * 55]], "#c68a5e", 3.5); star5(c, b.hR[0] + d[0] * 60, b.hR[1] + d[1] * 60, 5, GREY_B[3], 1, 0.9); }
      else { const f = lt - 1.6, sx = 40 + f * 420, sy = -110 - f * 240 + f * f * 160; if (f < 2.2) inked(c, [[sx - 45, sy + 30 - f * 20], [sx + 45, sy - 30 + f * 20]], "#c68a5e", 3.5, { alpha: 1 - ramp(f, 1.6, 0.5) }); }
    }, true);
    pop(c, 65, S(lt, 0.25), () => {
      const reach = Math.sin(clamp(lt / 3) * Math.PI * 3) * 0.2;
      person(c, 0, { skin: 0, shirt: GRN_B, aL: [0.3, 0.3], aR: [0.9 + reach, 0.6], crouch: 0.55, lean: 9, dress: true, hair: "#3b2416" }, 1);
      c.save(); c.fillStyle = OUT; c.beginPath(); c.ellipse(38, -11, 17, 12, 0, 0, Math.PI); c.fill(); c.fillStyle = "#b07a4a"; c.beginPath(); c.ellipse(38, -11, 14.5, 9.5, 0, 0, Math.PI); c.fill(); c.restore();
      const n = Math.floor(ramp(lt, 0.6, 2.4) * 7); for (let i = 0; i < n; i++) ball(c, 28 + (i % 4) * 7, -14 - Math.floor(i / 4) * 5, 3.4, RED_B, { outline: 1.2 });
    });
  } },
  { label: "HERO & COWARD", draw: (c, lt, t) => {
    pop(c, -60, S(lt), () => {
      const w = Math.sin(t * 3.1) * 6; c.save(); c.fillStyle = OUT; c.beginPath(); c.moveTo(-6, -74); c.quadraticCurveTo(-30 + w, -40, -38 + w * 1.5, -8); c.lineTo(-14, -12); c.lineTo(6, -74); c.fill(); c.fillStyle = RED_B[1]; c.beginPath(); c.moveTo(-4, -72); c.quadraticCurveTo(-27 + w, -40, -34 + w * 1.5, -11); c.lineTo(-15, -14); c.lineTo(4, -72); c.fill(); c.restore();
      const b = person(c, 0, { skin: 1, shirt: BLU_B, aL: [0.5, -0.3], aR: [3.0, 0.05], spread: 16, hair: "#6b4a2a" }, 1);
      inked(c, [[b.hR[0], b.hR[1] + 6], [b.hR[0] + 1, b.hR[1] - 58]], CREAM, 4.5); inked(c, [[b.hR[0] - 9, b.hR[1] - 4], [b.hR[0] + 9, b.hR[1] - 4]], YEL, 4);
      sparkle(c, b.hR[0] + 1, b.hR[1] - 60, 14 * span(lt, 0.55, 1.4, 0.3), 1);
      glow(c, b.hR[0], b.hR[1] - 50, 40, "255,241,220", 0.4 * ramp(lt, 0.5, 0.4));
    });
    pop(c, 75, S(lt, 0.3), () => {
      const j = Math.sin(t * 37) * 1.3 * ramp(lt, 0.6, 0.3);
      c.save(); c.translate(j, 0); person(c, 0, { skin: 3, shirt: GREY_B, aL: [2.7, 1.3], aR: [-2.7, -1.3], crouch: 0.85, lean: 8, hair: "#221a14" }, 1); c.restore();
      for (let i = 0; i < 3; i++) { const f = (lt - 0.9 - i * 0.7); if (f > 0 && f < 1) ball(c, 20 + i * 5, -70 + f * 45, 2.6, CYAN_B, { alpha: 1 - f, outline: 1 }); }
    }, true);
  } },
  { label: "CREATOR & DESTROYER", draw: (c, lt, t) => {
    // the creator stacks a column up into a little temple...
    const n = Math.min(6, Math.floor(lt / 0.36) + 1);
    pop(c, -105, S(lt), () => { person(c, 0, { skin: 0, shirt: CYAN_B, aL: [0.6, 0.2], aR: [2.0 + 0.4 * Math.sin(lt * 5), 0.4], lean: 5, hair: "#120f24" }, 1); });
    for (let i = 0; i < n; i++) { const d = ramp(lt, i * 0.36, 0.3); blockR(c, -52, -i * 16 - (1 - easeOut(d)) * 30, 30, 15, YEL_B, d); }
    if (lt > 2.3) { const d = ramp(lt, 2.3, 0.4); c.save(); c.globalAlpha = d; c.fillStyle = OUT; c.beginPath(); c.moveTo(-76, -97); c.lineTo(-52, -118); c.lineTo(-28, -97); c.closePath(); c.fill(); c.fillStyle = YEL_B[2]; c.beginPath(); c.moveTo(-71, -99); c.lineTo(-52, -114); c.lineTo(-33, -99); c.closePath(); c.fill(); c.restore(); }
    // ...while the destroyer swings once and a wall comes down
    const swing = ease(ramp(lt, 0.5, 0.45)), hit = 0.95;
    const R = rng(66);
    for (let i = 0; i < 8; i++) {
      const bx = 45 + (i % 2) * 17, by = -Math.floor(i / 2) * 15, vx = (R() - 0.3) * 90, vy = -60 - R() * 80, sp = (R() - 0.5) * 6, f = Math.max(0, lt - hit);
      const x = bx + vx * f, y = Math.min(0, by + vy * f + 0.5 * 420 * f * f), done = y >= 0 && f > 0.1;
      c.save(); c.translate(x, y); c.rotate(done ? sp * 0.3 : sp * f); blockR(c, 0, 0, 16, 14, GREY_B, S(lt, 0.1)); c.restore();
    }
    pop(c, 120, S(lt, 0.15), () => {
      const b = person(c, 0, { skin: 2, shirt: RED_B, aL: [0.4, 0.2], aR: [2.8 - 2.2 * swing, 0.2], lean: 4 + 8 * swing, spread: 14, hair: "#221a14" }, 1);
      const an = -Math.PI / 2 + (2.8 - 2.2 * swing) - Math.PI / 2; const d: P = [Math.cos(an + Math.PI), Math.sin(an + Math.PI)];
      inked(c, [b.hR, [b.hR[0] + d[0] * 38, b.hR[1] + d[1] * 38]], "#9a6240", 3.5);
      c.save(); c.translate(b.hR[0] + d[0] * 40, b.hR[1] + d[1] * 40); c.rotate(an); c.fillStyle = OUT; c.fillRect(-12, -8, 24, 16); c.fillStyle = GREY_B[2]; c.fillRect(-10, -6, 20, 12); c.restore();
      for (let i = 0; i < 6; i++) { const f = lt - hit; if (f > 0 && f < 0.5) sparkle(c, 70 + Math.cos(i) * f * 90, -30 + Math.sin(i * 2.3) * f * 70, 6 * (1 - f * 2), 1); }
    }, true);
  } },
  { label: "KING & PEASANT", draw: (c, lt, t) => {
    pop(c, -65, S(lt), () => {
      const b = person(c, 0, { skin: 1, shirt: NEU_B, aL: [0.3, 0.1], aR: [1.4, -0.7], dress: true, spread: 10, hair: "#6b4a2a" }, 1);
      c.save(); c.fillStyle = OUT; const hx = b.head[0], hy = b.head[1] - 8; c.beginPath(); c.moveTo(hx - 12, hy + 2); c.lineTo(hx - 12, hy - 12); c.lineTo(hx - 6, hy - 5); c.lineTo(hx, hy - 15); c.lineTo(hx + 6, hy - 5); c.lineTo(hx + 12, hy - 12); c.lineTo(hx + 12, hy + 2); c.closePath(); c.lineJoin = "round"; c.lineWidth = 4; c.strokeStyle = OUT; c.stroke(); c.fillStyle = YEL; c.fill(); c.restore();
      sparkle(c, b.head[0] + 6, b.head[1] - 28, 7 * span(lt, 0.4, 1.3, 0.25), 1);
      inked(c, [[b.hR[0], b.hR[1] + 16], [b.hR[0] + 2, b.hR[1] - 34]], YEL_B[0], 3.5); ball(c, b.hR[0] + 2, b.hR[1] - 38, 6, YEL_B, { outline: 2 });
    });
    pop(c, 75, S(lt, 0.3), () => {
      const up = ease(ramp(lt, 0.4, 0.6)) * (1 - ease(ramp(lt, 1.05, 0.2))) + 0.3 * ease(ramp(lt, 1.8, 1.2));
      const b = person(c, 0, { skin: 2, shirt: PRO_B, aL: [2.0 * up + 0.6, 0.2], aR: [2.2 * up + 0.9, 0.1], lean: 8, crouch: 0.2, hair: "#3b2416", pants: "#5a548a" }, 1);
      const an = -Math.PI / 2 + 2.2 * up + 0.9; const d: P = [Math.cos(an), Math.sin(an)];
      inked(c, [[b.hR[0] - d[0] * 20, b.hR[1] + d[1] * 20], [b.hR[0] + d[0] * 45, b.hR[1] - d[1] * 45]], "#b07a4a", 3.2);
      inked(c, [[b.hR[0] + d[0] * 45, b.hR[1] - d[1] * 45], [b.hR[0] + d[0] * 45 + 10, b.hR[1] - d[1] * 45 + 12]], GREY_B[2], 3.2);
      for (let i = 0; i < 7; i++) { const f = lt - 1.12; if (f > 0 && f < 0.7) { c.save(); c.globalAlpha = 1 - f / 0.7; c.fillStyle = "#6b4a2a"; c.beginPath(); c.arc(50 + (i - 3) * f * 30, -f * 60 * (0.6 + (i % 3) * 0.3) + f * f * 160, 2.5, 0, 6.283); c.fill(); c.restore(); } }
    }, true);
  } },
  { label: "YOUNG COUPLE IN LOVE", draw: (c, lt, t) => {
    const near = ease(ramp(lt, 0.2, 1.4));
    pop(c, -45 + 8 * near, S(lt), () => { person(c, 0, { skin: 3, shirt: PRO_B, aL: [0.3, 0], aR: [1.3, -0.2], lean: 4 * near, hair: "#221a14" }, 1); });
    pop(c, 45 - 8 * near, S(lt, 0.15), () => { person(c, 0, { skin: 1, shirt: NEU_B, aL: [0.3, 0], aR: [1.3, -0.2], lean: 4 * near, dress: true, hair: "#6b4a2a" }, 1); }, true);
    const hs = back(clamp((lt - 0.6) / 0.5)); if (hs > 0) { const pts = heart(0, -128 - 6 * ramp(lt, 1, 3), 22 * hs); c.save(); c.lineJoin = "round"; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.strokeStyle = OUT; c.lineWidth = 6; c.stroke(); c.fillStyle = PINK; c.fill(); c.restore(); glow(c, 0, -125, 70 * hs, "255,95,162", 0.35); }
    for (let i = 0; i < 5; i++) { const f = lt - 1.0 - i * 0.45; if (f > 0 && f < 2) { const pts = heart(Math.sin(f * 3 + i) * 14 + (i - 2) * 16, -150 - f * 55, 6); c.save(); c.globalAlpha = 1 - f / 2; c.fillStyle = "#ff9ec6"; c.beginPath(); pts.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y))); c.fill(); c.restore(); } }
  } },
  { label: "MOTHER, FATHER, CHILD", draw: (c, lt, t) => {
    const hope = ease(ramp(t, CUE.child, 0.6));
    pop(c, -62, S(lt), () => { person(c, 0, { skin: 0, shirt: GRN_B, aL: [0.3, 0], aR: [0.9, 0.1], dress: true, hair: "#221a14" }, 1); });
    pop(c, 70, S(lt, 0.15), () => { person(c, 0, { skin: 0, shirt: BLU_B, aL: [0.3, 0], aR: [0.9, 0.1], spread: 11, hair: "#120f24" }, 1); }, true);
    pop(c, 4, S(lt, 0.4), () => { c.save(); c.scale(0.6, 0.6); person(c, 0, { skin: 0, shirt: YEL_B, aL: [-0.9, 0], aR: [0.9 + 2.1 * hope, 0.1 * hope], hair: "#3b2416" }, 1); c.restore(); });
    const s = back(clamp((t - CUE.child - 0.3) / 0.5)); star5(c, 32, -140 - 10 * ramp(t, CUE.child, 3), 13 * s, YEL, 1, t * 0.4); glow(c, 32, -140, 60 * s, "255,209,102", 0.35 * s);
  } },
  { label: "INVENTOR & EXPLORER", draw: (c, lt, t) => {
    const lit = ramp(lt, 0.55, 0.15);
    pop(c, -75, S(lt), () => {
      const b = person(c, 0, { skin: 3, shirt: GREY_B, aL: [0.4, 0.3], aR: [2.4, 0.3], hair: "#c9c4ea" }, 1);
      const bx = b.hR[0] + 2, by = b.hR[1] - 16;
      glow(c, bx, by, 90, "255,209,102", 0.6 * lit);
      c.save(); c.fillStyle = OUT; c.fillRect(bx - 5, by + 6, 10, 10); c.fillStyle = GREY_B[2]; c.fillRect(bx - 3.5, by + 7, 7, 8); c.restore();
      ball(c, bx, by, 10, lit > 0.5 ? YEL_B : ["#5a548a", "#8a84b8", "#c9c4ea", "#fff1dc"], { outline: 2.5 });
      for (let i = 0; i < 8; i++) { const an = (i / 8) * 6.283 + 0.2; inked(c, [[bx + Math.cos(an) * 16, by + Math.sin(an) * 16], [bx + Math.cos(an) * (16 + 10 * lit), by + Math.sin(an) * (16 + 10 * lit)]], YEL, 2, { alpha: lit }); }
    });
    pop(c, 80, S(lt, 0.25), () => {
      const plant = ease(ramp(lt, 0.5, 0.5));
      const b = person(c, 0, { skin: 1, shirt: PRO_B, aL: [2.0, -0.3], aR: [1.6, -0.9], lean: 3, spread: 14, hair: "#3b2416" }, 1);
      const px = 34, top = -150 + 30 * (1 - plant), bot = 10 * (1 - plant) + 0 * plant;
      inked(c, [[px, bot], [px, top]], "#c9c4ea", 3.2);
      c.save(); c.fillStyle = OUT; c.beginPath(); c.moveTo(px, top); for (let i = 0; i <= 8; i++) { const u = i / 8; c.lineTo(px + u * 50, top + 2 + Math.sin(u * 5 - t * 4) * 4 * u); } for (let i = 8; i >= 0; i--) { const u = i / 8; c.lineTo(px + u * 50, top + 30 + Math.sin(u * 5 - t * 4) * 4 * u); } c.closePath(); c.fill();
      c.fillStyle = GREEN; c.beginPath(); c.moveTo(px + 2, top + 3); for (let i = 1; i <= 8; i++) { const u = i / 8; c.lineTo(px + u * 47, top + 4 + Math.sin(u * 5 - t * 4) * 4 * u); } for (let i = 8; i >= 1; i--) { const u = i / 8; c.lineTo(px + u * 47, top + 27 + Math.sin(u * 5 - t * 4) * 4 * u); } c.closePath(); c.fill(); c.restore();
      inked(c, [[b.hR[0] - 4, b.hR[1] + 2], [b.hR[0] - 26, b.hR[1] - 8]], YEL_B[1], 5);
    }, true);
  } },
  { label: "TEACHER OF MORALS", draw: (c, lt, t) => {
    const bx = 30, by = -118;
    c.save(); c.globalAlpha = S(lt, 0.1) > 0 ? 1 : 0; inked(c, [[bx - 30, 0], [bx - 20, by + 60]], "#9a6240", 4); inked(c, [[bx + 30, 0], [bx + 20, by + 60]], "#9a6240", 4); c.restore();
    const bs = S(lt, 0.1); if (bs > 0) { c.save(); c.translate(bx, by + 30); c.scale(bs, bs); c.fillStyle = OUT; c.fillRect(-55, -38, 110, 76); c.fillStyle = "#1f4d3a"; c.fillRect(-50, -33, 100, 66); c.restore(); }
    for (let i = 0; i < 3; i++) inked(c, [[bx - 40, by + 12 + i * 14], [bx - 40 + 50 - i * 12, by + 12 + i * 14]], CREAM, 2.4, { progress: ramp(lt, 0.4 + i * 0.35, 0.35) });
    check(c, bx + 30, by + 30, 11, ramp(lt, 1.6, 0.4));
    pop(c, -60, S(lt), () => { person(c, 0, { skin: 2, shirt: NEU_B, aL: [0.2, 0], aR: [1.7 - 0.2 * Math.sin(lt * 2.4), -0.2], dress: true, hair: "#c9c4ea" }, 1); });
    [110, 150].forEach((x, i) => pop(c, x, S(lt, 0.35 + i * 0.15), () => { c.save(); c.scale(0.55, 0.55); person(c, 0, { skin: (i + 1) % 4, shirt: i ? CYAN_B : RED_B, aL: [0.2, 0], aR: [i === 0 ? 2.8 * span(lt, 1.2, 2.4, 0.3) + 0.3 : 0.3, 0], crouch: 0.4, hair: "#221a14" }, 1); c.restore(); }, true));
  } },
  { label: "CORRUPT POLITICIAN", draw: (c, lt, t) => {
    pop(c, -30, S(lt), () => {
      const wave = Math.sin(t * 4.2) * 0.25;
      person(c, 0, { skin: 1, shirt: GREY_B, aL: [-2.6 + wave, -0.3], aR: [-0.9, 0.9], hair: "#c9c4ea" }, 1);
      c.save(); c.fillStyle = OUT; c.beginPath(); c.moveTo(-40, 0); c.lineTo(-32, -58); c.lineTo(32, -58); c.lineTo(40, 0); c.closePath(); c.fill(); c.fillStyle = BLU_B[1]; c.beginPath(); c.moveTo(-35, -3); c.lineTo(-28, -53); c.lineTo(28, -53); c.lineTo(35, -3); c.closePath(); c.fill(); c.restore();
      star5(c, 0, -30, 11, CREAM, 1);
    });
    // behind the podium, a hand from the shadows fills a sack
    const hs = S(lt, 0.5); if (hs > 0) { c.save(); c.globalAlpha = hs; c.fillStyle = OUT; c.beginPath(); c.ellipse(52, -14, 17, 16, 0, 0, 6.283); c.fill(); c.fillStyle = "#b07a4a"; c.beginPath(); c.ellipse(52, -14, 14, 13, 0, 0, 6.283); c.fill(); c.restore(); }
    const hand = 1 - ease(ramp(lt, 0.6, 0.5)) + ease(ramp(lt, 3.4, 0.6)); inked(c, [[190, -40], [110 + 80 * hand, -40]], "#221a3f", 9, { alpha: hs });
    for (let i = 0; i < 5; i++) { const f = lt - 1.0 - i * 0.42; if (f > 0) { const y = Math.min(-26, -44 + f * f * 300), x = 104 - Math.min(1, f * 3) * 44; ball(c, f > 0.35 ? 52 : x, f > 0.35 ? -26 : y, 5, YEL_B, { alpha: 1 - ramp(f, 0.3, 0.1), outline: 1.6 }); } }
  } },
  { label: "SUPERSTAR", draw: (c, lt, t) => {
    const on = ramp(lt, 0.15, 0.3);
    c.save(); c.globalAlpha = 0.5 * on; const sg = c.createLinearGradient(0, -330, 0, 0); sg.addColorStop(0, "rgba(255,241,220,0)"); sg.addColorStop(1, "rgba(255,241,220,0.75)"); c.fillStyle = sg; c.beginPath(); c.moveTo(-12, -330); c.lineTo(12, -330); c.lineTo(75, 0); c.lineTo(-75, 0); c.closePath(); c.fill(); c.restore();
    c.save(); c.globalAlpha = 0.6 * on; c.fillStyle = "#fff1dc"; c.beginPath(); c.ellipse(0, 0, 80, 9, 0, 0, 6.283); c.fill(); c.restore();
    pop(c, 0, S(lt), () => { const up = ease(ramp(lt, 0.4, 0.4)); person(c, 0, { skin: 3, shirt: RED_B, aL: [-0.4 - 2.2 * up, 0], aR: [0.4 + 2.2 * up, 0], spread: 13, dress: true, hair: "#120f24" }, 1); });
    const R = rng(909); for (let i = 0; i < 14; i++) { const tt = 0.5 + R() * 3.0, x = (R() - 0.5) * 300, y = -30 - R() * 170; if (Math.abs(x) < 70) continue; const f = lt - tt; if (f > 0 && f < 0.35) { glow(c, x, y, 36, "255,255,255", 0.8 * (1 - f / 0.35)); sparkle(c, x, y, 11 * (1 - f / 0.35), 1); } }
    for (let i = 0; i < 6; i++) star5(c, Math.cos(i * 1.05 + lt * 0.5) * 90, -110 + Math.sin(i * 1.05 + lt * 0.5) * 36, 5 * S(lt, 0.3 + i * 0.1), YEL, 1);
  } },
  { label: "SUPREME LEADER", draw: (c, lt, t) => {
    const ps = S(lt);
    if (ps > 0) { c.save(); c.scale(1, ps); c.fillStyle = OUT; c.fillRect(-48, -72, 96, 72); c.fillStyle = GREY_B[1]; c.fillRect(-44, -68, 88, 68); c.fillStyle = GREY_B[0]; c.fillRect(-44, -20, 88, 20); c.restore(); }
    for (const s of [-1, 1]) { const d = ease(ramp(lt, 0.3, 0.5)), x0 = s * 27 - 11, hh = 52 * d, sw = Math.sin(t * 2 + s) * 2; c.save(); c.fillStyle = OUT; c.fillRect(x0 - 3, -70, 28, hh + 3); c.fillStyle = RED_B[1]; c.beginPath(); c.moveTo(x0, -68); c.lineTo(x0 + 22, -68); c.lineTo(x0 + 22 + sw, -68 + hh); c.lineTo(x0 + 11 + sw, -68 + hh - 8 * d); c.lineTo(x0 + sw, -68 + hh); c.closePath(); c.fill(); c.restore(); ball(c, x0 + 11, -46, 5 * d, YEL_B, { outline: 1.5 }); }
    c.save(); c.translate(0, -72); pop(c, 0, S(lt, 0.35), () => { person(c, 0, { skin: 1, shirt: GRN_B, aL: [0.2, 0], aR: [2.9 * ease(ramp(lt, 0.7, 0.4)) + 0.2, 0], spread: 10, hair: "#120f24" }, 1); }); c.restore();
    const R = rng(1212); for (let i = 0; i < 16; i++) { const x = (R() < 0.5 ? -1 : 1) * (62 + R() * 80), h = 26 + R() * 10, hop = Math.max(0, Math.sin(t * 5 + i * 1.7)) * 4 * ramp(lt, 0.8, 0.3); c.save(); c.globalAlpha = S(lt, 0.5 + R() * 0.3) > 0 ? 0.9 : 0; c.fillStyle = OUT; c.beginPath(); c.arc(x, -h - hop, 6, 0, 6.283); c.fill(); c.fillRect(x - 6, -h + 4 - hop, 12, h - 4 + hop); c.fillStyle = GREY_B[2]; c.beginPath(); c.arc(x, -h - hop, 4, 0, 6.283); c.fill(); c.restore(); }
  } },
  { label: "SAINT & SINNER", draw: (c, lt, t) => {
    pop(c, -62, S(lt), () => {
      const b = person(c, 0, { skin: 0, shirt: CYAN_B, aL: [1.9, 1.0], aR: [1.9, 1.0], dress: true, hair: "#3b2416" }, 1);
      const hr = ease(ramp(lt, 0.35, 0.4)); glow(c, b.head[0], b.head[1] - 18, 60 * hr, "255,209,102", 0.5);
      c.save(); c.lineWidth = 7; c.strokeStyle = OUT; c.beginPath(); c.ellipse(b.head[0], b.head[1] - 18, 15 * hr + 0.01, 4.5 * hr + 0.01, 0, 0, 6.283); c.stroke(); c.lineWidth = 3.5; c.strokeStyle = YEL; c.stroke(); c.restore();
    });
    pop(c, 70, S(lt, 0.25), () => {
      glow(c, 0, -60, 90, "224,52,77", 0.35 * ramp(lt, 0.5, 0.4));
      const b = person(c, 0, { skin: 2, shirt: RED_B, aL: [0.5, 0.4], aR: [1.9, -0.6], lean: -6, crouch: 0.15, hair: "#120f24" }, 1);
      ball(c, b.hR[0] + 4, b.hR[1] - 8, 8, RED_B, { outline: 2.4 });
      c.save(); c.fillStyle = GREEN; c.beginPath(); c.ellipse(b.hR[0] + 7, b.hR[1] - 19, 5, 2.5, -0.6, 0, 6.283); c.fill(); c.fillStyle = "#15122b"; c.beginPath(); c.arc(b.hR[0] + 12, b.hR[1] - 8, 3.5 * ramp(lt, 0.9, 0.1), 0, 6.283); c.fill(); c.restore();
    }, true);
  } },
];

// ================================================================ Voyager 1 (seen from behind, dish toward the Sun)
const voyager = (c: Ctx, x: number, y: number, s: number, rot: number, scan: number, a: number) => {
  if (a <= 0 || s <= 0) return;
  c.save(); c.globalAlpha = a; c.translate(x, y); c.rotate(rot); c.scale(s, s);
  inked(c, [[0, 0], [-300, 60]], GREY_B[2], 3); for (let i = 1; i < 6; i++) inked(c, [[-i * 50 - 4, i * 10 - 5], [-i * 50 + 4, i * 10 + 5]], GREY_B[3], 2);
  inked(c, [[10, 20], [-60, 135]], GREY_B[2], 5); [0, 1, 2].forEach((i) => { c.save(); c.translate(-38 - i * 9, 100 + i * 14); c.rotate(-1.0); c.fillStyle = OUT; c.fillRect(-12, -9, 24, 18); c.fillStyle = GREY_B[1]; c.fillRect(-10, -7, 20, 14); c.fillStyle = GREY_B[2]; c.fillRect(-10, -7, 20, 4); c.restore(); });
  inked(c, [[10, 20], [120, 110]], GREY_B[2], 5);
  c.save(); c.translate(128, 116); c.rotate(scan); c.fillStyle = OUT; c.fillRect(-20, -16, 40, 32); c.fillStyle = YEL_B[1]; c.fillRect(-17, -13, 34, 26); c.fillStyle = YEL_B[2]; c.fillRect(-17, -13, 12, 26);
  c.fillStyle = OUT; c.fillRect(14, -10, 34, 20); c.fillStyle = GREY_B[2]; c.fillRect(17, -7, 30, 14); c.fillStyle = "#6fa0ff"; c.beginPath(); c.arc(47, 0, 4, 0, 6.283); c.fill(); c.restore();
  c.fillStyle = OUT; c.beginPath(); for (let i = 0; i < 10; i++) { const an = (i / 10) * 6.283; c.lineTo(Math.cos(an) * 48, 18 + Math.sin(an) * 24); } c.closePath(); c.fill();
  c.fillStyle = GREY_B[1]; c.beginPath(); for (let i = 0; i < 10; i++) { const an = (i / 10) * 6.283; c.lineTo(Math.cos(an) * 43, 18 + Math.sin(an) * 20); } c.closePath(); c.fill();
  c.fillStyle = YEL_B[1]; c.fillRect(-30, 14, 60, 14);
  c.fillStyle = OUT; c.beginPath(); c.ellipse(6, -20, 112, 62, -0.08, 0, 6.283); c.fill();
  [["#c9c4ea", 106, 57], ["#fff1dc", 92, 48], ["#c9c4ea", 66, 34], ["#e8e4ff", 38, 19]].forEach(([col, rx, ry]) => { c.fillStyle = col as string; c.beginPath(); c.ellipse(6 - (106 - (rx as number)) * 0.12, -20 - (57 - (ry as number)) * 0.2, rx as number, ry as number, -0.08, 0, 6.283); c.fill(); });
  for (const an of [0.6, 2.5, 4.4]) inked(c, [[6 + Math.cos(an) * 92, -20 + Math.sin(an) * 48], [2, -46]], GREY_B[3], 2.2);
  ball(c, 2, -48, 7, GREY_B, { outline: 2 });
  c.restore();
};
// scattered-light rays, as in the real frame: long soft bands across the dark
const RAYS: [number, number, string, number][] = [[-380, 70, "255,170,120", 0.3], [-150, 110, "190,170,255", 0.26], [0, 64, "255,214,150", 0.38], [190, 130, "160,200,255", 0.24], [420, 90, "255,140,170", 0.22], [640, 60, "255,214,150", 0.18]];
const rays = (c: Ctx, cx: number, cy: number, ang: number, t: number, a: number) => {
  if (a <= 0) return;
  const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
  c.save(); c.globalCompositeOperation = "lighter";
  RAYS.forEach(([off, w, rgb, al], i) => {
    const o = off + Math.sin(t * 0.21 + i) * 14 + t * 3.2, px = cx + nx * o, py = cy + ny * o;
    const gr = c.createLinearGradient(px - nx * w, py - ny * w, px + nx * w, py + ny * w); gr.addColorStop(0, `rgba(${rgb},0)`); gr.addColorStop(0.5, `rgba(${rgb},${al * a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = gr; c.beginPath(); c.moveTo(px - nx * w - ux * 1800, py - ny * w - uy * 1800); c.lineTo(px + nx * w - ux * 1800, py + ny * w - uy * 1800); c.lineTo(px + nx * w + ux * 1800, py + ny * w + uy * 1800); c.lineTo(px - nx * w + ux * 1800, py - ny * w + uy * 1800); c.closePath(); c.fill();
  });
  c.restore();
};
const pin = (c: Ctx, x: number, y: number, s: number, a: number) => { if (s <= 0 || a <= 0) return; c.save(); c.globalAlpha = a; c.translate(x, y); c.scale(s, s); c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-8, -18, -22, -30, -22, -46); c.arc(0, -46, 22, Math.PI, 0); c.bezierCurveTo(22, -30, 8, -18, 0, 0); c.closePath(); c.lineJoin = "round"; c.lineWidth = 7; c.strokeStyle = OUT; c.stroke(); c.fillStyle = RED; c.fill(); c.fillStyle = CREAM; c.beginPath(); c.arc(0, -46, 8, 0, 6.283); c.fill(); c.restore(); };
const mini = (c: Ctx, x: number, y: number, s: number, rot: number, incl: number, a: number, seed: number, hue: string) => {
  if (a <= 0 || s < 0.5) return;
  const r = rng(seed); glow(c, x, y, s * 1.6, hue, 0.35 * a);
  c.save(); c.globalAlpha = a; c.fillStyle = "#fff1dc";
  for (let i = 0; i < 46; i++) { const u = r(), arm = i % 2, an = arm * Math.PI + u * 5.2 + (r() - 0.5) * 0.5 + rot, rr = s * (0.12 + 0.88 * u); const px = Math.cos(an) * rr, py = Math.sin(an) * rr * incl; c.globalAlpha = a * (0.5 + 0.5 * r()); c.beginPath(); c.arc(x + px, y + py, Math.max(0.6, s * 0.035 * (1.4 - u)), 0, 6.283); c.fill(); }
  c.restore(); glow(c, x, y, s * 0.35, "255,241,220", 0.9 * a);
};

// ================================================================ phase D pieces: history rising off the limb
const limbY = (k: Cam, x: number) => { const dx = x - k.x; return Math.abs(dx) < k.r ? k.y - Math.sqrt(k.r * k.r - dx * dx) : 1e4; };
const ribbon = (c: Ctx, k: Cam, t: number, t0: number, ph: number, bands: string[], a: number) => {
  const p = ease(ramp(t, t0, 1.8)); if (p <= 0 || a <= 0) return;
  const rise = 70 + 150 * ease(ramp(t, t0, 5)), pts: P[] = [];
  for (let x = -60; x <= W + 60; x += 30) pts.push([x, limbY(k, x) - rise - 70 * Math.sin(x * 0.0055 + ph + t * 0.7) - 25 * Math.sin(x * 0.013 - t * 0.9 + ph)]);
  inked(c, pts, bands[1], 18, { progress: p, alpha: a }); inked(c, pts.map(([x, y]) => [x, y - 4] as P), bands[2], 6, { progress: p, alpha: a * 0.9 });
};
type Mon = { phi: number; h: number; kind: number; tr: number; col: string[] };
const MONS: Mon[] = (() => { const r = rng(515), o: Mon[] = []; for (let j = 0; j < 30; j++) o.push({ phi: -0.78 + (j / 29) * 1.56 + (r() - 0.5) * 0.03, h: 0.05 + r() * 0.07, kind: Math.floor(r() * 7), tr: CUE.thousands + 0.1 + j * 0.065 + r() * 0.2, col: [NEU_B, GREY_B, BLU_B, PRO_B, CYAN_B][Math.floor(r() * 5)] }); return o; })();
const monument = (c: Ctx, kind: number, col: string[]) => { // unit height 1, base at 0
  c.beginPath();
  if (kind === 0) { c.rect(-0.28, -0.45, 0.56, 0.45); c.moveTo(0.26, -0.45); c.arc(0, -0.45, 0.26, 0, Math.PI, true); c.rect(-0.02, -0.95, 0.04, 0.3); }
  else if (kind === 1) { c.moveTo(-0.14, 0); c.lineTo(-0.1, -0.6); c.lineTo(0, -1); c.lineTo(0.1, -0.6); c.lineTo(0.14, 0); c.rect(-0.3, -0.35, 0.6, 0.35); }
  else if (kind === 2) { for (let i = 0; i < 4; i++) c.rect(-0.4 + i * 0.08, -0.18 * (i + 1), 0.8 - i * 0.16, 0.18); c.rect(-0.08, -0.85, 0.16, 0.13); }
  else if (kind === 3) { for (let i = 0; i < 4; i++) { const y = -0.22 * (i + 1), w = 0.42 - i * 0.07; c.moveTo(-w, y + 0.06); c.lineTo(w, y + 0.06); c.lineTo(w * 0.6, y - 0.04); c.lineTo(-w * 0.6, y - 0.04); c.closePath(); c.rect(-w * 0.5, y + 0.06, w, 0.16); } c.rect(-0.015, -1, 0.03, 0.14); }
  else if (kind === 4) { c.moveTo(-0.4, 0); c.lineTo(-0.4, -0.55); c.arc(0, -0.55, 0.4, Math.PI, 0); c.lineTo(0.4, 0); c.lineTo(0.22, 0); c.lineTo(0.22, -0.55); c.arc(0, -0.55, 0.22, 0, Math.PI, true); c.lineTo(-0.22, 0); c.closePath(); }
  else if (kind === 5) { c.moveTo(-0.08, 0); c.lineTo(-0.05, -0.9); c.lineTo(0, -1); c.lineTo(0.05, -0.9); c.lineTo(0.08, 0); c.closePath(); }
  else { c.rect(-0.45, -0.12, 0.9, 0.12); for (let i = 0; i < 5; i++) c.rect(-0.38 + i * 0.17, -0.62, 0.07, 0.5); c.moveTo(-0.5, -0.62); c.lineTo(0, -0.85); c.lineTo(0.5, -0.62); c.closePath(); }
  return col;
};

// ================================================================ the draw
const draw = (ctx: Ctx, frame: number, env: Env) => {
  const t = frame / FPS, g = new Gfx(ctx, env, frame, FLAT), sc = env.scale;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(space(env).canvas as CanvasImageSource, 0, 0); ctx.setTransform(sc, 0, 0, sc, 0, 0);
  motes(ctx, t, 0.35 + 0.4 * ramp(t, CUE.mote - 0.5, 1.2));
  const AL = layer(env, "pbdArt"), c = AL.ctx;
  const words: (() => void)[] = [];
  const say = (s: string, x: number, y: number, o: Parameters<typeof text>[4]) => { words.push(() => text(g, s, x, y, o)); };
  const k = cam(t), th = theta(t);

  // ---------------------------------------------------------------- A: Voyager, the rays, the dot
  const zk = k.r / 2.2, raysA = ramp(t, 3.3, 2.6) * (1 - 0.45 * ramp(t, CUE.but, 0.8)) * (1 - ramp(t, 15.2, 2.4));
  if (raysA > 0) { c.save(); c.translate(k.x, k.y); c.scale(Math.min(zk, 30), Math.min(zk, 30)); c.translate(-D0[0], -D0[1]); rays(c, D0[0] + 30, D0[1], 1.2, t, raysA); c.restore(); }
  const sunA = 1 - ramp(t, 4.2, 1.6); if (sunA > 0) { glow(c, 1720 - t * 30, 230, 260, "255,214,150", 0.5 * sunA); glow(c, 1720 - t * 30, 230, 40, "255,250,235", sunA); }
  const vg = ease(ramp(t, 0, 7.5)); voyager(c, 700 - 1250 * vg, 600 + 60 * vg, 1.35 - 0.35 * vg, -0.12 + 0.1 * vg, -0.4 + 0.8 * ease(ramp(t, 0.8, 2.5)), 1 - ramp(t, 6.0, 1.2));
  // the viewfinder + dashed ring
  const vf = ease(ramp(t, CUE.earth - 0.1, 0.6)) * (1 - ramp(t, CUE.consider, 0.6));
  if (vf > 0) { const bx = 1050, by = 420, bw = 420, bh = 330; c.save(); c.globalAlpha = vf * 0.9; for (const [x0, y0, dx, dy] of [[bx, by, 1, 1], [bx + bw, by, -1, 1], [bx, by + bh, 1, -1], [bx + bw, by + bh, -1, -1]]) inked(c, [[x0 + dx * 50, y0], [x0, y0], [x0, y0 + dy * 50]], CREAM, 4, { progress: vf }); c.restore(); }
  const ringA = ramp(t, CUE.but + 0.2, 0.5) * (1 - ramp(t, CUE.consider + 0.3, 0.5));
  if (ringA > 0) { const rr = lerp(120, 34, ease(ramp(t, CUE.different, 1.2))); c.save(); c.globalAlpha = ringA; c.setLineDash([10, 10]); c.lineDashOffset = -t * 20; c.strokeStyle = YEL; c.lineWidth = 3; c.beginPath(); c.arc(k.x, k.y, rr, 0, 6.283); c.stroke(); c.restore(); glow(c, k.x, k.y, 90, "255,209,102", 0.35 * ringA * (1 + 0.4 * Math.sin((t - CUE.different) * 3))); }
  if (t > CUE.earth && t < CUE.consider + 1) { const la = ramp(t, CUE.earth + 0.2, 0.5) * (1 - ramp(t, CUE.but, 0.4)); if (la > 0) inked(c, [[k.x + 8, k.y + 8], [k.x + 60, k.y + 62]], DIM, 2.5, { alpha: la, progress: ramp(t, CUE.earth, 0.4) }); }

  // ---------------------------------------------------------------- the planet, whatever size it is
  const dotA = ramp(t, CUE.earth - 0.1, 0.4);
  planet(c, k, t, dotA);
  // HERE: a pin drops on the dot and rides it as it grows into a world
  const pinA = ramp(t, CUE.here, 0.1) * (1 - ramp(t, CUE.onit - 0.3, 0.4)); if (pinA > 0) { const d = easeOut(ramp(t, CUE.here, 0.45)); pin(c, k.x, k.y - Math.min(k.r, 400) * 0.92 - 8 - (1 - d) * 260, 1.1, pinA); }

  // ---------------------------------------------------------------- C: people on the horizon, then their lights
  const thC = theta(CUE.love + 0.3);
  const crowdA = 1 - ramp(t, CUE.human + 0.2, 1.2);
  const hk = k.r * 0.035; // a person is 3.5 % of the planet's radius on screen
  const place = (phi: number, fn: () => void, a = 1) => { if (a <= 0) return; const [x, y] = onPlanet(k, th, phi); if (x < -200 || x > W + 200 || y < -300 || y > H + 300) return; c.save(); c.globalAlpha = a; c.translate(x, y); c.rotate(phi - th); c.scale(hk / 100, hk / 100); fn(); c.restore(); };
  if (crowdA > 0 && t > CUE.love - 0.2 && hk > 3) {
    const LOVE: [number, () => void][] = [
      [-120, () => { person(c, 0, { skin: 1, shirt: NEU_B, aL: [0.2, 0], aR: [0.5, 0.3], dress: true, crouch: 0.15, lean: 5, hair: "#c9c4ea" }, 1); inked(c, [[22, -40], [30, 0]], "#9a6240", 3.5); }],
      [-40, () => { person(c, 0, { skin: 3, shirt: PRO_B, aL: [0.3, 0], aR: [2.6 + 0.3 * Math.sin(t * 5), 0.4], spread: 12, hair: "#221a14" }, 1); }],
      [40, () => { c.scale(0.62, 0.62); person(c, 0, { skin: 0, shirt: YEL_B, aL: [-0.5, 0], aR: [0.5, 0], hair: "#3b2416" }, 1); }],
      [110, () => dog(c, 0, t, 1)],
    ];
    const lvHeads: P[] = [];
    LOVE.forEach(([s, fn], i) => { const phi = thC + s / 4200, sp = S(t - CUE.love, i * 0.12); place(phi, () => pop(c, 0, sp, fn), crowdA); lvHeads.push(onPlanet(k, th, phi, 1 + 0.028 * (i === 2 ? 0.6 : i === 3 ? 0.35 : 1))); });
    const hub: P = [(lvHeads[0][0] + lvHeads[3][0]) / 2, Math.min(...lvHeads.map((p) => p[1])) - hk * 0.55];
    const th1 = ramp(t, CUE.love + 0.4, 0.6); lvHeads.forEach((p) => inked(c, [p, hub], YEL, Math.max(1.5, hk * 0.02), { progress: th1, alpha: 0.8 * crowdA }));
    const hs = back(clamp((t - CUE.love - 0.8) / 0.5)) * crowdA; if (hs > 0) { const pts = heart(hub[0], hub[1] - hk * 0.1, hk * 0.13 * hs); c.save(); c.globalAlpha = crowdA; c.lineJoin = "round"; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.strokeStyle = OUT; c.lineWidth = 5; c.stroke(); c.fillStyle = PINK; c.fill(); c.restore(); glow(c, hub[0], hub[1], hk * 0.6, "255,95,162", 0.4 * hs); }
    // everyone you know, then everyone you ever heard of: a widening web
    const R = rng(2222);
    for (let i = 0; i < 44; i++) {
      const far = i >= 12, side = i % 2 ? 1 : -1, s = far ? side * (900 + ((i - 12) / 32) * 1300 + R() * 60) : side * (260 + Math.floor(i / 2) * 115 + R() * 30);
      const t0 = far ? CUE.heard + 0.2 + ((i - 12) / 32) * 1.3 : CUE.know + (i / 12) * 1.1, sp = S(t, t0), phi = thC + s / 4200;
      if (sp <= 0) continue;
      place(phi, () => pop(c, 0, sp, () => person(c, 0, randPose(300 + i), 1), R() > 0.5), crowdA);
      const hp = onPlanet(k, th, phi, 1.028), tgt = far ? onPlanet(k, th, thC + (side * (260 + 115 * 5)) / 4200, 1.028) : hub;
      c.save(); c.setLineDash([6, 8]); c.lineDashOffset = -t * 10; inked(c, [hp, [(hp[0] + tgt[0]) / 2, Math.min(hp[1], tgt[1]) - hk * 0.35], tgt], far ? DIM : CREAM, Math.max(1, hk * 0.012), { progress: ramp(t, t0 + 0.2, 0.5), alpha: 0.45 * crowdA }); c.restore();
    }
  }
  lights(c, k, th, t, ramp(t, CUE.human - 0.2, 0.4) * clamp((k.r - 150) / 500));

  // ---------------------------------------------------------------- D: joy, suffering, beliefs, doctrines
  const dA = 1 - ramp(t, 41.1, 0.7);
  if (t > CUE.joy - 0.2 && dA > 0) {
    ribbon(c, k, t, CUE.joy, 0, SUN_B, dA * (1 - 0.5 * ramp(t, CUE.thousands, 1)));
    ribbon(c, k, t, CUE.suffering, Math.PI, BLU_B, dA * (1 - 0.5 * ramp(t, CUE.thousands, 1)));
    for (const m of MONS) {
      const p = back(clamp((t - m.tr) / 0.6)); if (p <= 0) continue;
      const [x, y] = onPlanet(k, th, m.phi, 0.996); if (x < -200 || x > W + 200) continue;
      const hh = m.h * k.r * p;
      c.save(); c.globalAlpha = dA; c.translate(x, y); c.rotate(m.phi - th); c.scale(hh, hh);
      monument(c, m.kind, m.col); c.lineJoin = "round"; c.lineWidth = 7 / hh; c.strokeStyle = OUT; c.stroke(); c.fillStyle = m.col[1]; c.fill();
      c.save(); c.clip(); c.fillStyle = m.col[2]; c.fillRect(-1, -1.2, 0.85, 1.2); c.restore();
      c.restore();
    }
    for (let i = 0; i < 11; i++) {
      const phi = -0.62 + i * 0.125, tr = CUE.ideologies + i * 0.08, p = ease(ramp(t, tr, 0.6)); if (p <= 0) continue;
      const [x, y] = onPlanet(k, th, phi, 0.996), ph = k.r * (0.16 + (i % 3) * 0.02) * p, an = phi - th;
      c.save(); c.globalAlpha = dA; c.translate(x, y); c.rotate(an);
      inked(c, [[0, 0], [0, -ph]], CREAM, 3);
      const fc = [RED_B, GRN_B, YEL_B, BLU_B, NEU_B, PRO_B][i % 6], fw = 46, fh = 30;
      c.fillStyle = OUT; c.beginPath(); for (let j = 0; j <= 6; j++) { const u = j / 6; c.lineTo(u * fw, -ph + Math.sin(u * 4 - t * 5 + i) * 4 * u - 2); } for (let j = 6; j >= 0; j--) { const u = j / 6; c.lineTo(u * fw, -ph + fh + Math.sin(u * 4 - t * 5 + i) * 4 * u + 2); } c.closePath(); c.fill();
      c.fillStyle = fc[1]; c.beginPath(); for (let j = 0; j <= 6; j++) { const u = j / 6; c.lineTo(u * (fw - 3), -ph + 3 + Math.sin(u * 4 - t * 5 + i) * 4 * u); } for (let j = 6; j >= 0; j--) { const u = j / 6; c.lineTo(u * (fw - 3), -ph + fh - 3 + Math.sin(u * 4 - t * 5 + i) * 4 * u); } c.closePath(); c.fill();
      c.restore();
    }
    // economic doctrines: a market line booms and busts across the sky
    const gp = ramp(t, CUE.doctrines, 1.5);
    if (gp > 0) {
      const R = rng(8080), pts: P[] = []; let yv = 360;
      for (let i = 0; i <= 14; i++) { pts.push([140 + i * 118, yv]); yv = clamp(yv + (R() - 0.55) * 120, 230, 430); }
      for (let i = 1; i < pts.length; i++) { const segP = clamp(gp * 14 - (i - 1)); if (segP <= 0) break; inked(c, [pts[i - 1], pts[i]], pts[i][1] < pts[i - 1][1] ? GREEN : RED, 6, { progress: segP, alpha: dA }); if (segP >= 1 && i % 3 === 0) ball(c, pts[i][0], pts[i][1] - 26, 11 * back(clamp((t - CUE.doctrines - i * 0.107) / 0.4)), YEL_B, { alpha: dA }); }
    }
  }

  // ---------------------------------------------------------------- E: the parade of everyone
  const parA = ramp(t, CUE.hunter - 0.3, 0.3) * (hk > 6 ? 1 : 0);
  if (parA > 0) {
    TABS.forEach((tab, i) => {
      const lt = t - PAIRS[i]; if (lt < -0.05) return;
      const [x] = onPlanet(k, th, PHI[i]); if (x < -700 || x > W + 700) return;
      place(PHI[i], () => tab.draw(c, lt, t), parA * clamp((hk - 6) / 6));
      const [lx, ly] = onPlanet(k, th, PHI[i], 1 - 0.022);
      const la = ramp(lt, 0.1, 0.3) * (1 - ramp(Math.abs(lx - 960), 620, 260)) * (1 - ramp(t, 68.2, 0.5));
      if (la > 0) say(tab.label, lx, ly + 36, { cap: 34, color: i % 2 ? CREAM : YEL, align: "center", progress: ramp(lt, 0, 0.7), opacity: la, w: 4.2 });
    });
  }

  // ---------------------------------------------------------------- F: the mote, the sunbeam
  const Fa = ramp(t, CUE.mote - 0.4, 0.8) * (1 - ramp(t, 92, 3));
  if (Fa > 0) {
    const bm = ease(ramp(t, CUE.sunbeam, 1.4)), off = (1 - bm) * -1100, an = 0.62, ux = Math.cos(an), uy = Math.sin(an), nx = -uy, ny = ux;
    const beamA = bm * (1 - 0.5 * ramp(t, CUE.stage, 1)) * (1 - ramp(t, CUE.arena + 1, 2.5));
    if (beamA > 0) { const px = k.x + nx * off, py = k.y + ny * off, w = 170; c.save(); c.globalCompositeOperation = "lighter"; const gr = c.createLinearGradient(px - nx * w, py - ny * w, px + nx * w, py + ny * w); gr.addColorStop(0, "rgba(255,214,150,0)"); gr.addColorStop(0.5, `rgba(255,214,150,${0.32 * beamA})`); gr.addColorStop(1, "rgba(255,214,150,0)"); c.fillStyle = gr; c.beginPath(); c.moveTo(px - nx * w - ux * 2400, py - ny * w - uy * 2400); c.lineTo(px + nx * w - ux * 2400, py + ny * w - uy * 2400); c.lineTo(px + nx * w + ux * 2400, py + ny * w + uy * 2400); c.lineTo(px - nx * w + ux * 2400, py - ny * w + uy * 2400); c.closePath(); c.fill(); c.restore(); }
    const R = rng(7070); const kz = t > CUE.arena ? Math.exp(-Math.log(6) * ease(ramp(t, CUE.arena, 5))) : 1;
    c.save();
    for (let i = 0; i < 120; i++) {
      const d0 = 30 + R() * 900, a0 = R() * 6.283, s = 0.8 + R() * R() * 4, v = 3 + R() * 9, x = k.x + (Math.cos(a0) * d0 + Math.cos(a0 + 1.6) * v * (t - CUE.mote)) * kz, y = k.y + (Math.sin(a0) * d0 * 0.7 + Math.sin(a0 + 1.6) * v * (t - CUE.mote) - 4 * (t - CUE.mote)) * kz;
      const inBeam = beamA > 0 ? Math.exp(-((((x - (k.x + nx * off)) * nx + (y - (k.y + ny * off)) * ny) / 150) ** 2)) * beamA : 0;
      c.globalAlpha = Fa * (0.25 + 0.65 * inBeam) * ramp(t, CUE.mote + R() * 0.8, 0.5); c.fillStyle = inBeam > 0.3 ? "#fff1dc" : "#b9b3ff"; c.beginPath(); c.arc(x, y, Math.max(0.5, s * (1 + inBeam) * Math.max(0.35, kz)), 0, 6.283); c.fill();
    }
    c.restore();
  }
  // G: a very small stage (curtains open on the dot), then the arena
  const stA = ramp(t, CUE.stage - 0.2, 0.4) * (1 - ramp(t, 88, 3));
  const kz = t > CUE.arena ? Math.exp(-(Math.log(7) * ease(ramp(t, CUE.arena, 4.6)) + Math.log(3) * ramp(t, 85.5, 9.6))) : 1;
  if (t > CUE.arena - 0.1) {
    for (let i = 0; i < 12; i++) {
      const rx = 150 * Math.pow(1.55, i) * kz, ry = rx * 0.34, p = ease(ramp(t, CUE.arena + 0.15 + i * 0.2, 0.9)); if (p <= 0 || rx < 20 || rx > 2600) continue;
      const fa = clamp((rx - 20) / 60) * (1 - ramp(t, 93.5, 1.6) * 0.5);
      c.save(); c.globalAlpha = 0.28 * fa; c.setLineDash([8, 12]); c.lineDashOffset = -t * (6 + i); c.strokeStyle = [CREAM, "#b69cff", "#6fa0ff", YEL][i % 4]; c.lineWidth = 2; c.beginPath(); c.ellipse(k.x, k.y, rx, ry, -0.12, -Math.PI / 2, -Math.PI / 2 + 6.283 * p); c.stroke(); c.restore();
      const R = rng(3100 + i), n = 14 + i * 7;
      for (let j = 0; j < n; j++) {
        const a0 = R() * 6.283 + t * (0.05 / (1 + i * 0.3)) * (R() > 0.5 ? 1 : 0.7), lag = R(); if (lag > p) continue;
        const ex = Math.cos(a0) * rx, ey = Math.sin(a0) * ry, x = k.x + ex * Math.cos(-0.12) - ey * Math.sin(-0.12), y = k.y + ex * Math.sin(-0.12) + ey * Math.cos(-0.12);
        if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue;
        if (i >= 3 && R() < 0.3) mini(c, x, y, (8 + R() * 16) * Math.min(1.4, rx / 900 + 0.4), R() * 6.28 + t * 0.05, 0.3 + R() * 0.5, fa * 0.9, 5000 + i * 100 + j, ["190,170,255", "255,205,160", "160,200,255"][j % 3]);
        else { const s = 1 + R() * 2.2; glow(c, x, y, s * 5, "255,241,220", 0.3 * fa); c.globalAlpha = fa; c.fillStyle = ["#fff1dc", "#cddcff", "#ffd166"][j % 3]; c.beginPath(); c.arc(x, y, s, 0, 6.283); c.fill(); c.globalAlpha = 1; }
      }
    }
    // the deep field at the edges, drifting outward as the arena widens
    const dfA = ramp(t, 84.5, 2.5); if (dfA > 0) { const R = rng(6060); for (let i = 0; i < 26; i++) { const a0 = R() * 6.283, d0 = 700 + R() * 900, s2 = 10 + R() * 26, dd = d0 * (0.8 + 0.25 * ramp(t, 84.5, 10.6)); mini(c, k.x + Math.cos(a0) * dd * 1.2, k.y + Math.sin(a0) * dd * 0.7, s2, R() * 6.28 + t * 0.03, 0.3 + R() * 0.6, dfA * 0.8, 7000 + i, ["190,170,255", "255,205,160", "160,200,255"][i % 3]); } }
  }
  if (stA > 0) {
    const sz = kz, sx = k.x, sy = k.y;
    c.save(); c.translate(sx, sy); c.scale(sz, sz); c.globalAlpha = stA;
    const op = ease(ramp(t, CUE.stage + 0.3, 1.0));
    // spotlight down onto the dot
    const sg = c.createLinearGradient(0, -260, 0, 30); sg.addColorStop(0, "rgba(255,241,220,0)"); sg.addColorStop(1, `rgba(255,241,220,${0.4 * op})`); c.fillStyle = sg; c.beginPath(); c.moveTo(-8, -260); c.lineTo(8, -260); c.lineTo(46, 28); c.lineTo(-46, 28); c.closePath(); c.fill();
    c.fillStyle = OUT; c.beginPath(); c.ellipse(0, 34, 124, 24, 0, 0, 6.283); c.fill(); c.fillStyle = "#6b4a2a"; c.beginPath(); c.ellipse(0, 32, 118, 19, 0, 0, 6.283); c.fill(); c.fillStyle = "#9a6240"; c.beginPath(); c.ellipse(0, 29, 110, 13, 0, 0, 6.283); c.fill();
    c.globalAlpha = stA * 0.5 * op; c.fillStyle = "#fff1dc"; c.beginPath(); c.ellipse(0, 29, 44, 7, 0, 0, 6.283); c.fill(); c.globalAlpha = stA;
    for (const s of [-1, 1]) { const w = 64 * (1 - 0.8 * op); c.fillStyle = OUT; c.beginPath(); c.moveTo(s * 118, -120); c.lineTo(s * (118 - w), -120); c.quadraticCurveTo(s * (118 - w * 0.8), -40, s * (118 - w * 1.05), 26); c.lineTo(s * 118, 26); c.closePath(); c.fill(); c.fillStyle = RED_B[1]; c.beginPath(); c.moveTo(s * 114, -116); c.lineTo(s * (116 - w), -116); c.quadraticCurveTo(s * (116 - w * 0.8), -40, s * (116 - w * 1.05), 22); c.lineTo(s * 114, 22); c.closePath(); c.fill(); for (let f = 1; f < 4; f++) inked(c, [[s * (118 - (w * f) / 4), -110], [s * (118 - (w * f) / 4 * 1.02), 18]], RED_B[0], 2); }
    inked(c, [[-128, 30], [-128, -122], [128, -122], [128, 30]], YEL_B[2], 5, { progress: ease(ramp(t, CUE.stage - 0.2, 0.7)) });
    c.restore();
    planet(c, k, t, 1); glow(c, k.x, k.y, 40, "150,200,255", 0.5 * stA * ramp(t, CUE.stage + 0.6, 0.6));
  }

  // soft dark bands behind lettering over busy art
  const band = (y0: number, y1: number, a: number) => { if (a <= 0) return; const gr = c.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, "rgba(12,10,28,0)"); gr.addColorStop(0.35, `rgba(12,10,28,${0.75 * a})`); gr.addColorStop(0.65, `rgba(12,10,28,${0.75 * a})`); gr.addColorStop(1, "rgba(12,10,28,0)"); c.fillStyle = gr; c.fillRect(0, y0, W, y1 - y0); };
  band(10, 180, ramp(t, CUE.joy - 0.2, 0.5) * (1 - ramp(t, 41.3, 0.5)));
  band(790, 1050, ramp(t, CUE.title - 0.4, 0.8));
  const fadeIn = 1 - ramp(t, 0, 1.6), fadeOut = 0.5 * ramp(t, 93.6, 1.5);
  if (fadeIn + fadeOut > 0) { c.fillStyle = `rgba(10,8,22,${Math.max(fadeIn, fadeOut)})`; c.fillRect(0, 0, W, H); }
  grainOver(env, c);
  blit(ctx, env, AL);

  // ================================================================ lettering (paraphrase, on the words)
  const out = (a: number, b: number) => 1 - ramp(t, a, b);
  if (t < 4.2) { say("VOYAGER 1", 120, 110, { cap: 48, color: CREAM, progress: ramp(t, CUE.voyager, 0.8), opacity: out(3.7, 0.4), w: 5.5 }); say("14 FEB 1990", 124, 190, { cap: 28, color: DIM, progress: ramp(t, 1.9, 0.7), opacity: out(3.7, 0.4) }); }
  if (t > CUE.vantage - 0.05 && t < 10.9) say("6 BILLION KM AWAY", 960, 80, { cap: 50, color: CREAM, align: "center", progress: ramp(t, CUE.vantage, 0.9), opacity: out(10.3, 0.4), w: 5.5 });
  if (t > CUE.earth && t < CUE.but + 0.5) { say("THE EARTH", D0[0] + 70, D0[1] + 70, { cap: 30, color: CREAM, progress: ramp(t, CUE.earth + 0.1, 0.6), opacity: out(CUE.but, 0.4) }); say("0.12 OF A PIXEL", D0[0] + 72, D0[1] + 118, { cap: 22, color: DIM, progress: ramp(t, CUE.interest, 0.6), opacity: out(CUE.but, 0.4) }); }
  if (t > 8.55 && t < CUE.but + 0.5) say("NOTHING SPECIAL?", 960, 910, { cap: 56, color: DIM, align: "center", progress: ramp(t, 8.6, 0.8), opacity: out(CUE.but - 0.1, 0.4), w: 6 });
  if (t > CUE.but - 0.05 && t < CUE.consider + 0.6) { say("BUT FOR US", 150, 180, { cap: 74, color: YEL, progress: ramp(t, CUE.but, 0.6), opacity: out(CUE.consider - 0.2, 0.4), w: 7.5 }); say("IT IS DIFFERENT", 154, 290, { cap: 46, color: CREAM, progress: ramp(t, CUE.different, 0.8), opacity: out(CUE.consider - 0.2, 0.4) }); }
  if (t > CUE.consider - 0.05 && t < CUE.here + 0.5) say("CONSIDER THAT DOT", 960, 80, { cap: 48, color: CREAM, align: "center", progress: ramp(t, CUE.consider, 0.8), opacity: out(CUE.here - 0.1, 0.4), w: 5.5 });
  if (t > CUE.here - 0.05 && t < CUE.onit + 0.3) { const o = out(CUE.onit - 0.3, 0.4); say("HERE.", 140, 250, { cap: 96, color: CREAM, progress: ramp(t, CUE.here, 0.5), opacity: o, w: 9 }); say("HOME.", 140, 410, { cap: 96, color: CREAM, progress: ramp(t, CUE.home, 0.5), opacity: o, w: 9 }); say("US.", 140, 570, { cap: 150, color: YEL, progress: ramp(t, CUE.us, 0.5), opacity: o, w: 13 }); }
  const top = (s: string, a: number, b: number, col = CREAM, cap = 54) => { if (t > a - 0.05 && t < b + 0.1) say(s, 960, 76, { cap, color: col, align: "center", progress: ramp(t, a, 0.6), opacity: out(b - 0.25, 0.3), w: cap * 0.105 }); };
  top("ON IT", CUE.onit, CUE.love);
  top("EVERYONE YOU LOVE", CUE.love, CUE.know, YEL);
  top("EVERYONE YOU KNOW", CUE.know, CUE.heard);
  top("EVERYONE YOU EVER HEARD OF", CUE.heard, CUE.human, CREAM, 48);
  top("EVERY HUMAN WHO EVER WAS", CUE.human, CUE.lived, YEL, 50);
  if (t > CUE.human + 1 && t < CUE.lived + 0.1) say("ABOUT 117 BILLION PEOPLE", 960, 150, { cap: 30, color: DIM, align: "center", progress: ramp(t, CUE.human + 1.1, 0.8), opacity: out(CUE.lived - 0.25, 0.3) });
  top("LIVED OUT THEIR LIVES", CUE.lived, CUE.joy - 0.2);
  if (t > CUE.joy - 0.05 && t < CUE.thousands + 0.1) { const o = out(CUE.thousands - 0.25, 0.3); say("OUR JOY", 930, 76, { cap: 54, color: YEL, align: "right", progress: ramp(t, CUE.joy, 0.6), opacity: o, w: 5.7 }); say("AND SUFFERING", 990, 76, { cap: 54, color: "#6fa0ff", progress: ramp(t, CUE.suffering, 0.7), opacity: o, w: 5.7 }); }
  top("THOUSANDS OF BELIEFS", CUE.thousands, CUE.ideologies);
  top("IDEOLOGIES", CUE.ideologies, CUE.doctrines, YEL);
  top("ECONOMIC DOCTRINES", CUE.doctrines, 41.4);
  if (t > CUE.history - 0.05 && t < CUE.there + 0.1) say("IN THE HISTORY OF OUR SPECIES", 960, 76, { cap: 46, color: CREAM, align: "center", progress: ramp(t, CUE.history, 0.8), opacity: out(CUE.there - 0.25, 0.3), w: 5 });
  if (t > CUE.there - 0.05 && t < CUE.mote + 0.2) say("LIVED THERE", 960, 150, { cap: 78, color: YEL, align: "center", progress: ramp(t, CUE.there, 0.6), opacity: out(CUE.mote - 0.1, 0.35), w: 8 });
  if (t > CUE.mote - 0.05 && t < CUE.stage0 + 0.1) { const o = out(76.3, 0.5); say("ON A MOTE OF DUST", 960, 800, { cap: 60, color: CREAM, align: "center", progress: ramp(t, CUE.mote, 0.8), opacity: o, w: 6.5 }); say("SUSPENDED IN A SUNBEAM", 960, 900, { cap: 48, color: YEL, align: "center", progress: ramp(t, CUE.sunbeam, 1.0), opacity: o, w: 5.2 }); }
  if (t > CUE.stage0 - 0.05 && t < CUE.arena + 0.1) { const o = out(CUE.arena - 0.25, 0.3); say("THE EARTH", 960, 820, { cap: 44, color: CREAM, align: "center", progress: ramp(t, CUE.stage0, 0.5), opacity: o }); say("A VERY SMALL STAGE", 960, 900, { cap: 64, color: YEL, align: "center", progress: ramp(t, CUE.stage, 0.9), opacity: o, w: 7 }); }
  if (t > CUE.arena - 0.05 && t < CUE.title + 0.1) say("IN A VAST COSMIC ARENA", 960, 870, { cap: 66, color: CREAM, align: "center", progress: ramp(t, CUE.arena, 1.0), opacity: out(CUE.title - 0.4, 0.4), w: 7 });
  if (t > CUE.title - 0.05) { const o = 1 - 0.5 * ramp(t, 93.6, 1.5); say("PALE BLUE DOT", 960, 840, { cap: 100, color: "#9fd0ff", align: "center", progress: ramp(t, CUE.title, 1.2), opacity: o, w: 10 }); say("CARL SAGAN - 1994", 960, 975, { cap: 30, color: DIM, align: "center", progress: ramp(t, CUE.sagan, 0.9), opacity: o }); }

  g.group("plain", () => words.forEach((f) => f()));
};

export const paleBlueDot: Film = {
  meta: { title: "paleBlueDot", W, H, fps: FPS, bpm: 120, durationFrames: DURATION },
  assets: { images: {} },
  shots: [{ id: "pbd", start: 0, end: DURATION, draw }],
};
