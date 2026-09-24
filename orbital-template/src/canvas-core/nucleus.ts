import { Gfx, rng, type Ctx, type Env, type Medium, type P } from "./core";
import { Film } from "./film";
import { letter, width } from "./drafting";
import { clamp, lerp, mix } from "./gallery";

// NUCLEUS · chunk 1, narration-timed (no loop). One continuous 44.7 s shot that follows the voice:
// zoom into the nucleus -> two kinds of particle -> protons (+) -> neutrons (no charge, "neutral")
// -> proton count = element -> H He C O Fe Au on each word -> take one proton off gold (platinum),
// add two (mercury) -> neutrons add mass and bind it (strong force, femtometres) -> add neutrons,
// still mercury. Style: flat space explainer (indigo streaked space, banded flat colour, grain,
// thick dark outlines, orbit dashes, dashed guides, one warm glow).
//
// CUES are seconds in the TTS file, measured from its pauses (ffmpeg silencedetect, -38 dB, 0.18 s).

const FPS = 30, BPM = 120;
const S = (sec: number) => Math.round(sec * FPS);
const DURATION = 1340;                                // 44.667 s; the audio is 44.669 s
const W = 1920, H = 1080, CX = 700, CY = 500;
const CUE = {
  zoomEnd: 2.9, twoKinds: 3.17, protons: 5.54, neutrons: 8.98, neutral: 12.12, count: 13.9, element: 15.94,
  H: 18.57, He: 20.81, C: 22.5, O: 24.0, Fe: 25.62, Au: 27.33,
  change: 29.5, entirely: 31.17, defines: 33.68, mass: 35.3, hold: 37.07, distances: 38.89, identity: 42.2,
};

// ---- palette
const BG_IN = "#2e2958", BG_OUT = "#15122b", STREAK = "#b9b3ff", OUT = "#120f24", CREAM = "#fff1dc";
const PRO_B = ["#b8322f", "#f0553a", "#ff8a4c", "#ffc27a"], NEU_B = ["#3c2f8f", "#6246c9", "#8f6cf0", "#c3aaff"];
const GREY_B = ["#3a355f", "#5a548a", "#8a84b8", "#c9c4ea"];     // before the two kinds are told apart
const PRO_T = "#ff8a4c", NEU_T = "#b69cff", YEL = "#ffd166", DIM = "#8f89c9";
const DASHES = ["#ff5fa2", "#ff8a4c", "#ffd166", "#fff1dc", "#ff6f61"];
const FLAT: Medium = { nib: 1, taper: 0, pressure: 0, retrace: false, wobble: 0, rough: 0 };

