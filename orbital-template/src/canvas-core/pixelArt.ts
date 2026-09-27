import { rng } from "./core";

// PIXEL ART RENDERER · illustration-grade pixel art drawn pixel by pixel (not a filter): a low-res RGBA
// buffer, hue-shifted colour ramps, value-noise textures, planets shaded per pixel (bands, storms,
// craters with lit rims, rim light on the night side), rings, clustered nebula bands, sparkle stars and
// small sprites. Quantisation uses a 4x4 Bayer matrix with a SMALL spread, so dither only appears where
// two tones meet (clusters stay clean). Deterministic: hash noise + rng(seed) only.

export type RGB = [number, number, number];
export const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const ramp = (...hs: string[]) => hs.map(hex);

export class PB {
  data: Uint8ClampedArray<ArrayBuffer>;
  constructor(public w: number, public h: number) { this.data = new Uint8ClampedArray(new ArrayBuffer(w * h * 4)); }
  set(x: number, y: number, c: RGB) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; const i = (y * this.w + x) * 4; this.data[i] = c[0]; this.data[i + 1] = c[1]; this.data[i + 2] = c[2]; this.data[i + 3] = 255; }
  mix(x: number, y: number, c: RGB, a: number) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= this.w || y >= this.h || a <= 0) return; const i = (y * this.w + x) * 4, d = this.data; d[i] += (c[0] - d[i]) * a; d[i + 1] += (c[1] - d[i + 1]) * a; d[i + 2] += (c[2] - d[i + 2]) * a; d[i + 3] = 255; }
}

// ---------------------------------------------------------------- noise + dither
const hash = (x: number, y: number, s: number) => { let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
export const vnoise = (x: number, y: number, s: number) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
export const fbm = (x: number, y: number, s: number, o = 4) => { let t = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < o; i++) { t += a * vnoise(x * f, y * f, s + i * 17); n += a; a *= 0.5; f *= 2.03; } return t / n; };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);
export const bay = (x: number, y: number) => BAYER[((y & 3) << 2) | (x & 3)];
/** value 0..1 -> ramp colour, dithering only near tone borders */
export const q = (R: RGB[], v: number, x: number, y: number, spread = 0.55) => R[Math.max(0, Math.min(R.length - 1, Math.round(v * (R.length - 1) + bay(x, y) * spread)))];

// ---------------------------------------------------------------- planets
export type Planet = {
  kind: "gas" | "rock" | "ice"; ramp: RGB[]; seed: number; rot: number; bands?: number; storm?: [number, number, number];
  craters?: number; rim?: RGB; tilt?: number; atmo?: RGB;
};
const L0 = (() => { const v = [-0.62, -0.48, 0.62], n = Math.hypot(...v); return v.map((c) => c / n); })();
const CRATERS = new Map<number, { c: number[]; r: number }[]>();
const craterList = (seed: number, n: number) => { const k = seed * 1000 + n; let a = CRATERS.get(k); if (a) return a; const r = rng(seed); a = []; for (let i = 0; i < n; i++) { const lon = (r() * 2 - 1) * Math.PI, lat = Math.asin(r() * 2 - 1), rad = 0.025 + Math.pow(r(), 2.6) * 0.2; a.push({ c: [Math.sin(lon) * Math.cos(lat), Math.sin(lat), Math.cos(lon) * Math.cos(lat)], r: rad }); } CRATERS.set(k, a); return a; };

