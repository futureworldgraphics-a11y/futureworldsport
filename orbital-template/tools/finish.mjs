// FINISH. Silent render -> delivered film: out/chunk_<film>.mp4 (< 30 MB, audio muxed) and
// out/contact_<film>.png (one still per beat, 4 across, 400 px).
//
//   node tools/finish.mjs <film> [--screenplay cinema/screenplays/<film>.md] [--rerender] [--mb 28.5]
//
// Renders out/<film>-silent.mp4 first if it is missing (or with --rerender). The encode is two-pass
// to a size budget: film grain barely compresses, so a quality (crf) encode can land at 10x the limit.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { parseScreenplay } from "./screenplay.mjs";

const film = process.argv[2];
if (!film || film.startsWith("--")) { console.error("usage: node tools/finish.mjs <film> [--screenplay path] [--rerender] [--mb 28.5]"); process.exit(2); }
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const sp = parseScreenplay(arg("screenplay", `cinema/screenplays/${film}.md`)), audio = sp.header.audio;
if (!audio || !existsSync(audio)) { console.error(`audio "${audio}" not found (screenplay header row "audio")`); process.exit(1); }
const silent = `out/${film}-silent.mp4`, out = `out/chunk_${film}.mp4`, sheet = `out/contact_${film}.png`, mb = Number(arg("mb", 28.5));
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: "inherit", ...opts });

if (!existsSync(silent) || process.argv.includes("--rerender")) run("node", ["tools/render.mjs", film, "--out", silent]);
const dur = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", silent], { encoding: "utf8" }));
const vk = Math.floor((mb * 8e3) / dur - 192 - 40); // kbit/s for video after 192k audio and container slack
console.log(`\nencode: ${dur.toFixed(3)} s, video ${vk} kbit/s two-pass -> ${out}`);
mkdirSync(".tmp", { recursive: true });
run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", silent, "-c:v", "libx264", "-preset", "slow", "-b:v", `${vk}k`, "-pass", "1", "-passlogfile", `.tmp/${film}-2pass`, "-an", "-f", "null", "/dev/null"]);
run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", silent, "-i", audio, "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "slow", "-b:v", `${vk}k`, "-pass", "2", "-passlogfile", `.tmp/${film}-2pass`, "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-t", String(dur), "-movflags", "+faststart", out]);
console.log(`${out}: ${(statSync(out).size / 1e6).toFixed(1)} MB`);

// contact sheet: middle of every beat (or 20 even stills without a screenplay)
const times = sp.beats.length ? sp.beats.map((b) => (b.t0 + b.t1) / 2) : Array.from({ length: 20 }, (_, i) => ((i + 0.5) * dur) / 20);
const dir = `.tmp/contact-${film}`; mkdirSync(dir, { recursive: true });
times.forEach((t, i) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-ss", t.toFixed(3), "-i", out, "-frames:v", "1", "-vf", "scale=400:-1", `${dir}/${String(i).padStart(3, "0")}.png`]));
const rows = Math.ceil(times.length / 4);
execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-framerate", "1", "-start_number", "0", "-i", `${dir}/%03d.png`, "-vf", `tile=4x${rows}`, "-frames:v", "1", sheet]);
console.log(`${sheet}: ${times.length} stills`);
