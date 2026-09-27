import { rng, type Ctx } from "./core";

// PIXEL KIT · crisp, grid-snapped pixel-art primitives for the low-res film buffer (384x216,
// blown up 5x with no smoothing). Everything here fills whole pixels, so shapes stay razor
// sharp at any position; circles are built from per-row spans instead of antialiased arcs.

export const PW = 384, PH = 216;
export const INK = "#0b0918";
export type Pal = string[];

// GRID: K fine pixels per world pixel. K = 1 is the classic look (every film so far, unchanged);
// K = 2 keeps world coordinates but rasterises round shapes, lines, shading, stars and faces on a
// grid twice as fine (the HD pixel look). The caller sizes its buffer PW*K x PH*K and scales by K.
let K = 1;
export const setGrid = (k: number) => { K = k; };
export const grid = () => K;
const sn = (v: number) => Math.round(v * K) / K;
export const fpx = (c: Ctx, x: number, y: number, col: string) => { c.fillStyle = col; c.fillRect(sn(x), sn(y), 1 / K, 1 / K); };
const hx = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixc = (a: string, b: string, k: number) => { if (a[0] !== "#" || b[0] !== "#") return a; const A = hx(a), B = hx(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, "0")).join(""); };

// ---------------------------------------------------------------- raw primitives
export const rect = (c: Ctx, x: number, y: number, w: number, h: number, col: string) => {
  const x0 = sn(x), y0 = sn(y), x1 = sn(x + w), y1 = sn(y + h);
  if (x1 <= x0 || y1 <= y0) return;
  c.fillStyle = col; c.fillRect(x0, y0, x1 - x0, y1 - y0);
};
export const px = (c: Ctx, x: number, y: number, col: string) => { c.fillStyle = col; c.fillRect(sn(x), sn(y), 1, 1); };
export const line = (c: Ctx, x0: number, y0: number, x1: number, y1: number, col: string, w = 1) => {
  if (K > 1) { // fine steps along the major axis, one non-overlapping strip per step (alpha-safe)
    const dx = x1 - x0, dy = y1 - y0, n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) * K)), f = 1 / K, o = Math.floor((w * K) / 2) / K; c.fillStyle = col;
    const xm = Math.abs(dx) >= Math.abs(dy);
    for (let i = 0; i <= n; i++) { const X = sn(x0 + (dx * i) / n), Y = sn(y0 + (dy * i) / n); if (xm) c.fillRect(X, Y - o, f, w); else c.fillRect(X - o, Y, w, f); }
    return;
  }
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)))), o = Math.floor(w / 2);
  c.fillStyle = col;
  for (let i = 0; i <= n; i++) c.fillRect(Math.round(x0 + ((x1 - x0) * i) / n) - o, Math.round(y0 + ((y1 - y0) * i) / n) - o, w, w);
};
export const dashed = (c: Ctx, x0: number, y0: number, x1: number, y1: number, col: string, on = 3, off = 3, offset = 0) => {
  const L = Math.hypot(x1 - x0, y1 - y0); if (L < 1) return; c.fillStyle = col;
  if (K > 1) { for (let s = 0; s <= L; s += 1 / K) { const k = (((s + offset) % (on + off)) + on + off) % (on + off); if (k < on) c.fillRect(sn(x0 + ((x1 - x0) * s) / L), sn(y0 + ((y1 - y0) * s) / L), 1, 1 / K); } return; }
  for (let s = 0; s <= L; s++) { const k = (((s + offset) % (on + off)) + on + off) % (on + off); if (k < on) c.fillRect(Math.round(x0 + ((x1 - x0) * s) / L), Math.round(y0 + ((y1 - y0) * s) / L), 1, 1); }
};
// row spans of an ellipse centred on a pixel corner: the basis of every round shape
export const spans = (cx: number, cy: number, rx: number, ry: number, f: (y: number, a: number, b: number, h: number) => void) => {
  if (rx <= 0 || ry <= 0) return;
  if (K > 1) {
    cx = sn(cx); cy = sn(cy); const R = Math.ceil(ry * K), f1 = 1 / K;
    for (let j = -R; j < R; j++) { const dy = (j + 0.5) / (ry * K), q = 1 - dy * dy; if (q <= 0) continue; const h = rx * Math.sqrt(q), a = sn(cx - h), b = sn(cx + h); if (b > a) f(cy + j * f1, a, b, f1); }
    return;
  }
  cx = Math.round(cx); cy = Math.round(cy);
  const R = Math.ceil(ry);
  for (let j = -R; j < R; j++) {
    const dy = (j + 0.5) / ry, q = 1 - dy * dy; if (q <= 0) continue;
    const h = rx * Math.sqrt(q), a = Math.round(cx - h), b = Math.round(cx + h);
    if (b > a) f(cy + j, a, b, 1);
  }
};
export const ellipse = (c: Ctx, cx: number, cy: number, rx: number, ry: number, col: string) => { c.fillStyle = col; spans(cx, cy, rx, ry, (y, a, b, h) => c.fillRect(a, y, b - a, h)); };
export const disc = (c: Ctx, cx: number, cy: number, r: number, col: string) => { if (r < 0.5 / K) { if (r > 0.2 / K) (K > 1 ? fpx : px)(c, cx, cy, col); return; } ellipse(c, cx, cy, r, r, col); };
export const ring = (c: Ctx, cx: number, cy: number, r: number, col: string, w = 1) => {
  if (r <= 0) return;
  if (K > 1) {
    cx = sn(cx); cy = sn(cy); c.fillStyle = col; const ri = r - w, R = Math.ceil(r * K), f1 = 1 / K;
    for (let j = -R; j < R; j++) {
      const dy = (j + 0.5) / K, q = r * r - dy * dy; if (q <= 0) continue;
      const h = Math.sqrt(q), a = sn(cx - h), b = sn(cx + h), qi = ri * ri - dy * dy, y = cy + j * f1;
      if (ri <= 0 || qi <= 0) { c.fillRect(a, y, b - a, f1); continue; }
      const hi = Math.sqrt(qi), ai = sn(cx - hi), bi = sn(cx + hi);
      if (ai > a) c.fillRect(a, y, ai - a, f1); if (b > bi) c.fillRect(bi, y, b - bi, f1);
    }
    return;
  }
  cx = Math.round(cx); cy = Math.round(cy); c.fillStyle = col;
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
export const clipCircle = (c: Ctx, cx: number, cy: number, r: number) => { c.beginPath(); spans(cx, cy, r, r, (y, a, b, h) => c.rect(a, y, b - a, h)); c.clip(); };

// banded sphere: dark outline, base colour, three hard bands stepping toward an upper-left light
export const sphere = (c: Ctx, cx: number, cy: number, r: number, pal: Pal, o: { outline?: boolean; spec?: boolean } = {}) => {
  r = Math.max(0, r); if (r < 0.6) { if (r > 0.1) px(c, cx, cy, pal[2]); return; }
  if (K > 1) { sphereHD(c, cx, cy, r, pal, o); return; }
  cx = Math.round(cx); cy = Math.round(cy);
  if (o.outline !== false) disc(c, cx, cy, r + 1, INK);
  disc(c, cx, cy, r, pal[0]);
  disc(c, cx - r * 0.12, cy - r * 0.14, r * 0.8, pal[1]);
  disc(c, cx - r * 0.26, cy - r * 0.3, r * 0.52, pal[2]);
  if (r >= 3) disc(c, cx - r * 0.36, cy - r * 0.42, r * 0.24, pal[3]);
  if (o.spec !== false && r >= 5) px(c, cx - r * 0.5, cy - r * 0.56, "#ffffff");
};
// HD sphere: a seven-tone ramp between the palette's four inks, a checker dither where tones meet,
// a thin cool rim of bounced light on the shadow side and a two-part specular glint
const DISCS: [number, number, number][] = [[0, 0, 1], [0.06, 0.07, 0.9], [0.12, 0.14, 0.8], [0.19, 0.22, 0.66], [0.26, 0.3, 0.52], [0.31, 0.36, 0.38], [0.36, 0.42, 0.24]];
const sphereHD = (c: Ctx, cx: number, cy: number, r: number, pal: Pal, o: { outline?: boolean; spec?: boolean }) => {
  cx = sn(cx); cy = sn(cy); const f = 1 / K;
  if (o.outline !== false) disc(c, cx, cy, r + (r >= 8 ? 1 : f), INK);
  const tones = [pal[0], mixc(pal[0], pal[1], 0.5), pal[1], mixc(pal[1], pal[2], 0.5), pal[2], mixc(pal[2], pal[3], 0.5), pal[3]];
  const small = r * K < 7, R2 = r * r;
  DISCS.forEach(([ox, oy, rf], k) => {
    if (small && k % 2 === 1) return; if (small && k === 6) return;
    const X = cx - r * ox, Y = cy - r * oy, rr = r * rf; disc(c, X, Y, rr, tones[k]);
    if (k === 0 || small) return;
    // dither: every other fine pixel in a ring just outside this tone's edge
    c.fillStyle = tones[k]; const wd = 1.6 * f, Ro = rr + wd, j0 = Math.floor((Y - Ro) * K), j1 = Math.ceil((Y + Ro) * K);
    for (let j = j0; j < j1; j++) {
      const yy = (j + 0.5) / K - Y, qo = Ro * Ro - yy * yy; if (qo <= 0) continue;
      const ho = Math.sqrt(qo), qi = rr * rr - yy * yy, hi = qi > 0 ? Math.sqrt(qi) : 0;
      const seg = (u0: number, u1: number) => { for (let i = Math.floor((X + u0) * K); i < Math.ceil((X + u1) * K); i++) { if (((i + j) & 1) !== 0) continue; const x = i / K, y = j / K, ddx = x + f / 2 - cx, ddy = y + f / 2 - cy; if (ddx * ddx + ddy * ddy < R2 - r * f) c.fillRect(x, y, f, f); } };
      if (hi > 0) { seg(-ho, -hi); seg(hi, ho); } else seg(-ho, ho);
    }
  });
  // rim light: inside the sphere, outside a copy shifted toward the light
  if (r * K >= 8) {
    const prev = c.globalAlpha; c.globalAlpha = prev * 0.5; c.fillStyle = tones[3]; const sx = cx - r * 0.1, sy = cy - r * 0.1;
    spans(cx, cy, r - f, r - f, (y, a, b, h) => { const yy = y + h / 2 - sy, q = r * r - yy * yy; const bb = q > 0 ? sn(sx + Math.sqrt(q)) : a; const s0 = Math.max(a, bb); if (b > s0) c.fillRect(s0, y, b - s0, h); });
    c.globalAlpha = prev;
  }
  if (o.spec !== false && r >= 3) { const sx = cx - r * 0.46, sy = cy - r * 0.52, s = Math.max(f, Math.min(1.5, sn(r * 0.08))); c.fillStyle = "#ffffff"; c.fillRect(sn(sx), sn(sy), s, s); if (r >= 6) c.fillRect(sn(sx + s * 1.6), sn(sy + s * 1.2), f, f); }
};

// stepped additive glow: the pixel-art bloom (four hard rings, never a smooth gradient)
export const glow = (c: Ctx, x: number, y: number, r: number, rgb: string, a: number) => {
  if (a <= 0 || r <= 0.5) return;
  const prev = c.globalCompositeOperation; c.globalCompositeOperation = "lighter";
  const steps = K > 1 ? [[1, 0.075], [0.86, 0.09], [0.72, 0.11], [0.59, 0.125], [0.47, 0.145], [0.36, 0.17], [0.26, 0.2], [0.17, 0.24]] : [[1, 0.16], [0.7, 0.2], [0.45, 0.26], [0.24, 0.34]];
  for (const [k, al] of steps) { c.fillStyle = `rgba(${rgb},${Math.min(1, a * al).toFixed(3)})`; spans(x, y, r * k, r * k, (yy, aa, bb, h) => c.fillRect(aa, yy, bb - aa, h)); }
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
    if (K > 1) {
      const f = 1 / K, X = sn(x), Y = sn(y);
      if (streak > 1) { c.fillRect(X, Y, sn(streak * (0.5 + s.b)), s.b > 0.6 ? 2 * f : f); continue; }
      const big = s.b > 0.72; c.fillRect(X, Y, big ? 2 * f : f, big ? 2 * f : f);
      if (s.b > 0.9 && tw > 0.6) { const L = 2 + Math.round(tw * 2); c.globalAlpha *= 0.7; c.fillRect(X - L * f, Y + (big ? f / 2 : 0), (2 * L + (big ? 2 : 1)) * f, f); c.fillRect(X + (big ? f / 2 : 0), Y - L * f, f, (2 * L + (big ? 2 : 1)) * f); }
      // a faint companion: doubles the field's depth without new data
      const cx2 = ((x + s.ph * 37) % w + w) % w, cy2 = ((y + s.sp * 53) % h + h) % h; c.globalAlpha = alpha * 0.35 * (0.4 + 0.6 * tw); c.fillRect(sn(cx2), sn(cy2), f, f);
      continue;
    }
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
  x = sn(x); y = sn(y); const prevA = c.globalAlpha; c.globalAlpha = prevA * A;
  // motion streak: the straight blur of something that only ever moves at one speed
  if (streak > 0 && K > 1) { const f = 1 / K; for (let i = 0; i < streak; i += f) { const k = 1 - i / streak, hh = Math.max(f, sn(r * 1.2 * k)); c.globalAlpha = prevA * A * 0.5 * k; c.fillStyle = pal[2]; c.fillRect(sn(x - r - i), sn(y - hh / 2), f, hh); } }
  else if (streak > 0) for (let i = 0; i < streak; i++) { const k = 1 - i / streak, hh = Math.max(1, Math.round(r * 1.2 * k)); c.globalAlpha = prevA * A * 0.5 * k; rect(c, x - r - i, y - Math.floor(hh / 2), 1, hh, pal[2]); }
  // its wave: wavelength tracks energy (radio lazy and long, gamma tight), amplitude fades behind it
  if (wave > 0 && K > 1) {
    const amp = Math.max(1, r * 0.55), f = 1 / K;
    for (let i = f; i <= wave; i += f) { const k = 1 - i / wave, yy = y + Math.sin(((i + phase) / waveLen) * Math.PI * 2) * amp * (0.3 + 0.7 * k); c.globalAlpha = prevA * A * (0.2 + 0.8 * k); c.fillStyle = Math.floor(i) % 4 === 0 ? pal[3] : pal[2]; c.fillRect(sn(x - r - i), sn(yy - 0.5), f, 1); if (r >= 5) { c.fillStyle = pal[1]; c.fillRect(sn(x - r - i), sn(yy + 0.5), f, f); } }
  } else if (wave > 0) {
    const amp = Math.max(1, r * 0.55);
    for (let i = 1; i <= wave; i++) { const k = 1 - i / wave, yy = y + Math.sin(((i + phase) / waveLen) * Math.PI * 2) * amp * (0.3 + 0.7 * k); c.globalAlpha = prevA * A * (0.2 + 0.8 * k); px(c, x - r - i, yy, i % 4 === 0 ? pal[3] : pal[2]); if (r >= 6) px(c, x - r - i, yy + 1, pal[1]); }
  }
  c.globalAlpha = prevA * A;
  sphere(c, x, y, r, pal);
  if (K > 1 && r >= 3.5) { faceHD(c, x, y, r, pal, face, mouth, look, !!o.blush); c.globalAlpha = prevA; return; }
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

// HD face: oval eyes with pupils, glints, lids and brows; curved mouths; drawn on the fine grid
const faceHD = (c: Ctx, x: number, y: number, r: number, pal: Pal, face: Face, mouth: Mouth, look: [number, number], blush: boolean) => {
  const f = 1 / K, D = INK, Wt = "#ffffff", ey = y - r * 0.12, erx = Math.max(1.5 * f, r * 0.2), ery = Math.max(2 * f, r * 0.29), th = Math.max(f, sn(r * 0.09));
  // a curve drawn as fine columns (no overlaps, alpha-safe): y offset = bend * (1 - u^2)
  const curve = (cx: number, cy: number, hw: number, bend: number) => { c.fillStyle = D; for (let X = sn(cx - hw); X <= cx + hw; X += f) { const u = (X + f / 2 - cx) / hw; c.fillRect(X, sn(cy + bend * (1 - u * u)), f, th); } };
  const brow = (ex: number, side: number, outerY: number, innerY: number) => { const o = ex + side * erx * 1.15, i = ex - side * erx * 1.15; c.fillStyle = D; for (let X = sn(Math.min(o, i)); X <= Math.max(o, i); X += f) { const u = (X - o) / (i - o); c.fillRect(X, sn(outerY + (innerY - outerY) * u), f, th); } };
  for (const side of [-1, 1]) {
    const ex = x + side * r * 0.38;
    switch (face) {
      case "blink": curve(ex, ey + ery * 0.2, erx * 1.05, ery * 0.35); break;
      case "calm": curve(ex, ey + ery * 0.1, erx * 1.05, ery * 0.45); break;
      case "happy": curve(ex, ey + ery * 0.35, erx * 1.05, -ery * 0.6); break;
      case "dizzy": ring(c, ex, ey, erx * 1.1, D, f); ring(c, ex, ey, erx * 0.5, D, f); break;
      case "sleepy": {
        ellipse(c, ex, ey, erx, ery, Wt); c.fillStyle = pal[1]; c.fillRect(sn(ex - erx - f), sn(ey - ery - f), sn(erx * 2 + 2 * f), sn(ery * 1.05 + f));
        c.fillStyle = D; c.fillRect(sn(ex - erx), sn(ey), sn(erx * 2), th); ellipse(c, ex + side * -erx * 0.15, ey + ery * 0.45, erx * 0.55, ery * 0.4, D); break;
      }
      default: {
        const wide = face === "wide", sc = wide ? 1.18 : 1;
        ellipse(c, ex, ey, erx * sc, ery * sc, Wt);
        const lx = look[0] ? Math.sign(look[0]) : -side * 0.6, ly = look[1] ? Math.sign(look[1]) : 0.15, pr = wide ? 0.42 : 0.66;
        const pX = ex + lx * erx * (1 - pr) * 0.9, pY = ey + ly * ery * (1 - pr) * 0.9;
        ellipse(c, pX, pY, erx * pr, ery * pr, D);
        c.fillStyle = Wt; c.fillRect(sn(pX - erx * pr * 0.45), sn(pY - ery * pr * 0.5), Math.max(f, sn(erx * 0.3)), Math.max(f, sn(erx * 0.3)));
        if (face === "angry") brow(ex, side, ey - ery * 1.6, ey - ery * 0.85);
        if (face === "determined") { c.fillStyle = pal[1]; c.fillRect(sn(ex - erx - f), sn(ey - ery - f), sn(2 * erx + 2 * f), sn(ery * 0.55 + f)); brow(ex, side, ey - ery * 1.25, ey - ery * 0.8); }
        if (wide && r >= 6) brow(ex, side, ey - ery * 1.75, ey - ery * 1.9);
      }
    }
  }
  const my = y + r * 0.42, mw = r * 0.2;
  switch (mouth) {
    case "smile": curve(x, my - r * 0.06, mw * 1.2, r * 0.13); break;
    case "o": ellipse(c, x, my + r * 0.02, r * 0.12, r * 0.15, D); if (r >= 6) ellipse(c, x, my + r * 0.1, r * 0.07, r * 0.05, "#c8404a"); break;
    case "yawn": ellipse(c, x, my, r * 0.18, r * 0.24, D); ellipse(c, x, my + r * 0.12, r * 0.11, r * 0.08, "#c8404a"); break;
    case "flat": c.fillStyle = D; c.fillRect(sn(x - mw), sn(my), sn(mw * 2), th); break;
  }
  if (blush || r >= 7) { const prev = c.globalAlpha; c.globalAlpha = prev * (blush ? 0.8 : 0.35); for (const side of [-1, 1]) ellipse(c, x + side * r * 0.62, ey + ery * 1.35, r * 0.12, r * 0.07, "#ff8aa0"); c.globalAlpha = prev; }
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
