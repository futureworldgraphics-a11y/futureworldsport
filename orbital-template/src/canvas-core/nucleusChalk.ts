import { Gfx, rng, fractal, type Ctx, type Env, type Medium, type P } from "./core";
import { Film } from "./film";
import { letter, width } from "./drafting";
import { clamp, lerp } from "./gallery";

// NUCLEUS · chalkboard. One idea: the number of protons IS the element. A nucleus of chalk-drawn
// nucleons turns slowly on a slate board; every 1.5 s protons (warm, marked +) and neutrons
// (cool, unmarked) fly in or out and the board relabels it: H 1, He 2, C 6, O 8, Fe 26, Au 79.
// The loop closes Au -> H, so the tail of the loop is a real transition, not a cut.
// Reusable template knobs: ELEMENTS (the sequence), SEG (frames per element), palette below.

const FPS = 30, BPM = 120, BEAT = (60 / BPM) * FPS; // 15-frame beat
const SEG = BEAT * 3;                                // 45 frames = 1.5 s per element
const MOVE = 14;                                     // frames of nucleon flight at each change
type El = { sym: string; name: string; Z: number; N: number };
const ELEMENTS: El[] = [
  { sym: "H", name: "HYDROGEN", Z: 1, N: 0 },
  { sym: "He", name: "HELIUM", Z: 2, N: 2 },
  { sym: "C", name: "CARBON", Z: 6, N: 6 },
  { sym: "O", name: "OXYGEN", Z: 8, N: 8 },
  { sym: "Fe", name: "IRON", Z: 26, N: 30 },
  { sym: "Au", name: "GOLD", Z: 79, N: 118 },
];
const DURATION = SEG * ELEMENTS.length;              // 270 frames = 9 s loop
const W = 1920, H = 1080, CX = 700, CY = 520;
const SLATE = "#243029", CHALK = "#f4f0e6", PRO = "#ef8f86", PRO_D = "#8c3b3b", NEU = "#a9cfe3", NEU_D = "#3f5f78", YEL = "#f6e6a4";
const CHALK_M: Medium = { nib: 2.1, taper: 0.55, pressure: 0.95, retrace: true, wobble: 1.4, rough: 1.2 };

type V3 = [number, number, number];
// Slots packed in a ball, innermost first: radius by cube root of volume share, direction on a
// Fibonacci sphere. Protons spread evenly through the slot list so they never clump on one side.
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
const nucR = (A: number) => 50 / Math.pow(A, 0.15);             // on-screen nucleon radius (small nuclei drawn larger)
const ballR = (A: number) => (A <= 1 ? 0 : nucR(A) * Math.cbrt(A) * 1.12);
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// the slate: drawn once per size and reused; ghosts of old lessons swept across it
const board = (env: Env) => {
  const key = `board:${env.scale}`; let L = env.cache.get(key) as { canvas: CanvasImageSource } | undefined;
  if (!L) {
    const lay = env.canvas(W * env.scale, H * env.scale), c = lay.ctx, r = rng(41);
    c.setTransform(env.scale, 0, 0, env.scale, 0, 0);
    c.fillStyle = SLATE; c.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 6) for (let x = 0; x < W; x += 6) { const v = fractal(7, x, y, 0.004, 0.004, 3); c.fillStyle = `rgba(255,255,255,${(Math.max(0, v - 0.45) * 0.09).toFixed(3)})`; c.fillRect(x, y, 6, 6); }
    c.lineCap = "round";
    for (let k = 0; k < 26; k++) { // eraser swipes
      const x = r() * W, y = r() * H, len = 200 + r() * 500, a = (r() - 0.5) * 0.5;
      c.strokeStyle = `rgba(244,240,230,${(0.015 + r() * 0.025).toFixed(3)})`; c.lineWidth = 40 + r() * 60;
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a) * len * 0.5, y + 30 * (r() - 0.5), x + Math.cos(a) * len, y + Math.sin(a) * len); c.stroke();
    }
    const vg = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.7); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.45)");
    c.fillStyle = vg; c.fillRect(0, 0, W, H);
    L = lay; env.cache.set(key, L);
  }
  return L;
};


