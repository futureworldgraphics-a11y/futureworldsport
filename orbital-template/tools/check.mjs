// CHECK. Proves a film matches its screenplay and the house rules. Exit code 1 on any FAIL.
//
//   node tools/check.mjs <film> [--screenplay cinema/screenplays/<film>.md] [--every 10] [--quick]
//
//   1 screenplay   header, cue table and beat headings parse; beats tile the film with no gaps
//   2 length       film frames == floor(audio seconds * 30) (+-1) == screenplay frames
//   3 cues         every screenplay cue exists in the film's exported CUE, within 1 frame
//   4 lettering    sampled every N frames: only supported glyphs, every box inside the safe area
//   5 determinism  frames drawn twice in different orders hash the same
//   6 references   cinema/refs/<film>/Bnn_fNNNNN.jpg vs the film's frame: similarity (>=0.7 same,
//                  0.5-0.7 close, <0.5 different) and a
//                  side-by-side sheet out/check_<film>_refs.jpg (reported, reviewed by eye)
//   7 delivery     out/chunk_<film>.mp4 exists: < 30 MB, length within 1 frame, has audio
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { buildPage } from "./build-page.mjs";
import { detect } from "./detect.mjs";
import { parseScreenplay } from "./screenplay.mjs";

const film = process.argv[2];
if (!film || film.startsWith("--")) { console.error("usage: node tools/check.mjs <film> [--screenplay path] [--every N] [--quick]"); process.exit(2); }
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const quick = process.argv.includes("--quick"), every = Number(arg("every", quick ? 30 : 10));
const spPath = arg("screenplay", `cinema/screenplays/${film}.md`);
let fails = 0, warns = 0;
const ok = (m) => console.log(`  ok    ${m}`), bad = (m) => { fails++; console.log(`  FAIL  ${m}`); }, warn = (m) => { warns++; console.log(`  warn  ${m}`); };

// ---- 1 screenplay
console.log(`\n[1] screenplay  ${spPath}`);
let sp = null;
if (!existsSync(spPath)) bad(`no screenplay at ${spPath}`);
else { sp = parseScreenplay(spPath); sp.errors.forEach(bad); if (!sp.errors.length) ok(`${sp.cues.length} cues, ${sp.beats.length} beats, tiles ${sp.header.frames} frames`); }

// ---- open the film page
const env = detect();
const page0 = await buildPage({ entry: `src/hosts/page-${film}.ts`, out: resolve(`dist/${film}.html`), title: film });
const browser = await env.pw.lib.chromium.launch({ executablePath: env.browser.executablePath });
const ctx = await browser.newContext({ viewport: { width: 640, height: 640 } });
const open = async () => { const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message)); await p.goto(pathToFileURL(page0.out).href + "?adapter=playwright"); await p.evaluate(async () => { await window.FILM.ready; window.FILM.mount(1); }); if (errs.length) throw new Error(errs.join("; ")); return p; };
const pg = await open(), meta = await pg.evaluate(() => window.FILM.meta);
const mod = (await import("data:text/javascript;base64," + Buffer.from((await (await import("esbuild")).build({ stdin: { contents: `export * from "./src/canvas-core/${film}";`, resolveDir: process.cwd(), loader: "ts" }, bundle: true, format: "esm", write: false, platform: "neutral" })).outputFiles[0].text).toString("base64")));

// ---- 2 length
console.log(`\n[2] length`);
const audio = sp?.header.audio;
if (audio && existsSync(audio)) {
  const sec = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", audio], { encoding: "utf8" })), want = Math.floor(sec * 30);
  Math.abs(meta.durationFrames - want) <= 1 ? ok(`film ${meta.durationFrames} frames, audio ${sec.toFixed(3)} s -> ${want}`) : bad(`film has ${meta.durationFrames} frames, audio needs ${want}`);
  if (sp && Number(sp.header.frames) !== meta.durationFrames) bad(`screenplay says ${sp.header.frames} frames, film has ${meta.durationFrames}`);
} else bad(`audio "${audio}" not found (screenplay header row "audio")`);
if (meta.fps !== 30 || meta.W !== 1920 || meta.H !== 1080) bad(`film must be 1920x1080 @ 30 fps (is ${meta.W}x${meta.H} @ ${meta.fps})`);

// ---- 3 cues
console.log(`\n[3] cues`);
if (!mod.CUE) bad(`src/canvas-core/${film}.ts must "export const CUE = { ... }" (seconds)`);
else if (sp) {
  let n = 0;
  for (const c of sp.cues) { const v = mod.CUE[c.id]; if (v === undefined) bad(`cue "${c.id}" (${c.t} s) missing from CUE`); else if (Math.abs(Math.round(v * 30) - c.f) > 1) bad(`cue "${c.id}" is ${v} s in code, ${c.t} s in screenplay`); else n++; }
  const extra = Object.keys(mod.CUE).filter((k) => !sp.cues.some((c) => c.id === k)); if (extra.length) warn(`code cues not in screenplay: ${extra.join(", ")}`);
  if (n === sp.cues.length) ok(`all ${n} cues match to the frame`);
}