export const planet = (pb: PB, cx: number, cy: number, r: number, P: Planet, part: "all" | "noRim" = "all") => {
  const R = P.ramp, cr = Math.cos(P.rot), sr = Math.sin(P.rot), tl = P.tilt ?? 0, ct = Math.cos(tl), st = Math.sin(tl);
  const Lr = [L0[0] * cr - L0[2] * sr, L0[1], L0[0] * sr + L0[2] * cr]; // light in the planet's turning frame
  const cr8 = P.kind === "ice" ? craterList(P.seed, P.craters ?? 26) : [];
  const x0 = Math.floor(cx - r - 1), x1 = Math.ceil(cx + r + 1), y0 = Math.floor(cy - r - 1), y1 = Math.ceil(cy + r + 1);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const dx0 = (x + 0.5 - cx) / r, dy0 = (y + 0.5 - cy) / r, d2 = dx0 * dx0 + dy0 * dy0; if (d2 > 1) continue;
    const nz = Math.sqrt(1 - d2), dx = dx0 * ct - dy0 * st, dy = dx0 * st + dy0 * ct;
    const lam = Math.max(0, dx0 * L0[0] + dy0 * L0[1] + nz * L0[2]);
    const px = dx * cr + nz * sr, pz = -dx * sr + nz * cr, py = dy, lon = Math.atan2(px, pz), lat = Math.asin(Math.max(-1, Math.min(1, py)));
    let tex = 0.5;
    if (P.kind === "gas") {
      const b = P.bands ?? 7, w = fbm(lon * 1.6, lat * 5, P.seed) * 3.2 + fbm(lon * 5, lat * 14, P.seed + 5) * 0.8;
      tex = 0.5 + 0.5 * Math.sin(lat * b * Math.PI * 0.62 + w);
      if (P.storm) { const [sl, sb, ss] = P.storm, ex = (lon - sl) / (ss * 1.7), ey = (lat - sb) / ss, e = ex * ex + ey * ey; if (e < 1) { const sw = Math.sin(Math.atan2(ey, ex) * 2 + e * 6); tex = e < 0.35 ? 0.95 : 0.7 + 0.2 * sw; } }
    } else if (P.kind === "rock") tex = fbm(lon * 2.2, lat * 2.2, P.seed) * 0.8 + fbm(lon * 7, lat * 7, P.seed + 3) * 0.2;
    else {
      tex = 0.45 + (fbm(lon * 2.4, lat * 2.4, P.seed) - 0.5) * 1.0 + (fbm(lon * 9, lat * 9, P.seed + 2) - 0.5) * 0.35;
      for (const C of cr8) {
        const dot = px * C.c[0] + py * C.c[1] + pz * C.c[2], d = Math.acos(Math.max(-1, Math.min(1, dot))); if (d > C.r * 1.25) continue;
        const ox = px - C.c[0], oy = py - C.c[1], oz = pz - C.c[2], on = Math.hypot(ox, oy, oz) || 1, dir = (ox * Lr[0] + oy * Lr[1] + oz * Lr[2]) / on, t = d / C.r;
        tex += t < 0.82 ? -0.16 - 0.3 * dir : t < 1.05 ? 0.16 + 0.26 * dir : 0.06 * dir;
      }
    }
    let v = Math.pow(lam, 0.85) * 0.9 + (tex - 0.5) * (P.kind === "gas" ? 0.42 : 0.5) + 0.04;
    const edge = 1 - Math.sqrt(d2);
    const away = -(dx0 * L0[0] + dy0 * L0[1]) / Math.max(1e-6, Math.sqrt(d2));
    if (part === "all" && P.rim && edge < 2.2 / r && away > 0.35) { pb.set(x, y, P.rim); continue; } // bounced rim light on the night edge
    if (P.atmo && edge < 1.2 / r && lam > 0.2) { pb.set(x, y, P.atmo); continue; }
    pb.set(x, y, q(R, Math.max(0, Math.min(1, v)), x, y));
    if (part === "all" && P.rim && edge < 4.5 / r && away > 0.55 && ((x + y) & 1)) pb.mix(x, y, P.rim, 0.4);
  }
};
/** ring: back half before the planet, front half after it */
export const ring = (pb: PB, cx: number, cy: number, r: number, R: RGB[], half: "back" | "front", k = 0.28, rin = 1.35, rout = 2.1, seed = 3) => {
  const X = Math.ceil(r * rout), Y = Math.ceil(r * rout * k) + 1;
  for (let y = -Y; y <= Y; y++) { if (half === "back" ? y >= 0 : y < 0) continue; for (let x = -X; x <= X; x++) {
    const u = (x + 0.5) / r, w = (y + 0.5) / (r * k), d = Math.hypot(u, w); if (d < rin || d > rout) continue;
    if (half === "front" || (x + 0.5) * (x + 0.5) + (y + 0.5) * (y + 0.5) > r * r) {
      const gap = Math.abs(d - (rin + (rout - rin) * 0.62)) < 0.05 ? 0 : 1, band = 0.5 + 0.35 * Math.sin(d * 24 + fbm(d * 6, 0, seed) * 3) + (x < 0 ? 0.15 : -0.15);
      if (gap) pb.set(cx + x, cy + y, q(R, Math.max(0, Math.min(1, band)), cx + x, cy + y));
    }
  } }
};