// Element symbols need a lowercase second letter (He, Fe, Au); the drafting hand is capitals only,
// so e and u are stroked here in the same slant and weight.
const LOWER: Record<string, P[][]> = {
  e: [[[0.4, 4.1], [3.2, 4.1], [3.1, 3.1], [2.3, 2.3], [1.2, 2.3], [0.3, 3.2], [0.3, 5.0], [1.2, 5.9], [2.5, 5.9], [3.3, 5.3]]],
  u: [[[0.3, 2.3], [0.3, 5.0], [1.1, 5.9], [2.3, 5.9], [3.2, 5.0]], [[3.2, 2.3], [3.2, 5.9]]],
};
const symbol = (g: Gfx, sym: string, x: number, y: number, o: { cap: number; color: string; seed: number; w: number; opacity?: number; progress?: number }) => {
  const { cap, color, seed, w, opacity = 0.95, progress = 1 } = o, s = cap / 6, low = sym[1];
  const total = width(sym[0], cap) + (low ? (1.25 + 3.6) * s : 0), x0 = x - total / 2;
  letter(g, sym[0], x0, y, { cap, color, seed, w, opacity, progress: low ? clamp(progress * 1.6) : progress });
  if (!low) return;
  const lx = x0 + width(sym[0], cap) + 1.25 * s, lp = clamp(progress * 2.4 - 1.4);
  LOWER[low].forEach((st, j) => { const pp = clamp(lp * LOWER[low].length - j); if (pp > 0) g.pen(st.map(([px, py]) => [lx + (px + (6 - py) * 0.2) * s, y + py * s] as P), { w, color, seed: seed + 7 + j, wobble: 0.25, boil: 0, taper: 0.35, opacity, progress: pp }); });
};
// a small chalk nucleon for the legend
const icon = (c: Ctx, x: number, y: number, r: number, pro: boolean) => {
  const gr = c.createRadialGradient(x - r * 0.38, y - r * 0.42, r * 0.08, x, y, r * 1.05);
  gr.addColorStop(0, "#fff8ee"); gr.addColorStop(0.22, pro ? PRO : NEU); gr.addColorStop(1, pro ? PRO_D : NEU_D);
  c.fillStyle = gr; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  if (pro) { const s = r * 0.45; c.strokeStyle = "#fffaf0"; c.lineWidth = 2.4; c.lineCap = "round"; c.beginPath(); c.moveTo(x - s, y); c.lineTo(x + s, y); c.moveTo(x, y - s); c.lineTo(x, y + s); c.stroke(); }
};

type Dot = { x: number; y: number; z: number; r: number; pro: boolean; seed: number };

