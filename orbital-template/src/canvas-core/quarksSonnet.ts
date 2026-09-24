import { Gfx, rng, type Ctx, type Env, type P } from "./core";
import { Film } from "./film";
import { clamp, lerp } from "./gallery";
import {
  W, H, FPS, OUT, CREAM, PRO_B, NEU_B, RED_B, GRN_B, BLU_B, YEL_B, CYAN_B, EARTH_B,
  PRO_T, NEU_T, YEL, RED, FLAT, ease, easeOut, back, ramp, span, space, grainOver, layer, blit,
  text, ball, glow, inked, gluon, check, cross, card, orbitDashes, motes, qlabel,
} from "./spaceStyle";

// QUARKS · built by Sonnet 5, independently from Opus's version, same script/audio/style rules.
// One continuous 58.07 s shot, timed to the narration's own pauses (measured fresh, not copied).
// Own storyboard/visual choices — same required story beats (same script), different staging.
//
//  0.0-2.9   converging starfield of nucleons collapses into one proton (no human silhouette)
//  2.9-6.5   proton turns glassy: 3 fogged shapes inside, "?" marks
//  6.5-13.6  a scan-beam sweeps the proton and is thrown back — "forbidden"
//  13.6-20.0 fog clears: uud quarks + gluon triangle; cage bars drop — "imprisoned"
//  20.0-28.6 one quark dragged out; flux tube + energy meter fill
//  28.6-34.7 snap: new quark/antiquark pair from nothing; one flies home
//  34.7-44.3 proton beside a planet with an orbiting moon+apple, two checks — "certain as gravity"
//  44.3-52.4 three panels pop in (star / collision / atom lattice), each checked — "confirmed real"
//  52.4-58.1 three cards crossed out, closing question

const DURATION = 1742; // 58.07s * 30fps
// Cue table measured fresh from this audio file's own pauses (ffmpeg silencedetect -38dB/0.18s),
// mapped to the script's phrase boundaries.
const CUE = {
  particles: 2.90, seen: 6.50, tech: 9.19, harder: 11.49, forbids: 13.57,
  quarks: 14.55, blocks: 15.40, imprisoned: 19.96, pull: 21.21, energy: 25.31,
  matter: 28.56, escape: 31.55, andYet: 34.71, suspect: 36.20, certain: 38.04, gravity: 41.34,
  reaction: 44.28, collision: 45.29, atom: 48.99, real: 50.57, how: 52.40, answer: 58.07,
};
const C0: P = [720, 540], R0 = 232;

// ---- hero proton size/position keyframes: [t, x, y, R, alpha]
const HK: number[][] = [
  [0, 720, 540, 0, 0], [2.9, 720, 540, R0, 1], [13.5, 720, 540, R0, 1], [14.3, 720, 540, R0 * 0.72, 1],
  [19.9, 720, 540, R0 * 0.72, 1], [20.6, 720, 540, R0, 1], [34.6, 720, 540, R0, 1], [35.4, 470, 620, 150, 1],
  [44.2, 470, 620, 150, 0], [44.9, 720, 540, 210, 0], [45.4, 720, 540, 210, 1], [52.3, 720, 540, 210, 1],
  [53.0, 720, 540, 175, 1], [58.07, 720, 540, 175, 1],
];
const keyed = (K: number[][], t: number) => {
  if (t <= K[0][0]) return K[0].slice(1);
  for (let i = 0; i < K.length - 1; i++) if (t < K[i + 1][0]) { const f = ease((t - K[i][0]) / (K[i + 1][0] - K[i][0])); return K[i].slice(1).map((v, j) => lerp(v, K[i + 1][j + 1], f)); }
  return K[K.length - 1].slice(1);
};

type Q = { p: P; r: number; bands: string[]; ch: string };
const QB = [RED_B, GRN_B, BLU_B];
const slotAngle = (t: number, i: number) => 0.6 + 0.22 * Math.min(t, 20.5) + (i * Math.PI * 2) / 3;
const slots = (x: number, y: number, R: number, t: number): P[] =>
  [0, 1, 2].map((i) => { const a = slotAngle(t, i); return [x + Math.cos(a) * R * 0.44, y + Math.sin(a) * R * 0.44]; });

