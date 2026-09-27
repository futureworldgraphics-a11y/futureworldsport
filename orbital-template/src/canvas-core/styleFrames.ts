import { Gfx, rng, halftone, PENCIL, RISOLINE, type Ctx, type Env, type Medium, type P } from "./core";
import { Film } from "./film";
import { clamp, lerp } from "./gallery";
import { letter, width } from "./drafting";
import { OUT, CREAM, FLAT, ball, glow as sGlow, inked, text, space as spaceLayer, cached } from "./spaceStyle";
import * as PK from "./pixelKit";

// STYLE FRAMES · the light-speed script as 10 stills, in 14 styles. The ten moments are written
// once against a tiny drawing vocabulary (bg, fill, sphere, stroke, glow, label, caption); each
// style is a renderer for that vocabulary, so every style tells the same story with its own hand.

const W = 1920, H = 1080;
type Hue = keyof typeof PAL;
type Kind = "space" | "kitchen" | "cold" | "park";
type Shape = { k: "rect"; x: number; y: number; w: number; h: number } | { k: "ell"; x: number; y: number; rx: number; ry: number } | { k: "poly"; pts: P[] };
type Face = "open" | "blink" | "happy" | "wide" | "sleepy" | "dizzy" | "determined";
type Mouth = "none" | "smile" | "o" | "flat" | "yawn";
type PhO = { face?: Face; mouth?: Mouth; look?: [number, number]; wave?: [number, number]; streak?: number; a?: number };
type PersonO = { hat?: "police" | "hard" | "none"; shirt: Hue; pants?: Hue; face?: 1 | -1; armL?: number; armR?: number; legs?: number; kick?: boolean; mouth?: boolean };
interface Style {
  bg(kind: Kind, o?: { streak?: boolean; dim?: boolean }): void;
  fill(s: Shape, h: Hue, o?: { a?: number }): void;
  sphere(x: number, y: number, r: number, h: Hue, o?: { a?: number }): void;
  stroke(pts: P[], h: Hue, w: number, o?: { a?: number; dash?: boolean }): void;
  glow(x: number, y: number, r: number, h: Hue, a: number): void;
  label(s: string, x: number, y: number, size: number, h: Hue, align?: "left" | "center"): void;
  caption(s: string): void;
  wrap(draw: () => void): void;
  photon?(x: number, y: number, r: number, h: Hue, o: PhO): void;
  person?(x: number, y: number, s: number, o: PersonO): void;
}

const PAL = {
  orange: ["#8a2a0e", "#e0561c", "#ff9a3c", "#ffe0a0"], red: ["#4a0f1c", "#9a1f2e", "#d8404a", "#ff9a90"], violet: ["#3a1a7a", "#7a44e0", "#c4a0ff", "#f0e8ff"],
  blue: ["#1f3f8f", "#3a78e0", "#8ab8ff", "#e8f2ff"], cyan: ["#0f5f7a", "#1fa3c9", "#5fd6f5", "#e0faff"], yellow: ["#8a5a0a", "#e0a020", "#ffd650", "#fff4c0"],
  sun: ["#9a3a0a", "#e0701a", "#ffb030", "#fff0a0"], white: ["#8a8aa8", "#d8d8ec", "#f4f4ff", "#ffffff"], gray: ["#3a3a48", "#6a6a7a", "#9a9aaa", "#d0d0dc"],
  steel: ["#40444f", "#6a7080", "#a8b0c0", "#dfe6f0"], green: ["#1f5a2a", "#2f8a3e", "#55b060", "#a8e08a"], proton: ["#8f1f2e", "#e0344d", "#ff6b7d", "#ffc2ca"],
  neutron: ["#1f3f8f", "#3a6fe0", "#6fa0ff", "#cddcff"], pink: ["#8a1f5a", "#e03a8a", "#ff7ab8", "#ffd0e8"], dark: ["#05040c", "#0b0918", "#1a1630", "#2a2552"],
  cream: ["#b8a888", "#e8dcc0", "#f4ecdc", "#fffaf0"], wood: ["#3a2214", "#6a4026", "#9a6a3a", "#c8985a"], sky: ["#2a5aa8", "#4a8ad8", "#8ac0f0", "#d8ecff"],
  grass: ["#2f6a2a", "#4f9a3f", "#6fba5a", "#a8e08a"], lcd: ["#06140c", "#0b2214", "#6fff9a", "#c8ffd8"], police: ["#141a3a", "#2a3a7a", "#4a5aa8", "#8a9ad8"],
  skin: ["#a06a4a", "#f0c09a", "#ffd8b8", "#fff0e0"], hard: ["#a87a10", "#ffc83a", "#ffe080", "#fff4c8"], shirt: ["#8a1a18", "#e0302a", "#ff6a5a", "#ffc0b0"],
  rock: ["#2a2434", "#4a4454", "#6a6478", "#9a94a8"], black: ["#000000", "#121018", "#2a2a38", "#4a4a58"], gold: ["#8a6a12", "#d8a83a", "#ffd166", "#fff2c2"],
  panel: ["#05040c", "#0e0c20", "#2a2552", "#4a4370"], night: ["#060a20", "#12204a", "#1c2c68", "#2a3a88"],
};

// ================================================================ shared geometry
const ellPts = (x: number, y: number, rx: number, ry: number, n = 48): P[] => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [x + Math.cos(a) * rx, y + Math.sin(a) * ry] as P; });
const shapePts = (s: Shape): P[] => s.k === "rect" ? [[s.x, s.y], [s.x + s.w, s.y], [s.x + s.w, s.y + s.h], [s.x, s.y + s.h]] : s.k === "ell" ? ellPts(s.x, s.y, s.rx, s.ry) : s.pts;
const bbox = (pts: P[]) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return { x0, y0, x1, y1 }; };
const path = (c: Ctx, pts: P[], close = true) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); if (close) c.closePath(); };
const hexRgb = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgb = (h: string) => hexRgb(h).join(",");
const mix = (a: string, b: string, k: number) => { const A = hexRgb(a), B = hexRgb(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * clamp(k)).toString(16).padStart(2, "0")).join(""); };
const tone = (h: Hue) => { const [r, g, b] = hexRgb(PAL[h][1]); return 1 - (0.3 * r + 0.59 * g + 0.11 * b) / 255; };
// parallel chords across a circle; d0..d1 pick a band (as a fraction of r) along the normal
const chords = (x: number, y: number, r: number, ang: number, sp: number, d0 = -1, d1 = 1): [P, P][] => { const out: [P, P][] = [], dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx; for (let d = -r + sp / 2; d < r; d += sp) { if (d / r < d0 || d / r > d1) continue; const h = Math.sqrt(r * r - d * d), cx = x + nx * d, cy = y + ny * d; out.push([[cx - dx * h, cy - dy * h], [cx + dx * h, cy + dy * h]]); } return out; };
const bboxLines = (pts: P[], ang: number, sp: number): [P, P][] => { const b = bbox(pts), cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, R = Math.hypot(b.x1 - b.x0, b.y1 - b.y0) / 2 + sp; return chords(cx, cy, R, ang, sp); };
const dashSplit = (pts: P[], on: number, off: number): P[][] => { const out: P[][] = []; let cur: P[] = [], acc = 0, drawing = true; for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], L = Math.hypot(x1 - x0, y1 - y0); let s = 0; while (s < L) { const lim = drawing ? on : off, step = Math.min(lim - acc, L - s), a: P = [x0 + ((x1 - x0) * s) / L, y0 + ((y1 - y0) * s) / L]; s += step; acc += step; const b: P = [x0 + ((x1 - x0) * s) / L, y0 + ((y1 - y0) * s) / L]; if (drawing) { if (!cur.length) cur.push(a); cur.push(b); } if (acc >= lim - 1e-6) { if (drawing && cur.length > 1) out.push(cur); cur = []; drawing = !drawing; acc = 0; } } } if (drawing && cur.length > 1) out.push(cur); return out; };
const sine = (x0: number, x1: number, y: number, wl: number, amp: number, fade = true): P[] => { const pts: P[] = []; for (let x = x1; x >= x0; x -= Math.max(3, wl / 12)) { const k = fade ? (x - x0) / (x1 - x0) : 1; pts.push([x, y + Math.sin(((x1 - x) / wl) * Math.PI * 2) * amp * (0.3 + 0.7 * k)]); } return pts; };
// the draftsman's hand, plus the question mark it lacks
const hand = (g: Gfx, s: string, x: number, y: number, cap: number, color: string, w: number, align: "left" | "center" = "left") => {
  const sc = cap / 6, adv = (ch: string) => (ch === "?" ? 3.8 * sc : ch === " " ? 2.6 * sc : width(ch, cap)) + 1.25 * sc, total = [...s].reduce((a, ch) => a + adv(ch), 0);
  let cx = align === "center" ? x - total / 2 : x;
  for (const ch of s) {
    if (ch === "?") [[[0.4, 1.3], [1.1, 0.2], [2.6, 0.1], [3.5, 1.0], [3.5, 2.2], [2.6, 3.0], [1.9, 3.6], [1.9, 4.4]], [[1.9, 5.5], [1.95, 5.9]]].forEach((pp, j) => g.pen((pp as P[]).map(([px, py]) => [cx + (px + (6 - py) * 0.2) * sc, y + py * sc] as P), { w, color, seed: 7 + j, wobble: 0, boil: 0, taper: 0 }));
    else if (ch !== " ") letter(g, ch, cx, y, { cap, color, w });
    cx += adv(ch);
  }
};
const R = (x: number, y: number, w: number, h: number): Shape => ({ k: "rect", x, y, w, h });
const E = (x: number, y: number, rx: number, ry = rx): Shape => ({ k: "ell", x, y, rx, ry });