const draw = (ctx: Ctx, frame: number, env: Env) => {
  const g = new Gfx(ctx, env, frame, CHALK_M), T = frame / DURATION;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(board(env).canvas, 0, 0);
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);

  const k = Math.floor(frame / SEG), local = frame - k * SEG, prevK = (k + ELEMENTS.length - 1) % ELEMENTS.length;
  const el = ELEMENTS[k], pe = ELEMENTS[prevK], A = el.Z + el.N, pA = pe.Z + pe.N;
  const m = ease(clamp(local / MOVE));
  const R = lerp(ballR(pA), ballR(A), m), nr = lerp(nucR(pA), nucR(A), m);

  // one full turn per loop around y, a fixed tilt, a two-cycle wobble: all whole cycles, seamless
  const th = T * Math.PI * 2, tilt = 0.38 + 0.08 * Math.sin(T * Math.PI * 4);
  const rot = ([x, y, z]: V3): V3 => { const x1 = x * Math.cos(th) + z * Math.sin(th), z1 = -x * Math.sin(th) + z * Math.cos(th); return [x1, y * Math.cos(tilt) - z1 * Math.sin(tilt), y * Math.sin(tilt) + z1 * Math.cos(tilt)]; };

  const dots: Dot[] = [];
  const place = (from: V3 | undefined, to: V3 | undefined, i: number, pro: boolean) => {
    const r = rng(i * 97 + (pro ? 5 : 11) + k * 1013), a = r() * Math.PI * 2, far = 1.0 + r() * 0.5, dir: [number, number] = [Math.cos(a), Math.sin(a)];
    const jig = (q: number) => Math.sin(T * Math.PI * 2 * (7 + (i % 5)) + i * 1.7 + q) * 1.6; // nucleons never sit still
    let x: number, y: number, z: number, s = 1;
    if (from && to) { const f = rot(from), t = rot(to); x = lerp(f[0] * ballR(pA), t[0] * ballR(A), m); y = lerp(f[1] * ballR(pA), t[1] * ballR(A), m); z = lerp(f[2], t[2], m); }
    else if (to) { const t = rot(to), o = 1 - m; x = t[0] * R + dir[0] * W * far * o; y = t[1] * R + dir[1] * H * far * o; z = t[2]; }        // arriving from off the board
    else { const f = rot(from!), o = ease(clamp(local / (MOVE * 0.6))); x = f[0] * ballR(pA) + dir[0] * W * far * o; y = f[1] * ballR(pA) + dir[1] * H * far * o; z = f[2]; s = 1 - o * 0.3; if (o >= 1) return; } // leaving
    dots.push({ x: CX + x + jig(0), y: CY + y + jig(2), z, r: nr * s, pro, seed: i * 31 + (pro ? 1 : 2) });
  };
  const L = LAYOUTS[k], PL = LAYOUTS[prevK];
  for (let i = 0; i < Math.max(L.pro.length, PL.pro.length); i++) place(PL.pro[i], L.pro[i], i, true);
  for (let i = 0; i < Math.max(L.neu.length, PL.neu.length); i++) place(PL.neu[i], L.neu[i], i, false);
  dots.sort((a, b) => a.z - b.z);

  // halo: chalk rubbed round the nucleus with a finger
  g.group("plain", () => g.glow(CX, CY, R + nr * 1.6, "#fff6e0", 0.1));

  // the nucleons, back to front, shaded from one light at the upper left, grained by the board
  g.group("plain", () => {
    const c = g.cur; g.touch(0, 0, W, H);
    for (const d of dots) {
      const depth = clamp(0.62 + 0.38 * d.z), base = d.pro ? PRO : NEU, dark = d.pro ? PRO_D : NEU_D;
      const gr = c.createRadialGradient(d.x - d.r * 0.38, d.y - d.r * 0.42, d.r * 0.08, d.x, d.y, d.r * 1.05);
      gr.addColorStop(0, "#fff8ee"); gr.addColorStop(0.22, base); gr.addColorStop(1, dark);
      c.globalAlpha = depth; c.fillStyle = gr; c.beginPath(); c.arc(d.x, d.y, d.r, 0, Math.PI * 2); c.fill();
      c.globalAlpha = depth * 0.55; c.strokeStyle = "#1a221e"; c.lineWidth = Math.max(1, d.r * 0.07); c.stroke();
      if (d.pro && d.z > -0.35) { // the charge, chalked on the front-facing protons
        const s = d.r * 0.42, rr = rng(d.seed); c.globalAlpha = depth * 0.95; c.strokeStyle = "#fffaf0"; c.lineCap = "round"; c.lineWidth = Math.max(1.6, d.r * 0.16);
        c.beginPath(); c.moveTo(d.x - s + (rr() - 0.5) * 2, d.y + (rr() - 0.5) * 2); c.lineTo(d.x + s, d.y + (rr() - 0.5) * 2); c.moveTo(d.x + (rr() - 0.5) * 2, d.y - s); c.lineTo(d.x + (rr() - 0.5) * 2, d.y + s); c.stroke();
      }
    }
    c.globalAlpha = 1;
  }, { textures: ["pencilTooth"] });

  // labels: written on stroke by stroke as each element arrives
  const wr = clamp((local - 6) / 22);
  g.group("plain", () => {
    symbol(g, el.sym, 1450, 190, { cap: 190, color: CHALK, seed: 3 + k, w: 9, progress: wr });
    letter(g, el.name, 1450, 440, { cap: 52, color: CHALK, seed: 9 + k, align: "center", w: 4.2, progress: wr });
    letter(g, `${el.Z} PROTON${el.Z > 1 ? "S" : ""}`, 1450, 560, { cap: 44, color: PRO, seed: 21 + k, align: "center", w: 4, progress: clamp((local - 10) / 18) });
    letter(g, `${el.N} NEUTRON${el.N === 1 ? "" : "S"}`, 1450, 632, { cap: 34, color: NEU, seed: 27 + k, align: "center", w: 3.2, opacity: 0.8, progress: clamp((local - 14) / 18) });
    // legend
    g.touch(60, 50, 120, 150); icon(g.cur, 88, 74, 17, true); icon(g.cur, 88, 124, 17, false);
    letter(g, "PROTON   POSITIVE", 122, 61, { cap: 26, color: PRO, seed: 71, w: 2.6 });
    letter(g, "NEUTRON  NO CHARGE", 122, 111, { cap: 26, color: NEU, seed: 72, w: 2.6 });
  }, { textures: ["pencilTooth"] });

  // the element row: more protons, further along; a chalk ring tracks the current one
  const row = ELEMENTS.map((e, i) => [300 + i * 264, 925] as P);
  g.group("plain", () => {
    ELEMENTS.forEach((e, i) => {
      const on = i === k;
      symbol(g, e.sym, row[i][0], row[i][1] - 36, { cap: 52, color: on ? YEL : CHALK, seed: 40 + i, w: 4, opacity: on ? 1 : 0.45 });
      letter(g, String(e.Z), row[i][0], row[i][1] + 36, { cap: 24, color: on ? PRO : CHALK, seed: 50 + i, align: "center", w: 2.4, opacity: on ? 1 : 0.4 });
    });
    g.pen([[190, 1010], [760, 1006], [1330, 1012], [1780, 1006]], { w: 3, color: CHALK, seed: 91, boil: 0, opacity: 0.35, wobble: 1 });
    letter(g, "PROTONS", 1790, 1022, { cap: 20, color: CHALK, seed: 93, align: "right", w: 2, opacity: 0.45 });
    // ring slides from the previous tile to this one, then keeps being redrawn (it boils, never still)
    const from = k === 0 ? row[ELEMENTS.length - 1] : row[prevK], to = row[k], x = lerp(from[0], to[0], m), y = lerp(from[1], to[1], m);
    const ring: P[] = Array.from({ length: 26 }, (_, i) => { const a = -2 + (i / 24) * Math.PI * 2; return [x + Math.cos(a) * 92, y + Math.sin(a) * 74] as P; });
    g.pen(ring, { w: 4, color: YEL, seed: 60 + (frame >> 2), boil: 1.2, opacity: 0.85, wobble: 1.2, taper: 0.5 });
  }, { textures: ["pencilTooth"] });
};

export const nucleusChalk: Film = {
  meta: { title: "nucleusChalk", W, H, fps: FPS, bpm: BPM, durationFrames: DURATION },
  assets: { images: {} },
  shots: [{ id: "loop", start: 0, end: DURATION, draw }],
};