// ---- nuclei
type V3 = [number, number, number];
type Lay = { pro: V3[]; neu: V3[] };
const layout = (Z: number, N: number): Lay => {
  const A = Z + N, pro: V3[] = [], neu: V3[] = [], ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < A; i++) {
    const rr = A === 1 ? 0 : Math.cbrt((i + 0.5) / A), y = 1 - (2 * (i + 0.5)) / A, ring = Math.sqrt(1 - y * y), a = i * ga;
    const v: V3 = [Math.cos(a) * ring * rr, y * rr, Math.sin(a) * ring * rr];
    (Math.floor(((i + 1) * Z) / A) > Math.floor((i * Z) / A) ? pro : neu).push(v);
  }
  return { pro, neu };
};
const surf = (x: number, y: number, z: number): V3 => { const l = Math.hypot(x, y, z); return [x / l, y / l, z / l]; };
const AU = layout(79, 118), HG: Lay = { pro: [...AU.pro, surf(0.4, -0.7, 0.6)], neu: AU.neu };
type Key = { f: number; sym: string; name: string; Z: number; N: number; lay: Lay; slot: number };
const key = (sec: number, sym: string, name: string, lay: Lay, slot: number): Key => ({ f: S(sec), sym, name, Z: lay.pro.length, N: lay.neu.length, lay, slot });
const KEYS: Key[] = [
  key(0, "C", "CARBON", layout(6, 6), -1),
  key(CUE.H, "H", "HYDROGEN", layout(1, 0), 0),
  key(CUE.He, "He", "HELIUM", layout(2, 2), 1),
  key(CUE.C, "C", "CARBON", layout(6, 6), 2),
  key(CUE.O, "O", "OXYGEN", layout(8, 8), 3),
  key(CUE.Fe, "Fe", "IRON", layout(26, 30), 4),
  key(CUE.Au, "Au", "GOLD", AU, 5),
  key(CUE.change + 0.3, "Pt", "PLATINUM", { pro: AU.pro.slice(0, 78), neu: AU.neu }, 5),  // one proton leaves
  key(CUE.entirely, "Hg", "MERCURY", HG, 5),                                             // two arrive
  key(CUE.identity + 0.1, "Hg", "MERCURY", { pro: HG.pro, neu: [...HG.neu, surf(-0.6, -0.5, 0.6), surf(0.7, 0.3, 0.6)] }, 5),
  key(CUE.identity + 1.3, "Hg", "MERCURY", { pro: HG.pro, neu: [...HG.neu, surf(-0.6, -0.5, 0.6), surf(0.7, 0.3, 0.6), surf(0.1, 0.8, 0.6)] }, 5),
];
const ROW = [["H", 1], ["He", 2], ["C", 6], ["O", 8], ["Fe", 26], ["Au", 79]] as const;
const MOVE = 14;
const nucR = (A: number) => 52 / Math.pow(A, 0.15);
const ballR = (A: number) => (A <= 1 ? 0 : nucR(A) * Math.cbrt(A) * 1.12);
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const ramp = (f: number, a: number, len = 10) => clamp((f - a) / len);
const span = (f: number, a: number, b: number, len = 8) => ramp(f, a, len) * clamp((b - f) / len);

// ---- cached surfaces
const cached = <T>(env: Env, k: string, make: () => T): T => { const id = `${k}:${env.scale}`; let v = env.cache.get(id) as T | undefined; if (!v) { v = make(); env.cache.set(id, v); } return v; };
const grain = (env: Env) => cached(env, "grain", () => {
  const Sz = 256, L = env.canvas(Sz, Sz), c = L.ctx, r = rng(77);
  for (let i = 0; i < 5200; i++) { const v = r(); c.fillStyle = v > 0.5 ? `rgba(255,255,255,${(0.05 + r() * 0.1).toFixed(3)})` : `rgba(0,0,0,${(0.06 + r() * 0.12).toFixed(3)})`; c.fillRect(Math.floor(r() * Sz), Math.floor(r() * Sz), 1 + (r() > 0.8 ? 1 : 0), 1); }
  return L;
});
const space = (env: Env) => cached(env, "space", () => {
  const L = env.canvas(W * env.scale, H * env.scale), c = L.ctx, r = rng(41);
  c.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  const g = c.createRadialGradient(W * 0.45, H * 0.48, 60, W * 0.5, H * 0.5, W * 0.75); g.addColorStop(0, BG_IN); g.addColorStop(1, BG_OUT);
  c.fillStyle = g; c.fillRect(0, 0, W, H); c.lineCap = "round";
  for (let i = 0; i < 2600; i++) { const x = r() * W, y = r() * H, l = 6 + r() * 16; c.strokeStyle = STREAK; c.globalAlpha = 0.03 + r() * 0.07; c.lineWidth = 1 + r() * 0.8; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(-0.42) * l, y + Math.sin(-0.42) * l); c.stroke(); }
  c.globalAlpha = 1; return L;
});

