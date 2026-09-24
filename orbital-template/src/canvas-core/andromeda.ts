import { Gfx, rng, type Ctx, type Env, type P } from "./core";
import { Film } from "./film";
import { clamp, lerp } from "./gallery";
import {
  W, H, FPS, OUT, CREAM, YEL, RED, PRO_T, DIM, FLAT, ease, easeOut, back, ramp, span,
  cached, grain, grainOver, layer, blit, text, ball, glow, inked, check, cross, motes,
} from "./spaceStyle";

// ANDROMEDA · chunk 3, narration-timed, one continuous 55.7s shot, nothing repeats.
//  0.0-9.6    the Milky Way band fills the sky over a hill; "thousands of years..."
//  9.6-18.2   a dashed circle claims the whole band as "everything" — 4 names cycle on
//  18.2-23.0  "not just wrong" stamp; the claimed circle shatters; "2 TRILLION" starfield
//  23.0-29.0  1929: a telescope aims at a tiny grey smudge beside a labelled constellation
//  29.0-34.8  ruled out: not a gas cloud, not a nearby star (each icon crossed)
//  34.8-41.7  THE REVEAL: the smudge blooms into a full spiral galaxy, scale + stats
//  41.7-49.0  "just the beginning" — a glowing door; more small galaxies pour through
//  49.0-55.7  "kept going and going" — the deep field fills with galaxies, pulsing twice
//
// Cues measured from this file's own pauses (ffmpeg silencedetect -38dB/0.15s).

const DURATION = 1671; // 55.70s * 30fps (audio is 55.719s)
const CUE = {
  years: 2.44, milky: 9.62, our: 10.90, uni: 12.22, island: 13.94,
  notwrong: 18.24, offby: 19.77, hubble: 23.02, discover: 28.99,
  notgas: 32.41, notstar: 34.80, entire: 37.28, whisper: 38.93,
  beginning: 41.66, door: 44.18, revealing: 47.19, kept1: 48.99, kept2: 51.10, kept3: 53.80,
};
const CX = 960, CY = 560;

// ================================================================ backdrops (cached, static)
const hillY = 1010;
const sky = (env: Env) => cached(env, "andSky", () => {
  const L = env.canvas(W * env.scale, H * env.scale), c = L.ctx;
  c.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  const g = c.createRadialGradient(W * 0.5, H * 0.38, 60, W * 0.5, H * 0.5, W * 0.78);
  g.addColorStop(0, "#2e2958"); g.addColorStop(1, "#100d22");
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  const r = rng(41); c.lineCap = "round";
  for (let i = 0; i < 2200; i++) { const x = r() * W, y = r() * H, l = 6 + r() * 15; c.strokeStyle = "#b9b3ff"; c.globalAlpha = 0.03 + r() * 0.06; c.lineWidth = 1 + r() * 0.7; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(-0.42) * l, y + Math.sin(-0.42) * l); c.stroke(); }
  c.globalAlpha = 1;
  return L;
});
type Star = { x: number; y: number; s: number; ph: number; hot: boolean };
const milkyStars: Star[] = (() => {
  const r = rng(707), out: Star[] = [];
  // a gentle diagonal band, peaked density at the centreline, with dust-dark lanes
  for (let i = 0; i < 5200; i++) {
    const t = r(); const cx = 140 + t * 1750, cyc = 330 - 210 * Math.sin(t * 2.7) + 60 * Math.sin(t * 6.1);
    const off = (r() - 0.5) * (0.4 + 0.6 * (r() < 0.7 ? 1 : 3)) * 210 * (r() - 0.5 < 0 ? 1 : 1);
    const perp = (r() + r() + r() - 1.5) * 130; // peaked toward 0
    out.push({ x: cx, y: cyc + perp, s: 0.6 + r() * r() * 3.2, ph: r() * 6.28, hot: r() > 0.85 });
  }
  return out;
})();
const dustLanes = (() => { const r = rng(19), out: { x: number; y: number; w: number; h: number; a: number }[] = []; for (let i = 0; i < 34; i++) { const t = r(); out.push({ x: 140 + t * 1750, y: 330 - 210 * Math.sin(t * 2.7) + 60 * Math.sin(t * 6.1) + (r() - 0.5) * 60, w: 60 + r() * 130, h: 10 + r() * 16, a: 0.05 + r() * 0.08 }); } return out; })();
const hillPts: P[] = (() => { const r = rng(23), pts: P[] = [[0, H]]; for (let x = 0; x <= W; x += 40) pts.push([x, hillY - 24 - 40 * Math.sin(x * 0.0014 + 1) - 18 * Math.sin(x * 0.004)]); pts.push([W, H]); return pts; })();

