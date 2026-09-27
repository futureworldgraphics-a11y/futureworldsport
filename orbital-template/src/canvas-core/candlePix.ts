import { rng, type Ctx, type Env } from "./core";
import { Film } from "./film";
import { cached, ease, easeOut, ramp as rampT } from "./spaceStyle";
import { pixText, pixTextW } from "./pixelKit";
import { PB, ramp, hex, q, fbm, bay, planet, skyGradient, nebula, makeStars, stars, sprite, type RGB } from "./pixelArt";

// CANDLE, IN DETAIL · the first 30 s of "The One Speed" (audio/oneSpeed.mp3) redrawn as illustration-grade
// pixel art: 480x270 art pixels blown up 4x, drawn pixel by pixel (see pixelArt.ts), full frame, pixel HUD.
//   0-3.6    night kitchen: candle light on tiles, jars, wood grain; moon, city and a sleeping cat in the window.
//            "produces light" (1.69): a photon pops from the flame, hovers, zips out of the window; the cat's ear twitches
//   3.6-9.2  warp through star streaks to a quasar (galaxy, banded disk, knotted jets); the cosmic edge glows in (5.28);
//            a blue photon leaves (7.62)
//   9.2-18.1 pan to a blue supergiant (9.32); collapse (10.72); flash, twin jets, shock shell (12.44); energy panel:
//            the burst's bar overflows the panel (14.05), the Sun's bar crawls (14.92); a violet photon emerges (18.14)
//   18.1-30  four lanes, one speed: calm (21.52) glides, violent (22.66) crackles, faint (24.59) is nearly invisible
//            until a detector blips (26.07), energetic (28.0) shatters a nucleus (29.04); all stay side by side

const W = 1920, H = 1080, AW = 480, AH = 270, FPS = 30, DUR = 900, T_END = 30;
const C = { prod1: 1.69, quasar: 3.89, edge: 5.28, prod2: 7.62, gamma: 9.32, collapse: 10.72, unleash: 12.44, seconds: 14.05, sun: 14.92, prod3: 18.14, every: 19.56, calm: 21.52, violent: 22.66, faint: 24.59, measured: 26.07, energetic: 28.0, shatter: 29.04 };
const LABELS: [number, number, string][] = [[0.3, 19.3, "THREE SOURCES OF LIGHT"], [19.5, 31, "THE SPECTRUM"]];
const LINES: [number, number, string, number, number][] = [
  [0.07, 3.2, "A CANDLE IN YOUR KITCHEN", 0, 1.2], [3.41, 9.1, "A DISTANT QUASAR", 0, 0.8], [5.28, 9.1, "AT THE COSMIC EDGE", 1, 0.9],
  [9.32, 12.3, "A GAMMA-RAY BURST", 0, 0.8], [10.72, 12.3, "A COLLAPSING STAR", 1, 0.7], [12.44, 18.0, "MORE ENERGY IN SECONDS", 0, 1.3], [14.92, 18.0, "THAN THE SUN EVER WILL", 1, 1.6],
  [18.14, 19.4, "ALL PRODUCE LIGHT", 0, 0.6], [19.56, 21.4, "EVERY ONE OF THESE PHOTONS", 0, 1.0], [21.52, 22.5, "THE CALM ONES", 0, 0.5], [22.66, 23.8, "THE VIOLENT ONES", 0, 0.5],
  [24.59, 27.0, "THE FAINT ONES", 0, 0.6], [28.0, 31, "THE ENERGETIC ONES", 0, 0.8],
];

// ---------------------------------------------------------------- palettes (hue-shifted ramps)
const WALL = ramp("#0e0816", "#170c20", "#22122a", "#321a32", "#472434", "#633234", "#874632", "#ad6036", "#d4843e", "#f0aa52");
const TILE = ramp("#120c1e", "#1c1430", "#2a1e3e", "#3e2a48", "#5a3a4c", "#7e4e4c", "#a8684e", "#d08c58", "#f0b46a");
const WOOD = ramp("#0e0608", "#1c0c0c", "#2e1410", "#461e12", "#622a14", "#843a16", "#a8501a", "#cc6c22", "#ec9232");
const WAX = ramp("#6a4a3a", "#9a7458", "#c8a282", "#e8cca8", "#fbe8c8", "#fff8e8");
const NIGHT = ramp("#060818", "#0a1026", "#0e1634", "#141e44", "#1c2a58");
const SPACE = ramp("#040312", "#07061a", "#0a0922", "#0e0c2c");
const NEB = ramp("#130f34", "#1b1848", "#262262", "#332e7a", "#443c94");
const GAL = ramp("#1a0c30", "#321650", "#522072", "#7a2e8e", "#a444a4", "#cc6cb8", "#ec9ed2", "#fcd6ee", "#ffffff");
const CMB = ramp("#2a0a0e", "#4a1412", "#6e2414", "#963a18", "#bc5a22");
const BSG = ramp("#0a1a4a", "#14307a", "#1e50a8", "#2e78cc", "#4ea0e4", "#80c6f4", "#b8e4fc", "#eaf8ff");
const SUNR = ramp("#6a2a0a", "#b85a14", "#ec9a2a", "#ffd25a", "#fff2b0");
const MOONR = ramp("#1a1c2e", "#2c3048", "#444a66", "#666e8a", "#9098b0", "#c4c8da");
const WHITE: RGB = [255, 255, 255];
const hx = hex;

