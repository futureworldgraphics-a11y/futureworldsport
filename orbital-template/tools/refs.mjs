// REFS. Planner's tool: render one reference still per screenplay beat (its middle frame) into
// cinema/refs/<film>/Bnn_fNNNNN.jpg (960 px). A coder building from the screenplay matches these;
// tools/check.mjs scores the build against them and prints a side-by-side sheet.
//
//   node tools/refs.mjs <film> [--screenplay cinema/screenplays/<film>.md] [--from <otherFilm>]
//   --from renders the stills from a different film module (e.g. the planner's own draft build)
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildPage } from "./build-page.mjs";
import { detect } from "./detect.mjs";
import * as playwright from "./adapters/playwright.mjs";
import { parseScreenplay } from "./screenplay.mjs";

const film = process.argv[2];
if (!film || film.startsWith("--")) { console.error("usage: node tools/refs.mjs <film> [--screenplay path] [--from film]"); process.exit(2); }
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const sp = parseScreenplay(arg("screenplay", `cinema/screenplays/${film}.md`)), src = arg("from", film);
if (sp.errors.length) { console.error(sp.errors.join("\n")); process.exit(1); }
const dir = `cinema/refs/${film}`; mkdirSync(dir, { recursive: true }); mkdirSync(".tmp", { recursive: true });
const page = await buildPage({ entry: `src/hosts/page-${src}.ts`, out: resolve(`dist/${src}.html`), title: src });
const s = await playwright.open(detect(), page.out, { scale: 1, workers: 1 }); await s.info();
for (const b of sp.beats) {
  const f = Math.floor((b.f0 + b.f1) / 2), png = (await s.frame(f, 0)).png, tmp = `.tmp/ref.png`, out = `${dir}/${b.id}_f${String(f).padStart(5, "0")}.jpg`;
  writeFileSync(tmp, png); execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", tmp, "-vf", "scale=960:-1", "-q:v", "3", out]);
  console.log(`${b.id} ${b.title.padEnd(34)} frame ${f} -> ${out}`);
}
await s.close();
