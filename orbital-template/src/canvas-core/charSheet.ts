import { Gfx, type Ctx, type Env } from "./core";
import { Film } from "./film";
import { letter, width } from "./drafting";
import { FLAT } from "./spaceStyle";
import { CAST, drawChar, type Pose } from "./pixelChars";

// CHARACTER SHEET · the locked pixel-character style: each of the cast large (7x) with two smaller
// poses (3x), then a line-up of action poses (4x). Grey card background like a sprite turnaround.

const W = 1920, H = 1080;
const COLS: [string, string, Pose, Pose, Pose, Pose][] = [
  ["doctor", "DOCTOR", { armR: "front", hold: "clipboard", holdSide: 1 }, { armL: "wave", mouth: "open" }, { armL: "hip", armR: "point" }, { armR: "front", hold: "clipboard", holdSide: 1 }],
  ["child", "CHILD", { armL: "wave", mouth: "open" }, { armR: "front", hold: "ball", holdSide: 1 }, { armL: "up", armR: "up", mouth: "open" }, { armL: "hip", armR: "hip" }],
  ["scientist", "SCIENTIST", { armR: "front", hold: "flask", holdSide: 1 }, { armL: "point" }, { armR: "up", hold: "flask", holdSide: 1, mouth: "open" }, { armL: "hip" }],
  ["physicist", "PHYSICIST", { armL: "point", hold: "chalk", holdSide: -1 }, { armR: "hip", mouth: "flat" }, { armR: "wave", mouth: "open" }, { armR: "front" }],
];

const draw = (ctx: Ctx, frame: number, env: Env) => {
  const s = env.scale; ctx.setTransform(s, 0, 0, s, 0, 0);
  ctx.fillStyle = "#c9c9cd"; ctx.fillRect(0, 0, W, H);
  const g = new Gfx(ctx, env, frame, FLAT);
  COLS.forEach(([id, label, p0, p1, p2, p3], i) => {
    const X = i * 480, spec = CAST[id];
    ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(X + 12, 24, 456, 560);
    drawChar(ctx, env, spec, X + 170, 520, 7, {});
    drawChar(ctx, env, spec, X + 380, 262, 3, p0);
    drawChar(ctx, env, spec, X + 380, 500, 3, p1, true);
    letter(g, label, X + 240 - width(label, 30) / 2, 540, { cap: 30, color: "#3a3842", w: 3 });
    drawChar(ctx, env, spec, X + 130, 1050, 5, p2);
    drawChar(ctx, env, spec, X + 350, 1050, 5, p3, true);
  });
};

export const charSheet: Film = {
  meta: { title: "charSheet", W, H, fps: 30, bpm: 120, durationFrames: 15 },
  assets: { images: {} },
  shots: [{ id: "sheet", start: 0, end: 15, draw }],
};