// converging starfield: nucleons fly inward from the edges and settle into the proton's spot
type Star = { a: number; r0: number; pro: boolean; seed: number };
const STARS: Star[] = (() => { const rnd = rng(303), out: Star[] = []; for (let i = 0; i < 46; i++) out.push({ a: rnd() * Math.PI * 2, r0: 700 + rnd() * 700, pro: rnd() > 0.45, seed: i }); return out; })();

const draw = (ctx: Ctx, frame: number, env: Env) => {
  const t = frame / FPS, g = new Gfx(ctx, env, frame, FLAT), sc = env.scale;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(space(env).canvas as CanvasImageSource, 0, 0); ctx.setTransform(sc, 0, 0, sc, 0, 0);
  motes(ctx, t, 0.85);
  const AL = layer(env, "art"), c = AL.ctx;
  const words: (() => void)[] = [], after: (() => void)[] = [];
  const say = (s: string, x: number, y: number, o: Parameters<typeof text>[4]) => { words.push(() => text(g, s, x, y, o)); };

  const [hx, hy, R, ha] = keyed(HK, t);

  // ================================================================ S1: converging starfield
  if (t < 3.1) {
    const conv = ease(clamp(t / 2.85));
    STARS.forEach((s) => {
      const r = lerp(s.r0, 0, conv), x = C0[0] + Math.cos(s.a) * r, y = C0[1] + Math.sin(s.a) * r * 0.7;
      const sz = lerp(10, 26, conv) * (0.7 + 0.3 * Math.sin(t * 3 + s.seed));
      ball(c, x, y, sz, s.pro ? PRO_B : NEU_B, { alpha: clamp(conv * 3) });
    });
    if (conv > 0.9) { const p = clamp((conv - 0.9) * 10); glow(c, C0[0], C0[1], R0 * 1.6, "255,138,76", 0.4 * p); }
  }
  const opaque = 1 - ramp(t, 3.0, 0.9), fog = t < CUE.forbids ? 1 : 1 - ramp(t, CUE.forbids, 0.7);
  const orbitA = ha * clamp(ramp(t, 3.2, 0.6) * (1 - 0.85 * span(t, CUE.pull - 0.3, CUE.andYet + 0.4, 0.5)));
  orbitDashes(c, hx, hy, R * 1.25, t, false, { alpha: orbitA * 0.8, seed: 21 });

  const sl = slots(hx, hy, R, t), qr = R * 0.25;
  const qs: Q[] = [{ p: sl[0], r: qr, bands: QB[0], ch: "u" }, { p: sl[1], r: qr, bands: QB[1], ch: "u" }, { p: sl[2], r: qr, bands: QB[2], ch: "d" }];
  let links: [number, number][] = [[0, 1], [1, 2], [2, 0]];

  // ================================================================ pull -> snap
  const Dmax = 540, pulling = t >= CUE.pull && t < CUE.matter + 3.2;
  const Dfn = (tt: number) => (Dmax * (1 - Math.exp(-(tt - CUE.pull) / 1.4))) / (1 - Math.exp(-(CUE.matter - CUE.pull) / 1.4));
  let tube: { a: P; b: P; k: number } | null = null, pair: { q: P; aq: P } | null = null, B: P = [0, 0];
  if (pulling) {
    const S2 = sl[2];
    if (t < CUE.matter) {
      const d = Dfn(t), k = d / Dmax, sh = 6 * k * k;
      const pq: P = [S2[0] + d, S2[1] + Math.sin(t * 41) * sh];
      tube = { a: S2, b: pq, k }; qs[2] = { ...qs[2], p: pq }; links = [[0, 1]];
    } else {
      const d0 = Dfn(CUE.matter), ts = t - CUE.matter, pq0: P = [S2[0] + d0, S2[1]];
      B = [(S2[0] + pq0[0]) / 2, S2[1]];
      const home = ease(clamp(ts / 0.85));
      qs[2] = { ...qs[2], p: [lerp(B[0], S2[0], home), lerp(B[1], S2[1], home)] };
      const mx = pq0[0] + 36 * ts + 100 * ts * ts, my = pq0[1] - 26 * ts * ts;
      const join = ease(clamp(ts / 0.5));
      pair = { q: [mx, my], aq: [lerp(B[0], mx - qr * 2.3, join), lerp(B[1], my, join)] };
    }
  }
  hadronBody(c, hx, hy, R, t, opaque, fog, ha, qs, links);
  if (tube) drawTube(c, tube, qs, qr, R, t);
  if (t >= CUE.matter && pulling && pair) {
    drawSnap(c, t, B, pair, qs, qr, R);
    const ts2 = t - CUE.matter, la = ramp(ts2, 0.15, 0.25);
    words.push(() => qlabel(g, "d", pair!.q[0], pair!.q[1], qr, la));
    words.push(() => qlabel(g, "d", pair!.aq[0], pair!.aq[1], qr, la, true));
  }
  orbitDashes(c, hx, hy, R * 1.25, t, true, { alpha: orbitA * 0.8, seed: 21 });

  if (ha > 0.2) {
    if (fog < 0.5) qs.forEach((q) => words.push(() => qlabel(g, q.ch, q.p[0], q.p[1], q.r, ha * (1 - opaque) * clamp(1 - fog * 2))));
    else if (opaque < 0.6) qs.forEach((q, i) => say("?", q.p[0] - q.r * 0.3, q.p[1] - q.r * 0.55, { cap: q.r * 1.0, color: CREAM, opacity: fog * (1 - opaque) * 0.85, progress: ramp(t, 3.3 + i * 0.22, 0.35), seed: 40 + i }));
  }

  // energy meter
  const em = span(t, CUE.pull + 0.3, CUE.matter + 0.9, 0.35);
  if (em > 0) drawMeter(c, em, t < CUE.matter ? Dfn(t) / Dmax : 1 - ramp(t, CUE.matter, 0.5), say);

  // ================================================================ scan beam (forbids)
  if (t > CUE.seen && t < CUE.forbids + 0.15) drawScan(c, t, hx, hy, R);
  if (t > CUE.forbids && t < CUE.forbids + 0.9) { const f = ramp(t, CUE.forbids, 0.75); const ring: P[] = []; for (let i = 0; i <= 72; i++) { const a = (i / 72) * Math.PI * 2; ring.push([hx + Math.cos(a) * (R + 16 + 280 * easeOut(f)), hy + Math.sin(a) * (R + 16 + 280 * easeOut(f))]); } inked(c, ring, YEL, 9 * (1 - f) + 2, { alpha: 1 - f }); glow(c, hx, hy, R * 2.1, "255,209,102", 0.45 * (1 - f)); }

  // ================================================================ cage
  const cage = span(t, CUE.imprisoned + 0.05, CUE.pull - 0.05, 0.3);
  if (cage > 0) {
    const drop = ease(ramp(t, CUE.imprisoned + 0.05, 0.45));
    c.save(); c.beginPath(); c.arc(hx, hy, R * 1.02, 0, 6.28); c.clip();
    for (let k = -3; k <= 3; k++) { const x = hx + k * R * 0.27; inked(c, [[x, hy - R * 1.1], [x, lerp(hy - R * 1.1, hy + R * 1.1, drop)]], "#9d97cf", R * 0.05, { alpha: cage }); }
    c.restore();
  }

  // ================================================================ certainty: proton + planet
  const gv = span(t, CUE.gravity, CUE.reaction + 0.2, 0.35);
  if (gv > 0) drawGravity(c, t, gv, say);

  // ================================================================ evidence panels
  const ev = span(t, CUE.reaction, CUE.how, 0.35);
  if (ev > 0) drawEvidence(c, t, ev, say);

  // ================================================================ closing: crossed cards
  const cd = span(t, CUE.how, DURATION / FPS, 0.35);
  if (cd > 0) drawClosing(c, t, cd, say, after, g, sc);

  grainOver(env, c);
  blit(ctx, env, AL);

  // ---------------------------------------------------------- lettering
  say("INSIDE EVERY ATOM", 720, 900, { cap: 38, color: CREAM, align: "center", progress: ramp(t, 0.3, 1.1), opacity: 1 - ramp(t, CUE.particles + 2.4, 0.4) });
  say("PARTICLES NEVER SEEN", 720, 900, { cap: 38, color: YEL, align: "center", progress: ramp(t, CUE.seen - 0.2, 1.0), opacity: 1 - ramp(t, CUE.tech - 0.3, 0.3) });
  if (t > CUE.tech && t < CUE.forbids + 0.3) {
    const o = 1 - ramp(t, CUE.forbids - 0.15, 0.25);
    say("NOT TECHNOLOGY", 1450, 220, { cap: 48, color: CREAM, align: "center", progress: ramp(t, CUE.tech, 0.8), opacity: o });
    say("NOT EFFORT", 1450, 330, { cap: 48, color: CREAM, align: "center", progress: ramp(t, CUE.harder, 0.7), opacity: o });
  }
  if (t > CUE.forbids && t < CUE.quarks + 0.3) { const o = 1 - ramp(t, CUE.quarks - 0.15, 0.25); say("THE UNIVERSE", 1450, 220, { cap: 60, color: CREAM, align: "center", progress: ramp(t, CUE.forbids, 0.55), opacity: o }); say("FORBIDS IT", 1450, 340, { cap: 84, color: YEL, align: "center", progress: ramp(t, CUE.forbids + 0.55, 0.65), opacity: o, w: 9 }); }
  if (t > CUE.quarks && t < CUE.imprisoned) {
    const o = 1 - ramp(t, CUE.imprisoned - 0.25, 0.25);
    say("QUARKS", 1450, 170, { cap: 110, colors: [RED_B[2], GRN_B[2], BLU_B[2]], align: "center", progress: ramp(t, CUE.quarks, 0.55), opacity: o, w: 10 });
    say("BUILDING BLOCKS OF", 1450, 350, { cap: 30, color: CREAM, align: "center", progress: ramp(t, CUE.blocks, 0.7), opacity: o });
    say("PROTONS AND NEUTRONS", 1450, 405, { cap: 30, color: CREAM, align: "center", progress: ramp(t, 16.6, 0.7), opacity: o });
  }
  if (t > CUE.imprisoned && t < CUE.pull + 0.1) { const o = 1 - ramp(t, CUE.pull - 0.2, 0.25); say("PERMANENTLY", 1450, 230, { cap: 58, color: CREAM, align: "center", progress: ramp(t, CUE.imprisoned, 0.55), opacity: o }); say("IMPRISONED", 1450, 340, { cap: 82, color: PRO_T, align: "center", progress: ramp(t, CUE.imprisoned + 0.5, 0.55), opacity: o, w: 8 }); }
  const s4: [number, number, string, string][] = [[CUE.pull, CUE.energy, "PULL ONE OUT", CREAM], [CUE.energy, CUE.matter, "ANY AMOUNT OF ENERGY", PRO_T], [CUE.matter, CUE.escape, "NEW MATTER, EMPTY SPACE", YEL], [CUE.escape, CUE.andYet, "NONE ESCAPES ALONE", CREAM]];
  s4.forEach(([a0, a1, s, col]) => { if (t > a0 && t < a1) say(s, 1250, 110, { cap: 42, color: col, align: "center", progress: ramp(t, a0, 0.6), opacity: 1 - ramp(t, a1 - 0.2, 0.2) }); });
  if (t > CUE.andYet && t < CUE.gravity) { const o = 1 - ramp(t, CUE.gravity - 0.25, 0.25); say("NOT A SUSPICION", 1450, 230, { cap: 52, color: CREAM, align: "center", progress: ramp(t, CUE.andYet, 0.6), opacity: o }); say("A CERTAINTY", 1450, 330, { cap: 58, color: YEL, align: "center", progress: ramp(t, CUE.suspect + 0.3, 0.6), opacity: o }); }
  if (t > CUE.how) { say("HOW DO WE KNOW", 720, 700, { cap: 42, color: CREAM, align: "center", progress: ramp(t, CUE.how + 0.3, 1.0) }); say("SOMETHING EXISTS?", 720, 790, { cap: 60, color: YEL, align: "center", progress: ramp(t, CUE.how + 1.4, 1.2), w: 6.5 }); }

  g.group("plain", () => words.forEach((f) => f()));
  after.forEach((f) => f());
};