// ---------------------------------------------------------------- small drawing helpers
const rect = (pb: PB, x: number, y: number, w: number, h: number, c: RGB, a = 1) => { for (let j = Math.round(y); j < Math.round(y + h); j++) for (let i = Math.round(x); i < Math.round(x + w); i++) a >= 1 ? pb.set(i, j, c) : pb.mix(i, j, c, a); };
const disc = (pb: PB, cx: number, cy: number, r: number, c: RGB, a = 1) => { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) { const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy); if (d <= r) a >= 1 ? pb.set(x, y, c) : pb.mix(x, y, c, a); } };
/** posterised, dithered glow: pixel-art light */
const glowD = (pb: PB, cx: number, cy: number, r: number, c: RGB, a: number, steps = 5) => { if (a <= 0 || r <= 0) return; for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) { const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r; if (d >= 1) continue; const v = (1 - d) * (1 - d) * a, s = Math.floor(v * steps + bay(x, y) * 0.9 + 0.5) / steps; if (s > 0) pb.mix(x, y, c, Math.min(1, s)); } };
const lineP = (pb: PB, x0: number, y0: number, x1: number, y1: number, c: RGB, a = 1) => { const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)))); for (let i = 0; i <= n; i++) pb.mix(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c, a); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const win = (t: number, a: number, b: number, fi = 0.3, fo = 0.3) => Math.min(rampT(t, a, fi), 1 - rampT(t, b - fo, fo));

/** a photon: dithered glow, bright core, and its wave trailing behind (wavelength = energy) */
const photon = (pb: PB, x: number, y: number, col: RGB, core: RGB, o: { lam?: number; amp?: number; len?: number; ph?: number; a?: number; r?: number; streak?: number } = {}) => {
  const a = o.a ?? 1, r = o.r ?? 2.2; if (a <= 0) return;
  glowD(pb, x, y, r * 4.5, col, 0.55 * a);
  if (o.len) for (let i = 1; i <= o.len; i++) { const k = 1 - i / o.len, yy = y + Math.sin(((i + (o.ph ?? 0)) / (o.lam ?? 12)) * Math.PI * 2) * (o.amp ?? 3) * (0.35 + 0.65 * k); pb.mix(x - r - i, yy, col, a * (0.25 + 0.75 * k)); if (i % 3 === 0) pb.mix(x - r - i, yy + 1, col, a * 0.35 * k); }
  if (o.streak) for (let i = 1; i <= o.streak; i++) { const k = 1 - i / o.streak; pb.mix(x - r - i, y, core, a * 0.8 * k); pb.mix(x - r - i, y - 1, col, a * 0.4 * k); pb.mix(x - r - i, y + 1, col, a * 0.4 * k); }
  disc(pb, x, y, r, col, a); disc(pb, x - 0.3, y - 0.3, r * 0.55, core, a);
};