// ================================================================ composites built from the vocabulary
const photon = (S: Style, x: number, y: number, r: number, h: Hue, o: PhO = {}) => {
  if (S.photon) return S.photon(x, y, r, h, o);
  const { face = "open", mouth = "none", look = [1, 0] } = o, a = o.a ?? 1;
  if (o.streak) for (let k = 0; k < 4; k++) S.stroke([[x - r - 30 - k * 12, y - r * 0.5 + k * r * 0.33], [x - r - o.streak * (0.5 + 0.15 * k), y - r * 0.5 + k * r * 0.33]], h, Math.max(3, r * 0.08), { a: 0.35 * a });
  if (o.wave) S.stroke(sine(x - r - o.wave[0], x - r * 0.6, y, o.wave[1], r * 0.5), h, Math.max(4, r * 0.14), { a });
  S.sphere(x, y, r, h, { a });
  for (const side of [-1, 1]) {
    const ex = x + side * r * 0.36, ey = y - r * 0.1, ew = r * 0.15, eh = r * 0.22;
    if (face === "blink") { S.stroke([[ex - ew, ey + eh * 0.3], [ex + ew, ey + eh * 0.3]], "black", r * 0.07); continue; }
    if (face === "happy") { S.stroke([[ex - ew, ey + eh * 0.3], [ex, ey - eh * 0.4], [ex + ew, ey + eh * 0.3]], "black", r * 0.07); continue; }
    if (face === "dizzy") { S.stroke([[ex - ew, ey - ew], [ex + ew, ey + ew]], "black", r * 0.06); S.stroke([[ex + ew, ey - ew], [ex - ew, ey + ew]], "black", r * 0.06); continue; }
    const big = face === "wide" ? 1.3 : 1;
    S.fill(E(ex, ey, ew * big, eh * big), "white");
    const px = face === "wide" ? 0 : look[0] === 0 ? -side * ew * 0.35 : look[0] * ew * 0.45, py = look[1] * eh * 0.4 + (face === "sleepy" ? eh * 0.35 : 0);
    S.fill(E(ex + px, ey + py, ew * 0.55, eh * 0.55 * (face === "sleepy" ? 0.7 : 1)), "black");
    if (face === "sleepy") S.stroke([[ex - ew * 1.1, ey - eh * 0.1], [ex + ew * 1.1, ey - eh * 0.1]], "black", r * 0.07);
    if (face === "determined") S.stroke([[ex - ew * 1.2, ey - eh * 1.2], [ex + ew * 1.2, ey - eh * 1.2]], "black", r * 0.06);
  }
  const my = y + r * 0.42;
  if (mouth === "smile") S.stroke([[x - r * 0.22, my - r * 0.04], [x - r * 0.08, my + r * 0.08], [x + r * 0.08, my + r * 0.08], [x + r * 0.22, my - r * 0.04]], "black", r * 0.07);
  if (mouth === "o") S.fill(E(x, my + r * 0.04, r * 0.1, r * 0.12), "black");
  if (mouth === "yawn") { S.fill(E(x, my, r * 0.16, r * 0.2), "black"); S.fill(E(x, my + r * 0.1, r * 0.09, r * 0.06), "proton"); }
  if (mouth === "flat") S.stroke([[x - r * 0.16, my], [x + r * 0.16, my]], "black", r * 0.07);
};
const person = (S: Style, x: number, y: number, s: number, o: PersonO) => {
  if (S.person) return S.person(x, y, s, o);
  const u = 8 * s, f = o.face ?? 1, pants = o.pants ?? "black", legs = o.legs ?? 1;
  if (o.kick) { S.stroke([[x - u, y - 6 * u], [x - 2.5 * u, y]], pants, 2 * u); S.stroke([[x + u, y - 6 * u], [x + 6 * u * f, y - 4 * u]], pants, 2 * u); S.fill(E(x + 6.6 * u * f, y - 4 * u, 1.3 * u, 0.9 * u), "black"); }
  else { S.stroke([[x - u, y - 6 * u], [x - u - legs * u, y]], pants, 2 * u); S.stroke([[x + u, y - 6 * u], [x + u + legs * u, y]], pants, 2 * u); S.fill(E(x + u + legs * u + 0.6 * u * f, y, 1.3 * u, 0.7 * u), "black"); }
  S.fill(E(x - u - (o.kick ? 1.5 * u : legs * u) + 0.6 * u * f, y, 1.3 * u, 0.7 * u), "black");
  S.fill(R(x - 3 * u, y - 13.5 * u, 6 * u, 8 * u), o.shirt);
  const arm = (sx: number, a: number) => { const ex = sx + Math.sin(a) * 5.2 * u * f, ey = y - 12.5 * u + Math.cos(a) * 5.2 * u; S.stroke([[sx, y - 12.5 * u], [ex, ey]], o.shirt, 1.7 * u); S.fill(E(ex, ey, 0.9 * u), "skin"); };
  arm(x - 2.8 * u * f, o.armL ?? 0.2); arm(x + 2.8 * u * f, o.armR ?? -0.2);
  S.sphere(x, y - 17.2 * u, 3.3 * u, "skin");
  S.fill(E(x - 0.9 * u * f, y - 19.6 * u, 3 * u, 1.3 * u), "wood");
  S.fill(E(x + 1.5 * u * f, y - 17.6 * u, 0.45 * u, 0.65 * u), "black");
  if (o.mouth) S.fill(E(x + 1.4 * u * f, y - 15.5 * u, 0.7 * u, 0.6 * u), "red");
  if (o.hat === "police") { S.fill(R(x - 3.6 * u, y - 22.2 * u, 7.2 * u, 2.6 * u), "police"); S.fill(R(x - 3.6 * u + (f > 0 ? 3 * u : -1.6 * u), y - 19.9 * u, 4.2 * u, 0.9 * u), "black"); S.fill(E(x, y - 21 * u, 0.7 * u), "gold"); }
  if (o.hat === "hard") { S.fill(E(x, y - 20.4 * u, 3.9 * u, 2.6 * u), "hard"); S.fill(R(x - 4.6 * u, y - 19.6 * u, 9.2 * u, 0.9 * u), "hard"); }
};
const candle = (S: Style, x: number, base: number, s: number) => {
  S.glow(x, base - 80 * s, 90 * s, "orange", 0.8);
  S.fill(E(x, base, 28 * s, 6 * s), "wood");
  S.fill(R(x - 9 * s, base - 60 * s, 18 * s, 60 * s), "cream");
  S.stroke([[x, base - 60 * s], [x, base - 66 * s]], "black", 1.6 * s);
  S.fill(E(x, base - 80 * s, 9 * s, 17 * s), "orange"); S.fill(E(x, base - 76 * s, 6 * s, 12 * s), "yellow"); S.fill(E(x, base - 73 * s, 3 * s, 6 * s), "white");
};
const lcd = (S: Style, x: number, y: number, w: number, h: number, s: string, sub?: string) => {
  S.fill(R(x - 10, y - 10, w + 20, h + 20), "gray"); S.fill(R(x, y, w, h), "lcd");
  S.label(s, x + w / 2, y + h * 0.2, h * (sub ? 0.42 : 0.55), "lcd", "center");
  if (sub) S.label(sub, x + w - 30, y + h * 0.7, h * 0.18, "lcd", "left");
};
const jets = (S: Style, x: number, y: number, len: number, w: number) => {
  S.glow(x, y, len * 0.5, "violet", 0.8);
  S.stroke([[x, y - len], [x, y + len]], "violet", w * 2.4, { a: 0.5 }); S.stroke([[x, y - len], [x, y + len]], "white", w);
  S.sphere(x, y, w * 1.4, "white"); S.glow(x, y, w * 7, "white", 0.9);
};
const lens = (S: Style, x: number, y: number, r: number, bg: Hue, inside: () => void) => {
  S.stroke([[x + r * 0.7, y + r * 0.7], [x + r * 1.15, y + r * 1.15]], "wood", r * 0.16);
  S.fill(E(x, y, r), bg); inside();
  S.stroke(ellPts(x, y, r, r, 60).concat([ellPts(x, y, r, r, 60)[0]]), "gray", r * 0.1);
};