// ---- lettering (outlined), with lowercase e/u/t/g for He Fe Au Pt Hg
const LOWER: Record<string, P[][]> = {
  e: [[[0.4, 4.1], [3.2, 4.1], [3.1, 3.1], [2.3, 2.3], [1.2, 2.3], [0.3, 3.2], [0.3, 5.0], [1.2, 5.9], [2.5, 5.9], [3.3, 5.3]]],
  u: [[[0.3, 2.3], [0.3, 5.0], [1.1, 5.9], [2.3, 5.9], [3.2, 5.0]], [[3.2, 2.3], [3.2, 5.9]]],
  t: [[[1.3, 0.8], [1.3, 5.1], [2.0, 5.9], [3.0, 5.7]], [[0.2, 2.4], [2.8, 2.4]]],
  g: [[[3.2, 2.3], [3.2, 6.6], [2.4, 7.5], [0.9, 7.5], [0.3, 7.0]], [[3.2, 3.2], [2.4, 2.3], [1.2, 2.3], [0.3, 3.2], [0.3, 4.8], [1.2, 5.6], [2.4, 5.6], [3.2, 4.8]]],
};
type TOpt = { cap: number; color: string; seed: number; w: number; progress?: number; align?: "left" | "center" | "right"; opacity?: number };
const text = (g: Gfx, s: string, x: number, y: number, o: TOpt) => {
  const { cap, color, seed, w, progress = 1, align = "left", opacity = 1 } = o;
  if (progress <= 0) return;
  const low = s.length === 2 && LOWER[s[1]] ? s[1] : null, sc = cap / 6;
  const total = low ? width(s[0], cap) + (1.25 + 3.6) * sc : width(s, cap);
  const x0 = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
  for (const [col, ww] of [[OUT, w + Math.max(5, w * 0.9)], [color, w]] as [string, number][]) {
    const pass = { cap, color: col, seed, w: ww, opacity };
    if (!low) { letter(g, s, x0, y, { ...pass, progress }); continue; }
    letter(g, s[0], x0, y, { ...pass, progress: clamp(progress * 1.6) });
    const lx = x0 + width(s[0], cap) + 1.25 * sc, lp = clamp(progress * 2.4 - 1.4);
    LOWER[low].forEach((st, j) => { const pp = clamp(lp * LOWER[low].length - j); if (pp > 0) g.pen(st.map(([px, py]) => [lx + (px + (6 - py) * 0.2) * sc, y + py * sc] as P), { w: ww, color: col, seed: seed + 7 + j, wobble: 0, boil: 0, taper: 0, opacity, progress: pp }); });
  }
};

// ---- one nucleon: outline, hard bands toward the light, spec arc
const nucleon = (c: Ctx, x: number, y: number, r: number, bands: string[], shade: number) => {
  c.fillStyle = OUT; c.beginPath(); c.arc(x, y, r + Math.max(2.5, r * 0.12), 0, Math.PI * 2); c.fill();
  c.save(); c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.clip();
  c.fillStyle = bands[0]; c.fillRect(x - r, y - r, r * 2, r * 2);
  [[0.9, 0.14], [0.68, 0.3], [0.4, 0.46]].forEach(([k, off], i) => { c.fillStyle = bands[i + 1]; c.beginPath(); c.arc(x - r * off, y - r * off, r * k, 0, Math.PI * 2); c.fill(); });
  if (shade > 0) { c.fillStyle = BG_OUT; c.globalAlpha = shade; c.fillRect(x - r, y - r, r * 2, r * 2); c.globalAlpha = 1; }
  c.restore();
  c.strokeStyle = "rgba(255,248,236,0.85)"; c.lineWidth = Math.max(1.5, r * 0.1); c.lineCap = "round";
  c.beginPath(); c.arc(x, y, r * 0.74, Math.PI * 1.08, Math.PI * 1.38); c.stroke();
};
const plus = (c: Ctx, x: number, y: number, r: number, a: number) => {
  if (a <= 0) return; const s = r * 0.4; c.lineCap = "round"; c.globalAlpha = a;
  for (const [col, lw] of [[OUT, r * 0.3], [CREAM, r * 0.16]] as [string, number][]) { c.strokeStyle = col; c.lineWidth = Math.max(2, lw); c.beginPath(); c.moveTo(x - s, y); c.lineTo(x + s, y); c.moveTo(x, y - s); c.lineTo(x, y + s); c.stroke(); }
  c.globalAlpha = 1;
};
const capsule = (c: Ctx, x: number, y: number, w: number, h: number) => {
  c.fillStyle = OUT; c.beginPath(); c.roundRect(x - w / 2 - 6, y - h / 2 - 6, w + 12, h + 12, 40); c.fill();
  c.fillStyle = "#f0553a"; c.beginPath(); c.roundRect(x - w / 2, y - h / 2, w, h, 34); c.fill();
  c.fillStyle = "#ff8a4c"; c.beginPath(); c.roundRect(x - w / 2 + 8, y - h / 2 + 6, w - 16, h * 0.52, 28); c.fill();
};

