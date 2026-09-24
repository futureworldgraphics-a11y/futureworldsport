import { Gfx, rng, type Ctx, type Env, type P } from "./core";
import { Film } from "./film";
import { clamp, lerp } from "./gallery";
import {
  W, H, FPS, OUT, CREAM, YEL, RED, DIM, FLAT, ease, easeOut, back, ramp, span,
  cached, space, grainOver, layer, blit, text, glow, inked, motes,
} from "./spaceStyle";

// ANDROMEDA (Opus direction) · one continuous 55.7 s shot, timed word-by-word to the narration.
//  0-2.4    a lone stargazer on a hill; a YOU ARE HERE pin drops on them
//  2.4-9.6  the camera tilts up: the Milky Way draws across the sky as a flowing river of stars;
//           standing stones, a pyramid, an observatory rise on the horizon (thousands of years);
//           "...and called it EVERYTHING"
//  9.6-18.2 the sky band pulls back into our galaxy (edge-on -> face-on); the pin returns;
//           a dashed boundary = "the universe itself"; outside it, eternal darkness
//  18.2-23  the boundary cracks and shatters; darkness lifts; zoom out through two trillion galaxies
//  23-29    1929: Hubble's dome, the real Andromeda constellation, a faint smudge, a sightline
//  29-37    an eyepiece opens: stars resolve inside the smudge; "gas cloud?" "star system?" bubbles pop
//  37-47    Andromeda blooms (M32, M110); the light-travel distance to our galaxy; a sparkle wave
//           across its stars; it fades to the whisper it was mistaken for, then flares back
//  47-55.7  pull back to the Local Group; a door of light opens; we fly through into the deep field

const DURATION = 1671; // 55.70 s (audio 55.719 s)
const CUE = {
  years: 2.44, called: 7.13, everything: 8.05, milky: 9.62, our: 10.90, uni: 12.22, island: 13.94, dark: 15.6,
  wrong: 18.24, offby: 19.77, trillion: 21.05, y1929: 23.02, hubble: 24.56, smudge: 26.3, andro: 27.8,
  discover: 28.99, impossible: 30.3, gas: 32.41, star: 34.80, galaxy: 37.28, distance: 38.93,
  billions: 41.66, whisper: 44.18, flare: 46.11, beginning: 47.19, door: 48.99, reveal: 51.10, kept: 53.80, going: 54.5,
};
const C: P = [960, 560];

// ================================================================ galaxies
type GP = { r: number; a: number; sz: number; hot: number };
const makeSpiral = (seed: number, n: number, wind: number): GP[] => {
  const r = rng(seed), out: GP[] = [];
  for (let i = 0; i < n; i++) {
    if (r() < 0.3) { out.push({ r: Math.sqrt(r()) * 0.95, a: r() * 6.283, sz: 0.5 + r() * 1.1, hot: r() }); continue; }
    const s = Math.pow(r(), 0.85), arm = i % 2, sc = (r() - 0.5) * (0.35 + 0.55 * (1 - s));
    out.push({ r: 0.08 + 0.92 * s, a: arm * Math.PI + s * wind * Math.PI * 2 + sc, sz: 0.6 + r() * r() * 2.4, hot: r() });
  }
  return out;
};
type Pal = { halo: string; arm: string; armHi: string; dust: boolean };
const PAL_MW: Pal = { halo: "150,130,255", arm: "170,150,255", armHi: "215,205,255", dust: false };
const PAL_M31: Pal = { halo: "255,205,160", arm: "185,195,255", armHi: "230,225,255", dust: true };
const MW_P = makeSpiral(11, 1500, 1.15), M31_P = makeSpiral(31, 1900, 1.3), MINI_P = makeSpiral(77, 320, 1.1);
type GSpec = { x: number; y: number; R: number; incl: number; tilt: number; rot: number; alpha: number; wind?: number; sparkle?: number };
const drawSpiral = (c: Ctx, g: GSpec, P: GP[], pal: Pal, t: number) => {
  const { x, y, R, incl, tilt, rot, alpha: A, wind = 1.2 } = g; if (A <= 0) return;
  if (R < 3) { glow(c, x, y, 8, "255,236,205", 0.9 * A); c.save(); c.globalAlpha = A; c.fillStyle = CREAM; c.beginPath(); c.arc(x, y, 1.6, 0, 6.28); c.fill(); c.restore(); return; }
  const ct = Math.cos(tilt), st = Math.sin(tilt), cr = Math.cos(rot), sr = Math.sin(rot);
  const S = (u: number, v: number): P => { const u1 = u * cr - v * sr, v1 = (u * sr + v * cr) * incl; return [x + u1 * ct - v1 * st, y + u1 * st + v1 * ct]; };
  c.save();
  glow(c, x, y, R * 1.7, pal.halo, 0.22 * A);
  c.save(); c.translate(x, y); c.rotate(tilt); c.scale(1, Math.max(incl, 0.05));
  const dg = c.createRadialGradient(0, 0, 0, 0, 0, R); dg.addColorStop(0, `rgba(255,236,205,${0.5 * A})`); dg.addColorStop(0.35, `rgba(${pal.arm},${0.2 * A})`); dg.addColorStop(1, `rgba(${pal.arm},0)`);
  c.fillStyle = dg; c.beginPath(); c.arc(0, 0, R, 0, 6.28); c.fill(); c.restore();
  // arm glow ribbons, then dust lanes on their inner edge
  c.lineCap = "round"; c.lineJoin = "round";
  for (let k = 0; k < 2; k++) {
    const arm = (off: number, s0: number, s1: number) => { c.beginPath(); for (let s = s0; s <= s1 + 1e-6; s += 0.02) { const a = k * Math.PI + s * wind * Math.PI * 2 + off, rr = R * (0.08 + 0.92 * s); const p = S(Math.cos(a) * rr, Math.sin(a) * rr); s === s0 ? c.moveTo(p[0], p[1]) : c.lineTo(p[0], p[1]); } };
    arm(0, 0.06, 1); c.strokeStyle = `rgba(${pal.arm},${0.15 * A})`; c.lineWidth = R * 0.16; c.stroke();
    arm(0, 0.06, 0.95); c.strokeStyle = `rgba(${pal.armHi},${0.2 * A})`; c.lineWidth = R * 0.055; c.stroke();
    if (pal.dust) { arm(-0.2, 0.12, 0.85); c.strokeStyle = `rgba(21,18,43,${0.42 * A})`; c.lineWidth = R * 0.03; c.stroke(); }
  }
  const zs = clamp(R / 380, 0.45, 1.7), sp = g.sparkle;
  for (const p of P) {
    const rr = p.r * R, q = S(Math.cos(p.a) * rr, Math.sin(p.a) * rr), tw = 0.6 + 0.4 * Math.sin(t * 2.6 + p.a * 7 + p.r * 20);
    let sz = p.sz * zs * (0.8 + 0.3 * tw), al = A * (0.4 + 0.5 * tw);
    if (sp !== undefined) { const k = Math.exp(-(((q[0] - sp) / 110) ** 2)); sz *= 1 + 1.6 * k; al = Math.min(1, al + k * 0.8); if (k > 0.55 && p.sz > 1.6) { c.globalAlpha = A * k; c.strokeStyle = "#fffaf0"; c.lineWidth = 1.4; c.beginPath(); c.moveTo(q[0] - sz * 4, q[1]); c.lineTo(q[0] + sz * 4, q[1]); c.moveTo(q[0], q[1] - sz * 4); c.lineTo(q[0], q[1] + sz * 4); c.stroke(); } }
    c.globalAlpha = al; c.fillStyle = p.hot > 0.82 ? "#cddcff" : p.r < 0.22 ? "#ffe9b8" : "#fff1dc";
    c.beginPath(); c.arc(q[0], q[1], sz, 0, 6.28); c.fill();
  }
  c.globalAlpha = 1;
  c.save(); c.translate(x, y); c.rotate(tilt); c.scale(1, Math.max(incl, 0.42));
  const cg = c.createRadialGradient(0, 0, 0, 0, 0, R * 0.24); cg.addColorStop(0, `rgba(255,250,240,${A})`); cg.addColorStop(0.4, `rgba(255,233,184,${0.9 * A})`); cg.addColorStop(0.75, `rgba(255,179,71,${0.35 * A})`); cg.addColorStop(1, "rgba(255,179,71,0)");
  c.fillStyle = cg; c.beginPath(); c.arc(0, 0, R * 0.24, 0, 6.28); c.fill(); c.restore();
  glow(c, x, y, R * 0.08, "255,250,240", 0.9 * A);
  c.restore();
};

