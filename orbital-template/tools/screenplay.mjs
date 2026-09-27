// SCREENPLAY PARSER. Reads the machine-checked parts of cinema/screenplays/<film>.md
// (format: cinema/SCREENPLAY_FORMAT.md):
//   ## 1. HEADER   rows  | key | value |          (film, audio, fps, frames, seconds)
//   ## 3. CUES     table | cue | time_s | frame | words |
//   ### Bnn · title · <start>–<end> s             one heading per beat
import { readFileSync } from "node:fs";

const cells = (line) => line.trim().replace(/^\||\|$/g, "").split("|").map((s) => s.trim());
const section = (md, n) => { const m = md.split(/^## /m).find((s) => s.startsWith(`${n}.`)); return m ?? ""; };

export const parseScreenplay = (path) => {
  const md = readFileSync(path, "utf8"), errors = [];
  const header = {};
  for (const l of section(md, 1).split("\n")) if (l.startsWith("|") && !/^\|\s*-/.test(l)) { const [k, v] = cells(l); if (k && v && k !== "key") header[k] = v.replace(/`/g, ""); }
  const cues = [];
  const cueSec = section(md, 3).split("\n");
  for (const l of cueSec) {
    if (!l.startsWith("|") || /^\|\s*-/.test(l)) continue;
    const [id, ts, fr, words] = cells(l); if (id === "cue") continue;
    const t = Number(ts), f = Number(fr);
    if (!/^[A-Za-z_]\w*$/.test(id) || !Number.isFinite(t)) { errors.push(`CUES: bad row "${l.trim()}"`); continue; }
    if (Number.isFinite(f) && Math.abs(f - Math.round(t * 30)) > 0) errors.push(`CUES: ${id} frame ${f} != round(${t} * 30) = ${Math.round(t * 30)}`);
    cues.push({ id, t, f: Math.round(t * 30), words });
  }
  const beats = [];
  for (const m of md.matchAll(/^###\s+(B\d+)\s*·\s*(.+?)\s*·\s*([\d.]+)\s*[–-]\s*([\d.]+)\s*s/gm)) beats.push({ id: m[1], title: m[2], t0: Number(m[3]), t1: Number(m[4]), f0: Math.round(Number(m[3]) * 30), f1: Math.round(Number(m[4]) * 30) });
  const frames = Number(header.frames);
  beats.forEach((b, i) => {
    if (i === 0 && b.f0 !== 0) errors.push(`BEATS: ${b.id} must start at 0`);
    if (i > 0 && b.f0 !== beats[i - 1].f1) errors.push(`BEATS: ${b.id} starts at ${b.t0} s but ${beats[i - 1].id} ends at ${beats[i - 1].t1} s (gap or overlap)`);
    if (b.f1 <= b.f0) errors.push(`BEATS: ${b.id} has no length`);
  });
  if (beats.length && Number.isFinite(frames) && Math.abs(beats[beats.length - 1].f1 - frames) > 1) errors.push(`BEATS: last beat ends at frame ${beats[beats.length - 1].f1}, film is ${frames}`);
  return { header, cues, beats, errors };
};