const drawMilkyway = (c: Ctx, t: number, alpha: number) => {
  if (alpha <= 0) return;
  c.save(); c.globalAlpha = alpha;
  for (const d of dustLanes) { c.fillStyle = `rgba(16,13,34,${d.a})`; c.beginPath(); c.ellipse(d.x, d.y, d.w, d.h, 0.5, 0, 6.28); c.fill(); }
  for (const s of milkyStars) { const tw = 0.55 + 0.45 * Math.sin(t * 2.2 + s.ph); c.fillStyle = s.hot ? "#c9e8ff" : "#fff1dc"; c.globalAlpha = alpha * (0.28 + 0.6 * tw) * clamp(s.s / 2); c.beginPath(); c.arc(s.x, s.y, s.s * (0.7 + 0.3 * tw), 0, 6.28); c.fill(); }
  c.restore();
};
const drawHill = (c: Ctx, alpha: number) => {
  if (alpha <= 0) return;
  c.save(); c.globalAlpha = alpha;
  c.fillStyle = OUT; c.beginPath(); hillPts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.fill();
  c.fillStyle = "#0c0a1c"; c.beginPath(); hillPts.forEach((p, i) => (i ? c.lineTo(p[0] , p[1] + 4) : c.moveTo(p[0], p[1] + 4))); c.closePath(); c.fill();
  c.restore();
};

// ================================================================ small drawn things
const telescope = (c: Ctx, x: number, y: number, s: number, aim: number, alpha: number) => {
  if (alpha <= 0) return; c.save(); c.translate(x, y); c.rotate(aim); c.globalAlpha = alpha; c.lineCap = "round";
  // tripod
  c.strokeStyle = OUT; c.lineWidth = s * 0.22; [[-0.55, 1], [0, 1], [0.55, 1]].forEach(([dx]) => { c.beginPath(); c.moveTo(0, -s * 0.1); c.lineTo(dx * s * 0.9, s * 1.5); c.stroke(); });
  c.strokeStyle = "#6f69a8"; c.lineWidth = s * 0.1; [[-0.55, 1], [0, 1], [0.55, 1]].forEach(([dx]) => { c.beginPath(); c.moveTo(0, -s * 0.1); c.lineTo(dx * s * 0.9, s * 1.5); c.stroke(); });
  // tube
  c.rotate(-0.55);
  c.fillStyle = OUT; c.beginPath(); c.roundRect(-s * 0.42, -s * 2.4, s * 0.84, s * 2.5, s * 0.3); c.fill();
  const g = c.createLinearGradient(-s * 0.36, 0, s * 0.36, 0); g.addColorStop(0, "#5a548a"); g.addColorStop(0.5, "#c9c4ea"); g.addColorStop(1, "#3a355f");
  c.fillStyle = g; c.beginPath(); c.roundRect(-s * 0.36, -s * 2.32, s * 0.72, s * 2.34, s * 0.26); c.fill();
  c.fillStyle = OUT; c.beginPath(); c.ellipse(0, -s * 2.3, s * 0.4, s * 0.14, 0, 0, 6.28); c.fill();
  c.fillStyle = "#120f24"; c.beginPath(); c.ellipse(0, -s * 2.3, s * 0.3, s * 0.1, 0, 0, 6.28); c.fill();
  c.restore();
};
const gasCloud = (c: Ctx, x: number, y: number, s: number, alpha: number) => {
  if (alpha <= 0) return; c.save(); c.globalAlpha = alpha; const r = rng(5);
  for (let i = 0; i < 7; i++) { const a = (i / 7) * 6.28, rr = s * (0.5 + r() * 0.4); glow(c, x + Math.cos(a) * s * 0.4, y + Math.sin(a) * s * 0.3, rr, "143,108,240", 0.5); }
  c.strokeStyle = OUT; c.lineWidth = s * 0.1; c.globalAlpha = alpha * 0.7; c.beginPath(); c.ellipse(x, y, s * 0.85, s * 0.6, 0.2, 0, 6.28); c.stroke();
  c.restore();
};
const starIcon = (c: Ctx, x: number, y: number, s: number, alpha: number) => {
  if (alpha <= 0) return; c.save(); c.globalAlpha = alpha;
  glow(c, x, y, s * 2.2, "255,209,102", 0.6);
  ball(c, x, y, s * 0.5, ["#8a6a12", "#e0b12f", "#ffd166", "#fff2c2"]);
  c.restore();
};

