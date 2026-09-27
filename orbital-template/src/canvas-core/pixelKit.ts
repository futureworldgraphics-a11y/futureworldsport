import { rng, type Ctx } from "./core";

// PIXEL KIT · crisp, grid-snapped pixel-art primitives for the low-res film buffer (384x216,
// blown up 5x with no smoothing). Everything here fills whole pixels, so shapes stay razor
// sharp at any position; circles are built from per-row spans instead of antialiased arcs.

export const PW = 384, PH = 216;
export const INK = "#0b0918";
export type Pal = string[];

// ---------------------------------------------------------------- raw primitives
export const rect = (c: Ctx, x: number, y: number, w: number, h: number, col: string) => {
  const x0 = Math.round(x), y0 = Math.round(y), x1 = Math.round(x + w), y1 = Math.round(y + h);
  if (x1 <= x0 || y1 <= y0) return;
  c.fillStyle = col; c.fillRect(x0, y0, x1 - x0, y1 - y0);
};
export const px = (c: Ctx, x: number, y: number, col: string) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), 1, 1); };
export const line = (c: Ctx, x0: number, y0: number, x1: number, y1: number, col: string, w = 1) => {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)))), o = Math.floor(w / 2);
  c.fillStyle = col;
  for (let i = 0; i <= n; i++) c.fillRect(Math.round(x0 + ((x1 - x0) * i) / n) - o, Math.round(y0 + ((y1 - y0) * i) / n) - o, w, w);
};
export const dashed = (c: Ctx, x0: number, y0: number, x1: number, y1: number, col: string, on = 3, off = 3, offset = 0) => {
  const L = Math.hypot(x1 - x0, y1 - y0); if (L < 1) return; c.fillStyle = col;
  for (let s = 0; s <= L; s++) { const k = (((s + offset) % (on + off)) + on + off) % (on + off); if (k < on) c.fillRect(Math.round(x0 + ((x1 - x0) * s) / L), Math.round(y0 + ((y1 - y0) * s) / L), 1, 1); }
};
// row spans of an ellipse centred on a pixel corner: the basis of every round shape
export const spans = (cx: number, cy: number, rx: number, ry: number, f: (y: number, a: number, b: number) => void) => {
  if (rx <= 0 || ry <= 0) return;
  cx = Math.round(cx); cy = Math.round(cy);
  const R = Math.ceil(ry);
  for (let j = -R; j < R; j++) {
    const dy = (j + 0.5) / ry, q = 1 - dy * dy; if (q <= 0) continue;
    const h = rx * Math.sqrt(q), a = Math.round(cx - h), b = Math.round(cx + h);
    if (b > a) f(cy + j, a, b);
  }
};
export const ellipse = (c: Ctx, cx: number, cy: number, rx: number, ry: number, col: string) => { c.fillStyle = col; spans(cx, cy, rx, ry, (y, a, b) => c.fillRect(a, y, b - a, 1)); };
export const disc = (c: Ctx, cx: number, cy: number, r: number, col: string) => { if (r < 0.5) { if (r > 0.2) px(c, cx, cy, col); return; } ellipse(c, cx, cy, r, r, col); };
export const ring = (c: Ctx, cx: number, cy: number, r: number, col: string, w = 1) => {
  if (r <= 0) return; cx = Math.round(cx); cy = Math.round(cy); c.fillStyle = col;
  const ri = r - w, R = Math.ceil(r);
  for (let j = -R; j < R; j++) {
    const dy = j + 0.5, q = r * r - dy * dy; if (q <= 0) continue;
    const h = Math.sqrt(q), a = Math.round(cx - h), b = Math.round(cx + h), qi = ri * ri - dy * dy;
    if (ri <= 0 || qi <= 0) { c.fillRect(a, cy + j, b - a, 1); continue; }
    const hi = Math.sqrt(qi), ai = Math.round(cx - hi), bi = Math.round(cx + hi);
    if (ai > a) c.fillRect(a, cy + j, ai - a, 1); if (b > bi) c.fillRect(bi, cy + j, b - bi, 1);
  }
};
// a pixel-crisp clip region (circle), for irises and magnifier lenses
export const clipCircle = (c: Ctx, cx: number, cy: number, r: number) => { c.beginPath(); spans(cx, cy, r, r, (y, a, b) => c.rect(a, y, b - a, 1)); c.clip(); };

