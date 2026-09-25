// NEW FILM. Scaffold a cinema-kit film from its screenplay: the film module (CUE table filled in
// from the screenplay, one commented block per beat), its host page, and a check that it runs.
//
//   node tools/new-film.mjs <film> [--screenplay cinema/screenplays/<film>.md]
import { existsSync, writeFileSync } from "node:fs";
import { parseScreenplay } from "./screenplay.mjs";

const film = process.argv[2];
if (!film || !/^[a-z][A-Za-z0-9]*$/.test(film)) { console.error("usage: node tools/new-film.mjs <film>   (camelCase, e.g. paleDot)"); process.exit(2); }
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const sp = parseScreenplay(arg("screenplay", `cinema/screenplays/${film}.md`));
if (sp.errors.length) { console.error("screenplay problems:\n  " + sp.errors.join("\n  ")); process.exit(1); }
const src = `src/canvas-core/${film}.ts`, host = `src/hosts/page-${film}.ts`;
if (existsSync(src)) { console.error(`${src} already exists`); process.exit(1); }
const frames = Number(sp.header.frames), cues = sp.cues.map((c) => `${c.id}: ${c.t}`).join(", ");
const beats = sp.beats.map((b) => `  // ---------------------------------------------------------------- ${b.id} · ${b.title} · ${b.t0}-${b.t1} s (f${b.f0}-f${b.f1})
  if (t > ${b.t0} - 0.5 && t < ${b.t1} + 1.5) {
    // build exactly what the screenplay specifies for ${b.id}
  }`).join("\n\n");
writeFileSync(src, `import { rng, type Ctx, type Env, type P } from "./core";
import { Film } from "./film";
import { clamp, lerp } from "./gallery";
import { W, H, FPS, ease, easeOut, ramp } from "./spaceStyle";
import {
  TAU, CX, CY, BAR, WHITE, PALE, CYAN, BLUE, VIO, PINK, AMBER, GOLD, RED, GREEN, WARM, NEON, TXT, DIMT, GOLDT, PALET, REDT,
  g1, win, col, dot, hair, hairG, fade, beads, ellipse, flare, reticle, ripple, trail, node, glow,
  makeCamera, makeStars, drawStars, makeTint, beginFrame, endFrame, hudTables, fmt, fades, type Label, type Line,
} from "./cinemaKit";

// ${film.toUpperCase()} · built from cinema/screenplays/${film}.md. Follow it exactly; draw only with cinemaKit.

const DURATION = ${frames};
export const CUE = { ${cues} };

// screenplay section 4 (CAMERA): z speed and sideways pan, depth units / s
const speed = (t: number) => 0.012;
const panRate = (t: number) => 0;
const CAM = makeCamera(speed, panRate, ${Math.ceil(frames / 30) + 1}), STARS = makeStars(5, 1900);
// screenplay section 4 (TINT): [t, r, g, b]
const tint = makeTint([[0, 5, 7, 16], [${(frames / 30).toFixed(1)}, 3, 4, 10]]);
// screenplay section 6 (LETTERING)
const LABELS: Label[] = [];
const LINES: Line[] = [];

const draw = (ctx: Ctx, frame: number, env: Env) => {
  const t = frame / FPS;
  const f = beginFrame(ctx, env, frame, tint(t)), c = f.c, tag = f.tag;
  drawStars(c, STARS, CAM, t, ramp(t, 0, 2));

${beats}

  endFrame(ctx, env, frame, t, f, { black: fades(t, DURATION / FPS), hud: (h) => hudTables(h, LABELS, LINES) });
};

export const ${film}: Film = {
  meta: { title: "${film}", W, H, fps: FPS, bpm: 120, durationFrames: DURATION },
  assets: { images: {} },
  shots: [{ id: "${film}", start: 0, end: DURATION, draw }],
};
`);
writeFileSync(host, `import { ${film} } from "../canvas-core/${film}";\nimport { mountFilm } from "./page";\nmountFilm(${film});\n`);
console.log(`wrote ${src} (${sp.cues.length} cues, ${sp.beats.length} beat blocks) and ${host}\nnext: npx tsc --noEmit -p . && node tools/check.mjs ${film} --quick`);
