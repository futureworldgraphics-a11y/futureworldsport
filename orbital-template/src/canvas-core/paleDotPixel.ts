import { Film } from "./film";
import { W, H, FPS } from "./spaceStyle";
import { paleDotDraw } from "./paleDot";

// PALE BLUE DOT · PIXEL. The same direction, timing and scenes as paleDot (cinema/screenplays/paleDot.md),
// finished as pixel art: 640x360 art pixels shown at 3x, the paleDot tones as a fixed palette with
// ordered dithering, and terminal pixel-font lettering (see pixelKit.ts).
export { CUE } from "./paleDot";

export const paleDotPixel: Film = {
  meta: { title: "paleDotPixel", W, H, fps: FPS, bpm: 120, durationFrames: 2853 },
  assets: { images: {} },
  shots: [{ id: "paleDotPixel", start: 0, end: 2853, draw: paleDotDraw(3) }],
};