// small galaxy sprites, drawn once and reused for the cosmic field / deep field
const SPR = 160;
const sprite = (env: Env, kind: number) => cached(env, `gspr${kind}`, () => {
  const L = env.canvas(SPR * env.scale, SPR * env.scale), c = L.ctx; c.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  const m = SPR / 2;
  if (kind === 0) drawSpiral(c, { x: m, y: m, R: 58, incl: 0.8, tilt: 0.3, rot: 0, alpha: 1 }, MINI_P, PAL_MW, 0);
  else if (kind === 1) drawSpiral(c, { x: m, y: m, R: 60, incl: 0.45, tilt: -0.5, rot: 1, alpha: 1 }, MINI_P, { halo: "150,200,255", arm: "150,190,255", armHi: "215,230,255", dust: false }, 0);
  else if (kind === 3) drawSpiral(c, { x: m, y: m, R: 62, incl: 0.12, tilt: 0.2, rot: 0, alpha: 1 }, MINI_P, PAL_M31, 0);
  else if (kind === 5) { const r = rng(5); for (let i = 0; i < 6; i++) glow(c, m + (r() - 0.5) * 60, m + (r() - 0.5) * 44, 18 + r() * 20, i % 2 ? "205,220,255" : "255,170,210", 0.55); }
  else { const warm = kind === 4; c.save(); c.translate(m, m); c.rotate(0.5); c.scale(1, 0.7); const gr = c.createRadialGradient(0, 0, 0, 0, 0, 58); gr.addColorStop(0, "#fffaf0"); gr.addColorStop(0.35, warm ? "rgba(255,200,140,0.8)" : "rgba(255,241,220,0.75)"); gr.addColorStop(1, "rgba(255,241,220,0)"); c.fillStyle = gr; c.beginPath(); c.arc(0, 0, 58, 0, 6.28); c.fill(); c.restore(); }
  return L;
});
const drawSprite = (c: Ctx, env: Env, kind: number, x: number, y: number, size: number, rot: number, alpha: number) => {
  if (alpha <= 0) return;
  if (size < 7) { c.save(); c.globalAlpha = alpha * 0.9; c.fillStyle = kind === 1 ? "#cddcff" : "#fff1dc"; c.beginPath(); c.arc(x, y, Math.max(1.1, size * 0.28), 0, 6.28); c.fill(); c.restore(); return; }
  c.save(); c.globalAlpha = alpha; c.translate(x, y); c.rotate(rot); c.drawImage(sprite(env, kind).canvas as CanvasImageSource, -size / 2, -size / 2, size, size); c.restore();
};

// the cosmic field for the two-trillion zoom: clustered galaxies at log-spaced distances
type Gx = { x: number; y: number; s: number; k: number; rot: number };
const COSMIC: Gx[] = (() => { const r = rng(2024), out: Gx[] = []; for (let cl = 0; cl < 120; cl++) { const rc = 620 * Math.exp(5.25 * r()), ac = r() * 6.283, cx = Math.cos(ac) * rc, cy = Math.sin(ac) * rc * 0.8, n = 6 + Math.floor(r() * 10); for (let i = 0; i < n; i++) { const d = rc * 0.18 * Math.sqrt(r()), a = r() * 6.283; out.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, s: 70 + r() * 110, k: Math.floor(r() * 5), rot: r() * 6.283 }); } } return out; })();
// the deep field we fly through at the end
type Dx = { x: number; y: number; z: number; k: number; rot: number; s: number };
const DEEP: Dx[] = (() => { const r = rng(4242), out: Dx[] = []; for (let i = 0; i < 340; i++) out.push({ x: (r() - 0.5) * 3.4, y: (r() - 0.5) * 2.0, z: 0.35 + r() * 4.6, k: Math.floor(r() * 6), rot: r() * 6.283, s: 0.7 + r() * 0.8 }); return out; })();

// ================================================================ ground, stargazer, horizon
const hillY = (x: number) => 930 + 55 * Math.sin(x * 0.0021 + 0.4) + 22 * Math.sin(x * 0.006 + 1.3);
const drawHill = (c: Ctx, gy: number, a: number) => {
  if (a <= 0) return; c.save(); c.globalAlpha = a;
  c.beginPath(); c.moveTo(0, H + 400); for (let x = 0; x <= W; x += 20) c.lineTo(x, hillY(x) + gy); c.lineTo(W, H + 400); c.closePath();
  c.fillStyle = "#0c0a1c"; c.fill(); c.strokeStyle = "#3a355f"; c.lineWidth = 3; c.stroke(); c.restore();
};
const silhouette = (c: Ctx, draw: () => void, a: number) => { c.save(); c.globalAlpha = a; draw(); c.fillStyle = "#0c0a1c"; c.fill(); c.strokeStyle = "#6f63d9"; c.lineWidth = 3; c.globalAlpha = a * 0.8; c.stroke(); c.restore(); };
const figure = (c: Ctx, x: number, y: number, a: number) => {
  if (a <= 0) return;
  silhouette(c, () => { c.beginPath(); c.moveTo(x - 26, y - 128); c.quadraticCurveTo(x, y - 142, x + 26, y - 128); c.lineTo(x + 20, y - 58); c.lineTo(x + 15, y); c.lineTo(x + 3, y); c.lineTo(x, y - 48); c.lineTo(x - 3, y); c.lineTo(x - 15, y); c.lineTo(x - 20, y - 58); c.closePath(); c.moveTo(x + 24, y - 166); c.arc(x + 2, y - 162, 22, 0, 6.28); }, a);
};
const stones = (c: Ctx, x: number, y: number, a: number) => silhouette(c, () => { c.beginPath(); c.rect(x - 74, y - 118, 30, 120); c.rect(x - 14, y - 132, 32, 134); c.rect(x + 48, y - 108, 28, 110); c.rect(x - 82, y - 150, 172, 24); }, a);
const pyramid = (c: Ctx, x: number, y: number, a: number) => silhouette(c, () => { c.beginPath(); c.moveTo(x - 140, y + 4); c.lineTo(x, y - 172); c.lineTo(x + 140, y + 4); c.closePath(); }, a);
const observatory = (c: Ctx, x: number, y: number, a: number) => { silhouette(c, () => { c.beginPath(); c.rect(x - 84, y - 70, 168, 74); c.moveTo(x + 84, y - 70); c.arc(x, y - 70, 84, 0, Math.PI, true); c.closePath(); }, a); if (a > 0) { c.save(); c.globalAlpha = a; c.strokeStyle = "#2a2552"; c.lineWidth = 12; c.beginPath(); c.moveTo(x + 10, y - 150); c.lineTo(x + 30, y - 84); c.stroke(); c.restore(); } };
const pin = (c: Ctx, x: number, y: number, s: number, a: number) => {
  if (a <= 0 || s <= 0) return; const r = 22 * s, hy = y - 54 * s;
  c.save(); c.globalAlpha = a;
  const shape = (k: number) => { c.beginPath(); c.arc(x, hy, r + k, 0, 6.28); c.moveTo(x - (r + k) * 0.82, hy + r * 0.55); c.lineTo(x, y + k * 0.8); c.lineTo(x + (r + k) * 0.82, hy + r * 0.55); c.closePath(); };
  c.fillStyle = OUT; shape(5); c.fill(); c.fillStyle = "#e0344d"; shape(0); c.fill();
  c.fillStyle = "#ff8a95"; c.beginPath(); c.arc(x - r * 0.3, hy - r * 0.35, r * 0.28, 0, 6.28); c.fill();
  c.fillStyle = "#fff1dc"; c.beginPath(); c.arc(x, hy, r * 0.36, 0, 6.28); c.fill();
  c.restore();
};

