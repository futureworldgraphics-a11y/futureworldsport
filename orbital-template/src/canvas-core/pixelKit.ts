import type { Ctx, Env } from "./core";

// PIXEL KIT · turns a finished cinemaKit frame into real pixel art, and sets lettering in a pixel font.
// Used through endFrame(..., { pixel: P }): the frame is reduced to (W/P)x(H/P) art pixels (each keeps
// a mix of the block's average and brightest value, so 1 px stars and hairlines survive as whole
// pixels), snapped to a fixed palette taken from the Pale Blue Dot tones with a 4x4 ordered (Bayer)
// dither, then blown back up with no smoothing. Deterministic: no randomness at all.

// ================================================================ palette: the paleDot tones, as pixel-art ramps
export const PIXEL_PALETTE = [
  // night: blacks, navies, plums, warm darks
  "#030309", "#08091a", "#0f1128", "#171a3a", "#1f1631", "#2b1b3f", "#1c1016", "#2c1a16",
  // blues to pale
  "#1b2d5c", "#25448a", "#3a67c0", "#5c93e6", "#8fc1f7", "#cfe6ff",
  // cyans
  "#135266", "#2493b2", "#4fd2ec", "#aef4ff",
  // violets
  "#3a2a70", "#5f45b0", "#8f72e8", "#c7b4ff",
  // magentas, reds
  "#4e1a4a", "#962e7e", "#e052b4", "#ff9ad9", "#6e1426", "#d23a4c",
  // ambers, golds
  "#3f2412", "#7a4118", "#c66a22", "#f5a043", "#ffd07e", "#fff0c4",
  // greens (land, forager)
  "#18583e", "#3fbf88", "#a9f7d0",
  // whites
  "#e8f3ff", "#ffffff",
];
const PAL = PIXEL_PALETTE.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
let LUT: Uint8Array | null = null;
/** 5-bit-per-channel colour -> nearest palette index (perceptually weighted distance) */
const lut = () => {
  if (LUT) return LUT;
  LUT = new Uint8Array(32768);
  for (let r = 0; r < 32; r++) for (let g = 0; g < 32; g++) for (let b = 0; b < 32; b++) {
    const R = r * 8 + 4, G = g * 8 + 4, B = b * 8 + 4; let best = 0, bd = 1e12;
    for (let i = 0; i < PAL.length; i++) { const [pr, pg, pb] = PAL[i], rm = (R + pr) / 2, dr = R - pr, dg = G - pg, db = B - pb, d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db; if (d < bd) { bd = d; best = i; } }
    LUT[(r << 10) | (g << 5) | b] = best;
  }
  return LUT;
};
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** reduce the whole canvas to pixel art in place: P screen px per art pixel */
export const pixelate = (ctx: Ctx, env: Env, P: number, spread = 22, keep = 0.55) => {
  const DW = Math.round(env.W * env.scale), DH = Math.round(env.H * env.scale), pp = Math.max(1, Math.round(P * env.scale)), lw = Math.floor(DW / pp), lh = Math.floor(DH / pp);
  const key = `pix:${lw}x${lh}`;
  let st = env.cache.get(key) as { L: ReturnType<Env["canvas"]>; img: ImageData } | undefined;
  if (!st) { const L = env.canvas(lw, lh); st = { L, img: L.ctx.createImageData(lw, lh) }; env.cache.set(key, st); }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const src = ctx.getImageData(0, 0, lw * pp, lh * pp).data, out = st.img.data, T = lut(), n = pp * pp, rowW = lw * pp * 4;
  for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
    let sr = 0, sg = 0, sb = 0, mr = 0, mg = 0, mb = 0;
    for (let yy = 0; yy < pp; yy++) { let i = (y * pp + yy) * rowW + x * pp * 4; for (let xx = 0; xx < pp; xx++, i += 4) { const r = src[i], g = src[i + 1], b = src[i + 2]; sr += r; sg += g; sb += b; if (r + g + b > mr + mg + mb) { mr = r; mg = g; mb = b; } } }
    const ar = sr / n, ag = sg / n, ab = sb / n, off = (BAYER[((y & 3) << 2) | (x & 3)] / 16 - 0.47) * spread;
    const r = Math.min(255, Math.max(0, ar + (mr - ar) * keep + off)), g = Math.min(255, Math.max(0, ag + (mg - ag) * keep + off)), b = Math.min(255, Math.max(0, ab + (mb - ab) * keep + off));
    const p = PAL[T[((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)]], o = (y * lw + x) * 4;
    out[o] = p[0]; out[o + 1] = p[1]; out[o + 2] = p[2]; out[o + 3] = 255;
  }
  st.L.ctx.putImageData(st.img, 0, 0);
  ctx.imageSmoothingEnabled = false; ctx.globalCompositeOperation = "copy"; ctx.globalAlpha = 1;
  ctx.drawImage(st.L.canvas as CanvasImageSource, 0, 0, lw * pp, lh * pp);
  ctx.restore();
};