type Dot = { x: number; y: number; z: number; r: number; pro: boolean; u: V3 };

const draw = (ctx: Ctx, frame: number, env: Env) => {
  const g = new Gfx(ctx, env, frame, FLAT), sc = env.scale, f = frame, sec = f / FPS;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(space(env).canvas as CanvasImageSource, 0, 0);
  ctx.setTransform(sc, 0, 0, sc, 0, 0);

  // which nucleus, and how far into the change to it
  let ki = 0; for (let i = 0; i < KEYS.length; i++) if (KEYS[i].f <= f) ki = i;
  const K = KEYS[ki], PK = KEYS[Math.max(0, ki - 1)], local = f - K.f;
  const A = K.Z + K.N, pA = PK.Z + PK.N, m = ki === 0 ? 1 : ease(clamp(local / MOVE));
  const squeeze = 1 - 0.05 * span(f, S(CUE.hold), S(CUE.identity), 12) * (0.5 + 0.5 * Math.sin(f * 0.35));
  const R = lerp(ballR(pA), ballR(A), m) * squeeze, nr = lerp(nucR(pA), nucR(A), m), body = R + nr;
  const zoom = lerp(0.1, 1, ease(clamp(sec / CUE.zoomEnd)));

  // slow continuous turn (never a loop: no whole-cycle constraint needed)
  const th = sec * 0.42, tilt = 0.36 + 0.08 * Math.sin(sec * 0.5);
  const rot = ([x, y, z]: V3): V3 => { const x1 = x * Math.cos(th) + z * Math.sin(th), z1 = -x * Math.sin(th) + z * Math.cos(th); return [x1, y * Math.cos(tilt) - z1 * Math.sin(tilt), y * Math.sin(tilt) + z1 * Math.cos(tilt)]; };
  const dots: Dot[] = [];
  const place = (from: V3 | undefined, to: V3 | undefined, i: number, pro: boolean) => {
    const r = rng(i * 97 + (pro ? 5 : 11) + ki * 1013), a = r() * Math.PI * 2, far = 1.0 + r() * 0.5, dir = [Math.cos(a), Math.sin(a)];
    const jig = (q: number) => Math.sin(sec * (4.5 + (i % 5) * 0.7) + i * 1.7 + q) * 1.6;
    let x: number, y: number, z: number, s = 1; const u = (to ?? from)!;
    if (from && to) { const fr = rot(from), t = rot(to); x = lerp(fr[0] * ballR(pA), t[0] * ballR(A), m) * squeeze; y = lerp(fr[1] * ballR(pA), t[1] * ballR(A), m) * squeeze; z = lerp(fr[2], t[2], m); }
    else if (to) { const t = rot(to), o = 1 - m; x = t[0] * R + dir[0] * W * far * o; y = t[1] * R + dir[1] * H * far * o; z = t[2]; }
    else { const fr = rot(from!), o = ease(clamp(local / (MOVE * 0.6))); x = fr[0] * ballR(pA) + dir[0] * W * far * o; y = fr[1] * ballR(pA) + dir[1] * H * far * o; z = fr[2]; s = 1 - o * 0.3; if (o >= 1) return; }
    dots.push({ x: CX + (x + jig(0)) * zoom, y: CY + (y + jig(2)) * zoom, z, r: nr * s * zoom, pro, u });
  };
  const L = K.lay, PL = ki === 0 ? K.lay : PK.lay;
  for (let i = 0; i < Math.max(L.pro.length, PL.pro.length); i++) place(PL.pro[i], L.pro[i], i, true);
  for (let i = 0; i < Math.max(L.neu.length, PL.neu.length); i++) place(PL.neu[i], L.neu[i], i, false);
  dots.sort((a, b) => a.z - b.z);

  // emphasis: who is being talked about
  const tint = ramp(f, S(CUE.twoKinds), 24);
  const dimN = 0.62 * span(f, S(CUE.protons), S(CUE.neutrons));
  const dimP = 0.62 * span(f, S(CUE.neutrons), S(CUE.count)) + 0.32 * span(f, S(CUE.mass), S(CUE.hold)) + 0.25 * span(f, S(CUE.identity), DURATION + 20);
  const popP = span(f, S(CUE.protons), S(CUE.neutrons)), popN = span(f, S(CUE.neutrons), S(CUE.count)) + span(f, S(CUE.mass), S(CUE.hold)) + span(f, S(CUE.identity), DURATION + 20);
  const plusA = ramp(f, S(CUE.protons), 12);
  const proB = PRO_B.map((c, i) => mix(GREY_B[i], c, tint)), neuB = NEU_B.map((c, i) => mix(GREY_B[i], c, tint));

  // glow + back half of the orbit field
  const bz = body * zoom;
  { const gl = ctx.createRadialGradient(CX, CY, bz * 0.3, CX, CY, bz * 2.6 + 60); gl.addColorStop(0, "rgba(255,138,76,0.42)"); gl.addColorStop(0.45, "rgba(255,95,162,0.12)"); gl.addColorStop(1, "rgba(255,95,162,0)"); ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H); }
  const RX = bz + 70 * zoom, RY = RX * 0.34, TILT = -0.22;
  const ell = (a: number, rx: number, ry: number): P => { const ex = Math.cos(a) * rx, ey = Math.sin(a) * ry; return [CX + ex * Math.cos(TILT) - ey * Math.sin(TILT), CY + ex * Math.sin(TILT) + ey * Math.cos(TILT)]; };
  const DR = rng(9), streams = Array.from({ length: 64 }, () => ({ k: 0.8 + DR() * 0.75, a0: DR() * Math.PI * 2, len: 0.1 + DR() * 0.4, w: 2.5 + DR() * 6, col: DASHES[Math.floor(DR() * DASHES.length)], n: 0.5 + DR() * 0.6 }));
  const orbit = (front: boolean) => {
    const c = ctx; c.save(); c.lineCap = "round";
    if (!front) for (const [kk, al] of [[1.15, 0.35], [1.5, 0.22]] as [number, number][]) {
      c.setLineDash([7, 11]); c.lineDashOffset = -sec * 14; c.strokeStyle = CREAM; c.globalAlpha = al; c.lineWidth = 1.4;
      c.beginPath(); for (let i = 0; i <= 120; i++) { const p = ell((i / 120) * Math.PI * 2, RX * kk, RY * kk); i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); } c.stroke();
    }
    c.setLineDash([]);
    for (const s of streams) {
      const a = s.a0 + sec * s.n * 1.4, steps = 14;
      for (let i = 0; i < steps; i++) {
        const a1 = a + (i / steps) * s.len, a2 = a + ((i + 1) / steps) * s.len;
        if ((Math.sin((a1 + a2) / 2) > 0) !== front) continue;
        const p1 = ell(a1, RX * s.k, RY * s.k), p2 = ell(a2, RX * s.k, RY * s.k);
        c.globalAlpha = 0.9 * Math.sin(((i + 0.5) / steps) * Math.PI) ** 0.4; c.strokeStyle = s.col; c.lineWidth = s.w * Math.max(0.35, zoom);
        c.beginPath(); c.moveTo(p1[0], p1[1]); c.lineTo(p2[0], p2[1]); c.stroke();
      }
    }
    c.restore();
  };
  orbit(false);

  // nucleons on their own layer, grain over them only
  const NL = cached(env, "nucLayer", () => env.canvas(W * sc, H * sc)), nc = NL.ctx;
  nc.setTransform(1, 0, 0, 1, 0, 0); nc.clearRect(0, 0, W * sc, H * sc); nc.setTransform(sc, 0, 0, sc, 0, 0); nc.globalCompositeOperation = "source-over";
  for (const d of dots) {
    const shade = clamp((0.2 - d.z) * 0.35, 0, 0.35) + (d.pro ? dimP : dimN);
    const rr = d.r * (1 + 0.07 * (d.pro ? popP : popN) * (0.6 + 0.4 * Math.sin(f * 0.4 + d.x * 0.05)));
    nucleon(nc, d.x, d.y, rr, d.pro ? proB : neuB, clamp(shade, 0, 0.8));
    if (d.pro && d.z > -0.3) plus(nc, d.x + rr * 0.04, d.y + rr * 0.04, rr, clamp((d.z + 0.3) * 3) * plusA * (1 - dimP * 0.8));
  }
  // the strong force: bright links between neighbouring nucleons on the near face
  const bind = span(f, S(CUE.hold), S(CUE.identity), 10);
  if (bind > 0) {
    // only the visible outer shell, and only true 3D neighbours, so links never cross the ball
    const near = dots.filter((d) => d.z > 0.25 && Math.hypot(...d.u) > 0.72), lim = (2.3 * nr) / Math.max(1, ballR(A));
    nc.lineCap = "round";
    for (let i = 0; i < near.length; i++) for (let j = i + 1; j < near.length; j++) {
      const a = near[i], b = near[j]; if (Math.hypot(a.u[0] - b.u[0], a.u[1] - b.u[1], a.u[2] - b.u[2]) > lim) continue;
      const pulse = 0.5 + 0.5 * Math.sin(f * 0.45 + i * 1.3 + j * 0.7);
      const p1: P = [lerp(a.x, b.x, 0.3), lerp(a.y, b.y, 0.3)], p2: P = [lerp(a.x, b.x, 0.7), lerp(a.y, b.y, 0.7)];
      nc.globalAlpha = bind * (0.35 + 0.65 * pulse);
      for (const [col, lw] of [[OUT, 9], [YEL, 4.5]] as [string, number][]) { nc.strokeStyle = col; nc.lineWidth = lw; nc.beginPath(); nc.moveTo(p1[0], p1[1]); nc.lineTo(p2[0], p2[1]); nc.stroke(); }
    }
    nc.globalAlpha = 1;
  }
  nc.setTransform(1, 0, 0, 1, 0, 0); nc.globalCompositeOperation = "source-atop"; nc.fillStyle = nc.createPattern(grain(env).canvas as CanvasImageSource, "repeat")!; nc.fillRect(0, 0, W * sc, H * sc); nc.globalCompositeOperation = "source-over";
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(NL.canvas as CanvasImageSource, 0, 0); ctx.setTransform(sc, 0, 0, sc, 0, 0);
  orbit(true);

  // size bar under the nucleus: "nuclear distances"
  const bar = span(f, S(CUE.distances), S(CUE.identity), 10);
  if (bar > 0) {
    const y = CY + bz + 64, x0 = CX - bz, x1 = CX + bz, c = ctx; c.save(); c.globalAlpha = bar; c.lineCap = "round";
    for (const [col, lw] of [[OUT, 7], [CREAM, 3]] as [string, number][]) { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.moveTo(x0, y); c.lineTo(lerp(x0, x1, ramp(f, S(CUE.distances), 16)), y); c.moveTo(x0, y - 14); c.lineTo(x0, y + 14); c.moveTo(x1, y - 14); c.lineTo(x1, y + 14); c.stroke(); }
    c.restore();
  }

  // ---- words
  const wr = (a: number, len = 18) => ramp(f, a, len);
  const RX0 = 1450;
  g.group("plain", () => {
    // legend builds as each particle is introduced
    if (f >= S(CUE.protons)) text(g, "PROTON  POSITIVE", 124, 60, { cap: 26, color: PRO_T, seed: 71, w: 3.6, progress: wr(S(CUE.protons)) });
    if (f >= S(CUE.neutrons)) text(g, "NEUTRON  NO CHARGE", 124, 110, { cap: 26, color: NEU_T, seed: 72, w: 3.6, progress: wr(S(CUE.neutrons)) });

    if (f < S(CUE.protons)) {
      text(g, "THE NUCLEUS", RX0, 330, { cap: 64, color: CREAM, seed: 3, w: 7, align: "center", progress: wr(S(0.4)) });
      text(g, "TWO KINDS OF PARTICLE", RX0, 440, { cap: 34, color: YEL, seed: 5, w: 4.4, align: "center", progress: wr(S(CUE.twoKinds)) });
    } else if (f < S(CUE.neutrons)) {
      text(g, "PROTON", RX0, 300, { cap: 100, color: PRO_T, seed: 11, w: 10, align: "center", progress: wr(S(CUE.protons)) });
      text(g, "POSITIVE CHARGE", RX0, 460, { cap: 40, color: CREAM, seed: 12, w: 5, align: "center", progress: wr(S(6.4)) });
    } else if (f < S(CUE.count)) {
      text(g, "NEUTRON", RX0, 300, { cap: 100, color: NEU_T, seed: 13, w: 10, align: "center", progress: wr(S(CUE.neutrons)) });
      text(g, "NO CHARGE", RX0, 460, { cap: 40, color: CREAM, seed: 14, w: 5, align: "center", progress: wr(S(10.0)) });
      if (f >= S(CUE.neutral)) {  // NEUTR-al -> NEUTR-on
        text(g, "NEUTRAL", RX0, 560, { cap: 60, color: YEL, seed: 15, w: 7, align: "center", progress: wr(S(CUE.neutral), 12) });
        const u = ramp(f, S(CUE.neutral) + 10, 12), c = g.cur; g.touch(1100, 400, 1800, 660); c.save(); c.lineCap = "round";
        const seg = (x: number, y: number, ww: number) => { for (const [col, lw] of [[OUT, 9], [YEL, 4.5]] as [string, number][]) { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.moveTo(x, y); c.lineTo(x + ww * u, y); c.stroke(); } };
        seg(RX0 - width("NEUTRON", 100) / 2 - 6, 418, width("NEUTR", 100) + 4); seg(RX0 - width("NEUTRAL", 60) / 2 - 4, 638, width("NEUTR", 60) + 4);
        c.restore();
      }
    } else if (f < S(CUE.H)) {
      text(g, "PROTON COUNT", RX0, 300, { cap: 64, color: PRO_T, seed: 16, w: 7, align: "center", progress: wr(S(CUE.count)) });
      text(g, "DECIDES THE ELEMENT", RX0, 410, { cap: 44, color: CREAM, seed: 17, w: 5.4, align: "center", progress: wr(S(CUE.element)) });
    } else {
      // element card: each line rewrites only when its own value changes
      let symF = K.f, zF = K.f, nF = K.f;
      for (let i = ki; i > 0 && KEYS[i].sym === KEYS[i - 1].sym; i--) symF = KEYS[i - 1].f;
      for (let i = ki; i > 0 && KEYS[i].Z === KEYS[i - 1].Z; i--) zF = KEYS[i - 1].f;
      for (let i = ki; i > 0 && KEYS[i].N === KEYS[i - 1].N; i--) nF = KEYS[i - 1].f;
      text(g, K.sym, RX0, 170, { cap: 180, color: CREAM, seed: 3 + ki, w: 16, align: "center", progress: wr(symF + 6) });
      text(g, K.name, RX0, 410, { cap: 50, color: CREAM, seed: 9 + ki, w: 6, align: "center", progress: wr(symF + 6) });
      text(g, `${K.Z} PROTON${K.Z > 1 ? "S" : ""}`, RX0, 520, { cap: 44, color: PRO_T, seed: 21 + ki, w: 6, align: "center", progress: wr(zF + 8, 14) });
      text(g, `${K.N} NEUTRON${K.N === 1 ? "" : "S"}`, RX0, 590, { cap: 34, color: NEU_T, seed: 27 + ki, w: 4.6, align: "center", progress: wr(nF + 8, 14) });
      const note = f >= S(CUE.identity) ? ["MORE NEUTRONS: STILL MERCURY", S(CUE.identity)] : f >= S(CUE.distances) ? ["ABOUT 14 FEMTOMETRES ACROSS", S(CUE.distances)] : f >= S(CUE.hold) ? ["NEUTRONS HELP HOLD IT TOGETHER", S(CUE.hold)] : f >= S(CUE.mass) ? ["NEUTRONS ADD MASS", S(CUE.mass)] : f >= S(CUE.defines) ? ["PROTONS DEFINE THE ELEMENT", S(CUE.defines)] : f >= S(CUE.change) ? ["CHANGE THE PROTONS...", S(CUE.change)] : null;
      if (note) text(g, note[0] as string, RX0, 700, { cap: 30, color: YEL, seed: 81 + (note[1] as number), w: 4, align: "center", progress: wr(note[1] as number, 16) });
    }
  });

  // legend icons
  const lc = g.main; lc.save(); lc.setTransform(sc, 0, 0, sc, 0, 0);
  if (f >= S(CUE.protons)) { const k = ramp(f, S(CUE.protons), 6); nucleon(lc, 88, 74, 18 * k, PRO_B, 0); plus(lc, 88, 74, 18 * k, k); }
  if (f >= S(CUE.neutrons)) { const k = ramp(f, S(CUE.neutrons), 6); nucleon(lc, 88, 124, 18 * k, NEU_B, 0); }

  // element row: appears on "determines which element", capsule rides the named element
  const rowOn = ramp(f, S(CUE.element), 30);
  if (rowOn > 0) {
    const row = ROW.map((_, i) => 300 + i * 264), ry = 935;
    lc.setLineDash([8, 12]); lc.lineDashOffset = -sec * 12; lc.strokeStyle = CREAM; lc.globalAlpha = 0.35 * rowOn; lc.lineWidth = 2; lc.beginPath(); lc.moveTo(170, 1012); lc.lineTo(170 + 1620 * rowOn, 1012); lc.stroke(); lc.setLineDash([]); lc.globalAlpha = 1;
    if (K.slot >= 0) {
      const from = PK.slot >= 0 ? row[PK.slot] : row[K.slot], x = lerp(from, row[K.slot], m), grow = PK.slot >= 0 ? 1 : ease(clamp(local / 10));
      capsule(lc, x, ry, (150 + 10 * Math.sin(sec * 2.5)) * grow, 132 * grow);
    }
    lc.restore();
    g.group("plain", () => ROW.forEach(([sym, z], i) => {
      const on = K.slot === i, show = i === 5 && K.slot === 5 ? [K.sym, K.Z] : [sym, z];
      text(g, show[0] as string, row[i], ry - 40, { cap: 50, color: on ? CREAM : DIM, seed: 40 + i, w: 5.5, align: "center", progress: clamp(rowOn * 1.4 - i * 0.08) });
      text(g, String(show[1]), row[i], ry + 26, { cap: 22, color: on ? YEL : "#6f69a8", seed: 50 + i, w: 3, align: "center", progress: clamp(rowOn * 1.4 - i * 0.08) });
    }));
    g.group("plain", () => text(g, "PROTONS", 1790, 1027, { cap: 18, color: DIM, seed: 93, w: 2.4, align: "right", progress: rowOn }));
  } else lc.restore();
};

export const nucleus: Film = {
  meta: { title: "nucleus", W, H, fps: FPS, bpm: BPM, durationFrames: DURATION },
  assets: { images: {} },
  shots: [{ id: "chunk1", start: 0, end: DURATION, draw }],
};