// the Milky Way band: a river whose stars flow along it
const BAND = (u: number): P => [-120 + u * 2160, 600 - u * 360 - Math.sin(u * Math.PI) * 150];
const RIVER = (() => { const r = rng(808), out: { u: number; off: number; sz: number; v: number; hot: number; ph: number }[] = []; for (let i = 0; i < 3400; i++) out.push({ u: r(), off: (r() + r() + r() + r() - 2) * 95, sz: 0.5 + r() * r() * 2.6, v: 0.004 + r() * 0.01, hot: r(), ph: r() * 6.28 }); return out; })();
const drawRiver = (c: Ctx, t: number, reveal: number, gyShift: number, a: number) => {
  if (a <= 0 || reveal <= 0) return;
  c.save();
  for (let i = 0; i <= 26; i++) { const u = i / 26; if (u > reveal) break; const p = BAND(u); glow(c, p[0], p[1] + gyShift, 230, i % 3 ? "150,130,255" : "255,200,170", 0.14 * a); }
  for (let i = 0; i < 16; i++) { const u = 0.05 + i * 0.058; if (u > reveal) break; const p = BAND(u); c.fillStyle = `rgba(12,10,28,${0.28 * a})`; c.beginPath(); c.ellipse(p[0], p[1] + gyShift + 14 * Math.sin(i * 1.7), 110, 16, -0.28 + 0.1 * Math.sin(i), 0, 6.28); c.fill(); }
  for (const s of RIVER) {
    const u = (s.u + s.v * t) % 1; if (u > reveal) continue;
    const p = BAND(u), nx = 0.16, px = p[0] + nx * s.off, py = p[1] + s.off + gyShift;
    const tw = 0.55 + 0.45 * Math.sin(t * 2.3 + s.ph), edge = clamp((reveal - u) * 12);
    c.globalAlpha = a * edge * (0.25 + 0.65 * tw) * clamp(1.2 - Math.abs(s.off) / 170); c.fillStyle = s.hot > 0.85 ? "#cddcff" : s.hot < 0.1 ? "#ffd9b0" : "#fff1dc";
    c.beginPath(); c.arc(px, py, s.sz, 0, 6.28); c.fill();
  }
  c.restore();
};

// ================================================================ 1929 props
const DOME: P = [400, 1010];
const SMUDGE: P = [1215, 290];
const AIM = Math.atan2(SMUDGE[1] - DOME[1], SMUDGE[0] - DOME[0]);
const drawDome = (c: Ctx, a: number) => {
  if (a <= 0) return; const [x, y] = DOME, R = 300;
  c.save(); c.globalAlpha = a;
  // telescope tube, poking out along the aim
  const t0: P = [x + Math.cos(AIM) * 110, y + Math.sin(AIM) * 110], t1: P = [x + Math.cos(AIM) * 430, y + Math.sin(AIM) * 430];
  inked(c, [t0, t1], "#8a84b8", 74, { alpha: a }); c.save(); c.translate(-6, -6); c.strokeStyle = "#c9c4ea"; c.lineWidth = 16; c.lineCap = "round"; c.beginPath(); c.moveTo(t0[0], t0[1]); c.lineTo(t1[0], t1[1]); c.stroke(); c.restore();
  const ring = (d: number) => { const p: P = [x + Math.cos(AIM) * d, y + Math.sin(AIM) * d], n: P = [-Math.sin(AIM) * 46, Math.cos(AIM) * 46]; inked(c, [[p[0] - n[0], p[1] - n[1]], [p[0] + n[0], p[1] + n[1]]], "#5a548a", 14, { alpha: a }); };
  ring(250); ring(420);
  // the dome, with its slit cut toward the sky
  c.fillStyle = OUT; c.beginPath(); c.arc(x, y, R + 8, Math.PI, 0); c.lineTo(x + R + 8, H + 10); c.lineTo(x - R - 8, H + 10); c.closePath(); c.fill();
  c.save(); c.beginPath(); c.arc(x, y, R, Math.PI, 0); c.lineTo(x + R, H); c.lineTo(x - R, H); c.closePath(); c.clip();
  c.fillStyle = "#5a548a"; c.fillRect(x - R, y - R, R * 2, R + 100);
  c.fillStyle = "#8f89c9"; c.beginPath(); c.arc(x - 40, y - 40, R * 0.95, 0, 6.28); c.fill();
  c.fillStyle = "#b9b3d9"; c.beginPath(); c.arc(x - 90, y - 110, R * 0.55, 0, 6.28); c.fill();
  c.save(); c.translate(x, y); c.rotate(AIM + Math.PI / 2); c.fillStyle = "#15122b"; c.fillRect(-48, -R - 20, 96, R + 20); c.restore();
  c.restore();
  c.fillStyle = "#3a355f"; c.fillRect(x - R - 20, y, R * 2 + 40, 90); c.fillStyle = OUT; c.fillRect(x - R - 20, y - 4, R * 2 + 40, 8);
  // the tube's near end over the slit
  inked(c, [[x + Math.cos(AIM) * 40, y + Math.sin(AIM) * 40], t0], "#8a84b8", 60, { alpha: a });
  c.restore();
};
const ANDRO: P[] = [[985, 610], [1110, 520], [1250, 455], [1450, 375]];
const ANDRO_UP: P[] = [[1250, 455], [1232, 372]];

