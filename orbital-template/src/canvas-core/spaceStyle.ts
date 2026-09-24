import { Gfx, rng, type Ctx, type Env, type Medium, type P } from "./core";
import { letter, width } from "./drafting";
import { clamp } from "./gallery";

// SPACE STYLE · the shared look for every chunk of the explainer (plumbing only; each chunk's
// scenes are bespoke). Indigo streaked space; flat colour in hard bands; fine grain; thick dark
// outlines; orbit dashes; dashed guides; one warm glow. Palette and primitives live here so the
// whole film reads as one hand.

export const W = 1920, H = 1080, FPS = 30;
export const BG_IN = "#2e2958", BG_OUT = "#15122b", STREAK = "#b9b3ff", OUT = "#120f24", CREAM = "#fff1dc";
export const PRO_B = ["#b8322f", "#f0553a", "#ff8a4c", "#ffc27a"], NEU_B = ["#3c2f8f", "#6246c9", "#8f6cf0", "#c3aaff"];
export const RED_B = ["#8f1f2e", "#e0344d", "#ff6b7d", "#ffc2ca"], GRN_B = ["#16664a", "#23a874", "#55dca0", "#c2f6dd"], BLU_B = ["#1f3f8f", "#3a6fe0", "#6fa0ff", "#cddcff"];
export const YEL_B = ["#8a6a12", "#e0b12f", "#ffd166", "#fff2c2"], CYAN_B = ["#0f5f7a", "#1fa3c9", "#5fd6f5", "#d0f6ff"], GREY_B = ["#3a355f", "#5a548a", "#8a84b8", "#c9c4ea"];
export const SUN_B = ["#b8322f", "#f0553a", "#ffb347", "#fff0b0"], EARTH_B = ["#173a73", "#2862c4", "#4f97f5", "#bfe0ff"];
export const PRO_T = "#ff8a4c", NEU_T = "#b69cff", YEL = "#ffd166", DIM = "#8f89c9", RED = "#ff5f6d", GREEN = "#5fe0a3", PINK = "#ff5fa2";
export const DASHES = ["#ff5fa2", "#ff8a4c", "#ffd166", "#fff1dc", "#ff6f61"];
export const FLAT: Medium = { nib: 1, taper: 0, pressure: 0, retrace: false, wobble: 0, rough: 0 };

export const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const back = (t: number) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }; // overshoot pop
export const ramp = (t: number, a: number, len: number) => clamp((t - a) / len);
export const span = (t: number, a: number, b: number, len = 0.3) => ramp(t, a, len) * clamp((b - t) / len);

// ---- cached surfaces
export const cached = <T>(env: Env, k: string, make: () => T): T => { const id = `${k}:${env.scale}`; let v = env.cache.get(id) as T | undefined; if (!v) { v = make(); env.cache.set(id, v); } return v; };
export const grain = (env: Env) => cached(env, "grain", () => {
  const S = 256, L = env.canvas(S, S), c = L.ctx, r = rng(77);
  for (let i = 0; i < 5200; i++) { const v = r(); c.fillStyle = v > 0.5 ? `rgba(255,255,255,${(0.05 + r() * 0.1).toFixed(3)})` : `rgba(0,0,0,${(0.06 + r() * 0.12).toFixed(3)})`; c.fillRect(Math.floor(r() * S), Math.floor(r() * S), 1 + (r() > 0.8 ? 1 : 0), 1); }
  return L;
});
export const space = (env: Env) => cached(env, "space", () => {
  const L = env.canvas(W * env.scale, H * env.scale), c = L.ctx, r = rng(41);
  c.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  const g = c.createRadialGradient(W * 0.45, H * 0.48, 60, W * 0.5, H * 0.5, W * 0.75); g.addColorStop(0, BG_IN); g.addColorStop(1, BG_OUT);
  c.fillStyle = g; c.fillRect(0, 0, W, H); c.lineCap = "round";
  for (let i = 0; i < 2600; i++) { const x = r() * W, y = r() * H, l = 6 + r() * 16; c.strokeStyle = STREAK; c.globalAlpha = 0.03 + r() * 0.07; c.lineWidth = 1 + r() * 0.8; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(-0.42) * l, y + Math.sin(-0.42) * l); c.stroke(); }
  c.globalAlpha = 1; return L;
});
// grain over whatever is already on a layer (source-atop keeps it on the art only)
export const grainOver = (env: Env, c: Ctx) => { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = "source-atop"; c.fillStyle = c.createPattern(grain(env).canvas as CanvasImageSource, "repeat")!; c.fillRect(0, 0, W * env.scale, H * env.scale); c.restore(); };
export const layer = (env: Env, name: string) => { const L = cached(env, `layer:${name}`, () => env.canvas(W * env.scale, H * env.scale)); const c = L.ctx; c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = "source-over"; c.globalAlpha = 1; c.clearRect(0, 0, W * env.scale, H * env.scale); c.setTransform(env.scale, 0, 0, env.scale, 0, 0); return L; };
export const blit = (ctx: Ctx, env: Env, L: { canvas: unknown }, alpha = 1) => { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = alpha; ctx.drawImage(L.canvas as CanvasImageSource, 0, 0); ctx.restore(); };