// banded sphere: dark outline, base colour, three hard bands stepping toward an upper-left light
export const sphere = (c: Ctx, cx: number, cy: number, r: number, pal: Pal, o: { outline?: boolean; spec?: boolean } = {}) => {
  r = Math.max(0, r); if (r < 0.6) { if (r > 0.1) px(c, cx, cy, pal[2]); return; }
  cx = Math.round(cx); cy = Math.round(cy);
  if (o.outline !== false) disc(c, cx, cy, r + 1, INK);
  disc(c, cx, cy, r, pal[0]);
  disc(c, cx - r * 0.12, cy - r * 0.14, r * 0.8, pal[1]);
  disc(c, cx - r * 0.26, cy - r * 0.3, r * 0.52, pal[2]);
  if (r >= 3) disc(c, cx - r * 0.36, cy - r * 0.42, r * 0.24, pal[3]);
  if (o.spec !== false && r >= 5) px(c, cx - r * 0.5, cy - r * 0.56, "#ffffff");
};
// stepped additive glow: the pixel-art bloom (four hard rings, never a smooth gradient)
export const glow = (c: Ctx, x: number, y: number, r: number, rgb: string, a: number) => {
  if (a <= 0 || r <= 0.5) return;
  const prev = c.globalCompositeOperation; c.globalCompositeOperation = "lighter";
  for (const [k, al] of [[1, 0.16], [0.7, 0.2], [0.45, 0.26], [0.24, 0.34]]) { c.fillStyle = `rgba(${rgb},${Math.min(1, a * al).toFixed(3)})`; spans(x, y, r * k, r * k, (yy, aa, bb) => c.fillRect(aa, yy, bb - aa, 1)); }
  c.globalCompositeOperation = prev;
};