// ---- 4 lettering
console.log(`\n[4] lettering (every ${every} frames)`);
const GLYPH = /^[A-Z0-9 \-.,:/()&?eutgd]*$/, SAFE = { x0: 60, x1: 1860, y0: 198, y1: 882 };
const seen = new Map();
for (let f = 0; f < meta.durationFrames; f += every) {
  const recs = await pg.evaluate((n) => { globalThis.__AUDIT__ = []; window.FILM.seek(n); const a = globalThis.__AUDIT__; globalThis.__AUDIT__ = undefined; return a; }, f);
  for (const r of recs) {
    const key = r.s + "@" + Math.round(r.x0 / 20) + "," + Math.round(r.y0 / 20);
    const probs = [];
    if (!GLYPH.test(r.s)) probs.push(`unsupported glyph in "${r.s}" (allowed: A-Z 0-9 - . , : / ( ) & ? e u t g d)`);
    if (r.x0 < SAFE.x0 - 0.5 || r.x1 > SAFE.x1 + 0.5 || r.y0 < SAFE.y0 - 0.5 || r.y1 > SAFE.y1 + 0.5) probs.push(`"${r.s}" box ${r.x0.toFixed(0)},${r.y0.toFixed(0)}-${r.x1.toFixed(0)},${r.y1.toFixed(0)} leaves the safe area`);
    for (const p of probs) if (!seen.has(p)) { seen.set(p, f); bad(`frame ${f}: ${p}`); }
  }
}
if (![...seen.keys()].length) ok(`all lettering legal and inside x ${SAFE.x0}-${SAFE.x1}, y ${SAFE.y0}-${SAFE.y1}`);

// ---- 5 determinism
console.log(`\n[5] determinism`);
{ const N = meta.durationFrames, fs = [0.13, 0.41, 0.66, 0.92].map((k) => Math.floor(N * k)), pg2 = await open(); const h1 = []; for (const f of fs) h1.push(await pg.evaluate((n) => { window.FILM.seek(n); return window.FILM.hash(); }, f)); const h2 = []; for (const f of [...fs].reverse()) h2.unshift(await pg2.evaluate((n) => { window.FILM.seek(n); return window.FILM.hash(); }, f)); const same = h1.every((h, i) => h === h2[i]); same ? ok(`frames ${fs.join(", ")} identical across pages and orders`) : bad(`frames differ between renders: ${fs.filter((_, i) => h1[i] !== h2[i]).join(", ")} (Math.random, Date, ctx.filter, or state kept between frames?)`); await pg2.close(); }

// ---- 6 references
console.log(`\n[6] reference stills`);
const refDir = `cinema/refs/${film}`;
// grain removed, dark tones lifted, so SSIM compares the lit shapes (the subject), not the black.
// Calibrated on paleDot: the same frame scores ~0.8 (jpeg + grain), an empty/different frame ~0.3.
const LOOK = "format=gray,gblur=sigma=2,curves=all='0/0 0.12/0.75 1/1'";
mkdirSync(".tmp/check", { recursive: true });
if (existsSync(refDir)) {
  const refs = readdirSync(refDir).filter((f) => /_f\d+\.jpg$/.test(f)).sort(), pairs = [];
  for (const r of refs) {
    const f = Number(r.match(/_f(\d+)\.jpg$/)[1]), png = await pg.evaluate((n) => { window.FILM.seek(n); return window.FILM.png(); }, f), out = `.tmp/check/${r.replace(".jpg", ".png")}`;
    writeFileSync(out, Buffer.from(png, "base64"));
    pairs.push({ r, out });
    const log = spawnSync("ffmpeg", ["-hide_banner", "-i", out, "-i", `${refDir}/${r}`, "-lavfi", `[0]scale=480:270,${LOOK}[a];[1]scale=480:270,${LOOK}[b];[a][b]ssim`, "-f", "null", "-"], { encoding: "utf8" }).stderr, s = Number((log.match(/All:([\d.]+)/) || [])[1]);
    const verdict = s >= 0.7 ? "same" : s >= 0.5 ? "close, review" : "DIFFERENT, fix or explain";
    (s >= 0.5 ? ok : warn)(`${r.padEnd(24)} similarity ${s.toFixed(3)}  ${verdict}`);
  }
  if (pairs.length) {
    const inputs = pairs.flatMap((p) => ["-i", `${refDir}/${p.r}`, "-i", p.out]), n = pairs.length;
    const fc = pairs.map((_, i) => `[${2 * i}]scale=480:270[r${i}];[${2 * i + 1}]scale=480:270[o${i}];[r${i}][o${i}]hstack[p${i}]`).join(";") + ";" + pairs.map((_, i) => `[p${i}]`).join("") + `vstack=inputs=${n}`;
    const sheet = `out/check_${film}_refs.jpg`; mkdirSync("out", { recursive: true });
    if (n > 1) execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...inputs, "-filter_complex", fc, "-frames:v", "1", sheet]); else execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...inputs, "-filter_complex", "[0]scale=480:270[a];[1]scale=480:270[b];[a][b]hstack", "-frames:v", "1", sheet]);
    console.log(`        side by side (reference | film): ${sheet}`);
  }
} else warn(`no reference stills in ${refDir} (planner: node tools/refs.mjs ${film})`);

// ---- 7 delivery
console.log(`\n[7] delivery`);
const mp4 = `out/chunk_${film}.mp4`;
if (existsSync(mp4)) {
  const mb = statSync(mp4).size / 1e6, dur = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp4], { encoding: "utf8" })), streams = execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type", "-of", "csv=p=0", mp4], { encoding: "utf8" });
  mb < 30 ? ok(`${mp4} ${mb.toFixed(1)} MB`) : bad(`${mp4} is ${mb.toFixed(1)} MB (limit 30; tools/finish.mjs targets 28.5)`);
  Math.abs(dur * 30 - meta.durationFrames) <= 1.5 ? ok(`length ${dur.toFixed(3)} s`) : bad(`length ${dur.toFixed(3)} s, film is ${(meta.durationFrames / 30).toFixed(3)} s`);
  streams.includes("audio") ? ok("has audio") : bad("no audio stream");
} else warn(`${mp4} not built yet (node tools/finish.mjs ${film})`);

await browser.close();
console.log(`\n${fails ? `FAILED: ${fails} problem(s)` : "PASSED"}${warns ? `, ${warns} warning(s)` : ""}`);
process.exit(fails ? 1 : 0);