// ================================================================ KITCHEN (0 - 3.9)
const KS = makeStars(301, 60, 140, 90);
const GRAIN = (() => { const r = rng(9), a: number[][] = []; for (let i = 0; i < 26; i++) a.push([r() * AW, 196 + r() * 72, 20 + r() * 90]); return a; })();
const CAT = ["......k...k.......", ".....kkk.kkk......", "....kkkkkkkkk.....", "....kkekkkekk.....", "...kkkkkkkkkkkkk..", "..kkkkkkkkkkkkkkk.", ".kkkkkkkkkkkkkkkkk", "kkkkkkkkkkkkkkkkkk"];
const sKitchen = (pb: PB, t: number) => {
  const fl = 0.5 * Math.sin(t * 9.1) + 0.3 * Math.sin(t * 14.3 + 1) + 0.2 * Math.sin(t * 23.7 + 2), FX = 170, FY = 150, WX = 300, WY = 30, WW = 140, WH = 116;
  const I = (x: number, y: number) => { const d = Math.hypot(x - FX, (y - FY) * 1.1) / (78 + fl * 3); return 1 / (1 + d * d * 1.6); };
  for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) {
    const L = I(x, y);
    if (y >= 192) { // the table: planks, grain, light pool
      const plank = y === 192 || y === 214 || y === 240 ? -0.18 : y === 193 ? 0.2 : 0, gr = (fbm(x * 0.03, y * 0.55, 5) - 0.5) * 0.3;
      pb.set(x, y, q(WOOD, Math.max(0, Math.min(1, 0.08 + L * 0.9 + plank + gr)), x, y));
    } else if (y >= 128 && y < 192) { // tiled splashback
      const tx = (x + 3) % 16, ty = (y - 128) % 12, gl = tx === 0 || ty === 0 ? -0.16 : tx === 1 || ty === 1 ? 0.08 : 0;
      pb.set(x, y, q(TILE, Math.max(0, Math.min(1, 0.1 + L * 0.85 + gl + (fbm(x * 0.2, y * 0.2, 7) - 0.5) * 0.08)), x, y));
    } else { // wallpaper
      const st = x % 14 === 0 ? -0.05 : (x % 14 === 7 && y % 10 < 2) ? 0.05 : 0;
      pb.set(x, y, q(WALL, Math.max(0, Math.min(1, 0.07 + L * 0.8 + st + (fbm(x * 0.05, y * 0.05, 3) - 0.5) * 0.08)), x, y));
    }
  }
  // shelf and jars (lit from the candle side)
  rect(pb, 18, 84, 138, 4, q(WOOD, 0.2 + I(80, 84) * 0.9, 0, 0)); rect(pb, 18, 88, 138, 1, hx("#0e0608"));
  ([[26, 20, "#5a8aa0"], [48, 28, "#b0603a"], [76, 16, "#6aa060"], [98, 24, "#9a7ac0"], [124, 18, "#c8a040"]] as [number, number, string][]).forEach(([x, h, col], i) => {
    const base = hx(col), l = I(x + 5, 84 - h / 2);
    for (let j = 0; j < h; j++) for (let k = 0; k < 11; k++) { const cyl = k < 2 ? -0.25 : k > 8 ? 0.2 : 0; const v = Math.max(0.15, Math.min(1.1, 0.35 + l * 0.9 + cyl)); pb.set(x + k, 84 - h + j, [base[0] * v, base[1] * v, base[2] * v].map((c) => Math.min(255, c)) as RGB); }
    rect(pb, x - 1, 84 - h - 3, 13, 3, hx("#3a2a2a")); rect(pb, x, 84 - h - 3, 11, 1, hx("#6a5048"));
    rect(pb, x + 2, 84 - h * 0.6, 7, Math.max(3, h * 0.3), hx("#e8dcc0"), 0.85); rect(pb, x + 3, 84 - h * 0.6 + 1, 5, 1, hx("#8a7060")); if (i === 2) rect(pb, x + 3, 84 - h * 0.6 + 3, 3, 1, hx("#8a7060"));
    rect(pb, x + 9, 84 - h + 1, 1, h - 2, [255, 236, 200], 0.5);
  });
  // the window: sky, stars, moon, city, glass, frame, sill, a sleeping cat
  for (let y = WY; y < WY + WH; y++) for (let x = WX; x < WX + WW; x++) pb.set(x, y, q(NIGHT, (y - WY) / WH * 0.9 + (fbm(x * 0.03, y * 0.05, 11) - 0.5) * 0.3, x, y));
  for (const s of KS) { const x = (WX + s.x) | 0, y = (WY + s.y) | 0; pb.mix(x, y, s.c, (0.4 + 0.6 * s.k) * (0.6 + 0.4 * Math.sin(t * s.sp + s.ph))); }
  glowD(pb, WX + 108, WY + 26, 22, hx("#c8d0f0"), 0.35); planet(pb, WX + 108, WY + 26, 9, { kind: "rock", ramp: MOONR, seed: 77, rot: 0.4 });
  { let x = WX; const r = rng(44); while (x < WX + WW) { const w = 5 + Math.floor(r() * 9), h = 10 + Math.floor(r() * 26); rect(pb, x, WY + WH - h, Math.min(w, WX + WW - x), h, x % 2 ? hx("#0b0e22") : hx("#0e1228")); for (let yy = WY + WH - h + 2; yy < WY + WH - 2; yy += 3) for (let xx = x + 1; xx < x + w - 1 && xx < WX + WW; xx += 2) { const on = r() > 0.62, blink = on && r() > 0.9 && Math.sin(t * 3 + xx) > 0.6; if (on && !blink) pb.set(xx, yy, r() > 0.3 ? hx("#ffc96a") : hx("#ffe9b0")); } x += w + 1; } }
  for (const [ox, oy, n] of [[20, 50, 16], [26, 58, 8], [96, 88, 12]]) lineP(pb, WX + ox, WY + oy, WX + ox + n, WY + oy - n, [220, 230, 255], 0.14);
  const FR = hx("#2e1a10"), FRL = hx("#5a3820");
  rect(pb, WX - 6, WY - 6, WW + 12, 6, FR); rect(pb, WX - 6, WY - 6, 6, WH + 12, FR); rect(pb, WX + WW, WY - 6, 6, WH + 12, FR); rect(pb, WX + WW / 2 - 2, WY, 4, WH, FR); rect(pb, WX, WY + WH / 2 - 2, WW, 4, FR);
  rect(pb, WX - 6, WY - 6, WW + 12, 1, FRL); rect(pb, WX - 6, WY - 6, 1, WH + 12, FRL); rect(pb, WX + WW / 2 - 2, WY, 1, WH, FRL);
  rect(pb, WX - 12, WY + WH, WW + 24, 7, q(WOOD, 0.35 + I(WX, WY + WH) * 0.6, 0, 0)); rect(pb, WX - 12, WY + WH, WW + 24, 1, hx("#8a5a34")); rect(pb, WX - 12, WY + WH + 7, WW + 24, 2, hx("#140806"));
  const K: Record<string, RGB> = { k: hx("#0a0610"), e: t > 2.62 && t < 2.95 ? hx("#ffd24a") : hx("#0a0610") };
  const catRows = CAT.map((r, i) => (i === 0 && t > 2.6 && t < 2.8 ? r.replace("k...k", "k....") : r));
  sprite(pb, catRows, K, WX + 92, WY + WH - 8);
  for (let i = 0; i < 9; i++) { const a = Math.sin(t * 1.3) * 0.5 + i * 0.12; pb.set(WX + 110 + i, WY + WH - 1 - Math.round(Math.sin(a) * i * 0.35), hx("#0a0610")); }
  // mug with steam
  rect(pb, 214, 176, 16, 16, q(TILE, 0.55 + I(222, 184) * 0.4, 0, 0)); rect(pb, 214, 176, 2, 16, hx("#f4ead8")); rect(pb, 227, 176, 3, 16, hx("#6a5a60")); rect(pb, 214, 176, 16, 2, hx("#3a2418"));
  for (let yy = 179; yy < 188; yy++) { pb.set(231, yy, hx("#c8b8b0")); pb.set(233, yy, hx("#8a7a78")); } pb.set(232, 179, hx("#c8b8b0")); pb.set(232, 187, hx("#8a7a78"));
  for (let s = 0; s < 3; s++) for (let k = 0; k < 26; k++) { const qq = (t * 0.4 + s / 3 + k / 26) % 1; pb.mix(220 + s * 2 + Math.sin(qq * 8 + t * 1.6 + s) * (1 + qq * 3), 174 - qq * 26, [230, 220, 230], 0.28 * Math.sin(qq * Math.PI)); }
  // the candle: holder, wax, drips, wick, layered flame
  for (let y = 188; y < 196; y++) { const w = 20 - (y - 188) * 0.6; rect(pb, FX - w / 2, y, w, 1, q(ramp("#2a1a10", "#6a4a28", "#a07a44", "#d0aa66"), 0.25 + (196 - y) / 12, 0, y)); }
  for (let y = 150; y < 190; y++) for (let x = FX - 6; x < FX + 6; x++) { const k = (x - (FX - 6)) / 12, cyl = k < 0.2 ? 0.25 : k > 0.75 ? -0.3 : 0.05, top = Math.max(0, 1 - (y - 150) / 40) * 0.25; pb.set(x, y, q(WAX, Math.max(0, Math.min(1, 0.55 + cyl + top)), x, y)); }
  for (const [dx, h] of [[-6, 9], [-3, 4], [2, 6], [5, 12]]) { rect(pb, FX + dx, 150, 1, h, hx("#fff4dc")); pb.set(FX + dx, 150 + h, hx("#e8cca8")); }
  rect(pb, FX - 5, 149, 10, 1, hx("#fff8e8")); rect(pb, FX - 1, 145, 1, 5, hx("#1a0e08"));
  const fh = 15 + fl * 2 + (t > C.prod1 - 0.3 && t < C.prod1 + 0.2 ? 3 : 0);
  for (let y = 0; y < fh; y++) { const k = y / fh, w = Math.sin(Math.PI * Math.pow(1 - k, 0.8)) * (4.2 + fl * 0.4) * (1 - k * 0.3), sway = Math.sin(t * 6 + y * 0.3) * k * 1.4; for (let x = -Math.ceil(w); x <= Math.ceil(w); x++) { const u = Math.abs(x) / Math.max(0.5, w); if (u > 1) continue; const zone = u < 0.35 && k < 0.55 ? (k < 0.12 ? hx("#6a8aff") : hx("#fffbe8")) : u < 0.7 ? hx("#ffd05a") : hx("#ff8a2a"); pb.set(FX + x + sway, 145 - y, zone); } }
  glowD(pb, FX, 138, 46 + fl * 3, hx("#ffb060"), 0.55); glowD(pb, FX, 138, 14, hx("#fff0c0"), 0.6);
  // motes in the light
  const mr = rng(12); for (let i = 0; i < 30; i++) { const bx = FX - 70 + mr() * 140, by = 60 + mr() * 110, sp = 0.3 + mr(), x = bx + Math.sin(t * 0.4 * sp + i) * 5, y = by - ((t * 3 * sp) % 18), l = I(x, y); if (l > 0.25 && ((i + Math.floor(t * 4)) % 3)) pb.mix(x, y, hx("#ffe0b0"), l * 0.8); }
  // the photon: born at "produces light", hovers, then out through the glass
  if (t > C.prod1) {
    const p = Math.min(1, (t - C.prod1) / 0.25), zip = Math.pow(Math.max(0, Math.min(1, (t - 2.55) / 0.55)), 2.2);
    const hx0 = FX + 2, hy0 = 124 - 8 * easeOut(Math.min(1, (t - C.prod1) / 0.5)) + Math.sin(t * 5) * 1.2, x = lerp(hx0, WX + 118, zip), y = lerp(hy0, WY + 34, zip) - Math.sin(zip * Math.PI) * 26;
    photon(pb, x, y, hx("#ffb45a"), hx("#fffbe8"), { r: 2.7 * p, a: p, streak: Math.round(18 * Math.sin(zip * Math.PI)) });
    if (t > 3.05 && t < 3.6) glowD(pb, WX + 118, WY + 34, 26, hx("#fff0d0"), 1 - (t - 3.05) / 0.55);
  }
};