// ---- lettering: the drafting hand, outlined, plus the glyphs it lacks (lowercase e u t g d, ?)
const CUSTOM: Record<string, { w: number; s: P[][] }> = {
  e: { w: 3.6, s: [[[0.4, 4.1], [3.2, 4.1], [3.1, 3.1], [2.3, 2.3], [1.2, 2.3], [0.3, 3.2], [0.3, 5.0], [1.2, 5.9], [2.5, 5.9], [3.3, 5.3]]] },
  u: { w: 3.6, s: [[[0.3, 2.3], [0.3, 5.0], [1.1, 5.9], [2.3, 5.9], [3.2, 5.0]], [[3.2, 2.3], [3.2, 5.9]]] },
  t: { w: 3.4, s: [[[1.3, 0.8], [1.3, 5.1], [2.0, 5.9], [3.0, 5.7]], [[0.2, 2.4], [2.8, 2.4]]] },
  g: { w: 3.6, s: [[[3.2, 2.3], [3.2, 6.6], [2.4, 7.5], [0.9, 7.5], [0.3, 7.0]], [[3.2, 3.2], [2.4, 2.3], [1.2, 2.3], [0.3, 3.2], [0.3, 4.8], [1.2, 5.6], [2.4, 5.6], [3.2, 4.8]]] },
  d: { w: 3.6, s: [[[3.2, 0.0], [3.2, 5.9]], [[3.2, 3.2], [2.4, 2.3], [1.2, 2.3], [0.3, 3.2], [0.3, 5.0], [1.2, 5.9], [2.4, 5.9], [3.2, 5.0]]] },
  "?": { w: 3.8, s: [[[0.4, 1.3], [1.1, 0.2], [2.6, 0.1], [3.5, 1.0], [3.5, 2.2], [2.6, 3.0], [1.9, 3.6], [1.9, 4.4]], [[1.9, 5.5], [1.95, 5.9]]] },
};
const TRACK = 1.25;
const adv = (ch: string, cap: number) => (CUSTOM[ch] ? CUSTOM[ch].w * (cap / 6) : width(ch, cap)) + TRACK * (cap / 6);
export const textWidth = (s: string, cap: number) => [...s].reduce((a, ch) => a + adv(ch, cap), 0) - TRACK * (cap / 6);
export type TOpt = { cap: number; color?: string; colors?: string[]; seed?: number; w?: number; progress?: number; align?: "left" | "center" | "right"; opacity?: number };
// outlined lettering written on stroke by stroke; `colors` cycles a colour per visible character
export const text = (g: Gfx, s: string, x: number, y: number, o: TOpt) => {
  const { cap, color = CREAM, colors, seed = 1, progress = 1, align = "left", opacity = 1 } = o, w = o.w ?? Math.max(2.2, cap * 0.11);
  if (progress <= 0 || opacity <= 0) return;
  const chars = [...s], total = textWidth(s, cap), sc = cap / 6, n = chars.filter((c) => c !== " ").length;
  const x0 = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
  for (const pass of [0, 1]) {
    let cx = x0, vi = 0;
    chars.forEach((ch, i) => {
      if (ch === " ") { cx += adv(ch, cap); return; }
      const p = clamp(progress * n - vi), col = pass === 0 ? OUT : colors ? colors[vi % colors.length] : color, ww = pass === 0 ? w + Math.max(5, w * 0.9) : w;
      vi++;
      if (p > 0) {
        const cu = CUSTOM[ch];
        if (cu) cu.s.forEach((st, j) => { const pp = clamp(p * cu.s.length - j); if (pp > 0) g.pen(st.map(([px, py]) => [cx + (px + (6 - py) * 0.2) * sc, y + py * sc] as P), { w: ww, color: col, seed: seed + i * 13 + j, wobble: 0, boil: 0, taper: 0, opacity, progress: pp }); });
        else letter(g, ch, cx, y, { cap, color: col, seed: seed + i * 13, w: ww, opacity, progress: p });
      }
      cx += adv(ch, cap);
    });
  }
};