// ================================================================ the ten moments (spread across the whole script)
type Frame = { id: string; kind: Kind; o?: { streak?: boolean; dim?: boolean }; cap: string; draw: (S: Style) => void };
const QM = (() => { const pts: P[] = []; for (let i = 0; i < 11; i++) { const a = Math.PI * 1.1 - (i / 10) * Math.PI * 1.45; pts.push([Math.cos(a) * 1.5, -1.3 + Math.sin(a) * -1.5]); } pts.push([0.05, 0.55], [0, 1.25], [0, 2.7]); return pts; })();
const FRAMES: Frame[] = [
  { id: "01-candle", kind: "kitchen", cap: "A PHOTON IS BORN", draw: (S) => {
    S.fill(R(1260, 180, 480, 500), "wood"); S.fill(R(1285, 205, 430, 450), "night");
    S.sphere(1600, 320, 46, "cream"); [[1340, 260], [1420, 360], [1500, 240], [1380, 520], [1660, 480], [1560, 600]].forEach(([x, y]) => S.fill(E(x, y, 4), "white"));
    S.fill(R(1495, 205, 12, 450), "wood"); S.fill(R(1285, 424, 430, 12), "wood"); S.fill(R(1230, 680, 540, 24), "wood");
    S.fill(R(1320, 610, 46, 70), "proton"); S.sphere(1343, 590, 30, "green");
    S.fill(R(0, 760, W, 320), "wood"); S.fill(R(0, 760, W, 12), "cream", { a: 0.5 });
    S.fill(E(360, 700, 90, 62), "dark"); S.fill(R(280, 715, 160, 45), "dark"); S.stroke([[440, 690], [510, 640]], "dark", 18);
    S.fill(R(1050, 680, 70, 80), "white"); S.stroke(ellPts(1135, 718, 20, 26, 20), "white", 10);
    candle(S, 860, 770, 3);
    S.glow(860, 380, 150, "orange", 0.7); photon(S, 860, 370, 64, "orange", { face: "open", look: [0, 0], mouth: "smile" });
  } },
  { id: "02-burst", kind: "space", cap: "MORE ENERGY THAN THE SUN", draw: (S) => {
    jets(S, 470, 540, 520, 22);
    S.stroke(ellPts(470, 540, 280, 280, 64).concat([[750, 540]]), "violet", 6, { a: 0.5 });
    const r = rng(3); for (let i = 0; i < 26; i++) { const a = r() * 6.28, d = 150 + r() * 260; S.fill(E(470 + Math.cos(a) * d, 540 + Math.sin(a) * d * 0.8, 5), i % 2 ? "violet" : "sun"); }
    S.fill(R(1000, 200, 900, 440), "panel", { a: 0.92 });
    S.sphere(1080, 330, 18, "white"); for (let k = 0; k < 8; k++) { const a = (k / 8) * 6.28; S.stroke([[1080 + Math.cos(a) * 26, 330 + Math.sin(a) * 26], [1080 + Math.cos(a) * 42, 330 + Math.sin(a) * 42]], "violet", 5); }
    S.stroke(ellPts(1160, 330, 26, 26, 30).concat([[1186, 330]]), "white", 6); S.stroke([[1160, 330], [1174, 314]], "proton", 5);
    S.fill(R(1215, 305, 760, 50), "violet"); S.fill(R(1215, 305, 760, 12), "white", { a: 0.5 });
    photon(S, 1080, 520, 46, "yellow", { face: "wide", look: [1, -1], mouth: "o" });
    S.fill({ k: "poly", pts: [[1140, 478], [1180, 478], [1160, 520]] }, "cream"); S.fill({ k: "poly", pts: [[1140, 562], [1180, 562], [1160, 520]] }, "gold");
    S.fill(R(1215, 495, 170, 50), "yellow"); S.fill(R(1215, 495, 170, 12), "white", { a: 0.5 });
  } },
  { id: "03-race", kind: "space", o: { streak: true }, cap: "ALL AT THE SAME SPEED", draw: (S) => {
    [165, 315, 465, 615, 765, 915].forEach((y) => S.stroke([[0, y], [W, y]], "gray", 3, { a: 0.35 }));
    ([[240, "orange", 90], [390, "violet", 34], [540, "cyan", 60], [690, "white", 20], [840, "blue", 52]] as [number, Hue, number][]).forEach(([y, h, wl], i) => photon(S, 1250, y, 48, h, { face: "determined", wave: [950, wl], streak: 360, a: i === 2 ? 0.55 : 1 }));
    S.stroke([[1310, 170], [1310, 910]], "cyan", 6); S.glow(1310, 540, 90, "cyan", 0.4);
  } },
  { id: "04-ancient", kind: "space", o: { streak: true }, cap: "13 BILLION YEARS TRAVELLING", draw: (S) => {
    S.glow(380, 260, 170, "violet", 0.5); for (const arm of [0, Math.PI]) S.stroke(Array.from({ length: 16 }, (_, k) => { const a = arm + k * 0.42, rr = 20 + k * 9; return [380 + Math.cos(a) * rr, 260 + Math.sin(a) * rr * 0.55] as P; }), "violet", 8, { a: 0.8 }); S.sphere(380, 260, 16, "cream");
    photon(S, 1150, 290, 60, "orange", { face: "open", look: [0, 1], mouth: "smile", wave: [900, 86] });
    lcd(S, 920, 500, 460, 80, "13,000,000,000");
    S.stroke([[1150, 750], [1150, 792]], "gray", 6); S.fill(R(1090, 790, 120, 80), "wood");
    ([["pink", 1100, 802], ["cyan", 1140, 830], ["yellow", 1170, 800], ["green", 1105, 842], ["violet", 1180, 845]] as [Hue, number, number][]).forEach(([h, x, y]) => S.fill(R(x, y, 18, 16), h));
    photon(S, 1150, 690, 62, "red", { face: "sleepy", look: [0, -1], mouth: "smile", wave: [900, 210] });
  } },
  { id: "05-why", kind: "space", o: { dim: true }, cap: "BUT WHY?", draw: (S) => {
    QM.forEach(([qx, qy]) => { const x = 1350 + qx * 100, y = 430 + qy * 100; S.glow(x, y, 50, "cream", 0.55); S.sphere(x, y, 11, "cream"); });
    photon(S, 470, 420, 110, "orange", { face: "wide", look: [1, 0.3], mouth: "o" });
    photon(S, 820, 640, 100, "red", { face: "open", look: [-1, -0.6], mouth: "flat" });
    S.label("?", 560, 250, 70, "cream"); S.label("?", 900, 470, 56, "cream");
  } },
  { id: "06-radio", kind: "cold", cap: "A TINY SLIVER OF RADIO", draw: (S) => {
    S.stroke(ellPts(480, 460, 200, 80, 64).concat([[680, 460]]), "cyan", 5, { dash: true });
    S.sphere(480, 460, 56, "proton");
    for (let k = 0; k < 6; k++) S.fill(R(418 + k * 21, 478, 21, 20), k % 2 ? "white" : "shirt"); for (let k = 0; k < 3; k++) S.fill(R(500, 498 + k * 18, 20, 18), k % 2 ? "white" : "shirt");
    S.sphere(660, 420, 14, "cyan"); S.glow(660, 420, 40, "cyan", 0.8);
    S.stroke([[700, 450], [1130, 420]], "cyan", 4, { dash: true, a: 0.7 });
    lens(S, 1330, 420, 170, "night", () => { S.stroke([[1190, 340], [1470, 340]], "white", 8); S.stroke([[1190, 500], [1470, 500]], "white", 8); S.stroke([[1330, 370], [1330, 452]], "cyan", 6); S.stroke([[1312, 432], [1330, 456], [1348, 432]], "cyan", 6); S.sphere(1330, 478, 20, "cyan"); });
    S.stroke(sine(520, 1000, 840, 240, 30, false), "red", 8);
    photon(S, 1080, 840, 56, "red", { face: "blink", mouth: "yawn" });
  } },
  { id: "07-sun", kind: "space", cap: "15 MILLION DEGREES", draw: (S) => {
    S.glow(420, 560, 520, "sun", 0.55); S.sphere(420, 560, 330, "sun");
    const r = rng(7); for (let i = 0; i < 40; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * 280; S.fill(E(420 + Math.cos(a) * d, 560 + Math.sin(a) * d, 10 + r() * 8), i % 2 ? "yellow" : "orange", { a: 0.6 }); }
    S.stroke([[720, 450], [990, 360]], "sun", 5, { dash: true });
    lens(S, 1150, 330, 150, "red", () => { S.glow(1150, 330, 110, "white", 0.9); S.sphere(1125, 310, 26, "proton"); S.sphere(1175, 350, 26, "proton"); S.sphere(1175, 305, 26, "neutron"); S.sphere(1125, 355, 26, "neutron"); });
    S.label("15,000,000", 1150, 560, 84, "yellow", "center");
    S.fill(R(1690, 110, 60, 700), "white"); S.fill(R(1706, 130, 28, 690), "proton"); S.fill(R(1678, 430, 84, 18), "gray"); S.sphere(1720, 860, 64, "proton");
  } },
  { id: "08-metal", kind: "space", cap: "THROUGH THE STRONGEST METAL", draw: (S) => {
    jets(S, 330, 520, 560, 18);
    S.fill(R(1570, 170, 70, 44), "blue"); S.fill(R(1720, 170, 70, 44), "blue"); S.fill(R(1640, 162, 80, 60), "gold"); S.fill(E(1640, 240, 22, 14), "white");
    S.fill(R(1080, 230, 120, 650), "steel"); S.fill(R(1080, 230, 22, 650), "white", { a: 0.35 });
    [260, 360, 460, 560, 760, 860].forEach((y) => { S.sphere(1110, y, 6, "white"); S.sphere(1170, y, 6, "white"); });
    S.glow(1140, 690, 60, "orange", 0.9); S.stroke(ellPts(1140, 690, 22, 22, 24).concat([[1162, 690]]), "orange", 10); S.fill(E(1140, 690, 14), "black");
    const r = rng(8); for (let i = 0; i < 12; i++) { const a = r() * 6.28; S.stroke([[1140 + Math.cos(a) * 30, 690 + Math.sin(a) * 30], [1140 + Math.cos(a) * 70, 690 + Math.sin(a) * 70]], "orange", 5); }
    photon(S, 1760, 690, 46, "white", { face: "determined", wave: [420, 22], streak: 200 });
    person(S, 1330, 900, 1.15, { hat: "hard", shirt: "orange", pants: "police", face: -1, armL: 0.3, armR: 1.4, mouth: true });
  } },
  { id: "09-radar", kind: "space", cap: "RADAR SAYS 299,792,458 M/S", draw: (S) => {
    S.fill(E(340, 1010, 440, 160), "rock"); S.fill(E(340, 910, 400, 50), "gray");
    person(S, 380, 905, 1.3, { hat: "police", shirt: "police", face: 1, armR: 1.55, armL: 0.2, mouth: true });
    S.fill(R(455, 690, 96, 46), "gray"); S.fill(R(551, 700, 26, 24), "black"); S.fill(R(470, 736, 26, 40), "gray"); S.fill(E(478, 704, 6), "proton");
    S.stroke([[580, 710], [1340, 585]], "proton", 5, { dash: true });
    photon(S, 1420, 580, 54, "orange", { face: "determined", wave: [500, 86], streak: 280 });
    lcd(S, 960, 140, 880, 250, "299,792,458", "M/S");
  } },
  { id: "10-kick", kind: "park", cap: "KICK IT HARD: IT ROCKETS", draw: (S) => {
    S.glow(240, 170, 160, "sun", 0.6); S.sphere(240, 170, 64, "sun");
    ([[600, 200, 1], [1020, 150, 0.8], [1250, 330, 0.7]] as [number, number, number][]).forEach(([x, y, s]) => { S.fill(E(x, y, 80 * s, 50 * s), "white"); S.fill(E(x + 80 * s, y + 14 * s, 64 * s, 40 * s), "white"); S.fill(E(x - 76 * s, y + 18 * s, 56 * s, 34 * s), "white"); });
    [120, 820, 1880].forEach((x) => { S.fill(R(x - 12, 640, 24, 120), "wood"); S.sphere(x, 600, 70, "green"); });
    for (let x = 1500; x <= 1740; x += 30) S.stroke([[x, 580], [x, 880]], "gray", 3, { a: 0.7 }); for (let y = 580; y <= 880; y += 30) S.stroke([[1480, y], [1760, y]], "gray", 3, { a: 0.7 });
    S.stroke([[1480, 880], [1480, 560], [1760, 560], [1760, 880]], "white", 14);
    person(S, 560, 900, 1.35, { shirt: "shirt", pants: "white", face: 1, kick: true, armL: 1.6, armR: -1.2 });
    for (let k = 0; k < 4; k++) S.stroke([[980, 700 + k * 14 - 20], [1240 - k * 30, 715 + k * 10 - 20]], "white", 6, { a: 0.6 });
    S.sphere(1300, 720, 34, "white"); S.fill(E(1300, 720, 12), "black"); S.fill(E(1284, 738, 7), "black");
    photon(S, 900, 330, 48, "orange", { face: "open", look: [1, 1], wave: [700, 86], streak: 200 });
    lcd(S, 1380, 70, 440, 150, "30", "M/S");
  } },
];