// ================================================================ SPACE: warp, quasar, gamma-ray burst (3.6 - 19.2)
const SF = makeStars(401, 520, AW, AH), SN = makeStars(402, 60, AW, AH);
const WARP = (() => { const r = rng(403); return Array.from({ length: 160 }, () => ({ a: r() * 6.283, d: r(), s: 0.6 + r() })); })();
const DEBRIS = (() => { const r = rng(404); return Array.from({ length: 70 }, () => ({ a: r() * 6.283, v: 30 + r() * 120, c: r() > 0.5 ? hx("#d8e8ff") : hx("#c0a0ff") })); })();
const sSpace = (pb: PB, t: number) => {
  const pan = 420 * ease(rampT(t, 9.0, 1.3)), sh = t > C.unleash && t < C.unleash + 1 ? Math.round(Math.sin(t * 70) * 2 * (1 - (t - C.unleash))) : 0;
  skyGradient(pb, SPACE);
  stars(pb, SF, t, pan * 0.4, 1);
  nebula(pb, NEB, -0.28, 200, 60, pan * 0.6 + 140, 5, 0.9);
  stars(pb, SN, t, pan, 1);
  // warp in: streaks from the centre as we fly out
  const wk = win(t, 3.45, 4.9, 0.25, 0.6); if (wk > 0) for (const s of WARP) { const d0 = ((s.d + t * 1.4 * s.s) % 1), r0 = 10 + d0 * d0 * 300, r1 = r0 + 6 + d0 * 40 * wk; lineP(pb, 240 + Math.cos(s.a) * r0, 135 + Math.sin(s.a) * r0 * 0.6, 240 + Math.cos(s.a) * r1, 135 + Math.sin(s.a) * r1 * 0.6, hx("#cfe0ff"), 0.7 * wk * d0); }
  // the cosmic edge: a mottled glow at the far right
  const ea = rampT(t, C.edge, 1.4) * (1 - rampT(t, 9.3, 1.0)); if (ea > 0) for (let y = 0; y < AH; y++) for (let x = 330; x < AW; x++) { const X = x + pan * 0.9, d = Math.hypot(X - 60, (y - 135) * 1.15) - 360 - (fbm(y * 0.04, 1, 19) - 0.5) * 18; if (d <= 0) continue; const e = Math.min(1, d / 70), v = e * (0.35 + fbm(X * 0.06, y * 0.06, 13) * 0.75) * ea, a = (0.25 + 0.45 * e) * ea; if (v > 0.1 + bay(x, y) * 0.12) pb.mix(x, y, q(CMB, Math.min(1, v), x, y), a); if (d < 2.5) pb.mix(x, y, hx("#ffb070"), 0.6 * ea); }
  // the quasar
  const qx = 240 - pan, qy = 132, qk = easeOut(rampT(t, C.quasar - 0.4, 1.4));
  if (qk > 0 && qx > -140) {
    for (let y = -46; y <= 46; y++) for (let x = -130; x <= 130; x++) { const u = x / (120 * qk), v = y / (34 * qk), d2 = u * u + v * v; if (d2 > 1) continue; const ang = Math.atan2(v, u), rr = Math.sqrt(d2), arm = 0.5 + 0.5 * Math.sin(ang * 2 - rr * 9 + t * 0.4), n = fbm((x + 400) * 0.04, (y + 300) * 0.08, 17), val = (1 - rr) * (0.55 + 0.35 * arm * n) + 0.05; if (val > 0.12 + bay(qx + x, qy + y) * 0.08) pb.set(qx + x, qy + y, q(GAL, Math.min(1, val * 1.25), qx + x, qy + y)); }
    for (let y = -7; y <= 7; y++) for (let x = -34; x <= 34; x++) { const u = x / (32 * qk), v = y / (6 * qk), d = Math.hypot(u, v); if (d > 1 || qk < 0.2) continue; const band = 0.5 + 0.5 * Math.sin(d * 16 - t * 3); pb.set(qx + x, qy + y, q(GAL, Math.min(1, 0.55 + (1 - d) * 0.5 + band * 0.12), qx + x, qy + y)); }
    for (const dir of [-1, 1]) { const J = 130 * qk; for (let i = 0; i < J; i++) { const k = 1 - i / J, yy = qy + dir * (6 + i); pb.mix(qx, yy, hx("#e8f0ff"), 0.9 * k + 0.1); pb.mix(qx - 1, yy, hx("#8aa8ff"), 0.6 * k); pb.mix(qx + 1, yy, hx("#8aa8ff"), 0.6 * k); } for (let kx = 0; kx < 4; kx++) { const qq = (t * 0.35 + kx / 4 + (dir > 0 ? 0.13 : 0)) % 1; disc(pb, qx + 0.5, qy + dir * (8 + qq * (J - 10)), 1.6 * (1 - qq) + 0.6, WHITE, 1 - qq); } }
    glowD(pb, qx, qy, 34 * qk, hx("#e0d0ff"), 0.9); disc(pb, qx + 0.5, qy + 0.5, 2.5 * qk + 0.5, WHITE);
  }
  if (t > C.prod2 && t < 9.6) { const k = (t - C.prod2) / 2, x = qx - 30 - k * 190, y = qy + 18 + k * 50; photon(pb, x, y, hx("#8ab8ff"), hx("#f0f8ff"), { r: 2, streak: 16, a: Math.min(1, (t - C.prod2) * 4) }); }
  // the blue supergiant: collapse, flash, jets, shell
  const sx = 240 + 420 - pan + sh, sy = 138;
  if (t > 8.8) {
    const cc = Math.pow(Math.max(0, Math.min(1, (t - C.collapse) / 1.7)), 2.6), wob = t > C.collapse && t < C.unleash ? Math.sin(t * 40) * 1.5 * (1 - cc) : 0;
    if (t < C.unleash) {
      const R = Math.max(2.5, (46 + Math.sin(t * 2) + wob) * (1 - cc) + 2.5 * cc);
      glowD(pb, sx, sy, R * 1.9, hx("#6aa8ff"), 0.55 * (1 - cc * 0.5));
      for (let y = Math.floor(sy - R); y <= sy + R; y++) for (let x = Math.floor(sx - R); x <= sx + R; x++) { const dd = Math.hypot(x + 0.5 - sx, y + 0.5 - sy) / R; if (dd > 1) continue; const gran = fbm((x - sx) * 0.22 + t * 0.6, (y - sy) * 0.22, 23) - 0.5, v = 0.42 + 0.5 * Math.sqrt(1 - dd * dd) + gran * 0.35 + cc * 0.4; pb.set(x, y, q(BSG, Math.max(0, Math.min(1, v)), x, y)); }
      if (R > 10) { const gr = rng(7); for (let i = 0; i < 28; i++) { const a = gr() * 6.28 + t * 0.1, d = Math.sqrt(gr()) * R * 0.9; pb.mix(sx + Math.cos(a) * d, sy + Math.sin(a) * d, hx("#eaf8ff"), 0.35 + 0.3 * Math.sin(t * 5 + i)); } }
      if (cc > 0.05) for (let i = 0; i < 40; i++) { const a = i * 0.157 + t, d = R + 20 * (1 - ((t * 1.5 + i * 0.37) % 1)); pb.mix(sx + Math.cos(a) * d, sy + Math.sin(a) * d, hx("#bfe0ff"), 0.6 * cc); }
    } else {
      const dt = t - C.unleash;
      if (dt < 3) { const rr = dt * 120, a = Math.max(0, 1 - dt / 3); for (let k = 0; k < 360; k++) { const an = (k / 360) * 6.283, j = fbm(k * 0.1, dt * 2, 3) * 8; for (const w of [0, 1]) pb.mix(sx + Math.cos(an) * (rr + j + w), sy + Math.sin(an) * (rr + j + w) * 0.85, k % 3 ? hx("#c8b0ff") : hx("#ffb070"), a * (w ? 0.4 : 0.8)); } }
      for (const d of DEBRIS) { if (dt > 3) break; const k = d.v * dt * (1 - dt * 0.15); pb.mix(sx + Math.cos(d.a) * k, sy + Math.sin(d.a) * k * 0.85, d.c, Math.max(0, 1 - dt / 3)); }
      const L = Math.min(260, dt * 700), f = 0.5 + 0.5 * Math.sin(t * 37);
      for (const dir of [-1, 1]) for (let i = 0; i < L; i++) { const yy = sy + dir * i, w = 3 + f; for (let x = -Math.ceil(w); x <= Math.ceil(w); x++) { const u = Math.abs(x) / w; if (u > 1) continue; pb.mix(sx + x, yy, u < 0.35 ? WHITE : hx("#b490ff"), u < 0.35 ? 1 : 0.55); } }
      for (const dir of [-1, 1]) for (let k2 = 0; k2 < 5; k2++) { const qq = (t * 0.8 + k2 / 5 + (dir > 0 ? 0.1 : 0)) % 1; disc(pb, sx + 0.5, sy + dir * qq * L, 3 * (1 - qq) + 1, WHITE, 1 - qq); }
      glowD(pb, sx, sy, 40, hx("#d8c8ff"), 0.9); disc(pb, sx + 0.5, sy + 0.5, 3.5, WHITE);
    }
  }
  // "...produces light": a violet photon tumbles out of the jet
  if (t > C.prod3) { const k = easeOut(Math.min(1, (t - C.prod3) / 0.9)), x = lerp(sx, sx - 70, k), y = lerp(sy - 60, sy + 20, k); photon(pb, x, y, hx("#b080ff"), hx("#f4ecff"), { r: 2.2, a: Math.min(1, (t - C.prod3) * 5) }); }
  // the flash (fades, never a hard cut)
  if (t > C.unleash && t < C.unleash + 1) { const a = 0.9 * Math.exp(-(t - C.unleash) * 4.5); for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) pb.mix(x, y, [248, 244, 255], a); }
  // the energy panel: the burst's bar overflows its box, the Sun's bar crawls
  const pa = win(t, C.seconds - 0.2, 18.2, 0.3, 0.4);
  if (pa > 0) {
    const X = 18, Y = 196, Wd = 210, Hd = 58;
    for (let y = Y; y < Y + Hd; y++) for (let x = X; x < X + Wd; x++) pb.mix(x, y, hx("#070618"), 0.82 * pa);
    rect(pb, X, Y, Wd, 1, hx("#4a4480"), pa); rect(pb, X, Y + Hd - 1, Wd, 1, hx("#4a4480"), pa); rect(pb, X, Y, 1, Hd, hx("#4a4480"), pa); rect(pb, X + Wd - 1, Y, 1, Hd, hx("#4a4480"), pa);
    // burst icon + bar
    for (let k = 0; k < 8; k++) { const a = (k / 8) * 6.283; lineP(pb, X + 12, Y + 18, X + 12 + Math.cos(a) * 5, Y + 18 + Math.sin(a) * 5, hx("#c4a0ff"), pa); } pb.set(X + 12, Y + 18, WHITE);
    const b1 = easeOut(rampT(t, C.seconds, 0.45)) * 420; rect(pb, X + 24, Y + 15, Math.min(b1, AW - X - 24), 6, hx("#9a70ff"), pa); rect(pb, X + 24, Y + 15, Math.min(b1, AW - X - 24), 1, hx("#e0d0ff"), pa);
    if (t > C.sun - 0.1) {
      planet(pb, X + 12, Y + 42, 5, { kind: "rock", ramp: SUNR, seed: 5, rot: t });
      const b2 = 4 + Math.max(0, t - C.sun) * 3.2; rect(pb, X + 24, Y + 39, b2, 6, hx("#f2b43a"), pa); rect(pb, X + 24, Y + 39, b2, 1, hx("#fff0b0"), pa);
    }
  }
};

