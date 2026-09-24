import { Gfx, rng, type Ctx, type Env, type Medium, type P } from "./core";
import { Film } from "./film";
import { letter, width } from "./drafting";
import { clamp, lerp } from "./gallery";

// NUCLEUS · flat space-explainer style. One idea: the number of protons IS the element.
// Look: deep indigo space with fine diagonal grain streaks; flat colour in hard bands (no smooth
// gradients on objects), fine grain on every fill, thick dark outlines, bright orbit dashes that
// stream round the subject, thin dashed guide ellipses, one warm glow behind it.
// Every 1.5 s nucleons fly in or out: H 1, He 2, C 6, O 8, Fe 26, Au 79, and back to H (seamless).
// Template knobs for the other chunks: ELEMENTS, SEG, and the palette block.

const FPS = 30, BPM = 120, BEAT = (60 / BPM) * FPS;  // 15-frame beat
const SEG = BEAT * 3;                                 // 45 frames = 1.5 s per element
const MOVE = 14;                                      // frames of nucleon flight at each change
type El = { sym: string; name: string; Z: number; N: number };
const ELEMENTS: El[] = [
  { sym: "H", name: "HYDROGEN", Z: 1, N: 0 },
  { sym: "He", name: "HELIUM", Z: 2, N: 2 },
  { sym: "C", name: "CARBON", Z: 6, N: 6 },
  { sym: "O", name: "OXYGEN", Z: 8, N: 8 },
  { sym: "Fe", name: "IRON", Z: 26, N: 30 },
  { sym: "Au", name: "GOLD", Z: 79, N: 118 },
];
const DURATION = SEG * ELEMENTS.length;               // 270 frames = 9 s loop
const W = 1920, H = 1080, CX = 700, CY = 520;

// ---- palette
const BG_IN = "#2e2958", BG_OUT = "#15122b", STREAK = "#b9b3ff";
const OUT = "#120f24";                                 // the outline ink
const CREAM = "#fff1dc", GLOW = "#ff8a4c";
const PRO_B = ["#b8322f", "#f0553a", "#ff8a4c", "#ffc27a"];   // proton bands, shadow -> lit
const NEU_B = ["#3c2f8f", "#6246c9", "#8f6cf0", "#c3aaff"];   // neutron bands
const PRO_T = "#ff8a4c", NEU_T = "#b69cff", YEL = "#ffd166";
const DASHES = ["#ff5fa2", "#ff8a4c", "#ffd166", "#fff1dc", "#ff6f61"];
const FLAT: Medium = { nib: 1, taper: 0, pressure: 0, retrace: false, wobble: 0, rough: 0 };

