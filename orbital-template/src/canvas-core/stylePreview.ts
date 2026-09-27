import { Gfx, type Ctx, type Env, type Medium, type P } from "./core";
import { Film } from "./film";
import { letter } from "./drafting";
import { drawStorybook } from "./storybook";
import { drawPrint } from "./print";

// STYLE PREVIEW (scratch): the two character media side by side, and a blueprint / cyanotype test
// plate built from engine parts no film uses yet (white ink blooming on blue, cyanotype mottle,
// the draftsman's lettering).

const W = 1920, H = 1080;
const RULING: Medium = { nib: 1.1, taper: 0.15, pressure: 0.15, retrace: false, wobble: 0.35, rough: 0.35 };
const INKW = "#f2f7ff";

const drawChars = (ctx: Ctx, frame: number, env: Env) => {
  const s = env.scale; ctx.setTransform(s, 0, 0, s, 0, 0); ctx.fillStyle = "#eee8dc"; ctx.fillRect(0, 0, W, H);
  const sub: Env = { W: 560, H: 560, scale: s, cache: env.cache, canvas: env.canvas, image: env.image }, L = env.canvas(Math.round(560 * s), Math.round(560 * s));
  const g = new Gfx(ctx, env, frame, RULING);
  [[drawStorybook, 90, "STORYBOOK: PENCIL & WATERCOLOUR"], [drawPrint, 1010, "RISOGRAPH PRINT"]].forEach(([fn, x, label]) => {
    L.ctx.setTransform(1, 0, 0, 1, 0, 0); L.ctx.clearRect(0, 0, L.canvas.width, L.canvas.height);
    (fn as typeof drawStorybook)(L.ctx, frame, sub);
    ctx.setTransform(s, 0, 0, s, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(L.canvas as CanvasImageSource, 0, 0, L.canvas.width, L.canvas.height, x as number, 70, 820, 820);
    letter(g, label as string, x as number, 930, { cap: 30, color: "#2a2521", w: 2.6 });
  });
};

const drawBlueprint = (ctx: Ctx, frame: number, env: Env) => {
  const s = env.scale; ctx.setTransform(s, 0, 0, s, 0, 0);
  const bg = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, W * 0.7); bg.addColorStop(0, "#2a62a8"); bg.addColorStop(1, "#163c72");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const g = new Gfx(ctx, env, frame, RULING);
  // the sheet's grid
  ctx.strokeStyle = "rgba(220,235,255,0.10)"; ctx.lineWidth = 1;
  for (let x = 60; x < W - 40; x += 40) { ctx.beginPath(); ctx.moveTo(x, 60); ctx.lineTo(x, H - 60); ctx.stroke(); }
  for (let y = 60; y < H - 40; y += 40) { ctx.beginPath(); ctx.moveTo(60, y); ctx.lineTo(W - 60, y); ctx.stroke(); }
  const pen = (pts: P[], w = 2.4, seed = 1, o: { closed?: boolean; opacity?: number } = {}) => g.pen(pts, { w, color: INKW, seed, wobble: 0.5, boil: 0.3, taper: 0.2, closed: o.closed, opacity: o.opacity ?? 0.95 });
  const arrow = (x: number, y: number, dir: number, sz = 16) => { pen([[x - dir * sz, y - sz * 0.5], [x, y]], 2.4, 90 + x); pen([[x - dir * sz, y + sz * 0.5], [x, y]], 2.4, 91 + x); };
  const box = (x0: number, y0: number, x1: number, y1: number, w: number, seed: number) => { pen([[x0, y0], [x1, y0]], w, seed); pen([[x1, y0], [x1, y1]], w, seed + 1); pen([[x1, y1], [x0, y1]], w, seed + 2); pen([[x0, y1], [x0, y0]], w, seed + 3); };
  const wave = (x0: number, x1: number, y: number, lambda: number, amp: number, seed: number) => { const pts: P[] = []; for (let x = x0; x <= x1; x += Math.max(3, lambda / 10)) pts.push([x, y + Math.sin(((x - x0) / lambda) * Math.PI * 2) * amp]); pen(pts, 3, seed); };
  g.inkGroup(() => {
    // border and title block
    box(50, 50, W - 50, H - 50, 3.2, 2); box(64, 64, W - 64, H - 64, 1.4, 3);
    pen([[1380, 880], [W - 64, 880]], 2, 4); pen([[1380, 880], [1380, H - 64]], 2, 5); pen([[1380, 960], [W - 64, 960]], 1.4, 6);
    letter(g, "SPEED OF LIGHT", 1406, 900, { cap: 38, color: INKW, w: 3 });
    letter(g, "SHEET 1 OF 1  /  SCALE: NONE", 1406, 982, { cap: 20, color: INKW, w: 2 });
    // the candle
    box(210, 520, 290, 700, 3, 10); pen([[250, 520], [250, 500]], 2.4, 11);
    pen([[250, 500], [228, 470], [236, 430], [250, 400], [264, 430], [272, 470]], 3, 12, { closed: true });
    letter(g, "CANDLE", 190, 730, { cap: 24, color: INKW, w: 2.2 });
    // the gamma-ray burst
    pen(Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * Math.PI * 2; return [250 + Math.cos(a) * 46, 300 + Math.sin(a) * 46] as P; }), 3, 20, { closed: true });
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; pen([[250 + Math.cos(a) * 60, 300 + Math.sin(a) * 60], [250 + Math.cos(a) * 96, 300 + Math.sin(a) * 96]], 2.2, 30 + k); }
    letter(g, "GAMMA-RAY BURST", 150, 170, { cap: 24, color: INKW, w: 2.2 });
    // two photons: wildly different wavelengths, the same distance in the same second
    wave(330, 1500, 300, 36, 26, 40); arrow(1512, 300, 1);
    wave(330, 1500, 470, 180, 40, 41); arrow(1512, 470, 1);
    letter(g, "WAVELENGTH 0.000 000 000 001 M", 560, 222, { cap: 20, color: INKW, w: 2 });
    letter(g, "WAVELENGTH 0.000 0006 M", 560, 540, { cap: 20, color: INKW, w: 2 });
    // the finish line and the dimension that matters
    pen([[1540, 200], [1540, 620]], 2, 50, { opacity: 0.8 }); letter(g, "AFTER 1 SECOND", 1470, 640, { cap: 20, color: INKW, w: 2 });
    pen([[330, 700], [1540, 700]], 2, 60); arrow(330, 700, -1, 20); arrow(1540, 700, 1, 20); pen([[330, 680], [330, 720]], 2, 61); pen([[1540, 680], [1540, 720]], 2, 62);
    letter(g, "299,792,458 M", 760, 740, { cap: 44, color: INKW, w: 3.4 });
    // the callout
    pen([[1120, 380], [1280, 380], [1340, 420]], 1.8, 70); letter(g, "SAME SPEED", 1140, 340, { cap: 28, color: INKW, w: 2.6 });
  }, { blur: 2.2, alpha: 0.35, textures: ["draftTooth"] });
  g.paper("blueMottle", 0.35);
  g.vignette("rgba(8,24,60,0.45)");
};

export const stylePreview: Film = {
  meta: { title: "stylePreview", W, H, fps: 30, bpm: 120, durationFrames: 30 },
  assets: { images: {} },
  shots: [{ id: "chars", start: 0, end: 15, draw: (c, f, e) => drawChars(c, f, e) }, { id: "blueprint", start: 15, end: 30, draw: (c, f, e) => drawBlueprint(c, f, e) }],
};