// ================================================================ the spiral galaxy (hero)
type GSeed = { a0: number; arm: number; t: number; s: number; hot: boolean; core: boolean };
const buildGalaxy = (seed: number, n: number, coreFrac: number): GSeed[] => {
  const r = rng(seed), out: GSeed[] = [];
  for (let i = 0; i < n; i++) {
    const core = r() < coreFrac, t = core ? Math.pow(r(), 2.2) * 0.22 : 0.18 + Math.pow(r(), 0.65) * 0.82;
    const arm = Math.floor(r() * 2), spread = core ? 1.6 : 0.18 + (1 - t) * 0.22;
    const a0 = arm * Math.PI + t * 5.1 + (r() - 0.5) * spread;
    out.push({ a0, arm, t, s: core ? 1.6 + r() * 2.2 : 0.5 + r() * r() * 2.6, hot: r() > (core ? 0.5 : 0.82), core });
  }
  return out;
};
const GAL = buildGalaxy(303, 2600, 0.22).filter((s) => !s.core); // arm dust only; the core is painted smooth
// draw the galaxy at centre (gx,gy), on-screen major radius `rMaj`, tilt+rotation, bloom 0..1
const drawGalaxy = (c: Ctx, gx: number, gy: number, rMaj: number, tilt: number, rot: number, bloom: number, t: number, alpha: number) => {
  if (alpha <= 0 || bloom <= 0) return;
  const ry = rMaj * 0.42, b = ease(clamp(bloom));
  c.save(); c.globalAlpha = alpha;
  glow(c, gx, gy, rMaj * 1.85 * b, "255,220,170", 0.38 * b);
  glow(c, gx, gy, rMaj * 0.95 * b, "255,236,205", 0.3 * b);
  const proj = (a: number, rad: number): P => { const x0 = Math.cos(a) * rad, y0 = Math.sin(a) * rad * 0.42; return [gx + x0 * Math.cos(tilt) - y0 * Math.sin(tilt), gy + x0 * Math.sin(tilt) + y0 * Math.cos(tilt)]; };
  for (const s of GAL) {
    const rad = s.t * rMaj * b; if (rad < rMaj * 0.1) continue;
    const a = s.a0 + rot + s.t * 0.3;
    const [px, py] = proj(a, rad);
    const tw = 0.7 + 0.3 * Math.sin(t * 3 + s.a0 * 4);
    c.globalAlpha = alpha * b * (0.5 + 0.25 * tw) * clamp((bloom - s.t * 0.5) * 3);
    c.fillStyle = s.hot ? "#cddcff" : "#fff1dc";
    c.beginPath(); c.arc(px, py, s.s * (0.6 + 0.5 * b), 0, 6.28); c.fill();
  }
  // smooth bright core: layered soft disc, never a speckle cloud
  c.globalAlpha = alpha * b;
  const core = c.createRadialGradient(gx, gy, 0, gx, gy, rMaj * 0.26);
  core.addColorStop(0, "#fffaf0"); core.addColorStop(0.35, "#ffe9b8"); core.addColorStop(0.75, "#ffb347"); core.addColorStop(1, "rgba(255,179,71,0)");
  c.save(); c.translate(gx, gy); c.rotate(tilt); c.scale(1, 0.62); c.translate(-gx, -gy);
  c.fillStyle = core; c.beginPath(); c.arc(gx, gy, rMaj * 0.26, 0, 6.28); c.fill();
  c.restore();
  glow(c, gx, gy, rMaj * 0.1, "255,250,240", 0.9);
  c.restore(); void ry;
};
// tiny distant galaxies for the closing deep-field
type Distant = { x: number; y: number; r: number; tilt: number; kind: number; seed: number; born: number };
const DEEP: Distant[] = (() => { const r = rng(909), out: Distant[] = []; for (let i = 0; i < 70; i++) out.push({ x: 60 + r() * (W - 120), y: 60 + r() * (H - 220), r: 10 + r() * r() * 34, tilt: r() * 6.28, kind: Math.floor(r() * 3), seed: i, born: r() }); return out; })();
const distantGalaxy = (c: Ctx, d: Distant, alpha: number) => {
  if (alpha <= 0) return; c.save(); c.globalAlpha = alpha; c.translate(d.x, d.y); c.rotate(d.tilt);
  if (d.kind === 0) { // a gently tilted spiral disc — soft, not a flat petal
    const g = c.createRadialGradient(0, 0, 0, 0, 0, d.r); g.addColorStop(0, "#fffaf0"); g.addColorStop(0.3, "#fff1dc"); g.addColorStop(0.7, "#c3aaff"); g.addColorStop(1, "rgba(195,170,255,0)");
    c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, d.r, d.r * 0.58, 0, 0, 6.28); c.fill();
  } else if (d.kind === 1) { // a soft round elliptical
    const g = c.createRadialGradient(0, 0, 0, 0, 0, d.r); g.addColorStop(0, "#fff8ec"); g.addColorStop(0.5, "#fff1dc"); g.addColorStop(1, "rgba(255,241,220,0)"); c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, d.r * 0.75, d.r * 0.68, 0, 0, 6.28); c.fill();
  } else { // a small pale-blue dwarf
    const g = c.createRadialGradient(0, 0, 0, 0, 0, d.r); g.addColorStop(0, "#e8f0ff"); g.addColorStop(0.5, "#cddcff"); g.addColorStop(1, "rgba(205,220,255,0)"); c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, d.r * 0.5, d.r * 0.5, 0, 0, 6.28); c.fill();
  }
  c.restore();
};