// ================================================================ draw
const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const draw = (ctx: Ctx, frame: number, env: Env) => {
  const t = frame / FPS, g = new Gfx(ctx, env, frame, FLAT), sc = env.scale;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(space(env).canvas as CanvasImageSource, 0, 0); ctx.setTransform(sc, 0, 0, sc, 0, 0);
  motes(ctx, t, 0.75);
  const AL = layer(env, "a2Art"), c = AL.ctx;
  const words: (() => void)[] = [];
  const say = (s: string, x: number, y: number, o: Parameters<typeof text>[4]) => { words.push(() => text(g, s, x, y, o)); };

  // ---------------------------------------------------------------- S1-S2: hill, sky river, horizon
  const tilt = ease(ramp(t, CUE.years, 1.6)), leave = ease(ramp(t, 9.3, 1.1));
  const gy = -150 * (1 - tilt) + 60 + 700 * leave; // ground drops as we look up, then leaves as we pull back
  const bandA = 1 - ramp(t, 9.5, 0.9), reveal = ease(ramp(t, CUE.years + 0.2, 2.6));
  drawRiver(c, t, reveal, 0, bandA);
  const groundA = 1 - ramp(t, 10.0, 0.5);
  if (groundA > 0) {
    const structs: [number, number, (c: Ctx, x: number, y: number, a: number) => void][] = [[3.1, 380, stones], [4.5, 800, pyramid], [5.9, 1610, observatory]];
    structs.forEach(([t0, x, f]) => { const p = back(clamp(ramp(t, t0, 0.55))); if (p > 0) f(c, x, hillY(x) + gy + (1 - p) * 90 + 4, groundA * clamp(p * 2)); });
    drawHill(c, gy, groundA);
    const fx = 1230, fy = hillY(fx) + gy + 4;
    figure(c, fx, fy, groundA);
    const pd = back(clamp(ramp(t, 0.25, 0.6)));
    if (pd > 0 && t < 3.6) { pin(c, fx + 2, fy - 200 - (1 - pd) * 260, 1.3, groundA * (1 - ramp(t, 2.5, 0.4))); say("YOU ARE HERE", fx + 2, fy - 330 - (1 - pd) * 260, { cap: 26, color: CREAM, align: "center", progress: ramp(t, 0.6, 0.6), opacity: 1 - ramp(t, 2.5, 0.4) }); }
  }

  // ---------------------------------------------------------------- S3-S4: our galaxy, the boundary, darkness, shatter, zoom out
  const mwIn = ease(ramp(t, 9.5, 2.0)), zoomE = ease(ramp(t, CUE.offby, 1.9)), Z = Math.exp(Math.log(0.012) * zoomE);
  const mwA = ramp(t, 9.45, 0.7) * (1 - ramp(t, 22.4, 0.6));
  const MW_TILT = -0.22;
  // the shattering reveals a universe of galaxies behind the wall
  const cosA = ramp(t, 18.85, 0.9) * (1 - ramp(t, 22.4, 0.6));
  if (cosA > 0) for (const q of COSMIC) { const x = C[0] + q.x * Z, y = C[1] + q.y * Z, s = q.s * Z; if (x < -60 || x > W + 60 || y < -60 || y > H + 60) continue; drawSprite(c, env, q.k, x, y, s, q.rot, cosA * clamp(0.35 + s / 40)); }
  if (mwA > 0) drawSpiral(c, { x: C[0], y: C[1], R: lerp(820, 330, mwIn) * Z, incl: lerp(0.07, 0.6, mwIn), tilt: MW_TILT, rot: t * 0.04, alpha: mwA }, MW_P, PAL_MW, t);
  // "the universe itself": a dashed wall around our galaxy
  const wallA = span(t, CUE.uni, 19.8, 0.3), BR = 480;
  if (wallA > 0) {
    const draw1 = ease(ramp(t, CUE.uni, 1.0)), shat = ramp(t, 18.85, 0.85);
    if (shat <= 0) { c.save(); c.globalAlpha = wallA; c.setLineDash([12, 12]); c.lineDashOffset = -t * 20; c.strokeStyle = CREAM; c.lineWidth = 4; c.beginPath(); c.arc(C[0], C[1], BR, -Math.PI / 2, -Math.PI / 2 + draw1 * Math.PI * 2); c.stroke(); c.setLineDash([]); c.restore(); }
    // darkness outside the wall
    const dk = span(t, CUE.island, 19.6, 0.9) * (1 - shat);
    if (dk > 0) { const dg = c.createRadialGradient(C[0], C[1], BR - 4, C[0], C[1], BR + 60); dg.addColorStop(0, "rgba(6,5,14,0)"); dg.addColorStop(1, `rgba(6,5,14,${0.96 * dk})`); c.fillStyle = dg; c.fillRect(0, 0, W, H); }
    // cracks, then the wall breaks into flying arcs
    const ck = ramp(t, CUE.wrong + 0.05, 0.5);
    if (ck > 0 && shat <= 0) { const r = rng(90); for (let k = 0; k < 7; k++) { const a0 = r() * 6.283; const pts: P[] = []; let a = a0, rad = BR; for (let s = 0; s < 5; s++) { pts.push([C[0] + Math.cos(a) * rad, C[1] + Math.sin(a) * rad]); a += (r() - 0.5) * 0.1; rad += (r() - 0.3) * 60; } inked(c, pts, "#fff8e0", 3, { progress: ck, alpha: wallA }); } }
    if (shat > 0) { const r = rng(91); for (let k = 0; k < 28; k++) { const a0 = (k / 28) * 6.283, a1 = a0 + 6.283 / 28 - 0.03, fly = easeOut(shat) * (120 + r() * 380), spin = (r() - 0.5) * 2 * shat, am = (a0 + a1) / 2; c.save(); c.globalAlpha = wallA * (1 - shat); c.translate(C[0] + Math.cos(am) * (BR + fly), C[1] + Math.sin(am) * (BR + fly)); c.rotate(spin); c.strokeStyle = CREAM; c.lineWidth = 4; c.beginPath(); c.arc(-Math.cos(am) * BR, -Math.sin(am) * BR, BR, a0, a1); c.stroke(); c.restore(); } glow(c, C[0], C[1], BR * 1.6, "255,241,220", 0.4 * (1 - shat) * shat * 4); }
  }
  // the pin returns: on our galaxy, and it stays on it as everything else grows around us
  const pinA = ramp(t, CUE.our + 0.1, 0.3) * (1 - ramp(t, 22.3, 0.5));
  if (pinA > 0) {
    const pd = back(clamp(ramp(t, CUE.our + 0.1, 0.55))), Rm = lerp(820, 330, mwIn) * Z, sunA = 0.9, sunR = 0.52;
    const u = Math.cos(sunA + t * 0.04) * sunR * Rm, v = Math.sin(sunA + t * 0.04) * sunR * Rm * lerp(0.07, 0.6, mwIn);
    const px = C[0] + u * Math.cos(MW_TILT) - v * Math.sin(MW_TILT), py = C[1] + u * Math.sin(MW_TILT) + v * Math.cos(MW_TILT);
    pin(c, px, py - (1 - pd) * 240, 1, pinA);
    say("YOU ARE HERE", px, py - 118 - (1 - pd) * 240, { cap: 22, color: CREAM, align: "center", opacity: pinA * clamp(pd) });
  }

  // ---------------------------------------------------------------- S5-S7: 1929
  const obsA = ramp(t, 22.7, 0.7) * (1 - ramp(t, CUE.galaxy + 0.2, 0.7));
  if (obsA > 0) {
    const dim = 1 - 0.45 * span(t, CUE.discover + 0.2, CUE.galaxy + 0.4, 0.5);
    // the Andromeda constellation, then the smudge beside it
    const conA = obsA * ramp(t, CUE.hubble, 0.8) * dim;
    if (conA > 0) {
      c.save(); c.globalAlpha = conA * 0.5; c.setLineDash([5, 9]); c.strokeStyle = "#8f89c9"; c.lineWidth = 2;
      c.beginPath(); ANDRO.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke();
      c.beginPath(); ANDRO_UP.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke(); c.setLineDash([]); c.restore();
      [...ANDRO, ANDRO_UP[1]].forEach((p, i) => { glow(c, p[0], p[1], 22, "255,241,220", 0.55 * conA); c.save(); c.globalAlpha = conA; c.fillStyle = CREAM; c.beginPath(); c.arc(p[0], p[1], i === 3 ? 4.2 : 3.2, 0, 6.28); c.fill(); c.restore(); });
    }
    const smA = obsA * ramp(t, CUE.hubble + 0.6, 0.8) * dim;
    if (smA > 0) { const pulse = t > CUE.smudge && t < CUE.discover ? 0.5 + 0.5 * Math.sin((t - CUE.smudge) * 5) : 0; c.save(); c.globalAlpha = smA; c.translate(SMUDGE[0], SMUDGE[1]); c.rotate(-0.55); c.scale(1, 0.38); const gr = c.createRadialGradient(0, 0, 0, 0, 0, 34); gr.addColorStop(0, "rgba(230,226,245,0.95)"); gr.addColorStop(1, "rgba(201,196,234,0)"); c.fillStyle = gr; c.beginPath(); c.arc(0, 0, 34, 0, 6.28); c.fill(); c.restore(); if (pulse > 0) { c.save(); c.globalAlpha = smA * pulse * 0.6; c.strokeStyle = YEL; c.lineWidth = 2.5; c.beginPath(); c.arc(SMUDGE[0], SMUDGE[1], 44 + pulse * 10, 0, 6.28); c.stroke(); c.restore(); } }
    // the sightline from the telescope to the smudge
    const sl = obsA * ramp(t, CUE.smudge - 0.3, 0.8) * dim;
    if (sl > 0) { const a: P = [DOME[0] + Math.cos(AIM) * 470, DOME[1] + Math.sin(AIM) * 470], b: P = [SMUDGE[0] - Math.cos(AIM) * 50, SMUDGE[1] - Math.sin(AIM) * 50], p = ease(ramp(t, CUE.smudge - 0.3, 0.8)); c.save(); c.globalAlpha = sl * 0.7; c.setLineDash([10, 12]); c.lineDashOffset = -t * 40; c.strokeStyle = YEL; c.lineWidth = 3; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(lerp(a[0], b[0], p), lerp(a[1], b[1], p)); c.stroke(); c.setLineDash([]); c.restore(); }
    drawDome(c, obsA * (0.55 + 0.45 * dim) * clamp(back(clamp(ramp(t, 22.8, 0.7)))));
  }

  // the eyepiece: opens on the smudge, stars resolve, then it grows to become the whole frame
  const eyeO = ease(ramp(t, CUE.discover, 0.9)), grow = ease(ramp(t, CUE.galaxy, 0.9));
  const eyeA = eyeO > 0 ? 1 - ramp(t, CUE.galaxy + 0.8, 0.3) : 0;
  const EYE: P = [lerp(lerp(SMUDGE[0], 1260, eyeO), C[0], grow), lerp(lerp(SMUDGE[1], 520, eyeO), C[1], grow)], ER = lerp(300 * eyeO, 1250, grow);
  const bloom = ease(ramp(t, CUE.galaxy + 0.1, 1.4));
  if (eyeA > 0 && ER > 1) {
    c.save(); c.beginPath(); c.arc(EYE[0], EYE[1], ER, 0, 6.28); c.clip();
    c.fillStyle = `rgba(8,7,15,${1 - grow})`; c.fillRect(EYE[0] - ER, EYE[1] - ER, ER * 2, ER * 2);
    const k = ER / 300, smA = 1 - bloom;
    if (smA > 0) {
      c.save(); c.globalAlpha = smA; c.translate(EYE[0], EYE[1]); c.rotate(-0.55); c.scale(1, 0.38); const gr = c.createRadialGradient(0, 0, 0, 0, 0, 230 * k); gr.addColorStop(0, "rgba(235,230,250,0.85)"); gr.addColorStop(0.5, "rgba(201,196,234,0.35)"); gr.addColorStop(1, "rgba(201,196,234,0)"); c.fillStyle = gr; c.beginPath(); c.arc(0, 0, 230 * k, 0, 6.28); c.fill(); c.restore();
      const r = rng(1923);
      for (let i = 0; i < 230; i++) { const u = (r() + r() + r() - 1.5) * 190, v = (r() + r() - 1) * 60, ap = ramp(t, CUE.discover + 0.9 + (i / 230) * 1.4, 0.3); if (ap <= 0) continue; const cu = Math.cos(-0.55), su = Math.sin(-0.55), x = EYE[0] + (u * cu - v * su) * k, y = EYE[1] + (u * su + v * cu) * k; c.globalAlpha = smA * ap * (0.5 + 0.5 * Math.sin(t * 3 + i)); c.fillStyle = i % 7 ? "#fff1dc" : "#cddcff"; c.beginPath(); c.arc(x, y, (0.8 + (i % 4) * 0.5) * Math.min(k, 2), 0, 6.28); c.fill(); }
      const cep = ramp(t, CUE.impossible, 0.4) * smA; if (cep > 0) { const pu = 0.5 + 0.5 * Math.sin((t - CUE.impossible) * 4.5); const x = EYE[0] + 70 * k, y = EYE[1] - 48 * k; glow(c, x, y, (16 + 26 * pu) * Math.min(k, 2), "255,209,102", 0.8 * cep); c.globalAlpha = cep; c.fillStyle = "#fff2c2"; c.beginPath(); c.arc(x, y, (2.5 + 2 * pu) * Math.min(k, 2), 0, 6.28); c.fill(); }
      c.globalAlpha = 1;
    }
    c.restore();
    const ringA = eyeA * (1 - grow);
    if (ringA > 0) { c.save(); c.globalAlpha = ringA; c.strokeStyle = OUT; c.lineWidth = 30; c.beginPath(); c.arc(EYE[0], EYE[1], ER + 12, 0, 6.28); c.stroke(); c.strokeStyle = "#8a84b8"; c.lineWidth = 16; c.beginPath(); c.arc(EYE[0], EYE[1], ER + 12, 0, 6.28); c.stroke(); c.strokeStyle = "#dcd8f0"; c.lineWidth = 4; c.beginPath(); c.arc(EYE[0], EYE[1], ER + 8, Math.PI * 1.05, Math.PI * 1.45); c.stroke(); c.globalAlpha = ringA * 0.25; c.strokeStyle = CREAM; c.lineWidth = 1.5; c.beginPath(); c.moveTo(EYE[0] - ER, EYE[1]); c.lineTo(EYE[0] + ER, EYE[1]); c.moveTo(EYE[0], EYE[1] - ER); c.lineTo(EYE[0], EYE[1] + ER); c.stroke(); c.restore(); }
  }

  // thought bubbles: "a cloud of gas?" and "a nearby star system?", each popped
  const bubble = (t0: number, tPop: number, label: string, inner: (x: number, y: number, r: number) => void) => {
    if (t < t0 || t > tPop + 0.6) return;
    const p = Math.max(0, back(clamp(ramp(t, t0, 0.45)))), pop = ramp(t, tPop, 0.12), bx = 640, by = 360, R = 165 * p * (1 + 0.14 * pop);
    if (p <= 0.001) return;
    const tails: P[] = [[600, 590], [585, 662], [575, 722]];
    if (pop < 1) {
      tails.forEach(([x, y], i) => { const rr = (26 - i * 7) * clamp(p * 1.3 - i * 0.15); if (rr <= 0) return; c.fillStyle = OUT; c.beginPath(); c.arc(x, y, rr + 5, 0, 6.28); c.fill(); c.fillStyle = "#2a2552"; c.beginPath(); c.arc(x, y, rr, 0, 6.28); c.fill(); });
      c.fillStyle = OUT; c.beginPath(); c.arc(bx, by, R + 7, 0, 6.28); c.fill(); c.fillStyle = "#1c1838"; c.beginPath(); c.arc(bx, by, R, 0, 6.28); c.fill();
      c.save(); c.beginPath(); c.arc(bx, by, R, 0, 6.28); c.clip(); inner(bx, by, R); c.restore();
      c.strokeStyle = "rgba(255,241,220,0.35)"; c.lineWidth = 3; c.beginPath(); c.arc(bx, by, R - 8, Math.PI * 1.1, Math.PI * 1.45); c.stroke();
    } else {
      const f = ramp(t, tPop + 0.12, 0.45), r = rng(Math.round(tPop * 10));
      for (let k = 0; k < 16; k++) { const a = (k / 16) * 6.283 + r() * 0.3, d = R + easeOut(f) * (80 + r() * 120); c.globalAlpha = 1 - f; c.fillStyle = k % 3 ? CREAM : RED; c.beginPath(); c.arc(bx + Math.cos(a) * d, by + Math.sin(a) * d, 7 * (1 - f) + 2, 0, 6.28); c.fill(); }
      c.globalAlpha = 1;
    }
    say(label, bx, by + 190, { cap: 28, color: CREAM, align: "center", progress: ramp(t, t0 + 0.2, 0.5), opacity: 1 - ramp(t, tPop, 0.3) });
  };
  bubble(CUE.gas, 34.05, "A CLOUD OF GAS?", (x, y, r) => { const q = rng(3); for (let i = 0; i < 9; i++) glow(c, x + (q() - 0.5) * r, y + (q() - 0.5) * r * 0.8, r * (0.35 + q() * 0.3), i % 2 ? "255,120,190" : "150,120,255", 0.55); for (let k = 0; k < 3; k++) { const pts: P[] = []; for (let i = 0; i <= 30; i++) { const a = i / 30 * 5 + k * 2 + t * 0.6, rr = r * (0.15 + i / 30 * 0.6); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8]); } c.strokeStyle = "rgba(255,170,215,0.6)"; c.lineWidth = 3; c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke(); } });
  bubble(CUE.star, 36.35, "A NEARBY STAR SYSTEM?", (x, y, r) => { const q = rng(8); glow(c, x, y, r * 0.8, "255,209,102", 0.3); for (let i = 0; i < 46; i++) { const a = q() * 6.283, d = Math.sqrt(q()) * r * 0.62, s = 1.5 + q() * q() * 5; const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d; glow(c, px, py, s * 3, "255,241,220", 0.5); c.fillStyle = q() > 0.8 ? "#cddcff" : "#fff2c2"; c.beginPath(); c.arc(px, py, s * (0.8 + 0.2 * Math.sin(t * 4 + i)), 0, 6.28); c.fill(); } });

  // ---------------------------------------------------------------- S8-S9: Andromeda
  if (t > CUE.galaxy) {
    // camera over Andromeda: bloom, pull back for distance, return for the stars, pull back for the Local Group
    const dPull = ease(ramp(t, CUE.distance, 1.2)) * (1 - ease(ramp(t, CUE.billions, 1.1)));
    const lg = ease(ramp(t, CUE.beginning, 1.5));
    const ax = lerp(lerp(C[0], 1430, dPull), 1190, lg), ay = lerp(lerp(C[1], 520, dPull), 520, lg), aR = lerp(lerp(560, 270, dPull), 150, lg) * lerp(0.35, 1, bloom);
    const whisper = span(t, CUE.whisper + 0.2, CUE.flare + 0.1, 0.7), flare = Math.exp(-Math.max(0, t - CUE.flare) * 3) * (t > CUE.flare ? 1 : 0);
    const doorFade = 1 - 0.65 * ramp(t, CUE.door, 0.8) - 0.35 * ramp(t, CUE.reveal, 0.6);
    const aA = bloom * (1 - 0.78 * whisper) * doorFade;
    const sparkle = t > CUE.billions + 0.3 && t < CUE.whisper + 0.3 ? lerp(250, 1700, ease(ramp(t, CUE.billions + 0.3, 2.3))) : undefined;
    // satellites M32 and M110
    const sat = (du: number, dv: number, rx: number, ry: number, rot: number) => { const ct = Math.cos(-0.55), st = Math.sin(-0.55), x = ax + (du * ct - dv * st) * aR / 560, y = ay + (du * st + dv * ct) * aR / 560; c.save(); c.globalAlpha = aA; c.translate(x, y); c.rotate(rot); c.scale(1, ry / rx); const gr = c.createRadialGradient(0, 0, 0, 0, 0, rx * aR / 560); gr.addColorStop(0, "#fffaf0"); gr.addColorStop(0.4, "rgba(255,236,205,0.7)"); gr.addColorStop(1, "rgba(255,236,205,0)"); c.fillStyle = gr; c.beginPath(); c.arc(0, 0, rx * aR / 560, 0, 6.28); c.fill(); c.restore(); };
    if (aA > 0) {
      if (flare > 0) glow(c, ax, ay, aR * 2.2, "255,241,220", 0.6 * flare);
      drawSpiral(c, { x: ax, y: ay, R: aR, incl: 0.3, tilt: -0.55, rot: t * 0.02, alpha: aA, wind: 1.3, sparkle }, M31_P, PAL_M31, t);
      sat(70, -230, 26, 20, 0); sat(-170, 280, 46, 20, 0.9);
    }
    // the 1929 smudge laid over it: what we thought we were seeing
    if (whisper > 0) { c.save(); c.globalAlpha = whisper * 0.75; c.translate(ax, ay); c.rotate(-0.55); c.scale(1, 0.38); const gr = c.createRadialGradient(0, 0, 0, 0, 0, aR * 0.75); gr.addColorStop(0, "rgba(230,226,245,0.9)"); gr.addColorStop(1, "rgba(201,196,234,0)"); c.fillStyle = gr; c.beginPath(); c.arc(0, 0, aR * 0.75, 0, 6.28); c.fill(); c.restore(); }
    // our galaxy, the distance and the light crossing it
    const mwB = (span(t, CUE.distance + 0.2, CUE.billions + 0.5, 0.5) + ramp(t, CUE.beginning + 0.4, 0.8)) * doorFade;
    if (mwB > 0) {
      const inLG = ramp(t, CUE.beginning + 0.3, 0.1) > 0, mx = inLG ? 660 : 430, my = inLG ? 650 : 650, mR = inLG ? 110 : 165;
      drawSpiral(c, { x: mx, y: my, R: mR, incl: 0.55, tilt: 0.3, rot: t * 0.04, alpha: clamp(mwB) }, MW_P, PAL_MW, t);
      const mwPin = span(t, CUE.distance + 0.5, CUE.billions + 0.4, 0.3);
      if (mwPin > 0) { const pd = back(clamp(ramp(t, CUE.distance + 0.5, 0.5))); pin(c, mx + 40, my - 20 - (1 - pd) * 200, 0.9, mwPin); say("YOU ARE HERE", mx + 40, my - 128 - (1 - pd) * 200, { cap: 20, color: CREAM, align: "center", opacity: mwPin }); }
      const lnA = span(t, CUE.distance + 0.7, CUE.billions + 0.2, 0.4);
      if (lnA > 0) { const a: P = [ax - aR * 0.55, ay + 15], b: P = [mx + mR + 20, my - 10], p = ease(ramp(t, CUE.distance + 0.7, 0.9)); c.save(); c.globalAlpha = lnA * 0.8; c.setLineDash([4, 16]); c.lineDashOffset = t * 50; c.strokeStyle = YEL; c.lineWidth = 5; c.lineCap = "round"; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(lerp(a[0], b[0], p), lerp(a[1], b[1], p)); c.stroke(); c.setLineDash([]); c.restore(); for (let k = 0; k < 3; k++) { const f = ((t - CUE.distance) * 0.35 + k / 3) % 1; const x = lerp(a[0], b[0], f), y = lerp(a[1], b[1], f); glow(c, x, y, 26, "255,209,102", 0.8 * lnA * p); } }
    }
    // Triangulum joins the Local Group
    const m33 = ramp(t, CUE.beginning + 0.8, 0.7) * doorFade;
    if (m33 > 0) drawSprite(c, env, 1, 1560, 300, 110, 0.4, m33);
  }

  // ---------------------------------------------------------------- S9-S10: the door, and through it
  const doorA = ramp(t, CUE.door, 0.4);
  const fly = ease(clamp((t - CUE.reveal) / 1.3) ** 1.6), ds = Math.exp(Math.log(9) * fly);
  const deepA = ramp(t, CUE.reveal + 0.5, 0.7);
  if (deepA > 0) {
    const tr = t - CUE.reveal, s = 0.3 * tr + 0.16 * tr * tr;
    const items = DEEP.map((d) => ({ d, z: d.z - s })).filter((o) => o.z > 0.05).sort((a, b) => b.z - a.z);
    c.save(); c.globalAlpha = deepA * 0.25; c.strokeStyle = CREAM; c.lineWidth = 1.5; const rr = rng(66); for (let k = 0; k < 60; k++) { const a = rr() * 6.283, d0 = ((rr() + tr * (0.4 + rr() * 0.5)) % 1) * 1100; c.beginPath(); c.moveTo(C[0] + Math.cos(a) * d0, C[1] + Math.sin(a) * d0); c.lineTo(C[0] + Math.cos(a) * (d0 + 30 + d0 * 0.12), C[1] + Math.sin(a) * (d0 + 30 + d0 * 0.12)); c.stroke(); } c.restore();
    for (const { d, z } of items) { const f = 0.55 / z, x = C[0] + d.x * 560 * f, y = C[1] + d.y * 560 * f, size = 70 * d.s * f; if (x < -size || x > W + size || y < -size || y > H + size) continue; drawSprite(c, env, d.k, x, y, size, d.rot + tr * 0.1, deepA * clamp((5 - z) / 1.4) * clamp((z - 0.05) / 0.12)); }
  }
  if (doorA > 0 && ds < 9) {
    const dw = 300 * ds, dh = 480 * ds, dx = C[0] - dw / 2, dy = C[1] - dh / 2, open = ease(ramp(t, CUE.door + 0.6, 1.2)), a = doorA * (1 - ramp(t, CUE.reveal + 0.9, 0.4));
    c.save(); c.globalAlpha = a;
    glow(c, C[0], C[1], 520 * ds * (0.4 + 0.6 * open), "255,233,184", 0.55 * open);
    // light beyond the doorway, with galaxies in it
    c.save(); c.beginPath(); c.roundRect(dx, dy, dw, dh, 30 * ds); c.clip();
    const lg = c.createRadialGradient(C[0], C[1], 0, C[0], C[1], dh * 0.7); lg.addColorStop(0, `rgba(255,250,235,${open})`); lg.addColorStop(0.5, `rgba(255,220,160,${0.9 * open})`); lg.addColorStop(1, `rgba(120,90,200,${0.8 * open})`); c.fillStyle = "#08070f"; c.fillRect(dx, dy, dw, dh); c.fillStyle = lg; c.fillRect(dx, dy, dw, dh);
    const q = rng(12); for (let i = 0; i < 16; i++) drawSprite(c, env, i % 6, dx + q() * dw, dy + q() * dh, (22 + q() * 30) * ds, q() * 6.28, open * 0.9);
    c.restore();
    // the frame, drawn on
    const fr = ease(ramp(t, CUE.door, 0.6)), pts: P[] = [[dx, dy + dh], [dx, dy + 30 * ds], [dx + 30 * ds, dy], [dx + dw - 30 * ds, dy], [dx + dw, dy + 30 * ds], [dx + dw, dy + dh]];
    inked(c, pts, CREAM, 10 * ds, { progress: fr, alpha: a });
    // the door panel swings open on its left hinge
    const pw = dw * (1 - 0.9 * open), sk = 40 * ds * open;
    if (pw > 2) { c.fillStyle = OUT; c.beginPath(); c.moveTo(dx, dy); c.lineTo(dx + pw, dy + sk); c.lineTo(dx + pw, dy + dh - sk); c.lineTo(dx, dy + dh); c.closePath(); c.fill(); c.fillStyle = "#2a2552"; c.beginPath(); c.moveTo(dx + 6, dy + 6); c.lineTo(dx + pw - 6, dy + sk + 6); c.lineTo(dx + pw - 6, dy + dh - sk - 6); c.lineTo(dx + 6, dy + dh - 6); c.closePath(); c.fill(); c.fillStyle = "#3a355f"; c.fillRect(dx + pw * 0.15, dy + dh * 0.1 + sk * 0.5, pw * 0.7, dh * 0.3); c.fillRect(dx + pw * 0.15, dy + dh * 0.52, pw * 0.7, dh * 0.34); c.fillStyle = YEL; c.beginPath(); c.arc(dx + pw * 0.85, dy + dh * 0.5, 9 * ds * (pw / dw + 0.3), 0, 6.28); c.fill(); }
    c.restore();
  }

  // legibility bands behind the busiest lettering
  const band = (y0: number, y1: number, a: number) => { if (a <= 0) return; const gr = c.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, "rgba(12,10,28,0)"); gr.addColorStop(0.35, `rgba(12,10,28,${0.8 * a})`); gr.addColorStop(0.65, `rgba(12,10,28,${0.8 * a})`); gr.addColorStop(1, "rgba(12,10,28,0)"); c.fillStyle = gr; c.fillRect(0, y0, W, y1 - y0); };
  band(780, 1060, ramp(t, CUE.offby + 0.2, 0.5) * (1 - ramp(t, 22.4, 0.5)));
  band(790, 1070, ramp(t, CUE.kept - 0.2, 0.5));
  band(30, 210, ramp(t, CUE.reveal + 0.3, 0.5));

  grainOver(env, c);
  blit(ctx, env, AL);

  // ================================================================ lettering
  say("WE THOUGHT WE KNEW", 460, 190, { cap: 44, color: CREAM, align: "center", progress: ramp(t, 0.15, 0.9), opacity: 1 - ramp(t, CUE.years + 0.3, 0.35) });
  say("WHERE WE WERE", 460, 260, { cap: 44, color: CREAM, align: "center", progress: ramp(t, 0.8, 0.7), opacity: 1 - ramp(t, CUE.years + 0.3, 0.35) });
  if (t > CUE.years && t < CUE.milky) { const o = 1 - ramp(t, CUE.called - 0.3, 0.3); say("FOR THOUSANDS OF YEARS", 700, 640, { cap: 40, color: CREAM, align: "center", progress: ramp(t, CUE.years + 0.3, 1.0), opacity: o }); }
  if (t > CUE.called - 0.1 && t < CUE.milky + 0.1) { const o = 1 - ramp(t, CUE.milky - 0.25, 0.3); say("AND CALLED IT", 960, 520, { cap: 36, color: CREAM, align: "center", progress: ramp(t, CUE.called, 0.5), opacity: o }); say("EVERYTHING", 960, 590, { cap: 118, color: YEL, align: "center", progress: ramp(t, CUE.everything, 0.6), opacity: o, w: 12 }); }
  const names: [number, number, string, string][] = [[CUE.milky, CUE.our, "THE MILKY WAY", CREAM], [CUE.our, CUE.uni, "OUR GALAXY", CREAM], [CUE.uni, CUE.island, "THE UNIVERSE ITSELF", CREAM], [CUE.island, CUE.wrong, "A SINGLE ISLAND OF LIGHT", YEL]];
  names.forEach(([a0, a1, s, col]) => { if (t > a0 - 0.05 && t < a1 + 0.05) say(s, 960, 70, { cap: 50, color: col, align: "center", progress: ramp(t, a0, 0.6), opacity: 1 - ramp(t, a1 - 0.22, 0.25), w: 5.5 }); });
  if (t > CUE.dark - 0.1 && t < CUE.wrong + 0.1) say("SURROUNDED BY ETERNAL DARKNESS", 960, 1000, { cap: 30, color: DIM, align: "center", progress: ramp(t, CUE.dark, 0.9), opacity: 1 - ramp(t, CUE.wrong - 0.2, 0.3) });
  if (t > CUE.wrong - 0.05 && t < CUE.y1929) {
    const o = 1 - ramp(t, 22.3, 0.4);
    say("NOT JUST WRONG", 960, 70, { cap: 64, color: RED, align: "center", progress: ramp(t, CUE.wrong, 0.45), opacity: o * (1 - ramp(t, CUE.offby - 0.2, 0.3)), w: 7 });
    say("OFF BY A FACTOR OF", 960, 70, { cap: 50, color: CREAM, align: "center", progress: ramp(t, CUE.offby, 0.6), opacity: o, w: 5.5 });
    const n = t < CUE.offby + 0.1 ? 1 : Math.exp(Math.log(2e12) * ease(ramp(t, CUE.offby + 0.1, 1.2)));
    say("GALAXIES", 960, 820, { cap: 26, color: DIM, align: "center", opacity: o * ramp(t, CUE.offby + 0.05, 0.3) });
    say(fmt(n), 960, 862, { cap: 56, color: CREAM, align: "center", opacity: o * ramp(t, CUE.offby + 0.05, 0.3), w: 6 });
    say("TWO TRILLION", 960, 950, { cap: 60, color: YEL, align: "center", progress: ramp(t, CUE.trillion, 0.6), opacity: o, w: 6.5 });
  }
  if (t > CUE.y1929 - 0.05 && t < CUE.discover + 0.3) { const o = 1 - ramp(t, CUE.discover, 0.3); say("1929", 160, 110, { cap: 120, color: YEL, progress: ramp(t, CUE.y1929, 0.6), opacity: o, w: 12 }); say("EDWIN HUBBLE", 164, 270, { cap: 40, color: CREAM, progress: ramp(t, CUE.hubble, 0.8), opacity: o }); say("AIMS A TELESCOPE", 164, 330, { cap: 28, color: DIM, progress: ramp(t, CUE.hubble + 0.9, 0.7), opacity: o }); say("A FAINT SMUDGE", SMUDGE[0], SMUDGE[1] - 96, { cap: 26, color: CREAM, align: "center", progress: ramp(t, CUE.smudge, 0.5), opacity: o }); say("ANDROMEDA", 1470, 405, { cap: 30, color: DIM, progress: ramp(t, CUE.andro, 0.5), opacity: o }); }
  if (t > CUE.impossible - 0.05 && t < CUE.gas + 0.2) { const o = 1 - ramp(t, CUE.gas - 0.1, 0.3); say("SOMETHING THAT", 160, 150, { cap: 40, color: CREAM, progress: ramp(t, CUE.impossible - 0.4, 0.5), opacity: o }); say("SHOULD HAVE BEEN", 160, 215, { cap: 40, color: CREAM, progress: ramp(t, CUE.impossible, 0.5), opacity: o }); say("IMPOSSIBLE", 160, 290, { cap: 76, color: YEL, progress: ramp(t, CUE.impossible + 0.4, 0.6), opacity: o, w: 8 }); }
  if (t > CUE.galaxy - 0.05 && t < CUE.billions + 0.1) say("AN ENTIRE GALAXY", 960, 70, { cap: 62, color: CREAM, align: "center", progress: ramp(t, CUE.galaxy, 0.6), opacity: 1 - ramp(t, CUE.billions - 0.25, 0.3), w: 7 });
  if (t > CUE.distance + 0.9 && t < CUE.billions + 0.1) say("MORE THAN 2,000,000 LIGHT-YEARS AWAY", 960, 900, { cap: 32, color: YEL, align: "center", progress: ramp(t, CUE.distance + 0.9, 0.9), opacity: 1 - ramp(t, CUE.billions - 0.25, 0.3) });
  if (t > CUE.billions - 0.05 && t < CUE.whisper + 0.1) say("HUNDREDS OF BILLIONS OF STARS", 960, 70, { cap: 50, color: CREAM, align: "center", progress: ramp(t, CUE.billions, 0.8), opacity: 1 - ramp(t, CUE.whisper - 0.2, 0.3), w: 5.5 });
  if (t > CUE.whisper - 0.05 && t < CUE.flare + 0.4) { const o = 1 - ramp(t, CUE.flare + 0.05, 0.3); say("MISTAKEN FOR", 960, 860, { cap: 30, color: DIM, align: "center", progress: ramp(t, CUE.whisper, 0.5), opacity: o }); say("A WHISPER OF NOTHING", 960, 920, { cap: 48, color: CREAM, align: "center", progress: ramp(t, CUE.whisper + 0.8, 0.8), opacity: o }); }
  if (t > CUE.beginning - 0.05 && t < CUE.door + 0.1) say("JUST THE BEGINNING", 960, 70, { cap: 62, color: YEL, align: "center", progress: ramp(t, CUE.beginning, 0.6), opacity: 1 - ramp(t, CUE.door - 0.2, 0.3), w: 7 });
  if (t > CUE.door - 0.05 && t < CUE.reveal + 0.1) say("HUBBLE OPENED THE DOOR", 960, 70, { cap: 56, color: CREAM, align: "center", progress: ramp(t, CUE.door, 0.7), opacity: 1 - ramp(t, CUE.reveal - 0.2, 0.3), w: 6 });
  if (t > CUE.reveal - 0.05) say("AND THE UNIVERSE KEPT REVEALING ITSELF", 960, 90, { cap: 38, color: CREAM, align: "center", progress: ramp(t, CUE.reveal, 1.0), opacity: 1 - ramp(t, CUE.kept - 0.2, 0.4) });
  if (t > CUE.kept - 0.05) { say("IT KEPT GOING", 960, 850, { cap: 64, color: CREAM, align: "center", progress: ramp(t, CUE.kept, 0.5), w: 7 }); say("AND GOING", 960, 945, { cap: 64, color: YEL, align: "center", progress: ramp(t, CUE.going, 0.45), w: 7 }); }

  g.group("plain", () => words.forEach((f) => f()));
};

export const andromedaOpus: Film = {
  meta: { title: "andromedaOpus", W, H, fps: FPS, bpm: 120, durationFrames: DURATION },
  assets: { images: {} },
  shots: [{ id: "chunk3b", start: 0, end: DURATION, draw }],
};