// ================================================================ 5x7 pixel font (A-Z 0-9 - . , : / ( ) & ?; lowercase e u t g d draw as capitals)
const F: Record<string, string> = {
  A: ".###.#...##...#######...##...##...#", B: "####.#...##...#####.#...##...#####.", C: ".###.#...##....#....#....#...#.###.", D: "####.#...##...##...##...##...#####.",
  E: "######....#....####.#....#....#####", F: "######....#....####.#....#....#....", G: ".###.#...##....#.####...##...#.###.", H: "#...##...##...#######...##...##...#",
  I: ".###...#....#....#....#....#...###.", J: "..###...#....#....#.#..#.#..#..##..", K: "#...##..#.#.#..##...#.#..#..#.#...#", L: "#....#....#....#....#....#....#####",
  M: "#...###.###.#.##.#.##...##...##...#", N: "#...##...###..##.#.##..###...##...#", O: ".###.#...##...##...##...##...#.###.", P: "####.#...##...#####.#....#....#....",
  Q: ".###.#...##...##...##.#.##..#..##.#", R: "####.#...##...#####.#.#..#..#.#...#", S: ".#####....#.....###.....#....#####.", T: "#####..#....#....#....#....#....#..",
  U: "#...##...##...##...##...##...#.###.", V: "#...##...##...##...##...#.#.#...#..", W: "#...##...##...##.#.##.#.##.#.#.#.#.", X: "#...##...#.#.#...#...#.#.#...##...#",
  Y: "#...##...#.#.#...#....#....#....#..", Z: "#####....#...#...#...#...#....#####",
  "0": ".###.#...##..###.#.###..##...#.###.", "1": "..#...##....#....#....#....#...###.", "2": ".###.#...#....#...#...#...#...#####", "3": "####.....#....#.###.....#....#####.",
  "4": "...#...##..#.#.#..#.#####...#....#.", "5": "######....####.....#....##...#.###.", "6": "..##..#...#....####.#...##...#.###.", "7": "#####....#...#...#...#....#....#...",
  "8": ".###.#...##...#.###.#...##...#.###.", "9": ".###.#...##...#.####....#...#..##..",
  "-": "................###................", ".": "..........................##...##..", ",": ".....................##....#...#...",
  ":": "......##...##........##...##.......", "/": "....#....#...#...#...#...#....#....", "(": "...#...#...#....#....#.....#.....#.", ")": ".#.....#.....#....#....#...#...#...",
  "&": ".##..#..#.#.#...#...#.#.##..#..##.#", "?": ".###.#...#....#...#...#.........#..",
};
const glyph = (ch: string) => { const s = F[ch.toUpperCase()]; return s ? s.padEnd(35, ".").slice(-35) : null; };
export const pixelUnit = (cap: number) => Math.max(3, Math.round(cap / 9.5));
export const pixelWidth = (s: string, cap: number) => { const u = pixelUnit(cap); return [...s].length * 6 * u - u; };
export type PixelTextOpts = { cap: number; color?: string; progress?: number; opacity?: number; align?: "left" | "center" | "right" };
/** terminal-style lettering: types on character by character with a block cursor, 1-unit drop shadow */
export const pixelText = (ctx: Ctx, env: Env, s: string, x: number, y: number, o: PixelTextOpts) => {
  const { cap, color = "#e8f3ff", progress = 1, opacity = 1, align = "left" } = o;
  if (progress <= 0 || opacity <= 0.01) return;
  const u = pixelUnit(cap), chars = [...s], w = pixelWidth(s, cap), n = chars.filter((c) => c !== " ").length, shown = Math.floor(Math.min(1, progress) * n + 1e-6);
  const x0 = Math.round(align === "center" ? x - w / 2 : align === "right" ? x - w : x), y0 = Math.round(y);
  ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = Math.min(1, opacity);
  let vi = 0, cx = x0, cursor = -1;
  const cells: [number, number][] = [];
  for (const ch of chars) {
    if (ch !== " ") { if (vi >= shown) { cursor = cx; break; } const gph = glyph(ch); if (gph) for (let i = 0; i < 35; i++) if (gph[i] === "#") cells.push([cx + (i % 5) * u, y0 + Math.floor(i / 5) * u]); vi++; }
    cx += 6 * u;
  }
  if (progress < 1 && cursor < 0) cursor = cx;
  ctx.fillStyle = "#030309"; for (const [px, py] of cells) ctx.fillRect(px + u, py + u, u, u);
  if (progress < 1 && cursor >= 0) ctx.fillRect(cursor + u, y0 + u, 5 * u, 7 * u);
  ctx.fillStyle = color; for (const [px, py] of cells) ctx.fillRect(px, py, u, u);
  if (progress < 1 && cursor >= 0) { ctx.globalAlpha = Math.min(1, opacity) * 0.85; ctx.fillRect(cursor, y0, 5 * u, 7 * u); }
  ctx.restore();
};