// ================================================================ THE SPECTRUM: four lanes, one speed (18.4 - 30)
const LANE = [{ y: 96, col: hx("#ff8a5a"), core: hx("#fff0e0"), lam: 38, amp: 5, cue: C.calm, name: "CALM" }, { y: 136, col: hx("#b070ff"), core: hx("#f8f0ff"), lam: 11, amp: 4, cue: C.violent, name: "VIOLENT" }, { y: 176, col: hx("#60d8ff"), core: hx("#e8fbff"), lam: 18, amp: 3, cue: C.faint, name: "FAINT" }, { y: 216, col: hx("#e8f0ff"), core: WHITE, lam: 4.5, amp: 3, cue: C.energetic, name: "ENERGETIC" }];
const NUCL = [[0, 0, 1], [4, -2, 0], [-4, -2, 1], [3, 3, 0], [-3, 3, 1], [0, -5, 0], [0, 5, 1]];
const PROT = ramp("#5a0c1c", "#a01e2e", "#e0404a", "#ff9a9a"), NEUT = ramp("#0c2a5a", "#1e4ea0", "#4a86e0", "#b4d4ff");
const SL = makeStars(501, 260, AW, AH);
const sLanes = (pb: PB, t: number) => {
  const run = Math.max(0, t - C.every), px0 = 150 + run * 6; // everyone together, one pace
  skyGradient(pb, SPACE); stars(pb, SL, t, run * 40, 0.3);
  LANE.forEach((L, i) => {
    const hl = win(t, L.cue, L.cue + (i === 3 ? 3 : i === 2 ? 3.3 : 1.1), 0.15, 0.4), la = rampT(t, 18.9 + i * 0.12, 0.4);
    for (let x = 0; x < AW; x++) { const dash = (((x + run * 90) % 14) + 14) % 14 < 7; if (dash) pb.mix(x, L.y + 12, L.col, (0.12 + 0.25 * hl) * la); }
    if (hl > 0) for (let y = L.y - 11; y <= L.y + 11; y++) for (let x = 0; x < AW; x++) if (((x + y) & 3) === 0) pb.mix(x, y, L.col, 0.08 * hl);
  });
  // the faint one's detector, the energetic one's nucleus
  const dA = win(t, C.faint + 0.3, 30.5, 0.4, 0.3); if (dA > 0) { const dx = 330, dy = 170; rect(pb, dx, dy, 22, 14, hx("#1a1a2e"), dA); rect(pb, dx, dy, 22, 1, hx("#4a4a6a"), dA); rect(pb, dx + 3, dy + 3, 16, 8, hx("#07160e"), dA); const blip = t > C.measured && t < C.measured + 0.6; for (let x = 0; x < 16; x++) pb.mix(dx + 3 + x, dy + 7 - (blip && x > 6 && x < 10 ? 3 : 0), hx(blip ? "#8affb0" : "#2a6a44"), dA); if (blip) glowD(pb, dx + 11, dy + 6, 14, hx("#8affb0"), 0.7); }
  // the nucleus sits in the energetic lane and scrolls toward the photon with the lane (the photons never change pace)
  const hitX = 150 + (C.shatter - C.every) * 6 + 4, NX = hitX + (C.shatter - t) * 60;
  const nA = rampT(t, C.energetic - 0.3, 0.4), burst = Math.max(0, t - C.shatter); if (nA > 0) NUCL.forEach(([ox, oy, p], i) => { const a = Math.atan2(oy || 0.3, ox || (i % 2 ? 1 : -1)), d = 60 * easeOut(Math.min(1, burst / 1.2)), al = nA * (1 - Math.min(1, burst / 1.6)); if (al <= 0) return; const x = NX + ox + Math.cos(a) * d, y = 216 + oy + Math.sin(a) * d; if (al > 0.5) planet(pb, x, y, 2.6, { kind: "rock", ramp: p ? PROT : NEUT, seed: i, rot: 0 }); else disc(pb, x, y, 2.4, p ? hx("#e0404a") : hx("#4a86e0"), al * 2); });
  if (burst > 0 && burst < 0.6) glowD(pb, NX, 216, 30, WHITE, 1 - burst / 0.6);
  // the photons: identical x, different natures
  LANE.forEach((L, i) => {
    const ap = easeOut(rampT(t, 19.1 + i * 0.15, 0.5)); if (ap <= 0) return;
    const energetic = i === 3, x = lerp(-10, px0, ap);
    let y = L.y, a = 1;
    if (i === 1) { const j = win(t, C.violent, C.violent + 1.3, 0.05, 0.3); y += Math.round(Math.sin(t * 91) * j); if (j > 0) { const k0 = Math.floor(t * 12); for (let s = 0; s < 4; s++) { const an = (k0 * 1.7 + s * 1.57) % 6.283; lineP(pb, x + Math.cos(an) * 5, y + Math.sin(an) * 5, x + Math.cos(an) * 10, y + Math.sin(an) * 10, hx("#e0c8ff"), 0.9 * j); } } }
    if (i === 2) a = 0.28 + 0.12 * Math.sin(t * 7) + (t > C.measured && t < C.measured + 0.5 ? 0.35 : 0);
    photon(pb, x, y, L.col, L.core, { lam: L.lam, amp: L.amp, len: Math.min(140, x + 4), ph: -t * 30, a: a * ap, r: energetic ? 3 : 2.8 });
  });
};

