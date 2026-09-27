import { type Env } from "./core";
import { cached } from "./spaceStyle";

// PIXEL CHARACTERS · the locked character style: ~24x58 px, 3/4 view facing screen-left, big head,
// four-tone ramps lit from the front-left, a coloured 1 px outline, arms contoured over the body,
// hair with strand highlights, a soft ground shadow. A character is a spec (who) plus a pose (what
// the arms do); it is painted once into a 40x64 cell grid (parts + materials), shaded per part like
// a cylinder, detailed, outlined, and cached as a tiny canvas that films blow up with no smoothing.

export type Ramp = [string, string, string, string]; // dark -> light
export const SW = 40, SH = 64;

// ---------------------------------------------------------------- ramps
export const SKIN = { light: ["#a0604a", "#d6926e", "#f2b890", "#ffd9bc"] as Ramp, medium: ["#6e3e2a", "#aa6c48", "#d4976c", "#f0bf96"] as Ramp, dark: ["#3c2218", "#6a4030", "#945f3e", "#b98560"] as Ramp };
export const HAIR = {
  brown: ["#3a2014", "#6a3a1e", "#9a5a2e", "#cf904f"] as Ramp, black: ["#130f18", "#2a2230", "#443a4c", "#625874"] as Ramp,
  grey: ["#6e6e7c", "#9c9caa", "#cacad6", "#f2f2fa"] as Ramp, ginger: ["#6a2a10", "#a8481c", "#d8703a", "#f4a468"] as Ramp, blonde: ["#8a5a1a", "#c89030", "#ecc050", "#fff0a0"] as Ramp,
};
export const CLOTH = {
  white: ["#8c96aa", "#bcc6d8", "#e6ecf4", "#ffffff"] as Ramp, teal: ["#0c4a52", "#17727a", "#23a0a4", "#6cd6cc"] as Ramp, navy: ["#141a3a", "#232e62", "#34458e", "#5670c0"] as Ramp,
  denim: ["#3a5a86", "#5f86b8", "#8fb4de", "#c8e0f6"] as Ramp, charcoal: ["#1c1c24", "#2e2e3a", "#44444f", "#62626e"] as Ramp, red: ["#6a1418", "#a82228", "#dc3a36", "#ff7a62"] as Ramp,
  yellow: ["#8a5a0a", "#d09a18", "#f4c430", "#fff08a"] as Ramp, purple: ["#2e1a4a", "#4c2e7a", "#7048aa", "#a07ed6"] as Ramp, tweed: ["#3e2a1a", "#6a4a2e", "#8e6a44", "#b8946a"] as Ramp,
  olive: ["#2a3218", "#44522a", "#627440", "#8ea060"] as Ramp, khaki: ["#5a4a2a", "#8a7446", "#b49c66", "#dac894"] as Ramp, cream: ["#8a7a60", "#bcae90", "#e4d8bc", "#fbf4e2"] as Ramp,
  brown: ["#2a1810", "#4a2c1a", "#6e4428", "#94623c"] as Ramp, green: ["#123a22", "#1e5e36", "#2e8a4e", "#5cc07a"] as Ramp, orange: ["#7a2e0a", "#c0521a", "#ec7e2a", "#ffb468"] as Ramp,
};

export type CharSpec = {
  body: "man" | "woman" | "child";
  skin: Ramp; hair: Ramp; hairStyle: "short" | "bun" | "wild" | "pigtails" | "ponytail" | "curly" | "bob";
  eyes?: string; top: Ramp; sleeves?: "short" | "long"; stripe?: Ramp;
  coat?: Ramp; coatLen?: number; vest?: Ramp; tie?: Ramp; bowtie?: string;
  legs: Ramp; legKind?: "pants" | "shorts" | "skirt"; shoes: Ramp; sole?: string; socks?: string;
  glasses?: string; goggles?: boolean; stethoscope?: boolean; badge?: boolean; mustache?: boolean; freckles?: boolean; lashes?: boolean; blush?: boolean;
  backpack?: Ramp; pens?: boolean; bandaid?: boolean;
};
export type Arm = "down" | "wave" | "front" | "point" | "hip" | "up";
export type Hold = "none" | "flask" | "chalk" | "clipboard" | "ball";
export type Pose = { armL?: Arm; armR?: Arm; hold?: Hold; holdSide?: 1 | -1; mouth?: "smile" | "open" | "flat" };