function hadronBody(c: Ctx, x: number, y: number, R: number, t: number, opaque: number, fog: number, alpha: number, qs: Q[], links: [number, number][]) {
  if (alpha <= 0 || R < 0.5) return;
  c.save(); c.globalAlpha = alpha;
  glow(c, x, y, R * 2.1, "255,138,76", 0.3);
  c.save(); c.beginPath(); c.arc(x, y, R, 0, 6.28); c.clip();
  const sa = lerp(0.24, 1, opaque);
  c.globalAlpha = alpha * sa; c.fillStyle = PRO_B[0]; c.fillRect(x - R, y - R, R * 2, R * 2);
  [[0.9, 0.14], [0.68, 0.3], [0.4, 0.46]].forEach(([k, off], i) => { c.fillStyle = PRO_B[i + 1]; c.beginPath(); c.arc(x - R * off, y - R * off, R * k, 0, 6.28); c.fill(); });
  const qa = (1 - opaque) * (1 - 0.6 * fog);
  if (qa > 0) { c.globalAlpha = alpha; links.forEach(([i, j], k) => gluon(c, qs[i].p, qs[j].p, { amp: R * 0.04, phase: t * 6.5 + k, w: Math.max(2, R * 0.022), alpha: qa })); qs.forEach((q) => ball(c, q.p[0], q.p[1], q.r, q.bands, { alpha: qa })); }
  if (fog > 0) { const fr = rng(31); for (let i = 0; i < 22; i++) { const a = fr() * 6.28 + t * 0.18, d = fr() * R * 0.78, s = R * (0.24 + fr() * 0.3); glow(c, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.9, s, "205,196,255", 0.26 * fog * (1 - opaque * 0.7)); } }
  c.restore();
  c.globalAlpha = alpha; c.lineCap = "round";
  c.strokeStyle = OUT; c.lineWidth = Math.max(4, R * 0.06); c.beginPath(); c.arc(x, y, R, 0, 6.28); c.stroke();
  c.strokeStyle = PRO_B[2]; c.lineWidth = Math.max(2, R * 0.028); c.beginPath(); c.arc(x, y, R - R * 0.02, 0, 6.28); c.stroke();
  c.strokeStyle = "#fff8ec"; c.globalAlpha = alpha * 0.8; c.lineWidth = Math.max(1.5, R * 0.03); c.beginPath(); c.arc(x, y, R * 0.84, Math.PI * 1.1, Math.PI * 1.36); c.stroke();
  c.restore();
}
function drawTube(c: Ctx, tube: { a: P; b: P; k: number }, qs: Q[], qr: number, R: number, t: number) {
  const { a: ta, b: tb, k } = tube, wob = (s: number) => Math.sin(s * 0.09 - t * 17) * (2.5 + 9 * k);
  const pts: P[] = []; for (let i = 0; i <= 36; i++) { const f = i / 36; pts.push([lerp(ta[0], tb[0], f), lerp(ta[1], tb[1], f) + wob(i * 14) * Math.sin(f * Math.PI)]); }
  glow(c, (ta[0] + tb[0]) / 2, ta[1], 110 + 240 * k, "255,209,102", 0.22 + 0.38 * k);
  inked(c, pts, "#ff8a4c", qr * (0.5 + 0.32 * k)); inked(c, pts, YEL, qr * (0.2 + 0.18 * k));
  for (let i = 0; i < 8; i++) { const f = ((i / 8 + t * 0.85) % 1), q = pts[Math.floor(f * 36)]; c.fillStyle = "#fff8e0"; c.globalAlpha = 0.8; c.beginPath(); c.arc(q[0], q[1], 2.6 + 3.6 * k, 0, 6.28); c.fill(); c.globalAlpha = 1; }
  gluon(c, qs[0].p, ta, { amp: R * 0.035, phase: t * 6.5, w: R * 0.02 }); gluon(c, qs[1].p, ta, { amp: R * 0.035, phase: t * 6.5 + 1, w: R * 0.02 });
  ball(c, qs[2].p[0], qs[2].p[1], qr, QB[2]);
  const ar = ramp(t, CUE.pull, 0.35) * (1 - ramp(t, CUE.matter - 0.3, 0.3));
  if (ar > 0) { const x0 = qs[2].p[0] + qr + 22, y0 = qs[2].p[1]; inked(c, [[x0, y0], [x0 + 100, y0]], CREAM, 12, { alpha: ar, progress: ar }); inked(c, [[x0 + 74, y0 - 26], [x0 + 102, y0], [x0 + 74, y0 + 26]], CREAM, 12, { alpha: ar }); }
}
function drawSnap(c: Ctx, t: number, B: P, pair: { q: P; aq: P } | null, qs: Q[], qr: number, R: number) {
  const ts = t - CUE.matter, fl = 1 - clamp(ts / 0.65);
  if (fl > 0) { glow(c, B[0], B[1], 240 + 180 * ts, "255,241,220", 0.9 * fl); glow(c, B[0], B[1], 380, "255,209,102", 0.45 * fl); for (let k = 0; k < 10; k++) { const an = (k / 10) * 6.28 + 0.2, r0 = 36 + 270 * easeOut(clamp(ts / 0.55)), r1 = r0 + 52 * fl; inked(c, [[B[0] + Math.cos(an) * r0, B[1] + Math.sin(an) * r0], [B[0] + Math.cos(an) * r1, B[1] + Math.sin(an) * r1]], YEL, 5, { alpha: fl }); } }
  if (pair) {
    if (ts < 1.0) ball(c, qs[2].p[0], qs[2].p[1], qr, QB[2]);
    if (ts < 0.85) { gluon(c, qs[2].p, qs[0].p, { amp: R * 0.035, phase: t * 6.5, w: R * 0.02 }); gluon(c, qs[2].p, qs[1].p, { amp: R * 0.035, phase: t * 6.5 + 2, w: R * 0.02 }); }
    gluon(c, pair.aq, pair.q, { amp: qr * 0.18, phase: t * 8.5, w: qr * 0.1 });
    ball(c, pair.aq[0], pair.aq[1], qr, YEL_B, { alpha: ramp(ts, 0.1, 0.2) }); ball(c, pair.q[0], pair.q[1], qr, QB[2]);
  }
}
function drawMeter(c: Ctx, em: number, f: number, say: (s: string, x: number, y: number, o: Parameters<typeof text>[4]) => void) {
  const x0 = 700, y0 = 985, bw = 680; c.save(); c.globalAlpha = em;
  c.fillStyle = OUT; c.beginPath(); c.roundRect(x0 - 6, y0 - 22, bw + 12, 44, 22); c.fill();
  c.fillStyle = "#2a2552"; c.beginPath(); c.roundRect(x0, y0 - 16, bw, 32, 16); c.fill();
  if (f > 0.01) { c.fillStyle = "#f0553a"; c.beginPath(); c.roundRect(x0, y0 - 16, bw * f, 32, 16); c.fill(); c.fillStyle = "#ffb347"; c.beginPath(); c.roundRect(x0 + 5, y0 - 12, Math.max(0, bw * f - 10), 11, 5); c.fill(); }
  c.restore(); say("ENERGY", x0 - 26, y0 - 13, { cap: 24, color: PRO_T, align: "right", opacity: em });
}
function drawScan(c: Ctx, t: number, hx: number, hy: number, R: number) {
  const cyc = ((t - CUE.seen) % 2.4) / 2.4, sweep = cyc < 0.6 ? cyc / 0.6 : -1;
  if (sweep < 0 || t > CUE.forbids) return;
  const yy = hy - R + sweep * R * 2;
  c.save(); c.globalAlpha = 0.85; c.beginPath(); c.arc(hx, hy, R * 0.99, 0, 6.28); c.clip();
  const grad = c.createLinearGradient(hx - R, yy - 30, hx - R, yy + 30);
  grad.addColorStop(0, "rgba(95,214,245,0)"); grad.addColorStop(0.5, "rgba(95,214,245,0.55)"); grad.addColorStop(1, "rgba(95,214,245,0)");
  c.fillStyle = grad; c.fillRect(hx - R, yy - 30, R * 2, 60); c.restore();
}
function drawGravity(c: Ctx, t: number, gv: number, say: (s: string, x: number, y: number, o: Parameters<typeof text>[4]) => void) {
  const pop = back(clamp(ramp(t, CUE.gravity, 0.5))), px = 1450, py = 560, pr = 150 * pop;
  c.save(); c.globalAlpha = gv;
  glow(c, px, py, 320, "79,151,245", 0.32);
  const moonA = t * 1.25, mo: P = [px + Math.cos(moonA) * 235, py + Math.sin(moonA) * 68 - Math.cos(moonA) * 18];
  c.setLineDash([7, 10]); c.strokeStyle = CREAM; c.globalAlpha = gv * 0.38; c.lineWidth = 2; c.beginPath(); c.ellipse(px, py, 235 * pop, 70 * pop, -0.08, 0, 6.28); c.stroke(); c.setLineDash([]); c.globalAlpha = gv;
  if (Math.sin(moonA) < 0) ball(c, mo[0], mo[1], 25 * pop, ["#3a355f", "#5a548a", "#8a84b8", "#c9c4ea"]);
  ball(c, px, py, pr, EARTH_B);
  c.save(); c.beginPath(); c.arc(px, py, pr, 0, 6.28); c.clip(); c.fillStyle = "#2fb37a"; [[-48, -38, 54, 30], [40, 30, 68, 36], [-18, 78, 38, 20]].forEach(([dx, dy, rx, ry]) => { c.beginPath(); c.ellipse(px + dx * pop, py + dy * pop, rx * pop, ry * pop, 0.4, 0, 6.28); c.fill(); }); c.restore();
  if (Math.sin(moonA) >= 0) ball(c, mo[0], mo[1], 25 * pop, ["#3a355f", "#5a548a", "#8a84b8", "#c9c4ea"]);
  const fall = clamp((t - 39.0) / 0.85), ay = fall < 1 ? lerp(165, py - pr - 16, fall * fall) : py - pr - 16 - Math.abs(Math.sin((t - 39.85) * 9)) * 20 * Math.exp(-(t - 39.85) * 4);
  if (t > 38.95) ball(c, px, ay, 17, RED_B);
  const eq = back(clamp(ramp(t, 39.2, 0.4)));
  if (eq > 0) { inked(c, [[960 - 56 * eq, 535], [960 + 56 * eq, 535]], CREAM, 16); inked(c, [[960 - 56 * eq, 580], [960 + 56 * eq, 580]], CREAM, 16); }
  check(c, 470, 870, 38, ramp(t, CUE.certain + 0.2, 0.35), gv); check(c, 1450, 870, 38, ramp(t, CUE.certain + 0.5, 0.35), gv);
  c.restore();
  say("AS CERTAIN AS", 960, 130, { cap: 46, color: CREAM, align: "center", progress: ramp(t, CUE.gravity, 0.55), opacity: gv });
  say("QUARKS", 470, 760, { cap: 38, colors: [RED_B[2], GRN_B[2], BLU_B[2]], align: "center", progress: ramp(t, CUE.certain - 0.2, 0.5), opacity: gv });
  say("GRAVITY", 1450, 760, { cap: 38, color: EARTH_B[3], align: "center", progress: ramp(t, CUE.certain + 0.1, 0.5), opacity: gv });
}
function drawEvidence(c: Ctx, t: number, ev: number, say: (s: string, x: number, y: number, o: Parameters<typeof text>[4]) => void) {
  c.save(); c.globalAlpha = ev;
  const s1 = back(clamp(ramp(t, CUE.reaction, 0.45)));
  if (s1 > 0) {
    const sx = 400, sy = 500; glow(c, sx, sy, 290 * s1, "255,179,71", 0.5);
    for (let k = 0; k < 12; k++) { const an = (k / 12) * 6.28 + t * 0.35, r0 = 112 * s1, r1 = (150 + 24 * Math.sin(t * 5 + k * 1.9)) * s1; const pts: P[] = [[sx + Math.cos(an - 0.13) * r0, sy + Math.sin(an - 0.13) * r0], [sx + Math.cos(an) * r1, sy + Math.sin(an) * r1], [sx + Math.cos(an + 0.13) * r0, sy + Math.sin(an + 0.13) * r0]]; c.fillStyle = OUT; c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.lineWidth = 7; c.strokeStyle = OUT; c.stroke(); c.fillStyle = k % 2 ? YEL : "#ff8a4c"; c.fill(); }
    ball(c, sx, sy, 114 * s1, ["#b8322f", "#f0553a", "#ffb347", "#fff0b0"]);
    check(c, 400, 850, 32, ramp(t, CUE.reaction + 0.85, 0.3), ev);
  }
  const s2 = back(clamp(ramp(t, CUE.collision, 0.45)));
  if (s2 > 0) {
    const cx2 = 960, cy2 = 500, hit = CUE.collision + 0.75;
    if (t < hit) { const f = ease(ramp(t, CUE.collision, hit - CUE.collision)); inked(c, [[cx2 - 150, cy2], [cx2 - 150 + 150 * f, cy2]], "#5fd6f5", 4, { alpha: 0.6 }); inked(c, [[cx2 + 150, cy2], [cx2 + 150 - 150 * f, cy2]], "#ff5fa2", 4, { alpha: 0.6 }); ball(c, cx2 - 150 + 150 * f - 11, cy2, 12, CYAN_B); ball(c, cx2 + 150 - 150 * f + 11, cy2, 12, ["#8f1f5c", "#e0347e", "#ff5fa2", "#ffc2dd"]); }
    else { const tr = rng(61), gr = easeOut(clamp((t - hit) / 0.85)); glow(c, cx2, cy2, 190, "255,241,220", 0.85 * (1 - clamp((t - hit) / 0.55))); for (let k = 0; k < 14; k++) { let hd = tr() * 6.28; const kap = (tr() - 0.5) * 0.02, L = (56 + tr() * 110) * gr, col = ["#ff5fa2", "#ff8a4c", "#ffd166", "#fff1dc", "#5fd6f5"][k % 5], pts: P[] = [[cx2, cy2]]; let x = cx2, y = cy2; for (let s = 0; s < L; s += 6) { hd += kap * 6; x += Math.cos(hd) * 6; y += Math.sin(hd) * 6; pts.push([x, y]); } inked(c, pts, col, 3.2); } }
    check(c, 960, 850, 32, ramp(t, CUE.collision + 1.2, 0.3), ev);
  }
  const s3 = ramp(t, CUE.atom, 0.01);
  if (s3 > 0) {
    const HEX: P[] = [[0, 0], [95, 0], [-95, 0], [48, 82], [-48, 82], [48, -82], [-48, -82]];
    HEX.forEach(([dx, dy], i) => { const p = back(clamp(ramp(t, CUE.atom + i * 0.12, 0.35))); if (p <= 0) return; const x = 1520 + dx, y = 500 + dy, rot = i * 0.9 + 0.4, ea = t * (2 + i * 0.3) + i;
      c.save(); c.translate(x, y); c.rotate(rot); c.strokeStyle = CREAM; c.globalAlpha = ev * 0.5; c.lineWidth = 2; c.beginPath(); c.ellipse(0, 0, 42 * p, 14 * p, 0, 0, 6.28); c.stroke(); c.restore();
      glow(c, x, y, 38 * p, "255,138,76", 0.38); ball(c, x, y, 11 * p, PRO_B);
      const e: P = [x + Math.cos(ea) * 42 * p * Math.cos(rot) - Math.sin(ea) * 14 * p * Math.sin(rot), y + Math.cos(ea) * 42 * p * Math.sin(rot) + Math.sin(ea) * 14 * p * Math.cos(rot)];
      ball(c, e[0], e[1], 5.5 * p, CYAN_B); });
    check(c, 1520, 850, 32, ramp(t, CUE.atom + 1.1, 0.3), ev);
  }
  c.restore();
  say("NUCLEAR REACTIONS", 400, 730, { cap: 27, color: YEL, align: "center", progress: ramp(t, CUE.reaction + 0.1, 0.45), opacity: ev });
  say("PARTICLE COLLISIONS", 960, 730, { cap: 27, color: "#5fd6f5", align: "center", progress: ramp(t, CUE.collision + 0.1, 0.45), opacity: ev });
  say("EVERY ATOM", 1520, 730, { cap: 27, color: PRO_T, align: "center", progress: ramp(t, CUE.atom + 0.1, 0.45), opacity: ev });
  say("CONFIRMED REAL", 960, 130, { cap: 70, color: YEL, align: "center", progress: ramp(t, CUE.real, 0.6), opacity: ev, w: 7.5 });
}
function drawClosing(c: Ctx, t: number, cd: number, say: (s: string, x: number, y: number, o: Parameters<typeof text>[4]) => void, after: (() => void)[], g: Gfx, sc: number) {
  const rows: [number, string, number][] = [[CUE.how + 0.2, "ISOLATE IT", 380], [CUE.how + 2.4, "PHOTOGRAPH IT", 500], [CUE.how + 4.6, "HOLD IT UP", 620]];
  rows.forEach(([t0, label, y]) => {
    const p = back(clamp(ramp(t, t0, 0.4))); if (p <= 0) return;
    const x = 1450;
    card(c, x, y, 560 * Math.min(1, p), 104, cd);
    cross(c, x - 216, y, 24, ramp(t, t0 + 0.5, 0.3), cd);
    say(label, x - 130, y - 14, { cap: 30, color: CREAM, progress: ramp(t, t0 + 0.05, 0.45), opacity: cd, align: "left" });
  });
}

export const quarksSonnet: Film = {
  meta: { title: "quarksSonnet", W, H, fps: FPS, bpm: 120, durationFrames: DURATION },
  assets: { images: {} },
  shots: [{ id: "chunk", start: 0, end: DURATION, draw }],
};