// ---------------------------------------------------------------- sky
export const skyGradient = (pb: PB, R: RGB[]) => { for (let y = 0; y < pb.h; y++) for (let x = 0; x < pb.w; x++) pb.set(x, y, q(R, (y / pb.h) * 0.7 + (1 - x / pb.w) * 0.3, x, y, 0.9)); };
/** a drifting nebula band along y = a*x + b: domain-warped noise posterised into clean clusters */
export const nebula = (pb: PB, R: RGB[], a: number, b: number, width: number, ox: number, seed: number, strength = 1) => {
  for (let y = 0; y < pb.h; y++) for (let x = 0; x < pb.w; x++) {
    const dl = (y - (a * x + b)) / width, m = Math.exp(-dl * dl); if (m < 0.05) continue;
    const wx = fbm((x + ox) * 0.011, y * 0.02, seed + 9) * 3, n = fbm((x + ox) * 0.016 + wx, y * 0.03 + wx * 0.6, seed), v = (n - 0.34) * 2.4 * m * strength;
    if (v <= 0.02) continue;
    const c = q(R, Math.min(1, v), x, y, 0.7); if (v < 0.16 && ((x + y) & 1)) continue; pb.set(x, y, c);
  }
};
export type Star = { x: number; y: number; c: RGB; k: number; ph: number; sp: number };
export const makeStars = (seed: number, n: number, w: number, h: number): Star[] => { const r = rng(seed), C = ramp("#ffffff", "#bfe0ff", "#ffe6a8", "#ffb0c8", "#9af0ff"); return Array.from({ length: n }, () => ({ x: r() * w, y: r() * h, c: C[Math.floor(r() * C.length)], k: r(), ph: r() * 6.28, sp: 0.8 + r() * 2.5 })); };
export const stars = (pb: PB, S: Star[], t: number, ox = 0, par = 1) => {
  for (const s of S) {
    const x = ((((s.x - ox * par) % pb.w) + pb.w) % pb.w) | 0, y = s.y | 0, tw = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph);
    if (s.k > 0.955) { const L = tw > 0.5 ? 2 : 1; pb.set(x, y, s.c); for (let i = 1; i <= L; i++) { const a = i === L ? 0.45 : 0.8; pb.mix(x + i, y, s.c, a); pb.mix(x - i, y, s.c, a); pb.mix(x, y + i, s.c, a); pb.mix(x, y - i, s.c, a); } }
    else if (s.k > 0.9) { pb.mix(x, y, s.c, 0.5 + 0.5 * tw); pb.mix(x + 1, y, s.c, 0.35 * tw); pb.mix(x, y + 1, s.c, 0.35 * tw); }
    else pb.mix(x, y, s.c, (0.25 + 0.6 * s.k) * (0.55 + 0.45 * tw));
  }
};
/** a sprite from rows of palette keys ("." = empty) */
export const sprite = (pb: PB, rows: string[], pal: Record<string, RGB>, x: number, y: number, flip = false) => rows.forEach((row, j) => [...row].forEach((ch, i) => { const c = pal[ch]; if (c) pb.set(x + (flip ? row.length - 1 - i : i), y + j, c); }));
export const comet = (pb: PB, x: number, y: number, dx: number, dy: number, len: number, R: RGB[]) => { const n = Math.hypot(dx, dy); for (let i = 0; i < len; i++) { const k = 1 - i / len, px = x - (dx / n) * i, py = y - (dy / n) * i; pb.mix(px, py, R[Math.min(R.length - 1, Math.floor(k * R.length))], 0.25 + 0.75 * k); if (i < len * 0.4) pb.mix(px, py + 1, R[1], 0.4 * k); } pb.set(x, y, [255, 255, 255]); pb.set(x + 1, y, R[R.length - 1]); };
