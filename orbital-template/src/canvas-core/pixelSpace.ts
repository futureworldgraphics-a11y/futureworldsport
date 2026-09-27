import { type Ctx, type Env } from "./core";
import { Film } from "./film";
import { cached, ease, ramp as rampT } from "./spaceStyle";
import { pixText } from "./pixelKit";
import { PB, ramp, planet, ring, skyGradient, nebula, makeStars, stars, sprite, comet, hex, type Planet } from "./pixelArt";

// PIXEL SPACE (demo, 10 s, silent) · illustration-grade pixel art at 480x270 blown up 4x: a slow camera
// drift across the outer system. Gas giant with bands and a storm, a cratered ice moon rim-lit from
// behind, a ringed planet, small worlds, a nebula band, sparkle stars, a satellite and a comet.

const W = 1920, H = 1080, AW = 480, AH = 270, K = 4, FPS = 30, DUR = 300;
const BG = ramp("#050414", "#08071d", "#0c0a27", "#110e31");
const NEB = ramp("#141238", "#1d1b4e", "#2a2768", "#3b3784", "#524aa2", "#7166c0");
const NEB2 = ramp("#1e0f2e", "#351846", "#52205e", "#7a2c72");
const GAS = ramp("#240a24", "#4e1228", "#822026", "#b8361e", "#dc5a1c", "#f08a26", "#f8b640", "#fde07a", "#fff4c2");
const ICE = ramp("#050a24", "#0a1640", "#10245e", "#16387e", "#1e509e", "#2a70bc", "#4494d6", "#72bce8", "#b4e2f6");
const PUR = ramp("#150a2a", "#2c1650", "#4a2a7a", "#6c46a2", "#9270c4", "#bca0e2", "#e8d8f8");
const RED = ramp("#22061a", "#4c0e22", "#86181e", "#c0341c", "#e8642c", "#ffa25a");
const TEAL = ramp("#081630", "#0e305a", "#16548a", "#227eb6", "#46acda", "#96e0f6");
const RINGR = ramp("#2a1c46", "#4c3a70", "#7a66a0", "#b0a0cc", "#e0d8f0");
const COMET = ramp("#1a3a6a", "#3a78b8", "#8ad0f0", "#e8f8ff");
const SAT = ["..bb.....bb..", "..bb.....bb..", "..bbwwwwwbb..", "..bb.gyg.bb..", "..bbwwwwwbb..", "..bb.....bb..", "..bb.....bb.."];
const SATP = { b: hex("#3a5ab0"), w: hex("#c8d0e0"), g: hex("#8a90a0"), y: hex("#ffd060") };

const S_FAR = makeStars(11, 420, AW, AH), S_NEAR = makeStars(12, 70, AW, AH);
const gas: Planet = { kind: "gas", ramp: GAS, seed: 21, rot: 0, bands: 8, storm: [0.5, -0.32, 0.16], rim: hex("#ff9a70") };
const moon: Planet = { kind: "ice", ramp: ICE, seed: 31, rot: 0, craters: 90, rim: hex("#7ae6ff") };
const ringed: Planet = { kind: "gas", ramp: PUR, seed: 41, rot: 0, bands: 5, tilt: -0.35 };
const red: Planet = { kind: "rock", ramp: RED, seed: 51, rot: 0 };
const teal: Planet = { kind: "rock", ramp: TEAL, seed: 61, rot: 0, rim: hex("#bff4ff") };

const draw = (ctx: Ctx, frame: number, env: Env) => {
  const t = frame / FPS, cam = 22 * ease(rampT(t, 0, DUR / FPS)); // slow drift to the right
  const pb = new PB(AW, AH);
  skyGradient(pb, BG);
  stars(pb, S_FAR, t, cam, 0.3);
  nebula(pb, NEB2, -0.42, 250, 70, cam * 0.5 + 300, 7, 0.8);
  nebula(pb, NEB, -0.5, 215, 46, cam * 0.6, 3);
  stars(pb, S_NEAR, t, cam, 0.8);
  // distant worlds
  planet(pb, 205 - cam * 0.7, 58, 9, { ...red, rot: t * 0.25 });
  ring(pb, 392 - cam * 0.8, 56, 20, RINGR, "back", 0.3); planet(pb, 392 - cam * 0.8, 56, 20, { ...ringed, rot: t * 0.3 }); ring(pb, 392 - cam * 0.8, 56, 20, RINGR, "front", 0.3);
  planet(pb, 318 - cam * 0.9, 172, 12, { ...teal, rot: t * 0.35 });
  // satellite drifting over the top
  sprite(pb, SAT, SATP, Math.round(250 + t * 4.5 - cam), Math.round(22 + Math.sin(t * 0.8) * 1.5));
  // comet crossing
  if (t > 3 && t < 9.5) { const k = (t - 3) / 6.5; comet(pb, Math.round(470 - k * 260 - cam), Math.round(20 + k * 60), -1, 0.23, 34, COMET); }
  // the gas giant, and the big ice moon in the corner
  planet(pb, 118 - cam, 150, 64, { ...gas, rot: t * 0.12 });
  planet(pb, 452 - cam * 1.25, 318, 150, { ...moon, rot: 0.5 + t * 0.03 });
  // HUD in the pixel font, on the art grid
  const L = cached(env, "psLow", () => env.canvas(AW, AH)), lc = L.ctx;
  lc.setTransform(1, 0, 0, 1, 0, 0); lc.putImageData(new ImageData(pb.data, AW, AH), 0, 0);
  const p1 = rampT(t, 0.8, 0.6), p2 = rampT(t, 1.6, 1.0);
  if (p1 > 0) pixText(lc, "THE OUTER SYSTEM", 16, 14, 1, "#8ab0e0", { shadow: "#050414", n: Math.ceil(p1 * 16) });
  if (p2 > 0) pixText(lc, "GAS GIANTS & ICE MOONS", 16, 25, 1, "#f4ecd8", { shadow: "#050414", n: Math.ceil(p2 * 22) });
  // blow up 4x, crisp; a whisper of bloom and a vignette for the cinematic finish
  const s = env.scale; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(L.canvas as CanvasImageSource, 0, 0, AW, AH, 0, 0, Math.round(W * s), Math.round(H * s));
  ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.16; ctx.imageSmoothingEnabled = true;
  const B = cached(env, "psBloom", () => env.canvas(AW / 8, AH / 8)); B.ctx.setTransform(1, 0, 0, 1, 0, 0); B.ctx.imageSmoothingEnabled = true; B.ctx.clearRect(0, 0, AW / 8, AH / 8); B.ctx.drawImage(L.canvas as CanvasImageSource, 0, 0, AW / 8, AH / 8);
  ctx.drawImage(B.canvas as CanvasImageSource, 0, 0, Math.round(W * s), Math.round(H * s)); ctx.restore();
  ctx.save(); ctx.setTransform(s, 0, 0, s, 0, 0); const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.7); vg.addColorStop(0, "rgba(3,2,12,0)"); vg.addColorStop(1, "rgba(3,2,12,0.45)"); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  const fade = Math.max(1 - rampT(t, 0, 0.5), rampT(t, DUR / FPS - 0.5, 0.5)); if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${fade.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
  ctx.restore();
};

export const pixelSpace: Film = {
  meta: { title: "pixelSpace", W, H, fps: FPS, bpm: 120, durationFrames: DUR },
  assets: { images: {} },
  shots: [{ id: "pixelSpace", start: 0, end: DUR, draw }],
};
void K;