// ================================================================ compositing: dissolves on a Bayer matrix, pixel HUD, 4x blow-up
const dissolve = (a: PB, b: PB, k: number) => { if (k <= 0) return; for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) { const th = (bay(x, y) + 0.47) + (bay(x >> 2, y >> 2) + 0.47) / 16; if (k >= 1 || th < k) { const i = (y * AW + x) * 4; a.data[i] = b.data[i]; a.data[i + 1] = b.data[i + 1]; a.data[i + 2] = b.data[i + 2]; a.data[i + 3] = 255; } } };
const draw = (ctx: Ctx, frame: number, env: Env) => {
  const t = frame / FPS, A = new PB(AW, AH);
  if (t < 3.95) sKitchen(A, t);
  if (t > 3.3 && t < 19.3) { const B = new PB(AW, AH); sSpace(B, t); dissolve(A, B, t < 3.95 ? rampT(t, 3.3, 0.6) : 1); }
  if (t > 18.4) { const B = new PB(AW, AH); sLanes(B, t); dissolve(A, B, rampT(t, 18.4, 0.8)); }
  const Lw = cached(env, "cpLow", () => env.canvas(AW, AH)), lc = Lw.ctx;
  lc.setTransform(1, 0, 0, 1, 0, 0); lc.putImageData(new ImageData(A.data, AW, AH), 0, 0);
  // HUD: a soft band, the section label, the typed line with a block cursor
  let hudA = 0; const typed: [string, number, number, string][] = [];
  for (const [a, b, s] of LABELS) if (t > a - 0.05 && t < b + 0.3) { const o = 1 - rampT(t, b, 0.3); hudA = Math.max(hudA, o); typed.push([s, rampT(t, a, 0.7), 14, "#8a94c0"]); }
  for (const [a, b, s, row, dur] of LINES) if (t > a - 0.05 && t < b + 0.3) { const o = 1 - rampT(t, b, 0.3); if (o <= 0) continue; hudA = Math.max(hudA, o); typed.push([s, rampT(t, a, dur), row ? 36 : 25, "#f4ecd8"]); }
  if (hudA > 0) { const g = lc.createLinearGradient(0, 0, 200, 0); g.addColorStop(0, `rgba(4,3,14,${(0.5 * hudA).toFixed(3)})`); g.addColorStop(1, "rgba(4,3,14,0)"); lc.fillStyle = g; lc.fillRect(0, 8, 200, 40); }
  for (const [s, p, y, col] of typed) { if (p <= 0) continue; const n = Math.ceil(p * s.length); pixText(lc, s, 16, y, 1, col, { shadow: "#05040f", n }); if (p < 1 && Math.floor(t * 6) % 2 === 0) { lc.fillStyle = col; lc.fillRect(16 + pixTextW(s.slice(0, n), 1) + 1, y, 5, 7); } }
  // lane names (pixel font, on the art grid)
  if (t > 19.0) LANE.forEach((L) => { const p = rampT(t, L.cue, 0.4); if (p > 0) pixText(lc, L.name, 16, L.y - 20, 1, `rgb(${L.col.join(",")})`, { shadow: "#05040f", n: Math.ceil(p * L.name.length) }); });
  const pa = win(t, C.seconds - 0.2, 18.2, 0.3, 0.4);
  if (pa > 0) { lc.globalAlpha = pa; pixText(lc, "BURST: SECONDS", 42, 202, 1, "#c4a8ff", { shadow: "#05040f", n: Math.ceil(rampT(t, C.seconds, 0.6) * 14) }); if (t > C.sun) pixText(lc, "SUN: 10 BILLION YEARS", 42, 226, 1, "#ffd27a", { shadow: "#05040f", n: Math.ceil(rampT(t, C.sun, 1.2) * 21) }); lc.globalAlpha = 1; }
  if (t > C.measured && t < C.measured + 2.2) pixText(lc, "1 PHOTON", 330, 158, 1, "#8affb0", { shadow: "#05040f", n: Math.ceil(rampT(t, C.measured, 0.4) * 8) });
  // blow up 4x (crisp), a whisper of bloom, vignette, fades
  const s = env.scale; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(Lw.canvas as CanvasImageSource, 0, 0, AW, AH, 0, 0, Math.round(W * s), Math.round(H * s));
  const B = cached(env, "cpBloom", () => env.canvas(AW / 8, AH / 8)); B.ctx.setTransform(1, 0, 0, 1, 0, 0); B.ctx.imageSmoothingEnabled = true; B.ctx.clearRect(0, 0, AW / 8, AH / 8); B.ctx.drawImage(Lw.canvas as CanvasImageSource, 0, 0, AW / 8, AH / 8);
  ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.18; ctx.imageSmoothingEnabled = true; ctx.drawImage(B.canvas as CanvasImageSource, 0, 0, Math.round(W * s), Math.round(H * s)); ctx.restore();
  ctx.save(); ctx.setTransform(s, 0, 0, s, 0, 0); const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.38, W / 2, H / 2, W * 0.7); vg.addColorStop(0, "rgba(3,2,12,0)"); vg.addColorStop(1, "rgba(3,2,12,0.5)"); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  const fd = Math.max(1 - rampT(t, 0, 0.5), rampT(t, T_END - 0.7, 0.65)); if (fd > 0) { ctx.fillStyle = `rgba(0,0,0,${fd.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
  ctx.restore();
};

export const candlePix: Film = {
  meta: { title: "candlePix", W, H, fps: FPS, bpm: 120, durationFrames: DUR },
  assets: { images: {} },
  shots: [{ id: "candlePix", start: 0, end: DUR, draw }],
};