// soft haze for big ambient light (nebulae, skies): a real gradient, which the 5x blow-up turns
// into gentle one-pixel steps instead of hard rings
export const haze = (c: Ctx, x: number, y: number, r: number, rgb: string, a: number) => {
  if (a <= 0 || r <= 1) return;
  const prev = c.globalCompositeOperation; c.globalCompositeOperation = "lighter";
  const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${rgb},${a.toFixed(3)})`); g.addColorStop(0.5, `rgba(${rgb},${(a * 0.35).toFixed(3)})`); g.addColorStop(1, `rgba(${rgb},0)`);
  c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.globalCompositeOperation = prev;
};

// ---------------------------------------------------------------- stars
export type Star = { x: number; y: number; b: number; ph: number; col: string; sp: number };
export const makeStars = (seed: number, n: number, w = PW, h = PH): Star[] => {
  const r = rng(seed), out: Star[] = [];
  for (let i = 0; i < n; i++) out.push({ x: r() * w, y: r() * h, b: r(), ph: r() * 6.283, col: r() > 0.86 ? "#ffd9b0" : r() > 0.75 ? "#bfd4ff" : "#e8e6ff", sp: 0.6 + r() * 2.2 });
  return out;
};
// ox/oy scroll the field (it wraps); streak > 0 draws motion streaks trailing to the left
export const drawStars = (c: Ctx, S: Star[], t: number, ox = 0, oy = 0, alpha = 1, streak = 0, w = PW, h = PH) => {
  for (const s of S) {
    const x = (((s.x - ox) % w) + w) % w, y = (((s.y - oy) % h) + h) % h, tw = 0.55 + 0.45 * Math.sin(t * s.sp + s.ph);
    c.globalAlpha = alpha * (0.3 + 0.7 * s.b) * tw; c.fillStyle = s.col;
    if (streak > 1) { const L = Math.round(streak * (0.5 + s.b)); c.fillRect(Math.round(x), Math.round(y), L, 1); }
    else { c.fillRect(Math.round(x), Math.round(y), 1, 1); if (s.b > 0.93 && tw > 0.7) { c.fillRect(Math.round(x) - 1, Math.round(y), 3, 1); c.fillRect(Math.round(x), Math.round(y) - 1, 1, 3); } }
  }
  c.globalAlpha = 1;
};

// ---------------------------------------------------------------- 3x5 readout font (digits + a few units, for in-world displays)
const FONT: Record<string, string[]> = {
  "0": ["111", "101", "101", "101", "111"], "1": ["010", "110", "010", "010", "111"], "2": ["111", "001", "111", "100", "111"],
  "3": ["111", "001", "111", "001", "111"], "4": ["101", "101", "111", "001", "001"], "5": ["111", "100", "111", "001", "111"],
  "6": ["111", "100", "111", "101", "111"], "7": ["111", "001", "001", "010", "010"], "8": ["111", "101", "111", "101", "111"],
  "9": ["111", "101", "111", "001", "111"], ",": ["0", "0", "0", "1", "1"], ".": ["0", "0", "0", "0", "1"], "-": ["000", "000", "111", "000", "000"],
  "/": ["001", "001", "010", "100", "100"], M: ["10001", "11011", "10101", "10001", "10001"], S: ["111", "100", "111", "001", "111"], " ": ["00", "00", "00", "00", "00"],
};
export const ptextW = (s: string, sc = 1) => [...s].reduce((a, ch) => a + ((FONT[ch]?.[0].length ?? 3) + 1) * sc, 0) - sc;
export const ptext = (c: Ctx, s: string, x: number, y: number, sc: number, col: string, align: "left" | "center" | "right" = "left", shadow?: string) => {
  let cx = Math.round(align === "center" ? x - ptextW(s, sc) / 2 : align === "right" ? x - ptextW(s, sc) : x); y = Math.round(y);
  for (const ch of s) {
    const g = FONT[ch]; if (!g) { cx += 4 * sc; continue; }
    g.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === "1") { if (shadow) rect(c, cx + i * sc + sc, y + j * sc + sc, sc, sc, shadow); rect(c, cx + i * sc, y + j * sc, sc, sc, col); } });
    cx += (g[0].length + 1) * sc;
  }
};

// ---------------------------------------------------------------- the photon: a banded ball with a face and its own wave
export type Face = "open" | "blink" | "calm" | "happy" | "wide" | "sleepy" | "angry" | "dizzy" | "determined";
export type Mouth = "none" | "smile" | "o" | "flat" | "yawn";
export type PhotonOpts = { face?: Face; mouth?: Mouth; look?: [number, number]; wave?: number; waveLen?: number; phase?: number; alpha?: number; streak?: number; blush?: boolean };
export const photon = (c: Ctx, x: number, y: number, r: number, pal: Pal, o: PhotonOpts = {}) => {
  const { face = "open", mouth = "none", look = [1, 0], wave = 0, waveLen = 10, phase = 0, streak = 0 } = o, A = o.alpha ?? 1;
  if (A <= 0 || r <= 0.3) return;
  x = Math.round(x); y = Math.round(y); const prevA = c.globalAlpha; c.globalAlpha = prevA * A;
  // motion streak: the straight blur of something that only ever moves at one speed
  if (streak > 0) for (let i = 0; i < streak; i++) { const k = 1 - i / streak, hh = Math.max(1, Math.round(r * 1.2 * k)); c.globalAlpha = prevA * A * 0.5 * k; rect(c, x - r - i, y - Math.floor(hh / 2), 1, hh, pal[2]); }
  // its wave: wavelength tracks energy (radio lazy and long, gamma tight), amplitude fades behind it
  if (wave > 0) {
    const amp = Math.max(1, r * 0.55);
    for (let i = 1; i <= wave; i++) { const k = 1 - i / wave, yy = y + Math.sin(((i + phase) / waveLen) * Math.PI * 2) * amp * (0.3 + 0.7 * k); c.globalAlpha = prevA * A * (0.2 + 0.8 * k); px(c, x - r - i, yy, i % 4 === 0 ? pal[3] : pal[2]); if (r >= 6) px(c, x - r - i, yy + 1, pal[1]); }
  }
  c.globalAlpha = prevA * A;
  sphere(c, x, y, r, pal);
  if (r < 3) { c.globalAlpha = prevA; return; }
  const s = Math.max(2, Math.round(r * 0.42)), ey = y - Math.round(r * 0.12), W = "#ffffff", D = INK;
  for (const side of [-1, 1]) {
    const ex = x + side * s;
    if (r < 5) { if (face === "blink" || face === "calm" || face === "sleepy") px(c, ex - 1, ey + 1, D); else rect(c, ex - 1, ey, 1, 2, D); continue; }
    switch (face) {
      case "blink": rect(c, ex - 1, ey + 1, 2, 1, D); break;
      case "calm": px(c, ex - 2, ey, D); rect(c, ex - 1, ey + 1, 2, 1, D); px(c, ex + 1, ey, D); break;
      case "happy": px(c, ex - 2, ey + 1, D); px(c, ex - 1, ey, D); px(c, ex, ey, D); px(c, ex + 1, ey + 1, D); break;
      case "wide": rect(c, ex - 2, ey - 1, 3, 3, W); px(c, ex - 1, ey, D); break;
      case "sleepy": rect(c, ex - 1, ey, 2, 1, D); rect(c, ex - 1, ey + 1, 2, 1, W); px(c, ex - 1 + (side < 0 ? 1 : 0), ey + 1, D); break;
      case "dizzy": px(c, ex - 2, ey - 1, D); px(c, ex, ey - 1, D); px(c, ex - 1, ey, D); px(c, ex - 2, ey + 1, D); px(c, ex, ey + 1, D); break;
      default: {
        rect(c, ex - 1, ey - 1, 2, 3, W);
        const pxo = look[0] > 0 ? 0 : look[0] < 0 ? -1 : side < 0 ? 0 : -1, pyo = look[1] < 0 ? -1 : look[1] > 0 ? 1 : 0;
        rect(c, ex + pxo, ey - 1 + (pyo < 0 ? 0 : 1) + (pyo > 0 ? 0 : 0), 1, 2, D);
        if (face === "angry") { px(c, ex - 1 + (side < 0 ? 0 : 1), ey - 2, D); px(c, ex - 1 + (side < 0 ? 1 : 0), ey - 1, D); }
        if (face === "determined") rect(c, ex - 1, ey - 2, 2, 1, D);
      }
    }
  }
  const my = y + Math.round(r * 0.42);
  switch (mouth) {
    case "smile": if (r >= 6) { px(c, x - 2, my, D); rect(c, x - 1, my + 1, 2, 1, D); px(c, x + 1, my, D); } else rect(c, x - 1, my, 2, 1, D); break;
    case "o": rect(c, x - 1, my, 2, 2, D); break;
    case "yawn": rect(c, x - 1, my - 1, 3, 3, D); px(c, x, my + 1, "#c8404a"); break;
    case "flat": rect(c, x - 1, my, 3, 1, D); break;
  }
  if (o.blush && r >= 6) { px(c, x - s - 2, ey + 2, "#ff8aa0"); px(c, x + s + 1, ey + 2, "#ff8aa0"); }
  c.globalAlpha = prevA;
};

// ---------------------------------------------------------------- people: tiny, readable, posable
export type PersonOpts = {
  skin?: string; hair?: string; shirt?: string; pants?: string; hat?: "none" | "cap" | "hard" | "police"; glasses?: boolean;
  face?: 1 | -1; armL?: number; armR?: number; legs?: number; lean?: number; mouth?: "none" | "open"; eyes?: "open" | "closed"; coat?: string;
};
export const person = (c: Ctx, x: number, y: number, sc: number, o: PersonOpts = {}) => {
  const { skin = "#f0c09a", hair = "#3a2418", shirt = "#3a6fe0", pants = "#2a2a44", hat = "none", face = 1, armL = 0.15, armR = -0.15, legs = 1, lean = 0 } = o;
  c.save(); c.translate(Math.round(x), Math.round(y)); c.scale(sc, sc);
  const L = Math.round(lean);
  // legs + shoes
  line(c, -1, -6, -1 - legs, -1, pants, 2); line(c, 1, -6, 1 + legs, -1, pants, 2);
  rect(c, -2 - legs, 0, 2, 1, INK); rect(c, 1 + legs, 0, 2, 1, INK);
  // torso (optional coat), arms
  rect(c, -2 + L, -12, 5, 7, o.coat ?? shirt);
  if (o.coat) rect(c, 0 + L, -12, 1, 7, shirt);
  const arm = (sx: number, a: number) => { const ex = sx + Math.sin(a) * 5 * face, ey = -11 + Math.cos(a) * 5; line(c, sx, -11, ex, ey, o.coat ?? shirt, 1); px(c, ex, ey, skin); };
  arm(-3 + L, face > 0 ? armL : armR); arm(3 + L, face > 0 ? armR : armL);
  // head
  rect(c, -2 + L, -17, 4, 4, skin); rect(c, -2 + L, -18, 4, 1, hair); px(c, (face > 0 ? -2 : 1) + L, -17, hair);
  if (o.eyes === "closed") rect(c, (face > 0 ? 1 : -2) + L, -15, 1, 1, "#a07050"); else px(c, (face > 0 ? 1 : -2) + L, -16, INK);
  if (o.mouth === "open") px(c, (face > 0 ? 1 : -2) + L, -14, "#7a2a2a");
  if (o.glasses) { rect(c, (face > 0 ? 0 : -2) + L, -16, 2, 1, "#dff2ff"); px(c, (face > 0 ? 1 : -2) + L, -16, INK); }
  if (hat === "cap" || hat === "police") { const hc = hat === "police" ? "#1f2a5a" : "#c8342a"; rect(c, -2 + L, -19, 4, 2, hc); rect(c, (face > 0 ? 1 : -3) + L, -18, 2, 1, hc); if (hat === "police") px(c, L, -19, "#ffd166"); }
  if (hat === "hard") { rect(c, -3 + L, -19, 6, 2, "#ffc83a"); rect(c, -2 + L, -20, 4, 1, "#ffc83a"); px(c, -1 + L, -20, "#fff0b0"); }
  c.restore();
};
