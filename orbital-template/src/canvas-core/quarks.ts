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