// ================================================================ the styles
type Mk = (c: Ctx, env: Env, f: number) => Style;
const starfield = (seed: number, n: number) => { const r = rng(seed), a: [number, number, number][] = []; for (let i = 0; i < n; i++) a.push([r() * W, r() * 900, r()]); return a; };
const STARS = starfield(11, 150);
const dimBand = (c: Ctx, a = 0.55) => { const g = c.createLinearGradient(0, 900, 0, H); g.addColorStop(0, "rgba(5,4,12,0)"); g.addColorStop(0.5, `rgba(5,4,12,${a})`); g.addColorStop(1, `rgba(5,4,12,${a})`); c.fillStyle = g; c.fillRect(0, 880, W, 200); };
const vignette = (c: Ctx, a = 0.45, col = "4,3,10") => { const g = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.65); g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},${a})`); c.fillStyle = g; c.fillRect(0, 0, W, H); };
const streaks = (c: Ctx, col: string, a: number) => { const r = rng(21); c.save(); c.strokeStyle = col; c.lineCap = "round"; for (let i = 0; i < 70; i++) { const x = r() * W, y = r() * 900, l = 60 + r() * 180; c.globalAlpha = a * (0.3 + r() * 0.7); c.lineWidth = 2 + r() * 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x + l, y); c.stroke(); } c.restore(); };
const gradBg = (c: Ctx, top: string, bot: string, y0 = 0, y1 = H) => { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, top); g.addColorStop(1, bot); c.fillStyle = g; c.fillRect(0, y0, W, y1 - y0); };

// ---------------- 1. space explainer (the channel look)
const mkSpace: Mk = (c, env, f) => {
  const g = new Gfx(c, env, f, FLAT);
  return {
    bg(kind, o = {}) {
      if (kind === "space" || kind === "cold") { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(spaceLayer(env).canvas as CanvasImageSource, 0, 0); c.restore(); c.setTransform(env.scale, 0, 0, env.scale, 0, 0); if (kind === "cold") { c.fillStyle = "rgba(40,120,170,0.18)"; c.fillRect(0, 0, W, H); } STARS.forEach(([x, y, b]) => { c.globalAlpha = 0.4 + 0.6 * b; c.fillStyle = b > 0.8 ? "#ffd166" : CREAM; c.beginPath(); c.arc(x, y, 1.5 + b * 2.5, 0, 6.283); c.fill(); }); c.globalAlpha = 1; if (o.streak) streaks(c, "#b9b3ff", 0.35); if (o.dim) { c.fillStyle = "rgba(8,6,20,0.35)"; c.fillRect(0, 0, W, H); } }
      if (kind === "kitchen") gradBg(c, "#3a2440", "#1a1024");
      if (kind === "park") { gradBg(c, "#6aa8f0", "#d8ecff", 0, 780); c.fillStyle = "#4f9a3f"; c.fillRect(0, 780, W, 300); c.fillStyle = OUT; c.fillRect(0, 776, W, 8); }
    },
    fill(s, h, o = {}) { const pts = shapePts(s); c.save(); c.globalAlpha = o.a ?? 1; path(c, pts); c.lineJoin = "round"; c.strokeStyle = OUT; c.lineWidth = s.k === "rect" && Math.min(s.w, s.h) < 20 ? 3 : 7; c.stroke(); c.fillStyle = PAL[h][1]; c.fill(); c.restore(); },
    sphere(x, y, r, h, o = {}) { ball(c, x, y, r, PAL[h], { alpha: o.a ?? 1 }); },
    stroke(pts, h, w, o = {}) { if (o.dash) c.setLineDash([w * 2.5, w * 2.5]); inked(c, pts, PAL[h][2], w, { alpha: o.a ?? 1 }); c.setLineDash([]); },
    glow(x, y, r, h, a) { sGlow(c, x, y, r, rgb(PAL[h][2]), a * 0.8); },
    label(s, x, y, size, h, align = "left") { text(g, s, x, y, { cap: size, color: PAL[h][2], align, w: size * 0.11 }); },
    caption(s) { dimBand(c); text(g, s, W / 2, 955, { cap: 46, color: CREAM, align: "center", w: 5 }); },
    wrap(d) { d(); vignette(c, 0.35); },
  };
};

// ---------------- 2. pixel art (the Opus chunk's look)
const mkPixel: Mk = (c, env, f) => {
  const g = new Gfx(c, env, f, FLAT), s = env.scale, L = cached(env, "sfPix", () => env.canvas(Math.round(PK.PW * s), Math.round(PK.PH * s))), p = L.ctx, k = 1 / 5, lights: [number, number, number, string, number][] = [];
  const bands = (top: string, bot: string, y0 = 0, y1 = PK.PH, n = 8) => { for (let i = 0; i < n; i++) PK.rect(p, 0, y0 + ((y1 - y0) * i) / n, PK.PW, (y1 - y0) / n + 1, mix(top, bot, i / (n - 1))); };
  const S0 = PK.makeStars(5, 140);
  return {
    bg(kind, o = {}) {
      p.setTransform(s, 0, 0, s, 0, 0); p.imageSmoothingEnabled = false; p.globalAlpha = 1; p.globalCompositeOperation = "source-over";
      if (kind === "space" || kind === "cold") { bands(kind === "cold" ? "#0b1634" : "#0f0b28", "#05040f"); PK.haze(p, 80, 60, 100, "90,60,170", 0.18); PK.haze(p, 300, 160, 110, "40,90,160", 0.16); PK.drawStars(p, S0, 3, 0, 0, 0.9, o.streak ? 10 : 0); if (o.dim) PK.rect(p, 0, 0, PK.PW, PK.PH, "rgba(5,4,15,0.35)"); }
      if (kind === "kitchen") bands("#26142e", "#110a18", 0, PK.PH, 6);
      if (kind === "park") { bands("#3a6ac8", "#c8e6ff", 0, 156); PK.rect(p, 0, 156, PK.PW, 60, "#4f9a3f"); PK.rect(p, 0, 156, PK.PW, 1, "#3a7a30"); }
    },
    fill(sh, h, o = {}) { p.globalAlpha = o.a ?? 1; if (sh.k === "rect") { PK.rect(p, sh.x * k, sh.y * k, sh.w * k, sh.h * k, PAL[h][1]); if (sh.h * k > 3) PK.rect(p, sh.x * k, sh.y * k, sh.w * k, 1, PAL[h][2]); } else if (sh.k === "ell") PK.ellipse(p, sh.x * k, sh.y * k, Math.max(0.6, sh.rx * k), Math.max(0.6, sh.ry * k), PAL[h][1]); else { p.fillStyle = PAL[h][1]; path(p, sh.pts.map(([x, y]) => [x * k, y * k] as P)); p.fill(); } p.globalAlpha = 1; },
    sphere(x, y, r, h, o = {}) { p.globalAlpha = o.a ?? 1; PK.sphere(p, x * k, y * k, r * k, PAL[h]); p.globalAlpha = 1; },
    stroke(pts, h, w, o = {}) { p.globalAlpha = o.a ?? 1; const lw = Math.max(1, Math.round(w * k)); for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; if (o.dash) PK.dashed(p, x0 * k, y0 * k, x1 * k, y1 * k, PAL[h][2], 3, 3); else PK.line(p, x0 * k, y0 * k, x1 * k, y1 * k, PAL[h][2], lw); } p.globalAlpha = 1; },
    glow(x, y, r, h, a) { PK.glow(p, x * k, y * k, r * k * 0.8, rgb(PAL[h][2]), a); lights.push([x, y, r, rgb(PAL[h][2]), a]); },
    label(t, x, y, size, h, align = "left") { PK.ptext(p, t, x * k, y * k, Math.max(1, Math.round((size * k) / 5)), PAL[h][2], align === "center" ? "center" : "left", PK.INK); },
    caption(t) { c.setTransform(env.scale, 0, 0, env.scale, 0, 0); c.fillStyle = "#05040a"; c.fillRect(0, 0, W, 110); c.fillRect(0, 930, W, 150); text(g, t, W / 2, 968, { cap: 40, color: CREAM, align: "center", w: 4.2 }); },
    wrap(d) {
      d(); c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false; c.drawImage(L.canvas as CanvasImageSource, 0, 0, L.canvas.width, L.canvas.height, 0, 0, Math.round(W * s), Math.round(H * s)); c.restore();
      c.setTransform(s, 0, 0, s, 0, 0); c.save(); c.globalCompositeOperation = "lighter"; for (const [x, y, r, col, a] of lights) { const gr = c.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${col},${0.35 * a})`); gr.addColorStop(1, `rgba(${col},0)`); c.fillStyle = gr; c.fillRect(x - r, y - r, 2 * r, 2 * r); } c.restore(); vignette(c, 0.45);
    },
    photon(x, y, r, h, o) { PK.photon(p, x * k, y * k, r * k, PAL[h], { face: o.face ?? "open", mouth: o.mouth ?? "none", look: o.look ?? [1, 0], wave: o.wave ? Math.round(o.wave[0] * k) : 0, waveLen: o.wave ? o.wave[1] * k : 10, streak: o.streak ? Math.round(o.streak * k * 0.3) : 0, alpha: o.a ?? 1 }); lights.push([x, y, r * 2.2, rgb(PAL[h][2]), 0.5]); },
    person(x, y, sc, o) { PK.person(p, x * k, y * k, Math.max(1, Math.round(sc * 1.6)), { shirt: PAL[o.shirt][1], pants: PAL[o.pants ?? "black"][1], hat: o.hat === "none" ? "none" : o.hat, face: o.face ?? 1, armL: o.armL, armR: o.armR, legs: o.kick ? 3 : o.legs ?? 1, mouth: o.mouth ? "open" : "none" }); },
  };
};

// ---------------- 3. blueprint (white ruling pen on cyanotype blue)
const RULING: Medium = { nib: 1.1, taper: 0.15, pressure: 0.15, retrace: false, wobble: 0.35, rough: 0.35 };
const mkBlueprint: Mk = (c, env, f) => {
  const g = new Gfx(c, env, f, RULING), INKW = "#f2f7ff";
  const pen = (pts: P[], w: number, seed: number, a = 0.95, closed = false) => g.pen(pts, { w, color: INKW, seed, wobble: 0.5, boil: 0.3, taper: 0.2, opacity: a, closed });
  let seed = 1;
  return {
    bg(kind, o = {}) {
      const bg = c.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, W * 0.7); bg.addColorStop(0, kind === "cold" ? "#2a6aa0" : "#2a62a8"); bg.addColorStop(1, "#163c72"); c.fillStyle = bg; c.fillRect(0, 0, W, H);
      c.strokeStyle = "rgba(220,235,255,0.09)"; c.lineWidth = 1; for (let x = 40; x < W; x += 40) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); } for (let y = 40; y < H; y += 40) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
      if (o.dim) { c.fillStyle = "rgba(10,25,60,0.25)"; c.fillRect(0, 0, W, H); }
    },
    fill(sh, h, o = {}) { const pts = shapePts(sh), a = (o.a ?? 1) * 0.95, sz = bbox(pts); if (Math.max(sz.x1 - sz.x0, sz.y1 - sz.y0) < 26) { pen(pts, 2, seed++, a, true); return; } pen(pts, 2.4, seed++, a, true); if (tone(h) > 0.6 || h === "black") { const cc = g.cur; cc.save(); path(cc, pts); cc.clip(); bboxLines(pts, -0.785, 16).forEach(([p0, p1]) => pen([p0, p1], 1.2, seed++, a * 0.55)); cc.restore(); } },
    sphere(x, y, r, h, o = {}) { const a = (o.a ?? 1) * 0.95; pen(ellPts(x, y, r, r, 40), 2.8, seed++, a, true); if (r < 16) return; pen(ellPts(x, y, r * 0.4, r, 36), 1.3, seed++, a * 0.6, true); pen(ellPts(x, y + r * 0.35, r * 0.94, r * 0.22, 36), 1.3, seed++, a * 0.6, true); chords(x, y, r, -0.785, Math.max(9, r / 9), 0.2, 1).forEach(([p0, p1]) => pen([p0, p1], 1.1, seed++, a * 0.55)); },
    stroke(pts, h, w, o = {}) { const lw = clamp(w * 0.35, 1.8, 5), a = (o.a ?? 1) * 0.95; (o.dash ? dashSplit(pts, 18, 14) : [pts]).forEach((pp) => pen(pp, lw, seed++, a)); },
    glow(x, y, r, h, a) { [0.45, 0.7].forEach((k) => dashSplit(ellPts(x, y, r * k, r * k, 48).concat([[x + r * k, y]]), 10, 12).forEach((pp) => pen(pp, 1.2, seed++, 0.45 * a))); },
    label(s, x, y, size, h, align = "left") { hand(g, s, x, y, size * 0.8, INKW, Math.max(2, size * 0.05), align); },
    caption(s) { c.strokeStyle = "rgba(242,247,255,0.9)"; c.lineWidth = 3; c.strokeRect(40, 930, W - 80, 110); c.lineWidth = 1.2; c.strokeRect(52, 942, W - 104, 86); hand(g, s, W / 2, 962, 44, INKW, 3.2, "center"); g.paper("blueMottle", 0.3); vignette(c, 0.4, "8,24,60"); },
    wrap(d) { g.inkGroup(d, { blur: 2.2, alpha: 0.35, textures: ["draftTooth"] }); },
  };
};