// ---------------------------------------------------------------- the grid
type Part = "hairB" | "pack" | "legL" | "legR" | "shoeL" | "shoeR" | "torso" | "vest" | "coat" | "neck" | "head" | "hair" | "armL" | "armR" | "handL" | "handR";
type Cell = { p: Part; r: Ramp; hl: boolean } | null;
const mixc = (a: string, b: string, k: number) => { const h = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16)); const A = h(a), B = h(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, "0")).join(""); };

const paint = (spec: CharSpec, pose: Pose): (string | null)[][] => {
  const G: Cell[][] = Array.from({ length: SH }, () => Array<Cell>(SW).fill(null));
  const put = (x: number, y: number, p: Part, r: Ramp, hl = true) => { x = Math.floor(x); y = Math.floor(y); if (x >= 0 && x < SW && y >= 0 && y < SH) G[y][x] = { p, r, hl }; };
  const row = (y: number, x0: number, x1: number, p: Part, r: Ramp, hl = true) => { for (let x = Math.round(x0); x <= Math.round(x1); x++) put(x, y, p, r, hl); };
  const ell = (cx: number, cy: number, rx: number, ry: number, p: Part, r: Ramp, keep: (x: number, y: number) => boolean = () => true, hl = true) => {
    for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) { const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry; if (u * u + v * v <= 1 && keep(x, y)) put(x, y, p, r, hl); }
  };
  const thick = (x0: number, y0: number, x1: number, y1: number, rad: number, p: Part, r: Ramp) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 3) + 1; for (let i = 0; i <= n; i++) { const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n; ell(x, y, rad, rad, p, r); } };
  const at = (x: number, y: number) => (x >= 0 && x < SW && y >= 0 && y < SH ? G[y][x] : null);

  // ---- body plan
  const kid = spec.body === "child", fem = spec.body === "woman", cx = 20;
  const B = kid
    ? { hcy: 24.5, hrx: 6.0, hry: 6.6, sh: 32, waist: 41, hip: 44, knee: 51, ankle: 57, foot: 61, shw: 5, wst: 4.6, hpw: 5, arm: 11, rad: 1.35 }
    : { hcy: 11.5, hrx: 5.7, hry: 6.4, sh: 20, waist: 34, hip: 38, knee: 48, ankle: 57, foot: 61, shw: fem ? 6 : 7, wst: fem ? 4.6 : 5.6, hpw: fem ? 5.8 : 5.8, arm: 16, rad: 1.5 };
  const ey = Math.round(B.hcy) + 1, hx = cx; // eye row; head centre column
  const coatBot = spec.coat ? B.hip + (spec.coatLen ?? 9) : 0;

  // ---- hair behind the head
  const H = spec.hair;
  if (spec.hairStyle === "ponytail") { thick(hx + 5, B.hcy - 3, hx + 7, B.hcy + 5, 2.2, "hairB", H); thick(hx + 7, B.hcy + 5, hx + 6, B.hcy + 10, 1.6, "hairB", H); }
  if (spec.hairStyle === "bun") ell(hx + 1.5, B.hcy - 6.8, 3.1, 2.8, "hairB", H);
  if (spec.hairStyle === "bob") for (let y = Math.round(B.hcy); y <= B.hcy + 6; y++) row(y, hx - 7, hx + 6, "hairB", H);
  if (spec.hairStyle === "pigtails") { ell(hx - 7.5, B.hcy + 2, 2.3, 3.2, "hairB", H); ell(hx + 7, B.hcy + 2, 2.3, 3.2, "hairB", H); }
  if (spec.hairStyle === "wild") { const tuft = [0, 2, 1, 3, 1, 2, 0, 2, 3, 1, 2]; for (let k = 0; k < tuft.length; k++) { const a = Math.PI * (0.95 + (k / (tuft.length - 1)) * 1.1), rr = 7.2 + tuft[k] * 0.8; ell(hx - 0.5 + Math.cos(a) * rr * 0.9, B.hcy - 1 + Math.sin(a) * rr * 0.75, 1.8, 1.6, "hairB", H); } ell(hx - 8, B.hcy + 1, 2.2, 3, "hairB", H); ell(hx + 7.5, B.hcy + 1, 2.2, 3, "hairB", H); }
  // ---- backpack behind the body
  if (spec.backpack) for (let y = B.sh + 1; y <= B.sh + 10; y++) row(y, cx + B.shw - 1, cx + B.shw + 3 - (y > B.sh + 8 ? 1 : 0), "pack", spec.backpack);

  // ---- legs and shoes
  const legRow = (y: number) => { const k = (y - B.hip) / (B.ankle - B.hip), kk = (y - B.knee) / (B.ankle - B.knee); const out = y < B.knee ? B.hpw - k * 1.2 : B.hpw - 1.3 - Math.max(0, kk) * 0.8; const inner = y < B.hip + 3 ? 0 : 1; return { lo: cx - out, li: cx - 1 - inner, ri: cx + inner - 1 + 1, ro: cx + out - 1 }; };
  const legRamp = (y: number) => (spec.legKind === "shorts" && y > B.hip + (kid ? 4 : 6) ? (spec.socks && y > B.ankle - 2 ? null : spec.skin) : spec.legKind === "skirt" && y > B.hip + 7 ? spec.skin : spec.legs);
  for (let y = B.hip - 1; y <= B.ankle; y++) {
    const L = legRow(y), rmp = legRamp(y) ?? CLOTH.white; const sock = spec.socks && (spec.legKind === "shorts" || spec.legKind === "skirt") && y > B.ankle - 2;
    const rr: Ramp = sock ? [mixc(spec.socks!, "#000000", 0.4), mixc(spec.socks!, "#000000", 0.2), spec.socks!, mixc(spec.socks!, "#ffffff", 0.4)] : rmp;
    row(y, L.lo, L.li, "legL", rr); row(y, L.ri, L.ro, "legR", rr);
  }
  if (spec.legKind === "skirt") for (let y = B.hip - 1; y <= B.hip + 7; y++) row(y, cx - B.hpw - (y - B.hip) * 0.35, cx + B.hpw - 1 + (y - B.hip) * 0.35, "legL", spec.legs);
  for (let y = B.ankle + 1; y <= B.foot; y++) { const t = y - B.ankle; row(y, cx - 5 - (t > 1 ? 1 : 0), cx - 1, "shoeL", spec.shoes); row(y, cx + 1, cx + 5 + (t > 1 ? 0 : 0), "shoeR", spec.shoes); }

  // ---- torso (+ vest), coat
  const tw = (y: number) => { if (y <= B.sh) return B.shw - 1.2; if (y <= B.waist) return B.shw - ((y - B.sh) / (B.waist - B.sh)) * (B.shw - B.wst); return B.wst + ((y - B.waist) / (B.hip - B.waist)) * (B.hpw - B.wst); };
  for (let y = B.sh; y <= B.hip; y++) row(y, cx - tw(y), cx + tw(y) - 1, "torso", spec.top);
  if (spec.vest) for (let y = B.sh + 1; y <= B.hip - 1; y++) { const v = Math.max(0, 3 - (y - B.sh) * 0.45); for (let x = Math.round(cx - tw(y)); x <= Math.round(cx + tw(y) - 1); x++) if (Math.abs(x + 0.5 - cx) > v) put(x, y, "vest", spec.vest); }
  if (spec.coat) {
    for (let y = B.sh; y <= coatBot; y++) {
      const w = y <= B.hip ? tw(y) + 0.6 : B.hpw + 0.8 + (y - B.hip) * 0.12, ow = y < B.sh + 2 ? 1.2 : Math.min(2.6, 1.2 + (y - B.sh) / 5);
      for (let x = Math.round(cx - w); x <= Math.round(cx + w - 1); x++) if (Math.abs(x + 0.5 - cx) > ow || y > B.hip + 1 && Math.abs(x + 0.5 - cx) > ow - 0.4) put(x, y, "coat", spec.coat);
    }
  }
  // ---- neck, head, ears
  for (let y = Math.round(B.hcy + B.hry - 1.5); y <= B.sh; y++) row(y, hx - 2, hx + 1, "neck", spec.skin);
  ell(hx, B.hcy, B.hrx, B.hry, "head", spec.skin, (x, y) => !(y > B.hcy + 3 && (x <= hx - B.hrx + 1 + (y - B.hcy - 3) * 0.6 || x >= hx + B.hrx - 2 - (y - B.hcy - 3) * 0.6 + 1)), false);
  put(hx + Math.round(B.hrx) - 0, ey, "head", spec.skin, false); put(hx + Math.round(B.hrx) - 0, ey + 1, "head", spec.skin, false);

  // ---- hair on top of the head
  const capTop = B.hcy - B.hry;
  const fringe: Record<string, number[]> = { short: [3, 2, 1, 1, 0, 0, 0, 0, 1, 1, 2, 3], bun: [3, 2, 1, 0, 0, 0, 0, 1, 1, 2, 2, 3], wild: [4, 4, 5, 5, 6, 6, 6, 5, 5, 4, 4, 4], pigtails: [4, 2, 1, 1, 2, 1, 1, 2, 1, 1, 2, 4], ponytail: [4, 2, 1, 0, 1, 2, 1, 1, 0, 1, 2, 4], curly: [3, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 3], bob: [5, 2, 1, 1, 1, 1, 1, 1, 1, 1, 2, 5] };
  const fr = fringe[spec.hairStyle], fBase = capTop + 3.2;
  const side = spec.hairStyle === "short" ? ey + 1 : spec.hairStyle === "wild" ? ey + 2 : spec.hairStyle === "bob" ? ey + 5 : ey + 3;
  if (spec.hairStyle === "wild") ell(hx - 0.3, B.hcy - 2.2, B.hrx + 0.4, B.hry - 1.5, "hair", H, (x, y) => { const i = x - (hx - 6); if (i < 0 || i > 11) return y <= side; if (i >= 3 && i <= 8 && y < capTop + 2) return false; return y <= capTop + fr[i]; });
  else ell(hx - 0.3, B.hcy - 1.4, B.hrx + 0.9, B.hry - 0.4, "hair", H, (x, y) => { const i = x - (hx - 6); if (i <= 0 || i >= 11) return y <= side; return y <= fBase + fr[i] - (spec.hairStyle === "curly" && (x + y) % 3 === 0 ? 1 : 0); });
  if (spec.hairStyle === "curly") for (let k = 0; k < 9; k++) { const a = Math.PI * (1.05 + k * 0.11); ell(hx - 0.3 + Math.cos(a) * 6.6, B.hcy - 1.4 + Math.sin(a) * 6.4, 1.4, 1.4, "hair", H); }

  // ---- arms (hands last), drawn over the body
  const armPts = (a: Arm, s: number): [number, number, number, number] => {
    const L = B.arm / 16; const P: Record<Arm, [number, number, number, number]> = { down: [0.4, 8, 0.8, 15.5], wave: [3.5, -1, 5, -8], front: [1.2, 8, -4.5, 11], point: [4.5, 3, 11, 1], hip: [3.2, 6, 0.6, 11.5], up: [1, -7.5, 1.5, -15] };
    const [ex, ey2, hx2, hy] = P[a]; return [s * ex * L, ey2 * L, s * hx2 * L, hy * L];
  };
  const drawArm = (s: -1 | 1, a: Arm) => {
    const sx = cx + s * (B.shw - 1.2) - (s > 0 ? 1 : 0), sy = B.sh + 1.6, [ex, ey2, hx2, hy] = armPts(a, s), p: Part = s < 0 ? "armL" : "armR", hp: Part = s < 0 ? "handL" : "handR";
    const sleeve = spec.coat ?? spec.top, short = !spec.coat && spec.sleeves === "short";
    if (short) { thick(sx, sy, sx + ex * 0.5, sy + ey2 * 0.5, B.rad + 0.2, p, sleeve); thick(sx + ex * 0.5, sy + ey2 * 0.5, sx + ex, sy + ey2, B.rad - 0.1, p, spec.skin); thick(sx + ex, sy + ey2, sx + hx2, sy + hy, B.rad - 0.15, p, spec.skin); }
    else { thick(sx, sy, sx + ex, sy + ey2, B.rad, p, sleeve); thick(sx + ex, sy + ey2, sx + hx2 - (hx2 - ex) * 0.12, sy + hy - (hy - ey2) * 0.12, B.rad - 0.1, p, sleeve); }
    ell(sx + hx2, sy + hy + 0.4, B.rad + 0.1, B.rad + 0.4, hp, spec.skin);
    return [sx + hx2, sy + hy] as [number, number];
  };
  const aL = pose.armL ?? "down", aR = pose.armR ?? "down";
  const order: [-1 | 1, Arm][] = aL === "front" ? [[1, aR], [-1, aL]] : [[-1, aL], [1, aR]];
  const hand: Record<number, [number, number]> = {}; order.forEach(([s, a]) => { hand[s] = drawArm(s, a); });

  // ---- shade: each part is a little cylinder lit from the front-left
  const C: (string | null)[][] = Array.from({ length: SH }, () => Array<string | null>(SW).fill(null));
  const tone: number[][] = Array.from({ length: SH }, () => Array<number>(SW).fill(-1));
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
    const c = G[y][x]; if (!c) continue;
    let dl = 0, dr = 0; while (at(x - dl - 1, y)?.p === c.p) dl++; while (at(x + dr + 1, y)?.p === c.p) dr++;
    const u = (dl + 0.5) / (dl + dr + 1), n = dl + dr + 1;
    let k = dr === 0 && n >= 3 ? 0 : u > 0.66 ? 1 : u < 0.26 && n >= 3 && c.hl ? 3 : 2;
    if (c.p === "head" && dr === 0) k = 1;
    if (c.p === "neck") k = dl === 0 ? 2 : 1;
    const up = at(x, y - 1);
    if ((c.p === "neck" || c.p === "torso" || c.p === "coat" || c.p === "vest") && up && (up.p === "head" || up.p === "hair")) k = Math.min(k, 1);
    if (c.p === "hair" && at(x, y + 1)?.p === "head") k = Math.min(k, 1);
    if ((c.p === "legL" || c.p === "legR") && up && (up.p === "torso" || up.p === "coat")) k = Math.min(k, 1);
    // arm contour: an arm or hand edge against the body is inked
    if ((c.p.startsWith("arm") || c.p.startsWith("hand")) && [at(x - 1, y), at(x + 1, y), at(x, y + 1), at(x, y - 1)].some((q) => q && !q.p.startsWith("arm") && !q.p.startsWith("hand") && q.p !== "neck")) { C[y][x] = mixc(c.r[0], "#140c18", 0.35); tone[y][x] = 0; continue; }
    C[y][x] = c.r[k]; tone[y][x] = k;
  }
  const set = (x: number, y: number, col: string) => { x = Math.floor(x); y = Math.floor(y); if (x >= 0 && x < SW && y >= 0 && y < SH) C[y][x] = col; };
  const is = (x: number, y: number, p: Part) => at(Math.floor(x), Math.floor(y))?.p === p;

  // ---- hair texture: a highlight band and strands
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
    const c = G[y][x]; if (!c || (c.p !== "hair" && c.p !== "hairB")) continue;
    const band = Math.round(capTop + 2 + Math.abs(x - hx + 2) * 0.25);
    if (c.p === "hair" && y === band && tone[y][x] >= 2 && x % 4 !== 1) set(x, y, H[3]);
    else if (tone[y][x] === 2 && (x * 2 + y) % 5 === 0) set(x, y, H[1]);
    if (spec.hairStyle === "curly" && (x + y * 2) % 4 === 0 && tone[y][x] >= 2) set(x, y, H[3]);
  }
  if (spec.hairStyle === "pigtails") { set(hx - 7, B.hcy - 1, "#ff5a8a"); set(hx - 8, B.hcy - 1, "#ff5a8a"); set(hx + 7, B.hcy - 1, "#ff5a8a"); set(hx + 6, B.hcy - 1, "#ff5a8a"); }
  if (spec.hairStyle === "ponytail") { set(hx + 6, B.hcy - 1, "#f4c430"); set(hx + 7, B.hcy - 1, "#d09a18"); }

  // ---- stripes on the top
  if (spec.stripe) for (let y = B.sh + 2; y <= B.hip; y += 3) for (let x = 0; x < SW; x++) if (is(x, y, "torso") || (is(x, y, "armL") || is(x, y, "armR")) && G[y][x]!.r === spec.top && tone[y][x] > 0) set(x, y, spec.stripe[Math.max(1, tone[y][x])]);

  // ---- face
  const S = spec.skin, eyeC = spec.eyes ?? "#2a6a8a", dark = "#1c1420";
  const exL = hx - 4, exR = hx;
  for (const ex of [exL, exR]) { set(ex, ey, dark); set(ex, ey + 1, eyeC); set(ex + 1, ey, dark); set(ex + 1, ey + 1, ex === exL ? "#f6f2f2" : dark); }
  set(exR + 1, ey + 1, eyeC); set(exL + 1, ey + 1, eyeC); set(exL, ey + 1, "#f6f2f2"); set(exR, ey + 1, "#f6f2f2");
  if (spec.lashes) { set(exL - 1, ey, dark); set(exR + 2, ey, dark); }
  if (spec.hairStyle !== "wild" || !spec.glasses) { set(exL, ey - 2, H[0]); set(exL + 1, ey - 2, H[0]); set(exR, ey - 2, H[0]); set(exR + 1, ey - 2, H[0]); }
  set(hx - 2, ey + 2, S[1]); set(hx - 2, ey + 3, S[1]);
  const mouth = pose.mouth ?? "smile", my = ey + 4;
  if (spec.mustache) { for (let x = hx - 4; x <= hx + 1; x++) set(x, my - 1, H[x === hx - 4 || x === hx + 1 ? 1 : 2]); set(hx - 3, my, "#7a3a30"); set(hx - 2, my, "#7a3a30"); }
  else if (mouth === "open") { set(hx - 3, my, "#6a2020"); set(hx - 2, my, "#6a2020"); set(hx - 3, my + 1, "#c84a4a"); set(hx - 2, my + 1, "#6a2020"); }
  else if (mouth === "flat") { set(hx - 3, my, S[0]); set(hx - 2, my, S[0]); }
  else { set(hx - 4, my - 1, S[0]); set(hx - 3, my, "#9a4a40"); set(hx - 2, my, "#9a4a40"); set(hx - 1, my - 1, S[0]); }
  if (spec.blush || kid) { set(exL - 1, ey + 2, mixc(S[2], "#ff6a7a", 0.4)); set(exR + 2, ey + 2, mixc(S[2], "#ff6a7a", 0.4)); }
  if (spec.freckles) for (const [fx, fy] of [[exL, ey + 3], [exL + 1, ey + 2], [exR + 1, ey + 3], [exR + 2, ey + 3]]) set(fx, fy, S[1]);
  // ear detail
  set(hx + Math.round(B.hrx), ey + 1, S[1]);
  if (spec.glasses) {
    // thin wire frames: a top rim over each eye, outer edges, a bridge, one temple arm to the ear; lens glint
    const g = spec.glasses; for (const ex of [exL - 1, exR - 1]) { for (let x = ex; x <= ex + 3; x++) set(x, ey - 1, g); set(ex, ey, g); set(ex + 3, ey, g); set(ex, ey + 1, mixc(g, S[2], 0.5)); set(ex + 3, ey + 1, mixc(g, S[2], 0.5)); set(ex + 1, ey + 2, mixc(g, S[2], 0.6)); set(ex + 2, ey + 2, mixc(g, S[2], 0.6)); }
    for (let x = exR + 3; x <= hx + Math.round(B.hrx) - 1; x++) set(x, ey, g);
  }
  if (spec.goggles) { for (let x = hx - 6; x <= hx + 5; x++) set(x, capTop + 3, "#3a3a4a"); for (const gx of [hx - 5, hx - 1]) { for (let x = gx; x <= gx + 2; x++) { set(x, capTop + 1, "#3a3a4a"); set(x, capTop + 2, x === gx ? "#e0f6ff" : "#8ad0f0"); } set(gx - 1, capTop + 2, "#3a3a4a"); set(gx + 3, capTop + 2, "#3a3a4a"); } }

  // ---- clothes detail
  if (spec.coat) {
    for (let y = B.sh + 1; y <= B.sh + 6; y++) { const ow = Math.min(2.6, 1.2 + (y - B.sh) / 5); set(cx - ow - 1, y, spec.coat[1]); set(cx + ow, y, spec.coat[3]); }
    set(cx - 3, B.sh, spec.coat[3]); set(cx - 2, B.sh, spec.coat[3]); set(cx + 1, B.sh, spec.coat[2]); set(cx + 2, B.sh, spec.coat[2]);
    for (let x = cx - 5; x <= cx - 3; x++) set(x, B.hip + 2, spec.coat[1]); for (let x = cx + 2; x <= cx + 4; x++) set(x, B.hip + 2, spec.coat[1]);
    set(cx - 5, B.hip + 3, spec.coat[1]); set(cx + 4, B.hip + 3, spec.coat[0]);
    if (spec.pens) { for (let x = cx - 5; x <= cx - 3; x++) set(x, B.sh + 6, spec.coat[1]); set(cx - 5, B.sh + 5, "#2a50e0"); set(cx - 4, B.sh + 4, "#e0344d"); set(cx - 4, B.sh + 5, "#e0344d"); }
  }
  if (spec.tie) { set(cx - 1, B.sh + 1, spec.tie[2]); set(cx, B.sh + 1, spec.tie[1]); for (let y = B.sh + 2; y <= B.sh + 9; y++) { set(cx - 1, y, spec.tie[y % 3 === 0 ? 3 : 2]); set(cx, y, spec.tie[1]); } set(cx - 1, B.sh + 10, spec.tie[1]); }
  if (spec.bowtie) { const b = spec.bowtie; set(cx - 2, B.sh + 1, b); set(cx - 3, B.sh + 1, b); set(cx - 3, B.sh + 2, b); set(cx - 1, B.sh + 1, mixc(b, "#000000", 0.35)); set(cx, B.sh + 1, b); set(cx + 1, B.sh + 1, b); set(cx + 1, B.sh + 2, mixc(b, "#000000", 0.25)); set(cx - 3, B.sh, b); set(cx + 1, B.sh, b); }
  if (spec.vest) { for (let y = B.sh + 3; y <= B.hip - 3; y += 3) set(cx - 1, y, spec.vest[0]); for (let x = cx - 4; x <= cx + 3; x++) if (is(x, B.hip - 1, "vest")) set(x, B.hip - 1, spec.vest[x % 2 ? 1 : 3]); }
  if (spec.stethoscope) {
    const T = "#34343e", M = "#c8ccd8";
    for (let y = B.sh; y <= B.sh + 7; y++) set(cx - 3, y, T); set(cx - 2, B.sh + 8, T); set(cx - 2, B.sh + 9, M); set(cx - 1, B.sh + 9, M); set(cx - 2, B.sh + 10, "#8a90a0"); set(cx - 1, B.sh + 10, M);
    for (let y = B.sh; y <= B.sh + 4; y++) set(cx + 2, y, T); set(cx + 2, B.sh + 5, M); set(cx - 3, B.sh - 1, T); set(cx + 2, B.sh - 1, T);
  }
  if (spec.badge) { const bx = cx + 3, by = B.sh + 6; for (let y = by; y <= by + 3; y++) for (let x = bx; x <= bx + 2; x++) set(x, y, y === by ? "#2a6ae0" : "#f4f6fa"); set(bx + 1, by + 2, "#9aa4b8"); set(bx, by + 3, "#9aa4b8"); }
  if (spec.backpack) { for (let y = B.sh; y <= B.sh + 8; y++) { set(cx - 3, y, spec.backpack[1]); set(cx + 2, y, spec.backpack[2]); } set(cx - 3, B.sh + 5, "#c8ccd8"); }
  if (spec.bandaid && spec.legKind === "shorts") { set(cx - 4, B.knee + 1, "#f0d0a8"); set(cx - 3, B.knee + 1, "#f0d0a8"); set(cx - 4, B.knee + 2, "#e0b890"); }
  // belt line and shoe details
  if (!spec.coat || coatBot < B.hip + 3) for (let x = 0; x < SW; x++) if (is(x, B.hip - 1, "legL") || is(x, B.hip - 1, "legR")) set(x, B.hip - 1, spec.legs[0]);
  const sole = spec.sole ?? "#f0ece4";
  for (let x = 0; x < SW; x++) if (is(x, B.foot, "shoeL") || is(x, B.foot, "shoeR")) set(x, B.foot, sole);
  set(cx - 5, B.ankle + 2, spec.shoes[3]); set(cx + 2, B.ankle + 2, spec.shoes[3]);
  if (spec.legKind !== "shorts" && spec.legKind !== "skirt") for (const x of [cx - 3, cx + 2]) set(x, B.knee, spec.legs[1]);

  // ---- props in hand
  const hs = pose.holdSide ?? 1, hp = hand[hs];
  if (hp && pose.hold && pose.hold !== "none") {
    const [px0, py0] = [Math.round(hp[0]), Math.round(hp[1])];
    if (pose.hold === "flask") {
      const G2 = "#d8f0ff", Lq = "#3ad08a", Lq2 = "#1e9a60";
      for (let y = -6; y <= -3; y++) { set(px0, py0 + y, G2); set(px0 + 1, py0 + y, "#a8d0e8"); }
      for (let r = 0; r < 5; r++) { const w = 1 + r; for (let x = -w + 1; x <= w; x++) set(px0 + x, py0 - 2 + r, r >= 2 ? (x === -w + 1 ? "#8af0b8" : x === w ? Lq2 : Lq) : x === -w + 1 ? "#ffffff" : G2); }
      set(px0 - 1, py0 - 7, "#a8d0e8"); set(px0 + 2, py0 - 7, "#a8d0e8"); set(px0 + 1, py0 + 1, "#c8ffe0");
    }
    if (pose.hold === "chalk") { set(px0 - 1, py0 - 1, "#ffffff"); set(px0 - 2, py0 - 2, "#f0f0f0"); set(px0 - 3, py0 - 3, "#e0e0e0"); }
    if (pose.hold === "ball") { for (let y = -3; y <= 1; y++) for (let x = -2; x <= 2; x++) if (x * x + (y + 1) * (y + 1) <= 5) set(px0 + x, py0 + y - 2, (x + y) % 2 ? "#ffffff" : x < 0 ? "#f4f4f4" : "#c8ccd4"); set(px0, py0 - 3, "#2a2a34"); set(px0 - 1, py0 - 2, "#2a2a34"); }
    if (pose.hold === "clipboard") { const bx = px0 - 3, by = py0 - 6; for (let y = 0; y < 9; y++) for (let x = 0; x < 7; x++) set(bx + x, by + y, x === 0 || x === 6 || y === 8 ? "#6a4428" : "#8a5a36"); for (let y = 1; y < 8; y++) for (let x = 1; x < 6; x++) set(bx + x, by + y, "#f6f4ee"); for (const y of [3, 5, 7]) for (let x = 2; x < 5; x++) set(bx + x, by + y, "#9aa4c0"); set(bx + 2, by, "#c8ccd8"); set(bx + 3, by, "#e8ecf4"); set(bx + 4, by, "#c8ccd8"); ell(px0 + 0.5, py0 + 0.8, 1.4, 1.2, hs < 0 ? "handL" : "handR", spec.skin); set(px0, py0, spec.skin[2]); set(px0 + 1, py0, spec.skin[1]); set(px0, py0 + 1, spec.skin[1]); }
  }

  // ---- outline: every empty cell touching the figure takes a darkened neighbour colour
  const O: (string | null)[][] = C.map((r) => r.slice());
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
    if (C[y][x]) continue;
    const n = [C[y][x - 1], C[y][x + 1], C[y - 1]?.[x], C[y + 1]?.[x]].find((q) => q);
    if (n) O[y][x] = mixc(n, "#140c18", 0.72);
  }
  // ---- ground shadow
  for (let y = B.foot + 1; y <= B.foot + 2; y++) for (let x = cx - 9; x <= cx + 9; x++) { const u = (x + 0.5 - cx) / 9.5, v = (y - B.foot - 1) / 1.6; if (u * u + v * v <= 1 && !O[y][x]) O[y][x] = "rgba(20,12,30,0.22)"; }
  return O;
};