type V3 = [number, number, number];
// Slots packed in a ball, innermost first; protons spread evenly through the slot list.
const layout = (el: El) => {
  const A = el.Z + el.N, pro: V3[] = [], neu: V3[] = [], ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < A; i++) {
    const rr = A === 1 ? 0 : Math.cbrt((i + 0.5) / A), y = 1 - (2 * (i + 0.5)) / A, ring = Math.sqrt(1 - y * y), a = i * ga;
    const v: V3 = [Math.cos(a) * ring * rr, y * rr, Math.sin(a) * ring * rr];
    (Math.floor(((i + 1) * el.Z) / A) > Math.floor((i * el.Z) / A) ? pro : neu).push(v);
  }
  return { pro, neu };
};
const LAYOUTS = ELEMENTS.map(layout);
const nucR = (A: number) => 52 / Math.pow(A, 0.15);
const ballR = (A: number) => (A <= 1 ? 0 : nucR(A) * Math.cbrt(A) * 1.12);
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// ---- cached surfaces (pure functions of scale; built once)
const cached = <T>(env: Env, key: string, make: () => T): T => { const k = `${key}:${env.scale}`; let v = env.cache.get(k) as T | undefined; if (!v) { v = make(); env.cache.set(k, v); } return v; };
// fine speckle grain, laid over fills with source-atop
const grain = (env: Env) => cached(env, "grain", () => {
  const S = 256, L = env.canvas(S, S), c = L.ctx, r = rng(77);
  for (let i = 0; i < 5200; i++) { const v = r(); c.fillStyle = v > 0.5 ? `rgba(255,255,255,${(0.05 + r() * 0.1).toFixed(3)})` : `rgba(0,0,0,${(0.06 + r() * 0.12).toFixed(3)})`; c.fillRect(Math.floor(r() * S), Math.floor(r() * S), 1 + (r() > 0.8 ? 1 : 0), 1); }
  return L;
});
// space: an indigo vignette and thousands of fine slanted streaks
const space = (env: Env) => cached(env, "space", () => {
  const L = env.canvas(W * env.scale, H * env.scale), c = L.ctx, r = rng(41);
  c.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  const g = c.createRadialGradient(W * 0.45, H * 0.48, 60, W * 0.5, H * 0.5, W * 0.75); g.addColorStop(0, BG_IN); g.addColorStop(1, BG_OUT);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.lineCap = "round"; const a = -0.42;
  for (let i = 0; i < 2600; i++) { const x = r() * W, y = r() * H, l = 6 + r() * 16; c.strokeStyle = STREAK; c.globalAlpha = 0.03 + r() * 0.07; c.lineWidth = 1 + r() * 0.8; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
  c.globalAlpha = 1;
  return L;
});

// Element symbols need lowercase e/u (He, Fe, Au); the drafting hand is capitals only.
const LOWER: Record<string, P[][]> = {
  e: [[[0.4, 4.1], [3.2, 4.1], [3.1, 3.1], [2.3, 2.3], [1.2, 2.3], [0.3, 3.2], [0.3, 5.0], [1.2, 5.9], [2.5, 5.9], [3.3, 5.3]]],
  u: [[[0.3, 2.3], [0.3, 5.0], [1.1, 5.9], [2.3, 5.9], [3.2, 5.0]], [[3.2, 2.3], [3.2, 5.9]]],
};
type TOpt = { cap: number; color: string; seed: number; w: number; progress?: number; align?: "left" | "center" | "right"; opacity?: number };
// outlined lettering: a fat dark pass, then the colour on top (the sticker/comic outline)
const text = (g: Gfx, s: string, x: number, y: number, o: TOpt) => {
  const { cap, color, seed, w, progress = 1, align = "left", opacity = 1 } = o;
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

// one nucleon: outline, then hard colour bands stepping toward the light (upper left), a spec arc
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
  const s = r * 0.4; c.lineCap = "round"; c.globalAlpha = a;
  for (const [col, lw] of [[OUT, r * 0.3], [CREAM, r * 0.16]] as [string, number][]) { c.strokeStyle = col; c.lineWidth = Math.max(2, lw); c.beginPath(); c.moveTo(x - s, y); c.lineTo(x + s, y); c.moveTo(x, y - s); c.lineTo(x, y + s); c.stroke(); }
  c.globalAlpha = 1;
};

type Dot = { x: number; y: number; z: number; r: number; pro: boolean };

const draw = (ctx: Ctx, frame: number, env: Env) => {
  const g = new Gfx(ctx, env, frame, FLAT), T = frame / DURATION, sc = env.scale;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(space(env).canvas as CanvasImageSource, 0, 0);
  ctx.setTransform(sc, 0, 0, sc, 0, 0);

  const k = Math.floor(frame / SEG), local = frame - k * SEG, prevK = (k + ELEMENTS.length - 1) % ELEMENTS.length;
  const el = ELEMENTS[k], pe = ELEMENTS[prevK], A = el.Z + el.N, pA = pe.Z + pe.N;
  const m = ease(clamp(local / MOVE));
  const R = lerp(ballR(pA), ballR(A), m), nr = lerp(nucR(pA), nucR(A), m), body = R + nr;

  // whole cycles only: one turn per loop, a two-cycle nod
  const th = T * Math.PI * 2, tilt = 0.38 + 0.08 * Math.sin(T * Math.PI * 4);
  const rot = ([x, y, z]: V3): V3 => { const x1 = x * Math.cos(th) + z * Math.sin(th), z1 = -x * Math.sin(th) + z * Math.cos(th); return [x1, y * Math.cos(tilt) - z1 * Math.sin(tilt), y * Math.sin(tilt) + z1 * Math.cos(tilt)]; };

  const dots: Dot[] = [];
  const place = (from: V3 | undefined, to: V3 | undefined, i: number, pro: boolean) => {
    const r = rng(i * 97 + (pro ? 5 : 11) + k * 1013), a = r() * Math.PI * 2, far = 1.0 + r() * 0.5, dir = [Math.cos(a), Math.sin(a)];
    const jig = (q: number) => Math.sin(T * Math.PI * 2 * (7 + (i % 5)) + i * 1.7 + q) * 1.6;
    let x: number, y: number, z: number, s = 1;
    if (from && to) { const f = rot(from), t = rot(to); x = lerp(f[0] * ballR(pA), t[0] * ballR(A), m); y = lerp(f[1] * ballR(pA), t[1] * ballR(A), m); z = lerp(f[2], t[2], m); }
    else if (to) { const t = rot(to), o = 1 - m; x = t[0] * R + dir[0] * W * far * o; y = t[1] * R + dir[1] * H * far * o; z = t[2]; }
    else { const f = rot(from!), o = ease(clamp(local / (MOVE * 0.6))); x = f[0] * ballR(pA) + dir[0] * W * far * o; y = f[1] * ballR(pA) + dir[1] * H * far * o; z = f[2]; s = 1 - o * 0.3; if (o >= 1) return; }
    dots.push({ x: CX + x + jig(0), y: CY + y + jig(2), z, r: nr * s, pro });
  };
  const L = LAYOUTS[k], PL = LAYOUTS[prevK];
  for (let i = 0; i < Math.max(L.pro.length, PL.pro.length); i++) place(PL.pro[i], L.pro[i], i, true);
  for (let i = 0; i < Math.max(L.neu.length, PL.neu.length); i++) place(PL.neu[i], L.neu[i], i, false);
  dots.sort((a, b) => a.z - b.z);

  // the orbit field: dashed guides + streaming dashes, split into the half behind and in front
  const RX = body + 70, RY = RX * 0.34, TILT = -0.22;
  const ell = (a: number, rx: number, ry: number): P => { const ex = Math.cos(a) * rx, ey = Math.sin(a) * ry; return [CX + ex * Math.cos(TILT) - ey * Math.sin(TILT), CY + ex * Math.sin(TILT) + ey * Math.cos(TILT)]; };
  const DR = rng(9), streams = Array.from({ length: 64 }, () => ({ k: 0.8 + DR() * 0.75, a0: DR() * Math.PI * 2, len: 0.1 + DR() * 0.4, w: 2.5 + DR() * 6, col: DASHES[Math.floor(DR() * DASHES.length)], n: 1 + Math.floor(DR() * 2) }));
  const orbit = (front: boolean) => {
    const c = ctx; c.save(); c.lineCap = "round";
    // dashed guide ellipses (drawn on the back pass only; they are faint and flat)
    if (!front) for (const [kk, al] of [[1.15, 0.35], [1.5, 0.22]] as [number, number][]) {
      c.setLineDash([7, 11]); c.lineDashOffset = -T * 18 * 8; c.strokeStyle = CREAM; c.globalAlpha = al; c.lineWidth = 1.4;
      c.beginPath(); for (let i = 0; i <= 120; i++) { const p = ell((i / 120) * Math.PI * 2, RX * kk, RY * kk); i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); } c.stroke();
    }
    c.setLineDash([]);
    for (const s of streams) {
      const a = s.a0 + T * Math.PI * 2 * s.n, steps = 14;
      for (let i = 0; i < steps; i++) { // each dash is cut where it crosses behind/in front
        const a1 = a + (i / steps) * s.len, a2 = a + ((i + 1) / steps) * s.len, isFront = Math.sin((a1 + a2) / 2) > 0;
        if (isFront !== front) continue;
        const p1 = ell(a1, RX * s.k, RY * s.k), p2 = ell(a2, RX * s.k, RY * s.k);
        c.globalAlpha = 0.9 * Math.sin((i + 0.5) / steps * Math.PI) ** 0.4; c.strokeStyle = s.col; c.lineWidth = s.w;
        c.beginPath(); c.moveTo(p1[0], p1[1]); c.lineTo(p2[0], p2[1]); c.stroke();
      }
    }
    c.restore();
  };

  // glow behind everything, then the back of the orbit field
  { const gl = ctx.createRadialGradient(CX, CY, body * 0.3, CX, CY, body * 2.6 + 60); gl.addColorStop(0, "rgba(255,138,76,0.42)"); gl.addColorStop(0.45, "rgba(255,95,162,0.12)"); gl.addColorStop(1, "rgba(255,95,162,0)"); ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H); }
  orbit(false);

  // nucleons on their own layer so grain sits only on them
  const NL = cached(env, "nucLayer", () => env.canvas(W * sc, H * sc)), nc = NL.ctx;
  nc.setTransform(1, 0, 0, 1, 0, 0); nc.clearRect(0, 0, W * sc, H * sc); nc.setTransform(sc, 0, 0, sc, 0, 0); nc.globalCompositeOperation = "source-over";
  for (const d of dots) {
    const shade = clamp((0.2 - d.z) * 0.35, 0, 0.35);
    nucleon(nc, d.x, d.y, d.r, d.pro ? PRO_B : NEU_B, shade);
    if (d.pro && d.z > -0.3) plus(nc, d.x + d.r * 0.04, d.y + d.r * 0.04, d.r, clamp((d.z + 0.3) * 3));
  }
  nc.setTransform(1, 0, 0, 1, 0, 0); nc.globalCompositeOperation = "source-atop"; nc.fillStyle = nc.createPattern(grain(env).canvas as CanvasImageSource, "repeat")!; nc.fillRect(0, 0, W * sc, H * sc); nc.globalCompositeOperation = "source-over";
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(NL.canvas as CanvasImageSource, 0, 0); ctx.setTransform(sc, 0, 0, sc, 0, 0);

  orbit(true);

  // labels, written on as each element arrives
  const wr = clamp((local - 6) / 20);
  g.group("plain", () => {
    text(g, el.sym, 1450, 200, { cap: 180, color: CREAM, seed: 3 + k, w: 16, align: "center", progress: wr });
    text(g, el.name, 1450, 440, { cap: 50, color: CREAM, seed: 9 + k, w: 6, align: "center", progress: wr });
    text(g, `${el.Z} PROTON${el.Z > 1 ? "S" : ""}`, 1450, 560, { cap: 44, color: PRO_T, seed: 21 + k, w: 6, align: "center", progress: clamp((local - 10) / 16) });
    text(g, `${el.N} NEUTRON${el.N === 1 ? "" : "S"}`, 1450, 632, { cap: 34, color: NEU_T, seed: 27 + k, w: 4.6, align: "center", progress: clamp((local - 14) / 16) });
    text(g, "PROTON  POSITIVE", 124, 60, { cap: 26, color: PRO_T, seed: 71, w: 3.6 });
    text(g, "NEUTRON  NO CHARGE", 124, 110, { cap: 26, color: NEU_T, seed: 72, w: 3.6 });
  });
  const lc = g.main; lc.save(); lc.setTransform(sc, 0, 0, sc, 0, 0);
  nucleon(lc, 88, 74, 18, PRO_B, 0); plus(lc, 88, 74, 18, 1); nucleon(lc, 88, 124, 18, NEU_B, 0); lc.restore();

  // the element row: a capsule slides to the current element, more protons further right
  const row = ELEMENTS.map((_, i) => [300 + i * 264, 925] as P);
  const from = row[prevK], to = row[k], px = lerp(from[0], to[0], m);
  lc.save(); lc.setTransform(sc, 0, 0, sc, 0, 0);
  lc.setLineDash([8, 12]); lc.lineDashOffset = -T * 20 * 6; lc.strokeStyle = CREAM; lc.globalAlpha = 0.35; lc.lineWidth = 2; lc.beginPath(); lc.moveTo(170, 1005); lc.lineTo(1790, 1005); lc.stroke(); lc.setLineDash([]); lc.globalAlpha = 1;
  const pw = 150 + 14 * Math.sin(T * Math.PI * 12), ph = 132;
  lc.fillStyle = OUT; lc.beginPath(); lc.roundRect(px - pw / 2 - 6, 925 - ph / 2 - 6, pw + 12, ph + 12, 40); lc.fill();
  lc.fillStyle = "#f0553a"; lc.beginPath(); lc.roundRect(px - pw / 2, 925 - ph / 2, pw, ph, 34); lc.fill();
  lc.fillStyle = "#ff8a4c"; lc.beginPath(); lc.roundRect(px - pw / 2 + 8, 925 - ph / 2 + 6, pw - 16, ph * 0.52, 28); lc.fill();
  lc.restore();
  g.group("plain", () => {
    ELEMENTS.forEach((e, i) => {
      const on = i === k;
      text(g, e.sym, row[i][0], row[i][1] - 40, { cap: 50, color: on ? CREAM : "#8f89c9", seed: 40 + i, w: 5.5, align: "center" });
      text(g, String(e.Z), row[i][0], row[i][1] + 26, { cap: 22, color: on ? YEL : "#6f69a8", seed: 50 + i, w: 3, align: "center" });
    });
    text(g, "PROTONS", 1790, 1020, { cap: 18, color: "#8f89c9", seed: 93, w: 2.4, align: "right" });
  });
};

export const nucleus: Film = {
  meta: { title: "nucleus", W, H, fps: FPS, bpm: BPM, durationFrames: DURATION },
  assets: { images: {} },
  shots: [{ id: "loop", start: 0, end: DURATION, draw }],
};