// ---------------- 4. chalkboard
const CHALK: Medium = { nib: 2.1, taper: 0.55, pressure: 0.95, retrace: true, wobble: 1.4, rough: 1.2 };
const mkChalk: Mk = (c, env, f) => {
  const g = new Gfx(c, env, f, CHALK), ch = (h: Hue) => mix(PAL[h][2], "#ffffff", 0.35);
  let seed = 1;
  const pen = (pts: P[], w: number, col: string, a = 0.9, closed = false) => g.pen(pts, { w, color: col, seed: seed++, opacity: a, closed });
  return {
    bg(kind, o = {}) {
      gradBg(c, "#2f3d36", "#222d28"); const r = rng(4); for (let i = 0; i < 14; i++) { const x = r() * W, y = r() * H, rr = 150 + r() * 300, gr = c.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, "rgba(255,255,255,0.05)"); gr.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = gr; c.fillRect(x - rr, y - rr, 2 * rr, 2 * rr); }
      c.fillStyle = "#6a4026"; c.fillRect(0, 0, W, 26); c.fillRect(0, H - 26, W, 26); c.fillRect(0, 0, 26, H); c.fillRect(W - 26, 0, 26, H); c.fillStyle = "#8a5a36"; c.fillRect(26, H - 36, W - 52, 10);
      if (kind === "park") { g.group("ink", () => { pen([[40, 780], [W - 40, 780]], 3, "#e8f0d0", 0.8); for (let x = 60; x < W; x += 70) pen([[x, 780], [x + 8, 760]], 2, "#a8e08a", 0.6); }); }
      if (o.dim) { c.fillStyle = "rgba(0,0,0,0.15)"; c.fillRect(0, 0, W, H); }
      if (kind === "space" || kind === "cold") g.group("ink", () => STARS.slice(0, 60).forEach(([x, y]) => { pen([[x - 6, y], [x + 6, y]], 1.6, "#f4f4ea", 0.7); pen([[x, y - 6], [x, y + 6]], 1.6, "#f4f4ea", 0.7); }));
    },
    fill(sh, h, o = {}) { const pts = shapePts(sh), a = o.a ?? 1; g.fill(pts, ch(h), 0.28 * a); pen(pts, 2.6, ch(h), 0.85 * a, true); },
    sphere(x, y, r, h, o = {}) { const a = o.a ?? 1, pts = ellPts(x, y, r, r, 40); g.fill(pts, ch(h), 0.22 * a); pen(pts, Math.min(4, 1.5 + r * 0.05), ch(h), 0.9 * a, true); if (r > 14) { chords(x, y, r * 0.96, -0.785, Math.max(8, r / 8), 0.25, 1).forEach(([p0, p1]) => pen([p0, p1], 1.6, ch(h), 0.55 * a)); pen(ellPts(x, y, r * 0.72, r * 0.72, 30).slice(17, 27), 2.4, "#ffffff", 0.7 * a); } },
    stroke(pts, h, w, o = {}) { (o.dash ? dashSplit(pts, 22, 16) : [pts]).forEach((pp) => pen(pp, clamp(w * 0.55, 2, 12), ch(h), 0.85 * (o.a ?? 1))); },
    glow(x, y, r, h, a) { const cc = g.cur, gr = cc.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${rgb(ch(h))},${0.18 * a})`); gr.addColorStop(1, `rgba(${rgb(ch(h))},0)`); g.touch(x - r, y - r, x + r, y + r); cc.fillStyle = gr; cc.fillRect(x - r, y - r, 2 * r, 2 * r); },
    label(s, x, y, size, h, align = "left") { hand(g, s, x, y, size * 0.8, ch(h), Math.max(2.4, size * 0.06), align); },
    caption(s) { g.group("ink", () => hand(g, s, W / 2, 950, 48, "#f4f4ea", 4, "center")); vignette(c, 0.35); },
    wrap(d) { g.group("ink", d); },
  };
};

// ---------------- 5-6. media on paper: pencil & watercolour, crayon, ink & line-wash
const CRAYON: Medium = { nib: 2.8, taper: 0.1, pressure: 0.8, retrace: true, wobble: 1.8, rough: 2.4 };
const INKPEN: Medium = { nib: 1.5, taper: 0.9, pressure: 0.7, retrace: false, wobble: 0.8, rough: 0.6 };
type Media = "storybook" | "crayon" | "inkwash";
const mkMedia = (kindOf: Media): Mk => (c, env, f) => {
  const g = new Gfx(c, env, f, kindOf === "crayon" ? CRAYON : kindOf === "inkwash" ? INKPEN : PENCIL);
  const paperCol = kindOf === "inkwash" ? "#f8f3e8" : kindOf === "crayon" ? "#fdfaf2" : "#fbf6ea", lineCol = kindOf === "inkwash" ? "#1a1818" : "#4a4250";
  const tint = (h: Hue, k = 2) => kindOf === "inkwash" ? mix(PAL[h][k], "#8a8aa0", 0.25) : PAL[h][k];
  let seed = 1, darkBg = false;
  const wash = (pts: P[], col: string, a: number) => kindOf === "crayon" ? g.fill(pts, col, a) : g.wash(pts, col, { alpha: a, seed: seed++, rim: kindOf === "storybook" });
  const pen = (pts: P[], w: number, col: string, a = 0.9, closed = false) => g.pen(pts, { w, color: col, seed: seed++, opacity: a, closed, wobble: kindOf === "crayon" ? 1.6 : 1 });
  const big = (col: string, a: number, y0 = 30, y1 = H - 30) => wash([[36, y0 + 10], [W / 2, y0], [W - 36, y0 + 14], [W - 30, (y0 + y1) / 2], [W - 40, y1], [W / 2, y1 + 8], [40, y1 - 4], [30, (y0 + y1) / 2]], col, a);
  const inGroup = (fn: () => void) => (kindOf === "crayon" ? g.group("ink", fn, { textures: ["risoSpeck"] }) : fn());
  return {
    bg(kind, o = {}) {
      c.fillStyle = paperCol; c.fillRect(0, 0, W, H);
      inGroup(() => {
        if (kind === "space" || kind === "cold") { darkBg = true; big(kind === "cold" ? (kindOf === "inkwash" ? "#4a6878" : "#2a5a88") : kindOf === "inkwash" ? "#3a4460" : "#1e2a6a", kindOf === "crayon" ? 1 : 0.9); big(kindOf === "inkwash" ? "#2a3048" : "#3a2a78", kindOf === "crayon" ? 0.5 : 0.35, 80, 700);
          if (kindOf === "crayon") { const r = rng(9); for (let i = 0; i < 26; i++) { const y = 40 + i * 34; pen([[40, y], [W - 40, y + (r() - 0.5) * 20]], 10, "#2a3a8a", 0.35); } }
          STARS.forEach(([x, y, b]) => { if (kindOf === "crayon") { if (b > 0.5) { pen([[x - 8, y], [x + 8, y]], 4, "#ffd166", 0.9); pen([[x, y - 8], [x, y + 8]], 4, "#ffd166", 0.9); } } else g.fill(ellPts(x, y, 2 + b * 3, 2 + b * 3, 10), "#fffaf0", 0.85); }); }
        if (kind === "kitchen") { big(kindOf === "inkwash" ? "#8a7a6a" : "#8a4a3a", 0.8); darkBg = true; }
        if (kind === "park") { big(kindOf === "inkwash" ? "#b8c8d8" : "#a9cdea", 0.8, 30, 780); wash([[30, 770], [W / 2, 760], [W - 30, 775], [W - 36, H - 30], [36, H - 34]], kindOf === "inkwash" ? "#8a9a88" : "#7fba6a", 0.85); }
        if (o.dim) big("#10102a", 0.35);
      });
    },
    fill(sh, h, o = {}) { const pts = shapePts(sh), a = o.a ?? 1, bb = bbox(pts), small = Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0) < 30; if (kindOf === "crayon") { g.fill(pts, PAL[h][2], a); if (!small) pen(pts, 4, PAL[h][0], 0.8 * a, true); return; } if (small) { g.fill(pts, h === "white" ? "#ffffff" : tint(h, 1), a); return; } wash(pts, tint(h), 0.75 * a); pen(pts, kindOf === "inkwash" ? 2.2 : 1.6, lineCol, (kindOf === "inkwash" ? 0.9 : 0.55) * a, true); },
    sphere(x, y, r, h, o = {}) {
      const a = o.a ?? 1, pts = ellPts(x, y, r, r, 36);
      if (kindOf === "storybook") { g.form(pts, PAL[h][2], PAL[h][0], { seed: seed++, light: [-r * 0.12, -r * 0.14], alpha: 0.95 * a, hi: r > 10 ? [x - r * 0.35, y - r * 0.4, r * 0.2, r * 0.13] : undefined }); if (r > 8) pen(pts, 1.4, lineCol, 0.45 * a, true); return; }
      if (kindOf === "crayon") { g.fill(pts, PAL[h][2], a); chords(x, y, r * 0.94, -0.785, Math.max(6, r / 7), 0.15, 1).forEach(([p0, p1]) => pen([p0, p1], clamp(r / 10, 2, 7), PAL[h][1], 0.8 * a)); if (r > 10) pen(ellPts(x - r * 0.35, y - r * 0.38, r * 0.2, r * 0.13, 10), 3, "#ffffff", 0.8 * a, true); pen(pts, clamp(r / 12, 2, 5), PAL[h][0], 0.9 * a, true); return; }
      wash(pts, tint(h), 0.7 * a); wash(ellPts(x + r * 0.18, y + r * 0.2, r * 0.8, r * 0.8, 30), tint(h, 0), 0.35 * a); pen(pts, clamp(r / 20, 1.6, 3), lineCol, 0.9 * a, true);
      if (r > 20) { const q = rng(seed++); for (let i = 0; i < r * 0.8; i++) { const an = 0.2 + q() * 1.4, d = r * (0.55 + q() * 0.4); g.fill(ellPts(x + Math.cos(an) * d, y + Math.sin(an) * d, 1.4, 1.4, 6), lineCol, 0.7 * a); } }
    },
    stroke(pts, h, w, o = {}) { const a = o.a ?? 1, pp = o.dash ? dashSplit(pts, 22, 16) : [pts]; if (kindOf === "inkwash") pp.forEach((q) => { pen(q, clamp(w * 0.9, 4, 30), tint(h), 0.35 * a); pen(q, clamp(w * 0.3, 1.6, 5), lineCol, 0.9 * a); }); else pp.forEach((q) => pen(q, clamp(w * (kindOf === "crayon" ? 0.8 : 0.6), 2, kindOf === "crayon" ? 20 : 12), PAL[h][kindOf === "crayon" ? 1 : 1], 0.9 * a)); },
    glow(x, y, r, h, a) { if (kindOf === "crayon") { for (let k = 0; k < 12; k++) { const an = (k / 12) * 6.283; pen([[x + Math.cos(an) * r * 0.45, y + Math.sin(an) * r * 0.45], [x + Math.cos(an) * r * 0.75, y + Math.sin(an) * r * 0.75]], 5, PAL[h][3], 0.6 * a); } return; } wash(ellPts(x, y, r * 0.75, r * 0.75, 24), PAL[h][3], 0.3 * a); },
    label(s, x, y, size, h, align = "left") { hand(g, s, x, y, size * 0.8, darkBg && kindOf !== "inkwash" ? mix(PAL[h][3], "#ffffff", 0.3) : lineCol, Math.max(2.4, size * 0.07), align); },
    caption(s) { g.fill([[300, 930], [W - 300, 924], [W - 290, 1040], [310, 1046]], paperCol, 0.92); hand(g, s, W / 2, 955, 50, lineCol, 4.4, "center"); if (kindOf !== "crayon") g.paper("coldpress", 0.18); g.paper("paper", 0.1); },
    wrap(d) { inGroup(d); },
  };
};

// ---------------- 7. risograph (two-drum overprint on cream)
const INKS: Record<string, string> = { pink: "#ff48b0", blue: "#0078bf", yellow: "#ffe800", green: "#00a95c" };
const RISOMAP: Partial<Record<Hue, [string, string?, number?]>> = { orange: ["yellow", "pink"], red: ["pink", "blue", 0.6], violet: ["blue", "pink"], blue: ["blue"], cyan: ["blue", undefined, 0.55], yellow: ["yellow"], sun: ["yellow", "pink", 0.7], proton: ["pink"], neutron: ["blue"], pink: ["pink"], green: ["green"], grass: ["green"], sky: ["blue", undefined, 0.4], wood: ["yellow", "pink", 0.5], lcd: ["green", "blue", 0.9], police: ["blue", "pink", 0.8], skin: ["pink", "yellow", 0.35], hard: ["yellow"], shirt: ["pink", "yellow", 0.9], gold: ["yellow"], night: ["blue", "pink", 0.9], dark: ["blue", "pink", 1], panel: ["blue", "pink", 1], black: ["blue", "pink", 1], gray: ["blue", undefined, 0.45], steel: ["blue", undefined, 0.5], rock: ["blue", "pink", 0.5], cream: ["yellow", undefined, 0.2], white: ["yellow", undefined, 0.08] };
const mkRiso: Mk = (c, env, f) => {
  const g = new Gfx(c, env, f, RISOLINE);
  const ink = (h: Hue): [string, string | undefined, number] => { const m = RISOMAP[h] ?? ["blue", undefined, 0.6]; return [INKS[m[0]], m[1] ? INKS[m[1]] : undefined, m[2] ?? 0.85]; };
  const flat = (pts: P[], col: string, a: number, off: P = [0, 0]) => { c.save(); c.globalCompositeOperation = "multiply"; c.globalAlpha = a; c.fillStyle = col; path(c, pts.map(([x, y]) => [x + off[0], y + off[1]] as P)); c.fill(); c.restore(); };
  let seed = 1;
  return {
    bg(kind, o = {}) {
      c.fillStyle = "#f4ecdc"; c.fillRect(0, 0, W, H);
      const all: P[] = [[0, 0], [W, 0], [W, H], [0, H]];
      if (kind === "space" || kind === "cold") { flat(all, INKS.blue, kind === "cold" ? 0.7 : 0.95); if (kind === "space") flat(all, INKS.pink, 0.35, [5, 3]); c.fillStyle = "rgba(244,236,220,0.9)"; STARS.forEach(([x, y, b]) => { c.beginPath(); c.arc(x, y, 2 + b * 3, 0, 6.283); c.fill(); }); }
      if (kind === "kitchen") { flat(all, INKS.yellow, 0.8); flat(all, INKS.pink, 0.55, [4, 3]); flat(all, INKS.blue, 0.35); }
      if (kind === "park") { flat([[0, 0], [W, 0], [W, 780], [0, 780]], INKS.blue, 0.4); flat([[0, 780], [W, 780], [W, H], [0, H]], INKS.green, 0.75); }
      if (o.dim) flat(all, INKS.blue, 0.3);
    },
    fill(sh, h, o = {}) { const pts = shapePts(sh), [a1, b1, d] = ink(h), a = (o.a ?? 1) * d; if (h === "white" || h === "cream") { c.save(); c.globalAlpha = o.a ?? 1; c.fillStyle = "#f4ecdc"; path(c, pts); c.fill(); c.restore(); if (h === "cream") flat(pts, INKS.yellow, 0.25); return; } flat(pts, a1, a); if (b1) flat(pts, b1, a * 0.7, [4, 3]); },
    sphere(x, y, r, h, o = {}) { const pts = ellPts(x, y, r, r, 40), [a1, b1, d] = ink(h), a = (o.a ?? 1) * d; if (h === "white" || h === "cream") { c.fillStyle = "#f4ecdc"; path(c, pts); c.fill(); } else flat(pts, a1, a * 0.6);
      const dot = b1 ?? a1, b = { x0: x - r, y0: y - r, x1: x + r, y1: y + r }; c.save(); c.globalCompositeOperation = "multiply"; c.globalAlpha = Math.min(1, a + 0.1); c.fillStyle = dot; c.beginPath();
      halftone(b, Math.max(5, r / 10), 30, (px, py) => { const nx = (px - x) / r, ny = (py - y) / r, q = nx * nx + ny * ny; if (q > 1) return 0; const nz = Math.sqrt(1 - q), l = clamp(-0.5 * nx - 0.6 * ny + 0.62 * nz); return clamp(1 - l) * 0.9; }).forEach(([hx, hy, hr]) => { c.moveTo(hx + hr, hy); c.arc(hx, hy, hr, 0, 6.283); }); c.fill(); c.restore(); },
    stroke(pts, h, w, o = {}) { const [a1] = ink(h); (o.dash ? dashSplit(pts, 22, 16) : [pts]).forEach((pp) => { c.save(); c.globalCompositeOperation = "multiply"; g.pen(pp, { w: clamp(w * 0.8, 3, 26), color: h === "white" ? INKS.yellow : a1, seed: seed++, opacity: 0.9 * (o.a ?? 1) }); c.restore(); }); },
    glow(x, y, r, h, a) { const b = { x0: x - r, y0: y - r, x1: x + r, y1: y + r }; c.save(); c.globalCompositeOperation = "multiply"; c.fillStyle = INKS.yellow; c.globalAlpha = 0.8 * a; c.beginPath(); halftone(b, Math.max(6, r / 12), 15, (px, py) => clamp(1 - Math.hypot(px - x, py - y) / r) * 0.8).forEach(([hx, hy, hr]) => { c.moveTo(hx + hr, hy); c.arc(hx, hy, hr, 0, 6.283); }); c.fill(); c.restore(); },
    label(s, x, y, size, h, align = "left") { c.save(); c.globalCompositeOperation = "multiply"; hand(g, s, x + 4, y + 3, size * 0.8, INKS.pink, Math.max(3, size * 0.08), align); hand(g, s, x, y, size * 0.8, INKS.blue, Math.max(3, size * 0.08), align); c.restore(); },
    caption(s) { c.fillStyle = "#f4ecdc"; c.fillRect(0, 920, W, 160); c.save(); c.globalCompositeOperation = "multiply"; hand(g, s, W / 2 + 5, 958, 52, INKS.pink, 5, "center"); hand(g, s, W / 2, 955, 52, INKS.blue, 5, "center"); c.restore(); g.paper("paper", 0.26); g.paper("coldpress", 0.14); },
    wrap(d) { d(); },
  };
};

// ---------------- 8-9. monochrome hands: ballpoint on notebook paper, copperplate engraving
const BALL: Medium = { nib: 0.9, taper: 0.4, pressure: 0.5, retrace: true, wobble: 0.8, rough: 0.3 };
const mkMono = (mode: "ballpoint" | "engraving"): Mk => (c, env, f) => {
  const g = new Gfx(c, env, f, mode === "ballpoint" ? BALL : INKPEN), INK_ = mode === "ballpoint" ? "#1f3a93" : "#1a1612", paperCol = mode === "ballpoint" ? "#fbfbf6" : "#f3ecd8";
  let seed = 1;
  const pen = (pts: P[], w: number, a = 0.95, closed = false) => g.pen(pts, { w, color: INK_, seed: seed++, opacity: a, closed, wobble: mode === "ballpoint" ? 0.9 : 0.3, taper: mode === "engraving" ? 0.3 : 0.5 });
  const raw = (x0: number, y0: number, x1: number, y1: number, w: number, a = 1) => { const cc = g.cur; cc.save(); cc.globalAlpha = a; cc.strokeStyle = INK_; cc.lineCap = "round"; cc.lineWidth = w; cc.beginPath(); cc.moveTo(x0, y0); cc.lineTo(x1, y1); cc.stroke(); cc.restore(); g.touch(Math.min(x0, x1) - w, Math.min(y0, y1) - w, Math.max(x0, x1) + w, Math.max(y0, y1) + w); };
  const clipHatch = (pts: P[], sp: number, ang: number, w: number, a: number) => { const cc = g.cur; cc.save(); path(cc, pts); cc.clip(); bboxLines(pts, ang, sp).forEach(([p0, p1]) => (mode === "ballpoint" ? pen([p0, p1], w, a) : raw(p0[0], p0[1], p1[0], p1[1], w, a))); cc.restore(); };
  const spiral = (x: number, y: number, r: number, dark: number, a: number) => { const sp = clamp(r / 24, 3.2, 7), turns = r / sp, n = Math.ceil(turns * Math.max(24, r * 0.9)), cc = g.cur; g.touch(x - r, y - r, x + r, y + r); cc.save(); cc.globalAlpha = a; cc.strokeStyle = INK_; cc.lineCap = "round"; let px0 = x, py0 = y;
    for (let i = 1; i <= n; i++) { const th = (i / n) * turns * Math.PI * 2, rr = (th / (Math.PI * 2)) * sp, qx = x + Math.cos(th) * rr, qy = y + Math.sin(th) * rr, nx = (qx - x) / r, ny = (qy - y) / r, q = nx * nx + ny * ny, nz = Math.sqrt(Math.max(0, 1 - q)), l = clamp(-0.5 * nx - 0.6 * ny + 0.62 * nz); cc.lineWidth = Math.max(0.35, sp * 0.9 * clamp(0.15 + dark * 0.35 + (1 - l) * 0.75)); cc.beginPath(); cc.moveTo(px0, py0); cc.lineTo(qx, qy); cc.stroke(); px0 = qx; py0 = qy; }
    cc.restore(); };
  return {
    bg(kind, o = {}) {
      c.fillStyle = paperCol; c.fillRect(0, 0, W, H);
      if (mode === "ballpoint") { c.strokeStyle = "rgba(90,140,220,0.35)"; c.lineWidth = 2; for (let y = 120; y < H; y += 46) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); } c.strokeStyle = "rgba(220,60,70,0.5)"; c.beginPath(); c.moveTo(150, 0); c.lineTo(150, H); c.stroke();
        if (kind === "space" || kind === "cold") STARS.slice(0, 50).forEach(([x, y]) => { for (let k = 0; k < 3; k++) { const an = (k / 3) * Math.PI; pen([[x - Math.cos(an) * 9, y - Math.sin(an) * 9], [x + Math.cos(an) * 9, y + Math.sin(an) * 9]], 1.4, 0.8); } });
        if (kind === "park") pen([[40, 780], [W - 40, 784]], 2, 0.9); }
      else { const sp = kind === "park" ? 12 : kind === "kitchen" ? 8 : 6, w = kind === "park" ? 0.9 : kind === "kitchen" ? 1.5 : 2.2, sky = kind === "park" ? 780 : H; for (let y = 4; y < sky; y += sp) { let x0 = 0; if (kind === "space" || kind === "cold") STARS.forEach(([sx, sy, b]) => { if (Math.abs(sy - y) < 4 + b * 4 && sx > x0) { raw(x0, y, sx - 8, y, w, 0.9); x0 = sx + 8; } }); raw(x0, y + (kind === "cold" ? Math.sin(y * 0.05) * 3 : 0), W, y, w, 0.9); } if (kind === "park") for (let y = 790; y < H; y += 7) raw(0, y, W, y, 1.8, 0.9); }
      if (o.dim && mode === "engraving") for (let y = 7; y < 900; y += 12) raw(0, y, W, y, 1.2, 0.6);
    },
    fill(sh, h, o = {}) { const pts = shapePts(sh), a = o.a ?? 1, t = h === "white" || h === "cream" ? 0 : tone(h), bb = bbox(pts), small = Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0) < 30;
      if (small) { if (t > 0.5) { const cc = g.cur; cc.save(); cc.globalAlpha = a; cc.fillStyle = INK_; path(cc, pts); cc.fill(); cc.restore(); g.touch(bb.x0, bb.y0, bb.x1, bb.y1); } else pen(pts, 1.4, a, true); return; }
      if (mode === "engraving") { const cc = g.cur; cc.save(); path(cc, pts); cc.fillStyle = paperCol; cc.globalAlpha = a; cc.fill(); cc.restore(); }
      if (t > 0.15) clipHatch(pts, lerp(22, 6, t), mode === "ballpoint" ? -0.785 : 0, mode === "ballpoint" ? 1.7 : 1.2 + t * 1.4, 0.8 * a);
      if (t > 0.65) clipHatch(pts, lerp(22, 8, t), 0.785, 1.1, 0.7 * a);
      pen(pts, mode === "ballpoint" ? 2.8 : 2.2, a, true); },
    sphere(x, y, r, h, o = {}) { const a = o.a ?? 1, t = h === "white" || h === "cream" ? 0.05 : tone(h), pts = ellPts(x, y, r, r, 40);
      if (mode === "engraving") { const cc = g.cur; cc.save(); path(cc, pts); cc.fillStyle = paperCol; cc.globalAlpha = a; cc.fill(); cc.restore(); if (r < 10) { pen(pts, 1.4, a, true); return; } spiral(x, y, r, t, a); return; }
      pen(pts, clamp(r / 30, 1.4, 2.6), a, true); if (r < 12) return;
      chords(x, y, r * 0.97, -0.785, lerp(16, 6, t), 0.1, 1).forEach(([p0, p1]) => pen([p0, p1], 1, 0.75 * a));
      if (t > 0.45) chords(x, y, r * 0.97, 0.785, lerp(18, 8, t), -0.2, 1).forEach(([p0, p1]) => pen([p0, p1], 1, 0.6 * a)); },
    stroke(pts, h, w, o = {}) { (o.dash ? dashSplit(pts, 20, 14) : [pts]).forEach((pp) => pen(pp, clamp(w * 0.3, 1.4, 5), 0.95 * (o.a ?? 1))); },
    glow(x, y, r, h, a) { for (let k = 0; k < 24; k++) { const an = (k / 24) * 6.283; if (mode === "ballpoint") pen([[x + Math.cos(an) * r * 0.5, y + Math.sin(an) * r * 0.5], [x + Math.cos(an) * r * 0.72, y + Math.sin(an) * r * 0.72]], 1.1, 0.5 * a); else raw(x + Math.cos(an) * r * 0.45, y + Math.sin(an) * r * 0.45, x + Math.cos(an) * r * 0.85, y + Math.sin(an) * r * 0.85, 0.9, 0.6 * a); } },
    label(s, x, y, size, h, align = "left") { hand(g, s, x, y, size * 0.8, INK_, Math.max(2, size * 0.05), align); },
    caption(s) { c.fillStyle = paperCol; c.fillRect(260, 920, W - 520, 140); if (mode === "engraving") { c.strokeStyle = INK_; c.lineWidth = 3; c.strokeRect(280, 930, W - 560, 110); c.lineWidth = 1; c.strokeRect(292, 942, W - 584, 86); } hand(g, s, W / 2, 958, 46, INK_, 3.4, "center"); if (mode === "ballpoint") pen(Array.from({ length: 30 }, (_, i) => [W / 2 - 420 + i * 29, 1030 + Math.sin(i * 1.3) * 4] as P), 1.6, 0.9); g.paper("paper", 0.08); },
    wrap(d) { d(); },
  };
};

// ---------------- 10-14. vector families: marker comic, cut-paper, glossy cartoon (refs 1 & 4), clay (refs 2 & 3)
type Vec = "comic" | "cutpaper" | "glossy" | "clay";
const mkVec = (mode: Vec): Mk => (c, env, f) => {
  const g = new Gfx(c, env, f, FLAT), J = rng(77);
  const jitter = (pts: P[]) => (mode === "cutpaper" ? pts.map(([x, y]) => [x + (J() - 0.5) * 5, y + (J() - 0.5) * 5] as P) : pts);
  const shadowUnder = (pts: P[], a = 1) => { if (mode === "cutpaper") { c.save(); c.globalAlpha = 0.3 * a; c.fillStyle = "#28180a"; path(c, pts.map(([x, y]) => [x + 7, y + 10] as P)); c.fill(); c.restore(); } if (mode === "clay") { const b = bbox(pts), cx = (b.x0 + b.x1) / 2, rx = (b.x1 - b.x0) * 0.55, gy = b.y1 + 8, gr = c.createRadialGradient(cx, gy, 0, cx, gy, Math.max(4, rx)); gr.addColorStop(0, `rgba(20,10,50,${0.35 * a})`); gr.addColorStop(1, "rgba(20,10,50,0)"); c.save(); c.translate(cx, gy); c.scale(1, 0.22); c.translate(-cx, -gy); c.fillStyle = gr; c.fillRect(cx - rx, gy - rx, 2 * rx, 2 * rx); c.restore(); } };
  const outline = (pts: P[], w: number) => { c.save(); c.lineJoin = "round"; c.strokeStyle = "#111018"; c.lineWidth = w; path(c, pts); c.stroke(); c.restore(); };
  const comicBurst = (x: number, y: number, r: number, col: string, a: number) => { const pts: P[] = []; for (let i = 0; i < 28; i++) { const an = (i / 28) * 6.283, rr = i % 2 ? r * 0.55 : r; pts.push([x + Math.cos(an) * rr, y + Math.sin(an) * rr]); } c.save(); c.globalAlpha = a; c.fillStyle = col; path(c, pts); c.fill(); c.restore(); };
  const glossyBlobs = (cols: string[]) => { const r = rng(31); cols.forEach((col, i) => { c.save(); c.globalAlpha = 0.28; c.fillStyle = col; c.beginPath(); const y0 = 120 + i * 260 + r() * 60; c.moveTo(-50, y0); for (let x = 0; x <= W + 100; x += 120) c.quadraticCurveTo(x + 60, y0 + (r() - 0.5) * 220, x + 120, y0 + (r() - 0.5) * 120); c.lineTo(W + 100, y0 + 200); for (let x = W + 100; x >= -100; x -= 160) c.quadraticCurveTo(x - 80, y0 + 260 + (r() - 0.5) * 160, x - 160, y0 + 220); c.closePath(); c.fill(); c.restore(); }); };
  const comets = (n: number) => { const r = rng(41); for (let i = 0; i < n; i++) { const x = r() * W, y = r() * 820, l = 120 + r() * 200, col = r() > 0.5 ? "95,214,245" : "255,190,90", gr = c.createLinearGradient(x - l * 0.8, y - l * 0.6, x, y); gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(1, `rgba(${col},0.9)`); c.save(); c.strokeStyle = gr; c.lineWidth = 4; c.lineCap = "round"; c.beginPath(); c.moveTo(x - l * 0.8, y - l * 0.6); c.lineTo(x, y); c.stroke(); sGlow(c, x, y, 26, col, 0.9); c.fillStyle = "#ffffff"; c.beginPath(); c.arc(x, y, 5, 0, 6.283); c.fill(); c.restore(); } };
  const sparkles = (n: number, col: string) => { const r = rng(51); c.save(); c.fillStyle = col; for (let i = 0; i < n; i++) { const x = r() * W, y = r() * 880, s = 4 + r() * 10; c.beginPath(); c.moveTo(x, y - s); c.quadraticCurveTo(x, y, x + s, y); c.quadraticCurveTo(x, y, x, y + s); c.quadraticCurveTo(x, y, x - s, y); c.quadraticCurveTo(x, y, x, y - s); c.fill(); } c.restore(); };
  const bgCols: Record<Vec, Record<Kind, [string, string]>> = {
    comic: { space: ["#1a2a8a", "#101a60"], cold: ["#1a6a9a", "#0f4a70"], kitchen: ["#e07a2a", "#b04a1a"], park: ["#5fd0ff", "#a8e8ff"] },
    cutpaper: { space: ["#1c2248", "#141838"], cold: ["#1f4a6a", "#153650"], kitchen: ["#7a3a24", "#5a2818"], park: ["#8ac8ea", "#b8e0f4"] },
    glossy: { space: ["#241060", "#0e0830"], cold: ["#123a6a", "#081830"], kitchen: ["#3a1450", "#1a0828"], park: ["#ff9ac8", "#9ad8ff"] },
    clay: { space: ["#3b2a78", "#2e2064"], cold: ["#2a3a80", "#1e2a64"], kitchen: ["#5a2a6a", "#40204e"], park: ["#9ad0ff", "#d8eeff"] },
  };
  return {
    bg(kind, o = {}) {
      const [t0, t1] = bgCols[mode][kind]; gradBg(c, t0, t1);
      if (mode === "comic") { c.save(); c.fillStyle = "rgba(255,255,255,0.12)"; for (let y = 0; y < H; y += 22) for (let x = (y / 22) % 2 ? 11 : 0; x < W; x += 22) { c.beginPath(); c.arc(x, y, 4, 0, 6.283); c.fill(); } c.restore(); if (kind === "space" || kind === "cold") STARS.slice(0, 40).forEach(([x, y, b]) => comicBurst(x, y, 8 + b * 10, "#fff4a0", 0.9)); }
      if (mode === "cutpaper") { const r = rng(61); for (let i = 0; i < 4; i++) { const pts: P[] = [[-20, 200 + i * 220]]; for (let x = 0; x <= W + 40; x += 80) pts.push([x, 180 + i * 220 + (r() - 0.5) * 70]); pts.push([W + 40, H + 20], [-20, H + 20]); c.save(); c.globalAlpha = 0.9; c.fillStyle = mix(t0, "#ffffff", 0.05 + i * 0.04); path(c, jitter(pts)); c.shadowColor = "transparent"; c.fill(); c.restore(); }
        if (kind === "space" || kind === "cold") STARS.slice(0, 30).forEach(([x, y, b]) => { const s = 8 + b * 12, pts = Array.from({ length: 10 }, (_, i) => { const an = -Math.PI / 2 + (i / 10) * 6.283, rr = i % 2 ? s * 0.45 : s; return [x + Math.cos(an) * rr, y + Math.sin(an) * rr] as P; }); shadowUnder(pts); c.fillStyle = "#ffd166"; path(c, pts); c.fill(); }); }
      if (mode === "glossy") { if (kind !== "park") { glossyBlobs(["#6a3ad0", "#3a2aa0", "#8a2ab0"]); STARS.forEach(([x, y, b]) => { sGlow(c, x, y, 8 + b * 10, b > 0.5 ? "95,214,245" : "255,150,230", 0.8); c.fillStyle = "#e8faff"; c.beginPath(); c.arc(x, y, 1.5 + b * 2, 0, 6.283); c.fill(); }); comets(7); } else { c.fillStyle = "#6ac86a"; c.beginPath(); c.moveTo(0, 790); c.quadraticCurveTo(500, 700, 1000, 790); c.quadraticCurveTo(1500, 860, W, 770); c.lineTo(W, H); c.lineTo(0, H); c.fill(); } }
      if (mode === "clay") { if (kind !== "park") { const r = rng(71); for (let i = 0; i < 6; i++) { c.fillStyle = mix(t1, "#000000", 0.18); c.beginPath(); const x = r() * W, y = r() * 900, rr = 200 + r() * 260; for (let k = 0; k < 5; k++) { c.moveTo(x + k * rr * 0.4 + rr * 0.5, y + (k % 2) * 40); c.arc(x + k * rr * 0.4, y + (k % 2) * 40, rr * 0.5, 0, 6.283); } c.fill(); } sparkles(46, "#ffffff"); STARS.slice(0, 80).forEach(([x, y]) => { c.fillStyle = "rgba(255,255,255,0.7)"; c.beginPath(); c.arc(x, y, 2, 0, 6.283); c.fill(); }); } else { const gr = c.createLinearGradient(0, 760, 0, H); gr.addColorStop(0, "#7ad07a"); gr.addColorStop(1, "#4a9a4a"); c.fillStyle = gr; c.beginPath(); c.moveTo(0, 800); c.quadraticCurveTo(600, 720, 1200, 800); c.quadraticCurveTo(1600, 850, W, 790); c.lineTo(W, H); c.lineTo(0, H); c.fill(); } }
      if (o.streak) streaks(c, mode === "comic" ? "#ffffff" : "#c8c0ff", mode === "comic" ? 0.5 : 0.3);
      if (o.dim) { c.fillStyle = "rgba(5,4,20,0.3)"; c.fillRect(0, 0, W, H); }
    },
    fill(sh, h, o = {}) {
      const pts = jitter(shapePts(sh)), a = o.a ?? 1, b = bbox(pts), small = Math.max(b.x1 - b.x0, b.y1 - b.y0) < 30;
      shadowUnder(pts, a); c.save(); c.globalAlpha = a;
      if (mode === "comic") { c.fillStyle = PAL[h][1]; path(c, pts); c.fill(); if (!small) outline(pts, 7); else if (h !== "black") outline(pts, 3); }
      if (mode === "cutpaper") { c.fillStyle = PAL[h][h === "white" ? 3 : 2]; path(c, pts); c.fill(); }
      if (mode === "glossy" || mode === "clay") {
        const gr = c.createLinearGradient(0, b.y0, 0, b.y1); gr.addColorStop(0, PAL[h][mode === "clay" ? 2 : 3]); gr.addColorStop(0.55, PAL[h][mode === "clay" ? 1 : 2]); gr.addColorStop(1, PAL[h][mode === "clay" ? 0 : 1]);
        c.fillStyle = small ? PAL[h][h === "black" ? 1 : 2] : gr;
        if (mode === "clay" && sh.k === "rect") { c.beginPath(); c.roundRect(sh.x, sh.y, sh.w, sh.h, Math.min(sh.w, sh.h) * 0.22); } else path(c, pts);
        c.fill(); if (!small && mode === "glossy") { c.strokeStyle = `rgba(255,255,255,0.35)`; c.lineWidth = 3; c.stroke(); }
      }
      c.restore();
    },
    sphere(x, y, r, h, o = {}) {
      const a = o.a ?? 1, P4 = PAL[h]; c.save(); c.globalAlpha = a;
      if (mode === "comic") { c.fillStyle = P4[1]; c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill(); c.save(); c.beginPath(); c.arc(x, y, r, 0, 6.283); c.clip(); c.fillStyle = P4[0]; c.beginPath(); c.arc(x + r * 0.35, y + r * 0.35, r * 0.95, 0, 6.283); c.fill(); c.fillStyle = "rgba(0,0,0,0.25)"; for (let yy = y - r; yy < y + r; yy += Math.max(6, r / 7)) for (let xx = x - r; xx < x + r; xx += Math.max(6, r / 7)) if ((xx - x) + (yy - y) > r * 0.6) { c.beginPath(); c.arc(xx, yy, Math.max(1.5, r / 30), 0, 6.283); c.fill(); } c.restore(); c.fillStyle = "#ffffff"; c.beginPath(); c.ellipse(x - r * 0.38, y - r * 0.42, r * 0.2, r * 0.12, -0.6, 0, 6.283); c.fill(); outline(ellPts(x, y, r, r, 40), Math.max(3, Math.min(9, r * 0.12))); }
      if (mode === "cutpaper") { const base = jitter(ellPts(x, y, r, r, 30)); shadowUnder(base, a); c.fillStyle = P4[1]; path(c, base); c.fill(); c.fillStyle = P4[2]; path(c, jitter(ellPts(x - r * 0.12, y - r * 0.14, r * 0.78, r * 0.78, 26))); c.fill(); c.fillStyle = P4[3]; path(c, jitter(ellPts(x - r * 0.34, y - r * 0.38, r * 0.2, r * 0.2, 12))); c.fill(); }
      if (mode === "glossy") { sGlow(c, x, y, r * 1.5, rgb(P4[2]), 0.35); const gr = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r); gr.addColorStop(0, P4[3]); gr.addColorStop(0.45, P4[2]); gr.addColorStop(0.85, P4[1]); gr.addColorStop(1, P4[0]); c.fillStyle = gr; c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill();
        if (r > 60) { c.save(); c.beginPath(); c.arc(x, y, r, 0, 6.283); c.clip(); [-0.45, 0.05, 0.5].forEach((k, i) => { c.fillStyle = i % 2 ? `rgba(255,255,255,0.18)` : `rgba(${rgb(P4[0])},0.35)`; c.beginPath(); c.moveTo(x - r, y + k * r); for (let xx = -r; xx <= r; xx += r / 8) c.lineTo(x + xx, y + k * r + Math.sin(xx / r * 5 + i) * r * 0.08); for (let xx = r; xx >= -r; xx -= r / 8) c.lineTo(x + xx, y + k * r + r * 0.14 + Math.sin(xx / r * 5 + i + 1) * r * 0.08); c.closePath(); c.fill(); }); c.restore(); }
        c.fillStyle = "rgba(255,255,255,0.55)"; c.beginPath(); c.ellipse(x - r * 0.35, y - r * 0.45, r * 0.3, r * 0.16, -0.5, 0, 6.283); c.fill(); c.strokeStyle = `rgba(${rgb(P4[3])},0.7)`; c.lineWidth = Math.max(2, r * 0.05); c.beginPath(); c.arc(x, y, r * 0.96, 0.1, 1.9); c.stroke(); }
      if (mode === "clay") { shadowUnder(ellPts(x, y, r, r, 12), a); const gr = c.createRadialGradient(x - r * 0.35, y - r * 0.42, r * 0.08, x, y + r * 0.1, r * 1.05); gr.addColorStop(0, P4[3]); gr.addColorStop(0.35, P4[2]); gr.addColorStop(0.8, P4[1]); gr.addColorStop(1, P4[0]); c.fillStyle = gr; c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill(); const ao = c.createRadialGradient(x, y - r * 0.2, r * 0.6, x, y, r); ao.addColorStop(0, "rgba(20,10,40,0)"); ao.addColorStop(1, "rgba(20,10,40,0.3)"); c.fillStyle = ao; c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill(); if (r > 8) { const sp = c.createRadialGradient(x - r * 0.3, y - r * 0.38, 0, x - r * 0.3, y - r * 0.38, r * 0.3); sp.addColorStop(0, "rgba(255,255,255,0.7)"); sp.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = sp; c.beginPath(); c.arc(x - r * 0.3, y - r * 0.38, r * 0.3, 0, 6.283); c.fill(); } }
      c.restore();
    },
    stroke(pts, h, w, o = {}) {
      const a = o.a ?? 1; c.save(); c.globalAlpha = a; c.lineCap = "round"; c.lineJoin = "round"; if (o.dash) c.setLineDash([w * 2.5, w * 2.2]);
      const line = (col: string, lw: number, dy = 0) => { c.strokeStyle = col; c.lineWidth = lw; path(c, pts.map(([x, y]) => [x, y + dy] as P), false); c.stroke(); };
      if (mode === "comic") { line("#111018", w + 9); line(PAL[h][2], w); }
      if (mode === "cutpaper") { c.save(); c.globalAlpha = a * 0.3; c.translate(6, 9); line("#28180a", w * 1.2); c.restore(); line(PAL[h][2], w * 1.2); }
      if (mode === "glossy") { line(`rgba(${rgb(PAL[h][2])},0.3)`, w * 3); line(PAL[h][2], w); line(`rgba(255,255,255,0.6)`, Math.max(1, w * 0.3)); }
      if (mode === "clay") { line(PAL[h][0], w * 1.25, w * 0.1); line(PAL[h][1], w); line(PAL[h][3], Math.max(1, w * 0.3), -w * 0.18); }
      c.restore();
    },
    glow(x, y, r, h, a) { if (mode === "comic") { comicBurst(x, y, r * 0.8, h === "orange" || h === "sun" || h === "yellow" ? "#ffe14a" : "#fff4a0", 0.55 * a); return; } if (mode === "cutpaper") { [1, 0.7, 0.45].forEach((k) => { c.save(); c.globalAlpha = 0.18 * a; c.fillStyle = PAL[h][3]; path(c, jitter(ellPts(x, y, r * k, r * k, 24))); c.fill(); c.restore(); }); return; } sGlow(c, x, y, r, rgb(PAL[h][2]), (mode === "glossy" ? 0.95 : 0.7) * a); },
    label(s, x, y, size, h, align = "left") { text(g, s, x, y, { cap: size, color: mode === "comic" && h === "lcd" ? "#6fff9a" : PAL[h][mode === "clay" ? 3 : 2], align, w: size * (mode === "clay" ? 0.15 : 0.11) }); },
    caption(s) {
      if (mode === "comic") { const tw = 70 + s.length * 30; c.fillStyle = "#111018"; c.fillRect(54, 44, tw + 12, 102); c.fillStyle = "#ffe14a"; c.fillRect(60, 50, tw, 90); text(g, s, 90, 76, { cap: 40, color: "#111018", w: 4 }); c.lineWidth = 16; c.strokeStyle = "#111018"; c.strokeRect(8, 8, W - 16, H - 16); c.lineWidth = 8; c.strokeStyle = "#ffffff"; c.strokeRect(20, 20, W - 40, H - 40); return; }
      if (mode === "cutpaper") { const pts = jitter([[330, 930], [W - 330, 922], [W - 320, 1040], [340, 1048]]); shadowUnder(pts); c.fillStyle = "#f4ecdc"; path(c, pts); c.fill(); text(g, s, W / 2, 958, { cap: 46, color: "#e0561c", align: "center", w: 5 }); g.paper("paper", 0.2); g.paper("coldpress", 0.12); return; }
      const tw = 120 + s.length * 34, x0 = W / 2 - tw / 2, gr = c.createLinearGradient(x0, 0, x0 + tw, 0); gr.addColorStop(0, mode === "glossy" ? "#e03a8a" : "#9a7ad8"); gr.addColorStop(1, mode === "glossy" ? "#7a44e0" : "#c8a8f0");
      if (mode === "clay") shadowUnder([[x0, 940], [x0 + tw, 940], [x0 + tw, 1030], [x0, 1030]]);
      c.fillStyle = gr; c.beginPath(); c.roundRect(x0, 935, tw, 95, 48); c.fill(); if (mode === "clay") { const hl = c.createLinearGradient(0, 935, 0, 1030); hl.addColorStop(0, "rgba(255,255,255,0.35)"); hl.addColorStop(0.5, "rgba(255,255,255,0)"); c.fillStyle = hl; c.beginPath(); c.roundRect(x0, 935, tw, 95, 48); c.fill(); }
      text(g, s, W / 2, 958, { cap: 44, color: "#ffffff", align: "center", w: mode === "clay" ? 6 : 5 }); vignette(c, mode === "glossy" ? 0.4 : 0.2);
    },
    wrap(d) { d(); },
  };
};

// ================================================================ the film: 14 styles x 10 moments, one still each
const STYLES: [string, Mk][] = [
  ["space", mkSpace], ["pixel", mkPixel], ["blueprint", mkBlueprint], ["chalk", mkChalk], ["storybook", mkMedia("storybook")], ["crayon", mkMedia("crayon")], ["inkwash", mkMedia("inkwash")],
  ["riso", mkRiso], ["ballpoint", mkMono("ballpoint")], ["engraving", mkMono("engraving")], ["comic", mkVec("comic")], ["cutpaper", mkVec("cutpaper")], ["glossy", mkVec("glossy")], ["clay", mkVec("clay")],
];
export const STYLE_IDS = STYLES.map(([id]) => id);
export const FRAME_IDS = FRAMES.map((f) => f.id);
const renderOne = (mk: Mk, F: Frame, ctx: Ctx, env: Env, frame: number) => {
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; ctx.imageSmoothingEnabled = true;
  const S = mk(ctx, env, frame);
  S.bg(F.kind, F.o); S.wrap(() => F.draw(S));
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  S.caption(F.cap);
};
export const styleFrames: Film = {
  meta: { title: "styleFrames", W, H, fps: 30, bpm: 120, durationFrames: STYLES.length * FRAMES.length * 15 },
  assets: { images: {} },
  shots: STYLES.flatMap(([id, mk], si) => FRAMES.map((F, fi) => { const start = (si * FRAMES.length + fi) * 15; return { id: `${id}-${F.id}`, start, end: start + 15, draw: (ctx: Ctx, _l: number, env: Env) => renderOne(mk, F, ctx, env, start) }; })),
};