// ---- a banded ball: outline, hard bands stepping toward the light (upper left), a spec arc
export const ball = (c: Ctx, x: number, y: number, r: number, bands: string[], o: { shade?: number; alpha?: number; outline?: number } = {}) => {
  if (r <= 0.3) return;
  const { shade = 0, alpha = 1, outline = Math.max(2.5, r * 0.12) } = o;
  c.save(); c.globalAlpha = alpha;
  c.fillStyle = OUT; c.beginPath(); c.arc(x, y, r + outline, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.clip();
  c.fillStyle = bands[0]; c.fillRect(x - r, y - r, r * 2, r * 2);
  [[0.9, 0.14], [0.68, 0.3], [0.4, 0.46]].forEach(([k, off], i) => { c.fillStyle = bands[i + 1]; c.beginPath(); c.arc(x - r * off, y - r * off, r * k, 0, Math.PI * 2); c.fill(); });
  if (shade > 0) { c.fillStyle = BG_OUT; c.globalAlpha = alpha * shade; c.fillRect(x - r, y - r, r * 2, r * 2); }
  c.restore();
  c.save(); c.globalAlpha = alpha * 0.85; c.strokeStyle = "#fff8ec"; c.lineWidth = Math.max(1.5, r * 0.1); c.lineCap = "round";
  c.beginPath(); c.arc(x, y, r * 0.74, Math.PI * 1.08, Math.PI * 1.38); c.stroke(); c.restore();
};
export const glow = (c: Ctx, x: number, y: number, r: number, rgb: string, a: number) => {
  if (a <= 0 || r <= 0) return;
  const gr = c.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(0.45, `rgba(${rgb},${a * 0.35})`); gr.addColorStop(1, `rgba(${rgb},0)`);
  c.fillStyle = gr; c.fillRect(x - r, y - r, r * 2, r * 2);
};
// a stroke with the dark outline under it
export const inked = (c: Ctx, pts: P[], color: string, w: number, o: { alpha?: number; progress?: number; close?: boolean } = {}) => {
  const { alpha = 1, progress = 1, close = false } = o; if (progress <= 0 || alpha <= 0 || pts.length < 2) return;
  const seg = pts.map((p, i) => (i ? Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0)), tot = seg.reduce((a, b) => a + b, 0) * clamp(progress);
  const path = () => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); let acc = 0; for (let i = 1; i < pts.length; i++) { if (acc + seg[i] >= tot) { const f = (tot - acc) / seg[i]; c.lineTo(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f); return; } acc += seg[i]; c.lineTo(pts[i][0], pts[i][1]); } if (close && progress >= 1) c.closePath(); };
  c.save(); c.globalAlpha = alpha; c.lineCap = "round"; c.lineJoin = "round";
  c.strokeStyle = OUT; c.lineWidth = w + Math.max(6, w * 0.8); path(); c.stroke();
  c.strokeStyle = color; c.lineWidth = w; path(); c.stroke(); c.restore();
};
// a gluon: a springy wiggle between two points
export const gluon = (c: Ctx, a: P, b: P, o: { amp?: number; phase?: number; w?: number; alpha?: number; color?: string } = {}) => {
  const { amp = 9, phase = 0, w = 5, alpha = 1, color = YEL } = o;
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); if (L < 2) return;
  const nx = -dy / L, ny = dx / L, waves = Math.max(2, Math.round(L / 26)), N = waves * 10, pts: P[] = [];
  for (let i = 0; i <= N; i++) { const t = i / N, env = Math.sin(t * Math.PI) ** 0.5, s = Math.sin(t * waves * Math.PI * 2 + phase) * amp * env; pts.push([a[0] + dx * t + nx * s, a[1] + dy * t + ny * s]); }
  inked(c, pts, color, w, { alpha });
};
export const check = (c: Ctx, x: number, y: number, s: number, p: number, alpha = 1) => inked(c, [[x - s, y], [x - s * 0.3, y + s * 0.7], [x + s * 1.1, y - s * 0.75]], GREEN, s * 0.28, { progress: p, alpha });
export const cross = (c: Ctx, x: number, y: number, s: number, p: number, alpha = 1) => { inked(c, [[x - s, y - s], [x + s, y + s]], RED, s * 0.26, { progress: clamp(p * 2), alpha }); inked(c, [[x + s, y - s], [x - s, y + s]], RED, s * 0.26, { progress: clamp(p * 2 - 1), alpha }); };
export const card = (c: Ctx, x: number, y: number, w: number, h: number, alpha = 1, fill = "#2a2552") => {
  c.save(); c.globalAlpha = alpha;
  c.fillStyle = OUT; c.beginPath(); c.roundRect(x - w / 2 - 6, y - h / 2 - 6, w + 12, h + 12, 30); c.fill();
  c.fillStyle = fill; c.beginPath(); c.roundRect(x - w / 2, y - h / 2, w, h, 24); c.fill();
  c.strokeStyle = "rgba(255,241,220,0.16)"; c.lineWidth = 3; c.beginPath(); c.roundRect(x - w / 2 + 8, y - h / 2 + 8, w - 16, h - 16, 18); c.stroke();
  c.restore();
};
// streaming orbit dashes round a centre (the look from the nucleus chunk); `front` draws only the near half
export const orbitDashes = (c: Ctx, cx: number, cy: number, rx: number, t: number, front: boolean, o: { alpha?: number; tilt?: number; seed?: number; count?: number } = {}) => {
  const { alpha = 1, tilt = -0.22, seed = 9, count = 56 } = o; if (alpha <= 0) return;
  const ry = rx * 0.34, R = rng(seed);
  const ell = (a: number, k: number): P => { const ex = Math.cos(a) * rx * k, ey = Math.sin(a) * ry * k; return [cx + ex * Math.cos(tilt) - ey * Math.sin(tilt), cy + ex * Math.sin(tilt) + ey * Math.cos(tilt)]; };
  c.save(); c.lineCap = "round";
  if (!front) for (const [kk, al] of [[1.15, 0.3], [1.5, 0.18]] as [number, number][]) {
    c.setLineDash([7, 11]); c.lineDashOffset = -t * 14; c.strokeStyle = CREAM; c.globalAlpha = al * alpha; c.lineWidth = 1.4;
    c.beginPath(); for (let i = 0; i <= 120; i++) { const p = ell((i / 120) * Math.PI * 2, kk); i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); } c.stroke();
  }
  c.setLineDash([]);
  for (let s = 0; s < count; s++) {
    const k = 0.8 + R() * 0.75, a0 = R() * Math.PI * 2, len = 0.1 + R() * 0.4, w = 2.5 + R() * 5, col = DASHES[Math.floor(R() * DASHES.length)], n = 0.5 + R() * 0.6;
    const a = a0 + t * n * 1.4, steps = 12;
    for (let i = 0; i < steps; i++) {
      const a1 = a + (i / steps) * len, a2 = a + ((i + 1) / steps) * len;
      if ((Math.sin((a1 + a2) / 2) > 0) !== front) continue;
      const p1 = ell(a1, k), p2 = ell(a2, k);
      c.globalAlpha = alpha * 0.9 * Math.sin(((i + 0.5) / steps) * Math.PI) ** 0.4; c.strokeStyle = col; c.lineWidth = w;
      c.beginPath(); c.moveTo(p1[0], p1[1]); c.lineTo(p2[0], p2[1]); c.stroke();
    }
  }
  c.restore();
};
// drifting motes: always something moving in the room, never a loop (pure function of t)
export const motes = (c: Ctx, t: number, alpha = 1) => {
  const r = rng(505); c.save();
  for (let i = 0; i < 70; i++) {
    const x0 = r() * W, y0 = r() * H, vx = (r() - 0.5) * 14, vy = -4 - r() * 10, s = 1.2 + r() * 2.6, ph = r() * 6.28, col = r() > 0.6 ? "#ffd166" : r() > 0.5 ? "#ff8a4c" : "#c3aaff";
    const x = ((x0 + vx * t) % W + W) % W, y = ((y0 + vy * t) % H + H) % H;
    c.globalAlpha = alpha * (0.25 + 0.3 * (0.5 + 0.5 * Math.sin(t * 1.3 + ph))); c.fillStyle = col; c.beginPath(); c.arc(x, y, s, 0, Math.PI * 2); c.fill();
  }
  c.restore();
};
// write a small lowercase quark label (u / d) centred on a ball
export const qlabel = (g: Gfx, ch: string, x: number, y: number, r: number, alpha = 1, bar = false) => {
  const cap = r * 1.25, sc = cap / 6;
  text(g, ch, x - 1.8 * sc - 0.38 * sc, y - 4.1 * sc, { cap, color: CREAM, w: Math.max(2, cap * 0.13), opacity: alpha, seed: 7 });
  if (bar) g.touch(x - 3 * sc - 12, y - 6 * sc, x + 3 * sc + 12, y - 3 * sc);
  if (bar) inked(g.cur, [[x - 1.6 * sc, y - 4.6 * sc], [x + 1.9 * sc, y - 4.6 * sc]], CREAM, Math.max(2, cap * 0.1), { alpha });
};