// ---------------------------------------------------------------- render + cache
const keyOf = (spec: CharSpec, pose: Pose) => JSON.stringify([spec, pose]);
export const charSprite = (env: Env, spec: CharSpec, pose: Pose = {}, flip = false) => cached(env, `pc:${keyOf(spec, pose)}:${flip}`, () => {
  const g = paint(spec, pose), L = env.canvas(SW, SH), c = L.ctx; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, SW, SH);
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) { const col = g[y][x]; if (!col) continue; c.fillStyle = col; c.fillRect(flip ? SW - 1 - x : x, y, 1, 1); }
  return L;
});
// draw with the feet's centre at (x, footY) in the caller's current transform; k = world units per sprite pixel
export const drawChar = (c: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, env: Env, spec: CharSpec, x: number, footY: number, k: number, pose: Pose = {}, flip = false) => {
  const L = charSprite(env, spec, pose, flip), prev = c.imageSmoothingEnabled; c.imageSmoothingEnabled = false;
  c.drawImage(L.canvas as CanvasImageSource, x - (SW / 2) * k, footY - 63 * k, SW * k, SH * k); c.imageSmoothingEnabled = prev;
};

// ---------------------------------------------------------------- the cast
export const CAST: Record<string, CharSpec> = {
  doctor: { body: "man", skin: SKIN.medium, hair: HAIR.black, hairStyle: "short", eyes: "#3a2a1a", top: CLOTH.teal, coat: CLOTH.white, coatLen: 10, legs: CLOTH.teal, shoes: CLOTH.charcoal, sole: "#44444f", stethoscope: true, badge: true, pens: true },
  child: { body: "child", skin: SKIN.light, hair: HAIR.ginger, hairStyle: "pigtails", eyes: "#3a7a4a", top: CLOTH.red, stripe: CLOTH.cream, sleeves: "short", legs: CLOTH.denim, legKind: "shorts", socks: "#f4f0e8", shoes: CLOTH.yellow, sole: "#ffffff", freckles: true, backpack: CLOTH.purple, bandaid: true, lashes: true },
  scientist: { body: "woman", skin: SKIN.dark, hair: HAIR.black, hairStyle: "bun", eyes: "#3a2418", top: CLOTH.purple, coat: CLOTH.white, coatLen: 6, legs: CLOTH.charcoal, shoes: CLOTH.brown, sole: "#2a1810", goggles: true, lashes: true, pens: true },
  physicist: { body: "man", skin: SKIN.light, hair: HAIR.grey, hairStyle: "wild", eyes: "#4a5a7a", top: CLOTH.cream, vest: CLOTH.olive, coat: CLOTH.tweed, coatLen: 3, bowtie: "#a82228", legs: CLOTH.brown, shoes: CLOTH.brown, sole: "#1a0e08", glasses: "#b08a3a", mustache: true },
};