// ================================================================ draw
const draw = (ctx: Ctx, frame: number, env: Env) => {
  const t = frame / FPS, g = new Gfx(ctx, env, frame, FLAT), sc = env.scale;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(sky(env).canvas as CanvasImageSource, 0, 0); ctx.setTransform(sc, 0, 0, sc, 0, 0);
  const AL = layer(env, "andArt"), c = AL.ctx;
  const words: (() => void)[] = [];
  const say = (s: string, x: number, y: number, o: Parameters<typeof text>[4]) => words.push(() => text(g, s, x, y, o));

  motes(ctx, t, 0.7);

  // ---------------------------------------------------------------- the sky band + hill (S1-S3)
  const bandOn = 1 - ramp(t, CUE.hubble - 1.0, 0.9); // fades as the telescope scene takes over
  drawMilkyway(c, t, bandOn);
  const claim = span(t, CUE.milky, CUE.notwrong + 0.3, 0.4); // the dashed "everything" ring
  if (claim > 0) {
    const rx = 900 * ease(clamp((t - CUE.milky) / 1.2)), ry = rx * 0.42, ex = 1010, ey = 330 - 40;
    c.save(); c.globalAlpha = claim; c.setLineDash([10, 12]); c.lineDashOffset = -t * 16; c.strokeStyle = CREAM; c.lineWidth = 3; c.globalAlpha = claim * 0.55;
    c.beginPath(); c.ellipse(ex, ey, rx, ry, -0.08, 0, 6.28); c.stroke(); c.setLineDash([]); c.restore();
  }
  const shatter = span(t, CUE.notwrong, CUE.offby + 0.6, 0.35);
  if (shatter > 0) { const p = ease(clamp((t - CUE.notwrong) / 0.6)); const ex = 1010, ey = 290; for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.28, r0 = 880 * (0.3 + p * 0.7), l = 70 + 130 * p; inked(c, [[ex + Math.cos(a) * r0, ey + Math.sin(a) * r0 * 0.42], [ex + Math.cos(a) * (r0 + l), ey + Math.sin(a) * (r0 + l) * 0.42]], "#c9c4ea", 3 * (1 - p), { alpha: shatter * (1 - p) }); } }
  drawHill(c, bandOn);

  // trillion starfield (S4): the whole frame fills with countless dim points
  const tri = span(t, CUE.offby + 0.3, CUE.hubble, 0.45);
  if (tri > 0) { const r = rng(555); c.save(); c.globalAlpha = tri; for (let i = 0; i < 1400; i++) { const x = r() * W, y = r() * H * 0.82, s = 0.5 + r() * 1.4; c.fillStyle = "#fff1dc"; c.globalAlpha = tri * (0.15 + 0.35 * Math.sin(t * 4 + i)); c.beginPath(); c.arc(x, y, s, 0, 6.28); c.fill(); } c.restore(); }

  // ---------------------------------------------------------------- the telescope + smudge (S5-S7)
  const teleOn = span(t, CUE.hubble - 0.3, CUE.entire + 0.5, 0.5);
  if (teleOn > 0) {
    const tx = 1430, ty = 880, sSize = 130;
    telescope(c, tx, ty, sSize, -0.15 + 0.04 * Math.sin(t * 1.3), teleOn);
    // constellation stick-figure (simplified) with a labelled Andromeda point
    const stars: P[] = [[1180, 300], [1270, 260], [1360, 300], [1430, 260], [1510, 300]];
    const conA = span(t, CUE.hubble, CUE.entire, 0.5);
    if (conA > 0) {
      c.save(); c.globalAlpha = conA * 0.5; c.strokeStyle = "#8f89c9"; c.setLineDash([5, 8]); c.lineWidth = 2; c.beginPath(); stars.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke(); c.setLineDash([]); c.restore();
      stars.forEach((p, i) => { c.save(); c.globalAlpha = conA; glow(c, p[0], p[1], 14, "255,241,220", 0.5); c.fillStyle = CREAM; c.beginPath(); c.arc(p[0], p[1], i === 2 ? 3.6 : 2.6, 0, 6.28); c.fill(); c.restore(); });
    }
    // the smudge itself, at the galaxy's eventual screen position — small and grey pre-reveal
    const smudgeA = span(t, CUE.discover, CUE.entire, 0.5);
    if (smudgeA > 0 && t < CUE.entire) { c.save(); c.globalAlpha = smudgeA * 0.85; const gr = c.createRadialGradient(1360, 330, 0, 1360, 330, 34); gr.addColorStop(0, "#c9c4ea"); gr.addColorStop(1, "rgba(201,196,234,0)"); c.fillStyle = gr; c.beginPath(); c.ellipse(1360, 330, 34, 20, 0.4, 0, 6.28); c.fill(); c.restore(); }
    // rule-out icons (S6/S7), stamped near the smudge
    const gasA = span(t, CUE.discover + 0.4, CUE.notstar, 0.3);
    if (gasA > 0) { gasCloud(c, 1620, 260, 60, gasA); cross(c, 1620, 260, 34, ramp(t, CUE.discover + 1.0, 0.3), gasA); }
    const starA = span(t, CUE.notstar, CUE.entire, 0.3);
    if (starA > 0) { starIcon(c, 1620, 420, 20, starA); cross(c, 1620, 420, 34, ramp(t, CUE.notstar + 0.6, 0.3), starA); }
  }

  // ---------------------------------------------------------------- THE REVEAL: full galaxy (S8-S12)
  const revealStart = CUE.entire;
  if (t > revealStart - 0.2) {
    const gx = lerp(1360, CX - 60, ease(clamp((t - revealStart) / 2.2)));
    const gy = lerp(330, CY, ease(clamp((t - revealStart) / 2.2)));
    const rMaj = lerp(42, 300, ease(clamp((t - revealStart) / 2.6)));
    const bloom = clamp((t - revealStart) / 2.4);
    const tilt = -0.32, rot = t * 0.06;
    const heroA = 1 - span(t, CUE.beginning + 0.5, CUE.door + 1.6, 0.5) * 0.0; // stays visible throughout closing too
    drawGalaxy(c, gx, gy, rMaj, tilt, rot, bloom, t, heroA);

    // scale bar: Milky Way vs Andromeda, and stat labels
    const statA = span(t, CUE.entire + 0.6, CUE.beginning, 0.4);
    if (statA > 0) {
      const bx = 1560, by = 760; c.save(); c.globalAlpha = statA;
      ball(c, bx, by, 10, ["#3c2f8f", "#6246c9", "#8f6cf0", "#c3aaff"]);
      c.strokeStyle = "rgba(255,241,220,0.5)"; c.lineWidth = 2; c.setLineDash([4, 6]); c.beginPath(); c.arc(bx, by, 26, 0, 6.28); c.stroke(); c.setLineDash([]);
      c.restore();
      say("OUR GALAXY", bx, by + 56, { cap: 20, color: DIM, align: "center", opacity: statA });
    }
  }

  // the glowing "door" + galaxies pouring through (S10)
  const doorA = span(t, CUE.beginning + 0.4, DURATION / FPS, 0.5);
  if (doorA > 0) {
    const gx = CX - 60, gy = CY;
    const pulse = 0.85 + 0.15 * Math.sin(t * 1.6);
    c.save(); c.globalAlpha = doorA * 0.5 * pulse; c.strokeStyle = YEL; c.lineWidth = 4; c.setLineDash([3, 10]); c.lineDashOffset = -t * 22; c.beginPath(); c.ellipse(gx, gy, 330 * pulse, 150 * pulse, -0.32, 0, 6.28); c.stroke(); c.setLineDash([]); c.restore();
  }
  // deep field: distant galaxies appear one by one, each staying forever once born
  const fieldA = span(t, CUE.door, DURATION / FPS, 0.4);
  if (fieldA > 0) {
    const pop1 = ramp(t, CUE.door + 0.3, 4.8); // first wave, gentle
    const pop2 = ramp(t, CUE.kept1, 2.3), pop3 = ramp(t, CUE.kept2, 2.3), pop4 = ramp(t, CUE.kept3, 2.2);
    const pop = clamp(pop1 * 0.4 + pop2 * 0.25 + pop3 * 0.2 + pop4 * 0.15 + pop1 * 0);
    const n = Math.floor(DEEP.length * clamp(pop1 * 0.35 + Math.max(pop2, pop3, pop4) * 0.65));
    DEEP.slice(0, n).forEach((d) => { const born = ramp(t, CUE.door + 0.3 + d.born * 8.5, 0.6); distantGalaxy(c, d, doorA > 0 ? Math.min(1, born) : 0); }); void pop;
  }

  grainOver(env, c);
  blit(ctx, env, AL);

  // ---------------------------------------------------------------- lettering
  say("WE THOUGHT WE KNEW", 960, 850, { cap: 34, color: CREAM, align: "center", progress: ramp(t, 0.25, 1.1), opacity: 1 - ramp(t, CUE.years + 0.3, 0.3) });
  say("WHERE WE WERE", 960, 850, { cap: 34, color: CREAM, align: "center", progress: ramp(t, 1.3, 1.0), opacity: 1 - ramp(t, CUE.years + 0.3, 0.3) });
  say("FOR THOUSANDS OF YEARS", 960, 900, { cap: 30, color: DIM, align: "center", progress: ramp(t, CUE.years, 1.1), opacity: 1 - ramp(t, CUE.milky - 0.2, 0.3) });

  const nameRow: [string, number][] = [["THE MILKY WAY", CUE.milky], ["OUR GALAXY", CUE.our], ["THE UNIVERSE ITSELF", CUE.uni], ["A SINGLE ISLAND OF LIGHT", CUE.island]];
  nameRow.forEach(([s, t0], i) => { const nxt = nameRow[i + 1]?.[1] ?? CUE.notwrong; say(s, 1010, 150, { cap: 40, color: i === 3 ? YEL : CREAM, align: "center", progress: ramp(t, t0, 0.6), opacity: 1 - ramp(t, nxt - 0.2, 0.25) }); });
  say("SURROUNDED BY ETERNAL DARKNESS", 1010, 220, { cap: 24, color: DIM, align: "center", progress: ramp(t, CUE.island + 0.5, 0.7), opacity: 1 - ramp(t, CUE.notwrong - 0.2, 0.25) });

  if (t > CUE.notwrong - 0.1 && t < CUE.hubble) {
    const o = 1 - ramp(t, CUE.hubble - 0.3, 0.3);
    say("NOT JUST WRONG", 960, 500, { cap: 74, color: RED, align: "center", progress: ramp(t, CUE.notwrong, 0.5), opacity: o, w: 8 });
    say("OFF BY A FACTOR OF", 960, 600, { cap: 32, color: CREAM, align: "center", progress: ramp(t, CUE.offby, 0.6), opacity: o });
    say("TWO TRILLION", 960, 660, { cap: 60, color: YEL, align: "center", progress: ramp(t, CUE.offby + 1.3, 0.6), opacity: o, w: 6.5 });
  }
  if (t > CUE.hubble - 0.1 && t < CUE.entire + 0.3) {
    const o = 1 - ramp(t, CUE.entire, 0.3);
    say("1929", 160, 140, { cap: 70, color: YEL, progress: ramp(t, CUE.hubble, 0.5), opacity: o, w: 7 });
    say("EDWIN HUBBLE'S TELESCOPE", 160, 220, { cap: 26, color: CREAM, progress: ramp(t, CUE.hubble + 0.7, 0.7), opacity: o });
    say("A FAINT SMUDGE", 1360, 400, { cap: 26, color: DIM, align: "center", progress: ramp(t, CUE.discover - 0.3, 0.5), opacity: (1 - ramp(t, CUE.entire - 0.4, 0.3)) * o });
    say("IN ANDROMEDA", 1360, 440, { cap: 22, color: DIM, align: "center", progress: ramp(t, CUE.discover, 0.5), opacity: (1 - ramp(t, CUE.entire - 0.4, 0.3)) * o });
    say("SHOULD HAVE BEEN IMPOSSIBLE", 160, 500, { cap: 24, color: CREAM, progress: ramp(t, CUE.discover + 0.6, 0.7), opacity: o * span(t, CUE.discover + 0.4, CUE.notgas, 0.3) });
    say("NOT A CLOUD OF GAS", 1620, 340, { cap: 22, color: RED, align: "center", progress: ramp(t, CUE.discover + 1.1, 0.5), opacity: o * span(t, CUE.discover + 0.9, CUE.notstar, 0.3) });
    say("NOT A NEARBY STAR", 1620, 480, { cap: 22, color: RED, align: "center", progress: ramp(t, CUE.notstar + 0.6, 0.5), opacity: o * span(t, CUE.notstar + 0.4, CUE.entire, 0.3) });
  }
  if (t > CUE.entire - 0.1 && t < CUE.beginning + 0.4) {
    const o = 1 - ramp(t, CUE.beginning, 0.3);
    say("AN ENTIRE GALAXY", 1450, 150, { cap: 56, color: CREAM, align: "center", progress: ramp(t, CUE.entire, 0.6), opacity: o, w: 6 });
    say("2 MILLION LIGHT-YEARS AWAY", 1450, 820, { cap: 28, color: PRO_T, align: "center", progress: ramp(t, CUE.entire + 1.2, 0.7), opacity: o });
    say("HUNDREDS OF BILLIONS OF STARS", 1450, 870, { cap: 24, color: CREAM, align: "center", progress: ramp(t, CUE.whisper, 0.8), opacity: o });
    say("MISTAKEN FOR A WHISPER OF NOTHING", 1450, 910, { cap: 20, color: DIM, align: "center", progress: ramp(t, CUE.whisper + 0.9, 0.8), opacity: o });
  }
  if (t > CUE.beginning - 0.1) {
    const o1 = span(t, CUE.beginning, CUE.door + 1.0, 0.3);
    say("JUST THE BEGINNING", 960, 150, { cap: 54, color: YEL, align: "center", progress: ramp(t, CUE.beginning, 0.6), opacity: o1, w: 6 });
    const o2 = span(t, CUE.door, CUE.kept1 + 0.4, 0.3);
    say("HUBBLE OPENED THAT DOOR", 300, 220, { cap: 26, color: CREAM, progress: ramp(t, CUE.door, 0.7), opacity: o2 });
    say("THE UNIVERSE KEPT REVEALING ITSELF", 300, 270, { cap: 22, color: DIM, progress: ramp(t, CUE.revealing, 0.8), opacity: o2 });
    const o3 = ramp(t, CUE.kept1, 0.5);
    say("IT KEPT GOING", 960, 930, { cap: 44, color: CREAM, align: "center", progress: ramp(t, CUE.kept1, 0.5), opacity: o3, w: 5 });
    if (t > CUE.kept2 - 0.1) say("AND GOING", 960, 990, { cap: 44, color: YEL, align: "center", progress: ramp(t, CUE.kept2, 0.5), opacity: 1, w: 5 });
  }

  g.group("plain", () => words.forEach((f) => f()));
};

export const andromeda: Film = {
  meta: { title: "andromeda", W, H, fps: FPS, bpm: 120, durationFrames: DURATION },
  assets: { images: {} },
  shots: [{ id: "chunk3", start: 0, end: DURATION, draw }],
};
